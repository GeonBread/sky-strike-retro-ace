/**
 * 게임 시작 상태 초기화 시스템
 *
 * 새 게임이 시작될 때 플레이어, 점수, 보스 상태, 전투 배열, 샌드박스 기본값, 스폰 타이머를 초기화한다.
 * 시작 체력, 폭탄 수, 첫 웨이브 대기 시간, 초기 전투 상태를 조정할 때 이 파일을 수정한다.
 */

import type { GameMode, ShipColor } from "../../types";
import { Player } from "../entities";
import { resetChapter1WaveRuntimeSystem } from "../chapter1/chapter1WaveSystem";
import { resetChapter1BossSystem } from "../chapter1/chapter1BossSystem";

const PLAYER_MAX_HP = 3;

type GameStartRuntime = any;

/**
 * 새 플레이 세션에 필요한 엔진 상태를 기본값으로 되돌린다.
 * 렌더 루프 시작과 BGM 재생은 호출부에서 처리하고, 이 함수는 상태 값만 갱신한다.
 */
export function initializeGameStartStateSystem(engine: GameStartRuntime, color: ShipColor, mode: GameMode = "arcade") {
  engine.playMode = mode;
  engine.player = new Player();
  engine.player.width = 48;
  engine.player.height = 48;
  engine.player.hitWidth = 6;
  engine.player.hitHeight = 6;
  engine.player.x = engine.canvas.width / 2 - 24;
  engine.player.y = engine.canvas.height - 100;
  engine.player.color = color;
  engine.player.hp = PLAYER_MAX_HP;
  engine.player.bombs = 3;
  engine.needInitialPosition = true;
  engine.lastCanvasWidth = 0;
  engine.lastCanvasHeight = 0;

  engine.bullets = [];
  engine.enemies = [];
  engine.particles = [];
  engine.powerups = [];
  engine.score = 0;
  engine.stage = 1;
  engine.nextBossScore = 15000;
  engine.storyStageTimer = 0;
  engine.storyPurificationExitActive = false;
  engine.storyPurificationExitElapsed = 0;
  engine.storyPurificationExitStartY = 0;
  engine.storyPlayerHidden = false;
  resetChapter1WaveRuntimeSystem(engine, true);
  resetChapter1BossSystem(engine);
  engine.storyAdjustedBullets = new WeakSet();
  engine.storyAdjustedEnemies = new WeakSet();
  engine.storyBulletSerial = 0;
  engine.assaultCommanderStage = 0;
  engine.bossActive = false;
  engine.bossEntity = null;
  engine.bossPhase2Triggered = false;
  engine.bossPhase2Active = false;
  engine.bossPhase3Triggered = false;
  engine.bossPhase3Active = false;
  engine.screenShakeIntensity = 0;
  engine.state = "PLAYING";
  engine.bombActive = false;
  engine.bombRadius = 0;
  engine.bossBombHitSet.clear();
  engine.clearBossPatternHazards();

  engine.drones = [];
  engine.meteors = [];
  engine.meteorTimer = 6.0;
  engine.spawnInitialDebris();

  if (!engine.isSandbox) {
    engine.isSandbox = false;
    engine.sandboxMode = "single";
  }

  engine.waveTimer = 2.0;
  engine.spawnTimer = 4.5;
  engine.sideSpawnTimer = 8.0;

  if (engine.onScoreUpdate) engine.onScoreUpdate(0);
  if (engine.onBombsChanged) engine.onBombsChanged(engine.player.bombs);
}
