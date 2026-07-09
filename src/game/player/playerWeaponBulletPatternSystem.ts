/**
 * 플레이어 무기 탄환 패턴 시스템
 *
 * 이 파일은 플레이어 기본 무기와 Vanguard 전용 무기의 탄환 생성 규칙을 담당한다.
 * 무기 레벨별 탄환 개수, 속도, 크기, 색상, 데미지를 수정할 때 이 파일을 수정한다.
 */

import { Bullet } from "../entities";
import { sfx } from "../AudioSystem";

const PLAYER_BULLET_SPEED_MULT = 1.16;

type PlayerWeaponRuntime = any;

/**
 * 현재 플레이어의 무기 레벨과 기체 색상을 기준으로 한 번의 발사에서 필요한 탄환을 생성한다.
 * 생성된 탄환은 게임 실행 상태의 탄환 배열에 바로 추가된다.
 */
export function firePlayerWeaponBulletPatternSystem(engine: PlayerWeaponRuntime) {
  sfx.shoot();
  const bx = engine.player.x + engine.player.width / 2;
  const by = engine.player.y;
  const level = Math.min(5, engine.player.powerLevel);

  if (engine.player.color === "vanguard") {
    // Vanguard specialized weapons (Supercharged particle tracers with neon shadow outlines)
    if (level === 1) {
      // High-frequency single quantum driver (3.0 DMG, ultra-fast)
      engine.addPlayerBlt(bx - 6, by - 4, 12, 28, 0, -1200, "#c084fc", 3.0);
    } else if (level === 2) {
      // Dual violet cosmic tracers (2.5 DMG each)
      engine.addPlayerBlt(bx - 12, by - 4, 10, 26, 0, -1250, "#d946ef", 2.5);
      engine.addPlayerBlt(bx + 2, by - 4, 10, 26, 0, -1250, "#d946ef", 2.5);
    } else if (level === 3) {
      // Triple neutron pulsars with center heavy white core (3.5 DMG on center!) - Focused spread
      engine.addPlayerBlt(bx - 10, by - 4, 8, 24, -30, -1200, "#a855f7", 2.2);
      engine.addPlayerBlt(bx - 5, by - 10, 10, 32, 0, -1350, "#ffffff", 3.5);
      engine.addPlayerBlt(bx + 2, by - 4, 8, 24, 30, -1200, "#a855f7", 2.2);
    } else if (level === 4) {
      // Quad quantum lasers & dual seeker flaring orbs (2.5 - 3.2 DMG) - Focused spread
      engine.addPlayerBlt(bx - 13, by, 8, 22, -45, -1150, "#22d3ee", 2.5);
      engine.addPlayerBlt(bx - 8, by - 8, 10, 30, 0, -1350, "#e879f9", 3.2);
      engine.addPlayerBlt(bx - 2, by - 8, 10, 30, 0, -1350, "#ffffff", 3.2);
      engine.addPlayerBlt(bx + 5, by, 8, 22, 45, -1150, "#22d3ee", 2.5);
    } else if (level === 5) {
      // Vanguard Absolute Decimator: white absolute singularity core + dual sweeping side streams - Focused vertical pillar
      engine.addPlayerBlt(bx - 12, by - 22, 24, 48, 0, -1550, "#ffffff", 6.0); // Devastating white-pulsing main beam
      engine.addPlayerBlt(bx - 18, by - 4, 12, 32, -60, -1350, "#a855f7", 3.3); // Heavy violet energy waves
      engine.addPlayerBlt(bx + 6, by - 4, 12, 32, 60, -1350, "#a855f7", 3.3);
      engine.addPlayerBlt(bx - 24, by + 6, 8, 26, -100, -1250, "#06b6d4", 2.8); // Side cyan tracer wings
      engine.addPlayerBlt(bx + 16, by + 6, 8, 26, 100, -1250, "#06b6d4", 2.8);
    }
    return;
  }

  if (level === 1) {
    engine.addPlayerBlt(bx - 3, by, 6, 16, 0, -800, "#38bdf8");
  } else if (level === 2) {
    engine.addPlayerBlt(bx - 8, by, 8, 18, 0, -850, "#22d3ee");
    engine.addPlayerBlt(bx, by, 8, 18, 0, -850, "#22d3ee");
  } else if (level === 3) {
    engine.addPlayerBlt(bx - 8, by, 8, 18, 0, -850, "#22d3ee");
    engine.addPlayerBlt(bx, by, 8, 18, 0, -850, "#22d3ee");
    engine.addPlayerBlt(bx - 14, by + 4, 6, 16, -20, -800, "#c084fc");
    engine.addPlayerBlt(bx + 8, by + 4, 6, 16, 20, -800, "#c084fc");
  } else if (level === 4) {
    engine.addPlayerBlt(bx - 12, by, 6, 20, 0, -900, "#ec4899");
    engine.addPlayerBlt(bx - 4, by - 4, 6, 20, 0, -900, "#ec4899");
    engine.addPlayerBlt(bx + 4, by - 4, 6, 20, 0, -900, "#ec4899");
    engine.addPlayerBlt(bx + 12, by, 6, 20, 0, -900, "#ec4899");
    engine.addPlayerBlt(bx - 16, by + 8, 6, 16, -30, -850, "#facc15");
    engine.addPlayerBlt(bx + 10, by + 8, 6, 16, 30, -850, "#facc15");
  } else if (level === 5) {
    engine.addPlayerBlt(bx - 6, by - 12, 12, 30, 0, -1000, "#4ade80", 2);
    engine.addPlayerBlt(bx - 16, by, 8, 24, 0, -950, "#2dd4bf", 1.5);
    engine.addPlayerBlt(bx + 8, by, 8, 24, 0, -950, "#2dd4bf", 1.5);
    engine.addPlayerBlt(bx - 22, by + 12, 6, 20, -15, -900, "#f472b6", 1);
    engine.addPlayerBlt(bx + 16, by + 12, 6, 20, 15, -900, "#f472b6", 1);
  }
}

/**
 * 지정된 위치, 크기, 속도, 색상, 데미지를 가진 플레이어 탄환 하나를 생성해 탄환 배열에 추가한다.
 * 기본 무기뿐 아니라 보조 드론처럼 플레이어 탄환을 직접 생성해야 하는 기능에서도 사용한다.
 */
export function addPlayerBulletEntitySystem(
  engine: PlayerWeaponRuntime,
  x: number,
  y: number,
  w: number,
  h: number,
  vx: number,
  vy: number,
  c: string,
  dmg: number = 1.0,
) {
  const b = new Bullet();
  b.x = x;
  b.y = y;
  b.width = w;
  b.height = h;
  b.vx = vx * PLAYER_BULLET_SPEED_MULT;
  b.vy = vy * PLAYER_BULLET_SPEED_MULT;
  b.color = c;
  b.damage = dmg;
  engine.bullets.push(b);
}
