/**
 * 일반 몬스터 도형 렌더러
 *
 * 이 파일은 일반 몬스터와 특수 일반 몬스터의 기본 도형 실루엣, 발광 코어,
 * 방어막·중력장 같은 시각 효과를 그리는 역할을 담당한다.
 * 일반 몬스터 외형, 색상, 도형 실루엣을 수정할 때 이 파일을 수정한다.
 */

import { Enemy } from "../entities";

type EnemyRenderRuntime = any;

/**
 * 몬스터 타입과 visualId를 기준으로 캔버스에 해당 몬스터의 도형 외형을 그린다.
 * 이 함수는 현재 캔버스 렌더링 컨텍스트의 스타일과 변환 상태를 사용한다.
 */
export function renderEnemyShapeSystem(engine: EnemyRenderRuntime, e: Enemy) {
  if (e.type === "ricochet_shooter") {
    engine.ctx.fillStyle = "#fbbf24"; // Golden Neon
  } else if (e.type === "counter_on_death") {
    engine.ctx.fillStyle = "#f43f5e"; // Rose Crimson
  } else if (e.type === "ink_shooter") {
    engine.ctx.fillStyle = "#818cf8"; // Slate Indigo
  } else if (e.type === "gravity_vortex_mob") {
    engine.ctx.fillStyle = "#c084fc"; // Purple Vortex
  } else if (e.type === "assault_commander") {
    engine.ctx.fillStyle = "#0f172a"; // Heavy assault command craft
  } else {
    engine.ctx.fillStyle =
      e.type === "boss"
        ? "#dc2626"
        : `hsl(${(e.visualId * 36) % 360}, 80%, 50%)`;
  }
  engine.ctx.strokeStyle = "#ffffff";
  engine.ctx.lineWidth = 1;

  engine.ctx.save();
  engine.ctx.translate(e.x + e.width / 2, e.y + e.height / 2);

  const w2 = e.width / 2;
  const h2 = e.height / 2;

  if (e.type === "assault_commander") {
    const pulse = 0.65 + Math.sin(performance.now() * 0.009) * 0.25;
    const accent = engine.getCombatTier() >= 3 ? "#c084fc" : "#22d3ee";

    engine.ctx.fillStyle = "#020617";
    engine.ctx.strokeStyle = accent;
    engine.ctx.lineWidth = 2.5;
    engine.ctx.shadowColor = accent;
    engine.ctx.shadowBlur = 14;

    engine.ctx.beginPath();
    engine.ctx.moveTo(0, h2);
    engine.ctx.lineTo(-w2 * 0.38, h2 * 0.26);
    engine.ctx.lineTo(-w2, h2 * 0.08);
    engine.ctx.lineTo(-w2 * 0.58, -h2 * 0.18);
    engine.ctx.lineTo(-w2 * 0.24, -h2);
    engine.ctx.lineTo(0, -h2 * 0.62);
    engine.ctx.lineTo(w2 * 0.24, -h2);
    engine.ctx.lineTo(w2 * 0.58, -h2 * 0.18);
    engine.ctx.lineTo(w2, h2 * 0.08);
    engine.ctx.lineTo(w2 * 0.38, h2 * 0.26);
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.stroke();

    engine.ctx.shadowBlur = 0;
    engine.ctx.fillStyle = accent;
    engine.ctx.globalAlpha = 0.35 + pulse * 0.35;
    engine.ctx.fillRect(-w2 * 0.72, h2 * 0.08, w2 * 0.34, 5);
    engine.ctx.fillRect(w2 * 0.38, h2 * 0.08, w2 * 0.34, 5);
    engine.ctx.globalAlpha = 1;

    engine.ctx.fillStyle = "#e0f2fe";
    engine.ctx.beginPath();
    engine.ctx.ellipse(0, -h2 * 0.2, w2 * 0.18, h2 * 0.28, 0, 0, Math.PI * 2);
    engine.ctx.fill();

    engine.ctx.fillStyle = accent;
    engine.ctx.beginPath();
    engine.ctx.arc(0, h2 * 0.18, 5 + pulse * 3, 0, Math.PI * 2);
    engine.ctx.fill();

    engine.ctx.restore();
    return;
  }

  engine.ctx.beginPath();
  switch (e.visualId) {
    case 1: // Delta wide
      engine.ctx.moveTo(0, h2);
      engine.ctx.lineTo(-w2, -h2);
      engine.ctx.lineTo(w2, -h2);
      break;
    case 2: // UFO saucer
      engine.ctx.ellipse(0, 0, w2, h2 * 0.6, 0, 0, Math.PI * 2);
      engine.ctx.fill();
      engine.ctx.beginPath();
      engine.ctx.fillStyle = "#fff";
      engine.ctx.globalAlpha = 0.5;
      engine.ctx.arc(0, -h2 * 0.3, w2 * 0.4, 0, Math.PI + Math.PI, true);
      break;
    case 3: // Twin boom dart
      engine.ctx.moveTo(0, h2);
      engine.ctx.lineTo(-w2 * 0.4, -h2);
      engine.ctx.lineTo(-w2 * 0.2, -h2);
      engine.ctx.lineTo(0, h2 * 0.4);
      engine.ctx.lineTo(w2 * 0.2, -h2);
      engine.ctx.lineTo(w2 * 0.4, -h2);
      break;
    case 4: // Blocky Tank
      engine.ctx.rect(-w2, -h2, e.width, e.height);
      break;
    case 5: // Star Diamond
      engine.ctx.moveTo(0, h2);
      engine.ctx.lineTo(-w2, 0);
      engine.ctx.lineTo(0, -h2);
      engine.ctx.lineTo(w2, 0);
      break;
    case 6: // X-Wing Profile
      engine.ctx.moveTo(0, h2);
      engine.ctx.lineTo(-w2, h2);
      engine.ctx.lineTo(-w2 * 0.5, 0);
      engine.ctx.lineTo(-w2, -h2);
      engine.ctx.lineTo(0, -h2 * 0.5);
      engine.ctx.lineTo(w2, -h2);
      engine.ctx.lineTo(w2 * 0.5, 0);
      engine.ctx.lineTo(w2, h2);
      break;
    case 7: // Hexagon
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        engine.ctx.lineTo(Math.cos(a) * w2, Math.sin(a) * h2);
      }
      break;
    case 8: // Bulbous
      engine.ctx.arc(0, 0, w2, 0, Math.PI * 2);
      break;
    case 9: // Arrow head
      engine.ctx.moveTo(0, h2);
      engine.ctx.lineTo(-w2, -h2);
      engine.ctx.lineTo(0, -h2 * 0.2);
      engine.ctx.lineTo(w2, -h2);
      break;
    case 10: // Scythe
      engine.ctx.moveTo(0, h2);
      engine.ctx.lineTo(-w2, -h2 * 0.5);
      engine.ctx.lineTo(w2, -h2 * 0.5);
      break;
  }
  engine.ctx.closePath();
  engine.ctx.fill();

  // glowing core
  engine.ctx.fillStyle = "#fff";
  engine.ctx.globalAlpha = 1.0;
  engine.ctx.fillRect(-2, -2, 4, 4);

  // Hardcore defensive or active visual representations
  if (e.type === "counter_on_death") {
    // Rotating Rose Reflector Shield
    const spin = (performance.now() * 0.003) % (Math.PI * 2);
    engine.ctx.strokeStyle = "rgba(244, 63, 94, 0.65)";
    engine.ctx.lineWidth = 2;
    engine.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = spin + (i / 6) * Math.PI * 2;
      const rx = Math.cos(angle) * (w2 + 8);
      const ry = Math.sin(angle) * (h2 + 8);
      engine.ctx.lineTo(rx, ry);
    }
    engine.ctx.closePath();
    engine.ctx.stroke();
  } else if (e.type === "gravity_vortex_mob") {
    // Suction vortex lines
    const spin = (performance.now() * -0.006) % (Math.PI * 2);
    engine.ctx.strokeStyle = "rgba(192, 132, 252, 0.5)";
    engine.ctx.lineWidth = 1.5;
    engine.ctx.beginPath();
    engine.ctx.arc(0, 0, w2 + 6, spin, spin + Math.PI * 0.5);
    engine.ctx.stroke();
    engine.ctx.beginPath();
    engine.ctx.arc(0, 0, w2 + 6, spin + Math.PI, spin + Math.PI * 1.5);
    engine.ctx.stroke();
  }

  engine.ctx.restore();
}
