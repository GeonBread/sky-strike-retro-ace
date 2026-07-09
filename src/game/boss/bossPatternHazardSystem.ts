/**
 * 보스 패턴 해저드 시스템
 *
 * 이 파일은 engine.ts에 있던 보스 특수 패턴 상태 타입, 보스 해저드 갱신, 보스 클리어 폭발 진행 로직을 분리한 파일이다.
 * 전기장, 그리드 레이저, 자폭 드론, 안전지대 폭발, 압축장, 전기 미로 같은 보스 패턴 판정을 수정할 때 이 파일을 수정한다.
 * 화면에 그리는 코드는 담당하지 않으며, 보스 해저드 시각화는 bossHazardRenderer.ts에서 처리한다.
 */

import { Bullet, Enemy, Particle } from "../entities";
import { sfx } from "../AudioSystem";
import { intersects as boxesIntersect } from "../utils/geometry";

type BossPatternRuntime = any;
const MAX_CHAPTER = 4;

export interface ElectricTrail {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  width: number;
}

export interface BossGridLaser {
  axis: "x" | "y";
  pos: number;
  age: number;
  warnTime: number;
  fireTime: number;
  width: number;
}

export interface TimedExplosionZone {
  x: number;
  y: number;
  radius: number;
  age: number;
  warnTime: number;
  fireTime: number;
  color: string;
}

export interface TailMine {
  x: number;
  y: number;
  radius: number;
  age: number;
  warnTime: number;
  fireTime: number;
}

export interface SuicideDrone {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  chaseTime: number;
  state: "spawn" | "wait" | "chase" | "explode" | "done";
  order: number;
  active: boolean;
}

export interface BossDashState {
  angle: number;
  startX: number;
  startY: number;
  phase: "search" | "lock" | "dash" | "recover";
  age: number;
  hasHit: boolean;
}

export interface BossSafeZoneBlast {
  x: number;
  y: number;
  radius: number;
  age: number;
  warnTime: number;
  fireTime: number;
  active: boolean;
}

export interface BossAbsorbOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  age: number;
  targetX: number;
  targetY: number;
  retargetTimer: number;
  active: boolean;
}

export interface BossAfterimageSlash {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  age: number;
  warnTime: number;
  fireTime: number;
  width: number;
}

export interface BossCompressionField {
  age: number;
  warnTime: number;
  closeTime: number;
  holdTime: number;
  maxInset: number;
}

export interface BossEdgeStriker {
  side: "top" | "bottom" | "left" | "right";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  offscreenX: number;
  offscreenY: number;
  age: number;
  state: "enter" | "hold" | "exit";
  fired: boolean;
  active: boolean;
}

export interface MazeWallSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BossMazeState {
  phase: "pull" | "active" | "done";
  age: number;
  totalTime: number;
  targetX: number;
  targetY: number;
  exitX: number;
  exitY: number;
  exitWidth: number;
  exitHeight: number;
  fogAlpha: number;
  walls: MazeWallSegment[];
}

export interface PlayerHistoryPoint {
  x: number;
  y: number;
  age: number;
}
/**
 * 현재 플레이어 중심 좌표를 시간 기록 배열에 추가하고, 보스 패턴이 참조할 최근 이동 궤적만 남긴다.
 */
export function updatePlayerPositionHistory(engine: BossPatternRuntime, dt: number) {
  const px = engine.player.x + engine.player.width / 2;
  const py = engine.player.y + engine.player.height / 2;
  engine.playerPositionHistory.forEach((point) => {
    point.age += dt;
  });
  engine.playerPositionHistory.unshift({ x: px, y: py, age: 0 });
  engine.playerPositionHistory = engine.playerPositionHistory.filter((point, index) => point.age <= 2.1 && index < 160);
}

/**
 * 요청한 과거 시간에 가장 가까운 플레이어 위치 기록을 찾아 보스 패턴 조준 기준점으로 반환한다.
 */
export function getPlayerHistoryPoint(engine: BossPatternRuntime, targetAge: number): PlayerHistoryPoint {
  let best = engine.playerPositionHistory[0] || {
    x: engine.player.x + engine.player.width / 2,
    y: engine.player.y + engine.player.height / 2,
    age: 0,
  };
  let bestDelta = Math.abs(best.age - targetAge);
  engine.playerPositionHistory.forEach((point) => {
    const delta = Math.abs(point.age - targetAge);
    if (delta < bestDelta) {
      best = point;
      bestDelta = delta;
    }
  });
  return best;
}

/**
 * 전기 미로처럼 즉사 판정이 필요한 보스 해저드에서 플레이어 피격 처리를 즉시 유도한다.
 */
export function instantlyDownPlayer(engine: BossPatternRuntime) {
  if (engine.player.isDead) return;
  engine.player.hp = 1;
  engine.player.invulnTimer = 0;
  engine.triggerPlayerHit();
}

/**
 * 캔버스 크기와 플레이어 크기를 기준으로 전기 미로의 벽, 출구, 강제 이동 목표를 생성한다.
 */
export function createBossMazeState(engine: BossPatternRuntime): BossMazeState {
  const targetX = engine.canvas.width / 2 - engine.player.width / 2;
  const targetY = engine.canvas.height - 86;
  const laneWidth = Math.max(96, engine.player.width * 2.4);
  const rowCount = 5;
  const rowHeight = 34;
  const rowSpacing = 82;
  let corridorCenter = engine.canvas.width / 2;
  const walls: MazeWallSegment[] = [];

  for (let i = 0; i < rowCount; i++) {
    corridorCenter += (Math.random() < 0.5 ? -1 : 1) * (56 + Math.random() * 56);
    corridorCenter = Math.max(84, Math.min(engine.canvas.width - 84, corridorCenter));
    const gapLeft = Math.max(0, corridorCenter - laneWidth / 2);
    const gapRight = Math.min(engine.canvas.width, corridorCenter + laneWidth / 2);
    const y = engine.canvas.height - 150 - i * rowSpacing;

    if (gapLeft > 0) {
      walls.push({ x: 0, y, width: gapLeft, height: rowHeight });
    }
    if (gapRight < engine.canvas.width) {
      walls.push({ x: gapRight, y, width: engine.canvas.width - gapRight, height: rowHeight });
    }
  }

  return {
    phase: "pull",
    age: 0,
    totalTime: 7.0,
    targetX,
    targetY,
    exitX: Math.max(36, Math.min(engine.canvas.width - 116, corridorCenter - 48)),
    exitY: 48,
    exitWidth: 96,
    exitHeight: 24,
    fogAlpha: 0,
    walls,
  };
}

