import React, { Fragment, useEffect, useRef, useState } from "react";
import { HelpCircle, Keyboard, Palette, Smartphone, Trophy, User } from "lucide-react";
import { useAppStore } from "./store";
import { GameEngine, GameInput } from "./game/engine";
import { sfx } from "./game/AudioSystem";
import { GameMode, GameState, ShipColor, ShipStyle } from "./types";
import { DevSandbox } from "./components/DevSandbox";
import { GameOverPanel } from "./components/GameOverPanel";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { createLocalRunSession, sanitizePlayerName } from "./services/leaderboard";
import { HobanwooMainMenu } from "./components/ui/buttons/HobanwooMainMenu";
import { HobanwooShipSelectPanel } from "./components/ui/buttons/HobanwooShipSelectPanel";
import { HobanwooSpriteButton } from "./components/ui/buttons/HobanwooSpriteButton";
import { NotificationDialog } from "./components/ui/NotificationDialog";
import {
  Chapter1StoryPlayer,
  type Chapter1StoryPlayerHandle,
  type Chapter1StoryPreviewRequest,
} from "./components/story/Chapter1StoryPlayer";
import "./components/ui/hobanwooOverlayPanels.css";
import {
  CHAPTER1_STORY_CANVAS_HEIGHT,
  CHAPTER1_STORY_CANVAS_WIDTH,
} from "./game/chapter1/chapter1WaveVisualTuning";

const MAX_HP = 3;

interface StoryResult {
  outcome: "cleared" | "failed";
  stage: number;
  durationMs: number;
}

interface GameCanvasProps {
  mode: GameMode;
  shipStyle: ShipStyle;
  onStoryResult: (result: StoryResult) => void;
  chapter1WaveOnly?: boolean;
  chapter1BossOnly?: boolean;
  active?: boolean;
  onChapter1WaveComplete?: () => void;
  onChapter1BossPhase2?: () => void;
  onChapter1BossComplete?: () => void;
  onChapter1CombatFailed?: () => void;
  inputEnabled?: boolean;
  chapter1PurificationExit?: boolean;
  simulationEnabled?: boolean;
  onVisualReady?: () => void;
  onPlayerScreenPositionChange?: (position: { xPercent: number; yPercent: number }) => void;
}

