/**
 * 총알 이동 및 특수 패턴 시스템
 *
 * 적탄과 플레이어 보조탄의 이동, 유도, 감속, 분열, 폭발, 회수, 잔상, 화면 경계 제거를 담당한다.
 * 탄환의 특수 움직임, 분열 개수, 폭발 타이밍, 보스 전용 미사일 꼬리 효과를 조정할 때 이 파일을 수정한다.
 * 탄환 충돌 판정과 화면에 그리는 디자인은 각각 충돌 처리와 렌더링 파일에서 다룬다.
 */
import { sfx } from "../AudioSystem";
import { Bullet, Entity, Particle } from "../entities";
import type { GameEngine } from "../engine";
import { applyHobanwooEnemyBulletVisualSystem } from "../data/hobanwooEnemyBulletVisualCatalog";

/**
 * 총알 시스템이 엔진 내부 상태를 직접 물어보지 않도록 호출부에서 넘겨주는 실행 옵션이다.
 * 스토리 모드 여부와 보스 특수 지뢰 피격 처리를 외부에서 받아 같은 순서로 실행한다.
 */
export interface BulletMovementAndSpecialPatternOptions {
  isStoryMode: boolean;
  hitPlayerFromBossHazard: () => void;
}

/**
 * 현재 활성화된 모든 탄환을 한 프레임만큼 갱신한다.
 * 적 특수탄의 상태 변화, 플레이어 보조탄의 추적 움직임, 일반 위치 이동, 잔상 생성, 화면 밖 제거를 같은 순서로 처리한다.
 */
