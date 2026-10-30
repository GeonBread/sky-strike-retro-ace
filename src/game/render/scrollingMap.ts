/** Same downward tiling as the CH1 map. Preserve the full bitmap's aspect ratio. */
export function drawScrollingMapDown(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null | undefined,
  width: number,
  height: number,
  timeSeconds: number,
  speed = 8,
): boolean {
  if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || width <= 0 || height <= 0) return false;
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (width - drawWidth) / 2;
  const offset = (((timeSeconds * speed) % drawHeight) + drawHeight) % drawHeight;
  const baseY = offset - drawHeight;
  ctx.save();
  ctx.beginPath();ctx.rect(0, 0, width, height);ctx.clip();
  ctx.drawImage(image, x, baseY, drawWidth, drawHeight);
  ctx.drawImage(image, x, baseY + drawHeight, drawWidth, drawHeight);
  ctx.drawImage(image, x, baseY - drawHeight, drawWidth, drawHeight);
  ctx.restore();
  return true;
}
