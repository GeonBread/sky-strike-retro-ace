/**
 * 호반우 챕터 1 적탄 전용 렌더러입니다.
 *
 * 이 파일은 Canvas에 보이는 모양과 장식 효과만 담당합니다.
 * 탄 위치, 속도, 발사 개수, 유도, 분열, 폭발 및 수명은 절대 변경하지 않습니다.
 */

import { Bullet } from "../entities";
import {
  getHobanwooEnemyBulletVisualRadiusSystem,
  type HobanwooEnemyBulletVisualType,
} from "../data/hobanwooEnemyBulletVisualCatalog";

const TAU = Math.PI * 2;
const SIZE_SCALE = 0.9;
const INK = "#090604";
const RED = "#f52233";
const GOLD = "#ffd45e";
const CREAM = "#fff7df";

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function strokePath(
  ctx: CanvasRenderingContext2D,
  fill: string | CanvasGradient | CanvasPattern,
  stroke = INK,
  lineWidth = 5,
): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fill();
  ctx.stroke();
}

function drawCorruptOrb(ctx: CanvasRenderingContext2D, r: number): void {
  const gradient = ctx.createRadialGradient(-r * 0.28, -r * 0.28, r * 0.08, 0, 0, r);
  gradient.addColorStop(0, "#ffd7df");
  gradient.addColorStop(0.18, "#ff6274");
  gradient.addColorStop(0.55, "#7b1f9b");
  gradient.addColorStop(1, "#2b1230");

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  strokePath(ctx, gradient, INK, 5);

  ctx.beginPath();
  ctx.arc(-r * 0.24, -r * 0.28, r * 0.16, 0, TAU);
  ctx.fillStyle = "rgba(255,247,223,.82)";
  ctx.fill();
}

function drawAttendanceStamp(ctx: CanvasRenderingContext2D, r: number, time: number): void {
  ctx.rotate(Math.sin(time * 0.008) * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  strokePath(ctx, "#f8e1b0", INK, 6);

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, TAU);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 4;
  ctx.setLineDash([4, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `1000 ${Math.round(r * 0.58)}px sans-serif`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.fillStyle = RED;
  ctx.strokeText("출석", 0, r * 0.04);
  ctx.fillText("출석", 0, r * 0.04);

  ctx.beginPath();
  ctx.arc(-r * 0.34, -r * 0.34, r * 0.1, 0, TAU);
  ctx.fillStyle = CREAM;
  ctx.fill();
}

function drawNoticePopup(ctx: CanvasRenderingContext2D, r: number): void {
  roundRectPath(ctx, -r * 1.25, -r * 0.9, r * 2.5, r * 1.8, r * 0.24);
  strokePath(ctx, CREAM, INK, 5);

  ctx.fillStyle = "#f7d7a8";
  ctx.fillRect(-r * 1.05, -r * 0.48, r * 1.7, r * 0.18);
  ctx.fillRect(-r * 1.05, -r * 0.08, r * 1.5, r * 0.18);
  ctx.fillRect(-r * 1.05, r * 0.32, r * 1.25, r * 0.18);

  ctx.beginPath();
  ctx.arc(r * 0.72, -r * 0.56, r * 0.34, 0, TAU);
  strokePath(ctx, RED, INK, 4);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `1000 ${Math.round(r * 0.4)}px sans-serif`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.fillStyle = CREAM;
  ctx.strokeText("!", r * 0.72, -r * 0.54);
  ctx.fillText("!", r * 0.72, -r * 0.54);
}

function drawGuideArrow(ctx: CanvasRenderingContext2D, r: number, time: number, phase: number): void {
  const t = time * 0.006 + phase;
  const directions = [
    0,
    Math.PI / 2,
    Math.PI,
    -Math.PI / 2,
    Math.PI / 4,
    -Math.PI / 4,
    (Math.PI * 3) / 4,
    (-Math.PI * 3) / 4,
  ];
  const index = Math.abs(Math.floor(t)) % directions.length;

  ctx.translate(Math.sin(t * 3.1) * r * 0.22, Math.cos(t * 4.3) * r * 0.18);
  ctx.rotate(directions[index] + Math.sin(t * 7) * 0.18);
  ctx.beginPath();
  ctx.moveTo(r * 1.22, 0);
  ctx.lineTo(r * 0.22, -r * 0.7);
  ctx.lineTo(r * 0.22, -r * 0.34);
  ctx.lineTo(-r * 1.05, -r * 0.34);
  ctx.lineTo(-r * 1.05, r * 0.34);
  ctx.lineTo(r * 0.22, r * 0.34);
  ctx.lineTo(r * 0.22, r * 0.7);
  ctx.closePath();
  strokePath(ctx, "#6ee6ff", INK, 5);

  // 기존 내부 노란 삼각형은 제거하고 빨간 중심점만 유지합니다.
  ctx.beginPath();
  ctx.arc(-r * 0.56, 0, r * 0.15, 0, TAU);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawDeadlineMissile(ctx: CanvasRenderingContext2D, r: number, time: number): void {
  ctx.rotate(Math.sin(time * 0.006) * 0.025);
  ctx.beginPath();
  ctx.moveTo(r * 2.65, 0);
  ctx.lineTo(r * 1.18, -r * 0.56);
  ctx.lineTo(r * 1.18, r * 0.56);
  ctx.closePath();
  strokePath(ctx, "#19e6ff", INK, 5);

  roundRectPath(ctx, -r * 2.05, -r * 0.46, r * 3.45, r * 0.92, r * 0.28);
  strokePath(ctx, "#13264f", INK, 5);

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-r * 1.45, side * r * 0.48);
    ctx.lineTo(-r * 2.22, side * r * 1.05);
    ctx.lineTo(-r * 2, side * r * 0.28);
    ctx.closePath();
    strokePath(ctx, "#8a5cff", INK, 4);
  }

  ctx.beginPath();
  ctx.moveTo(-r * 2.2, 0);
  ctx.lineTo(-r * 3.25, -r * 0.34);
  ctx.lineTo(-r * 2.8, 0);
  ctx.lineTo(-r * 3.25, r * 0.34);
  ctx.closePath();
  strokePath(ctx, "#7effff", INK, 4);

  ctx.beginPath();
  ctx.moveTo(r, -r * 0.22);
  ctx.lineTo(r * 1.95, 0);
  ctx.lineTo(r, r * 0.22);
  ctx.closePath();
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.strokeStyle = INK;
  ctx.fillStyle = CREAM;
  ctx.font = `1000 ${Math.round(r * 0.58)}px sans-serif`;
  ctx.strokeText("D-1", -r * 0.38, r * 0.02);
  ctx.fillText("D-1", -r * 0.38, r * 0.02);
}

function drawScannerBeam(ctx: CanvasRenderingContext2D, r: number): void {
  roundRectPath(ctx, -r * 1.45, -r * 0.42, r * 2.9, r * 0.84, r * 0.22);
  strokePath(ctx, "#a2f6ff", INK, 5);
  ctx.fillStyle = "#0ec8ff";
  ctx.fillRect(-r * 1.15, -r * 0.18, r * 2.3, r * 0.36);
  ctx.fillStyle = CREAM;
  ctx.fillRect(-r * 0.98, -r * 0.07, r * 1.96, r * 0.14);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? INK : RED;
    ctx.fillRect(-r * 0.78 + i * r * 0.28, -r * 0.7, r * 0.12, r * 0.38);
  }
}

