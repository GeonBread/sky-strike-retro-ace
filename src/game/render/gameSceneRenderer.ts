/**
 * 게임 전투 장면 렌더러
 *
 * 한 프레임에서 배경, 플레이어, 적, 보스, 탄환, 파티클, 파워업, HUD를 어떤 순서로 그릴지 관리한다.
 * 전투 화면의 전체 렌더링 순서나 화면 구성 요소 배치를 조정할 때 이 파일을 수정한다.
 */

import { SHIP_COLORS } from "./palette";
import type { PlayerWeaponStyle } from "../entities";
import { renderPlayerBulletHitParticleSystem } from "../effects/playerBulletHitEffectSystem";
import { renderChapter1WaveHudSystem, renderChapter1WaveTelegraphsSystem } from "../chapter1/chapter1WaveRenderer";

type GameSceneRenderEngine = any;


type PlayerStylePalette = {
  primary: string;
  secondary: string;
  accent: string;
  body: string;
  label: string;
};

const PLAYER_STYLE_PALETTE: Record<PlayerWeaponStyle, PlayerStylePalette> = {
  science: {
    primary: "#22d3ee",
    secondary: "#34d399",
    accent: "#a7f3d0",
    body: "#e0f2fe",
    label: "이",
  },
  humanities: {
    primary: "#dc2626",
    secondary: "#f8ead0",
    accent: "#facc15",
    body: "#fff7ed",
    label: "문",
  },
  arts: {
    primary: "#a855f7",
    secondary: "#f472b6",
    accent: "#facc15",
    body: "#fae8ff",
    label: "예",
  },
};

function getRuntimePlayerStyle(engine: GameSceneRenderEngine): PlayerWeaponStyle {
  return engine.player?.weaponStyle ?? "science";
}

const HOBANU_PLAYER_IMAGE = new Image();
HOBANU_PLAYER_IMAGE.src = "/assets/player/hobanu_player.png";

const HOBANU_BULLET_BASE = "/assets/bullets/player/";
const HOBANU_BULLET_IMAGE_CACHE = new Map<string, HTMLImageElement>();

function getHobanuBulletImage(sprite: string): HTMLImageElement | null {
  if (!sprite) return null;
  const src = `${HOBANU_BULLET_BASE}${sprite}`;
  let img = HOBANU_BULLET_IMAGE_CACHE.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    HOBANU_BULLET_IMAGE_CACHE.set(src, img);
  }
  return img;
}

