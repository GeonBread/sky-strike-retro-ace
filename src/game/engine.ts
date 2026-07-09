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
    if (this.state === "GAMEOVER" || this.state === "VICTORY") return;

    if (this.state === "STAGE_CLEAR_CHOICE") {
      this.updateParticles(dt);
      return;
    }

    if (this.state === "BOSS_CLEAR_EXPLOSION") {
      this.updatePlayer(dt);
      this.updatePlayerPositionHistory(dt);
      this.updateBullets(dt);
      this.updateDronesAndBehaviors(dt);
      this.updateBossClearExplosion(dt);
      return;
    }

    if (this.state === "BOSS_CLEAR_MESSAGE") {
      this.updatePlayer(dt);
      this.updatePlayerPositionHistory(dt);
      this.updateBullets(dt);
      this.updateDronesAndBehaviors(dt);
      this.updateParticles(dt);
      this.bossClearTimer -= dt;
      if (this.bossClearTimer <= 0) {
        this.finishBossClearSequence();
      }
      return;
    }

    if (this.screenShakeIntensity > 0.1) {
      this.screenShakeIntensity *= Math.pow(0.08, dt);
    } else {
      this.screenShakeIntensity = 0;
    }

    if (this.state === "BOSSPHASE2CUTSCENE") {
      this.cutsceneTimer -= dt;
      this.screenShakeIntensity = 12; // Massive constant earthquake rumble!

      if (this.bossEntity) {
        // Glide the boss back to the center top
        const bossTargetX = this.canvas.width / 2 - this.bossEntity.width / 2;
        const bossTargetY = 80;
        this.bossEntity.x += (bossTargetX - this.bossEntity.x) * 4 * dt;
        this.bossEntity.y += (bossTargetY - this.bossEntity.y) * 4 * dt;

        // Charging HP bar from 0 to the phase 2 max HP.
        const progress = Math.min(1.0, (3.5 - this.cutsceneTimer) / 3.5);
        this.bossEntity.hp = Math.floor(progress * this.getBossMaxHp(2));

        // Cyber overdrive laser sparks
        if (Math.random() < 0.65) {
          const p = new Particle();
          p.x = this.bossEntity.x + Math.random() * this.bossEntity.width;
          p.y = this.bossEntity.y + Math.random() * this.bossEntity.height;
          p.vx = (Math.random() - 0.5) * 480;
          p.vy = (Math.random() - 0.5) * 480;
          p.color = Math.random() < 0.55 ? "#f43f5e" : "#c084fc";
          p.life = p.maxLife = 0.5 + Math.random() * 0.6;
          p.size = Math.random() * 8 + 3;
          this.particles.push(p);
        }
      }

      if (this.cutsceneTimer <= 0) {
        this.state = "PLAYING";
        this.bossPhase2Active = true;
        this.screenShakeIntensity = 0;

        if (this.bossEntity) {
          this.bossEntity.hp = this.getBossMaxHp(2);
          this.bossEntity.phase = 14;
          this.bossEntity.patternTimer = 0;
          this.bossEntity.phaseDuration = 7.5;
          this.bossEntity.rapidFireCount = 0;

          // Re-arm turrets under 70 HP overdrive!
          this.bossEntity.leftTurretActive = true;
          this.bossEntity.rightTurretActive = true;
          this.bossEntity.leftTurretHp = 70;
          this.bossEntity.rightTurretHp = 70;
        }
      }

      this.updatePlayer(dt);
      this.updateBullets(dt);
      this.updateEnemies(dt);
      this.updateParticles(dt);
      this.updateBomb(dt);
      this.updateInkClouds(dt);
      return;
    }

    if (this.state === "BOSSPHASE3CUTSCENE") {
      this.cutsceneTimer -= dt;
      this.screenShakeIntensity = 18; // More epic violent earthquake shake!

      if (this.bossEntity) {
        // Smoothly expand dimensions during charging!
        const progress = Math.min(1.0, (3.5 - this.cutsceneTimer) / 3.5);
        this.bossEntity.width = 120 + progress * 80;   // Grows up to 200
        this.bossEntity.height = 90 + progress * 60;  // Grows up to 150

        // Glide the boss back to the center top
        const bossTargetX = this.canvas.width / 2 - this.bossEntity.width / 2;
        const bossTargetY = 50; // slightly higher since it's larger
        this.bossEntity.x += (bossTargetX - this.bossEntity.x) * 4 * dt;
        this.bossEntity.y += (bossTargetY - this.bossEntity.y) * 4 * dt;

        // Charging HP bar from 0 to the phase 3 max HP.
        this.bossEntity.hp = Math.floor(progress * this.getBossMaxHp(3));

        // Cyber overdrive laser sparks of final grand form
        if (Math.random() < 0.85) {
          const p = new Particle();
          p.x = this.bossEntity.x + Math.random() * this.bossEntity.width;
          p.y = this.bossEntity.y + Math.random() * this.bossEntity.height;
          p.vx = (Math.random() - 0.5) * 600;
          p.vy = (Math.random() - 0.5) * 600;
          p.color = Math.random() < 0.4 ? "#fbbf24" : (Math.random() < 0.75 ? "#c084fc" : "#0ea5e9");
          p.life = p.maxLife = 0.5 + Math.random() * 0.8;
          p.size = Math.random() * 12 + 4;
          this.particles.push(p);
        }
      }

      if (this.cutsceneTimer <= 0) {
        this.state = "PLAYING";
        this.bossPhase3Active = true;
        this.bossPhase2Active = false; // Turn off phase 2
        this.screenShakeIntensity = 0;

        if (this.bossEntity) {
          this.bossEntity.hp = this.getBossMaxHp(3);
          this.bossEntity.width = 200;
          this.bossEntity.height = 150;
          this.assignBossPhase(this.bossEntity, 20);
          this.bossEntity.patternTimer = 0;
          this.bossEntity.rapidFireCount = 0;

          // Re-arm turrets under 150 HP overkill stats!
          this.bossEntity.leftTurretActive = true;
          this.bossEntity.rightTurretActive = true;
          this.bossEntity.leftTurretHp = 150;
          this.bossEntity.rightTurretHp = 150;
        }
      }

      this.updatePlayer(dt);
      this.updateBullets(dt);
      this.updateEnemies(dt);
      this.updateParticles(dt);
      this.updateBomb(dt);
      this.updateInkClouds(dt);
      return;
    }

    if (this.state === "BOSSCUTSCENE") {
      this.cutsceneTimer -= dt;
      if (this.bossEntity) {
        this.bossEntity.y += 40 * dt;
        if (this.bossEntity.y > 80) this.bossEntity.y = 80;
      }
      if (this.cutsceneTimer <= 0) {
        this.state = "PLAYING";
        if (this.bossEntity) {
          this.resetBossPattern(this.bossEntity);
          this.assignNextBossPhase(this.bossEntity);
        }
        if (this.onCutsceneChange) this.onCutsceneChange(false);
      }

      this.updatePlayer(dt);
      this.updateBullets(dt);
      this.updateEnemies(dt);
      this.updateParticles(dt);
      this.updatePowerUps(dt);
      this.updateBomb(dt);
      this.updateInkClouds(dt);
      this.checkCollisions();
      return;
    }

    this.updatePlayer(dt);
    this.updatePlayerPositionHistory(dt);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.updatePowerUps(dt);
    this.updateBomb(dt);
    this.updateInkClouds(dt);
    this.updateDebrisAndMeteors(dt);
    this.updateDronesAndBehaviors(dt);
    this.updateBossPatternHazards(dt);
    this.checkCollisions();

    if (this.isStoryMode() && !this.bossActive && !this.clearingForBoss) {
      this.storyStageTimer += dt;
    }

    if (this.isSandbox) {
      this.runSandboxMechanics(dt);
    } else {
      this.spawnEntities(dt);
      this.tuneStoryEnemies();
    }
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
    this.sandboxPlayerPowerLevel = Math.max(1, Math.min(5, Math.floor(powerLevel)));
    this.sandboxPlayerBombs = Math.max(0, Math.min(9, Math.floor(bombs)));
    this.sandboxPlayerSatelliteCount = Math.max(0, Math.min(4, Math.floor(satelliteCount)));

    this.player.powerLevel = this.sandboxPlayerPowerLevel;
    this.player.bombs = this.sandboxPlayerBombs;
    this.player.satelliteCount = this.sandboxPlayerSatelliteCount;
    while (this.player.satelliteHps.length < this.player.satelliteCount) {
      this.player.satelliteHps.push(3);
    }
    while (this.player.satelliteHps.length > this.player.satelliteCount) {
      this.player.satelliteHps.pop();
    }
    if (this.onBombsChanged) this.onBombsChanged(this.player.bombs);
  }

  public resetSandboxBossCombat(chapter: number) {
    const tier = Math.max(1, Math.min(MAX_CHAPTER, Math.floor(chapter)));
    this.sandboxBossCombatMode = true;
    this.sandboxBossChapter = tier;
    this.sandboxMode = "bossCombat";
    this.sandboxEnemyType = "boss";
    this.sandboxMovementEnabled = true;
    this.stage = tier;
    this.state = "PLAYING";
    this.bossActive = false;
    this.bossEntity = null;
    this.clearingForBoss = false;
    this.bossPhase2Active = tier === 2;
    this.bossPhase3Active = tier >= 3;
    this.bossPhase2Triggered = tier >= 2;
    this.bossPhase3Triggered = tier >= 3;
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.powerups = [];
    this.inkClouds = [];
    this.meteors = [];
    this.clearBossPatternHazards();
    this.player.hp = PLAYER_MAX_HP;
    this.player.isDead = false;
    this.player.deadTimer = 0;
    this.player.invulnTimer = 1.0;
    this.needInitialPosition = true;
    sfx.startBgmForPhase(tier);
  }

  runSandboxMechanics(dt: number) {
    const bossCombatMode = this.sandboxBossCombatMode || this.sandboxMode === "bossCombat";
    const sandboxBossTier = bossCombatMode
      ? Math.max(1, Math.min(MAX_CHAPTER, Math.floor(this.sandboxBossChapter || 1)))
      : this.sandboxBossPhase3
        ? 3
        : this.sandboxBossOverdrive
          ? 2
          : 1;

    this.waveTimer = 99;
    this.spawnTimer = 99;
    this.sideSpawnTimer = 99;
    this.clearingForBoss = false;
    this.stage = sandboxBossTier;
    this.bossPhase2Active = sandboxBossTier === 2;
    this.bossPhase3Active = sandboxBossTier >= 3;
    this.bossPhase2Triggered = sandboxBossTier >= 2;
    this.bossPhase3Triggered = sandboxBossTier >= 3;
    if (!bossCombatMode) {
      this.bossActive = false;
    }
    this.player.powerLevel = Math.max(1, Math.min(5, Math.floor(this.sandboxPlayerPowerLevel || 1)));
    this.player.satelliteCount = Math.max(0, Math.min(4, Math.floor(this.sandboxPlayerSatelliteCount || 0)));
    while (this.player.satelliteHps.length < this.player.satelliteCount) {
      this.player.satelliteHps.push(3);
    }
    while (this.player.satelliteHps.length > this.player.satelliteCount) {
      this.player.satelliteHps.pop();
    }

    // Wrap sandbox enemies that go off-screen bottom so they repeat their paths instead of getting deleted!
    if (this.sandboxMovementEnabled) {
      this.enemies.forEach((e) => {
        if (e.y > this.canvas.height + 30) {
          e.y = -60;
          if (e.type !== "boss") {
            e.x = Math.random() * (this.canvas.width - 120) + 60;
          }
          // Reset its health so it runs again
          if (e.type === "boss") {
            e.hp = getBossMaxHpForTier(this.sandboxBossPhase3 ? 3 : this.sandboxBossOverdrive ? 2 : 1);
            if (this.sandboxBossPhase3) {
              e.width = 200;
              e.height = 150;
            } else {
              e.width = 120;
              e.height = 90;
            }
          } else {
            e.hp = e.type === "assault_commander" ? 230 : e.type === "tank" ? 80 : 30;
          }
          e.lastShot = 0;
          e.patternTimer = 0;

          // Setup standard real game initial velocity vectors:
          if (e.type === "assault_commander") {
            e.vy = 145;
            e.spawnPoint = 110;
            e.vx = 125;
          } else if (e.type === "stationary") {
            e.vy = 300;
            e.spawnPoint = 100;
            e.vx = 0;
          } else if (e.type === "column_shooter") {
            e.vy = 400;
            e.spawnPoint = 120;
            e.vx = 0;
          } else if (e.type === "circle_shooter") {
            e.vy = 150;
            e.vx = Math.random() > 0.5 ? 40 : -40;
          } else if (e.type === "v_360_shooter") {
            e.vy = 200;
            e.spawnPoint = 110;
            e.vx = 0;
          } else if (e.type === "split_cluster") {
            e.vy = 180;
            e.spawnPoint = 115;
            e.vx = 150;
          } else if (e.type === "mine_layer") {
            e.vy = 160;
            e.spawnPoint = 110;
            e.vx = 120;
          } else if (e.type === "dash_paint") {
            e.vy = 180;
            e.spawnPoint = 120;
            e.vx = 180;
          } else if (e.type === "sweeper") {
            e.vy = 150;
            e.vx = (Math.random() > 0.5 ? 1 : -1) * 110;
          } else {
            e.vy = e.type === "tank" ? 75 : 120;
            e.vx = 0;
          }
        }
        if (e.x < -100) {
          e.x = this.canvas.width + 20;
        } else if (e.x > this.canvas.width + 100) {
          e.x = -20;
        }
      });
    }

    // Check if there is an active sandbox enemy
    const activeSandboxEnemy = this.enemies.find((e) => e.active);
    if (!activeSandboxEnemy) {
      this.bullets = []; // Clear existing projectiles to start fresh!

      if (this.sandboxMode === "wave" && !bossCombatMode) {
        this.triggerSandboxWave(this.sandboxActiveWave);
        return;
      }

      // Add a 1.0 second delay before respawning the sandbox enemy
      if (this.sandboxRespawnTimer === undefined) {
        this.sandboxRespawnTimer = 1.0;
      }
      if (this.sandboxRespawnTimer > 0) {
        this.sandboxRespawnTimer -= dt;
        return;
      }
      this.sandboxRespawnTimer = 1.0; // Reset for the next destruction cycle!

      const dummy = new Enemy();
      dummy.type = this.sandboxEnemyType as any;
      if (bossCombatMode) {
        dummy.type = "boss";
      }
      dummy.active = true;

      if (dummy.type === "boss") {
        const targetPhase =
          this.sandboxBossPhaseLock >= 1
            ? this.sandboxBossPhaseLock
            : sandboxBossTier >= 4
              ? this.pickChapter4BossPhase(-1)
              : sandboxBossTier >= 3
                ? this.pickNextFinalBossPhase(-1)
                : sandboxBossTier === 2
                  ? this.pickOverdriveBossPhase(-1)
                  : this.pickNormalBossPhase(-1);

        if (sandboxBossTier >= 3) {
          dummy.width = sandboxBossTier >= 4 ? 220 : 200;
          dummy.height = sandboxBossTier >= 4 ? 165 : 150;
          dummy.x = this.canvas.width / 2 - dummy.width / 2;
          dummy.y = 80;
          dummy.spawnPoint = 80;
          dummy.hp = getBossMaxHpForTier(sandboxBossTier);
          dummy.bossStunTimer = 0;
          dummy.visualId = 1;

          this.bossActive = true;
          this.bossEntity = dummy;
          this.bossPhase3Active = true;
          this.bossPhase2Active = false;
        } else {
          dummy.width = sandboxBossTier === 2 ? 150 : 120;
          dummy.height = sandboxBossTier === 2 ? 110 : 90;
          dummy.x = this.canvas.width / 2 - dummy.width / 2;
          dummy.y = 80;
          dummy.spawnPoint = 80;
          dummy.hp = getBossMaxHpForTier(sandboxBossTier);
          dummy.bossStunTimer = 0;
          dummy.visualId = 1;

          this.bossActive = true;
          this.bossEntity = dummy;
          this.bossPhase3Active = false;
          this.bossPhase2Active = sandboxBossTier === 2;
        }
        this.assignBossPhase(dummy, targetPhase, this.sandboxBossPhaseLock >= 1);

        if (this.sandboxMovementEnabled || bossCombatMode) {
          dummy.vx = 150;
          dummy.vy = 60;
        } else {
          dummy.vx = 0;
          dummy.vy = 0;
        }
      } else {
        dummy.width = dummy.type === "assault_commander" ? 94 : 36;
        dummy.height = dummy.type === "assault_commander" ? 66 : 36;
        dummy.x = this.canvas.width / 2 - dummy.width / 2;
        dummy.y = 120;
        dummy.spawnPoint = 120;
        // Set moderate HP so it can be defeated and respawned easily to observe death counter patterns!
        dummy.hp = dummy.type === "assault_commander" ? 230 : dummy.type === "tank" ? 80 : 30;

        // Map unique visual ID ship designs for sandbox
        if (dummy.type === "stationary") dummy.visualId = 8;
        else if (dummy.type === "assault_commander") dummy.visualId = 10;
        else if (dummy.type === "aimed") dummy.visualId = 9;
        else if (dummy.type === "circle_shooter") dummy.visualId = 2;
        else if (dummy.type === "v_360_shooter") dummy.visualId = 5;
        else if (dummy.type === "burst_shooter") dummy.visualId = 1;
        else if (dummy.type === "satellite_shield") dummy.visualId = 7;
        else if (dummy.type === "boomerang_orbit") dummy.visualId = 10;
        else if (dummy.type === "homing_shooter") dummy.visualId = 3;
        else if (dummy.type === "shotgun_shooter") dummy.visualId = 6;
        else if (dummy.type === "mine_layer") dummy.visualId = 8;
        else if (dummy.type === "dash_paint") dummy.visualId = 9;
        else if (dummy.type === "tank") dummy.visualId = 4;
        else if (dummy.type === "ricochet_shooter") dummy.visualId = 5;
        else if (dummy.type === "counter_on_death") dummy.visualId = 7;
        else if (dummy.type === "ink_shooter") dummy.visualId = 2;
        else if (dummy.type === "gravity_vortex_mob") dummy.visualId = 8;
        else dummy.visualId = Math.floor(Math.random() * 10) + 1;

        if (this.sandboxMovementEnabled) {
          if (dummy.type === "assault_commander") {
            dummy.y = -90;
            dummy.vy = 145;
            dummy.spawnPoint = 110;
            dummy.vx = 125;
          } else if (dummy.type === "stationary") {
            dummy.y = -60;
            dummy.vy = 300;
            dummy.spawnPoint = 100;
          } else if (dummy.type === "circle_shooter") {
            dummy.y = -60;
            dummy.vy = 150;
            dummy.vx = 40;
          } else if (dummy.type === "column_shooter") {
            dummy.y = -60;
            dummy.vy = 400;
            dummy.spawnPoint = 120;
          } else if (dummy.type === "v_360_shooter") {
            dummy.y = -60;
            dummy.vy = 200;
            dummy.spawnPoint = 120;
          } else if (dummy.type === "split_cluster") {
            dummy.y = -60;
            dummy.vy = 180;
            dummy.spawnPoint = 120;
            dummy.vx = 150;
          } else if (dummy.type === "mine_layer") {
            dummy.y = -60;
            dummy.vy = 160;
            dummy.spawnPoint = 110;
            dummy.vx = 120;
          } else if (dummy.type === "boomerang_orbit") {
            dummy.y = -60;
            dummy.vy = 180;
            dummy.spawnPoint = 120;
            dummy.patternTimer = 0;
          } else if (dummy.type === "dash_paint") {
            dummy.y = -60;
            dummy.vy = 180;
            dummy.spawnPoint = 120;
            dummy.vx = 180;
          } else if (dummy.type === "sweeper") {
            dummy.y = -60;
            dummy.vy = 150;
            dummy.vx = 110;
          } else if (dummy.type === "tank") {
            dummy.y = -60;
            dummy.vy = 75;
          } else {
            dummy.y = -60;
            dummy.vy = 120;
            dummy.vx = 0;
          }
        } else {
          dummy.vx = 0;
          dummy.vy = 0;
        }
      }

      this.enemies = [dummy];
    } else {
      const e = activeSandboxEnemy;
      if (bossCombatMode) {
        if (e.type !== "boss") {
          this.enemies = [];
          return;
        }
        this.bossActive = true;
        this.bossEntity = e;
      }
      if (this.sandboxMode === "single" && !this.sandboxMovementEnabled) {
        if (
          e.type !== "boss" &&
          e.type !== "satellite_shield" &&
          e.type !== "boomerang_orbit" &&
          e.type !== "circle_shooter" &&
          e.type !== "split_cluster" &&
          e.type !== "mine_layer" &&
          e.type !== "dash_paint" &&
          e.type !== "assault_commander"
        ) {
          e.x = this.canvas.width / 2 - e.width / 2;
          e.y = 120;
          e.vx = 0;
          e.vy = 0;
        }
      }
    }

    if (this.sandboxInvincibility && this.player) {
      this.player.hp = PLAYER_MAX_HP;
      this.player.invulnTimer = 2.0;
      this.player.isDead = false;
    }
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
    this.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    });
    this.particles = this.particles.filter((p) => p.active);
  }

  updatePowerUps(dt: number) {
    this.powerups.forEach((p) => {
      p.y += p.vy * dt;
      if (p.y > this.canvas.height + 20) p.active = false;
    });
    this.powerups = this.powerups.filter((p) => p.active);
  }

  clearAllEnemyBullets() {
    this.bullets.forEach((b) => {
      if (b.isEnemy) {
        // Spawn shiny score powerup sparks
        this.spawnExplosion(
          b.x + b.width / 2,
          b.y + b.height / 2,
          "#fbbf24",
          2,
        );
        b.active = false;
        this.awardScore(5); // Reward points for clearing bullets!
      }
    });
    this.bullets = this.bullets.filter((b) => b.active);
  }

  checkCollisions() {
    this.bullets.forEach((b) => {
      if (b.isEnemy) {
        // Intercept with active player guardian satellites
        if (!this.player.isDead && this.player.satelliteCount > 0) {
          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;
          const bcx = b.x + b.width / 2;
          const bcy = b.y + b.height / 2;
          
          let blocked = false;
          
          // Re-verify sound array sanity
          if (!this.player.satelliteHps) {
            this.player.satelliteHps = [];
          }
          while (this.player.satelliteHps.length < this.player.satelliteCount) {
            this.player.satelliteHps.push(10); // Give 10 shield lives initially
          }
          while (this.player.satelliteHps.length > this.player.satelliteCount) {
            this.player.satelliteHps.pop();
          }

          for (let i = 0; i < this.player.satelliteCount; i++) {
            const angle = (this.playerSatelliteAngle || 0) + (i / this.player.satelliteCount) * Math.PI * 2;
            const sx = px + Math.cos(angle) * 44;
            const sy = py + Math.sin(angle) * 44;
            const distToSatellite = Math.hypot(bcx - sx, bcy - sy);
            
            if (distToSatellite < 18) {
              b.active = false;
              
              // Satellite absorbs hit & takes 1 point of structural damage
              this.player.satelliteHps[i]--;
              
              if (this.player.satelliteHps[i] <= 0) {
                // Completely broken!
                this.player.satelliteHps.splice(i, 1);
                this.player.satelliteCount--;
                this.spawnExplosion(sx, sy, "#c084fc", 18);
                sfx.satelliteDestroy(); // Play the new distinct companion-break SFX!
              } else {
                // Absorbed/Blocked damage! Play soft metal clink & hit sparks
                this.spawnExplosion(sx, sy, "#c084fc", 6);
                sfx.enemyHit();
                
                if (!this.playerSatelliteFlashes) {
                  this.playerSatelliteFlashes = [];
                }
                this.playerSatelliteFlashes[i] = 0.15; // flash bright white for 0.15 seconds
              }

              blocked = true;
              break;
            }
          }
          if (blocked) return;
        }

        let actualHit = this.intersects(b, this.player);
        if (actualHit && b.type === "ring") {
          const bcx = b.x + b.width / 2;
          const bcy = b.y + b.height / 2;
          const pcx = this.player.x + this.player.width / 2;
          const pcy = this.player.y + this.player.height / 2;
          const dist = Math.hypot(bcx - pcx, bcy - pcy);
          const r = Math.max(b.width, b.height) * 1.55; // visual radius
          const innerHole = r * 0.48; // center empty hole!
          if (dist < innerHole) {
            actualHit = false; // "풍혈 피하기" graze passage
          }
        }
        if (this.player.invulnTimer <= 0 && actualHit) {
          b.active = false;
          this.triggerPlayerHit();
        }
      } else {
        this.enemies.forEach((e) => {
          if (e.active && this.intersects(b, e)) {
            if ((this.state === "BOSSCUTSCENE" || this.state === "BOSSPHASE2CUTSCENE" || this.state === "BOSSPHASE3CUTSCENE") && e.type === "boss") {
              return;
            }
            b.active = false;

            // Parts-destruction system
            if (e.type === "boss") {
              let hitLeftTurret =
                e.leftTurretActive &&
                this.intersects(b, {
                  x: e.x - 14,
                  y: e.y + 10,
                  width: 14,
                  height: 40,
                });
              let hitRightTurret =
                e.rightTurretActive &&
                this.intersects(b, {
                  x: e.x + e.width,
                  y: e.y + 10,
                  width: 14,
                  height: 40,
                });

              if (hitLeftTurret) {
                e.leftTurretHp -= b.damage;
                sfx.enemyHit();
                this.spawnExplosion(b.x, b.y, b.color, 4);
                if (e.leftTurretHp <= 0) {
                  e.leftTurretActive = false;
                  sfx.enemyExplode();
                  this.spawnExplosion(e.x - 7, e.y + 30, "#ef4444", 30);
                  e.bossStunTimer = 1.8; // Groggy/Stun boss for 1.8s!
                  this.clearAllEnemyBullets(); // Bullet clear for catharsis!
                  this.awardScore(2500); // Large reward!
                }
                return; // Damaged left wing turret, do not hit main health
              } else if (hitRightTurret) {
                e.rightTurretHp -= b.damage;
                sfx.enemyHit();
                this.spawnExplosion(b.x, b.y, b.color, 4);
                if (e.rightTurretHp <= 0) {
                  e.rightTurretActive = false;
                  sfx.enemyExplode();
                  this.spawnExplosion(
                    e.x + e.width + 7,
                    e.y + 30,
                    "#ef4444",
                    30,
                  );
                  e.bossStunTimer = 1.8; // Groggy/Stun boss for 1.8s!
                  this.clearAllEnemyBullets(); // Bullet clear for catharsis!
                  this.awardScore(2500); // Large reward!
                }
                return; // Damaged right wing turret, do not hit main health
              }
            }

            e.hp -= b.damage;
            e.type === "boss" ? sfx.bossHit() : sfx.enemyHit();
            this.spawnExplosion(b.x, b.y, b.color, 4);

            if (
              e.type === "counter_on_death" &&
              e.hp > 0 &&
              (!e.counterTimer || e.counterTimer <= 0)
            ) {
              e.counterTimer = 0.45;
              const cx = e.x + e.width / 2;
              const cy = e.y + e.height / 2;
              const tx = this.player.x + this.player.width / 2;
              const ty = this.player.y + this.player.height / 2;
              const a = Math.atan2(ty - cy, tx - cx);
              const blt = new Bullet();
              blt.x = cx - 4;
              blt.y = cy - 4;
              blt.width = 8;
              blt.height = 8;
              blt.vx = Math.cos(a) * 230;
              blt.vy = Math.sin(a) * 230;
              blt.isEnemy = true;
              blt.color = "#e11d48";
              this.bullets.push(blt);
            }

            if (e.hp <= 0) {
              if (
                e.type === "boss" &&
                false &&
                !this.bossPhase2Triggered &&
                !this.isSandbox
              ) {
                this.bossPhase2Triggered = true;
                this.state = "BOSSPHASE2CUTSCENE";
                this.cutsceneTimer = 3.5; // 3.5 seconds of pure tension
                this.clearAllEnemyBullets();

                // Clear any ordinary stage mobs to clean the field
                this.enemies = this.enemies.filter((other) => other === e);

                e.hp = 1; // Temporarily reset to 1 for charging visual
                sfx.bossExplode(); // Play transform explosion visual/sound
                return;
              }

              if (
                e.type === "boss" &&
                false &&
                this.bossPhase2Active &&
                !this.bossPhase3Triggered &&
                !this.isSandbox
              ) {
                this.bossPhase3Triggered = true;
                this.state = "BOSSPHASE3CUTSCENE";
                this.cutsceneTimer = 3.5; // 3.5 seconds of epic charge
                this.clearAllEnemyBullets();

                // Clear ordinary stage mobs to clean the field
                this.enemies = this.enemies.filter((other) => other === e);

                e.hp = 1; // Temporarily reset to 1 for charging visual
                sfx.bossExplode(); // Play transition explosion
                return;
              }

              if (e.type === "boss") {
                this.awardScore(10000);
                this.bullets.forEach((b) => {
                  if (b.isEnemy) b.active = false;
                });
                this.clearBossPatternHazards();
                this.beginBossClearSequence(e);
                return;
              }

              this.deactivateEnemy(e);
              if (e.type === "counter_on_death") {
                const count = 10;
                const cx = e.x + e.width / 2;
                const cy = e.y + e.height / 2;
                for (let i = 0; i < count; i++) {
                  const angle = (i / count) * Math.PI * 2;
                  const blt = new Bullet();
                  blt.x = cx - 4;
                  blt.y = cy - 4;
                  blt.width = 8;
                  blt.height = 8;
                  blt.vx = Math.cos(angle) * 165;
                  blt.vy = Math.sin(angle) * 165;
                  blt.isEnemy = true;
                  blt.color = "#38bdf8";
                  this.bullets.push(blt);
                }
              }
              this.awardScore(e.type === "assault_commander" ? 2500 : e.type === "tank" ? 300 : 100);

              this.spawnExplosion(
                e.x + e.width / 2,
                e.y + e.height / 2,
                e.type === "assault_commander" ? "#22d3ee" : "#f43f5e",
                e.type === "assault_commander" ? 48 : 25,
              );
              sfx.enemyExplode();

              if (Math.random() < (e.type === "assault_commander" ? 0.75 : 0.12)) {
                const pu = new PowerUp();
                pu.x = e.x + e.width / 2;
                pu.y = e.y + e.height / 2;
                pu.width = 16;
                pu.height = 16;
                pu.vy = 120;
                pu.type = Math.random() < 0.18 ? "satellite" : (Math.random() < 0.30 ? "heal" : "power");
                this.powerups.push(pu);
              }
            }
          }
        });
      }
    });

    this.enemies.forEach((e) => {
      if (
        e.active &&
        this.player.invulnTimer <= 0 &&
        this.intersects(this.player, e)
      ) {
        if (e.type !== "boss" && e.type !== "assault_commander") {
          this.deactivateEnemy(e);
          this.spawnExplosion(
            e.x + e.width / 2,
            e.y + e.height / 2,
            "#f43f5e",
            15,
          );
        }
        this.triggerPlayerHit();
      }
    });

    this.powerups.forEach((p) => {
      // Create a 4x larger virtual player bounding box to make item collection extremely generous!
      const virtualPlayer = {
        x: this.player.x - this.player.width * 1.5,
        y: this.player.y - this.player.height * 1.5,
        width: this.player.width * 4,
        height: this.player.height * 4,
        hitWidth: (this.player.hitWidth || this.player.width) * 4,
        hitHeight: (this.player.hitHeight || this.player.height) * 4,
      };
      if (p.active && this.intersects(virtualPlayer, p)) {
        p.active = false;
        sfx.powerup();
        if (p.type === "power") {
          if (this.player.powerLevel >= 5) {
            this.awardScore(1000); // Bonus points for full weapon
            this.spawnExplosion(
              p.x + p.width / 2,
              p.y + p.height / 2,
              "#38bdf8",
              15,
            );
          } else {
            this.player.powerLevel = Math.min(5, this.player.powerLevel + 1);
          }
        } else if (p.type === "heal") {
          if (this.player.hp >= PLAYER_MAX_HP) {
            this.awardScore(1000); // Bonus points for full health
            this.spawnExplosion(
              p.x + p.width / 2,
              p.y + p.height / 2,
              "#4ade80",
              15,
            );
          } else {
            this.player.hp = Math.min(PLAYER_MAX_HP, this.player.hp + 1);
          }
        } else if (p.type === "satellite") {
          this.player.satelliteCount = Math.min(4, this.player.satelliteCount + 1);
          this.spawnExplosion(
            p.x + p.width / 2,
            p.y + p.height / 2,
            "#c084fc",
            20,
          );
        }
        this.awardScore(200);
      }
    });
  }

  private triggerPlayerHit() {
    triggerPlayerDamageAndRespawnSystem(this);
  }

  intersects(r1: Box, r2: Box) {
    return boxesIntersect(r1, r2);
  }

  spawnExplosion(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const p = new Particle();
      p.x = x;
      p.y = y;
      p.width = Math.random() * 4 + 3;
      p.height = p.width;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 80;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = p.maxLife = Math.random() * 0.7 + 0.3;
      p.color = color;
      this.particles.push(p);
    }
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
    this.debrisCovers = [];
  }

  updateDebrisAndMeteors(dt: number) {
    if (this.isSandbox || this.isStoryMode()) {
      this.debrisCovers = [];
      this.meteors = [];
      return;
    }

    // 1. Spawning Meteors from the top
    this.meteorTimer -= dt;
    if (this.meteorTimer <= 0) {
      this.meteorTimer = 6.0 + Math.random() * 4.0; // Every 6-10s
      this.meteors.push({
        x: Math.random() * (this.canvas.width - 60) + 30,
        y: -50,
        radius: 18 + Math.random() * 16,
        vx: (Math.random() - 0.5) * 60,
        vy: 120 + Math.random() * 80,
        hp: 40,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2.0,
        active: true,
      });
    }

    // 2. Update Meteors
    this.meteors.forEach((m) => {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rotation += m.rotSpeed * dt;

      if (m.y > this.canvas.height + 50 || m.x < -50 || m.x > this.canvas.width + 50) {
        m.active = false;
      }
    });
    this.meteors = this.meteors.filter((m) => m.active);

    // 3. Collision logic: enemy bullets hitting defensive debris only.
    this.bullets.forEach((b) => {
      if (!b.active) return;
      
      if (b.isEnemy) {
        // Enemy bullets hitting defensive debris cover
        this.debrisCovers.forEach((d) => {
          if (!d.active || !b.active) return;
          if (
            b.x + b.width > d.x &&
            b.x < d.x + d.width &&
            b.y + b.height > d.y &&
            b.y < d.y + d.height
          ) {
            b.active = false;
            this.spawnExplosion(b.x, b.y, b.color, 4);
            d.hp -= 1; // Debris absorbs enemy attacks!
            if (d.hp <= 0) {
              d.active = false;
              sfx.enemyExplode();
              this.spawnExplosion(d.x + d.width / 2, d.y + d.height / 2, "#94a3b8", 30);
            }
          }
        });
      }
    });

    // 4. Meteor hitting Player
    if (this.player.invulnTimer <= 0) {
      this.meteors.forEach((m) => {
        if (!m.active) return;
        const pcx = this.player.x + this.player.width / 2;
        const pcy = this.player.y + this.player.height / 2;
        const dist = Math.hypot(pcx - m.x, pcy - m.y);
        if (dist < m.radius + this.player.hitWidth / 2 + 5) {
          m.active = false;
          sfx.enemyExplode();
          this.spawnExplosion(m.x, m.y, "#cbd5e1", 20);
          this.triggerPlayerHit();
        }
      });
    }

  }

  updateDronesAndBehaviors(dt: number) {
    if (this.player.isDead) return;

    this.drones.forEach((dr) => {
      dr.lastShot += dt;
      dr.angleOffset += 1.8 * dt; // Rotate the orbit!

      const pcx = this.player.x + this.player.width / 2;
      const pcy = this.player.y + this.player.height / 2;

      // Type-specific logic!
      if (dr.type === "attack") {
        // Shoots 2 auxiliary plasma fires forward
        if (dr.lastShot >= 0.35) {
          dr.lastShot = 0;
          const leftX = pcx - 22 + Math.cos(dr.angleOffset) * 8;
          const leftY = pcy - 12 + Math.sin(dr.angleOffset) * 8;
          this.addPlayerBlt(leftX - 2, leftY - 8, 4, 12, 0, -900, "#22d3ee", 0.5);
        }
      } else if (dr.type === "homing") {
        if (dr.lastShot >= 0.55) {
          dr.lastShot = 0;
          const rx = pcx + Math.sin(dr.angleOffset) * 42;
          const ry = pcy + Math.cos(dr.angleOffset) * 42;
          const b = new Bullet();
          b.x = rx - 5;
          b.y = ry - 8;
          b.width = 10;
          b.height = 16;
          b.vx = Math.sin(dr.angleOffset) * 120;
          b.vy = -760;
          b.color = "#f97316";
          b.damage = 1.15;
          b.type = "satellite_bullet";
          b.companionIndex = 2;
          this.bullets.push(b);
        }
      } else if (dr.type === "defense") {
        // Deletes and breaks enemy bullets within defense range every 2.4s
        if (dr.lastShot >= 2.4) {
          dr.lastShot = 0;
          const rx = pcx + Math.sin(dr.angleOffset) * 45;
          const ry = pcy + Math.cos(dr.angleOffset) * 45;

          // Spawn a small visual defense pulse shockwave!
          this.spawnExplosion(rx, ry, "#10b981", 12);
          
          this.bullets.forEach((b) => {
            if (b.active && b.isEnemy) {
              const b_dist = Math.hypot(b.x + b.width / 2 - rx, b.y + b.height / 2 - ry);
              if (b_dist <= 75) {
                b.active = false;
                this.spawnExplosion(b.x + b.width / 2, b.y + b.height / 2, "#34d399", 3);
              }
            }
          });
        }
      } else if (dr.type === "orbit") {
        // High proximity damage dealing orbit droid
        const rx = pcx + Math.sin(dr.angleOffset) * 55;
        const ry = pcy + Math.cos(dr.angleOffset) * 55;

        this.enemies.forEach((e) => {
          if (e.active) {
            if (e.type === "boss" && (this.state === "BOSSCUTSCENE" || this.state === "BOSSPHASE2CUTSCENE" || this.state === "BOSSPHASE3CUTSCENE")) {
              return;
            }
            const ex = e.x + e.width / 2;
            const ey = e.y + e.height / 2;
            const e_dist = Math.hypot(ex - rx, ey - ry);
            if (e_dist <= 35) {
              // Proximity collision damage ticker
              e.hp -= 15 * dt; 
              if (Math.random() < 0.2) {
                this.spawnExplosion(rx, ry, "#eab308", 2);
                sfx.enemyHit();
              }
              if (e.hp <= 0) {
                this.deactivateEnemy(e);
                sfx.enemyExplode();
                this.awardScore(e.type === "boss" ? 10000 : 100);
                this.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, "#fbbf24", 15);
              }
            }
          }
        });
      } else if (dr.type === "laser") {
        // Charges and fires a continuous pierce beam columns
        if (dr.lastShot >= 4.0) {
          dr.lastShot = 0;
          dr.laserChargeCount = 1.2; // Fires pierce beam for 1.2s
        }

        if (dr.laserChargeCount > 0) {
          dr.laserChargeCount -= dt;
          const rx = pcx + Math.sin(dr.angleOffset) * 48;
          const ry = pcy + Math.cos(dr.angleOffset) * 48;

          // Draw continuous laser column in update/particles
          if (Math.random() < 0.3) {
            this.spawnExplosion(rx, ry - 150, "#a855f7", 3);
          }

          // Deal frame damage to all enemies aligned with this column!
          this.enemies.forEach((e) => {
            if (e.active) {
              if (e.type === "boss" && (this.state === "BOSSCUTSCENE" || this.state === "BOSSPHASE2CUTSCENE" || this.state === "BOSSPHASE3CUTSCENE")) {
                return;
              }
              const ex = e.x + e.width / 2;
              if (Math.abs(ex - rx) < 24 && e.y < ry) {
                e.hp -= 28 * dt; // Pierce beam ticks
                if (Math.random() < 0.15) sfx.enemyHit();
                if (e.hp <= 0) {
                  this.deactivateEnemy(e);
                  sfx.enemyExplode();
                  this.awardScore(e.type === "boss" ? 10000 : 100);
                  this.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, "#c084fc", 15);
                }
              }
            }
          });
        }
      }
    });
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
