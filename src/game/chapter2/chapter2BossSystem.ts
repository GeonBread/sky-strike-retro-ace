import { Enemy, type Bullet } from "../entities";
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
  // 프록시는 HUD/유도탄 타깃용입니다. 일반 enemy 배열에는 넣지 않아
  // 기존 보스 렌더러/충돌 시스템이 v68 보스를 중복 처리하지 않게 합니다.
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

function hitBossAndPatternObjectsWithPlayerBullets(engine: any, runtime: Chapter2BossRuntime): void {
  const core = runtime.core;
  if (!core) return;
  const projection = getChapter2BossViewportProjection(engine.canvas);
  const hud = core.getHudState() as Chapter2BossHudState;
  const bossHit = core.getBossHitArea();

  // 호반우의 기존 무기 입력/탄환 이동은 항상 그대로 유지합니다.
  // 다만 보스 등장·페이즈 전환·최종 사망처럼 화면 전체 연출이 진행 중일 때만
  // 남아 있는 플레이어 탄을 정리해 컷신을 가리지 않게 합니다.
  const attackAllowed = core.isPlayerAttackAllowed();
  const cinematicLocked = !!hud.cinematic || !!hud.clearStage || hud.victoryComplete;
  if (cinematicLocked) {
    for (const bullet of engine.bullets as Bullet[]) {
      if (bullet.active && !bullet.isEnemy) bullet.active = false;
    }
    engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active);
    return;
  }

  for (const bullet of engine.bullets as Bullet[]) {
    if (!bullet.active || bullet.isEnemy) continue;

    // 예체능 빔은 기존 게임 UI/무기 표현을 유지하면서 보스 중앙을 실제 타격점으로 사용합니다.
    if (bullet.playerBulletKind === "musicBeam") {
      if (!attackAllowed) continue;
      const now = core.state.t;
      const nextHit = (bullet as any).__chapter2BossBeamNextHit ?? 0;
      if (now < nextHit) continue;
      (bullet as any).__chapter2BossBeamNextHit = now + 0.12;
      core.handlePlayerShot({ x: bossHit.x, y: bossHit.y, r: 7, damage: Math.max(0, bullet.damage || 1) });
      continue;
    }

    if (!attackAllowed) continue;

    const x = (bullet.x + bullet.width / 2 - projection.offsetX) / projection.scale;
    const y = (bullet.y + bullet.height / 2 - projection.offsetY) / projection.scale;
    const radius = Math.max(3, Math.max(bullet.width, bullet.height) * 0.24 / projection.scale);
    const hit = core.handlePlayerShot({ x, y, r: radius, damage: Math.max(0, bullet.damage || 1) });
    if (!hit) continue;
    bullet.active = false;
    engine.spawnExplosion?.(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, hud.phase === 2 ? "#ff93a1" : "#8fd9e5", 4);
    sfx.bossHit();
  }
  engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active);
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
  if (core.isPlayerAttackAllowed()) core.applyDamage(85);
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
  runtime.core.update(dt);
  if (!runtime.active) return;
  clampPlayerToBossViewport(engine, runtime);
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
  if (x < 0 || x > 800 || y < 0 || y > 960) return false;
  return runtime.core.pointerDown(x, y);
}

export function skipCurrentChapter2BossSystem(engine: any): boolean {
  return !!runtimeOf(engine).core?.skipCurrent();
}

export function jumpChapter2BossPatternSystem(engine: any, patternId: number): boolean {
  return !!runtimeOf(engine).core?.jumpToPattern(patternId);
}

export function playChapter2BossSceneSystem(engine: any, scene: Chapter2BossSceneId): boolean {
  const core = runtimeOf(engine).core;
  if (!core) return false;
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
