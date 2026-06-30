import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Play, RefreshCw, Layers, Cpu, Shield, Sparkles } from 'lucide-react';
import { GameEngine, GameInput } from '../game/engine';
import { ShipColor } from '../types';

import { ENEMY_TYPES, MOTION_PROFILES, WAVES_DATA } from '../game/data/sandboxCatalog';
import { NORMAL_BOSS_PHASES, OVERDRIVE_BOSS_PHASES, OVERLORD_BOSS_PHASES } from '../game/data/bossPhaseCatalog';
interface DevSandboxProps {
  onBack: () => void;
  shipColor: ShipColor;
}

export function DevSandbox({ onBack, shipColor }: DevSandboxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Sandbox controller states
  const [selectedType, setSelectedType] = useState<string>('stationary');
  const [invincible, setInvincible] = useState<boolean>(true);
  const [sandboxMovement, setSandboxMovement] = useState<boolean>(false);
  const [selectedWave, setSelectedWave] = useState<number>(0);
  const [activeMode, setActiveMode] = useState<'single' | 'wave'>('single');
  const [sandboxBossPhaseLock, setSandboxBossPhaseLock] = useState<number>(-1);
  const [sandboxBossOverdrive, setSandboxBossOverdrive] = useState<boolean>(false);
  const [sandboxBossPhase3, setSandboxBossPhase3] = useState<boolean>(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Canvas size fitting
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (canvasRef.current) {
          canvasRef.current.width = entry.contentRect.width;
          canvasRef.current.height = entry.contentRect.height;
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    const engine = new GameEngine(canvasRef.current);
    engine.isSandbox = true;
    engine.sandboxEnemyType = selectedType;
    engine.sandboxInvincibility = invincible;
    engine.sandboxMovementEnabled = sandboxMovement;
    engine.sandboxMode = activeMode;
    engine.sandboxBossPhaseLock = sandboxBossPhaseLock;
    engine.sandboxBossOverdrive = sandboxBossOverdrive;

    engineRef.current = engine;
    engine.start(shipColor);

    return () => {
      resizeObserver.disconnect();
      engine.stop();
    };
  }, []);

  // Sync state parameters with engine in real-time on parameter updates
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.sandboxEnemyType = selectedType;
    engine.sandboxInvincibility = invincible;
    engine.sandboxMovementEnabled = sandboxMovement;
    engine.sandboxMode = activeMode;
    engine.sandboxBossPhaseLock = sandboxBossPhaseLock;
    engine.sandboxBossOverdrive = sandboxBossOverdrive;
    engine.sandboxBossPhase3 = sandboxBossPhase3;

    if (activeMode === 'single') {
       if (selectedType === 'boss') {
          // Sync directly with the active boss entity if it exists!
          if (engine.bossEntity && engine.bossEntity.active) {
            const oldPhase = engine.bossEntity.phase;
            const targetPhase = sandboxBossPhaseLock >= 1 ? sandboxBossPhaseLock : (sandboxBossPhase3 ? 20 : (sandboxBossOverdrive ? 14 : 4));
            
            engine.bossPhase3Active = sandboxBossPhase3;
            engine.bossPhase2Active = sandboxBossOverdrive && !sandboxBossPhase3;

            if (sandboxBossPhase3) {
              engine.bossEntity.width = 200;
              engine.bossEntity.height = 150;
            } else {
              engine.bossEntity.width = 120;
              engine.bossEntity.height = 90;
            }

            if (oldPhase !== targetPhase) {
               engine.bossEntity.phase = targetPhase;
               engine.bossEntity.patternTimer = 0;
               engine.bullets = []; // Clear current bullets to make practicing extremely responsive and direct!
            }
          } else {
            engine.enemies = []; // Force reload boss if not active
          }
       } else {
          // Reset current active enemies array to immediately reload changes on sandbox type swap
          if (engine.enemies.length === 0 || engine.enemies[0].type !== selectedType || engine.sandboxMovementEnabled !== sandboxMovement || engine.sandboxMode !== 'single') {
            engine.enemies = [];
          }
       }
    }
  }, [selectedType, invincible, sandboxMovement, activeMode, sandboxBossPhaseLock, sandboxBossOverdrive, sandboxBossPhase3]);

  // Support inputs in sandbox
  useEffect(() => {
    const inputState: GameInput = { up: false, down: false, left: false, right: false, fire: false, useBomb: false };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'ArrowUp' || code === 'KeyW') inputState.up = true;
      if (code === 'ArrowDown' || code === 'KeyS') inputState.down = true;
      if (code === 'ArrowLeft' || code === 'KeyA') inputState.left = true;
      if (code === 'ArrowRight' || code === 'KeyD') inputState.right = true;
      if (code === 'Space') inputState.fire = true;
      if (engineRef.current) engineRef.current.input = inputState;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'ArrowUp' || code === 'KeyW') inputState.up = false;
      if (code === 'ArrowDown' || code === 'KeyS') inputState.down = false;
      if (code === 'ArrowLeft' || code === 'KeyA') inputState.left = false;
      if (code === 'ArrowRight' || code === 'KeyD') inputState.right = false;
      if (code === 'Space') inputState.fire = false;
      if (engineRef.current) engineRef.current.input = inputState;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleReset = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.enemies = [];
      engine.bullets = [];
      engine.particles = [];
      engine.inkClouds = [];
    }
  };

  const currentDetails = ENEMY_TYPES.find(t => t.id === selectedType);

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col p-4 md:p-6 overflow-hidden select-none">
      
      {/* Top Header Navigation Pane */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl px-6 py-3.5 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-mono font-black text-rose-500 tracking-tight flex items-center gap-2">
              <Cpu size={22} className="text-rose-400 animate-spin-slow" /> STAGE DEVELOPER LAB
            </h1>
            <p className="text-[10px] font-mono font-semibold text-slate-400">몬스터 유형 분석 및 전대 대열 배치 시뮬레이터</p>
          </div>
        </div>

        <button 
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono font-bold rounded-xl transition"
        >
          <RefreshCw size={14} /> 샌드박스 비우기
        </button>
      </div>

      {/* Main Splitscreen Grid Area */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden min-h-0">
        
        {/* Left Column - Diagnostic Live Viewport Area */}
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative">
          
          <div className="flex justify-between items-center mb-2.5 shrink-0">
            <span className="font-mono text-[10px] md:text-xs font-black text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              LIVE SIMULATION
            </span>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setSandboxMovement(!sandboxMovement)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] md:text-[11px] font-mono font-black rounded-full border transition ${sandboxMovement ? 'bg-teal-950/40 border-teal-500/30 text-teal-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                <Play size={11} className={sandboxMovement ? 'animate-pulse' : ''} />
                적 움직임: {sandboxMovement ? "실제 패턴 구동" : "동작 정지"}
              </button>

              <button 
                onClick={() => setInvincible(!invincible)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] md:text-[11px] font-mono font-black rounded-full border transition ${invincible ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-400' : 'bg-rose-950/40 border-rose-500/30 text-rose-400'}`}
              >
                <Shield size={11} />
                무적: {invincible ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* Actual canvas simulation engine context */}
          <div className="flex-grow bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden" ref={containerRef}>
            <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair touch-none" />
            <div className="absolute bottom-4 left-4 font-mono text-[9px] text-slate-500 pointer-events-none bg-black/50 p-2 rounded border border-slate-800">
              [W, A, S, D / 방향키] - 테스터 기체 이동<br />
              [SPACEBAR] - 빔 발사장전 (격추 테스트)
            </div>
          </div>
          
          <div className="mt-3 text-center text-slate-500 text-[10px] font-mono leading-relaxed">
            * 피격 시 기체가 파괴되거나 샌드박스의 훈련대상이 사망할 경우, 자동으로 즉시 동일한 몬스터가 무제한 리스폰됩니다.
          </div>
        </div>

        {/* Right Column - Controls and Configuration Dash */}
        <div className="md:col-span-7 flex flex-col gap-4 overflow-y-auto min-h-0 pr-1 select-text">
          
          {/* Active Simulation Mode status banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span className="text-xs font-mono font-bold text-slate-400">현재 시제품 검사 모드:</span>
            </div>
            <div className="flex gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black border transition ${activeMode === 'single' ? 'bg-indigo-950/50 border-rose-500/40 text-rose-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                단일 적 분석 (SPECTATING)
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black border transition ${activeMode === 'wave' ? 'bg-amber-950/50 border-amber-500/40 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                웨이브 배치 (WAVELOCK)
              </span>
            </div>
          </div>

          {/* Enemy selector deck */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shrink-0">
            <h2 className="text-sm font-mono font-black text-slate-200 mb-3 flex items-center gap-2">
              <Layers size={18} className="text-rose-400" /> 1. 분석 대상 단일 적 선택 (Spectate Target)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {ENEMY_TYPES.map(type => {
                const isActive = activeMode === 'single' && selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type.id);
                      setActiveMode('single');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 justify-center transition-all duration-200 ${isActive ? 'bg-indigo-950/40 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] text-rose-400 font-bold' : 'bg-slate-950 hover:bg-slate-800/60 border-slate-800 text-slate-400'}`}
                  >
                    <span className={`text-[11px] font-mono truncate ${isActive ? 'text-rose-400' : 'text-slate-300'}`}>{type.name}</span>
                    <span className="text-[9px] text-slate-500 truncate">{type.bullet}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diagnostics readout for current target */}
          {currentDetails && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-2 mb-1">
                <Cpu size={16} className="text-yellow-400 animate-pulse" />
                <span className="font-mono text-xs font-black text-slate-200">{currentDetails.name} 패턴 정보</span>
                {activeMode !== 'single' && (
                  <span className="ml-auto text-[9px] font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    단일적 선택 시 활성화
                  </span>
                )}
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed font-semibold">
                <strong className="text-rose-400 font-mono text-xs block mb-0.5">[알고리즘 행동 특징]</strong>
                {currentDetails.description}
              </p>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-850 mt-1 mb-1">
                <div>순수 투사체 특징: <span className="text-slate-200 font-bold">{currentDetails.bullet}</span></div>
                <div>엔진 객체 ID: <code className="text-yellow-500 font-bold">"{selectedType}"</code></div>
              </div>
            </div>
          )}

          {/* Boss Specific practice controller panel */}
          {activeMode === 'single' && selectedType === 'boss' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.06)]">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="font-mono text-xs font-black text-rose-400">보스 전용 전투 터미널 (Boss Combat Terminal)</span>
              </div>

              {/* Step 1: Boss Combat Phase Option */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-bold block">1단계: 보스 핵심 반응로 동력 상태</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setSandboxBossPhase3(false);
                      setSandboxBossOverdrive(false);
                      if (sandboxBossPhaseLock > 13) {
                        setSandboxBossPhaseLock(-1);
                      }
                    }}
                    className={`py-2 px-1 rounded-xl border font-mono text-[10px] sm:text-xs flex flex-col items-center justify-center transition-all duration-200 ${!sandboxBossOverdrive && !sandboxBossPhase3 ? 'bg-indigo-950/40 border-cyan-500 text-cyan-400 font-black' : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'}`}
                  >
                    <span className="font-extrabold text-[10px] sm:text-[11px]">기동 1페이즈</span>
                    <span className="text-[8px] opacity-80 font-semibold text-slate-500">HP 3000 / 기본</span>
                  </button>
                  <button
                    onClick={() => {
                      setSandboxBossPhase3(false);
                      setSandboxBossOverdrive(true);
                      if (sandboxBossPhaseLock < 14 || (sandboxBossPhaseLock > 19 && (sandboxBossPhaseLock < 42 || sandboxBossPhaseLock > 46))) {
                        setSandboxBossPhaseLock(-1);
                      }
                    }}
                    className={`py-2 px-1 rounded-xl border font-mono text-[10px] sm:text-xs flex flex-col items-center justify-center transition-all duration-200 ${sandboxBossOverdrive && !sandboxBossPhase3 ? 'bg-indigo-950/40 border-rose-500 text-rose-400 font-black' : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'}`}
                  >
                    <span className="font-extrabold text-[10px] sm:text-[11px]">과충전 2페이즈</span>
                    <span className="text-[8px] opacity-80 font-semibold text-slate-500">HP 5000 / 광폭</span>
                  </button>
                  <button
                    onClick={() => {
                      setSandboxBossPhase3(true);
                      setSandboxBossOverdrive(false);
                      if (
                        sandboxBossPhaseLock < 20 ||
                        sandboxBossPhaseLock > 39 ||
                        [22, 25, 26, 27, 29, 30, 31, 33, 35, 38, 39].includes(sandboxBossPhaseLock)
                      ) {
                        setSandboxBossPhaseLock(-1);
                      }
                    }}
                    className={`py-2 px-1 rounded-xl border font-mono text-[10px] sm:text-xs flex flex-col items-center justify-center transition-all duration-200 ${sandboxBossPhase3 ? 'bg-purple-950/40 border-purple-500 text-purple-400 font-black animate-pulse' : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'}`}
                  >
                    <span className="font-extrabold text-[10px] sm:text-[11px]">멸망 3페이즈</span>
                    <span className="text-[8px] opacity-80 font-semibold text-slate-500">HP 8000 / 멸망</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Specific Bullet Pattern Pinpoint Lock */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-bold block">2단계: 정밀 연습할 공격 패턴 잠금 (Pinpoint Pattern Select)</span>
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1 bg-slate-950 p-2 rounded-xl border border-slate-850">
                  {/* Option for rotating */}
                  <button
                    onClick={() => setSandboxBossPhaseLock(-1)}
                    className={`p-2 rounded-lg border text-left font-mono text-[10px] flex flex-col transition-all duration-150 ${sandboxBossPhaseLock === -1 ? 'bg-indigo-950/80 border-indigo-500/80 text-indigo-300 font-black' : 'bg-slate-900 hover:bg-slate-850 border-transparent text-slate-400'}`}
                  >
                    <span className="font-black text-[10px]">실시간 순환 패턴 (No Lock)</span>
                    <span className="text-[8px] text-slate-500">실전처럼 정해진 주기마다 다음 패턴으로 연쇄 자동 전환</span>
                  </button>
                  
                  {/* Normal Stage Patterns */}
                  <div className="text-[9px] font-black font-mono text-slate-500 border-b border-slate-850 py-1 px-1">1페이즈 기본 무기 전열 (Normal Patterns)</div>
                  {NORMAL_BOSS_PHASES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSandboxBossPhaseLock(p.id);
                        setSandboxBossOverdrive(false);
                      }}
                      className={`p-1.5 sm:p-2 rounded-lg border text-left font-mono text-[9px] sm:text-[10px] flex flex-col transition-all duration-150 ${sandboxBossPhaseLock === p.id ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-300 font-bold' : 'bg-slate-900 hover:bg-slate-850 border-transparent text-slate-400'}`}
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-[8px] text-slate-500">{p.desc}</span>
                    </button>
                  ))}

                  {/* Overdrive Stage Patterns */}
                  <div className="text-[9px] font-black font-mono text-rose-500/80 border-b border-slate-850 py-1 px-1">2페이즈 전율 오버드라이브 무장 (Overdrive patterns)</div>
                  {OVERDRIVE_BOSS_PHASES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSandboxBossPhaseLock(p.id);
                        setSandboxBossPhase3(false);
                        setSandboxBossOverdrive(true);
                      }}
                      className={`p-1.5 sm:p-2 rounded-lg border text-left font-mono text-[9px] sm:text-[10px] flex flex-col transition-all duration-150 ${sandboxBossPhaseLock === p.id ? 'bg-rose-950/60 border-rose-500/80 text-rose-300 font-bold' : 'bg-slate-900 hover:bg-slate-850 border-transparent text-slate-400'}`}
                    >
                      <span className="font-semibold text-rose-200">{p.name}</span>
                      <span className="text-[8px] text-slate-500">{p.desc}</span>
                    </button>
                  ))}

                  {/* Overlord Stage Patterns */}
                  <div className="text-[9px] font-black font-mono text-purple-400 border-b border-slate-850 py-1 px-1">3페이즈 멸망 디멘션 오버로드 무장 (Overlord patterns)</div>
                  {OVERLORD_BOSS_PHASES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSandboxBossPhaseLock(p.id);
                        setSandboxBossPhase3(true);
                        setSandboxBossOverdrive(false);
                      }}
                      className={`p-1.5 sm:p-2 rounded-lg border text-left font-mono text-[9px] sm:text-[10px] flex flex-col transition-all duration-150 ${sandboxBossPhaseLock === p.id ? 'bg-purple-950/60 border-purple-500/80 text-purple-300 font-bold' : 'bg-slate-900 hover:bg-slate-850 border-transparent text-slate-400'}`}
                    >
                      <span className="font-semibold text-purple-200">{p.name}</span>
                      <span className="text-[8px] text-slate-500">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Pattern/State Button */}
              <button
                onClick={() => {
                  if (engineRef.current) {
                    engineRef.current.enemies = [];
                    engineRef.current.bullets = [];
                  }
                }}
                className="w-full py-2 bg-rose-950/40 hover:bg-rose-950 border border-rose-500/30 text-rose-300 font-black text-xs font-mono rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <RefreshCw size={12} className="text-rose-400 animate-spin" />
                보스 코어 재설정 및 보스전 리셋 (Instantly Reset Boss)
              </button>
            </div>
          )}

          {/* 1.5 Flight Motion Profile Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shrink-0">
            <h2 className="text-sm font-mono font-black text-slate-200 mb-2 border-b border-slate-850 pb-2 flex items-center gap-2">
              <Shield size={18} className="text-emerald-400" /> 1.5 우주 항만 기동 모션 메트릭스 (AI Flight Motions)
            </h2>
            <p className="text-[11px] text-slate-400 mb-3 font-semibold">
              이 시뮬레이터에 프로그래밍된 몬스터 AI 제어 제동 알고리즘입니다. 단일 분석 적의 현재 기동 코드가 실시간 라이브로 트래킹됩니다.
            </p>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {MOTION_PROFILES.map(profile => {
                const isActive = activeMode === 'single' && profile.targets.includes(selectedType);
                return (
                  <div 
                    key={profile.id}
                    className={`p-2.5 rounded-xl border transition-all duration-300 flex flex-col gap-1.5 ${isActive ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.08)]' : 'bg-slate-950/60 border-slate-850 opacity-45'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] font-black font-mono ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {profile.name}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                          ● ACTIVE LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      {profile.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Real-time Wave Deployment Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-grow flex flex-col justify-between min-h-[240px]">
            <div>
              <h2 className="text-sm font-mono font-black text-slate-200 mb-2.5 flex items-center gap-2 border-b border-slate-850 pb-2.5">
                <Sparkles size={18} className="text-yellow-400" /> 2. 실시간 웨이브 배치 시뮬레이터 (Wave Simulator)
              </h2>
              <p className="text-[11px] font-semibold text-slate-400 mb-3 leading-relaxed">
                인게임 플레이 당시 등장하는 총 18개 유형의 정교하고 완벽한 대칭형 몬스터 군집 대열 기법을 원클릭으로 화면에 배치하고, 전멸 시 자동으로 동일 대칭 대열로 무한 루프 리폰하여 실시간으로 관찰할 수 있게 지원합니다.
              </p>
              
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5 flex-grow">
                  <label className="text-xs font-bold text-slate-300 font-mono">시뮬레이션 소환 대상 그룹 대열:</label>
                  <select 
                    value={selectedWave} 
                    onChange={(e) => setSelectedWave(parseInt(e.target.value))}
                    className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2.5 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 w-full"
                  >
                    {WAVES_DATA.map(w => (
                       <option key={w.id} value={w.id}>
                          [웨이브 {w.id}] {w.title}
                       </option>
                    ))}
                  </select>
                </div>

                {/* Selected Wave description box */}
                <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-3">
                  <span className="text-[10px] text-yellow-400 font-black font-mono block mb-1">웨이브 구성 정보:</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                    {WAVES_DATA[selectedWave].desc}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                 setActiveMode('wave');
                 if (engineRef.current) {
                    engineRef.current.triggerSandboxWave(selectedWave);
                 }
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-black rounded-xl transition duration-200 shadow-md transform hover:-translate-y-0.5 shrink-0"
            >
              <Sparkles size={14} className="animate-spin-slow text-yellow-300" />
              선택 대열 몬스터 편대 즉시배치 소환 (Deploy Active Wave)
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
