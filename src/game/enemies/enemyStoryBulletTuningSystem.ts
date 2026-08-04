/**
 * 스토리 모드 적탄 난이도 보정 시스템
 *
 * 이 파일은 스토리 모드에서 일반 몬스터와 보스가 발사한 적탄의 속도, 데미지,
 * 화면 내 최대 탄 수를 보정하는 역할을 담당한다. 스토리 모드 탄막 난이도를 조정할 때 이 파일을 수정한다.
 */

type EnemyBulletTuningRuntime = any;

/**
 * 현재 활성 적탄을 스토리 모드 기준으로 보정하고, 화면에 남아 있는 적탄 수가 상한을 넘지 않도록 정리한다.
 * 보정 여부는 탄환별 기록 집합에 저장되어 같은 탄환이 중복 보정되지 않는다.
 */
export function tuneStoryEnemyBulletsSystem(engine: EnemyBulletTuningRuntime) {
  if (!engine.isStoryMode()) return;

  engine.bullets.forEach((b) => {
    if (!b.active || !b.isEnemy || b.chapter1 || engine.storyAdjustedBullets.has(b)) return;
    engine.storyAdjustedBullets.add(b);
    engine.storyBulletSerial++;

    const preserveBullet = b.type === "gravity_ball" || b.type === "gravity_singularity" || b.type === "void_mine";
    if (!preserveBullet && engine.storyBulletSerial % 5 < 2) {
      b.active = false;
      return;
    }

    const velocityScale = engine.bossActive ? 0.52 : 0.6;
    b.vx *= velocityScale;
    b.vy *= velocityScale;
    if (b.targetSpeed !== undefined) b.targetSpeed *= velocityScale;
    if (b.turnRate !== undefined) b.turnRate *= 0.65;
    b.width = Math.max(6, b.width * 0.86);
    b.height = Math.max(6, b.height * 0.86);
  });

  const enemyBullets = engine.bullets.filter((b) => b.active && b.isEnemy);
  const cap = engine.bossActive ? 64 : 36;
  if (enemyBullets.length > cap) {
    let excess = enemyBullets.length - cap;
    for (const b of enemyBullets) {
      if (excess <= 0) break;
      if (b.type === "gravity_ball" || b.type === "gravity_singularity" || b.type === "void_mine") continue;
      b.active = false;
      excess--;
    }
  }
}
