/**
 * 스토리 배경 렌더러
 *
 * 챕터 1은 세로로 긴 캠퍼스 항공뷰 맵을 사용하며,
 * 화면 자체는 고정한 채 카메라가 맵의 상단에서 하단으로 천천히 내려가도록 렌더링한다.
 */

import {
  STORY_CHAPTER1_MAP_SCROLL_SPEED,
  STORY_CHAPTER1_PARALLAX_ALPHAS,
  STORY_CHAPTER1_PARALLAX_SPEEDS,
} from "../data/storyChapterBackgroundCatalog";

type BackgroundRenderEngine = any;

function renderSingleMapPanDown(engine: BackgroundRenderEngine, img: HTMLImageElement, isBoss: boolean): void {
  const canvasWidth = engine.canvas.width;
  const canvasHeight = engine.canvas.height;

  const scale = Math.max(canvasWidth / img.naturalWidth, canvasHeight / img.naturalHeight);
  const visibleSourceWidth = Math.min(img.naturalWidth, canvasWidth / scale);
  const visibleSourceHeight = Math.min(img.naturalHeight, canvasHeight / scale);
  const sourceX = Math.max(0, (img.naturalWidth - visibleSourceWidth) * 0.5);
  const maxSourceY = Math.max(0, img.naturalHeight - visibleSourceHeight);
  const elapsedSeconds = performance.now() / 1000;

  // 화면은 고정, 카메라가 맵 상단에서 하단으로 천천히 이동한다.
  const sourceY = maxSourceY > 0
    ? Math.min(maxSourceY, elapsedSeconds * (STORY_CHAPTER1_MAP_SCROLL_SPEED / scale))
    : 0;

  engine.ctx.drawImage(
    img,
    sourceX,
    sourceY,
    visibleSourceWidth,
    visibleSourceHeight,
    0,
    0,
    canvasWidth,
    canvasHeight,
  );

  // 배경이 너무 어둡지 않도록 오버레이를 완화한다.
  engine.ctx.fillStyle = isBoss ? "rgba(4, 8, 18, 0.20)" : "rgba(4, 8, 18, 0.10)";
  engine.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const vignette = engine.ctx.createRadialGradient(
    canvasWidth * 0.5,
    canvasHeight * 0.45,
    Math.min(canvasWidth, canvasHeight) * 0.22,
    canvasWidth * 0.5,
    canvasHeight * 0.5,
    Math.max(canvasWidth, canvasHeight) * 0.74,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, isBoss ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.10)");
  engine.ctx.fillStyle = vignette;
  engine.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

/**
 * 챕터 1 전용 배경 렌더링.
 */
export function renderChapter1ParallaxBackgroundSystem(engine: BackgroundRenderEngine, isBoss: boolean): boolean {
  if (!engine.chapter1BackgroundReady || engine.chapter1BackgroundLayers.length < 1) return false;

  engine.ctx.fillStyle = "#02050a";
  engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);

  const layers = engine.chapter1BackgroundLayers as HTMLImageElement[];

  if (layers.length === 1) {
    renderSingleMapPanDown(engine, layers[0], isBoss);
    return true;
  }

  const time = performance.now() / 1000;
  layers.forEach((img, index) => {
    const scale = Math.max(engine.canvas.width / img.naturalWidth, engine.canvas.height / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const x = (engine.canvas.width - drawWidth) / 2;
    const speed = STORY_CHAPTER1_PARALLAX_SPEEDS[index] ?? 0;
    const y = speed === 0
      ? (engine.canvas.height - drawHeight) / 2
      : ((time * speed) % drawHeight + drawHeight) % drawHeight;

    engine.ctx.save();
    engine.ctx.globalAlpha = STORY_CHAPTER1_PARALLAX_ALPHAS[index] ?? 1;
    engine.ctx.drawImage(img, x, y, drawWidth, drawHeight);
    if (speed !== 0) engine.ctx.drawImage(img, x, y - drawHeight, drawWidth, drawHeight);
    engine.ctx.restore();
  });

  if (isBoss) {
    engine.ctx.save();
    engine.ctx.fillStyle = "rgba(2, 6, 23, 0.12)";
    engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
    engine.ctx.restore();
  }

  return true;
}

/**
 * 전체 전투 배경 렌더링.
 */
export function renderBackgroundSystem(engine: BackgroundRenderEngine): void {
  const tier = engine.getCombatTier();
  const isBoss = engine.bossActive || engine.state === "BOSSCUTSCENE";
  if (tier === 1 && engine.renderChapter1ParallaxBackground(isBoss)) return;

  const time = performance.now();
  const topColors = isBoss
    ? tier >= 4
      ? ["#18051f", "#581c87", "#020617"]
      : tier === 3
      ? ["#12081f", "#2e1065", "#020617"]
      : tier === 2
        ? ["#111827", "#4c0519", "#020617"]
        : ["#111827", "#1e293b", "#020617"]
    : tier >= 4
      ? ["#06121f", "#4a044e", "#020617"]
      : tier === 3
      ? ["#07111f", "#312e81", "#020617"]
      : tier === 2
        ? ["#07111f", "#164e63", "#020617"]
        : ["#020617", "#0f172a", "#020617"];

  const gradient = engine.ctx.createLinearGradient(0, 0, 0, engine.canvas.height);
  gradient.addColorStop(0, topColors[0]);
  gradient.addColorStop(0.45, topColors[1]);
  gradient.addColorStop(1, topColors[2]);
  engine.ctx.fillStyle = gradient;
  engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);

  const starCount = isBoss ? 68 : 44 + tier * 10;
  for (let i = 0; i < starCount; i++) {
    const sx = (time * (0.025 + tier * 0.006) + i * 147) % engine.canvas.width;
    const sy = (time * 0.13 * ((i % 4) + 1) + i * 254) % engine.canvas.height;
    engine.ctx.globalAlpha = 0.18 + (i % 5) * 0.12;
    engine.ctx.fillStyle = tier >= 4 && i % 4 === 0 ? "#f0abfc" : tier === 3 && i % 6 === 0 ? "#c084fc" : tier === 2 && i % 5 === 0 ? "#22d3ee" : "#ffffff";
    engine.ctx.fillRect(sx, sy, 1 + (i % 3), 1 + (i % 3));
  }

  engine.ctx.globalAlpha = isBoss ? 0.22 : 0.12;
  engine.ctx.strokeStyle = tier >= 4 ? "#e879f9" : tier === 3 ? "#a855f7" : tier === 2 ? "#06b6d4" : "#334155";
  engine.ctx.lineWidth = 1;
  const gridStep = tier >= 4 ? 32 : tier === 3 ? 38 : tier === 2 ? 48 : 60;
  const drift = (time * 0.035) % gridStep;
  for (let y = -gridStep; y < engine.canvas.height + gridStep; y += gridStep) {
    engine.ctx.beginPath();
    engine.ctx.moveTo(0, y + drift);
    engine.ctx.lineTo(engine.canvas.width, y + drift + (isBoss ? 20 : 8));
    engine.ctx.stroke();
  }

  if (isBoss) {
    engine.ctx.globalAlpha = 0.16;
    engine.ctx.fillStyle = tier >= 4 ? "#e879f9" : tier === 3 ? "#a855f7" : tier === 2 ? "#f43f5e" : "#38bdf8";
    for (let i = 0; i < 5 + tier * 2; i++) {
      const x = ((time * 0.05 + i * 91) % (engine.canvas.width + 120)) - 60;
      engine.ctx.fillRect(x, 0, 2, engine.canvas.height);
    }
  }

  engine.ctx.globalAlpha = 1;
}
