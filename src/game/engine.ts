/**
 * 게임 엔진 오케스트레이터
 *
 * 이 파일은 캔버스 기반 세로 슈팅 게임의 GameEngine 클래스와 게임 루프를 담당한다.
 * 보스 페이즈 선택, 보스 특수 패턴, 보스 해저드 갱신/렌더링 구현은 boss 폴더의 기능 파일로 분리되어 있다.
 * 외부 UI와 연결되는 public API, 상태 보관, update/render 호출 순서를 바꿀 때 이 파일을 수정한다.
 */
import { type GameMode, ShipColor } from "../types";
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
import { renderGameSceneSystem } from "./render/gameSceneRenderer";
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

import {
  Bullet,
  type BulletVisualType,
  Enemy,
  type EnemyType,
  type EngineState,
  type GameInput,
  InkCloud,
  Particle,
  Player,
  PowerUp,
} from "./entities";
export type { EnemyType, EngineState, GameInput } from "./entities";

const PLAYER_MAX_HP = 3;
const PLAYER_MOVE_SPEED = 415;
const PLAYER_BULLET_SPEED_MULT = 1.16;
const PLAYER_FIRE_INTERVAL = 0.075;
const MAX_CHAPTER = 4;
const STORY_CHAPTER1_PARALLAX_LAYERS = [
  "/assets/backgrounds/chapter1_parallax_layer_1.png",
  "/assets/backgrounds/chapter1_parallax_layer_2.png",
  "/assets/backgrounds/chapter1_parallax_layer_3.png",
];
const STORY_CHAPTER1_PARALLAX_SPEEDS = [18, 54, 120];
const STORY_CHAPTER1_PARALLAX_ALPHAS = [1, 0.82, 0.5];

export class GameEngine {
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
  playMode: GameMode = "arcade";
  storyStageTimer: number = 0;
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
  bossBombHitSet: Set<Enemy> = new Set();

  lastTime: number = 0;
  reqId: number = 0;

  onGameOver?: (score: number) => void;
  onScoreUpdate?: (score: number) => void;
  onCutsceneChange?: (active: boolean) => void;
  onBombsChanged?: (bombs: number) => void;
  onStageClear?: (choices: string[], onSelect: (choice: string) => void) => void;

  drones: {
    type: "attack" | "homing" | "defense" | "orbit" | "laser";
    angleOffset: number;
    lastShot: number;
    laserChargeCount: number;
  }[] = [];