function GameCanvas({
  mode,
  shipStyle,
  onStoryResult,
  chapter1WaveOnly = false,
  chapter1BossOnly = false,
  active = true,
  onChapter1WaveComplete,
  onChapter1BossPhase2,
  onChapter1BossComplete,
  onChapter1CombatFailed,
  inputEnabled = true,
  chapter1PurificationExit = false,
  simulationEnabled = true,
  onVisualReady,
  onPlayerScreenPositionChange,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<GameInput>({ up: false, down: false, left: false, right: false, fire: false, useBomb: false });
  const isPausedRef = useRef(false);
  const showExitConfirmRef = useRef(false);
  const bossPointerConsumedRef = useRef(false);
  const runSessionRef = useRef(createLocalRunSession());
  const runStartedAtRef = useRef(Date.now());
  const externallyActiveRef = useRef(active);
  const waveCompleteCallbackRef = useRef(onChapter1WaveComplete);
  const bossPhase2CallbackRef = useRef(onChapter1BossPhase2);
  const bossCompleteCallbackRef = useRef(onChapter1BossComplete);
  const combatFailedCallbackRef = useRef(onChapter1CombatFailed);
  const inputEnabledRef = useRef(inputEnabled);
  const visualReadyCallbackRef = useRef(onVisualReady);
  const visualReadyNotifiedRef = useRef(false);
  const playerPositionCallbackRef = useRef(onPlayerScreenPositionChange);

  const { setGameState, setScore, shipColor, updateStats, setLastRun, score } = useAppStore();
  const [hp, setHp] = useState(MAX_HP);
  const [bombs, setBombs] = useState(3);
  const [stage, setStage] = useState(1);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [bossPhase2Active, setBossPhase2Active] = useState(false);
  const [bossPhase3Active, setBossPhase3Active] = useState(false);
  const [isBossCutscene, setIsBossCutscene] = useState(false);
  const [chapter1BossIntroActive, setChapter1BossIntroActive] = useState(chapter1BossOnly);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isStoryMode = mode === "story";
  const isStoryCombatCanvas = isStoryMode && (chapter1WaveOnly || chapter1BossOnly);

  useEffect(() => {
    externallyActiveRef.current = active;
    waveCompleteCallbackRef.current = onChapter1WaveComplete;
    bossPhase2CallbackRef.current = onChapter1BossPhase2;
    bossCompleteCallbackRef.current = onChapter1BossComplete;
    combatFailedCallbackRef.current = onChapter1CombatFailed;
    inputEnabledRef.current = inputEnabled;
    visualReadyCallbackRef.current = onVisualReady;
    playerPositionCallbackRef.current = onPlayerScreenPositionChange;
    if (!inputEnabled) {
      inputRef.current = { up: false, down: false, left: false, right: false, fire: false, useBomb: false };
      if (engineRef.current) engineRef.current.input = inputRef.current;
    }
    if (engineRef.current) {
      engineRef.current.paused = isPausedRef.current || !active;
      engineRef.current.simulationEnabled = simulationEnabled;
    }
  }, [active, inputEnabled, simulationEnabled, onVisualReady, onChapter1WaveComplete, onChapter1BossPhase2, onChapter1BossComplete, onChapter1CombatFailed, onPlayerScreenPositionChange]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (engineRef.current) engineRef.current.paused = isPaused || !externallyActiveRef.current;
    if (isPaused || !externallyActiveRef.current) sfx.pauseAll();
    else sfx.resumeAll();
  }, [isPaused]);

  useEffect(() => {
    showExitConfirmRef.current = showExitConfirm;
  }, [showExitConfirm]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let resizeObserver: ResizeObserver | null = null;
    if (isStoryCombatCanvas) {
      // 웨이브와 보스가 같은 논리 해상도를 사용해야 표시 크기와 이동 속도가 실제 화면에서도 일치한다.
      canvasRef.current.width = CHAPTER1_STORY_CANVAS_WIDTH;
      canvasRef.current.height = CHAPTER1_STORY_CANVAS_HEIGHT;
    } else {
      const resizeCanvas = (width: number, height: number) => {
        if (!canvasRef.current) return;
        canvasRef.current.width = Math.max(1, Math.round(width));
        canvasRef.current.height = Math.max(1, Math.round(height));
      };
      const initialRect = containerRef.current.getBoundingClientRect();
      resizeCanvas(initialRect.width, initialRect.height);
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) resizeCanvas(entry.contentRect.width, entry.contentRect.height);
      });
      resizeObserver.observe(containerRef.current);
    }

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;
    engine.paused = isPausedRef.current || !externallyActiveRef.current;
    engine.simulationEnabled = simulationEnabled;

    const localRunSession = createLocalRunSession();
    runSessionRef.current = localRunSession;
    runStartedAtRef.current = localRunSession.startedAt;
    setLastRun(null);

    engine.onScoreUpdate = isStoryMode ? undefined : setScore;
    engine.onGameOver = (finalScore) => {
      const finishedAt = Date.now();
      if (isStoryMode) {
        setLastRun(null);
        setScore(0);
        if ((chapter1WaveOnly || chapter1BossOnly) && combatFailedCallbackRef.current) {
          combatFailedCallbackRef.current();
          return;
        }
        onStoryResult({
          outcome: engine.state === "VICTORY" ? "cleared" : "failed",
          stage: engine.stage,
          durationMs: finishedAt - runStartedAtRef.current,
        });
        setGameState("STORY_RESULT");
        return;
      }

      const currentStats = useAppStore.getState().stats;
      const isNewHighScore = finalScore > currentStats.highScore;
      setLastRun({
        score: finalScore,
        stage: engine.stage,
        shipColor,
        durationMs: finishedAt - runStartedAtRef.current,
        finishedAt,
        runSession: runSessionRef.current,
        isNewHighScore,
      });
      setGameState("GAME_OVER");
      updateStats({
        highScore: Math.max(currentStats.highScore, finalScore),
        lastPlayed: Date.now(),
      });
    };
    engine.onCutsceneChange = chapter1BossOnly ? undefined : setIsBossCutscene;
    engine.onBombsChanged = setBombs;
    // 챕터 클리어 보상 선택 UI는 사용하지 않는다.
    engine.onStageClear = undefined;
    engine.onChapter1WavesComplete = chapter1WaveOnly
      ? () => waveCompleteCallbackRef.current?.()
      : undefined;
    engine.onChapter1BossPhase2Story = () => bossPhase2CallbackRef.current?.();
    engine.onChapter1BossComplete = () => bossCompleteCallbackRef.current?.();

    const hudInterval = setInterval(() => {
      if (engine.player) {
        setHp(Math.max(0, Math.min(MAX_HP, engine.player.hp)));
        if (engine.canvas.width > 0 && engine.canvas.height > 0) {
          playerPositionCallbackRef.current?.({
            xPercent: ((engine.player.x + engine.player.width / 2) / engine.canvas.width) * 100,
            yPercent: ((engine.player.y + engine.player.height / 2) / engine.canvas.height) * 100,
          });
        }
      }
      if (!visualReadyNotifiedRef.current && engine.areChapter1StoryVisualsReady()) {
        visualReadyNotifiedRef.current = true;
        visualReadyCallbackRef.current?.();
      }
      setChapter1BossIntroActive(chapter1BossOnly && engine.isChapter1BossIntroActive());
      setStage(engine.stage);
      setBossPhase2Active(engine.bossPhase2Active);
      setBossPhase3Active(engine.bossPhase3Active);
      setBossHp(engine.bossActive && engine.bossEntity ? engine.bossEntity.hp : null);
    }, 100);

    engine.start(shipColor, mode, shipStyle);
    if (chapter1WaveOnly) {
      engine.chapter1Wave.enabled = true;
      engine.chapter1Wave.running = false;
      engine.chapter1Wave.nextWave = 0;
      engine.chapter1Wave.allWavesCleared = false;
    }
    if (chapter1BossOnly) {
      engine.chapter1Wave.enabled = false;
      engine.startChapter1Boss(-1, true);
    }
    // 테스트 바로가기처럼 비활성 상태로 처음 마운트되더라도 배경과 플레이어는 한 프레임 그려 둔다.
    engine.render();

    return () => {
      resizeObserver?.disconnect();
      clearInterval(hudInterval);
      engine.stop();
    };
  }, []);

  useEffect(() => {
    if (!chapter1PurificationExit) return;
    engineRef.current?.beginChapter1PurificationExit();
  }, [chapter1PurificationExit]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.preventDefault();
        if (showExitConfirmRef.current) {
          setShowExitConfirm(false);
          return;
        }
        setIsPaused((prev) => !prev);
        return;
      }
      if (isPausedRef.current || !externallyActiveRef.current || !inputEnabledRef.current) return;

      if (/^[0-9]$/.test(event.key) && engineRef.current?.handleChapter1BossDigit(Number(event.key))) {
        event.preventDefault();
        return;
      }

      if (event.code === "ArrowUp" || event.code === "KeyW") inputRef.current.up = true;
      if (event.code === "ArrowDown" || event.code === "KeyS") inputRef.current.down = true;
      if (event.code === "ArrowLeft" || event.code === "KeyA") inputRef.current.left = true;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputRef.current.right = true;
      if (event.code === "Space") inputRef.current.fire = true;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "KeyB" || event.code === "KeyX") inputRef.current.useBomb = true;
      if (engineRef.current) engineRef.current.input = inputRef.current;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isPausedRef.current || !externallyActiveRef.current || !inputEnabledRef.current) return;
      if (event.code === "ArrowUp" || event.code === "KeyW") inputRef.current.up = false;
      if (event.code === "ArrowDown" || event.code === "KeyS") inputRef.current.down = false;
      if (event.code === "ArrowLeft" || event.code === "KeyA") inputRef.current.left = false;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputRef.current.right = false;
      if (event.code === "Space") inputRef.current.fire = false;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "KeyB" || event.code === "KeyX") inputRef.current.useBomb = false;
      if (engineRef.current) engineRef.current.input = inputRef.current;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (isPausedRef.current || !externallyActiveRef.current || !inputEnabledRef.current || !canvasRef.current || !engineRef.current) return;
    const touch = event.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (touch.clientX - rect.left) * (canvasRef.current.width / Math.max(1, rect.width));
    const canvasY = (touch.clientY - rect.top) * (canvasRef.current.height / Math.max(1, rect.height));
    bossPointerConsumedRef.current = engineRef.current.handleChapter1BossPointer(canvasX, canvasY);
    if (bossPointerConsumedRef.current) {
      event.preventDefault();
      inputRef.current.fire = false;
      return;
    }
    inputRef.current.fire = true;
  };

  const handleTouchEnd = () => {
    bossPointerConsumedRef.current = false;
    inputRef.current.fire = false;
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.up = false;
    inputRef.current.down = false;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!canvasRef.current || !engineRef.current || isPausedRef.current || !externallyActiveRef.current || !inputEnabledRef.current || bossPointerConsumedRef.current) return;
    const touch = event.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvasRef.current.width / Math.max(1, rect.width));
    const y = (touch.clientY - rect.top) * (canvasRef.current.height / Math.max(1, rect.height));
    engineRef.current.player.x = x - engineRef.current.player.width / 2;
    engineRef.current.player.y = y - engineRef.current.player.height * 2.2;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !engineRef.current || isPausedRef.current || !externallyActiveRef.current || !inputEnabledRef.current || event.pointerType === "touch") return;
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (event.clientX - rect.left) * (canvasRef.current.width / Math.max(1, rect.width));
    const canvasY = (event.clientY - rect.top) * (canvasRef.current.height / Math.max(1, rect.height));
    if (engineRef.current.handleChapter1BossPointer(canvasX, canvasY)) {
      event.preventDefault();
      inputRef.current.fire = false;
    }
  };

  const bossMaxHp = chapter1BossOnly
    ? bossPhase2Active ? 1800 : 1200
    : isStoryMode
    ? stage >= 4 ? 4200 : bossPhase3Active ? 3200 : bossPhase2Active ? 2400 : 1500
    : stage >= 4 ? 12000 : bossPhase3Active ? 9000 : bossPhase2Active ? 6000 : 4000;
  const bossLabel = stage >= 4 ? "CHAPTER 4 BOSS" : bossPhase3Active ? "CHAPTER 3 BOSS" : bossPhase2Active ? "CHAPTER 2 BOSS" : "CHAPTER 1 BOSS";
  const containerClassName = isStoryCombatCanvas
    ? `relative mx-auto overflow-hidden bg-slate-950 shadow-2xl flex flex-col${chapter1BossIntroActive ? " chapter1-boss-intro-fullscreen" : ""}`
    : "relative w-full h-full max-w-[840px] mx-auto bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col";
  const containerStyle: React.CSSProperties | undefined = isStoryCombatCanvas
    ? chapter1BossIntroActive
      ? {
          // 보스 최초 등장 동안 24:25 비율을 유지한 채 뷰포트를 완전히 덮도록 확대한다.
          position: "fixed",
          left: "50%",
          top: "50%",
          width: "max(100vw, 96dvh)",
          height: "max(100dvh, 104.167vw)",
          aspectRatio: "24 / 25",
          transform: "translate(-50%, -50%)",
          zIndex: 120,
        }
      : {
          // 스토리·웨이브·보스를 모두 동일한 24:25 전투 프레임으로 표시한다.
          width: "min(96dvh, 100vw)",
          height: "min(100dvh, 104.167vw)",
          aspectRatio: "24 / 25",
        }
    : undefined;

  return (
    <>
    <div
      className={containerClassName}
      ref={containerRef}
      style={containerStyle}
    >
      <canvas
        ref={canvasRef}
        className={isStoryCombatCanvas ? "block touch-none w-full h-full" : "block touch-none flex-grow"}
        onPointerDown={handlePointerDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {!chapter1BossIntroActive && <div className="absolute top-0 left-0 w-full pt-4 pl-5 pr-8 flex justify-between items-start pointer-events-none z-10 bg-gradient-to-b from-slate-950/80 to-transparent">
        <div>
          {!isStoryMode && (
            <div className="font-mono text-2xl text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]">
              점수 {score.toString().padStart(6, "0")}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="combat-hud-life-row" aria-label={`체력 ${hp} / ${MAX_HP}`}>
            {[...Array(MAX_HP)].map((_, i) => (
              <span key={i} className={`combat-hud-life-icon${i < hp ? " is-active" : ""}`} />
            ))}
          </div>
        </div>
      </div>}

      {!chapter1BossIntroActive && <div className="combat-hud-bomb-row" aria-label={`폭탄 ${bombs} / 3`}>
        {[...Array(3)].map((_, i) => (
          <span key={i} className={`combat-hud-bomb-icon${i < bombs ? " is-active" : ""}`} />
        ))}
      </div>}

      {!chapter1BossOnly && bossHp !== null && (
        <div className={`absolute top-16 left-1/2 -translate-x-1/2 w-4/5 max-w-sm pointer-events-none z-20 transition-all duration-300 bg-slate-950/95 border rounded-full px-4 py-1 text-center ${bossPhase3Active ? "border-purple-500 shadow-[0_0_22px_rgba(168,85,247,0.85)]" : bossPhase2Active ? "border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.65)]" : "border-cyan-700 shadow-[0_0_15px_rgba(34,211,238,0.35)]"}`}>
          <div className="flex justify-between items-center text-[10px] font-mono font-bold px-1 mb-0.5">
            <span className={bossPhase3Active ? "text-purple-300" : bossPhase2Active ? "text-rose-300" : "text-cyan-300"}>{bossLabel}</span>
            <span className="text-slate-300">HP {Math.floor(bossHp)} / {bossMaxHp}</span>
          </div>
          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-100 ease-out ${bossPhase3Active ? "bg-gradient-to-r from-purple-700 via-fuchsia-500 to-cyan-300" : bossPhase2Active ? "bg-gradient-to-r from-rose-700 via-pink-500 to-orange-300" : "bg-gradient-to-r from-cyan-600 via-blue-400 to-white"}`}
              style={{ width: `${Math.max(0, (bossHp / bossMaxHp) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {isBossCutscene && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/45 pointer-events-none z-30">
          <div className="text-center p-6 border-y-2 border-red-500 bg-black/80 w-full">
            <h1 className="text-5xl font-black text-rose-500 font-mono tracking-widest">BOSS APPROACH</h1>
            <p className="text-rose-200 font-mono text-sm mt-2">PHASE COMBAT READY</p>
          </div>
        </div>
      )}

      {isPaused && (
        <div className="hobanwooPauseDim">
          <section className="hobanwooPausePanel" aria-label="일시 정지">
            <div className="hobanwooPauseEyebrow">GAME PAUSED</div>
            <h2>일시 정지</h2>
            <div className="hobanwooPauseActions">
              <HobanwooSpriteButton
                variant="pauseContinue"
                onClick={() => {
                  setShowExitConfirm(false);
                  setIsPaused(false);
                }}
              />
              <HobanwooSpriteButton
                variant="mainMenu"
                onClick={() => setShowExitConfirm(true)}
              />
            </div>
          </section>
        </div>
      )}

      <NotificationDialog
        open={showExitConfirm}
        title="메인 화면으로 이동"
        message="현재 플레이 기록이 종료됩니다.\n메인 화면으로 돌아가시겠습니까?"
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false);
          sfx.resumeAll();
          engineRef.current?.stop();
          setGameState("MENU");
        }}
      />
    </div>
    {chapter1WaveOnly && active && inputEnabled && (
      <button
        type="button"
        className="chapter1-wave-skip-outside"
        onClick={(event) => {
          event.stopPropagation();
          engineRef.current?.skipCurrentChapter1Wave();
        }}
      >
        다음 웨이브
      </button>
    )}
    {chapter1BossOnly && active && inputEnabled && (
      <button
        type="button"
        className="chapter1-wave-skip-outside"
        style={{ top: 72 }}
        onClick={(event) => {
          event.stopPropagation();
          engineRef.current?.skipCurrentChapter1BossPhase?.();
        }}
      >
        보스 페이즈 넘기기
      </button>
    )}
    </>
  );
}


type Chapter1StoryPhase = "story" | "wave-guide" | "wave" | "wave-purification-effect" | "wave-purification-exit" | "boss" | "phase2-dialogue";

function Chapter1StoryExperience({
  shipStyle,
  onStoryResult,
}: {
  shipStyle: ShipStyle;
  onStoryResult: (result: StoryResult) => void;
}) {
  const storyPlayerRef = useRef<Chapter1StoryPlayerHandle>(null);
  const startedAtRef = useRef(Date.now());
  const jumpTokenRef = useRef(0);
  const purificationTimerRef = useRef<number | null>(null);
  const bossClearTransitionTimerRef = useRef<number | null>(null);
  const [part, setPart] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<Chapter1StoryPhase>("story");
  const [previewRequest, setPreviewRequest] = useState<Chapter1StoryPreviewRequest | null>(null);
  const [showJumpMenu, setShowJumpMenu] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ xPercent: 50, yPercent: 88 });
  const [purificationOrigin, setPurificationOrigin] = useState({ xPercent: 50, yPercent: 88 });
  const [waveGuideStep, setWaveGuideStep] = useState(0);
  const [waveGuideVisualReady, setWaveGuideVisualReady] = useState(false);
  const [waveRunKey, setWaveRunKey] = useState(0);
  const [bossClearTransitionActive, setBossClearTransitionActive] = useState(false);
  const [bossClearBackdrop, setBossClearBackdrop] = useState<string | null>(null);

  const waveMounted = part === 2 && (phase === "wave-guide" || phase === "wave" || phase === "wave-purification-effect" || phase === "wave-purification-exit");
  const bossMounted = part === 2 && (phase === "boss" || phase === "phase2-dialogue");
  const bossActive = phase === "boss";

  useEffect(() => () => {
    if (purificationTimerRef.current !== null) window.clearTimeout(purificationTimerRef.current);
    if (bossClearTransitionTimerRef.current !== null) window.clearTimeout(bossClearTransitionTimerRef.current);
  }, []);

  useEffect(() => {
    if (phase !== "wave-guide" || !waveGuideVisualReady) return;
    const handleGuideKey = (event: KeyboardEvent) => {
      if (event.code !== "Enter" && event.code !== "Space") return;
      event.preventDefault();
      if (waveGuideStep < 3) setWaveGuideStep((step) => step + 1);
      else setPhase("wave");
    };
    window.addEventListener("keydown", handleGuideKey);
    return () => window.removeEventListener("keydown", handleGuideKey);
  }, [phase, waveGuideStep, waveGuideVisualReady]);

  const requestStoryPreview = (previewId: string, flowContinuation = false) => {
    jumpTokenRef.current += 1;
    setPreviewRequest({ id: previewId, token: jumpTokenRef.current, flowContinuation });
  };

  const startWavePurificationSequence = () => {
    if (purificationTimerRef.current !== null) window.clearTimeout(purificationTimerRef.current);
    setPart(2);
    setPurificationOrigin(playerPosition);
    sfx.purificationComplete();
    setPhase("wave-purification-effect");
    // 정화 파동을 끝까지 보여준 뒤에만 호반우의 상승 이탈을 시작한다.
    purificationTimerRef.current = window.setTimeout(() => {
      setPhase("wave-purification-exit");
      purificationTimerRef.current = window.setTimeout(() => {
        purificationTimerRef.current = null;
        setPhase("story");
        requestStoryPreview("energy100-dialogue", true);
      }, 1500);
    }, 3300);
  };

  const jumpToPreview = (targetPart: 1 | 2, previewId: string) => {
    setPart(targetPart);
    setPhase("story");
    jumpTokenRef.current += 1;
    setPreviewRequest({ id: previewId, token: jumpTokenRef.current });
    setShowJumpMenu(false);
  };

  const openWaveGuide = () => {
    setPreviewRequest(null);
    setPart(2);
    setWaveGuideStep(0);
    setWaveGuideVisualReady(false);
    setWaveRunKey((key) => key + 1);
    setPhase("wave-guide");
    setShowJumpMenu(false);
  };

  const jumpToWave = () => {
    setPreviewRequest(null);
    setPart(2);
    setWaveRunKey((key) => key + 1);
    setPhase("wave");
    setShowJumpMenu(false);
  };

  const jumpToPurification = () => {
    setPreviewRequest(null);
    setShowJumpMenu(false);
    startWavePurificationSequence();
  };

  const jumpToBoss = () => {
    setPreviewRequest(null);
    setPart(2);
    setPhase("boss");
    setShowJumpMenu(false);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div className="chapter1-story-test-navigation">
        <button
          type="button"
          className="chapter1-story-test-toggle"
          onClick={() => setShowJumpMenu((open) => !open)}
        >
          TEST 이동
        </button>
        {showJumpMenu && (
          <aside className="chapter1-story-test-panel" aria-label="챕터 1 스토리 테스트 이동">
            <div className="chapter1-story-test-title">CHAPTER 1 TEST</div>
            <div className="chapter1-story-test-group">
              <strong>전반부 스토리</strong>
              <button onClick={() => jumpToPreview(1, "full-flow")}>처음부터</button>
              <button onClick={() => jumpToPreview(1, "prologue-dialogue")}>프롤로그</button>
              <button onClick={() => jumpToPreview(1, "entrance-dialogue")}>입학식</button>
              <button onClick={() => jumpToPreview(1, "notice-dialogue")}>공지 폭주</button>
              <button onClick={() => jumpToPreview(1, "room-dialogue")}>강의실 혼선</button>
              <button onClick={() => jumpToPreview(1, "login-dialogue")}>로그인 감시</button>
              <button onClick={() => jumpToPreview(1, "attendance-dialogue")}>출석 드론</button>
              <button onClick={() => jumpToPreview(1, "first-purification-dialogue")}>첫 정화</button>
            </div>
            <div className="chapter1-story-test-group">
              <strong>전투·후반부</strong>
              <button onClick={() => jumpToPreview(2, "decision-dialogue")}>전투 결심</button>
              <button onClick={openWaveGuide}>전투 가이드</button>
              <button className="is-combat" onClick={jumpToWave}>실제 웨이브 시작</button>
              <button onClick={jumpToPurification}>정화율 100% 연출</button>
              <button className="is-combat" onClick={jumpToBoss}>실제 보스 시작</button>
              <button onClick={() => jumpToPreview(2, "boss-purification-dialogue")}>보스 격파 후 정화</button>
              <button onClick={() => jumpToPreview(2, "star-recovery-dialogue")}>별 회수</button>
              <button onClick={() => jumpToPreview(2, "chapter-end-dialogue")}>챕터 엔딩</button>
            </div>
          </aside>
        )}
      </div>

      {waveMounted && (
        <Fragment key={`chapter1-wave-${waveRunKey}`}>
          <div className="chapter1-story-boss-layer">
            <GameCanvas
              mode="story"
              shipStyle={shipStyle}
              onStoryResult={onStoryResult}
              chapter1WaveOnly
              active
              simulationEnabled={phase !== "wave-guide"}
              inputEnabled={phase === "wave"}
              chapter1PurificationExit={phase === "wave-purification-exit"}
              onVisualReady={() => setWaveGuideVisualReady(true)}
              onPlayerScreenPositionChange={setPlayerPosition}
              onChapter1WaveComplete={startWavePurificationSequence}
              onChapter1CombatFailed={() => {
                openWaveGuide();
              }}
            />
          </div>
        </Fragment>
      )}

      {phase === "wave-guide" && waveGuideVisualReady && (
        <div className="chapter1-combat-guide-overlay" role="dialog" aria-modal="true" aria-label="챕터 1 전투 가이드">
          <section className="chapter1-combat-guide-box">
            <div className="chapter1-combat-guide-speaker">학생증 · 전투 가이드</div>
            {waveGuideStep === 0 && (
              <>
                <h2>기본 조작</h2>
                <p><span className="chapter1-guide-key">↑</span><span className="chapter1-guide-key">↓</span><span className="chapter1-guide-key">←</span><span className="chapter1-guide-key">→</span> 방향키로 호반우를 움직인다.</p>
                <p><span className="chapter1-guide-key is-wide">SPACE</span>를 누르면 공격한다.</p>
              </>
            )}
            {waveGuideStep === 1 && (
              <>
                <h2>정화 폭탄</h2>
                <p><span className="chapter1-guide-key is-wide">SHIFT</span>를 누르면 정화 파동이 호반우를 중심으로 퍼진다.</p>
                <p>파동에 닿은 몬스터와 적 탄환은 바깥쪽부터 차례로 사라진다.</p>
              </>
            )}
            {waveGuideStep === 2 && (
              <>
                <h2>아이템</h2>
                <div className="chapter1-guide-item-list">
                  <div><span className="chapter1-guide-item-icon is-power" aria-label="화력 강화" /><span><strong>화력 강화</strong> · 공격 레벨이 1단계 상승한다.</span></div>
                  <div><span className="chapter1-guide-item-icon is-heal">+</span><span><strong>체력 회복</strong> · 잃은 체력을 1 회복한다.</span></div>
                </div>
              </>
            )}
            {waveGuideStep === 3 && (
              <>
                <h2>전투 준비 완료</h2>
                <p>오염된 학사 시스템 파편이 접근한다.</p>
                <p className="chapter1-combat-guide-final">건투를 빈다.</p>
              </>
            )}
            <button
              type="button"
              className="chapter1-combat-guide-next"
              onClick={() => {
                if (waveGuideStep < 3) setWaveGuideStep((step) => step + 1);
                else setPhase("wave");
              }}
            >
              {waveGuideStep < 3 ? "다음" : "웨이브 시작"}
            </button>
          </section>
        </div>
      )}

      {phase === "wave-purification-effect" && (
        <div
          className="chapter1-wave-purification-overlay"
          aria-label="정화 에너지 100% 연출"
          style={{
            "--purification-center-x": `${purificationOrigin.xPercent}%`,
            "--purification-center-y": `${purificationOrigin.yPercent}%`,
          } as React.CSSProperties}
        >
          <div className="chapter1-wave-purification-flash" />
          <div className="chapter1-wave-purification-ring ring-a" />
          <div className="chapter1-wave-purification-ring ring-b" />
          <div className="chapter1-wave-purification-core" />
        </div>
      )}

      {bossMounted && (
        <div className="chapter1-story-boss-layer">
          <GameCanvas
            mode="story"
            shipStyle={shipStyle}
            onStoryResult={onStoryResult}
            chapter1BossOnly
            active={bossActive}
            inputEnabled={bossActive && !bossClearTransitionActive}
            onChapter1BossPhase2={() => {
              setPhase("phase2-dialogue");
              window.setTimeout(() => storyPlayerRef.current?.showBossPhase2Dialogue(), 0);
            }}
            onChapter1BossComplete={() => {
              if (bossClearTransitionTimerRef.current !== null) {
                window.clearTimeout(bossClearTransitionTimerRef.current);
              }

              // 클리어 시점의 실제 전투 캔버스를 한 장 고정해 둡니다.
              // 이후 엔진 상태가 바뀌더라도 노란 페이드 뒤 배경이 다른 보스/장면으로 바뀌지 않습니다.
              let frozenBackdrop: string | null = null;
              const bossCanvas = document.querySelector<HTMLCanvasElement>(".chapter1-story-boss-layer canvas");
              if (bossCanvas) {
                try {
                  frozenBackdrop = bossCanvas.toDataURL("image/png");
                } catch {
                  frozenBackdrop = null;
                }
              }
              setBossClearBackdrop(frozenBackdrop);
              setBossClearTransitionActive(true);

              bossClearTransitionTimerRef.current = window.setTimeout(() => {
                bossClearTransitionTimerRef.current = null;
                setBossClearTransitionActive(false);
                setBossClearBackdrop(null);
                setPhase("story");
                window.setTimeout(() => storyPlayerRef.current?.continueAfterBossClear(), 0);
              }, 7200);
            }}
            onChapter1CombatFailed={() => {
              setPhase("story");
              requestStoryPreview("boss-dialogue");
            }}
          />
        </div>
      )}

      {bossClearTransitionActive && (
        <div
          className="chapter1-boss-clear-screen-transition"
          style={bossClearBackdrop ? { backgroundImage: `url(${JSON.stringify(bossClearBackdrop)})` } : undefined}
          aria-hidden="true"
        >
          <div className="chapter1-boss-clear-screen-color" />
        </div>
      )}

      <Chapter1StoryPlayer
        ref={storyPlayerRef}
        part={part}
        hidden={phase === "wave-guide" || phase === "wave" || phase === "wave-purification-effect" || phase === "wave-purification-exit" || phase === "boss"}
        previewRequest={previewRequest}
        onEvent={(event) => {
          if (event.type === "part1-complete") {
            setPreviewRequest(null);
            setPart(2);
            setPhase("story");
            return;
          }
          if (event.type === "wave-ready") {
            openWaveGuide();
            return;
          }
          if (event.type === "boss-ready") {
            setPreviewRequest(null);
            setPhase("boss");
            return;
          }
          if (event.type === "boss-phase2-dialogue-complete") {
            setPhase("boss");
            return;
          }
          if (event.type === "story-finished") {
            onStoryResult({
              outcome: "cleared",
              stage: 1,
              durationMs: Date.now() - startedAtRef.current,
            });
          }
        }}
      />
    </div>
  );
}

function OptionSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan-400"
      />
    </label>
  );
}

function getSavedPlayerName(): string {
  if (typeof localStorage === "undefined") return "ACE";
  return sanitizePlayerName(localStorage.getItem("retro_shooter_player_name") || "ACE");
}

function savePlayerName(name: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("retro_shooter_player_name", sanitizePlayerName(name));
}

function StoryResultPanel({ result, onRetry, onMenu }: { result: StoryResult | null; onRetry: () => void; onMenu: () => void }) {
  const cleared = result?.outcome === "cleared";
  const elapsed = result ? `${Math.floor(result.durationMs / 60000)}:${Math.floor((result.durationMs % 60000) / 1000).toString().padStart(2, "0")}` : "0:00";

  if (cleared) {
    return (
      <div className="w-full flex flex-col items-center text-center">
        <div className="mb-4 inline-block rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-1.5 font-mono text-[10px] font-black tracking-[0.22em] text-amber-200">
          CHAPTER 1 COMPLETE
        </div>
        <h2 className="mb-2 text-4xl font-mono font-black text-amber-200">CHAPTER 1 CLEAR</h2>
        <p className="mb-6 text-sm font-semibold text-slate-400">학사 시스템 정상화 · {elapsed}</p>

        <div className="mb-4 w-full rounded-xl border border-amber-300/25 bg-slate-950/80 p-5 text-left">
          <div className="mb-4 flex items-center justify-between gap-4">
            <span className="font-mono text-xs font-black tracking-widest text-slate-400">RECOVERED STARS</span>
            <strong className="text-sm font-black text-amber-200">출석의 별 · 과제의 별</strong>
          </div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="font-mono text-xs font-black tracking-widest text-slate-400">별 연결 상태</span>
            <strong className="font-mono text-lg font-black text-amber-200">2 / 6</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/3 rounded-full bg-amber-300" />
          </div>
        </div>

        <div className="mb-5 w-full rounded-xl border border-slate-700 bg-black/70 p-4 font-mono text-sm font-bold leading-7 text-slate-300">
          <div className="text-amber-200">학생증</div>
          <div>오염…… 추가…… 탐색…….</div>
          <div>다음 신호…… 확인…….</div>
        </div>

        <div className="mb-8 w-full border-y border-rose-500/35 bg-rose-950/20 px-4 py-3">
          <div className="font-mono text-[10px] font-black tracking-[0.28em] text-rose-300">NEXT</div>
          <div className="mt-1 font-mono text-xl font-black text-white">CHAPTER 2</div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <button onClick={onRetry} className="rounded-xl bg-amber-600 px-5 py-3.5 font-mono text-sm font-black text-black transition-all duration-200 hover:bg-amber-500">
            챕터 1 다시 하기
          </button>
          <button onClick={onMenu} className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-3.5 font-mono text-sm font-black text-white transition-all duration-200 hover:bg-slate-800">
            메인 메뉴
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center text-center">
      <div className="mb-4 inline-block rounded-full border border-rose-400/40 bg-rose-400/10 px-4 py-1.5 font-mono text-[10px] font-black tracking-widest text-rose-200">
        STORY MODE
      </div>
      <h2 className="mb-2 text-4xl font-mono font-black text-rose-400">MISSION FAILED</h2>
      <p className="mb-6 text-sm font-semibold text-slate-400">CHAPTER 1 · {elapsed}</p>
      <div className="mb-8 w-full rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs font-semibold leading-relaxed text-slate-300">
        스토리 진행이 중단되었습니다. 다시 도전할 수 있습니다.
      </div>
      <div className="grid w-full grid-cols-2 gap-3">
        <button onClick={onRetry} className="rounded-xl bg-cyan-700 px-5 py-3.5 font-mono text-sm font-black text-white transition-all duration-200 hover:bg-cyan-600">
          다시 하기
        </button>
        <button onClick={onMenu} className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-3.5 font-mono text-sm font-black text-white transition-all duration-200 hover:bg-slate-800">
          메인 메뉴
        </button>
      </div>
    </div>
  );
}

function getOrCreatePlayerId(): string {
  if (typeof localStorage === "undefined") return "LOCAL-PLAYER";
  const saved = localStorage.getItem("retro_shooter_player_id");
  if (saved) return saved;
  const id = `LOCAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  localStorage.setItem("retro_shooter_player_id", id);
  return id;
}

export default function App() {
  const { gameState, setGameState, stats, settings, updateSettings, shipColor, setShipColor, shipStyle, setShipStyle } = useAppStore();
  const [leaderboardReturnState, setLeaderboardReturnState] = useState<GameState>("MENU");
  const [showOptions, setShowOptions] = useState(false);
  const [playerName, setPlayerName] = useState(() => getSavedPlayerName());
  const [playerId] = useState(() => getOrCreatePlayerId());
  const [storyResult, setStoryResult] = useState<StoryResult | null>(null);
  const [showShipSelect, setShowShipSelect] = useState(false);
  // 시작 버튼을 한 번 누른 뒤에는 다른 화면을 다녀와도 모드 선택 메뉴 상태를 유지한다.
  const [mainMenuOpen, setMainMenuOpen] = useState(false);

  useEffect(() => {
    sfx.init();
    sfx.setVolumes(settings.bgmVolume, settings.sfxVolume);
    sfx.setCategoryVolumes(settings.playerShootVolume, settings.enemyHitVolume, settings.itemVolume);
  }, [settings]);

  const handleStartGame = () => {
    const normalizedName = sanitizePlayerName(playerName);
    setPlayerName(normalizedName);
    savePlayerName(normalizedName);
    useAppStore.setState({ gameMode: "arcade", gameState: "PLAYING" });
  };

  const handleStartStory = () => {
    setStoryResult(null);
    // 모드와 화면 상태를 한 번의 store 갱신으로 바꾼다.
    // STORY는 일반 게임의 PLAYING과 분리되어 있으므로 arcade 화면으로 갈 수 없다.
    useAppStore.setState({ gameMode: "story", gameState: "STORY" });
  };

  const handleShare = async () => {
    const text = `StarBlaze에서 ${stats.highScore}점을 기록했습니다.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "StarBlaze", text, url: window.location.href });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert("공유 문구를 복사했습니다.");
    }
  };

  const finishStory = (result: StoryResult) => {
    setStoryResult(result);
    setGameState("STORY_RESULT");
  };

  // 스토리 모드는 일반 게임과 완전히 다른 최상위 화면 상태다.
  // 따라서 스토리 버튼을 눌렀을 때 arcade GameCanvas가 먼저 렌더링될 수 없다.
  if (gameState === "STORY") {
    return <Chapter1StoryExperience shipStyle={shipStyle} onStoryResult={finishStory} />;
  }

  if (gameState === "PLAYING") {
    return (
      <div className="w-full h-screen bg-slate-950 flex items-center justify-center p-2">
        <GameCanvas mode="arcade" shipStyle={shipStyle} onStoryResult={finishStory} />
      </div>
    );
  }

  if (gameState === "DEV_MODE") {
    return <DevSandbox onBack={() => setGameState("MENU")} shipColor={shipColor} />;
  }

  if (gameState === "MENU" || gameState === "LEADERBOARD") {
    const menuInteractive = gameState === "MENU";

    return (
      <div className="relative h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
        <HobanwooMainMenu
          menuOpen={mainMenuOpen}
          onMenuOpenChange={setMainMenuOpen}
          interactive={menuInteractive}
          onStoryMode={() => {
            setShowOptions(false);
            setShowShipSelect(false);
            handleStartStory();
          }}
          onScoreMode={() => {
            setShowOptions(false);
            setShowShipSelect(false);
            handleStartGame();
          }}
          onRanking={() => {
            setMainMenuOpen(true);
            setShowOptions(false);
            setShowShipSelect(false);
            setLeaderboardReturnState("MENU");
            setGameState("LEADERBOARD");
          }}
          onSettings={() => {
            setShowShipSelect(false);
            setShowOptions((prev) => !prev);
          }}
          onShipSelect={() => {
            setShowOptions(false);
            setShowShipSelect(true);
          }}
          onDevMode={() => {
            setShowOptions(false);
            setShowShipSelect(false);
            setGameState("DEV_MODE");
          }}
        />

        {menuInteractive && showOptions && (
          <div className="hobanwooOptionsPanel absolute right-4 top-4 z-40 w-[min(92vw,320px)] rounded-2xl border p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-sm font-black text-slate-100">OPTIONS</div>
              <button onClick={() => setShowOptions(false)} className="text-xs font-mono text-slate-500 hover:text-slate-200">CLOSE</button>
            </div>
            <OptionSlider label="BGM" value={settings.bgmVolume} onChange={(value) => updateSettings({ bgmVolume: value })} />
            <OptionSlider label="SFX" value={settings.sfxVolume} onChange={(value) => updateSettings({ sfxVolume: value })} />
            <OptionSlider label="Player Shot" value={settings.playerShootVolume} onChange={(value) => updateSettings({ playerShootVolume: value })} />
            <OptionSlider label="Enemy Hit" value={settings.enemyHitVolume} onChange={(value) => updateSettings({ enemyHitVolume: value })} />
            <OptionSlider label="Item Pickup" value={settings.itemVolume} onChange={(value) => updateSettings({ itemVolume: value })} />
          </div>
        )}

        {menuInteractive && showShipSelect && (
          <HobanwooShipSelectPanel
            value={shipStyle}
            onChange={setShipStyle}
            onClose={() => setShowShipSelect(false)}
          />
        )}

        {gameState === "LEADERBOARD" && (
          <div className="hobanwooLeaderboardOverlay">
            <LeaderboardPanel onBack={() => setGameState(leaderboardReturnState)} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "radial-gradient(circle at center, #6366f1 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className={gameState === "GAME_OVER"
        ? "z-10 w-full max-w-[560px] max-h-[calc(100vh-0.5rem)] overflow-hidden bg-transparent border-0 rounded-none p-0 shadow-none flex flex-col items-center"
        : "z-10 w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center border-[rgba(99,102,241,0.2)]"
      }>


        {gameState === "GAME_OVER" && (
          <GameOverPanel
            onShare={handleShare}
            onLeaderboard={() => {
              setMainMenuOpen(true);
              setLeaderboardReturnState("GAME_OVER");
              setGameState("LEADERBOARD");
            }}
          />
        )}

        {gameState === "STORY_RESULT" && (
          <StoryResultPanel
            result={storyResult}
            onRetry={handleStartStory}
            onMenu={() => setGameState("MENU")}
          />
        )}

        {gameState === "PROFILE" && (
          <div className="w-full flex flex-col items-center">
            <h2 className="text-3xl font-black text-white font-mono mb-2">PROFILE</h2>
            <p className="text-xs text-slate-400 font-semibold mb-6 text-center">랭킹에 사용할 호출명을 따로 관리합니다.</p>

            <div className="w-full mb-5">
              <label className="block text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest mb-2">
                Nickname
              </label>
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                maxLength={16}
                className="w-full h-12 bg-slate-950 border border-slate-800 focus:border-cyan-400 outline-none rounded-lg px-4 font-mono text-slate-100 text-center uppercase tracking-wider"
              />
            </div>

            <div className="w-full mb-6 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest mb-1">Player ID</div>
              <div className="break-all font-mono text-xs font-bold text-emerald-300">{playerId}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => {
                  const normalizedName = sanitizePlayerName(playerName);
                  setPlayerName(normalizedName);
                  savePlayerName(normalizedName);
                  setGameState("MENU");
                }}
                className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg font-mono transition-all duration-200"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setPlayerName(getSavedPlayerName());
                  setGameState("MENU");
                }}
                className="px-5 py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-lg font-mono transition-all duration-200"
              >
                돌아가기
              </button>
            </div>
          </div>
        )}

        {gameState === "CUSTOMIZE" && (
          <div className="w-full flex flex-col items-center">
            <h2 className="text-3xl font-black text-white font-mono mb-2">기체 색상</h2>
            <p className="text-xs text-slate-400 font-semibold mb-8 text-center">플레이어 기체의 색상을 선택하세요.</p>

            <div className="grid grid-cols-2 gap-4 mb-6 w-full">
              {([
                { id: "blue", label: "블루", core: "#3b82f6" },
                { id: "red", label: "레드", core: "#ef4444" },
                { id: "green", label: "그린", core: "#10b981" },
                { id: "yellow", label: "옐로", core: "#fbbf24" },
              ] as const).map((color) => (
                <button
                  key={color.id}
                  onClick={() => setShipColor(color.id)}
                  className={`p-4 rounded-2xl flex flex-col items-center border-[3px] transition-all duration-300 ${shipColor === color.id ? "border-indigo-400 bg-slate-950 scale-105 shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "border-slate-800 bg-slate-950/40 opacity-70 hover:opacity-100"}`}
                >
                  <div className="w-10 h-10 rounded-full mb-2 shadow-inner" style={{ backgroundColor: color.core }} />
                  <span className="text-xs font-mono font-bold text-slate-300">{color.label}</span>
                </button>
              ))}
            </div>

            <div className="w-full border-t border-slate-850 pt-5 mb-8 text-center">
              {stats.highScore >= 100000 ? (
                <button
                  onClick={() => setShipColor("vanguard")}
                  className={`w-full p-4 rounded-xl flex items-center justify-between border-[3px] transition-all duration-300 ${shipColor === "vanguard" ? "border-purple-500 bg-slate-950 scale-102 shadow-[0_0_20px_rgba(168,85,247,0.35)]" : "border-slate-800 bg-slate-950/40 opacity-80 hover:opacity-100"}`}
                >
                  <span className="text-sm font-black font-mono text-purple-100">Vanguard</span>
                  <span className="text-[10px] text-purple-300 font-bold">해금 완료</span>
                </button>
              ) : (
                <div className="w-full p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 text-slate-500 text-xs font-mono">
                  Vanguard: 최고 점수 100,000 필요
                </div>
              )}
            </div>

            <button onClick={() => setGameState("MENU")} className="px-8 py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl font-mono w-full transition-all duration-200">
              돌아가기
            </button>
          </div>
        )}

        {gameState === "TUTORIAL" && (
          <div className="w-full">
            <h2 className="text-3xl font-black text-white font-mono mb-6 text-center">조작법</h2>
            <div className="space-y-5 text-sm text-slate-300">
              <div className="flex items-start gap-4 text-left">
                <div className="p-2.5 bg-indigo-950/50 rounded-xl border border-indigo-500/30 text-indigo-400 shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-0.5">모바일</h3>
                  <p className="text-xs text-slate-400">화면을 드래그해 이동합니다. 발사는 자동입니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left">
                <div className="p-2.5 bg-cyan-950/50 rounded-xl border border-cyan-500/30 text-cyan-400 shrink-0">
                  <Keyboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-0.5">PC</h3>
                  <p className="text-xs text-slate-400">방향키/WASD 이동, Space 발사, Shift/B/X 폭탄.</p>
                </div>
              </div>
            </div>

            <button onClick={() => setGameState("MENU")} className="mt-8 px-8 py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl font-mono w-full transition-all duration-200">
              돌아가기
            </button>
          </div>
        )}

      </div>


    </div>
  );
}
