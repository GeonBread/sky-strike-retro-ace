export const CHAPTER2_BOSS_SOURCE_WIDTH = 800;
export const CHAPTER2_BOSS_SOURCE_HEIGHT = 960;

export interface Chapter2BossViewportProjection {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/**
 * v68 보스 랩은 800x960으로 설계되어 있습니다.
 * 922x960 스토리 캔버스에서는 세로 크기를 그대로 유지하고 좌우에 동일한 여백을 두어
 * 보스/탄막/연출의 종횡비와 원본 크기를 절대 늘려서 왜곡하지 않습니다.
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
