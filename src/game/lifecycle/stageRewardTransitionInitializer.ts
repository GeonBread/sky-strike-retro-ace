/**
 * 스테이지 보상 이후 전환 초기화 시스템
 *
 * 스테이지 클리어 보상 선택 후 다음 전투 스테이지로 넘어갈 때 필요한 상태 재설정을 담당한다.
 * 다음 보스 점수 기준, 스테이지별 BGM 전환, 보스 상태 초기화, 재시작 타이머를 조정할 때 이 파일을 수정한다.
 */

import { sfx } from "../AudioSystem";
import { resetChapter1WaveRuntimeSystem } from "../chapter1/chapter1WaveSystem";

type StageRewardTransitionRuntime = any;

interface StageRewardTransitionOptions {
  maxChapter: number;
}

/**
 * 다음 스테이지 번호로 이동하고 전투 배열, 보스 상태, 보스 패턴, 스폰 타이머를 새 스테이지 기준으로 초기화한다.
 * 스테이지 번호와 현재 점수를 기준으로 다음 보스 등장 점수도 다시 계산한다.
 */
export function initializeStageRewardTransitionSystem(
  engine: StageRewardTransitionRuntime,
  options: StageRewardTransitionOptions,
) {
  engine.stage++;
  resetChapter1WaveRuntimeSystem(engine, engine.stage === 1);
  engine.nextBossScore = engine.score + 10000 + engine.stage * 3000;
  engine.storyStageTimer = 0;
  engine.bossActive = false;
  engine.bossEntity = null;
  engine.bossPhase2Triggered = false;
  engine.bossPhase2Active = false;
  engine.bossPhase3Triggered = false;
  engine.bossPhase3Active = false;
  engine.screenShakeIntensity = 0;
  engine.clearingForBoss = false;

  engine.spawnInitialDebris();

  engine.bullets = [];
  engine.enemies = [];
  engine.particles = [];
  engine.powerups = [];
  engine.clearBossPatternHazards();
  engine.state = "PLAYING";
  sfx.startBgmForPhase(Math.min(options.maxChapter, engine.stage));

  engine.waveTimer = 1.5;
  engine.spawnTimer = 4.0;
}