/**
 * 보스 페이즈 전환이나 클리어 시 남아 있는 모든 보스 전용 해저드 상태를 비운다.
 */
export function clearBossPatternHazards(engine: BossPatternRuntime) {
  engine.bossElectricTrails = [];
  engine.bossGridLasers = [];
  engine.bossSuicideDrones = [];
  engine.bossTimedExplosions = [];
  engine.bossTailMines = [];
  engine.bossDashState = null;
  engine.bossSafeZoneBlasts = [];
  engine.bossAbsorbOrbs = [];
  engine.bossAfterimageSlashes = [];
  engine.bossCompressionField = null;
  engine.bossEdgeStrikers = [];
  engine.bossMazeState = null;
}

/**
 * 보스가 패턴 이동 중 화면 전투 영역 밖으로 과도하게 벗어나지 않도록 위치와 속도를 보정한다.
 */
export function clampBossToArena(engine: BossPatternRuntime, e: Enemy) {
  if (e.phase === 24 && engine.bossDashState && (engine.bossDashState.phase === "dash" || engine.bossDashState.phase === "recover")) {
    return;
  }

  const margin = 12;
  const maxX = Math.max(margin, engine.canvas.width - e.width - margin);
  const minY = -e.height * 0.35;
  const maxY = Math.max(minY, engine.canvas.height * 0.52);

  if (e.x < margin) {
    e.x = margin;
    e.vx = Math.abs(e.vx || 120);
  } else if (e.x > maxX) {
    e.x = maxX;
    e.vx = -Math.abs(e.vx || 120);
  }

  if (e.y < minY) {
    e.y = minY;
    e.vy = Math.abs(e.vy || 0);
  } else if (e.y > maxY) {
    e.y = maxY;
    e.vy = -Math.abs(e.vy || 0);
  }
}

/**
 * 보스 격파 직후 클리어 폭발 상태로 전환하고 탄환/해저드 정리와 연출 초기값을 설정한다.
 */
export function beginBossClearSequence(engine: BossPatternRuntime, e: Enemy) {
  engine.bossClearX = e.x + e.width / 2;
  engine.bossClearY = e.y + e.height / 2;
  engine.bossClearLabel = `CHAPTER ${Math.min(MAX_CHAPTER, engine.stage)} CLEAR`;
  engine.bossClearTimer = 5.0;
  engine.bossClearBoss = e;
  engine.state = "BOSS_CLEAR_EXPLOSION";
  engine.bossActive = true;
  engine.bossEntity = e;
  e.hp = 0;
  e.vx = 0;
  e.vy = 0;
  engine.clearAllEnemyBullets();
  engine.clearBossPatternHazards();
  engine.screenShakeIntensity = 18;
  sfx.bossExplode();
}

/**
 * 보스 클리어 폭발 상태에서 파티클과 폭발을 갱신하고 클리어 메시지 상태로 넘긴다.
 */
export function updateBossClearExplosion(engine: BossPatternRuntime, dt: number) {
  engine.bossClearTimer -= dt;
  engine.screenShakeIntensity = Math.max(engine.screenShakeIntensity, 10);
  if (Math.random() < 0.18) {
    const radiusX = 120 + Math.random() * 90;
    const radiusY = 80 + Math.random() * 70;
    const angle = Math.random() * Math.PI * 2;
    const x = engine.bossClearX + Math.cos(angle) * radiusX * Math.random();
    const y = engine.bossClearY + Math.sin(angle) * radiusY * Math.random();
    const color = Math.random() < 0.45 ? "#fbbf24" : (Math.random() < 0.5 ? "#38bdf8" : "#c084fc");
    engine.spawnExplosion(x, y, color, 12 + Math.floor(Math.random() * 12));
  }
  if (Math.random() < 0.45) {
    const p = new Particle();
    p.x = engine.bossClearX + (Math.random() - 0.5) * 220;
    p.y = engine.bossClearY + (Math.random() - 0.5) * 150;
    p.vx = (Math.random() - 0.5) * 380;
    p.vy = (Math.random() - 0.5) * 340;
    p.color = Math.random() < 0.5 ? "#ffffff" : "#67e8f9";
    p.size = 3 + Math.random() * 5;
    p.life = p.maxLife = 0.55 + Math.random() * 0.65;
    engine.particles.push(p);
  }
  engine.updateParticles(dt);

  if (engine.bossClearTimer <= 0) {
    engine.bossClearTimer = 2.0;
    engine.screenShakeIntensity = 0;
    if (engine.bossClearBoss) {
      engine.bossClearBoss.active = false;
      engine.enemies = engine.enemies.filter((enemy) => enemy !== engine.bossClearBoss);
    }
    engine.bossClearBoss = null;
    engine.bossActive = false;
    engine.bossEntity = null;
    engine.state = "BOSS_CLEAR_MESSAGE";
  }
}

/**
 * 보스 클리어 메시지 이후 샌드박스 복귀, 승리, 스테이지 보상 선택 중 다음 상태를 결정한다.
 */
export function finishBossClearSequence(engine: BossPatternRuntime) {
  if (engine.isSandbox) {
    engine.state = "PLAYING";
    return;
  }

  if (engine.stage >= MAX_CHAPTER) {
    engine.state = "VICTORY";
    if (engine.onGameOver) engine.onGameOver(engine.score);
    return;
  }

  if (engine.onStageClear) {
    engine.state = "STAGE_CLEAR_CHOICE";
    engine.onStageClear(engine.getStageClearChoices(), (choice) => {
      engine.applyStageClearReward(choice);
      engine.startNextStageAfterReward();
    });
  } else {
    engine.startNextStageAfterReward();
  }
}

/**
 * 보스 패턴이 생성한 전기장, 그리드 레이저, 자폭 드론, 장판, 미로 등의 해저드를 이동/판정/정리한다.
 */
