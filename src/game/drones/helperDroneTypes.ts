/**
 * 도움 드론 상태 타입
 *
 * 플레이어 주변에서 회전하며 공격, 방어, 호밍, 레이저 행동을 수행하는 도움 드론의 상태 구조를 정의한다.
 * 드론 종류나 드론별 누적 타이머 필드를 추가할 때 이 파일을 수정한다.
 */

export type HelperDroneType = "attack" | "homing" | "defense" | "orbit" | "laser";

export interface HelperDroneState {
  type: HelperDroneType;
  angleOffset: number;
  lastShot: number;
  laserChargeCount: number;
}
