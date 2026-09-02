/**
 * Chapter 2 story wave runtime.
 *
 * Ported from chapter2_wave_simulation_v6.  The simulator's temporary player,
 * HUD and input layer are intentionally not used here.  Only Chapter 2 enemy
 * behaviour, bullets, telegraphs, effects and wave sequencing are retained.
 * The real GameEngine player, weapon, HP/bomb HUD and input systems remain in
 * charge of the player side of combat.
 */

const W = 900;
const H = 1200;
const MONSTER_SCALE = 1.28;
// Keep the simulator's original enemy/effect proportions. The source simulator
// rendered a 900 x 1200 virtual field into a 720 x 960 canvas (uniform 0.8x).
// The integrated game is wider (922 x 960), so only X positions are widened to
// use the project field; sprite/effect sizes still use the original uniform scale.
const CHAPTER2_ENEMY_HP_SCALE = 0.65;
const INK = "#070911";
const DIFFICULTY = 1;
const MAX_PARTICLES = 220;
const MAX_VANISHES = 72;

export type Chapter2WaveEnemyType =
  | "ghost"
  | "pointer"
  | "submarine"
  | "anxiety"
  | "noreply"
  | "format"
  | "energy"
  | "reference"
  | "highlighter"
  | "countdown"
  | "compressor"
  | "drone";

export interface Chapter2WaveRuntime {
  enabled: boolean;
  running: boolean;
  selectedWave: number;
  nextWave: number;
  elapsed: number;
  waveCount: number;
  title: string;
  section: string;
  description: string;
  progress: number;
  allWavesCleared: boolean;
}

export function createChapter2WaveRuntime(): Chapter2WaveRuntime {
  return {
    enabled: false,
    running: false,
    selectedWave: 0,
    nextWave: 0,
    elapsed: 0,
    waveCount: 20,
    title: "",
    section: "",
    description: "",
    progress: 0,
    allWavesCleared: false,
  };
}

type AnyRecord = Record<string, any>;

type WaveEvent = {
  key: string;
  label: string;
  condition: (time: number) => boolean;
  action: () => void;
};

type WaveDef = {
  section: string;
  title: string;
  duration: number;
  desc: string;
  events: WaveEvent[];
};

let activeEngine: any = null;
let ctx: CanvasRenderingContext2D | null = null;
let enemies: any[] = [];
let bullets: any[] = [];
let effects: any[] = [];
let trails: any[] = [];
let particles: any[] = [];
let vanishes: any[] = [];
let time = 0;
let shake = 0;
let waveRunning = false;
let currentWaveIndex = 0;
let waveTime = 0;
let waveGap = 0;
let waveEventState = new Set<string>();
let waveRunCounter = 0;
let currentWaveRunId = 0;
let waveTargetSpawned = 0;
let waveTargetMaxHp = 0;
let spawnContextWaveRunId: number | null = null;
let completionNotified = false;
let lastBombActive = false;

const player = { x: W / 2, y: H - 125, r: 25, inv: 0 };

const clearTargetTypes = new Set<Chapter2WaveEnemyType>([
  "anxiety",
  "noreply",
  "energy",
  "countdown",
  "compressor",
  "drone",
]);

const enemyHpByType: Record<Chapter2WaveEnemyType, number> = {
  ghost: 12,
  pointer: 12,
  submarine: 14,
  anxiety: 28,
  noreply: 40,
  format: 24,
  energy: 52,
  reference: 14,
  highlighter: 26,
  countdown: 36,
  compressor: 150,
  drone: 22,
};

const monsterAuraColors: Record<Chapter2WaveEnemyType, string> = {
  ghost: "#c9f5ff",
  pointer: "#4ec9ff",
  submarine: "#54d5ff",
  anxiety: "#9c67ff",
  noreply: "#72de82",
  format: "#ff514d",
  energy: "#a76cff",
  reference: "#54d5ff",
  highlighter: "#b8ea4b",
  countdown: "#ffc83f",
  compressor: "#ffd23f",
  drone: "#ffab48",
};

const bulletEffectColors: Record<string, string> = {
  paper: "#ffd23f",
  drop: "#9c67ff",
  x: "#ff5c58",
  energy: "#a76cff",
  energyWisp: "#a76cff",
  energyBomb: "#a76cff",
  citation: "#54d5ff",
  citationAnchor: "#54d5ff",
  ink: "#b8ea4b",
  timer: "#ffc83f",
  block: "#ffd23f",
  miniShard: "#72de82",
  noReplyShard: "#72de82",
  noReplyCore: "#72de82",
  boomerangPage: "#ffab48",
  eliteWall: "#ffd23f",
};

const monsterImagePaths: Partial<Record<Chapter2WaveEnemyType, string>> = {
  ghost: "/assets/chapter2/waves/enemies/ghost_exam.png",
  pointer: "/assets/chapter2/waves/enemies/laser_pointer.png",
  anxiety: "/assets/chapter2/waves/enemies/anxiety_core.png",
  noreply: "/assets/chapter2/waves/enemies/no_reply.png",
  format: "/assets/chapter2/waves/enemies/format_error.png",
  energy: "/assets/chapter2/waves/enemies/energy_absorber.png",
  reference: "/assets/chapter2/waves/enemies/reference_bug.png",
  highlighter: "/assets/chapter2/waves/enemies/highlighter.png",
  countdown: "/assets/chapter2/waves/enemies/countdown_bot.png",
  compressor: "/assets/chapter2/waves/enemies/page_compressor.png",
};

const bulletImagePaths: Record<string, string> = {
  paper: "/assets/chapter2/waves/bullets/paper_shard.png",
  drop: "/assets/chapter2/waves/bullets/anxiety_drop.png",
  x: "/assets/chapter2/waves/bullets/format_x.png",
  energyOrb: "/assets/chapter2/waves/bullets/energy_orb.png",
  citation: "/assets/chapter2/waves/bullets/citation_bracket.png",
  ink: "/assets/chapter2/waves/bullets/ink_nib.png",
  timer: "/assets/chapter2/waves/bullets/timer_orb.png",
  block: "/assets/chapter2/waves/bullets/paper_block.png",
};

const images: Record<string, HTMLImageElement> = {};
const spriteCache = new WeakMap<HTMLImageElement, Map<string, { canvas: HTMLCanvasElement; w: number; h: number }>>();

