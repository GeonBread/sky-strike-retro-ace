import type { Chapter2BossOriginalRuntime } from "./chapter2BossOriginalRuntime";

export const CHAPTER2_BOSS_PHASE1_PATTERN_IDS = [201, 202, 203, 204, 205, 206, 207] as const;
export const CHAPTER2_BOSS_PHASE2_PATTERN_IDS = [301, 302, 303, 304, 305, 306, 307, 308, 309] as const;

export type Chapter2BossPatternId =
  | (typeof CHAPTER2_BOSS_PHASE1_PATTERN_IDS)[number]
  | (typeof CHAPTER2_BOSS_PHASE2_PATTERN_IDS)[number];

export type Chapter2BossSceneId = "phase1Intro" | "phaseTransition" | "phase2Intro" | "clear";

export interface Chapter2BossHudState {
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  patternId: number;
  patternTitle: string;
  cinematic: string | null;
  clearStage: string | null;
  victoryComplete: boolean;
}

export interface Chapter2BossRuntime {
  enabled: boolean;
  active: boolean;
  core: Chapter2BossOriginalRuntime | null;
  bombHit: boolean;
  completeNotified: boolean;
  supportSpawnTimer: number;
  supportWaveSerial: number;
}

export function createChapter2BossRuntime(): Chapter2BossRuntime {
  return {
    enabled: true,
    active: false,
    core: null,
    bombHit: false,
    completeNotified: false,
    supportSpawnTimer: 6.5,
    supportWaveSerial: 0,
  };
}
