import { sfx } from "../AudioSystem";
import type {
  Chapter1WaveImpactParticle,
  Chapter1WaveVanishEffect,
  Chapter1WaveRuntime,
} from "./chapter1WaveTypes";
import { createChapter1WaveRuntime } from "./chapter1WaveTypes";

const TAU = Math.PI * 2;
const MAX_IMPACT_PARTICLES = 240;
const MAX_VANISH_EFFECTS = 80;

function runtimeOf(engine: any): Chapter1WaveRuntime {
  if (!engine.chapter1Wave) engine.chapter1Wave = createChapter1WaveRuntime();
  return engine.chapter1Wave;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function spawnChapter1WaveBurstParticlesSystem(
  engine: any,
  x: number,
  y: number,
  color = "#8ee8ff",
  count = 9,
  speed = 150,
): void {
  const runtime = runtimeOf(engine);
  const available = Math.max(0, MAX_IMPACT_PARTICLES - runtime.impactParticles.length);
  const actualCount = Math.min(count, available);
  for (let index = 0; index < actualCount; index += 1) {
    const angle = rand(0, TAU);
    const particleSpeed = rand(speed * 0.35, speed);
    runtime.impactParticles.push({
      x,
      y,
      vx: Math.cos(angle) * particleSpeed,
      vy: Math.sin(angle) * particleSpeed,
      age: 0,
      life: rand(0.2, 0.48),
      size: rand(1.3, 3.6),
      color,
      shape: particleSpeed > 120 ? "streak" : "diamond",
    });
  }
}

export function spawnChapter1WaveVanishEffectSystem(
  engine: any,
  x: number,
  y: number,
  color: string,
  size = 18,
  strength = 1,
): void {
  const runtime = runtimeOf(engine);
  if (runtime.vanishEffects.length >= MAX_VANISH_EFFECTS) runtime.vanishEffects.shift();
  runtime.vanishEffects.push({
    x,
    y,
    color,
    size,
    strength,
    age: 0,
    life: 0.24 + strength * 0.07,
  });
}

export function spawnChapter1PlayerBulletVanishSystem(engine: any, x: number, y: number): void {
  spawnChapter1WaveVanishEffectSystem(engine, x, y, "#76e8ff", 7, 0.55);
}

export function spawnChapter1EnemyHitEffectSystem(
  engine: any,
  x: number,
  y: number,
): void {
  spawnChapter1PlayerBulletVanishSystem(engine, x, y);
  spawnChapter1WaveBurstParticlesSystem(engine, x, y, "#ddf8ff", 2, 58);
}

export function spawnChapter1HazardHitEffectSystem(
  engine: any,
  x: number,
  y: number,
  scheduleBlock: boolean,
): void {
  spawnChapter1PlayerBulletVanishSystem(engine, x, y);
  spawnChapter1WaveBurstParticlesSystem(
    engine,
    x,
    y,
    scheduleBlock ? "#ffe08a" : "#bcf4ff",
    scheduleBlock ? 4 : 2,
    scheduleBlock ? 95 : 62,
  );
}

export function spawnChapter1HazardBreakEffectSystem(
  engine: any,
  x: number,
  y: number,
  color: string,
  size: number,
  scheduleBlock: boolean,
): void {
  spawnChapter1WaveVanishEffectSystem(
    engine,
    x,
    y,
    color,
    Math.max(10, Math.min(68, size * 0.62)),
    scheduleBlock ? 1.65 : 1,
  );
  spawnChapter1WaveBurstParticlesSystem(
    engine,
    x,
    y,
    color,
    scheduleBlock ? 10 : 3,
    scheduleBlock ? 190 : 95,
  );
}

export function spawnChapter1EnemyBulletImpactSystem(
  engine: any,
  x: number,
  y: number,
  color: string,
  size: number,
): void {
  spawnChapter1WaveVanishEffectSystem(
    engine,
    x,
    y,
    color,
    Math.max(10, Math.min(68, size * 0.62)),
    1,
  );
  spawnChapter1WaveBurstParticlesSystem(engine, x, y, color, 3, 95);
}

export function updateChapter1WaveImpactEffectsSystem(engine: any, dt: number): void {
  const runtime = runtimeOf(engine);
  for (const particle of runtime.impactParticles) {
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.975, dt * 60);
    particle.vy *= Math.pow(0.975, dt * 60);
  }
  runtime.impactParticles = runtime.impactParticles.filter((particle) => particle.age < particle.life);

  for (const effect of runtime.vanishEffects) effect.age += dt;
  runtime.vanishEffects = runtime.vanishEffects.filter((effect) => effect.age < effect.life);
}

