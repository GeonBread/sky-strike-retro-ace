/**
 * 챕터 1 보스 원본 좌표계를 공통 스토리 전투 캔버스에 배치하는 투영 규칙입니다.
 *
 * 보스 패턴은 800 × 960 좌표계를 그대로 사용하고, 실제 게임 캔버스에서는
 * 비율을 유지한 채 중앙 정렬합니다. 이 파일은 보스 렌더링, 충돌, 포인터 입력,
 * 정화 폭탄 좌표 변환을 모두 같은 기준으로 맞출 때 수정합니다.
 */

export const CHAPTER1_BOSS_CANONICAL_WIDTH = 800;
export const CHAPTER1_BOSS_CANONICAL_HEIGHT = 960;

export interface Chapter1BossViewportProjection {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * 현재 캔버스 안에 800 × 960 보스 좌표계를 왜곡 없이 중앙 배치할 투영값을 반환합니다.
 */
export function getChapter1BossViewportProjection(canvas: HTMLCanvasElement): Chapter1BossViewportProjection {
  const scale = Math.min(
    canvas.width / CHAPTER1_BOSS_CANONICAL_WIDTH,
    canvas.height / CHAPTER1_BOSS_CANONICAL_HEIGHT,
  );
  return {
    scale,
    offsetX: (canvas.width - CHAPTER1_BOSS_CANONICAL_WIDTH * scale) / 2,
    offsetY: (canvas.height - CHAPTER1_BOSS_CANONICAL_HEIGHT * scale) / 2,
  };
}
