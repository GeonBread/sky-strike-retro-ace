export type DroneType = "attack" | "homing" | "defense" | "orbit" | "laser";

export interface RewardDrone {
  type: DroneType;
  angleOffset: number;
  lastShot: number;
  laserChargeCount: number;
}

export interface StageRewardTarget {
  drones: RewardDrone[];
  player: {
    bombs: number;
    hp: number;
  };
  score: number;
  onBombsChanged?: (bombs: number) => void;
  onScoreUpdate?: (score: number) => void;
}

export const STAGE_REWARD_CHOICES = [
  "공격 드론",
  "유도탄 드론",
  "방어 드론",
  "회전 위성",
  "레이저 빔",
  "기체 수리",
];

export function getStageClearChoices(): string[] {
  const shuffled = [...STAGE_REWARD_CHOICES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

export function applyStageClearReward(target: StageRewardTarget, choice: string) {
  if (choice.includes("공격")) {
    addDrone(target, "attack");
  } else if (choice.includes("유도탄")) {
    addDrone(target, "homing");
  } else if (choice.includes("방어")) {
    addDrone(target, "defense");
  } else if (choice.includes("회전")) {
    addDrone(target, "orbit");
  } else if (choice.includes("레이저")) {
    addDrone(target, "laser");
  } else if (choice.includes("수리")) {
    target.player.hp = Math.min(3, target.player.hp + 1);
  }

  target.score += 2000;
  target.onScoreUpdate?.(target.score);
}

function addDrone(target: StageRewardTarget, type: DroneType) {
  target.drones.push({
    type,
    angleOffset: target.drones.length * (Math.PI / 2),
    lastShot: 0,
    laserChargeCount: 0,
  });
}