function drawHobanuThruster(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, tilt: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const flicker = 1 + Math.sin(t * 0.03 + x) * 0.12;
  ctx.fillStyle = "#ff2d3d";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(-13 * scale, 0);
  ctx.lineTo(0, 52 * scale * flicker);
  ctx.lineTo(13 * scale, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.moveTo(-7 * scale, 4 * scale);
  ctx.lineTo(0, 35 * scale * flicker);
  ctx.lineTo(7 * scale, 4 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function renderMascotPlayerByStyle(engine: GameSceneRenderEngine): void {
  const px = engine.player.x;
  const py = engine.player.y;
  const cx = px + engine.player.width / 2;
  const cy = py + engine.player.height / 2;
  const t = performance.now();
  const bob = Math.sin(t * 0.004) * 3.8;
  const shake = Math.sin(t * 0.012) * 1.15;

  // v26 호반우 이미지는 원본 비율이 커서 그대로 4.6배로 그리면
  // 실제 플레이 화면에서 피격 판정 영역보다 훨씬 크게 보인다.
  // 충돌 판정은 그대로 두고, 화면에 보이는 호반우 이미지만 작게 그린다.
  // 하단 추진기/불꽃은 사용자 요청에 따라 렌더링하지 않는다.
  const drawW = Math.max(54, engine.player.width * 2.85);
  const scale = drawW / 182;
  const x = cx + shake;
  const y = cy + bob;

  engine.ctx.save();
  engine.ctx.translate(x, y);
  engine.ctx.rotate(Math.sin(t * 0.003) * 0.02);

  engine.ctx.shadowColor = "rgba(255,255,255,0.75)";
  engine.ctx.shadowBlur = 10;
  if (HOBANU_PLAYER_IMAGE.complete && HOBANU_PLAYER_IMAGE.naturalWidth > 0) {
    const ratio = HOBANU_PLAYER_IMAGE.naturalHeight / HOBANU_PLAYER_IMAGE.naturalWidth;
    const drawH = drawW * ratio;
    engine.ctx.drawImage(HOBANU_PLAYER_IMAGE, -drawW / 2, -drawH / 2, drawW, drawH);
  }
  engine.ctx.shadowBlur = 0;
  engine.ctx.restore();
}

function drawHobanuMusicBeam(engine: GameSceneRenderEngine, b: any): void {
  const ctx = engine.ctx;
  const startX = engine.player.x + engine.player.width / 2;
  const startY = engine.player.y - 8;
  const big = !!b.playerBeamBig;
  const amp = b.playerBeamAmp ?? (big ? 16 : 11);
  const thickness = b.playerBeamThickness ?? (big ? 16 : 11);
  const core = b.playerBeamCore ?? (big ? 9 : 6);
  const phase = b.playerBeamPhase ?? 0;
  const color = b.color || "#ff5fd2";
  const elapsedMs = performance.now();

  const rawTargets = [...(engine.enemies || [])]
    .filter((e: any) => e.active)
    .map((e: any) => {
      const x = e.x + e.width / 2;
      const y = e.y + e.height / 2;
      return { x, y, d: Math.hypot(x - startX, y - startY) };
    })
    .sort((a: any, c: any) => a.d - c.d)
    .slice(0, Math.min(2, b.playerBeamMaxTargets ?? 2));

  if (engine.boss && engine.boss.active) {
    rawTargets.push({
      x: engine.boss.x + engine.boss.width / 2,
      y: engine.boss.y + engine.boss.height / 2,
      d: 0,
    });
  }

  const targets: Array<{ x: number; y: number; slot: number }> = [];
  for (let i = 0; i < Math.min(2, rawTargets.length); i += 1) {
    targets.push({ x: rawTargets[i].x, y: rawTargets[i].y, slot: i });
  }
  if (targets.length === 0) targets.push({ x: startX, y: 40, slot: 0 });

  for (const target of targets) {
    const points = buildHobanuMusicLaserPath({
      startX,
      startY,
      targetX: target.x,
      targetY: target.y,
      amplitude: amp,
      phase,
      slot: target.slot,
      big,
      elapsedMs,
    });

    drawHobanuMusicLaserDesignOnly({
      ctx,
      points,
      color,
      thickness,
      core,
      phase,
      slot: target.slot,
      big,
      label: b.playerBulletLabel || (big ? "♫" : "♪"),
      elapsedMs,
    });
  }
}

type HobanuMusicLaserPoint = { x: number; y: number };

function buildHobanuMusicLaserPath(params: {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  amplitude: number;
  phase: number;
  slot: number;
  big: boolean;
  elapsedMs: number;
}): HobanuMusicLaserPoint[] {
  const points: HobanuMusicLaserPoint[] = [];

  for (let index = 0; index <= 18; index += 1) {
    const t = index / 18;
    const baseX = params.startX + (params.targetX - params.startX) * t;
    const baseY = params.startY + (params.targetY - params.startY) * t;
    const envelope = Math.sin(t * Math.PI);

    const snake =
      Math.sin(
        t * Math.PI * 3.8 +
          params.elapsedMs * 0.018 +
          params.phase +
          params.slot * 0.8,
      ) *
      params.amplitude *
      envelope;

    const crackle =
      Math.sin(
        t * Math.PI * 11 +
          params.elapsedMs * 0.055 +
          params.phase * 1.5 +
          params.slot * 1.1,
      ) *
      (params.big ? 2.6 : 1.8) *
      envelope;

    const branchSpread =
      (params.slot - 1) * (params.big ? 6 : 4) * envelope;

    points.push({
      x: baseX + snake + crackle + branchSpread,
      y:
        baseY +
        Math.cos(
          t * Math.PI * 4.8 +
            params.elapsedMs * 0.022 +
            params.phase +
            params.slot * 0.5,
        ) *
          (params.big ? 2.4 : 1.6) *
          envelope,
    });
  }

  return points;
}

function drawHobanuMusicLaserDesignOnly(params: {
  ctx: CanvasRenderingContext2D;
  points: readonly HobanuMusicLaserPoint[];
  color: string;
  thickness: number;
  core: number;
  phase: number;
  slot: number;
  big: boolean;
  label: "♪" | "♫" | string;
  elapsedMs: number;
}): void {
  const { ctx, points, color, thickness, core, big, elapsedMs } = params;
  if (points.length < 2) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 원본 SECTION 5의 디자인 계층만 반영:
  // 굵은 검은 외곽선 -> 메인 색상 -> 흰색 코어 -> 얇은 흔들림 하이라이트
  strokeHobanuMusicLaserPath(ctx, points, "#000", thickness);
  strokeHobanuMusicLaserPath(ctx, points, color, core);

  ctx.globalAlpha = 0.92;
  strokeHobanuMusicLaserPath(ctx, points, "#fff", big ? 3.4 : 2.4);

  ctx.globalAlpha = 0.38;
  drawHobanuMusicLaserJitterHighlight(ctx, params);
  ctx.globalAlpha = 1;

  drawHobanuMusicLaserMeasureLines(ctx, points, big);
  drawHobanuMusicLaserNotes(ctx, params);
  drawHobanuMusicLaserStartNode(ctx, points[0], color, big);
  drawHobanuMusicLaserEndNode(ctx, params);

  ctx.restore();
}

function strokeHobanuMusicLaserPath(
  ctx: CanvasRenderingContext2D,
  points: readonly HobanuMusicLaserPoint[],
  color: string,
  width: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.stroke();
}

function drawHobanuMusicLaserJitterHighlight(
  ctx: CanvasRenderingContext2D,
  params: {
    points: readonly HobanuMusicLaserPoint[];
    big: boolean;
    phase: number;
    slot: number;
    elapsedMs: number;
  },
): void {
  const { points, big, phase, slot, elapsedMs } = params;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = big ? 1.5 : 1.1;
  ctx.beginPath();

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const jitterX =
      Math.sin(elapsedMs * 0.11 + phase + slot * 0.7 + index * 0.9) *
      (big ? 2.2 : 1.7);
    const jitterY =
      Math.cos(elapsedMs * 0.13 + phase + slot * 0.6 + index * 0.8) *
      (big ? 1.5 : 1.1);

    if (index === 0) ctx.moveTo(point.x + jitterX, point.y + jitterY);
    else ctx.lineTo(point.x + jitterX, point.y + jitterY);
  }

  ctx.stroke();
}

function drawHobanuMusicLaserMeasureLines(
  ctx: CanvasRenderingContext2D,
  points: readonly HobanuMusicLaserPoint[],
  big: boolean,
): void {
  const indices = big ? [4, 8, 12, 16] : [5, 10, 15];

  for (const rawIndex of indices) {
    const index = Math.min(rawIndex, points.length - 2);
    if (index < 0) continue;

    const point = points[index];
    const next = points[index + 1];
    const angle = Math.atan2(next.y - point.y, next.x - point.x);
    const normalX = -Math.sin(angle);
    const normalY = Math.cos(angle);
    const halfLength = big ? 17 : 13;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = big ? 5 : 4;
    ctx.beginPath();
    ctx.moveTo(point.x - normalX * halfLength, point.y - normalY * halfLength);
    ctx.lineTo(point.x + normalX * halfLength, point.y + normalY * halfLength);
    ctx.stroke();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = big ? 2.5 : 2;
    ctx.beginPath();
    ctx.moveTo(
      point.x - normalX * (halfLength - 2),
      point.y - normalY * (halfLength - 2),
    );
    ctx.lineTo(
      point.x + normalX * (halfLength - 2),
      point.y + normalY * (halfLength - 2),
    );
    ctx.stroke();
  }
}

function drawHobanuMusicLaserNotes(
  ctx: CanvasRenderingContext2D,
  params: {
    points: readonly HobanuMusicLaserPoint[];
    color: string;
    slot: number;
    big: boolean;
  },
): void {
  const { points, color, slot, big } = params;
  const indices = big ? [3, 7, 11, 15] : [4, 8, 12];

  for (let noteIndex = 0; noteIndex < indices.length; noteIndex += 1) {
    const index = Math.min(indices[noteIndex], points.length - 2);
    if (index < 0) continue;

    const point = points[index];
    const next = points[index + 1];
    const angle = Math.atan2(next.y - point.y, next.x - point.x);
    const normalX = -Math.sin(angle);
    const normalY = Math.cos(angle);
    const side = (noteIndex + slot) % 2 === 0 ? 1 : -1;
    const offset = big ? 16 : 12;
    const glyph = noteIndex % 2 === 0 ? "♪" : "♫";

    drawHobanuMusicLaserNoteGlyph({
      ctx,
      x: point.x + normalX * offset * side,
      y: point.y + normalY * offset * side,
      angle: angle + side * 0.25,
      fontSize: big ? 17 : 14,
      color: noteIndex % 2 === 0 ? "#fff" : color,
      flip: side,
      glyph,
    });
  }
}

function drawHobanuMusicLaserStartNode(
  ctx: CanvasRenderingContext2D,
  point: HobanuMusicLaserPoint,
  color: string,
  big: boolean,
): void {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = big ? 6 : 5;
  ctx.beginPath();
  ctx.arc(point.x, point.y, big ? 10 : 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = big ? 4.5 : 3.5;
  ctx.beginPath();
  ctx.arc(point.x, point.y, big ? 5.6 : 4.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHobanuMusicLaserEndNode(
  ctx: CanvasRenderingContext2D,
  params: {
    points: readonly HobanuMusicLaserPoint[];
    color: string;
    slot: number;
    big: boolean;
    label: "♪" | "♫" | string;
    elapsedMs: number;
  },
): void {
  const { points, color, slot, big, label, elapsedMs } = params;
  const end = points[points.length - 1];
  const outerRadius = big ? 10 : 8;
  const innerRadius = big ? 5 : 4;

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = big ? 4.5 : 3.5;
  ctx.beginPath();

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI / 4) * index + elapsedMs * 0.006 + slot * 0.2;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const x = end.x + Math.cos(angle) * radius;
    const y = end.y + Math.sin(angle) * radius;

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawHobanuMusicLaserNoteGlyph({
    ctx,
    x: end.x,
    y: end.y - (big ? 10 : 8),
    angle: 0,
    fontSize: big ? 16 : 13,
    color,
    flip: 1,
    glyph: label === "♫" ? "♫" : "♪",
  });
}

function drawHobanuMusicLaserNoteGlyph(params: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  angle: number;
  fontSize: number;
  color: string;
  flip: number;
  glyph: "♪" | "♫";
}): void {
  const { ctx, x, y, angle, fontSize, color, flip, glyph } = params;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(flip, 1);
  ctx.font = `900 ${Math.max(12, Math.round(fontSize))}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = color;
  ctx.strokeText(glyph, 0, 0);
  ctx.fillText(glyph, 0, 0);
  ctx.restore();
}

function renderPlayerBulletByStyle(
  engine: GameSceneRenderEngine,
  b: any,
  cx: number,
  cy: number,
  w2: number,
  h2: number,
): void {
  if (b.playerBulletKind === "musicBeam") {
    drawHobanuMusicBeam(engine, b);
    return;
  }

  const img = getHobanuBulletImage(b.playerBulletSprite || "");
  const displayW = Math.max(10, b.width);
  const displayH = Math.max(10, b.height);
  const color = b.color || "#ffffff";

  engine.ctx.save();
  // v26-style trail: gear is clean, other projectiles leave a soft trailing oval.
  if (b.playerBulletKind !== "gear" && Array.isArray(b.playerBulletTrail)) {
    const alphaBase = b.playerWeaponStyle === "science" ? 0.12 : 0.22;
    const sx = b.playerWeaponStyle === "science" ? 0.42 : 0.55;
    const sy = b.playerWeaponStyle === "science" ? 0.20 : 0.28;
    for (let i = 0; i < b.playerBulletTrail.length; i++) {
      const p = b.playerBulletTrail[i];
      engine.ctx.globalAlpha = (i / Math.max(1, b.playerBulletTrail.length)) * alphaBase;
      engine.ctx.fillStyle = color;
      engine.ctx.beginPath();
      engine.ctx.ellipse(p.x, p.y + (b.playerBulletSize ?? 16) * 0.12, p.size * sx, p.size * sy, b.playerBulletRotation ?? 0, 0, Math.PI * 2);
      engine.ctx.fill();
    }
    engine.ctx.globalAlpha = 1;
  }

  engine.ctx.translate(cx, cy);
  const fixedKinds = new Set(["formula", "speech", "book", "letter"]);
  const angle = fixedKinds.has(b.playerBulletKind) ? (b.playerBulletRotation ?? 0) : (b.playerBulletRotation ?? Math.atan2(b.vy, b.vx) + Math.PI / 2);
  engine.ctx.rotate(angle);
  engine.ctx.shadowColor = color;
  engine.ctx.shadowBlur = b.playerWeaponStyle === "science" ? 7 : 12;

  if (img && img.complete && img.naturalWidth > 0) {
    engine.ctx.drawImage(img, -displayW / 2, -displayH / 2, displayW, displayH);
  } else {
    engine.ctx.fillStyle = color;
    engine.ctx.beginPath();
    engine.ctx.ellipse(0, 0, Math.max(w2, 4), Math.max(h2, 4), 0, 0, Math.PI * 2);
    engine.ctx.fill();
  }
  engine.ctx.shadowBlur = 0;
  engine.ctx.restore();
}


/**
 * 현재 게임 상태를 기준으로 전투 화면 한 프레임을 그린다.
 * 게임 상태는 변경하지 않고, 캔버스에 그려지는 순서와 표현만 담당한다.
 */
export function renderGameSceneSystem(engine: GameSceneRenderEngine): void {

    engine.ctx.save();
    if (engine.screenShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * engine.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * engine.screenShakeIntensity;
      engine.ctx.translate(shakeX, shakeY);
    }

    engine.renderBackground();
    renderChapter1WaveTelegraphsSystem(engine);

    // Player Rendering
    if (!engine.player.isDead) {
      if (
        engine.player.invulnTimer <= 0 ||
        Math.floor(performance.now() / 80) % 2 === 0
      ) {
        engine.ctx.save();
        if (engine.player.invulnTimer > 0) engine.ctx.globalAlpha = 0.45;

        if (engine.player.color === "vanguard") {
          // 1. Futuristic Purple Glowing Aura Base
          const glowSize = 12 + Math.sin(performance.now() * 0.015) * 5;
          engine.ctx.save();
          engine.ctx.shadowColor = "#d946ef";
          engine.ctx.shadowBlur = glowSize;
          engine.ctx.fillStyle = "rgba(168, 85, 247, 0.25)";
          engine.ctx.beginPath();
          engine.ctx.arc(engine.player.x + engine.player.width / 2, engine.player.y + engine.player.height / 2, 16, 0, Math.PI * 2);
          engine.ctx.fill();
          engine.ctx.restore();

          // 2. Double Segmented Swept Forward Wings
          engine.ctx.fillStyle = "#1e1b4b"; // Heavy obsidian alloy
          engine.ctx.strokeStyle = "#c084fc"; // Bright violet accents
          engine.ctx.lineWidth = 2.0;

          // Left wing
          engine.ctx.beginPath();
          engine.ctx.moveTo(engine.player.x + engine.player.width / 2 - 4, engine.player.y + 12);
          engine.ctx.lineTo(engine.player.x - 10, engine.player.y + 24);
          engine.ctx.lineTo(engine.player.x - 6, engine.player.y + engine.player.height - 2);
          engine.ctx.lineTo(engine.player.x + engine.player.width / 2 - 2, engine.player.y + engine.player.height - 8);
          engine.ctx.closePath();
          engine.ctx.fill();
          engine.ctx.stroke();

          // Right wing
          engine.ctx.beginPath();
          engine.ctx.moveTo(engine.player.x + engine.player.width / 2 + 4, engine.player.y + 12);
          engine.ctx.lineTo(engine.player.x + engine.player.width + 10, engine.player.y + 24);
          engine.ctx.lineTo(engine.player.x + engine.player.width + 6, engine.player.y + engine.player.height - 2);
          engine.ctx.lineTo(engine.player.x + engine.player.width / 2 + 2, engine.player.y + engine.player.height - 8);
          engine.ctx.closePath();
          engine.ctx.fill();
          engine.ctx.stroke();

          // 3. Central Sleek Core Fuselage & Pointer Needle
          engine.ctx.fillStyle = "#312e81"; // Royal military violet-blue core
          engine.ctx.strokeStyle = "#e9d5ff";
          engine.ctx.beginPath();
          engine.ctx.moveTo(engine.player.x + engine.player.width / 2, engine.player.y - 6);
          engine.ctx.lineTo(engine.player.x + engine.player.width - 6, engine.player.y + engine.player.height - 10);
          engine.ctx.lineTo(engine.player.x + engine.player.width / 2, engine.player.y + engine.player.height - 5);
          engine.ctx.lineTo(engine.player.x + 6, engine.player.y + engine.player.height - 10);
          engine.ctx.closePath();
          engine.ctx.fill();
          engine.ctx.stroke();

          // 4. Reactor core gem
          engine.ctx.fillStyle = "#ffffff";
          engine.ctx.beginPath();
          engine.ctx.arc(engine.player.x + engine.player.width / 2, engine.player.y + engine.player.height / 2 + 2, 4, 0, Math.PI * 2);
          engine.ctx.fill();

          // 5. Thruster Engine Outburst (Left & Right micro thruster + center heavy plasma)
          // Micro cyan flames
          engine.ctx.fillStyle = "#22d3ee";
          engine.ctx.fillRect(engine.player.x + 1, engine.player.y + engine.player.height - 4, 3, Math.random() * 8 + 5);
          engine.ctx.fillRect(engine.player.x + engine.player.width - 4, engine.player.y + engine.player.height - 4, 3, Math.random() * 8 + 5);

          // Center massive glowing thrust
          engine.ctx.fillStyle = "#d946ef";
          engine.ctx.fillRect(engine.player.x + engine.player.width / 2 - 3, engine.player.y + engine.player.height - 2, 6, Math.random() * 18 + 12);
          engine.ctx.fillStyle = "#ffffff";
          engine.ctx.fillRect(engine.player.x + engine.player.width / 2 - 1, engine.player.y + engine.player.height - 2, 2, Math.random() * 10 + 4);

        } else {
          renderMascotPlayerByStyle(engine);
        }

        engine.ctx.restore();
      }

      // Draw active player guardian satellites orbiting around player
      if (engine.player.satelliteCount > 0) {
        const px = engine.player.x + engine.player.width / 2;
        const py = engine.player.y + engine.player.height / 2;
        
        engine.ctx.save();
        for (let i = 0; i < engine.player.satelliteCount; i++) {
          const angle = (engine.playerSatelliteAngle || 0) + (i / engine.player.satelliteCount) * Math.PI * 2;
          const sx = px + Math.cos(angle) * 44;
          const sy = py + Math.sin(angle) * 44;

          engine.ctx.save();
          engine.ctx.translate(sx, sy);
          
          // Outer Protective Shield Ring reflecting dynamic satellite health lives (1 ~ 10 HP)
          const hp = (engine.player.satelliteHps && engine.player.satelliteHps[i] !== undefined) ? engine.player.satelliteHps[i] : 10;
          engine.ctx.shadowBlur = 0; // standard focus
          
          // Draw shield circle
          engine.ctx.strokeStyle = hp > 4 ? "rgba(34, 211, 238, 0.55)" : "rgba(239, 68, 68, 0.7)";
          engine.ctx.lineWidth = 1.5;
          // Segmented arc rendering based on HP percentage to feel incredibly dynamic!
          const arcLength = (hp / 10) * Math.PI * 2;
          engine.ctx.beginPath();
          engine.ctx.arc(0, 0, 9.5, -Math.PI / 2, -Math.PI / 2 + arcLength);
          engine.ctx.stroke();

          // Core rotation
          engine.ctx.rotate(performance.now() * 0.0035 + i * 1.5);

          // Neon green outer glow matching the star bullets!
          engine.ctx.shadowColor = "#34d399";
          engine.ctx.shadowBlur = 10;

          // Draw the main companion nucleus
          engine.ctx.fillStyle = "#10b981"; // rich emerald green nucleous
          engine.ctx.beginPath();
          engine.ctx.arc(0, 0, 6, 0, Math.PI * 2);
          engine.ctx.fill();

          engine.ctx.strokeStyle = "#ffffff";
          engine.ctx.lineWidth = 1.25;
          engine.ctx.stroke();

          // High-tech mini solar generator wings
          engine.ctx.fillStyle = "#34d399";
          engine.ctx.fillRect(-8, -1.5, 3, 3);
          engine.ctx.fillRect(5, -1.5, 3, 3);

          // If the satellite is recently damaged, render a bright solid white flash overlay!
          if (engine.playerSatelliteFlashes && engine.playerSatelliteFlashes[i] > 0) {
            engine.ctx.shadowColor = "#ffffff";
            engine.ctx.shadowBlur = 15;
            engine.ctx.fillStyle = "#ffffff";
            engine.ctx.beginPath();
            engine.ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
            engine.ctx.fill();
          }

          engine.ctx.restore();
        }
        engine.ctx.restore();
      }
    }

    // Enemies
    engine.enemies.forEach((e) => {
      if (e.type === "boss") {
        // Draw active lasering grid warning lines and active sheets
        if (e.phase === 14) {
          const cycle = (e.shootTimer || 0) % 2.8;
          const xPositions = e.gridLasersX || [
            engine.canvas.width / 2 - 100,
            engine.canvas.width / 2,
            engine.canvas.width / 2 + 100,
          ];
          const yPositions = e.gridLasersY || [
            engine.canvas.height / 2 - 100,
            engine.canvas.height / 2,
            engine.canvas.height / 2 + 100,
          ];

          engine.ctx.save();
          if (cycle < 1.2) {
            engine.ctx.strokeStyle = "#38bdf8";
            engine.ctx.lineWidth = 2;
            engine.ctx.setLineDash([12, 6]);

            xPositions.forEach((lx) => {
              engine.ctx.beginPath();
              engine.ctx.moveTo(lx, 0);
              engine.ctx.lineTo(lx, engine.canvas.height);
              engine.ctx.stroke();
            });
            yPositions.forEach((ly) => {
              engine.ctx.beginPath();
              engine.ctx.moveTo(0, ly);
              engine.ctx.lineTo(engine.canvas.width, ly);
                engine.ctx.stroke();
            });
          } else if (cycle >= 1.2 && cycle < 1.8) {
            const pulse = 4 + Math.sin(performance.now() * 0.05) * 2.5;
            engine.ctx.setLineDash([]);
            engine.ctx.strokeStyle = "#f43f5e";
            engine.ctx.lineWidth = pulse;
            engine.ctx.shadowColor = "#f43f5e";
            engine.ctx.shadowBlur = 15;
            xPositions.forEach((lx) => {
              engine.ctx.beginPath();
              engine.ctx.moveTo(lx, 0);
              engine.ctx.lineTo(lx, engine.canvas.height);
              engine.ctx.stroke();
            });
            yPositions.forEach((ly) => {
              engine.ctx.beginPath();
              engine.ctx.moveTo(0, ly);
              engine.ctx.lineTo(engine.canvas.width, ly);
              engine.ctx.stroke();
            });
          } else if (cycle >= 1.8 && cycle < 2.5) {
            engine.ctx.setLineDash([]);
            // Core laser columns/rows
            xPositions.forEach((lx) => {
              engine.ctx.shadowColor = "#38bdf8";
              engine.ctx.shadowBlur = 22;
              engine.ctx.strokeStyle = "rgba(56, 189, 248, 0.88)";
              engine.ctx.lineWidth = 36;
              engine.ctx.beginPath();
              engine.ctx.moveTo(lx, 0);
              engine.ctx.lineTo(lx, engine.canvas.height);
              engine.ctx.stroke();

              engine.ctx.strokeStyle = "rgba(167, 139, 250, 0.58)";
              engine.ctx.lineWidth = 18;
              engine.ctx.beginPath();
              engine.ctx.moveTo(lx + Math.sin(performance.now() * 0.02) * 5, 0);
              engine.ctx.lineTo(lx + Math.cos(performance.now() * 0.018) * 5, engine.canvas.height);
              engine.ctx.stroke();

              engine.ctx.strokeStyle = "#ffffff";
              engine.ctx.lineWidth = 14;
              engine.ctx.beginPath();
              engine.ctx.moveTo(lx, 0);
              engine.ctx.lineTo(lx, engine.canvas.height);
              engine.ctx.stroke();
            });

            yPositions.forEach((ly) => {
              engine.ctx.shadowColor = "#38bdf8";
              engine.ctx.shadowBlur = 22;
              engine.ctx.strokeStyle = "rgba(56, 189, 248, 0.88)";
              engine.ctx.lineWidth = 36;
              engine.ctx.beginPath();
              engine.ctx.moveTo(0, ly);
              engine.ctx.lineTo(engine.canvas.width, ly);
              engine.ctx.stroke();

              engine.ctx.strokeStyle = "rgba(167, 139, 250, 0.58)";
              engine.ctx.lineWidth = 18;
              engine.ctx.beginPath();
              engine.ctx.moveTo(0, ly + Math.sin(performance.now() * 0.02) * 5);
              engine.ctx.lineTo(engine.canvas.width, ly + Math.cos(performance.now() * 0.018) * 5);
              engine.ctx.stroke();

              engine.ctx.strokeStyle = "#ffffff";
              engine.ctx.lineWidth = 14;
              engine.ctx.beginPath();
              engine.ctx.moveTo(0, ly);
              engine.ctx.lineTo(engine.canvas.width, ly);
              engine.ctx.stroke();
            });
          }
          engine.ctx.restore();
        }

        if (e.phase === 17) {
          const cycle = (e.shootTimer || 0) % 2.8;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          const laserAngle = e.laserAngle !== undefined ? e.laserAngle : Math.PI / 2;
          
          engine.ctx.save();
          if (cycle < 1.2) {
            // Tracking Phase: Target player with thin cyan-blue tracking guidance
            engine.ctx.strokeStyle = "#38bdf8"; // photon blue warning
            engine.ctx.lineWidth = 1.8;
            engine.ctx.setLineDash([8, 4]);
            engine.ctx.beginPath();
            engine.ctx.moveTo(cx, cy);
            engine.ctx.lineTo(cx + Math.cos(laserAngle) * 3000, cy + Math.sin(laserAngle) * 3000);
            engine.ctx.stroke();

            // Tiny digital targeting indicator
            const targetX = cx + Math.cos(laserAngle) * 120;
            const targetY = cy + Math.sin(laserAngle) * 120;
            engine.ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
            engine.ctx.beginPath();
            engine.ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
            engine.ctx.fill();
          } else if (cycle >= 1.2 && cycle < 1.8) {
            // Locked & Preparing Phase: 0.6 seconds lock
            // Pulsing bright rose red beam to warn the player to jump off the line immediately
            const pulse = 4 + Math.sin(performance.now() * 0.05) * 2.5;
            engine.ctx.strokeStyle = "#f43f5e"; // hot rose red lock warning
            engine.ctx.lineWidth = pulse;
            engine.ctx.shadowColor = "#f43f5e";
            engine.ctx.shadowBlur = 15;
            engine.ctx.beginPath();
            engine.ctx.moveTo(cx, cy);
            engine.ctx.lineTo(cx + Math.cos(laserAngle) * 3000, cy + Math.sin(laserAngle) * 3000);
            engine.ctx.stroke();

            // High-tech converging cyber particle charge circles at core
            const progress = (cycle - 1.2) / 0.6; // 0.0 to 1.0 contraction
            const ringR = 40 * (1 - progress) + 6;
            engine.ctx.strokeStyle = "rgba(244, 63, 94, 0.9)";
            engine.ctx.lineWidth = 2.0;
            engine.ctx.beginPath();
            engine.ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
            engine.ctx.stroke();

            engine.ctx.fillStyle = "#ffffff";
            engine.ctx.beginPath();
            engine.ctx.arc(cx, cy, 6 + progress * 6, 0, Math.PI * 2);
            engine.ctx.fill();
          } else if (cycle >= 1.8 && cycle < 2.5) {
            // Radiant prism sweeping laser explosion
            const length = 3000;
            const hue = (performance.now() * 0.1) % 360;
            engine.ctx.strokeStyle = `hsla(${hue}, 85%, 60%, 0.85)`;
            engine.ctx.lineWidth = 42;
            engine.ctx.shadowColor = `hsla(${hue}, 90%, 50%, 0.9)`;
            engine.ctx.shadowBlur = 25;
            engine.ctx.beginPath();
            engine.ctx.moveTo(cx, cy);
            engine.ctx.lineTo(cx + Math.cos(laserAngle) * length, cy + Math.sin(laserAngle) * length);
            engine.ctx.stroke();

            // Inner super charge white core
            engine.ctx.strokeStyle = "#ffffff";
            engine.ctx.lineWidth = 12;
            engine.ctx.beginPath();
            engine.ctx.moveTo(cx, cy);
            engine.ctx.lineTo(cx + Math.cos(laserAngle) * length, cy + Math.sin(laserAngle) * length);
            engine.ctx.stroke();
          }
          engine.ctx.restore();
        }

        if (false && e.phase === 28) {
          const cycle = (e.shootTimer || 0) % 4.2;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          const laserAngle = e.laserAngle !== undefined ? e.laserAngle : Math.PI / 2;
          const degree20 = Math.PI / 9;
          const offsets = [-degree20 * 2, -degree20, 0, degree20, degree20 * 2];

          engine.ctx.save();
          offsets.forEach((offset, index) => {
            const angle = laserAngle + offset;
            const firing =
              (offset === 0 && cycle >= 1.75 && cycle < 2.15) ||
              (Math.abs(offset) === degree20 && cycle >= 2.45 && cycle < 2.85) ||
              (Math.abs(offset) === degree20 * 2 && cycle >= 3.15 && cycle < 3.55);
            const waiting = cycle < 3.55 && !firing;
            if (!firing && !waiting) return;

            if (firing) {
              const hue = (performance.now() * 0.1 + index * 45) % 360;
              engine.ctx.strokeStyle = `hsla(${hue}, 85%, 60%, 0.88)`;
              engine.ctx.lineWidth = 40;
              engine.ctx.shadowColor = `hsla(${hue}, 90%, 50%, 0.9)`;
              engine.ctx.shadowBlur = 24;
              engine.ctx.setLineDash([]);
            } else {
              const centerBias = offset === 0 ? 1 : 0.65;
              const blink = Math.floor(performance.now() / 110 + index) % 2 === 0;
              engine.ctx.strokeStyle = blink ? `rgba(56, 189, 248, ${0.42 * centerBias})` : `rgba(244, 63, 94, ${0.34 * centerBias})`;
              engine.ctx.lineWidth = offset === 0 ? 2.2 : 1.45;
              engine.ctx.shadowColor = "#38bdf8";
              engine.ctx.shadowBlur = cycle >= 1.35 ? 12 : 5;
              engine.ctx.setLineDash([7, 6]);
            }
            engine.ctx.beginPath();
            engine.ctx.moveTo(cx, cy);
            engine.ctx.lineTo(cx + Math.cos(angle) * 3000, cy + Math.sin(angle) * 3000);
            engine.ctx.stroke();

            if (firing) {
              engine.ctx.strokeStyle = "#ffffff";
              engine.ctx.lineWidth = 11;
              engine.ctx.setLineDash([]);
              engine.ctx.beginPath();
              engine.ctx.moveTo(cx, cy);
              engine.ctx.lineTo(cx + Math.cos(angle) * 3000, cy + Math.sin(angle) * 3000);
              engine.ctx.stroke();
            }
          });
          engine.ctx.restore();
        }

        if (e.phase === 12) {
          const cycle = (e.shootTimer || 0) % 2.8;
          let xPositions: number[] = [];
          let yPositions: number[] = [];
          if (e.leftTurretActive && e.rightTurretActive) {
            xPositions = [
              engine.canvas.width * 0.25,
              engine.canvas.width * 0.5,
              engine.canvas.width * 0.75,
            ];
            yPositions = [
              engine.canvas.height * 0.25,
              engine.canvas.height * 0.5,
              engine.canvas.height * 0.75,
            ];
          } else if (e.leftTurretActive || e.rightTurretActive) {
            xPositions = [engine.canvas.width * 0.5];
            yPositions = [engine.canvas.height * 0.5];
          }

          engine.ctx.save();
          if (cycle < 1.2) {
            engine.ctx.strokeStyle = "#38bdf8";
            engine.ctx.lineWidth = 1.8;
            engine.ctx.setLineDash([10, 8]);

            xPositions.forEach((lx) => {
              engine.ctx.beginPath();
              engine.ctx.moveTo(lx, 0);
              engine.ctx.lineTo(lx, engine.canvas.height);
              engine.ctx.stroke();
            });
            yPositions.forEach((ly) => {
              engine.ctx.beginPath();
              engine.ctx.moveTo(0, ly);
              engine.ctx.lineTo(engine.canvas.width, ly);
                engine.ctx.stroke();
            });
          } else if (cycle >= 1.2 && cycle < 1.8) {
            const pulse = 3.5 + Math.sin(performance.now() * 0.05) * 2.0;
            engine.ctx.setLineDash([]);
            engine.ctx.strokeStyle = "#f43f5e";
            engine.ctx.lineWidth = pulse;
            engine.ctx.shadowColor = "#f43f5e";
            engine.ctx.shadowBlur = 14;
            xPositions.forEach((lx) => {
              engine.ctx.beginPath();
              engine.ctx.moveTo(lx, 0);
              engine.ctx.lineTo(lx, engine.canvas.height);
              engine.ctx.stroke();
            });
            yPositions.forEach((ly) => {
              engine.ctx.beginPath();
              engine.ctx.moveTo(0, ly);
              engine.ctx.lineTo(engine.canvas.width, ly);
              engine.ctx.stroke();
            });
          } else if (cycle >= 1.8 && cycle < 2.5) {
            engine.ctx.setLineDash([]);
            // Core laser columns/rows
            xPositions.forEach((lx) => {
              engine.ctx.shadowColor = "#38bdf8";
              engine.ctx.shadowBlur = 20;
              engine.ctx.strokeStyle = "rgba(56, 189, 248, 0.86)";
              engine.ctx.lineWidth = 28;
              engine.ctx.beginPath();
              engine.ctx.moveTo(lx, 0);
              engine.ctx.lineTo(lx, engine.canvas.height);
              engine.ctx.stroke();

              engine.ctx.strokeStyle = "rgba(167, 139, 250, 0.54)";
              engine.ctx.lineWidth = 14;
              engine.ctx.beginPath();
              engine.ctx.moveTo(lx + Math.sin(performance.now() * 0.02) * 4, 0);
              engine.ctx.lineTo(lx + Math.cos(performance.now() * 0.018) * 4, engine.canvas.height);
              engine.ctx.stroke();

              engine.ctx.strokeStyle = "#ffffff";
              engine.ctx.lineWidth = 10;
              engine.ctx.beginPath();
              engine.ctx.moveTo(lx, 0);
              engine.ctx.lineTo(lx, engine.canvas.height);
              engine.ctx.stroke();
            });

            yPositions.forEach((ly) => {
              engine.ctx.shadowColor = "#38bdf8";
              engine.ctx.shadowBlur = 20;
              engine.ctx.strokeStyle = "rgba(56, 189, 248, 0.86)";
              engine.ctx.lineWidth = 28;
              engine.ctx.beginPath();
              engine.ctx.moveTo(0, ly);
              engine.ctx.lineTo(engine.canvas.width, ly);
              engine.ctx.stroke();

              engine.ctx.strokeStyle = "rgba(167, 139, 250, 0.54)";
              engine.ctx.lineWidth = 14;
              engine.ctx.beginPath();
              engine.ctx.moveTo(0, ly + Math.sin(performance.now() * 0.02) * 4);
              engine.ctx.lineTo(engine.canvas.width, ly + Math.cos(performance.now() * 0.018) * 4);
              engine.ctx.stroke();

              engine.ctx.strokeStyle = "#ffffff";
              engine.ctx.lineWidth = 10;
              engine.ctx.beginPath();
              engine.ctx.moveTo(0, ly);
              engine.ctx.lineTo(engine.canvas.width, ly);
              engine.ctx.stroke();
            });
          }
          engine.ctx.restore();
        }

        engine.ctx.save();
        
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        const w = e.width;
        const h = e.height;
        const w2 = w / 2;
        const h2 = h / 2;

        engine.renderBossJet(e, engine.stage >= 4 ? 4 : engine.bossPhase3Active ? 3 : engine.bossPhase2Active ? 2 : 1);

        // Left wing turret status HUD
        if (e.leftTurretActive) {
          engine.ctx.fillStyle = "#06b6d4";
          engine.ctx.fillRect(e.x - 22, e.y + 15, 8, 12);
          // HP indicator
          engine.ctx.fillStyle = "#22c55e";
          const hpRatio = Math.max(0, e.leftTurretHp || 0) / 45;
          engine.ctx.fillRect(e.x - 24, e.y + 8, 14 * hpRatio, 3);
        } else {
          engine.ctx.fillStyle = "#475569";
          engine.ctx.fillRect(e.x - 18, e.y + 18, 5, 10);
        }

        // Right wing turret status HUD
        if (e.rightTurretActive) {
          engine.ctx.fillStyle = "#06b6d4";
          engine.ctx.fillRect(e.x + e.width + 14, e.y + 15, 8, 12);
          // HP indicator
          engine.ctx.fillStyle = "#22c55e";
          const hpRatio = Math.max(0, e.rightTurretHp || 0) / 45;
          engine.ctx.fillRect(e.x + e.width + 10, e.y + 8, 14 * hpRatio, 3);
        } else {
          engine.ctx.fillStyle = "#475569";
          engine.ctx.fillRect(e.x + e.width + 13, e.y + 18, 5, 10);
        }

        // Groggy/Stun static electric HUD overlay
        if (e.bossStunTimer > 0) {
          engine.ctx.fillStyle = "rgba(234, 179, 8, 0.14)";
          engine.ctx.fillRect(e.x, e.y, e.width, e.height);

          engine.ctx.strokeStyle = "#facc15";
          engine.ctx.lineWidth = 2;
          for (let s = 0; s < 3; s++) {
            engine.ctx.save();
            engine.ctx.beginPath();
            const sx = e.x + Math.random() * e.width;
            engine.ctx.moveTo(sx, e.y);
            engine.ctx.lineTo(sx + (Math.random() - 0.5) * 40, e.y + e.height);
            engine.ctx.stroke();
            engine.ctx.restore();
          }

          engine.ctx.fillStyle = "#facc15";
          engine.ctx.font = 'bold 11px "JetBrains Mono", monospace';
          engine.ctx.textAlign = "center";
          engine.ctx.fillText(
            `GROGGY (${e.bossStunTimer.toFixed(1)}s)`,
            e.x + e.width / 2,
            e.y - 12,
          );
        } else {
          engine.ctx.fillStyle = "#cbd5e1";
          engine.ctx.font = '9px "JetBrains Mono", monospace';
          engine.ctx.textAlign = "center";
          engine.ctx.fillText(`PHASE ${e.phase}`, e.x + e.width / 2, e.y - 10);
        }

        engine.ctx.restore();
      } else {
        engine.renderEnemyShape(e);

        // Render Barricade Walls Lasers
        if (e.active && e.type === "barricade_wall") {
          const partner = engine.enemies.find(
            (other) =>
              other !== e &&
              other.active &&
              other.type === "barricade_wall" &&
              Math.abs(other.y - e.y) < 25 &&
              other.x > e.x,
          );
          if (partner) {
            const by = (e.y + partner.y) / 2 + e.height / 2;

            engine.ctx.save();

            // Outer cyan fuzzy flare glow
            engine.ctx.shadowColor = "#06b6d4";
            engine.ctx.shadowBlur = 15;
            engine.ctx.strokeStyle = "rgba(6, 182, 212, 0.45)";
            engine.ctx.lineWidth = 12;
            engine.ctx.beginPath();
            engine.ctx.moveTo(e.x + e.width, by);
            engine.ctx.lineTo(partner.x, by);
            engine.ctx.stroke();

            // Medium hot bright electric core
            engine.ctx.strokeStyle = "#22d3ee";
            engine.ctx.lineWidth = 6;
            engine.ctx.beginPath();
            engine.ctx.moveTo(e.x + e.width, by);
            engine.ctx.lineTo(partner.x, by);
            engine.ctx.stroke();

            // Inner neon hot white laser core line
            engine.ctx.strokeStyle = "#ffffff";
            engine.ctx.lineWidth = 2;
            engine.ctx.beginPath();
            engine.ctx.moveTo(e.x + e.width, by);
            engine.ctx.lineTo(partner.x, by);
            engine.ctx.stroke();

            engine.ctx.restore();
          }
        }
      }
    });

    engine.renderBossPatternHazards();

    // Bullets
    engine.bullets.forEach((b) => {
      engine.ctx.save();
      if (b.isEnemy) {
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        engine.renderEnemyBulletVisual(b, engine.getBulletVisualType(b), cx, cy);
        engine.ctx.restore();
        return;

        if (b.type === "electric_missile") {
          const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
          engine.ctx.translate(cx, cy);
          engine.ctx.rotate(angle);
          engine.ctx.shadowColor = "#a3e635";
          engine.ctx.shadowBlur = 18;
          engine.ctx.fillStyle = "rgba(163, 230, 53, 0.22)";
          engine.ctx.beginPath();
          engine.ctx.ellipse(0, 4, 14, 28, 0, 0, Math.PI * 2);
          engine.ctx.fill();
          engine.ctx.fillStyle = "#020617";
          engine.ctx.strokeStyle = "#a3e635";
          engine.ctx.lineWidth = 2.4;
          engine.ctx.beginPath();
          engine.ctx.moveTo(0, -24);
          engine.ctx.lineTo(11, -5);
          engine.ctx.lineTo(8, 17);
          engine.ctx.lineTo(3, 10);
          engine.ctx.lineTo(0, 25);
          engine.ctx.lineTo(-3, 10);
          engine.ctx.lineTo(-8, 17);
          engine.ctx.lineTo(-11, -5);
          engine.ctx.closePath();
          engine.ctx.fill();
          engine.ctx.stroke();
          engine.ctx.strokeStyle = "#ffffff";
          engine.ctx.lineWidth = 1.2;
          engine.ctx.beginPath();
          engine.ctx.moveTo(0, -16);
          engine.ctx.lineTo(0, 13);
          engine.ctx.moveTo(-7, -3);
          engine.ctx.lineTo(7, -3);
          engine.ctx.stroke();
        } else if (b.type === "recall_shard") {
          const spin = (performance.now() * 0.011 + cx * 0.01) % (Math.PI * 2);
          const r = Math.max(b.width, b.height) * 1.25;
          engine.ctx.translate(cx, cy);
          engine.ctx.rotate(spin);
          engine.ctx.shadowColor = "#2dd4bf";
          engine.ctx.shadowBlur = 15;
          engine.ctx.fillStyle = "rgba(45, 212, 191, 0.25)";
          engine.ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const rr = i % 2 === 0 ? r : r * 0.46;
            engine.ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          engine.ctx.closePath();
          engine.ctx.fill();
          engine.ctx.strokeStyle = "#ffffff";
          engine.ctx.lineWidth = 1.5;
          engine.ctx.stroke();
          engine.ctx.fillStyle = b.color;
          engine.ctx.beginPath();
          engine.ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
          engine.ctx.fill();
        } else if (b.type === "void_mine") {
          const spin = (performance.now() * 0.006 + (b.age || 0) * 3) % (Math.PI * 2);
          const r = Math.max(b.width, b.height) * 0.95;
          engine.ctx.translate(cx, cy);
          engine.ctx.rotate(spin);
          engine.ctx.shadowColor = "#14b8a6";
          engine.ctx.shadowBlur = 17;
          engine.ctx.fillStyle = "#042f2e";
          engine.ctx.strokeStyle = "#5eead4";
          engine.ctx.lineWidth = 2.2;
          engine.ctx.beginPath();
          engine.ctx.moveTo(0, -r * 1.25);
          engine.ctx.lineTo(r * 0.42, -r * 0.42);
          engine.ctx.lineTo(r * 1.25, 0);
          engine.ctx.lineTo(r * 0.42, r * 0.42);
          engine.ctx.lineTo(0, r * 1.25);
          engine.ctx.lineTo(-r * 0.42, r * 0.42);
          engine.ctx.lineTo(-r * 1.25, 0);
          engine.ctx.lineTo(-r * 0.42, -r * 0.42);
          engine.ctx.closePath();
          engine.ctx.fill();
          engine.ctx.stroke();
          engine.ctx.strokeStyle = "#ccfbf1";
          engine.ctx.lineWidth = 1.1;
          engine.ctx.beginPath();
          engine.ctx.moveTo(-r * 0.65, 0);
          engine.ctx.lineTo(r * 0.65, 0);
          engine.ctx.moveTo(0, -r * 0.65);
          engine.ctx.lineTo(0, r * 0.65);
          engine.ctx.stroke();
        } else if (b.type === "tail_rocket") {
          const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
          engine.ctx.translate(cx, cy);
          engine.ctx.rotate(angle);
          engine.ctx.shadowColor = b.color || "#38bdf8";
          engine.ctx.shadowBlur = 16;
          engine.ctx.fillStyle = "rgba(14, 165, 233, 0.22)";
          engine.ctx.beginPath();
          engine.ctx.ellipse(0, 8, 12, 30, 0, 0, Math.PI * 2);
          engine.ctx.fill();
          engine.ctx.fillStyle = "#082f49";
          engine.ctx.strokeStyle = b.color || "#38bdf8";
          engine.ctx.lineWidth = 2.1;
          engine.ctx.beginPath();
          engine.ctx.moveTo(0, -23);
          engine.ctx.lineTo(9, -2);
          engine.ctx.lineTo(7, 18);
          engine.ctx.lineTo(0, 12);
          engine.ctx.lineTo(-7, 18);
          engine.ctx.lineTo(-9, -2);
          engine.ctx.closePath();
          engine.ctx.fill();
          engine.ctx.stroke();
          engine.ctx.fillStyle = "#ffffff";
          engine.ctx.fillRect(-2.5, -8, 5, 12);
        } else if (b.type === "needle") {
          // 1. 바늘/쐐기형 탄알 (Needle Bullet): 비행기 디자인을 탈피한 길고 날카로운 유선형 에너지 쐐기/레이저 니들 형태
          const angle = Math.atan2(b.vy, b.vx);
          const length = Math.max(b.width, b.height) * 3.2;
          const thickness = Math.min(b.width, b.height) * 0.75;

          engine.ctx.translate(cx, cy);
          engine.ctx.rotate(angle);

          // Sleek streamlined outer glow diamond/wedge (no indentation to prevent "ship" look)
          engine.ctx.fillStyle = b.color;
          engine.ctx.globalAlpha = 0.3;
          engine.ctx.beginPath();
          engine.ctx.moveTo(length * 0.55, 0); // extra sharp leading tip
          engine.ctx.lineTo(-length * 0.15, -thickness * 1.5); // wide glow hump
          engine.ctx.lineTo(-length * 0.55, 0); // long fading needle trail
          engine.ctx.lineTo(-length * 0.15, thickness * 1.5);
          engine.ctx.closePath();
          engine.ctx.fill();

          // Sharp glowing core outline (with vibrant boundary line)
          engine.ctx.strokeStyle = b.color;
          engine.ctx.lineWidth = 2.0;
          engine.ctx.globalAlpha = 0.95;
          engine.ctx.beginPath();
          engine.ctx.moveTo(length * 0.5, 0);
          engine.ctx.lineTo(-length * 0.1, -thickness * 0.7);
          engine.ctx.lineTo(-length * 0.5, 0);
          engine.ctx.lineTo(-length * 0.1, thickness * 0.7);
          engine.ctx.closePath();
          engine.ctx.stroke();

          // Super bright hot white core line for laser look
          engine.ctx.fillStyle = "#ffffff";
          engine.ctx.globalAlpha = 1.0;
          engine.ctx.beginPath();
          engine.ctx.moveTo(length * 0.42, 0);
          engine.ctx.lineTo(-length * 0.05, -thickness * 0.3);
          engine.ctx.lineTo(-length * 0.42, 0);
          engine.ctx.lineTo(-length * 0.05, thickness * 0.3);
          engine.ctx.closePath();
          engine.ctx.fill();

        } else if (b.type === "pellet") {
          // 2. 소형 구체 탄알 (Standard Pellet): 밝고 깔끔한 동그란 구체
          const r = Math.max(b.width, b.height) * 1.35;
          const grad = engine.ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.35, b.color);
          grad.addColorStop(1.0, "transparent");

          engine.ctx.fillStyle = grad;
          engine.ctx.beginPath();
          engine.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          engine.ctx.fill();

          // Delicate crisp outer neon ring
          engine.ctx.strokeStyle = b.color;
          engine.ctx.lineWidth = 1.25;
          engine.ctx.globalAlpha = 0.85;
          engine.ctx.beginPath();
          engine.ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
          engine.ctx.stroke();

        } else if (b.type === "ring") {
          // 3. 환형/도넛 탄알 (Ring Bullet): 가운데가 뻥 뚫려 있고 테두리만 빛나는 형태
          const r = Math.max(b.width, b.height) * 1.55;

          // Soft ambient overlay for ring texture
          engine.ctx.fillStyle = b.color;
          engine.ctx.globalAlpha = 0.1;
          engine.ctx.beginPath();
          engine.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          engine.ctx.fill();
          engine.ctx.globalAlpha = 1.0;

          // Bright concentric neon glow rings
          const rGrad = engine.ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
          rGrad.addColorStop(0, "transparent");
          rGrad.addColorStop(0.55, b.color);
          rGrad.addColorStop(0.82, "#ffffff"); // glowing neon boundary
          rGrad.addColorStop(1.0, b.color);

          engine.ctx.strokeStyle = rGrad;
          engine.ctx.lineWidth = 5.5;
          engine.ctx.beginPath();
          engine.ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
          engine.ctx.stroke();

          // Concentric sharp white accent ring
          engine.ctx.strokeStyle = "#ffffff";
          engine.ctx.lineWidth = 1.5;
          engine.ctx.beginPath();
          engine.ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
          engine.ctx.stroke();

        } else if (b.type === "crystal" || b.type === "ricochet") {
          // 4. 결정/수정형 탄알 (Crystal Shard): 마름모꼴/날카로운 보석형 탄알
          const angle = (performance.now() * 0.0035 + (cx * 0.01)) % (Math.PI * 2);
          const r = Math.max(b.width, b.height) * 1.5;

          engine.ctx.translate(cx, cy);
          engine.ctx.rotate(angle);

          // Deep outer glow shard
          engine.ctx.fillStyle = b.color;
          engine.ctx.globalAlpha = 0.28;
          engine.ctx.beginPath();
          engine.ctx.moveTo(0, -r * 1.15);
          engine.ctx.lineTo(r * 0.72, 0);
          engine.ctx.lineTo(0, r * 1.15);
          engine.ctx.lineTo(-r * 0.72, 0);
          engine.ctx.closePath();
          engine.ctx.fill();
          engine.ctx.globalAlpha = 1.0;

          // Neon crisp crystal boundary
          engine.ctx.strokeStyle = b.color;
          engine.ctx.lineWidth = 2.2;
          engine.ctx.beginPath();
          engine.ctx.moveTo(0, -r);
          engine.ctx.lineTo(r * 0.65, 0);
          engine.ctx.lineTo(0, r);
          engine.ctx.lineTo(-r * 0.65, 0);
          engine.ctx.closePath();
          engine.ctx.stroke();

          // Facet dividing grid lines
          engine.ctx.strokeStyle = "#ffffff";
          engine.ctx.lineWidth = 1.0;
          engine.ctx.globalAlpha = 0.85;
          engine.ctx.beginPath();
          engine.ctx.moveTo(0, -r);
          engine.ctx.lineTo(0, r);
          engine.ctx.moveTo(-r * 0.65, 0);
          engine.ctx.lineTo(r * 0.65, 0);
          engine.ctx.stroke();

          // Super bright core sphere
          engine.ctx.fillStyle = "#ffffff";
          engine.ctx.beginPath();
          engine.ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
          engine.ctx.fill();

        } else if (b.type === "gravity_singularity" || b.type === "gravity_ball") {
          // 5. 중력/블랙홀 탄알 (Vortex Orb): 일렁이며 소용돌이치는 구체
          const r = Math.max(b.width, b.height) * 1.6;
          const grad = engine.ctx.createRadialGradient(cx, cy, r * 0.18, cx, cy, r);
          grad.addColorStop(0, "#090514"); // Dense jet black core
          grad.addColorStop(0.5, "#180c35"); // Swirling deep violet haze
          grad.addColorStop(0.85, b.color); // Glowing border
          grad.addColorStop(1.0, "transparent");

          engine.ctx.fillStyle = grad;
          engine.ctx.beginPath();
          engine.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          engine.ctx.fill();

          // Animated spiral whirlpool rays
          engine.ctx.strokeStyle = "#f472b6"; // bright neon pink swirls
          engine.ctx.lineWidth = 2.0;
          engine.ctx.globalAlpha = 0.85;
          const spin = (performance.now() * 0.008) % (Math.PI * 2);
          engine.ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const startAngle = spin + (i * Math.PI) / 2;
            engine.ctx.arc(cx, cy, r * 0.52, startAngle, startAngle + 1.4);
          }
          engine.ctx.stroke();

        } else if (b.type === "dash_paint_bullet" || b.type === "dilation_bullet") {
          // 6. 시간 왜곡/페인트탄 (Glitch Bullet): 지지직거리는 사각형 노이즈 격자
          const w = b.width * 1.5;
          const h = b.height * 1.5;

          const isStop = (b.type === "dilation_bullet" && b.dilationState === "frozen");
          const offsetAmount = isStop ? 4.5 : 2.0;

          let gx = cx;
          let gy = cy;
          if (Math.random() < 0.35) {
            gx += (Math.random() - 0.5) * offsetAmount;
            gy += (Math.random() - 0.5) * offsetAmount;
          }

          // Side cyan/red alignment mismatch shadow
          engine.ctx.fillStyle = "#22d3ee";
          engine.ctx.globalAlpha = 0.7;
          engine.ctx.fillRect(gx - w / 2 - 3, gy - h / 2 + 1, w, h);

          engine.ctx.fillStyle = "#ef4444";
          engine.ctx.globalAlpha = 0.6;
          engine.ctx.fillRect(gx - w / 2 + 2, gy - h / 2 - 2, w, h);

          // Principal orange/yellow raster grid body
          engine.ctx.fillStyle = b.color;
          engine.ctx.globalAlpha = 0.95;
          engine.ctx.fillRect(gx - w / 2, gy - h / 2, w, h);

          // White noise core box
          engine.ctx.fillStyle = "#ffffff";
          engine.ctx.fillRect(gx - w * 0.22, gy - h * 0.22, w * 0.44, h * 0.44);

          // Transient digital cathode glitch sparks
          if (Math.random() < 0.2) {
            engine.ctx.strokeStyle = "#eab308";
            engine.ctx.lineWidth = 1.25;
            engine.ctx.beginPath();
            engine.ctx.moveTo(gx - w * 1.3, gy + (Math.random() - 0.5) * h * 1.2);
            engine.ctx.lineTo(gx + w * 1.3, gy + (Math.random() - 0.5) * h * 1.2);
            engine.ctx.stroke();
          }

        } else if (b.type === "homing") {
          // Rotating homing style
          const r = Math.max(b.width, b.height) * 1.55;
          const grad = engine.ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.3, b.color);
          grad.addColorStop(1.0, "transparent");

          engine.ctx.fillStyle = grad;
          engine.ctx.beginPath();
          engine.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          engine.ctx.fill();

          engine.ctx.strokeStyle = b.color;
          engine.ctx.lineWidth = 1.5;
          engine.ctx.globalAlpha = 0.85;
          const spin = (performance.now() * 0.005) % (Math.PI * 2);
          engine.ctx.beginPath();
          engine.ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
          engine.ctx.stroke();

          engine.ctx.save();
          engine.ctx.translate(cx, cy);
          engine.ctx.rotate(spin);
          engine.ctx.fillStyle = "#ffffff";
          engine.ctx.beginPath();
          engine.ctx.arc(0, -r * 0.6, 2.5, 0, Math.PI * 2);
          engine.ctx.arc(0, r * 0.6, 2.5, 0, Math.PI * 2);
          engine.ctx.fill();
          engine.ctx.restore();

        } else {
          // Default fallbacks draw standard radial glow circles
          const r = Math.max(b.width, b.height) * 1.55;
          const grad = engine.ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.3, b.color);
          grad.addColorStop(1.0, "transparent");

          engine.ctx.fillStyle = grad;
          engine.ctx.beginPath();
          engine.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          engine.ctx.fill();

          // Subtle inner highlight ring
          engine.ctx.strokeStyle = "#ffffff";
          engine.ctx.lineWidth = 1;
          engine.ctx.globalAlpha = 0.55;
          engine.ctx.beginPath();
          engine.ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
          engine.ctx.stroke();
        }
      } else {
        // GORGEOUS, FLASHY SCI-FI PLAYER PROJECTILES
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const w2 = b.width / 2;
        const h2 = b.height / 2;
        
        engine.ctx.save();

        if (b.type === "satellite_bullet") {
          const r = Math.max(b.width, b.height) * 1.5;
          const spin = (performance.now() * 0.016) % (Math.PI * 2);

          engine.ctx.translate(cx, cy);
          engine.ctx.rotate(spin);

          if (b.companionIndex === 0) {
            // Unique companion 0 bullet: Spinning curved neon emerald star with glowing particle aura
            engine.ctx.shadowColor = "#10b981";
            engine.ctx.shadowBlur = 12;
            engine.ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
            engine.ctx.beginPath();
            engine.ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
            engine.ctx.fill();

            engine.ctx.fillStyle = "#ffffff"; // hot white center core
            engine.ctx.strokeStyle = "#34d399"; // bright emerald outline
            engine.ctx.lineWidth = 2.0;
            engine.ctx.beginPath();
            engine.ctx.moveTo(0, -r);
            engine.ctx.quadraticCurveTo(0, 0, r, 0);
            engine.ctx.quadraticCurveTo(0, 0, 0, r);
            engine.ctx.quadraticCurveTo(0, 0, -r, 0);
            engine.ctx.quadraticCurveTo(0, 0, 0, -r);
            engine.ctx.closePath();
            engine.ctx.fill();
            engine.ctx.stroke();

          } else if (b.companionIndex === 1) {
            // Unique companion 1 bullet: Dual slashing crescent-wing blades (Violet)
            engine.ctx.shadowColor = "#c084fc";
            engine.ctx.shadowBlur = 12;
            engine.ctx.fillStyle = "rgba(168, 85, 247, 0.25)";
            engine.ctx.beginPath();
            engine.ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
            engine.ctx.fill();

            engine.ctx.fillStyle = "#ffffff";
            engine.ctx.strokeStyle = "#a855f7";
            engine.ctx.lineWidth = 2.2;
            engine.ctx.beginPath();
            engine.ctx.moveTo(-r, 0);
            engine.ctx.quadraticCurveTo(0, -r * 0.5, r, 0);
            engine.ctx.quadraticCurveTo(0, r * 0.5, -r, 0);
            engine.ctx.closePath();
            engine.ctx.fill();
            engine.ctx.stroke();

            // inner core ring
            engine.ctx.strokeStyle = "#ffffff";
            engine.ctx.lineWidth = 1.0;
            engine.ctx.beginPath();
            engine.ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
            engine.ctx.stroke();

          } else if (b.companionIndex === 2) {
            // Unique companion 2 bullet: Sharp dual diamond spearheads (Cyan)
            engine.ctx.shadowColor = "#06b6d4";
            engine.ctx.shadowBlur = 10;
            engine.ctx.fillStyle = "rgba(34, 211, 238, 0.25)";
            engine.ctx.beginPath();
            engine.ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
            engine.ctx.fill();

            engine.ctx.fillStyle = "#ffffff";
            engine.ctx.strokeStyle = "#22d3ee";
            engine.ctx.lineWidth = 2.0;
            engine.ctx.beginPath();
            engine.ctx.moveTo(0, -r * 1.2);
            engine.ctx.lineTo(r * 0.6, 0);
            engine.ctx.lineTo(0, r * 0.8);
            engine.ctx.lineTo(-r * 0.6, 0);
            engine.ctx.closePath();
            engine.ctx.fill();
            engine.ctx.stroke();

          } else {
            // Unique companion 3 bullet: Heavy Solar Fire ball with orbit rings (Orange)
            engine.ctx.shadowColor = "#f97316";
            engine.ctx.shadowBlur = 14;
            engine.ctx.fillStyle = "rgba(249, 115, 22, 0.25)";
            engine.ctx.beginPath();
            engine.ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
            engine.ctx.fill();

            engine.ctx.strokeStyle = "#f97316";
            engine.ctx.lineWidth = 1.5;
            engine.ctx.beginPath();
            engine.ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
            engine.ctx.stroke();

            engine.ctx.fillStyle = "#ffffff";
            engine.ctx.beginPath();
            engine.ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
            engine.ctx.fill();
          }

          engine.ctx.restore();
          engine.ctx.restore(); // balance parent save
          return;
        }
        
        if (b.playerWeaponStyle) {
          renderPlayerBulletByStyle(engine, b, cx, cy, w2, h2);
          engine.ctx.restore();
          engine.ctx.restore();
          return;
        }
        
        // 1. Sleek energy trail behind bullet
        engine.ctx.globalAlpha = 0.22;
        engine.ctx.fillStyle = b.color;
        engine.ctx.beginPath();
        engine.ctx.moveTo(cx - w2 * 1.6, cy + h2 * 0.5);
        engine.ctx.lineTo(cx, cy - h2 * 3.0); // stretched forwards
        engine.ctx.lineTo(cx + w2 * 1.6, cy + h2 * 0.5);
        engine.ctx.lineTo(cx, cy + h2 * 3.5); // stretched backwards
        engine.ctx.closePath();
        engine.ctx.fill();
        
        // 2. Neon Outer Glow Shield/Halo
        engine.ctx.shadowColor = b.color;
        engine.ctx.shadowBlur = b.damage >= 1.5 ? 20 : 12;
        engine.ctx.fillStyle = b.color;
        engine.ctx.globalAlpha = 0.82;
        
        engine.ctx.beginPath();
        if (b.vx !== 0) {
          // Arrow crescent for diagonal bullets
          const tiltAngle = Math.atan2(b.vy, b.vx);
          engine.ctx.translate(cx, cy);
          engine.ctx.rotate(tiltAngle);
          
          engine.ctx.moveTo(h2 * 1.4, 0);
          engine.ctx.lineTo(-h2 * 1.2, -w2 * 1.3);
          engine.ctx.lineTo(-h2 * 0.4, 0);
          engine.ctx.lineTo(-h2 * 1.2, w2 * 1.3);
          engine.ctx.closePath();
          engine.ctx.fill();
        } else {
          // Elongated diamond core for straight forward power bullets
          engine.ctx.moveTo(cx, cy - h2 * 1.6);
          engine.ctx.lineTo(cx + w2 * 1.3, cy);
          engine.ctx.lineTo(cx, cy + h2 * 1.6);
          engine.ctx.lineTo(cx - w2 * 1.3, cy);
          engine.ctx.closePath();
          engine.ctx.fill();
        }
        
        // 3. Ultra Bright Hot White core
        engine.ctx.shadowBlur = 0; // reset for sharp focus
        engine.ctx.fillStyle = "#ffffff";
        engine.ctx.globalAlpha = 1.0;
        engine.ctx.beginPath();
        if (b.vx !== 0) {
          engine.ctx.moveTo(h2 * 0.7, 0);
          engine.ctx.lineTo(-h2 * 0.6, -w2 * 0.6);
          engine.ctx.lineTo(-h2 * 0.2, 0);
          engine.ctx.lineTo(-h2 * 0.6, w2 * 0.6);
        } else {
          engine.ctx.moveTo(cx, cy - h2 * 0.95);
          engine.ctx.lineTo(cx + w2 * 0.7, cy);
          engine.ctx.lineTo(cx, cy + h2 * 0.95);
          engine.ctx.lineTo(cx - w2 * 0.7, cy);
        }
        engine.ctx.closePath();
        engine.ctx.fill();
        
        engine.ctx.restore();
      }
      engine.ctx.restore();
    });

    // Render Squid Ink Smoke Clouds
    engine.ctx.save();
    engine.inkClouds.forEach((c) => {
      const cx = c.x;
      const cy = c.y;
      const r = c.radius;

      const grad = engine.ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
      grad.addColorStop(0, "rgba(15, 12, 30, 0.94)"); // extremely dense dark core
      grad.addColorStop(0.55, "rgba(24, 18, 50, 0.75)"); // hazy deep purple-ink smoke
      grad.addColorStop(1.0, "rgba(15, 12, 30, 0.0)"); // soft vapor fringe

      engine.ctx.fillStyle = grad;
      engine.ctx.beginPath();
      engine.ctx.arc(cx, cy, r, 0, Math.PI * 2);
      engine.ctx.fill();
    });
    engine.ctx.restore();

    // Particles
    engine.particles.forEach((p) => {
      if (p.effectKind === "playerBulletHit") {
        renderPlayerBulletHitParticleSystem(engine.ctx, p);
        return;
      }

      engine.ctx.fillStyle = p.color;
      engine.ctx.globalAlpha = p.life / p.maxLife;
      engine.ctx.fillRect(p.x, p.y, p.size, p.size);
      engine.ctx.globalAlpha = 1.0;
    });

    if (engine.bombActive) {
      engine.ctx.save();
      engine.ctx.strokeStyle = `rgba(168, 85, 247, ${1 - engine.bombRadius / engine.bombMaxRadius})`;
      engine.ctx.lineWidth = 18;
      engine.ctx.beginPath();
      engine.ctx.arc(
        engine.player.x + engine.player.width / 2,
        engine.player.y + engine.player.height / 2,
        engine.bombRadius,
        0,
        Math.PI * 2,
      );
      engine.ctx.stroke();
      engine.ctx.restore();
    }

    // Powerups
    engine.powerups.forEach((p) => {
      engine.ctx.save();
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;

      if (p.type === "power") {
        // Golden Glowing Hexagon/Diamond (Bullet Upgrade)
        const rot = performance.now() * 0.0035;
        engine.ctx.translate(cx, cy);
        engine.ctx.rotate(rot);

        engine.ctx.shadowColor = "#fbbf24";
        engine.ctx.shadowBlur = 20;

        engine.ctx.fillStyle = "#fbbf24";
        engine.ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          engine.ctx.lineTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
        }
        engine.ctx.closePath();
        engine.ctx.fill();

        engine.ctx.strokeStyle = "#ffffff";
        engine.ctx.lineWidth = 2.5;
        engine.ctx.stroke();

        // Counter-rotated glowing bolt symbol
        engine.ctx.rotate(-rot * 2);
        engine.ctx.fillStyle = "#b45309";
        engine.ctx.font = "900 13px sans-serif";
        engine.ctx.textAlign = "center";
        engine.ctx.textBaseline = "middle";
        engine.ctx.fillText("*", 0, 0);
      } else if (p.type === "heal") {
        // Emerald Green Pulsing Shield (Heal)
        const pulse = Math.sin(performance.now() * 0.012) * 3 + 13;

        // Outer glowing ripple rings
        engine.ctx.strokeStyle = "#34d399";
        engine.ctx.globalAlpha = 0.5;
        engine.ctx.lineWidth = 2;
        engine.ctx.beginPath();
        engine.ctx.arc(cx, cy, pulse + 6, 0, Math.PI * 2);
        engine.ctx.stroke();

        // Saturated medical capsules
        engine.ctx.globalAlpha = 1.0;
        engine.ctx.shadowColor = "#10b981";
        engine.ctx.shadowBlur = 20;
        engine.ctx.fillStyle = "#059669";

        engine.ctx.beginPath();
        engine.ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        engine.ctx.fill();

        engine.ctx.strokeStyle = "#6ee7b7";
        engine.ctx.lineWidth = 2;
        engine.ctx.stroke();

        // Bold white medical cross
        engine.ctx.fillStyle = "#ffffff";
        const size = 11;
        const thickness = 3.5;
        engine.ctx.fillRect(cx - thickness / 2, cy - size / 2, thickness, size);
        engine.ctx.fillRect(cx - size / 2, cy - thickness / 2, size, thickness);
      } else if (p.type === "satellite") {
        // Deep purple orbiting satellite core
        engine.ctx.translate(cx, cy);
        engine.ctx.rotate(performance.now() * 0.002);

        engine.ctx.shadowColor = "#c084fc";
        engine.ctx.shadowBlur = 22;

        // Draw central purple core
        engine.ctx.fillStyle = "#a855f7";
        engine.ctx.beginPath();
        engine.ctx.arc(0, 0, 9, 0, Math.PI * 2);
        engine.ctx.fill();

        engine.ctx.strokeStyle = "#e9d5ff";
        engine.ctx.lineWidth = 1.8;
        engine.ctx.stroke();

        // Draw horizontal solar wings
        engine.ctx.fillStyle = "#38bdf8"; // high tech cyber blue wings
        engine.ctx.fillRect(-15, -2.5, 7, 5);
        engine.ctx.fillRect(8, -2.5, 7, 5);

        engine.ctx.strokeStyle = "#ffffff";
        engine.ctx.lineWidth = 0.8;
        engine.ctx.strokeRect(-15, -2.5, 7, 5);
        engine.ctx.strokeRect(8, -2.5, 7, 5);

        // Draw orbiting rings
        engine.ctx.strokeStyle = "rgba(192, 132, 252, 0.75)";
        engine.ctx.lineWidth = 1.2;
        engine.ctx.beginPath();
        engine.ctx.ellipse(0, 0, 18, 6, Math.PI / 6, 0, Math.PI * 2);
        engine.ctx.stroke();
      }
      engine.ctx.restore();
    });

    // --- DRAW DEBRIS BARRICADES ---
    engine.debrisCovers.forEach((d) => {
      if (!d.active) return;
      engine.ctx.save();
      
      // Futuristic mechanical warning steel plate design
      engine.ctx.shadowColor = "#64748b";
      engine.ctx.shadowBlur = 10;
      engine.ctx.fillStyle = "#334155";
      engine.ctx.fillRect(d.x, d.y, d.width, d.height);

      // Warning stripes on barricade
      engine.ctx.fillStyle = "#eab308";
      engine.ctx.globalAlpha = 0.25;
      for (let offset = 0; offset < d.width; offset += 16) {
        engine.ctx.beginPath();
        engine.ctx.moveTo(d.x + offset, d.y + d.height);
        engine.ctx.lineTo(d.x + offset + 8, d.y);
        engine.ctx.lineTo(d.x + offset + 12, d.y);
        engine.ctx.lineTo(d.x + offset + 4, d.y + d.height);
        engine.ctx.closePath();
        engine.ctx.fill();
      }
      engine.ctx.globalAlpha = 1.0;

      // HP bar line on index barrier
      const ratio = d.hp / d.maxHp;
      engine.ctx.fillStyle = ratio > 0.4 ? "#22c55e" : "#ef4444";
      engine.ctx.fillRect(d.x, d.y + d.height - 4, d.width * ratio, 4);

      engine.ctx.strokeStyle = "#475569";
      engine.ctx.lineWidth = 1.5;
      engine.ctx.strokeRect(d.x, d.y, d.width, d.height);

      engine.ctx.restore();
    });

    // --- DRAW METEORS ---
    engine.meteors.forEach((m) => {
      if (!m.active) return;
      engine.ctx.save();
      engine.ctx.translate(m.x, m.y);
      engine.ctx.rotate(m.rotation);

      // Raw dark organic asteroid shape
      engine.ctx.shadowColor = "#334155";
      engine.ctx.shadowBlur = 8;
      engine.ctx.fillStyle = "#1e293b";
      engine.ctx.beginPath();
      const points = 6;
      for (let i = 0; i < points; i++) {
        const a = (i * Math.PI * 2) / points;
        const offsetRadius = m.radius * (0.8 + Math.sin(i * 3 + m.x * 0.1) * 0.16);
        engine.ctx.lineTo(Math.cos(a) * offsetRadius, Math.sin(a) * offsetRadius);
      }
      engine.ctx.closePath();
      engine.ctx.fill();

      // Rock craggy surface grooves
      engine.ctx.strokeStyle = "#475569";
      engine.ctx.lineWidth = 2.0;
      engine.ctx.stroke();

      // Hot thermal cracks/veins for visual visual density
      engine.ctx.strokeStyle = "#f97316";
      engine.ctx.globalAlpha = 0.65;
      engine.ctx.lineWidth = 1;
      engine.ctx.beginPath();
      engine.ctx.moveTo(-m.radius * 0.3, -m.radius * 0.2);
      engine.ctx.lineTo(m.radius * 0.4, m.radius * 0.3);
      engine.ctx.stroke();

      engine.ctx.restore();
    });

    // --- DRAW HELPER PLAYER DRONES ---
    if (!engine.player.isDead) {
      engine.drones.forEach((dr) => {
        const pcx = engine.player.x + engine.player.width / 2;
        const pcy = engine.player.y + engine.player.height / 2;
        
        const rx = pcx + Math.sin(dr.angleOffset) * (dr.type === "orbit" ? 55 : (dr.type === "defense" ? 45 : 40));
        const ry = pcy + Math.cos(dr.angleOffset) * (dr.type === "orbit" ? 55 : (dr.type === "defense" ? 45 : 40));

        engine.ctx.save();
        engine.ctx.translate(rx, ry);

        // Drone colors based on functions
        const color =
          dr.type === "attack"
            ? "#22d3ee"
            : dr.type === "homing"
              ? "#f97316"
              : dr.type === "defense"
                ? "#34d399"
                : dr.type === "orbit"
                  ? "#facc15"
                  : "#a855f7";

        engine.ctx.shadowColor = color;
        engine.ctx.shadowBlur = 12;
        engine.ctx.fillStyle = color;

        // Draw cute tech capsule shapes
        engine.ctx.beginPath();
        engine.ctx.arc(0, 0, 8, 0, Math.PI * 2);
        engine.ctx.fill();

        // Inner white nucleus
        engine.ctx.fillStyle = "#ffffff";
        engine.ctx.beginPath();
        engine.ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        engine.ctx.fill();

        // Specific visual appendages
        engine.ctx.strokeStyle = color;
        engine.ctx.lineWidth = 1.5;
        engine.ctx.beginPath();
        engine.ctx.moveTo(0, 0);
        engine.ctx.lineTo(-Math.sin(dr.angleOffset) * 12, -Math.cos(dr.angleOffset) * 12);
        engine.ctx.stroke();

        engine.ctx.restore();

        // Render laser beams CONTINUOUS column
        if (dr.type === "laser" && dr.laserChargeCount > 0) {
          engine.ctx.save();
          engine.ctx.shadowColor = "#c084fc";
          engine.ctx.shadowBlur = 20;

          // Outer plasma shroud
          engine.ctx.fillStyle = "rgba(168, 85, 247, 0.35)";
          engine.ctx.fillRect(rx - 10, 0, 20, ry);

          // Inner laser lance core
          engine.ctx.fillStyle = "#ffffff";
          engine.ctx.fillRect(rx - 4, 0, 8, ry);
          
          engine.ctx.restore();
        }
      });
    }

    renderChapter1WaveHudSystem(engine);
    engine.renderBossClearOverlay();
    engine.ctx.restore();
  
}