export function updateBossPatternHazards(engine: BossPatternRuntime, dt: number) {
  engine.bossElectricTrails.forEach((trail) => {
    trail.life -= dt;
    if (trail.life > 0) {
      engine.checkPlayerAgainstSegment(trail.x1, trail.y1, trail.x2, trail.y2, trail.width);
    }
  });
  engine.bossElectricTrails = engine.bossElectricTrails.filter((trail) => trail.life > 0);

  engine.bossGridLasers.forEach((laser) => {
    const previousAge = laser.age;
    laser.age += dt;
    if (previousAge < laser.warnTime && laser.age >= laser.warnTime) {
      sfx.laserBlast();
    }
    if (laser.age >= laser.warnTime && laser.age <= laser.warnTime + laser.fireTime) {
      const px = engine.player.x + engine.player.width / 2;
      const py = engine.player.y + engine.player.height / 2;
      const distance = laser.axis === "x" ? Math.abs(px - laser.pos) : Math.abs(py - laser.pos);
      const playerHalf = laser.axis === "x"
        ? (engine.player.hitWidth || engine.player.width) / 2
        : (engine.player.hitHeight || engine.player.height) / 2;
      if (distance < laser.width / 2 + playerHalf) {
        engine.hitPlayerFromBossHazard();
      }
    }
  });
  engine.bossGridLasers = engine.bossGridLasers.filter((laser) => laser.age < laser.warnTime + laser.fireTime + 0.1);

  engine.bossTimedExplosions.forEach((zone) => {
    zone.age += dt;
    if (zone.age >= zone.warnTime && zone.age <= zone.warnTime + zone.fireTime) {
      const px = engine.player.x + engine.player.width / 2;
      const py = engine.player.y + engine.player.height / 2;
      if (Math.hypot(px - zone.x, py - zone.y) < zone.radius + (engine.player.hitWidth || engine.player.width) / 2) {
        engine.hitPlayerFromBossHazard();
      }
    }
  });
  engine.bossTimedExplosions = engine.bossTimedExplosions.filter((zone) => zone.age < zone.warnTime + zone.fireTime + 0.2);

  engine.bossTailMines.forEach((mine) => {
    mine.age += dt;
    if (mine.age >= mine.warnTime && mine.age <= mine.warnTime + mine.fireTime) {
      const px = engine.player.x + engine.player.width / 2;
      const py = engine.player.y + engine.player.height / 2;
      if (Math.hypot(px - mine.x, py - mine.y) < mine.radius + (engine.player.hitWidth || engine.player.width) / 2) {
        engine.hitPlayerFromBossHazard();
      }
    }
  });
  engine.bossTailMines = engine.bossTailMines.filter((mine) => mine.age < mine.warnTime + mine.fireTime + 0.08);

  engine.bossSuicideDrones.forEach((drone) => {
    drone.age += dt;
    if (drone.age < 0) return;
    if (drone.state === "spawn" && drone.age >= 0.35) {
      drone.state = "wait";
    }
    if (drone.state === "wait" && drone.age >= 1.1) {
      drone.state = "chase";
      drone.chaseTime = 0;
    }

    if (drone.state === "chase") {
      drone.chaseTime += dt;
      const px = engine.player.x + engine.player.width / 2;
      const py = engine.player.y + engine.player.height / 2;
      const dx = px - drone.x;
      const dy = py - drone.y;
      const dist = Math.hypot(dx, dy) || 1;
      const targetVx = (dx / dist) * 310;
      const targetVy = (dy / dist) * 310;
      drone.vx += (targetVx - drone.vx) * 0.055;
      drone.vy += (targetVy - drone.vy) * 0.055;
      drone.x += drone.vx * dt;
      drone.y += drone.vy * dt;

      if (dist < 34 || drone.chaseTime >= 3.0) {
        engine.explodeSuicideDrone(drone);
      }
    }
  });
  engine.bossSuicideDrones = engine.bossSuicideDrones.filter((drone) => drone.active);

  engine.bossSafeZoneBlasts.forEach((blast) => {
    blast.age += dt;
    const firing = blast.age >= blast.warnTime && blast.age <= blast.warnTime + blast.fireTime;
    if (firing) {
      const px = engine.player.x + engine.player.width / 2;
      const py = engine.player.y + engine.player.height / 2;
      if (Math.hypot(px - blast.x, py - blast.y) > blast.radius) {
        engine.hitPlayerFromBossHazard();
      }
    }
    if (blast.age > blast.warnTime + blast.fireTime + 0.35) blast.active = false;
  });
  engine.bossSafeZoneBlasts = engine.bossSafeZoneBlasts.filter((blast) => blast.active);

  engine.bossAbsorbOrbs.forEach((orb) => {
    if (!engine.bossEntity) return;
    orb.age += dt;
    const bossTx = engine.bossEntity.x + engine.bossEntity.width / 2;
    const bossTy = engine.bossEntity.y + engine.bossEntity.height / 2;
    if (orb.age < 5.0) {
      orb.retargetTimer -= dt;
      if (orb.retargetTimer <= 0) {
        orb.targetX = Math.max(54, Math.min(engine.canvas.width - 54, bossTx + (Math.random() - 0.5) * 250));
        orb.targetY = Math.max(130, Math.min(engine.canvas.height * 0.55, bossTy + 76 + Math.random() * 150));
        orb.retargetTimer = 0.38 + Math.random() * 0.55;
      }
    }
    const tx = orb.age < 5.0 ? orb.targetX : bossTx;
    const ty = orb.age < 5.0 ? orb.targetY : bossTy;
    const dx = tx - orb.x;
    const dy = ty - orb.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = orb.age < 5.0 ? 92 : 70 + Math.min(150, (orb.age - 5.0) * 70);
    const steer = orb.age < 5.0 ? 0.045 : 0.06;
    orb.vx += ((dx / dist) * speed - orb.vx) * steer;
    orb.vy += ((dy / dist) * speed - orb.vy) * steer;
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;

    engine.bullets.forEach((b) => {
      if (!b.active || b.isEnemy || !orb.active) return;
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      if (Math.hypot(bx - orb.x, by - orb.y) < 20 + Math.max(b.width, b.height) / 2) {
        b.active = false;
        orb.hp -= b.damage;
        engine.spawnExplosion(orb.x, orb.y, "#67e8f9", 4);
        if (orb.hp <= 0) {
          orb.active = false;
          engine.spawnExplosion(orb.x, orb.y, "#22d3ee", 18);
          sfx.enemyExplode();
        }
      }
    });

    if (orb.age >= 5.0 && dist < 34 && orb.active) {
      orb.active = false;
      engine.bossEntity.burstCount++;
      const maxBossHp = engine.getBossMaxHp(engine.stage >= 4 ? 4 : engine.bossPhase3Active ? 3 : engine.bossPhase2Active ? 2 : 1);
      engine.bossEntity.hp = Math.min(maxBossHp, engine.bossEntity.hp + 200);
      engine.spawnExplosion(bossTx, bossTy, "#a78bfa", 14);
      sfx.bossHit();
    }
  });
  engine.bossAbsorbOrbs = engine.bossAbsorbOrbs.filter((orb) => orb.active);

  engine.bossAfterimageSlashes.forEach((slash) => {
    slash.age += dt;
    if (slash.age >= slash.warnTime && slash.age <= slash.warnTime + slash.fireTime) {
      engine.checkPlayerAgainstSegment(slash.x1, slash.y1, slash.x2, slash.y2, slash.width);
    }
  });
  engine.bossAfterimageSlashes = engine.bossAfterimageSlashes.filter((slash) => slash.age < slash.warnTime + slash.fireTime + 0.18);

  if (engine.bossCompressionField) {
    const field = engine.bossCompressionField;
    field.age += dt;
    const activeUntil = field.warnTime + field.closeTime + field.holdTime;
    if (field.age >= field.warnTime && field.age <= activeUntil) {
      const progress = Math.min(1, (field.age - field.warnTime) / field.closeTime);
      const inset = field.maxInset * progress;
      const px = engine.player.x + engine.player.width / 2;
      const py = engine.player.y + engine.player.height / 2;
      const topInset = inset * 0.58;
      if (px < inset || px > engine.canvas.width - inset || py < topInset || py > engine.canvas.height - topInset) {
        engine.hitPlayerFromBossHazard();
      }
    }
    if (field.age > activeUntil + 0.35) engine.bossCompressionField = null;
  }

  engine.bossEdgeStrikers.forEach((striker) => {
    striker.age += dt;
    const moveTargetX = striker.state === "exit" ? striker.offscreenX : striker.targetX;
    const moveTargetY = striker.state === "exit" ? striker.offscreenY : striker.targetY;
    striker.x += (moveTargetX - striker.x) * 8.5 * dt;
    striker.y += (moveTargetY - striker.y) * 8.5 * dt;

    if (striker.state === "enter" && Math.hypot(striker.x - striker.targetX, striker.y - striker.targetY) < 12) {
      striker.state = "hold";
      striker.age = 0;
    }

    if (striker.state === "hold" && !striker.fired && striker.age >= 0.12) {
      striker.fired = true;
      const bullet = new Bullet();
      bullet.x = striker.x - 6;
      bullet.y = striker.y - 6;
      bullet.width = striker.side === "left" || striker.side === "right" ? 20 : 12;
      bullet.height = striker.side === "top" || striker.side === "bottom" ? 20 : 12;
      bullet.isEnemy = true;
      bullet.type = striker.side === "left" || striker.side === "right" ? "needle" : "pellet";
      bullet.color = "#67e8f9";
      bullet.visualType = "tesla_spine_missile";
      const speed = 360;
      if (striker.side === "top") {
        bullet.vx = 0;
        bullet.vy = speed;
      } else if (striker.side === "bottom") {
        bullet.vx = 0;
        bullet.vy = -speed;
      } else if (striker.side === "left") {
        bullet.vx = speed;
        bullet.vy = 0;
      } else {
        bullet.vx = -speed;
        bullet.vy = 0;
      }
      engine.bullets.push(bullet);
      sfx.bossPatternFire();
    }

    if (striker.state === "hold" && striker.age >= 0.3) {
      striker.state = "exit";
    }

    if (striker.state === "exit" && Math.hypot(striker.x - striker.offscreenX, striker.y - striker.offscreenY) < 18) {
      striker.active = false;
    }
  });
  engine.bossEdgeStrikers = engine.bossEdgeStrikers.filter((striker) => striker.active);

  if (engine.bossMazeState) {
    const maze = engine.bossMazeState;
    maze.age += dt;

    if (maze.phase === "pull") {
      engine.player.x += (maze.targetX - engine.player.x) * 7.2 * dt;
      engine.player.y += (maze.targetY - engine.player.y) * 7.2 * dt;
      if (Math.hypot(engine.player.x - maze.targetX, engine.player.y - maze.targetY) < 8 || maze.age >= 1.15) {
        maze.phase = "active";
        maze.age = 0;
      }
    } else if (maze.phase === "active") {
      const remaining = Math.max(0, maze.totalTime - maze.age);
      const urgent = Math.max(0, 1 - remaining / 2.2);
      maze.fogAlpha = urgent * 0.62;

      const hitbox = {
        x: engine.player.x + (engine.player.width - (engine.player.hitWidth || engine.player.width)) / 2,
        y: engine.player.y + (engine.player.height - (engine.player.hitHeight || engine.player.height)) / 2,
        width: engine.player.hitWidth || engine.player.width,
        height: engine.player.hitHeight || engine.player.height,
      };

      const reachedExit = boxesIntersect(hitbox, {
        x: maze.exitX,
        y: maze.exitY,
        width: maze.exitWidth,
        height: maze.exitHeight,
      });

      if (reachedExit) {
        engine.spawnExplosion(maze.exitX + maze.exitWidth / 2, maze.exitY + maze.exitHeight / 2, "#22d3ee", 14);
        engine.bossMazeState = null;
        if (engine.bossEntity?.phase === 52) {
          engine.bossEntity.patternTimer = Math.max(engine.bossEntity.patternTimer, engine.bossEntity.phaseDuration + 0.01);
        }
      } else {
        for (const wall of maze.walls) {
          if (boxesIntersect(hitbox, wall)) {
            engine.bossMazeState = null;
            if (engine.bossEntity?.phase === 52) {
              engine.bossEntity.patternTimer = Math.max(engine.bossEntity.patternTimer, engine.bossEntity.phaseDuration + 0.01);
            }
            engine.instantlyDownPlayer();
            return;
          }
        }

        if (remaining <= 0) {
          engine.spawnExplosion(engine.player.x + engine.player.width / 2, engine.player.y + engine.player.height / 2, "#f43f5e", 28);
          engine.bossMazeState = null;
          if (engine.bossEntity?.phase === 52) {
            engine.bossEntity.patternTimer = Math.max(engine.bossEntity.patternTimer, engine.bossEntity.phaseDuration + 0.01);
          }
          engine.instantlyDownPlayer();
          return;
        }
      }
    }
  }
}

