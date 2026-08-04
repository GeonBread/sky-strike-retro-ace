import type { Bullet, Enemy } from "../entities";
import { isChapter1EnemyType } from "./chapter1WaveTypes";
import { CHAPTER1_RING_VISUAL_AND_HIT_SCALE, getChapter1BulletVisualScale } from "./chapter1WaveVisualTuning";
import {
  spawnChapter1EnemyBulletImpactSystem,
  spawnChapter1HazardBreakEffectSystem,
  spawnChapter1HazardHitEffectSystem,
  spawnChapter1PlayerBulletVanishSystem,
  spawnChapter1WaveBurstParticlesSystem,
} from "./chapter1WaveImpactSystem";

const CHAPTER1_BULLET_EFFECT_COLORS = [
  "#ff5c58", "#ffd23f", "#ffab48", "#72de82", "#a76cff",
  "#b8ea4b", "#ff5b63", "#ffc83f", "#ff5eab", "#54d5ff",
] as const;

function centerOf(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function centeredBoxIntersects(
  a: { x: number; y: number; width: number; height: number; hitWidth?: number; hitHeight?: number },
  b: { x: number; y: number; width: number; height: number; hitWidth?: number; hitHeight?: number },
): boolean {
  const aw = a.hitWidth ?? a.width;
  const ah = a.hitHeight ?? a.height;
  const bw = b.hitWidth ?? b.width;
  const bh = b.hitHeight ?? b.height;
  const ac = centerOf(a);
  const bc = centerOf(b);
  return Math.abs(ac.x - bc.x) <= (aw + bw) / 2 && Math.abs(ac.y - bc.y) <= (ah + bh) / 2;
}

function tryBlockWithSatellite(engine: any, bullet: Bullet): boolean {
  if (engine.player.isDead || engine.player.satelliteCount <= 0) return false;
  if (bullet.chapter1?.behavior === "ring" || bullet.chapter1?.ownerType === 6) return false;

  const bulletCenter = centerOf(bullet);
  const playerCenter = centerOf(engine.player);
  if (!engine.player.satelliteHps) engine.player.satelliteHps = [];
  while (engine.player.satelliteHps.length < engine.player.satelliteCount) engine.player.satelliteHps.push(10);
  while (engine.player.satelliteHps.length > engine.player.satelliteCount) engine.player.satelliteHps.pop();

  for (let index = 0; index < engine.player.satelliteCount; index += 1) {
    const angle = (engine.playerSatelliteAngle || 0) + (index / engine.player.satelliteCount) * Math.PI * 2;
    const x = playerCenter.x + Math.cos(angle) * 44;
    const y = playerCenter.y + Math.sin(angle) * 44;
    if (Math.hypot(bulletCenter.x - x, bulletCenter.y - y) >= 18) continue;

    const bulletSize = Math.max(bullet.width, bullet.height) * getChapter1BulletVisualScale(bullet.chapter1?.sprite ?? 0);
    const bulletColor = CHAPTER1_BULLET_EFFECT_COLORS[bullet.chapter1?.sprite ?? 0] ?? "#ffffff";
    spawnChapter1EnemyBulletImpactSystem(engine, bulletCenter.x, bulletCenter.y, bulletColor, bulletSize);
    bullet.active = false;
    engine.player.satelliteHps[index] -= 1;
    if (engine.player.satelliteHps[index] <= 0) {
      engine.player.satelliteHps.splice(index, 1);
      engine.player.satelliteCount -= 1;
      engine.spawnExplosion?.(x, y, "#c084fc", 18);
    } else {
      engine.spawnExplosion?.(x, y, "#c084fc", 6);
      if (!engine.playerSatelliteFlashes) engine.playerSatelliteFlashes = [];
      engine.playerSatelliteFlashes[index] = 0.15;
    }
    return true;
  }
  return false;
}

function checkPlayerAgainstChapter1Bullets(engine: any): void {
  if (engine.player.isDead || engine.player.invulnTimer > 0) return;
  const playerCenter = centerOf(engine.player);
  const scale = Math.min(engine.canvas.width / 800, engine.canvas.height / 960);

  for (const bullet of engine.bullets as Bullet[]) {
    const state = bullet.chapter1;
    if (!bullet.active || !bullet.isEnemy || !state) continue;
    if (tryBlockWithSatellite(engine, bullet)) continue;

    let hit = false;
    if (state.behavior === "ring") {
      const center = centerOf(bullet);
      const radius = state.r * CHAPTER1_RING_VISUAL_AND_HIT_SCALE * scale;
      const thickness = (state.thickness ?? 11) * scale;
      const playerRadius = Math.max(engine.player.hitWidth ?? 10, engine.player.hitHeight ?? 10) * 0.5;
      const distance = Math.hypot(playerCenter.x - center.x, playerCenter.y - center.y);
      hit = Math.abs(distance - radius) < thickness + playerRadius;
    } else if (state.ownerType === 6) {
      if (!state.installed) continue;
      hit = centeredBoxIntersects(engine.player, bullet);
    } else {
      hit = centeredBoxIntersects(engine.player, bullet);
    }

    if (!hit) continue;
    const bulletCenter = centerOf(bullet);
    const bulletColor = state.behavior === "ring"
      ? "#ffd36d"
      : CHAPTER1_BULLET_EFFECT_COLORS[state.sprite] ?? "#ffffff";
    const bulletSize = state.behavior === "ring"
      ? state.r * 2 * CHAPTER1_RING_VISUAL_AND_HIT_SCALE * scale
      : Math.max(bullet.width, bullet.height) * getChapter1BulletVisualScale(state.sprite);
    if (state.ownerType !== 6) {
      spawnChapter1EnemyBulletImpactSystem(engine, bulletCenter.x, bulletCenter.y, bulletColor, bulletSize);
      bullet.active = false;
    } else {
      engine.screenShakeIntensity = Math.max(engine.screenShakeIntensity || 0, 8);
    }
    engine.triggerPlayerHit?.();
    return;
  }
}

function checkPlayerBulletsAgainstChapter1Hazards(engine: any): void {
  const playerBullets = (engine.bullets as Bullet[]).filter((bullet) => bullet.active && !bullet.isEnemy);
  const hazards = (engine.bullets as Bullet[]).filter((bullet) => bullet.active && bullet.isEnemy && bullet.chapter1?.destructible);

  for (const playerBullet of playerBullets) {
    for (const hazard of hazards) {
      if (!hazard.active || !centeredBoxIntersects(playerBullet, hazard)) continue;
      playerBullet.active = false;
      const state = hazard.chapter1!;
      state.hp -= Math.max(1, playerBullet.damage || 1);
      const impactX = playerBullet.x + playerBullet.width / 2;
      const impactY = playerBullet.y + playerBullet.height / 2;
      spawnChapter1HazardHitEffectSystem(engine, impactX, impactY, state.sprite === 6);
      if (state.sprite === 6) {
        state.hitFlash = 0.1;
        engine.screenShakeIntensity = Math.max(engine.screenShakeIntensity || 0, 2.5);
      }
      if (state.hp <= 0) {
        hazard.active = false;
        engine.awardScore?.(state.sprite === 6 ? 80 : 25);
        const center = centerOf(hazard);
        const color = CHAPTER1_BULLET_EFFECT_COLORS[state.sprite] ?? (state.sprite === 6 ? "#ff695f" : "#ffbc50");
        const size = Math.max(
          (state.drawW ?? hazard.width) * getChapter1BulletVisualScale(state.sprite),
          (state.drawH ?? hazard.height) * getChapter1BulletVisualScale(state.sprite),
          state.r * 2,
        );
        spawnChapter1HazardBreakEffectSystem(engine, center.x, center.y, color, size, state.sprite === 6);
      }
      break;
    }
  }
}

function checkCartAbsorption(engine: any): void {
  const carts = (engine.enemies as Enemy[]).filter(
    (enemy) => enemy.active && isChapter1EnemyType(enemy.type) && enemy.chapter1?.index === 8 && !enemy.chapter1.open,
  );
  if (carts.length === 0) return;

  for (const playerBullet of engine.bullets as Bullet[]) {
    if (!playerBullet.active || playerBullet.isEnemy) continue;
    for (const cart of carts) {
      if (!cart.chapter1 || !centeredBoxIntersects(playerBullet, cart)) continue;
      playerBullet.active = false;
      const state = cart.chapter1;
      if (state.charge < 8 && state.absorbCooldown <= 0) {
        state.charge += 1;
        state.absorbCooldown = state.absorbPeriod;
        if (state.charge === 1) state.collectTimer = 2.6;
        if (state.charge >= 8) {
          state.collectTimer = 0;
          state.attack = 0;
        } else {
          state.attack = Math.max(state.attack, state.collectTimer + 0.04);
        }
        const impactX = playerBullet.x + playerBullet.width / 2;
        const impactY = playerBullet.y + playerBullet.height / 2;
        spawnChapter1PlayerBulletVanishSystem(engine, impactX, impactY);
        spawnChapter1WaveBurstParticlesSystem(engine, impactX, impactY, "#8cff9f", 3, 82);
      } else {
        const impactX = playerBullet.x + playerBullet.width / 2;
        const impactY = playerBullet.y + playerBullet.height / 2;
        spawnChapter1PlayerBulletVanishSystem(engine, impactX, impactY);
        spawnChapter1WaveBurstParticlesSystem(
          engine,
          impactX,
          impactY,
          state.charge >= 8 ? "#ffd36d" : "#7adfff",
          2,
          68,
        );
      }
      break;
    }
  }
}

export function checkChapter1WaveCollisionsSystem(engine: any): void {
  checkPlayerBulletsAgainstChapter1Hazards(engine);
  checkCartAbsorption(engine);
  checkPlayerAgainstChapter1Bullets(engine);
}