if (typeof Image !== "undefined") {
  for (const [key, src] of Object.entries(monsterImagePaths)) {
    if (!src) continue;
    const image = new Image();
    image.src = src;
    images[key] = image;
  }
  for (const [key, src] of Object.entries(bulletImagePaths)) {
    const image = new Image();
    image.src = src;
    images[key] = image;
  }
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const len = (x: number, y: number) => Math.hypot(x, y) || 1;
const diff = () => DIFFICULTY;

function angleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function turnAngle(current: number, target: number, maxStep: number) {
  const d = angleDelta(current, target);
  return current + clamp(d, -maxStep, maxStep);
}

function virtualScaleX(engine: any) {
  return Math.max(0.001, engine.canvas.width / W);
}

function virtualScaleY(engine: any) {
  return Math.max(0.001, engine.canvas.height / H);
}

let renderWorldWidth = W;

function angleForHorizontalStretch(angle: number, xStretch: number) {
  if (!Number.isFinite(angle) || Math.abs(xStretch - 1) < 0.0001) return angle;
  return Math.atan2(Math.sin(angle), Math.cos(angle) * xStretch);
}

/**
 * The simulator used one uniform scale (0.8) because 900:1200 == 720:960.
 * The game field is 922:960. Scaling the whole Chapter 2 layer by sx/sy
 * independently made monsters, bullets and circular effects look horizontally
 * stretched. For rendering only, widen world X coordinates while keeping one
 * uniform size scale. Gameplay/collision coordinates are left untouched.
 */
function withOriginalAspectRenderState(engine: any, draw: () => void) {
  const uniformScale = virtualScaleY(engine);
  const xStretch = virtualScaleX(engine) / uniformScale;
  const restores: Array<() => void> = [];

  const setNumber = (object: any, key: string, value: number) => {
    if (!object || !Number.isFinite(object[key])) return;
    const before = object[key];
    object[key] = value;
    restores.push(() => { object[key] = before; });
  };
  const stretchX = (object: any, key: string) => {
    if (!object || !Number.isFinite(object[key])) return;
    setNumber(object, key, object[key] * xStretch);
  };
  const stretchAngle = (object: any, key: string) => {
    if (!object || !Number.isFinite(object[key])) return;
    setNumber(object, key, angleForHorizontalStretch(object[key], xStretch));
  };
  const stretchDataX = (data: any) => {
    if (!data) return;
    for (const key of ["gap", "gapCurrent", "gapTarget", "stopX"]) stretchX(data, key);
    for (const key of ["aim", "bodyAngle"]) stretchAngle(data, key);
  };

  for (const enemy of enemies) {
    stretchX(enemy, "x");
    stretchX(enemy, "vx");
    stretchX(enemy, "motionX");
    stretchDataX(enemy.data);
  }
  for (const bullet of bullets) {
    stretchX(bullet, "x");
    stretchX(bullet, "vx");
    stretchAngle(bullet, "a");
    stretchDataX(bullet.data);
  }
  for (const trail of trails) {
    stretchX(trail, "x");
    stretchX(trail, "x1");
    stretchX(trail, "x2");
  }
  for (const effect of effects) stretchX(effect, "x");
  for (const particle of particles) {
    stretchX(particle, "x");
    stretchX(particle, "vx");
  }
  for (const vanish of vanishes) stretchX(vanish, "x");

  const previousRenderWorldWidth = renderWorldWidth;
  renderWorldWidth = W * xStretch;
  try {
    engine.ctx.scale(uniformScale, uniformScale);
    draw();
  } finally {
    renderWorldWidth = previousRenderWorldWidth;
    for (let i = restores.length - 1; i >= 0; i -= 1) restores[i]();
  }
}

function syncPlayerFromEngine(engine: any) {
  const sx = virtualScaleX(engine);
  const sy = virtualScaleY(engine);
  player.x = (engine.player.x + engine.player.width / 2) / sx;
  player.y = (engine.player.y + engine.player.height / 2) / sy;
  player.r = Math.max(13, Math.min(engine.player.width / sx, engine.player.height / sy) * 0.34);
  player.inv = Math.max(0, Number(engine.player.invulnTimer) || 0);
}

function applyVirtualPlayerPullToEngine(engine: any, beforeX: number, beforeY: number) {
  if (Math.abs(player.x - beforeX) < 0.001 && Math.abs(player.y - beforeY) < 0.001) return;
  const sx = virtualScaleX(engine);
  const sy = virtualScaleY(engine);
  const cx = player.x * sx;
  const cy = player.y * sy;
  engine.player.x = clamp(cx - engine.player.width / 2, 0, Math.max(0, engine.canvas.width - engine.player.width));
  engine.player.y = clamp(cy - engine.player.height / 2, 0, Math.max(0, engine.canvas.height - engine.player.height));
}

function rgba(hex: string, alpha: number) {
  const source = hex.replace("#", "");
  const value = source.length === 3 ? source.split("").map((c) => c + c).join("") : source;
  const n = parseInt(value, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function cachedSprite(image: HTMLImageElement | undefined, w: number, h: number) {
  if (!image || !image.complete || !image.naturalWidth || typeof document === "undefined") return null;
  let map = spriteCache.get(image);
  if (!map) {
    map = new Map();
    spriteCache.set(image, map);
  }
  const key = `${Math.round(w)}x${Math.round(h)}`;
  const cached = map.get(key);
  if (cached) return cached;
  const ratio = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const dw = Math.max(1, image.naturalWidth * ratio);
  const dh = Math.max(1, image.naturalHeight * ratio);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(dw * scale));
  canvas.height = Math.max(1, Math.ceil(dh * scale));
  const cctx = canvas.getContext("2d");
  if (!cctx) return null;
  cctx.imageSmoothingEnabled = true;
  cctx.imageSmoothingQuality = "high";
  cctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const out = { canvas, w: dw, h: dh };
  map.set(key, out);
  return out;
}

function drawImageFit(image: HTMLImageElement | undefined, x: number, y: number, w: number, h: number, rotation = 0, alpha = 1) {
  if (!ctx) return;
  const sprite = cachedSprite(image, w, h);
  if (!sprite) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(sprite.canvas, -sprite.w / 2, -sprite.h / 2, sprite.w, sprite.h);
  ctx.restore();
}

function addEffect(type: string, x: number, y: number, options: AnyRecord = {}) {
  effects.push({
    type,
    x,
    y,
    t: 0,
    life: options.life || 0.5,
    color: options.color || "#7fefff",
    r: options.r || 20,
    vx: options.vx || 0,
    vy: options.vy || 0,
    alpha: options.alpha ?? 1,
  });
}

function pushParticle(options: AnyRecord) {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({
    x: options.x,
    y: options.y,
    vx: options.vx || 0,
    vy: options.vy || 0,
    age: 0,
    life: options.life || 0.35,
    size: options.size || 2,
    color: options.color || "#ffffff",
    shape: options.shape || "diamond",
    spin: options.spin ?? rnd(-8, 8),
    phase: Math.random() * Math.PI * 2,
  });
}

function burstParticles(x: number, y: number, color: string, count = 12, speed = 180) {
  const n = Math.min(count, MAX_PARTICLES - particles.length);
  for (let i = 0; i < n; i += 1) {
    const angle = rnd(0, Math.PI * 2);
    const particleSpeed = rnd(speed * 0.35, speed);
    pushParticle({
      x,
      y,
      vx: Math.cos(angle) * particleSpeed,
      vy: Math.sin(angle) * particleSpeed,
      life: rnd(0.2, 0.48),
      size: rnd(1.5, 4.2),
      color,
      shape: particleSpeed > 120 ? "streak" : "diamond",
    });
  }
}

function pushVanish(x: number, y: number, color: string, size: number, strength = 1) {
  if (vanishes.length >= MAX_VANISHES) return;
  vanishes.push({ x, y, color, size, age: 0, life: 0.34 * strength, strength, phase: Math.random() * Math.PI * 2 });
}

function vanishBullet(bullet: any, strength = 1) {
  if (!bullet || bullet.dormant) return;
  pushVanish(bullet.x, bullet.y, bulletEffectColors[bullet.kind] || "#a6dfff", Math.max(14, bullet.r * 1.8), strength);
}

function compactAlive<T>(array: T[], predicate: (value: T) => boolean) {
  let write = 0;
  for (let i = 0; i < array.length; i += 1) {
    if (predicate(array[i])) array[write++] = array[i];
  }
  array.length = write;
}

function spawnBullet(kind: string, x: number, y: number, angle: number, speed: number, options: AnyRecord = {}) {
  if (bullets.length > 220) return null;
  const bullet = {
    kind,
    x,
    y,
    px: x,
    py: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    a: angle,
    t: 0,
    stateT: 0,
    state: options.state || "main",
    r: options.r || 14,
    scale: options.scale || 1,
    alpha: options.alpha ?? 1,
    active: options.active ?? true,
    dormant: options.dormant || false,
    curve: options.curve || 0,
    turnAt: options.turnAt || 0,
    turned: false,
    wall: options.wall || false,
    w: options.w || 0,
    h: options.h || 0,
    cool: options.cool || 0,
    spin: options.spin || 0,
    seed: Math.random() * Math.PI * 2,
    flash: options.flash ?? ((options.dormant || options.active === false) ? 0 : 0.12),
    data: { ...(options.data || {}) },
    waveRunId: options.waveRunId ?? spawnContextWaveRunId ?? null,
    dead: false,
  };
  bullets.push(bullet);
  if (!bullet.dormant && bullet.active) {
    const color = bulletEffectColors[kind] || "#a6dfff";
    for (let i = 0; i < 2; i += 1) {
      const aa = angle + Math.PI + rnd(-0.32, 0.32);
      const ss = rnd(45, 90);
      pushParticle({ x, y, vx: Math.cos(aa) * ss, vy: Math.sin(aa) * ss, life: rnd(0.12, 0.22), size: rnd(1.2, 2.4), color, shape: "streak" });
    }
  }
  return bullet;
}

function aim(x: number, y: number) {
  return Math.atan2(player.y - y, player.x - x);
}

function monsterBox(type: Chapter2WaveEnemyType): [number, number] {
  const box: Record<Chapter2WaveEnemyType, [number, number]> = {
    ghost: [110, 130],
    pointer: [135, 64],
    submarine: [130, 72],
    anxiety: [118, 105],
    noreply: [124, 92],
    format: [116, 106],
    energy: [112, 112],
    reference: [105, 86],
    highlighter: [208, 92],
    countdown: [118, 105],
    compressor: [188, 156],
    drone: [112, 92],
  };
  return [box[type][0] * MONSTER_SCALE, box[type][1] * MONSTER_SCALE];
}

function addEnemy(type: Chapter2WaveEnemyType, options: AnyRecord = {}) {
  const [mw, mh] = monsterBox(type);
  const defaultR = Math.max(42, Math.min(mw, mh) * 0.36);
  const rawMaxHp = options.maxHp || enemyHpByType[type] || 20;
  const maxHp = Math.max(1, Math.ceil(rawMaxHp * CHAPTER2_ENEMY_HP_SCALE));
  const enemy = {
    type,
    x: options.x ?? W / 2,
    y: options.y ?? -80,
    vx: options.vx || 0,
    vy: options.vy || 0,
    motionX: 0,
    motionY: 0,
    t: 0,
    state: options.state || "enter",
    stateT: 0,
    r: options.r || defaultR,
    dead: false,
    shots: 0,
    bounces: 0,
    cool: options.cool || 0,
    seed: Math.random() * Math.PI * 2,
    exhaustTimer: rnd(0.11, 0.18),
    maxHp,
    hp: maxHp,
    hitFlash: 0,
    clearTarget: options.clearTarget ?? clearTargetTypes.has(type),
    waveRunId: options.waveRunId ?? null,
    data: { ...(options.data || {}) },
    waveTag: options.tag || null,
    bombConsumed: false,
  };
  enemies.push(enemy);
  return enemy;
}

function tagged(tag: string) {
  return enemies.find((enemy) => !enemy.dead && enemy.waveRunId === currentWaveRunId && enemy.waveTag === tag);
}

function taggedAll(tag: string) {
  return enemies.filter((enemy) => !enemy.dead && enemy.waveRunId === currentWaveRunId && enemy.waveTag === tag);
}

function spawnWaveEnemy(type: Chapter2WaveEnemyType, options: AnyRecord = {}) {
  const enemy = addEnemy(type, { ...options, tag: options.tag || type, waveRunId: currentWaveRunId });
  waveTargetSpawned += 1;
  waveTargetMaxHp += enemy.maxHp;
  return enemy;
}

function spawnReferenceSquad() {
  for (let i = 0; i < 4; i += 1) {
    spawnWaveEnemy("reference", { x: W / 2 + (i - 1.5) * 95, y: -80 - i * 35, data: { index: i }, tag: `reference-${i}` });
  }
}

function spawnSubmarine(x = W / 2, options: AnyRecord = {}) {
  const y = options.y ?? -70;
  const angle = aim(x, y);
  const speed = 304 * diff();
  return spawnWaveEnemy("submarine", {
    ...options,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    state: "main",
    r: options.r || 52,
    tag: options.tag || "submarine",
  });
}

function hardSpawn(type: Chapter2WaveEnemyType, options: AnyRecord = {}) {
  const { hpMul, ...rest } = options;
  const mul = hpMul ?? (clearTargetTypes.has(type) ? 1.2 : 1.1);
  const base = rest.maxHp ?? enemyHpByType[type] ?? 20;
  return spawnWaveEnemy(type, { ...rest, maxHp: Math.ceil(base * mul) });
}

function hardSubmarine(x = W / 2, options: AnyRecord = {}) {
  const y = options.y ?? -70;
  const angle = aim(x, y);
  const speed = 326 * diff();
  return hardSpawn("submarine", {
    ...options,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    state: "main",
    r: options.r || 52,
    tag: options.tag || "hard-submarine",
    hpMul: options.hpMul ?? 1.08,
  });
}

function hardSubmarineOffset(x = W / 2, targetOffsetX = 0, options: AnyRecord = {}) {
  const y = options.y ?? -70;
  const targetX = clamp(player.x + targetOffsetX, 70, W - 70);
  const targetY = player.y;
  const angle = Math.atan2(targetY - y, targetX - x);
  const speed = 326 * diff();
  return hardSpawn("submarine", {
    ...options,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    state: "main",
    r: options.r || 52,
    tag: options.tag || "hard-submarine-offset",
    hpMul: options.hpMul ?? 1.08,
  });
}

function spawnHardReferenceSquad(prefix = "hard-reference") {
  for (let i = 0; i < 4; i += 1) {
    hardSpawn("reference", { x: W / 2 + (i - 1.5) * 95, y: -80 - i * 35, data: { index: i }, tag: `${prefix}-${i}`, hpMul: 1.08 });
  }
}

function waveEvent(key: string, label: string, condition: (time: number) => boolean, action: () => void): WaveEvent {
  return { key, label, condition, action };
}
const hardWaveDefs: WaveDef[] = [
 {section:"어려움 · 시험",title:"교차하는 발표 불안",duration:13.5,desc:"좌우 응집체의 엇박자 부채꼴과 포인터 돌진이 겹칩니다. 네 몬스터가 모두 사라져야 종료됩니다.",events:[
  waveEvent("a1","왼쪽 응집체 진입",t=>t>=0,()=>hardSpawn("anxiety",{x:235,tag:"hard-a1"})),
  waveEvent("a2","오른쪽 응집체 진입",t=>t>=.8,()=>hardSpawn("anxiety",{x:665,tag:"hard-a2"})),
  waveEvent("p1","두 번째 응집체 첫 공격 · 왼쪽 포인터",t=>{const e=tagged("hard-a2");return !!(e&&e.shots>=1)||t>=2.9},()=>hardSpawn("pointer",{x:165,tag:"hard-p1",hpMul:1.05})),
  waveEvent("p2","반대편 포인터 추가",t=>t>=4.1,()=>hardSpawn("pointer",{x:735,tag:"hard-p2",hpMul:1.05}))]},
 {section:"어려움 · 시험",title:"오답으로 가득 찬 시험지",duration:15.5,desc:"형광선이 공간을 나누는 동안 유령 두 마리와 응집체가 차례로 합류합니다.",events:[
  waveEvent("h","형광펜 즉시 출격",t=>t>=0,()=>hardSpawn("highlighter",{x:450,tag:"hard-h"})),
  waveEvent("g1","첫 번째 형광선 · 유령 진입",t=>{const e=tagged("hard-h");return !!(e&&(e.data.stroke||0)>=1)||t>=2.2},()=>hardSpawn("ghost",{x:185,tag:"hard-g1",hpMul:1.05})),
  waveEvent("g2","두 번째 형광선 · 유령 추가",t=>{const e=tagged("hard-h");return !!(e&&(e.data.stroke||0)>=2)||t>=4.2},()=>hardSpawn("ghost",{x:715,tag:"hard-g2",hpMul:1.05})),
  waveEvent("a","마지막 형광선 구간 · 응집체 투입",t=>{const e=tagged("hard-h");return !!(e&&(e.data.stroke||0)>=3)||t>=6.2},()=>hardSpawn("anxiety",{x:620,tag:"hard-a"}))]},
 {section:"어려움 · 시험",title:"시험 종료 직전",duration:16.5,desc:"카운트다운 단계마다 유령과 잠수함이 추가됩니다. 두 번째 카운트다운까지 압박이 이어집니다.",events:[
  waveEvent("c","카운트다운봇 진입",t=>t>=0,()=>hardSpawn("countdown",{x:450,tag:"hard-c"})),
  waveEvent("g1","숫자 2 · 왼쪽 유령",t=>{const e=tagged("hard-c");return !!(e&&e.data.n<=2)||t>=2.1},()=>hardSpawn("ghost",{x:205,tag:"hard-g1",hpMul:1.05})),
  waveEvent("g2","숫자 1 · 오른쪽 유령",t=>{const e=tagged("hard-c");return !!(e&&e.data.n<=1)||t>=3.1},()=>hardSpawn("ghost",{x:695,tag:"hard-g2",hpMul:1.05})),
  waveEvent("s1","숫자 0 · 잠수함 돌진",t=>{const e=tagged("hard-c");return !!(e&&e.state==="zero")||t>=4.1},()=>hardSubmarine(150,{tag:"hard-s1"})),
  waveEvent("s2","두 번째 숫자 2 · 잠수함 추가",t=>{const e=tagged("hard-c");return !!(e&&e.shots>=1&&e.data.n<=2)||t>=7.0},()=>hardSubmarine(750,{tag:"hard-s2"}))]},
 {section:"어려움 · 팀플",title:"읽씹과 잠수",duration:17,desc:"엇박자로 공격하는 말풍선 두 마리와 양쪽 잠수함이 침묵 파동 사이로 진입합니다.",events:[
  waveEvent("n1","왼쪽 무응답 말풍선",t=>t>=0,()=>hardSpawn("noreply",{x:285,tag:"hard-n1"})),
  waveEvent("n2","오른쪽 무응답 말풍선",t=>t>=1.5,()=>hardSpawn("noreply",{x:615,tag:"hard-n2"})),
  waveEvent("s1","첫 침묵 파동 · 왼쪽 잠수함",t=>bullets.filter(b=>b.waveRunId===currentWaveRunId&&b.kind==="noReplyCore"&&b.state==="silence").length>=1||t>=2.7,()=>hardSubmarine(145,{tag:"hard-s1"})),
  waveEvent("s2","두 번째 침묵 파동 · 오른쪽 잠수함",t=>bullets.filter(b=>b.waveRunId===currentWaveRunId&&b.kind==="noReplyCore"&&b.state==="silence").length>=2||t>=4.5,()=>hardSubmarine(755,{tag:"hard-s2"}))]},
 {section:"어려움 · 팀플",title:"참고문헌 연결 오류",duration:16,desc:"인용 연결망 뒤에 대각선 교정기와 페이지 드론이 순차적으로 합류합니다.",events:[
  waveEvent("r","참고문헌 벌레 4마리",t=>t>=0,()=>spawnHardReferenceSquad("hard-ref")),
  waveEvent("f","연결망 수렴 · 교정기 진입",t=>enemies.some(e=>e.waveRunId===currentWaveRunId&&e.type==="reference"&&e.state==="cross")||t>=3.4,()=>hardSpawn("format",{tag:"hard-format",hpMul:1.08})),
  waveEvent("d","교정기 두 번째 반사 · 드론 진입",t=>{const e=tagged("hard-format");return !!(e&&e.bounces>=2)||t>=6.2},()=>hardSpawn("drone",{x:450,tag:"hard-drone"}))]},
 {section:"어려움 · 팀플",title:"밤샘 발표 준비",duration:16,desc:"에너지 포위·포인터 돌진·유령 순간이동이 공격 단계마다 이어집니다.",events:[
  waveEvent("e","에너지 흡수체 진입",t=>t>=0,()=>hardSpawn("energy",{x:450,tag:"hard-energy"})),
  waveEvent("p1","구슬 포위 · 왼쪽 포인터",t=>{const e=tagged("hard-energy");return !!(e&&e.state==="summon")||t>=1.8},()=>hardSpawn("pointer",{x:165,tag:"hard-p1",hpMul:1.05})),
  waveEvent("p2","구슬 회수 · 오른쪽 포인터",t=>{const e=tagged("hard-energy");return !!(e&&e.state==="recall")||t>=3.3},()=>hardSpawn("pointer",{x:735,tag:"hard-p2",hpMul:1.05})),
  waveEvent("g","과충전 후 유령 진입",t=>{const e=tagged("hard-energy");return !!(e&&e.state==="cool")||t>=5.2},()=>hardSpawn("ghost",{x:player.x<450?700:200,tag:"hard-g",hpMul:1.05}))]},
 {section:"어려움 · 보고서",title:"끝없는 보고서 수정",duration:17,desc:"두 드론의 엇박자 탄막 위로 교정기와 포인터가 순차적으로 겹칩니다.",events:[
  waveEvent("d1","왼쪽 페이지 드론",t=>t>=0,()=>hardSpawn("drone",{x:250,tag:"hard-d1"})),
  waveEvent("d2","오른쪽 페이지 드론",t=>t>=1.2,()=>hardSpawn("drone",{x:650,tag:"hard-d2"})),
  waveEvent("f","두 드론 첫 공격 · 교정기 진입",t=>{const a=tagged("hard-d1"),b=tagged("hard-d2");return !!(a&&b&&a.shots>=1&&b.shots>=1)||t>=3.4},()=>hardSpawn("format",{tag:"hard-format",hpMul:1.08})),
  waveEvent("p","교정기 폭발 직전 · 포인터 진입",t=>{const e=tagged("hard-format");return !!(e&&e.state==="warn")||t>=6.4},()=>hardSpawn("pointer",{x:player.x<450?735:165,tag:"hard-pointer",hpMul:1.05}))]},
 {section:"어려움 · 보고서",title:"제출 파일 용량 초과",duration:18,desc:"형광선 안에 드론 탄이 쌓이고, 형광펜 퇴장 구간부터 잠수함 두 마리가 연속 돌진합니다.",events:[
  waveEvent("h","형광펜 즉시 출격",t=>t>=0,()=>hardSpawn("highlighter",{x:450,tag:"hard-h"})),
  waveEvent("d1","첫 번째 선 · 왼쪽 드론",t=>{const e=tagged("hard-h");return !!(e&&(e.data.stroke||0)>=1)||t>=2.2},()=>hardSpawn("drone",{x:260,tag:"hard-d1"})),
  waveEvent("d2","세 번째 선 · 오른쪽 드론",t=>{const e=tagged("hard-h");return !!(e&&(e.data.stroke||0)>=3)||t>=5.8},()=>hardSpawn("drone",{x:640,tag:"hard-d2"})),
  waveEvent("s1","형광펜 퇴장 구간 · 잠수함 1",t=>{const e=tagged("hard-h");return !e||e.state==="fade"||t>=8.2},()=>hardSubmarine(155,{tag:"hard-s1"})),
  waveEvent("s2","1초 후 잠수함 2",t=>t>=9.2,()=>hardSubmarine(745,{tag:"hard-s2"}))]},
 {section:"어려움 · 혼합",title:"시험과 발표가 같은 날",duration:18,desc:"카운트다운 숫자마다 말풍선·포인터·잠수함·유령이 하나씩 추가됩니다.",events:[
  waveEvent("c","카운트다운봇 진입",t=>t>=0,()=>hardSpawn("countdown",{x:450,tag:"hard-c"})),
  waveEvent("n","숫자 2 · 무응답 말풍선",t=>{const e=tagged("hard-c");return !!(e&&e.data.n<=2)||t>=2.1},()=>hardSpawn("noreply",{x:300,tag:"hard-n"})),
  waveEvent("p","숫자 1 · 발표 포인터",t=>{const e=tagged("hard-c");return !!(e&&e.data.n<=1)||t>=3.1},()=>hardSpawn("pointer",{x:735,tag:"hard-p",hpMul:1.05})),
  waveEvent("s","숫자 0 · 잠수함",t=>{const e=tagged("hard-c");return !!(e&&e.state==="zero")||t>=4.2},()=>hardSubmarine(155,{tag:"hard-s"})),
  waveEvent("g","두 번째 카운트다운 · 유령",t=>{const e=tagged("hard-c");return !!(e&&e.shots>=1)||t>=6.2},()=>hardSpawn("ghost",{x:650,tag:"hard-g",hpMul:1.05}))]},
 {section:"어려움 · 혼합",title:"팀플 최종 제출",duration:22,desc:"참고문헌 연결망, 무응답·잠수, 형식 오류의 세 단계가 하나의 웨이브로 이어집니다.",events:[
  waveEvent("r","1단계 · 참고문헌 벌레 4마리",t=>t>=0,()=>spawnHardReferenceSquad("final-ref")),
  waveEvent("d","1단계 · 중앙 페이지 드론",t=>t>=.5,()=>hardSpawn("drone",{x:450,tag:"final-drone"})),
  waveEvent("n","2단계 · 무응답 말풍선",t=>!enemies.some(e=>e.waveRunId===currentWaveRunId&&e.type==="reference"&&!e.dead)||t>=7.0,()=>hardSpawn("noreply",{x:450,tag:"final-n"})),
  waveEvent("s","2단계 · 잠수함 두 마리",t=>t>=7.5,()=>{hardSubmarine(160,{tag:"final-s1"});hardSubmarine(740,{tag:"final-s2"})}),
  waveEvent("f","3단계 · 형식 오류 교정기",t=>{const e=tagged("final-n");return !!(e&&e.shots>=1)||t>=11.0},()=>hardSpawn("format",{tag:"final-format",hpMul:1.08}))]},
 {section:"어려움 · 엘리트",title:"페이지 제한 압축기 강화전",duration:24,desc:"압축기는 계속 자연스럽게 왕복하며, 두 번째·세 번째 압축 단계에 유령과 포인터가 합류합니다.",events:[
  waveEvent("boss","강화 압축기 출현",t=>t>=0,()=>hardSpawn("compressor",{x:450,y:-120,r:86,data:{phase:1},tag:"hard-boss",hpMul:1.12})),
  waveEvent("g","두 번째 압축 · 족보 유령",t=>{const e=tagged("hard-boss");return !!(e&&e.data.phase>=2)||t>=5.0},()=>hardSpawn("ghost",{x:player.x<450?700:200,tag:"hard-g",hpMul:1.05})),
  waveEvent("p","세 번째 압축 · 발표 포인터",t=>{const e=tagged("hard-boss");return !!(e&&e.data.phase>=3)||t>=9.0},()=>hardSpawn("pointer",{x:player.x<450?160:740,tag:"hard-p",hpMul:1.05})),
  waveEvent("s","두 번째 압축 사이클 · 잠수함",t=>t>=14.0,()=>hardSubmarine(player.x<450?740:160,{tag:"hard-s"}))]},
 {section:"어려움 · 최종",title:"마감 직전 모든 오류",duration:25,desc:"응집체·포인터부터 말풍선·잠수함, 드론, 카운트다운·유령까지 네 그룹이 연속 투입됩니다.",events:[
  waveEvent("a","그룹 A · 응집체 두 마리",t=>t>=0,()=>{hardSpawn("anxiety",{x:260,tag:"last-a1"});hardSpawn("anxiety",{x:640,tag:"last-a2"})}),
  waveEvent("p","그룹 A · 포인터",t=>t>=1.0,()=>hardSpawn("pointer",{x:165,tag:"last-p",hpMul:1.05})),
  waveEvent("n","그룹 B · 무응답 말풍선",t=>taggedAll("last-a1").length===0||t>=6.0,()=>hardSpawn("noreply",{x:450,tag:"last-n"})),
  waveEvent("s","그룹 B · 잠수함",t=>t>=6.5,()=>hardSubmarine(740,{tag:"last-s"})),
  waveEvent("d","그룹 C · 페이지 드론 두 대",t=>{const e=tagged("last-n");return !!(e&&e.shots>=1)||t>=10.0},()=>{hardSpawn("drone",{x:260,tag:"last-d1"});hardSpawn("drone",{x:640,tag:"last-d2"})}),
  waveEvent("c","그룹 D · 카운트다운봇",t=>{const a=tagged("last-d1"),b=tagged("last-d2");return !!(a&&b&&a.shots>=1&&b.shots>=1)||t>=13.0},()=>hardSpawn("countdown",{x:450,tag:"last-c"})),
  waveEvent("g","그룹 D · 족보 유령",t=>t>=13.7,()=>hardSpawn("ghost",{x:player.x<450?690:210,tag:"last-g",hpMul:1.05}))]},
 {section:"돌진 총집합",title:"포인터 연속 발표",duration:11,desc:"발표 레이저 포인터가 0.7초마다 한 마리씩 총 10마리 연속 등장합니다.",events:[
  ...Array.from({length:10},(_,i)=>waveEvent(`pointer-${i}`,`${i+1}번째 포인터 출격`,t=>t>=i*.7,()=>hardSpawn("pointer",{x:i%2===0?150:750,tag:`rush-pointer-${i}`,hpMul:1.0}))) ]},
 {section:"돌진 총집합",title:"팀플 잠수함 대공세",duration:14,desc:"팀플 잠수함이 0.7초마다 좌우에서 두 마리씩, 총 20마리 연속 등장합니다.",events:[
  ...Array.from({length:10},(_,i)=>waveEvent(`sub-pair-${i}`,`${i+1}번째 잠수함 2마리 편대`,t=>t>=i*.7,()=>{hardSubmarine(155,{tag:`rush-sub-l-${i}`,hpMul:1.0});hardSubmarine(745,{tag:`rush-sub-r-${i}`,hpMul:1.0})})) ]},
 {section:"돌진 총집합",title:"족보 유령 행렬",duration:14,desc:"족보 유령이 1초마다 한 마리씩 총 10마리 등장해 서로 다른 위치에서 순간이동합니다.",events:[
  ...Array.from({length:10},(_,i)=>waveEvent(`ghost-${i}`,`${i+1}번째 족보 유령 출현`,t=>t>=i,()=>hardSpawn("ghost",{x:120+(i%5)*165,tag:`rush-ghost-${i}`,hpMul:1.0}))) ]},
 {section:"초고난도",title:"첨삭 지옥의 좁은 통로",duration:22,desc:"형광선이 만든 좁은 통로를 포인터와 드론이 압박하고, 형광펜 소멸 뒤 잠수함 두 마리가 마무리 돌진합니다.",events:[
  waveEvent("h","형광펜 즉시 출격",t=>t>=0,()=>hardSpawn("highlighter",{x:450,tag:"ultra16-h",hpMul:1.12})),
  waveEvent("p1","첫 번째 형광선 · 포인터 진입",t=>{const e=tagged("ultra16-h");return !!(e&&(e.data.stroke||0)>=1)||t>=2.2},()=>hardSpawn("pointer",{x:155,tag:"ultra16-p1",hpMul:1.08})),
  waveEvent("d","두 번째 형광선 · 페이지 드론 진입",t=>{const e=tagged("ultra16-h");return !!(e&&(e.data.stroke||0)>=2)||t>=4.2},()=>hardSpawn("drone",{x:620,tag:"ultra16-d",hpMul:1.12})),
  waveEvent("p2","세 번째 형광선 · 반대편 포인터",t=>{const e=tagged("ultra16-h");return !!(e&&(e.data.stroke||0)>=3)||t>=6.0},()=>hardSpawn("pointer",{x:745,tag:"ultra16-p2",hpMul:1.08})),
  waveEvent("subs","형광펜 소멸 · 잠수함 협공",t=>{const e=tagged("ultra16-h");return (t>=7.3&&(!e||e.state==="fade"))||t>=9.6},()=>{hardSubmarineOffset(155,-70,{tag:"ultra16-s1",hpMul:1.08});hardSubmarineOffset(745,70,{tag:"ultra16-s2",hpMul:1.08})})]},
 {section:"초고난도",title:"마감 3초 전 무응답",duration:24,desc:"카운트다운 숫자가 내려갈 때마다 무응답·유령·포인터·잠수함이 추가되고, 두 번째 카운트다운에서 말풍선이 한 마리 더 합류합니다.",events:[
  waveEvent("c","카운트다운봇 진입",t=>t>=0,()=>hardSpawn("countdown",{x:450,tag:"ultra17-c",hpMul:1.15})),
  waveEvent("n1","숫자 3 · 무응답 말풍선",t=>{const e=tagged("ultra17-c");return !!(e&&e.state==="count"&&e.data.n===3)||t>=1.6},()=>hardSpawn("noreply",{x:285,tag:"ultra17-n1",hpMul:1.14})),
  waveEvent("g1","숫자 2 · 첫 번째 유령",t=>{const e=tagged("ultra17-c");return !!(e&&e.data.n<=2)||t>=2.5},()=>hardSpawn("ghost",{x:190,tag:"ultra17-g1",hpMul:1.08})),
  waveEvent("g2","유령 연속 진입",t=>t>=3.2,()=>hardSpawn("ghost",{x:710,tag:"ultra17-g2",hpMul:1.08})),
  waveEvent("p","숫자 1 · 발표 포인터",t=>{const e=tagged("ultra17-c");return !!(e&&e.data.n<=1)||t>=3.6},()=>hardSpawn("pointer",{x:745,tag:"ultra17-p",hpMul:1.08})),
  waveEvent("subs","숫자 0 · 잠수함 양면 협공",t=>{const e=tagged("ultra17-c");return !!(e&&e.state==="zero")||t>=4.7},()=>{hardSubmarineOffset(155,-75,{tag:"ultra17-s1",hpMul:1.08});hardSubmarineOffset(745,75,{tag:"ultra17-s2",hpMul:1.08})}),
  waveEvent("n2","두 번째 카운트다운 · 말풍선 추가",t=>{const e=tagged("ultra17-c");return !!(e&&e.shots>=1)||t>=7.2},()=>hardSpawn("noreply",{x:615,tag:"ultra17-n2",hpMul:1.14}))]},
 {section:"초고난도",title:"참고문헌 붕괴 사고",duration:26,desc:"연결망 포위 뒤 교정기·유령·드론이 단계적으로 겹치고, 참고문헌 벌레가 사라진 뒤 포인터 두 마리가 남은 탄막을 가릅니다.",events:[
  waveEvent("r","참고문헌 벌레 4마리",t=>t>=0,()=>spawnHardReferenceSquad("ultra18-ref")),
  waveEvent("f","인용망 수렴 · 형식 오류 교정기",t=>enemies.some(e=>e.waveRunId===currentWaveRunId&&e.type==="reference"&&e.state==="cross")||t>=3.5,()=>hardSpawn("format",{x:250,tag:"ultra18-f",hpMul:1.12})),
  waveEvent("g1","벌레 교차 · 첫 번째 유령",t=>enemies.some(e=>e.waveRunId===currentWaveRunId&&e.type==="reference"&&e.state==="cross")||t>=4.2,()=>hardSpawn("ghost",{x:205,tag:"ultra18-g1",hpMul:1.08})),
  waveEvent("g2","두 번째 유령 연속 진입",t=>t>=5.0,()=>hardSpawn("ghost",{x:695,tag:"ultra18-g2",hpMul:1.08})),
  waveEvent("d1","교정기 두 번째 반사 · 왼쪽 드론",t=>{const e=tagged("ultra18-f");return !!(e&&e.bounces>=2)||t>=6.5},()=>hardSpawn("drone",{x:255,tag:"ultra18-d1",hpMul:1.12})),
  waveEvent("d2","엇박자 오른쪽 드론",t=>t>=7.3,()=>hardSpawn("drone",{x:645,tag:"ultra18-d2",hpMul:1.12})),
  waveEvent("p1","연결망 붕괴 · 첫 번째 포인터",t=>{const refs=enemies.filter(e=>!e.dead&&e.waveRunId===currentWaveRunId&&e.type==="reference");return (t>=7.4&&refs.length===0)||t>=11.2},()=>hardSpawn("pointer",{x:155,tag:"ultra18-p1",hpMul:1.08})),
  waveEvent("p2","두 번째 포인터 연속 돌진",t=>t>=11.9,()=>hardSpawn("pointer",{x:745,tag:"ultra18-p2",hpMul:1.08}))]},
 {section:"초고난도",title:"밤샘 과충전 연쇄",duration:25,desc:"에너지 포위망 속에서 말풍선과 포인터가 이동을 강제하고, 냉각·과충전 분열 시점에 잠수함과 유령이 연속 합류합니다.",events:[
  waveEvent("e","밤샘 에너지 흡수체 진입",t=>t>=0,()=>hardSpawn("energy",{x:450,tag:"ultra19-e",hpMul:1.16})),
  waveEvent("n","구슬 생성 · 무응답 말풍선",t=>{const e=tagged("ultra19-e");return !!(e&&e.state==="summon")||t>=1.8},()=>hardSpawn("noreply",{x:285,tag:"ultra19-n",hpMul:1.14})),
  waveEvent("p1","포위 반경 절반 · 첫 번째 포인터",t=>{const e=tagged("ultra19-e");return bullets.some(b=>!b.dead&&b.waveRunId===currentWaveRunId&&b.kind==="energyWisp"&&b.data.owner===e&&(b.data.radius||999)<=175)||t>=2.9},()=>hardSpawn("pointer",{x:155,tag:"ultra19-p1",hpMul:1.08})),
  waveEvent("p2","구슬 회수 · 반대편 포인터",t=>{const e=tagged("ultra19-e");return !!(e&&e.state==="recall")||t>=3.8},()=>hardSpawn("pointer",{x:745,tag:"ultra19-p2",hpMul:1.08})),
  waveEvent("subs","첫 냉각 · 잠수함 협공",t=>{const e=tagged("ultra19-e");return !!(e&&e.state==="cool")||t>=4.9},()=>{hardSubmarineOffset(155,-70,{tag:"ultra19-s1",hpMul:1.08});hardSubmarineOffset(745,70,{tag:"ultra19-s2",hpMul:1.08})}),
  waveEvent("ghosts","과충전 탄 분열 · 유령 두 마리",t=>{const e=tagged("ultra19-e");return !!(e&&(e.data.bombsSplit||0)>=1)||t>=6.0},()=>{hardSpawn("ghost",{x:220,tag:"ultra19-g1",hpMul:1.08});hardSpawn("ghost",{x:680,tag:"ultra19-g2",hpMul:1.08})})]},
 {section:"초고난도 · 최종",title:"최종 제출 압축 재난",duration:34,desc:"압축기 첫 공격은 단독으로 진행되고, 두 번째 압축부터 교정기·유령, 세 번째 압축부터 드론·포인터, 두 번째 사이클부터 말풍선·잠수함이 합류합니다.",events:[
  waveEvent("boss","강화 페이지 제한 압축기",t=>t>=0,()=>hardSpawn("compressor",{x:450,y:-120,r:86,data:{phase:1},tag:"ultra20-boss",hpMul:1.2})),
  waveEvent("stage2","두 번째 압축 · 교정기와 유령",t=>{const e=tagged("ultra20-boss");return !!(e&&(e.data.clampCount||0)>=2)||t>=7.0},()=>{hardSpawn("format",{x:230,tag:"ultra20-f",hpMul:1.12,data:{corridorFriendly:true}});hardSpawn("ghost",{x:player.x<450?700:200,tag:"ultra20-g",hpMul:1.08})}),
  waveEvent("stage3","세 번째 압축 · 드론과 포인터",t=>{const e=tagged("ultra20-boss");return !!(e&&(e.data.clampCount||0)>=3)||t>=11.5},()=>{hardSpawn("drone",{x:player.x<450?650:250,tag:"ultra20-d",hpMul:1.12});hardSpawn("pointer",{x:clamp(player.x,155,745),tag:"ultra20-p",hpMul:1.08})}),
  waveEvent("n","두 번째 압축 사이클 · 무응답 말풍선",t=>{const e=tagged("ultra20-boss");return !!(e&&(e.data.clampCount||0)>=4)||t>=16.5},()=>hardSpawn("noreply",{x:450,tag:"ultra20-n",hpMul:1.14})),
  waveEvent("s1","두 번째 사이클 · 첫 잠수함",t=>{const e=tagged("ultra20-boss");return !!(e&&(e.data.clampCount||0)>=4)||t>=16.5},()=>hardSubmarineOffset(155,-65,{tag:"ultra20-s1",hpMul:1.08})),
  waveEvent("s2","0.7초 후 두 번째 잠수함",t=>t>=17.2,()=>hardSubmarineOffset(745,65,{tag:"ultra20-s2",hpMul:1.08}))]}

];function chooseGhostTeleportPosition(){
 // 세로형 슈팅 기준으로 플레이어의 "앞"은 화면 위쪽입니다.
 // 플레이어 바로 앞이 아니라 약 340~430px 떨어진 전방 후보를 우선합니다.
 const desiredGaps=[370,410,450,340];
 const sideOffsets=[0,-70,70,-125,125,-175,175];
 const candidates=[];

 for(const gap of desiredGaps){
  for(const side of sideOffsets){
   const x=clamp(player.x+side,90,W-90);
   const y=clamp(player.y-gap,105,H-230);
   const dx=x-player.x,dy=y-player.y,d=Math.hypot(dx,dy);
   const isAhead=y<player.y-80;
   if(isAhead)candidates.push({x,y,d,gap,side});
  }
 }

 // 화면 위쪽에 공간이 부족한 경우에도 반드시 플레이어보다 위쪽이면서
 // 최소 320px 정도 떨어진 위치를 찾도록 좌우 전방 후보를 추가합니다.
 const upperY=clamp(player.y-250,90,Math.max(90,player.y-90));
 for(const x of [90,W-90,player.x< W/2?W-110:110]){
  const d=Math.hypot(x-player.x,upperY-player.y);
  if(upperY<player.y-80)candidates.push({x,y:upperY,d,gap:250,side:x-player.x});
 }

 const safe=candidates
  .filter(v=>v.d>=320)
  .sort((a,b)=>{
   // 정면 중앙에 가깝고 목표 간격 390px 부근인 후보를 우선합니다.
   const sa=Math.abs(a.side)*1.25+Math.abs(a.d-390);
   const sb=Math.abs(b.side)*1.25+Math.abs(b.d-390);
   return sa-sb;
  });
 if(safe.length)return{x:safe[0].x,y:safe[0].y};

 // 극단적인 위치에서도 가장 멀리 떨어진 전방 후보를 사용합니다.
 const farthest=candidates.sort((a,b)=>b.d-a.d)[0];
 return farthest?{x:farthest.x,y:farthest.y}:{x:clamp(player.x,90,W-90),y:105};
}
function setState(e,s){e.state=s;e.stateT=0}
function highlighterLineAcrossScreen(e){
 const minX=-120,maxX=W+120,minY=-120,maxY=H+120;
 let angle=0;
 for(let tries=0;tries<12;tries++){
  angle=rnd(0,Math.PI);
  const prev=e.data.lastAngle;
  if(prev==null)break;
  let d=Math.abs(angle-prev)%Math.PI;
  d=Math.min(d,Math.PI-d);
  if(d>.34)break
 }
 const cx=clamp(player.x+rnd(-190,190),115,W-115);
 const cy=clamp(player.y+rnd(-210,210),115,H-115);
 const dx=Math.cos(angle),dy=Math.sin(angle);
 const hits=[];
 const add=(t,x,y)=>{
  if(x>=minX-1&&x<=maxX+1&&y>=minY-1&&y<=maxY+1)hits.push({t,x,y})
 };
 if(Math.abs(dx)>.0001){
  let t=(minX-cx)/dx;add(t,minX,cy+t*dy);
  t=(maxX-cx)/dx;add(t,maxX,cy+t*dy)
 }
 if(Math.abs(dy)>.0001){
  let t=(minY-cy)/dy;add(t,cx+t*dx,minY);
  t=(maxY-cy)/dy;add(t,cx+t*dx,maxY)
 }
 hits.sort((a,b)=>a.t-b.t);
 const unique=[];
 for(const h of hits){
  if(!unique.some(u=>Math.hypot(u.x-h.x,u.y-h.y)<2))unique.push(h)
 }
 let a=unique[0],b=unique[unique.length-1];
 if(!a||!b){a={x:cx-Math.cos(angle)*900,y:cy-Math.sin(angle)*900};b={x:cx+Math.cos(angle)*900,y:cy+Math.sin(angle)*900}}
 if(Math.random()<.5){const tmp=a;a=b;b=tmp;angle+=Math.PI}
 const vx=b.x-a.x,vy=b.y-a.y,len=Math.hypot(vx,vy)||1;
 e.data.line={x1:a.x,y1:a.y,x2:b.x,y2:b.y,dx:vx/len,dy:vy/len,len,angle:Math.atan2(vy,vx)};
 e.data.lastAngle=((e.data.line.angle%Math.PI)+Math.PI)%Math.PI;
 e.data.wobbleSeed=Math.random()*1000;
 e.data.progress=0
}
function spawnEliteClamp(e){
 const phase=e.data.phase||1;
 const half=phase===1?125:phase===2?102:82;
 const speed=(phase===1?560:phase===2?740:920)*diff();
 const hold=phase===1?.22:phase===2?.28:.34;
 const rows=10;
 const topY=300;
 const bottomY=1160;
 const gapCenter=e.data.gapCurrent??e.data.gapTarget??e.data.gap??W/2;
 for(let i=0;i<rows;i++){
  const t=i/(rows-1);
  const y=topY+(bottomY-topY)*t;
  const delay=Math.abs(i-(rows-1)/2)*.008+(phase===3?i*.006:0);
  const waveAmp=phase===1?34:phase===2?24:16;
  const rowOffset=Math.sin(t*Math.PI*1.35+phase*.75)*waveAmp;
  const rowGap=clamp(gapCenter+rowOffset,185,W-185);
  spawnBullet("eliteWall",-145,y,0,0,{wall:true,r:0,scale:.24,dormant:true,active:false,data:{side:"left",stopX:rowGap-half-72,speed,hold,delay,phase,impactFx:i===Math.floor(rows/2)}});
  spawnBullet("eliteWall",W+145,y,Math.PI,0,{wall:true,r:0,scale:.24,dormant:true,active:false,data:{side:"right",stopX:rowGap+half+72,speed,hold,delay,phase,impactFx:false}})
 }
 addEffect("pulse",e.x,e.y+20,{life:.55,r:48,color:"#ffd84e"})
}
function updateEnemy(e,dt){const oldX=e.x,oldY=e.y;e.t+=dt;e.stateT+=dt;const q=diff();
 if(e.type==="ghost"){
  // 순간이동 전후에 공통으로 사용하는 하강 이동입니다.
  const ghostCruise=()=>{
   e.y+=126*q*dt;
   e.x+=Math.sin(e.t*3.2+e.seed)*82*dt;
   e.x=clamp(e.x,75,W-75);
  };

  if(e.state==="enter"){
   ghostCruise();
   // 충분히 내려온 뒤, 플레이어에게 가까이 붙기 전에 순간이동 신호를 시작합니다.
   const d=Math.hypot(player.x-e.x,player.y-e.y);
   if(e.y>=360&&d<=700){
    const target=chooseGhostTeleportPosition();
    e.data.tx=target.x;e.data.ty=target.y;
    addEffect("ghostWarning",e.x,e.y,{life:.78/q,r:50,color:"#fff0a5",alpha:1});
    setState(e,"signal")
   }
  }
  else if(e.state==="signal"){
   // 경고 중에도 멈추지 않고 기존 하강 이동을 그대로 유지합니다.
   ghostCruise();
   e.x+=Math.sin(e.stateT*48)*1.7;
   if(e.stateT>.74/q){
    addEffect("ghostVanish",e.x,e.y,{life:.50/q,r:52,color:"#cbbcff",alpha:1});
    addEffect("pulse",e.x,e.y,{life:.38/q,r:24,color:"#fff0a5"});
    setState(e,"vanish")
   }
  }
  else if(e.state==="vanish"){
   // 소멸 과정에서도 이동 흐름이 갑자기 끊기지 않도록 아래로 진행합니다.
   ghostCruise();
   if(e.stateT>.46/q){
    e.x=e.data.tx;e.y=e.data.ty;
    addEffect("ghostArrival",e.x,e.y,{life:.64/q,r:44,color:"#eee9ff",alpha:1});
    addEffect("pulse",e.x,e.y,{life:.56/q,r:34,color:"#d7d2ff"});
    setState(e,"appear")
   }
  }
  else if(e.state==="appear"){
   // 재등장 모션 중에도 아래로 이동합니다.
   ghostCruise();
   if(e.stateT>.68/q)setState(e,"postMove")
  }
  else if(e.state==="postMove"){
   // 몸통박치기 없이 순간이동 전과 같은 하강 이동을 계속합니다.
   ghostCruise();
  }
 }
 else if(e.type==="pointer"){
  if(e.state==="enter"){
   if(e.data.bodyAngle==null)e.data.bodyAngle=Math.PI/2;
   e.y+=170*q*dt;
   if(e.y>=170){e.y=170;setState(e,"aim")}
  }
  else if(e.state==="aim"){
   const target=aim(e.x,e.y);
   e.data.bodyAngle=turnAngle(e.data.bodyAngle??Math.PI/2,target,7.2*q*dt);
   e.data.aim=e.data.bodyAngle;
   if(e.stateT>.72/q)setState(e,"flash")
  }
  else if(e.state==="flash"){
   if(e.stateT>.48/q){
    const a=e.data.aim;
    e.vx=Math.cos(a)*900*q;
    e.vy=Math.sin(a)*900*q;
    e.data.bodyAngle=a;
    setState(e,"dash")
   }
  }
  else{
   e.x+=e.vx*dt;
   e.y+=e.vy*dt;
   e.data.bodyAngle=Math.atan2(e.vy,e.vx);
  }
 }
 else if(e.type==="submarine"){
  if(e.state==="main"){
   e.x+=e.vx*dt;e.y+=e.vy*dt;
   if(e.stateT>.62/q)setState(e,"dive")
  }
  else if(e.state==="dive"){
   e.x+=e.vx*dt*.45;
   e.y+=e.vy*dt*.45;
   e.x+=Math.sin(e.t*12+e.seed)*15*dt;
   if(e.stateT>.72/q){
    const a=aim(e.x,e.y),s=Math.max(520,576*q);
    e.vx=Math.cos(a)*s;e.vy=Math.sin(a)*s;
    addEffect("pulse",e.x,e.y,{life:.45,r:44,color:"#63d5ff"});
    addEffect("bubble",e.x-12,e.y+6,{life:.48,vx:Math.cos(a+Math.PI*.6)*105,vy:Math.sin(a+Math.PI*.6)*105,r:7,color:"#76e0ff",alpha:.72});
    addEffect("bubble",e.x+12,e.y-6,{life:.48,vx:Math.cos(a-Math.PI*.6)*105,vy:Math.sin(a-Math.PI*.6)*105,r:7,color:"#76e0ff",alpha:.72});
    e.cool=0;
    setState(e,"dash")
   }
  }
  else{
   e.x+=e.vx*dt;e.y+=e.vy*dt;
   e.cool-=dt;
   if(e.cool<=0){
    e.cool=.14;
    const a=Math.atan2(-e.vy,-e.vx)+rnd(-.25,.25);
    addEffect("bubble",e.x-e.vx*.02,e.y-e.vy*.02,{life:.48,vx:Math.cos(a)*70,vy:Math.sin(a)*70,r:4,color:"#6ddfff",alpha:.55})
   }
  }
 }
 else if(e.type==="anxiety"){
  if(e.state==="enter"){e.y+=130*q*dt;e.x+=Math.sin(e.t*9)*85*dt;if(e.y>220){e.y=220;setState(e,"move")}}
  else if(e.state==="move"){e.y=220+Math.sin(e.t*2.4+e.seed)*18;e.x=clamp(e.x+Math.sin(e.t*10)*145*dt,85,W-85);if(e.stateT>1.15/q)setState(e,"stop")}
  else if(e.state==="stop"){if(e.stateT>.22/q){const a=aim(e.x,e.y);for(let i=-2;i<=2;i++)spawnBullet("drop",e.x,e.y,a+i*.21,285*q,{r:13,scale:.34});e.shots++;e.vx=(Math.random()<.5?-1:1)*220;setState(e,"evade")}}
  else if(e.state==="evade"){e.x+=e.vx*dt;if(e.stateT>.3/q)setState(e,"move")}
  else e.y-=190*dt;
 }
 else if(e.type==="noreply"){
  if(e.state==="enter"){
   e.y+=145*q*dt;
   if(e.y>220){e.y=220;setState(e,"attack")}
  }
  else if(e.state==="attack"){
   e.x+=Math.sin(e.t*2.4+e.seed)*28*dt;
   if(!e.data.fired&&e.stateT>.34/q){
    e.data.fired=true;
    const speed=272*q;
    const a1=aim(e.x-18,e.y+48)-.07;
    const a2=aim(e.x+18,e.y+48)+.07;
    spawnBullet("noReplyCore",e.x-18,e.y+48,a1,speed,{r:22,scale:.95,state:"main"});
    spawnBullet("noReplyCore",e.x+18,e.y+48,a2,speed,{r:22,scale:.95,state:"main"});
   }
   if(e.stateT>2.15/q){
    e.shots++;
    e.data.fired=false;setState(e,"attack")
   }
  }
  else e.y-=170*dt
 }
 else if(e.type==="format"){
  if(e.state==="enter"){
   if(e.data.corridorFriendly){
    e.x=clamp(e.x||W*.28,120,W-120);e.y=150;
    const dir=e.x<W/2?1:-1;
    e.vx=dir*250*q;e.vy=86*q
   }else{e.x=W*.28;e.y=150;e.vx=210*q;e.vy=210*q}
   setState(e,"bounce")
  }
  else if(e.state==="bounce"){e.x+=e.vx*dt;e.y+=e.vy*dt;let hit=false;if(e.x<80||e.x>W-80){e.vx*=-1;e.x=clamp(e.x,80,W-80);hit=true}if(e.y<120||e.y>H*.62){e.vy*=-1;e.y=clamp(e.y,120,H*.62);hit=true}if(hit){e.bounces++;const a=Math.atan2(e.vy,e.vx);spawnBullet("x",e.x,e.y,a+Math.PI/2,250*q,{r:13,scale:.27});spawnBullet("x",e.x,e.y,a-Math.PI/2,250*q,{r:13,scale:.27});addEffect("pulse",e.x,e.y,{life:.35,r:20,color:"#ff5960"});if(e.bounces>=3)setState(e,"warn")}}
  else if(e.state==="warn"){if(e.stateT>.62/q){for(let i=0;i<8;i++)spawnBullet("x",e.x,e.y,i*Math.PI/4,310*q,{r:14,scale:.3});for(let i=0;i<18;i++)addEffect("spark",e.x,e.y,{life:.5,vx:rnd(-230,230),vy:rnd(-230,230),r:rnd(3,7),color:"#ff565d"});burstParticles(e.x,e.y,"#ffe270",16,225);e.dead=true}}
 }
 else if(e.type==="energy"){
  if(e.state==="enter"){
   e.y+=125*q*dt;
   if(e.y>255){e.y=255;e.data.round=0;setState(e,"summon")}
  }
  else if(e.state==="summon"){
   e.x=W/2+Math.sin(e.t*1.8+e.seed)*115;
   if(!e.data.spawned){
    e.data.spawned=true;e.data.collected=0;e.data.round++;
    const cx=player.x,cy=player.y;
    for(let i=0;i<3;i++)spawnBullet("energyWisp",cx,cy,0,0,{r:15,scale:.64,data:{owner:e,index:i,angle:i*Math.PI*2/3,radius:255,cx,cy}})
   }
   if(e.stateT>1.35/q)setState(e,"recall")
  }
  else if(e.state==="recall"){
   const dx=e.x-player.x,dy=e.y-player.y,d=len(dx,dy);
   if(d<520){player.x+=dx/d*22*dt;player.y+=dy/d*22*dt}
   if(e.stateT>1.2/q||e.data.collected>=3)setState(e,"overcharge")
  }
  else if(e.state==="overcharge"){
   e.x+=Math.sin(e.stateT*42)*2.6;
   if(e.stateT>.48/q){
    const a=aim(e.x,e.y);
    spawnBullet("energyBomb",e.x,e.y+56,a,225*q,{r:31,scale:1.44,data:{splitAt:.92/q,owner:e}});
    setState(e,"cool")
   }
  }
  else if(e.state==="cool"){
   e.x+=Math.sin(e.t*3.4)*95*dt;
   if(e.stateT>.72/q){e.data.spawned=false;setState(e,"summon")}
  }
  else e.y-=165*dt;
 }
 else if(e.type==="reference"){
  const idx=e.data.index||0;
  const targetX=W/2+(idx-1.5)*135,targetY=165+(idx%2)*72;
  if(e.state==="enter"){
   e.x+=(targetX-e.x)*4.2*dt;e.y+=(targetY-e.y)*4.2*dt;
   if(Math.hypot(targetX-e.x,targetY-e.y)<8){e.x=targetX;e.y=targetY;setState(e,"build")}
  }
  else if(e.state==="build"){
   e.x=targetX+Math.sin(e.t*4+idx)*25;
   e.y=targetY+Math.cos(e.t*3.2+idx)*14;
   if(!e.data.anchorMade&&e.stateT>.22/q+idx*.13){
    e.data.anchorMade=true;
    const ang=-Math.PI*3/4+idx*Math.PI/2;
    const ax=clamp(player.x+Math.cos(ang)*205,85,W-85);
    const ay=clamp(player.y+Math.sin(ang)*150,330,H-90);
    spawnBullet("citationAnchor",e.x,e.y,Math.atan2(ay-e.y,ax-e.x),360*q,{r:13,scale:.58,data:{index:idx,targetX:ax,targetY:ay}})
   }
   if(e.stateT>1.62/q){
    const a=aim(e.x,e.y)+(idx-1.5)*.055;
    spawnBullet("citation",e.x,e.y+24,a,315*q,{r:12,scale:1.05,curve:idx%2?-.22:.22});
    e.vx=(idx<2?1:-1)*(330+idx*18)*q;e.vy=(115+(idx%2)*55)*q;
    setState(e,"cross")
   }
  }
  else{
   e.x+=e.vx*dt;e.y+=e.vy*dt;
   e.y+=Math.sin(e.t*10+idx)*38*dt;
  }
 }

 else if(e.type==="highlighter"){
  if(e.state==="enter"){
   // 등장 직후 대기 없이 첫 선의 시작점으로 곧바로 돌진합니다.
   e.data.stroke=0;
   e.data.batchId=`hl-${e.seed}-${time.toFixed(3)}`;
   e.data.lastAngle=null;
   highlighterLineAcrossScreen(e);
   setState(e,"reposition")
  }
  else if(e.state==="reposition"){
   const l=e.data.line;
   const dx=l.x1-e.x,dy=l.y1-e.y,d=Math.hypot(dx,dy)||1;
   const sp=900*q;
   e.x+=dx/d*Math.min(sp*dt,d);
   e.y+=dy/d*Math.min(sp*dt,d);
   e.data.bodyAngle=l.angle;
   if(d<10){
    e.x=l.x1;e.y=l.y1;
    e.data.progress=0;
    e.data.prevX=e.x;e.data.prevY=e.y;
    addEffect("pulse",e.x,e.y,{life:.25,r:17,color:"#d7ff36"});
    setState(e,"paint")
   }
  }
  else if(e.state==="paint"){
   const l=e.data.line;
   const prevX=e.x,prevY=e.y;
   const speed=650*q;
   e.data.progress=Math.min(l.len,e.data.progress+speed*dt);
   const u=e.data.progress/l.len;
   const baseX=l.x1+(l.x2-l.x1)*u;
   const baseY=l.y1+(l.y2-l.y1)*u;
   const nx=-l.dy,ny=l.dx;
   const wobble=Math.sin(u*19.5+e.data.wobbleSeed)*3.2+Math.sin(u*46.0+e.data.wobbleSeed*.41)*1.15;
   e.x=baseX+nx*wobble;
   e.y=baseY+ny*wobble;
   e.data.bodyAngle=l.angle;
   const segLen=Math.hypot(e.x-prevX,e.y-prevY);
   if(segLen>1){
    trails.push({kind:"highlightStroke",batchId:e.data.batchId,x1:prevX,y1:prevY,x2:e.x,y2:e.y,t:0,life:999,fadeStart:null,r:20+rnd(-2.5,2.5),alpha:.76,seed:Math.random()*10})
   }
   if(e.data.progress>=l.len){
    e.data.stroke++;
    if(e.data.stroke>=4){
     const fadeDuration=2.65/q;
     for(const t of trails){
      if(t.kind==="highlightStroke"&&t.batchId===e.data.batchId){
       t.fadeStart=t.t;
       t.life=t.t+fadeDuration
      }
     }
     e.data.fadeDuration=fadeDuration;
     // 마지막 획의 바깥쪽 끝에서 화면 안쪽으로 한 걸음 되돌아와
     // 잉크가 사라지는 동안에도 형광펜 본체가 계속 보이게 합니다.
     e.data.fadeX=clamp(l.x2-l.dx*150,120,W-120);
     e.data.fadeY=clamp(l.y2-l.dy*150,110,H-110);
     e.x=e.data.fadeX;
     e.y=e.data.fadeY;
     setState(e,"fade")
    }else{
     highlighterLineAcrossScreen(e);
     setState(e,"reposition")
    }
   }
  }
  else if(e.state==="fade"){
   const l=e.data.line;
   const fx=e.data.fadeX??clamp(e.x,120,W-120);
   const fy=e.data.fadeY??clamp(e.y,110,H-110);
   // 선이 사라지는 동안 화면 안에서 가볍게 떠 있도록 유지합니다.
   e.x=fx+Math.sin(e.stateT*3.4+e.seed)*12;
   e.y=fy+Math.sin(e.stateT*4.1+e.seed*.7)*7;
   e.data.bodyAngle=l.angle;
   if(e.stateT>(e.data.fadeDuration||2.65/q))e.dead=true
  }
 }
 else if(e.type==="countdown"){
  if(e.state==="enter"){e.y+=145*q*dt;if(e.y>205){e.y=205;e.data.n=3;setState(e,"count")}}
  else if(e.state==="count"){if(e.stateT>.82/q){const n=e.data.n,count=n===3?4:n===2?6:8;for(let i=0;i<count;i++)spawnBullet("timer",e.x,e.y,i*Math.PI*2/count+e.t*.15,245*q,{r:12,scale:.66});e.data.n--;if(e.data.n<=0)setState(e,"zero");else e.stateT=0}}
  else if(e.state==="zero"){if(e.stateT>.72/q){spawnBullet("timer",e.x,e.y,aim(e.x,e.y),270*q,{r:27,scale:1.12});e.shots++;e.data.n=3;setState(e,"count")}}
 }
 else if(e.type==="compressor"){
  const cruise=()=>{
   if(e.data.moveVX==null)e.data.moveVX=(Math.random()<.5?-1:1)*82*q;
   e.x+=e.data.moveVX*dt;
   const left=155,right=W-155;
   if(e.x<left){e.x=left;e.data.moveVX=Math.abs(e.data.moveVX)}
   else if(e.x>right){e.x=right;e.data.moveVX=-Math.abs(e.data.moveVX)}
   e.y=175+Math.sin(e.t*1.45+e.seed)*9;
  };
  if(e.state==="enter"){
   e.y+=105*q*dt;
   if(e.y>175){
    e.y=175;
    e.data.phase=1;
    e.data.clampCount=0;
    e.data.moveVX=(Math.random()<.5?-1:1)*82*q;
    const g=clamp(player.x,210,W-210);
    e.data.gapTarget=g;
    e.data.gapCurrent=g;
    setState(e,"charge")
   }
  }
  else if(e.state==="charge"){
   cruise();
   const follow=(1-Math.exp(-dt*4.8*q));
   const target=e.data.gapTarget??W/2;
   e.data.gapCurrent=(e.data.gapCurrent??target)+(target-(e.data.gapCurrent??target))*follow;
   if(e.stateT>(e.data.phase===1?.88:e.data.phase===2?.72:.62)/q){
    e.data.clampCount=(e.data.clampCount||0)+1;
    spawnEliteClamp(e);
    setState(e,"clamp")
   }
  }
  else if(e.state==="clamp"){
   cruise();
   const follow=(1-Math.exp(-dt*3.4*q));
   const target=e.data.gapTarget??W/2;
   e.data.gapCurrent=(e.data.gapCurrent??target)+(target-(e.data.gapCurrent??target))*follow;
   const wait=e.data.phase===1?1.75:e.data.phase===2?1.62:1.52;
   if(e.stateT>wait/q){
    const count=e.data.phase===3?12:8;
    for(let i=0;i<count;i++)spawnBullet("block",e.x,e.y+42,i*Math.PI*2/count+(e.data.phase%2)*.18,235*q+(e.data.phase-1)*28,{r:12,scale:.2});
    for(let i=0;i<14;i++)addEffect("spark",e.x,e.y+30,{life:.5,vx:rnd(-220,220),vy:rnd(-120,250),r:rnd(3,7),color:"#ffd84e"});
    if(e.data.phase>=3){
     e.data.phase=1;
     e.data.gapTarget=clamp(player.x,190,W-190);
     setState(e,"recover")
    }else{
     e.data.phase++;
     const shift=e.data.phase===2?(player.x<W/2?110:-110):0;
     e.data.gapTarget=clamp(player.x+shift,190,W-190);
     setState(e,"charge")
    }
   }
  }
  else if(e.state==="recover"){
   cruise();
   if(e.stateT>.82/q)setState(e,"charge")
  }
 }
 else if(e.type==="drone"){
  if(e.state==="enter"){
   e.y+=180*q*dt;
   if(e.y>310){e.y=310;e.shots=0;e.cool=0;e.data.boomerangBursts=0;setState(e,"hover")}
  }
  else if(e.state==="hover"){
   e.x+=Math.sin(e.t*2.5+e.seed)*40*dt;
   e.cool-=dt;
   if(e.cool<=0){
    e.cool=.72/q;
    e.shots++;
    const a=aim(e.x,e.y);
    spawnBullet("miniShard",e.x,e.y+28,a,245*q,{r:10,scale:.68,data:{source:"reportDrone",maxLife:20}});
    if(e.shots%3===0&&(e.data.boomerangBursts||0)<4){
     e.data.boomerangBursts=(e.data.boomerangBursts||0)+1;
     spawnBullet("boomerangPage",e.x-16,e.y+8,a-.48,215*q,{r:13,scale:.78,data:{curve:-1,source:"reportDrone",maxLife:20}});
     spawnBullet("boomerangPage",e.x+16,e.y+8,a+.48,215*q,{r:13,scale:.78,data:{curve:1,source:"reportDrone",maxLife:20}})
    }
   }
  }
 }
 e.motionX=(e.x-oldX)/Math.max(dt,.001);e.motionY=(e.y-oldY)/Math.max(dt,.001);
 if(!e.dead&&e.state!=="fade"&&e.state!=="vanish"){
  e.exhaustTimer-=dt;
  if(e.exhaustTimer<=0&&particles.length<MAX_PARTICLES*.82){const [mw,mh]=monsterBox(e.type),color=monsterColor(e.type);pushParticle({x:e.x+rnd(-8,8),y:e.y+mh*.27,vx:rnd(-12,12),vy:rnd(32,60),life:rnd(.18,.34),size:rnd(1.2,2.6),color,shape:"streak"});e.exhaustTimer=rnd(.11,.18)}
 }
 if(e.x<-180||e.x>W+180||e.y<-220||e.y>H+220)e.dead=true;
}
function bulletImage(k){return images[k]}
function updateBullet(b,dt){
 b.px=b.x;b.py=b.y;
 b.t+=dt;b.stateT+=dt;b.cool-=dt;b.flash=Math.max(0,(b.flash||0)-dt);
 if(b.kind==="citationAnchor"){
  if(b.state==="main"){
   const dx=b.data.targetX-b.x,dy=b.data.targetY-b.y,d=len(dx,dy),sp=360*diff();
   if(d<sp*dt+6){b.x=b.data.targetX;b.y=b.data.targetY;b.vx=0;b.vy=0;b.state="anchor";b.stateT=0;b.dormant=true;b.active=false}
   else{b.x+=dx/d*sp*dt;b.y+=dy/d*sp*dt;b.a=Math.atan2(dy,dx)}
  }else if(b.state==="anchor"){
   if(b.stateT>.78/diff()+b.data.index*.06){
    b.dormant=false;b.active=true;b.state="launch";b.stateT=0;
    b.a=aim(b.x,b.y);const sp=320*diff();b.vx=Math.cos(b.a)*sp;b.vy=Math.sin(b.a)*sp;b.curve=b.data.index%2?-.25:.25
   }
  }else{
   b.a+=b.curve*.85*dt;const sp=len(b.vx,b.vy);b.vx=Math.cos(b.a)*sp;b.vy=Math.sin(b.a)*sp;b.x+=b.vx*dt;b.y+=b.vy*dt
  }
 }else if(b.kind==="energyWisp"){
  const owner=b.data.owner;
  if(!owner||owner.dead){
   if(b.state!=="orphan"){
    b.state="orphan";b.stateT=0;b.dormant=false;b.active=true;
    b.a=aim(b.x,b.y);const sp=235*diff();b.vx=Math.cos(b.a)*sp;b.vy=Math.sin(b.a)*sp
   }
   b.x+=b.vx*dt;b.y+=b.vy*dt
  }
  else if(b.state==="main"){
   b.data.angle+=2.35*dt;
   b.data.radius=Math.max(102,b.data.radius-112*dt);
   b.x=b.data.cx+Math.cos(b.data.angle)*b.data.radius;
   b.y=b.data.cy+Math.sin(b.data.angle)*b.data.radius*.72;
   b.a=b.data.angle+Math.PI/2;
   if(owner.state==="recall"){b.state="return";b.stateT=0;b.dormant=true;b.active=false}
  }else{
   const dx=owner.x-b.x,dy=owner.y-b.y,d=len(dx,dy),sp=540*diff();
   b.x+=dx/d*sp*dt;b.y+=dy/d*sp*dt;b.a=Math.atan2(dy,dx);
   if(d<24){b.dead=true;owner.data.collected=(owner.data.collected||0)+1;addEffect("pulse",owner.x,owner.y,{life:.26,r:18,color:"#a87cff"})}
  }
 }else if(b.kind==="energyBomb"){
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.t>(b.data.splitAt||.9)){
   const base=aim(b.x,b.y);
   for(let i=0;i<8;i++)spawnBullet("energy",b.x,b.y,i*Math.PI/4+base*.08,225*diff()+(i%2)*45,{r:12,scale:.66});
   for(let i=-1;i<=1;i++)spawnBullet("energy",b.x,b.y,base+i*.18,285*diff(),{r:13,scale:.72});
   addEffect("pulse",b.x,b.y,{life:.58,r:56,color:"#b88aff"});const owner=b.data.owner;if(owner&&!owner.dead)owner.data.bombsSplit=(owner.data.bombsSplit||0)+1;vanishBullet(b,1.35);b.dead=true
  }
 }else if(b.kind==="eliteWall"){
  const side=b.data.side,dir=side==="left"?1:-1;
  if(b.state==="main"){
   if(b.stateT<b.data.delay)return;
   b.dormant=false;b.active=true;b.vx=dir*b.data.speed;b.state="inbound";b.stateT=0
  }else if(b.state==="inbound"){
   b.x+=b.vx*dt;
   const reached=side==="left"?b.x>=b.data.stopX:b.x<=b.data.stopX;
   if(reached){b.x=b.data.stopX;b.vx=0;b.state="hold";b.stateT=0;if(b.data.impactFx){shake=Math.max(shake,7);addEffect("pulse",W/2,b.y,{life:.22,r:18,color:"#ffd84e"})}}
  }else if(b.state==="hold"){
   if(b.stateT>b.data.hold/diff()){b.state="outbound";b.vx=-dir*b.data.speed*.78;b.stateT=0}
  }else{b.x+=b.vx*dt}
 }else if(b.kind==="noReplyCore"){
  if(b.state==="main"){
   b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.stateT>.65/diff()){b.state="silence";b.stateT=0}
  }else{
   b.vx*=Math.pow(.004,dt);b.vy*=Math.pow(.004,dt);
   b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(!b.data.pulse&&b.stateT>.22/diff()){
    b.data.pulse=true;
    addEffect("pulse",b.x,b.y,{life:.46,r:62,color:"#75d3ff"})
   }
   if(b.stateT>.56/diff()){
    const base=aim(b.x,b.y);
    for(let i=-2;i<=2;i++)spawnBullet("miniShard",b.x,b.y,base+i*.22,240*diff(),{r:10,scale:.82});
    if(Math.hypot(player.x-b.x,player.y-b.y)<180){
     for(let i=0;i<8;i++)spawnBullet("miniShard",b.x,b.y,i*Math.PI/4,190*diff(),{r:8,scale:.62})
    }
    for(let i=0;i<12;i++)addEffect("spark",b.x,b.y,{life:.55,vx:rnd(-190,190),vy:rnd(-190,190),r:rnd(3,6),color:"#7fd6ff"});
    vanishBullet(b,1.15);b.dead=true
   }
  }
 }else if(b.kind==="miniShard"||b.kind==="noReplyShard"){
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.spin+=.2*dt;b.a+=.2*dt
 }else if(b.kind==="boomerangPage"){
  const a=Math.atan2(b.vy,b.vx),speed=len(b.vx,b.vy),curve=b.data.curve||1,na=a+curve*1.25*dt;
  b.vx=Math.cos(na)*speed;b.vy=Math.sin(na)*speed;b.a=na;
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.t>1.5&&!b.data.returned){
   b.data.returned=true;
   const ra=aim(b.x,b.y);
   b.vx=Math.cos(ra)*speed*.9;b.vy=Math.sin(ra)*speed*.9;b.a=ra
  }
 }else if(!b.dormant){
  if(b.curve)b.a+=b.curve*.9*dt;
  if(b.turnAt&&b.t>b.turnAt&&!b.turned){b.turned=true;b.a=aim(b.x,b.y);const sp=len(b.vx,b.vy);b.vx=Math.cos(b.a)*sp;b.vy=Math.sin(b.a)*sp}
  if(b.curve){const sp=len(b.vx,b.vy);b.vx=Math.cos(b.a)*sp;b.vy=Math.sin(b.a)*sp}
  b.x+=b.vx*dt;b.y+=b.vy*dt
 }
 if(b.data&&b.data.maxLife!=null&&b.t>=b.data.maxLife){vanishBullet(b,.8);b.dead=true}
 if(b.x<-180||b.x>W+180||b.y<-180||b.y>H+180)b.dead=true
}
function updateEffects(dt){for(const e of effects){e.t+=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vx*=Math.pow(.12,dt);e.vy*=Math.pow(.12,dt)}compactAlive(effects,e=>e.t<e.life);for(const t of trails)t.t+=dt;compactAlive(trails,t=>t.t<t.life);for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.2,dt);p.vy*=Math.pow(.2,dt)}compactAlive(particles,p=>p.age<p.life);for(const v of vanishes)v.age+=dt;compactAlive(vanishes,v=>v.age<v.life)}

