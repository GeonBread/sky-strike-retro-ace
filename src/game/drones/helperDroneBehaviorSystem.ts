/**
 * 도움 드론 행동 시스템
 *
 * 이 파일은 플레이어 주변을 도는 도움 드론의 공격, 방어, 레이저, 호밍 행동을 담당한다.
 * 드론 발사 주기, 방어 범위, 적 추적 데미지, 레이저 충전 방식을 수정할 때 이 파일을 수정한다.
 */

import { Bullet } from "../entities";
import { sfx } from "../AudioSystem";

type HelperDroneRuntime = any;

/**
 * 모든 도움 드론의 회전 위치, 공격 타이머, 탄환 생성, 방어 폭발, 레이저 타격을 갱신한다.
 * 플레이어가 사망 중이면 드론 행동을 중지한다.
 */
export function updateHelperDroneBehaviorSystem(engine: HelperDroneRuntime, dt: number) {
if (engine.player.isDead) return;

engine.drones.forEach((dr) => {
  dr.lastShot += dt;
  dr.angleOffset += 1.8 * dt; // Rotate the orbit!

  const pcx = engine.player.x + engine.player.width / 2;
  const pcy = engine.player.y + engine.player.height / 2;

  // Type-specific logic!
  if (dr.type === "attack") {
    // Shoots 2 auxiliary plasma fires forward
    if (dr.lastShot >= 0.35) {
      dr.lastShot = 0;
      const leftX = pcx - 22 + Math.cos(dr.angleOffset) * 8;
      const leftY = pcy - 12 + Math.sin(dr.angleOffset) * 8;
      engine.addPlayerBlt(leftX - 2, leftY - 8, 4, 12, 0, -900, "#22d3ee", 0.5);
    }
  } else if (dr.type === "homing") {
    if (dr.lastShot >= 0.55) {
      dr.lastShot = 0;
      const rx = pcx + Math.sin(dr.angleOffset) * 42;
      const ry = pcy + Math.cos(dr.angleOffset) * 42;
      const b = new Bullet();
      b.x = rx - 5;
      b.y = ry - 8;
      b.width = 10;
      b.height = 16;
      b.vx = Math.sin(dr.angleOffset) * 120;
      b.vy = -760;
      b.color = "#f97316";
      b.damage = 1.15;
      b.type = "satellite_bullet";
      b.companionIndex = 2;
      engine.bullets.push(b);
    }
  } else if (dr.type === "defense") {
    // Deletes and breaks enemy bullets within defense range every 2.4s
    if (dr.lastShot >= 2.4) {
      dr.lastShot = 0;
      const rx = pcx + Math.sin(dr.angleOffset) * 45;
      const ry = pcy + Math.cos(dr.angleOffset) * 45;

      // Spawn a small visual defense pulse shockwave!
      engine.spawnExplosion(rx, ry, "#10b981", 12);
      
      engine.bullets.forEach((b) => {
        if (b.active && b.isEnemy) {
          const b_dist = Math.hypot(b.x + b.width / 2 - rx, b.y + b.height / 2 - ry);
          if (b_dist <= 75) {
            b.active = false;
            engine.spawnExplosion(b.x + b.width / 2, b.y + b.height / 2, "#34d399", 3);
          }
        }
      });
    }
  } else if (dr.type === "orbit") {
    // High proximity damage dealing orbit droid
    const rx = pcx + Math.sin(dr.angleOffset) * 55;
    const ry = pcy + Math.cos(dr.angleOffset) * 55;

    engine.enemies.forEach((e) => {
      if (e.active) {
        if (e.type === "boss" && (engine.state === "BOSSCUTSCENE" || engine.state === "BOSSPHASE2CUTSCENE" || engine.state === "BOSSPHASE3CUTSCENE")) {
          return;
        }
        const ex = e.x + e.width / 2;
        const ey = e.y + e.height / 2;
        const e_dist = Math.hypot(ex - rx, ey - ry);
        if (e_dist <= 35) {
          // Proximity collision damage ticker
          e.hp -= 15 * dt; 
          if (Math.random() < 0.2) {
            engine.spawnExplosion(rx, ry, "#eab308", 2);
            sfx.enemyHit();
          }
          if (e.hp <= 0) {
            engine.deactivateEnemy(e);
            sfx.enemyExplode();
            engine.awardScore(e.type === "boss" ? 10000 : 100);
            engine.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, "#fbbf24", 15);
          }
        }
      }
    });
  } else if (dr.type === "laser") {
    // Charges and fires a continuous pierce beam columns
    if (dr.lastShot >= 4.0) {
      dr.lastShot = 0;
      dr.laserChargeCount = 1.2; // Fires pierce beam for 1.2s
    }

    if (dr.laserChargeCount > 0) {
      dr.laserChargeCount -= dt;
      const rx = pcx + Math.sin(dr.angleOffset) * 48;
      const ry = pcy + Math.cos(dr.angleOffset) * 48;

      // Draw continuous laser column in update/particles
      if (Math.random() < 0.3) {
        engine.spawnExplosion(rx, ry - 150, "#a855f7", 3);
      }

      // Deal frame damage to all enemies aligned with this column!
      engine.enemies.forEach((e) => {
        if (e.active) {
          if (e.type === "boss" && (engine.state === "BOSSCUTSCENE" || engine.state === "BOSSPHASE2CUTSCENE" || engine.state === "BOSSPHASE3CUTSCENE")) {
            return;
          }
          const ex = e.x + e.width / 2;
          if (Math.abs(ex - rx) < 24 && e.y < ry) {
            e.hp -= 28 * dt; // Pierce beam ticks
            if (Math.random() < 0.15) sfx.enemyHit();
            if (e.hp <= 0) {
              engine.deactivateEnemy(e);
              sfx.enemyExplode();
              engine.awardScore(e.type === "boss" ? 10000 : 100);
              engine.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, "#c084fc", 15);
            }
          }
        }
      });
    }
  }
});
}