export function updateBulletMovementAndSpecialPatternSystem(
  engine: GameEngine,
  dt: number,
  options: BulletMovementAndSpecialPatternOptions,
) {

    engine.bullets.forEach((b) => {
      if (!b.active) return;

      const prevCx = b.x + b.width / 2;
      const prevCy = b.y + b.height / 2;

      if (b.isEnemy) {
        if (b.type === "homing") {
          if (b.homingTimer > 0 && !engine.player.isDead) {
            const px = engine.player.x + engine.player.width / 2;
            const py = engine.player.y + engine.player.height / 2;
            const bx = b.x + b.width / 2;
            const by = b.y + b.height / 2;
            const currentAngle = Math.atan2(b.vy, b.vx);
            const targetAngle = Math.atan2(py - by, px - bx);
            const delta = Math.atan2(
              Math.sin(targetAngle - currentAngle),
              Math.cos(targetAngle - currentAngle),
            );
            const turnStep = (b.turnRate ?? 1.5) * dt;
            const nextAngle =
              currentAngle + Math.max(-turnStep, Math.min(turnStep, delta));
            const speed = b.targetSpeed ?? (Math.hypot(b.vx, b.vy) || 360);
            b.vx += (Math.cos(nextAngle) * speed - b.vx) * 0.28;
            b.vy += (Math.sin(nextAngle) * speed - b.vy) * 0.28;
            b.homingTimer -= dt;
          }
        }

        // A. Delayed Expansion Bullet
        if (b.type === "delayed") {
          b.homingTimer -= dt;
          if (b.homingTimer > 0) {
            b.vx *= 0.95;
            b.vy *= 0.95;
          } else if (b.homingTimer > -1.0) {
            b.homingTimer = -2.0; // lock once
            const angle = Math.atan2(b.vy, b.vx);
            b.vx = Math.cos(angle) * 320;
            b.vy = Math.sin(angle) * 320;
          }
        }

        // B. Time Dilation Bullet
        if (b.type === "dilation_bullet") {
          if (b.dilationState === "flying") {
            b.vx *= 0.92;
            b.vy *= 0.92;
            if (Math.hypot(b.vx, b.vy) < 4.0) {
              b.vx = 0;
              b.vy = 0;
              b.dilationState = "frozen";
              b.dilationAge = 0;
            }
          } else if (b.dilationState === "frozen") {
            if (b.dilationAge === undefined) b.dilationAge = 0;
            b.dilationAge += dt;
            // Force-launch frozen dilation bullets that have been stationary for more than 2.0 seconds to prevent getting stuck
            if (b.dilationAge > 2.0) {
              b.dilationState = "launched";
              const dx = engine.player.x + engine.player.width / 2 - b.x;
              const dy = engine.player.y + engine.player.height / 2 - b.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 1) {
                b.vx = (dx / dist) * 440;
                b.vy = (dy / dist) * 440;
              } else {
                b.vy = 440;
              }
              b.color = "#f97316";
            }
          }
        }

        // C. Gravity Pull Core Bullet
        if (b.type === "gravity_ball") {
          // Accelerate suction vector
          const px = engine.player.x + engine.player.width / 2;
          const py = engine.player.y + engine.player.height / 2;
          const cx = b.x + b.width / 2;
          const cy = b.y + b.height / 2;
          const dx = cx - px;
          const dy = cy - py;
          const dist = Math.hypot(dx, dy);

          if (dist > 10 && dist < 320 && !engine.player.isDead) {
            const pullStrength = 1950 / (dist + 40); // Gravitational pull equation
            engine.player.x += (dx / dist) * pullStrength * dt;
            engine.player.y += (dy / dist) * pullStrength * dt;
            if (Math.random() < 0.12) {
              engine.spawnExplosion(
                engine.player.x + Math.random() * engine.player.width,
                engine.player.y + Math.random() * engine.player.height,
                "#c084fc",
                1,
              );
            }
          }

          // Emitter functionality
          if (b.gravityTimer === undefined) b.gravityTimer = 0;
          b.gravityTimer += dt;
          if (b.gravityTimer > 0.22) {
            b.gravityTimer = 0;
            const spiralAngle = b.y * 0.04;
            for (let i = 0; i < 2; i++) {
              const a = spiralAngle + i * Math.PI;
              const sub = new Bullet();
              sub.x = b.x + b.width / 2 - 4;
              sub.y = b.y + b.height / 2 - 4;
              sub.width = 8;
              sub.height = 8;
              sub.vx = Math.cos(a) * 155;
              sub.vy = Math.sin(a) * 155;
              sub.isEnemy = true;
              sub.color = "#e9d5ff"; // beautiful lavender sparks
              engine.bullets.push(sub);
            }
          }
        }

        // D. Split Cluster (Cross-split and N-split)
        if (b.type === "parent_cross" || b.type === "parent_nsplit") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;

          const px = engine.player.x + engine.player.width / 2;
          const py = engine.player.y + engine.player.height / 2;
          const cx = b.x + b.width / 2;
          const cy = b.y + b.height / 2;
          const dist = Math.hypot(px - cx, py - cy);

          if (dist < 180 || b.age > 1.3) {
            b.vx = 0;
            b.vy = 0;
            if (b.fuseTimer === undefined) b.fuseTimer = 0.25;
            b.fuseTimer -= dt;

            if (b.fuseTimer <= 0) {
              b.active = false;
              if (b.type === "parent_cross") {
                const directions = [
                  0,
                  Math.PI / 4,
                  Math.PI / 2,
                  (Math.PI * 3) / 4,
                  Math.PI,
                  (Math.PI * 5) / 4,
                  (Math.PI * 3) / 2,
                  (Math.PI * 7) / 4,
                ];
                const speed = engine.bossActive ? 180 : 360; // Halved in boss battles (360 -> 180)
                directions.forEach((angle) => {
                  const sub = new Bullet();
                  sub.x = cx - 4;
                  sub.y = cy - 4;
                  sub.width = 8;
                  sub.height = 8;
                  sub.vx = Math.cos(angle) * speed;
                  sub.vy = Math.sin(angle) * speed;
                  sub.isEnemy = true;
                  sub.type = "pellet";
                  sub.color = "#ef4444";
                  engine.bullets.push(sub);
                });
                engine.spawnExplosion(cx, cy, "#ef4444", 8);
              } else {
                const baseAngle = b.parentAngle || Math.atan2(py - cy, px - cx);
                const count = 3;
                const spread = 0.22;
                const speed = engine.bossActive ? 160 : 320; // Halved in boss battles (320 -> 160)
                for (let i = -1; i <= 1; i++) {
                   const angle = baseAngle + i * spread;
                   const sub = new Bullet();
                   sub.x = cx - 4;
                   sub.y = cy - 4;
                   sub.width = 8;
                   sub.height = 8;
                   sub.vx = Math.cos(angle) * speed;
                   sub.vy = Math.sin(angle) * speed;
                   sub.isEnemy = true;
                   sub.type = "pellet";
                   sub.color = "#e11d48";
                   engine.bullets.push(sub);
                }
                engine.spawnExplosion(cx, cy, "#e11d48", 8);
              }
            }
          }
        }

        // E. Mine Orb
        if (b.type === "mine_orb") {
          b.vx *= 0.95;
          b.vy *= 0.95;

          if (b.age === undefined) b.age = 0;
          b.age += dt;

          if (b.fuseTimer === undefined) b.fuseTimer = 4.0;
          b.fuseTimer -= dt;

          const px = engine.player.x + engine.player.width / 2;
          const py = engine.player.y + engine.player.height / 2;
          const cx = b.x + b.width / 2;
          const cy = b.y + b.height / 2;
          const dist = Math.hypot(px - cx, py - cy);

          if (b.fuseTimer <= 0 || (dist < 75 && !engine.player.isDead)) {
            b.active = false;
            const count = 18;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2;
              const sub = new Bullet();
              sub.x = cx - 4;
              sub.y = cy - 4;
              sub.width = 8;
              sub.height = 8;
              sub.vx = Math.cos(angle) * 200;
              sub.vy = Math.sin(angle) * 200;
              sub.isEnemy = true;
              sub.color = "#facc15";
              applyHobanwooEnemyBulletVisualSystem(sub, "f_fragment");
              engine.bullets.push(sub);
            }
            engine.spawnExplosion(cx, cy, "#f59e0b", 24);
          }
        }

        // F. Boomerang
        if (b.type === "boomerang") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;

          if (b.age < 1.1) {
            // Downwards standard
          } else if (b.age >= 1.1 && b.age < 3.5) {
            b.vy = -180;
            b.vx = Math.sin(b.age * 5.5) * 160;
          } else {
            b.vy = -200;
            b.vx = 0;
          }
        }

        // G. Deceleration to Dash Paint Bullet
        if (b.type === "dash_paint_bullet") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;

          if (!b.dashTriggered) {
            b.color = Math.floor(b.age * 12) % 2 === 0 ? "#ea580c" : "#facc15";
            b.vx *= 0.9;
            b.vy *= 0.9;

            const px = engine.player.x + engine.player.width / 2;
            const py = engine.player.y + engine.player.height / 2;
            const bx = b.x + b.width / 2;
            const by = b.y + b.height / 2;

            const alignedX = Math.abs(px - bx) < 18;
            const alignedY = Math.abs(py - by) < 18;

            if ((alignedX || alignedY || b.age > 1.6) && !engine.player.isDead) {
              b.dashTriggered = true;
              const dx = px - bx;
              const dy = py - by;
              const dist = Math.hypot(dx, dy);
              if (dist > 1) {
                b.vx = (dx / dist) * 580;
                b.vy = (dy / dist) * 580;
              } else {
                b.vy = 400;
              }
              b.color = "#ea580c";
              engine.spawnExplosion(bx, by, "#ea580c", 4);
            }
          }
        }

        // H. Wall-Bounce Ricochet
        if (b.type === "ricochet") {
          if (b.bounceCount === undefined) b.bounceCount = 0;

          if (b.bounceCount < 3) {
            if (b.x < 0) {
              b.vx = -b.vx;
              b.x = 0;
              b.bounceCount++;
              engine.spawnExplosion(b.x, b.y + b.height / 2, "#fbbf24", 2);
            } else if (b.x + b.width > engine.canvas.width) {
              b.vx = -b.vx;
              b.x = engine.canvas.width - b.width;
              b.bounceCount++;
              engine.spawnExplosion(
                b.x + b.width,
                b.y + b.height / 2,
                "#fbbf24",
                2,
              );
            }

            if (b.y < 0) {
              b.vy = -b.vy;
              b.y = 0;
              b.bounceCount++;
              engine.spawnExplosion(b.x + b.width / 2, b.y, "#fbbf24", 2);
            }
          }
        }

        // I. Gravity Singularity Pull Vortex
        if (b.type === "gravity_singularity") {
          // Detonation timer for Phase 18 singularities
          if (b.fuseTimer !== undefined) {
            b.fuseTimer -= dt;
            if (b.fuseTimer <= 0) {
              b.active = false;
              // DETONATION! Spawn a ring of 14 bullets
              const cx = b.x + b.width / 2;
              const cy = b.y + b.height / 2;
              const bulletCount = 14;
              for (let i = 0; i < bulletCount; i++) {
                const angle = (i / bulletCount) * Math.PI * 2;
                const sub = new Bullet();
                sub.x = cx - 5;
                sub.y = cy - 5;
                sub.width = 10;
                sub.height = 10;
                sub.vx = Math.cos(angle) * 260;
                sub.vy = Math.sin(angle) * 260;
                sub.isEnemy = true;
                sub.type = "pellet";
                sub.color = "#d946ef"; // vibrant magenta pellets
                engine.bullets.push(sub);
              }
              engine.spawnExplosion(cx, cy, "#d946ef", 12);
              sfx.bossPatternFire();
            }
          }

          const px = engine.player.x + engine.player.width / 2;
          const py = engine.player.y + engine.player.height / 2;
          const bx = b.x + b.width / 2;
          const by = b.y + b.height / 2;
          const dx = bx - px;
          const dy = by - py;
          const dist = Math.hypot(dx, dy);

          if (dist > 10 && dist < 260 && !engine.player.isDead) {
            const pullStrength = 125 * (1 - dist / 260);
            engine.player.x += (dx / dist) * pullStrength * dt;
            engine.player.y += (dy / dist) * pullStrength * dt;
            if (Math.random() < 0.1) {
              engine.spawnExplosion(
                engine.player.x + Math.random() * engine.player.width,
                engine.player.y + Math.random() * engine.player.height,
                "#c084fc",
                1,
              );
            }
          }
        }

        // J. Splitting Pellet
        if (b.type === "splitting_pellet") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;

          const px = engine.player.x + engine.player.width / 2;
          const py = engine.player.y + engine.player.height / 2;
          const bx = b.x + b.width / 2;
          const by = b.y + b.height / 2;
          const dist = Math.hypot(px - bx, py - by);

          if ((dist < 150 || b.age > 1.8) && !engine.player.isDead) {
            b.active = false;
            sfx.bossPatternFire();
            const count = 8;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2 + b.age;
              const sub = new Bullet();
              sub.x = bx - 4;
              sub.y = by - 4;
              sub.width = 8;
              sub.height = 8;
              sub.vx = Math.cos(angle) * 230;
              sub.vy = Math.sin(angle) * 230;
              sub.isEnemy = true;
              sub.color = "#34d399";
              sub.type = "pellet";
              engine.bullets.push(sub);
            }
            engine.spawnExplosion(bx, by, "#34d399", 5);
          }
        }

        // K. Reverse Gravity Bullet
        if (b.type === "reverse_gravity_bullet") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;
          if (b.age < 1.0) {
            b.vy -= 180 * dt; // decel downwards
          } else {
            b.vy -= 240 * dt; // accelerate back upwards!
          }
        }

        // L. Colliding Orb
        if (b.type === "colliding_orb") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;

          // bounce off left/right walls
          if (b.x < 0) {
            b.vx = Math.abs(b.vx);
            b.x = 0;
            sfx.bossPatternFire();
          } else if (b.x + b.width > engine.canvas.width) {
            b.vx = -Math.abs(b.vx);
            b.x = engine.canvas.width - b.width;
            sfx.bossPatternFire();
          }

          // spawn small bullet sparks periodically
          b.shootTimer = (b.shootTimer || 0) + dt;
          if (b.shootTimer > 0.15) {
            b.shootTimer = 0;
            const sub = new Bullet();
            const bx = b.x + b.width / 2;
            const by = b.y + b.height / 2;
            sub.x = bx - 4;
            sub.y = by - 4;
            sub.width = 8;
            sub.height = 8;
            sub.vx = (Math.random() - 0.5) * 160;
            sub.vy = 120 + Math.random() * 80;
            sub.isEnemy = true;
            sub.color = "#f472b6";
            engine.bullets.push(sub);
          }
        }

        if (b.type === "recall_shard") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;
          if (b.fuseTimer === undefined) b.fuseTimer = 0;
          b.fuseTimer -= dt;
          const postStopAge = -b.fuseTimer;

          if (b.fuseTimer > 0) {
            // Keep the original speed and direction during the 7 second spread phase.
          } else if (postStopAge < 1.0) {
            const brake = Math.pow(0.045, dt);
            b.vx *= brake;
            b.vy *= brake;
          } else if (postStopAge < 2.0) {
            b.vx = 0;
            b.vy = 0;
          } else if (engine.bossEntity) {
            const tx = engine.bossEntity.x + engine.bossEntity.width / 2;
            const ty = engine.bossEntity.y + engine.bossEntity.height / 2;
            const bx = b.x + b.width / 2;
            const by = b.y + b.height / 2;
            const dx = tx - bx;
            const dy = ty - by;
            const dist = Math.hypot(dx, dy) || 1;
            const targetVx = (dx / dist) * 320;
            const targetVy = (dy / dist) * 320;
            b.vx += (targetVx - b.vx) * 0.065;
            b.vy += (targetVy - b.vy) * 0.065;
            if (dist < 34) {
              b.active = false;
              engine.spawnExplosion(tx, ty, "#67e8f9", 3);
            }
          }

          if (b.age > 16.5) b.active = false;
        }

        if (b.type === "void_mine") {
          if (b.age === undefined) b.age = 0;
          b.age += dt;
          b.vx *= 0.94;
          b.vy *= 0.94;
          if (b.fuseTimer === undefined) b.fuseTimer = 0.75;
          b.fuseTimer -= dt;

          const bx = b.x + b.width / 2;
          const by = b.y + b.height / 2;
          const px = engine.player.x + engine.player.width / 2;
          const py = engine.player.y + engine.player.height / 2;
          const dist = Math.hypot(px - bx, py - by);
          if (b.fuseTimer <= 0 || dist < 70) {
            b.active = false;
            engine.spawnExplosion(bx, by, "#14b8a6", 12);
            if (dist < 92) options.hitPlayerFromBossHazard();

            for (let i = 0; i < 5; i++) {
              const angle = (i / 5) * Math.PI * 2 + b.age * 2.0;
              const shard = new Bullet();
              shard.x = bx - 5;
              shard.y = by - 5;
              shard.width = 10;
              shard.height = 22;
              shard.vx = Math.cos(angle) * 260;
              shard.vy = Math.sin(angle) * 260;
              shard.isEnemy = true;
              shard.type = "needle";
              shard.color = i % 2 === 0 ? "#2dd4bf" : "#a7f3d0";
              engine.bullets.push(shard);
            }
          }
        }
      }

      if (!b.isEnemy && b.type === "satellite_bullet") {
        if (b.companionIndex === 1) {
          if (b.age === undefined) b.age = 0;
          b.age += dt;
          b.vx = Math.sin(b.age * 22) * 220;
        } else if (b.companionIndex === 2) {
          let nearestEnemy: Entity | null = null;
          let minDist = 380;
          engine.enemies.forEach((e) => {
            if (e.hp > 0 && e.y < engine.canvas.height) {
              const d = Math.hypot(e.x + e.width / 2 - b.x, e.y + e.height / 2 - b.y);
              if (d < minDist) {
                minDist = d;
                nearestEnemy = e;
              }
            }
          });
          if (nearestEnemy) {
            const enemy: Entity = nearestEnemy;
            const targetX = enemy.x + enemy.width / 2;
            const targetY = enemy.y + enemy.height / 2;
            const dx = targetX - b.x;
            const dy = targetY - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 10) {
              const targetVx = (dx / dist) * 650;
              const targetVy = (dy / dist) * 650;
              b.vx += (targetVx - b.vx) * 0.14;
              b.vy += (targetVy - b.vy) * 0.14;
            }
          }
        } else if (b.companionIndex === 3) {
          if (Math.random() < 0.28) {
            const p = new Particle();
            p.x = b.x + b.width / 2;
            p.y = b.y + b.height / 2;
            p.vx = (Math.random() - 0.5) * 60;
            p.vy = (Math.random() - 0.5) * 60 + 60;
            p.color = "#f97316";
            p.size = Math.random() * 3.5 + 1.5;
            p.life = p.maxLife = 0.4;
            engine.particles.push(p);
          }
        }
      }

      const speedMult = b.isEnemy ? (options.isStoryMode ? 0.62 : 0.8) : 1.0;
      b.x += b.vx * speedMult * dt;
      b.y += b.vy * speedMult * dt;

      if (b.active && b.isEnemy && b.type === "electric_missile") {
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        engine.bossElectricTrails.push({
          x1: prevCx,
          y1: prevCy,
          x2: cx,
          y2: cy,
          life: 0.95,
          maxLife: 0.95,
          width: 24,
        });
      }

      if (b.active && b.isEnemy && b.type === "tail_rocket") {
        b.shootTimer = (b.shootTimer || 0) + dt;
        if (b.shootTimer > 0.11) {
          b.shootTimer = 0;
          engine.bossTailMines.push({
            x: prevCx,
            y: prevCy,
            radius: 20,
            age: 0,
            warnTime: 0.34 + Math.random() * 0.18,
            fireTime: 0.12,
          });
        }
      }

      // Crystal sparkling residual particles (연기나 빛가루 잔상)
      if (b.active && b.isEnemy && (b.type === "crystal" || b.type === "ricochet")) {
        if (Math.random() < 0.28) {
          const p = new Particle();
          p.x = b.x + b.width / 2;
          p.y = b.y + b.height / 2;
          p.width = Math.random() * 3 + 2;
          p.height = p.width;
          const a = Math.random() * Math.PI * 2;
          const speed = Math.random() * 25 + 5;
          p.vx = -b.vx * 0.12 + Math.cos(a) * speed;
          p.vy = -b.vy * 0.12 + Math.sin(a) * speed;
          p.color = Math.random() < 0.5 ? "#f43f5e" : "#ef4444";
          p.size = p.width;
          p.maxLife = Math.random() * 0.35 + 0.15;
          p.life = p.maxLife;
          engine.particles.push(p);
        }
      }

      if (
        b.y < -100 ||
        b.y > engine.canvas.height + 100 ||
        b.x < (b.type === "recall_shard" ? -260 : -100) ||
        b.x > engine.canvas.width + (b.type === "recall_shard" ? 260 : 100)
      ) {
        b.active = false;
      }
    });
    engine.bullets = engine.bullets.filter((b) => b.active);
  
}
