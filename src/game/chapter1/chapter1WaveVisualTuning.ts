/**
 * 챕터 1 몬스터·탄 표시 크기와 충돌 판정 크기를 분리해 관리합니다.
 * 화면에서 잘 보이도록 시각 크기는 크게 올리고, 판정 크기는 완만하게만 확대합니다.
 */

// 스토리·웨이브·보스 전투가 공유하는 고정 논리 해상도입니다.
export const CHAPTER1_STORY_CANVAS_WIDTH = 922;
export const CHAPTER1_STORY_CANVAS_HEIGHT = 960;

// 스토리 전투에서 웨이브와 보스가 공유하는 플레이어 표시 크기와 이동 속도입니다.
export const CHAPTER1_STORY_PLAYER_VISUAL_WIDTH = 137;
export const CHAPTER1_STORY_PLAYER_MOVE_SPEED = 480;

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
