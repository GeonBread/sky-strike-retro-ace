/** Shared CH2 / CH3 player bullet artwork, extracted without behavioral changes. */
type GameSceneRenderEngine=any;
const HOBANU_BULLET_BASE = "/assets/common/player/bullets/";
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

  if (engine.bossEntity && engine.bossEntity.active) {
    rawTargets.push({
      x: engine.bossEntity.x + engine.bossEntity.width / 2,
      y: engine.bossEntity.y + engine.bossEntity.height / 2,
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

export function renderPlayerBulletByStyle(
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


