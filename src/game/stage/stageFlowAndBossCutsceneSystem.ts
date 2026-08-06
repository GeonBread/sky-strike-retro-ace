/**
 * 스테이지 흐름·보스 컷신 시스템
 *
 * 이 파일은 게임 상태별 업데이트 분기, 보스 등장/전환 컷신, 보스 클리어 연출 이후 진행 흐름을 담당한다.
 * 스테이지 진행 순서, 컷신 시간, 보스 페이즈 전환 연출, 샌드박스/일반 모드 업데이트 분기를 수정할 때 이 파일을 수정한다.
 */

import { Particle } from "../entities";
import { updateChapter1WaveEnemiesSystem } from "../chapter1/chapter1WaveSystem";

type StageFlowRuntime = any;

/**
 * 현재 게임 상태를 기준으로 한 프레임의 스테이지 흐름을 갱신한다.
 * 컷신, 보스 클리어 상태, 일반 플레이 상태, 샌드박스 상태에 맞춰 필요한 시스템 호출 순서를 결정한다.
 */
export function updateStageFlowAndBossCutsceneSystem(engine: StageFlowRuntime, dt: number) {
if (engine.state === "GAMEOVER" || engine.state === "VICTORY") return;

if (engine.stage === 1 && engine.chapter1Boss?.active) {
  if (engine.screenShakeIntensity > 0.1) {
    engine.screenShakeIntensity *= Math.pow(0.08, dt);
  } else {
    engine.screenShakeIntensity = 0;
  }
  engine.updatePlayer(dt);
  engine.updatePlayerPositionHistory(dt);
  updateChapter1WaveEnemiesSystem(engine, dt);
  engine.updateBullets(dt);
  engine.updateParticles(dt);
  engine.updatePowerUps(dt);
  engine.updateBomb(dt);
  engine.updateDronesAndBehaviors(dt);
  engine.updateChapter1Boss(dt);
  engine.checkCollisions();
  return;
}

if (engine.state === "STAGE_CLEAR_CHOICE") {
  engine.updateParticles(dt);
  return;
}

if (engine.state === "BOSS_CLEAR_EXPLOSION") {
  engine.updatePlayer(dt);
  engine.updatePlayerPositionHistory(dt);
  engine.updateBullets(dt);
  engine.updateDronesAndBehaviors(dt);
  engine.updateBossClearExplosion(dt);
  return;
}

if (engine.state === "BOSS_CLEAR_MESSAGE") {
  engine.updatePlayer(dt);
  engine.updatePlayerPositionHistory(dt);
  engine.updateBullets(dt);
  engine.updateDronesAndBehaviors(dt);
  engine.updateParticles(dt);
  engine.bossClearTimer -= dt;
  if (engine.bossClearTimer <= 0) {
    engine.finishBossClearSequence();
  }
  return;
}

if (engine.screenShakeIntensity > 0.1) {
  engine.screenShakeIntensity *= Math.pow(0.08, dt);
} else {
  engine.screenShakeIntensity = 0;
}

if (engine.state === "BOSSPHASE2CUTSCENE") {
  engine.cutsceneTimer -= dt;
  engine.screenShakeIntensity = 12; // Massive constant earthquake rumble!

  if (engine.bossEntity) {
    // Glide the boss back to the center top
    const bossTargetX = engine.canvas.width / 2 - engine.bossEntity.width / 2;
    const bossTargetY = 80;
    engine.bossEntity.x += (bossTargetX - engine.bossEntity.x) * 4 * dt;
    engine.bossEntity.y += (bossTargetY - engine.bossEntity.y) * 4 * dt;

    // Charging HP bar from 0 to the phase 2 max HP.
    const progress = Math.min(1.0, (3.5 - engine.cutsceneTimer) / 3.5);
    engine.bossEntity.hp = Math.floor(progress * engine.getBossMaxHp(2));

    // Cyber overdrive laser sparks
    if (Math.random() < 0.65) {
      const p = new Particle();
      p.x = engine.bossEntity.x + Math.random() * engine.bossEntity.width;
      p.y = engine.bossEntity.y + Math.random() * engine.bossEntity.height;
      p.vx = (Math.random() - 0.5) * 480;
      p.vy = (Math.random() - 0.5) * 480;
      p.color = Math.random() < 0.55 ? "#f43f5e" : "#c084fc";
      p.life = p.maxLife = 0.5 + Math.random() * 0.6;
      p.size = Math.random() * 8 + 3;
      engine.particles.push(p);
    }
  }

  if (engine.cutsceneTimer <= 0) {
    engine.state = "PLAYING";
    engine.bossPhase2Active = true;
    engine.screenShakeIntensity = 0;

    if (engine.bossEntity) {
      engine.bossEntity.hp = engine.getBossMaxHp(2);
      engine.bossEntity.phase = 14;
      engine.bossEntity.patternTimer = 0;
      engine.bossEntity.phaseDuration = 7.5;
      engine.bossEntity.rapidFireCount = 0;

      // Re-arm turrets under 70 HP overdrive!
      engine.bossEntity.leftTurretActive = true;
      engine.bossEntity.rightTurretActive = true;
      engine.bossEntity.leftTurretHp = 70;
      engine.bossEntity.rightTurretHp = 70;
    }
  }

  engine.updatePlayer(dt);
  engine.updateBullets(dt);
  engine.updateEnemies(dt);
  engine.updateParticles(dt);
  engine.updateBomb(dt);
  engine.updateInkClouds(dt);
  return;
}

if (engine.state === "BOSSPHASE3CUTSCENE") {
  engine.cutsceneTimer -= dt;
  engine.screenShakeIntensity = 18; // More epic violent earthquake shake!

  if (engine.bossEntity) {
    // Smoothly expand dimensions during charging!
    const progress = Math.min(1.0, (3.5 - engine.cutsceneTimer) / 3.5);
    engine.bossEntity.width = 120 + progress * 80;   // Grows up to 200
    engine.bossEntity.height = 90 + progress * 60;  // Grows up to 150

    // Glide the boss back to the center top
    const bossTargetX = engine.canvas.width / 2 - engine.bossEntity.width / 2;
    const bossTargetY = 50; // slightly higher since it's larger
    engine.bossEntity.x += (bossTargetX - engine.bossEntity.x) * 4 * dt;
    engine.bossEntity.y += (bossTargetY - engine.bossEntity.y) * 4 * dt;

    // Charging HP bar from 0 to the phase 3 max HP.
    engine.bossEntity.hp = Math.floor(progress * engine.getBossMaxHp(3));

    // Cyber overdrive laser sparks of final grand form
    if (Math.random() < 0.85) {
      const p = new Particle();
      p.x = engine.bossEntity.x + Math.random() * engine.bossEntity.width;
      p.y = engine.bossEntity.y + Math.random() * engine.bossEntity.height;
      p.vx = (Math.random() - 0.5) * 600;
      p.vy = (Math.random() - 0.5) * 600;
      p.color = Math.random() < 0.4 ? "#fbbf24" : (Math.random() < 0.75 ? "#c084fc" : "#0ea5e9");
      p.life = p.maxLife = 0.5 + Math.random() * 0.8;
      p.size = Math.random() * 12 + 4;
      engine.particles.push(p);
    }
  }

  if (engine.cutsceneTimer <= 0) {
    engine.state = "PLAYING";
    engine.bossPhase3Active = true;
    engine.bossPhase2Active = false; // Turn off phase 2
    engine.screenShakeIntensity = 0;

    if (engine.bossEntity) {
      engine.bossEntity.hp = engine.getBossMaxHp(3);
      engine.bossEntity.width = 200;
      engine.bossEntity.height = 150;
      engine.assignBossPhase(engine.bossEntity, 20);
      engine.bossEntity.patternTimer = 0;
      engine.bossEntity.rapidFireCount = 0;

      // Re-arm turrets under 150 HP overkill stats!
      engine.bossEntity.leftTurretActive = true;
      engine.bossEntity.rightTurretActive = true;
      engine.bossEntity.leftTurretHp = 150;
      engine.bossEntity.rightTurretHp = 150;
    }
  }

  engine.updatePlayer(dt);
  engine.updateBullets(dt);
  engine.updateEnemies(dt);
  engine.updateParticles(dt);
  engine.updateBomb(dt);
  engine.updateInkClouds(dt);
  return;
}

if (engine.state === "BOSSCUTSCENE") {
  engine.cutsceneTimer -= dt;
  if (engine.bossEntity) {
    engine.bossEntity.y += 40 * dt;
    if (engine.bossEntity.y > 80) engine.bossEntity.y = 80;
  }
  if (engine.cutsceneTimer <= 0) {
    engine.state = "PLAYING";
    if (engine.bossEntity) {
      engine.resetBossPattern(engine.bossEntity);
      engine.assignNextBossPhase(engine.bossEntity);
    }
    if (engine.onCutsceneChange) engine.onCutsceneChange(false);
  }

  engine.updatePlayer(dt);
  engine.updateBullets(dt);
  engine.updateEnemies(dt);
  engine.updateParticles(dt);
  engine.updatePowerUps(dt);
  engine.updateBomb(dt);
  engine.updateInkClouds(dt);
  engine.checkCollisions();
  return;
}

engine.updatePlayer(dt);
engine.updatePlayerPositionHistory(dt);
engine.updateBullets(dt);
engine.updateEnemies(dt);
engine.updateParticles(dt);
engine.updatePowerUps(dt);
engine.updateBomb(dt);
engine.updateInkClouds(dt);
engine.updateDebrisAndMeteors(dt);
engine.updateDronesAndBehaviors(dt);
engine.updateBossPatternHazards(dt);
engine.checkCollisions();

if (engine.isStoryMode() && !engine.bossActive && !engine.clearingForBoss) {
  engine.storyStageTimer += dt;
}

if (engine.isSandbox) {
  engine.runSandboxMechanics(dt);
} else {
  engine.spawnEntities(dt);
  engine.tuneStoryEnemies();
}
}
