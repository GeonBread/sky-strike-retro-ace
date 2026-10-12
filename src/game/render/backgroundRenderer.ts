/**
 * 스토리 배경 렌더러
 *
 * 챕터 1 웨이브에서는 캠퍼스 항공 맵 + 원근 구름 2개 레이어를
 * 각각 다른 속도로 위 -> 아래 방향으로 무한 반복 렌더링한다.
 */

import {
  STORY_CHAPTER1_PARALLAX_ALPHAS,
  STORY_CHAPTER1_PARALLAX_SPEEDS,
} from "../data/storyChapterBackgroundCatalog";

type BackgroundRenderEngine = any;

function drawLoopingLayer(
  engine: BackgroundRenderEngine,
  img: HTMLImageElement,
  speed: number,
  alpha: number,
): void {
  const canvasWidth = engine.canvas.width;
  const canvasHeight = engine.canvas.height;
  const scale = Math.max(canvasWidth / img.naturalWidth, canvasHeight / img.naturalHeight);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  const x = (canvasWidth - drawWidth) / 2;
  const elapsedSeconds = performance.now() / 1000;

  // 양의 offset이 증가하므로 이미지 자체가 화면 위 -> 아래 방향으로 흐른다.
  const offset = ((elapsedSeconds * speed) % drawHeight + drawHeight) % drawHeight;
  const firstY = offset - drawHeight;

  engine.ctx.save();
  engine.ctx.globalAlpha = alpha;
  engine.ctx.drawImage(img, x, firstY, drawWidth, drawHeight);
  engine.ctx.drawImage(img, x, firstY + drawHeight, drawWidth, drawHeight);
  // 큰 화면/경계 상황에서도 빈 틈이 생기지 않도록 한 장 더 확보한다.
  engine.ctx.drawImage(img, x, firstY - drawHeight, drawWidth, drawHeight);
  engine.ctx.restore();
}

/**
 * 챕터 1 웨이브 전용 맵 + 구름 패럴랙스.
 */
export function renderChapter1ParallaxBackgroundSystem(
  engine: BackgroundRenderEngine,
  isBoss: boolean,
): boolean {
  if (!engine.chapter1BackgroundReady || engine.chapter1BackgroundLayers.length < 1) return false;

  engine.ctx.fillStyle = "#02050a";
  engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);

  const layers = engine.chapter1BackgroundLayers as HTMLImageElement[];
  layers.forEach((img, index) => {
    drawLoopingLayer(
      engine,
      img,
      STORY_CHAPTER1_PARALLAX_SPEEDS[index] ?? 0,
      STORY_CHAPTER1_PARALLAX_ALPHAS[index] ?? 1,
    );
  });

  // 이전 버전처럼 맵 전체를 강하게 어둡게 하지 않는다.
  // 보스전에서만 탄막 가독성을 위해 아주 약한 톤만 추가한다.
  if (isBoss) {
    engine.ctx.save();
    engine.ctx.fillStyle = "rgba(3, 7, 18, 0.08)";
    engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
    engine.ctx.restore();
  }

  return true;
}

/**
 * 현재 전투 티어와 보스전 여부를 기준으로 전투 배경 전체를 그린다.
 * 챕터 1 배경 에셋을 사용할 수 없는 경우에는 기존 기본 배경으로 폴백한다.
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
    engine.ctx.fillStyle = tier >= 4 && i % 4 === 0
      ? "#f0abfc"
      : tier === 3 && i % 6 === 0
        ? "#c084fc"
        : tier === 2 && i % 5 === 0
          ? "#22d3ee"
          : "#ffffff";
    engine.ctx.fillRect(sx, sy, 1 + (i % 3), 1 + (i % 3));
  }

  engine.ctx.globalAlpha = isBoss ? 0.22 : 0.12;
  engine.ctx.strokeStyle = tier >= 4
    ? "#e879f9"
    : tier === 3
      ? "#a855f7"
      : tier === 2
        ? "#06b6d4"
        : "#334155";
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
    engine.ctx.fillStyle = tier >= 4
      ? "#e879f9"
      : tier === 3
        ? "#a855f7"
        : tier === 2
          ? "#f43f5e"
          : "#38bdf8";
    for (let i = 0; i < 5 + tier * 2; i++) {
      const x = ((time * 0.05 + i * 91) % (engine.canvas.width + 120)) - 60;
      engine.ctx.fillRect(x, 0, 2, engine.canvas.height);
    }
  }

  engine.ctx.globalAlpha = 1;
}
