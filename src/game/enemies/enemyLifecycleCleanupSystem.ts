/**
 * 일반 몬스터 비활성화·부속 오브젝트 정리 시스템
 *
 * 이 파일은 몬스터가 제거될 때 해당 몬스터가 보유한 위성, 보호막, 부속 탄환을 함께 정리하는 역할을 담당한다.
 * 몬스터 사망 후 남아 있으면 안 되는 부속 오브젝트 정리 규칙을 수정할 때 이 파일을 수정한다.
 */

import { Enemy } from "../entities";

type EnemyLifecycleRuntime = any;

/**
 * 지정한 몬스터를 비활성화하고, 위성형 몬스터가 보유한 부속 탄환들도 함께 비활성화한다.
 * 이 함수는 몬스터 배열에서 즉시 제거하지 않고 active 상태와 부속 목록만 정리한다.
 */
export function deactivateEnemyAndAttachmentsSystem(engine: EnemyLifecycleRuntime, e: Enemy) {
  e.active = false;
  if (e.type === "satellite_shield" || (e.type as any) === "mini_shield_commander") {
    e.satellites.forEach((b) => {
      b.active = false;
    });
    e.satellites = [];
  }
  if (e.type === "boss") {
    // Bullet cancel on boss defeat to clear visual clutter and reward the player!
    engine.bullets.forEach((b) => {
      if (b.isEnemy) {
        b.active = false;
      }
    });
  }
}
