import type { Bullet, Enemy } from "../entities";
import { CHAPTER1_ENEMY_CATALOG } from "./chapter1WaveCatalog";
import { isChapter1EnemyType } from "./chapter1WaveTypes";
import {
  CHAPTER1_RING_VISUAL_AND_HIT_SCALE,
  getChapter1BulletVisualScale,
} from "./chapter1WaveVisualTuning";
import { renderChapter1WaveImpactEffectsSystem } from "./chapter1WaveImpactSystem";

const BASE_WIDTH = 800;
const BASE_HEIGHT = 960;
const ENEMY_AURA_COLORS = [
  "#ff514d",
  "#ffd02f",
  "#ff8a35",
  "#6ddd74",
  "#9c67ff",
  "#a9df3f",
  "#ff4e54",
  "#ffc42d",
  "#ff4b9a",
  "#4ec9ff",
] as const;

const BULLET_PATHS = [
  "/assets/chapter1/waves/bullets/bullet_01_attendance_stamp.png",
  "/assets/chapter1/waves/bullets/bullet_02_absence_stamp.png",
  "/assets/chapter1/waves/bullets/bullet_03_bell.png",
  "/assets/chapter1/waves/bullets/bullet_04_student_id.png",
  "/assets/chapter1/waves/bullets/bullet_05_password_lock.png",
  "/assets/chapter1/waves/bullets/bullet_06_cltr_chip.png",
  "/assets/chapter1/waves/bullets/bullet_07_schedule_conflict.png",
  "/assets/chapter1/waves/bullets/bullet_08_zero_seat.png",
  "/assets/chapter1/waves/bullets/bullet_09_course_cart.png",
  "/assets/chapter1/waves/bullets/bullet_10_arrow.png",
] as const;
const BULLET_DRAW_SIZES: readonly (readonly [number, number])[] = [
  [30, 30],
  [31, 31],
  [36, 37],
  [42, 31],
  [74, 48],
  [36, 36],
  [31, 31],
  [34, 33],
  [41, 33],
  [26, 34],
];

const imageCache = new Map<string, HTMLImageElement>();

function getImage(path: string): HTMLImageElement {
  let image = imageCache.get(path);
  if (!image) {
    image = new Image();
    image.src = path;
    imageCache.set(path, image);
  }
  return image;
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  if (!image.complete || image.naturalWidth <= 0) return;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
}

