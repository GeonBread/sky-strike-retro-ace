/**
 * 충돌·데미지·아이템 획득 시스템
 *
 * 이 파일은 전투 중 발생하는 탄환, 플레이어, 몬스터, 보스 부위, 아이템 충돌 처리를 담당한다.
 * 피격 판정, 보스 부위 데미지, 몬스터 사망 보상, 파워업 획득 효과를 수정할 때 이 파일을 수정한다.
 */

import { Bullet, PowerUp } from "../entities";
import { sfx } from "../AudioSystem";
import { getHobanwooEnemyBulletHitRadiusSystem } from "../data/hobanwooEnemyBulletVisualCatalog";
import { spawnPlayerBulletHitEffectSystem } from "../effects/playerBulletHitEffectSystem";
import { checkChapter1WaveCollisionsSystem } from "../chapter1/chapter1WaveCollisionSystem";
import {
  spawnChapter1EnemyHitEffectSystem,
  spawnChapter1WaveBurstParticlesSystem,
} from "../chapter1/chapter1WaveImpactSystem";

const PLAYER_MAX_HP = 3;

type CollisionDamageRuntime = any;


function circleIntersectsCenteredBox(
  centerX: number,
  centerY: number,
  radius: number,
  box: { x: number; y: number; width: number; height: number; hitWidth?: number; hitHeight?: number },
): boolean {
  const width = box.hitWidth ?? box.width;
  const height = box.hitHeight ?? box.height;
  const left = box.x + (box.width - width) / 2;
  const top = box.y + (box.height - height) / 2;
  const nearestX = Math.max(left, Math.min(centerX, left + width));
  const nearestY = Math.max(top, Math.min(centerY, top + height));
  const dx = centerX - nearestX;
  const dy = centerY - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * 현재 프레임의 모든 충돌 판정을 수행하고 충돌 결과에 따라 체력, 점수, 폭발, 파워업 상태를 갱신한다.
 * 적탄과 플레이어, 플레이어 탄환과 적/보스, 적 몸체와 플레이어, 파워업과 플레이어의 충돌을 한 번에 처리한다.
 */
export function checkCollisionDamageAndPowerUpCollectionSystem(engine: CollisionDamageRuntime) {
checkChapter1WaveCollisionsSystem(engine);
engine.bullets.forEach((b) => {
  if (!b.active) return;
  if (b.isEnemy && b.chapter1) return;
  if (b.isEnemy) {
    // Intercept with active player guardian satellites
    if (!engine.player.isDead && engine.player.satelliteCount > 0) {
      const px = engine.player.x + engine.player.width / 2;
      const py = engine.player.y + engine.player.height / 2;
      const bcx = b.x + b.width / 2;
      const bcy = b.y + b.height / 2;
      
      let blocked = false;
      
      // Re-verify sound array sanity
      if (!engine.player.satelliteHps) {
        engine.player.satelliteHps = [];
      }
      while (engine.player.satelliteHps.length < engine.player.satelliteCount) {
        engine.player.satelliteHps.push(10); // Give 10 shield lives initially
      }
      while (engine.player.satelliteHps.length > engine.player.satelliteCount) {
        engine.player.satelliteHps.pop();
      }

      for (let i = 0; i < engine.player.satelliteCount; i++) {
        const angle = (engine.playerSatelliteAngle || 0) + (i / engine.player.satelliteCount) * Math.PI * 2;
        const sx = px + Math.cos(angle) * 44;
        const sy = py + Math.sin(angle) * 44;
        const distToSatellite = Math.hypot(bcx - sx, bcy - sy);
        
        if (distToSatellite < 18) {
          b.active = false;
          
          // Satellite absorbs hit & takes 1 point of structural damage
          engine.player.satelliteHps[i]--;
          
          if (engine.player.satelliteHps[i] <= 0) {
            // Completely broken!
            engine.player.satelliteHps.splice(i, 1);
            engine.player.satelliteCount--;
            engine.spawnExplosion(sx, sy, "#c084fc", 18);
            sfx.satelliteDestroy(); // Play the new distinct companion-break SFX!
          } else {
            // Absorbed/Blocked damage! Play soft metal clink & hit sparks
            engine.spawnExplosion(sx, sy, "#c084fc", 6);
            sfx.enemyHit();
            
            if (!engine.playerSatelliteFlashes) {
              engine.playerSatelliteFlashes = [];
            }
            engine.playerSatelliteFlashes[i] = 0.15; // flash bright white for 0.15 seconds
          }

          blocked = true;
          break;
        }
      }
      if (blocked) return;
    }

    const visualHitRadius = getHobanwooEnemyBulletHitRadiusSystem(b.visualType);
    let actualHit = visualHitRadius === null
      ? engine.intersects(b, engine.player)
      : circleIntersectsCenteredBox(
          b.x + b.width / 2,
          b.y + b.height / 2,
          visualHitRadius,
          engine.player,
        );
    if (actualHit && b.type === "ring") {
      const bcx = b.x + b.width / 2;
      const bcy = b.y + b.height / 2;
      const pcx = engine.player.x + engine.player.width / 2;
      const pcy = engine.player.y + engine.player.height / 2;
      const dist = Math.hypot(bcx - pcx, bcy - pcy);
      const r = Math.max(b.width, b.height) * 1.55; // visual radius
      const innerHole = r * 0.48; // center empty hole!
      if (dist < innerHole) {
        actualHit = false; // "풍혈 피하기" graze passage
      }
    }
    if (engine.player.invulnTimer <= 0 && actualHit) {
      b.active = false;
      engine.triggerPlayerHit();
    }
  } else {
    engine.enemies.forEach((e) => {
      if (e.active && engine.intersects(b, e)) {
        if ((engine.state === "BOSSCUTSCENE" || engine.state === "BOSSPHASE2CUTSCENE" || engine.state === "BOSSPHASE3CUTSCENE") && e.type === "boss") {
          return;
        }
        b.active = false;

        // Parts-destruction system
        if (e.type === "boss") {
          let hitLeftTurret =
            e.leftTurretActive &&
            engine.intersects(b, {
              x: e.x - 14,
              y: e.y + 10,
              width: 14,
              height: 40,
            });
          let hitRightTurret =
            e.rightTurretActive &&
            engine.intersects(b, {
              x: e.x + e.width,
              y: e.y + 10,
              width: 14,
              height: 40,
            });

          if (hitLeftTurret) {
            e.leftTurretHp -= b.damage;
            sfx.enemyHit();
            spawnPlayerBulletHitEffectSystem(engine, b, {
              x: e.x - 14,
              y: e.y + 10,
              width: 14,
              height: 40,
            });
            if (e.leftTurretHp <= 0) {
              e.leftTurretActive = false;
              sfx.enemyExplode();
              engine.spawnExplosion(e.x - 7, e.y + 30, "#ef4444", 30);
              e.bossStunTimer = 1.8; // Groggy/Stun boss for 1.8s!
              engine.clearAllEnemyBullets(); // Bullet clear for catharsis!
              engine.awardScore(2500); // Large reward!
            }
            return; // Damaged left wing turret, do not hit main health
          } else if (hitRightTurret) {
            e.rightTurretHp -= b.damage;
            sfx.enemyHit();
            spawnPlayerBulletHitEffectSystem(engine, b, {
              x: e.x + e.width,
              y: e.y + 10,
              width: 14,
              height: 40,
            });
            if (e.rightTurretHp <= 0) {
              e.rightTurretActive = false;
              sfx.enemyExplode();
              engine.spawnExplosion(
                e.x + e.width + 7,
                e.y + 30,
                "#ef4444",
                30,
              );
              e.bossStunTimer = 1.8; // Groggy/Stun boss for 1.8s!
              engine.clearAllEnemyBullets(); // Bullet clear for catharsis!
              engine.awardScore(2500); // Large reward!
            }
            return; // Damaged right wing turret, do not hit main health
          }
        }

        e.hp -= b.damage;
        e.type === "boss" ? sfx.bossHit() : sfx.enemyHit();
        if (e.chapter1) {
          const impactX = b.x + b.width / 2;
          const impactY = b.y + b.height / 2;
          const enemyCenterX = e.x + e.width / 2;
          const enemyCenterY = e.y + e.height / 2;
          e.chapter1.hitFlash = 0.12;
          e.chapter1.hitX = impactX;
          e.chapter1.hitY = impactY;
          e.chapter1.hitAngle = Math.atan2(impactY - enemyCenterY, impactX - enemyCenterX);
          spawnChapter1EnemyHitEffectSystem(engine, impactX, impactY);
        } else {
          spawnPlayerBulletHitEffectSystem(engine, b, e);
        }

        if (
          e.type === "counter_on_death" &&
          e.hp > 0 &&
          (!e.counterTimer || e.counterTimer <= 0)
        ) {
          e.counterTimer = 0.45;
          const cx = e.x + e.width / 2;
          const cy = e.y + e.height / 2;
          const tx = engine.player.x + engine.player.width / 2;
          const ty = engine.player.y + engine.player.height / 2;
          const a = Math.atan2(ty - cy, tx - cx);
          const blt = new Bullet();
          blt.x = cx - 4;
          blt.y = cy - 4;
          blt.width = 8;
          blt.height = 8;
          blt.vx = Math.cos(a) * 230;
          blt.vy = Math.sin(a) * 230;
          blt.isEnemy = true;
          blt.color = "#e11d48";
          engine.bullets.push(blt);
        }

        if (e.hp <= 0) {
          if (
            e.type === "boss" &&
            false &&
            !engine.bossPhase2Triggered &&
            !engine.isSandbox
          ) {
            engine.bossPhase2Triggered = true;
            engine.state = "BOSSPHASE2CUTSCENE";
            engine.cutsceneTimer = 3.5; // 3.5 seconds of pure tension
            engine.clearAllEnemyBullets();

            // Clear any ordinary stage mobs to clean the field
            engine.enemies = engine.enemies.filter((other) => other === e);

            e.hp = 1; // Temporarily reset to 1 for charging visual
            sfx.bossExplode(); // Play transform explosion visual/sound
            return;
          }

          if (
            e.type === "boss" &&
            false &&
            engine.bossPhase2Active &&
            !engine.bossPhase3Triggered &&
            !engine.isSandbox
          ) {
            engine.bossPhase3Triggered = true;
            engine.state = "BOSSPHASE3CUTSCENE";
            engine.cutsceneTimer = 3.5; // 3.5 seconds of epic charge
            engine.clearAllEnemyBullets();

            // Clear ordinary stage mobs to clean the field
            engine.enemies = engine.enemies.filter((other) => other === e);

            e.hp = 1; // Temporarily reset to 1 for charging visual
            sfx.bossExplode(); // Play transition explosion
            return;
          }

          if (e.type === "boss") {
            engine.awardScore(10000);
            engine.bullets.forEach((b) => {
              if (b.isEnemy) b.active = false;
            });
            engine.clearBossPatternHazards();
            engine.beginBossClearSequence(e);
            return;
          }

          engine.deactivateEnemy(e);
          if (e.type === "counter_on_death") {
            const count = 10;
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height / 2;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2;
              const blt = new Bullet();
              blt.x = cx - 4;
              blt.y = cy - 4;
              blt.width = 8;
              blt.height = 8;
              blt.vx = Math.cos(angle) * 165;
              blt.vy = Math.sin(angle) * 165;
              blt.isEnemy = true;
              blt.color = "#38bdf8";
              engine.bullets.push(blt);
            }
          }
          engine.awardScore(e.type === "assault_commander" ? 2500 : e.type === "tank" ? 300 : 100);

          if (e.chapter1) {
            spawnChapter1WaveBurstParticlesSystem(
              engine,
              e.x + e.width / 2,
              e.y + e.height / 2,
              "#ffe270",
              16,
              225,
            );
          } else {
            engine.spawnExplosion(
              e.x + e.width / 2,
              e.y + e.height / 2,
              e.type === "assault_commander" ? "#22d3ee" : "#f43f5e",
              e.type === "assault_commander" ? 48 : 25,
            );
          }
          sfx.enemyExplode();

          if (Math.random() < (e.type === "assault_commander" ? 0.75 : 0.12)) {
            const pu = new PowerUp();
            pu.x = e.x + e.width / 2;
            pu.y = e.y + e.height / 2;
            pu.width = 16;
            pu.height = 16;
            pu.vy = 120;
            pu.type = Math.random() < 0.18 ? "satellite" : (Math.random() < 0.30 ? "heal" : "power");
            engine.powerups.push(pu);
          }
        }
      }
    });
  }
});

engine.enemies.forEach((e) => {
  if (
    e.active &&
    engine.player.invulnTimer <= 0 &&
    engine.intersects(engine.player, e)
  ) {
    if (e.type !== "boss" && e.type !== "assault_commander") {
      engine.deactivateEnemy(e);
      engine.spawnExplosion(
        e.x + e.width / 2,
        e.y + e.height / 2,
        "#f43f5e",
        15,
      );
    }
    engine.triggerPlayerHit();
  }
});

engine.powerups.forEach((p) => {
  // Create a 4x larger virtual player bounding box to make item collection extremely generous!
  const virtualPlayer = {
    x: engine.player.x - engine.player.width * 1.5,
    y: engine.player.y - engine.player.height * 1.5,
    width: engine.player.width * 4,
    height: engine.player.height * 4,
    hitWidth: (engine.player.hitWidth || engine.player.width) * 4,
    hitHeight: (engine.player.hitHeight || engine.player.height) * 4,
  };
  if (p.active && engine.intersects(virtualPlayer, p)) {
    p.active = false;
    sfx.powerup();
    if (p.type === "power") {
      if (engine.player.powerLevel >= 5) {
        engine.awardScore(1000); // Bonus points for full weapon
        engine.spawnExplosion(
          p.x + p.width / 2,
          p.y + p.height / 2,
          "#38bdf8",
          15,
        );
      } else {
        engine.player.powerLevel = Math.min(5, engine.player.powerLevel + 1);
      }
    } else if (p.type === "heal") {
      if (engine.player.hp >= PLAYER_MAX_HP) {
        engine.awardScore(1000); // Bonus points for full health
        engine.spawnExplosion(
          p.x + p.width / 2,
          p.y + p.height / 2,
          "#4ade80",
          15,
        );
      } else {
        engine.player.hp = Math.min(PLAYER_MAX_HP, engine.player.hp + 1);
      }
    } else if (p.type === "satellite") {
      engine.player.satelliteCount = Math.min(4, engine.player.satelliteCount + 1);
      engine.spawnExplosion(
        p.x + p.width / 2,
        p.y + p.height / 2,
        "#c084fc",
        20,
      );
    }
    engine.awardScore(200);
  }
});
}

/**
 * 화면에 남아 있는 모든 적탄을 제거하고 제거 보상을 점수에 반영한다.
 * 보스 부위 파괴, 스마트 폭탄, 전환 연출처럼 적탄 정리가 필요한 상황에서 사용한다.
 */
export function clearAllEnemyBulletsAndRewardSystem(engine: CollisionDamageRuntime) {
engine.bullets.forEach((b) => {
  if (b.isEnemy) {
    // Spawn shiny score powerup sparks
    engine.spawnExplosion(
      b.x + b.width / 2,
      b.y + b.height / 2,
      "#fbbf24",
      2,
    );
    b.active = false;
    engine.awardScore(5); // Reward points for clearing bullets!
  }
});
engine.bullets = engine.bullets.filter((b) => b.active);
}
