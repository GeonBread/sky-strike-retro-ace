/**
 * 일반 몬스터 스폰·웨이브 시스템
 *
 * 이 파일은 일반 플레이 중 몬스터 웨이브 생성, 사이드 스폰, 스토리 모드 보스 진입 조건,
 * 샌드박스 웨이브 생성을 담당한다. 몬스터 등장 타이밍과 웨이브 구성을 수정할 때 이 파일을 수정한다.
 */

import { Enemy, type EnemyType } from "../entities";
import { sfx } from "../AudioSystem";
import { triggerChapter1SandboxWaveSystem, updateChapter1WaveDirectorSystem } from "../chapter1/chapter1WaveSystem";

const MAX_CHAPTER = 4;

type EnemySpawnRuntime = any;

/**
 * 현재 점수, 스테이지, 스토리 진행 시간, 웨이브 타이머를 기준으로 일반 몬스터 웨이브를 생성한다.
 * 보스 진입 조건이 만족되면 일반 몬스터 정리 상태로 전환한다.
 */
export function spawnEnemyWaveSystem(engine: EnemySpawnRuntime, dt: number) {
  if (engine.bossActive || engine.clearingForBoss) return;
  if (engine.stage === 1) {
    updateChapter1WaveDirectorSystem(engine, dt);
    return;
  }
  const storyMode = engine.isStoryMode();

  // Dynamic Wave Flow: If all active enemies are cleared, accelerate the next beautiful major wave transition!
  const activeEnemiesCount = engine.enemies.filter((e) => e.active).length;
  const emptyFieldWaveDelay = storyMode ? 2.4 : 1.2;
  if (activeEnemiesCount === 0 && engine.waveTimer > emptyFieldWaveDelay) {
    engine.waveTimer = emptyFieldWaveDelay; // Bring down the next awesome wave soon after the field clears.
  }

  engine.spawnTimer -= dt;
  engine.sideSpawnTimer -= dt;
  engine.waveTimer -= dt;
  const tier = engine.getCombatTier();
  const assaultCommanderActive = engine.enemies.some(
    (e) => e.active && e.type === "assault_commander",
  );

  if (
    !storyMode &&
    engine.stage >= 2 &&
    engine.assaultCommanderStage !== engine.stage &&
    engine.score >= engine.nextBossScore - (tier >= 3 ? 9000 : 7000) &&
    !assaultCommanderActive
  ) {
    engine.assaultCommanderStage = engine.stage;
    engine.spawnAssaultCommander(tier);
    engine.waveTimer = Math.max(engine.waveTimer, 4.5);
    engine.spawnTimer = Math.max(engine.spawnTimer, 1.1);
    return;
  }

  const storyBossReady = storyMode && engine.storyStageTimer >= engine.getStoryBossDelay();
  if (
    (storyBossReady || engine.score >= engine.nextBossScore) &&
    !engine.bossActive &&
    !engine.clearingForBoss &&
    !assaultCommanderActive
  ) {
    engine.clearingForBoss = true;
    return;
  }

  if (engine.waveTimer <= 0) {
    engine.waveTimer = storyMode
      ? Math.random() * 4.5 + 8.5
      : Math.random() * (tier === 1 ? 7 : tier === 2 ? 5 : tier === 3 ? 3.8 : 3.2) +
        (tier === 1 ? 10 : tier === 2 ? 7.2 : tier === 3 ? 5.6 : 4.8);
    const wavePoolSize = storyMode ? (tier === 1 ? 5 : 6) : tier === 1 ? 8 : tier === 2 ? 14 : 18;
    const waveType = Math.floor(Math.random() * wavePoolSize);
    const waveStartIndex = engine.enemies.length;
    if (waveType === 0) {
      // Horizontal Row - fast deploy across the screen
      const count = 5;
      const spacing = (engine.canvas.width - 120) / (count - 1);
      const targetY = 80;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "column_shooter";
        e.x = 60 + i * spacing - 12;
        e.y = -60; // Spawn off-screen top
        e.vy = 400; // Fast drop descent
        e.spawnPoint = targetY;
        e.width = 24;
        e.height = 24;
        e.visualId = 4;
        engine.enemies.push(e);
      }
    } else if (waveType === 1) {
      // Circle expanding from top center
      const count = Math.floor(Math.random() * 6) + 3; // 3 to 8
      const cx = engine.canvas.width / 2 - 12;
      const cy = -50;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const e = new Enemy();
        e.type = "circle_shooter";
        e.x = cx;
        e.y = cy;
        e.vx = Math.cos(a) * 80;
        e.vy = Math.sin(a) * 80 + 150; // fast move out
        e.width = 28;
        e.height = 28;
        e.visualId = 2;
        engine.enemies.push(e);
      }
    } else if (waveType === 2) {
      // V formation 360 - perfectly symmetrical
      const rows = Math.floor(Math.random() * 2) + 4; // 4 to 5 rows
      const count = rows * 2 + 1; // 9 to 11
      const cx = engine.canvas.width / 2 - 12;
      for (let i = 0; i < count; i++) {
        const row = Math.ceil(i / 2);
        const dir = i === 0 ? 0 : i % 2 === 1 ? -1 : 1;
        const e = new Enemy();
        e.type = "v_360_shooter";
        e.x = cx + dir * (row * 40);
        e.y = -50 - row * 40;
        e.vy = 400; // fast enter
        e.spawnPoint = 60 + row * 40;
        e.width = 24;
        e.height = 24;
        e.visualId = 5;
        engine.enemies.push(e);
      }
    } else if (waveType === 3) {
      // (Wave 1) Gear Rotation Wave
      const cx = engine.canvas.width / 2;
      const cy = -120;
      const count = 10;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "gear_rotate";
        e.width = 28;
        e.height = 28;
        e.hp = 3;
        e.visualId = 8;
        e.direction = i;
        e.patternTimer = (i / count) * Math.PI * 2;
        e.spawnPoint = 170; // Hover Target Y
        e.vx = cx;
        e.vy = cy;
        engine.enemies.push(e);
      }
    } else if (waveType === 4) {
      // (Wave 2) Cross-X Formation Wave
      const count = 6;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "cross_x";
        e.x = -50 - i * 45;
        e.y = -50 - i * 45;
        e.width = 26;
        e.height = 26;
        e.hp = 2;
        e.vx = 140;
        e.vy = 120;
        e.rapidFireCount = 0;
        e.visualId = 6;
        engine.enemies.push(e);
      }
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "cross_x";
        e.x = engine.canvas.width + 50 + i * 45;
        e.y = -50 - i * 45;
        e.width = 26;
        e.height = 26;
        e.hp = 2;
        e.vx = -140;
        e.vy = 120;
        e.rapidFireCount = 0;
        e.visualId = 7;
        engine.enemies.push(e);
      }
    } else if (waveType === 5) {
      // (Wave 3) Zig-Zag Wave
      for (let i = 0; i < 12; i++) {
        const e = new Enemy();
        e.type = "zigzag_wave";
        e.width = 26;
        e.height = 26;
        e.hp = 2;
        e.x = 45 + (i % 3) * 110;
        e.y = -50 - Math.floor(i / 3) * 150;
        e.vx = i % 2 === 0 ? 150 : -150;
        e.vy = 75;
        e.visualId = 9;
        engine.enemies.push(e);
      }
    } else if (waveType === 6) {
      // (Wave 4) Encirclement Wave
      const positions = [
        { x: engine.canvas.width / 2 - 15, y: -40 },
        { x: engine.canvas.width / 2 - 15, y: engine.canvas.height + 40 },
        { x: -40, y: 120 },
        { x: engine.canvas.width + 40, y: 120 },
        { x: -40, y: 350 },
        { x: engine.canvas.width + 40, y: 350 },
      ];
      positions.forEach((pos, idx) => {
        const e = new Enemy();
        e.type = "encirclement";
        e.x = pos.x;
        e.y = pos.y;
        e.width = 30;
        e.height = 30;
        e.hp = 3;
        e.patternTimer = 0;
        e.rapidFireCount = 0;
        e.visualId = 10;
        engine.enemies.push(e);
      });
    } else if (waveType === 7) {
      // (Wave 5) Train Convoy Wave
      const leader = new Enemy();
      leader.type = "train_leader";
      leader.x = engine.canvas.width / 2 - 16;
      leader.y = -50;
      leader.width = 32;
      leader.height = 32;
      leader.hp = 12;
      leader.vx = 120;
      leader.vy = 80;
      leader.visualId = 3;
      engine.enemies.push(leader);

      for (let i = 0; i < 9; i++) {
        const follower = new Enemy();
        follower.type = "train_follower";
        follower.x = engine.canvas.width / 2 - 12;
        follower.y = -85 - i * 35;
        follower.width = 24;
        follower.height = 24;
        follower.hp = 2;
        follower.direction = i;
        follower.visualId = 1;
        engine.enemies.push(follower);
      }
    } else if (waveType === 8) {
      // (Wave 6) Split Cluster Storm
      const count = 3;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "split_cluster";
        e.x = (engine.canvas.width / 4) * (i + 1) - 15;
        e.y = -60;
        e.vx = i % 2 === 0 ? 60 : -60;
        e.vy = 120;
        e.spawnPoint = 130;
        e.hp = 6;
        e.width = 30;
        e.height = 30;
        e.visualId = 5;
        engine.enemies.push(e);
      }
    } else if (waveType === 9) {
      // (Wave 7) Minefield Grid
      const count = 4;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "mine_layer";
        e.x = (engine.canvas.width / 5) * (i + 1) - 15;
        e.y = -70;
        e.vx = i % 2 === 0 ? 50 : -50;
        e.vy = 100;
        e.spawnPoint = 110 + (i % 2) * 50;
        e.hp = 5;
        e.width = 30;
        e.height = 30;
        e.visualId = 6;
        engine.enemies.push(e);
      }
    } else if (waveType === 10) {
      // (Wave 8) Pair Barricade Trap
      const count = 2;
      for (let i = 0; i < count; i++) {
        const yOffset = -i * 240;

        const eL = new Enemy();
        eL.type = "barricade_wall";
        eL.x = 20;
        eL.y = yOffset - 50;
        eL.vx = 0;
        eL.vy = 45;
        eL.hp = 8;
        eL.width = 32;
        eL.height = 32;
        eL.visualId = 4;
        engine.enemies.push(eL);

        const eR = new Enemy();
        eR.type = "barricade_wall";
        eR.x = engine.canvas.width - 56;
        eR.y = yOffset - 50;
        eR.vx = 0;
        eR.vy = 45;
        eR.hp = 8;
        eR.width = 32;
        eR.height = 32;
        eR.visualId = 4;
        engine.enemies.push(eR);
      }
    } else if (waveType === 11) {
      // (Wave 9) Tactical Boomerang / Satellite Orbit Group
      const count = 3;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = Math.random() < 0.5 ? "boomerang_orbit" : "satellite_shield";
        e.x = (engine.canvas.width / 4) * (i + 1) - 15;
        e.y = -60;
        e.vx = i % 2 === 0 ? 70 : -70;
        e.vy = 120;
        e.spawnPoint = 110 + (i % 2) * 40;
        e.hp = 6;
        e.width = 28;
        e.height = 28;
        e.visualId = 7;
        engine.enemies.push(e);
      }
    } else if (waveType === 12) {
      // (Wave 10) Deceleration Paint Squad
      const count = 4;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "dash_paint";
        e.x = (engine.canvas.width / 5) * (i + 1) - 15;
        e.y = -60;
        e.vx = i % 2 === 0 ? 80 : -80;
        e.vy = 110;
        e.spawnPoint = 120 + (i % 2) * 40;
        e.hp = 5;
        e.width = 28;
        e.height = 28;
        e.visualId = 2;
        engine.enemies.push(e);
      }
    } else if (waveType === 13) {
      // (Wave 11) Hardcore Chaos Combo Spawn (The Ultimate Regular Mob Spawning Combo!)
      // A: Barricade pair traps left-to-right space
      const eL = new Enemy();
      eL.type = "barricade_wall";
      eL.x = 20;
      eL.y = -50;
      eL.vx = 0;
      eL.vy = 40;
      eL.hp = 10;
      eL.width = 30;
      eL.height = 30;
      eL.visualId = 4;
      engine.enemies.push(eL);

      const eR = new Enemy();
      eR.type = "barricade_wall";
      eR.x = engine.canvas.width - 50;
      eR.y = -50;
      eR.vx = 0;
      eR.vy = 40;
      eR.hp = 10;
      eR.width = 30;
      eR.height = 30;
      eR.visualId = 4;
      engine.enemies.push(eR);

      // B: Mine layer drops persistent movement limiters
      const mineUnit = new Enemy();
      mineUnit.type = "mine_layer";
      mineUnit.x = engine.canvas.width / 2 - 15;
      mineUnit.y = -100;
      mineUnit.vx = 45;
      mineUnit.vy = 100;
      mineUnit.spawnPoint = 80;
      mineUnit.hp = 6;
      mineUnit.width = 28;
      mineUnit.height = 28;
      mineUnit.visualId = 6;
      engine.enemies.push(mineUnit);

      // C: Paint rockets targeting small remaining spots
      for (let i = 0; i < 2; i++) {
        const e = new Enemy();
        e.type = "dash_paint";
        e.x =
          (i === 0 ? engine.canvas.width * 0.25 : engine.canvas.width * 0.75) -
          14;
        e.y = -120;
        e.vx = i === 0 ? 60 : -60;
        e.vy = 100;
        e.spawnPoint = 140;
        e.hp = 6;
        e.width = 28;
        e.height = 28;
        e.visualId = 1;
        engine.enemies.push(e);
      }
    } else if (waveType === 14) {
      // (Wave 12) Ricochet Bouncing Strike
      const count = 3;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "ricochet_shooter";
        e.x = (engine.canvas.width / 4) * (i + 1) - 15;
        e.y = -60;
        e.vx = i % 2 === 0 ? 55 : -55;
        e.vy = 110;
        e.spawnPoint = 110 + (i % 2) * 50;
        e.hp = 6;
        e.width = 30;
        e.height = 30;
        e.visualId = 8;
        engine.enemies.push(e);
      }
    } else if (waveType === 15) {
      // (Wave 13) Martyr Counter Shield Wall
      const count = 3;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "counter_on_death";
        e.x = (engine.canvas.width / 4) * (i + 1) - 15;
        e.y = -60;
        e.vx = i % 2 === 0 ? 40 : -40;
        e.vy = 85;
        e.spawnPoint = 130 + (i % 2) * 40;
        e.hp = 8;
        e.width = 32;
        e.height = 32;
        e.visualId = 9;
        engine.enemies.push(e);
      }
    } else if (waveType === 16) {
      // (Wave 14) Ink Blind Spot Smoke Camouflage
      const count = 2;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "ink_shooter";
        e.x =
          (i === 0 ? engine.canvas.width * 0.3 : engine.canvas.width * 0.7) - 15;
        e.y = -60;
        e.vx = i === 0 ? 45 : -45;
        e.vy = 95;
        e.spawnPoint = 110;
        e.hp = 6;
        e.width = 28;
        e.height = 28;
        e.visualId = 4;
        engine.enemies.push(e);
      }
    } else if (waveType === 17) {
      // (Wave 15) Gravity Singularity Vortex Clenches
      const count = 2;
      for (let i = 0; i < count; i++) {
        const e = new Enemy();
        e.type = "gravity_vortex_mob";
        e.x =
          (i === 0 ? engine.canvas.width * 0.25 : engine.canvas.width * 0.75) -
          15;
        e.y = -70;
        e.vx = i === 0 ? 30 : -30;
        e.vy = 75;
        e.spawnPoint = 140;
        e.hp = 7;
        e.width = 30;
        e.height = 30;
        e.visualId = 10;
        engine.enemies.push(e);
      }
    }
    engine.enemies.slice(waveStartIndex).forEach((enemy) => {
      engine.scaleAssaultEnemy(enemy, tier, tier >= 3 && Math.random() < 0.25);
    });
  }

  if (engine.sideSpawnTimer <= 0) {
    engine.sideSpawnTimer = storyMode
      ? Math.random() * 5 + 10
      : Math.max(
        3.2,
        Math.random() * (tier === 1 ? 5 : tier === 2 ? 3.8 : tier === 3 ? 3 : 2.4) +
          (tier === 1 ? 6 : tier === 2 ? 4.5 : tier === 3 ? 3.7 : 3.0),
      );
    // side squads
    const isLeft = Math.random() > 0.5;
    const startX = isLeft ? -50 : engine.canvas.width + 50;
    const vx = storyMode ? (isLeft ? 185 : -185) : (isLeft ? 350 : -350) + (isLeft ? 1 : -1) * (tier - 1) * 45;
    const count = storyMode ? 3 : tier >= 4 ? 8 : tier >= 3 ? 7 : tier === 2 ? 6 : 5;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.x = startX + (isLeft ? -i * 60 : i * 60);
      e.y = 100 + i * 20;
      e.type = "aimed";
      e.width = 25;
      e.height = 25;
      e.hp = 2;
      e.vx = vx;
      e.vy = tier >= 3 ? 18 : 0;
      e.visualId = Math.floor(Math.random() * 10) + 1;
      engine.scaleAssaultEnemy(e, tier);
      engine.enemies.push(e);
    }
  }

  if (engine.spawnTimer <= 0) {
    const stageSpeedMod = storyMode ? engine.stage * 5 + (tier - 1) * 4 : engine.stage * 18 + (tier - 1) * 18;
    engine.spawnTimer = storyMode ? Math.max(1.35, 2.35 - engine.stage * 0.08) : Math.max(0.42, 1.68 - engine.stage * 0.13 - (tier - 1) * 0.25);
    const speedMult = storyMode ? 0.88 + (tier - 1) * 0.04 : 1.35 + (tier - 1) * 0.18;

    const randLayout = Math.random();
    // Decide a common type and properties for this wave unit
    const typeRand = storyMode ? Math.random() * 0.42 : Math.min(0.98, Math.random() + (tier - 1) * 0.08);
    let type: EnemyType = "aimed";
    let width = 28;
    let height = 28;
    let hp = 2;
    let vy = (90 + stageSpeedMod) * speedMult;
    let vx = 0;
    let visualId = Math.floor(Math.random() * 10) + 1;

    if (typeRand < 0.12) {
      type = "sweeper";
      width = 24;
      height = 24;
      hp = 1;
      vy = (120 + stageSpeedMod) * speedMult;
      vx = (Math.random() < 0.5 ? 1 : -1) * 110;
    } else if (typeRand < 0.28) {
      type = "aimed";
      width = 28;
      height = 28;
      hp = 2;
      vy = (85 + stageSpeedMod) * speedMult;
    } else if (typeRand < 0.44) {
      type = "homing_shooter"; // Fires straight purple non-tracking aimed projectiles
      width = 30;
      height = 30;
      hp = 3;
      vy = (80 + stageSpeedMod) * speedMult;
    } else if (typeRand < 0.6) {
      type = "shotgun_shooter";
      width = 35;
      height = 35;
      hp = 4;
      vy = (70 + stageSpeedMod) * speedMult;
    } else if (typeRand < 0.76) {
      type = "burst_shooter";
      width = 26;
      height = 26;
      hp = 2;
      vy = (95 + stageSpeedMod) * speedMult;
    } else if (typeRand < 0.9) {
      type = "tank";
      width = 40;
      height = 40;
      hp = 6;
      vy = (55 + stageSpeedMod) * speedMult;
    } else {
      type = "stationary";
      width = 42;
      height = 42;
      hp = 10;
      vy = 300;
    }

    // Higher tiers lean into organized squad pressure instead of isolated fodder.
    const squadChance = storyMode ? 0.22 : tier === 1 ? 0.45 : tier === 2 ? 0.62 : 0.72;
    if (randLayout < squadChance && type !== "sweeper" && type !== "stationary") {
      const groupPattern = Math.floor(Math.random() * 3);
      const baseCX = Math.random() * (engine.canvas.width - 240) + 120;

      if (groupPattern === 0) {
        // HORIZONTAL UNIT: 3 aligned side-by-side
        for (let i = -1; i <= 1; i++) {
          const e = new Enemy();
          e.type = type;
          e.width = width;
          e.height = height;
          e.hp = Math.ceil(hp * engine.getAssaultHpMultiplier(tier));
          e.vy = vy;
          e.vx = vx;
          e.x = baseCX + i * 55 - width / 2;
          e.y = -50;
          e.visualId = visualId;
          engine.enemies.push(e);
        }
      } else if (groupPattern === 1) {
        // V-FORMATION SQUAD: 3 in V arrangement
        const offsets = [
          { rx: 0, ry: 0 },
          { rx: -45, ry: -40 },
          { rx: 45, ry: -40 },
        ];
        offsets.forEach((off) => {
          const e = new Enemy();
          e.type = type;
          e.width = width;
          e.height = height;
          e.hp = Math.ceil(hp * engine.getAssaultHpMultiplier(tier));
          e.vy = vy;
          e.vx = vx;
          e.x = baseCX + off.rx - width / 2;
          e.y = -50 + off.ry;
          e.visualId = visualId;
          engine.enemies.push(e);
        });
      } else {
        // CONVOY COLUMN: 3 marching in vertical order
        for (let i = 0; i < 3; i++) {
          const e = new Enemy();
          e.type = type;
          e.width = width;
          e.height = height;
          e.hp = Math.ceil(hp * engine.getAssaultHpMultiplier(tier));
          e.vy = vy;
          e.vx = vx;
          e.x = baseCX - width / 2;
          e.y = -50 - i * 50;
          e.visualId = visualId;
          engine.enemies.push(e);
        }
      }
    } else {
      // Normal single spawn unit
      const e = new Enemy();
      e.x = Math.random() * (engine.canvas.width - width);
      e.y = -40;
      e.type = type;
      e.width = width;
      e.height = height;
      e.hp = Math.ceil(hp * engine.getAssaultHpMultiplier(tier));
      e.vy = vy;
      e.vx = vx;
      e.visualId = visualId;
      engine.enemies.push(e);
    }
  }

  // Limit active circle_shooters on field to maximum 5 to guarantee clean playability & aesthetic bullet hell balance
  const activeCircles = engine.enemies.filter(
    (e) => e.active && e.type === "circle_shooter",
  );
  if (activeCircles.length > 5) {
    const excess = activeCircles.length - 5;
    for (let i = 0; i < excess; i++) {
      activeCircles[i].type = "aimed";
      activeCircles[i].visualId = 1; // Default aimed sprite
    }
  }
}

