/**
 * 플레이어 피격·사망 처리 시스템
 *
 * 이 파일은 플레이어가 적탄이나 적 본체에 맞았을 때 체력 감소, 붉은 화면 피드백,
 * 무적 시간과 최종 게임오버 대기 상태를 처리한다. 피격 시 폭발·강제 재배치 없이
 * 현재 위치와 조작 흐름을 유지해야 할 때 이 파일을 수정한다.
 */

import { sfx } from "../AudioSystem";

type PlayerDamageRuntime = any;

/**
 * 플레이어에게 피해 1을 적용한다.
 * 체력이 남아 있으면 현재 위치를 유지한 채 잠시 무적 상태가 되며,
 * 체력이 0이면 짧은 붉은 화면 연출 뒤 게임오버 처리가 진행되도록 사망 상태를 설정한다.
 */
export function triggerPlayerDamageAndRespawnSystem(engine: PlayerDamageRuntime) {
  if (!engine.player || engine.player.isDead || engine.player.invulnTimer > 0) return;

  engine.player.hp = Math.max(0, engine.player.hp - 1);
  sfx.hit();

  // 폭발 대신 화면 전체가 잠시 붉어졌다가 서서히 돌아오는 피격 피드백을 사용한다.
  engine.playerDamageFlashTimer = 0.85;
  engine.screenShakeIntensity = Math.max(engine.screenShakeIntensity || 0, 3.5);

  if (engine.player.powerLevel > 1) engine.player.powerLevel--;

  if (engine.player.hp > 0) {
    // 피격 후에도 현재 위치와 캐릭터를 유지하고 약 3초간 무적 상태로 둔다.
    engine.player.isDead = false;
    engine.player.invulnTimer = Math.max(engine.player.invulnTimer, 2.8);
    return;
  }

  // 마지막 체력이 소진된 경우에도 폭발 파티클이나 좌측 상단 강제 이동은 사용하지 않는다.
  // 적 공격 시스템은 isDead를 확인해 이 시간 동안 새 공격을 생성하지 않는다.
  engine.player.isDead = true;
  engine.player.deadTimer = 1.1;
  engine.player.invulnTimer = 999;
  engine.input.up = false;
  engine.input.down = false;
  engine.input.left = false;
  engine.input.right = false;
  engine.input.fire = false;
  engine.input.useBomb = false;
}
