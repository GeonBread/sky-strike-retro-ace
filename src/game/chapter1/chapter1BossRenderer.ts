/**
 * 챕터 1 보스 장면 렌더러입니다.
 *
 * 800 × 960 원본 보스 장면은 공통 922 × 960 스토리 전투 캔버스 중앙에
 * 비율을 유지해 배치하고, 플레이어·지원 몬스터·아이템·플레이어 탄은
 * 공통 캔버스 좌표로 그려 웨이브와 표시 크기를 일치시킵니다.
 */

import type { Bullet, Particle } from "../entities";
import { renderChapter1BulletSystem, renderChapter1EnemySystem } from "./chapter1WaveRenderer";
import { CHAPTER1_STORY_PLAYER_VISUAL_WIDTH } from "./chapter1WaveVisualTuning";
import { getChapter1BossViewportProjection } from "./chapter1BossViewportProjection";

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
  // 보스전에서 마지막 목숨을 모두 소진해도 호반우를 지우지 않는다.
  // isDead는 그대로 유지해 조작·발사·추가 피격은 잠그고, 렌더링만 무적 깜빡임으로 남긴다.
  const showStoryDefeatedPlayer = engine.playMode === "story" && engine.player.hp <= 0;
  if (engine.player.isDead && !showStoryDefeatedPlayer) return;

  const time = performance.now();
  const bob = Math.sin(time * 0.004) * 3.8;
  const shake = Math.sin(time * 0.012) * 1.15;
  const cx = engine.player.x + engine.player.width / 2 + shake;
  let cy = engine.player.y + engine.player.height / 2 + bob;
  // 보스 클리어 문구를 약 3초간 보여준 뒤 호반우가 위로 상승해 화면 밖으로 이탈합니다.
  // 이탈 중에는 무적 깜빡임을 적용하지 않습니다.
  if (state.cinematicMode === "destroy") {
    const exitStart = 6.05;
    const exitEnd = 7.45;
    const exitProgress = Math.max(0, Math.min(1, (state.cinematicTime - exitStart) / (exitEnd - exitStart)));
    if (exitProgress > 0) {
      const eased = exitProgress * exitProgress * exitProgress;
      cy = cy + (-engine.canvas.height - CHAPTER1_STORY_PLAYER_VISUAL_WIDTH - cy) * eased;
    }
  } else if (engine.player.invulnTimer > 0 && Math.floor(time / 80) % 2 === 0) {
    return;
  }

  const drawW = engine.playMode === "story"
    ? CHAPTER1_STORY_PLAYER_VISUAL_WIDTH
    : Math.max(54, engine.player.width * 2.85);
  const ratio = PLAYER_IMAGE.complete && PLAYER_IMAGE.naturalWidth > 0
    ? PLAYER_IMAGE.naturalHeight / PLAYER_IMAGE.naturalWidth
    : 1;
  const drawH = drawW * ratio;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(time * 0.003) * 0.02);
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

function drawPlayerBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  if (!bullet.active || bullet.isEnemy || bullet.playerBulletKind === "musicBeam") return;
  const cx = bullet.x + bullet.width / 2;
  const cy = bullet.y + bullet.height / 2;
  const width = Math.max(9, bullet.width);
  const height = Math.max(9, bullet.height);
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