function currentWaveEnemies() {
  return enemies.filter((enemy) => !enemy.dead && enemy.waveRunId === currentWaveRunId);
}

function updateRuntimeProgress(engine: any) {
  const runtime: Chapter2WaveRuntime = engine.chapter2Wave;
  const wave = hardWaveDefs[currentWaveIndex];
  if (!runtime || !wave) return;
  const living = currentWaveEnemies();
  const remainingHp = living.reduce((sum, enemy) => sum + Math.max(0, enemy.hp), 0);
  const eventRatio = wave.events.length ? waveEventState.size / wave.events.length : 1;
  const combatRatio = waveTargetMaxHp > 0 ? clamp(1 - remainingHp / waveTargetMaxHp, 0, 1) : 0;
  let progress = eventRatio * 0.42 + combatRatio * 0.58;
  if (eventRatio >= 1 && living.length === 0) progress = 1;
  runtime.running = waveRunning || waveGap > 0;
  runtime.selectedWave = currentWaveIndex;
  runtime.nextWave = Math.min(hardWaveDefs.length - 1, currentWaveIndex + (waveGap > 0 ? 1 : 0));
  runtime.elapsed = waveTime;
  runtime.waveCount = hardWaveDefs.length;
  runtime.title = wave.title;
  runtime.section = wave.section;
  runtime.description = wave.desc;
  runtime.progress = clamp(progress, 0, 1);
}

