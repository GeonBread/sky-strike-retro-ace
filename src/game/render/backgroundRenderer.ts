/**
 * 전투 배경 렌더러
 *
 * Chapter 1 wave:
 * - campus map scrolls downward forever
 * - far/small cloud layer scrolls slowly
 * - near/large cloud layer scrolls fastest
 * - cloud assets are loaded independently here so they are not hidden by the
 *   generic Chapter 1 background-ready gate.
 */

type BackgroundRenderEngine = any;

const CH1_MAP_SPEED = 14;
const CH1_FAR_CLOUD_SPEED = 5;
const CH1_NEAR_CLOUD_SPEED = 34;
const CH1_FAR_CLOUD_ALPHA = 0.58;
const CH1_NEAR_CLOUD_ALPHA = 0.66;

let farCloudImage: HTMLImageElement | null = null;
let nearCloudImage: HTMLImageElement | null = null;

function makeCloudImage(primarySrc: string, fallbackSrc: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const image = new Image();
  let fallbackTried = false;
  image.onerror = () => {
    if (fallbackTried) return;
    fallbackTried = true;
    image.src = fallbackSrc;
  };
  image.src = primarySrc;
  return image;
}

function ensureChapter1CloudImages(): void {
  if (!farCloudImage) {
    farCloudImage = makeCloudImage(
      "/assets/chapter1/combat/backgrounds/chapter1_cloud_far.png",
      "/assets/backgrounds/chapter1_cloud_far.png",
    );
  }
  if (!nearCloudImage) {
    nearCloudImage = makeCloudImage(
      "/assets/chapter1/combat/backgrounds/chapter1_cloud_near.png",
      "/assets/backgrounds/chapter1_cloud_near.png",
    );
  }
}

function isDrawableImage(image: HTMLImageElement | null | undefined): image is HTMLImageElement {
  return !!image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
}

/**
 * Draw a vertically looping layer whose bitmap itself moves from top to bottom.
 */
function drawLoopingLayerDown(
  engine: BackgroundRenderEngine,
  image: HTMLImageElement,
  speed: number,
  alpha: number,
  phase = 0,
): void {
  const canvasWidth = engine.canvas.width;
  const canvasHeight = engine.canvas.height;
  const scale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (canvasWidth - drawWidth) * 0.5;
  const timeSeconds = performance.now() / 1000;

  const offset = (((timeSeconds * speed) + phase) % drawHeight + drawHeight) % drawHeight;
  const baseY = offset - drawHeight;

  engine.ctx.save();
  engine.ctx.globalAlpha = alpha;
  engine.ctx.globalCompositeOperation = "source-over";
  engine.ctx.drawImage(image, x, baseY, drawWidth, drawHeight);
  engine.ctx.drawImage(image, x, baseY + drawHeight, drawWidth, drawHeight);
  engine.ctx.drawImage(image, x, baseY - drawHeight, drawWidth, drawHeight);
  engine.ctx.restore();
}

/**
 * Chapter 1 map + cloud parallax.
 * The map source is still the existing engine layer, while the two cloud layers
 * are loaded independently above. This keeps the clouds visible even if the
 * generic layer loader/catalog changes.
 */
export function renderChapter1ParallaxBackgroundSystem(
  engine: BackgroundRenderEngine,
  isBoss: boolean,
): boolean {
  const mapImage = engine.chapter1BackgroundLayers?.[0] as HTMLImageElement | undefined;
  if (!isDrawableImage(mapImage)) return false;

  ensureChapter1CloudImages();

  engine.ctx.save();
  engine.ctx.globalAlpha = 1;
  engine.ctx.fillStyle = "#02050a";
  engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
  engine.ctx.restore();

  // 1) Campus map: downward, infinite loop.
  drawLoopingLayerDown(engine, mapImage, CH1_MAP_SPEED, 1);

  // 2) Distant small clouds: slowest. Draw a second half-cycle copy so the
  // sparse cloud sheet remains visible without becoming opaque.
  if (isDrawableImage(farCloudImage)) {
    const farScale = Math.max(
      engine.canvas.width / farCloudImage.naturalWidth,
      engine.canvas.height / farCloudImage.naturalHeight,
    );
    const farHeight = farCloudImage.naturalHeight * farScale;
    drawLoopingLayerDown(engine, farCloudImage, CH1_FAR_CLOUD_SPEED, CH1_FAR_CLOUD_ALPHA * 0.72, 0);
    drawLoopingLayerDown(engine, farCloudImage, CH1_FAR_CLOUD_SPEED, CH1_FAR_CLOUD_ALPHA * 0.58, farHeight * 0.5);
  }

  // 3) Nearby large clouds: fastest.
  if (isDrawableImage(nearCloudImage)) {
    drawLoopingLayerDown(engine, nearCloudImage, CH1_NEAR_CLOUD_SPEED, CH1_NEAR_CLOUD_ALPHA);
  }

  // Keep the map readable. Only the boss gets a very light tone overlay.
  if (isBoss) {
    engine.ctx.save();
    engine.ctx.fillStyle = "rgba(3, 7, 18, 0.06)";
    engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
    engine.ctx.restore();
  }

  return true;
}

/**
 * Current combat background renderer. Non-Chapter-1 behaviour is preserved.
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
