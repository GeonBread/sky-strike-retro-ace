/**
 * 스토리 챕터 배경 카탈로그
 *
 * 챕터 1 웨이브 전투는 경북대 캠퍼스 항공뷰 맵을 배경으로 사용한다.
 */

export const STORY_CHAPTER1_PARALLAX_LAYERS = [
  "/assets/backgrounds/chapter1_wave_map.png",
];

/**
 * 단일 배경 맵 스크롤 속도(px/s).
 * 값이 작을수록 더 천천히 내려간다.
 */
export const STORY_CHAPTER1_MAP_SCROLL_SPEED = 14;

// 단일 배경 맵을 사용하므로 패럴랙스 속도/알파는 보조값으로만 유지한다.
export const STORY_CHAPTER1_PARALLAX_SPEEDS = [0];
export const STORY_CHAPTER1_PARALLAX_ALPHAS = [1];