export function renderChapter1EnemySystem(
  engine: any,
  enemy: Enemy,
): boolean {
  if (!isChapter1EnemyType(enemy.type) || !enemy.chapter1) return false;
  if (!enemy.active) return true;

  const state = enemy.chapter1;
  const catalog = CHAPTER1_ENEMY_CATALOG[state.index];
  const ctx = engine.ctx as CanvasRenderingContext2D;
  const centerX = enemy.x + enemy.width / 2;
  const centerY = enemy.y + enemy.height / 2;
  const bob = Math.sin(state.age * 3.5 + state.phase) * Math.max(1.5, enemy.height * 0.03);
  const color = ENEMY_AURA_COLORS[state.index];
  const image = getImage(catalog.sprite);

  ctx.save();
  const auraRadius = Math.max(enemy.width, enemy.height) * 0.78;
  const gradient = ctx.createRadialGradient(centerX, centerY + bob, 2, centerX, centerY + bob, auraRadius);
  gradient.addColorStop(0, `${color}42`);
  gradient.addColorStop(0.58, `${color}18`);
  gradient.addColorStop(1, `${color}00`);
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + bob, enemy.width * 0.72, enemy.height * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(centerX, centerY + bob);
  const rotation = state.index === 4
    ? Math.max(-0.13, Math.min(0.13, state.motionX / 900)) + Math.sin(state.age * 3.2) * 0.035
    : Math.sin(state.age * 2) * 0.025;
  ctx.rotate(rotation);
  ctx.shadowColor = color;
  ctx.shadowBlur = 9 + Math.sin(performance.now() * 0.004 + state.phase) * 2;
  if (state.index === 8 && !state.open) ctx.globalAlpha = 0.96;
  drawContainedImage(ctx, image, 0, 0, enemy.width, enemy.height);
  ctx.restore();

  if (state.hitFlash > 0) {
    const flash = Math.max(0, Math.min(1, state.hitFlash / 0.12));
    const spread = (1 - flash) * 10;
    const hitX = Number.isFinite(state.hitX) ? state.hitX! : centerX;
    const hitY = (Number.isFinite(state.hitY) ? state.hitY! : centerY) + bob;
    const angle = Number.isFinite(state.hitAngle) ? state.hitAngle! : -Math.PI * 0.5;

    ctx.save();
    ctx.translate(hitX, hitY);
    ctx.rotate(angle + Math.PI * 0.5);
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = color;
    ctx.shadowBlur = 7 * flash;
    ctx.lineCap = "square";

    ctx.globalAlpha = flash * 0.9;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.6 + flash * 1.8;
    ctx.beginPath();
    ctx.moveTo(-8 - spread * 0.25, -5 - spread * 0.18);
    ctx.lineTo(9 + spread * 0.35, 6 + spread * 0.22);
    ctx.moveTo(-6 - spread * 0.18, 7 + spread * 0.2);
    ctx.lineTo(7 + spread * 0.28, -8 - spread * 0.24);
    ctx.stroke();

    ctx.globalAlpha = flash * 0.72;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4 + flash;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * (5 + spread * 0.2), -2);
      ctx.lineTo(side * (13 + spread), -7 - spread * 0.22);
      ctx.stroke();
    }

    ctx.rotate(Math.PI * 0.25);
    ctx.globalAlpha = flash * 0.82;
    ctx.fillStyle = "#ffffff";
    const core = 3 + flash * 2.5;
    ctx.fillRect(-core * 0.5, -core * 0.5, core, core);
    ctx.restore();
  }

  if (state.index === 7 && state.countdown > 0) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.max(16, enemy.width * 0.22)}px system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#090604";
    ctx.fillStyle = "#fff7df";
    ctx.strokeText(String(state.countdown), centerX, centerY + bob);
    ctx.fillText(String(state.countdown), centerX, centerY + bob);
    ctx.restore();
  }

  if (state.index === 8) {
    ctx.save();
    const ratio = Math.min(1, state.charge / 8);
    const barWidth = enemy.width * 0.72;
    const barX = centerX - barWidth / 2;
    const barY = enemy.y - 10;
    ctx.fillStyle = "rgba(2,6,23,.82)";
    ctx.fillRect(barX, barY, barWidth, 7);
    ctx.fillStyle = state.open ? "#ff6b73" : "#74f58a";
    ctx.fillRect(barX, barY, barWidth * ratio, 7);
    ctx.strokeStyle = "#090604";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, 7);
    ctx.font = "900 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff7df";
    ctx.strokeStyle = "#090604";
    ctx.lineWidth = 3;
    const label = state.open ? "반사 중" : `${state.charge}/8`;
    ctx.strokeText(label, centerX, barY - 5);
    ctx.fillText(label, centerX, barY - 5);
    ctx.restore();
  }

  if (state.attack > 0 && state.attack < 0.28) {
    const progress = 1 - state.attack / 0.28;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.35 + progress * 0.55;
    for (const side of [-1, 1]) {
      const x = centerX + side * (enemy.width * 0.52 + progress * 7);
      ctx.beginPath();
      ctx.moveTo(x - side * 5, centerY - 5);
      ctx.lineTo(x, centerY);
      ctx.lineTo(x - side * 5, centerY + 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  return true;
}

export function renderChapter1BulletSystem(
  engine: any,
  bullet: Bullet,
): boolean {
  const state = bullet.chapter1;
  if (!state) return false;
  if (!bullet.active) return true;

  const ctx = engine.ctx as CanvasRenderingContext2D;
  const centerX = bullet.x + bullet.width / 2;
  const centerY = bullet.y + bullet.height / 2;

  if (state.behavior === "ring") {
    const progress = Math.max(0, Math.min(1, state.age / state.life));
    const alpha = 1 - progress;
    const scaleX = engine.canvas.width / BASE_WIDTH;
    const scaleY = engine.canvas.height / BASE_HEIGHT;
    const radius = state.r * CHAPTER1_RING_VISUAL_AND_HIT_SCALE * Math.min(scaleX, scaleY);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.2 * alpha;
    ctx.fillStyle = "#ffd472";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9 * alpha;
    ctx.strokeStyle = "#fff4b8";
    ctx.lineWidth = Math.max(3, (state.thickness ?? 11) * CHAPTER1_RING_VISUAL_AND_HIT_SCALE * Math.min(scaleX, scaleY));
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return true;
  }

  const path = BULLET_PATHS[state.sprite] ?? BULLET_PATHS[0];
  const image = getImage(path);
  const scaleX = engine.canvas.width / BASE_WIDTH;
  const scaleY = engine.canvas.height / BASE_HEIGHT;
  const baseSize = BULLET_DRAW_SIZES[state.sprite] ?? BULLET_DRAW_SIZES[0];
  const visualScale = getChapter1BulletVisualScale(state.sprite);
  const drawWidth = (state.drawW ?? baseSize[0]) * visualScale * scaleX;
  const drawHeight = (state.drawH ?? baseSize[1]) * visualScale * scaleY;
  const velocityAngle = Math.atan2(state.vy, state.vx);

  ctx.save();
  ctx.translate(centerX, centerY);
  const rotation = state.sprite === 9 ? velocityAngle + Math.PI / 2 + state.rotation : state.rotation;
  ctx.rotate(rotation);
  ctx.shadowColor = ["#ff5c58", "#ffd23f", "#ffab48", "#72de82", "#a76cff", "#b8ea4b", "#ff5b63", "#ffc83f", "#ff5eab", "#54d5ff"][state.sprite] || "#ffffff";
  ctx.shadowBlur = state.sprite === 6 ? 12 : 7;
  drawContainedImage(ctx, image, 0, 0, drawWidth, drawHeight);
  ctx.restore();

  if (state.sprite === 6 && (state.hitFlash ?? 0) > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = Math.max(0, Math.min(1, (state.hitFlash ?? 0) / 0.1)) * 0.7;
    ctx.fillStyle = "#fff1ad";
    ctx.fillRect(centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  if (state.destructible && state.maxHp > 1) {
    const ratio = Math.max(0, Math.min(1, state.hp / state.maxHp));
    ctx.save();
    ctx.fillStyle = "rgba(2,6,23,.72)";
    ctx.fillRect(centerX - drawWidth * 0.35, centerY - drawHeight * 0.62, drawWidth * 0.7, 5);
    ctx.fillStyle = state.sprite === 6 ? "#ffcc5c" : "#7de7ff";
    ctx.fillRect(centerX - drawWidth * 0.35, centerY - drawHeight * 0.62, drawWidth * 0.7 * ratio, 5);
    ctx.restore();
  }

  return true;
}

export function renderChapter1WaveTelegraphsSystem(engine: any): void {
  const runtime = engine.chapter1Wave;
  if (!runtime?.enabled) return;
  const ctx = engine.ctx as CanvasRenderingContext2D;
  const scaleX = engine.canvas.width / BASE_WIDTH;
  const scaleY = engine.canvas.height / BASE_HEIGHT;

  for (const telegraph of runtime.telegraphs) {
    const progress = Math.max(0, Math.min(1, telegraph.age / telegraph.life));
    const alpha = 1 - progress;
    ctx.save();
    if (telegraph.kind === "blockZone" || telegraph.kind === "blockZoneCancel") {
      const x = (telegraph.x ?? 0) * scaleX;
      const y = (telegraph.y ?? 0) * scaleY;
      const width = (telegraph.w ?? 100) * scaleX;
      const height = (telegraph.h ?? 100) * scaleY;
      const pulse = 0.45 + Math.sin(performance.now() * 0.018) * 0.25;
      ctx.globalAlpha = telegraph.kind === "blockZoneCancel" ? alpha * 0.6 : 0.32 + pulse;
      ctx.fillStyle = telegraph.kind === "blockZoneCancel" ? "#7f1d1d" : "#ff5b68";
      ctx.fillRect(x - width / 2, y - height / 2, width, height);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#fff7df";
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(x - width / 2, y - height / 2, width, height);
      ctx.setLineDash([]);
      ctx.font = `900 ${Math.max(14, width * 0.12)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff7df";
      ctx.strokeStyle = "#090604";
      ctx.lineWidth = 5;
      const label = telegraph.kind === "blockZoneCancel" ? "취소" : telegraph.label || "중복!";
      ctx.strokeText(label, x, y);
      ctx.fillText(label, x, y);
    } else if (telegraph.x1 !== undefined && telegraph.y1 !== undefined && telegraph.x2 !== undefined && telegraph.y2 !== undefined) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = telegraph.color;
      ctx.lineWidth = telegraph.kind === "warp" ? 4 : 3;
      ctx.setLineDash(telegraph.kind === "warp" ? [6, 5] : [12, 8]);
      ctx.beginPath();
      ctx.moveTo(telegraph.x1 * scaleX, telegraph.y1 * scaleY);
      ctx.lineTo(telegraph.x2 * scaleX, telegraph.y2 * scaleY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
}

export function renderChapter1WaveHudSystem(engine: any): void {
  renderChapter1WaveImpactEffectsSystem(engine);
  if (engine.stage !== 1 || engine.bossActive || !engine.chapter1Wave?.enabled) return;
}
