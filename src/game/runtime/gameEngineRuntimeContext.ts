/**
 * 게임 엔진 런타임 문맥 타입
 *
 * 기능 시스템들이 공통으로 참조하는 GameEngine의 주요 상태 필드를 한곳에서 확인할 수 있게 정리한다.
 * 여러 시스템이 공유하는 상태 필드를 추가하거나 이름을 바꿀 때 이 파일을 먼저 확인한다.
 */

import type { GameMode } from "../../types";
import type { BossAbsorbOrb, BossAfterimageSlash, BossCompressionField, BossDashState, BossEdgeStriker, BossGridLaser, BossMazeState, BossSafeZoneBlast, ElectricTrail, PlayerHistoryPoint, SuicideDrone, TailMine, TimedExplosionZone } from "../boss/bossPatternHazardSystem";
import type { Bullet, Enemy, EngineState, GameInput, InkCloud, Particle, Player, PowerUp } from "../entities";
import type { Chapter1BossRuntime } from "../chapter1/chapter1BossTypes";
import type { Chapter1WaveRuntime } from "../chapter1/chapter1WaveTypes";
import type { HelperDroneState } from "../drones/helperDroneTypes";
import type { DebrisCoverState } from "../obstacles/debrisCoverTypes";
import type { MeteorObstacleState } from "../obstacles/meteorObstacleTypes";

export interface GameEngineRuntimeContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: GameInput;
  needInitialPosition: boolean;
  lastCanvasWidth: number;
  lastCanvasHeight: number;
  paused: boolean;
  playMode: GameMode;
  storyStageTimer: number;

  isSandbox: boolean;
  sandboxEnemyType: string;
  sandboxInvincibility: boolean;
  sandboxMovementEnabled: boolean;
  sandboxMode: "single" | "wave" | "bossCombat";
  sandboxActiveWave: number;
  sandboxBossPhaseLock: number;
  sandboxBossOverdrive: boolean;
  sandboxBossPhase3: boolean;
  sandboxBossCombatMode: boolean;
  sandboxBossChapter: number;
  sandboxPlayerPowerLevel: number;
  sandboxPlayerBombs: number;
  sandboxPlayerSatelliteCount: number;

  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  powerups: PowerUp[];
  inkClouds: InkCloud[];
  chapter1Wave: Chapter1WaveRuntime;
  chapter1Boss: Chapter1BossRuntime;

  state: EngineState;
  score: number;
  stage: number;
  nextBossScore: number;
  assaultCommanderStage: number;
  spawnTimer: number;
  sideSpawnTimer: number;
  waveTimer: number;

  bossActive: boolean;
  bossEntity: Enemy | null;
  bossPhase2Triggered: boolean;
  bossPhase2Active: boolean;
  bossPhase3Triggered: boolean;
  bossPhase3Active: boolean;
  screenShakeIntensity: number;
  cutsceneTimer: number;
  clearingForBoss: boolean;
  squadTimer: number;
  playerSatelliteAngle: number;
  playerSatelliteShotTimer: number;
  playerSatelliteFlashes: number[];

  bossElectricTrails: ElectricTrail[];
  bossGridLasers: BossGridLaser[];
  bossSuicideDrones: SuicideDrone[];
  bossTimedExplosions: TimedExplosionZone[];
  bossTailMines: TailMine[];
  bossDashState: BossDashState | null;
  bossSafeZoneBlasts: BossSafeZoneBlast[];
  bossAbsorbOrbs: BossAbsorbOrb[];
  bossAfterimageSlashes: BossAfterimageSlash[];
  bossCompressionField: BossCompressionField | null;
  bossEdgeStrikers: BossEdgeStriker[];
  bossMazeState: BossMazeState | null;
  playerPositionHistory: PlayerHistoryPoint[];
  bossClearTimer: number;
  bossClearX: number;
  bossClearY: number;
  bossClearLabel: string;
  bossClearBoss: Enemy | null;

  bombActive: boolean;
  bombRadius: number;
  bombMaxRadius: number;
  bossBombHitSet: Set<Enemy>;
  lastTime: number;
  reqId: number;

  onGameOver?: (score: number) => void;
  onScoreUpdate?: (score: number) => void;
  onCutsceneChange?: (active: boolean) => void;
  onBombsChanged?: (bombs: number) => void;
  onStageClear?: (choices: string[], onSelect: (choice: string) => void) => void;

  drones: HelperDroneState[];
  debrisCovers: DebrisCoverState[];
  meteors: MeteorObstacleState[];
  meteorTimer: number;
  sandboxRespawnTimer: number;
}
