/**
 * 운석 장애물 상태 타입
 *
 * 화면 위에서 낙하하는 운석 장애물의 위치, 속도, 회전, 체력 상태를 정의한다.
 * 운석 이동, 충돌, 렌더링에 필요한 상태 필드를 변경할 때 이 파일을 수정한다.
 */

export interface MeteorObstacleState {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  hp: number;
  rotation: number;
  rotSpeed: number;
  active: boolean;
}