function clearChapter2Field() {
  enemies = [];
  bullets = [];
  effects = [];
  trails = [];
  particles = [];
  vanishes = [];
  shake = 0;
  waveEventState.clear();
  waveTargetSpawned = 0;
  waveTargetMaxHp = 0;
}

function beginWave(engine: any, index: number, preserveField = false) {
  if (!preserveField) clearChapter2Field();
  currentWaveIndex = clamp(Math.floor(index), 0, hardWaveDefs.length - 1);
  currentWaveRunId = ++waveRunCounter;
  waveTargetSpawned = 0;
  waveTargetMaxHp = 0;
  waveRunning = true;
  waveGap = 0;
  waveTime = 0;
  waveEventState.clear();
  engine.chapter2Wave.allWavesCleared = false;
  updateRuntimeProgress(engine);
}

function finishWave(engine: any) {
  if (!waveRunning) return;
  waveRunning = false;
  updateRuntimeProgress(engine);
  engine.chapter2Wave.progress = 1;
  if (currentWaveIndex < hardWaveDefs.length - 1) {
    waveGap = 1.45;
    return;
  }
  engine.chapter2Wave.running = false;
  engine.chapter2Wave.allWavesCleared = true;
  if (!completionNotified) {
    completionNotified = true;
    engine.onChapter2WavesComplete?.();
  }
}

