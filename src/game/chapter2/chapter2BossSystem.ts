import { Enemy, Bullet } from "../entities";
import { sfx } from "../AudioSystem";
import { createChapter2BossOriginalRuntime } from "./chapter2BossOriginalRuntime";
import { getChapter2BossViewportProjection } from "./chapter2BossViewportProjection";
import {
  createChapter2BossRuntime,
  type Chapter2BossHudState,
  type Chapter2BossRuntime,
  type Chapter2BossSceneId,
} from "./chapter2BossTypes";

export const CHAPTER2_BOSS_PATTERNS: ReadonlyArray<{
  id: number;
  title: string;
  phase: 1 | 2;
}> = [
  { id: 201, title: "간단한 계산 문제", phase: 1 },
  { id: 202, title: "F학점 폭탄", phase: 1 },
  { id: 203, title: "동그라미 채점 폭발", phase: 1 },
  { id: 204, title: "오염 탄막", phase: 1 },
  { id: 205, title: "블랙홀 탄", phase: 1 },
  { id: 206, title: "추적 레이저 오염포격", phase: 1 },
  { id: 207, title: "봐야 될 전공책", phase: 1 },
  { id: 301, title: "PPT 텍스트 공격", phase: 2 },
  { id: 302, title: "PPT 도형 물리 공격", phase: 2 },
  { id: 303, title: "팀원별 형식 불일치", phase: 2 },
  { id: 304, title: "공유 문서함 드론", phase: 2 },
  { id: 305, title: "팀플 단체 채팅 레이저", phase: 2 },
  { id: 306, title: "Zoom 미팅 공격", phase: 2 },
  { id: 307, title: "복붙 및 이전으로", phase: 2 },
  { id: 308, title: "미팅 패턴 · 카톡 채팅방 미사일", phase: 2 },
  { id: 309, title: "미팅 패턴 · Word 보고서 오류", phase: 2 },
];

function runtimeOf(engine: any): Chapter2BossRuntime {
  if (!engine.chapter2Boss) engine.chapter2Boss = createChapter2BossRuntime();
  return engine.chapter2Boss;
}

function playerCanonical(engine: any) {
  const projection = getChapter2BossViewportProjection(engine.canvas);
  return {
    x: (engine.player.x + engine.player.width / 2 - projection.offsetX) / projection.scale,
    y: (engine.player.y + engine.player.height / 2 - projection.offsetY) / projection.scale,
    radius: Math.max(
      4,
      Math.min(
        8,
        ((engine.player.hitWidth ?? 6) + (engine.player.hitHeight ?? 6)) / projection.scale * 0.22,
      ),
    ),
    invulnerable: !!engine.player.isDead || engine.player.invulnTimer > 0,
  };
}

function setPlayerFromCanonical(engine: any, x: number, y: number): void {
  const projection = getChapter2BossViewportProjection(engine.canvas);
  engine.player.x = projection.offsetX + x * projection.scale - engine.player.width / 2;
  engine.player.y = projection.offsetY + y * projection.scale - engine.player.height / 2;
}

function clearChapter2BossSupportObjects(engine: any): void {
  engine.enemies.forEach((enemy: Enemy) => {
    if ((enemy as any).chapter2BossSupport) enemy.active = false;
  });
  engine.enemies = engine.enemies.filter((enemy: Enemy) => !(enemy as any).chapter2BossSupport);
  engine.bullets.forEach((bullet: Bullet) => {
    if ((bullet as any).chapter2BossSupportBullet) bullet.active = false;
  });
  engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active);
}

function clearCombatObjects(engine: any): void {
  engine.enemies = [];
  engine.bullets.forEach((bullet: Bullet) => {
    if (bullet.isEnemy) bullet.active = false;
  });
  engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active && !bullet.isEnemy);
  engine.powerups = [];
}

function completeBoss(engine: any, runtime: Chapter2BossRuntime): void {
  if (!runtime.active || runtime.completeNotified) return;
  runtime.completeNotified = true;
  runtime.active = false;
  engine.bossActive = false;
  engine.bossEntity = null;
  engine.bossPhase2Active = false;
  clearCombatObjects(engine);
  engine.state = "PLAYING";
  if (typeof engine.awardScore === "function") engine.awardScore(12000);
  engine.onChapter2BossComplete?.();
}

function createBossCore(engine: any, runtime: Chapter2BossRuntime) {
  return createChapter2BossOriginalRuntime({
    getPlayer: () => playerCanonical(engine),
    setPlayerPosition: (x, y) => setPlayerFromCanonical(engine, x, y),
    hitPlayer: () => {
      if (engine.player.isDead || engine.player.invulnTimer > 0) return;
      engine.triggerPlayerHit();
    },
    onComplete: () => completeBoss(engine, runtime),
  });
}

