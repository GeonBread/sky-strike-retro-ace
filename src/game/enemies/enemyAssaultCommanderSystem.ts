/**
 * 어설트 커맨더 몬스터 시스템
 *
 * 이 파일은 어설트 커맨더의 체력 배율, 생성 위치, 스케일 조정, 전용 탄막 발사를 담당한다.
 * 중간 난입형 정예 몬스터의 체력, 크기, 등장 방식, 공격 패턴을 수정할 때 이 파일을 수정한다.
 */

import { Bullet, Enemy } from "../entities";

type AssaultCommanderRuntime = any;

/**
 * 전투 티어에 따라 어설트 커맨더 체력 배율을 반환한다.
 * 고스테이지 정예 몬스터의 생존 시간을 조절할 때 이 값을 수정한다.
 */
export function getAssaultCommanderHpMultiplierSystem(tier: number): number {
  if (tier >= 4) return 3.35;
  if (tier >= 3) return 2.65;
  if (tier === 2) return 1.85;
  return 1;
}

/**
 * 지정한 전투 티어와 정예 여부를 기준으로 어설트 계열 몬스터의 체력, 크기, 시각 식별값을 조정한다.
 * 웨이브 후반부 강화 몬스터의 스케일링 규칙을 바꿀 때 이 함수를 수정한다.
 */
export function scaleAssaultEnemySystem(engine: AssaultCommanderRuntime, e: Enemy, tier: number, elite = false) {
  if (e.type === "boss") return;
  const multiplier = engine.getAssaultHpMultiplier(tier) * (elite ? 1.25 : 1);
  e.hp = Math.max(1, Math.ceil(e.hp * multiplier));

  if (tier >= 2 && e.vy > 0) e.vy *= tier === 2 ? 1.05 : 1.12;
  if (tier >= 2 && e.vx !== 0) e.vx *= tier === 2 ? 1.04 : 1.1;
}

/**
 * 현재 전투 티어에 맞는 어설트 커맨더를 화면 상단에 생성하고 몬스터 배열에 추가한다.
 * 커맨더 등장 위치, 크기, 체력, 이동 타이머 초기값을 바꿀 때 이 함수를 수정한다.
 */
export function spawnAssaultCommanderSystem(engine: AssaultCommanderRuntime, tier: number) {
  const e = new Enemy();
  e.type = "assault_commander";
  e.width = tier >= 4 ? 116 : tier >= 3 ? 106 : 94;
  e.height = tier >= 4 ? 82 : tier >= 3 ? 74 : 66;
  e.x = engine.canvas.width / 2 - e.width / 2 + (Math.random() - 0.5) * 70;
  e.y = -e.height - 20;
  e.vx = (Math.random() < 0.5 ? -1 : 1) * (tier >= 4 ? 180 : tier >= 3 ? 155 : 125);
  e.vy = tier >= 4 ? 185 : tier >= 3 ? 170 : 145;
  e.spawnPoint = tier >= 4 ? 124 : tier >= 3 ? 112 : 96;
  e.hp = tier >= 4 ? 520 : tier >= 3 ? 360 : 230;
  e.visualId = 10;
  e.patternTimer = 0;
  e.shootTimer = 0;
  e.lastShot = 0;
  engine.enemies.push(e);

  engine.spawnExplosion(e.x + e.width / 2, e.spawnPoint, tier >= 3 ? "#a855f7" : "#22d3ee", 28);
}

/**
 * 어설트 커맨더가 플레이어를 향해 부채꼴 탄막과 보조 니들 탄을 발사한다.
 * 커맨더 탄속, 탄 개수, 확산각, 고티어 추가 공격을 수정할 때 이 함수를 수정한다.
 */
export function fireAssaultCommanderSystem(engine: AssaultCommanderRuntime, e: Enemy, tier: number) {
  const cx = e.x + e.width / 2;
  const cy = e.y + e.height * 0.72;
  const tx = engine.player.x + engine.player.width / 2;
  const ty = engine.player.y + engine.player.height / 2;
  const baseAngle = Math.atan2(ty - cy, tx - cx);
  const count = Math.max(3, tier >= 4 ? 7 : tier >= 3 ? 5 : 3);
  const spread = tier >= 4 ? 0.94 : tier >= 3 ? 0.82 : 0.62;
  const speed = tier >= 4 ? 335 : tier >= 3 ? 310 : 265;

  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * (spread / Math.max(1, count - 1));
    const b = new Bullet();
    b.x = cx - 5;
    b.y = cy - 5;
    b.width = tier >= 3 ? 11 : 10;
    b.height = tier >= 3 ? 11 : 10;
    b.vx = Math.cos(baseAngle + offset) * speed;
    b.vy = Math.sin(baseAngle + offset) * speed;
    b.isEnemy = true;
    b.type = "pellet";
    b.color = tier >= 3 ? "#c084fc" : "#22d3ee";
    b.visualType = "phase_core";
    engine.bullets.push(b);
  }

  e.rapidFireCount++;
  if (tier >= 3 && e.rapidFireCount % 3 === 0) {
    for (let side = -1; side <= 1; side += 2) {
      const b = new Bullet();
      b.x = cx - 6;
      b.y = cy - 4;
      b.width = 12;
      b.height = 12;
      b.vx = side * 185;
      b.vy = 235;
      b.isEnemy = true;
      b.type = "needle";
      b.color = "#f472b6";
      b.visualType = "comet_needle";
      engine.bullets.push(b);
    }
  }
}
