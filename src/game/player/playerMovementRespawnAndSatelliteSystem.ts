/**
 * 플레이어 이동·부활·위성 보조 사격 시스템
 *
 * 이 파일은 플레이어의 캔버스 위치 보정, 입력 기반 이동, 사망 후 부활 처리,
 * 무적 시간 감소, 기본 발사 입력 처리, 위성 보조 사격 주기를 담당한다.
 * 플레이어 조작감, 부활 위치, 무적 시간, 위성 회전·발사 주기를 수정할 때 이 파일을 수정한다.
 *
 * 호반우 전공 계열 무기 리듬:
 * - 이과/공대: 1.0초 집중 연사 후 0.2초 쉬는 리듬
 * - 문과: 이과보다 느리고 예체능보다 빠른 중간 발사 주기
 * - 예체능: 레벨과 상관없이 고정된 느린 발사 주기
 */

import { Bullet } from "../entities";
import { sfx } from "../AudioSystem";
import { CHAPTER1_STORY_PLAYER_MOVE_SPEED } from "../chapter1/chapter1WaveVisualTuning";

const PLAYER_MAX_HP = 3;
const DEFAULT_PLAYER_MOVE_SPEED = 415;

// 기존 기본 발사 주기. Vanguard 또는 스타일 정보가 없을 때만 fallback으로 사용한다.
const DEFAULT_PLAYER_FIRE_INTERVAL = 0.075;

type PlayerRuntime = any;

function getHobanuPlayerFireInterval(engine: PlayerRuntime): number {
  const level = Math.max(1, Math.min(5, engine.player?.powerLevel ?? 1));
  const style = engine.player?.weaponStyle ?? "science";

  if (engine.player?.color === "vanguard") {
    return DEFAULT_PLAYER_FIRE_INTERVAL;
  }

  if (style === "science") {
    // demo v26: interval = Math.max(34, 58 - level * 4) ms
    return Math.max(34, 58 - level * 4) / 1000;
  }

  if (style === "humanities") {
    // demo v26: interval = Math.max(80, 130 - level * 10) ms
    return Math.max(80, 130 - level * 10) / 1000;
  }

  if (style === "arts") {
    // demo v26: interval = 185 ms
    return 0.185;
  }

  return DEFAULT_PLAYER_FIRE_INTERVAL;
}

function canHobanuPlayerShootNow(engine: PlayerRuntime): boolean {
  const style = engine.player?.weaponStyle ?? "science";

  if (engine.player?.color === "vanguard") {
    return true;
  }

  if (style === "science") {
    // demo v26: canShoot = (now % 1200) < 1000
    // 1.0초 연사 + 0.2초 휴식
    return (performance.now() % 1200) < 1000;
  }

  return true;
}

/**
 * 현재 입력 상태와 플레이어 생존 상태를 기준으로 위치, 부활, 발사 입력, 위성 보조탄을 갱신한다.
 * 이 함수는 플레이어 객체와 탄환 배열, 폭탄 입력 상태를 직접 갱신한다.
 */
