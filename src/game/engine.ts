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
import { SHIP_COLORS } from "./render/palette";
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
  Bullet,
  type BulletVisualType,
  Enemy,
  Entity,
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
    if (!this.isStoryMode()) return;

    this.bullets.forEach((b) => {
      if (!b.active || !b.isEnemy || this.storyAdjustedBullets.has(b)) return;
      this.storyAdjustedBullets.add(b);
      this.storyBulletSerial++;

      const preserveBullet = b.type === "gravity_ball" || b.type === "gravity_singularity" || b.type === "void_mine";
      if (!preserveBullet && this.storyBulletSerial % 5 < 2) {
        b.active = false;
        return;
      }

      const velocityScale = this.bossActive ? 0.52 : 0.6;
      b.vx *= velocityScale;
      b.vy *= velocityScale;
      if (b.targetSpeed !== undefined) b.targetSpeed *= velocityScale;
      if (b.turnRate !== undefined) b.turnRate *= 0.65;
      b.width = Math.max(6, b.width * 0.86);
      b.height = Math.max(6, b.height * 0.86);
    });

    const enemyBullets = this.bullets.filter((b) => b.active && b.isEnemy);
    const cap = this.bossActive ? 64 : 36;
    if (enemyBullets.length > cap) {
      let excess = enemyBullets.length - cap;
      for (const b of enemyBullets) {
        if (excess <= 0) break;
        if (b.type === "gravity_ball" || b.type === "gravity_singularity" || b.type === "void_mine") continue;
        b.active = false;
        excess--;
      }
    }
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
    this.inkClouds.forEach((c) => {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.radius += (c.maxRadius - c.radius) * 0.18 * dt;
      c.life -= dt;
      if (c.life <= 0) {
        c.active = false;
      }
    });
    this.inkClouds = this.inkClouds.filter((c) => c.active);
  }

  updatePlayer(dt: number) {
    if (this.canvas.width > 100 && this.canvas.height > 100) {
      const isDefaultCanvas = this.canvas.width === 300 && this.canvas.height === 150;
      
      if (this.needInitialPosition || isDefaultCanvas) {
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height - 100;
        if (!isDefaultCanvas) {
          this.needInitialPosition = false;
        }
        this.lastCanvasWidth = this.canvas.width;
        this.lastCanvasHeight = this.canvas.height;
      } else if (this.canvas.width !== this.lastCanvasWidth || this.canvas.height !== this.lastCanvasHeight) {
        const ratioX = this.canvas.width / this.lastCanvasWidth;
        const ratioY = this.lastCanvasHeight > 0 ? this.canvas.height / this.lastCanvasHeight : 1;
        this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x * ratioX));
        this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y * ratioY));
        this.lastCanvasWidth = this.canvas.width;
        this.lastCanvasHeight = this.canvas.height;
      }
    }

    if (this.state === "BOSSPHASE2CUTSCENE" || this.state === "BOSSPHASE3CUTSCENE") {
      this.player.invulnTimer = 1.0; // Stay completely shielded (can still move and control since we don't return early!)
    }

    if (this.player.isDead) {
      this.input.useBomb = false; // Discard queued shift/B triggers during death state!
      this.player.deadTimer -= dt;
      if (this.player.deadTimer <= 0) {
        if (this.player.hp <= 0) {
          if (this.isSandbox) {
            this.player.hp = PLAYER_MAX_HP;
          } else {
            this.state = "GAMEOVER";
            if (this.onGameOver) this.onGameOver(this.score);
            return;
          }
        }
        // Revive respawn right at the bottom center of the play screen
        this.player.isDead = false;
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height - 100;
        this.player.invulnTimer = 3.0; // 3 seconds of invulnerability
        this.player.bombs = 3;
        this.player.tilt = 0;
        if (this.onBombsChanged) this.onBombsChanged(this.player.bombs);
      }
      return;
    }

    const speed = PLAYER_MOVE_SPEED;
    if (this.input.left) this.player.x -= speed * dt;
    if (this.input.right) this.player.x += speed * dt;
    if (this.input.up) this.player.y -= speed * dt;
    if (this.input.down) this.player.y += speed * dt;

    this.player.x = Math.max(
      0,
      Math.min(this.canvas.width - this.player.width, this.player.x),
    );
    this.player.y = Math.max(
      0,
      Math.min(this.canvas.height - this.player.height, this.player.y),
    );

    if (this.player.invulnTimer > 0) {
      this.player.invulnTimer -= dt;
    }

    this.player.lastShot += dt;
    if (this.input.fire && this.player.lastShot > PLAYER_FIRE_INTERVAL) {
      this.player.lastShot = 0;
      this.firePlayerBullet();
    }

    // Update player guardian satellites
    if (this.playerSatelliteFlashes) {
      for (let i = 0; i < this.playerSatelliteFlashes.length; i++) {
        if (this.playerSatelliteFlashes[i] > 0) {
          this.playerSatelliteFlashes[i] -= dt;
        }
      }
    }

    if (!this.player.isDead && this.player.satelliteCount > 0) {
      this.playerSatelliteAngle += 3.2 * dt; // rotation rate

      this.playerSatelliteShotTimer += dt;
      if (this.playerSatelliteShotTimer > 0.22) { // Slightly faster fire rate (0.22s instead of 0.24s)
        this.playerSatelliteShotTimer = 0;
        const px = this.player.x + this.player.width / 2;
        const py = this.player.y + this.player.height / 2;
        for (let i = 0; i < this.player.satelliteCount; i++) {
          const angle = this.playerSatelliteAngle + (i / this.player.satelliteCount) * Math.PI * 2;
          const sx = px + Math.cos(angle) * 44;
          const sy = py + Math.sin(angle) * 44;

          const b = new Bullet();
          b.x = sx - 4;
          b.y = sy - 4;
          b.width = 8;
          b.height = 8;
          b.vx = Math.cos(angle - Math.PI / 2) * 55; // slight outward flare
          b.vy = -620; // fast support projectile
          b.isEnemy = false;
          b.type = "satellite_bullet";
          b.companionIndex = i;

          if (i === 0) {
            b.color = "#34d399"; // bright emerald neon green
            b.damage = 1.3;
          } else if (i === 1) {
            b.color = "#a855f7"; // purple/violet pulsar wave
            b.damage = 1.4;
          } else if (i === 2) {
            b.color = "#22d3ee"; // electric cyan homing spear
            b.damage = 1.1; // slightly lower for homing balance
          } else {
            b.color = "#f97316"; // orange fire solar flare
            b.damage = 1.8; // heavy orange blast!
            b.width = 11;
            b.height = 11;
          }

          this.bullets.push(b);
        }
        sfx.satelliteShoot(); // Delicate companion laser chirp!
      }
    }

    if (this.input.useBomb) {
      this.input.useBomb = false;
      if (!this.player.isDead) {
        this.triggerSmartBomb();
      }
    }
  }

  triggerSmartBomb() {
    if (this.player.bombs <= 0 || this.bombActive) return;
    this.player.bombs--;
    if (this.onBombsChanged) this.onBombsChanged(this.player.bombs);

    sfx.bossExplode();
    this.bombActive = true;
    this.bombRadius = 0;
    this.bossBombHitSet.clear();

    for (let i = 0; i < 60; i++) {
      const p = new Particle();
      p.x = this.player.x + this.player.width / 2;
      p.y = this.player.y + this.player.height / 2;
      const angle = (i / 60) * Math.PI * 2;
      p.vx = Math.cos(angle) * 450;
      p.vy = Math.sin(angle) * 450;
      p.color = "#a855f7";
      p.life = p.maxLife = 1.2;
      p.size = 8;
      this.particles.push(p);
    }
  }

  updateBomb(dt: number) {
    if (!this.bombActive) return;
    this.bombRadius += 1200 * dt;

    this.bullets = this.bullets.filter((b) => {
      if (b.isEnemy) {
        const dx = b.x - (this.player.x + this.player.width / 2);
        const dy = b.y - (this.player.y + this.player.height / 2);
        if (Math.hypot(dx, dy) < this.bombRadius) {
          this.spawnExplosion(b.x, b.y, "#e879f9", 2);
          return false;
        }
      }
      return true;
    });

    this.enemies.forEach((e) => {
      if (e.active) {
        const dx = e.x + e.width / 2 - (this.player.x + this.player.width / 2);
        const dy =
          e.y + e.height / 2 - (this.player.y + this.player.height / 2);
        if (Math.hypot(dx, dy) < this.bombRadius) {
          if (e.type === "boss") {
            if (!this.bossBombHitSet.has(e)) {
              this.bossBombHitSet.add(e);
              e.hp -= 50;
              sfx.bossHit();
              this.spawnExplosion(
                e.x + e.width / 2,
                e.y + e.height / 2,
                "#c084fc",
                30,
              );
            }
          } else {
            e.hp = 0;
            e.active = false;
            this.spawnExplosion(
              e.x + e.width / 2,
              e.y + e.height / 2,
              "#c084fc",
              12,
            );
            this.awardScore(100);
          }
        }
      }
    });

    // Destroy active meteors caught in the bomb radius
    this.meteors.forEach((m) => {
      if (m.active) {
        const dx = m.x - (this.player.x + this.player.width / 2);
        const dy = m.y - (this.player.y + this.player.height / 2);
        if (Math.hypot(dx, dy) < this.bombRadius + m.radius) {
          m.active = false;
          sfx.enemyExplode();
          this.awardScore(80);
          this.spawnExplosion(m.x, m.y, "#64748b", 22);
        }
      }
    });

    // Explode debris barricade covers caught in the bomb radius
    this.debrisCovers.forEach((d) => {
      if (d.active) {
        const dx = d.x + d.width / 2 - (this.player.x + this.player.width / 2);
        const dy = d.y + d.height / 2 - (this.player.y + this.player.height / 2);
        if (Math.hypot(dx, dy) < this.bombRadius + Math.max(d.width, d.height) / 2) {
          d.hp = 0;
          d.active = false;
          sfx.enemyExplode();
          this.spawnExplosion(d.x + d.width / 2, d.y + d.height / 2, "#94a3b8", 15);
        }
      }
    });

    if (this.bombRadius >= this.bombMaxRadius) {
      this.bombActive = false;
    }
  }

  firePlayerBullet() {
    sfx.shoot();
    const bx = this.player.x + this.player.width / 2;
    const by = this.player.y;
    const level = Math.min(5, this.player.powerLevel);

    if (this.player.color === "vanguard") {
      // Vanguard specialized weapons (Supercharged particle tracers with neon shadow outlines)
      if (level === 1) {
        // High-frequency single quantum driver (3.0 DMG, ultra-fast)
        this.addPlayerBlt(bx - 6, by - 4, 12, 28, 0, -1200, "#c084fc", 3.0);
      } else if (level === 2) {
        // Dual violet cosmic tracers (2.5 DMG each)
        this.addPlayerBlt(bx - 12, by - 4, 10, 26, 0, -1250, "#d946ef", 2.5);
        this.addPlayerBlt(bx + 2, by - 4, 10, 26, 0, -1250, "#d946ef", 2.5);
      } else if (level === 3) {
        // Triple neutron pulsars with center heavy white core (3.5 DMG on center!) - Focused spread
        this.addPlayerBlt(bx - 10, by - 4, 8, 24, -30, -1200, "#a855f7", 2.2);
        this.addPlayerBlt(bx - 5, by - 10, 10, 32, 0, -1350, "#ffffff", 3.5);
        this.addPlayerBlt(bx + 2, by - 4, 8, 24, 30, -1200, "#a855f7", 2.2);
      } else if (level === 4) {
        // Quad quantum lasers & dual seeker flaring orbs (2.5 - 3.2 DMG) - Focused spread
        this.addPlayerBlt(bx - 13, by, 8, 22, -45, -1150, "#22d3ee", 2.5);
        this.addPlayerBlt(bx - 8, by - 8, 10, 30, 0, -1350, "#e879f9", 3.2);
        this.addPlayerBlt(bx - 2, by - 8, 10, 30, 0, -1350, "#ffffff", 3.2);
        this.addPlayerBlt(bx + 5, by, 8, 22, 45, -1150, "#22d3ee", 2.5);
      } else if (level === 5) {
        // Vanguard Absolute Decimator: white absolute singularity core + dual sweeping side streams - Focused vertical pillar
        this.addPlayerBlt(bx - 12, by - 22, 24, 48, 0, -1550, "#ffffff", 6.0); // Devastating white-pulsing main beam
        this.addPlayerBlt(bx - 18, by - 4, 12, 32, -60, -1350, "#a855f7", 3.3); // Heavy violet energy waves
        this.addPlayerBlt(bx + 6, by - 4, 12, 32, 60, -1350, "#a855f7", 3.3);
        this.addPlayerBlt(bx - 24, by + 6, 8, 26, -100, -1250, "#06b6d4", 2.8); // Side cyan tracer wings
        this.addPlayerBlt(bx + 16, by + 6, 8, 26, 100, -1250, "#06b6d4", 2.8);
      }
      return;
    }

    if (level === 1) {
      this.addPlayerBlt(bx - 3, by, 6, 16, 0, -800, "#38bdf8");
    } else if (level === 2) {
      this.addPlayerBlt(bx - 8, by, 8, 18, 0, -850, "#22d3ee");
      this.addPlayerBlt(bx, by, 8, 18, 0, -850, "#22d3ee");
    } else if (level === 3) {
      this.addPlayerBlt(bx - 8, by, 8, 18, 0, -850, "#22d3ee");
      this.addPlayerBlt(bx, by, 8, 18, 0, -850, "#22d3ee");
      this.addPlayerBlt(bx - 14, by + 4, 6, 16, -20, -800, "#c084fc");
      this.addPlayerBlt(bx + 8, by + 4, 6, 16, 20, -800, "#c084fc");
    } else if (level === 4) {
      this.addPlayerBlt(bx - 12, by, 6, 20, 0, -900, "#ec4899");
      this.addPlayerBlt(bx - 4, by - 4, 6, 20, 0, -900, "#ec4899");
      this.addPlayerBlt(bx + 4, by - 4, 6, 20, 0, -900, "#ec4899");
      this.addPlayerBlt(bx + 12, by, 6, 20, 0, -900, "#ec4899");
      this.addPlayerBlt(bx - 16, by + 8, 6, 16, -30, -850, "#facc15");
      this.addPlayerBlt(bx + 10, by + 8, 6, 16, 30, -850, "#facc15");
    } else if (level === 5) {
      this.addPlayerBlt(bx - 6, by - 12, 12, 30, 0, -1000, "#4ade80", 2);
      this.addPlayerBlt(bx - 16, by, 8, 24, 0, -950, "#2dd4bf", 1.5);
      this.addPlayerBlt(bx + 8, by, 8, 24, 0, -950, "#2dd4bf", 1.5);
      this.addPlayerBlt(bx - 22, by + 12, 6, 20, -15, -900, "#f472b6", 1);
      this.addPlayerBlt(bx + 16, by + 12, 6, 20, 15, -900, "#f472b6", 1);
    }
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
    const b = new Bullet();
    b.x = x;
    b.y = y;
    b.width = w;
    b.height = h;
    b.vx = vx * PLAYER_BULLET_SPEED_MULT;
    b.vy = vy * PLAYER_BULLET_SPEED_MULT;
    b.color = c;
    b.damage = dmg;
    this.bullets.push(b);
  }

  updateBullets(dt: number) {
    this.tuneStoryEnemyBullets();

    this.bullets.forEach((b) => {
      if (!b.active) return;

      const prevCx = b.x + b.width / 2;
      const prevCy = b.y + b.height / 2;

      if (b.isEnemy) {
        if (b.type === "homing") {
          if (b.homingTimer > 0 && !this.player.isDead) {
            const px = this.player.x + this.player.width / 2;
            const py = this.player.y + this.player.height / 2;
            const bx = b.x + b.width / 2;
            const by = b.y + b.height / 2;
            const currentAngle = Math.atan2(b.vy, b.vx);
            const targetAngle = Math.atan2(py - by, px - bx);
            const delta = Math.atan2(
              Math.sin(targetAngle - currentAngle),
              Math.cos(targetAngle - currentAngle),
            );
            const turnStep = (b.turnRate ?? 1.5) * dt;
            const nextAngle =
              currentAngle + Math.max(-turnStep, Math.min(turnStep, delta));
            const speed = b.targetSpeed ?? (Math.hypot(b.vx, b.vy) || 360);
            b.vx += (Math.cos(nextAngle) * speed - b.vx) * 0.28;
            b.vy += (Math.sin(nextAngle) * speed - b.vy) * 0.28;
            b.homingTimer -= dt;
          }
        }

        // A. Delayed Expansion Bullet
        if (b.type === "delayed") {
          b.homingTimer -= dt;
          if (b.homingTimer > 0) {
            b.vx *= 0.95;
            b.vy *= 0.95;
          } else if (b.homingTimer > -1.0) {
            b.homingTimer = -2.0; // lock once
            const angle = Math.atan2(b.vy, b.vx);
            b.vx = Math.cos(angle) * 320;
            b.vy = Math.sin(angle) * 320;
          }
        }

        // B. Time Dilation Bullet
        if (b.type === "dilation_bullet") {
          if (b.dilationState === "flying") {
            b.vx *= 0.92;
            b.vy *= 0.92;
            if (Math.hypot(b.vx, b.vy) < 4.0) {
              b.vx = 0;
              b.vy = 0;
              b.dilationState = "frozen";
              b.dilationAge = 0;
            }
          } else if (b.dilationState === "frozen") {
            if (b.dilationAge === undefined) b.dilationAge = 0;
            b.dilationAge += dt;
            // Force-launch frozen dilation bullets that have been stationary for more than 2.0 seconds to prevent getting stuck
            if (b.dilationAge > 2.0) {
              b.dilationState = "launched";
              const dx = this.player.x + this.player.width / 2 - b.x;
              const dy = this.player.y + this.player.height / 2 - b.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 1) {
                b.vx = (dx / dist) * 440;
                b.vy = (dy / dist) * 440;
              } else {
                b.vy = 440;
              }
              b.color = "#f97316";
            }
          }
        }

        // C. Gravity Pull Core Bullet
        if (b.type === "gravity_ball") {
          // Accelerate suction vector
          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;
          const cx = b.x + b.width / 2;
          const cy = b.y + b.height / 2;
          const dx = cx - px;
          const dy = cy - py;
          const dist = Math.hypot(dx, dy);

          if (dist > 10 && dist < 320 && !this.player.isDead) {
            const pullStrength = 1950 / (dist + 40); // Gravitational pull equation
            this.player.x += (dx / dist) * pullStrength * dt;
            this.player.y += (dy / dist) * pullStrength * dt;
            if (Math.random() < 0.12) {
              this.spawnExplosion(
                this.player.x + Math.random() * this.player.width,
                this.player.y + Math.random() * this.player.height,
                "#c084fc",
                1,
              );
            }
          }

          // Emitter functionality
          if (b.gravityTimer === undefined) b.gravityTimer = 0;
          b.gravityTimer += dt;
          if (b.gravityTimer > 0.22) {
            b.gravityTimer = 0;
            const spiralAngle = b.y * 0.04;
            for (let i = 0; i < 2; i++) {
              const a = spiralAngle + i * Math.PI;
              const sub = new Bullet();
              sub.x = b.x + b.width / 2 - 4;
              sub.y = b.y + b.height / 2 - 4;
              sub.width = 8;
              sub.height = 8;
              sub.vx = Math.cos(a) * 155;
              sub.vy = Math.sin(a) * 155;
              sub.isEnemy = true;
              sub.color = "#e9d5ff"; // beautiful lavender sparks
              this.bullets.push(sub);
            }
          }
        }

        // D. Split Cluster (Cross-split and N-split)
        if (b.type === "parent_cross" || b.type === "parent_nsplit") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;

          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;
          const cx = b.x + b.width / 2;
          const cy = b.y + b.height / 2;
          const dist = Math.hypot(px - cx, py - cy);

          if (dist < 180 || b.age > 1.3) {
            b.vx = 0;
            b.vy = 0;
            if (b.fuseTimer === undefined) b.fuseTimer = 0.25;
            b.fuseTimer -= dt;

            if (b.fuseTimer <= 0) {
              b.active = false;
              if (b.type === "parent_cross") {
                const directions = [
                  0,
                  Math.PI / 4,
                  Math.PI / 2,
                  (Math.PI * 3) / 4,
                  Math.PI,
                  (Math.PI * 5) / 4,
                  (Math.PI * 3) / 2,
                  (Math.PI * 7) / 4,
                ];
                const speed = this.bossActive ? 180 : 360; // Halved in boss battles (360 -> 180)
                directions.forEach((angle) => {
                  const sub = new Bullet();
                  sub.x = cx - 4;
                  sub.y = cy - 4;
                  sub.width = 8;
                  sub.height = 8;
                  sub.vx = Math.cos(angle) * speed;
                  sub.vy = Math.sin(angle) * speed;
                  sub.isEnemy = true;
                  sub.type = "pellet";
                  sub.color = "#ef4444";
                  this.bullets.push(sub);
                });
                this.spawnExplosion(cx, cy, "#ef4444", 8);
              } else {
                const baseAngle = b.parentAngle || Math.atan2(py - cy, px - cx);
                const count = 3;
                const spread = 0.22;
                const speed = this.bossActive ? 160 : 320; // Halved in boss battles (320 -> 160)
                for (let i = -1; i <= 1; i++) {
                   const angle = baseAngle + i * spread;
                   const sub = new Bullet();
                   sub.x = cx - 4;
                   sub.y = cy - 4;
                   sub.width = 8;
                   sub.height = 8;
                   sub.vx = Math.cos(angle) * speed;
                   sub.vy = Math.sin(angle) * speed;
                   sub.isEnemy = true;
                   sub.type = "pellet";
                   sub.color = "#e11d48";
                   this.bullets.push(sub);
                }
                this.spawnExplosion(cx, cy, "#e11d48", 8);
              }
            }
          }
        }

        // E. Mine Orb
        if (b.type === "mine_orb") {
          b.vx *= 0.95;
          b.vy *= 0.95;

          if (b.age === undefined) b.age = 0;
          b.age += dt;

          if (b.fuseTimer === undefined) b.fuseTimer = 4.0;
          b.fuseTimer -= dt;

          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;
          const cx = b.x + b.width / 2;
          const cy = b.y + b.height / 2;
          const dist = Math.hypot(px - cx, py - cy);

          if (b.fuseTimer <= 0 || (dist < 75 && !this.player.isDead)) {
            b.active = false;
            const count = 18;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2;
              const sub = new Bullet();
              sub.x = cx - 4;
              sub.y = cy - 4;
              sub.width = 8;
              sub.height = 8;
              sub.vx = Math.cos(angle) * 200;
              sub.vy = Math.sin(angle) * 200;
              sub.isEnemy = true;
              sub.color = "#facc15";
              this.bullets.push(sub);
            }
            this.spawnExplosion(cx, cy, "#f59e0b", 24);
          }
        }

        // F. Boomerang
        if (b.type === "boomerang") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;

          if (b.age < 1.1) {
            // Downwards standard
          } else if (b.age >= 1.1 && b.age < 3.5) {
            b.vy = -180;
            b.vx = Math.sin(b.age * 5.5) * 160;
          } else {
            b.vy = -200;
            b.vx = 0;
          }
        }

        // G. Deceleration to Dash Paint Bullet
        if (b.type === "dash_paint_bullet") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;

          if (!b.dashTriggered) {
            b.color = Math.floor(b.age * 12) % 2 === 0 ? "#ea580c" : "#facc15";
            b.vx *= 0.9;
            b.vy *= 0.9;

            const px = this.player.x + this.player.width / 2;
            const py = this.player.y + this.player.height / 2;
            const bx = b.x + b.width / 2;
            const by = b.y + b.height / 2;

            const alignedX = Math.abs(px - bx) < 18;
            const alignedY = Math.abs(py - by) < 18;

            if ((alignedX || alignedY || b.age > 1.6) && !this.player.isDead) {
              b.dashTriggered = true;
              const dx = px - bx;
              const dy = py - by;
              const dist = Math.hypot(dx, dy);
              if (dist > 1) {
                b.vx = (dx / dist) * 580;
                b.vy = (dy / dist) * 580;
              } else {
                b.vy = 400;
              }
              b.color = "#ea580c";
              this.spawnExplosion(bx, by, "#ea580c", 4);
            }
          }
        }

        // H. Wall-Bounce Ricochet
        if (b.type === "ricochet") {
          if (b.bounceCount === undefined) b.bounceCount = 0;

          if (b.bounceCount < 3) {
            if (b.x < 0) {
              b.vx = -b.vx;
              b.x = 0;
              b.bounceCount++;
              this.spawnExplosion(b.x, b.y + b.height / 2, "#fbbf24", 2);
            } else if (b.x + b.width > this.canvas.width) {
              b.vx = -b.vx;
              b.x = this.canvas.width - b.width;
              b.bounceCount++;
              this.spawnExplosion(
                b.x + b.width,
                b.y + b.height / 2,
                "#fbbf24",
                2,
              );
            }

            if (b.y < 0) {
              b.vy = -b.vy;
              b.y = 0;
              b.bounceCount++;
              this.spawnExplosion(b.x + b.width / 2, b.y, "#fbbf24", 2);
            }
          }
        }

        // I. Gravity Singularity Pull Vortex
        if (b.type === "gravity_singularity") {
          // Detonation timer for Phase 18 singularities
          if (b.fuseTimer !== undefined) {
            b.fuseTimer -= dt;
            if (b.fuseTimer <= 0) {
              b.active = false;
              // DETONATION! Spawn a ring of 14 bullets
              const cx = b.x + b.width / 2;
              const cy = b.y + b.height / 2;
              const bulletCount = 14;
              for (let i = 0; i < bulletCount; i++) {
                const angle = (i / bulletCount) * Math.PI * 2;
                const sub = new Bullet();
                sub.x = cx - 5;
                sub.y = cy - 5;
                sub.width = 10;
                sub.height = 10;
                sub.vx = Math.cos(angle) * 260;
                sub.vy = Math.sin(angle) * 260;
                sub.isEnemy = true;
                sub.type = "pellet";
                sub.color = "#d946ef"; // vibrant magenta pellets
                this.bullets.push(sub);
              }
              this.spawnExplosion(cx, cy, "#d946ef", 12);
              sfx.bossPatternFire();
            }
          }

          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;
          const bx = b.x + b.width / 2;
          const by = b.y + b.height / 2;
          const dx = bx - px;
          const dy = by - py;
          const dist = Math.hypot(dx, dy);

          if (dist > 10 && dist < 260 && !this.player.isDead) {
            const pullStrength = 125 * (1 - dist / 260);
            this.player.x += (dx / dist) * pullStrength * dt;
            this.player.y += (dy / dist) * pullStrength * dt;
            if (Math.random() < 0.1) {
              this.spawnExplosion(
                this.player.x + Math.random() * this.player.width,
                this.player.y + Math.random() * this.player.height,
                "#c084fc",
                1,
              );
            }
          }
        }

        // J. Splitting Pellet
        if (b.type === "splitting_pellet") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;

          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;
          const bx = b.x + b.width / 2;
          const by = b.y + b.height / 2;
          const dist = Math.hypot(px - bx, py - by);

          if ((dist < 150 || b.age > 1.8) && !this.player.isDead) {
            b.active = false;
            sfx.bossPatternFire();
            const count = 8;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2 + b.age;
              const sub = new Bullet();
              sub.x = bx - 4;
              sub.y = by - 4;
              sub.width = 8;
              sub.height = 8;
              sub.vx = Math.cos(angle) * 230;
              sub.vy = Math.sin(angle) * 230;
              sub.isEnemy = true;
              sub.color = "#34d399";
              sub.type = "pellet";
              this.bullets.push(sub);
            }
            this.spawnExplosion(bx, by, "#34d399", 5);
          }
        }

        // K. Reverse Gravity Bullet
        if (b.type === "reverse_gravity_bullet") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;
          if (b.age < 1.0) {
            b.vy -= 180 * dt; // decel downwards
          } else {
            b.vy -= 240 * dt; // accelerate back upwards!
          }
        }

        // L. Colliding Orb
        if (b.type === "colliding_orb") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;

          // bounce off left/right walls
          if (b.x < 0) {
            b.vx = Math.abs(b.vx);
            b.x = 0;
            sfx.bossPatternFire();
          } else if (b.x + b.width > this.canvas.width) {
            b.vx = -Math.abs(b.vx);
            b.x = this.canvas.width - b.width;
            sfx.bossPatternFire();
          }

          // spawn small bullet sparks periodically
          b.shootTimer = (b.shootTimer || 0) + dt;
          if (b.shootTimer > 0.15) {
            b.shootTimer = 0;
            const sub = new Bullet();
            const bx = b.x + b.width / 2;
            const by = b.y + b.height / 2;
            sub.x = bx - 4;
            sub.y = by - 4;
            sub.width = 8;
            sub.height = 8;
            sub.vx = (Math.random() - 0.5) * 160;
            sub.vy = 120 + Math.random() * 80;
            sub.isEnemy = true;
            sub.color = "#f472b6";
            this.bullets.push(sub);
          }
        }

        if (b.type === "recall_shard") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;
          if (b.fuseTimer === undefined) b.fuseTimer = 0;
          b.fuseTimer -= dt;
          const postStopAge = -b.fuseTimer;

          if (b.fuseTimer > 0) {
            // Keep the original speed and direction during the 7 second spread phase.
          } else if (postStopAge < 1.0) {
            const brake = Math.pow(0.045, dt);
            b.vx *= brake;
            b.vy *= brake;
          } else if (postStopAge < 2.0) {
            b.vx = 0;
            b.vy = 0;
          } else if (this.bossEntity) {
            const tx = this.bossEntity.x + this.bossEntity.width / 2;
            const ty = this.bossEntity.y + this.bossEntity.height / 2;
            const bx = b.x + b.width / 2;
            const by = b.y + b.height / 2;
            const dx = tx - bx;
            const dy = ty - by;
            const dist = Math.hypot(dx, dy) || 1;
            const targetVx = (dx / dist) * 320;
            const targetVy = (dy / dist) * 320;
            b.vx += (targetVx - b.vx) * 0.065;
            b.vy += (targetVy - b.vy) * 0.065;
            if (dist < 34) {
              b.active = false;
              this.spawnExplosion(tx, ty, "#67e8f9", 3);
            }
          }

          if (b.age > 16.5) b.active = false;
        }

        if (b.type === "void_mine") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;
          b.vx *= 0.94;
          b.vy *= 0.94;
          if (b.fuseTimer === undefined) b.fuseTimer = 0.75;
          b.fuseTimer -= dt;

          const bx = b.x + b.width / 2;
          const by = b.y + b.height / 2;
          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;
          const dist = Math.hypot(px - bx, py - by);
          if (b.fuseTimer <= 0 || dist < 70) {
            b.active = false;
            this.spawnExplosion(bx, by, "#14b8a6", 12);
            if (dist < 92) this.hitPlayerFromBossHazard();

            for (let i = 0; i < 5; i++) {
              const angle = (i / 5) * Math.PI * 2 + b.age * 2.0;
              const shard = new Bullet();
              shard.x = bx - 5;
              shard.y = by - 5;
              shard.width = 10;
              shard.height = 22;
              shard.vx = Math.cos(angle) * 260;
              shard.vy = Math.sin(angle) * 260;
              shard.isEnemy = true;
              shard.type = "needle";
              shard.color = i % 2 === 0 ? "#2dd4bf" : "#a7f3d0";
              this.bullets.push(shard);
            }
          }
        }
      }

      if (!b.isEnemy && b.type === "satellite_bullet") {
        if (b.companionIndex === 1) {
          if (b.age === undefined) b.age = 0;
          b.age += dt;
          b.vx = Math.sin(b.age * 22) * 220;
        } else if (b.companionIndex === 2) {
          let nearestEnemy: Entity | null = null;
          let minDist = 380;
          this.enemies.forEach((e) => {
            if (e.hp > 0 && e.y < this.canvas.height) {
              const d = Math.hypot(e.x + e.width / 2 - b.x, e.y + e.height / 2 - b.y);
              if (d < minDist) {
                minDist = d;
                nearestEnemy = e;
              }
            }
          });
          if (nearestEnemy) {
            const enemy: Entity = nearestEnemy;
            const targetX = enemy.x + enemy.width / 2;
            const targetY = enemy.y + enemy.height / 2;
            const dx = targetX - b.x;
            const dy = targetY - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 10) {
              const targetVx = (dx / dist) * 650;
              const targetVy = (dy / dist) * 650;
              b.vx += (targetVx - b.vx) * 0.14;
              b.vy += (targetVy - b.vy) * 0.14;
            }
          }
        } else if (b.companionIndex === 3) {
          if (Math.random() < 0.28) {
            const p = new Particle();
            p.x = b.x + b.width / 2;
            p.y = b.y + b.height / 2;
            p.vx = (Math.random() - 0.5) * 60;
            p.vy = (Math.random() - 0.5) * 60 + 60;
            p.color = "#f97316";
            p.size = Math.random() * 3.5 + 1.5;
            p.life = p.maxLife = 0.4;
            this.particles.push(p);
          }
        }
      }

      const speedMult = b.isEnemy ? (this.isStoryMode() ? 0.62 : 0.8) : 1.0;
      b.x += b.vx * speedMult * dt;
      b.y += b.vy * speedMult * dt;

      if (b.active && b.isEnemy && b.type === "electric_missile") {
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        this.bossElectricTrails.push({
          x1: prevCx,
          y1: prevCy,
          x2: cx,
          y2: cy,
          life: 0.95,
          maxLife: 0.95,
          width: 24,
        });
      }

      if (b.active && b.isEnemy && b.type === "tail_rocket") {
        b.shootTimer = (b.shootTimer || 0) + dt;
        if (b.shootTimer > 0.11) {
          b.shootTimer = 0;
          this.bossTailMines.push({
            x: prevCx,
            y: prevCy,
            radius: 20,
            age: 0,
            warnTime: 0.34 + Math.random() * 0.18,
            fireTime: 0.12,
          });
        }
      }

      // Crystal sparkling residual particles (연기나 빛가루 잔상)
      if (b.active && b.isEnemy && (b.type === "crystal" || b.type === "ricochet")) {
        if (Math.random() < 0.28) {
          const p = new Particle();
          p.x = b.x + b.width / 2;
          p.y = b.y + b.height / 2;
          p.width = Math.random() * 3 + 2;
          p.height = p.width;
          const a = Math.random() * Math.PI * 2;
          const speed = Math.random() * 25 + 5;
          p.vx = -b.vx * 0.12 + Math.cos(a) * speed;
          p.vy = -b.vy * 0.12 + Math.sin(a) * speed;
          p.color = Math.random() < 0.5 ? "#f43f5e" : "#ef4444";
          p.size = p.width;
          p.maxLife = Math.random() * 0.35 + 0.15;
          p.life = p.maxLife;
          this.particles.push(p);
        }
      }

      if (
        b.y < -100 ||
        b.y > this.canvas.height + 100 ||
        b.x < (b.type === "recall_shard" ? -260 : -100) ||
        b.x > this.canvas.width + (b.type === "recall_shard" ? 260 : 100)
      ) {
        b.active = false;
      }
    });
    this.tuneStoryEnemyBullets();
    this.bullets = this.bullets.filter((b) => b.active);
  }

  updateEnemies(dt: number) {
    if (this.state === "BOSSPHASE2CUTSCENE" || this.state === "BOSSPHASE3CUTSCENE") {
      this.enemies.forEach((e) => {
        if (e.type !== "boss") {
          e.vy = -450;
          if (e.vx === 0) {
            e.vx = e.x + e.width / 2 < this.canvas.width / 2 ? -180 : 180;
          } else {
            e.vx = e.vx < 0 ? -260 : 260;
          }
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          if (e.y < -120 || e.x < -100 || e.x > this.canvas.width + 100) {
            e.active = false;
          }
          e.lastShot = -999;
          e.shootTimer = 0;
        } else {
          e.lastShot = -999;
          e.shootTimer = 0;
        }
      });
      this.enemies = this.enemies.filter((e) => e.active);
      return;
    }

    if (this.clearingForBoss) {
      this.enemies.forEach((e) => {
        if (e.type !== "boss") {
          e.vy = -450;
          if (e.vx === 0) {
            e.vx = e.x + e.width / 2 < this.canvas.width / 2 ? -180 : 180;
          } else {
            e.vx = e.vx < 0 ? -260 : 260;
          }
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          if (e.y < -120 || e.x < -100 || e.x > this.canvas.width + 100) {
            e.active = false;
          }
          e.lastShot = -999;
        }
      });

      this.enemies.forEach((e) => {
        if (!e.active && e.type === "satellite_shield") {
          e.satellites.forEach((b) => {
            b.active = false;
          });
          e.satellites = [];
        }
      });
      this.enemies = this.enemies.filter((e) => e.active);

      if (this.enemies.length === 0) {
        this.clearingForBoss = false;
        this.bossActive = true;
        this.state = "BOSSCUTSCENE";
        this.cutsceneTimer = 3.5;
        if (this.onCutsceneChange) this.onCutsceneChange(true);

        const b = new Enemy();
        b.type = "boss";
        const bossTier = Math.min(MAX_CHAPTER, this.stage);
        sfx.startBgmForPhase(bossTier);
        b.width = bossTier >= 4 ? 220 : bossTier === 3 ? 200 : bossTier === 2 ? 150 : 120;
        b.height = bossTier >= 4 ? 165 : bossTier === 3 ? 150 : bossTier === 2 ? 110 : 90;
        b.x = this.canvas.width / 2 - b.width / 2;
        b.y = -120;
        b.vx = this.isStoryMode() ? 90 : 150;
        b.vy = this.isStoryMode() ? 45 : 60;
        b.hp = this.getBossMaxHp(bossTier);
        b.phase = 0;
        this.bossPhase2Active = bossTier === 2;
        this.bossPhase3Active = bossTier >= 3;
        this.bossPhase2Triggered = bossTier >= 2;
        this.bossPhase3Triggered = bossTier >= 3;
        b.leftTurretHp = bossTier >= 4 ? 220 : bossTier === 3 ? 150 : bossTier === 2 ? 70 : 45;
        b.rightTurretHp = bossTier >= 4 ? 220 : bossTier === 3 ? 150 : bossTier === 2 ? 70 : 45;
        if (this.isStoryMode()) {
          b.leftTurretActive = false;
          b.rightTurretActive = false;
          this.storyStageTimer = 0;
        }
        this.enemies.push(b);
        this.bossEntity = b;
      }
      return;
    }

    if (!this.isStoryMode() && this.bossActive && this.bossEntity) {
      if (this.bossEntity.phase >= 1) {
        // Skip summoning during very first intro moment
        if (!this.player.isDead) {
          this.squadTimer -= dt;
        }
        if (this.squadTimer <= 0) {
          this.squadTimer = Math.random() * 3 + 6.0; // every 6-9s
          this.summonBossSquad();
        }
      }
    }

    this.enemies.forEach((e) => {
      if (e.counterTimer && e.counterTimer > 0) {
        e.counterTimer -= dt;
      }

      // Firing increment (prevent shooting when player is dead)
      if (this.player.isDead) {
        e.lastShot = 0;
        e.shootTimer = 0;
      } else {
        e.lastShot += dt * (this.isStoryMode() ? (e.type === "boss" ? 0.68 : 0.52) : 1);
      }

      if (e.type === "boss") {
        // Ensure the boss never gets stuck horizontally with vx = 0
        if (e.vx === 0) {
          e.vx = Math.random() < 0.5 ? -150 : 150;
        }

        // Groggy/Stun state tracking
        if (e.bossStunTimer > 0) {
          e.bossStunTimer -= dt;
          if (e.bossStunTimer <= 0) {
            // Cascade-launch any remaining frozen bullets on stun recovery
            this.bullets.forEach((b) => {
              if (b.isEnemy && b.type === "dilation_bullet" && b.dilationState === "frozen") {
                b.dilationState = "launched";
                const dx = this.player.x + this.player.width / 2 - b.x;
                const dy = this.player.y + this.player.height / 2 - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 1) {
                  b.vx = (dx / dist) * 440;
                  b.vy = (dy / dist) * 440;
                } else {
                  b.vy = 440;
                }
                b.color = "#f97316";
              }
            });

            this.resetBossPattern(e);
            this.assignNextBossPhase(e);
          }
          if (Math.random() < 0.25) {
            this.spawnExplosion(
              e.x + Math.random() * e.width,
              e.y + Math.random() * e.height,
              "#eab308",
              2,
            );
          }
          return;
        }

        e.patternTimer += dt;

        // Complex AI state machine
        let canTransition = true;
        if (e.phase === 0) {
          canTransition = false;
        }
        if (e.patternTimer > e.phaseDuration) {
          if (e.phase === 1) {
            if (e.patternTimer < 3.0) canTransition = false;
          } else if (e.phase === 2) {
            if (e.rapidFireCount % 20 !== 0) canTransition = false;
          } else if (e.phase === 8) {
            const cycle = e.patternTimer % 1.8;
            if (cycle > 0.15 && cycle < 1.65) canTransition = false;
          } else if (e.phase === 12) {
            const cycle = (e.shootTimer || 0) % 2.8;
            if (cycle > 0.1 && cycle < 2.6) canTransition = false;
          } else if (e.phase === 13) {
            if (e.patternTimer < 2.7) canTransition = false;
          } else if (e.phase === 14) {
            const cycle = (e.shootTimer || 0) % 2.8;
            if (cycle > 0.1 && cycle < 2.6) canTransition = false;
          } else if (e.phase === 17) {
            const cycle = (e.shootTimer || 0) % 2.8;
            if (cycle > 0.1 && cycle < 2.7) canTransition = false;
          } else if (e.phase === 19) {
            const cycle = (e.shootTimer || 0) % 4.2;
            if (cycle > 0.15 && cycle < 3.8) canTransition = false;
          } else if (e.phase === 20) {
            if (e.burstCount < 10 || this.bossElectricTrails.length > 0) canTransition = false;
          } else if (e.phase === 21) {
            if (this.bossSuicideDrones.length > 0) canTransition = false;
          } else if (e.phase === 23) {
            if (this.bossGridLasers.length > 0) canTransition = false;
          } else if (e.phase === 24) {
            if (this.bossDashState !== null || e.rapidFireCount < e.spawnPoint) canTransition = false;
          } else if (e.phase === 47) {
            if (this.bossSafeZoneBlasts.length > 0) canTransition = false;
          } else if (e.phase === 49) {
            if (this.bossAfterimageSlashes.length > 0 || e.rapidFireCount < e.spawnPoint) canTransition = false;
          } else if (e.phase === 50) {
            if (this.bossCompressionField !== null) canTransition = false;
          } else if (e.phase === 32) {
            if (this.bossCompressionField !== null) canTransition = false;
          } else if (e.phase === 44) {
            if (this.bullets.some((b) => b.active && b.isEnemy && b.type === "recall_shard")) canTransition = false;
          } else if (e.phase === 28) {
            const cycleLength = 4.6;
            const completedCycles = Math.floor((e.shootTimer || 0) / cycleLength);
            const cycle = (e.shootTimer || 0) % cycleLength;
            if (completedCycles < e.spawnPoint || cycle > 0.1 && cycle < 3.35) canTransition = false;
          } else if (e.phase === 51) {
            if (this.bossEdgeStrikers.length > 0) canTransition = false;
          } else if (e.phase === 52) {
            if (this.bossMazeState !== null) canTransition = false;
          }
        }

        if (e.patternTimer > e.phaseDuration && canTransition) {
          // Cascade-launch any remaining frozen bullets on pattern transition
          this.bullets.forEach((b) => {
            if (b.isEnemy && b.type === "dilation_bullet" && b.dilationState === "frozen") {
              b.dilationState = "launched";
              const dx = this.player.x + this.player.width / 2 - b.x;
              const dy = this.player.y + this.player.height / 2 - b.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 1) {
                b.vx = (dx / dist) * 440;
                b.vy = (dy / dist) * 440;
              } else {
                b.vy = 440;
              }
              b.color = "#f97316";
            }
          });

          this.resetBossPattern(e);
          this.assignNextBossPhase(e);
        }

        if (e.phase === 0) {
          // intro done, chilling momentarily
        } else if (e.phase === 1) {
          // Dash forward
          if (e.patternTimer < 1.0) e.y += 200 * dt;
          else if (e.patternTimer < 2.0) {
            /* hold */
          } else if (e.patternTimer < 3.0) {
            e.y -= 200 * dt;
          } else {
            e.y = Math.max(80, e.y - 100 * dt);
          }

          // Fire 360 at peak
          if (
            e.patternTimer > 1.2 &&
            e.patternTimer < 2.0 &&
            e.lastShot > 0.4
          ) {
            e.lastShot = 0;
            this.fireBoss360Burst(e);
          }
        } else if (e.phase === 2) {
          // Rapid fire barrage
          e.x += e.vx * 0.5 * dt; // slow drift
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          if (e.lastShot > 0.2 && e.rapidFireCount < 100) {
            // machine gun
            e.lastShot = 0;
            e.rapidFireCount++;
            this.fireBossRapid(e);
          }
        } else if (e.phase === 3) {
          // Normal horizontal and combos
          e.x += e.vx * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          if (e.lastShot > 0.6) {
            e.lastShot = 0;
            this.triggerBossBulletCombos(e);
          }
        } else if (e.phase === 4) {
          // Spiral pattern
          e.x += e.vx * 0.2 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;
          if (e.lastShot > 0.1) {
            e.lastShot = 0;
            e.rapidFireCount++;
            const a = e.rapidFireCount * 0.4;
            const blt = new Bullet();
            blt.x = e.x + e.width / 2;
            blt.y = e.y + e.height / 2;
            blt.vx = Math.cos(a) * 200;
            blt.vy = Math.sin(a) * 200;
            blt.isEnemy = true;
            blt.color = "#10b981";
            blt.width = 14;
            blt.height = 14;
            this.bullets.push(blt);
          }
        } else if (e.phase === 5) {
          // Waving arcs
          e.x += e.vx * 0.8 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;
          if (e.lastShot > 0.6) {
            e.lastShot = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height;
            for (let i = 0; i < 7; i++) {
              const a =
                Math.PI / 2 +
                (i - 3) * 0.2 +
                Math.sin(performance.now() * 0.005) * 0.2;
              const blt = new Bullet();
              blt.x = cx;
              blt.y = cy;
              blt.vx = Math.cos(a) * 250;
              blt.vy = Math.sin(a) * 250;
              blt.isEnemy = true;
              blt.color = "#38bdf8";
              blt.width = 14;
              blt.height = 14;
              this.bullets.push(blt);
            }
          }
        } else if (e.phase === 6) {
          // Double Cross Target Shotgun
          e.x += e.vx * 0.5 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;
          if (e.lastShot > 1.2) {
            e.lastShot = 0;
            const tx = this.player.isDead
              ? this.canvas.width / 2
              : this.player.x + this.player.width / 2;
            const ty = this.player.isDead
              ? this.canvas.height - 100
              : this.player.y + this.player.height / 2;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height / 2;
            const aToPlayer = Math.atan2(ty - cy, tx - cx);
            for (let i = 0; i < 7; i++) {
              const a = aToPlayer + (i - 3) * 0.15;
              const blt = new Bullet();
              blt.x = cx;
              blt.y = cy;
              blt.vx = Math.cos(a) * 350;
              blt.vy = Math.sin(a) * 350;
              blt.isEnemy = true;
              blt.color = "#f43f5e";
              blt.width = 16;
              blt.height = 16;
              this.bullets.push(blt);
            }
          }
        } else if (e.phase === 7) {
          // Boss Line Wall Pattern (공간 제약형 / 틈새 벽 생성)
          e.x += e.vx * 0.3 * dt;
          if (e.x < 20 || e.x > this.canvas.width - e.width - 20) e.vx *= -1;

          if (e.lastShot > 1.3) {
            e.lastShot = 0;
            const cy = e.y + e.height + 6;
            const spacing = 28;
            const countOfBullets = Math.floor(this.canvas.width / spacing);
            const gapIndex1 =
              Math.floor(Math.random() * (countOfBullets - 4)) + 1;
            const gapIndex2 =
              (gapIndex1 + Math.floor(countOfBullets / 2)) %
              (countOfBullets - 2);

            for (let i = 0; i < countOfBullets; i++) {
              if (i >= gapIndex1 && i <= gapIndex1 + 1) continue; // Gap 1
              if (i >= gapIndex2 && i <= gapIndex2 + 1) continue; // Gap 2

              const bx = 12 + i * spacing;
              const blt = new Bullet();
              blt.x = bx;
              blt.y = cy;
              blt.width = 12;
              blt.height = 12;
              blt.vx = 0;
              blt.vy = 240; // falls straight down
              blt.isEnemy = true;
              blt.color = "#eab308";
              this.bullets.push(blt);
            }
          }
        } else if (e.phase === 8) {
          // Boss Delayed Expansion Homing Charges (시간차 공격 패턴)
          e.x += e.vx * 0.25 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          const cycle = e.patternTimer % 1.8;
          if (cycle < 0.65 && e.lastShot > 0.16) {
            e.lastShot = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height + 15;
            const count = 6;
            for (let i = 0; i < count; i++) {
              const a = (i / count) * Math.PI * 2 + cycle * 2.5;
              const blt = new Bullet();
              blt.x = cx + Math.cos(a) * 30;
              blt.y = cy + Math.sin(a) * 30;
              blt.width = 12;
              blt.height = 12;
              blt.vx = Math.cos(a) * 55;
              blt.vy = Math.sin(a) * 55;
              blt.isEnemy = true;
              blt.type = "delayed";
              blt.homingTimer = 0.85; // float around before launching
              blt.color = "#ec4899";
              this.bullets.push(blt);
            }
          }
        } else if (e.phase === 9) {
          // Boss Spiral Blossom (수학적 원형 나선형 회전 탄막)
          e.x += e.vx * 0.15 * dt;
          if (e.x < 20 || e.x > this.canvas.width - e.width - 20) e.vx *= -1;

          if (e.lastShot > 0.08) {
            e.lastShot = 0;
            e.rapidFireCount++;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height / 2;

            const baseAngle = e.rapidFireCount * 0.16;
            for (let arm = 0; arm < 3; arm++) {
              const a = baseAngle + (arm * Math.PI * 2) / 3;
              const blt = new Bullet();
              blt.x = cx;
              blt.y = cy;
              blt.width = 12;
              blt.height = 12;
              blt.vx = Math.cos(a) * 240;
              blt.vy = Math.sin(a) * 240;
              blt.isEnemy = true;
              blt.color = "#10b981";
              this.bullets.push(blt);
            }
          }
        } else if (e.phase === 10) {
          // ① Blooming Vortex Resonance (환상향의 개화)
          e.x += e.vx * 0.12 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          if (e.lastShot > 0.08) {
            e.lastShot = 0;
            e.rapidFireCount++;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height / 2;

            const omega = 0.22;
            const angle1 = e.rapidFireCount * omega;
            const angle2 = -e.rapidFireCount * omega;

            const arms = 3;
            for (let i = 0; i < arms; i++) {
              const baseOffset = (i * Math.PI * 2) / arms;

              // Layer 1 (omega * t)
              const b1 = new Bullet();
              b1.x = cx - 6;
              b1.y = cy - 6;
              b1.width = 12;
              b1.height = 12;
              b1.vx = Math.cos(angle1 + baseOffset) * 220;
              b1.vy = Math.sin(angle1 + baseOffset) * 220;
              b1.isEnemy = true;
              b1.color = "#3b82f6";
              this.bullets.push(b1);

              // Layer 2 (-omega * t)
              const b2 = new Bullet();
              b2.x = cx - 6;
              b2.y = cy - 6;
              b2.width = 12;
              b2.height = 12;
              b2.vx = Math.cos(angle2 + baseOffset) * 220;
              b2.vy = Math.sin(angle2 + baseOffset) * 220;
              b2.isEnemy = true;
              b2.color = "#f43f5e";
              this.bullets.push(b2);
            }
          }
        } else if (e.phase === 11) {
          // ② Gravitational Pull & Snake (중력 붕괴 및 가속 스네이크)
          e.x += e.vx * 0.35 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          if (e.lastShot > 1.8) {
            e.lastShot = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height;

            const b = new Bullet();
            b.x = cx - 20;
            b.y = cy - 20;
            b.width = 40;
            b.height = 40; // extra large!
            b.vx = (this.player.x - cx) * 0.1;
            b.vy = 80;
            b.isEnemy = true;
            b.type = "gravity_ball";
            b.color = "#c084fc";
            this.bullets.push(b);

            sfx.bossHit();
          }
        } else if (e.phase === 12) {
          // ③ Spatial Grid Laser & Cross-hairs (공간 절단 레이저 & 교차 격자)
          e.x += e.vx * 0.05 * dt;

          if (e.shootTimer === undefined) e.shootTimer = 0;
          e.shootTimer += dt;

          const cycle = e.shootTimer % 2.8;
          this.playBossLaserSoundOncePerCycle(e, e.shootTimer, 2.8, 1.8);

          let xPositions: number[] = [];
          let yPositions: number[] = [];

          // Parts-destruction logic: laser severity drops when turrets break!
          if (e.leftTurretActive && e.rightTurretActive) {
            xPositions = [
              this.canvas.width * 0.25,
              this.canvas.width * 0.5,
              this.canvas.width * 0.75,
            ];
            yPositions = [
              this.canvas.height * 0.25,
              this.canvas.height * 0.5,
              this.canvas.height * 0.75,
            ];
          } else if (e.leftTurretActive || e.rightTurretActive) {
            xPositions = [this.canvas.width * 0.5];
            yPositions = [this.canvas.height * 0.5];
          } else {
            // BOTH wings destroyed => NO lasers! (Complete tactical relief)
            xPositions = [];
            yPositions = [];
          }

          if (cycle >= 1.8 && cycle < 2.5) {
            const px = this.player.x + this.player.width / 2;
            const py = this.player.y + this.player.height / 2;

            let hitByLaser = false;
            const halfWidth = 14;

            xPositions.forEach((lx) => {
              if (Math.abs(px - lx) < this.player.hitWidth! / 2 + halfWidth) {
                hitByLaser = true;
              }
            });
            yPositions.forEach((ly) => {
              if (Math.abs(py - ly) < this.player.hitHeight! / 2 + halfWidth) {
                hitByLaser = true;
              }
            });

            if (
              hitByLaser &&
              this.player.invulnTimer <= 0 &&
              !this.player.isDead
            ) {
              this.triggerPlayerHit();
            }
          }

          if (e.lastShot > 0.85) {
            e.lastShot = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height;
            const tx = this.player.x + this.player.width / 2;
            const ty = this.player.y + this.player.height / 2;
            const targetAngle = Math.atan2(ty - cy, tx - cx);

            for (let i = -1; i <= 1; i++) {
              const a = targetAngle + i * 0.18;
              const b = new Bullet();
              b.x = cx - 4;
              b.y = cy - 4;
              b.width = 8;
              b.height = 8;
              b.vx = Math.cos(a) * 180;
              b.vy = Math.sin(a) * 180;
              b.isEnemy = true;
              b.color = "#ef4444";
              this.bullets.push(b);
            }
          }
        } else if (e.phase === 13) {
          // ④ Time-Dilation Paradox (시간 왜곡 탄막)
          e.x += e.vx * 0.1 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          const timeInPhase = e.patternTimer;

          // Firing rings (0s to 1.6s)
          if (timeInPhase < 1.6 && e.lastShot > 0.12) {
            e.lastShot = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height / 1.5;

            const count = 12;
            const baseOffset = e.rapidFireCount * 0.18;
            e.rapidFireCount++;

            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2 + baseOffset;
              const b = new Bullet();
              b.x = cx - 5;
              b.y = cy - 5;
              b.width = 10;
              b.height = 10;
              b.vx = Math.cos(angle) * 380;
              b.vy = Math.sin(angle) * 380;
              b.isEnemy = true;
              b.type = "dilation_bullet";
              b.dilationState = "flying";
              b.dilationAge = 0;
              b.color = "#22d3ee";
              this.bullets.push(b);
            }
          }

          // Acceleration paradox snap trigger
          if (timeInPhase >= 2.5) {
            let launchedCount = 0;
            this.bullets.forEach((b) => {
              if (
                b.isEnemy &&
                b.type === "dilation_bullet" &&
                b.dilationState === "frozen"
              ) {
                b.dilationState = "launched";
                const dx = this.player.x + this.player.width / 2 - b.x;
                const dy = this.player.y + this.player.height / 2 - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 1) {
                  b.vx = (dx / dist) * 440;
                  b.vy = (dy / dist) * 440;
                }
                b.color = "#f97316";
                launchedCount++;
              }
            });
            if (launchedCount > 0) {
              if (timeInPhase < 2.7) {
                sfx.bossPatternFire();
                this.spawnExplosion(
                  e.x + e.width / 2,
                  e.y + e.height / 2,
                  "#f97316",
                  30,
                );
              } else {
                sfx.hit();
                this.spawnExplosion(
                  e.x + e.width / 2,
                  e.y + e.height / 2,
                  "#f97316",
                  6,
                );
              }
            }
          }
        } else if (e.phase === 14) {
          // Overdrive Phase 14: Center Grid Lasers and Dilation singularity (조준탄의 변칙화 & 유언탄 탑재)
          e.x += e.vx * 0.08 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          if (e.shootTimer === undefined) e.shootTimer = 0;
          e.shootTimer += dt;

          const cycle = e.shootTimer % 2.8;
          this.playBossLaserSoundOncePerCycle(e, e.shootTimer, 2.8, 1.8);
          const cycleIndex = Math.floor(e.shootTimer / 2.8);

          if (e.lastCycleIndex !== cycleIndex || !e.gridLasersX || !e.gridLasersY) {
            e.lastCycleIndex = cycleIndex;
            // Generate 3 randomized laser positions that don't overlap (distance >= 100 px)
            const generatePositions = (maxVal: number) => {
              const list: number[] = [];
              let attempts = 0;
              while (list.length < 3 && attempts < 200) {
                attempts++;
                const pos = Math.random() * (maxVal - 165) + 80;
                if (list.every(p => Math.abs(p - pos) >= 100)) {
                  list.push(pos);
                }
              }
              // Direct fallback if it gets stuck
              while (list.length < 3) {
                list.push(Math.random() * (maxVal - 165) + 80);
              }
              return list.sort((a, b) => a - b);
            };
            e.gridLasersX = generatePositions(this.canvas.width);
            e.gridLasersY = generatePositions(this.canvas.height);
          }

          const xPositions = e.gridLasersX;
          const yPositions = e.gridLasersY;

          if (cycle >= 1.8 && cycle < 2.5) {
            // Check laser collisions on the player
            const px = this.player.x + this.player.width / 2;
            const py = this.player.y + this.player.height / 2;

            let hitByLaser = false;
            const halfWidth = 14;

            xPositions.forEach((lx) => {
              if (Math.abs(px - lx) < this.player.hitWidth! / 2 + halfWidth) {
                hitByLaser = true;
              }
            });
            yPositions.forEach((ly) => {
              if (Math.abs(py - ly) < this.player.hitHeight! / 2 + halfWidth) {
                hitByLaser = true;
              }
            });

            if (
              hitByLaser &&
              this.player.invulnTimer <= 0 &&
              !this.player.isDead
            ) {
              this.triggerPlayerHit();
            }
          }

          // Firing heavy singularity bullets frequently with varied split timing.
          if (e.lastShot > 0.52) {
            e.lastShot = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height;
 
            // Target player with splitting parent cross bullets
            const px = this.player.x + this.player.width / 2;
            const py = this.player.y + this.player.height / 2;
            const angleRef = Math.atan2(py - cy, px - cx);
 
            const b = new Bullet();
            b.x = cx - 12;
            b.y = cy - 12;
            b.width = 24;
            b.height = 24;
            b.vx = Math.cos(angleRef) * 230;
            b.vy = Math.sin(angleRef) * 230;
            b.isEnemy = true;
            b.type = "parent_cross"; // Splits on proxy
            b.color = "#ef4444";
            b.parentAngle = angleRef;
            b.age = 0;
            b.fuseTimer = 0.35 + Math.random() * 0.95;
            this.bullets.push(b);

            if (Math.random() < 0.45) {
              const r = new Bullet();
              r.x = cx - 7;
              r.y = cy - 7;
              r.width = 14;
              r.height = 14;
              const offset = (Math.random() - 0.5) * 0.55;
              r.vx = Math.cos(angleRef + offset) * 320;
              r.vy = Math.sin(angleRef + offset) * 320;
              r.isEnemy = true;
              r.type = "ricochet";
              r.bounceCount = 0;
              r.color = "#facc15";
              this.bullets.push(r);
            }
          }
        } else if (e.phase === 15) {
          // Overdrive Phase 15: Crimson Radial Spiral Barrage with Passive Parent Division
          e.x += e.vx * 0.18 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          if (e.lastShot > 0.32) {
            e.lastShot = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height / 1.5;

            // Continuous rotating spiral streams
            const count = 4;
            const baseOffset = e.rapidFireCount * 0.28;
            e.rapidFireCount++;

            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2 + baseOffset;
              const b = new Bullet();
              b.x = cx - 5;
              b.y = cy - 5;
              b.width = 10;
              b.height = 10;
              b.vx = Math.cos(angle) * 350; // 1.5x velocity multiplier!
              b.vy = Math.sin(angle) * 350;
              b.isEnemy = true;

              // 1 in 3 bullets split into 5-way spread dynamically
              if (Math.random() < 0.35) {
                b.type = "parent_nsplit";
                b.color = "#f43f5e";
                b.age = 0;
                b.fuseTimer = 0.95;
              } else {
                b.type = "normal";
                b.color = "#fb923c";
              }
              this.bullets.push(b);
            }
          }
        } else if (e.phase === 16) {
          // Overdrive Phase 16: Chaos Overdrive (지옥의 2페이즈 각성 패턴 난사)
          e.x += e.vx * 0.25 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          if (e.lastShot > 0.6) { // Changed rate to 0.6s as requested!
            e.lastShot = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height;

            // Target player with ricochet bouncing bullets
            const tx = this.player.x + this.player.width / 2;
            const ty = this.player.y + this.player.height / 2;
            const angleToPlayer = Math.atan2(ty - cy, tx - cx);

            // 3-way ricochet spread that bounce off the walls (1.5x speed)
            for (let i = -1; i <= 1; i++) {
              const b = new Bullet();
              b.x = cx - 5;
              b.y = cy - 5;
              b.width = 10;
              b.height = 10;
              const offsetAngle = angleToPlayer + i * 0.35;
              b.vx = Math.cos(offsetAngle) * 330;
              b.vy = Math.sin(offsetAngle) * 330;
              b.isEnemy = true;
              b.type = "ricochet";
              b.bounceCount = 0;
              b.color = "#fbbf24";
              this.bullets.push(b);
            }

            // Heavy fire from wings
            if (e.leftTurretActive) {
              const bLeft = new Bullet();
              bLeft.x = e.x - 14;
              bLeft.y = e.y + e.height - 15;
              bLeft.width = 8;
              bLeft.height = 8;
              const leftAngle = angleToPlayer - 0.2;
              bLeft.vx = Math.cos(leftAngle) * 420;
              bLeft.vy = Math.sin(leftAngle) * 420;
              bLeft.isEnemy = true;
              bLeft.color = "#a855f7";
              this.bullets.push(bLeft);
            }
            if (e.rightTurretActive) {
              const bRight = new Bullet();
              bRight.x = e.x + e.width + 6;
              bRight.y = e.y + e.height - 15;
              bRight.width = 8;
              bRight.height = 8;
              const rightAngle = angleToPlayer + 0.2;
              bRight.vx = Math.cos(rightAngle) * 420;
              bRight.vy = Math.sin(rightAngle) * 420;
              bRight.isEnemy = true;
              bRight.color = "#a855f7";
              this.bullets.push(bRight);
            }
          }
        } else if (e.phase === 17) {
          // Overdrive Phase 17: Photon Prism Galaxy Sweep
          e.x += e.vx * 0.15 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          if (e.shootTimer === undefined) e.shootTimer = 0;
          e.shootTimer += dt;

          const cycle = e.shootTimer % 2.8;
          this.playBossLaserSoundOncePerCycle(e, e.shootTimer, 2.8, 1.8);
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;

          if (e.laserAngle === undefined) {
            e.laserAngle = Math.atan2(py - cy, px - cx);
          }

          if (cycle < 1.2) {
            // Tracking Phase: Keep aiming/pointing at the player's last coordinate
            e.laserAngle = Math.atan2(py - cy, px - cx);
          } else if (cycle >= 1.2 && cycle < 1.8) {
            // Locking / Preparation phase (0.6 seconds lock!)
            // Laser aiming position is strictly locked at the final coordinate reached at 1.2s.
          } else if (cycle >= 1.8 && cycle < 2.5) {
            // Firing Phase (0.7 seconds blast!): Test projection intersection
            const dx = px - cx;
            const dy = py - cy;
            const dirX = Math.cos(e.laserAngle);
            const dirY = Math.sin(e.laserAngle);
            const proj = dx * dirX + dy * dirY;
            if (proj > 0 && proj < 3000) {
              const closestX = cx + proj * dirX;
              const closestY = cy + proj * dirY;
              const distToLaser = Math.hypot(px - closestX, py - closestY);
              if (distToLaser < 22 && this.player.invulnTimer <= 0 && !this.player.isDead) {
                this.triggerPlayerHit();
              }
            }
          }

          // Spurt galaxy swirls
          if (e.lastShot > 0.12) {
            e.lastShot = 0;
            const count = 3;
            // Elegant spiral swing based on cumulative count
            const offset = (e.rapidFireCount++) * 0.15;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2 + offset;
              const b = new Bullet();
              b.x = cx - 5;
              b.y = cy - 5;
              b.width = 10;
              b.height = 10;
              b.vx = Math.cos(angle) * 315;
              b.vy = Math.sin(angle) * 315;
              b.isEnemy = true;
              b.type = "crystal";
              b.color = i % 2 === 0 ? "#10b981" : "#06b6d4";
              this.bullets.push(b);
            }
          }
        } else if (e.phase === 18) {
          // Overdrive Phase 18: Chronos Vortex Detonation & Stardust Cascade
          e.x += e.vx * 0.18 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          if (e.patternTimer === undefined) e.patternTimer = 0;
          e.patternTimer += dt;

          // Double density continuous swirl stardust!
          if (e.lastShot > 0.12) {
            e.lastShot = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height;
            const angle = e.patternTimer * 6.0;
            for (let i = 0; i < 4; i++) {
              const b = new Bullet();
              const offsetAngle = angle + (i * Math.PI) / 2;
              b.x = cx - 5;
              b.y = cy - 5;
              b.width = 10;
              b.height = 10;
              // Expand out then curve rapidly down
              b.vx = Math.cos(offsetAngle) * 320;
              b.vy = Math.sin(offsetAngle) * 200 + 130;
              b.isEnemy = true;
              b.type = "pellet";
              b.color = i % 2 === 0 ? "#fb923c" : "#facc15"; 
              this.bullets.push(b);
            }
          }

          // Dense trap-formation multi-vortex deployment every 1.5/2.5 seconds
          if (e.shootTimer === undefined) e.shootTimer = 0;
          e.shootTimer += dt;
          if (e.shootTimer > 2.5) {
            e.shootTimer = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height;
            const px = this.player.x + this.player.width / 2;
            const py = this.player.y + this.player.height / 2;
            const baseAngle = Math.atan2(py - cy, px - cx);

            // Spawn 5 singularities enveloping the player trajectory
            const angles = [
              baseAngle - 0.45,
              baseAngle - 0.22,
              baseAngle,
              baseAngle + 0.22,
              baseAngle + 0.45,
            ];
            const speeds = [130, 155, 185, 155, 130];

            angles.forEach((ang, idx) => {
              const b = new Bullet();
              b.x = cx - 18;
              b.y = cy - 18;
              b.width = 36;
              b.height = 36;
              b.vx = Math.cos(ang) * speeds[idx];
              b.vy = Math.sin(ang) * speeds[idx];
              b.isEnemy = true;
              b.type = "gravity_singularity"; // gravitational pull vortex
              b.color = idx % 2 === 0 ? "#a855f7" : "#8b5cf6";
              b.fuseTimer = 1.1 + idx * 0.1; // cascading detonation!
              this.bullets.push(b);
            });
            sfx.bossHit();
            
            // Accompanied by lightning fast targeted sniper shot
            const snip = new Bullet();
            snip.x = cx - 6;
            snip.y = cy - 6;
            snip.width = 12;
            snip.height = 12;
            snip.vx = Math.cos(baseAngle) * 600;
            snip.vy = Math.sin(baseAngle) * 600;
            snip.isEnemy = true;
            snip.color = "#ef4444";
            snip.type = "needle";
            this.bullets.push(snip);
          }
        } else if (e.phase === 19) {
          // Overdrive Phase 19: Quantum Timeshift Decision Matrix
          e.x += e.vx * 0.08 * dt;
          if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;

          if (e.shootTimer === undefined) e.shootTimer = 0;
          e.shootTimer += dt;

          const cycle = e.shootTimer % 4.2; 

          if (cycle < 2.2) {
            // High density wave emission of target-freezing stardust needles
            if (e.lastShot > 0.16) {
              e.lastShot = 0;
              const cx = e.x + e.width / 2;
              const cy = e.y + e.height;

              // Fire overlapping waves of dilation arrows
              const count = 11;
              const globalSway = Math.sin(performance.now() * 0.0045) * 0.28;
              for (let i = 0; i < count; i++) {
                const angle = Math.PI * 0.15 + (i / (count - 1)) * Math.PI * 0.7 + globalSway;
                const b = new Bullet();
                b.x = cx - 6;
                b.y = cy - 6;
                b.width = 12;
                b.height = 12;
                b.vx = Math.cos(angle) * (i % 2 === 0 ? 460 : 330);
                b.vy = Math.sin(angle) * (i % 2 === 0 ? 460 : 330);
                b.isEnemy = true;
                b.type = "dilation_bullet";
                b.dilationState = "flying";
                b.dilationAge = 0;
                b.color = i % 2 === 0 ? "#d946ef" : "#f43f5e";
                this.bullets.push(b);
              }

              // Fire homing pressure pellets intermittently
              if (Math.random() < 0.72) {
                const px = this.player.x + this.player.width / 2;
                const py = this.player.y + this.player.height / 2;
                const bTarget = new Bullet();
                bTarget.x = cx - 5;
                bTarget.y = cy - 5;
                bTarget.width = 10;
                bTarget.height = 10;
                const targetAngle = Math.atan2(py - cy, px - cx);
                bTarget.vx = Math.cos(targetAngle) * 430;
                bTarget.vy = Math.sin(targetAngle) * 430;
                bTarget.isEnemy = true;
                bTarget.type = "pellet";
                bTarget.color = "#06b6d4"; // icy cyan targeted pellet
                this.bullets.push(bTarget);
              }
            }
          }

          // Quantum snapping blast - popcorn cascading sequential fire
          if (cycle >= 2.25 && cycle < 3.25) {
            let launchCount = 0;
            this.bullets.forEach((b) => {
              if (b.isEnemy && b.type === "dilation_bullet" && b.dilationState === "frozen" && Math.random() < 0.28) {
                b.dilationState = "launched";
                const dx = this.player.x + this.player.width / 2 - b.x;
                const dy = this.player.y + this.player.height / 2 - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 1) {
                  b.vx = (dx / dist) * 640;
                  b.vy = (dy / dist) * 640;
                }
                b.color = "#ec4899"; // Shifts to high energy neon pink
                launchCount++;
              }
            });
            if (launchCount > 0) {
              sfx.bossPatternFire();
              this.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, "#ec4899", 3);
            }
          }

          // Sweep any leftover frozen quantum bullets right after the main cascading launch window to prevent ANY from remaining stuck!
          if (cycle >= 3.25) {
            let launchCount = 0;
            this.bullets.forEach((b) => {
              if (b.isEnemy && b.type === "dilation_bullet" && b.dilationState === "frozen") {
                b.dilationState = "launched";
                const dx = this.player.x + this.player.width / 2 - b.x;
                const dy = this.player.y + this.player.height / 2 - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 1) {
                  b.vx = (dx / dist) * 640;
                  b.vy = (dy / dist) * 640;
                } else {
                  b.vy = 640;
                }
                b.color = "#ec4899";
                launchCount++;
              }
            });
            if (launchCount > 0) {
              sfx.bossPatternFire();
              this.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, "#ec4899", 5);
            }
          }
        } else if (e.phase === 20) {
          this.runFinalMissileElectricField(e, dt);
        } else if (e.phase === 21) {
          this.runFinalSuicideDronePattern(e, dt);
        } else if (e.phase === 23) {
          this.runFinalDenseGridLaser(e, dt);
        } else if (e.phase === 24) {
          this.runFinalBossDash(e, dt);
        } else if (e.phase === 28) {
          // Final Phase 28: Meteor prism strike - five warning lanes, staggered laser fire.
          if (e.shootTimer === undefined) e.shootTimer = 0;
          e.shootTimer += dt;

          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;
          const cycle = e.shootTimer % 4.6;

          if (e.laserAngle === undefined) {
            e.laserAngle = Math.atan2(py - cy, px - cx);
          }
          if (cycle < 1.35) {
            e.laserAngle = Math.atan2(py - cy, px - cx);
          }

          const phase28Step =
            cycle >= 2.35 && cycle < 2.7 ? 1 :
            cycle >= 2.95 && cycle < 3.3 ? 2 :
            0;
          if (e.lastCycleIndex !== phase28Step) {
            e.lastCycleIndex = phase28Step;
            if (phase28Step > 0) sfx.laserBlast();
          }

          const degree30 = Math.PI / 6;
          const firingOffsets =
            phase28Step === 1 ? [0] :
            phase28Step === 2 ? [-degree30, degree30] :
            [];

          firingOffsets.forEach((offset) => {
            const angle = e.laserAngle! + offset;
            const dx = px - cx;
            const dy = py - cy;
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);
            const proj = dx * dirX + dy * dirY;
            if (proj > 0 && proj < 3000) {
              const closestX = cx + proj * dirX;
              const closestY = cy + proj * dirY;
              const distToLaser = Math.hypot(px - closestX, py - closestY);
              if (distToLaser < 24 && this.player.invulnTimer <= 0 && !this.player.isDead) {
                this.triggerPlayerHit();
              }
            }
          });

          if (e.lastShot > 0.22) {
            e.lastShot = 0;
            const meteorCount = Math.random() < 0.45 ? 2 : 1;
            for (let i = 0; i < meteorCount; i++) {
              this.meteors.push({
                x: 26 + Math.random() * Math.max(1, this.canvas.width - 52),
                y: -42 - Math.random() * 80,
                radius: 15 + Math.random() * 15,
                vx: (Math.random() - 0.5) * 170,
                vy: 340 + Math.random() * 160,
                hp: 999,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 3.2,
                active: true,
              });
            }
          }

          if (phase28Step > 0 && e.shootTimer !== undefined) {
            const shouldFireShuriken =
              (phase28Step === 1 && cycle > 2.38 && cycle < 2.68) ||
              (phase28Step === 2 && cycle > 2.98 && cycle < 3.28);
            if (shouldFireShuriken && e.lastCycleIndex === phase28Step && e.counterTimer !== phase28Step) {
              e.counterTimer = phase28Step;
              const burstBase = e.laserAngle ?? Math.PI / 2;
              const spread = (5 * Math.PI) / 180;
              const launchAngles = [
                burstBase - Math.PI / 2,
                burstBase,
                burstBase + Math.PI / 2,
                burstBase + Math.PI,
              ];
              launchAngles.forEach((baseAngle) => {
                for (let i = -1; i <= 2; i++) {
                  const b = new Bullet();
                  b.x = cx - 7;
                  b.y = cy - 7;
                  b.width = 14;
                  b.height = 14;
                  const angle = baseAngle + (i - 1.5) * spread;
                  b.vx = Math.cos(angle) * 300;
                  b.vy = Math.sin(angle) * 300;
                  b.isEnemy = true;
                  b.type = "crystal";
                  b.color = "#38bdf8";
                  b.visualType = "star_beacon";
                  this.bullets.push(b);
                }
              });
            } else if (!shouldFireShuriken) {
              e.counterTimer = 0;
            }
          }
        } else if (e.phase === 47) {
          this.runFinalSafeZoneBlast(e, dt);
        } else if (e.phase === 48) {
          this.runFinalAbsorptionField(e, dt);
        } else if (e.phase === 49) {
          this.runFinalAfterimageSlash(e, dt);
        } else if (e.phase === 50) {
          this.runFinalCompressionWalls(e, dt);
        } else if (e.phase === 32) {
          // Final Phase 32: dense radial fire with the merged spatial compression field.
          this.runFinalCompressionWalls(e, dt);

          if (e.shootTimer === undefined) e.shootTimer = 0;
          e.shootTimer += dt;

          if (e.lastShot > 0.48) {
            e.lastShot = 0;
            sfx.bossPatternFire();
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height;

            const count = 25;
            const baseAngle = Math.random() * Math.PI * 2;
            for (let i = 0; i < count; i++) {
              const ang = baseAngle + (i / count) * Math.PI * 2;
              const b = new Bullet();
              b.x = cx - 6;
              b.y = cy - 6;
              b.width = 12;
              b.height = 12;
              b.vx = Math.cos(ang) * 150;
              b.vy = Math.sin(ang) * 150;
              b.isEnemy = true;
              b.color = "#22d3ee";
              b.visualType = "cosmic_plasma_core";
              this.bullets.push(b);
            }
          }
        } else if (e.phase === 51) {
          this.runFinalEdgeStrikerPattern(e, dt);
        } else if (e.phase === 52) {
          this.runFinalElectricMazePattern(e, dt);
        } else if (e.phase === 34) {
          // Final Phase 34: Galactic Collision Spheres - giant bouncing balls
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;

          if (e.shootTimer === undefined) e.shootTimer = 0;
          e.shootTimer += dt;

          if (e.lastShot > 1.25) {
            e.lastShot = 0;
            sfx.bossPatternFire();
            for (let side = -1; side <= 1; side += 2) {
              const b = new Bullet();
              b.x = cx - 22 + side * 50;
              b.y = cy;
              b.width = 44;
              b.height = 44;
              b.vx = side * 170;
              b.vy = 145;
              b.isEnemy = true;
              b.type = "colliding_orb";
              b.color = "#ec4899";
              this.bullets.push(b);
            }
          }
        } else if (e.phase === 37) {
          // Final Phase 37: Milky Way Vortex Gate - Concentric opposite rotation
          const targetX = this.canvas.width / 2 - e.width / 2;
          e.x += (targetX - e.x) * dt;

          if (e.shootTimer === undefined) e.shootTimer = 0;
          e.shootTimer += dt;

          if (e.lastShot > 0.26) {
            e.lastShot = 0;
            sfx.bossPatternFire();
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height / 2;
            for (let i = 0; i < 4; i++) {
              const rotSpeed = (i % 2 === 0 ? 1.9 : -1.9) * e.shootTimer;
              const count = 7;
              for (let k = 0; k < count; k++) {
                const angle = rotSpeed + (k / count) * Math.PI * 2;
                const b = new Bullet();
                b.x = cx - 6;
                b.y = cy - 6;
                b.width = 11;
                b.height = 11;
                b.vx = Math.cos(angle) * (220 + i * 55);
                b.vy = Math.sin(angle) * (220 + i * 55);
                b.isEnemy = true;
                b.color = i === 1 ? "#ec4899" : "#06b6d4";
                this.bullets.push(b);
              }
            }
          }
        } else if (e.phase === 42) {
          this.runOverdriveSpiralLattice(e, dt);
        } else if (e.phase === 43) {
          this.runOverdriveSplitMineRain(e, dt);
        } else if (e.phase === 44) {
          this.runOverdriveRecallBullets(e, dt);
        } else if (e.phase === 45) {
          this.runOverdriveWarningExplosions(e, dt);
        } else if (e.phase === 46) {
          this.runOverdriveTailExplosions(e, dt);
        }
        this.clampBossToArena(e);
      } else {
        // Normal Enemies Movement
        const tier = this.getCombatTier();
        if (e.type === "assault_commander") {
          if (e.y < e.spawnPoint) {
            e.y += e.vy * dt;
          } else {
            e.vy = 0;
            e.patternTimer += dt;
            e.x += e.vx * dt;
            e.y = e.spawnPoint + Math.sin(e.patternTimer * (tier >= 3 ? 2.2 : 1.7)) * (tier >= 3 ? 18 : 12);
            if (e.x < 16 || e.x > this.canvas.width - e.width - 16) {
              e.x = Math.max(16, Math.min(this.canvas.width - e.width - 16, e.x));
              e.vx *= -1;
            }
          }
        } else if (e.type === "stationary") {
          e.y += e.vy * dt;
          if (e.y > 100) e.vy = 0; // stop moving
        } else if (e.type === "circle_shooter") {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
        } else if (e.type === "column_shooter") {
          if (e.y < e.spawnPoint) e.y += e.vy * dt;
          else e.vy = 0;
        } else if (e.type === "v_360_shooter") {
          if (e.y < e.spawnPoint) {
            e.y += e.vy * dt;
          } else {
            e.vy = 0;
          }
        } else if (e.type === "split_cluster") {
          if (e.y < e.spawnPoint) {
            e.y += e.vy * dt;
          } else {
            e.vy = 0;
            e.x += e.vx * dt;
            if (e.x < 20 || e.x > this.canvas.width - e.width - 20) {
              e.vx *= -1;
            }
          }
        } else if (e.type === "barricade_wall") {
          e.y += e.vy * dt; // slow descent downwards
        } else if (e.type === "mine_layer") {
          if (e.y < e.spawnPoint) {
            e.y += e.vy * dt;
          } else {
            e.vy = 0;
            e.x += e.vx * dt;
            if (e.x < 30 || e.x > this.canvas.width - e.width - 30) {
              e.vx *= -1;
            }
          }
        } else if (e.type === "boomerang_orbit") {
          if (e.y < e.spawnPoint) {
            e.y += e.vy * dt;
            e.startX = e.x;
          } else {
            e.vy = 0;
            if (e.startX === undefined) {
              e.startX = e.x;
            }
            e.patternTimer += dt;
            const amplitude = this.canvas.width / 2 - 45;
            e.x = e.startX + Math.sin(e.patternTimer * 1.4) * amplitude;
          }
        } else if (e.type === "satellite_shield") {
          const tx = this.player.x + this.player.width / 2;
          const ty = this.player.y + this.player.height / 2;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          const dx = tx - cx;
          const dy = ty - cy;
          const dist = Math.hypot(dx, dy);
          if (dist > 150) {
            e.x += (dx / dist) * 110 * dt;
            e.y += (dy / dist) * 110 * dt;
          } else {
            e.y += Math.sin(performance.now() * 0.002) * 50 * dt;
            e.x += Math.cos(performance.now() * 0.002) * 80 * dt;
          }

          // Check and spawn satellites
          if (e.satellites.length === 0) {
            const numSatellites = 4;
            for (let i = 0; i < numSatellites; i++) {
              const b = new Bullet();
              b.type = "satellite";
              b.isEnemy = true;
              b.width = 10;
              b.height = 10;
              b.color = "#38bdf8";
              this.bullets.push(b);
              e.satellites.push(b);
            }
          }
          e.satellites = e.satellites.filter((b) => b.active);

          e.patternTimer += dt;
          const orbitAngleOffset = e.patternTimer * 3.5;
          const orbitRadius = 40;
          e.satellites.forEach((b, idx) => {
            const angle =
              orbitAngleOffset + (idx / e.satellites.length) * Math.PI * 2;
            b.x =
              e.x + e.width / 2 - b.width / 2 + Math.cos(angle) * orbitRadius;
            b.y =
              e.y + e.height / 2 - b.height / 2 + Math.sin(angle) * orbitRadius;
            b.vx = 0;
            b.vy = 0;
          });
        } else if (e.type === "aimed") {
          const stagingY = e.spawnPoint || 120;
          if (e.y < stagingY) {
            e.y += e.vy * dt;
            if (e.startX === undefined) e.startX = e.x;
          } else {
            if (e.startX === undefined) e.startX = e.x;
            e.patternTimer += dt;
            const moveStyle = Math.abs(Math.floor(e.direction || e.visualId)) % 3;

            if (moveStyle === 0) {
              const amplitude = Math.min(150, this.canvas.width * 0.24);
              e.x = e.startX + Math.sin(e.patternTimer * 2.2) * amplitude;
              e.y += e.vy * 0.42 * dt;
            } else if (moveStyle === 1) {
              if (Math.abs(e.vx) < 70) {
                e.vx = e.startX < this.canvas.width / 2 ? 175 : -175;
              }
              e.x += e.vx * dt;
              e.y += e.vy * 0.36 * dt;
              if (e.x < 28 || e.x > this.canvas.width - e.width - 28) {
                e.vx *= -1;
              }
            } else {
              const orbitAngle = e.patternTimer * 1.75;
              e.x = e.startX + Math.cos(orbitAngle) * Math.min(118, this.canvas.width * 0.18);
              e.y += e.vy * 0.34 * dt + Math.sin(orbitAngle * 2.4) * 18 * dt;
            }
          }
        } else if (e.type === "dash_paint") {
          if (e.y < e.spawnPoint) {
            e.y += e.vy * dt;
          } else {
            e.vy = 0;
            e.x += e.vx * 0.18 * dt;
            if (e.x < 40 || e.x > this.canvas.width - e.width - 40) e.vx *= -1;
          }
        } else {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
        }

        // Barricade visual beam collision handler
        if (e.type === "barricade_wall") {
          const partner = this.enemies.find(
            (other) =>
              other !== e &&
              other.active &&
              other.type === "barricade_wall" &&
              Math.abs(other.y - e.y) < 25 &&
              other.x > e.x,
          );

          if (partner) {
            const py = this.player.y + this.player.height / 2;
            const px = this.player.x + this.player.width / 2;
            const by = (e.y + partner.y) / 2 + e.height / 2;
            const inXRange = px >= e.x + e.width && px <= partner.x;
            const inYRange = Math.abs(py - by) < 14;

            if (
              inXRange &&
              inYRange &&
              this.player.invulnTimer <= 0 &&
              !this.player.isDead
            ) {
              this.triggerPlayerHit();
            }
          }
        }

        // Firing Behavior (much faster thresholds)
        if (
          e.type === "assault_commander" &&
          e.lastShot > (tier >= 3 ? 0.42 : 0.56)
        ) {
          e.lastShot = 0;
          this.fireAssaultCommander(e, tier);
        } else if (e.type === "stationary" && e.lastShot > 1.2) {
          e.lastShot = 0;
          // Dual parallel vertical bullet beams (straight down)
          for (let i = -1; i <= 1; i += 2) {
            const b = new Bullet();
            b.x = e.x + e.width / 2 + i * 8 - 3;
            b.y = e.y + e.height;
            b.width = 6;
            b.height = 12;
            b.vx = 0;
            b.vy = 220;
            b.isEnemy = true;
            b.type = "needle";
            b.color = "#facc15";
            b.visualType = "comet_needle";
            this.bullets.push(b);
          }
        } else if (e.type === "circle_shooter") {
          if (e.patternTimer === undefined) e.patternTimer = 0;
          if (e.lastShot > 0.32) {
            e.lastShot = 0;
            e.patternTimer += 0.35; // Spinning angle
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height / 2;
            for (let i = 0; i < 3; i++) {
              const angle = e.patternTimer + (i / 3) * Math.PI * 2;
              const b = new Bullet();
              b.x = cx - 4;
              b.y = cy - 4;
              b.width = 8;
              b.height = 8;
              b.vx = Math.cos(angle) * 160;
              b.vy = Math.sin(angle) * 160;
              b.isEnemy = true;
              b.type = "pellet";
              b.color = "#fb923c"; // Standard pellet orange
              this.bullets.push(b);
            }
          }
        } else if (e.type === "column_shooter" && e.lastShot > 4.0) {
          e.lastShot = 0;
          this.fireSubtypeWeapon(e, "aimed");
        } else if (
          e.type === "v_360_shooter" &&
          e.vy === 0 &&
          e.lastShot > 4.2
        ) {
          e.lastShot = 0;
          const count = 12;
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const b = new Bullet();
            b.x = e.x + e.width / 2;
            b.y = e.y + e.height / 2;
            b.vx = Math.cos(a) * 150;
            b.vy = Math.sin(a) * 150;
            b.isEnemy = true;
            b.type = "pellet";
            b.color = "#facc15"; // Standard pellet bright white-yellow
            b.width = 6;
            b.height = 6;
            this.bullets.push(b);
          }
        } else if (e.type === "split_cluster" && e.lastShot > 1.8) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;
          const tx = this.player.x + this.player.width / 2;
          const ty = this.player.y + this.player.height / 2;
          const angleToPlayer = Math.atan2(ty - cy, tx - cx);

          const b = new Bullet();
          b.x = cx - 10;
          b.y = cy;
          b.width = 20;
          b.height = 20;
          b.vx = Math.cos(angleToPlayer) * 190;
          b.vy = Math.sin(angleToPlayer) * 190;
          b.isEnemy = true;
          b.color = "#f43f5e";
          b.parentAngle = angleToPlayer;
          b.type = Math.random() < 0.5 ? "parent_cross" : "parent_nsplit";
          this.bullets.push(b);
        } else if (e.type === "mine_layer" && e.lastShot > 2.2) {
          e.lastShot = 0;
          const b = new Bullet();
          b.x = e.x + e.width / 2 - 12;
          b.y = e.y + e.height / 2 - 12;
          b.width = 24;
          b.height = 24;
          b.vx = (Math.random() - 0.5) * 60;
          b.vy = 40 + Math.random() * 40;
          b.isEnemy = true;
          b.type = "mine_orb";
          b.color = "#f59e0b";
          b.fuseTimer = 4.2;
          this.bullets.push(b);
        } else if (e.type === "boomerang_orbit" && e.lastShot > 1.8) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;
          const tx = this.player.x + this.player.width / 2;
          const ty = this.player.y + this.player.height / 2;
          const angleToPlayer = Math.atan2(ty - cy, tx - cx);

          for (let i = -1; i <= 1; i += 2) {
            const b = new Bullet();
            b.x = cx - 5;
            b.y = cy - 5;
            b.width = 10;
            b.height = 10;
            const offsetAngle = angleToPlayer + i * 0.14;
            b.vx = Math.cos(offsetAngle) * 240;
            b.vy = Math.sin(offsetAngle) * 240;
            b.isEnemy = true;
            b.type = "boomerang";
            b.color = "#10b981";
            this.bullets.push(b);
          }
        } else if (e.type === "satellite_shield") {
          if (e.lastShot > 1.8) {
            e.lastShot = 0;
            const tx = this.player.x + this.player.width / 2;
            const ty = this.player.y + this.player.height / 2;

            e.satellites.forEach((b) => {
              const dx = tx - b.x;
              const dy = ty - b.y;
              const d = Math.hypot(dx, dy);
              b.type = "normal";
              b.color = "#3b82f6";
              if (d > 1) {
                b.vx = (dx / d) * 350;
                b.vy = (dy / d) * 350;
              } else {
                b.vy = 350;
              }
            });
            e.satellites = [];
          }
        } else if (e.type === "dash_paint" && e.lastShot > 1.6) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;
          const tx = this.player.x + this.player.width / 2;
          const ty = this.player.y + this.player.height / 2;
          const angleToPlayer = Math.atan2(ty - cy, tx - cx);

          const b = new Bullet();
          b.x = cx - 6;
          b.y = cy - 6;
          b.width = 12;
          b.height = 12;
          b.vx = Math.cos(angleToPlayer) * 35;
          b.vy = Math.sin(angleToPlayer) * 35;
          b.isEnemy = true;
          b.type = "dash_paint_bullet";
          b.color = "#ea580c";
          this.bullets.push(b);
        } else if (e.type === "aimed" && e.lastShot > 1.0) {
          e.lastShot = 0;
          this.fireSubtypeWeapon(e, "aimed");
        } else if (e.type === "homing_shooter" && e.lastShot > 1.4) {
          e.lastShot = 0;
          this.fireSubtypeWeapon(e, "homing");
        } else if (e.type === "shotgun_shooter" && e.lastShot > 2.0) {
          e.lastShot = 0;
          this.fireSubtypeWeapon(e, "shotgun");
        } else if (e.type === "burst_shooter") {
          if (e.shootTimer === undefined) e.shootTimer = 0;
          e.shootTimer += dt;
          if (e.shootTimer > 0.18 && e.burstCount < 5) {
            e.shootTimer = 0;
            e.burstCount++;
            this.fireSubtypeWeapon(e, "aimed"); // Modified: Fires aimed bullets targeting player sequentially!
          }
          if (e.lastShot > 9.7) {
            e.lastShot = 0;
            e.burstCount = 0;
            e.shootTimer = 0;
          }
        } else if (e.type === "tank" && e.lastShot > 1.8) {
          e.lastShot = 0;
          // Heavy vertical double cannon fire!
          for (let i = -12; i <= 12; i += 24) {
            const b = new Bullet();
            b.x = e.x + e.width / 2 + i - 6;
            b.y = e.y + e.height;
            b.width = 12;
            b.height = 12;
            b.vx = 0;
            b.vy = 200;
            b.isEnemy = true;
            b.color = "#ef4444";
            this.bullets.push(b);
          }
        } else if (e.type === "ricochet_shooter" && e.lastShot > 1.6) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;
          const tx = this.player.x + this.player.width / 2;
          const ty = this.player.y + this.player.height / 2;
          const angleToPlayer = Math.atan2(ty - cy, tx - cx);
          for (let i = -1; i <= 1; i++) {
            if (i === 0) continue;
            const b = new Bullet();
            b.x = cx - 4;
            b.y = cy - 4;
            b.width = 8;
            b.height = 8;
            const offsetAngle = angleToPlayer + i * 0.28;
            b.vx = Math.cos(offsetAngle) * 280;
            b.vy = Math.sin(offsetAngle) * 280;
            b.isEnemy = true;
            b.type = "ricochet";
            b.bounceCount = 0;
            b.color = "#fbbf24";
            this.bullets.push(b);
          }
        } else if (e.type === "counter_on_death" && e.lastShot > 2.2) {
          e.lastShot = 0;
          const spin = (performance.now() * 0.003) % (Math.PI * 2);
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          // Attack is linked specifically with the rotating 6 vertices of its hexagon!
          for (let i = 0; i < 6; i++) {
            const angle = spin + (i / 6) * Math.PI * 2;
            const bx = cx + Math.cos(angle) * (e.width / 2 + 8);
            const by = cy + Math.sin(angle) * (e.height / 2 + 8);
            const b = new Bullet();
            b.x = bx - 4;
            b.y = by - 4;
            b.width = 10;
            b.height = 10;
            b.vx = Math.cos(angle) * 150;
            b.vy = Math.sin(angle) * 150;
            b.isEnemy = true;
            b.color = "#f43f5e";
            this.bullets.push(b);
          }
        } else if (e.type === "ink_shooter" && e.lastShot > 1.8) {
          e.lastShot = 0;
          const c = new InkCloud();
          c.x = e.x + e.width / 2;
          c.y = e.y + e.height;
          c.vx = (Math.random() - 0.5) * 45;
          c.vy = 80 + Math.random() * 40;
          c.radius = 18;
          c.maxRadius = 65 + Math.random() * 20;
          c.life = 4.2;
          c.maxLife = 4.2;
          this.inkClouds.push(c);
        } else if (e.type === "gravity_vortex_mob" && e.lastShot > 2.2) {
          e.lastShot = 0;
          const b = new Bullet();
          b.x = e.x + e.width / 2 - 16;
          b.y = e.y + e.height;
          b.width = 30;
          b.height = 30;
          b.vx = 0;
          b.vy = 75;
          b.isEnemy = true;
          b.type = "gravity_singularity";
          b.color = "#c084fc";
          this.bullets.push(b);
        }

        // Pre-bounds separation check to prevent multiple enemies from overlapping when they track the player or spawn close by (e.g. satellite_shield)
        if (e.active && e.type === "satellite_shield") {
          this.enemies.forEach((other) => {
            if (
              other !== e &&
              other.active &&
              other.type === "satellite_shield"
            ) {
              const dx = e.x - other.x;
              const dy = e.y - other.y;
              const d = Math.hypot(dx, dy);

              // Comfort distance based on their visual radius
              const minDistance = (e.width + other.width) * 0.9 + 25;
              if (d < minDistance) {
                const pushX = d === 0 ? (Math.random() - 0.5) * 10 : dx / d;
                const pushY = d === 0 ? (Math.random() - 0.5) * 10 : dy / d;
                // Standard spring separation force
                const force = (minDistance - d) * 0.12;
                e.x += pushX * force;
                e.y += pushY * force;
                other.x -= pushX * force;
                other.y -= pushY * force;
              }
            }
          });
        }

        if (
          e.y > this.canvas.height + 60 ||
          e.x < -100 ||
          e.x > this.canvas.width + 100
        ) {
          e.active = false;
        }
      }
    });

    // Ensure all satellites of any inactive satellite_shield or mini_shield_commander are cleaned up
    this.enemies.forEach((e) => {
      if (!e.active && (e.type === "satellite_shield" || (e.type as any) === "mini_shield_commander")) {
        e.satellites.forEach((b) => {
          b.active = false;
        });
        e.satellites = [];
      }
    });

    this.enemies = this.enemies.filter((e) => e.active);
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
    this.player.hp--;
    sfx.hit();

    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    // Epic dynamic particle shattering visual
    this.spawnExplosion(px, py, "#ef4444", 45);
    this.spawnExplosion(px, py, "#f97316", 30);
    this.spawnExplosion(px, py, "#38bdf8", 20); // shiny power core sparks

    // Create random floating metallic mechanical shards
    for (let i = 0; i < 15; i++) {
      const p = new Particle();
      p.x = px;
      p.y = py;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 90;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color =
        Math.random() < 0.5
          ? "#60a5fa"
          : Math.random() < 0.5
            ? "#94a3b8"
            : "#cbd5e1";
      p.size = Math.random() * 5 + 3;
      p.maxLife = Math.random() * 0.9 + 0.6;
      p.life = p.maxLife;
      this.particles.push(p);
    }

    this.player.isDead = true;
    this.player.deadTimer = 2.0; // disappear for 2 seconds before respawn

    if (this.player.powerLevel > 1) this.player.powerLevel--;

    // Move out-of-bounds to prevent any further hits or drawing while dead
    this.player.x = -999;
    this.player.y = -999;
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
    if (this.bossActive || this.clearingForBoss) return;
    const storyMode = this.isStoryMode();

    // Dynamic Wave Flow: If all active enemies are cleared, accelerate the next beautiful major wave transition!
    const activeEnemiesCount = this.enemies.filter((e) => e.active).length;
    const emptyFieldWaveDelay = storyMode ? 2.4 : 1.2;
    if (activeEnemiesCount === 0 && this.waveTimer > emptyFieldWaveDelay) {
      this.waveTimer = emptyFieldWaveDelay; // Bring down the next awesome wave soon after the field clears.
    }

    this.spawnTimer -= dt;
    this.sideSpawnTimer -= dt;
    this.waveTimer -= dt;
    const tier = this.getCombatTier();
    const assaultCommanderActive = this.enemies.some(
      (e) => e.active && e.type === "assault_commander",
    );

    if (
      !storyMode &&
      this.stage >= 2 &&
      this.assaultCommanderStage !== this.stage &&
      this.score >= this.nextBossScore - (tier >= 3 ? 9000 : 7000) &&
      !assaultCommanderActive
    ) {
      this.assaultCommanderStage = this.stage;
      this.spawnAssaultCommander(tier);
      this.waveTimer = Math.max(this.waveTimer, 4.5);
      this.spawnTimer = Math.max(this.spawnTimer, 1.1);
      return;
    }

    const storyBossReady = storyMode && this.storyStageTimer >= this.getStoryBossDelay();
    if (
      (storyBossReady || this.score >= this.nextBossScore) &&
      !this.bossActive &&
      !this.clearingForBoss &&
      !assaultCommanderActive
    ) {
      this.clearingForBoss = true;
      return;
    }

    if (this.waveTimer <= 0) {
      this.waveTimer = storyMode
        ? Math.random() * 4.5 + 8.5
        : Math.random() * (tier === 1 ? 7 : tier === 2 ? 5 : tier === 3 ? 3.8 : 3.2) +
          (tier === 1 ? 10 : tier === 2 ? 7.2 : tier === 3 ? 5.6 : 4.8);
      const wavePoolSize = storyMode ? (tier === 1 ? 5 : 6) : tier === 1 ? 8 : tier === 2 ? 14 : 18;
      const waveType = Math.floor(Math.random() * wavePoolSize);
      const waveStartIndex = this.enemies.length;
      if (waveType === 0) {
        // Horizontal Row - fast deploy across the screen
        const count = 5;
        const spacing = (this.canvas.width - 120) / (count - 1);
        const targetY = 80;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "column_shooter";
          e.x = 60 + i * spacing - 12;
          e.y = -60; // Spawn off-screen top
          e.vy = 400; // Fast drop descent
          e.spawnPoint = targetY;
          e.width = 24;
          e.height = 24;
          e.visualId = 4;
          this.enemies.push(e);
        }
      } else if (waveType === 1) {
        // Circle expanding from top center
        const count = Math.floor(Math.random() * 6) + 3; // 3 to 8
        const cx = this.canvas.width / 2 - 12;
        const cy = -50;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const e = new Enemy();
          e.type = "circle_shooter";
          e.x = cx;
          e.y = cy;
          e.vx = Math.cos(a) * 80;
          e.vy = Math.sin(a) * 80 + 150; // fast move out
          e.width = 28;
          e.height = 28;
          e.visualId = 2;
          this.enemies.push(e);
        }
      } else if (waveType === 2) {
        // V formation 360 - perfectly symmetrical
        const rows = Math.floor(Math.random() * 2) + 4; // 4 to 5 rows
        const count = rows * 2 + 1; // 9 to 11
        const cx = this.canvas.width / 2 - 12;
        for (let i = 0; i < count; i++) {
          const row = Math.ceil(i / 2);
          const dir = i === 0 ? 0 : i % 2 === 1 ? -1 : 1;
          const e = new Enemy();
          e.type = "v_360_shooter";
          e.x = cx + dir * (row * 40);
          e.y = -50 - row * 40;
          e.vy = 400; // fast enter
          e.spawnPoint = 60 + row * 40;
          e.width = 24;
          e.height = 24;
          e.visualId = 5;
          this.enemies.push(e);
        }
      } else if (waveType === 3) {
        // (Wave 1) Gear Rotation Wave
        const cx = this.canvas.width / 2;
        const cy = -120;
        const count = 10;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "gear_rotate";
          e.width = 28;
          e.height = 28;
          e.hp = 3;
          e.visualId = 8;
          e.direction = i;
          e.patternTimer = (i / count) * Math.PI * 2;
          e.spawnPoint = 170; // Hover Target Y
          e.vx = cx;
          e.vy = cy;
          this.enemies.push(e);
        }
      } else if (waveType === 4) {
        // (Wave 2) Cross-X Formation Wave
        const count = 6;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "cross_x";
          e.x = -50 - i * 45;
          e.y = -50 - i * 45;
          e.width = 26;
          e.height = 26;
          e.hp = 2;
          e.vx = 140;
          e.vy = 120;
          e.rapidFireCount = 0;
          e.visualId = 6;
          this.enemies.push(e);
        }
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "cross_x";
          e.x = this.canvas.width + 50 + i * 45;
          e.y = -50 - i * 45;
          e.width = 26;
          e.height = 26;
          e.hp = 2;
          e.vx = -140;
          e.vy = 120;
          e.rapidFireCount = 0;
          e.visualId = 7;
          this.enemies.push(e);
        }
      } else if (waveType === 5) {
        // (Wave 3) Zig-Zag Wave
        for (let i = 0; i < 12; i++) {
          const e = new Enemy();
          e.type = "zigzag_wave";
          e.width = 26;
          e.height = 26;
          e.hp = 2;
          e.x = 45 + (i % 3) * 110;
          e.y = -50 - Math.floor(i / 3) * 150;
          e.vx = i % 2 === 0 ? 150 : -150;
          e.vy = 75;
          e.visualId = 9;
          this.enemies.push(e);
        }
      } else if (waveType === 6) {
        // (Wave 4) Encirclement Wave
        const positions = [
          { x: this.canvas.width / 2 - 15, y: -40 },
          { x: this.canvas.width / 2 - 15, y: this.canvas.height + 40 },
          { x: -40, y: 120 },
          { x: this.canvas.width + 40, y: 120 },
          { x: -40, y: 350 },
          { x: this.canvas.width + 40, y: 350 },
        ];
        positions.forEach((pos, idx) => {
          const e = new Enemy();
          e.type = "encirclement";
          e.x = pos.x;
          e.y = pos.y;
          e.width = 30;
          e.height = 30;
          e.hp = 3;
          e.patternTimer = 0;
          e.rapidFireCount = 0;
          e.visualId = 10;
          this.enemies.push(e);
        });
      } else if (waveType === 7) {
        // (Wave 5) Train Convoy Wave
        const leader = new Enemy();
        leader.type = "train_leader";
        leader.x = this.canvas.width / 2 - 16;
        leader.y = -50;
        leader.width = 32;
        leader.height = 32;
        leader.hp = 12;
        leader.vx = 120;
        leader.vy = 80;
        leader.visualId = 3;
        this.enemies.push(leader);

        for (let i = 0; i < 9; i++) {
          const follower = new Enemy();
          follower.type = "train_follower";
          follower.x = this.canvas.width / 2 - 12;
          follower.y = -85 - i * 35;
          follower.width = 24;
          follower.height = 24;
          follower.hp = 2;
          follower.direction = i;
          follower.visualId = 1;
          this.enemies.push(follower);
        }
      } else if (waveType === 8) {
        // (Wave 6) Split Cluster Storm
        const count = 3;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "split_cluster";
          e.x = (this.canvas.width / 4) * (i + 1) - 15;
          e.y = -60;
          e.vx = i % 2 === 0 ? 60 : -60;
          e.vy = 120;
          e.spawnPoint = 130;
          e.hp = 6;
          e.width = 30;
          e.height = 30;
          e.visualId = 5;
          this.enemies.push(e);
        }
      } else if (waveType === 9) {
        // (Wave 7) Minefield Grid
        const count = 4;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "mine_layer";
          e.x = (this.canvas.width / 5) * (i + 1) - 15;
          e.y = -70;
          e.vx = i % 2 === 0 ? 50 : -50;
          e.vy = 100;
          e.spawnPoint = 110 + (i % 2) * 50;
          e.hp = 5;
          e.width = 30;
          e.height = 30;
          e.visualId = 6;
          this.enemies.push(e);
        }
      } else if (waveType === 10) {
        // (Wave 8) Pair Barricade Trap
        const count = 2;
        for (let i = 0; i < count; i++) {
          const yOffset = -i * 240;

          const eL = new Enemy();
          eL.type = "barricade_wall";
          eL.x = 20;
          eL.y = yOffset - 50;
          eL.vx = 0;
          eL.vy = 45;
          eL.hp = 8;
          eL.width = 32;
          eL.height = 32;
          eL.visualId = 4;
          this.enemies.push(eL);

          const eR = new Enemy();
          eR.type = "barricade_wall";
          eR.x = this.canvas.width - 56;
          eR.y = yOffset - 50;
          eR.vx = 0;
          eR.vy = 45;
          eR.hp = 8;
          eR.width = 32;
          eR.height = 32;
          eR.visualId = 4;
          this.enemies.push(eR);
        }
      } else if (waveType === 11) {
        // (Wave 9) Tactical Boomerang / Satellite Orbit Group
        const count = 3;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = Math.random() < 0.5 ? "boomerang_orbit" : "satellite_shield";
          e.x = (this.canvas.width / 4) * (i + 1) - 15;
          e.y = -60;
          e.vx = i % 2 === 0 ? 70 : -70;
          e.vy = 120;
          e.spawnPoint = 110 + (i % 2) * 40;
          e.hp = 6;
          e.width = 28;
          e.height = 28;
          e.visualId = 7;
          this.enemies.push(e);
        }
      } else if (waveType === 12) {
        // (Wave 10) Deceleration Paint Squad
        const count = 4;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "dash_paint";
          e.x = (this.canvas.width / 5) * (i + 1) - 15;
          e.y = -60;
          e.vx = i % 2 === 0 ? 80 : -80;
          e.vy = 110;
          e.spawnPoint = 120 + (i % 2) * 40;
          e.hp = 5;
          e.width = 28;
          e.height = 28;
          e.visualId = 2;
          this.enemies.push(e);
        }
      } else if (waveType === 13) {
        // (Wave 11) Hardcore Chaos Combo Spawn (The Ultimate Regular Mob Spawning Combo!)
        // A: Barricade pair traps left-to-right space
        const eL = new Enemy();
        eL.type = "barricade_wall";
        eL.x = 20;
        eL.y = -50;
        eL.vx = 0;
        eL.vy = 40;
        eL.hp = 10;
        eL.width = 30;
        eL.height = 30;
        eL.visualId = 4;
        this.enemies.push(eL);

        const eR = new Enemy();
        eR.type = "barricade_wall";
        eR.x = this.canvas.width - 50;
        eR.y = -50;
        eR.vx = 0;
        eR.vy = 40;
        eR.hp = 10;
        eR.width = 30;
        eR.height = 30;
        eR.visualId = 4;
        this.enemies.push(eR);

        // B: Mine layer drops persistent movement limiters
        const mineUnit = new Enemy();
        mineUnit.type = "mine_layer";
        mineUnit.x = this.canvas.width / 2 - 15;
        mineUnit.y = -100;
        mineUnit.vx = 45;
        mineUnit.vy = 100;
        mineUnit.spawnPoint = 80;
        mineUnit.hp = 6;
        mineUnit.width = 28;
        mineUnit.height = 28;
        mineUnit.visualId = 6;
        this.enemies.push(mineUnit);

        // C: Paint rockets targeting small remaining spots
        for (let i = 0; i < 2; i++) {
          const e = new Enemy();
          e.type = "dash_paint";
          e.x =
            (i === 0 ? this.canvas.width * 0.25 : this.canvas.width * 0.75) -
            14;
          e.y = -120;
          e.vx = i === 0 ? 60 : -60;
          e.vy = 100;
          e.spawnPoint = 140;
          e.hp = 6;
          e.width = 28;
          e.height = 28;
          e.visualId = 1;
          this.enemies.push(e);
        }
      } else if (waveType === 14) {
        // (Wave 12) Ricochet Bouncing Strike
        const count = 3;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "ricochet_shooter";
          e.x = (this.canvas.width / 4) * (i + 1) - 15;
          e.y = -60;
          e.vx = i % 2 === 0 ? 55 : -55;
          e.vy = 110;
          e.spawnPoint = 110 + (i % 2) * 50;
          e.hp = 6;
          e.width = 30;
          e.height = 30;
          e.visualId = 8;
          this.enemies.push(e);
        }
      } else if (waveType === 15) {
        // (Wave 13) Martyr Counter Shield Wall
        const count = 3;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "counter_on_death";
          e.x = (this.canvas.width / 4) * (i + 1) - 15;
          e.y = -60;
          e.vx = i % 2 === 0 ? 40 : -40;
          e.vy = 85;
          e.spawnPoint = 130 + (i % 2) * 40;
          e.hp = 8;
          e.width = 32;
          e.height = 32;
          e.visualId = 9;
          this.enemies.push(e);
        }
      } else if (waveType === 16) {
        // (Wave 14) Ink Blind Spot Smoke Camouflage
        const count = 2;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "ink_shooter";
          e.x =
            (i === 0 ? this.canvas.width * 0.3 : this.canvas.width * 0.7) - 15;
          e.y = -60;
          e.vx = i === 0 ? 45 : -45;
          e.vy = 95;
          e.spawnPoint = 110;
          e.hp = 6;
          e.width = 28;
          e.height = 28;
          e.visualId = 4;
          this.enemies.push(e);
        }
      } else if (waveType === 17) {
        // (Wave 15) Gravity Singularity Vortex Clenches
        const count = 2;
        for (let i = 0; i < count; i++) {
          const e = new Enemy();
          e.type = "gravity_vortex_mob";
          e.x =
            (i === 0 ? this.canvas.width * 0.25 : this.canvas.width * 0.75) -
            15;
          e.y = -70;
          e.vx = i === 0 ? 30 : -30;
          e.vy = 75;
          e.spawnPoint = 140;
          e.hp = 7;
          e.width = 30;
          e.height = 30;
          e.visualId = 10;
          this.enemies.push(e);
        }
      }
      this.enemies.slice(waveStartIndex).forEach((enemy) => {
        this.scaleAssaultEnemy(enemy, tier, tier >= 3 && Math.random() < 0.25);
      });
    }

    if (this.sideSpawnTimer <= 0) {
      this.sideSpawnTimer = storyMode
        ? Math.random() * 5 + 10
        : Math.max(
          3.2,
          Math.random() * (tier === 1 ? 5 : tier === 2 ? 3.8 : tier === 3 ? 3 : 2.4) +
            (tier === 1 ? 6 : tier === 2 ? 4.5 : tier === 3 ? 3.7 : 3.0),
        );
      // side squads
      const isLeft = Math.random() > 0.5;
      const startX = isLeft ? -50 : this.canvas.width + 50;
      const vx = storyMode ? (isLeft ? 185 : -185) : (isLeft ? 350 : -350) + (isLeft ? 1 : -1) * (tier - 1) * 45;
      const count = storyMode ? 3 : tier >= 4 ? 8 : tier >= 3 ? 7 : tier === 2 ? 6 : 5;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.x = startX + (isLeft ? -i * 60 : i * 60);
        e.y = 100 + i * 20;
        e.type = "aimed";
        e.width = 25;
        e.height = 25;
        e.hp = 2;
        e.vx = vx;
        e.vy = tier >= 3 ? 18 : 0;
        e.visualId = Math.floor(Math.random() * 10) + 1;
        this.scaleAssaultEnemy(e, tier);
        this.enemies.push(e);
      }
    }

    if (this.spawnTimer <= 0) {
      const stageSpeedMod = storyMode ? this.stage * 5 + (tier - 1) * 4 : this.stage * 18 + (tier - 1) * 18;
      this.spawnTimer = storyMode ? Math.max(1.35, 2.35 - this.stage * 0.08) : Math.max(0.42, 1.68 - this.stage * 0.13 - (tier - 1) * 0.25);
      const speedMult = storyMode ? 0.88 + (tier - 1) * 0.04 : 1.35 + (tier - 1) * 0.18;

      const randLayout = Math.random();
      // Decide a common type and properties for this wave unit
      const typeRand = storyMode ? Math.random() * 0.42 : Math.min(0.98, Math.random() + (tier - 1) * 0.08);
      let type: EnemyType = "aimed";
      let width = 28;
      let height = 28;
      let hp = 2;
      let vy = (90 + stageSpeedMod) * speedMult;
      let vx = 0;
      let visualId = Math.floor(Math.random() * 10) + 1;

      if (typeRand < 0.12) {
        type = "sweeper";
        width = 24;
        height = 24;
        hp = 1;
        vy = (120 + stageSpeedMod) * speedMult;
        vx = (Math.random() < 0.5 ? 1 : -1) * 110;
      } else if (typeRand < 0.28) {
        type = "aimed";
        width = 28;
        height = 28;
        hp = 2;
        vy = (85 + stageSpeedMod) * speedMult;
      } else if (typeRand < 0.44) {
        type = "homing_shooter"; // Fires straight purple non-tracking aimed projectiles
        width = 30;
        height = 30;
        hp = 3;
        vy = (80 + stageSpeedMod) * speedMult;
      } else if (typeRand < 0.6) {
        type = "shotgun_shooter";
        width = 35;
        height = 35;
        hp = 4;
        vy = (70 + stageSpeedMod) * speedMult;
      } else if (typeRand < 0.76) {
        type = "burst_shooter";
        width = 26;
        height = 26;
        hp = 2;
        vy = (95 + stageSpeedMod) * speedMult;
      } else if (typeRand < 0.9) {
        type = "tank";
        width = 40;
        height = 40;
        hp = 6;
        vy = (55 + stageSpeedMod) * speedMult;
      } else {
        type = "stationary";
        width = 42;
        height = 42;
        hp = 10;
        vy = 300;
      }

      // Higher tiers lean into organized squad pressure instead of isolated fodder.
      const squadChance = storyMode ? 0.22 : tier === 1 ? 0.45 : tier === 2 ? 0.62 : 0.72;
      if (randLayout < squadChance && type !== "sweeper" && type !== "stationary") {
        const groupPattern = Math.floor(Math.random() * 3);
        const baseCX = Math.random() * (this.canvas.width - 240) + 120;

        if (groupPattern === 0) {
          // HORIZONTAL UNIT: 3 aligned side-by-side
          for (let i = -1; i <= 1; i++) {
            const e = new Enemy();
            e.type = type;
            e.width = width;
            e.height = height;
            e.hp = Math.ceil(hp * this.getAssaultHpMultiplier(tier));
            e.vy = vy;
            e.vx = vx;
            e.x = baseCX + i * 55 - width / 2;
            e.y = -50;
            e.visualId = visualId;
            this.enemies.push(e);
          }
        } else if (groupPattern === 1) {
          // V-FORMATION SQUAD: 3 in V arrangement
          const offsets = [
            { rx: 0, ry: 0 },
            { rx: -45, ry: -40 },
            { rx: 45, ry: -40 },
          ];
          offsets.forEach((off) => {
            const e = new Enemy();
            e.type = type;
            e.width = width;
            e.height = height;
            e.hp = Math.ceil(hp * this.getAssaultHpMultiplier(tier));
            e.vy = vy;
            e.vx = vx;
            e.x = baseCX + off.rx - width / 2;
            e.y = -50 + off.ry;
            e.visualId = visualId;
            this.enemies.push(e);
          });
        } else {
          // CONVOY COLUMN: 3 marching in vertical order
          for (let i = 0; i < 3; i++) {
            const e = new Enemy();
            e.type = type;
            e.width = width;
            e.height = height;
            e.hp = Math.ceil(hp * this.getAssaultHpMultiplier(tier));
            e.vy = vy;
            e.vx = vx;
            e.x = baseCX - width / 2;
            e.y = -50 - i * 50;
            e.visualId = visualId;
            this.enemies.push(e);
          }
        }
      } else {
        // Normal single spawn unit
        const e = new Enemy();
        e.x = Math.random() * (this.canvas.width - width);
        e.y = -40;
        e.type = type;
        e.width = width;
        e.height = height;
        e.hp = Math.ceil(hp * this.getAssaultHpMultiplier(tier));
        e.vy = vy;
        e.vx = vx;
        e.visualId = visualId;
        this.enemies.push(e);
      }
    }

    // Limit active circle_shooters on field to maximum 5 to guarantee clean playability & aesthetic bullet hell balance
    const activeCircles = this.enemies.filter(
      (e) => e.active && e.type === "circle_shooter",
    );
    if (activeCircles.length > 5) {
      const excess = activeCircles.length - 5;
      for (let i = 0; i < excess; i++) {
        activeCircles[i].type = "aimed";
        activeCircles[i].visualId = 1; // Default aimed sprite
      }
    }
  }

  public triggerSandboxWave(waveType: number) {
    this.sandboxMode = "wave";
    this.sandboxActiveWave = waveType;
    this.enemies = []; // Clear current sandbox target
    this.bullets = []; // Clear projectiles
    this.inkClouds = []; // Clear ink screen
    this.particles = []; // Clear debris

    if (waveType === 0) {
      // Horizontal Row - fast deploy across the screen
      const count = 5;
      const spacing = (this.canvas.width - 120) / (count - 1);
      const targetY = 80;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "column_shooter";
        e.x = 60 + i * spacing - 12;
        e.y = -60; // Spawn off-screen top
        e.vy = 400; // Fast drop descent
        e.spawnPoint = targetY;
        e.width = 24;
        e.height = 24;
        e.visualId = 4;
        this.enemies.push(e);
      }
    } else if (waveType === 1) {
      // Circle expanding from top center
      const count = Math.floor(Math.random() * 6) + 3; // 3 to 8
      const cx = this.canvas.width / 2 - 12;
      const cy = -50;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const e = new Enemy();
        e.type = "circle_shooter";
        e.x = cx;
        e.y = cy;
        e.vx = Math.cos(a) * 80;
        e.vy = Math.sin(a) * 80 + 150; // fast move out
        e.width = 28;
        e.height = 28;
        e.visualId = 2;
        this.enemies.push(e);
      }
    } else if (waveType === 2) {
      // V formation 360 - perfectly symmetrical
      const rows = Math.floor(Math.random() * 2) + 4; // 4 to 5 rows
      for (let i = 0; i < rows; i++) {
        const yOffset = -50 - i * 35;
        const eL = new Enemy();
        eL.type = "v_360_shooter";
        eL.x = 80 + i * 25;
        eL.y = yOffset;
        eL.vy = 200;
        eL.spawnPoint = 80 + i * 28;
        eL.width = 28;
        eL.height = 28;
        eL.visualId = 5;
        this.enemies.push(eL);

        const eR = new Enemy();
        eR.type = "v_360_shooter";
        eR.x = this.canvas.width - 108 - i * 25;
        eR.y = yOffset;
        eR.vy = 200;
        eR.spawnPoint = 80 + i * 28;
        eR.width = 28;
        eR.height = 28;
        eR.visualId = 5;
        this.enemies.push(eR);
      }
    } else if (waveType === 3) {
      // (Wave 1) Gear Rotation Wave
      const count = 4;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "gear_rotate";
        e.x = (this.canvas.width / 5) * (i + 1) - 15;
        e.y = -60;
        e.vy = 220;
        e.spawnPoint = 100 + (i % 2) * 40;
        e.width = 30;
        e.height = 30;
        e.hp = 6;
        e.visualId = 3;
        this.enemies.push(e);
      }
    } else if (waveType === 4) {
      // (Wave 2) Cross-X Formation Wave
      const count = 5;
      const centerIdx = 2;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "cross_x";
        e.x = (this.canvas.width / 6) * (i + 1) - 15;
        e.y = -60 - Math.abs(i - centerIdx) * 40; // diagonal spawn delay
        e.vy = 220;
        e.spawnPoint = 110 + Math.abs(i - centerIdx) * 30;
        e.width = 30;
        e.height = 30;
        e.hp = 5;
        e.visualId = 4;
        this.enemies.push(e);
      }
    } else if (waveType === 5) {
      // (Wave 3) Zig-Zag Wave
      const count = 5;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "zigzag_wave";
        e.x = (this.canvas.width / 6) * (i + 1) - 15;
        e.y = -60 - i * 30;
        e.vy = 180;
        e.spawnPoint = 130 + (i % 2) * 50;
        e.vx = i % 2 === 0 ? 120 : -120;
        e.width = 28;
        e.height = 28;
        e.hp = 4;
        e.visualId = 5;
        this.enemies.push(e);
      }
    } else if (waveType === 6) {
      // (Wave 4) Encirclement Wave
      const count = 6;
      const cx = this.canvas.width / 2;
      const cy = -120;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = 120;
        const e = new Enemy();
        e.type = "encirclement";
        e.x = cx + Math.cos(angle) * radius - 15;
        e.y = cy + Math.sin(angle) * radius;
        e.vy = 140; // moving downward together
        e.vx = (Math.random() - 0.5) * 50;
        e.width = 28;
        e.height = 28;
        e.hp = 5;
        e.visualId = 6;
        this.enemies.push(e);
      }
    } else if (waveType === 7) {
      // (Wave 5) Train Convoy Wave
      const count = 5;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = i === 0 ? "train_leader" : "train_follower";
        e.x = this.canvas.width / 2 - 15;
        e.y = -60 - i * 45; // spawned in single file trail
        e.vy = 160;
        e.spawnPoint = 140;
        e.width = i === 0 ? 32 : 26;
        e.height = i === 0 ? 32 : 26;
        e.hp = i === 0 ? 12 : 3;
        e.visualId = i === 0 ? 1 : 2;
        this.enemies.push(e);
      }
    } else if (waveType === 8) {
      // (Wave 6) Split Cluster Storm
      const count = 3;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "split_cluster";
        e.x = (this.canvas.width / 4) * (i + 1) - 15;
        e.y = -60;
        e.vy = 180;
        e.spawnPoint = 100 + i * 30;
        e.vx = i === 1 ? 150 : -150;
        e.hp = 6;
        e.width = 30;
        e.height = 30;
        e.visualId = 3;
        this.enemies.push(e);
      }
    } else if (waveType === 9) {
      // (Wave 7) Minefield Grid
      const count = 3;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "mine_layer";
        e.x = (this.canvas.width / 4) * (i + 1) - 15;
        e.y = -60;
        e.vy = 160;
        e.spawnPoint = 100 + i * 25;
        e.vx = i % 2 === 0 ? 120 : -120;
        e.hp = 8;
        e.width = 32;
        e.height = 32;
        e.visualId = 8;
        this.enemies.push(e);
      }
    } else if (waveType === 10) {
      // (Wave 8) Pair Barricade Trap
      for (let i = 0; i < 2; i++) {
        const e = new Enemy();
        e.type = "barricade_wall";
        // positioned left and right
        e.x = i === 0 ? 55 : this.canvas.width - 55 - 28;
        e.y = -60;
        e.vy = 35; // slow descend together
        e.hp = 20;
        e.width = 28;
        e.height = 28;
        e.visualId = 7;
        this.enemies.push(e);
      }
    } else if (waveType === 11) {
      // (Wave 9) Tactical Boomerang / Satellite Orbit Group
      const eOrbit = new Enemy();
      eOrbit.type = "boomerang_orbit";
      eOrbit.x = this.canvas.width / 2 - 18;
      eOrbit.y = -60;
      eOrbit.vy = 180;
      eOrbit.spawnPoint = 100;
      eOrbit.hp = 10;
      eOrbit.width = 36;
      eOrbit.height = 36;
      eOrbit.visualId = 10;
      this.enemies.push(eOrbit);

      const countShield = 2;
      for (let i = 0; i < countShield; i++) {
        const eShield = new Enemy();
        eShield.type = "satellite_shield";
        eShield.x = i === 0 ? 80 : this.canvas.width - 80 - 32;
        eShield.y = -100;
        eShield.vy = 85;
        eShield.hp = 8;
        eShield.width = 32;
        eShield.height = 32;
        eShield.visualId = 7;
        this.enemies.push(eShield);
      }
    } else if (waveType === 12) {
      // (Wave 10) Deceleration Paint Squad
      const count = 3;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "dash_paint";
        e.x = (this.canvas.width / 4) * (i + 1) - 15;
        e.y = -60;
        e.vy = 180;
        e.spawnPoint = 110 + i * 20;
        e.vx = i === 1 ? -180 : 180;
        e.hp = 6;
        e.width = 30;
        e.height = 30;
        e.visualId = 9;
        this.enemies.push(e);
      }
    } else if (waveType === 13) {
      // (Wave 11) Hardcore Chaos Combo Spawn (The Ultimate Regular Mob Spawning Combo!)
      const eOrbit = new Enemy();
      eOrbit.type = "boomerang_orbit";
      eOrbit.x = this.canvas.width / 2 - 18;
      eOrbit.y = -80;
      eOrbit.vy = 180;
      eOrbit.spawnPoint = 120;
      eOrbit.hp = 10;
      eOrbit.width = 36;
      eOrbit.height = 36;
      eOrbit.visualId = 10;
      this.enemies.push(eOrbit);

      const eShield = new Enemy();
      eShield.type = "satellite_shield";
      eShield.x = this.canvas.width / 2 - 16;
      eShield.y = -150;
      eShield.vy = 75;
      eShield.hp = 8;
      eShield.width = 32;
      eShield.height = 32;
      eShield.visualId = 7;
      this.enemies.push(eShield);

      for (let i = 0; i < 2; i++) {
        const e = new Enemy();
        e.type = "dash_paint";
        e.x = i === 0 ? 40 : this.canvas.width - 70;
        e.y = -60;
        e.vy = 190;
        e.spawnPoint = 100;
        e.vx = i === 0 ? 150 : -150;
        e.hp = 5;
        e.width = 30;
        e.height = 30;
        e.visualId = 9;
        this.enemies.push(e);
      }
    } else if (waveType === 14) {
      // (Wave 12) Ricochet Bouncing Strike
      const count = 3;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "ricochet_shooter";
        e.x = (this.canvas.width / 4) * (i + 1) - 15;
        e.y = -60;
        e.vy = 110;
        e.hp = 5;
        e.width = 30;
        e.height = 30;
        e.visualId = 5;
        this.enemies.push(e);
      }
    } else if (waveType === 15) {
      // (Wave 13) Martyr Counter Shield Wall
      const count = 3;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "counter_on_death";
        e.x = (this.canvas.width / 4) * (i + 1) - 15;
        e.y = -60;
        e.vy = 100;
        e.hp = 8;
        e.width = 30;
        e.height = 30;
        e.visualId = 7;
        this.enemies.push(e);
      }
    } else if (waveType === 16) {
      // (Wave 14) Ink Blind Spot Smoke Camouflage
      const count = 2;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "ink_shooter";
        e.x =
          (i === 0 ? this.canvas.width * 0.3 : this.canvas.width * 0.7) - 15;
        e.y = -60;
        e.vx = i === 0 ? 45 : -45;
        e.vy = 95;
        e.spawnPoint = 110;
        e.hp = 6;
        e.width = 28;
        e.height = 28;
        e.visualId = 4;
        this.enemies.push(e);
      }
    } else if (waveType === 17) {
      // (Wave 15) Gravity Singularity Vortex Clenches
      const count = 2;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "gravity_vortex_mob";
        e.x =
          (i === 0 ? this.canvas.width * 0.25 : this.canvas.width * 0.75) - 15;
        e.y = -70;
        e.vx = i === 0 ? 30 : -30;
        e.vy = 75;
        e.spawnPoint = 140;
        e.hp = 7;
        e.width = 30;
        e.height = 30;
        e.visualId = 10;
        this.enemies.push(e);
      }
    }
  }

  // 10 distinct enemy visual rendering patterns
  private renderEnemyShape(e: Enemy) {
    if (e.type === "ricochet_shooter") {
      this.ctx.fillStyle = "#fbbf24"; // Golden Neon
    } else if (e.type === "counter_on_death") {
      this.ctx.fillStyle = "#f43f5e"; // Rose Crimson
    } else if (e.type === "ink_shooter") {
      this.ctx.fillStyle = "#818cf8"; // Slate Indigo
    } else if (e.type === "gravity_vortex_mob") {
      this.ctx.fillStyle = "#c084fc"; // Purple Vortex
    } else if (e.type === "assault_commander") {
      this.ctx.fillStyle = "#0f172a"; // Heavy assault command craft
    } else {
      this.ctx.fillStyle =
        e.type === "boss"
          ? "#dc2626"
          : `hsl(${(e.visualId * 36) % 360}, 80%, 50%)`;
    }
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 1;

    this.ctx.save();
    this.ctx.translate(e.x + e.width / 2, e.y + e.height / 2);

    const w2 = e.width / 2;
    const h2 = e.height / 2;

    if (e.type === "assault_commander") {
      const pulse = 0.65 + Math.sin(performance.now() * 0.009) * 0.25;
      const accent = this.getCombatTier() >= 3 ? "#c084fc" : "#22d3ee";

      this.ctx.fillStyle = "#020617";
      this.ctx.strokeStyle = accent;
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = accent;
      this.ctx.shadowBlur = 14;

      this.ctx.beginPath();
      this.ctx.moveTo(0, h2);
      this.ctx.lineTo(-w2 * 0.38, h2 * 0.26);
      this.ctx.lineTo(-w2, h2 * 0.08);
      this.ctx.lineTo(-w2 * 0.58, -h2 * 0.18);
      this.ctx.lineTo(-w2 * 0.24, -h2);
      this.ctx.lineTo(0, -h2 * 0.62);
      this.ctx.lineTo(w2 * 0.24, -h2);
      this.ctx.lineTo(w2 * 0.58, -h2 * 0.18);
      this.ctx.lineTo(w2, h2 * 0.08);
      this.ctx.lineTo(w2 * 0.38, h2 * 0.26);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = accent;
      this.ctx.globalAlpha = 0.35 + pulse * 0.35;
      this.ctx.fillRect(-w2 * 0.72, h2 * 0.08, w2 * 0.34, 5);
      this.ctx.fillRect(w2 * 0.38, h2 * 0.08, w2 * 0.34, 5);
      this.ctx.globalAlpha = 1;

      this.ctx.fillStyle = "#e0f2fe";
      this.ctx.beginPath();
      this.ctx.ellipse(0, -h2 * 0.2, w2 * 0.18, h2 * 0.28, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = accent;
      this.ctx.beginPath();
      this.ctx.arc(0, h2 * 0.18, 5 + pulse * 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
      return;
    }

    this.ctx.beginPath();
    switch (e.visualId) {
      case 1: // Delta wide
        this.ctx.moveTo(0, h2);
        this.ctx.lineTo(-w2, -h2);
        this.ctx.lineTo(w2, -h2);
        break;
      case 2: // UFO saucer
        this.ctx.ellipse(0, 0, w2, h2 * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.fillStyle = "#fff";
        this.ctx.globalAlpha = 0.5;
        this.ctx.arc(0, -h2 * 0.3, w2 * 0.4, 0, Math.PI + Math.PI, true);
        break;
      case 3: // Twin boom dart
        this.ctx.moveTo(0, h2);
        this.ctx.lineTo(-w2 * 0.4, -h2);
        this.ctx.lineTo(-w2 * 0.2, -h2);
        this.ctx.lineTo(0, h2 * 0.4);
        this.ctx.lineTo(w2 * 0.2, -h2);
        this.ctx.lineTo(w2 * 0.4, -h2);
        break;
      case 4: // Blocky Tank
        this.ctx.rect(-w2, -h2, e.width, e.height);
        break;
      case 5: // Star Diamond
        this.ctx.moveTo(0, h2);
        this.ctx.lineTo(-w2, 0);
        this.ctx.lineTo(0, -h2);
        this.ctx.lineTo(w2, 0);
        break;
      case 6: // X-Wing Profile
        this.ctx.moveTo(0, h2);
        this.ctx.lineTo(-w2, h2);
        this.ctx.lineTo(-w2 * 0.5, 0);
        this.ctx.lineTo(-w2, -h2);
        this.ctx.lineTo(0, -h2 * 0.5);
        this.ctx.lineTo(w2, -h2);
        this.ctx.lineTo(w2 * 0.5, 0);
        this.ctx.lineTo(w2, h2);
        break;
      case 7: // Hexagon
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this.ctx.lineTo(Math.cos(a) * w2, Math.sin(a) * h2);
        }
        break;
      case 8: // Bulbous
        this.ctx.arc(0, 0, w2, 0, Math.PI * 2);
        break;
      case 9: // Arrow head
        this.ctx.moveTo(0, h2);
        this.ctx.lineTo(-w2, -h2);
        this.ctx.lineTo(0, -h2 * 0.2);
        this.ctx.lineTo(w2, -h2);
        break;
      case 10: // Scythe
        this.ctx.moveTo(0, h2);
        this.ctx.lineTo(-w2, -h2 * 0.5);
        this.ctx.lineTo(w2, -h2 * 0.5);
        break;
    }
    this.ctx.closePath();
    this.ctx.fill();

    // glowing core
    this.ctx.fillStyle = "#fff";
    this.ctx.globalAlpha = 1.0;
    this.ctx.fillRect(-2, -2, 4, 4);

    // Hardcore defensive or active visual representations
    if (e.type === "counter_on_death") {
      // Rotating Rose Reflector Shield
      const spin = (performance.now() * 0.003) % (Math.PI * 2);
      this.ctx.strokeStyle = "rgba(244, 63, 94, 0.65)";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = spin + (i / 6) * Math.PI * 2;
        const rx = Math.cos(angle) * (w2 + 8);
        const ry = Math.sin(angle) * (h2 + 8);
        this.ctx.lineTo(rx, ry);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    } else if (e.type === "gravity_vortex_mob") {
      // Suction vortex lines
      const spin = (performance.now() * -0.006) % (Math.PI * 2);
      this.ctx.strokeStyle = "rgba(192, 132, 252, 0.5)";
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, w2 + 6, spin, spin + Math.PI * 0.5);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.arc(0, 0, w2 + 6, spin + Math.PI, spin + Math.PI * 1.5);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private getCombatTier(): number {
    if (this.stage >= 4) return 4;
    if (this.bossPhase3Active || this.stage >= 3) return 3;
    if (this.bossPhase2Active || this.stage >= 2) return 2;
    return 1;
  }

  private getAssaultHpMultiplier(tier: number): number {
    if (tier >= 4) return 3.35;
    if (tier >= 3) return 2.65;
    if (tier === 2) return 1.85;
    return 1;
  }

  private scaleAssaultEnemy(e: Enemy, tier: number, elite = false) {
    if (e.type === "boss") return;
    const multiplier = this.getAssaultHpMultiplier(tier) * (elite ? 1.25 : 1);
    e.hp = Math.max(1, Math.ceil(e.hp * multiplier));

    if (tier >= 2 && e.vy > 0) e.vy *= tier === 2 ? 1.05 : 1.12;
    if (tier >= 2 && e.vx !== 0) e.vx *= tier === 2 ? 1.04 : 1.1;
  }

  private spawnAssaultCommander(tier: number) {
    const e = new Enemy();
    e.type = "assault_commander";
    e.width = tier >= 4 ? 116 : tier >= 3 ? 106 : 94;
    e.height = tier >= 4 ? 82 : tier >= 3 ? 74 : 66;
    e.x = this.canvas.width / 2 - e.width / 2 + (Math.random() - 0.5) * 70;
    e.y = -e.height - 20;
    e.vx = (Math.random() < 0.5 ? -1 : 1) * (tier >= 4 ? 180 : tier >= 3 ? 155 : 125);
    e.vy = tier >= 4 ? 185 : tier >= 3 ? 170 : 145;
    e.spawnPoint = tier >= 4 ? 124 : tier >= 3 ? 112 : 96;
    e.hp = tier >= 4 ? 520 : tier >= 3 ? 360 : 230;
    e.visualId = 10;
    e.patternTimer = 0;
    e.shootTimer = 0;
    e.lastShot = 0;
    this.enemies.push(e);

    this.spawnExplosion(e.x + e.width / 2, e.spawnPoint, tier >= 3 ? "#a855f7" : "#22d3ee", 28);
  }

  private fireAssaultCommander(e: Enemy, tier: number) {
    const cx = e.x + e.width / 2;
    const cy = e.y + e.height * 0.72;
    const tx = this.player.x + this.player.width / 2;
    const ty = this.player.y + this.player.height / 2;
    const baseAngle = Math.atan2(ty - cy, tx - cx);
    const count = Math.max(3, tier >= 4 ? 7 : tier >= 3 ? 5 : 3);
    const spread = tier >= 4 ? 0.94 : tier >= 3 ? 0.82 : 0.62;
    const speed = tier >= 4 ? 335 : tier >= 3 ? 310 : 265;

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * (spread / Math.max(1, count - 1));
      const b = new Bullet();
      b.x = cx - 5;
      b.y = cy - 5;
      b.width = tier >= 3 ? 11 : 10;
      b.height = tier >= 3 ? 11 : 10;
      b.vx = Math.cos(baseAngle + offset) * speed;
      b.vy = Math.sin(baseAngle + offset) * speed;
      b.isEnemy = true;
      b.type = "pellet";
      b.color = tier >= 3 ? "#c084fc" : "#22d3ee";
      b.visualType = "phase_core";
      this.bullets.push(b);
    }

    e.rapidFireCount++;
    if (tier >= 3 && e.rapidFireCount % 3 === 0) {
      for (let side = -1; side <= 1; side += 2) {
        const b = new Bullet();
        b.x = cx - 6;
        b.y = cy - 4;
        b.width = 12;
        b.height = 12;
        b.vx = side * 185;
        b.vy = 235;
        b.isEnemy = true;
        b.type = "needle";
        b.color = "#f472b6";
        b.visualType = "comet_needle";
        this.bullets.push(b);
      }
    }
  }

  private renderChapter1ParallaxBackground(isBoss: boolean): boolean {
    if (!this.chapter1BackgroundReady || this.chapter1BackgroundLayers.length !== 3) return false;

    this.ctx.fillStyle = "#02050a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const time = performance.now() / 1000;
    this.chapter1BackgroundLayers.forEach((img, index) => {
      const scale = Math.max(this.canvas.width / img.naturalWidth, this.canvas.height / img.naturalHeight);
      const drawWidth = img.naturalWidth * scale;
      const drawHeight = img.naturalHeight * scale;
      const x = (this.canvas.width - drawWidth) / 2;
      const y = ((time * STORY_CHAPTER1_PARALLAX_SPEEDS[index]) % drawHeight + drawHeight) % drawHeight;

      this.ctx.save();
      this.ctx.globalAlpha = STORY_CHAPTER1_PARALLAX_ALPHAS[index];
      this.ctx.drawImage(img, x, y, drawWidth, drawHeight);
      this.ctx.drawImage(img, x, y - drawHeight, drawWidth, drawHeight);
      this.ctx.restore();
    });

    if (isBoss) {
      this.ctx.save();
      this.ctx.fillStyle = "rgba(2, 6, 23, 0.18)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }

    return true;
  }

  private renderBackground() {
    const tier = this.getCombatTier();
    const isBoss = this.bossActive || this.state === "BOSSCUTSCENE";
    if (tier === 1 && this.renderChapter1ParallaxBackground(isBoss)) return;
    const time = performance.now();
    const topColors = isBoss
      ? tier >= 4
        ? ["#18051f", "#581c87", "#020617"]
        : tier === 3
        ? ["#12081f", "#2e1065", "#020617"]
        : tier === 2
          ? ["#111827", "#4c0519", "#020617"]
          : ["#111827", "#1e293b", "#020617"]
      : tier >= 4
        ? ["#06121f", "#4a044e", "#020617"]
        : tier === 3
        ? ["#07111f", "#312e81", "#020617"]
        : tier === 2
          ? ["#07111f", "#164e63", "#020617"]
          : ["#020617", "#0f172a", "#020617"];

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, topColors[0]);
    gradient.addColorStop(0.45, topColors[1]);
    gradient.addColorStop(1, topColors[2]);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const starCount = isBoss ? 68 : 44 + tier * 10;
    for (let i = 0; i < starCount; i++) {
      const sx = (time * (0.025 + tier * 0.006) + i * 147) % this.canvas.width;
      const sy = (time * 0.13 * ((i % 4) + 1) + i * 254) % this.canvas.height;
      this.ctx.globalAlpha = 0.18 + (i % 5) * 0.12;
      this.ctx.fillStyle = tier >= 4 && i % 4 === 0 ? "#f0abfc" : tier === 3 && i % 6 === 0 ? "#c084fc" : tier === 2 && i % 5 === 0 ? "#22d3ee" : "#ffffff";
      this.ctx.fillRect(sx, sy, 1 + (i % 3), 1 + (i % 3));
    }

    this.ctx.globalAlpha = isBoss ? 0.22 : 0.12;
    this.ctx.strokeStyle = tier >= 4 ? "#e879f9" : tier === 3 ? "#a855f7" : tier === 2 ? "#06b6d4" : "#334155";
    this.ctx.lineWidth = 1;
    const gridStep = tier >= 4 ? 32 : tier === 3 ? 38 : tier === 2 ? 48 : 60;
    const drift = (time * 0.035) % gridStep;
    for (let y = -gridStep; y < this.canvas.height + gridStep; y += gridStep) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + drift);
      this.ctx.lineTo(this.canvas.width, y + drift + (isBoss ? 20 : 8));
      this.ctx.stroke();
    }

    if (isBoss) {
      this.ctx.globalAlpha = 0.16;
      this.ctx.fillStyle = tier >= 4 ? "#e879f9" : tier === 3 ? "#a855f7" : tier === 2 ? "#f43f5e" : "#38bdf8";
      for (let i = 0; i < 5 + tier * 2; i++) {
        const x = ((time * 0.05 + i * 91) % (this.canvas.width + 120)) - 60;
        this.ctx.fillRect(x, 0, 2, this.canvas.height);
      }
    }

    this.ctx.globalAlpha = 1.0;
  }

  private renderBossJet(e: Enemy, tier: number) {
    const cx = e.x + e.width / 2;
    const top = e.y;
    const bottom = e.y + e.height;
    const w2 = e.width / 2;
    const h = e.height;
    const time = performance.now() * 0.018;
    const accent = tier >= 4 ? "#e879f9" : tier === 3 ? "#a855f7" : tier === 2 ? "#f43f5e" : "#38bdf8";
    const armor = tier >= 4 ? "#18181b" : tier === 3 ? "#111827" : tier === 2 ? "#1e293b" : "#334155";
    const dark = "#020617";

    this.ctx.save();

    const engineOffsets = tier >= 4 ? [-82, -48, -16, 16, 48, 82] : tier === 3 ? [-70, -35, 0, 35, 70] : tier === 2 ? [-46, -18, 18, 46] : [-28, 28];
    engineOffsets.forEach((offset, index) => {
      const flame = 14 + Math.sin(time + index) * 5 + tier * 4;
      this.ctx.fillStyle = tier >= 4 ? "rgba(232, 121, 249, 0.82)" : tier === 3 ? "rgba(168, 85, 247, 0.8)" : tier === 2 ? "rgba(244, 63, 94, 0.75)" : "rgba(34, 211, 238, 0.7)";
      this.ctx.beginPath();
      this.ctx.moveTo(cx + offset - 8, top + 6);
      this.ctx.lineTo(cx + offset, top - flame);
      this.ctx.lineTo(cx + offset + 8, top + 6);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.fillStyle = "#ffffff";
      this.ctx.globalAlpha = 0.55;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + offset - 3, top + 5);
      this.ctx.lineTo(cx + offset, top - flame * 0.55);
      this.ctx.lineTo(cx + offset + 3, top + 5);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    });

    this.ctx.shadowColor = accent;
    this.ctx.shadowBlur = 8 + tier * 4;
    this.ctx.fillStyle = dark;
    this.ctx.strokeStyle = accent;
    this.ctx.lineWidth = 2.2 + tier * 0.4;

    for (let side = -1; side <= 1; side += 2) {
      const wingReach = w2 + 28 + tier * 20;
      const wingBack = tier >= 4 ? 26 : tier === 3 ? 18 : 8;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + side * 16, top + h * 0.25);
      this.ctx.lineTo(cx + side * wingReach, top + h * 0.62);
      this.ctx.lineTo(cx + side * (wingReach - 20), bottom + wingBack);
      this.ctx.lineTo(cx + side * 26, top + h * 0.74);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = armor;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + side * 26, top + h * 0.46);
      this.ctx.lineTo(cx + side * (wingReach - 18), top + h * 0.68);
      this.ctx.lineTo(cx + side * 38, top + h * 0.68);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.fillStyle = dark;
    }

    this.ctx.fillStyle = armor;
    this.ctx.strokeStyle = accent;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 28 - tier * 4, top + 8);
    this.ctx.lineTo(cx + 28 + tier * 4, top + 8);
    this.ctx.lineTo(cx + 22 + tier * 3, top + h * 0.48);
    this.ctx.lineTo(cx + 9 + tier * 2, bottom - 10);
    this.ctx.lineTo(cx, bottom + tier * 8);
    this.ctx.lineTo(cx - 9 - tier * 2, bottom - 10);
    this.ctx.lineTo(cx - 22 - tier * 3, top + h * 0.48);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.shadowBlur = 12 + tier * 4;
    this.ctx.fillStyle = tier >= 4 ? "#f5d0fe" : tier === 1 ? "#67e8f9" : tier === 2 ? "#fda4af" : "#ddd6fe";
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 10 - tier * 2, top + h * 0.38);
    this.ctx.lineTo(cx + 10 + tier * 2, top + h * 0.38);
    this.ctx.lineTo(cx + 5 + tier, top + h * 0.6);
    this.ctx.lineTo(cx - 5 - tier, top + h * 0.6);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = "rgba(255,255,255,0.22)";
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, top + 16);
    this.ctx.lineTo(cx, bottom - 18);
    this.ctx.moveTo(cx - 32, top + h * 0.7);
    this.ctx.lineTo(cx + 32, top + h * 0.7);
    this.ctx.stroke();

    this.ctx.fillStyle = dark;
    const podW = tier >= 4 ? 24 : tier === 3 ? 20 : 15;
    const podH = tier >= 4 ? 56 : tier === 3 ? 48 : 36;
    this.ctx.fillRect(e.x - podW, top + h * 0.28, podW, podH);
    this.ctx.fillRect(e.x + e.width, top + h * 0.28, podW, podH);
    this.ctx.strokeStyle = accent;
    this.ctx.strokeRect(e.x - podW, top + h * 0.28, podW, podH);
    this.ctx.strokeRect(e.x + e.width, top + h * 0.28, podW, podH);

    this.ctx.restore();
  }

  private getBulletVisualType(b: Bullet): BulletVisualType {
    if (b.visualType) return b.visualType;
    if (b.type === "electric_missile") return "tesla_spine_missile";
    if (b.type === "tail_rocket") return "comet_spear";
    if (b.type === "recall_shard" || b.type === "crystal" || b.type === "ricochet") return "rift_shard";
    if (b.type === "void_mine" || b.type === "parent_cross" || b.type === "parent_nsplit" || b.type === "splitting_pellet") return "cracked_core";
    if (b.type === "gravity_ball" || b.type === "gravity_singularity" || b.type === "colliding_orb" || b.type === "heavy") return "core_orb";
    if (b.type === "needle") return "comet_needle";
    if (b.type === "homing" || b.type === "delayed") return "drone_missile";
    if (b.type === "ring") return "star_beacon";
    if (b.type === "dash_paint_bullet" || b.type === "dilation_bullet") return "phase_core";
    if (b.type === "mine_orb") return "spore_glob";
    if (b.type === "plasma") return "cosmic_plasma_core";
    return "plasma_bolt";
  }

  private renderEnemyBulletVisual(b: Bullet, visualType: BulletVisualType, cx: number, cy: number) {
    switch (visualType) {
      case "comet_needle":
        this.renderCometNeedle(b, cx, cy);
        break;
      case "core_orb":
        this.renderCoreOrb(b, cx, cy);
        break;
      case "cracked_core":
        this.renderCrackedCore(b, cx, cy);
        break;
      case "drone_missile":
        this.renderDroneMissile(b, cx, cy);
        break;
      case "tesla_spark":
        this.renderTeslaSpark(b, cx, cy);
        break;
      case "spore_glob":
        this.renderSporeGlob(b, cx, cy);
        break;
      case "cosmic_plasma_core":
        this.renderCosmicPlasmaCore(b, cx, cy);
        break;
      case "comet_spear":
        this.renderCometSpear(b, cx, cy);
        break;
      case "tesla_spine_missile":
        this.renderTeslaSpineMissile(b, cx, cy);
        break;
      case "rift_shard":
        this.renderRiftShard(b, cx, cy);
        break;
      case "phase_core":
        this.renderPhaseCore(b, cx, cy);
        break;
      case "star_beacon":
        this.renderStarBeacon(b, cx, cy);
        break;
      default:
        this.renderPlasmaBolt(b, cx, cy);
    }
  }

  private renderPlasmaBolt(b: Bullet, cx: number, cy: number) {
    const r = Math.max(b.width, b.height) * 1.4;
    const grad = this.ctx.createRadialGradient(cx, cy, r * 0.12, cx, cy, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.34, b.color);
    grad.addColorStop(1, "rgba(15,23,42,0)");
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = b.color;
    this.ctx.lineWidth = 1.25;
    this.ctx.globalAlpha = 0.85;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private renderCometNeedle(b: Bullet, cx: number, cy: number) {
    const angle = Math.atan2(b.vy, b.vx);
    const length = Math.max(b.width, b.height) * 3.1;
    const thickness = Math.max(4, Math.min(b.width, b.height) * 0.8);
    this.ctx.translate(cx, cy);
    this.ctx.rotate(angle);
    this.ctx.shadowColor = b.color;
    this.ctx.shadowBlur = 12;
    this.ctx.fillStyle = "rgba(255,255,255,0.18)";
    this.ctx.beginPath();
    this.ctx.moveTo(length * 0.58, 0);
    this.ctx.lineTo(-length * 0.52, -thickness * 1.45);
    this.ctx.lineTo(-length * 0.2, 0);
    this.ctx.lineTo(-length * 0.52, thickness * 1.45);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.fillStyle = b.color;
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 1.4;
    this.ctx.beginPath();
    this.ctx.moveTo(length * 0.52, 0);
    this.ctx.lineTo(-length * 0.22, -thickness * 0.62);
    this.ctx.lineTo(-length * 0.42, 0);
    this.ctx.lineTo(-length * 0.22, thickness * 0.62);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  private renderCoreOrb(b: Bullet, cx: number, cy: number) {
    const r = Math.max(b.width, b.height) * 1.55;
    const grad = this.ctx.createRadialGradient(cx, cy, r * 0.12, cx, cy, r);
    grad.addColorStop(0, "#030712");
    grad.addColorStop(0.48, "#1e1b4b");
    grad.addColorStop(0.82, b.color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = "#f472b6";
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.85;
    const spin = performance.now() * 0.008;
    this.ctx.beginPath();
    for (let i = 0; i < 4; i++) this.ctx.arc(cx, cy, r * 0.52, spin + i * Math.PI / 2, spin + i * Math.PI / 2 + 1.35);
    this.ctx.stroke();
  }

  private renderCrackedCore(b: Bullet, cx: number, cy: number) {
    const r = Math.max(b.width, b.height) * 1.08;
    const spin = performance.now() * 0.004 + (b.age || 0) * 2;
    this.ctx.translate(cx, cy);
    this.ctx.rotate(spin);
    this.ctx.shadowColor = b.color;
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = "#042f2e";
    this.ctx.strokeStyle = b.color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = i % 2 === 0 ? r * 1.18 : r * 0.56;
      if (i === 0) this.ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else this.ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.strokeStyle = "#ccfbf1";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(-r * 0.6, -r * 0.15);
    this.ctx.lineTo(-r * 0.05, r * 0.2);
    this.ctx.lineTo(r * 0.58, -r * 0.28);
    this.ctx.moveTo(-r * 0.35, r * 0.48);
    this.ctx.lineTo(r * 0.28, r * 0.1);
    this.ctx.stroke();
  }

  private renderDroneMissile(b: Bullet, cx: number, cy: number) {
    const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
    const w = Math.max(8, b.width * 0.75);
    const h = Math.max(18, b.height * 1.4);
    this.ctx.translate(cx, cy);
    this.ctx.rotate(angle);
    this.ctx.shadowColor = b.color;
    this.ctx.shadowBlur = 12;
    this.ctx.fillStyle = "rgba(255,255,255,0.16)";
    this.ctx.beginPath();
    this.ctx.ellipse(0, h * 0.12, w * 1.05, h * 0.8, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = "#020617";
    this.ctx.strokeStyle = b.color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -h * 0.62);
    this.ctx.lineTo(w * 0.72, -h * 0.12);
    this.ctx.lineTo(w * 0.44, h * 0.56);
    this.ctx.lineTo(0, h * 0.34);
    this.ctx.lineTo(-w * 0.44, h * 0.56);
    this.ctx.lineTo(-w * 0.72, -h * 0.12);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(-2, -h * 0.18, 4, h * 0.36);
  }

  private renderTeslaSpark(b: Bullet, cx: number, cy: number) {
    const len = Math.max(b.width, b.height) * 2.4;
    const angle = Math.atan2(b.vy, b.vx);
    this.ctx.translate(cx, cy);
    this.ctx.rotate(angle);
    this.ctx.shadowColor = "#67e8f9";
    this.ctx.shadowBlur = 15;
    this.ctx.strokeStyle = b.color || "#67e8f9";
    this.ctx.lineWidth = 2.4;
    this.ctx.beginPath();
    this.ctx.moveTo(-len * 0.5, 0);
    for (let i = 1; i <= 5; i++) {
      this.ctx.lineTo(-len * 0.5 + (len * i) / 5, (Math.random() - 0.5) * 12);
    }
    this.ctx.stroke();
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private renderSporeGlob(b: Bullet, cx: number, cy: number) {
    const r = Math.max(b.width, b.height) * 1.2;
    this.ctx.shadowColor = b.color;
    this.ctx.shadowBlur = 12;
    this.ctx.fillStyle = "rgba(134, 239, 172, 0.25)";
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = b.color;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i++) {
      const a = performance.now() * 0.002 + i * 2.1;
      this.ctx.beginPath();
      this.ctx.arc(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, r * 0.12, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderCosmicPlasmaCore(b: Bullet, cx: number, cy: number) {
    const r = Math.max(b.width, b.height) * 1.42;
    const speed = Math.hypot(b.vx, b.vy) || 1;
    const tailX = cx - (b.vx / speed) * r * 2.4;
    const tailY = cy - (b.vy / speed) * r * 2.4;
    const tail = this.ctx.createLinearGradient(tailX, tailY, cx, cy);
    tail.addColorStop(0, "rgba(34,211,238,0)");
    tail.addColorStop(1, "rgba(34,211,238,0.55)");
    this.ctx.strokeStyle = tail;
    this.ctx.lineWidth = r * 1.1;
    this.ctx.beginPath();
    this.ctx.moveTo(tailX, tailY);
    this.ctx.lineTo(cx, cy);
    this.ctx.stroke();
    this.ctx.shadowColor = "#22d3ee";
    this.ctx.shadowBlur = 18;
    const grad = this.ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.42, "#67e8f9");
    grad.addColorStop(1, "rgba(125, 211, 252, 0)");
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = "#a78bfa";
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private renderCometSpear(b: Bullet, cx: number, cy: number) {
    const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
    const color = b.color || "#38bdf8";
    this.ctx.translate(cx, cy);
    this.ctx.rotate(angle);
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 16;
    this.ctx.fillStyle = "rgba(14,165,233,0.18)";
    this.ctx.beginPath();
    this.ctx.ellipse(0, 10, 12, 34, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = "#082f49";
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2.1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -24);
    this.ctx.lineTo(10, -3);
    this.ctx.lineTo(6, 20);
    this.ctx.lineTo(0, 12);
    this.ctx.lineTo(-6, 20);
    this.ctx.lineTo(-10, -3);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(-2.5, -9, 5, 14);
  }

  private renderTeslaSpineMissile(b: Bullet, cx: number, cy: number) {
    const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
    this.ctx.translate(cx, cy);
    this.ctx.rotate(angle);
    this.ctx.shadowColor = "#a3e635";
    this.ctx.shadowBlur = 18;
    this.ctx.strokeStyle = "rgba(103,232,249,0.9)";
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo((Math.random() - 0.5) * 10, 24 + i * 8);
      this.ctx.lineTo((Math.random() - 0.5) * 20, 40 + i * 8);
      this.ctx.stroke();
    }
    this.ctx.fillStyle = "#020617";
    this.ctx.strokeStyle = "#a3e635";
    this.ctx.lineWidth = 2.4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -25);
    this.ctx.lineTo(12, -5);
    this.ctx.lineTo(8, 18);
    this.ctx.lineTo(3, 10);
    this.ctx.lineTo(0, 26);
    this.ctx.lineTo(-3, 10);
    this.ctx.lineTo(-8, 18);
    this.ctx.lineTo(-12, -5);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -16);
    this.ctx.lineTo(0, 13);
    this.ctx.moveTo(-7, -3);
    this.ctx.lineTo(7, -3);
    this.ctx.stroke();
  }

  private renderRiftShard(b: Bullet, cx: number, cy: number) {
    const spin = performance.now() * 0.007 + cx * 0.01;
    const r = Math.max(b.width, b.height) * 1.35;
    this.ctx.translate(cx, cy);
    this.ctx.rotate(spin);
    this.ctx.shadowColor = b.color;
    this.ctx.shadowBlur = 14;
    this.ctx.fillStyle = "rgba(45,212,191,0.22)";
    this.ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.42;
      if (i === 0) this.ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else this.ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 1.35;
    this.ctx.stroke();
    this.ctx.fillStyle = b.color;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderPhaseCore(b: Bullet, cx: number, cy: number) {
    const w = b.width * 1.45;
    const h = b.height * 1.45;
    const frozen = b.type === "dilation_bullet" && b.dilationState === "frozen";
    const jitter = frozen ? 4.5 : 2.0;
    const gx = cx + (Math.random() - 0.5) * jitter;
    const gy = cy + (Math.random() - 0.5) * jitter;
    this.ctx.globalAlpha = 0.72;
    this.ctx.fillStyle = "#22d3ee";
    this.ctx.fillRect(gx - w / 2 - 3, gy - h / 2 + 1, w, h);
    this.ctx.fillStyle = "#ef4444";
    this.ctx.fillRect(gx - w / 2 + 2, gy - h / 2 - 2, w, h);
    this.ctx.globalAlpha = 0.95;
    this.ctx.fillStyle = b.color;
    this.ctx.fillRect(gx - w / 2, gy - h / 2, w, h);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(gx - w * 0.22, gy - h * 0.22, w * 0.44, h * 0.44);
  }

  private renderStarBeacon(b: Bullet, cx: number, cy: number) {
    const r = Math.max(b.width, b.height) * 1.45;
    this.ctx.shadowColor = b.color;
    this.ctx.shadowBlur = 14;
    this.ctx.strokeStyle = b.color;
    this.ctx.lineWidth = 4.8;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 1.4;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(cx - r, cy);
    this.ctx.lineTo(cx + r, cy);
    this.ctx.moveTo(cx, cy - r);
    this.ctx.lineTo(cx, cy + r);
    this.ctx.stroke();
  }

  private renderBossPatternHazards() {
    renderBossPatternHazardsSystem(this);
  }

  render() {
    this.ctx.save();
    if (this.screenShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      this.ctx.translate(shakeX, shakeY);
    }

    this.renderBackground();

    // Player Rendering
    if (!this.player.isDead) {
      if (
        this.player.invulnTimer <= 0 ||
        Math.floor(performance.now() / 80) % 2 === 0
      ) {
        this.ctx.save();
        if (this.player.invulnTimer > 0) this.ctx.globalAlpha = 0.45;

        if (this.player.color === "vanguard") {
          // 1. Futuristic Purple Glowing Aura Base
          const glowSize = 12 + Math.sin(performance.now() * 0.015) * 5;
          this.ctx.save();
          this.ctx.shadowColor = "#d946ef";
          this.ctx.shadowBlur = glowSize;
          this.ctx.fillStyle = "rgba(168, 85, 247, 0.25)";
          this.ctx.beginPath();
          this.ctx.arc(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 16, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();

          // 2. Double Segmented Swept Forward Wings
          this.ctx.fillStyle = "#1e1b4b"; // Heavy obsidian alloy
          this.ctx.strokeStyle = "#c084fc"; // Bright violet accents
          this.ctx.lineWidth = 2.0;

          // Left wing
          this.ctx.beginPath();
          this.ctx.moveTo(this.player.x + this.player.width / 2 - 4, this.player.y + 12);
          this.ctx.lineTo(this.player.x - 10, this.player.y + 24);
          this.ctx.lineTo(this.player.x - 6, this.player.y + this.player.height - 2);
          this.ctx.lineTo(this.player.x + this.player.width / 2 - 2, this.player.y + this.player.height - 8);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          // Right wing
          this.ctx.beginPath();
          this.ctx.moveTo(this.player.x + this.player.width / 2 + 4, this.player.y + 12);
          this.ctx.lineTo(this.player.x + this.player.width + 10, this.player.y + 24);
          this.ctx.lineTo(this.player.x + this.player.width + 6, this.player.y + this.player.height - 2);
          this.ctx.lineTo(this.player.x + this.player.width / 2 + 2, this.player.y + this.player.height - 8);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          // 3. Central Sleek Core Fuselage & Pointer Needle
          this.ctx.fillStyle = "#312e81"; // Royal military violet-blue core
          this.ctx.strokeStyle = "#e9d5ff";
          this.ctx.beginPath();
          this.ctx.moveTo(this.player.x + this.player.width / 2, this.player.y - 6);
          this.ctx.lineTo(this.player.x + this.player.width - 6, this.player.y + this.player.height - 10);
          this.ctx.lineTo(this.player.x + this.player.width / 2, this.player.y + this.player.height - 5);
          this.ctx.lineTo(this.player.x + 6, this.player.y + this.player.height - 10);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          // 4. Reactor core gem
          this.ctx.fillStyle = "#ffffff";
          this.ctx.beginPath();
          this.ctx.arc(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2 + 2, 4, 0, Math.PI * 2);
          this.ctx.fill();

          // 5. Thruster Engine Outburst (Left & Right micro thruster + center heavy plasma)
          // Micro cyan flames
          this.ctx.fillStyle = "#22d3ee";
          this.ctx.fillRect(this.player.x + 1, this.player.y + this.player.height - 4, 3, Math.random() * 8 + 5);
          this.ctx.fillRect(this.player.x + this.player.width - 4, this.player.y + this.player.height - 4, 3, Math.random() * 8 + 5);

          // Center massive glowing thrust
          this.ctx.fillStyle = "#d946ef";
          this.ctx.fillRect(this.player.x + this.player.width / 2 - 3, this.player.y + this.player.height - 2, 6, Math.random() * 18 + 12);
          this.ctx.fillStyle = "#ffffff";
          this.ctx.fillRect(this.player.x + this.player.width / 2 - 1, this.player.y + this.player.height - 2, 2, Math.random() * 10 + 4);

        } else {
          const px = this.player.x;
          const py = this.player.y;
          const cx = px + this.player.width / 2;
          const base = SHIP_COLORS[this.player.color];
          const flame = 8 + Math.random() * 10;

          this.ctx.shadowColor = base;
          this.ctx.shadowBlur = 10;

          this.ctx.fillStyle = "#0f172a";
          this.ctx.strokeStyle = base;
          this.ctx.lineWidth = 2;

          this.ctx.beginPath();
          this.ctx.moveTo(cx - 6, py + 12);
          this.ctx.lineTo(px - 2, py + 33);
          this.ctx.lineTo(px + 5, py + 45);
          this.ctx.lineTo(cx - 3, py + 36);
          this.ctx.lineTo(cx - 2, py + 20);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.moveTo(cx + 6, py + 12);
          this.ctx.lineTo(px + this.player.width + 2, py + 33);
          this.ctx.lineTo(px + this.player.width - 5, py + 45);
          this.ctx.lineTo(cx + 3, py + 36);
          this.ctx.lineTo(cx + 2, py + 20);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          this.ctx.fillStyle = base;
          this.ctx.beginPath();
          this.ctx.moveTo(cx, py - 2);
          this.ctx.lineTo(cx + 14, py + 36);
          this.ctx.lineTo(cx + 6, py + 46);
          this.ctx.lineTo(cx, py + 40);
          this.ctx.lineTo(cx - 6, py + 46);
          this.ctx.lineTo(cx - 14, py + 36);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.strokeStyle = "#e2e8f0";
          this.ctx.stroke();

          this.ctx.fillStyle = "#bae6fd";
          this.ctx.beginPath();
          this.ctx.moveTo(cx - 5, py + 15);
          this.ctx.lineTo(cx + 5, py + 15);
          this.ctx.lineTo(cx + 3, py + 29);
          this.ctx.lineTo(cx - 3, py + 29);
          this.ctx.closePath();
          this.ctx.fill();

          this.ctx.shadowBlur = 0;
          this.ctx.fillStyle = "#64748b";
          this.ctx.fillRect(cx - 14, py + 37, 5, 8);
          this.ctx.fillRect(cx + 9, py + 37, 5, 8);

          this.ctx.fillStyle = "#f97316";
          this.ctx.fillRect(cx - 8, py + 43, 5, flame);
          this.ctx.fillRect(cx + 3, py + 43, 5, flame);
          this.ctx.fillStyle = "#facc15";
          this.ctx.fillRect(cx - 5, py + 43, 2, flame * 0.7);
          this.ctx.fillRect(cx + 6, py + 43, 2, flame * 0.7);
        }

        this.ctx.restore();
      }

      // Draw active player guardian satellites orbiting around player
      if (this.player.satelliteCount > 0) {
        const px = this.player.x + this.player.width / 2;
        const py = this.player.y + this.player.height / 2;
        
        this.ctx.save();
        for (let i = 0; i < this.player.satelliteCount; i++) {
          const angle = (this.playerSatelliteAngle || 0) + (i / this.player.satelliteCount) * Math.PI * 2;
          const sx = px + Math.cos(angle) * 44;
          const sy = py + Math.sin(angle) * 44;

          this.ctx.save();
          this.ctx.translate(sx, sy);
          
          // Outer Protective Shield Ring reflecting dynamic satellite health lives (1 ~ 10 HP)
          const hp = (this.player.satelliteHps && this.player.satelliteHps[i] !== undefined) ? this.player.satelliteHps[i] : 10;
          this.ctx.shadowBlur = 0; // standard focus
          
          // Draw shield circle
          this.ctx.strokeStyle = hp > 4 ? "rgba(34, 211, 238, 0.55)" : "rgba(239, 68, 68, 0.7)";
          this.ctx.lineWidth = 1.5;
          // Segmented arc rendering based on HP percentage to feel incredibly dynamic!
          const arcLength = (hp / 10) * Math.PI * 2;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 9.5, -Math.PI / 2, -Math.PI / 2 + arcLength);
          this.ctx.stroke();

          // Core rotation
          this.ctx.rotate(performance.now() * 0.0035 + i * 1.5);

          // Neon green outer glow matching the star bullets!
          this.ctx.shadowColor = "#34d399";
          this.ctx.shadowBlur = 10;

          // Draw the main companion nucleus
          this.ctx.fillStyle = "#10b981"; // rich emerald green nucleous
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.strokeStyle = "#ffffff";
          this.ctx.lineWidth = 1.25;
          this.ctx.stroke();

          // High-tech mini solar generator wings
          this.ctx.fillStyle = "#34d399";
          this.ctx.fillRect(-8, -1.5, 3, 3);
          this.ctx.fillRect(5, -1.5, 3, 3);

          // If the satellite is recently damaged, render a bright solid white flash overlay!
          if (this.playerSatelliteFlashes && this.playerSatelliteFlashes[i] > 0) {
            this.ctx.shadowColor = "#ffffff";
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = "#ffffff";
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
            this.ctx.fill();
          }

          this.ctx.restore();
        }
        this.ctx.restore();
      }
    }

    // Enemies
    this.enemies.forEach((e) => {
      if (e.type === "boss") {
        // Draw active lasering grid warning lines and active sheets
        if (e.phase === 14) {
          const cycle = (e.shootTimer || 0) % 2.8;
          const xPositions = e.gridLasersX || [
            this.canvas.width / 2 - 100,
            this.canvas.width / 2,
            this.canvas.width / 2 + 100,
          ];
          const yPositions = e.gridLasersY || [
            this.canvas.height / 2 - 100,
            this.canvas.height / 2,
            this.canvas.height / 2 + 100,
          ];

          this.ctx.save();
          if (cycle < 1.2) {
            this.ctx.strokeStyle = "#38bdf8";
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([12, 6]);

            xPositions.forEach((lx) => {
              this.ctx.beginPath();
              this.ctx.moveTo(lx, 0);
              this.ctx.lineTo(lx, this.canvas.height);
              this.ctx.stroke();
            });
            yPositions.forEach((ly) => {
              this.ctx.beginPath();
              this.ctx.moveTo(0, ly);
              this.ctx.lineTo(this.canvas.width, ly);
                this.ctx.stroke();
            });
          } else if (cycle >= 1.2 && cycle < 1.8) {
            const pulse = 4 + Math.sin(performance.now() * 0.05) * 2.5;
            this.ctx.setLineDash([]);
            this.ctx.strokeStyle = "#f43f5e";
            this.ctx.lineWidth = pulse;
            this.ctx.shadowColor = "#f43f5e";
            this.ctx.shadowBlur = 15;
            xPositions.forEach((lx) => {
              this.ctx.beginPath();
              this.ctx.moveTo(lx, 0);
              this.ctx.lineTo(lx, this.canvas.height);
              this.ctx.stroke();
            });
            yPositions.forEach((ly) => {
              this.ctx.beginPath();
              this.ctx.moveTo(0, ly);
              this.ctx.lineTo(this.canvas.width, ly);
              this.ctx.stroke();
            });
          } else if (cycle >= 1.8 && cycle < 2.5) {
            this.ctx.setLineDash([]);
            // Core laser columns/rows
            xPositions.forEach((lx) => {
              this.ctx.shadowColor = "#38bdf8";
              this.ctx.shadowBlur = 22;
              this.ctx.strokeStyle = "rgba(56, 189, 248, 0.88)";
              this.ctx.lineWidth = 36;
              this.ctx.beginPath();
              this.ctx.moveTo(lx, 0);
              this.ctx.lineTo(lx, this.canvas.height);
              this.ctx.stroke();

              this.ctx.strokeStyle = "rgba(167, 139, 250, 0.58)";
              this.ctx.lineWidth = 18;
              this.ctx.beginPath();
              this.ctx.moveTo(lx + Math.sin(performance.now() * 0.02) * 5, 0);
              this.ctx.lineTo(lx + Math.cos(performance.now() * 0.018) * 5, this.canvas.height);
              this.ctx.stroke();

              this.ctx.strokeStyle = "#ffffff";
              this.ctx.lineWidth = 14;
              this.ctx.beginPath();
              this.ctx.moveTo(lx, 0);
              this.ctx.lineTo(lx, this.canvas.height);
              this.ctx.stroke();
            });

            yPositions.forEach((ly) => {
              this.ctx.shadowColor = "#38bdf8";
              this.ctx.shadowBlur = 22;
              this.ctx.strokeStyle = "rgba(56, 189, 248, 0.88)";
              this.ctx.lineWidth = 36;
              this.ctx.beginPath();
              this.ctx.moveTo(0, ly);
              this.ctx.lineTo(this.canvas.width, ly);
              this.ctx.stroke();

              this.ctx.strokeStyle = "rgba(167, 139, 250, 0.58)";
              this.ctx.lineWidth = 18;
              this.ctx.beginPath();
              this.ctx.moveTo(0, ly + Math.sin(performance.now() * 0.02) * 5);
              this.ctx.lineTo(this.canvas.width, ly + Math.cos(performance.now() * 0.018) * 5);
              this.ctx.stroke();

              this.ctx.strokeStyle = "#ffffff";
              this.ctx.lineWidth = 14;
              this.ctx.beginPath();
              this.ctx.moveTo(0, ly);
              this.ctx.lineTo(this.canvas.width, ly);
              this.ctx.stroke();
            });
          }
          this.ctx.restore();
        }

        if (e.phase === 17) {
          const cycle = (e.shootTimer || 0) % 2.8;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          const laserAngle = e.laserAngle !== undefined ? e.laserAngle : Math.PI / 2;
          
          this.ctx.save();
          if (cycle < 1.2) {
            // Tracking Phase: Target player with thin cyan-blue tracking guidance
            this.ctx.strokeStyle = "#38bdf8"; // photon blue warning
            this.ctx.lineWidth = 1.8;
            this.ctx.setLineDash([8, 4]);
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx + Math.cos(laserAngle) * 3000, cy + Math.sin(laserAngle) * 3000);
            this.ctx.stroke();

            // Tiny digital targeting indicator
            const targetX = cx + Math.cos(laserAngle) * 120;
            const targetY = cy + Math.sin(laserAngle) * 120;
            this.ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
            this.ctx.beginPath();
            this.ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
            this.ctx.fill();
          } else if (cycle >= 1.2 && cycle < 1.8) {
            // Locked & Preparing Phase: 0.6 seconds lock
            // Pulsing bright rose red beam to warn the player to jump off the line immediately
            const pulse = 4 + Math.sin(performance.now() * 0.05) * 2.5;
            this.ctx.strokeStyle = "#f43f5e"; // hot rose red lock warning
            this.ctx.lineWidth = pulse;
            this.ctx.shadowColor = "#f43f5e";
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx + Math.cos(laserAngle) * 3000, cy + Math.sin(laserAngle) * 3000);
            this.ctx.stroke();

            // High-tech converging cyber particle charge circles at core
            const progress = (cycle - 1.2) / 0.6; // 0.0 to 1.0 contraction
            const ringR = 40 * (1 - progress) + 6;
            this.ctx.strokeStyle = "rgba(244, 63, 94, 0.9)";
            this.ctx.lineWidth = 2.0;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.fillStyle = "#ffffff";
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 6 + progress * 6, 0, Math.PI * 2);
            this.ctx.fill();
          } else if (cycle >= 1.8 && cycle < 2.5) {
            // Radiant prism sweeping laser explosion
            const length = 3000;
            const hue = (performance.now() * 0.1) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 85%, 60%, 0.85)`;
            this.ctx.lineWidth = 42;
            this.ctx.shadowColor = `hsla(${hue}, 90%, 50%, 0.9)`;
            this.ctx.shadowBlur = 25;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx + Math.cos(laserAngle) * length, cy + Math.sin(laserAngle) * length);
            this.ctx.stroke();

            // Inner super charge white core
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 12;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx + Math.cos(laserAngle) * length, cy + Math.sin(laserAngle) * length);
            this.ctx.stroke();
          }
          this.ctx.restore();
        }

        if (false && e.phase === 28) {
          const cycle = (e.shootTimer || 0) % 4.2;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          const laserAngle = e.laserAngle !== undefined ? e.laserAngle : Math.PI / 2;
          const degree20 = Math.PI / 9;
          const offsets = [-degree20 * 2, -degree20, 0, degree20, degree20 * 2];

          this.ctx.save();
          offsets.forEach((offset, index) => {
            const angle = laserAngle + offset;
            const firing =
              (offset === 0 && cycle >= 1.75 && cycle < 2.15) ||
              (Math.abs(offset) === degree20 && cycle >= 2.45 && cycle < 2.85) ||
              (Math.abs(offset) === degree20 * 2 && cycle >= 3.15 && cycle < 3.55);
            const waiting = cycle < 3.55 && !firing;
            if (!firing && !waiting) return;

            if (firing) {
              const hue = (performance.now() * 0.1 + index * 45) % 360;
              this.ctx.strokeStyle = `hsla(${hue}, 85%, 60%, 0.88)`;
              this.ctx.lineWidth = 40;
              this.ctx.shadowColor = `hsla(${hue}, 90%, 50%, 0.9)`;
              this.ctx.shadowBlur = 24;
              this.ctx.setLineDash([]);
            } else {
              const centerBias = offset === 0 ? 1 : 0.65;
              const blink = Math.floor(performance.now() / 110 + index) % 2 === 0;
              this.ctx.strokeStyle = blink ? `rgba(56, 189, 248, ${0.42 * centerBias})` : `rgba(244, 63, 94, ${0.34 * centerBias})`;
              this.ctx.lineWidth = offset === 0 ? 2.2 : 1.45;
              this.ctx.shadowColor = "#38bdf8";
              this.ctx.shadowBlur = cycle >= 1.35 ? 12 : 5;
              this.ctx.setLineDash([7, 6]);
            }
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx + Math.cos(angle) * 3000, cy + Math.sin(angle) * 3000);
            this.ctx.stroke();

            if (firing) {
              this.ctx.strokeStyle = "#ffffff";
              this.ctx.lineWidth = 11;
              this.ctx.setLineDash([]);
              this.ctx.beginPath();
              this.ctx.moveTo(cx, cy);
              this.ctx.lineTo(cx + Math.cos(angle) * 3000, cy + Math.sin(angle) * 3000);
              this.ctx.stroke();
            }
          });
          this.ctx.restore();
        }

        if (e.phase === 12) {
          const cycle = (e.shootTimer || 0) % 2.8;
          let xPositions: number[] = [];
          let yPositions: number[] = [];
          if (e.leftTurretActive && e.rightTurretActive) {
            xPositions = [
              this.canvas.width * 0.25,
              this.canvas.width * 0.5,
              this.canvas.width * 0.75,
            ];
            yPositions = [
              this.canvas.height * 0.25,
              this.canvas.height * 0.5,
              this.canvas.height * 0.75,
            ];
          } else if (e.leftTurretActive || e.rightTurretActive) {
            xPositions = [this.canvas.width * 0.5];
            yPositions = [this.canvas.height * 0.5];
          }

          this.ctx.save();
          if (cycle < 1.2) {
            this.ctx.strokeStyle = "#38bdf8";
            this.ctx.lineWidth = 1.8;
            this.ctx.setLineDash([10, 8]);

            xPositions.forEach((lx) => {
              this.ctx.beginPath();
              this.ctx.moveTo(lx, 0);
              this.ctx.lineTo(lx, this.canvas.height);
              this.ctx.stroke();
            });
            yPositions.forEach((ly) => {
              this.ctx.beginPath();
              this.ctx.moveTo(0, ly);
              this.ctx.lineTo(this.canvas.width, ly);
                this.ctx.stroke();
            });
          } else if (cycle >= 1.2 && cycle < 1.8) {
            const pulse = 3.5 + Math.sin(performance.now() * 0.05) * 2.0;
            this.ctx.setLineDash([]);
            this.ctx.strokeStyle = "#f43f5e";
            this.ctx.lineWidth = pulse;
            this.ctx.shadowColor = "#f43f5e";
            this.ctx.shadowBlur = 14;
            xPositions.forEach((lx) => {
              this.ctx.beginPath();
              this.ctx.moveTo(lx, 0);
              this.ctx.lineTo(lx, this.canvas.height);
              this.ctx.stroke();
            });
            yPositions.forEach((ly) => {
              this.ctx.beginPath();
              this.ctx.moveTo(0, ly);
              this.ctx.lineTo(this.canvas.width, ly);
              this.ctx.stroke();
            });
          } else if (cycle >= 1.8 && cycle < 2.5) {
            this.ctx.setLineDash([]);
            // Core laser columns/rows
            xPositions.forEach((lx) => {
              this.ctx.shadowColor = "#38bdf8";
              this.ctx.shadowBlur = 20;
              this.ctx.strokeStyle = "rgba(56, 189, 248, 0.86)";
              this.ctx.lineWidth = 28;
              this.ctx.beginPath();
              this.ctx.moveTo(lx, 0);
              this.ctx.lineTo(lx, this.canvas.height);
              this.ctx.stroke();

              this.ctx.strokeStyle = "rgba(167, 139, 250, 0.54)";
              this.ctx.lineWidth = 14;
              this.ctx.beginPath();
              this.ctx.moveTo(lx + Math.sin(performance.now() * 0.02) * 4, 0);
              this.ctx.lineTo(lx + Math.cos(performance.now() * 0.018) * 4, this.canvas.height);
              this.ctx.stroke();

              this.ctx.strokeStyle = "#ffffff";
              this.ctx.lineWidth = 10;
              this.ctx.beginPath();
              this.ctx.moveTo(lx, 0);
              this.ctx.lineTo(lx, this.canvas.height);
              this.ctx.stroke();
            });

            yPositions.forEach((ly) => {
              this.ctx.shadowColor = "#38bdf8";
              this.ctx.shadowBlur = 20;
              this.ctx.strokeStyle = "rgba(56, 189, 248, 0.86)";
              this.ctx.lineWidth = 28;
              this.ctx.beginPath();
              this.ctx.moveTo(0, ly);
              this.ctx.lineTo(this.canvas.width, ly);
              this.ctx.stroke();

              this.ctx.strokeStyle = "rgba(167, 139, 250, 0.54)";
              this.ctx.lineWidth = 14;
              this.ctx.beginPath();
              this.ctx.moveTo(0, ly + Math.sin(performance.now() * 0.02) * 4);
              this.ctx.lineTo(this.canvas.width, ly + Math.cos(performance.now() * 0.018) * 4);
              this.ctx.stroke();

              this.ctx.strokeStyle = "#ffffff";
              this.ctx.lineWidth = 10;
              this.ctx.beginPath();
              this.ctx.moveTo(0, ly);
              this.ctx.lineTo(this.canvas.width, ly);
              this.ctx.stroke();
            });
          }
          this.ctx.restore();
        }

        this.ctx.save();
        
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        const w = e.width;
        const h = e.height;
        const w2 = w / 2;
        const h2 = h / 2;

        this.renderBossJet(e, this.stage >= 4 ? 4 : this.bossPhase3Active ? 3 : this.bossPhase2Active ? 2 : 1);

        // Left wing turret status HUD
        if (e.leftTurretActive) {
          this.ctx.fillStyle = "#06b6d4";
          this.ctx.fillRect(e.x - 22, e.y + 15, 8, 12);
          // HP indicator
          this.ctx.fillStyle = "#22c55e";
          const hpRatio = Math.max(0, e.leftTurretHp || 0) / 45;
          this.ctx.fillRect(e.x - 24, e.y + 8, 14 * hpRatio, 3);
        } else {
          this.ctx.fillStyle = "#475569";
          this.ctx.fillRect(e.x - 18, e.y + 18, 5, 10);
        }

        // Right wing turret status HUD
        if (e.rightTurretActive) {
          this.ctx.fillStyle = "#06b6d4";
          this.ctx.fillRect(e.x + e.width + 14, e.y + 15, 8, 12);
          // HP indicator
          this.ctx.fillStyle = "#22c55e";
          const hpRatio = Math.max(0, e.rightTurretHp || 0) / 45;
          this.ctx.fillRect(e.x + e.width + 10, e.y + 8, 14 * hpRatio, 3);
        } else {
          this.ctx.fillStyle = "#475569";
          this.ctx.fillRect(e.x + e.width + 13, e.y + 18, 5, 10);
        }

        // Groggy/Stun static electric HUD overlay
        if (e.bossStunTimer > 0) {
          this.ctx.fillStyle = "rgba(234, 179, 8, 0.14)";
          this.ctx.fillRect(e.x, e.y, e.width, e.height);

          this.ctx.strokeStyle = "#facc15";
          this.ctx.lineWidth = 2;
          for (let s = 0; s < 3; s++) {
            this.ctx.save();
            this.ctx.beginPath();
            const sx = e.x + Math.random() * e.width;
            this.ctx.moveTo(sx, e.y);
            this.ctx.lineTo(sx + (Math.random() - 0.5) * 40, e.y + e.height);
            this.ctx.stroke();
            this.ctx.restore();
          }

          this.ctx.fillStyle = "#facc15";
          this.ctx.font = 'bold 11px "JetBrains Mono", monospace';
          this.ctx.textAlign = "center";
          this.ctx.fillText(
            `GROGGY (${e.bossStunTimer.toFixed(1)}s)`,
            e.x + e.width / 2,
            e.y - 12,
          );
        } else {
          this.ctx.fillStyle = "#cbd5e1";
          this.ctx.font = '9px "JetBrains Mono", monospace';
          this.ctx.textAlign = "center";
          this.ctx.fillText(`PHASE ${e.phase}`, e.x + e.width / 2, e.y - 10);
        }

        this.ctx.restore();
      } else {
        this.renderEnemyShape(e);

        // Render Barricade Walls Lasers
        if (e.active && e.type === "barricade_wall") {
          const partner = this.enemies.find(
            (other) =>
              other !== e &&
              other.active &&
              other.type === "barricade_wall" &&
              Math.abs(other.y - e.y) < 25 &&
              other.x > e.x,
          );
          if (partner) {
            const by = (e.y + partner.y) / 2 + e.height / 2;

            this.ctx.save();

            // Outer cyan fuzzy flare glow
            this.ctx.shadowColor = "#06b6d4";
            this.ctx.shadowBlur = 15;
            this.ctx.strokeStyle = "rgba(6, 182, 212, 0.45)";
            this.ctx.lineWidth = 12;
            this.ctx.beginPath();
            this.ctx.moveTo(e.x + e.width, by);
            this.ctx.lineTo(partner.x, by);
            this.ctx.stroke();

            // Medium hot bright electric core
            this.ctx.strokeStyle = "#22d3ee";
            this.ctx.lineWidth = 6;
            this.ctx.beginPath();
            this.ctx.moveTo(e.x + e.width, by);
            this.ctx.lineTo(partner.x, by);
            this.ctx.stroke();

            // Inner neon hot white laser core line
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(e.x + e.width, by);
            this.ctx.lineTo(partner.x, by);
            this.ctx.stroke();

            this.ctx.restore();
          }
        }
      }
    });

    this.renderBossPatternHazards();

    // Bullets
    this.bullets.forEach((b) => {
      this.ctx.save();
      if (b.isEnemy) {
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        this.renderEnemyBulletVisual(b, this.getBulletVisualType(b), cx, cy);
        this.ctx.restore();
        return;

        if (b.type === "electric_missile") {
          const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
          this.ctx.translate(cx, cy);
          this.ctx.rotate(angle);
          this.ctx.shadowColor = "#a3e635";
          this.ctx.shadowBlur = 18;
          this.ctx.fillStyle = "rgba(163, 230, 53, 0.22)";
          this.ctx.beginPath();
          this.ctx.ellipse(0, 4, 14, 28, 0, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = "#020617";
          this.ctx.strokeStyle = "#a3e635";
          this.ctx.lineWidth = 2.4;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -24);
          this.ctx.lineTo(11, -5);
          this.ctx.lineTo(8, 17);
          this.ctx.lineTo(3, 10);
          this.ctx.lineTo(0, 25);
          this.ctx.lineTo(-3, 10);
          this.ctx.lineTo(-8, 17);
          this.ctx.lineTo(-11, -5);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();
          this.ctx.strokeStyle = "#ffffff";
          this.ctx.lineWidth = 1.2;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -16);
          this.ctx.lineTo(0, 13);
          this.ctx.moveTo(-7, -3);
          this.ctx.lineTo(7, -3);
          this.ctx.stroke();
        } else if (b.type === "recall_shard") {
          const spin = (performance.now() * 0.011 + cx * 0.01) % (Math.PI * 2);
          const r = Math.max(b.width, b.height) * 1.25;
          this.ctx.translate(cx, cy);
          this.ctx.rotate(spin);
          this.ctx.shadowColor = "#2dd4bf";
          this.ctx.shadowBlur = 15;
          this.ctx.fillStyle = "rgba(45, 212, 191, 0.25)";
          this.ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const rr = i % 2 === 0 ? r : r * 0.46;
            this.ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.strokeStyle = "#ffffff";
          this.ctx.lineWidth = 1.5;
          this.ctx.stroke();
          this.ctx.fillStyle = b.color;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (b.type === "void_mine") {
          const spin = (performance.now() * 0.006 + (b.age || 0) * 3) % (Math.PI * 2);
          const r = Math.max(b.width, b.height) * 0.95;
          this.ctx.translate(cx, cy);
          this.ctx.rotate(spin);
          this.ctx.shadowColor = "#14b8a6";
          this.ctx.shadowBlur = 17;
          this.ctx.fillStyle = "#042f2e";
          this.ctx.strokeStyle = "#5eead4";
          this.ctx.lineWidth = 2.2;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -r * 1.25);
          this.ctx.lineTo(r * 0.42, -r * 0.42);
          this.ctx.lineTo(r * 1.25, 0);
          this.ctx.lineTo(r * 0.42, r * 0.42);
          this.ctx.lineTo(0, r * 1.25);
          this.ctx.lineTo(-r * 0.42, r * 0.42);
          this.ctx.lineTo(-r * 1.25, 0);
          this.ctx.lineTo(-r * 0.42, -r * 0.42);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();
          this.ctx.strokeStyle = "#ccfbf1";
          this.ctx.lineWidth = 1.1;
          this.ctx.beginPath();
          this.ctx.moveTo(-r * 0.65, 0);
          this.ctx.lineTo(r * 0.65, 0);
          this.ctx.moveTo(0, -r * 0.65);
          this.ctx.lineTo(0, r * 0.65);
          this.ctx.stroke();
        } else if (b.type === "tail_rocket") {
          const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
          this.ctx.translate(cx, cy);
          this.ctx.rotate(angle);
          this.ctx.shadowColor = b.color || "#38bdf8";
          this.ctx.shadowBlur = 16;
          this.ctx.fillStyle = "rgba(14, 165, 233, 0.22)";
          this.ctx.beginPath();
          this.ctx.ellipse(0, 8, 12, 30, 0, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = "#082f49";
          this.ctx.strokeStyle = b.color || "#38bdf8";
          this.ctx.lineWidth = 2.1;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -23);
          this.ctx.lineTo(9, -2);
          this.ctx.lineTo(7, 18);
          this.ctx.lineTo(0, 12);
          this.ctx.lineTo(-7, 18);
          this.ctx.lineTo(-9, -2);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();
          this.ctx.fillStyle = "#ffffff";
          this.ctx.fillRect(-2.5, -8, 5, 12);
        } else if (b.type === "needle") {
          // 1. 바늘/쐐기형 탄알 (Needle Bullet): 비행기 디자인을 탈피한 길고 날카로운 유선형 에너지 쐐기/레이저 니들 형태
          const angle = Math.atan2(b.vy, b.vx);
          const length = Math.max(b.width, b.height) * 3.2;
          const thickness = Math.min(b.width, b.height) * 0.75;

          this.ctx.translate(cx, cy);
          this.ctx.rotate(angle);

          // Sleek streamlined outer glow diamond/wedge (no indentation to prevent "ship" look)
          this.ctx.fillStyle = b.color;
          this.ctx.globalAlpha = 0.3;
          this.ctx.beginPath();
          this.ctx.moveTo(length * 0.55, 0); // extra sharp leading tip
          this.ctx.lineTo(-length * 0.15, -thickness * 1.5); // wide glow hump
          this.ctx.lineTo(-length * 0.55, 0); // long fading needle trail
          this.ctx.lineTo(-length * 0.15, thickness * 1.5);
          this.ctx.closePath();
          this.ctx.fill();

          // Sharp glowing core outline (with vibrant boundary line)
          this.ctx.strokeStyle = b.color;
          this.ctx.lineWidth = 2.0;
          this.ctx.globalAlpha = 0.95;
          this.ctx.beginPath();
          this.ctx.moveTo(length * 0.5, 0);
          this.ctx.lineTo(-length * 0.1, -thickness * 0.7);
          this.ctx.lineTo(-length * 0.5, 0);
          this.ctx.lineTo(-length * 0.1, thickness * 0.7);
          this.ctx.closePath();
          this.ctx.stroke();

          // Super bright hot white core line for laser look
          this.ctx.fillStyle = "#ffffff";
          this.ctx.globalAlpha = 1.0;
          this.ctx.beginPath();
          this.ctx.moveTo(length * 0.42, 0);
          this.ctx.lineTo(-length * 0.05, -thickness * 0.3);
          this.ctx.lineTo(-length * 0.42, 0);
          this.ctx.lineTo(-length * 0.05, thickness * 0.3);
          this.ctx.closePath();
          this.ctx.fill();

        } else if (b.type === "pellet") {
          // 2. 소형 구체 탄알 (Standard Pellet): 밝고 깔끔한 동그란 구체
          const r = Math.max(b.width, b.height) * 1.35;
          const grad = this.ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.35, b.color);
          grad.addColorStop(1.0, "transparent");

          this.ctx.fillStyle = grad;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          this.ctx.fill();

          // Delicate crisp outer neon ring
          this.ctx.strokeStyle = b.color;
          this.ctx.lineWidth = 1.25;
          this.ctx.globalAlpha = 0.85;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
          this.ctx.stroke();

        } else if (b.type === "ring") {
          // 3. 환형/도넛 탄알 (Ring Bullet): 가운데가 뻥 뚫려 있고 테두리만 빛나는 형태
          const r = Math.max(b.width, b.height) * 1.55;

          // Soft ambient overlay for ring texture
          this.ctx.fillStyle = b.color;
          this.ctx.globalAlpha = 0.1;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.globalAlpha = 1.0;

          // Bright concentric neon glow rings
          const rGrad = this.ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
          rGrad.addColorStop(0, "transparent");
          rGrad.addColorStop(0.55, b.color);
          rGrad.addColorStop(0.82, "#ffffff"); // glowing neon boundary
          rGrad.addColorStop(1.0, b.color);

          this.ctx.strokeStyle = rGrad;
          this.ctx.lineWidth = 5.5;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
          this.ctx.stroke();

          // Concentric sharp white accent ring
          this.ctx.strokeStyle = "#ffffff";
          this.ctx.lineWidth = 1.5;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
          this.ctx.stroke();

        } else if (b.type === "crystal" || b.type === "ricochet") {
          // 4. 결정/수정형 탄알 (Crystal Shard): 마름모꼴/날카로운 보석형 탄알
          const angle = (performance.now() * 0.0035 + (cx * 0.01)) % (Math.PI * 2);
          const r = Math.max(b.width, b.height) * 1.5;

          this.ctx.translate(cx, cy);
          this.ctx.rotate(angle);

          // Deep outer glow shard
          this.ctx.fillStyle = b.color;
          this.ctx.globalAlpha = 0.28;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -r * 1.15);
          this.ctx.lineTo(r * 0.72, 0);
          this.ctx.lineTo(0, r * 1.15);
          this.ctx.lineTo(-r * 0.72, 0);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.globalAlpha = 1.0;

          // Neon crisp crystal boundary
          this.ctx.strokeStyle = b.color;
          this.ctx.lineWidth = 2.2;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -r);
          this.ctx.lineTo(r * 0.65, 0);
          this.ctx.lineTo(0, r);
          this.ctx.lineTo(-r * 0.65, 0);
          this.ctx.closePath();
          this.ctx.stroke();

          // Facet dividing grid lines
          this.ctx.strokeStyle = "#ffffff";
          this.ctx.lineWidth = 1.0;
          this.ctx.globalAlpha = 0.85;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -r);
          this.ctx.lineTo(0, r);
          this.ctx.moveTo(-r * 0.65, 0);
          this.ctx.lineTo(r * 0.65, 0);
          this.ctx.stroke();

          // Super bright core sphere
          this.ctx.fillStyle = "#ffffff";
          this.ctx.beginPath();
          this.ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
          this.ctx.fill();

        } else if (b.type === "gravity_singularity" || b.type === "gravity_ball") {
          // 5. 중력/블랙홀 탄알 (Vortex Orb): 일렁이며 소용돌이치는 구체
          const r = Math.max(b.width, b.height) * 1.6;
          const grad = this.ctx.createRadialGradient(cx, cy, r * 0.18, cx, cy, r);
          grad.addColorStop(0, "#090514"); // Dense jet black core
          grad.addColorStop(0.5, "#180c35"); // Swirling deep violet haze
          grad.addColorStop(0.85, b.color); // Glowing border
          grad.addColorStop(1.0, "transparent");

          this.ctx.fillStyle = grad;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          this.ctx.fill();

          // Animated spiral whirlpool rays
          this.ctx.strokeStyle = "#f472b6"; // bright neon pink swirls
          this.ctx.lineWidth = 2.0;
          this.ctx.globalAlpha = 0.85;
          const spin = (performance.now() * 0.008) % (Math.PI * 2);
          this.ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const startAngle = spin + (i * Math.PI) / 2;
            this.ctx.arc(cx, cy, r * 0.52, startAngle, startAngle + 1.4);
          }
          this.ctx.stroke();

        } else if (b.type === "dash_paint_bullet" || b.type === "dilation_bullet") {
          // 6. 시간 왜곡/페인트탄 (Glitch Bullet): 지지직거리는 사각형 노이즈 격자
          const w = b.width * 1.5;
          const h = b.height * 1.5;

          const isStop = (b.type === "dilation_bullet" && b.dilationState === "frozen");
          const offsetAmount = isStop ? 4.5 : 2.0;

          let gx = cx;
          let gy = cy;
          if (Math.random() < 0.35) {
            gx += (Math.random() - 0.5) * offsetAmount;
            gy += (Math.random() - 0.5) * offsetAmount;
          }

          // Side cyan/red alignment mismatch shadow
          this.ctx.fillStyle = "#22d3ee";
          this.ctx.globalAlpha = 0.7;
          this.ctx.fillRect(gx - w / 2 - 3, gy - h / 2 + 1, w, h);

          this.ctx.fillStyle = "#ef4444";
          this.ctx.globalAlpha = 0.6;
          this.ctx.fillRect(gx - w / 2 + 2, gy - h / 2 - 2, w, h);

          // Principal orange/yellow raster grid body
          this.ctx.fillStyle = b.color;
          this.ctx.globalAlpha = 0.95;
          this.ctx.fillRect(gx - w / 2, gy - h / 2, w, h);

          // White noise core box
          this.ctx.fillStyle = "#ffffff";
          this.ctx.fillRect(gx - w * 0.22, gy - h * 0.22, w * 0.44, h * 0.44);

          // Transient digital cathode glitch sparks
          if (Math.random() < 0.2) {
            this.ctx.strokeStyle = "#eab308";
            this.ctx.lineWidth = 1.25;
            this.ctx.beginPath();
            this.ctx.moveTo(gx - w * 1.3, gy + (Math.random() - 0.5) * h * 1.2);
            this.ctx.lineTo(gx + w * 1.3, gy + (Math.random() - 0.5) * h * 1.2);
            this.ctx.stroke();
          }

        } else if (b.type === "homing") {
          // Rotating homing style
          const r = Math.max(b.width, b.height) * 1.55;
          const grad = this.ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.3, b.color);
          grad.addColorStop(1.0, "transparent");

          this.ctx.fillStyle = grad;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.strokeStyle = b.color;
          this.ctx.lineWidth = 1.5;
          this.ctx.globalAlpha = 0.85;
          const spin = (performance.now() * 0.005) % (Math.PI * 2);
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
          this.ctx.stroke();

          this.ctx.save();
          this.ctx.translate(cx, cy);
          this.ctx.rotate(spin);
          this.ctx.fillStyle = "#ffffff";
          this.ctx.beginPath();
          this.ctx.arc(0, -r * 0.6, 2.5, 0, Math.PI * 2);
          this.ctx.arc(0, r * 0.6, 2.5, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();

        } else {
          // Default fallbacks draw standard radial glow circles
          const r = Math.max(b.width, b.height) * 1.55;
          const grad = this.ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.3, b.color);
          grad.addColorStop(1.0, "transparent");

          this.ctx.fillStyle = grad;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          this.ctx.fill();

          // Subtle inner highlight ring
          this.ctx.strokeStyle = "#ffffff";
          this.ctx.lineWidth = 1;
          this.ctx.globalAlpha = 0.55;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      } else {
        // GORGEOUS, FLASHY SCI-FI PLAYER PROJECTILES
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const w2 = b.width / 2;
        const h2 = b.height / 2;
        
        this.ctx.save();

        if (b.type === "satellite_bullet") {
          const r = Math.max(b.width, b.height) * 1.5;
          const spin = (performance.now() * 0.016) % (Math.PI * 2);

          this.ctx.translate(cx, cy);
          this.ctx.rotate(spin);

          if (b.companionIndex === 0) {
            // Unique companion 0 bullet: Spinning curved neon emerald star with glowing particle aura
            this.ctx.shadowColor = "#10b981";
            this.ctx.shadowBlur = 12;
            this.ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = "#ffffff"; // hot white center core
            this.ctx.strokeStyle = "#34d399"; // bright emerald outline
            this.ctx.lineWidth = 2.0;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -r);
            this.ctx.quadraticCurveTo(0, 0, r, 0);
            this.ctx.quadraticCurveTo(0, 0, 0, r);
            this.ctx.quadraticCurveTo(0, 0, -r, 0);
            this.ctx.quadraticCurveTo(0, 0, 0, -r);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

          } else if (b.companionIndex === 1) {
            // Unique companion 1 bullet: Dual slashing crescent-wing blades (Violet)
            this.ctx.shadowColor = "#c084fc";
            this.ctx.shadowBlur = 12;
            this.ctx.fillStyle = "rgba(168, 85, 247, 0.25)";
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = "#ffffff";
            this.ctx.strokeStyle = "#a855f7";
            this.ctx.lineWidth = 2.2;
            this.ctx.beginPath();
            this.ctx.moveTo(-r, 0);
            this.ctx.quadraticCurveTo(0, -r * 0.5, r, 0);
            this.ctx.quadraticCurveTo(0, r * 0.5, -r, 0);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // inner core ring
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 1.0;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
            this.ctx.stroke();

          } else if (b.companionIndex === 2) {
            // Unique companion 2 bullet: Sharp dual diamond spearheads (Cyan)
            this.ctx.shadowColor = "#06b6d4";
            this.ctx.shadowBlur = 10;
            this.ctx.fillStyle = "rgba(34, 211, 238, 0.25)";
            this.ctx.beginPath();
            this.ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
            this.ctx.fill();

            this.ctx.fillStyle = "#ffffff";
            this.ctx.strokeStyle = "#22d3ee";
            this.ctx.lineWidth = 2.0;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -r * 1.2);
            this.ctx.lineTo(r * 0.6, 0);
            this.ctx.lineTo(0, r * 0.8);
            this.ctx.lineTo(-r * 0.6, 0);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

          } else {
            // Unique companion 3 bullet: Heavy Solar Fire ball with orbit rings (Orange)
            this.ctx.shadowColor = "#f97316";
            this.ctx.shadowBlur = 14;
            this.ctx.fillStyle = "rgba(249, 115, 22, 0.25)";
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = "#f97316";
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.fillStyle = "#ffffff";
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
          }

          this.ctx.restore();
          this.ctx.restore(); // balance parent save
          return;
        }
        
        // 1. Sleek energy trail behind bullet
        this.ctx.globalAlpha = 0.22;
        this.ctx.fillStyle = b.color;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - w2 * 1.6, cy + h2 * 0.5);
        this.ctx.lineTo(cx, cy - h2 * 3.0); // stretched forwards
        this.ctx.lineTo(cx + w2 * 1.6, cy + h2 * 0.5);
        this.ctx.lineTo(cx, cy + h2 * 3.5); // stretched backwards
        this.ctx.closePath();
        this.ctx.fill();
        
        // 2. Neon Outer Glow Shield/Halo
        this.ctx.shadowColor = b.color;
        this.ctx.shadowBlur = b.damage >= 1.5 ? 20 : 12;
        this.ctx.fillStyle = b.color;
        this.ctx.globalAlpha = 0.82;
        
        this.ctx.beginPath();
        if (b.vx !== 0) {
          // Arrow crescent for diagonal bullets
          const tiltAngle = Math.atan2(b.vy, b.vx);
          this.ctx.translate(cx, cy);
          this.ctx.rotate(tiltAngle);
          
          this.ctx.moveTo(h2 * 1.4, 0);
          this.ctx.lineTo(-h2 * 1.2, -w2 * 1.3);
          this.ctx.lineTo(-h2 * 0.4, 0);
          this.ctx.lineTo(-h2 * 1.2, w2 * 1.3);
          this.ctx.closePath();
          this.ctx.fill();
        } else {
          // Elongated diamond core for straight forward power bullets
          this.ctx.moveTo(cx, cy - h2 * 1.6);
          this.ctx.lineTo(cx + w2 * 1.3, cy);
          this.ctx.lineTo(cx, cy + h2 * 1.6);
          this.ctx.lineTo(cx - w2 * 1.3, cy);
          this.ctx.closePath();
          this.ctx.fill();
        }
        
        // 3. Ultra Bright Hot White core
        this.ctx.shadowBlur = 0; // reset for sharp focus
        this.ctx.fillStyle = "#ffffff";
        this.ctx.globalAlpha = 1.0;
        this.ctx.beginPath();
        if (b.vx !== 0) {
          this.ctx.moveTo(h2 * 0.7, 0);
          this.ctx.lineTo(-h2 * 0.6, -w2 * 0.6);
          this.ctx.lineTo(-h2 * 0.2, 0);
          this.ctx.lineTo(-h2 * 0.6, w2 * 0.6);
        } else {
          this.ctx.moveTo(cx, cy - h2 * 0.95);
          this.ctx.lineTo(cx + w2 * 0.7, cy);
          this.ctx.lineTo(cx, cy + h2 * 0.95);
          this.ctx.lineTo(cx - w2 * 0.7, cy);
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
      }
      this.ctx.restore();
    });

    // Render Squid Ink Smoke Clouds
    this.ctx.save();
    this.inkClouds.forEach((c) => {
      const cx = c.x;
      const cy = c.y;
      const r = c.radius;

      const grad = this.ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
      grad.addColorStop(0, "rgba(15, 12, 30, 0.94)"); // extremely dense dark core
      grad.addColorStop(0.55, "rgba(24, 18, 50, 0.75)"); // hazy deep purple-ink smoke
      grad.addColorStop(1.0, "rgba(15, 12, 30, 0.0)"); // soft vapor fringe

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();

    // Particles
    this.particles.forEach((p) => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillRect(p.x, p.y, p.size, p.size);
      this.ctx.globalAlpha = 1.0;
    });

    if (this.bombActive) {
      this.ctx.save();
      this.ctx.strokeStyle = `rgba(168, 85, 247, ${1 - this.bombRadius / this.bombMaxRadius})`;
      this.ctx.lineWidth = 18;
      this.ctx.beginPath();
      this.ctx.arc(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        this.bombRadius,
        0,
        Math.PI * 2,
      );
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Powerups
    this.powerups.forEach((p) => {
      this.ctx.save();
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;

      if (p.type === "power") {
        // Golden Glowing Hexagon/Diamond (Bullet Upgrade)
        const rot = performance.now() * 0.0035;
        this.ctx.translate(cx, cy);
        this.ctx.rotate(rot);

        this.ctx.shadowColor = "#fbbf24";
        this.ctx.shadowBlur = 20;

        this.ctx.fillStyle = "#fbbf24";
        this.ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          this.ctx.lineTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
        }
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();

        // Counter-rotated glowing bolt symbol
        this.ctx.rotate(-rot * 2);
        this.ctx.fillStyle = "#b45309";
        this.ctx.font = "900 13px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("*", 0, 0);
      } else if (p.type === "heal") {
        // Emerald Green Pulsing Shield (Heal)
        const pulse = Math.sin(performance.now() * 0.012) * 3 + 13;

        // Outer glowing ripple rings
        this.ctx.strokeStyle = "#34d399";
        this.ctx.globalAlpha = 0.5;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, pulse + 6, 0, Math.PI * 2);
        this.ctx.stroke();

        // Saturated medical capsules
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowColor = "#10b981";
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = "#059669";

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = "#6ee7b7";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Bold white medical cross
        this.ctx.fillStyle = "#ffffff";
        const size = 11;
        const thickness = 3.5;
        this.ctx.fillRect(cx - thickness / 2, cy - size / 2, thickness, size);
        this.ctx.fillRect(cx - size / 2, cy - thickness / 2, size, thickness);
      } else if (p.type === "satellite") {
        // Deep purple orbiting satellite core
        this.ctx.translate(cx, cy);
        this.ctx.rotate(performance.now() * 0.002);

        this.ctx.shadowColor = "#c084fc";
        this.ctx.shadowBlur = 22;

        // Draw central purple core
        this.ctx.fillStyle = "#a855f7";
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 9, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = "#e9d5ff";
        this.ctx.lineWidth = 1.8;
        this.ctx.stroke();

        // Draw horizontal solar wings
        this.ctx.fillStyle = "#38bdf8"; // high tech cyber blue wings
        this.ctx.fillRect(-15, -2.5, 7, 5);
        this.ctx.fillRect(8, -2.5, 7, 5);

        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 0.8;
        this.ctx.strokeRect(-15, -2.5, 7, 5);
        this.ctx.strokeRect(8, -2.5, 7, 5);

        // Draw orbiting rings
        this.ctx.strokeStyle = "rgba(192, 132, 252, 0.75)";
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 18, 6, Math.PI / 6, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      this.ctx.restore();
    });

    // --- DRAW DEBRIS BARRICADES ---
    this.debrisCovers.forEach((d) => {
      if (!d.active) return;
      this.ctx.save();
      
      // Futuristic mechanical warning steel plate design
      this.ctx.shadowColor = "#64748b";
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = "#334155";
      this.ctx.fillRect(d.x, d.y, d.width, d.height);

      // Warning stripes on barricade
      this.ctx.fillStyle = "#eab308";
      this.ctx.globalAlpha = 0.25;
      for (let offset = 0; offset < d.width; offset += 16) {
        this.ctx.beginPath();
        this.ctx.moveTo(d.x + offset, d.y + d.height);
        this.ctx.lineTo(d.x + offset + 8, d.y);
        this.ctx.lineTo(d.x + offset + 12, d.y);
        this.ctx.lineTo(d.x + offset + 4, d.y + d.height);
        this.ctx.closePath();
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1.0;

      // HP bar line on index barrier
      const ratio = d.hp / d.maxHp;
      this.ctx.fillStyle = ratio > 0.4 ? "#22c55e" : "#ef4444";
      this.ctx.fillRect(d.x, d.y + d.height - 4, d.width * ratio, 4);

      this.ctx.strokeStyle = "#475569";
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(d.x, d.y, d.width, d.height);

      this.ctx.restore();
    });

    // --- DRAW METEORS ---
    this.meteors.forEach((m) => {
      if (!m.active) return;
      this.ctx.save();
      this.ctx.translate(m.x, m.y);
      this.ctx.rotate(m.rotation);

      // Raw dark organic asteroid shape
      this.ctx.shadowColor = "#334155";
      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = "#1e293b";
      this.ctx.beginPath();
      const points = 6;
      for (let i = 0; i < points; i++) {
        const a = (i * Math.PI * 2) / points;
        const offsetRadius = m.radius * (0.8 + Math.sin(i * 3 + m.x * 0.1) * 0.16);
        this.ctx.lineTo(Math.cos(a) * offsetRadius, Math.sin(a) * offsetRadius);
      }
      this.ctx.closePath();
      this.ctx.fill();

      // Rock craggy surface grooves
      this.ctx.strokeStyle = "#475569";
      this.ctx.lineWidth = 2.0;
      this.ctx.stroke();

      // Hot thermal cracks/veins for visual visual density
      this.ctx.strokeStyle = "#f97316";
      this.ctx.globalAlpha = 0.65;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(-m.radius * 0.3, -m.radius * 0.2);
      this.ctx.lineTo(m.radius * 0.4, m.radius * 0.3);
      this.ctx.stroke();

      this.ctx.restore();
    });

    // --- DRAW HELPER PLAYER DRONES ---
    if (!this.player.isDead) {
      this.drones.forEach((dr) => {
        const pcx = this.player.x + this.player.width / 2;
        const pcy = this.player.y + this.player.height / 2;
        
        const rx = pcx + Math.sin(dr.angleOffset) * (dr.type === "orbit" ? 55 : (dr.type === "defense" ? 45 : 40));
        const ry = pcy + Math.cos(dr.angleOffset) * (dr.type === "orbit" ? 55 : (dr.type === "defense" ? 45 : 40));

        this.ctx.save();
        this.ctx.translate(rx, ry);

        // Drone colors based on functions
        const color =
          dr.type === "attack"
            ? "#22d3ee"
            : dr.type === "homing"
              ? "#f97316"
              : dr.type === "defense"
                ? "#34d399"
                : dr.type === "orbit"
                  ? "#facc15"
                  : "#a855f7";

        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 12;
        this.ctx.fillStyle = color;

        // Draw cute tech capsule shapes
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner white nucleus
        this.ctx.fillStyle = "#ffffff";
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Specific visual appendages
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-Math.sin(dr.angleOffset) * 12, -Math.cos(dr.angleOffset) * 12);
        this.ctx.stroke();

        this.ctx.restore();

        // Render laser beams CONTINUOUS column
        if (dr.type === "laser" && dr.laserChargeCount > 0) {
          this.ctx.save();
          this.ctx.shadowColor = "#c084fc";
          this.ctx.shadowBlur = 20;

          // Outer plasma shroud
          this.ctx.fillStyle = "rgba(168, 85, 247, 0.35)";
          this.ctx.fillRect(rx - 10, 0, 20, ry);

          // Inner laser lance core
          this.ctx.fillStyle = "#ffffff";
          this.ctx.fillRect(rx - 4, 0, 8, ry);
          
          this.ctx.restore();
        }
      });
    }

    this.renderBossClearOverlay();
    this.ctx.restore();
  }

  private renderBossClearOverlay() {
    renderBossClearOverlaySystem(this);
  }

  // ==========================================
  //     CUSTOM PREMIUM MECHANICS HELPERS
  // ==========================================

  deactivateEnemy(e: Enemy) {
    e.active = false;
    if (e.type === "satellite_shield" || (e.type as any) === "mini_shield_commander") {
      e.satellites.forEach((b) => {
        b.active = false;
      });
      e.satellites = [];
    }
    if (e.type === "boss") {
      // Bullet cancel on boss defeat to clear visual clutter and reward the player!
      this.bullets.forEach((b) => {
        if (b.isEnemy) {
          b.active = false;
        }
      });
    }
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
