/**
 * 스토리 모드 일반 몬스터 난이도 보정 시스템
 *
 * 스토리 모드에서 일반 몬스터의 타입, 체력, 이동 속도, 첫 공격 타이밍을 부드럽게 조정한다.
 * 챕터 진행 난이도, 초반 적 구성, 스토리 모드 전용 적 공격 빈도를 조정할 때 이 파일을 수정한다.
 */

import type { EnemyType } from "../entities";

type StoryEnemyDifficultyRuntime = any;

/**
 * 스토리 모드에서 아직 보정되지 않은 일반 몬스터만 한 번씩 약화한다.
 * 보스는 제외하며, 강한 타입은 가벼운 타입으로 일부 치환한 뒤 체력과 이동 속도를 낮춘다.
 */
export function tuneStoryEnemyDifficultySystem(engine: StoryEnemyDifficultyRuntime, isStoryMode: boolean) {
  if (!isStoryMode) return;

  engine.enemies.forEach((e: any) => {
    if (!e.active || e.type === "boss" || engine.storyAdjustedEnemies.has(e)) return;
    engine.storyAdjustedEnemies.add(e);

    const lightTypes: EnemyType[] = ["basic", "sweeper", "aimed", "column_shooter", "tank"];
    if (!lightTypes.includes(e.type)) {
      e.type = Math.random() < 0.72 ? "aimed" : "column_shooter";
    }

    e.hp = Math.max(1, Math.ceil(e.hp * 0.58));
    e.vx *= 0.68;
    e.vy *= 0.68;
    e.lastShot = Math.min(e.lastShot, -0.6);
    e.shootTimer = 0;
    if (e.spawnPoint > 0) e.spawnPoint += 18;
  });
}