function syncBossEntity(engine: any, runtime: Chapter2BossRuntime): void {
  const core = runtime.core;
  if (!core) return;
  const hud = core.getHudState() as Chapter2BossHudState;
  const state = core.state;
  const projection = getChapter2BossViewportProjection(engine.canvas);
  const proxy = engine.bossEntity instanceof Enemy ? engine.bossEntity : new Enemy();
  proxy.type = "boss";
  proxy.active = runtime.active;
  const bossDiameter = Math.max(150, state.boss.r * 2.25) * projection.scale;
  proxy.width = bossDiameter;
  proxy.height = bossDiameter;
  proxy.x = projection.offsetX + state.boss.x * projection.scale - proxy.width / 2;
  proxy.y = projection.offsetY + state.boss.y * projection.scale - proxy.height / 2;
  proxy.hp = Math.max(0, hud.hp);
  proxy.phase = hud.patternId;
  (proxy as any).chapter2OriginalBossProxy = true;
  engine.bossEntity = proxy;
  // 프록시는 HUD/유도탄 타깃용입니다. 충돌은 아래의 챕터 1 방식 전용 판정에서 처리합니다.
  engine.bossActive = runtime.active;
  engine.bossPhase2Active = hud.phase === 2;
  engine.bossPhase3Active = false;
}

function clampPlayerToBossViewport(engine: any, runtime: Chapter2BossRuntime): void {
  const core = runtime.core;
  if (!core) return;
  const projection = getChapter2BossViewportProjection(engine.canvas);
  const bounds = core.getMovementBounds();
  const canonical = playerCanonical(engine);
  setPlayerFromCanonical(
    engine,
    Math.max(bounds.minX, Math.min(bounds.maxX, canonical.x)),
    Math.max(bounds.minY, Math.min(bounds.maxY, canonical.y)),
  );
}

/**
 * Chapter 1 boss hit logic is intentionally mirrored here:
 * - compare the player bullet center against the boss ellipse in canonical coordinates
 * - consume a normal bullet on hit
 * - rate-limit musicBeam continuous hits
 * - apply the player's native bullet damage directly with core.applyDamage()
 *
 * The v68 runtime is used only for destructible pattern objects. Keeping that path separate
 * prevents its own boss-hit routine from running for every flying player bullet.
 */
function hitBossAndPatternObjectsWithPlayerBullets(engine: any, runtime: Chapter2BossRuntime): void {
  const core = runtime.core;
  if (!core) return;
  const hud = core.getHudState() as Chapter2BossHudState;
  const cinematicLocked = !!hud.cinematic || !!hud.clearStage || hud.victoryComplete;

  if (cinematicLocked) {
    for (const bullet of engine.bullets as Bullet[]) {
      if (bullet.active && !bullet.isEnemy) bullet.active = false;
    }
    engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active);
    return;
  }

  const projection = getChapter2BossViewportProjection(engine.canvas);
  const attackAllowed = core.isPlayerAttackAllowed();
  const hitArea = core.getBossHitArea();

  for (const bullet of engine.bullets as Bullet[]) {
    if (!bullet.active || bullet.isEnemy) continue;

    const cx = (bullet.x + bullet.width / 2 - projection.offsetX) / projection.scale;
    const cy = (bullet.y + bullet.height / 2 - projection.offsetY) / projection.scale;
    const nx = (cx - hitArea.x) / Math.max(1, hitArea.rx);
    const ny = (cy - hitArea.y) / Math.max(1, hitArea.ry);
    const touchesBoss = nx * nx + ny * ny <= 1;
    const continuousBeam = bullet.playerBulletKind === "musicBeam";

    if (touchesBoss && attackAllowed) {
      const now = core.state.t;
      const nextHit = (bullet as any).__chapter2OriginalBossNextHit ?? 0;
      if (continuousBeam && now < nextHit) continue;
      if (continuousBeam) (bullet as any).__chapter2OriginalBossNextHit = now + 0.12;
      else bullet.active = false;

      if (core.isBossShielded()) {
        // Keep only the original shield feedback. Damage remains blocked while document drones live.
        core.handlePlayerShot({
          x: cx,
          y: cy,
          r: Math.max(2.5, Math.max(bullet.width, bullet.height) * 0.2 / projection.scale),
          damage: Math.max(0, bullet.damage || 1),
        });
      } else {
        core.applyDamage(Math.max(0, bullet.damage || 1));
      }

      engine.spawnExplosion?.(
        bullet.x + bullet.width / 2,
        bullet.y + bullet.height / 2,
        hud.phase === 2 ? "#ff93a1" : "#8fd9e5",
        4,
      );
      sfx.bossHit();
      continue;
    }

    // v68 destructible pattern objects still receive shots, but its boss hit test is bypassed.
    if (!attackAllowed || continuousBeam) continue;
    const patternHit = core.handlePatternShot({
      x: cx,
      y: cy,
      r: Math.max(2.5, Math.max(bullet.width, bullet.height) * 0.2 / projection.scale),
      damage: Math.max(0, bullet.damage || 1),
    });
    if (!patternHit) continue;

    bullet.active = false;
    engine.spawnExplosion?.(
      bullet.x + bullet.width / 2,
      bullet.y + bullet.height / 2,
      "#8fd9e5",
      3,
    );
    sfx.enemyHit();
  }

  engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active);
}