/**
 * 보스 해저드가 플레이어와 충돌했을 때 무적 상태를 확인한 뒤 실제 피격 처리를 호출한다.
 */
export function hitPlayerFromBossHazard(engine: BossPatternRuntime) {
  if (engine.player.invulnTimer <= 0 && !engine.player.isDead) {
    engine.triggerPlayerHit();
  }
}

/**
 * 플레이어 중심점과 선분형 보스 해저드 사이 거리를 계산해 충돌 시 피격을 발생시킨다.
 */
export function checkPlayerAgainstSegment(engine: BossPatternRuntime, x1: number, y1: number, x2: number, y2: number, width: number) {
  if (engine.player.isDead || engine.player.invulnTimer > 0) return;
  const px = engine.player.x + engine.player.width / 2;
  const py = engine.player.y + engine.player.height / 2;
  const distance = engine.distancePointToSegment(px, py, x1, y1, x2, y2);
  if (distance < width / 2 + (engine.player.hitWidth || engine.player.width) / 2) {
    engine.triggerPlayerHit();
  }
}

/**
 * 점과 선분 사이의 최단 거리를 계산해 레이저, 베기, 돌진 궤적의 충돌 판정에 사용한다.
 */
export function distancePointToSegment(engine: BossPatternRuntime, px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const sx = x1 + dx * t;
  const sy = y1 + dy * t;
  return Math.hypot(px - sx, py - sy);
}

