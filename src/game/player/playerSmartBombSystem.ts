/**
 * 플레이어 스마트 폭탄 시스템
 *
 * 이 파일은 플레이어 폭탄 사용, 정화 파동의 확장, 파동에 닿은 적탄·일반 적·장애물 제거를 담당한다.
 * 폭탄을 누른 즉시 화면 전체를 지우지 않고, 실제 파동 반경이 도달한 대상부터 순서대로 제거한다.
 */

import { Particle } from "../entities";
import { sfx } from "../AudioSystem";
import { getChapter1BossViewportProjection } from "../chapter1/chapter1BossViewportProjection";

type PlayerBombRuntime = any;

/**
 * 현재 플레이어 위치를 정화 파동의 고정 중심으로 저장하고 폭탄 연출을 시작한다.
 * 폭탄 사용 순간에는 적이나 탄환을 즉시 삭제하지 않는다.
 */
export function triggerPlayerSmartBombSystem(engine: PlayerBombRuntime) {
  if (engine.player.bombs <= 0 || engine.bombActive || engine.player.isDead) return;
  engine.player.bombs--;
  if (engine.onBombsChanged) engine.onBombsChanged(engine.player.bombs);

  sfx.bossExplode();
  engine.bombActive = true;
  engine.bombRadius = 0;
  engine.bombOriginX = engine.player.x + engine.player.width / 2;
  engine.bombOriginY = engine.player.y + engine.player.height / 2;
  engine.bombMaxRadius = Math.hypot(engine.canvas.width, engine.canvas.height) + 80;
  engine.bossBombHitSet.clear();

  for (let i = 0; i < 60; i++) {
    const p = new Particle();
    p.x = engine.bombOriginX;
    p.y = engine.bombOriginY;
    const angle = (i / 60) * Math.PI * 2;
    p.vx = Math.cos(angle) * 450;
    p.vy = Math.sin(angle) * 450;
    p.color = i % 3 === 0 ? "#fff7c2" : i % 3 === 1 ? "#ffe66f" : "#ffd43b";
    p.life = p.maxLife = 1.2;
    p.size = 8;
    engine.particles.push(p);
  }
}

/**
 * 정화 파동 반경을 확장하고 파동이 닿은 대상만 제거한다.
 * 일반 탄환과 몬스터뿐 아니라 원본 챕터 1 보스 런타임의 탄환도 같은 반경 기준으로 처리한다.
 */
export function updatePlayerSmartBombSystem(engine: PlayerBombRuntime, dt: number) {
  if (!engine.bombActive) return;
  engine.bombRadius += 1200 * dt;
  const originX = engine.bombOriginX;
  const originY = engine.bombOriginY;

  engine.bullets = engine.bullets.filter((b: any) => {
    if (b.isEnemy) {
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      if (Math.hypot(bx - originX, by - originY) <= engine.bombRadius + Math.max(b.width, b.height) / 2) {
        engine.spawnExplosion(bx, by, "#ffe66f", 2);
        return false;
      }
    }
    return true;
  });

  // 원본 보스 런타임의 중앙 배치 오프셋과 배율을 반영해 정화 파동 좌표를 환산한다.
  const bossProjection = getChapter1BossViewportProjection(engine.canvas);
  engine.chapter1Boss?.core?.clearEnemyProjectilesWithinRadius?.(
    (originX - bossProjection.offsetX) / bossProjection.scale,
    (originY - bossProjection.offsetY) / bossProjection.scale,
    engine.bombRadius / bossProjection.scale,
  );

  engine.enemies.forEach((e: any) => {
    if ((e as any).chapter1ExactBossProxy || !e.active) return;
    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    if (Math.hypot(ex - originX, ey - originY) > engine.bombRadius + Math.max(e.width, e.height) / 2) return;

    if (e.type === "boss") {
      if (!engine.bossBombHitSet.has(e)) {
        engine.bossBombHitSet.add(e);
        e.hp -= 50;
        sfx.bossHit();
        engine.spawnExplosion(ex, ey, "#ffd43b", 30);
      }
      return;
    }

    e.hp = 0;
    engine.deactivateEnemy(e);
    engine.spawnExplosion(ex, ey, "#ffe66f", 12);
    engine.awardScore(100);
  });

  engine.meteors.forEach((m: any) => {
    if (!m.active) return;
    if (Math.hypot(m.x - originX, m.y - originY) <= engine.bombRadius + m.radius) {
      m.active = false;
      sfx.enemyExplode();
      engine.awardScore(80);
      engine.spawnExplosion(m.x, m.y, "#64748b", 22);
    }
  });

  engine.debrisCovers.forEach((d: any) => {
    if (!d.active) return;
    const dx = d.x + d.width / 2;
    const dy = d.y + d.height / 2;
    if (Math.hypot(dx - originX, dy - originY) <= engine.bombRadius + Math.max(d.width, d.height) / 2) {
      d.hp = 0;
      d.active = false;
      sfx.enemyExplode();
      engine.spawnExplosion(dx, dy, "#94a3b8", 15);
    }
  });

  if (engine.bombRadius >= engine.bombMaxRadius) engine.bombActive = false;
}
