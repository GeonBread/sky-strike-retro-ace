/**
 * 게임 엔진 오케스트레이터
 *
 * 이 파일은 캔버스 기반 세로 슈팅 게임의 GameEngine 클래스와 게임 루프를 담당한다.
 * 보스 페이즈 선택, 보스 특수 패턴, 보스 해저드 갱신/렌더링 구현은 boss 폴더의 기능 파일로 분리되어 있다.
 * 외부 UI와 연결되는 public API, 상태 보관, update/render 호출 순서를 바꿀 때 이 파일을 수정한다.
 */
import { type GameMode, ShipColor, type ShipStyle } from "../types";
import { sfx } from "./AudioSystem";
import {
  applyStageClearReward as applyStageClearRewardSystem,
  getStageClearChoices as getStageClearChoicesSystem,
} from "./systems/rewardSystem";
import { Box, intersects as boxesIntersect } from "./utils/geometry";
import {
  renderBackgroundSystem,
  renderChapter1ParallaxBackgroundSystem,
} from "./render/backgroundRenderer";
import { renderBossBodySystem } from "./render/bossBodyRenderer";
import {
  getBulletVisualTypeSystem,
  renderCometNeedleSystem,
  renderCometSpearSystem,
  renderCoreOrbSystem,
  renderCosmicPlasmaCoreSystem,
  renderCrackedCoreSystem,
  renderDroneMissileSystem,
  renderEnemyBulletVisualSystem,
  renderPhaseCoreSystem,
  renderPlasmaBoltSystem,
  renderRiftShardSystem,
  renderSporeGlobSystem,
  renderStarBeaconSystem,
  renderTeslaSparkSystem,
  renderTeslaSpineMissileSystem,
} from "./render/enemyBulletVisualRenderer";
import { isHobanuPlayerVisualReady, renderGameSceneSystem } from "./render/gameSceneRenderer";
import {
  assignBossPhase as assignBossPhaseSystem,
  assignNextBossPhase as assignNextBossPhaseSystem,
  getBossMaxHp as getBossMaxHpSystem,
  getBossMaxHpForTier,
  getBossPhaseDuration as getBossPhaseDurationSystem,
  getStoryBossDelay as getStoryBossDelaySystem,
  pickChapter4BossPhase as pickChapter4BossPhaseSystem,
  pickNextFinalBossPhase as pickNextFinalBossPhaseSystem,
  pickNormalBossPhase as pickNormalBossPhaseSystem,
  pickOverdriveBossPhase as pickOverdriveBossPhaseSystem,
  pickStoryBossPhase as pickStoryBossPhaseSystem,
  playBossLaserSoundOncePerCycle as playBossLaserSoundOncePerCycleSystem,
  resetBossPattern as resetBossPatternSystem,
} from "./boss/bossPhaseSelectionSystem";
import {
  beginBossClearSequence as beginBossClearSequenceSystem,
  checkPlayerAgainstSegment as checkPlayerAgainstSegmentSystem,
  clampBossToArena as clampBossToArenaSystem,
  clearBossPatternHazards as clearBossPatternHazardsSystem,
  createBossMazeState as createBossMazeStateSystem,
  distancePointToSegment as distancePointToSegmentSystem,
  explodeSuicideDrone as explodeSuicideDroneSystem,
  finishBossClearSequence as finishBossClearSequenceSystem,
  getPlayerHistoryPoint as getPlayerHistoryPointSystem,
  hitPlayerFromBossHazard as hitPlayerFromBossHazardSystem,
  instantlyDownPlayer as instantlyDownPlayerSystem,
  runFinalAbsorptionField as runFinalAbsorptionFieldSystem,
  runFinalAfterimageSlash as runFinalAfterimageSlashSystem,
  runFinalBossDash as runFinalBossDashSystem,
  runFinalCompressionWalls as runFinalCompressionWallsSystem,
  runFinalDenseGridLaser as runFinalDenseGridLaserSystem,
  runFinalEdgeStrikerPattern as runFinalEdgeStrikerPatternSystem,
  runFinalElectricMazePattern as runFinalElectricMazePatternSystem,
  runFinalMissileElectricField as runFinalMissileElectricFieldSystem,
  runFinalSafeZoneBlast as runFinalSafeZoneBlastSystem,
  runFinalSuicideDronePattern as runFinalSuicideDronePatternSystem,
  runOverdriveRecallBullets as runOverdriveRecallBulletsSystem,
  runOverdriveSpiralLattice as runOverdriveSpiralLatticeSystem,
  runOverdriveSplitMineRain as runOverdriveSplitMineRainSystem,
  runOverdriveTailExplosions as runOverdriveTailExplosionsSystem,
  runOverdriveWarningExplosions as runOverdriveWarningExplosionsSystem,
  updateBossClearExplosion as updateBossClearExplosionSystem,
  updateBossPatternHazards as updateBossPatternHazardsSystem,
  updatePlayerPositionHistory as updatePlayerPositionHistorySystem,
  type BossAbsorbOrb,
  type BossAfterimageSlash,
  type BossCompressionField,
  type BossDashState,
  type BossEdgeStriker,
  type BossGridLaser,
  type BossMazeState,
  type BossSafeZoneBlast,
  type ElectricTrail,
  type PlayerHistoryPoint,
  type SuicideDrone,
  type TailMine,
  type TimedExplosionZone,
} from "./boss/bossPatternHazardSystem";
import {
  fireBoss360Burst as fireBoss360BurstSystem,
  fireBossRapid as fireBossRapidSystem,
  summonBossSquad as summonBossSquadSystem,
  triggerBossBulletCombos as triggerBossBulletCombosSystem,
} from "./boss/bossAttackPatternSystem";
import {
  renderBossClearOverlay as renderBossClearOverlaySystem,
  renderBossPatternHazards as renderBossPatternHazardsSystem,
} from "./boss/bossHazardRenderer";

