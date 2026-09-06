export const CHAPTER2_BOSS_SOURCE_WIDTH = 922;
export const CHAPTER2_BOSS_SOURCE_HEIGHT = 960;

export interface Chapter2BossViewportProjection {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/**
 * 챕터 2 보스는 챕터 1과 동일한 922x960 논리 화면을 사용합니다.
 * 보스/탄/세부 UI는 1:1 픽셀 크기를 유지하고, 전체화면 패턴의 바깥 레이아웃만
 * 넓어진 922px 폭을 사용하므로 비균일 확대에 의한 찌그러짐이 발생하지 않습니다.
 */
export function getChapter2BossViewportProjection(canvas: HTMLCanvasElement): Chapter2BossViewportProjection {
  const scale = Math.min(
    canvas.width / CHAPTER2_BOSS_SOURCE_WIDTH,
    canvas.height / CHAPTER2_BOSS_SOURCE_HEIGHT,
  );
  const width = CHAPTER2_BOSS_SOURCE_WIDTH * scale;
  const height = CHAPTER2_BOSS_SOURCE_HEIGHT * scale;
  return {
    scale,
    width,
    height,
    offsetX: (canvas.width - width) / 2,
    offsetY: (canvas.height - height) / 2,
  };
}
