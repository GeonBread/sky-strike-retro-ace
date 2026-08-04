/**
 * 플레이어 스마트 폭탄 시스템
 *
 * 이 파일은 플레이어 폭탄 사용, 폭발 반경 확장, 적탄 제거, 일반 적·운석·방어 잔해 피해 처리를 담당한다.
 * 폭탄 개수 소모 방식, 폭발 속도, 피해 범위, 폭탄 이펙트를 수정할 때 이 파일을 수정한다.
 */

import { Particle } from "../entities";
import { sfx } from "../AudioSystem";

type PlayerBombRuntime = any;

/**
 * 플레이어가 폭탄을 사용할 수 있는 상태인지 확인하고 폭탄 연출과 반경 확장을 시작한다.
 * 폭탄 개수와 화면 이펙트 배열, 보스 피격 기록을 함께 갱신한다.
 */
export function triggerPlayerSmartBombSystem(engine: PlayerBombRuntime) {
  if (engine.player.bombs <= 0 || engine.bombActive) return;
  engine.player.bombs--;
  if (engine.onBombsChanged) engine.onBombsChanged(engine.player.bombs);

  sfx.bossExplode();
  engine.bombActive = true;
  engine.bombRadius = 0;
  engine.bossBombHitSet.clear();

  for (let i = 0; i < 60; i++) {
    const p = new Particle();
    p.x = engine.player.x + engine.player.width / 2;
    p.y = engine.player.y + engine.player.height / 2;
    const angle = (i / 60) * Math.PI * 2;
    p.vx = Math.cos(angle) * 450;
    p.vy = Math.sin(angle) * 450;
    p.color = "#a855f7";
    p.life = p.maxLife = 1.2;
    p.size = 8;
    engine.particles.push(p);
  }
}

/**
 * 진행 중인 스마트 폭탄의 반경을 넓히고 범위 안의 적탄, 적, 운석, 방어 잔해를 처리한다.
 * 반경이 최대치에 도달하면 폭탄 진행 상태를 종료한다.
 */
export function updatePlayerSmartBombSystem(engine: PlayerBombRuntime, dt: number) {
  if (!engine.bombActive) return;
  engine.bombRadius += 1200 * dt;

  engine.bullets = engine.bullets.filter((b) => {
    if (b.isEnemy) {
      const dx = b.x - (engine.player.x + engine.player.width / 2);
      const dy = b.y - (engine.player.y + engine.player.height / 2);
      if (Math.hypot(dx, dy) < engine.bombRadius) {
        engine.spawnExplosion(b.x, b.y, "#e879f9", 2);
        return false;
      }
    }
    return true;
  });

  engine.enemies.forEach((e) => {
    if ((e as any).chapter1ExactBossProxy) return;
    if (e.active) {
      const dx = e.x + e.width / 2 - (engine.player.x + engine.player.width / 2);
      const dy =
        e.y + e.height / 2 - (engine.player.y + engine.player.height / 2);
      if (Math.hypot(dx, dy) < engine.bombRadius) {
        if (e.type === "boss") {
          if (!engine.bossBombHitSet.has(e)) {
            engine.bossBombHitSet.add(e);
            e.hp -= 50;
            sfx.bossHit();
            engine.spawnExplosion(
              e.x + e.width / 2,
              e.y + e.height / 2,
              "#c084fc",
              30,
            );
          }
        } else {
          e.hp = 0;
          engine.deactivateEnemy(e);
          engine.spawnExplosion(
            e.x + e.width / 2,
            e.y + e.height / 2,
            "#c084fc",
            12,
          );
          engine.awardScore(100);
        }
      }
    }
  });

  // Destroy active meteors caught in the bomb radius
  engine.meteors.forEach((m) => {
    if (m.active) {
      const dx = m.x - (engine.player.x + engine.player.width / 2);
      const dy = m.y - (engine.player.y + engine.player.height / 2);
      if (Math.hypot(dx, dy) < engine.bombRadius + m.radius) {
        m.active = false;
        sfx.enemyExplode();
        engine.awardScore(80);
        engine.spawnExplosion(m.x, m.y, "#64748b", 22);
      }
    }
  });

  // Explode debris barricade covers caught in the bomb radius
  engine.debrisCovers.forEach((d) => {
    if (d.active) {
      const dx = d.x + d.width / 2 - (engine.player.x + engine.player.width / 2);
      const dy = d.y + d.height / 2 - (engine.player.y + engine.player.height / 2);
      if (Math.hypot(dx, dy) < engine.bombRadius + Math.max(d.width, d.height) / 2) {
        d.hp = 0;
        d.active = false;
        sfx.enemyExplode();
        engine.spawnExplosion(d.x + d.width / 2, d.y + d.height / 2, "#94a3b8", 15);
      }
    }
  });

  if (engine.bombRadius >= engine.bombMaxRadius) {
    engine.bombActive = false;
  }
}
