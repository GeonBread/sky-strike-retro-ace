import { Enemy, type Bullet } from "../entities";
import { sfx } from "../AudioSystem";
import { createChapter1BossOriginalRuntime } from "./chapter1BossOriginalRuntime";
import {
  CHAPTER1_BOSS_PHASE1_PATTERN_IDS,
  CHAPTER1_BOSS_PHASE2_PATTERN_IDS,
  createChapter1BossRuntime,
  type Chapter1BossPatternId,
  type Chapter1BossRuntime,
} from "./chapter1BossTypes";

const W = 800;
const H = 960;

export const CHAPTER1_BOSS_PATTERNS: ReadonlyArray<{
  id: Chapter1BossPatternId;
  title: string;
  duration: number;
  stage: 1 | 2;
}> = [
  { id: 17, title: "광자 나선 스윕", duration: 8.4, stage: 1 },
  { id: 5, title: "웨이브 곡선 스트림", duration: 8.0, stage: 1 },
  { id: 8, title: "지연 추적 클러스터", duration: 8.0, stage: 1 },
  { id: 16, title: "4연 별탄 도탄", duration: 8.0, stage: 1 },
  { id: 19, title: "최종 강습 타임시프트", duration: 9.0, stage: 1 },
  { id: 53, title: "오염 데이터 롤백", duration: 9.4, stage: 1 },
  { id: 7, title: "서비스 접속 대기열", duration: 9.8, stage: 2 },
  { id: 54, title: "수강신청 클릭탄", duration: 10.5, stage: 2 },
  { id: 55, title: "출석 쟁탈전", duration: 13.1, stage: 2 },
  { id: 59, title: "4자리 인증코드", duration: 11.5, stage: 2 },
  { id: 61, title: "공지 전광판 폭주", duration: 9.2, stage: 2 },
  { id: 62, title: "강의실 좌표 복구", duration: 11.4, stage: 2 },
  { id: 63, title: "안내 방송 혼선", duration: 12.4, stage: 2 },
  { id: 64, title: "학생증 NFC 동기화", duration: 14.6, stage: 2 },
  { id: 65, title: "읽지 않은 알림 누적", duration: 9.4, stage: 2 },
  { id: 66, title: "학사 데이터 강제 동기화", duration: 9.4, stage: 2 },
];

function runtimeOf(engine: any): Chapter1BossRuntime {
  if (!engine.chapter1Boss) engine.chapter1Boss = createChapter1BossRuntime();
  return engine.chapter1Boss;
}

function scaleOf(engine: any): { x: number; y: number; uniform: number } {
  const x = Math.max(0.0001, engine.canvas.width / W);
  const y = Math.max(0.0001, engine.canvas.height / H);
  return { x, y, uniform: Math.min(x, y) };
}

function playerCanonical(engine: any) {
  const scale = scaleOf(engine);
  return {
    x: (engine.player.x + engine.player.width / 2) / scale.x,
    y: (engine.player.y + engine.player.height / 2) / scale.y,
    radius: Math.max(
      7,
      Math.min(
        15,
        ((engine.player.hitWidth ?? 10) / scale.x + (engine.player.hitHeight ?? 10) / scale.y) * 0.32,
      ),
    ),
    invulnerable: !!engine.player.isDead || engine.player.invulnTimer > 0,
  };
}

function completeBoss(engine: any, runtime: Chapter1BossRuntime): void {
  if (!runtime.active) return;
  runtime.active = false;
  engine.bossActive = false;
  engine.bossEntity = null;
  engine.enemies = engine.enemies.filter((enemy: Enemy) => !(enemy as any).chapter1ExactBossProxy);
  engine.bossPhase2Active = false;
  engine.onCutsceneChange?.(false);
  if (typeof engine.awardScore === "function") engine.awardScore(10000);
  if (engine.isSandbox) {
    engine.state = "PLAYING";
    return;
  }
  if (engine.onStageClear) {
    engine.state = "STAGE_CLEAR_CHOICE";
    engine.onStageClear(engine.getStageClearChoices(), (choice: string) => {
      engine.applyStageClearReward(choice);
      engine.startNextStageAfterReward();
    });
  } else {
    engine.startNextStageAfterReward();
  }
}

function createBossCore(engine: any, runtime: Chapter1BossRuntime) {
  return createChapter1BossOriginalRuntime({
    canvas: engine.canvas,
    ctx: engine.ctx,
    getPlayer: () => playerCanonical(engine),
    hitPlayer: () => {
      if (engine.player.isDead || engine.player.invulnTimer > 0) return;
      engine.triggerPlayerHit();
    },
    onComplete: () => completeBoss(engine, runtime),
  });
}

function syncBossEntity(engine: any, runtime: Chapter1BossRuntime): void {
  const core = runtime.core;
  if (!core) return;
  const state = core.state;
  const scale = scaleOf(engine);
  const proxy = engine.bossEntity instanceof Enemy ? engine.bossEntity : new Enemy();
  proxy.type = "boss";
  proxy.active = true;
  proxy.width = state.boss.drawW * scale.x;
  proxy.height = state.boss.drawH * scale.y;
  proxy.x = state.boss.x * scale.x - proxy.width / 2;
  proxy.y = state.boss.y * scale.y - proxy.height / 2;
  proxy.hp = state.bossStageState === "stage2" ? state.stage2Hp : state.stage1Hp;
  proxy.phase = state.patternIndex;
  (proxy as any).chapter1ExactBossProxy = true;
  engine.bossEntity = proxy;
  engine.enemies = engine.enemies.filter((enemy: Enemy) => !(enemy as any).chapter1ExactBossProxy);
  engine.enemies.push(proxy);
  engine.bossActive = true;
  engine.bossPhase2Active = state.bossStage === 2;
}

