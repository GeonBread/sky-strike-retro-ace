/**
 * 호반우 적탄의 시각 크기와 충돌 반경 카탈로그입니다.
 *
 * 발사 개수, 속도, 궤도, 유도, 분열 및 수명은 변경하지 않습니다.
 * hitRadius는 원본 미리보기 코드의 `r * 0.62 * 0.9` 기준을 유지합니다.
 */

import { Bullet, type BulletVisualType } from "../entities";

export type HobanwooEnemyBulletVisualType = Extract<
  BulletVisualType,
  | "corrupt_orb"
  | "attendance_stamp"
  | "notice_popup"
  | "guide_arrow"
  | "deadline_missile"
  | "scanner_beam"
  | "unsubmitted_missile"
  | "f_bomb"
  | "f_fragment"
  | "atom"
  | "flask"
>;

type HobanwooEnemyBulletVisualMetric = {
  visualRadius: number;
  hitRadius: number;
};

const SIZE_SCALE = 0.9;
const HITBOX_SCALE = 0.62;

function metric(visualRadius: number): HobanwooEnemyBulletVisualMetric {
  return {
    visualRadius,
    hitRadius: visualRadius * SIZE_SCALE * HITBOX_SCALE,
  };
}

export const HOBANWOO_ENEMY_BULLET_VISUAL_METRICS: Record<
  HobanwooEnemyBulletVisualType,
  HobanwooEnemyBulletVisualMetric
> = {
  corrupt_orb: metric(10),
  attendance_stamp: metric(18),
  notice_popup: metric(17),
  guide_arrow: metric(19),
  deadline_missile: metric(21),
  scanner_beam: metric(18),
  unsubmitted_missile: metric(20),
  f_bomb: metric(24),
  f_fragment: metric(13),
  atom: metric(18),
  flask: metric(18),
};

export function isHobanwooEnemyBulletVisualType(
  visualType: BulletVisualType | undefined,
): visualType is HobanwooEnemyBulletVisualType {
  return !!visualType && visualType in HOBANWOO_ENEMY_BULLET_VISUAL_METRICS;
}

export function applyHobanwooEnemyBulletVisualSystem(
  bullet: Bullet,
  visualType: HobanwooEnemyBulletVisualType,
): void {
  bullet.visualType = visualType;
  bullet.enemyVisualPhase ??= Math.random() * Math.PI * 2;
}

export function getHobanwooEnemyBulletVisualRadiusSystem(
  visualType: BulletVisualType | undefined,
): number | null {
  if (!isHobanwooEnemyBulletVisualType(visualType)) return null;
  return HOBANWOO_ENEMY_BULLET_VISUAL_METRICS[visualType].visualRadius;
}

export function getHobanwooEnemyBulletHitRadiusSystem(
  visualType: BulletVisualType | undefined,
): number | null {
  if (!isHobanwooEnemyBulletVisualType(visualType)) return null;
  return HOBANWOO_ENEMY_BULLET_VISUAL_METRICS[visualType].hitRadius;
}