function drawMusicBeam(engine: any, ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  if (!bullet.active || bullet.isEnemy || bullet.playerBulletKind !== "musicBeam") return;
  const core = engine.chapter1Boss?.core;
  if (!core) return;
  const projection = getChapter1BossViewportProjection(engine.canvas);
  const startX = engine.player.x + engine.player.width / 2;
  const startY = engine.player.y - 8;
  const hit = core.getBossHitArea();
  const targetX = projection.offsetX + hit.x * projection.scale;
  const targetY = projection.offsetY + hit.y * projection.scale;
  const phase = bullet.playerBeamPhase ?? 0;
  const amp = bullet.playerBeamAmp ?? 13;
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index <= 18; index += 1) {
    const t = index / 18;
    const envelope = Math.sin(t * Math.PI);
    points.push({
      x: startX + (targetX - startX) * t + Math.sin(t * Math.PI * 3.8 + performance.now() * 0.018 + phase) * amp * envelope,
      y: startY + (targetY - startY) * t,
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

function drawBossSupportObjects(engine: any, ctx: CanvasRenderingContext2D): void {
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
    const cx = powerup.x + powerup.width / 2;
    const cy = powerup.y + powerup.height / 2;
    const pulse = 1 + Math.sin(performance.now() * 0.01 + cx) * 0.055;
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

function drawEngineParticles(engine: any, ctx: CanvasRenderingContext2D): void {
  for (const particle of engine.particles as Particle[]) {
    const alpha = particle.maxLife > 0 ? Math.max(0, particle.life / particle.maxLife) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.restore();
  }
}

/**
 * 원본 보스 장면과 공통 캔버스 좌표의 플레이어 요소를 순서대로 렌더링합니다.
 */
export function renderChapter1BossFullSceneSystem(engine: any): boolean {
  const runtime = runtimeOf(engine);
  if (!runtime?.core) return false;
  const projection = getChapter1BossViewportProjection(engine.canvas);

  engine.ctx.save();
  engine.ctx.setTransform(1, 0, 0, 1, 0, 0);
  engine.ctx.fillStyle = "#040507";
  engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
  engine.ctx.setTransform(
    projection.scale,
    0,
    0,
    projection.scale,
    projection.offsetX,
    projection.offsetY,
  );
  runtime.core.render();
  engine.ctx.restore();

  drawBossSupportObjects(engine, engine.ctx);
  for (const bullet of engine.bullets as Bullet[]) drawPlayerBullet(engine.ctx, bullet);
  for (const bullet of engine.bullets as Bullet[]) drawMusicBeam(engine, engine.ctx, bullet);
  drawCurrentPlayer(engine, engine.ctx);
  drawEngineParticles(engine, engine.ctx);

  if (engine.bombActive) {
    const progress = Math.max(0, Math.min(1, engine.bombRadius / Math.max(1, engine.bombMaxRadius)));
    const alpha = Math.max(0, 1 - progress);
    const cx = engine.bombOriginX ?? (engine.player.x + engine.player.width / 2);
    const cy = engine.bombOriginY ?? (engine.player.y + engine.player.height / 2);
    const radius = Math.max(0, engine.bombRadius);
    const outerRadius = radius * 1.08;
    const waveRadius = radius * 0.92;

    engine.ctx.save();
    engine.ctx.globalCompositeOperation = "screen";

    // 중심에서 퍼지는 노란 정화광입니다.
    const glow = engine.ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius);
    glow.addColorStop(0, `rgba(255, 255, 224, ${0.92 * alpha})`);
    glow.addColorStop(0.18, `rgba(255, 246, 150, ${0.72 * alpha})`);
    glow.addColorStop(0.48, `rgba(255, 221, 76, ${0.38 * alpha})`);
    glow.addColorStop(1, "rgba(255, 211, 45, 0)");
    engine.ctx.fillStyle = glow;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    engine.ctx.fill();

    // 두 겹의 밝은 정화 파동 링을 겹쳐 실제 빛이 밀려나가는 느낌을 냅니다.
    engine.ctx.shadowColor = `rgba(255, 230, 94, ${0.95 * alpha})`;
    engine.ctx.shadowBlur = 34;
    engine.ctx.strokeStyle = `rgba(255, 236, 118, ${0.96 * alpha})`;
    engine.ctx.lineWidth = 10 + (1 - progress) * 8;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
    engine.ctx.stroke();

    engine.ctx.shadowBlur = 24;
    engine.ctx.strokeStyle = `rgba(255, 255, 220, ${0.78 * alpha})`;
    engine.ctx.lineWidth = 4 + (1 - progress) * 4;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, waveRadius * 0.78, 0, Math.PI * 2);
    engine.ctx.stroke();

    // 사용 직후에는 호반우 중심이 한 번 강하게 빛납니다.
    const coreRadius = Math.max(18, Math.min(86, radius * 0.22));
    const core = engine.ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
    core.addColorStop(0, `rgba(255, 255, 248, ${0.98 * alpha})`);
    core.addColorStop(0.45, `rgba(255, 239, 112, ${0.7 * alpha})`);
    core.addColorStop(1, "rgba(255, 218, 52, 0)");
    engine.ctx.fillStyle = core;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    engine.ctx.fill();

    engine.ctx.restore();
  }

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
