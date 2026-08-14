import { Enemy, type Bullet } from "../entities";
import { sfx } from "../AudioSystem";
import { createChapter1BossOriginalRuntime } from "./chapter1BossOriginalRuntime";
import { spawnChapter1BossSupportGroupSystem } from "./chapter1WaveSystem";
import { getChapter1BossViewportProjection } from "./chapter1BossViewportProjection";
import {
  CHAPTER1_BOSS_PHASE1_PATTERN_IDS,
  CHAPTER1_BOSS_PHASE2_PATTERN_IDS,
  createChapter1BossRuntime,
  type Chapter1BossPatternId,
  type Chapter1BossRuntime,
} from "./chapter1BossTypes";

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


function playerCanonical(engine: any) {
  const projection = getChapter1BossViewportProjection(engine.canvas);
  return {
    x: (engine.player.x + engine.player.width / 2 - projection.offsetX) / projection.scale,
    y: (engine.player.y + engine.player.height / 2 - projection.offsetY) / projection.scale,
    // 원본 보스 탄막은 플레이어 이미지가 아니라 실제 코어 주변의 작은 판정점에만 맞는다.
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

function clearBossSupportObjects(engine: any): void {
  engine.enemies.forEach((enemy: Enemy) => {
    if ((enemy as any).chapter1BossSupport) enemy.active = false;
  });
  engine.enemies = engine.enemies.filter((enemy: Enemy) => !(enemy as any).chapter1BossSupport);
  engine.bullets.forEach((bullet: Bullet) => {
    if (bullet.isEnemy && bullet.chapter1) bullet.active = false;
  });
  engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active);
}

function completeBoss(engine: any, runtime: Chapter1BossRuntime): void {
  if (!runtime.active) return;
  runtime.active = false;
  engine.bossActive = false;
  engine.bossEntity = null;
  clearBossSupportObjects(engine);
  engine.enemies = engine.enemies.filter((enemy: Enemy) => !(enemy as any).chapter1ExactBossProxy);
  engine.bullets.forEach((bullet: Bullet) => {
    if (bullet.isEnemy) bullet.active = false;
  });
  engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active);
  engine.bossPhase2Active = false;
  engine.onCutsceneChange?.(false);
  if (typeof engine.awardScore === "function") engine.awardScore(10000);
  if (engine.isSandbox) {
    engine.state = "PLAYING";
    return;
  }
  if (engine.playMode === "story") {
    // 스토리 모드는 챕터 2로 넘기지 않고 챕터 1 보스 이후 대사로 복귀한다.
    engine.stage = 1;
    engine.state = "PLAYING";
    engine.onChapter1BossComplete?.();
    return;
  }
  engine.startNextStageAfterReward();
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
    fatalHit: () => {
      if (engine.player.isDead) return;
      // 4자리 인증 실패 광역기는 게임오버 강제가 아니라 일반 피격 1회로 처리한다.
      // 광역기이므로 기존 무적 상태와 관계없이 이번 타격 1회는 확실히 적용한다.
      engine.player.invulnTimer = 0;
      engine.triggerPlayerHit();
    },
    clearSupportEnemies: () => clearBossSupportObjects(engine),
    onComplete: () => completeBoss(engine, runtime),
  });
}

function syncBossEntity(engine: any, runtime: Chapter1BossRuntime): void {
  const core = runtime.core;
  if (!core) return;
  const state = core.state;
  const projection = getChapter1BossViewportProjection(engine.canvas);
  const proxy = engine.bossEntity instanceof Enemy ? engine.bossEntity : new Enemy();
  proxy.type = "boss";
  proxy.active = true;
  proxy.width = state.boss.drawW * projection.scale;
  proxy.height = state.boss.drawH * projection.scale;
  proxy.x = projection.offsetX + state.boss.x * projection.scale - proxy.width / 2;
  proxy.y = projection.offsetY + state.boss.y * projection.scale - proxy.height / 2;
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
  const projection = getChapter1BossViewportProjection(engine.canvas);
  const bounds = core.getMovementBounds();
  const canonicalX = (engine.player.x + engine.player.width / 2 - projection.offsetX) / projection.scale;
  const canonicalY = (engine.player.y + engine.player.height / 2 - projection.offsetY) / projection.scale;
  const centerX = Math.max(bounds.minX, Math.min(bounds.maxX, canonicalX));
  const centerY = Math.max(bounds.minY, Math.min(bounds.maxY, canonicalY));
  engine.player.x = projection.offsetX + centerX * projection.scale - engine.player.width / 2;
  engine.player.y = projection.offsetY + centerY * projection.scale - engine.player.height / 2;
}

