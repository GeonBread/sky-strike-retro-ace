/**
 * 보스 공격 패턴 시스템
 *
 * 이 파일은 engine.ts에 있던 보스 기본 탄막 생성과 보스 전투 중 분대 소환 로직을 분리한 파일이다.
 * 보스의 360도 탄막, 조준 연사, 혼합 탄막 콤보, 보스 보조 편대 소환 규칙을 수정할 때 이 파일을 수정한다.
 * 보스 페이즈 선택이나 해저드 판정, 렌더링은 담당하지 않는다.
 */

import { Bullet, Enemy, type EnemyType, type SquadPattern } from "../entities";
import { applyHobanwooEnemyBulletVisualSystem } from "../data/hobanwooEnemyBulletVisualCatalog";

type BossAttackRuntime = any;

/**
 * 보스 중심에서 원형으로 퍼지는 기본 360도 탄막을 생성해 엔진의 enemy bullet 배열에 추가한다.
 */
export function fireBoss360Burst(engine: BossAttackRuntime, e: Enemy) {
  const count = Math.floor(Math.random() * 21) + 30; // 30 ~ 50
  const cx = e.x + e.width / 2;
  const cy = e.y + e.height / 2;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const blt = new Bullet();
    blt.x = cx;
    blt.y = cy;
    blt.width = 12;
    blt.height = 12;
    blt.vx = Math.cos(angle) * 250;
    blt.vy = Math.sin(angle) * 250;
    blt.isEnemy = true;
    blt.color = "#facc15";
    applyHobanwooEnemyBulletVisualSystem(blt, "corrupt_orb");
    engine.bullets.push(blt);
  }
}

/**
 * 보스 터렛 위치와 플레이어 위치를 기준으로 조준형 연사 탄환을 생성한다.
 */
export function fireBossRapid(engine: BossAttackRuntime, e: Enemy) {
  const turrets = e.spawnPoint; // 2 to 4
  const spacing = e.width / turrets;
  const tx = engine.player.x + engine.player.width / 2;
  const ty = engine.player.y + engine.player.height / 2;

  for (let i = 0; i < turrets; i++) {
    const cx = e.x + spacing * 0.5 + i * spacing;
    const cy = e.y + e.height;
    const a = Math.atan2(ty - cy, tx - cx);
    const blt = new Bullet();
    blt.x = cx;
    blt.y = cy;
    blt.width = 8;
    blt.height = 8;
    blt.vx = Math.cos(a) * 450;
    blt.vy = Math.sin(a) * 450;
    blt.isEnemy = true;
    blt.color = "#f43f5e";
    applyHobanwooEnemyBulletVisualSystem(blt, "scanner_beam");
    engine.bullets.push(blt);
  }
}

/**
 * 보스 일반 패턴에서 사용하는 혼합 탄막 콤보를 생성해 sweep 탄과 선택적 호밍 탄을 추가한다.
 */
export function triggerBossBulletCombos(engine: BossAttackRuntime, b: Enemy) {
  const rx = Math.random();
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height - 10;

  // Pattern 3: Sweep waves
  const steps = 18;
  for (let i = 0; i < steps; i++) {
    const scaleAngle = (i - steps / 2) * 0.2;
    const blt = new Bullet();
    blt.x = cx;
    blt.y = cy;
    blt.width = 10;
    blt.height = 10;
    blt.vx = Math.sin(scaleAngle) * 400;
    blt.vy = 320;
    blt.isEnemy = true;
    blt.color = "#22d3ee";
    applyHobanwooEnemyBulletVisualSystem(blt, "guide_arrow");
    engine.bullets.push(blt);
  }

  if (rx < 0.5) {
    for (let i = 0; i < 4; i++) {
      const blt = new Bullet();
      blt.x = cx - 45 + i * 30;
      blt.y = cy;
      blt.width = 14;
      blt.height = 14;
      blt.isEnemy = true;
      blt.type = "homing";
      blt.homingTimer = 0.35;
      blt.vx = (i - 1.5) * 120;
      blt.vy = 180;
      blt.color = "#c084fc";
      applyHobanwooEnemyBulletVisualSystem(blt, "unsubmitted_missile");
      engine.bullets.push(blt);
    }
  }
}

/**
 * 보스 전투 중 호출되는 보조 적 편대를 편대 형태와 측면 난입 규칙에 따라 생성한다.
 */
export function summonBossSquad(engine: BossAttackRuntime) {
  const formations: SquadPattern[] = [
    "V_FORMATION",
    "CIRCLE",
    "SQUARE",
    "SIDE_LINES",
  ];
  const selected = formations[Math.floor(Math.random() * formations.length)];
  engine.spawnExplosion(engine.canvas.width / 2, 120, "#f43f5e", 20);

  const spawnMinion = (
    x: number,
    y: number,
    type: EnemyType,
    vx: number,
    vy: number,
    hpNum: number,
  ) => {
    const e = new Enemy();
    e.x = x;
    e.y = y;
    e.type = type;
    e.width = Math.random() * 20 + 25;
    e.height = e.width;
    e.vx = vx;
    e.vy = vy;
    e.hp = hpNum;
    e.visualId = Math.floor(Math.random() * 10) + 1;
    e.direction = Math.floor(Math.random() * 3);
    e.spawnPoint = 120 + Math.random() * 80;
    engine.enemies.push(e);
  };

  if (selected === "V_FORMATION") {
    const cx = engine.canvas.width / 2;
    spawnMinion(cx, -30, "aimed", 0, 200, 2);
    spawnMinion(cx - 50, -70, "aimed", 0, 200, 2);
    spawnMinion(cx + 50, -70, "aimed", 0, 200, 2);
    spawnMinion(cx - 100, -110, "aimed", 0, 200, 2);
    spawnMinion(cx + 100, -110, "aimed", 0, 200, 2);
  } else if (selected === "CIRCLE") {
    const cx = engine.canvas.width / 2;
    const cy = -80;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      spawnMinion(
        cx + Math.cos(a) * 60,
        cy + Math.sin(a) * 60,
        "aimed",
        0,
        250,
        3,
      );
    }
  } else if (selected === "SQUARE") {
    const stX = engine.canvas.width / 2 - 60;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        spawnMinion(stX + c * 60, -150 + r * 50, "aimed", 0, 180, 2);
      }
    }
  } else if (selected === "SIDE_LINES") {
    // Come from left and right simultaneously
    for (let i = 0; i < 4; i++) {
      spawnMinion(-50 - i * 40, 150 + i * 30, "aimed", 300, 0, 2);
      spawnMinion(
        engine.canvas.width + 50 + i * 40,
        150 + i * 30,
        "aimed",
        -300,
        0,
        2,
      );
    }
  }

  const soloPool: EnemyType[] = [
    "homing_shooter",
    "shotgun_shooter",
    "burst_shooter",
    "sweeper",
  ];
  const extraCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < extraCount; i++) {
    const type = soloPool[Math.floor(Math.random() * soloPool.length)];
    const fromLeft = Math.random() < 0.5;
    spawnMinion(
      fromLeft ? -48 - i * 32 : engine.canvas.width + 48 + i * 32,
      120 + Math.random() * 180,
      type,
      fromLeft ? 170 + Math.random() * 80 : -170 - Math.random() * 80,
      55 + Math.random() * 50,
      type === "burst_shooter" ? 3 : 2,
    );
  }
}