function spawnChapter2BossSupportPair(engine: any, runtime: Chapter2BossRuntime): void {
  // Chapter 2 원본 페이지 드론 크기: 112x92에 MONSTER_SCALE(1.28)을 적용한 값.
  const width = 112 * 1.28;
  const height = 92 * 1.28;
  const lanes = [0.20, 0.80];
  for (let index = 0; index < 2; index += 1) {
    const enemy = new Enemy();
    enemy.type = "basic";
    enemy.visualId = 2;
    enemy.width = width;
    enemy.height = height;
    enemy.hitWidth = width * 0.72;
    enemy.hitHeight = height * 0.72;
    enemy.x = engine.canvas.width * lanes[index] - width / 2;
    enemy.y = -height - index * 36;
    enemy.hp = 10;
    enemy.active = true;
    (enemy as any).chapter2BossSupport = {
      serial: runtime.supportWaveSerial,
      index,
      state: "enter",
      targetY: 235 + index * 50,
      anchorX: enemy.x,
      phase: index * Math.PI,
      time: 0,
      shootCooldown: 1.0 + index * 0.2,
    };
    engine.enemies.push(enemy);
  }
  runtime.supportWaveSerial += 1;
}

function shootChapter2BossSupportBullet(engine: any, enemy: Enemy): void {
  const cx = enemy.x + enemy.width / 2;
  const cy = enemy.y + enemy.height * 0.7;
  const px = engine.player.x + engine.player.width / 2;
  const py = engine.player.y + engine.player.height / 2;
  const angle = Math.atan2(py - cy, px - cx);
  const bullet = new Bullet();
  bullet.isEnemy = true;
  bullet.type = "normal";
  bullet.width = 12;
  bullet.height = 12;
  bullet.x = cx - bullet.width / 2;
  bullet.y = cy - bullet.height / 2;
  bullet.vx = Math.cos(angle) * 238;
  bullet.vy = Math.sin(angle) * 238;
  bullet.damage = 1;
  bullet.color = "#ffb24a";
  bullet.visualType = "corrupt_orb";
  (bullet as any).chapter2BossSupportBullet = true;
  engine.bullets.push(bullet);
}

function updateChapter2BossSupportSystem(engine: any, runtime: Chapter2BossRuntime, dt: number): void {
  const core = runtime.core;
  if (!core || engine.player?.isDead) return;
  const hud = core.getHudState() as Chapter2BossHudState;
  const cinematic = !!hud.cinematic || !!hud.clearStage || hud.victoryComplete;
  if (cinematic) {
    clearChapter2BossSupportObjects(engine);
    runtime.supportSpawnTimer = 5.5;
    return;
  }

  const supports = (engine.enemies as Enemy[]).filter(
    (enemy) => enemy.active && !!(enemy as any).chapter2BossSupport,
  );
  for (const enemy of supports) {
    const support = (enemy as any).chapter2BossSupport;
    support.time += dt;
    if (support.state === "enter") {
      enemy.y += 185 * dt;
      if (enemy.y >= support.targetY) {
        enemy.y = support.targetY;
        support.state = "hover";
        support.anchorX = enemy.x;
        support.shootCooldown = 0.55 + support.index * 0.18;
      }
    } else {
      const desiredX = support.anchorX + Math.sin(support.time * 2.25 + support.phase) * 34;
      enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 5.2);
      support.shootCooldown -= dt;
      if (support.shootCooldown <= 0) {
        support.shootCooldown = 1.15 + Math.random() * 0.3;
        shootChapter2BossSupportBullet(engine, enemy);
      }
    }
  }

  runtime.supportSpawnTimer -= dt;
  if (runtime.supportSpawnTimer > 0) return;
  const liveCount = (engine.enemies as Enemy[]).filter(
    (enemy) => enemy.active && !!(enemy as any).chapter2BossSupport,
  ).length;
  // 한 번에 정확히 2마리만 등장하며, 살아 있는 지원몹이 있으면 추가 소환하지 않습니다.
  if (liveCount === 0 && core.isPlayerAttackAllowed()) {
    spawnChapter2BossSupportPair(engine, runtime);
    runtime.supportSpawnTimer = 10.5 + Math.random() * 2.5;
  } else {
    runtime.supportSpawnTimer = 1.0;
  }
}