/**
 * 자폭 드론을 폭발 상태로 바꾸고 폭발 원형 해저드와 시각 효과를 생성한다.
 */
export function explodeSuicideDrone(engine: BossPatternRuntime, drone: SuicideDrone) {
  if (!drone.active) return;
  drone.active = false;
  drone.state = "done";
  engine.spawnExplosion(drone.x, drone.y, "#fb7185", 22);
  sfx.bossPatternFire();

  const px = engine.player.x + engine.player.width / 2;
  const py = engine.player.y + engine.player.height / 2;
  if (Math.hypot(px - drone.x, py - drone.y) < 78) {
    engine.hitPlayerFromBossHazard();
  }

  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const b = new Bullet();
    b.x = drone.x - 4;
    b.y = drone.y - 4;
    b.width = 8;
    b.height = 8;
    b.vx = Math.cos(angle) * 190;
    b.vy = Math.sin(angle) * 190;
    b.isEnemy = true;
    b.type = "pellet";
    b.color = "#fb7185";
    engine.bullets.push(b);
  }
}

/**
 * 최종 보스 전기 미사일 페이즈에서 보스 이동, 미사일 발사, 전기장 꼬리를 생성한다.
 */
export function runFinalMissileElectricField(engine: BossPatternRuntime, e: Enemy, dt: number) {
  const cx = e.x + e.width / 2;
  const cy = e.y + e.height / 2;
  const orbitRadius = Math.min(130, Math.max(95, e.width * 0.62));

  e.x += (engine.canvas.width / 2 - e.width / 2 - e.x) * 0.9 * dt;
  e.y += (58 - e.y) * 1.2 * dt;

  if (e.rapidFireCount === 0) {
    e.rapidFireCount = 1;
    e.burstCount = 0;
    e.satellites = [];
    for (let i = 0; i < 10; i++) {
      const missile = new Bullet();
      missile.width = 14;
      missile.height = 30;
      missile.active = true;
      missile.age = i;
      missile.color = "#38bdf8";
      e.satellites.push(missile);
    }
  }

  e.satellites.forEach((missile, index) => {
    if (!missile.active) return;
    const angle = (index / 10) * Math.PI * 2 + e.patternTimer * 0.35;
    missile.x = cx + Math.cos(angle) * orbitRadius - missile.width / 2;
    missile.y = cy + Math.sin(angle) * orbitRadius - missile.height / 2;
    missile.vx = Math.cos(angle);
    missile.vy = Math.sin(angle);
  });

  if (e.patternTimer > 1.05 && e.burstCount < 10 && e.lastShot > 0.34) {
    e.lastShot = 0;
    const missile = e.satellites[e.burstCount];
    if (missile) {
      const sx = missile.x + missile.width / 2;
      const sy = missile.y + missile.height / 2;
      const px = engine.player.x + engine.player.width / 2;
      const py = engine.player.y + engine.player.height / 2;
      const angle = Math.atan2(py - sy, px - sx);
      const speed = 1220;

      const b = new Bullet();
      b.x = sx - 9;
      b.y = sy - 18;
      b.width = 18;
      b.height = 36;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
      b.isEnemy = true;
      b.type = "electric_missile";
      b.color = "#a3e635";
      engine.bullets.push(b);

      missile.active = false;
      e.burstCount++;
      sfx.bossPatternFire();
    }
  }
}

/**
 * 최종 보스 자폭 드론 페이즈에서 드론 소환 순서와 보스 위치 이동을 처리한다.
 */
export function runFinalSuicideDronePattern(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += (engine.canvas.width / 2 - e.width / 2 - e.x) * 1.0 * dt;
  e.y += (64 - e.y) * 1.0 * dt;

  if (e.rapidFireCount === 0) {
    e.rapidFireCount = 1;
    const w = engine.canvas.width;
    const h = engine.canvas.height;
    const positions = [
      { x: 60, y: 120 },
      { x: w - 60, y: 120 },
      { x: w * 0.5, y: 95 },
      { x: 58, y: h * 0.45 },
      { x: w - 58, y: h * 0.45 },
      { x: 70, y: h * 0.68 },
      { x: w - 70, y: h * 0.68 },
      { x: 95, y: h - 130 },
      { x: w - 95, y: h - 130 },
      { x: w * 0.34, y: 90 },
      { x: w * 0.66, y: 90 },
    ];
    engine.bossSuicideDrones = positions.map((pos, index) => ({
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      age: -index * 0.2,
      chaseTime: 0,
      state: "spawn",
      order: index,
      active: true,
    }));
    engine.spawnExplosion(e.x + e.width / 2, e.y + e.height, "#fb7185", 20);
  }
}