function hitBossWithPlayerBullets(engine: any, runtime: Chapter1BossRuntime): void {
  const core = runtime.core;
  if (!core || !core.isPlayerAttackAllowed()) return;
  const hitArea = core.getBossHitArea();
  const projection = getChapter1BossViewportProjection(engine.canvas);
  for (const bullet of engine.bullets as Bullet[]) {
    if (!bullet.active || bullet.isEnemy) continue;
    const cx = (bullet.x + bullet.width / 2 - projection.offsetX) / projection.scale;
    const cy = (bullet.y + bullet.height / 2 - projection.offsetY) / projection.scale;
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
  const projection = getChapter1BossViewportProjection(engine.canvas);
  const bombX = ((engine.bombOriginX ?? (engine.player.x + engine.player.width / 2)) - projection.offsetX) / projection.scale;
  const bombY = ((engine.bombOriginY ?? (engine.player.y + engine.player.height / 2)) - projection.offsetY) / projection.scale;
  const radius = engine.bombRadius / projection.scale;
  if (!runtime.bombHit && Math.hypot(core.state.boss.x - bombX, core.state.boss.y - bombY) < radius + 160) {
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
  runtime.storyPhase2Notified = false;
  runtime.supportSpawnTimer = 7.5;
  runtime.supportWaveSerial = 0;
  runtime.sandboxPatternLock = options.sandboxPatternLock ?? -1;
  runtime.core = createBossCore(engine, runtime);
  runtime.core.start({
    skipIntro: !!options.skipIntro,
    patternId: runtime.sandboxPatternLock >= 0 ? runtime.sandboxPatternLock : undefined,
    // 스토리 모드에서도 원본 보스 시뮬레이터의 탄속·탄 수·발사 간격을 그대로 사용한다.
    // 스토리 전용 탄 제거/감속은 사용하지 않고, 대사 전환만 외부 콜백으로 처리한다.
    story: false,
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

function updateBossSupportSpawnSystem(engine: any, runtime: Chapter1BossRuntime, dt: number): void {
  const core = runtime.core;
  if (!core || engine.isSandbox || engine.player?.isDead) return;
  const state = core.state;
  const battleReady = state.cinematicMode === "battle"
    && state.battleStartState === "active"
    && (state.bossStageState === "stage1" || state.bossStageState === "stage2");
  if (!battleReady) return;

  runtime.supportSpawnTimer -= dt;
  if (runtime.supportSpawnTimer > 0) return;

  const liveSupportCount = (engine.enemies as Enemy[]).filter(
    (enemy) => enemy.active && (enemy as any).chapter1BossSupport,
  ).length;
  if (liveSupportCount <= 2) {
    const count = 4 + Math.floor(Math.random() * 5);
    spawnChapter1BossSupportGroupSystem(engine, count);
    runtime.supportWaveSerial += 1;
  }
  runtime.supportSpawnTimer = 10.5 + Math.random() * 4.5;
}

export function updateChapter1BossSystem(engine: any, dt: number): void {
  const runtime = runtimeOf(engine);
  if (!runtime.active || !runtime.core) return;
  clampPlayerToOriginalBounds(engine, runtime);
  if (engine.player?.isDead) {
    // 게임오버 대기 중에는 보스 본체와 지원 몬스터가 새 공격을 진행하지 않는다.
    syncBossEntity(engine, runtime);
    return;
  }
  const previousStageState = runtime.core.state.bossStageState;
  runtime.core.update(dt);
  updateBossSupportSpawnSystem(engine, runtime, dt);
  const nextStageState = runtime.core.state.bossStageState;
  if (
    (previousStageState === "stage1" && nextStageState === "phase1clear")
    || (previousStageState !== "defeated" && nextStageState === "defeated")
  ) {
    clearBossSupportObjects(engine);
  }
  if (
    !runtime.storyPhase2Notified &&
    previousStageState === "stage1" &&
    nextStageState === "phase1clear" &&
    typeof engine.onChapter1BossPhase2Story === "function"
  ) {
    runtime.storyPhase2Notified = true;
    engine.onChapter1BossPhase2Story();
  }
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
  const projection = getChapter1BossViewportProjection(engine.canvas);
  return runtime.core.pointerDown(
    (canvasX - projection.offsetX) / projection.scale,
    (canvasY - projection.offsetY) / projection.scale,
  );
}

export function skipCurrentChapter1BossPhaseSystem(engine: any): boolean {
  const runtime = runtimeOf(engine);
  if (!runtime.active || !runtime.core) return false;
  return !!runtime.core.skipToNextPhase?.();
}

export function getChapter1BossPatternIdsSystem(): readonly number[] {
  return [...CHAPTER1_BOSS_PHASE1_PATTERN_IDS, ...CHAPTER1_BOSS_PHASE2_PATTERN_IDS];
}
