import type { Enemy } from "../entities";

export const CHAPTER1_ENEMY_TYPES = [
  "chapter1_attendance_drone",
  "chapter1_absence_drone",
  "chapter1_notice_drone",
  "chapter1_student_id_terminal",
  "chapter1_login_guard",
  "chapter1_course_bug",
  "chapter1_schedule_block",
  "chapter1_seat_drone",
  "chapter1_cart_box",
  "chapter1_coordinate_warp",
] as const;

export type Chapter1EnemyType = (typeof CHAPTER1_ENEMY_TYPES)[number];

export const CHAPTER1_ENEMY_TYPE_BY_INDEX: readonly Chapter1EnemyType[] = CHAPTER1_ENEMY_TYPES;

export function isChapter1EnemyType(type: string): type is Chapter1EnemyType {
  return (CHAPTER1_ENEMY_TYPES as readonly string[]).includes(type);
}

export type Chapter1EnemyMotion = "anchor" | "bugLane";
export type Chapter1EnemyStateName = "enter" | "active" | "straight";

export interface Chapter1EnemyState {
  index: number;
  cx: number;
  cy: number;
  vx: number;
  vy: number;
  age: number;
  maxHp: number;
  attack: number;
  burst: number;
  burstTimer: number;
  phase: number;
  targetY: number;
  state: Chapter1EnemyStateName;
  stateTimer: number;
  charge: number;
  open: boolean;
  releaseTimer: number;
  absorbCooldown: number;
  absorbPeriod: number;
  collectTimer: number;
  absorbNotice: number;
  countdown: number;
  nextTeleport: number;
  hitFlash: number;
  hitX?: number;
  hitY?: number;
  hitAngle?: number;
  motionSeed: number;
  motionX: number;
  motionY: number;
  waveMotion?: Chapter1EnemyMotion;
  anchorX?: number;
  anchorY?: number;
  anchorAmpX?: number;
  anchorAmpY?: number;
  anchorSpeed?: number;
  arrowAngleOffset?: number;
  attackInterval?: number;
  globalBlockCap?: number;
  waveId: number;
  dropPulse?: number;
}

export type Chapter1BulletBehavior =
  | "linear"
  | "bell"
  | "holdDrop"
  | "sine"
  | "blockSlam"
  | "blockInstalled"
  | "homing"
  | "turn90"
  | "ring";

export interface Chapter1BulletState {
  sprite: number;
  cx: number;
  cy: number;
  vx: number;
  vy: number;
  r: number;
  age: number;
  life: number;
  rotation: number;
  spin: number;
  phase: number;
  baseX: number;
  baseY: number;
  behavior: Chapter1BulletBehavior;
  ownerType: number;
  destructible: boolean;
  hp: number;
  maxHp: number;
  drawW?: number;
  drawH?: number;
  hitW?: number;
  hitH?: number;
  hold?: number;
  targetY?: number;
  turned?: boolean;
  nextPulse?: number;
  pulseCue?: number;
  dropStarted?: boolean;
  dropSpeed?: number;
  installed?: boolean;
  scheduleSlot?: string;
  sineAmplitude?: number;
  sineFrequency?: number;
  anchorBullet?: unknown;
  maxR?: number;
  thickness?: number;
  skipStandardPlayerCollision?: boolean;
  hitFlash?: number;
}

export interface Chapter1WaveTelegraph {
  kind?: "line" | "blockZone" | "blockZoneCancel" | "warp";
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  age: number;
  life: number;
  color: string;
  label?: string;
  scheduleSlot?: string;
  ownerEnemy?: Enemy;
  cancelled?: boolean;
  resolved?: boolean;
  cancelSeed?: number;
}


export interface Chapter1WaveImpactParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
  shape: "diamond" | "streak";
}

export interface Chapter1WaveVanishEffect {
  x: number;
  y: number;
  color: string;
  size: number;
  strength: number;
  age: number;
  life: number;
}

export interface Chapter1DeferredAction {
  time: number;
  run: () => void;
}

export interface Chapter1WaveEvent {
  at: number;
  label: string;
  run: () => void;
}

export interface Chapter1WaveRuntime {
  enabled: boolean;
  running: boolean;
  sandboxSingleWave: boolean;
  selectedWave: number;
  nextWave: number;
  elapsed: number;
  clock: number;
  events: Chapter1WaveEvent[];
  eventCursor: number;
  waveInstanceId: number;
  cueText: string;
  cueTimer: number;
  bannerTimer: number;
  clearTimer: number;
  allWavesCleared: boolean;
  telegraphs: Chapter1WaveTelegraph[];
  deferred: Chapter1DeferredAction[];
  impactParticles: Chapter1WaveImpactParticle[];
  vanishEffects: Chapter1WaveVanishEffect[];
}

export function createChapter1WaveRuntime(): Chapter1WaveRuntime {
  return {
    enabled: true,
    running: false,
    sandboxSingleWave: false,
    selectedWave: 0,
    nextWave: 0,
    elapsed: 0,
    clock: 0,
    events: [],
    eventCursor: 0,
    waveInstanceId: 0,
    cueText: "",
    cueTimer: 0,
    bannerTimer: 0,
    clearTimer: 0,
    allWavesCleared: false,
    telegraphs: [],
    deferred: [],
    impactParticles: [],
    vanishEffects: [],
  };
}