/**
 * 최종 보스 고밀도 그리드 레이저 페이즈에서 경고/발사 레이저 상태를 생성한다.
 */
export function runFinalDenseGridLaser(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += e.vx * 0.06 * dt;
  if (e.x < 18 || e.x > engine.canvas.width - e.width - 18) e.vx *= -1;

  if (e.patternTimer < e.phaseDuration - 0.7 && e.lastShot > 0.18) {
    e.lastShot = 0;
    const count = Math.random() < 0.45 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      let axis: "x" | "y" = "x";
      let pos = 0;
      let found = false;
      for (let attempt = 0; attempt < 24; attempt++) {
        axis = Math.random() < 0.55 ? "x" : "y";
        const margin = axis === "x" ? 46 : 92;
        const max = axis === "x" ? engine.canvas.width : engine.canvas.height;
        pos = Math.random() * (max - margin * 2) + margin;
        const minGap = axis === "x" ? 70 : 82;
        if (engine.bossGridLasers.every((laser) => laser.axis !== axis || Math.abs(laser.pos - pos) > minGap)) {
          found = true;
          break;
        }
      }
      if (!found) continue;
      engine.bossGridLasers.push({
        axis,
        pos,
        age: 0,
        warnTime: 0.44,
        fireTime: 0.28,
        width: 22,
      });
    }
  }
}

/**
 * 최종 보스 돌진 페이즈에서 조준, 락온, 돌진, 회복 단계를 진행한다.
 */
export function runFinalBossDash(engine: BossPatternRuntime, e: Enemy, dt: number) {
  const centerX = e.x + e.width / 2;
  const centerY = e.y + e.height / 2;
  const targetTopX = engine.canvas.width / 2 - e.width / 2;
  const targetTopY = 50;

  if (!engine.bossDashState) {
    if (e.rapidFireCount >= e.spawnPoint) return;
    engine.bossDashState = {
      angle: Math.PI / 2,
      startX: centerX,
      startY: centerY,
      phase: "search",
      age: 0,
      hasHit: false,
    };
    e.vx = 0;
    e.vy = 0;
  }

  const dash = engine.bossDashState;
  dash.age += dt;

  if (dash.phase === "search") {
    e.x += (targetTopX - e.x) * 2.8 * dt;
    e.y += (targetTopY - e.y) * 2.8 * dt;
    dash.startX = e.x + e.width / 2;
    dash.startY = e.y + e.height / 2;

    const px = engine.player.x + engine.player.width / 2;
    const py = engine.player.y + engine.player.height / 2;
    const desired = Math.atan2(py - dash.startY, px - dash.startX);
    const down = Math.PI / 2;
    const delta = Math.atan2(Math.sin(desired - down), Math.cos(desired - down));
    const clamped = Math.max(-0.698, Math.min(0.698, delta));
    dash.angle = down + clamped + Math.sin(dash.age * 13.0) * 0.09;

    if (dash.age >= 1.5) {
      dash.phase = "lock";
      dash.age = 0;
      sfx.bossPatternFire();
    }
  } else if (dash.phase === "lock") {
    e.x += (targetTopX - e.x) * 1.5 * dt;
    e.y += (targetTopY - e.y) * 1.5 * dt;
    dash.startX = e.x + e.width / 2;
    dash.startY = e.y + e.height / 2;
    if (dash.age >= 1.0) {
      dash.phase = "dash";
      dash.age = 0;
      e.vx = Math.cos(dash.angle) * 1280;
      e.vy = Math.sin(dash.angle) * 1280;
      engine.screenShakeIntensity = 12;
      sfx.bossDash();
    }
  } else if (dash.phase === "dash") {
    const prevX = e.x + e.width / 2;
    const prevY = e.y + e.height / 2;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    const nextX = e.x + e.width / 2;
    const nextY = e.y + e.height / 2;
    if (!dash.hasHit && engine.distancePointToSegment(engine.player.x + engine.player.width / 2, engine.player.y + engine.player.height / 2, prevX, prevY, nextX, nextY) < 42) {
      dash.hasHit = true;
      engine.player.hp = Math.min(engine.player.hp, 1);
      engine.hitPlayerFromBossHazard();
    }

    if (dash.age >= 0.95 || e.y > engine.canvas.height + 160 || e.x < -240 || e.x > engine.canvas.width + 240) {
      dash.phase = "recover";
      dash.age = 0;
      e.x = engine.canvas.width / 2 - e.width / 2;
      e.y = -e.height - 10;
      e.vx = 0;
      e.vy = 0;
    }
  } else if (dash.phase === "recover") {
    e.x += (targetTopX - e.x) * 3.0 * dt;
    e.y += (targetTopY - e.y) * 3.0 * dt;
    if (dash.age >= 1.1) {
      e.rapidFireCount++;
      engine.bossDashState = null;
    }
  }
}

/**
 * 최종 보스 안전지대 폭발 페이즈에서 생존 원형 영역과 전체 폭발 타이밍을 생성한다.
 */
export function runFinalSafeZoneBlast(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += (engine.canvas.width / 2 - e.width / 2 - e.x) * 1.2 * dt;
  e.y += (58 - e.y) * 1.2 * dt;

  if (e.rapidFireCount === 0) {
    e.rapidFireCount = 1;
    const bossCx = e.x + e.width / 2;
    const bossCy = e.y + e.height / 2;
    let x = engine.canvas.width / 2;
    let y = engine.canvas.height * 0.72;
    for (let attempt = 0; attempt < 20; attempt++) {
      x = 58 + Math.random() * Math.max(1, engine.canvas.width - 116);
      y = engine.canvas.height * 0.38 + Math.random() * engine.canvas.height * 0.48;
      if (Math.hypot(x - bossCx, y - bossCy) > 210) break;
    }
    engine.bossSafeZoneBlasts.push({
      x,
      y,
      radius: 54,
      age: 0,
      warnTime: 3.55,
      fireTime: 1.15,
      active: true,
    });
    sfx.bossPatternFire();
  }
}

/**
 * 최종 보스 흡수장 페이즈에서 흡수 오브 이동 목표와 보스 쪽 끌림 패턴을 생성한다.
 */
