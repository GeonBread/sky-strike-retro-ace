import type { Chapter1BossOriginalRuntime } from "./chapter1BossOriginalRuntime";

export const CHAPTER1_BOSS_PHASE1_PATTERN_IDS = [17, 5, 8, 16, 19, 53] as const;
export const CHAPTER1_BOSS_PHASE2_PATTERN_IDS = [7, 54, 55, 59, 61, 62, 63, 64, 65, 66] as const;

export type Chapter1BossPatternId =
  | (typeof CHAPTER1_BOSS_PHASE1_PATTERN_IDS)[number]
  | (typeof CHAPTER1_BOSS_PHASE2_PATTERN_IDS)[number];

export interface Chapter1BossRuntime {
  enabled: boolean;
  active: boolean;
  core: Chapter1BossOriginalRuntime | null;
  sandboxPatternLock: number;
  bombHit: boolean;
}

export function createChapter1BossRuntime(): Chapter1BossRuntime {
  return {
    enabled: true,
    active: false,
    core: null,
    sandboxPatternLock: -1,
    bombHit: false,
  };
}