/**
 * 개발자 샌드박스에서 선택한 웨이브 번호에 맞춰 관찰용 일반 몬스터 그룹을 생성한다.
 * 샌드박스 테스트용 웨이브 구성이나 체력 배율을 조정할 때 이 함수를 수정한다.
 */
export function triggerSandboxEnemyWaveSystem(engine: EnemySpawnRuntime, waveType: number) {
  engine.sandboxMode = "wave";
  engine.sandboxActiveWave = waveType;
  triggerChapter1SandboxWaveSystem(engine, waveType);
  return;
  engine.sandboxMode = "wave";
  engine.sandboxActiveWave = waveType;
  engine.enemies = []; // Clear current sandbox target
  engine.bullets = []; // Clear projectiles
  engine.inkClouds = []; // Clear ink screen
  engine.particles = []; // Clear debris

  if (waveType === 0) {
    // Horizontal Row - fast deploy across the screen
    const count = 5;
    const spacing = (engine.canvas.width - 120) / (count - 1);
    const targetY = 80;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "column_shooter";
      e.x = 60 + i * spacing - 12;
      e.y = -60; // Spawn off-screen top
      e.vy = 400; // Fast drop descent
      e.spawnPoint = targetY;
      e.width = 24;
      e.height = 24;
      e.visualId = 4;
      engine.enemies.push(e);
    }
  } else if (waveType === 1) {
    // Circle expanding from top center
    const count = Math.floor(Math.random() * 6) + 3; // 3 to 8
    const cx = engine.canvas.width / 2 - 12;
    const cy = -50;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const e = new Enemy();
      e.type = "circle_shooter";
      e.x = cx;
      e.y = cy;
      e.vx = Math.cos(a) * 80;
      e.vy = Math.sin(a) * 80 + 150; // fast move out
      e.width = 28;
      e.height = 28;
      e.visualId = 2;
      engine.enemies.push(e);
    }
  } else if (waveType === 2) {
    // V formation 360 - perfectly symmetrical
    const rows = Math.floor(Math.random() * 2) + 4; // 4 to 5 rows
    for (let i = 0; i < rows; i++) {
      const yOffset = -50 - i * 35;
      const eL = new Enemy();
      eL.type = "v_360_shooter";
      eL.x = 80 + i * 25;
      eL.y = yOffset;
      eL.vy = 200;
      eL.spawnPoint = 80 + i * 28;
      eL.width = 28;
      eL.height = 28;
      eL.visualId = 5;
      engine.enemies.push(eL);

      const eR = new Enemy();
      eR.type = "v_360_shooter";
      eR.x = engine.canvas.width - 108 - i * 25;
      eR.y = yOffset;
      eR.vy = 200;
      eR.spawnPoint = 80 + i * 28;
      eR.width = 28;
      eR.height = 28;
      eR.visualId = 5;
      engine.enemies.push(eR);
    }
  } else if (waveType === 3) {
    // (Wave 1) Gear Rotation Wave
    const count = 4;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "gear_rotate";
      e.x = (engine.canvas.width / 5) * (i + 1) - 15;
      e.y = -60;
      e.vy = 220;
      e.spawnPoint = 100 + (i % 2) * 40;
      e.width = 30;
      e.height = 30;
      e.hp = 6;
      e.visualId = 3;
      engine.enemies.push(e);
    }
  } else if (waveType === 4) {
    // (Wave 2) Cross-X Formation Wave
    const count = 5;
    const centerIdx = 2;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "cross_x";
      e.x = (engine.canvas.width / 6) * (i + 1) - 15;
      e.y = -60 - Math.abs(i - centerIdx) * 40; // diagonal spawn delay
      e.vy = 220;
      e.spawnPoint = 110 + Math.abs(i - centerIdx) * 30;
      e.width = 30;
      e.height = 30;
      e.hp = 5;
      e.visualId = 4;
      engine.enemies.push(e);
    }
  } else if (waveType === 5) {
    // (Wave 3) Zig-Zag Wave
    const count = 5;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "zigzag_wave";
      e.x = (engine.canvas.width / 6) * (i + 1) - 15;
      e.y = -60 - i * 30;
      e.vy = 180;
      e.spawnPoint = 130 + (i % 2) * 50;
      e.vx = i % 2 === 0 ? 120 : -120;
      e.width = 28;
      e.height = 28;
      e.hp = 4;
      e.visualId = 5;
      engine.enemies.push(e);
    }
  } else if (waveType === 6) {
    // (Wave 4) Encirclement Wave
    const count = 6;
    const cx = engine.canvas.width / 2;
    const cy = -120;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 120;
      const e = new Enemy();
      e.type = "encirclement";
      e.x = cx + Math.cos(angle) * radius - 15;
      e.y = cy + Math.sin(angle) * radius;
      e.vy = 140; // moving downward together
      e.vx = (Math.random() - 0.5) * 50;
      e.width = 28;
      e.height = 28;
      e.hp = 5;
      e.visualId = 6;
      engine.enemies.push(e);
    }
  } else if (waveType === 7) {
    // (Wave 5) Train Convoy Wave
    const count = 5;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = i === 0 ? "train_leader" : "train_follower";
      e.x = engine.canvas.width / 2 - 15;
      e.y = -60 - i * 45; // spawned in single file trail
      e.vy = 160;
      e.spawnPoint = 140;
      e.width = i === 0 ? 32 : 26;
      e.height = i === 0 ? 32 : 26;
      e.hp = i === 0 ? 12 : 3;
      e.visualId = i === 0 ? 1 : 2;
      engine.enemies.push(e);
    }
  } else if (waveType === 8) {
    // (Wave 6) Split Cluster Storm
    const count = 3;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "split_cluster";
      e.x = (engine.canvas.width / 4) * (i + 1) - 15;
      e.y = -60;
      e.vy = 180;
      e.spawnPoint = 100 + i * 30;
      e.vx = i === 1 ? 150 : -150;
      e.hp = 6;
      e.width = 30;
      e.height = 30;
      e.visualId = 3;
      engine.enemies.push(e);
    }
  } else if (waveType === 9) {
    // (Wave 7) Minefield Grid
    const count = 3;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "mine_layer";
      e.x = (engine.canvas.width / 4) * (i + 1) - 15;
      e.y = -60;
      e.vy = 160;
      e.spawnPoint = 100 + i * 25;
      e.vx = i % 2 === 0 ? 120 : -120;
      e.hp = 8;
      e.width = 32;
      e.height = 32;
      e.visualId = 8;
      engine.enemies.push(e);
    }
  } else if (waveType === 10) {
    // (Wave 8) Pair Barricade Trap
    for (let i = 0; i < 2; i++) {
      const e = new Enemy();
      e.type = "barricade_wall";
      // positioned left and right
      e.x = i === 0 ? 55 : engine.canvas.width - 55 - 28;
      e.y = -60;
      e.vy = 35; // slow descend together
      e.hp = 20;
      e.width = 28;
      e.height = 28;
      e.visualId = 7;
      engine.enemies.push(e);
    }
  } else if (waveType === 11) {
    // (Wave 9) Tactical Boomerang / Satellite Orbit Group
    const eOrbit = new Enemy();
    eOrbit.type = "boomerang_orbit";
    eOrbit.x = engine.canvas.width / 2 - 18;
    eOrbit.y = -60;
    eOrbit.vy = 180;
    eOrbit.spawnPoint = 100;
    eOrbit.hp = 10;
    eOrbit.width = 36;
    eOrbit.height = 36;
    eOrbit.visualId = 10;
    engine.enemies.push(eOrbit);

    const countShield = 2;
    for (let i = 0; i < countShield; i++) {
      const eShield = new Enemy();
      eShield.type = "satellite_shield";
      eShield.x = i === 0 ? 80 : engine.canvas.width - 80 - 32;
      eShield.y = -100;
      eShield.vy = 85;
      eShield.hp = 8;
      eShield.width = 32;
      eShield.height = 32;
      eShield.visualId = 7;
      engine.enemies.push(eShield);
    }
  } else if (waveType === 12) {
    // (Wave 10) Deceleration Paint Squad
    const count = 3;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "dash_paint";
      e.x = (engine.canvas.width / 4) * (i + 1) - 15;
      e.y = -60;
      e.vy = 180;
      e.spawnPoint = 110 + i * 20;
      e.vx = i === 1 ? -180 : 180;
      e.hp = 6;
      e.width = 30;
      e.height = 30;
      e.visualId = 9;
      engine.enemies.push(e);
    }
  } else if (waveType === 13) {
    // (Wave 11) Hardcore Chaos Combo Spawn (The Ultimate Regular Mob Spawning Combo!)
    const eOrbit = new Enemy();
    eOrbit.type = "boomerang_orbit";
    eOrbit.x = engine.canvas.width / 2 - 18;
    eOrbit.y = -80;
    eOrbit.vy = 180;
    eOrbit.spawnPoint = 120;
    eOrbit.hp = 10;
    eOrbit.width = 36;
    eOrbit.height = 36;
    eOrbit.visualId = 10;
    engine.enemies.push(eOrbit);

    const eShield = new Enemy();
    eShield.type = "satellite_shield";
    eShield.x = engine.canvas.width / 2 - 16;
    eShield.y = -150;
    eShield.vy = 75;
    eShield.hp = 8;
    eShield.width = 32;
    eShield.height = 32;
    eShield.visualId = 7;
    engine.enemies.push(eShield);

    for (let i = 0; i < 2; i++) {
      const e = new Enemy();
      e.type = "dash_paint";
      e.x = i === 0 ? 40 : engine.canvas.width - 70;
      e.y = -60;
      e.vy = 190;
      e.spawnPoint = 100;
      e.vx = i === 0 ? 150 : -150;
      e.hp = 5;
      e.width = 30;
      e.height = 30;
      e.visualId = 9;
      engine.enemies.push(e);
    }
  } else if (waveType === 14) {
    // (Wave 12) Ricochet Bouncing Strike
    const count = 3;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "ricochet_shooter";
      e.x = (engine.canvas.width / 4) * (i + 1) - 15;
      e.y = -60;
      e.vy = 110;
      e.hp = 5;
      e.width = 30;
      e.height = 30;
      e.visualId = 5;
      engine.enemies.push(e);
    }
  } else if (waveType === 15) {
    // (Wave 13) Martyr Counter Shield Wall
    const count = 3;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "counter_on_death";
      e.x = (engine.canvas.width / 4) * (i + 1) - 15;
      e.y = -60;
      e.vy = 100;
      e.hp = 8;
      e.width = 30;
      e.height = 30;
      e.visualId = 7;
      engine.enemies.push(e);
    }
  } else if (waveType === 16) {
    // (Wave 14) Ink Blind Spot Smoke Camouflage
    const count = 2;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "ink_shooter";
      e.x =
        (i === 0 ? engine.canvas.width * 0.3 : engine.canvas.width * 0.7) - 15;
      e.y = -60;
      e.vx = i === 0 ? 45 : -45;
      e.vy = 95;
      e.spawnPoint = 110;
      e.hp = 6;
      e.width = 28;
      e.height = 28;
      e.visualId = 4;
      engine.enemies.push(e);
    }
  } else if (waveType === 17) {
    // (Wave 15) Gravity Singularity Vortex Clenches
    const count = 2;
    for (let i = 0; i < count; i++) {
      const e = new Enemy();
      e.type = "gravity_vortex_mob";
      e.x =
        (i === 0 ? engine.canvas.width * 0.25 : engine.canvas.width * 0.75) - 15;
      e.y = -70;
      e.vx = i === 0 ? 30 : -30;
      e.vy = 75;
      e.spawnPoint = 140;
      e.hp = 7;
      e.width = 30;
      e.height = 30;
      e.visualId = 10;
      engine.enemies.push(e);
    }
  }
}