import {
  updatePlayerMovementRespawnAndSatelliteSystem,
} from "./player/playerMovementRespawnAndSatelliteSystem";
import {
  addPlayerBulletEntitySystem,
  firePlayerWeaponBulletPatternSystem,
} from "./player/playerWeaponBulletPatternSystem";
import { updatePlayerWeaponBulletMotionSystem } from "./player/playerWeaponBulletMotionSystem";
import {
  triggerPlayerSmartBombSystem,
  updatePlayerSmartBombSystem,
} from "./player/playerSmartBombSystem";
import {
  triggerPlayerDamageAndRespawnSystem,
} from "./player/playerDamageAndRespawnSystem";
import {
  tuneStoryEnemyBulletsSystem,
} from "./enemies/enemyStoryBulletTuningSystem";
import {
  updateEnemyInkCloudSystem,
  updateEnemyMovementAndAttackSystem,
} from "./enemies/enemyMovementAndAttackSystem";
import {
  spawnEnemyWaveSystem,
  triggerSandboxEnemyWaveSystem,
} from "./enemies/enemySpawnWaveSystem";
import {
  renderEnemyShapeSystem,
} from "./enemies/enemyShapeRenderer";
import {
  fireAssaultCommanderSystem,
  getAssaultCommanderHpMultiplierSystem,
  scaleAssaultEnemySystem,
  spawnAssaultCommanderSystem,
} from "./enemies/enemyAssaultCommanderSystem";
import {
  deactivateEnemyAndAttachmentsSystem,
} from "./enemies/enemyLifecycleCleanupSystem";

import {
  updateBulletMovementAndSpecialPatternSystem,
} from "./bullets/bulletMovementAndSpecialPatternSystem";

