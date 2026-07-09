/**
 * 장애물·운석 갱신 시스템
 *
 * 이 파일은 아케이드 전투 중 생성되는 엄폐 잔해와 운석의 생성, 이동, 충돌 처리를 담당한다.
 * 운석 등장 주기, 엄폐물 체력, 적탄 차단, 운석 플레이어 충돌 규칙을 수정할 때 이 파일을 수정한다.
 */

import { sfx } from "../AudioSystem";

type DebrisMeteorRuntime = any;

/**
 * 아케이드 시작 시 사용할 기본 엄폐 잔해를 생성한다.
 * 기존 잔해 배열을 초기화하고 화면 폭을 기준으로 좌우 엄폐물을 배치한다.
 */
export function spawnInitialDebrisCoverSystem(engine: DebrisMeteorRuntime) {
engine.debrisCovers = [];
}

/**
 * 운석 생성 타이머, 운석 이동, 엄폐물과 적탄 충돌, 운석과 플레이어 충돌을 갱신한다.
 * 샌드박스와 스토리 모드에서는 운석/엄폐물 전투 변수를 비활성화한다.
 */
export function updateDebrisAndMeteorSystem(engine: DebrisMeteorRuntime, dt: number) {
if (engine.isSandbox || engine.isStoryMode()) {
  engine.debrisCovers = [];
  engine.meteors = [];
  return;
}

// 1. Spawning Meteors from the top
engine.meteorTimer -= dt;
if (engine.meteorTimer <= 0) {
  engine.meteorTimer = 6.0 + Math.random() * 4.0; // Every 6-10s
  engine.meteors.push({
    x: Math.random() * (engine.canvas.width - 60) + 30,
    y: -50,
    radius: 18 + Math.random() * 16,
    vx: (Math.random() - 0.5) * 60,
    vy: 120 + Math.random() * 80,
    hp: 40,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 2.0,
    active: true,
  });
}

// 2. Update Meteors
engine.meteors.forEach((m) => {
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  m.rotation += m.rotSpeed * dt;

  if (m.y > engine.canvas.height + 50 || m.x < -50 || m.x > engine.canvas.width + 50) {
    m.active = false;
  }
});
engine.meteors = engine.meteors.filter((m) => m.active);

// 3. Collision logic: enemy bullets hitting defensive debris only.
engine.bullets.forEach((b) => {
  if (!b.active) return;
  
  if (b.isEnemy) {
    // Enemy bullets hitting defensive debris cover
    engine.debrisCovers.forEach((d) => {
      if (!d.active || !b.active) return;
      if (
        b.x + b.width > d.x &&
        b.x < d.x + d.width &&
        b.y + b.height > d.y &&
        b.y < d.y + d.height
      ) {
        b.active = false;
        engine.spawnExplosion(b.x, b.y, b.color, 4);
        d.hp -= 1; // Debris absorbs enemy attacks!
        if (d.hp <= 0) {
          d.active = false;
          sfx.enemyExplode();
          engine.spawnExplosion(d.x + d.width / 2, d.y + d.height / 2, "#94a3b8", 30);
        }
      }
    });
  }
});

// 4. Meteor hitting Player
if (engine.player.invulnTimer <= 0) {
  engine.meteors.forEach((m) => {
    if (!m.active) return;
    const pcx = engine.player.x + engine.player.width / 2;
    const pcy = engine.player.y + engine.player.height / 2;
    const dist = Math.hypot(pcx - m.x, pcy - m.y);
    if (dist < m.radius + engine.player.hitWidth / 2 + 5) {
      m.active = false;
      sfx.enemyExplode();
      engine.spawnExplosion(m.x, m.y, "#cbd5e1", 20);
      engine.triggerPlayerHit();
    }
  });
}
}
