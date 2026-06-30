import React, { useEffect, useRef, useState } from "react";
import { HelpCircle, Keyboard, Palette, Play, Shield, Smartphone, Trophy, Volume2, VolumeX } from "lucide-react";
import { useAppStore } from "./store";
import { GameEngine, GameInput } from "./game/engine";
import { sfx } from "./game/AudioSystem";
import { ShipColor } from "./types";
import { DevSandbox } from "./components/DevSandbox";
import { GameOverPanel } from "./components/GameOverPanel";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { createLocalRunSession } from "./services/leaderboard";

const MAX_HP = 3;

function MenuButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-64 p-4 bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-xl transition-all duration-300 border border-slate-700 hover:border-purple-500 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] font-mono text-lg font-bold"
    >
      <Icon size={24} className="text-purple-400" />
      {label}
    </button>
  );
}

function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<GameInput>({ up: false, down: false, left: false, right: false, fire: false, useBomb: false });
  const isPausedRef = useRef(false);
  const runSessionRef = useRef(createLocalRunSession());
  const runStartedAtRef = useRef(Date.now());

  const { setGameState, setScore, shipColor, updateStats, setLastRun, score } = useAppStore();
  const [hp, setHp] = useState(MAX_HP);
  const [power, setPower] = useState(1);
  const [stage, setStage] = useState(1);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [bossPhase2Active, setBossPhase2Active] = useState(false);
  const [bossPhase3Active, setBossPhase3Active] = useState(false);
  const [isBossCutscene, setIsBossCutscene] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stageClearChoices, setStageClearChoices] = useState<string[] | null>(null);
  const [onSelectReward, setOnSelectReward] = useState<((selected: string) => void) | null>(null);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (engineRef.current) engineRef.current.paused = isPaused;
    if (isPaused) sfx.pauseAll();
    else sfx.resumeAll();
  }, [isPaused]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (canvasRef.current) {
          canvasRef.current.width = entry.contentRect.width;
          canvasRef.current.height = entry.contentRect.height;
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;
    engine.paused = isPausedRef.current;

    const localRunSession = createLocalRunSession();
    runSessionRef.current = localRunSession;
    runStartedAtRef.current = localRunSession.startedAt;
    setLastRun(null);

    engine.onScoreUpdate = setScore;
    engine.onGameOver = (finalScore) => {
      const finishedAt = Date.now();
      setLastRun({
        score: finalScore,
        stage: engine.stage,
        shipColor,
        durationMs: finishedAt - runStartedAtRef.current,
        finishedAt,
        runSession: runSessionRef.current,
      });
      setGameState("GAME_OVER");
      const currentStats = useAppStore.getState().stats;
      updateStats({
        highScore: Math.max(currentStats.highScore, finalScore),
        lastPlayed: Date.now(),
      });
    };
    engine.onCutsceneChange = setIsBossCutscene;
    engine.onStageClear = (choices, onSelect) => {
      setStageClearChoices(choices);
      setOnSelectReward(() => onSelect);
    };

    const hudInterval = setInterval(() => {
      if (engine.player) {
        setHp(Math.max(0, Math.min(MAX_HP, engine.player.hp)));
        setPower(engine.player.powerLevel);
      }
      setStage(engine.stage);
      setBossPhase2Active(engine.bossPhase2Active);
      setBossPhase3Active(engine.bossPhase3Active);
      setBossHp(engine.bossActive && engine.bossEntity ? engine.bossEntity.hp : null);
    }, 100);

    engine.start(shipColor);

    return () => {
      resizeObserver.disconnect();
      clearInterval(hudInterval);
      engine.stop();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }
      if (isPausedRef.current) return;

      if (event.code === "ArrowUp" || event.code === "KeyW") inputRef.current.up = true;
      if (event.code === "ArrowDown" || event.code === "KeyS") inputRef.current.down = true;
      if (event.code === "ArrowLeft" || event.code === "KeyA") inputRef.current.left = true;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputRef.current.right = true;
      if (event.code === "Space") inputRef.current.fire = true;
      if (engineRef.current) engineRef.current.input = inputRef.current;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isPausedRef.current) return;
      if (event.code === "ArrowUp" || event.code === "KeyW") inputRef.current.up = false;
      if (event.code === "ArrowDown" || event.code === "KeyS") inputRef.current.down = false;
      if (event.code === "ArrowLeft" || event.code === "KeyA") inputRef.current.left = false;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputRef.current.right = false;
      if (event.code === "Space") inputRef.current.fire = false;
      if (engineRef.current) engineRef.current.input = inputRef.current;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleTouchStart = () => {
    if (!isPausedRef.current) inputRef.current.fire = true;
  };

  const handleTouchEnd = () => {
    inputRef.current.fire = false;
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.up = false;
    inputRef.current.down = false;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!canvasRef.current || !engineRef.current || isPausedRef.current) return;
    const touch = event.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    engineRef.current.player.x = x - engineRef.current.player.width / 2;
    engineRef.current.player.y = y - engineRef.current.player.height * 2.2;
  };

  const bossMaxHp = bossPhase3Active ? 8000 : bossPhase2Active ? 5000 : 3000;
  const bossLabel = bossPhase3Active ? "BOSS PHASE 3" : bossPhase2Active ? "BOSS PHASE 2" : "BOSS PHASE 1";

  return (
    <div className="relative w-full h-full max-w-2xl mx-auto bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="block touch-none flex-grow"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10 bg-gradient-to-b from-slate-950/80 to-transparent">
        <div>
          <div className="font-mono text-2xl text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]">
            점수 {score.toString().padStart(6, "0")}
          </div>
          <div className="font-mono text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">STAGE {stage}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1">
            {[...Array(MAX_HP)].map((_, i) => (
              <Shield key={i} size={18} className={i < hp ? "text-rose-500 fill-rose-500" : "text-slate-800 fill-transparent"} />
            ))}
          </div>
          <span className="font-mono text-[10px] text-yellow-300 border border-yellow-300/40 bg-yellow-400/10 px-2 py-0.5 rounded-md font-extrabold uppercase">
            POWER LV {power}
          </span>
        </div>
      </div>

      {bossHp !== null && (
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
            <h1 className="text-5xl font-black text-rose-500 font-mono tracking-widest">BOSS STAGE</h1>
            <p className="text-rose-200 font-mono text-sm mt-2">전투 함선 접근 중</p>
          </div>
        </div>
      )}

      {stageClearChoices && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-50">
          <div className="text-center max-w-md w-full">
            <div className="inline-block px-3 py-1 mb-3 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 font-mono text-[10px] uppercase tracking-widest font-black">
              SECTOR CLEAR
            </div>
            <h2 className="text-3xl font-black text-white font-mono tracking-widest">보상 선택</h2>
            <p className="text-slate-400 text-xs mt-2">다음 구간을 위한 강화 하나를 고르세요.</p>

            <div className="mt-7 flex flex-col gap-3 w-full">
              {stageClearChoices.map((choice, i) => {
                const detail = getRewardDetail(choice);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      onSelectReward?.(choice);
                      setStageClearChoices(null);
                      setOnSelectReward(null);
                      sfx.powerup();
                    }}
                    className={`border text-left p-4 rounded-xl cursor-pointer transition-all duration-200 flex flex-col gap-1 ${detail.className}`}
                  >
                    <span className="font-mono text-sm font-black tracking-wider">{detail.title}</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed">{detail.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isPaused && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 pointer-events-auto">
          <div className="text-center max-w-sm w-full bg-slate-900 border-2 border-purple-500/30 p-8 rounded-3xl shadow-[0_0_25px_rgba(168,85,247,0.25)]">
            <div className="inline-block px-3 py-1 mb-4 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 font-mono text-[10px] uppercase tracking-widest font-black">
              GAME PAUSED
            </div>
            <h2 className="text-2xl font-black text-slate-100 font-mono tracking-wider mb-8">일시 정지</h2>
            <div className="flex flex-col gap-3 w-full">
              <button onClick={() => setIsPaused(false)} className="w-full p-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-100 rounded-xl transition-all duration-300 border border-cyan-400 font-mono text-base font-bold">
                계속하기
              </button>
              <button
                onClick={() => {
                  sfx.resumeAll();
                  engineRef.current?.stop();
                  setGameState("MENU");
                }}
                className="w-full p-4 bg-slate-950 hover:bg-slate-800 text-rose-400 hover:text-rose-300 rounded-xl transition-all duration-300 border border-slate-800 hover:border-rose-500 font-mono text-sm font-bold"
              >
                메인 메뉴
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getRewardDetail(choice: string) {
  if (choice.includes("유도탄")) {
    return {
      title: "유도탄 드론",
      description: "가까운 적을 추적하는 보조탄을 발사합니다.",
      className: "border-orange-500/30 bg-orange-950/20 hover:border-orange-400 text-orange-100",
    };
  }
  if (choice.includes("레이저")) {
    return {
      title: "레이저 빔",
      description: "주기적으로 관통 빔을 발사합니다.",
      className: "border-purple-500/30 bg-purple-950/20 hover:border-purple-400 text-purple-100",
    };
  }
  if (choice.includes("방어")) {
    return {
      title: "방어 드론",
      description: "근처 적탄을 지웁니다.",
      className: "border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-400 text-emerald-100",
    };
  }
  if (choice.includes("회전")) {
    return {
      title: "회전 위성",
      description: "주변 적에게 접촉 피해를 줍니다.",
      className: "border-yellow-500/30 bg-yellow-950/20 hover:border-yellow-400 text-yellow-100",
    };
  }
  if (choice.includes("수리")) {
    return {
      title: "기체 수리",
      description: "체력을 1 회복합니다.",
      className: "border-rose-500/30 bg-rose-950/20 hover:border-rose-400 text-rose-100",
    };
  }
  return {
    title: "공격 드론",
    description: "전방 보조탄을 추가합니다.",
    className: "border-cyan-500/30 bg-cyan-950/20 hover:border-cyan-400 text-cyan-100",
  };
}

export default function App() {
  const { gameState, setGameState, stats, settings, updateSettings, shipColor, setShipColor } = useAppStore();

  useEffect(() => {
    sfx.init();
    sfx.setVolumes(settings.bgmVolume, settings.sfxVolume);
  }, [settings]);

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

  if (gameState === "PLAYING") {
    return (
      <div className="w-full h-screen bg-slate-950 flex items-center justify-center p-2">
        <GameCanvas />
      </div>
    );
  }

  if (gameState === "DEV_MODE") {
    return <DevSandbox onBack={() => setGameState("MENU")} shipColor={shipColor} />;
  }

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "radial-gradient(circle at center, #6366f1 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="z-10 w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center border-[rgba(99,102,241,0.2)]">
        {gameState === "MENU" && (
          <>
            <div className="text-center mb-10">
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 font-mono tracking-tighter mb-2 drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]">
                STARBLAZE
              </h1>
              <p className="text-slate-400 text-xs font-semibold tracking-wider mb-4 font-mono">RETRO ARCADE FIGHTER</p>
              <div className="bg-slate-950 rounded-full px-5 py-2 inline-block border border-slate-800">
                <span className="font-mono text-sm text-yellow-400 font-extrabold">최고 점수 {stats.highScore.toString().padStart(6, "0")}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <MenuButton icon={Play} label="게임 시작" onClick={() => setGameState("PLAYING")} />
              <button
                onClick={() => setGameState("DEV_MODE")}
                className="flex items-center justify-center gap-2.5 w-64 p-3.5 bg-slate-950/95 hover:bg-slate-900 text-rose-400 hover:text-rose-300 rounded-xl transition-all duration-300 border border-slate-800 hover:border-rose-500/60 font-mono text-sm font-bold"
              >
                개발자 오피스
              </button>
              <div className="grid grid-cols-2 gap-3 w-64 mt-1">
                <button onClick={() => setGameState("CUSTOMIZE")} className="p-3 bg-slate-950 rounded-xl hover:bg-slate-800 flex flex-col items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-slate-200 border border-slate-800 transition-all duration-200">
                  <Palette size={18} className="text-purple-400" /> 기체 색상
                </button>
                <button onClick={() => setGameState("TUTORIAL")} className="p-3 bg-slate-950 rounded-xl hover:bg-slate-800 flex flex-col items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-slate-200 border border-slate-800 transition-all duration-200">
                  <HelpCircle size={18} className="text-cyan-400" /> 조작법
                </button>
              </div>
            </div>

            <button onClick={() => setGameState("LEADERBOARD")} className="mt-8 text-xs font-mono font-semibold text-slate-500 hover:text-slate-300 underline underline-offset-4 transition-all duration-150">
              랭킹 보기
            </button>
          </>
        )}

        {gameState === "GAME_OVER" && <GameOverPanel onShare={handleShare} />}

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
                  <p className="text-xs text-slate-400">방향키 또는 WASD로 이동하고 Space로 발사합니다.</p>
                </div>
              </div>
            </div>

            <button onClick={() => setGameState("MENU")} className="mt-8 px-8 py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl font-mono w-full transition-all duration-200">
              돌아가기
            </button>
          </div>
        )}

        {gameState === "LEADERBOARD" && <LeaderboardPanel onBack={() => setGameState("MENU")} />}
      </div>

      {gameState === "MENU" && (
        <div className="absolute bottom-4 right-4 flex gap-3">
          <button
            onClick={() => updateSettings({ bgmVolume: settings.bgmVolume > 0 ? 0 : 0.5, sfxVolume: settings.sfxVolume > 0 ? 0 : 0.8 })}
            className="p-3 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 shadow-lg transition-all duration-200"
          >
            {settings.bgmVolume > 0 ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
        </div>
      )}
    </div>
  );
}
