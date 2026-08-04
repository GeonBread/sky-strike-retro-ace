/**
 * 챕터 1 몬스터·탄 표시 크기와 충돌 판정 크기를 분리해 관리합니다.
 * 화면에서 잘 보이도록 시각 크기는 크게 올리고, 판정 크기는 완만하게만 확대합니다.
 */

export const CHAPTER1_DEFAULT_ENEMY_VISUAL_SCALE = 1.42;
export const CHAPTER1_SCHEDULE_ENEMY_VISUAL_SCALE = 1.27;
export const CHAPTER1_ENEMY_HITBOX_SCALE = 1.10;

export const CHAPTER1_DEFAULT_BULLET_VISUAL_SCALE = 1.50;
export const CHAPTER1_LARGE_LOCK_BULLET_VISUAL_SCALE = 1.34;
export const CHAPTER1_SCHEDULE_BLOCK_VISUAL_SCALE = 1.30;
export const CHAPTER1_BULLET_HITBOX_SCALE = 1.16;
export const CHAPTER1_RING_VISUAL_AND_HIT_SCALE = 1.34;

export function getChapter1EnemyVisualScale(index: number): number {
  return index === 6
    ? CHAPTER1_SCHEDULE_ENEMY_VISUAL_SCALE
    : CHAPTER1_DEFAULT_ENEMY_VISUAL_SCALE;
}

export function getChapter1BulletVisualScale(sprite: number): number {
  if (sprite === 4) return CHAPTER1_LARGE_LOCK_BULLET_VISUAL_SCALE;
  if (sprite === 6) return CHAPTER1_SCHEDULE_BLOCK_VISUAL_SCALE;
  return CHAPTER1_DEFAULT_BULLET_VISUAL_SCALE;
}

export function getChapter1BulletHitboxScale(sprite: number): number {
  if (sprite === 4 || sprite === 6) return 1.08;
  return CHAPTER1_BULLET_HITBOX_SCALE;
}