  debrisCovers: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    hp: number;
    maxHp: number;
    active: boolean;
  }[] = [];

  meteors: {
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
    hp: number;
    rotation: number;
    rotSpeed: number;
    active: boolean;
  }[] = [];

  meteorTimer: number = 6.0;
  sandboxRespawnTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadChapter1BackgroundLayers();
  }

  start(color: ShipColor, mode: GameMode = "arcade") {
    this.playMode = mode;
    this.player = new Player();
    this.player.width = 48;
    this.player.height = 48;
    this.player.hitWidth = 10;
    this.player.hitHeight = 10;
    this.player.x = this.canvas.width / 2 - 24;
    this.player.y = this.canvas.height - 100;
    this.player.color = color;
    this.player.hp = PLAYER_MAX_HP;
    this.player.bombs = 3;
    this.needInitialPosition = true;
    this.lastCanvasWidth = 0;
    this.lastCanvasHeight = 0;

    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.powerups = [];
    this.score = 0;
    this.stage = 1;
    this.nextBossScore = 15000;
    this.storyStageTimer = 0;
    this.storyAdjustedBullets = new WeakSet();
    this.storyAdjustedEnemies = new WeakSet();
    this.storyBulletSerial = 0;
    this.assaultCommanderStage = 0;
    this.bossActive = false;
    this.bossEntity = null;
    this.bossPhase2Triggered = false;
    this.bossPhase2Active = false;
    this.bossPhase3Triggered = false;
    this.bossPhase3Active = false;
    this.screenShakeIntensity = 0;
    this.state = "PLAYING";
    this.bombActive = false;
    this.bombRadius = 0;
    this.bossBombHitSet.clear();
    this.clearBossPatternHazards();

    this.drones = [];
    this.meteors = [];
    this.meteorTimer = 6.0;
    this.spawnInitialDebris();

    // Reset Sandbox state & timers back to normal gameplay speed if not launched as sandbox
    if (!this.isSandbox) {
      this.isSandbox = false;
      this.sandboxMode = "single";
    }
    this.waveTimer = 2.0;       // First epic wave emerges in 2 seconds!
    this.spawnTimer = 4.5;      // Settle wave before simple random spawns start pumpin'
    this.sideSpawnTimer = 8.0;

    if (this.onScoreUpdate) this.onScoreUpdate(0);
    if (this.onBombsChanged) this.onBombsChanged(this.player.bombs);

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

    this.update(dt);
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
    if (!this.isStoryMode()) return;

    this.enemies.forEach((e) => {
      if (!e.active || e.type === "boss" || this.storyAdjustedEnemies.has(e)) return;
      this.storyAdjustedEnemies.add(e);

      const lightTypes: EnemyType[] = ["basic", "sweeper", "aimed", "column_shooter", "tank"];
      if (!lightTypes.includes(e.type)) {
        e.type = Math.random() < 0.72 ? "aimed" : "column_shooter";
      }

      e.hp = Math.max(1, Math.ceil(e.hp * 0.58));
      e.vx *= 0.68;
      e.vy *= 0.68;
      e.lastShot = Math.min(e.lastShot, -0.6);
      e.shootTimer = 0;
      if (e.spawnPoint > 0) e.spawnPoint += 18;
    });
  }

  private tuneStoryEnemyBullets() {
    tuneStoryEnemyBulletsSystem(this);
  }

  private loadChapter1BackgroundLayers() {
    if (typeof Image === "undefined") return;

    this.chapter1BackgroundLayers = STORY_CHAPTER1_PARALLAX_LAYERS.map((src) => {
      const img = new Image();
      img.onload = () => {
        this.chapter1BackgroundReady = this.chapter1BackgroundLayers.every((layer) => layer.complete && layer.naturalWidth > 0);
      };
      img.src = src;
      return img;
    });
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
  ) {
    addPlayerBulletEntitySystem(this, x, y, w, h, vx, vy, c, dmg);
  }

  updateBullets(dt: number) {
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
    pattern: "aimed" | "homing" | "shotgun" | "straight",
  ) {
    // Removed sfx.shoot() for enemies per request "적이 공격하는 탄환의 효과음은 없애줘."
    const cx = e.x + e.width / 2;
    const cy = e.y + e.height;
    const tx = this.player.x + this.player.width / 2;
    const ty = this.player.y + this.player.height / 2;
    const angleToPlayer = Math.atan2(ty - cy, tx - cx);

    if (pattern === "aimed") {
      const b = new Bullet();
      b.x = cx - 4;
      b.y = cy;
      b.width = 8;
      b.height = 8;
      b.vx = Math.cos(angleToPlayer) * 190;
      b.vy = Math.sin(angleToPlayer) * 190; // Slower velocity!
      b.isEnemy = true;
      b.type = "needle";
      b.color = "#39ff14"; // Fluorescent green
      this.bullets.push(b);
    } else if (pattern === "homing") {
      const b = new Bullet();
      b.x = cx - 7;
      b.y = cy - 7;
      b.width = 14;
      b.height = 14;
      b.vx = Math.cos(angleToPlayer) * 360;
      b.vy = Math.sin(angleToPlayer) * 360;
      b.isEnemy = true;
      b.type = "homing";
      b.homingTimer = 2.0;
      b.turnRate = 1.35;
      b.targetSpeed = 360;
      b.color = "#67e8f9";
      b.visualType = "tesla_spine_missile";
      this.bullets.push(b);
    } else if (pattern === "shotgun") {
      const count = 20;
      const spinOffset = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const a = spinOffset + (i / count) * Math.PI * 2;
        const b = new Bullet();
        b.x = cx - 4;
        b.y = cy;
        b.width = 8;
        b.height = 8;
        b.vx = Math.cos(a) * 175;
        b.vy = Math.sin(a) * 175;
        b.isEnemy = true;
        b.type = "pellet";
        b.color = i % 2 === 0 ? "#fb923c" : "#facc15";
        this.bullets.push(b);
      }
    } else {
      const b = new Bullet();
      b.x = cx - 3;
      b.y = cy;
      b.width = 6;
      b.height = 12;
      b.vx = 0;
      b.vy = 190;
      b.isEnemy = true;
      b.type = "needle"; // vertical straight needle
      b.color = "#22c55e"; // Fluorescent green
      this.bullets.push(b); // Slower straight shots!
    }
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
    this.stage++;
    this.nextBossScore = this.score + 10000 + this.stage * 3000;
    this.storyStageTimer = 0;
    this.bossActive = false;
    this.bossEntity = null;
    this.bossPhase2Triggered = false;
    this.bossPhase2Active = false;
    this.bossPhase3Triggered = false;
    this.bossPhase3Active = false;
    this.screenShakeIntensity = 0;
    this.clearingForBoss = false;
    
    // Refresh shields/debris for next action stage!
    this.spawnInitialDebris();

    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.powerups = [];
    this.clearBossPatternHazards();
    this.state = "PLAYING";
    sfx.startBgmForPhase(Math.min(MAX_CHAPTER, this.stage));
    
    this.waveTimer = 1.5;
    this.spawnTimer = 4.0;
  }
}
