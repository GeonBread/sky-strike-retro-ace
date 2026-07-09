/**
 * 샌드박스 전투 미리보기 시스템
 *
 * 이 파일은 개발자 샌드박스에서 보스전, 단일 적, 웨이브 미리보기를 반복 실행하는 흐름을 담당한다.
 * 샌드박스 장비 세팅, 보스 전투 초기화, 더미 적 재생성, 샌드박스 무적 처리를 수정할 때 이 파일을 수정한다.
 */

import { Bullet, Enemy } from "../entities";
import { sfx } from "../AudioSystem";
import { getBossMaxHpForTier } from "../boss/bossPhaseSelectionSystem";

const PLAYER_MAX_HP = 3;
const MAX_CHAPTER = 4;

type SandboxCombatRuntime = any;

/**
 * 샌드박스 플레이어 장비 설정을 저장하고 현재 플레이어 상태에 바로 반영한다.
 * 무기 레벨, 폭탄 수, 보조 비행기 수와 보조 비행기 체력 배열을 함께 보정한다.
 */
export function configureSandboxLoadoutSystem(engine: SandboxCombatRuntime, powerLevel: number, bombs: number, satelliteCount: number) {
engine.sandboxPlayerPowerLevel = Math.max(1, Math.min(5, Math.floor(powerLevel)));
engine.sandboxPlayerBombs = Math.max(0, Math.min(9, Math.floor(bombs)));
engine.sandboxPlayerSatelliteCount = Math.max(0, Math.min(4, Math.floor(satelliteCount)));

engine.player.powerLevel = engine.sandboxPlayerPowerLevel;
engine.player.bombs = engine.sandboxPlayerBombs;
engine.player.satelliteCount = engine.sandboxPlayerSatelliteCount;
while (engine.player.satelliteHps.length < engine.player.satelliteCount) {
  engine.player.satelliteHps.push(3);
}
while (engine.player.satelliteHps.length > engine.player.satelliteCount) {
  engine.player.satelliteHps.pop();
}
if (engine.onBombsChanged) engine.onBombsChanged(engine.player.bombs);
}

/**
 * 선택한 챕터의 보스 전투를 샌드박스에서 바로 확인할 수 있도록 전투 상태를 초기화한다.
 * 기존 적, 탄환, 파티클, 아이템, 배경 위험 요소를 비우고 보스 티어 관련 상태를 맞춘다.
 */
export function resetSandboxBossCombatSystem(engine: SandboxCombatRuntime, chapter: number) {
const tier = Math.max(1, Math.min(MAX_CHAPTER, Math.floor(chapter)));
engine.sandboxBossCombatMode = true;
engine.sandboxBossChapter = tier;
engine.sandboxMode = "bossCombat";
engine.sandboxEnemyType = "boss";
engine.sandboxMovementEnabled = true;
engine.stage = tier;
engine.state = "PLAYING";
engine.bossActive = false;
engine.bossEntity = null;
engine.clearingForBoss = false;
engine.bossPhase2Active = tier === 2;
engine.bossPhase3Active = tier >= 3;
engine.bossPhase2Triggered = tier >= 2;
engine.bossPhase3Triggered = tier >= 3;
engine.enemies = [];
engine.bullets = [];
engine.particles = [];
engine.powerups = [];
engine.inkClouds = [];
engine.meteors = [];
engine.clearBossPatternHazards();
engine.player.hp = PLAYER_MAX_HP;
engine.player.isDead = false;
engine.player.deadTimer = 0;
engine.player.invulnTimer = 1.0;
engine.needInitialPosition = true;
sfx.startBgmForPhase(tier);
}

/**
 * 샌드박스 전투 미리보기의 반복 실행 상태를 갱신한다.
 * 더미 적 재생성, 보스 티어 고정, 이동 반복, 샌드박스 무적 상태를 매 프레임 보정한다.
 */
