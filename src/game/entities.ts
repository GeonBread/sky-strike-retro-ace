import { ShipColor, ShipStyle } from "../types";
import { Box } from "./utils/geometry";

export class Entity implements Box {
  x: number = 0;
  y: number = 0;
  width: number = 0;
  height: number = 0;
  hitWidth?: number;
  hitHeight?: number;
  vx: number = 0;
  vy: number = 0;
  hp: number = 1;
  active: boolean = true;
}

export type PlayerWeaponStyle = ShipStyle;
export type HobanuPlayerBulletKind =
  | "gear"
  | "atom"
  | "formula"
  | "book"
  | "letter"
  | "speech"
  | "palette"
  | "janggu"
  | "ball"
  | "whistle"
  | "musicBeam";

export type HobanuPlayerBulletTrailPoint = {
  x: number;
  y: number;
  size: number;
};

export class Player extends Entity {
  color: ShipColor = "blue";
  weaponStyle: PlayerWeaponStyle = "science";
  powerLevel: number = 1; // 1 ~ 5
  invulnTimer: number = 0;
  lastShot: number = 0;
  bombs: number = 3;
  tilt: number = 0;
  isDead: boolean = false;
  deadTimer: number = 0;
  satelliteCount: number = 0; // Collectible orbiting helper satellites
  satelliteHps: number[] = []; // HP values for helper satellites (absorb hits rather than instant break!)
}

export type EnemyType =
  | "basic"
  | "sweeper"
  | "tank"
  | "aimed"
  | "homing_shooter"
  | "shotgun_shooter"
  | "burst_shooter"
  | "boss"
  | "stationary"
  | "column_shooter"
  | "circle_shooter"
  | "v_360_shooter"
  | "gear_rotate"
  | "cross_x"
  | "zigzag_wave"
  | "encirclement"
  | "train_leader"
  | "train_follower"
  | "split_cluster"
  | "barricade_wall"
  | "mine_layer"
  | "boomerang_orbit"
  | "satellite_shield"
  | "dash_paint"
  | "ricochet_shooter"
  | "counter_on_death"
  | "ink_shooter"
  | "gravity_vortex_mob"
  | "assault_commander";

export class Enemy extends Entity {
  type: EnemyType = "basic";
  visualId: number = 1; // 1 to 10 distinct visuals
  lastShot: number = 0;
  phase: number = 0; // Boss phases
  phaseDuration: number = 0;
  patternTimer: number = 0;
  shootTimer: number = 0;
  rapidFireCount: number = 0;
  burstCount: number = 0;
  direction: number = 1;
  spawnPoint: number = 0;
  leftTurretActive: boolean = true;
  rightTurretActive: boolean = true;
  leftTurretHp: number = 45;
  rightTurretHp: number = 45;
  bossStunTimer: number = 0;
  counterTimer?: number; // Reactive shield/fire cooldown

  // Custom tracking for new hardcore patterns
  satellites: Bullet[] = [];
  groupId?: number;
  startX?: number;
  gridLasersX?: number[];
  gridLasersY?: number[];
  lastCycleIndex?: number;
  laserSoundCycle?: number;
  laserAngle?: number;
}

export class InkCloud {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  radius: number = 20;
  maxRadius: number = 70;
  life: number = 4.5;
  maxLife: number = 4.5;
  active: boolean = true;
}

export type BulletVisualType =
  | "plasma_bolt"
  | "comet_needle"
  | "core_orb"
  | "cracked_core"
  | "drone_missile"
  | "tesla_spark"
  | "spore_glob"
  | "cosmic_plasma_core"
  | "comet_spear"
  | "tesla_spine_missile"
  | "rift_shard"
  | "phase_core"
  | "star_beacon"
  | "corrupt_orb"
  | "attendance_stamp"
  | "notice_popup"
  | "guide_arrow"
  | "deadline_missile"
  | "scanner_beam"
  | "unsubmitted_missile"
  | "f_bomb"
  | "f_fragment"
  | "atom"
  | "flask";

export class Bullet extends Entity {
  isEnemy: boolean = false;
  damage: number = 1;
  playerWeaponStyle?: PlayerWeaponStyle;
  playerWeaponLevel?: number;
  playerBulletKind?: HobanuPlayerBulletKind;
  playerBulletSprite?: string;
  playerBulletLabel?: string;
  playerBulletSize?: number;
  playerBulletSpin?: number;
  playerBulletRotation?: number;
  playerBulletTrail?: HobanuPlayerBulletTrailPoint[];
  playerBulletHoming?: boolean;
  playerBulletWave?: number;
  playerBulletLife?: number;
  playerBulletMaxLife?: number;
  playerBeamBig?: boolean;
  playerBeamPhase?: number;
  playerBeamThickness?: number;
  playerBeamCore?: number;
  playerBeamAmp?: number;
  playerBeamMaxTargets?: number;
  type:
    | "normal"
    | "homing"
    | "plasma"
    | "heavy"
    | "delayed"
    | "dilation_bullet"
    | "gravity_ball"
    | "parent_cross"
    | "parent_nsplit"
    | "sub_bullet"
    | "mine_orb"
    | "boomerang"
    | "satellite"
    | "dash_paint_bullet"
    | "ricochet"
    | "gravity_singularity"
    | "needle"
    | "pellet"
    | "ring"
    | "satellite_bullet"
    | "crystal"
    | "splitting_pellet"
    | "reverse_gravity_bullet"
    | "colliding_orb"
    | "electric_missile"
    | "recall_shard"
    | "tail_rocket"
    | "void_mine" = "normal";
  homingTimer: number = 0;
  color: string = "#38bdf8";
  companionIndex?: number;
  dilationState?: "flying" | "frozen" | "launched";
  dilationAge: number = 0;
  gravityTimer: number = 0;
  fuseTimer?: number;
  parentAngle?: number;
  turnRate?: number;
  targetSpeed?: number;
  age?: number;
  dashTriggered?: boolean;
  bounceCount?: number;
  shootTimer?: number;
  visualType?: BulletVisualType;
  /** 시각 효과의 위상만 저장합니다. 이동·속도·수명에는 사용하지 않습니다. */
  enemyVisualPhase?: number;
}

export type ParticleEffectKind = "default" | "playerBulletHit";

export class Particle extends Entity {
  life: number = 1;
  maxLife: number = 1;
  color: string = "#fff";
  size: number = 4;

  /** 파티클 렌더링과 업데이트 방식을 구분합니다. */
  effectKind: ParticleEffectKind = "default";

  /** playerBulletHit 파티클에 적용되는 아래 방향 가속도(px/s^2)입니다. */
  gravity: number = 0;
}

export class PowerUp extends Entity {
  type: "power" | "heal" | "satellite" = "power";
}

export interface SpaceObject {
  x: number;
  y: number;
  type: "sun" | "planet";
  name: string;
  size: number;
  speed: number;
  color1: string;
  color2: string;
  rings?: boolean;
  craters?: { rx: number; ry: number; r: number }[];
}

export interface GameInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  useBomb?: boolean;
}

export type EngineState =
  | "PLAYING"
  | "GAMEOVER"
  | "BOSSCUTSCENE"
  | "BOSS_CLEAR_EXPLOSION"
  | "BOSS_CLEAR_MESSAGE"
  | "VICTORY"
  | "BOSSPHASE2CUTSCENE"
  | "BOSSPHASE3CUTSCENE"
  | "STAGE_CLEAR_CHOICE";

export type SquadPattern = "V_FORMATION" | "CIRCLE" | "SQUARE" | "SIDE_LINES";
