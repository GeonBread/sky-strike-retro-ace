/**
 * 적탄 시각 디자인 렌더러
 *
 * 적과 보스가 사용하는 탄환의 시각 타입을 결정하고, 타입별 탄환 모양을 캔버스에 그린다.
 * 탄환의 움직임이나 충돌 판정이 아니라 색상, 발광, 꼬리, 미사일 형태 같은 시각 표현을 바꿀 때 이 파일을 수정한다.
 */

import { Bullet, type BulletVisualType } from "../entities";

type BulletVisualRenderEngine = any;

/**
 * 탄환 데이터의 visualType과 type 값을 기준으로 렌더링에 사용할 시각 타입을 결정한다.
 * 별도 visualType이 지정된 탄환은 그 값을 우선하고, 없으면 탄환 type에 맞는 기본 디자인을 반환한다.
 */
export function getBulletVisualTypeSystem(b: Bullet): BulletVisualType {

    if (b.visualType) return b.visualType;
    if (b.type === "electric_missile") return "tesla_spine_missile";
    if (b.type === "tail_rocket") return "comet_spear";
    if (b.type === "recall_shard" || b.type === "crystal" || b.type === "ricochet") return "rift_shard";
    if (b.type === "void_mine" || b.type === "parent_cross" || b.type === "parent_nsplit" || b.type === "splitting_pellet") return "cracked_core";
    if (b.type === "gravity_ball" || b.type === "gravity_singularity" || b.type === "colliding_orb" || b.type === "heavy") return "core_orb";
    if (b.type === "needle") return "comet_needle";
    if (b.type === "homing" || b.type === "delayed") return "drone_missile";
    if (b.type === "ring") return "star_beacon";
    if (b.type === "dash_paint_bullet" || b.type === "dilation_bullet") return "phase_core";
    if (b.type === "mine_orb") return "spore_glob";
    if (b.type === "plasma") return "cosmic_plasma_core";
    return "plasma_bolt";
  
}

/**
 * 계산된 시각 타입에 맞는 탄환 렌더링 함수를 선택해 호출한다.
 * 호출부는 탄환 중심 좌표를 넘기고, 이 함수는 실제 모양별 렌더러로 분기한다.
 */
export function renderEnemyBulletVisualSystem(engine: BulletVisualRenderEngine, b: Bullet, visualType: BulletVisualType, cx: number, cy: number): void {

    switch (visualType) {
      case "comet_needle":
        engine.renderCometNeedle(b, cx, cy);
        break;
      case "core_orb":
        engine.renderCoreOrb(b, cx, cy);
        break;
      case "cracked_core":
        engine.renderCrackedCore(b, cx, cy);
        break;
      case "drone_missile":
        engine.renderDroneMissile(b, cx, cy);
        break;
      case "tesla_spark":
        engine.renderTeslaSpark(b, cx, cy);
        break;
      case "spore_glob":
        engine.renderSporeGlob(b, cx, cy);
        break;
      case "cosmic_plasma_core":
        engine.renderCosmicPlasmaCore(b, cx, cy);
        break;
      case "comet_spear":
        engine.renderCometSpear(b, cx, cy);
        break;
      case "tesla_spine_missile":
        engine.renderTeslaSpineMissile(b, cx, cy);
        break;
      case "rift_shard":
        engine.renderRiftShard(b, cx, cy);
        break;
      case "phase_core":
        engine.renderPhaseCore(b, cx, cy);
        break;
      case "star_beacon":
        engine.renderStarBeacon(b, cx, cy);
        break;
      default:
        engine.renderPlasmaBolt(b, cx, cy);
    }
  
}

