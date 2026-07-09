/**
 * 파워업 이동 시스템
 *
 * 이 파일은 화면에 떨어진 파워업 아이템의 이동과 화면 밖 제거를 담당한다.
 * 파워업 낙하 속도, 제거 조건, 이동 규칙을 수정할 때 이 파일을 수정한다.
 */

type PowerUpMovementRuntime = any;

/**
 * 활성 파워업을 아래로 이동시키고 화면 밖으로 벗어난 파워업을 비활성화한 뒤 제거한다.
 * 아이템 획득 효과는 충돌·아이템 획득 시스템에서 처리한다.
 */
export function updatePowerUpMovementSystem(engine: PowerUpMovementRuntime, dt: number) {
engine.powerups.forEach((p) => {
  p.y += p.vy * dt;
  if (p.y > engine.canvas.height + 20) p.active = false;
});
engine.powerups = engine.powerups.filter((p) => p.active);
}
