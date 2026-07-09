/**
 * 보스 페이즈 선택 시스템
 *
 * 이 파일은 engine.ts에 있던 보스 HP 산정, 페이즈 후보 선택, 페이즈 지속 시간, 페이즈 할당 로직을 분리한 파일이다.
 * 보스 단계별 체력, 일반/오버드라이브/최종장 페이즈 순서, 스토리 모드 보스 페이즈 제한을 수정할 때 이 파일을 수정한다.
 * 실제 탄막 생성이나 해저드 렌더링은 담당하지 않으며, 해당 구현은 보스 패턴/해저드 파일에서 처리한다.
 */

import { Enemy } from "../entities";
import { sfx } from "../AudioSystem";
import { NORMAL_BOSS_PHASES, OVERDRIVE_BOSS_PHASES } from "../data/bossPhaseCatalog";

type BossPhaseRuntime = any;

const NORMAL_BOSS_PHASE_IDS = NORMAL_BOSS_PHASES.map((phase) => phase.id);
const OVERDRIVE_BOSS_PHASE_IDS = OVERDRIVE_BOSS_PHASES.map((phase) => phase.id);
const FINAL_BOSS_PHASE_SEQUENCE = [20, 21, 23, 24, 28, 47, 49, 32, 51, 52];
const CHAPTER4_BOSS_PHASE_SEQUENCE = [20, 21, 23, 24, 28, 42, 46, 47, 49, 32, 51, 52];
const STORY_BOSS_PHASE_IDS = [1, 3, 5, 7];

/**
 * 아케이드 보스 단계 번호를 기준으로 보스 최대 체력을 반환한다.
 * 샌드박스 보스 생성처럼 엔진 상태와 무관하게 티어 체력만 필요할 때 사용한다.
 */
export function getBossMaxHpForTier(tier: number): number {
  return tier >= 4 ? 12000 : tier >= 3 ? 9000 : tier === 2 ? 6000 : 4000;
}

/**
 * 스토리 모드 보스 단계 번호를 기준으로 보스 최대 체력을 반환한다.
 * 스토리 모드의 짧은 챕터 전투 난이도를 조정할 때 이 값을 수정한다.
 */
export function getStoryBossMaxHpForTier(tier: number): number {
  return tier >= 4 ? 4200 : tier >= 3 ? 3200 : tier === 2 ? 2400 : 1500;
}

/**
 * 현재 엔진의 플레이 모드와 보스 티어를 기준으로 실제 적용할 보스 최대 체력을 계산한다.
 * 스토리 모드에서는 낮은 체력 테이블을, 일반/샌드박스 전투에서는 아케이드 체력 테이블을 사용한다.
 */
export function getBossMaxHp(engine: BossPhaseRuntime, tier: number): number {
  return engine.playMode === "story" ? getStoryBossMaxHpForTier(tier) : getBossMaxHpForTier(tier);
}

/**
 * 스토리 모드에서 현재 스테이지의 보스가 등장하기까지 기다릴 시간을 계산한다.
 * 챕터별 일반 몬스터 진행 시간을 조정할 때 이 값을 수정한다.
 */
export function getStoryBossDelay(engine: BossPhaseRuntime): number {
  return 24 + Math.min(3, engine.stage - 1) * 4;
}

/**
 * 직전 페이즈와 겹치지 않도록 스토리 모드 보스 페이즈 후보 중 하나를 선택한다.
 * 스토리 모드에서 허용되는 보스 패턴 풀을 조정할 때 이 함수를 수정한다.
 */