export function runFinalAbsorptionField(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += (engine.canvas.width / 2 - e.width / 2 - e.x) * 0.9 * dt;
  e.y += (65 - e.y) * 0.9 * dt;

  if (e.rapidFireCount === 0) {
    e.rapidFireCount = 1;
    e.burstCount = 0;
    const cx = e.x + e.width / 2;
    const positions = Array.from({ length: 5 }, (_, index) => ({
      x: Math.max(52, Math.min(engine.canvas.width - 52, cx + (index - 2) * 58 + (Math.random() - 0.5) * 34)),
      y: 150 + Math.random() * Math.max(1, engine.canvas.height * 0.36),
    }));
    engine.bossAbsorbOrbs = positions.map((pos) => ({
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      hp: 9,
      age: 0,
      targetX: pos.x,
      targetY: pos.y,
      retargetTimer: 0.2 + Math.random() * 0.45,
      active: true,
    }));
    engine.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, "#a78bfa", 18);
  }

  if (e.burstCount >= 3 && e.rapidFireCount === 1) {
    e.rapidFireCount = 2;
    engine.bossTimedExplosions.push({
      x: engine.canvas.width / 2,
      y: engine.canvas.height / 2,
      radius: Math.max(engine.canvas.width, engine.canvas.height) * 0.72,
      age: 0,
      warnTime: 0.7,
      fireTime: 0.42,
      color: "#a78bfa",
    });
    engine.player.hp = 1;
    engine.player.invulnTimer = 0;
    engine.hitPlayerFromBossHazard();
    sfx.laserBlast();
  }
}

/**
 * 최종 보스 공간 절단 페이즈에서 플레이어 주변을 가르는 선분형 베기 해저드를 생성한다.
 */
export function runFinalAfterimageSlash(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += e.vx * 0.08 * dt;
  if (e.x < 18 || e.x > engine.canvas.width - e.width - 18) e.vx *= -1;

  if (e.rapidFireCount >= e.spawnPoint) return;
  if (e.lastShot > 0.9) {
    e.lastShot = 0;
    e.rapidFireCount++;
    const playerCx = engine.player.x + engine.player.width / 2;
    const playerCy = engine.player.y + engine.player.height / 2;
    for (let index = 0; index < 2; index++) {
      const px = Math.max(70, Math.min(engine.canvas.width - 70, playerCx + (Math.random() - 0.5) * 86));
      const py = Math.max(130, Math.min(engine.canvas.height - 92, playerCy + (Math.random() - 0.5) * 74));
      const angle = Math.random() * Math.PI;
      const len = 900;
      engine.bossAfterimageSlashes.push({
        x1: px - Math.cos(angle) * len,
        y1: py - Math.sin(angle) * len,
        x2: px + Math.cos(angle) * len,
        y2: py + Math.sin(angle) * len,
        age: -index * 0.1,
        warnTime: 0.54,
        fireTime: 0.2,
        width: 46,
      });
    }
    sfx.bossPatternFire();
  }
}

/**
 * 최종 보스 압축장 페이즈에서 화면 가장자리 압축 필드 상태를 생성하고 보스 위치를 고정한다.
 */
export function runFinalCompressionWalls(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += (engine.canvas.width / 2 - e.width / 2 - e.x) * 1.0 * dt;
  e.y += (62 - e.y) * 1.0 * dt;

  if (!engine.bossCompressionField) {
    engine.bossCompressionField = {
      age: 0,
      warnTime: 0.85,
      closeTime: 3.35,
      holdTime: 1.25,
      maxInset: Math.min(engine.canvas.width, engine.canvas.height) * 0.28,
    };
    sfx.bossPatternFire();
  } else if (e.phase === 32 && e.lastShot < 0.48) {
    engine.bossCompressionField.age = Math.min(
      engine.bossCompressionField.age,
      engine.bossCompressionField.warnTime + engine.bossCompressionField.closeTime + 0.12,
    );
  }
}

/**
 * 최종 보스 엣지 스트라이커 페이즈에서 화면 가장자리 보조 공격체를 소환한다.
 */
export function runFinalEdgeStrikerPattern(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += (engine.canvas.width / 2 - e.width / 2 - e.x) * 0.9 * dt;
  e.y += (60 - e.y) * 0.9 * dt;

  if (e.lastShot > 0.24 && e.patternTimer < e.phaseDuration - 0.25) {
    e.lastShot = 0;
    const sideRoll = Math.random();
    const side: BossEdgeStriker["side"] =
      sideRoll < 0.25 ? "top" : sideRoll < 0.5 ? "bottom" : sideRoll < 0.75 ? "left" : "right";

    const inset = 28;
    const edgePad = 56;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let offscreenX = 0;
    let offscreenY = 0;

    if (side === "top" || side === "bottom") {
      x = edgePad + Math.random() * Math.max(1, engine.canvas.width - edgePad * 2);
      targetX = x;
      targetY = side === "top" ? inset : engine.canvas.height - inset;
      y = side === "top" ? -48 : engine.canvas.height + 48;
      offscreenX = x;
      offscreenY = side === "top" ? -56 : engine.canvas.height + 56;
    } else {
      y = 92 + Math.random() * Math.max(1, engine.canvas.height - 180);
      targetY = y;
      targetX = side === "left" ? inset : engine.canvas.width - inset;
      x = side === "left" ? -48 : engine.canvas.width + 48;
      offscreenY = y;
      offscreenX = side === "left" ? -56 : engine.canvas.width + 56;
    }

    engine.bossEdgeStrikers.push({
      side,
      x,
      y,
      targetX,
      targetY,
      offscreenX,
      offscreenY,
      age: 0,
      state: "enter",
      fired: false,
      active: true,
    });
  }
}

/**
 * 최종 보스 전기 미로 페이즈에서 미로 상태를 생성하고 보스 위치를 연출 위치로 이동시킨다.
 */
export function runFinalElectricMazePattern(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += (engine.canvas.width / 2 - e.width / 2 - e.x) * 1.2 * dt;
  e.y += (54 - e.y) * 1.2 * dt;

  if (!engine.bossMazeState) {
    engine.bossMazeState = engine.createBossMazeState();
    sfx.bossPatternFire();
  }
}

/**
 * 오버드라이브 나선 격자 페이즈에서 회전 탄막을 지속 생성한다.
 */