function updateWaveSequence(engine: any, dt: number) {
  if (waveGap > 0) {
    waveGap -= dt;
    updateRuntimeProgress(engine);
    if (waveGap <= 0) beginWave(engine, currentWaveIndex + 1, true);
    return;
  }
  if (!waveRunning) return;
  const wave = hardWaveDefs[currentWaveIndex];
  if (!wave) return;
  waveTime += dt;
  for (const event of wave.events) {
    if (waveEventState.has(event.key)) continue;
    let ready = false;
    try {
      ready = !!event.condition(waveTime);
    } catch (error) {
      console.error("[Chapter2Wave] event condition failed", error);
    }
    if (!ready) continue;
    waveEventState.add(event.key);
    event.action();
  }
  updateRuntimeProgress(engine);
  if (waveEventState.size >= wave.events.length && currentWaveEnemies().length === 0) finishWave(engine);
}

function enemyCanBeHit(enemy: any) {
  if (!enemy || enemy.dead) return false;
  if (enemy.type === "ghost" && (enemy.state === "vanish" || enemy.state === "appear")) return false;
  if (enemy.type === "submarine" && enemy.state === "dive") return false;
  return true;
}

function destroyEnemy(enemy: any) {
  if (!enemy || enemy.dead) return;
  enemy.dead = true;
  const color = monsterAuraColors[enemy.type as Chapter2WaveEnemyType] || "#ffffff";
  burstParticles(enemy.x, enemy.y, color, enemy.clearTarget ? 22 : 14, enemy.clearTarget ? 260 : 190);
  addEffect("pulse", enemy.x, enemy.y, { life: 0.48, r: enemy.r * 0.75, color });
  shake = Math.max(shake, enemy.clearTarget ? 9 : 5);
  if (enemy.type === "highlighter") {
    for (const trail of trails) {
      if (trail.kind === "highlightStroke" && trail.batchId === enemy.data.batchId) {
        trail.fadeStart = trail.t;
        trail.life = Math.min(trail.life, trail.t + 0.75);
      }
    }
  }
}