export function pickStoryBossPhase(currentPhase = -1): number {
  const pool = STORY_BOSS_PHASE_IDS.filter((phase) => phase !== currentPhase);
  const choices = pool.length > 0 ? pool : STORY_BOSS_PHASE_IDS;
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * 직전 페이즈와 겹치지 않도록 일반 보스 페이즈 후보 중 하나를 선택한다.
 * 1페이즈 보스의 기본 패턴 풀을 바꿀 때 이 함수를 수정한다.
 */
export function pickNormalBossPhase(currentPhase = -1): number {
  const pool = NORMAL_BOSS_PHASE_IDS.filter((phase) => phase !== currentPhase);
  const choices = pool.length > 0 ? pool : NORMAL_BOSS_PHASE_IDS;
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * 직전 페이즈와 겹치지 않도록 오버드라이브 보스 페이즈 후보 중 하나를 선택한다.
 * 2페이즈 이후의 고난도 패턴 풀을 조정할 때 이 함수를 수정한다.
 */
export function pickOverdriveBossPhase(currentPhase = -1): number {
  const pool = OVERDRIVE_BOSS_PHASE_IDS.filter((phase) => phase !== currentPhase);
  const choices = pool.length > 0 ? pool : OVERDRIVE_BOSS_PHASE_IDS;
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * 직전 페이즈와 겹치지 않도록 최종 보스 페이즈 후보 중 하나를 선택한다.
 * 3페이즈 최종 보스 패턴 순서를 조정할 때 이 함수를 수정한다.
 */
export function pickNextFinalBossPhase(currentPhase: number): number {
  const pool = FINAL_BOSS_PHASE_SEQUENCE.filter((phase) => phase !== currentPhase);
  const choices = pool.length > 0 ? pool : FINAL_BOSS_PHASE_SEQUENCE;
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * 직전 페이즈와 겹치지 않도록 챕터 4 보스 페이즈 후보 중 하나를 선택한다.
 * 챕터 4 전용 보스 패턴 풀을 조정할 때 이 함수를 수정한다.
 */
export function pickChapter4BossPhase(currentPhase: number): number {
  const pool = CHAPTER4_BOSS_PHASE_SEQUENCE.filter((phase) => phase !== currentPhase);
  const choices = pool.length > 0 ? pool : CHAPTER4_BOSS_PHASE_SEQUENCE;
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * 페이즈 번호를 기준으로 보스가 해당 패턴에 머무를 시간을 반환한다.
 * 특정 보스 패턴의 체류 시간을 늘리거나 줄일 때 이 함수를 수정한다.
 */
export function getBossPhaseDuration(phase: number): number {
  if (phase === 20) return 8.4;
  if (phase === 21) return 8.8;
  if (phase === 23) return Math.random() * 3 + 2;
  if (phase === 24) return 6.2;
  if (phase === 47) return 6.6;
  if (phase === 49) return 6.2;
  if (phase === 50) return 6.2;
  if (phase === 32) return 7.4;
  if (phase === 51) return Math.random() * 2 + 3;
  if (phase === 52) return 9.2;
  if (phase === 42) return Math.random() * 3 + 2;
  if (phase === 44) return Math.random() * 2 + 3;
  if (phase === 45) return 7.0;
  if (phase === 46) return 7.0;
  if (phase >= 40 && phase <= 43) return 6.8;
  if (phase >= 14 && phase <= 19) return Math.random() * 2 + 5.5;
  if (phase >= 20 && phase <= 39) return Math.random() * 2.2 + 5.8;
  return Math.random() * 3.5 + 5.5;
}

/**
 * 보스 엔티티에 새 페이즈 번호, 지속 시간, 스폰 포인트를 적용한다.
 * 페이즈별 위치 기준이나 스토리 모드 duration 보정을 바꿀 때 이 함수를 수정한다.
 */
export function assignBossPhase(engine: BossPhaseRuntime, e: Enemy, phase: number, fixedDuration = false): void {
  e.phase = phase;
  const baseDuration = fixedDuration ? 8.5 : getBossPhaseDuration(phase);
  e.phaseDuration = engine.playMode === "story" ? Math.min(baseDuration, 5.8) : baseDuration;
  e.spawnPoint = engine.playMode === "story" ? 2 : Math.floor(Math.random() * 3) + 2;
  if (phase === 24 || phase === 28) {
    e.spawnPoint = Math.floor(Math.random() * 3) + 1;
  } else if (phase === 47) {
    e.spawnPoint = 1;
  } else if (phase === 49) {
    e.spawnPoint = Math.floor(Math.random() * 5) + 8;
  }
}

/**
 * 현재 엔진 상태를 기준으로 보스에게 다음 페이즈를 선택해 적용한다.
 * 스토리, 샌드박스 페이즈 고정, 오버드라이브, 최종장 분기를 조정할 때 이 함수를 수정한다.
 */
export function assignNextBossPhase(engine: BossPhaseRuntime, e: Enemy): void {
  if (engine.playMode === "story") {
    assignBossPhase(engine, e, pickStoryBossPhase(e.phase));
  } else if (engine.isSandbox && engine.sandboxBossPhaseLock >= 1) {
    assignBossPhase(engine, e, engine.sandboxBossPhaseLock, true);
  } else if (engine.stage >= 4 && engine.bossPhase3Active) {
    assignBossPhase(engine, e, pickChapter4BossPhase(e.phase));
  } else if (engine.bossPhase3Active) {
    assignBossPhase(engine, e, pickNextFinalBossPhase(e.phase));
  } else if (engine.bossPhase2Active) {
    assignBossPhase(engine, e, pickOverdriveBossPhase(e.phase));
  } else {
    assignBossPhase(engine, e, pickNormalBossPhase(e.phase));
  }
}

/**
 * 보스 엔티티의 패턴 진행 타이머와 패턴별 임시 상태를 초기화한다.
 * 페이즈 전환 시 어떤 보스 필드를 리셋할지 바꿀 때 이 함수를 수정한다.
 */
export function resetBossPattern(e: Enemy): void {
  e.patternTimer = 0;
  e.shootTimer = 0;
  e.lastShot = 0;
  e.rapidFireCount = 0;
  e.burstCount = 0;
  e.laserAngle = undefined;
  e.lastCycleIndex = undefined;
  e.laserSoundCycle = undefined;
  e.satellites = [];
}

/**
 * 보스 레이저 사운드가 한 주기 안에서 한 번만 재생되도록 보스 엔티티에 재생 주기 번호를 기록한다.
 * 레이저 패턴의 경고/발사 타이밍과 사운드 중복 방지를 조정할 때 사용한다.
 */
export function playBossLaserSoundOncePerCycle(e: Enemy, timer: number, cycleLength: number, fireStart: number): void {
  const cycle = timer % cycleLength;
  if (cycle < fireStart) return;
  const cycleIndex = Math.floor(timer / cycleLength);
  if (e.laserSoundCycle === cycleIndex) return;
  e.laserSoundCycle = cycleIndex;
  sfx.laserBlast();
}