/**
 * 기본 플라즈마 볼트를 중심부 발광과 외곽 링으로 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderPlasmaBoltSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const r = Math.max(b.width, b.height) * 1.4;
    const grad = engine.ctx.createRadialGradient(cx, cy, r * 0.12, cx, cy, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.34, b.color);
    grad.addColorStop(1, "rgba(15,23,42,0)");
    engine.ctx.fillStyle = grad;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    engine.ctx.fill();
    engine.ctx.strokeStyle = b.color;
    engine.ctx.lineWidth = 1.25;
    engine.ctx.globalAlpha = 0.85;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    engine.ctx.stroke();
  
}

/**
 * 속도 방향을 기준으로 긴 혜성형 바늘 탄환을 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderCometNeedleSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const angle = Math.atan2(b.vy, b.vx);
    const length = Math.max(b.width, b.height) * 3.1;
    const thickness = Math.max(4, Math.min(b.width, b.height) * 0.8);
    engine.ctx.translate(cx, cy);
    engine.ctx.rotate(angle);
    engine.ctx.shadowColor = b.color;
    engine.ctx.shadowBlur = 12;
    engine.ctx.fillStyle = "rgba(255,255,255,0.18)";
    engine.ctx.beginPath();
    engine.ctx.moveTo(length * 0.58, 0);
    engine.ctx.lineTo(-length * 0.52, -thickness * 1.45);
    engine.ctx.lineTo(-length * 0.2, 0);
    engine.ctx.lineTo(-length * 0.52, thickness * 1.45);
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.fillStyle = b.color;
    engine.ctx.strokeStyle = "#ffffff";
    engine.ctx.lineWidth = 1.4;
    engine.ctx.beginPath();
    engine.ctx.moveTo(length * 0.52, 0);
    engine.ctx.lineTo(-length * 0.22, -thickness * 0.62);
    engine.ctx.lineTo(-length * 0.42, 0);
    engine.ctx.lineTo(-length * 0.22, thickness * 0.62);
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.stroke();
  
}

/**
 * 중심 핵과 회전 궤도를 가진 중량 구체 탄환을 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderCoreOrbSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const r = Math.max(b.width, b.height) * 1.55;
    const grad = engine.ctx.createRadialGradient(cx, cy, r * 0.12, cx, cy, r);
    grad.addColorStop(0, "#030712");
    grad.addColorStop(0.48, "#1e1b4b");
    grad.addColorStop(0.82, b.color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    engine.ctx.fillStyle = grad;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    engine.ctx.fill();
    engine.ctx.strokeStyle = "#f472b6";
    engine.ctx.lineWidth = 2;
    engine.ctx.globalAlpha = 0.85;
    const spin = performance.now() * 0.008;
    engine.ctx.beginPath();
    for (let i = 0; i < 4; i++) engine.ctx.arc(cx, cy, r * 0.52, spin + i * Math.PI / 2, spin + i * Math.PI / 2 + 1.35);
    engine.ctx.stroke();
  
}

/**
 * 갈라진 코어 형태의 분열/지뢰 계열 탄환을 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderCrackedCoreSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const r = Math.max(b.width, b.height) * 1.08;
    const spin = performance.now() * 0.004 + (b.age || 0) * 2;
    engine.ctx.translate(cx, cy);
    engine.ctx.rotate(spin);
    engine.ctx.shadowColor = b.color;
    engine.ctx.shadowBlur = 15;
    engine.ctx.fillStyle = "#042f2e";
    engine.ctx.strokeStyle = b.color;
    engine.ctx.lineWidth = 2;
    engine.ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = i % 2 === 0 ? r * 1.18 : r * 0.56;
      if (i === 0) engine.ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else engine.ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.stroke();
    engine.ctx.strokeStyle = "#ccfbf1";
    engine.ctx.lineWidth = 1;
    engine.ctx.beginPath();
    engine.ctx.moveTo(-r * 0.6, -r * 0.15);
    engine.ctx.lineTo(-r * 0.05, r * 0.2);
    engine.ctx.lineTo(r * 0.58, -r * 0.28);
    engine.ctx.moveTo(-r * 0.35, r * 0.48);
    engine.ctx.lineTo(r * 0.28, r * 0.1);
    engine.ctx.stroke();
  
}

/**
 * 유도탄 계열 탄환을 진행 방향에 맞춰 미사일 형태로 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderDroneMissileSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
    const w = Math.max(8, b.width * 0.75);
    const h = Math.max(18, b.height * 1.4);
    engine.ctx.translate(cx, cy);
    engine.ctx.rotate(angle);
    engine.ctx.shadowColor = b.color;
    engine.ctx.shadowBlur = 12;
    engine.ctx.fillStyle = "rgba(255,255,255,0.16)";
    engine.ctx.beginPath();
    engine.ctx.ellipse(0, h * 0.12, w * 1.05, h * 0.8, 0, 0, Math.PI * 2);
    engine.ctx.fill();
    engine.ctx.fillStyle = "#020617";
    engine.ctx.strokeStyle = b.color;
    engine.ctx.lineWidth = 2;
    engine.ctx.beginPath();
    engine.ctx.moveTo(0, -h * 0.62);
    engine.ctx.lineTo(w * 0.72, -h * 0.12);
    engine.ctx.lineTo(w * 0.44, h * 0.56);
    engine.ctx.lineTo(0, h * 0.34);
    engine.ctx.lineTo(-w * 0.44, h * 0.56);
    engine.ctx.lineTo(-w * 0.72, -h * 0.12);
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.stroke();
    engine.ctx.fillStyle = "#ffffff";
    engine.ctx.fillRect(-2, -h * 0.18, 4, h * 0.36);
  
}

/**
 * 전기 스파크 계열 탄환을 불규칙한 번개 선으로 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderTeslaSparkSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const len = Math.max(b.width, b.height) * 2.4;
    const angle = Math.atan2(b.vy, b.vx);
    engine.ctx.translate(cx, cy);
    engine.ctx.rotate(angle);
    engine.ctx.shadowColor = "#67e8f9";
    engine.ctx.shadowBlur = 15;
    engine.ctx.strokeStyle = b.color || "#67e8f9";
    engine.ctx.lineWidth = 2.4;
    engine.ctx.beginPath();
    engine.ctx.moveTo(-len * 0.5, 0);
    for (let i = 1; i <= 5; i++) {
      engine.ctx.lineTo(-len * 0.5 + (len * i) / 5, (Math.random() - 0.5) * 12);
    }
    engine.ctx.stroke();
    engine.ctx.strokeStyle = "#ffffff";
    engine.ctx.lineWidth = 1;
    engine.ctx.stroke();
  
}

/**
 * 포자 구체 계열 탄환을 반투명 외피와 내부 입자로 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderSporeGlobSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const r = Math.max(b.width, b.height) * 1.2;
    engine.ctx.shadowColor = b.color;
    engine.ctx.shadowBlur = 12;
    engine.ctx.fillStyle = "rgba(134, 239, 172, 0.25)";
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    engine.ctx.fill();
    engine.ctx.fillStyle = b.color;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2);
    engine.ctx.fill();
    engine.ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i++) {
      const a = performance.now() * 0.002 + i * 2.1;
      engine.ctx.beginPath();
      engine.ctx.arc(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, r * 0.12, 0, Math.PI * 2);
      engine.ctx.fill();
    }
  
}

/**
 * 꼬리 광선을 가진 우주 플라즈마 코어 탄환을 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderCosmicPlasmaCoreSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const r = Math.max(b.width, b.height) * 1.42;
    const speed = Math.hypot(b.vx, b.vy) || 1;
    const tailX = cx - (b.vx / speed) * r * 2.4;
    const tailY = cy - (b.vy / speed) * r * 2.4;
    const tail = engine.ctx.createLinearGradient(tailX, tailY, cx, cy);
    tail.addColorStop(0, "rgba(34,211,238,0)");
    tail.addColorStop(1, "rgba(34,211,238,0.55)");
    engine.ctx.strokeStyle = tail;
    engine.ctx.lineWidth = r * 1.1;
    engine.ctx.beginPath();
    engine.ctx.moveTo(tailX, tailY);
    engine.ctx.lineTo(cx, cy);
    engine.ctx.stroke();
    engine.ctx.shadowColor = "#22d3ee";
    engine.ctx.shadowBlur = 18;
    const grad = engine.ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.42, "#67e8f9");
    grad.addColorStop(1, "rgba(125, 211, 252, 0)");
    engine.ctx.fillStyle = grad;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    engine.ctx.fill();
    engine.ctx.strokeStyle = "#a78bfa";
    engine.ctx.lineWidth = 1.5;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
    engine.ctx.stroke();
  
}

/**
 * 로켓형 꼬리 탄환을 진행 방향에 맞춘 창 형태로 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderCometSpearSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
    const color = b.color || "#38bdf8";
    engine.ctx.translate(cx, cy);
    engine.ctx.rotate(angle);
    engine.ctx.shadowColor = color;
    engine.ctx.shadowBlur = 16;
    engine.ctx.fillStyle = "rgba(14,165,233,0.18)";
    engine.ctx.beginPath();
    engine.ctx.ellipse(0, 10, 12, 34, 0, 0, Math.PI * 2);
    engine.ctx.fill();
    engine.ctx.fillStyle = "#082f49";
    engine.ctx.strokeStyle = color;
    engine.ctx.lineWidth = 2.1;
    engine.ctx.beginPath();
    engine.ctx.moveTo(0, -24);
    engine.ctx.lineTo(10, -3);
    engine.ctx.lineTo(6, 20);
    engine.ctx.lineTo(0, 12);
    engine.ctx.lineTo(-6, 20);
    engine.ctx.lineTo(-10, -3);
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.stroke();
    engine.ctx.fillStyle = "#ffffff";
    engine.ctx.fillRect(-2.5, -9, 5, 14);
  
}

/**
 * 전기 미사일 탄환을 방전 꼬리와 척추형 본체로 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderTeslaSpineMissileSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
    engine.ctx.translate(cx, cy);
    engine.ctx.rotate(angle);
    engine.ctx.shadowColor = "#a3e635";
    engine.ctx.shadowBlur = 18;
    engine.ctx.strokeStyle = "rgba(103,232,249,0.9)";
    engine.ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      engine.ctx.beginPath();
      engine.ctx.moveTo((Math.random() - 0.5) * 10, 24 + i * 8);
      engine.ctx.lineTo((Math.random() - 0.5) * 20, 40 + i * 8);
      engine.ctx.stroke();
    }
    engine.ctx.fillStyle = "#020617";
    engine.ctx.strokeStyle = "#a3e635";
    engine.ctx.lineWidth = 2.4;
    engine.ctx.beginPath();
    engine.ctx.moveTo(0, -25);
    engine.ctx.lineTo(12, -5);
    engine.ctx.lineTo(8, 18);
    engine.ctx.lineTo(3, 10);
    engine.ctx.lineTo(0, 26);
    engine.ctx.lineTo(-3, 10);
    engine.ctx.lineTo(-8, 18);
    engine.ctx.lineTo(-12, -5);
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.stroke();
    engine.ctx.strokeStyle = "#ffffff";
    engine.ctx.lineWidth = 1.2;
    engine.ctx.beginPath();
    engine.ctx.moveTo(0, -16);
    engine.ctx.lineTo(0, 13);
    engine.ctx.moveTo(-7, -3);
    engine.ctx.lineTo(7, -3);
    engine.ctx.stroke();
  
}

/**
 * 균열 파편 탄환을 회전하는 별형 조각으로 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderRiftShardSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const spin = performance.now() * 0.007 + cx * 0.01;
    const r = Math.max(b.width, b.height) * 1.35;
    engine.ctx.translate(cx, cy);
    engine.ctx.rotate(spin);
    engine.ctx.shadowColor = b.color;
    engine.ctx.shadowBlur = 14;
    engine.ctx.fillStyle = "rgba(45,212,191,0.22)";
    engine.ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.42;
      if (i === 0) engine.ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else engine.ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.strokeStyle = "#ffffff";
    engine.ctx.lineWidth = 1.35;
    engine.ctx.stroke();
    engine.ctx.fillStyle = b.color;
    engine.ctx.beginPath();
    engine.ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    engine.ctx.fill();
  
}

/**
 * 정지/돌진 상태가 있는 위상 코어 탄환을 글리치 사각형으로 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderPhaseCoreSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const w = b.width * 1.45;
    const h = b.height * 1.45;
    const frozen = b.type === "dilation_bullet" && b.dilationState === "frozen";
    const jitter = frozen ? 4.5 : 2.0;
    const gx = cx + (Math.random() - 0.5) * jitter;
    const gy = cy + (Math.random() - 0.5) * jitter;
    engine.ctx.globalAlpha = 0.72;
    engine.ctx.fillStyle = "#22d3ee";
    engine.ctx.fillRect(gx - w / 2 - 3, gy - h / 2 + 1, w, h);
    engine.ctx.fillStyle = "#ef4444";
    engine.ctx.fillRect(gx - w / 2 + 2, gy - h / 2 - 2, w, h);
    engine.ctx.globalAlpha = 0.95;
    engine.ctx.fillStyle = b.color;
    engine.ctx.fillRect(gx - w / 2, gy - h / 2, w, h);
    engine.ctx.fillStyle = "#ffffff";
    engine.ctx.fillRect(gx - w * 0.22, gy - h * 0.22, w * 0.44, h * 0.44);
  
}

/**
 * 링 계열 탄환을 십자 비콘과 이중 원형 테두리로 그린다.
 * 탄환 데이터와 중심 좌표를 사용하며, 캔버스 상태 저장/복원은 상위 호출부에서 관리한다.
 */
export function renderStarBeaconSystem(engine: BulletVisualRenderEngine, b: Bullet, cx: number, cy: number): void {

    const r = Math.max(b.width, b.height) * 1.45;
    engine.ctx.shadowColor = b.color;
    engine.ctx.shadowBlur = 14;
    engine.ctx.strokeStyle = b.color;
    engine.ctx.lineWidth = 4.8;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    engine.ctx.stroke();
    engine.ctx.strokeStyle = "#ffffff";
    engine.ctx.lineWidth = 1.4;
    engine.ctx.beginPath();
    engine.ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    engine.ctx.stroke();
    engine.ctx.beginPath();
    engine.ctx.moveTo(cx - r, cy);
    engine.ctx.lineTo(cx + r, cy);
    engine.ctx.moveTo(cx, cy - r);
    engine.ctx.lineTo(cx, cy + r);
    engine.ctx.stroke();
  
}