function damageChapter2Player(engine: any) {
  if (Number(engine.player?.invulnTimer) > 0 || engine.player?.isDead) return;
  shake = Math.max(shake, 18);
  for (let i = 0; i < 20; i += 1) {
    addEffect("spark", player.x, player.y, {
      life: 0.5,
      vx: rnd(-220, 220),
      vy: rnd(-220, 220),
      r: rnd(3, 7),
      color: "#ff555d",
    });
  }
  engine.triggerPlayerHit?.();
}

function checkChapter2PlayerHazards(engine: any) {
  if (Number(engine.player?.invulnTimer) > 0 || engine.player?.isDead) return;
  for (const enemy of enemies) {
    let active = true;
    if (enemy.type === "ghost" && (enemy.state === "vanish" || enemy.state === "appear")) active = false;
    if (enemy.type === "submarine" && enemy.state === "dive") active = false;
    if (active && Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.r + player.r * 0.55) {
      damageChapter2Player(engine);
      return;
    }
  }
  for (const bullet of bullets) {
    if (bullet.dead || !bullet.active || bullet.dormant) continue;
    if (bullet.kind === "eliteWall") {
      if (Math.abs(bullet.y - player.y) < 42) {
        const edge = bullet.data.side === "left" ? bullet.x + 68 : bullet.x - 68;
        if ((bullet.data.side === "left" && player.x < edge) || (bullet.data.side === "right" && player.x > edge)) {
          damageChapter2Player(engine);
          return;
        }
      }
    } else if (bullet.wall) {
      if (
        Math.abs(bullet.y - player.y) < 42 &&
        ((bullet.vx > 0 && player.x < bullet.x + bullet.w) || (bullet.vx < 0 && player.x > bullet.x - bullet.w))
      ) {
        damageChapter2Player(engine);
        return;
      }
    } else if (Math.hypot(bullet.x - player.x, bullet.y - player.y) < bullet.r + player.r * 0.55) {
      vanishBullet(bullet, bullet.kind === "energyBomb" || bullet.kind === "block" ? 1.65 : 1);
      bullet.dead = true;
      damageChapter2Player(engine);
      return;
    }
  }
  for (const trail of trails) {
    if (trail.kind === "highlightStroke") {
      const vx = trail.x2 - trail.x1;
      const vy = trail.y2 - trail.y1;
      const wx = player.x - trail.x1;
      const wy = player.y - trail.y1;
      const c2 = vx * vx + vy * vy || 1;
      const u = clamp((wx * vx + wy * vy) / c2, 0, 1);
      const px = trail.x1 + u * vx;
      const py = trail.y1 + u * vy;
      if (Math.hypot(player.x - px, player.y - py) < trail.r + player.r * 0.42) {
        damageChapter2Player(engine);
        return;
      }
    } else if (Math.hypot(trail.x - player.x, trail.y - player.y) < trail.r + player.r * 0.5) {
      damageChapter2Player(engine);
      return;
    }
  }
}

function processRealPlayerBullets(engine: any) {
  const sx = virtualScaleX(engine);
  const sy = virtualScaleY(engine);
  for (const shot of engine.bullets || []) {
    if (!shot.active || shot.isEnemy) continue;
    const shotX = (shot.x + Math.max(2, shot.width || 0) / 2) / sx;
    const shotY = (shot.y + Math.max(2, shot.height || 0) / 2) / sy;
    const shotRadius = Math.max(4, Math.min((shot.width || 8) / sx, (shot.height || 14) / sy) * 0.45);
    for (const enemy of enemies) {
      if (!enemyCanBeHit(enemy)) continue;
      if (Math.hypot(shotX - enemy.x, shotY - enemy.y) >= shotRadius + enemy.r * 0.72) continue;
      shot.active = false;
      enemy.hp -= Math.max(1, Number(shot.damage) || 1);
      enemy.hitFlash = 0.1;
      addEffect("spark", shotX, shotY, { life: 0.16, vx: rnd(-80, 80), vy: rnd(-80, 80), r: 2.5, color: "#9feaff" });
      if (enemy.hp <= 0) destroyEnemy(enemy);
      break;
    }
  }
}

function processRealBomb(engine: any) {
  const active = !!engine.bombActive;
  if (!active) {
    lastBombActive = false;
    return;
  }
  const sx = virtualScaleX(engine);
  const sy = virtualScaleY(engine);
  const originX = Number(engine.bombOriginX || 0) / sx;
  const originY = Number(engine.bombOriginY || 0) / sy;
  const radius = Number(engine.bombRadius || 0) / Math.max(0.001, (sx + sy) * 0.5);
  const band = Math.max(34, radius * 0.09);
  for (const bullet of bullets) {
    if (bullet.dead || bullet.dormant) continue;
    const d = Math.hypot(bullet.x - originX, bullet.y - originY);
    if (d <= radius + band) {
      vanishBullet(bullet, 1.1);
      bullet.dead = true;
    }
  }
  for (const enemy of enemies) {
    if (enemy.dead || !enemyCanBeHit(enemy)) continue;
    const d = Math.hypot(enemy.x - originX, enemy.y - originY);
    if (d > radius + enemy.r + band) continue;
    const damage = lastBombActive ? 0.8 : Math.max(8, enemy.maxHp * 0.18);
    enemy.hp -= damage;
    enemy.hitFlash = 0.12;
    if (enemy.hp <= 0) destroyEnemy(enemy);
  }
  lastBombActive = true;
}

export function startChapter2WaveSystem(engine: any, startIndex = 0) {
  activeEngine = engine;
  completionNotified = false;
  lastBombActive = false;
  time = 0;
  clearChapter2Field();
  engine.chapter2Wave.enabled = true;
  engine.chapter2Wave.allWavesCleared = false;
  engine.stage = 2;
  beginWave(engine, startIndex, false);
}

export function stopChapter2WaveSystem(engine: any) {
  clearChapter2Field();
  waveRunning = false;
  waveGap = 0;
  if (engine?.chapter2Wave) {
    engine.chapter2Wave.enabled = false;
    engine.chapter2Wave.running = false;
  }
  if (activeEngine === engine) activeEngine = null;
}

export function getChapter2WaveProgressSystem(engine: any) {
  updateRuntimeProgress(engine);
  return {
    waveIndex: currentWaveIndex,
    waveCount: hardWaveDefs.length,
    progress: engine.chapter2Wave?.progress || 0,
    title: hardWaveDefs[currentWaveIndex]?.title || "",
  };
}

export function skipCurrentChapter2WaveSystem(engine: any): boolean {
  if (!engine?.chapter2Wave?.enabled || engine.chapter2Wave.allWavesCleared) return false;

  const nextWaveIndex = currentWaveIndex + 1;
  clearChapter2Field();
  waveRunning = false;
  waveGap = 0;

  if (nextWaveIndex < hardWaveDefs.length) {
    // 테스트 스킵은 일반 웨이브 종료의 1.45초 간격을 사용하지 않는다.
    // 잔여 탄막/이펙트도 함께 지운 뒤 바로 다음 웨이브를 시작한다.
    beginWave(engine, nextWaveIndex, false);
    return true;
  }

  engine.chapter2Wave.running = false;
  engine.chapter2Wave.progress = 1;
  engine.chapter2Wave.selectedWave = hardWaveDefs.length - 1;
  engine.chapter2Wave.nextWave = hardWaveDefs.length - 1;
  engine.chapter2Wave.allWavesCleared = true;
  if (!completionNotified) {
    completionNotified = true;
    engine.onChapter2WavesComplete?.();
  }
  return true;
}

