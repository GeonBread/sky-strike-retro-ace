/**
 * 일반 몬스터 이동·공격 시스템
 *
 * 이 파일은 일반 몬스터의 이동 패턴, 공격 타이머, 특수 몬스터 행동,
 * 잉크 구름 같은 몬스터 공격 잔류 효과 갱신을 담당한다.
 * 일반 몬스터 패턴, 이동 속도, 공격 주기, 특수 몬스터 행동을 수정할 때 이 파일을 수정한다.
 */

import { Bullet, Enemy, InkCloud } from "../entities";
import { sfx } from "../AudioSystem";
import { intersects as boxesIntersect } from "../utils/geometry";
import { applyHobanwooEnemyBulletVisualSystem } from "../data/hobanwooEnemyBulletVisualCatalog";

const MAX_CHAPTER = 4;

type EnemyMovementRuntime = any;

/**
 * 활성 일반 몬스터와 보스 등장 전 정리 상태를 갱신하고, 각 몬스터 타입별 이동·공격 행동을 적용한다.
 * 이 함수는 몬스터 배열, 탄환 배열, 보스 등장 전환 상태, 몬스터 부속 위성 상태를 갱신한다.
 */
export function updateEnemyMovementAndAttackSystem(engine: EnemyMovementRuntime, dt: number) {
  if (engine.state === "BOSSPHASE2CUTSCENE" || engine.state === "BOSSPHASE3CUTSCENE") {
    engine.enemies.forEach((e) => {
      if (e.type !== "boss") {
        e.vy = -450;
        if (e.vx === 0) {
          e.vx = e.x + e.width / 2 < engine.canvas.width / 2 ? -180 : 180;
        } else {
          e.vx = e.vx < 0 ? -260 : 260;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.y < -120 || e.x < -100 || e.x > engine.canvas.width + 100) {
          e.active = false;
        }
        e.lastShot = -999;
        e.shootTimer = 0;
      } else {
        e.lastShot = -999;
        e.shootTimer = 0;
      }
    });
    engine.enemies = engine.enemies.filter((e) => e.active);
    return;
  }

  if (engine.clearingForBoss) {
    engine.enemies.forEach((e) => {
      if (e.type !== "boss") {
        e.vy = -450;
        if (e.vx === 0) {
          e.vx = e.x + e.width / 2 < engine.canvas.width / 2 ? -180 : 180;
        } else {
          e.vx = e.vx < 0 ? -260 : 260;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.y < -120 || e.x < -100 || e.x > engine.canvas.width + 100) {
          e.active = false;
        }
        e.lastShot = -999;
      }
    });

    engine.enemies.forEach((e) => {
      if (!e.active && e.type === "satellite_shield") {
        e.satellites.forEach((b) => {
          b.active = false;
        });
        e.satellites = [];
      }
    });
    engine.enemies = engine.enemies.filter((e) => e.active);

    if (engine.enemies.length === 0) {
      engine.clearingForBoss = false;
      engine.bossActive = true;
      engine.state = "BOSSCUTSCENE";
      engine.cutsceneTimer = 3.5;
      if (engine.onCutsceneChange) engine.onCutsceneChange(true);

      const b = new Enemy();
      b.type = "boss";
      const bossTier = Math.min(MAX_CHAPTER, engine.stage);
      sfx.startBgmForPhase(bossTier);
      b.width = bossTier >= 4 ? 220 : bossTier === 3 ? 200 : bossTier === 2 ? 150 : 120;
      b.height = bossTier >= 4 ? 165 : bossTier === 3 ? 150 : bossTier === 2 ? 110 : 90;
      b.x = engine.canvas.width / 2 - b.width / 2;
      b.y = -120;
      b.vx = engine.isStoryMode() ? 90 : 150;
      b.vy = engine.isStoryMode() ? 45 : 60;
      b.hp = engine.getBossMaxHp(bossTier);
      b.phase = 0;
      engine.bossPhase2Active = bossTier === 2;
      engine.bossPhase3Active = bossTier >= 3;
      engine.bossPhase2Triggered = bossTier >= 2;
      engine.bossPhase3Triggered = bossTier >= 3;
      b.leftTurretHp = bossTier >= 4 ? 220 : bossTier === 3 ? 150 : bossTier === 2 ? 70 : 45;
      b.rightTurretHp = bossTier >= 4 ? 220 : bossTier === 3 ? 150 : bossTier === 2 ? 70 : 45;
      if (engine.isStoryMode()) {
        b.leftTurretActive = false;
        b.rightTurretActive = false;
        engine.storyStageTimer = 0;
      }
      engine.enemies.push(b);
      engine.bossEntity = b;
    }
    return;
  }

  if (!engine.isStoryMode() && engine.bossActive && engine.bossEntity) {
    if (engine.bossEntity.phase >= 1) {
      // Skip summoning during very first intro moment
      if (!engine.player.isDead) {
        engine.squadTimer -= dt;
      }
      if (engine.squadTimer <= 0) {
        engine.squadTimer = Math.random() * 3 + 6.0; // every 6-9s
        engine.summonBossSquad();
      }
    }
  }

  engine.enemies.forEach((e) => {
    if (e.counterTimer && e.counterTimer > 0) {
      e.counterTimer -= dt;
    }

    // Firing increment (prevent shooting when player is dead)
    if (engine.player.isDead) {
      e.lastShot = 0;
      e.shootTimer = 0;
    } else {
      e.lastShot += dt * (engine.isStoryMode() ? (e.type === "boss" ? 0.68 : 0.52) : 1);
    }

    if (e.type === "boss") {
      // Ensure the boss never gets stuck horizontally with vx = 0
      if (e.vx === 0) {
        e.vx = Math.random() < 0.5 ? -150 : 150;
      }

      // Groggy/Stun state tracking
      if (e.bossStunTimer > 0) {
        e.bossStunTimer -= dt;
        if (e.bossStunTimer <= 0) {
          // Cascade-launch any remaining frozen bullets on stun recovery
          engine.bullets.forEach((b) => {
            if (b.isEnemy && b.type === "dilation_bullet" && b.dilationState === "frozen") {
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
          });

          engine.resetBossPattern(e);
          engine.assignNextBossPhase(e);
        }
        if (Math.random() < 0.25) {
          engine.spawnExplosion(
            e.x + Math.random() * e.width,
            e.y + Math.random() * e.height,
            "#eab308",
            2,
          );
        }
        return;
      }

      e.patternTimer += dt;

      // Complex AI state machine
      let canTransition = true;
      if (e.phase === 0) {
        canTransition = false;
      }
      if (e.patternTimer > e.phaseDuration) {
        if (e.phase === 1) {
          if (e.patternTimer < 3.0) canTransition = false;
        } else if (e.phase === 2) {
          if (e.rapidFireCount % 20 !== 0) canTransition = false;
        } else if (e.phase === 8) {
          const cycle = e.patternTimer % 1.8;
          if (cycle > 0.15 && cycle < 1.65) canTransition = false;
        } else if (e.phase === 12) {
          const cycle = (e.shootTimer || 0) % 2.8;
          if (cycle > 0.1 && cycle < 2.6) canTransition = false;
        } else if (e.phase === 13) {
          if (e.patternTimer < 2.7) canTransition = false;
        } else if (e.phase === 14) {
          const cycle = (e.shootTimer || 0) % 2.8;
          if (cycle > 0.1 && cycle < 2.6) canTransition = false;
        } else if (e.phase === 17) {
          const cycle = (e.shootTimer || 0) % 2.8;
          if (cycle > 0.1 && cycle < 2.7) canTransition = false;
        } else if (e.phase === 19) {
          const cycle = (e.shootTimer || 0) % 4.2;
          if (cycle > 0.15 && cycle < 3.8) canTransition = false;
        } else if (e.phase === 20) {
          if (e.burstCount < 10 || engine.bossElectricTrails.length > 0) canTransition = false;
        } else if (e.phase === 21) {
          if (engine.bossSuicideDrones.length > 0) canTransition = false;
        } else if (e.phase === 23) {
          if (engine.bossGridLasers.length > 0) canTransition = false;
        } else if (e.phase === 24) {
          if (engine.bossDashState !== null || e.rapidFireCount < e.spawnPoint) canTransition = false;
        } else if (e.phase === 47) {
          if (engine.bossSafeZoneBlasts.length > 0) canTransition = false;
        } else if (e.phase === 49) {
          if (engine.bossAfterimageSlashes.length > 0 || e.rapidFireCount < e.spawnPoint) canTransition = false;
        } else if (e.phase === 50) {
          if (engine.bossCompressionField !== null) canTransition = false;
        } else if (e.phase === 32) {
          if (engine.bossCompressionField !== null) canTransition = false;
        } else if (e.phase === 44) {
          if (engine.bullets.some((b) => b.active && b.isEnemy && b.type === "recall_shard")) canTransition = false;
        } else if (e.phase === 28) {
          const cycleLength = 4.6;
          const completedCycles = Math.floor((e.shootTimer || 0) / cycleLength);
          const cycle = (e.shootTimer || 0) % cycleLength;
          if (completedCycles < e.spawnPoint || cycle > 0.1 && cycle < 3.35) canTransition = false;
        } else if (e.phase === 51) {
          if (engine.bossEdgeStrikers.length > 0) canTransition = false;
        } else if (e.phase === 52) {
          if (engine.bossMazeState !== null) canTransition = false;
        }
      }

      if (e.patternTimer > e.phaseDuration && canTransition) {
        // Cascade-launch any remaining frozen bullets on pattern transition
        engine.bullets.forEach((b) => {
          if (b.isEnemy && b.type === "dilation_bullet" && b.dilationState === "frozen") {
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
        });

        engine.resetBossPattern(e);
        engine.assignNextBossPhase(e);
      }

      if (e.phase === 0) {
        // intro done, chilling momentarily
      } else if (e.phase === 1) {
        // Dash forward
        if (e.patternTimer < 1.0) e.y += 200 * dt;
        else if (e.patternTimer < 2.0) {
          /* hold */
        } else if (e.patternTimer < 3.0) {
          e.y -= 200 * dt;
        } else {
          e.y = Math.max(80, e.y - 100 * dt);
        }

        // Fire 360 at peak
        if (
          e.patternTimer > 1.2 &&
          e.patternTimer < 2.0 &&
          e.lastShot > 0.4
        ) {
          e.lastShot = 0;
          engine.fireBoss360Burst(e);
        }
      } else if (e.phase === 2) {
        // Rapid fire barrage
        e.x += e.vx * 0.5 * dt; // slow drift
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        if (e.lastShot > 0.2 && e.rapidFireCount < 100) {
          // machine gun
          e.lastShot = 0;
          e.rapidFireCount++;
          engine.fireBossRapid(e);
        }
      } else if (e.phase === 3) {
        // Normal horizontal and combos
        e.x += e.vx * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        if (e.lastShot > 0.6) {
          e.lastShot = 0;
          engine.triggerBossBulletCombos(e);
        }
      } else if (e.phase === 4) {
        // Spiral pattern
        e.x += e.vx * 0.2 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;
        if (e.lastShot > 0.1) {
          e.lastShot = 0;
          e.rapidFireCount++;
          const a = e.rapidFireCount * 0.4;
          const blt = new Bullet();
          blt.x = e.x + e.width / 2;
          blt.y = e.y + e.height / 2;
          blt.vx = Math.cos(a) * 200;
          blt.vy = Math.sin(a) * 200;
          blt.isEnemy = true;
          blt.color = "#10b981";
          blt.width = 14;
          blt.height = 14;
          engine.bullets.push(blt);
        }
      } else if (e.phase === 5) {
        // Waving arcs
        e.x += e.vx * 0.8 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;
        if (e.lastShot > 0.6) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;
          for (let i = 0; i < 7; i++) {
            const a =
              Math.PI / 2 +
              (i - 3) * 0.2 +
              Math.sin(performance.now() * 0.005) * 0.2;
            const blt = new Bullet();
            blt.x = cx;
            blt.y = cy;
            blt.vx = Math.cos(a) * 250;
            blt.vy = Math.sin(a) * 250;
            blt.isEnemy = true;
            blt.color = "#38bdf8";
            blt.width = 14;
            blt.height = 14;
            engine.bullets.push(blt);
          }
        }
      } else if (e.phase === 6) {
        // Double Cross Target Shotgun
        e.x += e.vx * 0.5 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;
        if (e.lastShot > 1.2) {
          e.lastShot = 0;
          const tx = engine.player.isDead
            ? engine.canvas.width / 2
            : engine.player.x + engine.player.width / 2;
          const ty = engine.player.isDead
            ? engine.canvas.height - 100
            : engine.player.y + engine.player.height / 2;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          const aToPlayer = Math.atan2(ty - cy, tx - cx);
          for (let i = 0; i < 7; i++) {
            const a = aToPlayer + (i - 3) * 0.15;
            const blt = new Bullet();
            blt.x = cx;
            blt.y = cy;
            blt.vx = Math.cos(a) * 350;
            blt.vy = Math.sin(a) * 350;
            blt.isEnemy = true;
            blt.color = "#f43f5e";
            blt.width = 16;
            blt.height = 16;
            engine.bullets.push(blt);
          }
        }
      } else if (e.phase === 7) {
        // Boss Line Wall Pattern (공간 제약형 / 틈새 벽 생성)
        e.x += e.vx * 0.3 * dt;
        if (e.x < 20 || e.x > engine.canvas.width - e.width - 20) e.vx *= -1;

        if (e.lastShot > 1.3) {
          e.lastShot = 0;
          const cy = e.y + e.height + 6;
          const spacing = 28;
          const countOfBullets = Math.floor(engine.canvas.width / spacing);
          const gapIndex1 =
            Math.floor(Math.random() * (countOfBullets - 4)) + 1;
          const gapIndex2 =
            (gapIndex1 + Math.floor(countOfBullets / 2)) %
            (countOfBullets - 2);

          for (let i = 0; i < countOfBullets; i++) {
            if (i >= gapIndex1 && i <= gapIndex1 + 1) continue; // Gap 1
            if (i >= gapIndex2 && i <= gapIndex2 + 1) continue; // Gap 2

            const bx = 12 + i * spacing;
            const blt = new Bullet();
            blt.x = bx;
            blt.y = cy;
            blt.width = 12;
            blt.height = 12;
            blt.vx = 0;
            blt.vy = 240; // falls straight down
            blt.isEnemy = true;
            blt.color = "#eab308";
            engine.bullets.push(blt);
          }
        }
      } else if (e.phase === 8) {
        // Boss Delayed Expansion Homing Charges (시간차 공격 패턴)
        e.x += e.vx * 0.25 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        const cycle = e.patternTimer % 1.8;
        if (cycle < 0.65 && e.lastShot > 0.16) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height + 15;
          const count = 6;
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + cycle * 2.5;
            const blt = new Bullet();
            blt.x = cx + Math.cos(a) * 30;
            blt.y = cy + Math.sin(a) * 30;
            blt.width = 12;
            blt.height = 12;
            blt.vx = Math.cos(a) * 55;
            blt.vy = Math.sin(a) * 55;
            blt.isEnemy = true;
            blt.type = "delayed";
            blt.homingTimer = 0.85; // float around before launching
            blt.color = "#ec4899";
            engine.bullets.push(blt);
          }
        }
      } else if (e.phase === 9) {
        // Boss Spiral Blossom (수학적 원형 나선형 회전 탄막)
        e.x += e.vx * 0.15 * dt;
        if (e.x < 20 || e.x > engine.canvas.width - e.width - 20) e.vx *= -1;

        if (e.lastShot > 0.08) {
          e.lastShot = 0;
          e.rapidFireCount++;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;

          const baseAngle = e.rapidFireCount * 0.16;
          for (let arm = 0; arm < 3; arm++) {
            const a = baseAngle + (arm * Math.PI * 2) / 3;
            const blt = new Bullet();
            blt.x = cx;
            blt.y = cy;
            blt.width = 12;
            blt.height = 12;
            blt.vx = Math.cos(a) * 240;
            blt.vy = Math.sin(a) * 240;
            blt.isEnemy = true;
            blt.color = "#10b981";
            engine.bullets.push(blt);
          }
        }
      } else if (e.phase === 10) {
        // ① Blooming Vortex Resonance (환상향의 개화)
        e.x += e.vx * 0.12 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        if (e.lastShot > 0.08) {
          e.lastShot = 0;
          e.rapidFireCount++;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;

          const omega = 0.22;
          const angle1 = e.rapidFireCount * omega;
          const angle2 = -e.rapidFireCount * omega;

          const arms = 3;
          for (let i = 0; i < arms; i++) {
            const baseOffset = (i * Math.PI * 2) / arms;

            // Layer 1 (omega * t)
            const b1 = new Bullet();
            b1.x = cx - 6;
            b1.y = cy - 6;
            b1.width = 12;
            b1.height = 12;
            b1.vx = Math.cos(angle1 + baseOffset) * 220;
            b1.vy = Math.sin(angle1 + baseOffset) * 220;
            b1.isEnemy = true;
            b1.color = "#3b82f6";
            engine.bullets.push(b1);

            // Layer 2 (-omega * t)
            const b2 = new Bullet();
            b2.x = cx - 6;
            b2.y = cy - 6;
            b2.width = 12;
            b2.height = 12;
            b2.vx = Math.cos(angle2 + baseOffset) * 220;
            b2.vy = Math.sin(angle2 + baseOffset) * 220;
            b2.isEnemy = true;
            b2.color = "#f43f5e";
            engine.bullets.push(b2);
          }
        }
      } else if (e.phase === 11) {
        // ② Gravitational Pull & Snake (중력 붕괴 및 가속 스네이크)
        e.x += e.vx * 0.35 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        if (e.lastShot > 1.8) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;

          const b = new Bullet();
          b.x = cx - 20;
          b.y = cy - 20;
          b.width = 40;
          b.height = 40; // extra large!
          b.vx = (engine.player.x - cx) * 0.1;
          b.vy = 80;
          b.isEnemy = true;
          b.type = "gravity_ball";
          b.color = "#c084fc";
          engine.bullets.push(b);

          sfx.bossHit();
        }
      } else if (e.phase === 12) {
        // ③ Spatial Grid Laser & Cross-hairs (공간 절단 레이저 & 교차 격자)
        e.x += e.vx * 0.05 * dt;

        if (e.shootTimer === undefined) e.shootTimer = 0;
        e.shootTimer += dt;

        const cycle = e.shootTimer % 2.8;
        engine.playBossLaserSoundOncePerCycle(e, e.shootTimer, 2.8, 1.8);

        let xPositions: number[] = [];
        let yPositions: number[] = [];

        // Parts-destruction logic: laser severity drops when turrets break!
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
        } else {
          // BOTH wings destroyed => NO lasers! (Complete tactical relief)
          xPositions = [];
          yPositions = [];
        }

        if (cycle >= 1.8 && cycle < 2.5) {
          const px = engine.player.x + engine.player.width / 2;
          const py = engine.player.y + engine.player.height / 2;

          let hitByLaser = false;
          const halfWidth = 14;

          xPositions.forEach((lx) => {
            if (Math.abs(px - lx) < engine.player.hitWidth! / 2 + halfWidth) {
              hitByLaser = true;
            }
          });
          yPositions.forEach((ly) => {
            if (Math.abs(py - ly) < engine.player.hitHeight! / 2 + halfWidth) {
              hitByLaser = true;
            }
          });

          if (
            hitByLaser &&
            engine.player.invulnTimer <= 0 &&
            !engine.player.isDead
          ) {
            engine.triggerPlayerHit();
          }
        }

        if (e.lastShot > 0.85) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;
          const tx = engine.player.x + engine.player.width / 2;
          const ty = engine.player.y + engine.player.height / 2;
          const targetAngle = Math.atan2(ty - cy, tx - cx);

          for (let i = -1; i <= 1; i++) {
            const a = targetAngle + i * 0.18;
            const b = new Bullet();
            b.x = cx - 4;
            b.y = cy - 4;
            b.width = 8;
            b.height = 8;
            b.vx = Math.cos(a) * 180;
            b.vy = Math.sin(a) * 180;
            b.isEnemy = true;
            b.color = "#ef4444";
            engine.bullets.push(b);
          }
        }
      } else if (e.phase === 13) {
        // ④ Time-Dilation Paradox (시간 왜곡 탄막)
        e.x += e.vx * 0.1 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        const timeInPhase = e.patternTimer;

        // Firing rings (0s to 1.6s)
        if (timeInPhase < 1.6 && e.lastShot > 0.12) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 1.5;

          const count = 12;
          const baseOffset = e.rapidFireCount * 0.18;
          e.rapidFireCount++;

          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + baseOffset;
            const b = new Bullet();
            b.x = cx - 5;
            b.y = cy - 5;
            b.width = 10;
            b.height = 10;
            b.vx = Math.cos(angle) * 380;
            b.vy = Math.sin(angle) * 380;
            b.isEnemy = true;
            b.type = "dilation_bullet";
            b.dilationState = "flying";
            b.dilationAge = 0;
            b.color = "#22d3ee";
            engine.bullets.push(b);
          }
        }

        // Acceleration paradox snap trigger
        if (timeInPhase >= 2.5) {
          let launchedCount = 0;
          engine.bullets.forEach((b) => {
            if (
              b.isEnemy &&
              b.type === "dilation_bullet" &&
              b.dilationState === "frozen"
            ) {
              b.dilationState = "launched";
              const dx = engine.player.x + engine.player.width / 2 - b.x;
              const dy = engine.player.y + engine.player.height / 2 - b.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 1) {
                b.vx = (dx / dist) * 440;
                b.vy = (dy / dist) * 440;
              }
              b.color = "#f97316";
              launchedCount++;
            }
          });
          if (launchedCount > 0) {
            if (timeInPhase < 2.7) {
              sfx.bossPatternFire();
              engine.spawnExplosion(
                e.x + e.width / 2,
                e.y + e.height / 2,
                "#f97316",
                30,
              );
            } else {
              sfx.hit();
              engine.spawnExplosion(
                e.x + e.width / 2,
                e.y + e.height / 2,
                "#f97316",
                6,
              );
            }
          }
        }
      } else if (e.phase === 14) {
        // Overdrive Phase 14: Center Grid Lasers and Dilation singularity (조준탄의 변칙화 & 유언탄 탑재)
        e.x += e.vx * 0.08 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        if (e.shootTimer === undefined) e.shootTimer = 0;
        e.shootTimer += dt;

        const cycle = e.shootTimer % 2.8;
        engine.playBossLaserSoundOncePerCycle(e, e.shootTimer, 2.8, 1.8);
        const cycleIndex = Math.floor(e.shootTimer / 2.8);

        if (e.lastCycleIndex !== cycleIndex || !e.gridLasersX || !e.gridLasersY) {
          e.lastCycleIndex = cycleIndex;
          // Generate 3 randomized laser positions that don't overlap (distance >= 100 px)
          const generatePositions = (maxVal: number) => {
            const list: number[] = [];
            let attempts = 0;
            while (list.length < 3 && attempts < 200) {
              attempts++;
              const pos = Math.random() * (maxVal - 165) + 80;
              if (list.every(p => Math.abs(p - pos) >= 100)) {
                list.push(pos);
              }
            }
            // Direct fallback if it gets stuck
            while (list.length < 3) {
              list.push(Math.random() * (maxVal - 165) + 80);
            }
            return list.sort((a, b) => a - b);
          };
          e.gridLasersX = generatePositions(engine.canvas.width);
          e.gridLasersY = generatePositions(engine.canvas.height);
        }

        const xPositions = e.gridLasersX;
        const yPositions = e.gridLasersY;

        if (cycle >= 1.8 && cycle < 2.5) {
          // Check laser collisions on the player
          const px = engine.player.x + engine.player.width / 2;
          const py = engine.player.y + engine.player.height / 2;

          let hitByLaser = false;
          const halfWidth = 14;

          xPositions.forEach((lx) => {
            if (Math.abs(px - lx) < engine.player.hitWidth! / 2 + halfWidth) {
              hitByLaser = true;
            }
          });
          yPositions.forEach((ly) => {
            if (Math.abs(py - ly) < engine.player.hitHeight! / 2 + halfWidth) {
              hitByLaser = true;
            }
          });

          if (
            hitByLaser &&
            engine.player.invulnTimer <= 0 &&
            !engine.player.isDead
          ) {
            engine.triggerPlayerHit();
          }
        }

        // Firing heavy singularity bullets frequently with varied split timing.
        if (e.lastShot > 0.52) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;
 
          // Target player with splitting parent cross bullets
          const px = engine.player.x + engine.player.width / 2;
          const py = engine.player.y + engine.player.height / 2;
          const angleRef = Math.atan2(py - cy, px - cx);
 
          const b = new Bullet();
          b.x = cx - 12;
          b.y = cy - 12;
          b.width = 24;
          b.height = 24;
          b.vx = Math.cos(angleRef) * 230;
          b.vy = Math.sin(angleRef) * 230;
          b.isEnemy = true;
          b.type = "parent_cross"; // Splits on proxy
          b.color = "#ef4444";
          b.parentAngle = angleRef;
          b.age = 0;
          b.fuseTimer = 0.35 + Math.random() * 0.95;
          engine.bullets.push(b);

          if (Math.random() < 0.45) {
            const r = new Bullet();
            r.x = cx - 7;
            r.y = cy - 7;
            r.width = 14;
            r.height = 14;
            const offset = (Math.random() - 0.5) * 0.55;
            r.vx = Math.cos(angleRef + offset) * 320;
            r.vy = Math.sin(angleRef + offset) * 320;
            r.isEnemy = true;
            r.type = "ricochet";
            r.bounceCount = 0;
            r.color = "#facc15";
            engine.bullets.push(r);
          }
        }
      } else if (e.phase === 15) {
        // Overdrive Phase 15: Crimson Radial Spiral Barrage with Passive Parent Division
        e.x += e.vx * 0.18 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        if (e.lastShot > 0.32) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 1.5;

          // Continuous rotating spiral streams
          const count = 4;
          const baseOffset = e.rapidFireCount * 0.28;
          e.rapidFireCount++;

          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + baseOffset;
            const b = new Bullet();
            b.x = cx - 5;
            b.y = cy - 5;
            b.width = 10;
            b.height = 10;
            b.vx = Math.cos(angle) * 350; // 1.5x velocity multiplier!
            b.vy = Math.sin(angle) * 350;
            b.isEnemy = true;

            // 1 in 3 bullets split into 5-way spread dynamically
            if (Math.random() < 0.35) {
              b.type = "parent_nsplit";
              b.color = "#f43f5e";
              b.age = 0;
              b.fuseTimer = 0.95;
            } else {
              b.type = "normal";
              b.color = "#fb923c";
            }
            engine.bullets.push(b);
          }
        }
      } else if (e.phase === 16) {
        // Overdrive Phase 16: Chaos Overdrive (지옥의 2페이즈 각성 패턴 난사)
        e.x += e.vx * 0.25 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        if (e.lastShot > 0.6) { // Changed rate to 0.6s as requested!
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;

          // Target player with ricochet bouncing bullets
          const tx = engine.player.x + engine.player.width / 2;
          const ty = engine.player.y + engine.player.height / 2;
          const angleToPlayer = Math.atan2(ty - cy, tx - cx);

          // 3-way ricochet spread that bounce off the walls (1.5x speed)
          for (let i = -1; i <= 1; i++) {
            const b = new Bullet();
            b.x = cx - 5;
            b.y = cy - 5;
            b.width = 10;
            b.height = 10;
            const offsetAngle = angleToPlayer + i * 0.35;
            b.vx = Math.cos(offsetAngle) * 330;
            b.vy = Math.sin(offsetAngle) * 330;
            b.isEnemy = true;
            b.type = "ricochet";
            b.bounceCount = 0;
            b.color = "#fbbf24";
            engine.bullets.push(b);
          }

          // Heavy fire from wings
          if (e.leftTurretActive) {
            const bLeft = new Bullet();
            bLeft.x = e.x - 14;
            bLeft.y = e.y + e.height - 15;
            bLeft.width = 8;
            bLeft.height = 8;
            const leftAngle = angleToPlayer - 0.2;
            bLeft.vx = Math.cos(leftAngle) * 420;
            bLeft.vy = Math.sin(leftAngle) * 420;
            bLeft.isEnemy = true;
            bLeft.color = "#a855f7";
            engine.bullets.push(bLeft);
          }
          if (e.rightTurretActive) {
            const bRight = new Bullet();
            bRight.x = e.x + e.width + 6;
            bRight.y = e.y + e.height - 15;
            bRight.width = 8;
            bRight.height = 8;
            const rightAngle = angleToPlayer + 0.2;
            bRight.vx = Math.cos(rightAngle) * 420;
            bRight.vy = Math.sin(rightAngle) * 420;
            bRight.isEnemy = true;
            bRight.color = "#a855f7";
            engine.bullets.push(bRight);
          }
        }
      } else if (e.phase === 17) {
        // Overdrive Phase 17: Photon Prism Galaxy Sweep
        e.x += e.vx * 0.15 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        if (e.shootTimer === undefined) e.shootTimer = 0;
        e.shootTimer += dt;

        const cycle = e.shootTimer % 2.8;
        engine.playBossLaserSoundOncePerCycle(e, e.shootTimer, 2.8, 1.8);
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        const px = engine.player.x + engine.player.width / 2;
        const py = engine.player.y + engine.player.height / 2;

        if (e.laserAngle === undefined) {
          e.laserAngle = Math.atan2(py - cy, px - cx);
        }

        if (cycle < 1.2) {
          // Tracking Phase: Keep aiming/pointing at the player's last coordinate
          e.laserAngle = Math.atan2(py - cy, px - cx);
        } else if (cycle >= 1.2 && cycle < 1.8) {
          // Locking / Preparation phase (0.6 seconds lock!)
          // Laser aiming position is strictly locked at the final coordinate reached at 1.2s.
        } else if (cycle >= 1.8 && cycle < 2.5) {
          // Firing Phase (0.7 seconds blast!): Test projection intersection
          const dx = px - cx;
          const dy = py - cy;
          const dirX = Math.cos(e.laserAngle);
          const dirY = Math.sin(e.laserAngle);
          const proj = dx * dirX + dy * dirY;
          if (proj > 0 && proj < 3000) {
            const closestX = cx + proj * dirX;
            const closestY = cy + proj * dirY;
            const distToLaser = Math.hypot(px - closestX, py - closestY);
            if (distToLaser < 22 && engine.player.invulnTimer <= 0 && !engine.player.isDead) {
              engine.triggerPlayerHit();
            }
          }
        }

        // Spurt galaxy swirls
        if (e.lastShot > 0.12) {
          e.lastShot = 0;
          const count = 3;
          // Elegant spiral swing based on cumulative count
          const offset = (e.rapidFireCount++) * 0.15;
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + offset;
            const b = new Bullet();
            b.x = cx - 5;
            b.y = cy - 5;
            b.width = 10;
            b.height = 10;
            b.vx = Math.cos(angle) * 315;
            b.vy = Math.sin(angle) * 315;
            b.isEnemy = true;
            b.type = "crystal";
            b.color = i % 2 === 0 ? "#10b981" : "#06b6d4";
            engine.bullets.push(b);
          }
        }
      } else if (e.phase === 18) {
        // Overdrive Phase 18: Chronos Vortex Detonation & Stardust Cascade
        e.x += e.vx * 0.18 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        if (e.patternTimer === undefined) e.patternTimer = 0;
        e.patternTimer += dt;

        // Double density continuous swirl stardust!
        if (e.lastShot > 0.12) {
          e.lastShot = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;
          const angle = e.patternTimer * 6.0;
          for (let i = 0; i < 4; i++) {
            const b = new Bullet();
            const offsetAngle = angle + (i * Math.PI) / 2;
            b.x = cx - 5;
            b.y = cy - 5;
            b.width = 10;
            b.height = 10;
            // Expand out then curve rapidly down
            b.vx = Math.cos(offsetAngle) * 320;
            b.vy = Math.sin(offsetAngle) * 200 + 130;
            b.isEnemy = true;
            b.type = "pellet";
            b.color = i % 2 === 0 ? "#fb923c" : "#facc15"; 
            engine.bullets.push(b);
          }
        }

        // Dense trap-formation multi-vortex deployment every 1.5/2.5 seconds
        if (e.shootTimer === undefined) e.shootTimer = 0;
        e.shootTimer += dt;
        if (e.shootTimer > 2.5) {
          e.shootTimer = 0;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;
          const px = engine.player.x + engine.player.width / 2;
          const py = engine.player.y + engine.player.height / 2;
          const baseAngle = Math.atan2(py - cy, px - cx);

          // Spawn 5 singularities enveloping the player trajectory
          const angles = [
            baseAngle - 0.45,
            baseAngle - 0.22,
            baseAngle,
            baseAngle + 0.22,
            baseAngle + 0.45,
          ];
          const speeds = [130, 155, 185, 155, 130];

          angles.forEach((ang, idx) => {
            const b = new Bullet();
            b.x = cx - 18;
            b.y = cy - 18;
            b.width = 36;
            b.height = 36;
            b.vx = Math.cos(ang) * speeds[idx];
            b.vy = Math.sin(ang) * speeds[idx];
            b.isEnemy = true;
            b.type = "gravity_singularity"; // gravitational pull vortex
            b.color = idx % 2 === 0 ? "#a855f7" : "#8b5cf6";
            b.fuseTimer = 1.1 + idx * 0.1; // cascading detonation!
            engine.bullets.push(b);
          });
          sfx.bossHit();
          
          // Accompanied by lightning fast targeted sniper shot
          const snip = new Bullet();
          snip.x = cx - 6;
          snip.y = cy - 6;
          snip.width = 12;
          snip.height = 12;
          snip.vx = Math.cos(baseAngle) * 600;
          snip.vy = Math.sin(baseAngle) * 600;
          snip.isEnemy = true;
          snip.color = "#ef4444";
          snip.type = "needle";
          engine.bullets.push(snip);
        }
      } else if (e.phase === 19) {
        // Overdrive Phase 19: Quantum Timeshift Decision Matrix
        e.x += e.vx * 0.08 * dt;
        if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

        if (e.shootTimer === undefined) e.shootTimer = 0;
        e.shootTimer += dt;

        const cycle = e.shootTimer % 4.2; 

        if (cycle < 2.2) {
          // High density wave emission of target-freezing stardust needles
          if (e.lastShot > 0.16) {
            e.lastShot = 0;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height;

            // Fire overlapping waves of dilation arrows
            const count = 11;
            const globalSway = Math.sin(performance.now() * 0.0045) * 0.28;
            for (let i = 0; i < count; i++) {
              const angle = Math.PI * 0.15 + (i / (count - 1)) * Math.PI * 0.7 + globalSway;
              const b = new Bullet();
              b.x = cx - 6;
              b.y = cy - 6;
              b.width = 12;
              b.height = 12;
              b.vx = Math.cos(angle) * (i % 2 === 0 ? 460 : 330);
              b.vy = Math.sin(angle) * (i % 2 === 0 ? 460 : 330);
              b.isEnemy = true;
              b.type = "dilation_bullet";
              b.dilationState = "flying";
              b.dilationAge = 0;
              b.color = i % 2 === 0 ? "#d946ef" : "#f43f5e";
              engine.bullets.push(b);
            }

            // Fire homing pressure pellets intermittently
            if (Math.random() < 0.72) {
              const px = engine.player.x + engine.player.width / 2;
              const py = engine.player.y + engine.player.height / 2;
              const bTarget = new Bullet();
              bTarget.x = cx - 5;
              bTarget.y = cy - 5;
              bTarget.width = 10;
              bTarget.height = 10;
              const targetAngle = Math.atan2(py - cy, px - cx);
              bTarget.vx = Math.cos(targetAngle) * 430;
              bTarget.vy = Math.sin(targetAngle) * 430;
              bTarget.isEnemy = true;
              bTarget.type = "pellet";
              bTarget.color = "#06b6d4"; // icy cyan targeted pellet
              engine.bullets.push(bTarget);
            }
          }
        }

        // Quantum snapping blast - popcorn cascading sequential fire
        if (cycle >= 2.25 && cycle < 3.25) {
          let launchCount = 0;
          engine.bullets.forEach((b) => {
            if (b.isEnemy && b.type === "dilation_bullet" && b.dilationState === "frozen" && Math.random() < 0.28) {
              b.dilationState = "launched";
              const dx = engine.player.x + engine.player.width / 2 - b.x;
              const dy = engine.player.y + engine.player.height / 2 - b.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 1) {
                b.vx = (dx / dist) * 640;
                b.vy = (dy / dist) * 640;
              }
              b.color = "#ec4899"; // Shifts to high energy neon pink
              launchCount++;
            }
          });
          if (launchCount > 0) {
            sfx.bossPatternFire();
            engine.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, "#ec4899", 3);
          }
        }

        // Sweep any leftover frozen quantum bullets right after the main cascading launch window to prevent ANY from remaining stuck!
        if (cycle >= 3.25) {
          let launchCount = 0;
          engine.bullets.forEach((b) => {
            if (b.isEnemy && b.type === "dilation_bullet" && b.dilationState === "frozen") {
              b.dilationState = "launched";
              const dx = engine.player.x + engine.player.width / 2 - b.x;
              const dy = engine.player.y + engine.player.height / 2 - b.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 1) {
                b.vx = (dx / dist) * 640;
                b.vy = (dy / dist) * 640;
              } else {
                b.vy = 640;
              }
              b.color = "#ec4899";
              launchCount++;
            }
          });
          if (launchCount > 0) {
            sfx.bossPatternFire();
            engine.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, "#ec4899", 5);
          }
        }
      } else if (e.phase === 20) {
        engine.runFinalMissileElectricField(e, dt);
      } else if (e.phase === 21) {
        engine.runFinalSuicideDronePattern(e, dt);
      } else if (e.phase === 23) {
        engine.runFinalDenseGridLaser(e, dt);
      } else if (e.phase === 24) {
        engine.runFinalBossDash(e, dt);
      } else if (e.phase === 28) {
        // Final Phase 28: Meteor prism strike - five warning lanes, staggered laser fire.
        if (e.shootTimer === undefined) e.shootTimer = 0;
        e.shootTimer += dt;

        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        const px = engine.player.x + engine.player.width / 2;
        const py = engine.player.y + engine.player.height / 2;
        const cycle = e.shootTimer % 4.6;

        if (e.laserAngle === undefined) {
          e.laserAngle = Math.atan2(py - cy, px - cx);
        }
        if (cycle < 1.35) {
          e.laserAngle = Math.atan2(py - cy, px - cx);
        }

        const phase28Step =
          cycle >= 2.35 && cycle < 2.7 ? 1 :
          cycle >= 2.95 && cycle < 3.3 ? 2 :
          0;
        if (e.lastCycleIndex !== phase28Step) {
          e.lastCycleIndex = phase28Step;
          if (phase28Step > 0) sfx.laserBlast();
        }

        const degree30 = Math.PI / 6;
        const firingOffsets =
          phase28Step === 1 ? [0] :
          phase28Step === 2 ? [-degree30, degree30] :
          [];

        firingOffsets.forEach((offset) => {
          const angle = e.laserAngle! + offset;
          const dx = px - cx;
          const dy = py - cy;
          const dirX = Math.cos(angle);
          const dirY = Math.sin(angle);
          const proj = dx * dirX + dy * dirY;
          if (proj > 0 && proj < 3000) {
            const closestX = cx + proj * dirX;
            const closestY = cy + proj * dirY;
            const distToLaser = Math.hypot(px - closestX, py - closestY);
            if (distToLaser < 24 && engine.player.invulnTimer <= 0 && !engine.player.isDead) {
              engine.triggerPlayerHit();
            }
          }
        });

        if (e.lastShot > 0.22) {
          e.lastShot = 0;
          const meteorCount = Math.random() < 0.45 ? 2 : 1;
          for (let i = 0; i < meteorCount; i++) {
            engine.meteors.push({
              x: 26 + Math.random() * Math.max(1, engine.canvas.width - 52),
              y: -42 - Math.random() * 80,
              radius: 15 + Math.random() * 15,
              vx: (Math.random() - 0.5) * 170,
              vy: 340 + Math.random() * 160,
              hp: 999,
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 3.2,
              active: true,
            });
          }
        }

        if (phase28Step > 0 && e.shootTimer !== undefined) {
          const shouldFireShuriken =
            (phase28Step === 1 && cycle > 2.38 && cycle < 2.68) ||
            (phase28Step === 2 && cycle > 2.98 && cycle < 3.28);
          if (shouldFireShuriken && e.lastCycleIndex === phase28Step && e.counterTimer !== phase28Step) {
            e.counterTimer = phase28Step;
            const burstBase = e.laserAngle ?? Math.PI / 2;
            const spread = (5 * Math.PI) / 180;
            const launchAngles = [
              burstBase - Math.PI / 2,
              burstBase,
              burstBase + Math.PI / 2,
              burstBase + Math.PI,
            ];
            launchAngles.forEach((baseAngle) => {
              for (let i = -1; i <= 2; i++) {
                const b = new Bullet();
                b.x = cx - 7;
                b.y = cy - 7;
                b.width = 14;
                b.height = 14;
                const angle = baseAngle + (i - 1.5) * spread;
                b.vx = Math.cos(angle) * 300;
                b.vy = Math.sin(angle) * 300;
                b.isEnemy = true;
                b.type = "crystal";
                b.color = "#38bdf8";
                b.visualType = "star_beacon";
                engine.bullets.push(b);
              }
            });
          } else if (!shouldFireShuriken) {
            e.counterTimer = 0;
          }
        }
      } else if (e.phase === 47) {
        engine.runFinalSafeZoneBlast(e, dt);
      } else if (e.phase === 48) {
        engine.runFinalAbsorptionField(e, dt);
      } else if (e.phase === 49) {
        engine.runFinalAfterimageSlash(e, dt);
      } else if (e.phase === 50) {
        engine.runFinalCompressionWalls(e, dt);
      } else if (e.phase === 32) {
        // Final Phase 32: dense radial fire with the merged spatial compression field.
        engine.runFinalCompressionWalls(e, dt);

        if (e.shootTimer === undefined) e.shootTimer = 0;
        e.shootTimer += dt;

        if (e.lastShot > 0.48) {
          e.lastShot = 0;
          sfx.bossPatternFire();
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height;

          const count = 25;
          const baseAngle = Math.random() * Math.PI * 2;
          for (let i = 0; i < count; i++) {
            const ang = baseAngle + (i / count) * Math.PI * 2;
            const b = new Bullet();
            b.x = cx - 6;
            b.y = cy - 6;
            b.width = 12;
            b.height = 12;
            b.vx = Math.cos(ang) * 150;
            b.vy = Math.sin(ang) * 150;
            b.isEnemy = true;
            b.color = "#22d3ee";
            b.visualType = "cosmic_plasma_core";
            engine.bullets.push(b);
          }
        }
      } else if (e.phase === 51) {
        engine.runFinalEdgeStrikerPattern(e, dt);
      } else if (e.phase === 52) {
        engine.runFinalElectricMazePattern(e, dt);
      } else if (e.phase === 34) {
        // Final Phase 34: Galactic Collision Spheres - giant bouncing balls
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height;

        if (e.shootTimer === undefined) e.shootTimer = 0;
        e.shootTimer += dt;

        if (e.lastShot > 1.25) {
          e.lastShot = 0;
          sfx.bossPatternFire();
          for (let side = -1; side <= 1; side += 2) {
            const b = new Bullet();
            b.x = cx - 22 + side * 50;
            b.y = cy;
            b.width = 44;
            b.height = 44;
            b.vx = side * 170;
            b.vy = 145;
            b.isEnemy = true;
            b.type = "colliding_orb";
            b.color = "#ec4899";
            engine.bullets.push(b);
          }
        }
      } else if (e.phase === 37) {
        // Final Phase 37: Milky Way Vortex Gate - Concentric opposite rotation
        const targetX = engine.canvas.width / 2 - e.width / 2;
        e.x += (targetX - e.x) * dt;

        if (e.shootTimer === undefined) e.shootTimer = 0;
        e.shootTimer += dt;

        if (e.lastShot > 0.26) {
          e.lastShot = 0;
          sfx.bossPatternFire();
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          for (let i = 0; i < 4; i++) {
            const rotSpeed = (i % 2 === 0 ? 1.9 : -1.9) * e.shootTimer;
            const count = 7;
            for (let k = 0; k < count; k++) {
              const angle = rotSpeed + (k / count) * Math.PI * 2;
              const b = new Bullet();
              b.x = cx - 6;
              b.y = cy - 6;
              b.width = 11;
              b.height = 11;
              b.vx = Math.cos(angle) * (220 + i * 55);
              b.vy = Math.sin(angle) * (220 + i * 55);
              b.isEnemy = true;
              b.color = i === 1 ? "#ec4899" : "#06b6d4";
              engine.bullets.push(b);
            }
          }
        }
      } else if (e.phase === 42) {
        engine.runOverdriveSpiralLattice(e, dt);
      } else if (e.phase === 43) {
        engine.runOverdriveSplitMineRain(e, dt);
      } else if (e.phase === 44) {
        engine.runOverdriveRecallBullets(e, dt);
      } else if (e.phase === 45) {
        engine.runOverdriveWarningExplosions(e, dt);
      } else if (e.phase === 46) {
        engine.runOverdriveTailExplosions(e, dt);
      }
      engine.clampBossToArena(e);
    } else {
      // Normal Enemies Movement
      const tier = engine.getCombatTier();
      if (e.type === "assault_commander") {
        if (e.y < e.spawnPoint) {
          e.y += e.vy * dt;
        } else {
          e.vy = 0;
          e.patternTimer += dt;
          e.x += e.vx * dt;
          e.y = e.spawnPoint + Math.sin(e.patternTimer * (tier >= 3 ? 2.2 : 1.7)) * (tier >= 3 ? 18 : 12);
          if (e.x < 16 || e.x > engine.canvas.width - e.width - 16) {
            e.x = Math.max(16, Math.min(engine.canvas.width - e.width - 16, e.x));
            e.vx *= -1;
          }
        }
      } else if (e.type === "stationary") {
        e.y += e.vy * dt;
        if (e.y > 100) e.vy = 0; // stop moving
      } else if (e.type === "circle_shooter") {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else if (e.type === "column_shooter") {
        if (e.y < e.spawnPoint) e.y += e.vy * dt;
        else e.vy = 0;
      } else if (e.type === "v_360_shooter") {
        if (e.y < e.spawnPoint) {
          e.y += e.vy * dt;
        } else {
          e.vy = 0;
        }
      } else if (e.type === "split_cluster") {
        if (e.y < e.spawnPoint) {
          e.y += e.vy * dt;
        } else {
          e.vy = 0;
          e.x += e.vx * dt;
          if (e.x < 20 || e.x > engine.canvas.width - e.width - 20) {
            e.vx *= -1;
          }
        }
      } else if (e.type === "barricade_wall") {
        e.y += e.vy * dt; // slow descent downwards
      } else if (e.type === "mine_layer") {
        if (e.y < e.spawnPoint) {
          e.y += e.vy * dt;
        } else {
          e.vy = 0;
          e.x += e.vx * dt;
          if (e.x < 30 || e.x > engine.canvas.width - e.width - 30) {
            e.vx *= -1;
          }
        }
      } else if (e.type === "boomerang_orbit") {
        if (e.y < e.spawnPoint) {
          e.y += e.vy * dt;
          e.startX = e.x;
        } else {
          e.vy = 0;
          if (e.startX === undefined) {
            e.startX = e.x;
          }
          e.patternTimer += dt;
          const amplitude = engine.canvas.width / 2 - 45;
          e.x = e.startX + Math.sin(e.patternTimer * 1.4) * amplitude;
        }
      } else if (e.type === "satellite_shield") {
        const tx = engine.player.x + engine.player.width / 2;
        const ty = engine.player.y + engine.player.height / 2;
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        const dx = tx - cx;
        const dy = ty - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > 150) {
          e.x += (dx / dist) * 110 * dt;
          e.y += (dy / dist) * 110 * dt;
        } else {
          e.y += Math.sin(performance.now() * 0.002) * 50 * dt;
          e.x += Math.cos(performance.now() * 0.002) * 80 * dt;
        }

        // Check and spawn satellites
        if (e.satellites.length === 0) {
          const numSatellites = 4;
          for (let i = 0; i < numSatellites; i++) {
            const b = new Bullet();
            b.type = "satellite";
            b.isEnemy = true;
            b.width = 10;
            b.height = 10;
            b.color = "#38bdf8";
            engine.bullets.push(b);
            e.satellites.push(b);
          }
        }
        e.satellites = e.satellites.filter((b) => b.active);

        e.patternTimer += dt;
        const orbitAngleOffset = e.patternTimer * 3.5;
        const orbitRadius = 40;
        e.satellites.forEach((b, idx) => {
          const angle =
            orbitAngleOffset + (idx / e.satellites.length) * Math.PI * 2;
          b.x =
            e.x + e.width / 2 - b.width / 2 + Math.cos(angle) * orbitRadius;
          b.y =
            e.y + e.height / 2 - b.height / 2 + Math.sin(angle) * orbitRadius;
          b.vx = 0;
          b.vy = 0;
        });
      } else if (e.type === "aimed") {
        const stagingY = e.spawnPoint || 120;
        if (e.y < stagingY) {
          e.y += e.vy * dt;
          if (e.startX === undefined) e.startX = e.x;
        } else {
          if (e.startX === undefined) e.startX = e.x;
          e.patternTimer += dt;
          const moveStyle = Math.abs(Math.floor(e.direction || e.visualId)) % 3;

          if (moveStyle === 0) {
            const amplitude = Math.min(150, engine.canvas.width * 0.24);
            e.x = e.startX + Math.sin(e.patternTimer * 2.2) * amplitude;
            e.y += e.vy * 0.42 * dt;
          } else if (moveStyle === 1) {
            if (Math.abs(e.vx) < 70) {
              e.vx = e.startX < engine.canvas.width / 2 ? 175 : -175;
            }
            e.x += e.vx * dt;
            e.y += e.vy * 0.36 * dt;
            if (e.x < 28 || e.x > engine.canvas.width - e.width - 28) {
              e.vx *= -1;
            }
          } else {
            const orbitAngle = e.patternTimer * 1.75;
            e.x = e.startX + Math.cos(orbitAngle) * Math.min(118, engine.canvas.width * 0.18);
            e.y += e.vy * 0.34 * dt + Math.sin(orbitAngle * 2.4) * 18 * dt;
          }
        }
      } else if (e.type === "dash_paint") {
        if (e.y < e.spawnPoint) {
          e.y += e.vy * dt;
        } else {
          e.vy = 0;
          e.x += e.vx * 0.18 * dt;
          if (e.x < 40 || e.x > engine.canvas.width - e.width - 40) e.vx *= -1;
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }

      // Barricade visual beam collision handler
      if (e.type === "barricade_wall") {
        const partner = engine.enemies.find(
          (other) =>
            other !== e &&
            other.active &&
            other.type === "barricade_wall" &&
            Math.abs(other.y - e.y) < 25 &&
            other.x > e.x,
        );

        if (partner) {
          const py = engine.player.y + engine.player.height / 2;
          const px = engine.player.x + engine.player.width / 2;
          const by = (e.y + partner.y) / 2 + e.height / 2;
          const inXRange = px >= e.x + e.width && px <= partner.x;
          const inYRange = Math.abs(py - by) < 14;

          if (
            inXRange &&
            inYRange &&
            engine.player.invulnTimer <= 0 &&
            !engine.player.isDead
          ) {
            engine.triggerPlayerHit();
          }
        }
      }

      // Firing Behavior (much faster thresholds)
      if (
        e.type === "assault_commander" &&
        e.lastShot > (tier >= 3 ? 0.42 : 0.56)
      ) {
        e.lastShot = 0;
        engine.fireAssaultCommander(e, tier);
      } else if (e.type === "stationary" && e.lastShot > 1.2) {
        e.lastShot = 0;
        // Dual parallel vertical bullet beams (straight down)
        for (let i = -1; i <= 1; i += 2) {
          const b = new Bullet();
          b.x = e.x + e.width / 2 + i * 8 - 3;
          b.y = e.y + e.height;
          b.width = 6;
          b.height = 12;
          b.vx = 0;
          b.vy = 220;
          b.isEnemy = true;
          b.type = "needle";
          b.color = "#facc15";
          applyHobanwooEnemyBulletVisualSystem(b, "scanner_beam");
          engine.bullets.push(b);
        }
      } else if (e.type === "circle_shooter") {
        if (e.patternTimer === undefined) e.patternTimer = 0;
        if (e.lastShot > 0.32) {
          e.lastShot = 0;
          e.patternTimer += 0.35; // Spinning angle
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          for (let i = 0; i < 3; i++) {
            const angle = e.patternTimer + (i / 3) * Math.PI * 2;
            const b = new Bullet();
            b.x = cx - 4;
            b.y = cy - 4;
            b.width = 8;
            b.height = 8;
            b.vx = Math.cos(angle) * 160;
            b.vy = Math.sin(angle) * 160;
            b.isEnemy = true;
            b.type = "pellet";
            b.color = "#fb923c"; // Standard pellet orange
            applyHobanwooEnemyBulletVisualSystem(b, "corrupt_orb");
            engine.bullets.push(b);
          }
        }
      } else if (e.type === "column_shooter" && e.lastShot > 4.0) {
        e.lastShot = 0;
        engine.fireSubtypeWeapon(e, "aimed");
      } else if (
        e.type === "v_360_shooter" &&
        e.vy === 0 &&
        e.lastShot > 4.2
      ) {
        e.lastShot = 0;
        const count = 12;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const b = new Bullet();
          b.x = e.x + e.width / 2;
          b.y = e.y + e.height / 2;
          b.vx = Math.cos(a) * 150;
          b.vy = Math.sin(a) * 150;
          b.isEnemy = true;
          b.type = "pellet";
          b.color = "#facc15"; // Standard pellet bright white-yellow
          b.width = 6;
          b.height = 6;
          applyHobanwooEnemyBulletVisualSystem(b, "guide_arrow");
          engine.bullets.push(b);
        }
      } else if (e.type === "split_cluster" && e.lastShot > 1.8) {
        e.lastShot = 0;
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height;
        const tx = engine.player.x + engine.player.width / 2;
        const ty = engine.player.y + engine.player.height / 2;
        const angleToPlayer = Math.atan2(ty - cy, tx - cx);

        const b = new Bullet();
        b.x = cx - 10;
        b.y = cy;
        b.width = 20;
        b.height = 20;
        b.vx = Math.cos(angleToPlayer) * 190;
        b.vy = Math.sin(angleToPlayer) * 190;
        b.isEnemy = true;
        b.color = "#f43f5e";
        b.parentAngle = angleToPlayer;
        b.type = Math.random() < 0.5 ? "parent_cross" : "parent_nsplit";
        engine.bullets.push(b);
      } else if (e.type === "mine_layer" && e.lastShot > 2.2) {
        e.lastShot = 0;
        const b = new Bullet();
        b.x = e.x + e.width / 2 - 12;
        b.y = e.y + e.height / 2 - 12;
        b.width = 24;
        b.height = 24;
        b.vx = (Math.random() - 0.5) * 60;
        b.vy = 40 + Math.random() * 40;
        b.isEnemy = true;
        b.type = "mine_orb";
        b.color = "#f59e0b";
        b.fuseTimer = 4.2;
        applyHobanwooEnemyBulletVisualSystem(b, "f_bomb");
        engine.bullets.push(b);
      } else if (e.type === "boomerang_orbit" && e.lastShot > 1.8) {
        e.lastShot = 0;
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height;
        const tx = engine.player.x + engine.player.width / 2;
        const ty = engine.player.y + engine.player.height / 2;
        const angleToPlayer = Math.atan2(ty - cy, tx - cx);

        for (let i = -1; i <= 1; i += 2) {
          const b = new Bullet();
          b.x = cx - 5;
          b.y = cy - 5;
          b.width = 10;
          b.height = 10;
          const offsetAngle = angleToPlayer + i * 0.14;
          b.vx = Math.cos(offsetAngle) * 240;
          b.vy = Math.sin(offsetAngle) * 240;
          b.isEnemy = true;
          b.type = "boomerang";
          b.color = "#10b981";
          engine.bullets.push(b);
        }
      } else if (e.type === "satellite_shield") {
        if (e.lastShot > 1.8) {
          e.lastShot = 0;
          const tx = engine.player.x + engine.player.width / 2;
          const ty = engine.player.y + engine.player.height / 2;

          e.satellites.forEach((b) => {
            const dx = tx - b.x;
            const dy = ty - b.y;
            const d = Math.hypot(dx, dy);
            b.type = "normal";
            b.color = "#3b82f6";
            if (d > 1) {
              b.vx = (dx / d) * 350;
              b.vy = (dy / d) * 350;
            } else {
              b.vy = 350;
            }
          });
          e.satellites = [];
        }
      } else if (e.type === "dash_paint" && e.lastShot > 1.6) {
        e.lastShot = 0;
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height;
        const tx = engine.player.x + engine.player.width / 2;
        const ty = engine.player.y + engine.player.height / 2;
        const angleToPlayer = Math.atan2(ty - cy, tx - cx);

        const b = new Bullet();
        b.x = cx - 6;
        b.y = cy - 6;
        b.width = 12;
        b.height = 12;
        b.vx = Math.cos(angleToPlayer) * 35;
        b.vy = Math.sin(angleToPlayer) * 35;
        b.isEnemy = true;
        b.type = "dash_paint_bullet";
        b.color = "#ea580c";
        applyHobanwooEnemyBulletVisualSystem(b, "deadline_missile");
        engine.bullets.push(b);
      } else if (e.type === "aimed" && e.lastShot > 1.0) {
        e.lastShot = 0;
        engine.fireSubtypeWeapon(e, "aimed");
      } else if (e.type === "homing_shooter" && e.lastShot > 1.4) {
        e.lastShot = 0;
        engine.fireSubtypeWeapon(e, "homing");
      } else if (e.type === "shotgun_shooter" && e.lastShot > 2.0) {
        e.lastShot = 0;
        engine.fireSubtypeWeapon(e, "shotgun");
      } else if (e.type === "burst_shooter") {
        if (e.shootTimer === undefined) e.shootTimer = 0;
        e.shootTimer += dt;
        if (e.shootTimer > 0.18 && e.burstCount < 5) {
          e.shootTimer = 0;
          e.burstCount++;
          engine.fireSubtypeWeapon(e, "aimed"); // Modified: Fires aimed bullets targeting player sequentially!
        }
        if (e.lastShot > 9.7) {
          e.lastShot = 0;
          e.burstCount = 0;
          e.shootTimer = 0;
        }
      } else if (e.type === "tank" && e.lastShot > 1.8) {
        e.lastShot = 0;
        // Heavy vertical double cannon fire!
        for (let i = -12; i <= 12; i += 24) {
          const b = new Bullet();
          b.x = e.x + e.width / 2 + i - 6;
          b.y = e.y + e.height;
          b.width = 12;
          b.height = 12;
          b.vx = 0;
          b.vy = 200;
          b.isEnemy = true;
          b.color = "#ef4444";
          applyHobanwooEnemyBulletVisualSystem(b, i < 0 ? "flask" : "atom");
          engine.bullets.push(b);
        }
      } else if (e.type === "ricochet_shooter" && e.lastShot > 1.6) {
        e.lastShot = 0;
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height;
        const tx = engine.player.x + engine.player.width / 2;
        const ty = engine.player.y + engine.player.height / 2;
        const angleToPlayer = Math.atan2(ty - cy, tx - cx);
        for (let i = -1; i <= 1; i++) {
          if (i === 0) continue;
          const b = new Bullet();
          b.x = cx - 4;
          b.y = cy - 4;
          b.width = 8;
          b.height = 8;
          const offsetAngle = angleToPlayer + i * 0.28;
          b.vx = Math.cos(offsetAngle) * 280;
          b.vy = Math.sin(offsetAngle) * 280;
          b.isEnemy = true;
          b.type = "ricochet";
          b.bounceCount = 0;
          b.color = "#fbbf24";
          engine.bullets.push(b);
        }
      } else if (e.type === "counter_on_death" && e.lastShot > 2.2) {
        e.lastShot = 0;
        const spin = (performance.now() * 0.003) % (Math.PI * 2);
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        // Attack is linked specifically with the rotating 6 vertices of its hexagon!
        for (let i = 0; i < 6; i++) {
          const angle = spin + (i / 6) * Math.PI * 2;
          const bx = cx + Math.cos(angle) * (e.width / 2 + 8);
          const by = cy + Math.sin(angle) * (e.height / 2 + 8);
          const b = new Bullet();
          b.x = bx - 4;
          b.y = by - 4;
          b.width = 10;
          b.height = 10;
          b.vx = Math.cos(angle) * 150;
          b.vy = Math.sin(angle) * 150;
          b.isEnemy = true;
          b.color = "#f43f5e";
          engine.bullets.push(b);
        }
      } else if (e.type === "ink_shooter" && e.lastShot > 1.8) {
        e.lastShot = 0;
        const c = new InkCloud();
        c.x = e.x + e.width / 2;
        c.y = e.y + e.height;
        c.vx = (Math.random() - 0.5) * 45;
        c.vy = 80 + Math.random() * 40;
        c.radius = 18;
        c.maxRadius = 65 + Math.random() * 20;
        c.life = 4.2;
        c.maxLife = 4.2;
        engine.inkClouds.push(c);
      } else if (e.type === "gravity_vortex_mob" && e.lastShot > 2.2) {
        e.lastShot = 0;
        const b = new Bullet();
        b.x = e.x + e.width / 2 - 16;
        b.y = e.y + e.height;
        b.width = 30;
        b.height = 30;
        b.vx = 0;
        b.vy = 75;
        b.isEnemy = true;
        b.type = "gravity_singularity";
        b.color = "#c084fc";
        engine.bullets.push(b);
      }

      // Pre-bounds separation check to prevent multiple enemies from overlapping when they track the player or spawn close by (e.g. satellite_shield)
      if (e.active && e.type === "satellite_shield") {
        engine.enemies.forEach((other) => {
          if (
            other !== e &&
            other.active &&
            other.type === "satellite_shield"
          ) {
            const dx = e.x - other.x;
            const dy = e.y - other.y;
            const d = Math.hypot(dx, dy);

            // Comfort distance based on their visual radius
            const minDistance = (e.width + other.width) * 0.9 + 25;
            if (d < minDistance) {
              const pushX = d === 0 ? (Math.random() - 0.5) * 10 : dx / d;
              const pushY = d === 0 ? (Math.random() - 0.5) * 10 : dy / d;
              // Standard spring separation force
              const force = (minDistance - d) * 0.12;
              e.x += pushX * force;
              e.y += pushY * force;
              other.x -= pushX * force;
              other.y -= pushY * force;
            }
          }
        });
      }

      if (
        e.y > engine.canvas.height + 60 ||
        e.x < -100 ||
        e.x > engine.canvas.width + 100
      ) {
        e.active = false;
      }
    }
  });

  // Ensure all satellites of any inactive satellite_shield or mini_shield_commander are cleaned up
  engine.enemies.forEach((e) => {
    if (!e.active && (e.type === "satellite_shield" || (e.type as any) === "mini_shield_commander")) {
      e.satellites.forEach((b) => {
        b.active = false;
      });
      e.satellites = [];
    }
  });

  engine.enemies = engine.enemies.filter((e) => e.active);
}

/**
 * 잉크 슈터가 남긴 구름 효과의 위치, 크기, 수명을 갱신하고 수명이 끝난 구름을 제거한다.
 * 잉크 구름 확산 속도나 지속 시간을 바꿀 때 이 함수를 수정한다.
 */
export function updateEnemyInkCloudSystem(engine: EnemyMovementRuntime, dt: number) {
  engine.inkClouds.forEach((c) => {
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.radius += (c.maxRadius - c.radius) * 0.18 * dt;
    c.life -= dt;
    if (c.life <= 0) {
      c.active = false;
    }
  });
  engine.inkClouds = engine.inkClouds.filter((c) => c.active);
}