export function updatePlayerMovementRespawnAndSatelliteSystem(engine: PlayerRuntime, dt: number) {
  engine.playerDamageFlashTimer = Math.max(0, (engine.playerDamageFlashTimer || 0) - dt);

  if (engine.canvas.width > 100 && engine.canvas.height > 100) {
    const isDefaultCanvas = engine.canvas.width === 300 && engine.canvas.height === 150;

    if (engine.needInitialPosition || isDefaultCanvas) {
      engine.player.x = engine.canvas.width / 2 - engine.player.width / 2;
      engine.player.y = engine.canvas.height - 100;
      if (!isDefaultCanvas) {
        engine.needInitialPosition = false;
      }
      engine.lastCanvasWidth = engine.canvas.width;
      engine.lastCanvasHeight = engine.canvas.height;
    } else if (engine.canvas.width !== engine.lastCanvasWidth || engine.canvas.height !== engine.lastCanvasHeight) {
      const ratioX = engine.canvas.width / engine.lastCanvasWidth;
      const ratioY = engine.lastCanvasHeight > 0 ? engine.canvas.height / engine.lastCanvasHeight : 1;
      engine.player.x = Math.max(0, Math.min(engine.canvas.width - engine.player.width, engine.player.x * ratioX));
      engine.player.y = Math.max(0, Math.min(engine.canvas.height - engine.player.height, engine.player.y * ratioY));
      engine.lastCanvasWidth = engine.canvas.width;
      engine.lastCanvasHeight = engine.canvas.height;
    }
  }

  if (engine.storyPurificationExitActive) {
    // 정화 이펙트는 React 오버레이 단계에서 끝까지 재생한 뒤 이 상태를 시작한다.
    const holdDuration = 0.0;
    const riseDuration = 1.25;
    engine.storyPurificationExitElapsed += dt;
    engine.input.up = false;
    engine.input.down = false;
    engine.input.left = false;
    engine.input.right = false;
    engine.input.fire = false;
    engine.input.useBomb = false;
    engine.player.invulnTimer = Math.max(engine.player.invulnTimer, 1);

    if (engine.storyPurificationExitElapsed >= holdDuration) {
      const rawProgress = (engine.storyPurificationExitElapsed - holdDuration) / riseDuration;
      const progress = Math.max(0, Math.min(1, rawProgress));
      const eased = progress * progress * (3 - 2 * progress);
      const targetY = -engine.player.height - 90;
      engine.player.y = engine.storyPurificationExitStartY + (targetY - engine.storyPurificationExitStartY) * eased;
      engine.player.tilt *= Math.pow(0.03, dt);
      if (progress >= 1) {
        engine.storyPurificationExitActive = false;
        engine.storyPlayerHidden = true;
      }
    }
    return;
  }

  if (engine.state === "BOSSPHASE2CUTSCENE" || engine.state === "BOSSPHASE3CUTSCENE") {
    engine.player.invulnTimer = 1.0; // Stay completely shielded (can still move and control since we don't return early!)
  }

  if (engine.player.isDead) {
    engine.input.useBomb = false; // Discard queued shift/B triggers during death state!
    engine.player.deadTimer -= dt;
    if (engine.player.deadTimer <= 0) {
      if (engine.player.hp <= 0) {
        if (engine.isSandbox) {
          engine.player.hp = PLAYER_MAX_HP;
        } else {
          engine.state = "GAMEOVER";
          if (engine.onGameOver) engine.onGameOver(engine.score);
          return;
        }
      }
      // Revive respawn right at the bottom center of the play screen
      engine.player.isDead = false;
      engine.player.x = engine.canvas.width / 2 - engine.player.width / 2;
      engine.player.y = engine.canvas.height - 100;
      engine.player.invulnTimer = 3.0; // 3 seconds of invulnerability
      engine.player.bombs = 3;
      engine.player.tilt = 0;
      if (engine.onBombsChanged) engine.onBombsChanged(engine.player.bombs);
    }
    return;
  }

  const speed = engine.playMode === "story"
    ? CHAPTER1_STORY_PLAYER_MOVE_SPEED
    : DEFAULT_PLAYER_MOVE_SPEED;
  if (engine.input.left) engine.player.x -= speed * dt;
  if (engine.input.right) engine.player.x += speed * dt;
  if (engine.input.up) engine.player.y -= speed * dt;
  if (engine.input.down) engine.player.y += speed * dt;

  engine.player.x = Math.max(
    0,
    Math.min(engine.canvas.width - engine.player.width, engine.player.x),
  );
  engine.player.y = Math.max(
    0,
    Math.min(engine.canvas.height - engine.player.height, engine.player.y),
  );

  if (engine.player.invulnTimer > 0) {
    engine.player.invulnTimer -= dt;
  }

  engine.player.lastShot += dt;
  const fireInterval = getHobanuPlayerFireInterval(engine);
  const canShoot = canHobanuPlayerShootNow(engine);
  if (engine.input.fire && canShoot && engine.player.lastShot > fireInterval) {
    engine.player.lastShot = 0;
    engine.firePlayerBullet();
  }

  // Update player guardian satellites
  if (engine.playerSatelliteFlashes) {
    for (let i = 0; i < engine.playerSatelliteFlashes.length; i++) {
      if (engine.playerSatelliteFlashes[i] > 0) {
        engine.playerSatelliteFlashes[i] -= dt;
      }
    }
  }

  if (!engine.player.isDead && engine.player.satelliteCount > 0) {
    engine.playerSatelliteAngle += 3.2 * dt; // rotation rate

    engine.playerSatelliteShotTimer += dt;
    if (engine.playerSatelliteShotTimer > 0.22) { // Slightly faster fire rate (0.22s instead of 0.24s)
      engine.playerSatelliteShotTimer = 0;
      const px = engine.player.x + engine.player.width / 2;
      const py = engine.player.y + engine.player.height / 2;
      for (let i = 0; i < engine.player.satelliteCount; i++) {
        const angle = engine.playerSatelliteAngle + (i / engine.player.satelliteCount) * Math.PI * 2;
        const sx = px + Math.cos(angle) * 44;
        const sy = py + Math.sin(angle) * 44;

        const b = new Bullet();
        b.x = sx - 4;
        b.y = sy - 4;
        b.width = 8;
        b.height = 8;
        b.vx = Math.cos(angle - Math.PI / 2) * 55; // slight outward flare
        b.vy = -620; // fast support projectile
        b.isEnemy = false;
        b.type = "satellite_bullet";
        b.companionIndex = i;

        if (i === 0) {
          b.color = "#34d399"; // bright emerald neon green
          b.damage = 1.3;
        } else if (i === 1) {
          b.color = "#a855f7"; // purple/violet pulsar wave
          b.damage = 1.4;
        } else if (i === 2) {
          b.color = "#22d3ee"; // electric cyan homing spear
          b.damage = 1.1; // slightly lower for homing balance
        } else {
          b.color = "#f97316"; // orange fire solar flare
          b.damage = 1.8; // heavy orange blast!
          b.width = 11;
          b.height = 11;
        }

        engine.bullets.push(b);
      }
      sfx.satelliteShoot(); // Delicate companion laser chirp!
    }
  }

  if (engine.input.useBomb) {
    engine.input.useBomb = false;
    if (!engine.player.isDead) {
      engine.triggerSmartBomb();
    }
  }
}