export function updateChapter2WaveSystem(engine: any, dt: number) {
  if (!engine?.chapter2Wave?.enabled) return;
  activeEngine = engine;
  time += dt;
  const beforeX = player.x;
  const beforeY = player.y;
  syncPlayerFromEngine(engine);
  updateWaveSequence(engine, dt);
  for (const enemy of enemies) {
    spawnContextWaveRunId = enemy.waveRunId;
    enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - dt);
    updateEnemy(enemy, dt);
  }
  for (const bullet of bullets) {
    spawnContextWaveRunId = bullet.waveRunId;
    updateBullet(bullet, dt);
  }
  spawnContextWaveRunId = null;
  applyVirtualPlayerPullToEngine(engine, beforeX, beforeY);
  syncPlayerFromEngine(engine);
  processRealPlayerBullets(engine);
  processRealBomb(engine);
  compactAlive(enemies, (enemy) => !enemy.dead);
  compactAlive(bullets, (bullet) => !bullet.dead);
  updateEffects(dt);
  shake *= Math.pow(0.03, dt);
  checkChapter2PlayerHazards(engine);
  updateRuntimeProgress(engine);
}
function line(x1,y1,x2,y2,color,w,alpha=1,dash=[]){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.setLineDash(dash);ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
function strokeFill(fill,lineWidth=6){ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=lineWidth;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke()}
function highlight(x,y,rx,ry,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle="rgba(255,255,255,.93)";ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore()}
function monsterColor(type){return monsterAuraColors[type]||"#9fd8ff"}
function bulletColor(kind){return bulletEffectColors[kind]||"#a6dfff"}
function drawMonsterAura(e,x,y,w,h,color){const pulse=.78+Math.sin(time*4.2+e.seed)*.16,r=Math.max(w,h)*.7;ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=pulse;ctx.translate(x,y);ctx.scale(1,.76);const g=ctx.createRadialGradient(0,0,2,0,0,r);g.addColorStop(0,rgba(color,.22));g.addColorStop(.55,rgba(color,.09));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawMonsterExhaust(e,x,y,w,h,color){if(e.type==="compressor"||e.state==="fade"||e.state==="vanish")return;const tail=12+Math.sin(time*11+e.seed)*3,sy=y+h*.28;ctx.save();ctx.globalCompositeOperation="screen";const g=ctx.createLinearGradient(x,sy,x,sy+tail);g.addColorStop(0,rgba(color,.48));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-7,sy);ctx.lineTo(x+7,sy);ctx.lineTo(x,sy+tail);ctx.closePath();ctx.fill();ctx.restore()}
function drawMonsterDataSparks(e,x,y,w,h,color){ctx.save();ctx.globalCompositeOperation="screen";for(let i=0;i<2;i++){const a=time*(1.4+i*.35)+e.seed+i*Math.PI,px=x+Math.cos(a)*w*.46,py=y+Math.sin(a)*h*.31,blink=.35+.55*Math.abs(Math.sin(time*5.2+e.seed+i));ctx.save();ctx.translate(px,py);ctx.rotate(a+Math.PI*.25);ctx.globalAlpha=blink;ctx.fillStyle=color;ctx.fillRect(-1.8,-1.8,3.6,3.6);ctx.restore()}ctx.restore()}
function drawSpawnScan(e,x,y,w,h,color){if(e.t>=.55)return;const t=e.t/.55;ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=(1-t)*.72;ctx.fillStyle=color;ctx.fillRect(x-w*.62,y-h*.58+t*h*1.1,w*1.24,5);ctx.restore()}
function attackCueValue(e){const q=diff();let rem=99;if(e.type==="anxiety"&&e.state==="stop")rem=.22/q-e.stateT;else if(e.type==="noreply"&&e.state==="attack"&&!e.data.fired)rem=.34/q-e.stateT;else if(e.type==="format"&&e.state==="warn")rem=.62/q-e.stateT;else if(e.type==="energy"&&e.state==="overcharge")rem=.48/q-e.stateT;else if(e.type==="reference"&&e.state==="build"&&!e.data.anchorMade)rem=.22/q+(e.data.index||0)*.13-e.stateT;else if(e.type==="countdown"&&e.state==="count")rem=.82/q-e.stateT;else if(e.type==="countdown"&&e.state==="zero")rem=.72/q-e.stateT;else if(e.type==="compressor"&&e.state==="charge"){const p=e.data.phase||1;rem=(p===1?.88:p===2?.72:.62)/q-e.stateT}else if(e.type==="drone"&&e.state==="hover")rem=e.cool;return rem>0&&rem<.28?1-rem/.28:0}
function drawAttackCue(e,x,y,w,h,color){const k=attackCueValue(e);if(k<=0)return;const off=w*.56+k*16,yy=y,alpha=.25+.7*k;ctx.save();ctx.globalCompositeOperation="screen";ctx.strokeStyle=color;ctx.lineWidth=4;ctx.globalAlpha=alpha;ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(x-off-13,yy-12);ctx.lineTo(x-off,yy);ctx.lineTo(x-off-13,yy+12);ctx.moveTo(x+off+13,yy-12);ctx.lineTo(x+off,yy);ctx.lineTo(x+off+13,yy+12);ctx.stroke();ctx.restore()}
function drawBulletTrail(b,color){if(b.dormant||b.wall||b.kind==="eliteWall")return;const speed=Math.hypot(b.vx,b.vy);if(speed<8)return;const dx=b.vx/speed,dy=b.vy/speed,L=clamp(speed*.055,8,24),x2=b.x-dx*L,y2=b.y-dy*L;ctx.save();ctx.globalCompositeOperation="screen";const g=ctx.createLinearGradient(b.x,b.y,x2,y2);g.addColorStop(0,rgba(color,.67));g.addColorStop(.55,rgba(color,.26));g.addColorStop(1,rgba(color,0));ctx.strokeStyle=g;ctx.lineWidth=Math.max(3,b.r*.42);ctx.lineCap="round";ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
function drawBulletDataSparks(b,color){if(b.dormant||b.wall||b.kind==="eliteWall")return;const speed=Math.hypot(b.vx,b.vy);if(speed<8)return;const dx=b.vx/speed,dy=b.vy/speed,nx=-dy,ny=dx,phase=Math.floor((b.t*24+b.seed)%3);ctx.save();ctx.globalCompositeOperation="screen";for(let i=0;i<2;i++){const back=9+i*8,side=(i?1:-1)*(2+phase*.55),x=b.x-dx*back+nx*side,y=b.y-dy*back+ny*side;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI*.25+b.t*5+i);ctx.globalAlpha=.3+.18*((phase+i)%3);ctx.fillStyle=color;ctx.fillRect(-1.4,-1.4,2.8,2.8);ctx.restore()}ctx.restore()}

function glowColorEnemy(type){return({ghost:"#c7f5ff",pointer:"#5fd2ff",submarine:"#5bd7ff",anxiety:"#b97cff",noreply:"#8fe6ff",format:"#ff8a78",energy:"#ae8dff",reference:"#7fd8ff",highlighter:"#d6ff31",countdown:"#ffb95a",compressor:"#ffd65b",drone:"#fff0a5"}[type]||"#9fd8ff")}
function glowColorBullet(kind){return({paper:"#ffe58a",drop:"#c88cff",x:"#ff7d7d",energy:"#b18cff",energyWisp:"#b18cff",energyBomb:"#b18cff",citation:"#92dcff",citationAnchor:"#92dcff",ink:"#d8ff33",timer:"#ffb25d",block:"#e8edf5",miniShard:"#8fe6ff",noReplyShard:"#8fe6ff",noReplyCore:"#8fe6ff",boomerangPage:"#ffe8a9",eliteWall:"#ffd45e"}[kind]||"#a6dfff")}
function drawSoftGlow(x,y,r,color,alpha=.22,sx=1,sy=1,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,r*sx,r*sy,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=alpha*.58;ctx.beginPath();ctx.ellipse(0,0,r*.62*sx,r*.62*sy,0,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawMotionStreak(x1,y1,x2,y2,color,w,alpha=.24){ctx.save();ctx.strokeStyle=color;ctx.lineCap="round";ctx.globalAlpha=alpha;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.globalAlpha=alpha*.9;ctx.lineWidth=Math.max(2,w*.45);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
function drawPointerTelegraph(e){
 const a=e.data.aim??aim(e.x,e.y);
 const pulse=.5+.5*Math.sin(e.t*24);
 const muzzleX=e.x+Math.cos(a)*82;
 const muzzleY=e.y+Math.sin(a)*82;
 const endX=muzzleX+Math.cos(a)*1400;
 const endY=muzzleY+Math.sin(a)*1400;
 ctx.save();
 ctx.globalCompositeOperation="lighter";
 ctx.lineCap="round";
 ctx.globalAlpha=.10+pulse*.09;
 ctx.strokeStyle="#ff2f42";
 ctx.lineWidth=13+pulse*5;
 ctx.beginPath();ctx.moveTo(muzzleX,muzzleY);ctx.lineTo(endX,endY);ctx.stroke();
 ctx.globalAlpha=.45+pulse*.25;
 ctx.strokeStyle="#ff6570";
 ctx.lineWidth=5+pulse*2;
 ctx.beginPath();ctx.moveTo(muzzleX,muzzleY);ctx.lineTo(endX,endY);ctx.stroke();
 ctx.globalAlpha=.82+pulse*.15;
 ctx.strokeStyle="#ffe7e9";
 ctx.lineWidth=1.5+pulse;
 ctx.beginPath();ctx.moveTo(muzzleX,muzzleY);ctx.lineTo(endX,endY);ctx.stroke();
 ctx.restore();
}
function drawSubmarineReferenceShape(){
 ctx.save();
 ctx.rotate(-Math.PI/2);
 ctx.fillStyle="#ffd84d";ctx.strokeStyle=INK;ctx.lineWidth=5;
 ctx.beginPath();ctx.moveTo(-30,-8);ctx.lineTo(-48,0);ctx.lineTo(-30,8);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle="#536486";
 ctx.beginPath();ctx.moveTo(-18,-13);ctx.lineTo(-28,-27);ctx.lineTo(-2,-16);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(-18,13);ctx.lineTo(-28,27);ctx.lineTo(-2,16);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.ellipse(0,0,34,19,0,0,Math.PI*2);strokeFill("#314568",6);
 ctx.fillStyle="#7688a7";
 ctx.beginPath();ctx.ellipse(4,6,25,8,0,0,Math.PI);ctx.fill();
 ctx.fillStyle="#52c9ef";ctx.strokeStyle=INK;ctx.lineWidth=5;
 ctx.beginPath();ctx.arc(12,-3,9,0,Math.PI*2);ctx.fill();ctx.stroke();
 highlight(9,-7,3,2,-.3);
 ctx.strokeStyle=INK;ctx.lineWidth=8;
 ctx.beginPath();ctx.moveTo(-5,-17);ctx.lineTo(-5,-27);ctx.lineTo(4,-27);ctx.stroke();
 ctx.strokeStyle="#7f91ad";ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(-5,-17);ctx.lineTo(-5,-27);ctx.lineTo(4,-27);ctx.stroke();
 ctx.restore();
}
function drawSubmarine(e){
 ctx.save();
 ctx.translate(e.x,e.y);
 const moveAngle=Math.atan2(e.vy,e.vx);
 ctx.rotate(moveAngle+Math.PI/2);
 ctx.scale(MONSTER_SCALE,MONSTER_SCALE);
 ctx.globalAlpha=e.state==="dive"?.22:1;
 drawSubmarineReferenceShape();
 ctx.restore();
}
function drawReportDroneReferenceShape(t){
 ctx.save();
 ctx.rotate(-Math.PI/2);
 for(const sy of [-1,1]){
  ctx.strokeStyle=INK;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(-8,sy*19);ctx.lineTo(-8,sy*33);ctx.stroke();
  ctx.save();
  ctx.translate(-8,sy*36);
  ctx.rotate(t*11*sy);
  ctx.strokeStyle="#d8e0ec";ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.stroke();
  ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
 }
 ctx.fillStyle="#f6eedc";ctx.strokeStyle=INK;ctx.lineWidth=6;
 ctx.beginPath();
 ctx.moveTo(-24,-22);ctx.lineTo(12,-22);ctx.lineTo(24,-10);ctx.lineTo(24,22);ctx.lineTo(-24,22);ctx.closePath();
 ctx.fill();ctx.stroke();
 ctx.fillStyle="#fff8e9";
 ctx.beginPath();ctx.moveTo(12,-22);ctx.lineTo(24,-10);ctx.lineTo(12,-10);ctx.closePath();ctx.fill();
 ctx.strokeStyle=INK;ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(12,-22);ctx.lineTo(24,-10);ctx.lineTo(12,-10);ctx.stroke();
 ctx.fillStyle="#ea5055";ctx.fillRect(-18,-17,22,5);
 ctx.fillStyle="#8ab2ff";ctx.fillRect(-18,-8,16,3);
 ctx.strokeStyle="#7f8ba2";ctx.lineWidth=3;
 for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-18,i*7);ctx.lineTo(12,i*7);ctx.stroke()}
 ctx.fillStyle="#ffd84e";ctx.strokeStyle=INK;ctx.lineWidth=4;
 ctx.beginPath();ctx.arc(-14,17,5,0,Math.PI*2);ctx.fill();ctx.stroke();
 highlight(-10,-15,5,2,-.2);
 ctx.restore();
}
function drawDrone(e){ctx.save();ctx.translate(e.x,e.y);ctx.scale(MONSTER_SCALE,MONSTER_SCALE);drawReportDroneReferenceShape(e.t);ctx.restore()}
function drawHighlighterFallback(e){
 ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.data.bodyAngle??0);ctx.scale(MONSTER_SCALE,MONSTER_SCALE);
 ctx.fillStyle="#cfff24";ctx.strokeStyle=INK;ctx.lineWidth=6;
 ctx.beginPath();ctx.roundRect(-64,-22,105,44,13);ctx.fill();ctx.stroke();
 ctx.fillStyle="#ecff9a";ctx.beginPath();ctx.roundRect(-48,-13,64,26,8);ctx.fill();
 ctx.fillStyle="#1b2530";ctx.beginPath();ctx.moveTo(38,-20);ctx.lineTo(67,-13);ctx.lineTo(67,13);ctx.lineTo(38,20);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle="#baff1c";ctx.beginPath();ctx.moveTo(64,-11);ctx.lineTo(76,-7);ctx.lineTo(76,7);ctx.lineTo(64,11);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.restore()
}
function drawEnemy(e){
 const [baseW,baseH]=monsterBox(e.type),color=monsterColor(e.type),bob=Math.sin(e.t*3.5+e.seed)*3,ry=e.y+bob;
 let im=null,w=baseW,h=baseH,rot=0,alpha=1;
 if(e.type==="ghost"){
  im=images.ghost;const vanishP=e.state==="vanish"?clamp(e.stateT/(.46/diff()),0,1):0,appearP=e.state==="appear"?clamp(e.stateT/(.68/diff()),0,1):1,signalPulse=e.state==="signal"?Math.abs(Math.sin(e.stateT*23)):1;
  alpha=e.state==="vanish"?1-vanishP:e.state==="appear"?.12+.88*appearP:e.state==="signal"?.42+.58*signalPulse:1;
  const sc=e.state==="vanish"?1-vanishP*.58:e.state==="appear"?.40+.60*appearP:e.state==="signal"?.94+.10*signalPulse:1;w*=sc;h*=sc;rot=e.state==="signal"?Math.sin(e.stateT*38)*.065:0
 }else if(e.type==="pointer"){im=images.pointer;rot=(e.state==="dash"?Math.atan2(e.vy,e.vx):(e.data.bodyAngle??Math.PI/2))+Math.PI}
 else if(e.type==="anxiety")im=images.anxiety;
 else if(e.type==="noreply")im=images.noreply;
 else if(e.type==="format")im=images.format;
 else if(e.type==="energy")im=images.energy;
 else if(e.type==="reference")im=images.reference;
 else if(e.type==="highlighter"){if(e.state==="fade")return;im=images.highlighter;rot=e.data.bodyAngle??0}
 else if(e.type==="countdown")im=images.countdown;
 else if(e.type==="compressor")im=images.compressor;

 const oriented=e.type==="pointer"||e.type==="highlighter"||e.type==="submarine";
 if(!oriented&&e.type!=="compressor")rot+=Math.sin(e.t*2)*.025;
 if(!oriented&&e.type!=="compressor"&&Math.hypot(e.motionX||0,e.motionY||0)>30)rot+=clamp((e.motionX||0)/900,-.13,.13)+Math.sin(e.t*3.2)*.035;
 drawMonsterAura(e,e.x,ry,w,h,color);drawMonsterExhaust(e,e.x,ry,w,h,color);

 const speed=Math.hypot(e.motionX||0,e.motionY||0),nx=speed>1?(e.motionX/speed):0,ny=speed>1?(e.motionY/speed):0,after=speed>180&&(e.state==="dash"||e.type==="format"||e.type==="highlighter"||e.type==="ghost"||e.type==="reference"||e.type==="submarine");
 const drawSpecial=(x,y,a=1)=>{ctx.save();ctx.globalAlpha*=a;ctx.globalCompositeOperation=a<1?"screen":"source-over";const ox=e.x,oy=e.y;e.x=x;e.y=y;if(e.type==="submarine")drawSubmarine(e);else if(e.type==="drone")drawDrone(e);else if(e.type==="highlighter"&&(!im||!im.complete||!im.naturalWidth))drawHighlighterFallback(e);e.x=ox;e.y=oy;ctx.restore()};
 if(after){for(let i=2;i>=1;i--){const ax=e.x-nx*(10+i*10),ay=ry-ny*(10+i*10),aa=i===1?.18:.1;if(e.type==="submarine"||e.type==="drone"||(e.type==="highlighter"&&(!im||!im.complete||!im.naturalWidth)))drawSpecial(ax,ay,aa);else drawImageFit(im,ax,ay,w,h,rot,aa)}}
 ctx.save();ctx.shadowColor=color;ctx.shadowBlur=8;
 if(e.type==="submarine"||e.type==="drone"||(e.type==="highlighter"&&(!im||!im.complete||!im.naturalWidth)))drawSpecial(e.x,ry,1);else drawImageFit(im,e.x,ry,w,h,rot,alpha);
 ctx.restore();
 drawMonsterDataSparks(e,e.x,ry,w,h,color);drawSpawnScan(e,e.x,ry,w,h,color);drawAttackCue(e,e.x,ry,w,h,color);

 if(e.type==="pointer"&&(e.state==="aim"||e.state==="flash")){const oy=e.y;e.y=ry;drawPointerTelegraph(e);e.y=oy}
 if(e.type==="energy"&&(e.state==="summon"||e.state==="recall"||e.state==="overcharge")){ctx.save();ctx.translate(e.x,ry);ctx.strokeStyle="#a87cff";ctx.lineWidth=e.state==="overcharge"?9:6;ctx.globalAlpha=.38+.24*Math.sin(time*12);const rr=e.state==="recall"?112:e.state==="overcharge"?86:100;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,rr-i*15,time*(1.3+i*.35)+i,time*(1.3+i*.35)+i+Math.PI*.9);ctx.stroke()}ctx.restore()}
 if(e.type==="countdown"&&e.state==="count"){ctx.save();ctx.fillStyle="#fff";ctx.strokeStyle=INK;ctx.lineWidth=5;ctx.font="900 64px Arial";ctx.textAlign="center";ctx.strokeText(String(e.data.n||3),e.x,ry+18);ctx.fillText(String(e.data.n||3),e.x,ry+18);ctx.restore()}
 if(e.type==="compressor"){
  const phase=e.data.phase||1;ctx.save();for(let i=0;i<3;i++){ctx.fillStyle=i<phase?"#ff565d":"#59647a";ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x-32+i*32,ry-96);ctx.lineTo(e.x-22+i*32,ry-86);ctx.lineTo(e.x-32+i*32,ry-76);ctx.lineTo(e.x-42+i*32,ry-86);ctx.closePath();ctx.fill();ctx.stroke()}ctx.restore();
  if(e.state==="charge"){const half=phase===1?125:phase===2?102:82,g=e.data.gapCurrent??e.data.gapTarget??e.data.gap,pulse=.48+.28*Math.abs(Math.sin(e.stateT*8.5)),sx=g-half,sw=half*2,sy=300,sh=H-300;ctx.save();ctx.fillStyle=`rgba(135,255,200,${pulse*.13})`;ctx.fillRect(sx,sy,sw,sh);ctx.strokeStyle=`rgba(181,255,215,${pulse*.95})`;ctx.lineWidth=phase===3?8:6;ctx.setLineDash([18,12]);ctx.lineDashOffset=-time*34;ctx.strokeRect(sx,sy,sw,sh);ctx.setLineDash([]);ctx.strokeStyle=`rgba(255,255,255,${pulse*.55})`;ctx.lineWidth=2;ctx.strokeRect(sx+8,sy+8,Math.max(0,sw-16),Math.max(0,sh-16));ctx.restore()}
 }

}
function drawNoReplyShard(){
 ctx.save();
 ctx.rotate(Math.PI/8);
 ctx.beginPath();
 ctx.moveTo(0,-14);ctx.lineTo(11,-4);ctx.lineTo(5,13);ctx.lineTo(-12,7);ctx.closePath();
 strokeFill("#74cfff",4);
 ctx.fillStyle="#dff7ff";
 ctx.beginPath();ctx.moveTo(-2,-6);ctx.lineTo(5,-2);ctx.lineTo(1,7);ctx.lineTo(-7,4);ctx.closePath();ctx.fill();
 ctx.restore();
}
function drawNoReplyCore(b){
 ctx.save();
 ctx.rotate(Math.sin(b.t*7)*.08);
 ctx.beginPath();
 ctx.moveTo(-24,-14);ctx.lineTo(12,-18);ctx.lineTo(26,-6);ctx.lineTo(20,16);ctx.lineTo(-4,18);ctx.lineTo(-16,28);ctx.lineTo(-14,16);ctx.lineTo(-26,6);ctx.closePath();
 strokeFill("#7bcdf7",6);
 ctx.fillStyle="#dff7ff";
 ctx.beginPath();ctx.moveTo(-18,-8);ctx.lineTo(8,-11);ctx.lineTo(17,-2);ctx.lineTo(13,10);ctx.lineTo(-2,12);ctx.lineTo(-10,18);ctx.lineTo(-9,10);ctx.lineTo(-19,2);ctx.closePath();ctx.fill();
 ctx.strokeStyle="#4b93c7";ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(-2,-12);ctx.lineTo(-5,-1);ctx.lineTo(4,4);ctx.lineTo(-1,12);ctx.stroke();
 ctx.fillStyle=INK;ctx.beginPath();ctx.arc(-9,-1,3.1,0,Math.PI*2);ctx.arc(1,-1,3.1,0,Math.PI*2);ctx.arc(11,-1,3.1,0,Math.PI*2);ctx.fill();
 highlight(-10,-8,4,2,-.3);
 if(b.state==="silence"){
  ctx.strokeStyle="#dff8ff";ctx.lineWidth=3;ctx.globalAlpha=.45+.2*Math.sin(b.stateT*18);
  ctx.beginPath();ctx.arc(0,0,34+Math.sin(b.stateT*10)*4,0,Math.PI*2);ctx.stroke()
 }
 ctx.restore()
}
function drawBoomerangPage(){
 ctx.fillStyle="#fff2c6";ctx.strokeStyle=INK;ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(-15,-8);ctx.lineTo(8,-13);ctx.lineTo(15,-3);ctx.lineTo(-5,11);ctx.lineTo(-16,6);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle="#e25a5c";ctx.fillRect(-10,-7,10,3)
}
function drawEliteWall(b){
 const side=b.data.side;
 const preview=b.dormant===true;
 const front=preview?(side==="left"?b.data.stopX+78:b.data.stopX-78):(side==="left"?b.x+78:b.x-78);
 const bodyStart=side==="left"?0:front;
 const bodyWidth=side==="left"?Math.max(0,front):Math.max(0,renderWorldWidth-front);
 const bodyTop=b.y-34;
 const bodyH=68;
 const dir=side==="left"?1:-1;
 ctx.save();
 ctx.globalAlpha=preview?.95:1;

 if(preview){
  ctx.save();
  // 압축 전 예고는 안전 통로를 기준으로 단순하게 표시
  ctx.strokeStyle="rgba(255,223,97,0.82)";
  ctx.lineWidth=3;
  ctx.setLineDash([9,7]);
  ctx.beginPath();
  ctx.moveTo(front,bodyTop-5);
  ctx.lineTo(front,bodyTop+bodyH+5);
  ctx.stroke();
  ctx.setLineDash([]);

  const headX=b.data.stopX;
  const headY=b.y;
  const headW=96, headH=82;
  ctx.translate(headX,headY);
  ctx.globalAlpha=.22+.08*Math.sin(time*8+b.y*.01);
  ctx.fillStyle="rgba(220,228,238,0.26)";
  ctx.strokeStyle="rgba(240,246,255,0.55)";
  ctx.lineWidth=3;
  ctx.setLineDash([8,7]);
  ctx.beginPath();
  ctx.roundRect(-headW/2,-headH/2,headW,headH,18);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  return;
 }

 // 메인 압축 레일 본체
 ctx.fillStyle="rgba(64,76,98,0.92)";
 ctx.fillRect(bodyStart,bodyTop,bodyWidth,bodyH);
 ctx.strokeStyle="#0f1928";
 ctx.lineWidth=4;
 ctx.strokeRect(bodyStart,bodyTop,bodyWidth,bodyH);

 // 상하 금속 레일
 ctx.fillStyle="rgba(18,28,44,0.95)";
 ctx.fillRect(bodyStart,bodyTop,bodyWidth,8);
 ctx.fillRect(bodyStart,bodyTop+bodyH-8,bodyWidth,8);

 // 내부 패널 구획
 ctx.strokeStyle="rgba(136,155,183,0.55)";
 ctx.lineWidth=2;
 for(let x=bodyStart+42;x<bodyStart+bodyWidth-20;x+=68){
  ctx.beginPath();
  ctx.moveTo(x,bodyTop+11);
  ctx.lineTo(x,bodyTop+bodyH-11);
  ctx.stroke();
 }


 // 압축 전면의 경고 패널
 const stripeX=side==="left"?front-34:front;
 ctx.fillStyle="rgba(214,223,235,0.97)";
 ctx.fillRect(stripeX,bodyTop-2,34,bodyH+4);
 ctx.strokeStyle="#152132";
 ctx.lineWidth=3;
 ctx.strokeRect(stripeX,bodyTop-2,34,bodyH+4);

 ctx.save();
 ctx.beginPath();
 ctx.rect(stripeX+2,bodyTop,30,bodyH);
 ctx.clip();
 ctx.strokeStyle="#f5c73a";
 ctx.lineWidth=7;
 for(let yy=bodyTop-16;yy<bodyTop+bodyH+20;yy+=18){
  ctx.beginPath();
  if(side==="left"){
   ctx.moveTo(stripeX+2,yy);
   ctx.lineTo(stripeX+34,yy+22);
  }else{
   ctx.moveTo(stripeX+34,yy);
   ctx.lineTo(stripeX+2,yy+22);
  }
  ctx.stroke();
 }
 ctx.restore();

 // 이동하는 압축 헤드
 const headX=b.x;
 const headY=b.y;
 const headW=96;
 const headH=82;
 ctx.save();
 ctx.translate(headX,headY);


 // 바깥 프레임
 ctx.fillStyle="#d8dee9";
 ctx.strokeStyle="#111a27";
 ctx.lineWidth=4;
 ctx.beginPath();
 ctx.roundRect(-headW/2,-headH/2,headW,headH,18);
 ctx.fill();
 ctx.stroke();

 // 내부 압축 드럼
 ctx.fillStyle="#f3f5f8";
 ctx.beginPath();
 ctx.roundRect(-34,-26,68,52,15);
 ctx.fill();
 ctx.stroke();

 // 균열/주름
 ctx.strokeStyle="rgba(126,137,154,0.75)";
 ctx.lineWidth=2;
 const crack = (x1,y1,x2,y2,x3,y3)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineTo(x3,y3);ctx.stroke();};
 crack(-26,-16,-10,-9,-20,4);
 crack(8,-20,19,-8,6,3);

 // 중앙 경고 띠
 ctx.fillStyle="#f8d347";
 ctx.beginPath();
 ctx.roundRect(-38,-9,76,18,7);
 ctx.fill();
 ctx.strokeStyle="#1a2433";
 ctx.lineWidth=3;
 ctx.stroke();

 ctx.save();
 ctx.beginPath();
 ctx.roundRect(-36,-8,72,16,6);
 ctx.clip();
 ctx.strokeStyle="#1a2433";
 ctx.lineWidth=5;
 for(let xx=-48;xx<52;xx+=18){
  ctx.beginPath();
  ctx.moveTo(xx,-12);
  ctx.lineTo(xx+18,12);
  ctx.stroke();
 }
 ctx.restore();

 // 측면 암/클램프
 ctx.fillStyle="#bec8d7";
 ctx.strokeStyle="#121d2b";
 ctx.lineWidth=4;
 const armDir = side==="left"?-1:1;
 ctx.beginPath();
 ctx.roundRect(armDir*26-10,-31,armDir*18,62,9);
 ctx.fill();
 ctx.stroke();

 // 상단 캡
 ctx.fillStyle="#e7ebf1";
 ctx.beginPath();
 ctx.ellipse(0,-headH/2+4,31,7,0,0,Math.PI*2);
 ctx.fill();
 ctx.stroke();
 ctx.restore();

 // 전면 충돌선 강조
 ctx.strokeStyle="rgba(255,216,78,0.92)";
 ctx.lineWidth=4;
 ctx.beginPath();
 ctx.moveTo(front,bodyTop-4);
 ctx.lineTo(front,bodyTop+bodyH+4);
 ctx.stroke();

 ctx.restore();
}
function drawReferenceLinks(){
 const nodes=bullets.filter(b=>b.kind==="citationAnchor"&&b.state==="anchor"&&!b.dead).sort((a,b)=>(a.data.index||0)-(b.data.index||0));
 if(nodes.length<2)return;
 ctx.save();ctx.strokeStyle="#9bd8ff";ctx.lineWidth=4;ctx.setLineDash([12,9]);ctx.globalAlpha=.42+.18*Math.sin(time*10);
 ctx.beginPath();ctx.moveTo(nodes[0].x,nodes[0].y);for(let i=1;i<nodes.length;i++)ctx.lineTo(nodes[i].x,nodes[i].y);if(nodes.length===4)ctx.closePath();ctx.stroke();ctx.restore()
}
function drawBullet(b){
 if(b.kind==="eliteWall"&&b.dormant)return;
 const color=bulletColor(b.kind);drawBulletTrail(b,color);drawBulletDataSparks(b,color);
 ctx.save();
 if(b.kind==="eliteWall"){ctx.shadowBlur=0;ctx.shadowColor="transparent"}
 else{ctx.shadowColor=color;ctx.shadowBlur=(b.kind==="energyBomb"||b.kind==="block")?11:7}
 if(b.kind==="noReplyCore"){ctx.globalAlpha=b.alpha;ctx.translate(b.x,b.y);ctx.rotate(b.a+Math.PI/2);ctx.scale(b.scale,b.scale);drawNoReplyCore(b)}
 else if(b.kind==="miniShard"||b.kind==="noReplyShard"){ctx.globalAlpha=b.dormant?.55:1;ctx.translate(b.x,b.y);ctx.rotate(b.a+Math.PI/2);ctx.scale(b.scale,b.scale);drawNoReplyShard()}
 else if(b.kind==="boomerangPage"){ctx.translate(b.x,b.y);ctx.rotate(b.a+Math.PI/2);ctx.scale(b.scale,b.scale);drawBoomerangPage()}
 else if(b.kind==="eliteWall")drawEliteWall(b);
 else{const map={paper:"paper",drop:"drop",x:"x",energy:"energyOrb",energyWisp:"energyOrb",energyBomb:"energyOrb",citation:"citation",citationAnchor:"citation",ink:"ink",timer:"timer",block:"block"},im=images[map[b.kind]];if(b.wall){const dir=b.vx>0?1:-1;drawImageFit(im,b.x,b.y,Math.min(160,Math.max(75,b.w*.32)),66,dir>0?0:Math.PI,b.dormant?.5:1)}else drawImageFit(im,b.x,b.y,90*b.scale,90*b.scale,b.a+Math.PI/2,b.dormant?.55:1)}
 ctx.restore();

}
function drawEffects(){
 for(const t of trails){
  ctx.save();
  const fade=t.kind==="highlightStroke"
   ?(t.fadeStart==null?1:clamp(1-(t.t-t.fadeStart)/Math.max(.001,t.life-t.fadeStart),0,1))
   :clamp(1-t.t/t.life,0,1);
  if(t.kind==="highlightStroke"){
   ctx.lineCap="butt";ctx.lineJoin="round";
   ctx.globalAlpha=fade*(t.alpha||.7)*.28;
   ctx.strokeStyle="#dfff35";ctx.lineWidth=t.r*2.8;
   ctx.beginPath();ctx.moveTo(t.x1,t.y1);ctx.lineTo(t.x2,t.y2);ctx.stroke();
   ctx.globalAlpha=fade*(t.alpha||.7);
   ctx.strokeStyle="#c8ff20";ctx.lineWidth=t.r*2;
   ctx.beginPath();ctx.moveTo(t.x1,t.y1);ctx.lineTo(t.x2,t.y2);ctx.stroke();
   ctx.globalAlpha=fade*.25;
   ctx.strokeStyle="#f3ff9a";ctx.lineWidth=Math.max(3,t.r*.48);
   ctx.beginPath();ctx.moveTo(t.x1,t.y1-t.r*.35);ctx.lineTo(t.x2,t.y2-t.r*.35);ctx.stroke();
  }else{
   ctx.globalAlpha=fade*.5;ctx.fillStyle="#baff26";ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill()
  }
  ctx.restore()
 }
 for(const e of effects){
  const p=clamp(e.t/e.life,0,1),k=1-p;
  ctx.save();ctx.globalAlpha=k*e.alpha;
  if(e.type==="bubble"){
   ctx.strokeStyle=e.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,e.r*(1+e.t*1.4),0,Math.PI*2);ctx.stroke()
  }else if(e.type==="pulse"){
   ctx.strokeStyle=e.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,e.r+e.t*90,0,Math.PI*2);ctx.stroke()
  }else if(e.type==="ghostWarning"){
   ctx.translate(e.x,e.y);
   const flash=.45+.55*Math.abs(Math.sin(p*Math.PI*6));
   ctx.globalAlpha=k*flash;
   ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.lineWidth=5;
   const rr=e.r*(.72+.26*Math.sin(p*Math.PI*3));
   ctx.beginPath();ctx.arc(0,0,rr,0,Math.PI*2);ctx.stroke();
   ctx.beginPath();ctx.arc(0,0,rr*.52,0,Math.PI*2);ctx.stroke();
   for(let i=0;i<8;i++){
    ctx.save();ctx.rotate(i*Math.PI/4+time*1.6);
    ctx.beginPath();ctx.moveTo(0,-rr-16);ctx.lineTo(-5,-rr-4);ctx.lineTo(5,-rr-4);ctx.closePath();ctx.fill();ctx.restore()
   }
   ctx.font="900 42px Arial";ctx.textAlign="center";ctx.textBaseline="middle";
   ctx.strokeStyle=INK;ctx.lineWidth=7;ctx.strokeText("!",0,2);ctx.fillText("!",0,2);
  }else if(e.type==="ghostMarker"){
   ctx.translate(e.x,e.y);ctx.strokeStyle=e.color;ctx.lineWidth=4;ctx.setLineDash([12,9]);
   const rr=e.r*(1-.42*p)+8*Math.sin(p*Math.PI*4);
   ctx.beginPath();ctx.arc(0,0,rr,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
   ctx.globalAlpha=k*.65;ctx.beginPath();ctx.arc(0,0,rr*.58,0,Math.PI*2);ctx.stroke();
   for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2+time*.8);ctx.beginPath();ctx.moveTo(0,-rr-12);ctx.lineTo(-7,-rr+2);ctx.lineTo(7,-rr+2);ctx.closePath();ctx.fillStyle=e.color;ctx.fill();ctx.restore()}
  }else if(e.type==="ghostVanish"){
   ctx.translate(e.x,e.y);ctx.strokeStyle=e.color;ctx.lineWidth=4;
   for(let i=-2;i<=2;i++){ctx.globalAlpha=k*(.18+.12*(2-Math.abs(i)));ctx.beginPath();ctx.ellipse(i*10,0,e.r*(.65-p*.35),e.r*(1-p*.72),0,0,Math.PI*2);ctx.stroke()}
  }else if(e.type==="ghostArrival"){
   ctx.translate(e.x,e.y);ctx.strokeStyle=e.color;ctx.lineWidth=5;ctx.globalAlpha=Math.sin(Math.min(1,p)*Math.PI)*.9;
   ctx.beginPath();ctx.ellipse(0,0,e.r*(.35+p*.85),e.r*(1.4-p*.55),0,0,Math.PI*2);ctx.stroke();
   ctx.beginPath();ctx.moveTo(-e.r,0);ctx.lineTo(e.r,0);ctx.stroke()
  }else{
   ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,e.r*k,0,Math.PI*2);ctx.fill()
  }
  ctx.restore()
 }
}
function drawParticles(){for(const p of particles){const k=clamp(1-p.age/p.life,0,1),speed=Math.hypot(p.vx,p.vy);ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=k;ctx.strokeStyle=p.color;ctx.fillStyle=p.color;if(p.shape==="streak"||speed>120){const d=speed||1,dx=p.vx/d,dy=p.vy/d,L=clamp(speed*.035,5,18);ctx.lineWidth=Math.max(1,p.size);ctx.lineCap="round";ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-dx*L,p.y-dy*L);ctx.stroke()}else{ctx.translate(p.x,p.y);ctx.rotate(Math.PI*.25+p.age*p.spin+p.phase);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size)}ctx.restore()}}
function drawVanishes(){for(const v of vanishes){const p=clamp(v.age/v.life,0,1),k=1-p,size=v.size*(1+p*.75);ctx.save();ctx.translate(v.x,v.y);ctx.rotate(Math.PI*.25+v.phase+p*1.6);ctx.globalCompositeOperation="screen";ctx.strokeStyle=v.color;ctx.fillStyle=rgba(v.color,.12*k);ctx.globalAlpha=k;ctx.lineWidth=3*v.strength;ctx.strokeRect(-size*.28,-size*.28,size*.56,size*.56);ctx.fillRect(-size*.12,-size*.12,size*.24,size*.24);ctx.rotate(-Math.PI*.25-v.phase-p*1.6);for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);ctx.beginPath();ctx.moveTo(size*.18,0);ctx.lineTo(size*.68,0);ctx.stroke();ctx.restore()}ctx.restore()}}

