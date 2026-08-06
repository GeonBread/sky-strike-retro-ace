import type { Bullet, Particle } from "../entities";
import { renderChapter1BulletSystem, renderChapter1EnemySystem } from "./chapter1WaveRenderer";

const W = 800;
const H = 960;
const PLAYER_IMAGE = new Image();
PLAYER_IMAGE.src = "/assets/player/hobanu_player.png";
const PLAYER_BULLET_BASE = "/assets/bullets/player/";
const PLAYER_BULLET_CACHE = new Map<string, HTMLImageElement>();

function runtimeOf(engine: any) {
  return engine.chapter1Boss?.active ? engine.chapter1Boss : null;
}

function bulletImage(sprite: string | undefined): HTMLImageElement | null {
  if (!sprite) return null;
  const src = `${PLAYER_BULLET_BASE}${sprite}`;
  let image = PLAYER_BULLET_CACHE.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    PLAYER_BULLET_CACHE.set(src, image);
  }
  return image;
}

function drawCurrentPlayer(engine: any, ctx: CanvasRenderingContext2D): void {
  const core = engine.chapter1Boss?.core;
  if (!core) return;
  const state = core.state;
  if (state.cinematicMode !== "battle" && state.cinematicMode !== "destroy") return;
  if (state.cinematicMode === "battle" && (state.bossStageState === "phase1clear" || state.bossStageState === "awakening")) return;
  if (engine.player.isDead) return;
  const sx = engine.canvas.width / W;
  const sy = engine.canvas.height / H;
  const cx = (engine.player.x + engine.player.width / 2) / sx;
  const cy = (engine.player.y + engine.player.height / 2) / sy;
  if (engine.player.invulnTimer > 0 && Math.floor(performance.now() / 80) % 2 === 0) return;
  const drawW = 137;
  const ratio = PLAYER_IMAGE.complete && PLAYER_IMAGE.naturalWidth > 0
    ? PLAYER_IMAGE.naturalHeight / PLAYER_IMAGE.naturalWidth
    : 1;
  const drawH = drawW * ratio;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(performance.now() * 0.003) * 0.02);
  ctx.shadowColor = "rgba(255,255,255,0.75)";
  ctx.shadowBlur = 10;
  if (PLAYER_IMAGE.complete && PLAYER_IMAGE.naturalWidth > 0) {
    ctx.drawImage(PLAYER_IMAGE, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    ctx.fillStyle = "#ead8b9";
    ctx.strokeStyle = "#08090d";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(18, 14);
    ctx.lineTo(0, 24);
    ctx.lineTo(-18, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerBullet(ctx: CanvasRenderingContext2D, bullet: Bullet, sx: number, sy: number): void {
  if (!bullet.active || bullet.isEnemy || bullet.playerBulletKind === "musicBeam") return;
  const cx = (bullet.x + bullet.width / 2) / sx;
  const cy = (bullet.y + bullet.height / 2) / sy;
  const width = Math.max(9, bullet.width / sx);
  const height = Math.max(9, bullet.height / sy);
  const image = bulletImage(bullet.playerBulletSprite);
  ctx.save();
  ctx.translate(cx, cy);
  const fixedKinds = new Set(["formula", "speech", "book", "letter"]);
  const angle = fixedKinds.has(bullet.playerBulletKind ?? "")
    ? (bullet.playerBulletRotation ?? 0)
    : (bullet.playerBulletRotation ?? Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2);
  ctx.rotate(angle);
  ctx.shadowColor = bullet.color || "#fff";
  ctx.shadowBlur = 9;
  if (image?.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
  } else {
    ctx.fillStyle = bullet.color || "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMusicBeam(engine: any, ctx: CanvasRenderingContext2D, bullet: Bullet, sx: number, sy: number): void {
  if (!bullet.active || bullet.isEnemy || bullet.playerBulletKind !== "musicBeam") return;
  const core = engine.chapter1Boss?.core;
  if (!core) return;
  const startX = (engine.player.x + engine.player.width / 2) / sx;
  const startY = (engine.player.y - 8) / sy;
  const hit = core.getBossHitArea();
  const phase = bullet.playerBeamPhase ?? 0;
  const amp = bullet.playerBeamAmp ?? 13;
  const points: Array<{x:number;y:number}> = [];
  for (let index = 0; index <= 18; index += 1) {
    const t = index / 18;
    const envelope = Math.sin(t * Math.PI);
    points.push({
      x: startX + (hit.x - startX) * t + Math.sin(t * Math.PI * 3.8 + performance.now() * 0.018 + phase) * amp * envelope,
      y: startY + (hit.y - startY) * t,
    });
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [color, width] of [["#000", 14], [bullet.color || "#ff5fd2", 8], ["#fff", 2.5]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBossSupportObjects(engine: any, ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  for (const enemy of engine.enemies || []) {
    if (!(enemy as any).chapter1BossSupport) continue;
    renderChapter1EnemySystem(engine, enemy);
  }
  for (const bullet of engine.bullets as Bullet[]) {
    if (!bullet.isEnemy || !bullet.chapter1) continue;
    renderChapter1BulletSystem(engine, bullet);
  }

  for (const powerup of engine.powerups || []) {
    if (!powerup.active) continue;
    const cx = (powerup.x + powerup.width / 2) / sx;
    const cy = (powerup.y + powerup.height / 2) / sy;
    const pulse = 1 + Math.sin(performance.now() * .01 + cx) * .055;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(255,255,255,.3)";
    ctx.shadowBlur = 9;
    if (powerup.type === "heal") {
      ctx.fillStyle = "#3bc779";
      ctx.strokeStyle = "#07090d";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-19, -19, 38, 38, 9);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#07090d";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(0, 11);
      ctx.moveTo(-11, 0); ctx.lineTo(11, 0);
      ctx.stroke();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(0, 11);
      ctx.moveTo(-11, 0); ctx.lineTo(11, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#f7c948";
      ctx.strokeStyle = "#07090d";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(20, 0);
      ctx.lineTo(0, 20);
      ctx.lineTo(-20, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ef3f45";
      ctx.strokeStyle = "#07090d";
      ctx.lineWidth = 4;
      ctx.font = "900 22px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText("P", 0, 1);
      ctx.fillText("P", 0, 1);
    }
    ctx.restore();
  }

}

function drawEngineParticles(engine: any, ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  for (const particle of engine.particles as Particle[]) {
    const alpha = particle.maxLife > 0 ? Math.max(0, particle.life / particle.maxLife) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x / sx, particle.y / sy, particle.size / sx, particle.size / sy);
    ctx.restore();
  }
}

export function renderChapter1BossFullSceneSystem(engine: any): boolean {
  const runtime = runtimeOf(engine);
  if (!runtime?.core) return false;
  const sx = engine.canvas.width / W;
  const sy = engine.canvas.height / H;
  engine.ctx.save();
  engine.ctx.setTransform(sx, 0, 0, sy, 0, 0);
  runtime.core.render();
  drawBossSupportObjects(engine, engine.ctx, sx, sy);
  for (const bullet of engine.bullets as Bullet[]) drawPlayerBullet(engine.ctx, bullet, sx, sy);
  for (const bullet of engine.bullets as Bullet[]) drawMusicBeam(engine, engine.ctx, bullet, sx, sy);
  drawCurrentPlayer(engine, engine.ctx);
  drawEngineParticles(engine, engine.ctx, sx, sy);
  if (engine.bombActive) {
    engine.ctx.save();
    engine.ctx.strokeStyle = `rgba(168,85,247,${Math.max(0, 1 - engine.bombRadius / engine.bombMaxRadius)})`;
    engine.ctx.lineWidth = 18;
    engine.ctx.beginPath();
    engine.ctx.arc(
      (engine.bombOriginX ?? (engine.player.x + engine.player.width / 2)) / sx,
      (engine.bombOriginY ?? (engine.player.y + engine.player.height / 2)) / sy,
      engine.bombRadius / Math.min(sx, sy),
      0,
      Math.PI * 2,
    );
    engine.ctx.stroke();
    engine.ctx.restore();
  }
  engine.ctx.restore();
  if ((engine.playerDamageFlashTimer || 0) > 0) {
    const alpha = Math.min(0.32, (engine.playerDamageFlashTimer / 0.85) * 0.32);
    engine.ctx.save();
    engine.ctx.fillStyle = `rgba(220, 32, 42, ${alpha})`;
    engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
    engine.ctx.restore();
  }
  return true;
}

// 기존 호출부 호환용. 전체 장면은 renderChapter1BossFullSceneSystem에서 한 번에 그립니다.
export function renderChapter1BossBackgroundSystem(): boolean { return false; }
export function renderChapter1BossCombatSystem(): void {}
export function shouldHidePlayerForChapter1BossSystem(engine: any): boolean { return !!runtimeOf(engine); }
