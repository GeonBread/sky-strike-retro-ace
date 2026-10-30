/** Chapter 1's base-map speeds, in logical pixels per second. */
export const BOSS_MAP_SPEED = { phase1: 86, awakening: 112, phase2: 122, defeated: 94 } as const;
export type BossMapStage = keyof typeof BOSS_MAP_SPEED;
export function bossMapSpeed(stage: BossMapStage) { return BOSS_MAP_SPEED[stage]; }
