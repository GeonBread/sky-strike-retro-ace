/**
 * 플레이어 피격·사망 처리 시스템
 *
 * 이 파일은 플레이어가 피해를 받았을 때 목숨 감소, 사망 상태 전환, 피격 파티클,
 * 진동 연출과 UI 콜백 호출을 담당한다. 플레이어 피격 연출과 사망 대기 시간을 수정할 때 이 파일을 수정한다.
 */

import { Particle } from "../entities";
import { sfx } from "../AudioSystem";

type PlayerDamageRuntime = any;

/**
 * 플레이어 피격을 적용하고 남은 목숨에 따라 사망 대기 상태 또는 게임오버 준비 상태로 전환한다.
 * 이 함수는 플레이어 체력, 무적 시간, 폭탄 수, 화면 흔들림, 파티클 배열을 갱신한다.
 */
export function triggerPlayerDamageAndRespawnSystem(engine: PlayerDamageRuntime) {
  engine.player.hp--;
  sfx.hit();

  const px = engine.player.x + engine.player.width / 2;
  const py = engine.player.y + engine.player.height / 2;

  // Epic dynamic particle shattering visual
  engine.spawnExplosion(px, py, "#ef4444", 45);
  engine.spawnExplosion(px, py, "#f97316", 30);
  engine.spawnExplosion(px, py, "#38bdf8", 20); // shiny power core sparks

  // Create random floating metallic mechanical shards
  for (let i = 0; i < 15; i++) {
    const p = new Particle();
    p.x = px;
    p.y = py;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 220 + 90;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.color =
      Math.random() < 0.5
        ? "#60a5fa"
        : Math.random() < 0.5
          ? "#94a3b8"
          : "#cbd5e1";
    p.size = Math.random() * 5 + 3;
    p.maxLife = Math.random() * 0.9 + 0.6;
    p.life = p.maxLife;
    engine.particles.push(p);
  }

  engine.player.isDead = true;
  engine.player.deadTimer = 2.0; // disappear for 2 seconds before respawn

  if (engine.player.powerLevel > 1) engine.player.powerLevel--;

  // Move out-of-bounds to prevent any further hits or drawing while dead
  engine.player.x = -999;
  engine.player.y = -999;
}