export function renderChapter1WaveImpactEffectsSystem(engine: any): void {
  const runtime = runtimeOf(engine);
  const ctx = engine.ctx as CanvasRenderingContext2D;

  for (const effect of runtime.vanishEffects as Chapter1WaveVanishEffect[]) {
    const progress = Math.max(0, Math.min(1, effect.age / effect.life));
    const alpha = 1 - progress;
    const size = effect.size * (1 + progress * 0.75);
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = effect.color;
    ctx.fillStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 10 * effect.strength;
    ctx.globalAlpha = alpha * 0.85;
    ctx.lineWidth = Math.max(1.5, 3 * alpha * effect.strength);
    ctx.rotate(Math.PI / 4 + progress * 0.6);
    ctx.strokeRect(-size * 0.34, -size * 0.34, size * 0.68, size * 0.68);
    ctx.rotate(-Math.PI / 4 - progress * 0.6);
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2 + progress * 0.35;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * size * 0.18, Math.sin(angle) * size * 0.18);
      ctx.lineTo(Math.cos(angle) * size * 0.72, Math.sin(angle) * size * 0.72);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const particle of runtime.impactParticles as Chapter1WaveImpactParticle[]) {
    const alpha = Math.max(0, Math.min(1, 1 - particle.age / particle.life));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.strokeStyle = particle.color;
    ctx.globalCompositeOperation = "screen";
    const speed = Math.hypot(particle.vx, particle.vy);
    if (particle.shape === "streak" || speed > 120) {
      const divisor = speed || 1;
      const nx = particle.vx / divisor;
      const ny = particle.vy / divisor;
      ctx.lineWidth = Math.max(1, particle.size * alpha * 0.65);
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(
        particle.x - nx * particle.size * 3.5,
        particle.y - ny * particle.size * 3.5,
      );
      ctx.stroke();
    } else {
      ctx.translate(particle.x, particle.y);
      ctx.rotate(Math.PI / 4 + particle.age * 5);
      ctx.fillRect(
        -particle.size * alpha * 0.62,
        -particle.size * alpha * 0.62,
        particle.size * alpha * 1.24,
        particle.size * alpha * 1.24,
      );
    }
    ctx.restore();
  }
}

/**
 * 시간표 충돌 블록이 바닥에 설치되는 순간의 원본 시뮬레이터식 충격 연출입니다.
 * 강한 화면 진동, 넓은 충격 마름모, 수평 데이터 파편과 중심 폭발을 동시에 생성합니다.
 */
export function spawnChapter1ScheduleSlamEffectSystem(
  engine: any,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const size = Math.max(width, height);
  engine.screenShakeIntensity = Math.max(engine.screenShakeIntensity ?? 0, 22);
  sfx.enemyExplode();
  spawnChapter1WaveVanishEffectSystem(engine, x, y, "#fff2a8", Math.min(92, size * 0.88), 2.1);
  spawnChapter1WaveVanishEffectSystem(engine, x, y, "#ff695f", Math.min(76, size * 0.72), 1.65);
  spawnChapter1WaveBurstParticlesSystem(engine, x, y, "#fff7df", 18, 270);
  spawnChapter1WaveBurstParticlesSystem(engine, x, y, "#ff695f", 14, 220);

  // 바닥을 때리는 느낌이 나도록 좌우 방향 파편을 한 번 더 퍼뜨립니다.
  const runtime = runtimeOf(engine);
  const available = Math.max(0, MAX_IMPACT_PARTICLES - runtime.impactParticles.length);
  const horizontalCount = Math.min(18, available);
  for (let index = 0; index < horizontalCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    runtime.impactParticles.push({
      x: x + side * Math.random() * width * 0.18,
      y: y + height * 0.16,
      vx: side * rand(150, 360),
      vy: rand(-125, -35),
      age: 0,
      life: rand(0.28, 0.58),
      size: rand(2.4, 5.2),
      color: index % 3 === 0 ? "#fff7df" : "#ff8a62",
      shape: "streak",
    });
  }
  engine.spawnExplosion?.(x, y, "#ff695f", 28);
}
