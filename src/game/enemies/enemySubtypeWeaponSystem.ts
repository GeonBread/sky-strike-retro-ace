/**
 * 일반 몬스터 서브타입 무기 시스템
 *
 * 일반 몬스터가 공격 패턴에 따라 적탄을 생성하는 규칙을 담당한다.
 * 조준탄, 유도탄, 원형 산탄, 직선탄의 속도, 크기, 색상, visualType을 조정할 때 이 파일을 수정한다.
 */

import { Bullet, Enemy } from "../entities";
import { applyHobanwooEnemyBulletVisualSystem } from "../data/hobanwooEnemyBulletVisualCatalog";

export type EnemySubtypeWeaponPattern = "aimed" | "homing" | "shotgun" | "straight";

type EnemySubtypeWeaponRuntime = any;

/**
 * 적의 현재 위치와 플레이어 위치를 기준으로 지정된 공격 패턴의 적탄을 생성한다.
 * 생성된 탄환은 엔진의 bullets 배열에 추가되며, 탄환 이동과 렌더링은 별도 시스템에서 처리한다.
 */
export function fireEnemySubtypeWeaponSystem(
  engine: EnemySubtypeWeaponRuntime,
  e: Enemy,
  pattern: EnemySubtypeWeaponPattern,
) {
  const cx = e.x + e.width / 2;
  const cy = e.y + e.height;
  const tx = engine.player.x + engine.player.width / 2;
  const ty = engine.player.y + engine.player.height / 2;
  const angleToPlayer = Math.atan2(ty - cy, tx - cx);

  if (pattern === "aimed") {
    const b = new Bullet();
    b.x = cx - 4;
    b.y = cy;
    b.width = 8;
    b.height = 8;
    b.vx = Math.cos(angleToPlayer) * 190;
    b.vy = Math.sin(angleToPlayer) * 190;
    b.isEnemy = true;
    b.type = "needle";
    b.color = "#39ff14";
    applyHobanwooEnemyBulletVisualSystem(b, "attendance_stamp");
    engine.bullets.push(b);
    return;
  }

  if (pattern === "homing") {
    const b = new Bullet();
    b.x = cx - 7;
    b.y = cy - 7;
    b.width = 14;
    b.height = 14;
    b.vx = Math.cos(angleToPlayer) * 360;
    b.vy = Math.sin(angleToPlayer) * 360;
    b.isEnemy = true;
    b.type = "homing";
    b.homingTimer = 2.0;
    b.turnRate = 1.35;
    b.targetSpeed = 360;
    b.color = "#67e8f9";
    applyHobanwooEnemyBulletVisualSystem(b, "unsubmitted_missile");
    engine.bullets.push(b);
    return;
  }

  if (pattern === "shotgun") {
    const count = 20;
    const spinOffset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = spinOffset + (i / count) * Math.PI * 2;
      const b = new Bullet();
      b.x = cx - 4;
      b.y = cy;
      b.width = 8;
      b.height = 8;
      b.vx = Math.cos(a) * 175;
      b.vy = Math.sin(a) * 175;
      b.isEnemy = true;
      b.type = "pellet";
      b.color = i % 2 === 0 ? "#fb923c" : "#facc15";
      applyHobanwooEnemyBulletVisualSystem(b, "notice_popup");
      engine.bullets.push(b);
    }
    return;
  }

  const b = new Bullet();
  b.x = cx - 3;
  b.y = cy;
  b.width = 6;
  b.height = 12;
  b.vx = 0;
  b.vy = 190;
  b.isEnemy = true;
  b.type = "needle";
  b.color = "#22c55e";
  applyHobanwooEnemyBulletVisualSystem(b, "scanner_beam");
  engine.bullets.push(b);
}