function drawUnsubmittedMissile(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  ctx.moveTo(r * 2.08, 0);
  ctx.lineTo(r * 0.92, -r * 0.82);
  ctx.lineTo(r * 0.92, r * 0.82);
  ctx.closePath();
  strokePath(ctx, RED, INK, 5);

  roundRectPath(ctx, -r * 1.75, -r * 0.64, r * 2.85, r * 1.28, r * 0.32);
  strokePath(ctx, CREAM, INK, 5);

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, side * r * 0.7);
    ctx.lineTo(-r * 1.48, side * r * 1.08);
    ctx.lineTo(-r * 1.23, side * r * 0.36);
    ctx.closePath();
    strokePath(ctx, RED, INK, 4);
  }

  ctx.beginPath();
  ctx.moveTo(-r * 1.85, 0);
  ctx.lineTo(-r * 3, -r * 0.48);
  ctx.lineTo(-r * 2.42, 0);
  ctx.lineTo(-r * 3, r * 0.48);
  ctx.closePath();
  strokePath(ctx, GOLD, INK, 4);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(r * 0.48)}px sans-serif`;
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.strokeStyle = INK;
  ctx.fillStyle = RED;
  ctx.strokeText("미제출", -r * 0.28, r * 0.02);
  ctx.fillText("미제출", -r * 0.28, r * 0.02);
}

function drawFBomb(ctx: CanvasRenderingContext2D, r: number, time: number, fuseTimer?: number): void {
  const urgent = fuseTimer !== undefined && fuseTimer < 1;
  const blink = urgent && Math.floor(time / 80) % 2 === 0;
  if (blink) {
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.2, 0, TAU);
    ctx.fillStyle = "#ff3344";
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  strokePath(ctx, blink ? "#ff3344" : "#4b264f", INK, 6);
  ctx.beginPath();
  ctx.arc(-5, -6, r * 0.22, 0, TAU);
  ctx.fillStyle = CREAM;
  ctx.fill();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(10, -20);
  ctx.quadraticCurveTo(23, -40, 36, -30);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(39, -30, 6, 0, TAU);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(r * 1.34)}px Georgia`;
  ctx.lineWidth = Math.max(4, r * 0.18);
  ctx.strokeStyle = INK;
  ctx.fillStyle = RED;
  ctx.strokeText("F", 0, r * 0.08);
  ctx.fillText("F", 0, r * 0.08);
}