function updateBombDamage(engine: any, runtime: Chapter2BossRuntime): void {
  const core = runtime.core;
  if (!core) return;
  if (!engine.bombActive) {
    runtime.bombHit = false;
    return;
  }
  if (runtime.bombHit) return;
  runtime.bombHit = true;
  core.clearEnemyProjectiles();
  engine.bullets.forEach((bullet: Bullet) => {
    if ((bullet as any).chapter2BossSupportBullet) bullet.active = false;
  });
  if (core.isPlayerAttackAllowed() && !core.isBossShielded()) core.applyDamage(50);
  sfx.bossHit();
}

export function startChapter2BossSystem(
  engine: any,
  options: { skipIntro?: boolean; patternId?: number } = {},
): void {
  const runtime = runtimeOf(engine);
  runtime.active = true;
  runtime.enabled = true;
  runtime.bombHit = false;
  runtime.completeNotified = false;
  runtime.supportSpawnTimer = 6.5;
  runtime.supportWaveSerial = 0;
  runtime.core = createBossCore(engine, runtime);

  engine.chapter2Wave.enabled = false;
  engine.chapter1Wave.enabled = false;
  clearCombatObjects(engine);
  engine.clearingForBoss = false;
  engine.bossActive = true;
  engine.bossPhase2Active = false;
  engine.bossPhase3Active = false;
  engine.stage = 2;
  engine.state = "PLAYING";
  runtime.core.start(options);
  sfx.startBossBgm();
  syncBossEntity(engine, runtime);
  clampPlayerToBossViewport(engine, runtime);
}

export function updateChapter2BossSystem(engine: any, dt: number): void {
  const runtime = runtimeOf(engine);
  if (!runtime.active || !runtime.core) return;
  clampPlayerToBossViewport(engine, runtime);
  if (engine.player?.isDead) {
    syncBossEntity(engine, runtime);
    return;
  }
  const previousHud = runtime.core.getHudState() as Chapter2BossHudState;
  runtime.core.update(dt);
  if (!runtime.active) return;
  const nextHud = runtime.core.getHudState() as Chapter2BossHudState;
  if ((!previousHud.cinematic && !!nextHud.cinematic) || (!previousHud.clearStage && !!nextHud.clearStage)) {
    clearChapter2BossSupportObjects(engine);
  }
  clampPlayerToBossViewport(engine, runtime);
  updateChapter2BossSupportSystem(engine, runtime, dt);
  hitBossAndPatternObjectsWithPlayerBullets(engine, runtime);
  updateBombDamage(engine, runtime);
  syncBossEntity(engine, runtime);
}

export function handleChapter2BossPointerSystem(engine: any, canvasX: number, canvasY: number): boolean {
  const runtime = runtimeOf(engine);
  if (!runtime.active || !runtime.core) return false;
  const projection = getChapter2BossViewportProjection(engine.canvas);
  const x = (canvasX - projection.offsetX) / projection.scale;
  const y = (canvasY - projection.offsetY) / projection.scale;
  if (x < 0 || x > 922 || y < 0 || y > 960) return false;
  return runtime.core.pointerDown(x, y);
}

export function skipCurrentChapter2BossSystem(engine: any): boolean {
  const runtime = runtimeOf(engine);
  clearChapter2BossSupportObjects(engine);
  runtime.supportSpawnTimer = 4.5;
  return !!runtime.core?.skipCurrent();
}

export function jumpChapter2BossPatternSystem(engine: any, patternId: number): boolean {
  const runtime = runtimeOf(engine);
  clearChapter2BossSupportObjects(engine);
  runtime.supportSpawnTimer = 5.0;
  return !!runtime.core?.jumpToPattern(patternId);
}

export function playChapter2BossSceneSystem(engine: any, scene: Chapter2BossSceneId): boolean {
  const runtime = runtimeOf(engine);
  const core = runtime.core;
  if (!core) return false;
  clearChapter2BossSupportObjects(engine);
  runtime.supportSpawnTimer = 5.5;
  if (scene === "phase1Intro") core.playPhase1Intro();
  else if (scene === "phaseTransition") core.playPhaseTransition();
  else if (scene === "phase2Intro") core.playPhase2Intro();
  else core.playClearSequence();
  return true;
}

export function getChapter2BossHudStateSystem(engine: any): Chapter2BossHudState | null {
  const runtime = runtimeOf(engine);
  if (!runtime.active || !runtime.core) return null;
  return runtime.core.getHudState() as Chapter2BossHudState;
}
