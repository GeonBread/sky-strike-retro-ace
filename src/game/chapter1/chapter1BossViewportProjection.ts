/**
 * 챕터 1 보스 런타임과 실제 전투 캔버스 사이의 좌표 투영 규칙입니다.
 *
 * 현재 보스 원본 런타임은 실제 캔버스 크기(스토리 전투 기준 922 × 960)를 직접 사용합니다.
 * 따라서 별도의 800 × 960 중앙 레터박스 투영을 하지 않고 1:1 좌표를 사용합니다.
 */

export const CHAPTER1_BOSS_CANONICAL_WIDTH = 922;
export const CHAPTER1_BOSS_CANONICAL_HEIGHT = 960;

export interface Chapter1BossViewportProjection {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * 보스 패턴·충돌·포인터·정화 파동이 넓어진 전투 화면 전체를 같은 좌표로 사용하도록 1:1 투영값을 반환합니다.
 */
export function getChapter1BossViewportProjection(_canvas: HTMLCanvasElement): Chapter1BossViewportProjection {
  return {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };
}