export function updateSandboxCombatPreviewSystem(engine: SandboxCombatRuntime, dt: number) {
const bossCombatMode = engine.sandboxBossCombatMode || engine.sandboxMode === "bossCombat";
const sandboxBossTier = bossCombatMode
  ? Math.max(1, Math.min(MAX_CHAPTER, Math.floor(engine.sandboxBossChapter || 1)))
  : engine.sandboxBossPhase3
    ? 3
    : engine.sandboxBossOverdrive
      ? 2
      : 1;

engine.waveTimer = 99;
engine.spawnTimer = 99;
engine.sideSpawnTimer = 99;
engine.clearingForBoss = false;
engine.stage = sandboxBossTier;
engine.bossPhase2Active = sandboxBossTier === 2;
engine.bossPhase3Active = sandboxBossTier >= 3;
engine.bossPhase2Triggered = sandboxBossTier >= 2;
engine.bossPhase3Triggered = sandboxBossTier >= 3;
if (!bossCombatMode) {
  engine.bossActive = false;
}
engine.player.powerLevel = Math.max(1, Math.min(5, Math.floor(engine.sandboxPlayerPowerLevel || 1)));
engine.player.satelliteCount = Math.max(0, Math.min(4, Math.floor(engine.sandboxPlayerSatelliteCount || 0)));
while (engine.player.satelliteHps.length < engine.player.satelliteCount) {
  engine.player.satelliteHps.push(3);
}
while (engine.player.satelliteHps.length > engine.player.satelliteCount) {
  engine.player.satelliteHps.pop();
}

// Wrap sandbox enemies that go off-screen bottom so they repeat their paths instead of getting deleted!
if (engine.sandboxMovementEnabled) {
  engine.enemies.forEach((e) => {
    if (e.y > engine.canvas.height + 30) {
      e.y = -60;
      if (e.type !== "boss") {
        e.x = Math.random() * (engine.canvas.width - 120) + 60;
      }
      // Reset its health so it runs again
      if (e.type === "boss") {
        e.hp = getBossMaxHpForTier(engine.sandboxBossPhase3 ? 3 : engine.sandboxBossOverdrive ? 2 : 1);
        if (engine.sandboxBossPhase3) {
          e.width = 200;
          e.height = 150;
        } else {
          e.width = 120;
          e.height = 90;
        }
      } else {
        e.hp = e.type === "assault_commander" ? 230 : e.type === "tank" ? 80 : 30;
      }
      e.lastShot = 0;
      e.patternTimer = 0;

      // Setup standard real game initial velocity vectors:
      if (e.type === "assault_commander") {
        e.vy = 145;
        e.spawnPoint = 110;
        e.vx = 125;
      } else if (e.type === "stationary") {
        e.vy = 300;
        e.spawnPoint = 100;
        e.vx = 0;
      } else if (e.type === "column_shooter") {
        e.vy = 400;
        e.spawnPoint = 120;
        e.vx = 0;
      } else if (e.type === "circle_shooter") {
        e.vy = 150;
        e.vx = Math.random() > 0.5 ? 40 : -40;
      } else if (e.type === "v_360_shooter") {
        e.vy = 200;
        e.spawnPoint = 110;
        e.vx = 0;
      } else if (e.type === "split_cluster") {
        e.vy = 180;
        e.spawnPoint = 115;
        e.vx = 150;
      } else if (e.type === "mine_layer") {
        e.vy = 160;
        e.spawnPoint = 110;
        e.vx = 120;
      } else if (e.type === "dash_paint") {
        e.vy = 180;
        e.spawnPoint = 120;
        e.vx = 180;
      } else if (e.type === "sweeper") {
        e.vy = 150;
        e.vx = (Math.random() > 0.5 ? 1 : -1) * 110;
      } else {
        e.vy = e.type === "tank" ? 75 : 120;
        e.vx = 0;
      }
    }
    if (e.x < -100) {
      e.x = engine.canvas.width + 20;
    } else if (e.x > engine.canvas.width + 100) {
      e.x = -20;
    }
  });
}

// Check if there is an active sandbox enemy
const activeSandboxEnemy = engine.enemies.find((e) => e.active);
if (!activeSandboxEnemy) {
  engine.bullets = []; // Clear existing projectiles to start fresh!

  if (engine.sandboxMode === "wave" && !bossCombatMode) {
    engine.triggerSandboxWave(engine.sandboxActiveWave);
    return;
  }

  // Add a 1.0 second delay before respawning the sandbox enemy
  if (engine.sandboxRespawnTimer === undefined) {
    engine.sandboxRespawnTimer = 1.0;
  }
  if (engine.sandboxRespawnTimer > 0) {
    engine.sandboxRespawnTimer -= dt;
    return;
  }
  engine.sandboxRespawnTimer = 1.0; // Reset for the next destruction cycle!

  const dummy = new Enemy();
  dummy.type = engine.sandboxEnemyType as any;
  if (bossCombatMode) {
    dummy.type = "boss";
  }
  dummy.active = true;

  if (dummy.type === "boss") {
    const targetPhase =
      engine.sandboxBossPhaseLock >= 1
        ? engine.sandboxBossPhaseLock
        : sandboxBossTier >= 4
          ? engine.pickChapter4BossPhase(-1)
          : sandboxBossTier >= 3
            ? engine.pickNextFinalBossPhase(-1)
            : sandboxBossTier === 2
              ? engine.pickOverdriveBossPhase(-1)
              : engine.pickNormalBossPhase(-1);

    if (sandboxBossTier >= 3) {
      dummy.width = sandboxBossTier >= 4 ? 220 : 200;
      dummy.height = sandboxBossTier >= 4 ? 165 : 150;
      dummy.x = engine.canvas.width / 2 - dummy.width / 2;
      dummy.y = 80;
      dummy.spawnPoint = 80;
      dummy.hp = getBossMaxHpForTier(sandboxBossTier);
      dummy.bossStunTimer = 0;
      dummy.visualId = 1;

      engine.bossActive = true;
      engine.bossEntity = dummy;
      engine.bossPhase3Active = true;
      engine.bossPhase2Active = false;
    } else {
      dummy.width = sandboxBossTier === 2 ? 150 : 120;
      dummy.height = sandboxBossTier === 2 ? 110 : 90;
      dummy.x = engine.canvas.width / 2 - dummy.width / 2;
      dummy.y = 80;
      dummy.spawnPoint = 80;
      dummy.hp = getBossMaxHpForTier(sandboxBossTier);
      dummy.bossStunTimer = 0;
      dummy.visualId = 1;

      engine.bossActive = true;
      engine.bossEntity = dummy;
      engine.bossPhase3Active = false;
      engine.bossPhase2Active = sandboxBossTier === 2;
    }
    engine.assignBossPhase(dummy, targetPhase, engine.sandboxBossPhaseLock >= 1);

    if (engine.sandboxMovementEnabled || bossCombatMode) {
      dummy.vx = 150;
      dummy.vy = 60;
    } else {
      dummy.vx = 0;
      dummy.vy = 0;
    }
  } else {
    dummy.width = dummy.type === "assault_commander" ? 94 : 36;
    dummy.height = dummy.type === "assault_commander" ? 66 : 36;
    dummy.x = engine.canvas.width / 2 - dummy.width / 2;
    dummy.y = 120;
    dummy.spawnPoint = 120;
    // Set moderate HP so it can be defeated and respawned easily to observe death counter patterns!
    dummy.hp = dummy.type === "assault_commander" ? 230 : dummy.type === "tank" ? 80 : 30;

    // Map unique visual ID ship designs for sandbox
    if (dummy.type === "stationary") dummy.visualId = 8;
    else if (dummy.type === "assault_commander") dummy.visualId = 10;
    else if (dummy.type === "aimed") dummy.visualId = 9;
    else if (dummy.type === "circle_shooter") dummy.visualId = 2;
    else if (dummy.type === "v_360_shooter") dummy.visualId = 5;
    else if (dummy.type === "burst_shooter") dummy.visualId = 1;
    else if (dummy.type === "satellite_shield") dummy.visualId = 7;
    else if (dummy.type === "boomerang_orbit") dummy.visualId = 10;
    else if (dummy.type === "homing_shooter") dummy.visualId = 3;
    else if (dummy.type === "shotgun_shooter") dummy.visualId = 6;
    else if (dummy.type === "mine_layer") dummy.visualId = 8;
    else if (dummy.type === "dash_paint") dummy.visualId = 9;
    else if (dummy.type === "tank") dummy.visualId = 4;
    else if (dummy.type === "ricochet_shooter") dummy.visualId = 5;
    else if (dummy.type === "counter_on_death") dummy.visualId = 7;
    else if (dummy.type === "ink_shooter") dummy.visualId = 2;
    else if (dummy.type === "gravity_vortex_mob") dummy.visualId = 8;
    else dummy.visualId = Math.floor(Math.random() * 10) + 1;

    if (engine.sandboxMovementEnabled) {
      if (dummy.type === "assault_commander") {
        dummy.y = -90;
        dummy.vy = 145;
        dummy.spawnPoint = 110;
        dummy.vx = 125;
      } else if (dummy.type === "stationary") {
        dummy.y = -60;
        dummy.vy = 300;
        dummy.spawnPoint = 100;
      } else if (dummy.type === "circle_shooter") {
        dummy.y = -60;
        dummy.vy = 150;
        dummy.vx = 40;
      } else if (dummy.type === "column_shooter") {
        dummy.y = -60;
        dummy.vy = 400;
        dummy.spawnPoint = 120;
      } else if (dummy.type === "v_360_shooter") {
        dummy.y = -60;
        dummy.vy = 200;
        dummy.spawnPoint = 120;
      } else if (dummy.type === "split_cluster") {
        dummy.y = -60;
        dummy.vy = 180;
        dummy.spawnPoint = 120;
        dummy.vx = 150;
      } else if (dummy.type === "mine_layer") {
        dummy.y = -60;
        dummy.vy = 160;
        dummy.spawnPoint = 110;
        dummy.vx = 120;
      } else if (dummy.type === "boomerang_orbit") {
        dummy.y = -60;
        dummy.vy = 180;
        dummy.spawnPoint = 120;
        dummy.patternTimer = 0;
      } else if (dummy.type === "dash_paint") {
        dummy.y = -60;
        dummy.vy = 180;
        dummy.spawnPoint = 120;
        dummy.vx = 180;
      } else if (dummy.type === "sweeper") {
        dummy.y = -60;
        dummy.vy = 150;
        dummy.vx = 110;
      } else if (dummy.type === "tank") {
        dummy.y = -60;
        dummy.vy = 75;
      } else {
        dummy.y = -60;
        dummy.vy = 120;
        dummy.vx = 0;
      }
    } else {
      dummy.vx = 0;
      dummy.vy = 0;
    }
  }

  engine.enemies = [dummy];
} else {
  const e = activeSandboxEnemy;
  if (bossCombatMode) {
    if (e.type !== "boss") {
      engine.enemies = [];
      return;
    }
    engine.bossActive = true;
    engine.bossEntity = e;
  }
  if (engine.sandboxMode === "single" && !engine.sandboxMovementEnabled) {
    if (
      e.type !== "boss" &&
      e.type !== "satellite_shield" &&
      e.type !== "boomerang_orbit" &&
      e.type !== "circle_shooter" &&
      e.type !== "split_cluster" &&
      e.type !== "mine_layer" &&
      e.type !== "dash_paint" &&
      e.type !== "assault_commander"
    ) {
      e.x = engine.canvas.width / 2 - e.width / 2;
      e.y = 120;
      e.vx = 0;
      e.vy = 0;
    }
  }
}

if (engine.sandboxInvincibility && engine.player) {
  engine.player.hp = PLAYER_MAX_HP;
  engine.player.invulnTimer = 2.0;
  engine.player.isDead = false;
}
}
