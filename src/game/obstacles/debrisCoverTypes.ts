/**
 * 엄폐 잔해 상태 타입
 *
 * 적탄을 막거나 전투 공간의 장애물 역할을 하는 엄폐 잔해의 상태 구조를 정의한다.
 * 잔해 체력, 크기, 충돌 판정에 필요한 필드를 변경할 때 이 파일을 수정한다.
 */

export interface DebrisCoverState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  active: boolean;
}
