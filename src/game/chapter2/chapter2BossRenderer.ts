import { getChapter2BossViewportProjection } from "./chapter2BossViewportProjection";

/**
 * v68 보스 랩의 장면만 800x960 원본 비율 그대로 렌더합니다.
 * 플레이어/플레이어 탄환/HP/폭탄 HUD는 이 함수가 그리지 않으며,
 * 이후 공통 gameSceneRenderer가 기존 호반우 렌더러로 그대로 그립니다.
 */
export function renderChapter2BossSceneSystem(engine: any): boolean {
  const runtime = engine.chapter2Boss;
  if (!runtime?.active || !runtime.core) return false;
  const projection = getChapter2BossViewportProjection(engine.canvas);

  runtime.core.render();
  const source = runtime.core.canvas;

  engine.ctx.save();
  engine.ctx.setTransform(1, 0, 0, 1, 0, 0);
  engine.ctx.fillStyle = "#03050a";
  engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
  engine.ctx.drawImage(
    source,
    0,
    0,
    source.width,
    source.height,
    projection.offsetX,
    projection.offsetY,
    projection.width,
    projection.height,
  );
  engine.ctx.restore();
  return true;
}