export function renderChapter2WaveSystem(engine: any) {
  if (!engine?.chapter2Wave?.enabled) return;
  activeEngine = engine;
  ctx = engine.ctx;
  const sx = virtualScaleX(engine);
  const sy = virtualScaleY(engine);
  const scaleShakeX = shake * sx;
  const scaleShakeY = shake * sy;
  engine.ctx.save();
  if (shake > 0.2) engine.ctx.translate(rnd(-scaleShakeX, scaleShakeX), rnd(-scaleShakeY, scaleShakeY));
  withOriginalAspectRenderState(engine, () => {
    drawEffects();
    drawParticles();
    drawReferenceLinks();
    for (const enemy of enemies) drawEnemy(enemy);
    for (const bullet of bullets) drawBullet(bullet);
    drawVanishes();
  });
  engine.ctx.restore();
  ctx = null;
}

export function renderChapter2WaveHudSystem(engine: any) {
  if (!engine?.chapter2Wave?.enabled) return;
  const runtime: Chapter2WaveRuntime = engine.chapter2Wave;
  const waveCount = Math.max(1, runtime.waveCount || hardWaveDefs.length);
  const completedWaves = runtime.allWavesCleared ? waveCount : Math.max(0, runtime.selectedWave);
  const currentWaveRatio = runtime.allWavesCleared ? 1 : clamp(runtime.progress || 0, 0, 0.985);
  const purificationRatio = clamp((completedWaves + currentWaveRatio) / waveCount, 0, 1);
  const percent = Math.round(purificationRatio * 100);

  // Chapter 1의 스토리 전투 HUD 디자인을 그대로 사용한다.
  const ctx = engine.ctx as CanvasRenderingContext2D;
  const centerX = engine.canvas.width / 2;
  const panelWidth = Math.min(330, engine.canvas.width * 0.42);
  const panelHeight = 48;
  const panelX = centerX - panelWidth / 2;
  const panelY = 15;
  const barX = panelX + 14;
  const barY = panelY + 27;
  const barWidth = panelWidth - 28;
  const barHeight = 9;

  ctx.save();
  ctx.shadowColor = "rgba(246,195,74,.34)";
  ctx.shadowBlur = 13;
  ctx.fillStyle = "rgba(4,8,15,.88)";
  ctx.strokeStyle = "rgba(246,195,74,.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textBaseline = "middle";
  ctx.font = "900 12px 'Noto Sans KR', system-ui, sans-serif";
  ctx.fillStyle = "#fff1b5";
  ctx.textAlign = "left";
  ctx.fillText("정화 에너지", panelX + 14, panelY + 15);
  ctx.textAlign = "right";
  ctx.fillStyle = percent >= 100 ? "#fff7cf" : "#9de9ff";
  ctx.fillText(`${percent}%`, panelX + panelWidth - 14, panelY + 15);

  ctx.fillStyle = "rgba(2,6,13,.95)";
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 5);
  ctx.fill();
  ctx.stroke();

  const fillWidth = Math.max(0, barWidth * purificationRatio);
  if (fillWidth > 0) {
    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, "#38d8e8");
    gradient.addColorStop(0.62, "#f6c34a");
    gradient.addColorStop(1, "#fff4a8");
    ctx.shadowColor = percent >= 100 ? "#fff3a8" : "#38d8e8";
    ctx.shadowBlur = percent >= 100 ? 14 : 7;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillWidth, barHeight, 5);
    ctx.fill();
  }
  ctx.restore();
}

export function areChapter2WaveVisualsReadySystem() {
  const required = Object.values(monsterImagePaths).filter(Boolean) as string[];
  if (required.length === 0) return true;
  return Object.entries(monsterImagePaths).every(([key, src]) => {
    if (!src) return true;
    const image = images[key];
    return !!image && image.complete && image.naturalWidth > 0;
  });
}
