/**
 * 챕터 1 웨이브 배경 레이어 카탈로그
 *
 * 0: 캠퍼스 맵
 * 1: 먼 거리의 작은 구름
 * 2: 가까운 큰 구름
 *
 * 모두 화면 기준으로 위 -> 아래 방향으로 무한 반복하며,
 * 원근감을 위해 가까운 레이어일수록 더 빠르게 이동한다.
 */
export const STORY_CHAPTER1_PARALLAX_LAYERS = [
  "/assets/chapter1/combat/backgrounds/chapter1_wave_map.png",
  "/assets/chapter1/combat/backgrounds/chapter1_cloud_far.png",
  "/assets/chapter1/combat/backgrounds/chapter1_cloud_near.png",
];

/** px/s: 먼 구름 < 맵 < 가까운 큰 구름 */
export const STORY_CHAPTER1_PARALLAX_SPEEDS = [14, 6, 30];

/** 맵을 가리지 않도록 구름은 추가 투명도를 적용한다. */
export const STORY_CHAPTER1_PARALLAX_ALPHAS = [1, 0.22, 0.30];