import {
  checkCollisionDamageAndPowerUpCollectionSystem,
  clearAllEnemyBulletsAndRewardSystem,
} from "./collision/collisionDamageAndPowerUpCollectionSystem";
import {
  configureSandboxLoadoutSystem,
  resetSandboxBossCombatSystem,
  updateSandboxCombatPreviewSystem,
} from "./sandbox/sandboxCombatPreviewSystem";
import { updateStageFlowAndBossCutsceneSystem } from "./stage/stageFlowAndBossCutsceneSystem";
import {
  spawnExplosionParticleBurstSystem,
  updateParticleEffectSystem,
} from "./effects/particleAndExplosionSystem";
import { updatePowerUpMovementSystem } from "./items/powerUpMovementSystem";
import {
  spawnInitialDebrisCoverSystem,
  updateDebrisAndMeteorSystem,
} from "./obstacles/debrisMeteorUpdateSystem";
import { updateHelperDroneBehaviorSystem } from "./drones/helperDroneBehaviorSystem";
import { fireEnemySubtypeWeaponSystem, type EnemySubtypeWeaponPattern } from "./enemies/enemySubtypeWeaponSystem";
import { tuneStoryEnemyDifficultySystem } from "./enemies/storyEnemyDifficultyTuningSystem";
import { initializeGameStartStateSystem } from "./lifecycle/gameStartStateInitializer";
import { initializeStageRewardTransitionSystem } from "./lifecycle/stageRewardTransitionInitializer";
import { loadChapter1BackgroundLayersSystem } from "./render/storyChapterBackgroundAssetLoader";
import type { HelperDroneState } from "./drones/helperDroneTypes";
import type { DebrisCoverState } from "./obstacles/debrisCoverTypes";
import type { MeteorObstacleState } from "./obstacles/meteorObstacleTypes";
import type { GameEngineRuntimeContext } from "./runtime/gameEngineRuntimeContext";
import { createChapter1WaveRuntime, type Chapter1WaveRuntime } from "./chapter1/chapter1WaveTypes";
import { getChapter1WaveProgressSystem, skipCurrentChapter1WaveSystem } from "./chapter1/chapter1WaveSystem";
import {
  createChapter2WaveRuntime,
  getChapter2WaveProgressSystem,
  skipCurrentChapter2WaveSystem,
  startChapter2WaveSystem,
  type Chapter2WaveRuntime,
} from "./chapter2/chapter2WaveSystem";
import { createChapter1BossRuntime, type Chapter1BossRuntime } from "./chapter1/chapter1BossTypes";
import {
  handleChapter1BossDigitSystem,
  handleChapter1BossPointerSystem,
  skipCurrentChapter1BossPhaseSystem,
  startChapter1BossSystem,
  updateChapter1BossSystem,
} from "./chapter1/chapter1BossSystem";

import {
  Bullet,
  type BulletVisualType,
  Enemy,
  type EngineState,
  type GameInput,
  InkCloud,
  Particle,
  Player,
  PowerUp,
} from "./entities";
export type { EnemyType, EngineState, GameInput } from "./entities";

const MAX_CHAPTER = 4;

