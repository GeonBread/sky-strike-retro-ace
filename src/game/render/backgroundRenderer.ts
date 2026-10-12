/**
 * 스토리 배경 렌더러
 *
 * 챕터별 배경, 보스전 배경 색상, 별빛, 전투 격자 효과를 그린다.
 * 챕터 1은 캠퍼스 항공뷰 맵 배경을 우선 렌더링한다.
 */

import { STORY_CHAPTER1_PARALLAX_ALPHAS, STORY_CHAPTER1_PARALLAX_SPEEDS } from "../data/storyChapterBackgroundCatalog";

type BackgroundRenderEngine = any;

/**
 * 챕터 1 전용 배경을 캔버스 크기에 맞춰 렌더링한다.
 * - 레이어가 1장이면 정적 맵 배경으로 cover 렌더링한다.
 * - 레이어가 여러 장이면 기존 패럴랙스 렌더링을 유지한다.
 */
export function renderChapter1ParallaxBackgroundSystem(engine: BackgroundRenderEngine, isBoss: boolean): boolean {
  if (!engine.chapter1BackgroundReady || engine.chapter1BackgroundLayers.length < 1) return false;

  engine.ctx.fillStyle = "#02050a";
  engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);

  const layers = engine.chapter1BackgroundLayers as HTMLImageElement[];

  if (layers.length === 1) {
    const img = layers[0];
    const scale = Math.max(engine.canvas.width / img.naturalWidth, engine.canvas.height / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const x = (engine.canvas.width - drawWidth) / 2;
    const y = (engine.canvas.height - drawHeight) / 2;

    engine.ctx.save();
    engine.ctx.drawImage(img, x, y, drawWidth, drawHeight);

    // 전투 가독성을 위해 살짝 어둡게 눌러 준다.
    engine.ctx.fillStyle = isBoss ? "rgba(3, 8, 20, 0.36)" : "rgba(3, 8, 20, 0.24)";
    engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);

    // 가장자리에 은은한 비네팅을 넣어 HUD와 탄막 가독성을 유지한다.
    const vignette = engine.ctx.createRadialGradient(
      engine.canvas.width * 0.5,
      engine.canvas.height * 0.45,
      Math.min(engine.canvas.width, engine.canvas.height) * 0.18,
      engine.canvas.width * 0.5,
      engine.canvas.height * 0.5,
      Math.max(engine.canvas.width, engine.canvas.height) * 0.72,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, isBoss ? "rgba(0,0,0,0.34)" : "rgba(0,0,0,0.22)");
    engine.ctx.fillStyle = vignette;
    engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
    engine.ctx.restore();
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
    engine.ctx.fillStyle = "rgba(2, 6, 23, 0.18)";
    engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
    engine.ctx.restore();
  }

  return true;
}

/**
 * 현재 전투 티어와 보스전 여부를 기준으로 전투 배경 전체를 그린다.
 * 패럴랙스 배경을 사용할 수 없는 경우에는 그라데이션, 별, 격자 효과를 직접 렌더링한다.
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

  engine.ctx.globalAlpha = 1.0;
}