function drawFFragment(ctx: CanvasRenderingContext2D, r: number, time: number, phase: number): void {
  ctx.rotate(Math.sin(time * 0.012 + phase) * 0.12);
  roundRectPath(ctx, -r * 0.75, -r * 0.9, r * 1.5, r * 1.8, r * 0.22);
  strokePath(ctx, CREAM, INK, 4);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(r * 1.35)}px Georgia`;
  ctx.lineWidth = Math.max(3, r * 0.16);
  ctx.strokeStyle = INK;
  ctx.fillStyle = RED;
  ctx.strokeText("F", 0, r * 0.05);
  ctx.fillText("F", 0, r * 0.05);
}

function drawAtom(ctx: CanvasRenderingContext2D, r: number, time: number, phase: number): void {
  ctx.rotate(time * 0.0018 + phase);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.3, r * 0.44, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = "#69f6ff";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.38, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.42, 0, TAU);
  strokePath(ctx, "#6bff9c", INK, 4);
}

function drawFlask(ctx: CanvasRenderingContext2D, r: number, time: number, phase: number): void {
  ctx.rotate(Math.sin(time * 0.004 + phase) * 0.08);
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 1.25);
  ctx.lineTo(r * 0.35, -r * 1.25);
  ctx.lineTo(r * 0.35, -r * 0.2);
  ctx.quadraticCurveTo(r * 1.05, r * 0.35, r * 0.55, r * 1.05);
  ctx.quadraticCurveTo(0, r * 1.45, -r * 0.55, r * 1.05);
  ctx.quadraticCurveTo(-r * 1.05, r * 0.35, -r * 0.35, -r * 0.2);
  ctx.closePath();
  strokePath(ctx, "#dffaff", INK, 5);
  ctx.beginPath();
  ctx.arc(0, r * 0.55, r * 0.48, 0, TAU);
  ctx.fillStyle = "#6bff9c";
  ctx.fill();
}

function drawDecorativeTrail(
  ctx: CanvasRenderingContext2D,
  bullet: Bullet,
  visualType: HobanwooEnemyBulletVisualType,
  cx: number,
  cy: number,
  r: number,
  time: number,
  phase: number,
): void {
  const angle = Math.atan2(bullet.vy, bullet.vx);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  if (visualType === "deadline_missile" || visualType === "unsubmitted_missile") {
    const mainColor = visualType === "deadline_missile" ? "#7effff" : "#ffbd55";
    for (let i = 0; i < 4; i++) {
      const pulse = 0.65 + 0.35 * Math.sin(time * 0.018 + phase + i * 1.4);
      ctx.globalAlpha = 0.42 - i * 0.07;
      ctx.strokeStyle = i % 2 === 0 ? mainColor : CREAM;
      ctx.lineWidth = Math.max(2, r * (0.24 - i * 0.03));
      ctx.beginPath();
      ctx.moveTo(-r * (2.15 + i * 0.34), 0);
      ctx.lineTo(-r * (3.1 + i * 0.5) * pulse, Math.sin(time * 0.025 + i) * r * 0.15);
      ctx.stroke();
    }
  }

  if (visualType === "attendance_stamp" || visualType === "notice_popup" || visualType === "scanner_beam") {
    const color = visualType === "scanner_beam" ? "#0ec8ff" : RED;
    for (let i = 0; i < 3; i++) {
      const local = time * 0.003 + phase + i * 2.1;
      const x = -r * (1.1 + i * 0.62) + Math.sin(local * 2.4) * r * 0.18;
      const y = Math.cos(local * 3.1) * r * 0.48;
      ctx.globalAlpha = 0.28 + i * 0.08;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, r * (0.1 - i * 0.015)), 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function renderHobanwooEnemyBulletShapeSystem(
  ctx: CanvasRenderingContext2D,
  bullet: Bullet,
  visualType: HobanwooEnemyBulletVisualType,
  cx: number,
  cy: number,
  time = typeof performance !== "undefined" ? performance.now() : 0,
): void {
  const baseRadius = getHobanwooEnemyBulletVisualRadiusSystem(visualType);
  if (baseRadius === null) return;

  const r = baseRadius * SIZE_SCALE;
  const phase = bullet.enemyVisualPhase ?? 0;
  const movementAngle = Math.atan2(bullet.vy, bullet.vx);

  drawDecorativeTrail(ctx, bullet, visualType, cx, cy, r, time, phase);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(movementAngle);

  switch (visualType) {
    case "corrupt_orb":
      drawCorruptOrb(ctx, r);
      break;
    case "attendance_stamp":
      drawAttendanceStamp(ctx, r, time);
      break;
    case "notice_popup":
      drawNoticePopup(ctx, r);
      break;
    case "guide_arrow":
      drawGuideArrow(ctx, r, time, phase);
      break;
    case "deadline_missile":
      drawDeadlineMissile(ctx, r, time);
      break;
    case "scanner_beam":
      drawScannerBeam(ctx, r);
      break;
    case "unsubmitted_missile":
      drawUnsubmittedMissile(ctx, r);
      break;
    case "f_bomb":
      drawFBomb(ctx, r, time, bullet.fuseTimer);
      break;
    case "f_fragment":
      drawFFragment(ctx, r, time, phase);
      break;
    case "atom":
      drawAtom(ctx, r, time, phase);
      break;
    case "flask":
      drawFlask(ctx, r, time, phase);
      break;
  }

  ctx.restore();
}
