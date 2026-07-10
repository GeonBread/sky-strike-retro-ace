/**
 * 플레이어 탄 적중 효과 시스템
 *
 * v26 데모의 플레이어 탄 적중 파티클만 현재 프로젝트의 Particle 구조에 맞게 이식합니다.
 * 플레이어 탄의 발사 개수, 속도, 이동, 수명, 유도 및 데미지는 변경하지 않습니다.
 */

import { Bullet, Particle } from "../entities";

type PlayerBulletHitEffectRuntime = {
  particles: Particle[];
};

export type PlayerBulletHitTargetBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  hitWidth?: number;
  hitHeight?: number;
};

/**
 * 플레이어 탄 중심과 적의 실제 충돌 박스를 사용해 화면에 표시할 타격 지점을 계산합니다.
 * 적의 중심에 항상 효과를 띄우지 않고, 총알이 닿은 표면 또는 총알 중심에서 효과가 발생하도록 합니다.
 */
export function getPlayerBulletImpactPointSystem(
  bullet: Bullet,
  target: PlayerBulletHitTargetBox,
): { x: number; y: number } {
  const bulletCenterX = bullet.x + bullet.width / 2;
  const bulletCenterY = bullet.y + bullet.height / 2;

  const targetWidth = target.hitWidth ?? target.width;
  const targetHeight = target.hitHeight ?? target.height;
  const targetLeft = target.x + (target.width - targetWidth) / 2;
  const targetTop = target.y + (target.height - targetHeight) / 2;

  return {
    x: Math.max(targetLeft, Math.min(bulletCenterX, targetLeft + targetWidth)),
    y: Math.max(targetTop, Math.min(bulletCenterY, targetTop + targetHeight)),
  };
}

/**
 * 플레이어 탄이 적에게 맞았을 때 v26 규칙의 원형 타격 파티클 10개를 생성합니다.
 *
 * v26 수치를 현재 엔진의 초 단위 dt에 맞게 환산했습니다.
 * - 개수: 10개
 * - 속도: 약 72~252 px/s
 * - 수명: 약 0.325~0.525초
 * - 반지름: 4~9px
 * - 색상: 충돌한 플레이어 탄의 색상
 */
export function spawnPlayerBulletHitEffectSystem(
  engine: PlayerBulletHitEffectRuntime,
  bullet: Bullet,
  target: PlayerBulletHitTargetBox,
): void {
  const impact = getPlayerBulletImpactPointSystem(bullet, target);

  for (let index = 0; index < 10; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 180 + 72;
    const radius = Math.random() * 5 + 4;

    const particle = new Particle();
    particle.x = impact.x;
    particle.y = impact.y;
    particle.width = radius * 2;
    particle.height = radius * 2;
    particle.size = radius;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    particle.life = particle.maxLife = Math.random() * 0.2 + 0.325;
    particle.color = bullet.color || "#ffffff";
    particle.effectKind = "playerBulletHit";
    particle.gravity = 108;

    engine.particles.push(particle);
  }
}

/**
 * v26 타격 파티클 한 개를 갱신합니다.
 * 위치 이동, 약한 중력, 수명 감소만 처리하며 다른 전투 로직에는 영향을 주지 않습니다.
 */
export function updatePlayerBulletHitParticleSystem(
  particle: Particle,
  dt: number,
): void {
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
  particle.vy += particle.gravity * dt;
  particle.life -= dt;

  if (particle.life <= 0) {
    particle.active = false;
  }
}

/**
 * v26 스타일 타격 파티클 한 개를 렌더링합니다.
 * 탄 색상의 원 내부와 3px 검은 외곽선을 사용하고, 수명이 줄어들수록 투명해집니다.
 */
export function renderPlayerBulletHitParticleSystem(
  ctx: CanvasRenderingContext2D,
  particle: Particle,
): void {
  const alpha = Math.max(0, Math.min(1, particle.life / particle.maxLife));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = particle.color;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * v26 데모의 부유 적 위치 계산 방식을 참고하기 위한 예시 함수입니다.
 * 현재 프로젝트의 일반 적/보스 렌더러는 엔티티 좌표를 그대로 사용하므로 실제 충돌 처리에는 호출하지 않습니다.
 */
export function getV26EnemyScreenPositionExampleSystem(
  target: { x: number; y: number; phase?: number },
  timeMs: number,
): { x: number; y: number } {
  const phase = target.phase ?? 0;

  return {
    x: target.x + Math.sin(timeMs * 0.0012 + phase) * 20,
    y: target.y + Math.sin(timeMs * 0.002 + phase) * 8,
  };
}
