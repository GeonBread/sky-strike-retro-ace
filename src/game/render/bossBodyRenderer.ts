/**
 * 보스 본체 렌더러
 *
 * 보스 기체의 날개, 장갑, 추진기, 좌우 포드, 티어별 색상 차이를 그린다.
 * 보스의 본체 외형이나 티어별 시각 강조를 바꿀 때 이 파일을 수정한다.
 */

import { Enemy } from "../entities";

type BossBodyRenderEngine = any;

/**
 * 보스 적 개체와 전투 티어를 받아 보스 본체를 캔버스에 그린다.
 * 보스 패턴 해저드나 탄환 디자인은 다루지 않고, 기체 본체의 도형 표현만 담당한다.
 */
export function renderBossBodySystem(engine: BossBodyRenderEngine, e: Enemy, tier: number): void {

    const cx = e.x + e.width / 2;
    const top = e.y;
    const bottom = e.y + e.height;
    const w2 = e.width / 2;
    const h = e.height;
    const time = performance.now() * 0.018;
    const accent = tier >= 4 ? "#e879f9" : tier === 3 ? "#a855f7" : tier === 2 ? "#f43f5e" : "#38bdf8";
    const armor = tier >= 4 ? "#18181b" : tier === 3 ? "#111827" : tier === 2 ? "#1e293b" : "#334155";
    const dark = "#020617";

    engine.ctx.save();

    const engineOffsets = tier >= 4 ? [-82, -48, -16, 16, 48, 82] : tier === 3 ? [-70, -35, 0, 35, 70] : tier === 2 ? [-46, -18, 18, 46] : [-28, 28];
    engineOffsets.forEach((offset, index) => {
      const flame = 14 + Math.sin(time + index) * 5 + tier * 4;
      engine.ctx.fillStyle = tier >= 4 ? "rgba(232, 121, 249, 0.82)" : tier === 3 ? "rgba(168, 85, 247, 0.8)" : tier === 2 ? "rgba(244, 63, 94, 0.75)" : "rgba(34, 211, 238, 0.7)";
      engine.ctx.beginPath();
      engine.ctx.moveTo(cx + offset - 8, top + 6);
      engine.ctx.lineTo(cx + offset, top - flame);
      engine.ctx.lineTo(cx + offset + 8, top + 6);
      engine.ctx.closePath();
      engine.ctx.fill();
      engine.ctx.fillStyle = "#ffffff";
      engine.ctx.globalAlpha = 0.55;
      engine.ctx.beginPath();
      engine.ctx.moveTo(cx + offset - 3, top + 5);
      engine.ctx.lineTo(cx + offset, top - flame * 0.55);
      engine.ctx.lineTo(cx + offset + 3, top + 5);
      engine.ctx.closePath();
      engine.ctx.fill();
      engine.ctx.globalAlpha = 1;
    });

    engine.ctx.shadowColor = accent;
    engine.ctx.shadowBlur = 8 + tier * 4;
    engine.ctx.fillStyle = dark;
    engine.ctx.strokeStyle = accent;
    engine.ctx.lineWidth = 2.2 + tier * 0.4;

    for (let side = -1; side <= 1; side += 2) {
      const wingReach = w2 + 28 + tier * 20;
      const wingBack = tier >= 4 ? 26 : tier === 3 ? 18 : 8;
      engine.ctx.beginPath();
      engine.ctx.moveTo(cx + side * 16, top + h * 0.25);
      engine.ctx.lineTo(cx + side * wingReach, top + h * 0.62);
      engine.ctx.lineTo(cx + side * (wingReach - 20), bottom + wingBack);
      engine.ctx.lineTo(cx + side * 26, top + h * 0.74);
      engine.ctx.closePath();
      engine.ctx.fill();
      engine.ctx.stroke();

      engine.ctx.fillStyle = armor;
      engine.ctx.beginPath();
      engine.ctx.moveTo(cx + side * 26, top + h * 0.46);
      engine.ctx.lineTo(cx + side * (wingReach - 18), top + h * 0.68);
      engine.ctx.lineTo(cx + side * 38, top + h * 0.68);
      engine.ctx.closePath();
      engine.ctx.fill();
      engine.ctx.stroke();
      engine.ctx.fillStyle = dark;
    }

    engine.ctx.fillStyle = armor;
    engine.ctx.strokeStyle = accent;
    engine.ctx.beginPath();
    engine.ctx.moveTo(cx - 28 - tier * 4, top + 8);
    engine.ctx.lineTo(cx + 28 + tier * 4, top + 8);
    engine.ctx.lineTo(cx + 22 + tier * 3, top + h * 0.48);
    engine.ctx.lineTo(cx + 9 + tier * 2, bottom - 10);
    engine.ctx.lineTo(cx, bottom + tier * 8);
    engine.ctx.lineTo(cx - 9 - tier * 2, bottom - 10);
    engine.ctx.lineTo(cx - 22 - tier * 3, top + h * 0.48);
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.stroke();

    engine.ctx.shadowBlur = 12 + tier * 4;
    engine.ctx.fillStyle = tier >= 4 ? "#f5d0fe" : tier === 1 ? "#67e8f9" : tier === 2 ? "#fda4af" : "#ddd6fe";
    engine.ctx.beginPath();
    engine.ctx.moveTo(cx - 10 - tier * 2, top + h * 0.38);
    engine.ctx.lineTo(cx + 10 + tier * 2, top + h * 0.38);
    engine.ctx.lineTo(cx + 5 + tier, top + h * 0.6);
    engine.ctx.lineTo(cx - 5 - tier, top + h * 0.6);
    engine.ctx.closePath();
    engine.ctx.fill();

    engine.ctx.shadowBlur = 0;
    engine.ctx.strokeStyle = "rgba(255,255,255,0.22)";
    engine.ctx.lineWidth = 1.2;
    engine.ctx.beginPath();
    engine.ctx.moveTo(cx, top + 16);
    engine.ctx.lineTo(cx, bottom - 18);
    engine.ctx.moveTo(cx - 32, top + h * 0.7);
    engine.ctx.lineTo(cx + 32, top + h * 0.7);
    engine.ctx.stroke();

    engine.ctx.fillStyle = dark;
    const podW = tier >= 4 ? 24 : tier === 3 ? 20 : 15;
    const podH = tier >= 4 ? 56 : tier === 3 ? 48 : 36;
    engine.ctx.fillRect(e.x - podW, top + h * 0.28, podW, podH);
    engine.ctx.fillRect(e.x + e.width, top + h * 0.28, podW, podH);
    engine.ctx.strokeStyle = accent;
    engine.ctx.strokeRect(e.x - podW, top + h * 0.28, podW, podH);
    engine.ctx.strokeRect(e.x + e.width, top + h * 0.28, podW, podH);

    engine.ctx.restore();
  
}
