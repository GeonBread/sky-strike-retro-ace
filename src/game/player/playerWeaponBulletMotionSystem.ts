/**
 * 업로드된 호반우 탄 데모의 플레이어 탄 후처리 시스템.
 * - 예체능 탄은 가까운 적을 향해 부드럽게 꺾인다.
 * - 탄마다 회전/잔상/짧은 수명 효과를 유지한다.
 */

import type { Bullet } from "../entities";

type Runtime = any;

function getBulletCenter(b: Bullet) {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function getEnemyCenter(e: any) {
  return { x: e.x + e.width / 2, y: e.y + e.height / 2 };
}

function findClosestEnemy(engine: Runtime, x: number, y: number) {
  let best: any = null;
  let bestDist = Infinity;
  const enemies = engine.enemies || [];
  for (const e of enemies) {
    if (!e.active) continue;
    const p = getEnemyCenter(e);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  if (engine.boss && engine.boss.active) {
    const p = getEnemyCenter(engine.boss);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDist) best = p;
  }
  return best;
}

export function updatePlayerWeaponBulletMotionSystem(engine: Runtime, dt: number) {
  const step = Math.min(2, dt * 60);

  for (const b of engine.bullets || []) {
    if (!b.playerBulletKind) continue;

    const center = getBulletCenter(b);

    if (b.playerBulletKind === "musicBeam") {
      b.playerBulletLife = (b.playerBulletLife ?? 0.22) - dt;
      if ((b.playerBulletLife ?? 0) <= 0) b.active = false;
      continue;
    }

    if (b.playerBulletHoming) {
      const target = findClosestEnemy(engine, center.x, center.y);
      if (target) {
        const dx = target.x - center.x;
        const dy = target.y - center.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const speed = Math.max(630, Math.hypot(b.vx, b.vy));
        const desiredVx = (dx / len) * speed;
        const desiredVy = (dy / len) * speed;
        const level = Math.max(1, Math.min(5, b.playerWeaponLevel ?? 1));
        const steer = (0.034 + level * 0.006) * step;
        b.vx += (desiredVx - b.vx) * steer;
        b.vy += (desiredVy - b.vy) * steer;
      }

      if (b.playerBulletWave) {
        b.vx += Math.sin(performance.now() * 0.008 + center.x * 0.01) * 38 * b.playerBulletWave * dt;
      }
    }

    b.playerBulletRotation = (b.playerBulletRotation ?? 0) + (b.playerBulletSpin ?? 0) * step;
    const trail = b.playerBulletTrail ?? [];
    trail.push({ x: center.x, y: center.y, size: b.playerBulletSize ?? Math.max(b.width, b.height) });
    const maxTrail = b.playerWeaponStyle === "science" ? 3 : 8;
    if (trail.length > maxTrail) trail.splice(0, trail.length - maxTrail);
    b.playerBulletTrail = trail;
  }
}