export class GameEngine implements GameEngineRuntimeContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: GameInput = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    useBomb: false,
  };
  needInitialPosition: boolean = true;
  lastCanvasWidth: number = 0;
  lastCanvasHeight: number = 0;
  paused: boolean = false;
  // false일 때는 배경과 캐릭터를 계속 렌더링하되 적 생성·이동·공격만 정지한다.
  simulationEnabled: boolean = true;
  playMode: GameMode = "arcade";
  storyStageTimer: number = 0;
  storyPurificationExitActive: boolean = false;
  storyPurificationExitElapsed: number = 0;
  storyPurificationExitStartY: number = 0;
  storyPlayerHidden: boolean = false;
  private storyAdjustedBullets: WeakSet<Bullet> = new WeakSet();
  private storyAdjustedEnemies: WeakSet<Enemy> = new WeakSet();
  private storyBulletSerial: number = 0;
  private chapter1BackgroundLayers: HTMLImageElement[] = [];
  private chapter1BackgroundReady: boolean = false;

  // Sandbox / Developer mode properties
  isSandbox: boolean = false;
  sandboxEnemyType: string = "stationary";
  sandboxInvincibility: boolean = true;
  sandboxMovementEnabled: boolean = false;
  sandboxMode: "single" | "wave" | "bossCombat" = "single";
  sandboxActiveWave: number = 0;
  sandboxBossPhaseLock: number = -1; // -1 = rotates as usual, 1-16 = locks specific phase
  sandboxBossOverdrive: boolean = false; // toggle overdrive phase 2 state
  sandboxBossPhase3: boolean = false; // toggle overlord phase 3 state
  sandboxBossCombatMode: boolean = false;
  sandboxBossChapter: number = 1;
  sandboxPlayerPowerLevel: number = 5;
  sandboxPlayerBombs: number = 3;
  sandboxPlayerSatelliteCount: number = 3;

  player: Player = new Player();
  bullets: Bullet[] = [];
  enemies: Enemy[] = [];
  particles: Particle[] = [];
  powerups: PowerUp[] = [];
  inkClouds: InkCloud[] = [];
  chapter1Wave: Chapter1WaveRuntime = createChapter1WaveRuntime();
  chapter2Wave: Chapter2WaveRuntime = createChapter2WaveRuntime();
  chapter1Boss: Chapter1BossRuntime = createChapter1BossRuntime();

  state: EngineState = "PLAYING";
  score: number = 0;
  stage: number = 1;
  nextBossScore: number = 15000;
  assaultCommanderStage: number = 0;
  spawnTimer: number = 0;
  sideSpawnTimer: number = 8.0;
  waveTimer: number = 10.0;

  bossActive: boolean = false;
  bossEntity: Enemy | null = null;
  bossPhase2Triggered: boolean = false;
  bossPhase2Active: boolean = false;
  bossPhase3Triggered: boolean = false;
  bossPhase3Active: boolean = false;
  screenShakeIntensity: number = 0;
  playerDamageFlashTimer: number = 0;
  cutsceneTimer: number = 0;
  clearingForBoss: boolean = false;
  squadTimer: number = 5.0;
  playerSatelliteAngle: number = 0;
  playerSatelliteShotTimer: number = 0;
  playerSatelliteFlashes: number[] = [];
  bossElectricTrails: ElectricTrail[] = [];
  bossGridLasers: BossGridLaser[] = [];
  bossSuicideDrones: SuicideDrone[] = [];
  bossTimedExplosions: TimedExplosionZone[] = [];
  bossTailMines: TailMine[] = [];
  bossDashState: BossDashState | null = null;
  bossSafeZoneBlasts: BossSafeZoneBlast[] = [];
  bossAbsorbOrbs: BossAbsorbOrb[] = [];
  bossAfterimageSlashes: BossAfterimageSlash[] = [];
  bossCompressionField: BossCompressionField | null = null;
  bossEdgeStrikers: BossEdgeStriker[] = [];
  bossMazeState: BossMazeState | null = null;
  playerPositionHistory: PlayerHistoryPoint[] = [];
  bossClearTimer: number = 0;
  bossClearX: number = 0;
  bossClearY: number = 0;
  bossClearLabel: string = "";
  bossClearBoss: Enemy | null = null;

  bombActive: boolean = false;
  bombRadius: number = 0;
  bombMaxRadius: number = 800;
  bombOriginX: number = 0;
  bombOriginY: number = 0;
  bossBombHitSet: Set<Enemy> = new Set();

  lastTime: number = 0;
  reqId: number = 0;

  onGameOver?: (score: number) => void;
  onScoreUpdate?: (score: number) => void;
  onCutsceneChange?: (active: boolean) => void;
  onBombsChanged?: (bombs: number) => void;
  onStageClear?: (choices: string[], onSelect: (choice: string) => void) => void;
  onChapter1WavesComplete?: () => void;
  onChapter2WavesComplete?: () => void;
  onChapter1BossPhase2Story?: () => void;
  onChapter1BossComplete?: () => void;

  drones: HelperDroneState[] = [];
  debrisCovers: DebrisCoverState[] = [];
  meteors: MeteorObstacleState[] = [];

  meteorTimer: number = 6.0;
  sandboxRespawnTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadChapter1BackgroundLayers();
  }

  start(color: ShipColor, mode: GameMode = "arcade", style: ShipStyle = "science") {
    initializeGameStartStateSystem(this, color, mode);
    this.player.weaponStyle = style;

    this.lastTime = performance.now();
    this.reqId = requestAnimationFrame((t) => this.loop(t));
    sfx.init();
    sfx.startBgmForPhase(1);
  }

  stop() {
    cancelAnimationFrame(this.reqId);
    sfx.stopBgm();
  }

  loop(timestamp: number) {
    if (this.paused) {
      this.lastTime = timestamp; // Keep lastTime current to prevent dt spike on resume
      this.reqId = requestAnimationFrame((t) => this.loop(t));
      return;
    }
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (this.simulationEnabled) this.update(dt);
    this.render();

    this.reqId = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt: number) {
    updateStageFlowAndBossCutsceneSystem(this, dt);
  }

  get scoreEnabled(): boolean {
    return this.playMode !== "story";
  }

  private isStoryMode(): boolean {
    return this.playMode === "story";
  }

  private awardScore(points: number) {
    if (!this.scoreEnabled) return;
    this.score += points;
    if (this.onScoreUpdate) this.onScoreUpdate(this.score);
  }

  private getBossMaxHp(tier: number): number {
    return getBossMaxHpSystem(this, tier);
  }

  private getStoryBossDelay(): number {
    return getStoryBossDelaySystem(this);
  }

  private pickStoryBossPhase(currentPhase = -1): number {
    return pickStoryBossPhaseSystem(currentPhase);
  }

  private assignNextBossPhase(e: Enemy) {
    assignNextBossPhaseSystem(this, e);
  }

  private tuneStoryEnemies() {
    tuneStoryEnemyDifficultySystem(this, this.isStoryMode());
  }

  private tuneStoryEnemyBullets() {
    tuneStoryEnemyBulletsSystem(this);
  }

  private loadChapter1BackgroundLayers() {
    loadChapter1BackgroundLayersSystem(this);
  }

  /**
   * 스토리 전투 가이드가 열리기 전에 배경 레이어와 호반우 스프라이트가 모두 준비됐는지 반환한다.
   */
  public areChapter1StoryVisualsReady(): boolean {
    return this.chapter1BackgroundReady && isHobanuPlayerVisualReady();
  }

  /**
   * 챕터 1 보스의 최초 등장 시네마틱이 진행 중인지 반환한다.
   * React 전투 프레임을 전체 화면으로 확장할 때 사용한다.
   */
  public isChapter1BossIntroActive(): boolean {
    return !!this.chapter1Boss?.active
      && this.chapter1Boss.core?.state?.cinematicMode === "intro";
  }

  private updatePlayerPositionHistory(dt: number) {
    updatePlayerPositionHistorySystem(this, dt);
  }

  private getPlayerHistoryPoint(targetAge: number): PlayerHistoryPoint {
    return getPlayerHistoryPointSystem(this, targetAge);
  }

  private instantlyDownPlayer() {
    instantlyDownPlayerSystem(this);
  }

  private createBossMazeState(): BossMazeState {
    return createBossMazeStateSystem(this);
  }

  private clearBossPatternHazards() {
    clearBossPatternHazardsSystem(this);
  }

  private clampBossToArena(e: Enemy) {
    clampBossToArenaSystem(this, e);
  }

  private beginBossClearSequence(e: Enemy) {
    beginBossClearSequenceSystem(this, e);
  }

  private updateBossClearExplosion(dt: number) {
    updateBossClearExplosionSystem(this, dt);
  }

  private finishBossClearSequence() {
    finishBossClearSequenceSystem(this);
  }

  private updateBossPatternHazards(dt: number) {
    updateBossPatternHazardsSystem(this, dt);
  }

  private hitPlayerFromBossHazard() {
    hitPlayerFromBossHazardSystem(this);
  }

  private checkPlayerAgainstSegment(x1: number, y1: number, x2: number, y2: number, width: number) {
    checkPlayerAgainstSegmentSystem(this, x1, y1, x2, y2, width);
  }

  private distancePointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    return distancePointToSegmentSystem(this, px, py, x1, y1, x2, y2);
  }

  private explodeSuicideDrone(drone: SuicideDrone) {
    explodeSuicideDroneSystem(this, drone);
  }

  private runFinalMissileElectricField(e: Enemy, dt: number) {
    runFinalMissileElectricFieldSystem(this, e, dt);
  }

  private runFinalSuicideDronePattern(e: Enemy, dt: number) {
    runFinalSuicideDronePatternSystem(this, e, dt);
  }

  private runFinalDenseGridLaser(e: Enemy, dt: number) {
    runFinalDenseGridLaserSystem(this, e, dt);
  }

  private runFinalBossDash(e: Enemy, dt: number) {
    runFinalBossDashSystem(this, e, dt);
  }

  private runFinalSafeZoneBlast(e: Enemy, dt: number) {
    runFinalSafeZoneBlastSystem(this, e, dt);
  }

  private runFinalAbsorptionField(e: Enemy, dt: number) {
    runFinalAbsorptionFieldSystem(this, e, dt);
  }

  private runFinalAfterimageSlash(e: Enemy, dt: number) {
    runFinalAfterimageSlashSystem(this, e, dt);
  }

  private runFinalCompressionWalls(e: Enemy, dt: number) {
    runFinalCompressionWallsSystem(this, e, dt);
  }

  private runFinalEdgeStrikerPattern(e: Enemy, dt: number) {
    runFinalEdgeStrikerPatternSystem(this, e, dt);
  }

  private runFinalElectricMazePattern(e: Enemy, dt: number) {
    runFinalElectricMazePatternSystem(this, e, dt);
  }

  private runOverdriveSpiralLattice(e: Enemy, dt: number) {
    runOverdriveSpiralLatticeSystem(this, e, dt);
  }

  private runOverdriveSplitMineRain(e: Enemy, dt: number) {
    runOverdriveSplitMineRainSystem(this, e, dt);
  }

  private runOverdriveRecallBullets(e: Enemy, dt: number) {
    runOverdriveRecallBulletsSystem(this, e, dt);
  }

  private runOverdriveWarningExplosions(e: Enemy, dt: number) {
    runOverdriveWarningExplosionsSystem(this, e, dt);
  }

  private runOverdriveTailExplosions(e: Enemy, dt: number) {
    runOverdriveTailExplosionsSystem(this, e, dt);
  }

  updateInkClouds(dt: number) {
    updateEnemyInkCloudSystem(this, dt);
  }

  updatePlayer(dt: number) {
    updatePlayerMovementRespawnAndSatelliteSystem(this, dt);
  }

  /**
   * 챕터 1 정화 완료 연출에서 현재 호반우 위치를 시작점으로 상승 이탈 상태를 시작한다.
   * 실제 이동은 플레이어 업데이트 시스템이 담당하며, 연출 중에는 조작과 사격을 차단한다.
   */
  public beginChapter1PurificationExit() {
    this.storyPurificationExitActive = true;
    this.storyPurificationExitElapsed = 0;
    this.storyPurificationExitStartY = this.player.y;
    this.storyPlayerHidden = false;
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 6);
    this.input = { up: false, down: false, left: false, right: false, fire: false, useBomb: false };
    this.bullets.forEach((bullet) => {
      if (!bullet.isEnemy) bullet.active = false;
    });
    this.bullets = this.bullets.filter((bullet) => bullet.active);
  }

  triggerSmartBomb() {
    triggerPlayerSmartBombSystem(this);
  }

  updateBomb(dt: number) {
    updatePlayerSmartBombSystem(this, dt);
  }

  firePlayerBullet() {
    firePlayerWeaponBulletPatternSystem(this);
  }

  addPlayerBlt(
    x: number,
    y: number,
    w: number,
    h: number,
    vx: number,
    vy: number,
    c: string,
    dmg: number = 1.0,
    meta: Partial<Bullet> = {},
  ) {
    addPlayerBulletEntitySystem(this, x, y, w, h, vx, vy, c, dmg, meta);
  }

  updateBullets(dt: number) {
    updatePlayerWeaponBulletMotionSystem(this, dt);
    this.tuneStoryEnemyBullets();
    updateBulletMovementAndSpecialPatternSystem(this, dt, {
      isStoryMode: this.isStoryMode(),
      hitPlayerFromBossHazard: () => this.hitPlayerFromBossHazard(),
    });
    this.tuneStoryEnemyBullets();
  }
  updateEnemies(dt: number) {
    updateEnemyMovementAndAttackSystem(this, dt);
  }

  public configureSandboxLoadout(powerLevel: number, bombs: number, satelliteCount: number) {
    configureSandboxLoadoutSystem(this, powerLevel, bombs, satelliteCount);
  }

  public resetSandboxBossCombat(chapter: number) {
    resetSandboxBossCombatSystem(this, chapter);
  }

  runSandboxMechanics(dt: number) {
    updateSandboxCombatPreviewSystem(this, dt);
  }

  private fireSubtypeWeapon(
    e: Enemy,
    pattern: EnemySubtypeWeaponPattern,
  ) {
    fireEnemySubtypeWeaponSystem(this, e, pattern);
  }

  private resetBossPattern(e: Enemy) {
    resetBossPatternSystem(e);
  }

  private playBossLaserSoundOncePerCycle(e: Enemy, timer: number, cycleLength: number, fireStart: number) {
    playBossLaserSoundOncePerCycleSystem(e, timer, cycleLength, fireStart);
  }

  private pickOverdriveBossPhase(currentPhase = -1): number {
    return pickOverdriveBossPhaseSystem(currentPhase);
  }

  private pickNormalBossPhase(currentPhase = -1): number {
    return pickNormalBossPhaseSystem(currentPhase);
  }

  private pickNextFinalBossPhase(currentPhase: number): number {
    return pickNextFinalBossPhaseSystem(currentPhase);
  }

  private pickChapter4BossPhase(currentPhase: number): number {
    return pickChapter4BossPhaseSystem(currentPhase);
  }

  private getBossPhaseDuration(phase: number): number {
    return getBossPhaseDurationSystem(phase);
  }

  private assignBossPhase(e: Enemy, phase: number, fixedDuration = false) {
    assignBossPhaseSystem(this, e, phase, fixedDuration);
  }

  private fireBoss360Burst(e: Enemy) {
    fireBoss360BurstSystem(this, e);
  }

  private fireBossRapid(e: Enemy) {
    fireBossRapidSystem(this, e);
  }

  private triggerBossBulletCombos(b: Enemy) {
    triggerBossBulletCombosSystem(this, b);
  }

  // 4 Squad Patterns
  private summonBossSquad() {
    summonBossSquadSystem(this);
  }

  updateParticles(dt: number) {
    updateParticleEffectSystem(this, dt);
  }

  updatePowerUps(dt: number) {
    updatePowerUpMovementSystem(this, dt);
  }

  clearAllEnemyBullets() {
    clearAllEnemyBulletsAndRewardSystem(this);
  }

  checkCollisions() {
    checkCollisionDamageAndPowerUpCollectionSystem(this);
  }

  private triggerPlayerHit() {
    triggerPlayerDamageAndRespawnSystem(this);
  }

  intersects(r1: Box, r2: Box) {
    return boxesIntersect(r1, r2);
  }

  spawnExplosion(x: number, y: number, color: string, count: number) {
    spawnExplosionParticleBurstSystem(this, x, y, color, count);
  }

  spawnEntities(dt: number) {
    spawnEnemyWaveSystem(this, dt);
  }


  /** 테스트 UI에서 현재 챕터 1 웨이브를 즉시 넘긴다. */
  public skipCurrentChapter1Wave(): boolean {
    return skipCurrentChapter1WaveSystem(this);
  }

  /** 현재 챕터 1 웨이브 번호를 저장/복원용으로 반환한다. */
  public getCurrentChapter1WaveIndex(): number {
    return Math.max(0, getChapter1WaveProgressSystem(this).waveIndex);
  }

  /** 챕터 1 플레이어/HUD를 유지한 채 챕터 2 웨이브 런타임만 시작한다. */
  public startChapter2Waves(startIndex = 0): void {
    startChapter2WaveSystem(this, startIndex);
  }

  /** 테스트 UI에서 현재 챕터 2 웨이브를 즉시 넘긴다. */
  public skipCurrentChapter2Wave(): boolean {
    return skipCurrentChapter2WaveSystem(this);
  }

  /** 현재 챕터 2 웨이브 번호를 저장/복원용으로 반환한다. */
  public getCurrentChapter2WaveIndex(): number {
    return Math.max(0, getChapter2WaveProgressSystem(this).waveIndex);
  }

  public startChapter1Boss(patternLock = -1, skipIntro = false) {
    startChapter1BossSystem(this, { sandboxPatternLock: patternLock, skipIntro });
  }

  public updateChapter1Boss(dt: number) {
    updateChapter1BossSystem(this, dt);
  }

  public handleChapter1BossDigit(digit: number): boolean {
    return handleChapter1BossDigitSystem(this, digit);
  }

  public handleChapter1BossPointer(canvasX: number, canvasY: number): boolean {
    return handleChapter1BossPointerSystem(this, canvasX, canvasY);
  }

  public skipCurrentChapter1BossPhase(): boolean {
    return skipCurrentChapter1BossPhaseSystem(this);
  }

  public triggerSandboxWave(waveType: number) {
    triggerSandboxEnemyWaveSystem(this, waveType);
  }

  // 10 distinct enemy visual rendering patterns
  private renderEnemyShape(e: Enemy) {
    renderEnemyShapeSystem(this, e);
  }

  private getCombatTier(): number {
    if (this.stage >= 4) return 4;
    if (this.bossPhase3Active || this.stage >= 3) return 3;
    if (this.bossPhase2Active || this.stage >= 2) return 2;
    return 1;
  }

  private getAssaultHpMultiplier(tier: number): number {
    return getAssaultCommanderHpMultiplierSystem(tier);
  }

  private scaleAssaultEnemy(e: Enemy, tier: number, elite = false) {
    scaleAssaultEnemySystem(this, e, tier, elite);
  }

  private spawnAssaultCommander(tier: number) {
    spawnAssaultCommanderSystem(this, tier);
  }

  private fireAssaultCommander(e: Enemy, tier: number) {
    fireAssaultCommanderSystem(this, e, tier);
  }

  private renderChapter1ParallaxBackground(isBoss: boolean): boolean {
    return renderChapter1ParallaxBackgroundSystem(this, isBoss);
  }

  private renderBackground() {
    renderBackgroundSystem(this);
  }

  private renderBossJet(e: Enemy, tier: number) {
    renderBossBodySystem(this, e, tier);
  }

  private getBulletVisualType(b: Bullet): BulletVisualType {
    return getBulletVisualTypeSystem(b);
  }

  private renderEnemyBulletVisual(b: Bullet, visualType: BulletVisualType, cx: number, cy: number) {
    renderEnemyBulletVisualSystem(this, b, visualType, cx, cy);
  }

  private renderPlasmaBolt(b: Bullet, cx: number, cy: number) {
    renderPlasmaBoltSystem(this, b, cx, cy);
  }

  private renderCometNeedle(b: Bullet, cx: number, cy: number) {
    renderCometNeedleSystem(this, b, cx, cy);
  }

  private renderCoreOrb(b: Bullet, cx: number, cy: number) {
    renderCoreOrbSystem(this, b, cx, cy);
  }

  private renderCrackedCore(b: Bullet, cx: number, cy: number) {
    renderCrackedCoreSystem(this, b, cx, cy);
  }

  private renderDroneMissile(b: Bullet, cx: number, cy: number) {
    renderDroneMissileSystem(this, b, cx, cy);
  }

  private renderTeslaSpark(b: Bullet, cx: number, cy: number) {
    renderTeslaSparkSystem(this, b, cx, cy);
  }

  private renderSporeGlob(b: Bullet, cx: number, cy: number) {
    renderSporeGlobSystem(this, b, cx, cy);
  }

  private renderCosmicPlasmaCore(b: Bullet, cx: number, cy: number) {
    renderCosmicPlasmaCoreSystem(this, b, cx, cy);
  }

  private renderCometSpear(b: Bullet, cx: number, cy: number) {
    renderCometSpearSystem(this, b, cx, cy);
  }

  private renderTeslaSpineMissile(b: Bullet, cx: number, cy: number) {
    renderTeslaSpineMissileSystem(this, b, cx, cy);
  }

  private renderRiftShard(b: Bullet, cx: number, cy: number) {
    renderRiftShardSystem(this, b, cx, cy);
  }

  private renderPhaseCore(b: Bullet, cx: number, cy: number) {
    renderPhaseCoreSystem(this, b, cx, cy);
  }

  private renderStarBeacon(b: Bullet, cx: number, cy: number) {
    renderStarBeaconSystem(this, b, cx, cy);
  }

  private renderBossPatternHazards() {
    renderBossPatternHazardsSystem(this);
  }

  render() {
    renderGameSceneSystem(this);
  }

  private renderBossClearOverlay() {
    renderBossClearOverlaySystem(this);
  }

  // ==========================================
  //     CUSTOM PREMIUM MECHANICS HELPERS
  // ==========================================

  deactivateEnemy(e: Enemy) {
    deactivateEnemyAndAttachmentsSystem(this, e);
  }

  spawnInitialDebris() {
    spawnInitialDebrisCoverSystem(this);
  }

  updateDebrisAndMeteors(dt: number) {
    updateDebrisAndMeteorSystem(this, dt);
  }

  updateDronesAndBehaviors(dt: number) {
    updateHelperDroneBehaviorSystem(this, dt);
  }

  getStageClearChoices(): string[] {
    return getStageClearChoicesSystem();
  }

  applyStageClearReward(choice: string) {
    applyStageClearRewardSystem(this, choice);
  }

  startNextStageAfterReward() {
    initializeStageRewardTransitionSystem(this, { maxChapter: MAX_CHAPTER });
  }
}