function clampPlayerToOriginalBounds(engine: any, runtime: Chapter1BossRuntime): void {
  const core = runtime.core;
  if (!core) return;
  const scale = scaleOf(engine);
  const bounds = core.getMovementBounds();
  const centerX = Math.max(bounds.minX, Math.min(bounds.maxX, (engine.player.x + engine.player.width / 2) / scale.x));
  const centerY = Math.max(bounds.minY, Math.min(bounds.maxY, (engine.player.y + engine.player.height / 2) / scale.y));
  engine.player.x = centerX * scale.x - engine.player.width / 2;
  engine.player.y = centerY * scale.y - engine.player.height / 2;
}

function hitBossWithPlayerBullets(engine: any, runtime: Chapter1BossRuntime): void {
  const core = runtime.core;
  if (!core || !core.isPlayerAttackAllowed()) return;
  const hitArea = core.getBossHitArea();
  const scale = scaleOf(engine);
  for (const bullet of engine.bullets as Bullet[]) {
    if (!bullet.active || bullet.isEnemy) continue;
    const cx = (bullet.x + bullet.width / 2) / scale.x;
    const cy = (bullet.y + bullet.height / 2) / scale.y;
    const nx = (cx - hitArea.x) / Math.max(1, hitArea.rx);
    const ny = (cy - hitArea.y) / Math.max(1, hitArea.ry);
    if (nx * nx + ny * ny > 1) continue;
    const continuousBeam = bullet.playerBulletKind === "musicBeam";
    const now = core.state.t;
    const nextHit = (bullet as any).__chapter1OriginalBossNextHit ?? 0;
    if (continuousBeam && now < nextHit) continue;
    if (continuousBeam) (bullet as any).__chapter1OriginalBossNextHit = now + 0.12;
    else bullet.active = false;
    core.applyDamage(Math.max(0, bullet.damage || 1));
    engine.spawnExplosion?.(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, "#8fd9e5", 4);
    sfx.bossHit();
  }
  engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active);
}

function updateBombDamage(engine: any, runtime: Chapter1BossRuntime): void {
  const core = runtime.core;
  if (!core) return;
  if (!engine.bombActive) {
    runtime.bombHit = false;
    return;
  }
  const scale = scaleOf(engine);
  const player = playerCanonical(engine);
  const radius = engine.bombRadius / scale.uniform;
  if (!runtime.bombHit && Math.hypot(core.state.boss.x - player.x, core.state.boss.y - player.y) < radius + 160) {
    runtime.bombHit = true;
    core.applyDamage(50);
    sfx.bossHit();
  }
}

export function startChapter1BossSystem(
  engine: any,
  options: { sandboxPatternLock?: number; skipIntro?: boolean } = {},
): void {
  const runtime = runtimeOf(engine);
  runtime.active = true;
  runtime.enabled = true;
  runtime.bombHit = false;
  runtime.sandboxPatternLock = options.sandboxPatternLock ?? -1;
  runtime.core = createBossCore(engine, runtime);
  runtime.core.start({
    skipIntro: !!options.skipIntro,
    patternId: runtime.sandboxPatternLock >= 0 ? runtime.sandboxPatternLock : undefined,
    story: engine.playMode === "story",
  });
  engine.enemies = engine.enemies.filter((enemy: Enemy) => enemy.type !== "boss");
  engine.bullets = engine.bullets.filter((bullet: Bullet) => !bullet.isEnemy);
  engine.clearingForBoss = false;
  engine.bossActive = true;
  engine.state = "PLAYING";
  engine.onCutsceneChange?.(!options.skipIntro);
  sfx.startBossBgm();
  syncBossEntity(engine, runtime);
}

export function resetChapter1BossSystem(engine: any): void {
  engine.chapter1Boss = createChapter1BossRuntime();
}

export function shouldUseChapter1BossSystem(engine: any): boolean {
  return engine.stage === 1 && !!engine.chapter1Boss?.active;
}

export function updateChapter1BossSystem(engine: any, dt: number): void {
  const runtime = runtimeOf(engine);
  if (!runtime.active || !runtime.core) return;
  clampPlayerToOriginalBounds(engine, runtime);
  runtime.core.update(dt);
  hitBossWithPlayerBullets(engine, runtime);
  updateBombDamage(engine, runtime);
  const mode = runtime.core.state.cinematicMode;
  const stageState = runtime.core.state.bossStageState;
  engine.onCutsceneChange?.(mode !== "battle" || stageState === "phase1clear" || stageState === "awakening");
  syncBossEntity(engine, runtime);
}

export function handleChapter1BossDigitSystem(engine: any, digit: number): boolean {
  const runtime = runtimeOf(engine);
  if (!runtime.active || !runtime.core) return false;
  return runtime.core.inputDigit(digit);
}

export function getChapter1BossAuthPadButtonsSystem(engine?: any) {
  const core = engine?.chapter1Boss?.core;
  return core?.state?.pattern?.authPads ?? [];
}

export function handleChapter1BossPointerSystem(engine: any, canvasX: number, canvasY: number): boolean {
  const runtime = runtimeOf(engine);
  if (!runtime.active || !runtime.core) return false;
  const scale = scaleOf(engine);
  return runtime.core.pointerDown(canvasX / scale.x, canvasY / scale.y);
}

export function getChapter1BossPatternIdsSystem(): readonly number[] {
  return [...CHAPTER1_BOSS_PHASE1_PATTERN_IDS, ...CHAPTER1_BOSS_PHASE2_PATTERN_IDS];
}