export function runOverdriveSpiralLattice(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += (engine.canvas.width / 2 - e.width / 2 - e.x) * 0.9 * dt;
  if (e.lastShot > 0.06) {
    e.lastShot = 0;
    const cx = e.x + e.width / 2;
    const cy = e.y + e.height / 2;
    const count = 8;
    const base = e.patternTimer * (4.8 + Math.random() * 2.4);
    for (let i = 0; i < count; i++) {
      const angle = base + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
      const speed = 320 + Math.random() * 80;
      const b = new Bullet();
      b.x = cx - 5;
      b.y = cy - 5;
      b.width = 10;
      b.height = 10;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed + 80;
      b.isEnemy = true;
      b.type = "crystal";
      b.color = Math.random() < 0.5 ? "#c084fc" : "#38bdf8";
      engine.bullets.push(b);
    }
  }
}

/**
 * 오버드라이브 분열 지뢰 페이즈에서 낙하 지뢰와 파편 분열 탄을 생성한다.
 */
export function runOverdriveSplitMineRain(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += e.vx * 0.12 * dt;
  if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;
  if (e.lastShot > 0.62) {
    e.lastShot = 0;
    const cx = e.x + e.width / 2;
    const cy = e.y + e.height;
    for (let i = -1; i <= 1; i++) {
      const b = new Bullet();
      b.x = cx - 12 + i * 34;
      b.y = cy + Math.random() * 14;
      b.width = 24;
      b.height = 24;
      b.vx = i * (95 + Math.random() * 70) + (Math.random() - 0.5) * 90;
      b.vy = 195 + Math.random() * 95;
      b.isEnemy = true;
      b.type = "void_mine";
      b.color = i === 0 ? "#5eead4" : "#14b8a6";
      b.fuseTimer = 0.58 + Math.random() * 0.62;
      b.age = 0;
      engine.bullets.push(b);
    }
  }
}

/**
 * 오버드라이브 회수 탄환 페이즈에서 바깥으로 뿌린 파편을 보스 쪽으로 되돌리는 탄을 생성한다.
 */
export function runOverdriveRecallBullets(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += (engine.canvas.width / 2 - e.width / 2 - e.x) * 0.9 * dt;
  e.y += (72 - e.y) * 0.9 * dt;

  if (e.rapidFireCount === 0) {
    e.rapidFireCount = 1;
    engine.spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, "#67e8f9", 18);
  }

  const cx = e.x + e.width / 2;
  const cy = e.y + e.height / 2;

  const spreadTime = Math.max(1.7, e.phaseDuration - 2.0);
  if (e.patternTimer < spreadTime && e.lastShot > 0.11) {
    e.lastShot = 0;
    const count = 6;
    const base = e.patternTimer * 4.2;
    for (let i = 0; i < count; i++) {
      const angle = base + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.09;
      const speed = i % 2 === 0 ? 340 + Math.random() * 70 : 545 + Math.random() * 85;
      const b = new Bullet();
      b.x = cx - 8;
      b.y = cy - 8;
      b.width = 18;
      b.height = 18;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed + 25;
      b.isEnemy = true;
      b.type = "recall_shard";
      b.color = i % 2 === 0 ? "#67e8f9" : "#2dd4bf";
      b.age = 0;
      b.fuseTimer = Math.max(0.12, spreadTime - e.patternTimer);
      engine.bullets.push(b);
    }
    sfx.bossPatternFire();
  }

  if (e.patternTimer > spreadTime + 1.0 && e.patternTimer < spreadTime + 3.0 && Math.random() < 0.65) {
    const p = new Particle();
    const angle = Math.random() * Math.PI * 2;
    const radius = 80 + Math.random() * 80;
    p.x = cx + Math.cos(angle) * radius;
    p.y = cy + Math.sin(angle) * radius;
    p.vx = -Math.cos(angle) * (80 + Math.random() * 110);
    p.vy = -Math.sin(angle) * (80 + Math.random() * 110);
    p.color = Math.random() < 0.5 ? "#67e8f9" : "#ffffff";
    p.life = p.maxLife = 0.35 + Math.random() * 0.35;
    p.size = 2 + Math.random() * 3;
    engine.particles.push(p);
  }
}

/**
 * 오버드라이브 경고 폭발 페이즈에서 순차 폭발 장판을 생성한다.
 */
export function runOverdriveWarningExplosions(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += e.vx * 0.09 * dt;
  if (e.x < 18 || e.x > engine.canvas.width - e.width - 18) e.vx *= -1;

  if (e.lastShot > 0.46) {
    e.lastShot = 0;
    const burstCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < burstCount; i++) {
      const laneBias = Math.random();
      const x = laneBias < 0.25
        ? 58 + Math.random() * 110
        : laneBias > 0.75
          ? engine.canvas.width - 168 + Math.random() * 110
          : 72 + Math.random() * Math.max(1, engine.canvas.width - 144);
      const y = 145 + Math.random() * Math.max(1, engine.canvas.height - 250);
      engine.bossTimedExplosions.push({
        x,
        y,
        radius: 76 + Math.random() * 42,
        age: 0,
        warnTime: 0.42 + i * 0.12 + Math.random() * 0.08,
        fireTime: 0.28,
        color: Math.random() < 0.55 ? "#f97316" : "#eab308",
      });
    }
    sfx.bossPatternFire();
  }
}

/**
 * 오버드라이브 꼬리 로켓 페이즈에서 로켓과 후속 지뢰 장판을 생성한다.
 */
export function runOverdriveTailExplosions(engine: BossPatternRuntime, e: Enemy, dt: number) {
  e.x += e.vx * 0.16 * dt;
  if (e.x < 15 || e.x > engine.canvas.width - e.width - 15) e.vx *= -1;

  if (e.lastShot > 0.19) {
    e.lastShot = 0;
    const dropCount = e.rapidFireCount % 2 === 0 ? 2 : 1;
    e.rapidFireCount++;

    for (let i = 0; i < dropCount; i++) {
      const b = new Bullet();
      b.x = 20 + Math.random() * Math.max(1, engine.canvas.width - 40);
      b.y = -50 - Math.random() * 80;
      b.width = 14;
      b.height = 28;
      b.vx = (Math.random() - 0.5) * 38;
      b.vy = 640 + Math.random() * 90;
      b.isEnemy = true;
      b.type = "tail_rocket";
      b.color = "#38bdf8";
      b.shootTimer = 0;
      engine.bullets.push(b);
    }
    sfx.bossPatternFire();
  }
}

