/**
 * 파티클·폭발 효과 시스템
 *
 * 이 파일은 폭발 파티클 생성과 기존 파티클의 수명/위치 갱신을 담당한다.
 * 폭발 입자 개수, 속도, 수명, 크기 같은 전투 이펙트 연출을 수정할 때 이 파일을 수정한다.
 */

import { Particle } from "../entities";
import { updatePlayerBulletHitParticleSystem } from "./playerBulletHitEffectSystem";

type ParticleEffectRuntime = any;

/**
 * 활성 파티클의 위치와 수명을 갱신하고 수명이 끝난 파티클을 제거한다.
 * 파티클 배열의 각 원소에 속도 기반 이동과 life 감소를 적용한다.
 */
export function updateParticleEffectSystem(engine: ParticleEffectRuntime, dt: number) {
engine.particles.forEach((p) => {
  if (p.effectKind === "playerBulletHit") {
    updatePlayerBulletHitParticleSystem(p, dt);
    return;
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.life -= dt;
  if (p.life <= 0) p.active = false;
});
engine.particles = engine.particles.filter((p) => p.active);
}

/**
 * 지정한 좌표를 중심으로 무작위 방향과 속도를 가진 폭발 파티클을 생성한다.
 * 색상과 생성 개수를 입력받아 전투 피격, 파괴, 폭발 연출에 사용할 입자들을 particles 배열에 추가한다.
 */
export function spawnExplosionParticleBurstSystem(engine: ParticleEffectRuntime, x: number, y: number, color: string, count: number) {
for (let i = 0; i < count; i++) {
  const p = new Particle();
  p.x = x;
  p.y = y;
  p.width = Math.random() * 4 + 3;
  p.height = p.width;
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * 200 + 80;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  p.life = p.maxLife = Math.random() * 0.7 + 0.3;
  p.color = color;
  engine.particles.push(p);
}
}
