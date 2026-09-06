import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { sfx } from "../../game/AudioSystem";
import {
  saveStoryCheckpoint,
  type StoryCheckpoint,
} from "../../story/storyProgress";
import "./chapter2StoryExperience.css";

interface Chapter2StoryStateMessage {
  segmentId?: string;
  index?: number;
  sceneKey?: string;
  completed?: boolean;
  integrationGate?: {
    id?: string;
    title?: string;
    subtitle?: string;
  } | null;
}

interface Chapter2StoryNavigationSection {
  index: number;
  title: string;
}

interface Chapter2StoryNavigationGate {
  index: number;
  id: "wave" | "boss" | string;
  title: string;
}

interface Chapter2StoryNavigation {
  itemCount: number;
  sections: Chapter2StoryNavigationSection[];
  gates: Chapter2StoryNavigationGate[];
}

interface Chapter2WaveControlCommand {
  id: number;
  action: "skip" | "jump";
  waveIndex?: number;
}

interface Chapter2BossControlCommand {
  id: number;
  action: "skip" | "jumpPattern" | "scene";
  patternId?: number;
  scene?: "phase1Intro" | "phaseTransition" | "phase2Intro" | "clear";
}

interface Chapter2BridgeMessage {
  channel?: string;
  type?: string;
  effectId?: string;
  state?: Chapter2StoryStateMessage;
  gateId?: "wave" | "boss" | string;
  title?: string;
  subtitle?: string;
  code?: string;
  navigation?: Chapter2StoryNavigation;
}

interface Chapter2IntegrationGate {
  id: "wave" | "boss" | string;
  title: string;
  subtitle: string;
}

interface Chapter2WaveRenderProps {
  startWaveIndex: number;
  controlCommand: Chapter2WaveControlCommand | null;
  inputEnabled: boolean;
  purificationExit: boolean;
  onPlayerPositionChange: (position: { xPercent: number; yPercent: number }) => void;
  onWaveIndexChange: (waveIndex: number) => void;
  onComplete: () => void;
  onFailed: (waveIndex: number) => void;
  onExitToMenu: (waveIndex: number) => void;
}

interface Chapter2BossRenderProps {
  startPatternId: number | null;
  controlCommand: Chapter2BossControlCommand | null;
  inputEnabled: boolean;
  onComplete: () => void;
  onFailed: () => void;
  onExitToMenu: () => void;
}

interface Chapter2StoryExperienceProps {
  onStoryResult: (result: { outcome: "cleared" | "failed"; stage: number; durationMs: number }) => void;
  onMenu: () => void;
  resumeCheckpoint: StoryCheckpoint | null;
  renderWaveCombat?: (props: Chapter2WaveRenderProps) => ReactNode;
  renderBossCombat?: (props: Chapter2BossRenderProps) => ReactNode;
}

const BRIDGE_CHANNEL = "sky-strike-chapter2-story";
const STORY_SEGMENT = "chapter2_full";
const CHAPTER2_WAVE_COUNT = 20;

function chapter2CheckpointFromState(state: Chapter2StoryStateMessage | undefined): StoryCheckpoint | null {
  const index = Number(state?.index);
  if (!Number.isInteger(index) || index < 0) return null;
  return {
    version: 1,
    chapter: 2,
    kind: "story",
    part: 1,
    segment: String(state?.segmentId || STORY_SEGMENT),
    dialogueIndex: index,
    completionAction: "chapter2-item-index",
    savedAt: Date.now(),
  };
}

function chapter2WaveCheckpoint(waveIndex: number): StoryCheckpoint {
  return {
    version: 1,
    chapter: 2,
    kind: "wave",
    waveIndex: Math.max(0, Math.floor(waveIndex)),
    savedAt: Date.now(),
  };
}

function chapter2BossCheckpoint(): StoryCheckpoint {
  return { version: 1, chapter: 2, kind: "boss", savedAt: Date.now() };
}

export function Chapter2StoryExperience({
  onStoryResult,
  onMenu,
  resumeCheckpoint,
  renderWaveCombat,
  renderBossCombat,
}: Chapter2StoryExperienceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startedAtRef = useRef(Date.now());
  const restoredRef = useRef(false);
  const completedRef = useRef(false);
  const lastCheckpointSignatureRef = useRef("");
  const resumeWavePendingRef = useRef(resumeCheckpoint?.chapter === 2 && resumeCheckpoint.kind === "wave");
  const resumeBossPendingRef = useRef(resumeCheckpoint?.chapter === 2 && resumeCheckpoint.kind === "boss");
  const currentWaveIndexRef = useRef(
    resumeCheckpoint?.chapter === 2 && resumeCheckpoint.kind === "wave" ? resumeCheckpoint.waveIndex : 0,
  );
  const requestedWaveIndexRef = useRef<number | null>(null);
  const waveCommandIdRef = useRef(0);
  const bossCommandIdRef = useRef(0);
  const requestedBossPatternRef = useRef<number | null>(null);
  const bossTimerRef = useRef<number | null>(null);
  const purificationTimerRef = useRef<number | null>(null);
  const waveIntroTimerRef = useRef<number | null>(null);
  const playerPositionRef = useRef({ xPercent: 50, yPercent: 88 });
  const [phase, setPhase] = useState<"story" | "wave" | "wave-purification-effect" | "wave-purification-exit" | "wave-blackout" | "boss" | "boss-blackout">(() => resumeCheckpoint?.chapter === 2 && resumeCheckpoint.kind === "boss" ? "story" : "story");
  const [waveStartIndex, setWaveStartIndex] = useState(currentWaveIndexRef.current);
  const [currentWaveIndex, setCurrentWaveIndex] = useState(currentWaveIndexRef.current);
  const [waveControlCommand, setWaveControlCommand] = useState<Chapter2WaveControlCommand | null>(null);
  const [bossStartPatternId, setBossStartPatternId] = useState<number | null>(null);
  const [bossControlCommand, setBossControlCommand] = useState<Chapter2BossControlCommand | null>(null);
  const [integrationGate, setIntegrationGate] = useState<Chapter2IntegrationGate | null>(null);
  const [navigation, setNavigation] = useState<Chapter2StoryNavigation>({ itemCount: 0, sections: [], gates: [] });
  const [currentStoryIndex, setCurrentStoryIndex] = useState(resumeCheckpoint?.kind === "story" && resumeCheckpoint.chapter === 2 ? Math.max(0, resumeCheckpoint.dialogueIndex) : 0);
  const [showJumpMenu, setShowJumpMenu] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [waveIntroTransitionActive, setWaveIntroTransitionActive] = useState(false);
  const [purificationOrigin, setPurificationOrigin] = useState({ xPercent: 50, yPercent: 88 });

  const resumeIndex = useMemo(() => {
    if (resumeCheckpoint?.kind !== "story" || resumeCheckpoint.chapter !== 2) return null;
    if (resumeCheckpoint.completionAction !== "chapter2-item-index") return null;
    return Math.max(0, Math.floor(resumeCheckpoint.dialogueIndex));
  }, [resumeCheckpoint]);

  const resumeWaveIndex = useMemo(() => {
    if (resumeCheckpoint?.kind !== "wave" || resumeCheckpoint.chapter !== 2) return 0;
    return Math.max(0, Math.floor(resumeCheckpoint.waveIndex));
  }, [resumeCheckpoint]);

  const postCommand = (action: string, payload: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage(
      { channel: BRIDGE_CHANNEL, type: "command", action, ...payload },
      window.location.origin,
    );
  };

  const persistCheckpoint = (state: Chapter2StoryStateMessage | undefined) => {
    const checkpoint = chapter2CheckpointFromState(state);
    if (!checkpoint) return;
    const signature = JSON.stringify({ ...checkpoint, savedAt: 0 });
    if (signature === lastCheckpointSignatureRef.current) return;
    saveStoryCheckpoint(checkpoint);
    lastCheckpointSignatureRef.current = signature;
  };

  const persistWaveCheckpoint = (waveIndex: number) => {
    const safeIndex = Math.max(0, Math.floor(waveIndex));
    currentWaveIndexRef.current = safeIndex;
    setCurrentWaveIndex(safeIndex);
    saveStoryCheckpoint(chapter2WaveCheckpoint(safeIndex));
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent<Chapter2BridgeMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.channel !== BRIDGE_CHANNEL) return;

      if (data.type === "ready") {
        setReady(true);
        window.setTimeout(() => postCommand("requestNavigationTargets"), 20);
        if (restoredRef.current) return;
        restoredRef.current = true;
        if (resumeBossPendingRef.current) {
          window.setTimeout(() => postCommand("jumpToIntegrationGate", { gateId: "boss" }), 50);
        } else if (resumeWavePendingRef.current) {
          window.setTimeout(() => postCommand("jumpToIntegrationGate", { gateId: "wave" }), 50);
        } else if (resumeIndex !== null) {
          window.setTimeout(() => postCommand("jumpTo", { index: resumeIndex }), 40);
        }
        return;
      }

      if (data.type === "navigation-targets") {
        if (data.navigation) setNavigation(data.navigation);
        if (Number.isInteger(data.state?.index)) setCurrentStoryIndex(Number(data.state?.index));
        return;
      }

      if (data.type === "test-key") {
        if (data.code === "F6") skipCurrentContext();
        else if (data.code === "F7") setShowJumpMenu((open) => !open);
        else if (data.code === "F8") {
          if (phase === "wave") jumpToBossGate();
          else if (phase === "boss") issueBossControl("scene", undefined, "clear");
          else postCommand("jumpToIntegrationGate");
        }
        return;
      }

      if (data.type === "progress") {
        if (Number.isInteger(data.state?.index)) setCurrentStoryIndex(Number(data.state?.index));
        if (
          data.effectId === "combat-transition"
          && data.title === "일반 오염 전투"
          && phase === "story"
        ) {
          if (waveIntroTimerRef.current !== null) window.clearTimeout(waveIntroTimerRef.current);
          setWaveIntroTransitionActive(true);
          waveIntroTimerRef.current = window.setTimeout(() => {
            waveIntroTimerRef.current = null;
            setWaveIntroTransitionActive(false);
          }, 3220);
        }
        if (phase === "story" && !resumeWavePendingRef.current) persistCheckpoint(data.state);
        return;
      }

      if (data.type === "integration-gate") {
        if (data.gateId === "wave") {
          if (waveIntroTimerRef.current !== null) {
            window.clearTimeout(waveIntroTimerRef.current);
            waveIntroTimerRef.current = null;
          }
          setWaveIntroTransitionActive(false);
        }
        const gate: Chapter2IntegrationGate = {
          id: data.gateId || "wave",
          title: data.title || (data.gateId === "boss" ? "보스전 시작" : "일반 오염 전투"),
          subtitle: data.subtitle || "전투 시스템 연결 지점",
        };
        if (gate.id === "wave" && renderWaveCombat) {
          const requestedIndex = requestedWaveIndexRef.current;
          const startIndex = requestedIndex !== null
            ? requestedIndex
            : resumeWavePendingRef.current
              ? resumeWaveIndex
              : 0;
          requestedWaveIndexRef.current = null;
          resumeWavePendingRef.current = false;
          currentWaveIndexRef.current = startIndex;
          setCurrentWaveIndex(startIndex);
          setWaveStartIndex(startIndex);
          setWaveControlCommand(null);
          persistWaveCheckpoint(startIndex);
          setIntegrationGate(null);
          setPhase("wave");
          setShowJumpMenu(false);
          return;
        }
        if (gate.id === "boss" && renderBossCombat) {
          resumeBossPendingRef.current = false;
          setBossStartPatternId(requestedBossPatternRef.current);
          requestedBossPatternRef.current = null;
          saveStoryCheckpoint(chapter2BossCheckpoint());
          setIntegrationGate(null);
          setPhase("boss");
          setShowJumpMenu(false);
          return;
        }
        persistCheckpoint(data.state);
        setIntegrationGate(gate);
        return;
      }

      if (data.type === "exit-request") {
        persistCheckpoint(data.state);
        setExitConfirmOpen(true);
        return;
      }

      if (data.type === "complete" && !completedRef.current) {
        completedRef.current = true;
        onStoryResult({
          outcome: "cleared",
          stage: 2,
          durationMs: Date.now() - startedAtRef.current,
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onStoryResult, phase, renderWaveCombat, renderBossCombat, resumeIndex, resumeWaveIndex]);

  useEffect(() => () => {
    if (purificationTimerRef.current !== null) window.clearTimeout(purificationTimerRef.current);
    if (bossTimerRef.current !== null) window.clearTimeout(bossTimerRef.current);
    if (waveIntroTimerRef.current !== null) window.clearTimeout(waveIntroTimerRef.current);
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      if (phase === "boss" || phase === "boss-blackout") saveStoryCheckpoint(chapter2BossCheckpoint());
      else if (phase !== "story") persistWaveCheckpoint(currentWaveIndexRef.current);
      else postCommand("requestState");
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [phase]);

  const issueWaveControl = (action: "skip" | "jump", waveIndex?: number) => {
    const command: Chapter2WaveControlCommand = {
      id: ++waveCommandIdRef.current,
      action,
      ...(Number.isInteger(waveIndex) ? { waveIndex: Math.max(0, Math.min(CHAPTER2_WAVE_COUNT - 1, Number(waveIndex))) } : {}),
    };
    setWaveControlCommand(command);
  };

  const issueBossControl = (
    action: Chapter2BossControlCommand["action"],
    patternId?: number,
    scene?: Chapter2BossControlCommand["scene"],
  ) => {
    setBossControlCommand({
      id: ++bossCommandIdRef.current,
      action,
      ...(Number.isInteger(patternId) ? { patternId: Number(patternId) } : {}),
      ...(scene ? { scene } : {}),
    });
  };

  const skipCurrentContext = () => {
    if (phase === "wave") {
      issueWaveControl("skip");
      return;
    }
    if (phase === "boss") {
      issueBossControl("skip");
      return;
    }
    if (phase !== "story") return;
    if (integrationGate) {
      setIntegrationGate(null);
      postCommand("resumeIntegrationGate");
      return;
    }
    postCommand("skipCurrent");
  };

  const jumpToStoryItem = (index: number) => {
    if (purificationTimerRef.current !== null) {
      window.clearTimeout(purificationTimerRef.current);
      purificationTimerRef.current = null;
    }
    const safeIndex = Math.max(0, Math.min(Math.max(0, navigation.itemCount - 1), Math.floor(index)));
    requestedWaveIndexRef.current = null;
    resumeWavePendingRef.current = false;
    setWaveControlCommand(null);
    setBossControlCommand(null);
    setBossStartPatternId(null);
    setIntegrationGate(null);
    setPhase("story");
    setShowJumpMenu(false);
    window.setTimeout(() => postCommand("jumpTo", { index: safeIndex }), 20);
  };

  const jumpToWave = (waveIndex: number) => {
    if (purificationTimerRef.current !== null) {
      window.clearTimeout(purificationTimerRef.current);
      purificationTimerRef.current = null;
    }
    const safeIndex = Math.max(0, Math.min(CHAPTER2_WAVE_COUNT - 1, Math.floor(waveIndex)));
    if (phase === "wave") {
      currentWaveIndexRef.current = safeIndex;
      setCurrentWaveIndex(safeIndex);
      setWaveStartIndex(safeIndex);
      persistWaveCheckpoint(safeIndex);
      issueWaveControl("jump", safeIndex);
      setShowJumpMenu(false);
      return;
    }
    setPhase("story");
    requestedWaveIndexRef.current = safeIndex;
    resumeWavePendingRef.current = false;
    setIntegrationGate(null);
    setShowJumpMenu(false);
    window.setTimeout(() => postCommand("jumpToIntegrationGate", { gateId: "wave" }), 20);
  };

  const jumpToBossGate = () => {
    if (purificationTimerRef.current !== null) {
      window.clearTimeout(purificationTimerRef.current);
      purificationTimerRef.current = null;
    }
    requestedWaveIndexRef.current = null;
    resumeWavePendingRef.current = false;
    setWaveControlCommand(null);
    setIntegrationGate(null);
    setPhase("story");
    setShowJumpMenu(false);
    window.setTimeout(() => postCommand("jumpToIntegrationGate", { gateId: "boss" }), 20);
  };

  const jumpToBossPattern = (patternId: number) => {
    if (phase === "boss") {
      issueBossControl("jumpPattern", patternId);
      setShowJumpMenu(false);
      return;
    }
    requestedBossPatternRef.current = patternId;
    setBossControlCommand(null);
    setPhase("story");
    setIntegrationGate(null);
    setShowJumpMenu(false);
    window.setTimeout(() => postCommand("jumpToIntegrationGate", { gateId: "boss" }), 20);
  };

  const jumpToBossScene = (scene: Chapter2BossControlCommand["scene"]) => {
    if (!scene) return;
    if (phase === "boss") {
      issueBossControl("scene", undefined, scene);
      setShowJumpMenu(false);
      return;
    }
    requestedBossPatternRef.current = scene === "phase2Intro" || scene === "clear" ? 301 : null;
    setBossControlCommand({ id: ++bossCommandIdRef.current, action: "scene", scene });
    setPhase("story");
    setIntegrationGate(null);
    setShowJumpMenu(false);
    window.setTimeout(() => postCommand("jumpToIntegrationGate", { gateId: "boss" }), 20);
  };

  useEffect(() => {
    const handleTestKey = (event: KeyboardEvent) => {
      if (event.code === "F6") {
        event.preventDefault();
        skipCurrentContext();
      } else if (event.code === "F7") {
        event.preventDefault();
        setShowJumpMenu((open) => !open);
      } else if (event.code === "F8") {
        event.preventDefault();
        if (phase === "wave") jumpToBossGate();
        else if (phase === "boss") issueBossControl("scene", undefined, "clear");
        else if (phase === "story") postCommand("jumpToIntegrationGate");
      }
    };
    window.addEventListener("keydown", handleTestKey);
    return () => window.removeEventListener("keydown", handleTestKey);
  }, [phase, integrationGate, navigation.itemCount]);

  const finishWaveCombat = () => {
    if (purificationTimerRef.current !== null) return;
    setWaveControlCommand(null);
    setShowJumpMenu(false);
    setPurificationOrigin(playerPositionRef.current);
    sfx.purificationComplete();
    setPhase("wave-purification-effect");

    // Chapter 1과 같은 순서: 100% 정화 파동 -> 호반우 상승 퇴장 -> 암전 -> 스토리 재개.
    purificationTimerRef.current = window.setTimeout(() => {
      setPhase("wave-purification-exit");
      purificationTimerRef.current = window.setTimeout(() => {
        setPhase("wave-blackout");
        // 검은 화면이 유지되는 동안 iframe 스토리를 먼저 다음 장면으로 진행시킨 뒤 공개한다.
        // 이렇게 하면 전투 화면/이전 스토리 배경이 한 프레임 비치는 현상을 막을 수 있다.
        purificationTimerRef.current = window.setTimeout(() => {
          postCommand("resumeIntegrationGate");
          purificationTimerRef.current = window.setTimeout(() => {
            purificationTimerRef.current = null;
            setPhase("story");
          }, 250);
        }, 600);
      }, 1500);
    }, 3300);
  };

  const failWaveCombat = (waveIndex: number) => {
    persistWaveCheckpoint(waveIndex);
    onStoryResult({ outcome: "failed", stage: 2, durationMs: Date.now() - startedAtRef.current });
  };

  const exitWaveCombat = (waveIndex: number) => {
    persistWaveCheckpoint(waveIndex);
    onMenu();
  };

  const finishBossCombat = () => {
    if (bossTimerRef.current !== null) return;
    setBossControlCommand(null);
    setShowJumpMenu(false);
    setPhase("boss-blackout");
    bossTimerRef.current = window.setTimeout(() => {
      postCommand("resumeIntegrationGate");
      bossTimerRef.current = window.setTimeout(() => {
        bossTimerRef.current = null;
        setPhase("story");
      }, 280);
    }, 520);
  };

  const failBossCombat = () => {
    saveStoryCheckpoint(chapter2BossCheckpoint());
    onStoryResult({ outcome: "failed", stage: 2, durationMs: Date.now() - startedAtRef.current });
  };

  const exitBossCombat = () => {
    saveStoryCheckpoint(chapter2BossCheckpoint());
    onMenu();
  };

  const waveMounted = phase === "wave" || phase === "wave-purification-effect" || phase === "wave-purification-exit";

  return (
    <div className="chapter2-story-experience">
      <div className={`chapter2-story-frame-shell${phase !== "story" ? " is-combat-hidden" : ""}`}>
        <iframe
          ref={iframeRef}
          className="chapter2-story-frame"
          src="/chapter2_story/index.html?embedded=1"
          title="챕터 2 · 중간고사와 팀 프로젝트"
          allow="autoplay"
        />
      </div>

      {waveMounted && renderWaveCombat?.({
        startWaveIndex: waveStartIndex,
        controlCommand: waveControlCommand,
        inputEnabled: phase === "wave",
        purificationExit: phase === "wave-purification-exit",
        onPlayerPositionChange: (position) => {
          playerPositionRef.current = position;
        },
        onWaveIndexChange: (waveIndex) => {
          currentWaveIndexRef.current = waveIndex;
          setCurrentWaveIndex(waveIndex);
          persistWaveCheckpoint(waveIndex);
        },
        onComplete: finishWaveCombat,
        onFailed: failWaveCombat,
        onExitToMenu: exitWaveCombat,
      })}

      {phase === "boss" && renderBossCombat?.({
        startPatternId: bossStartPatternId,
        controlCommand: bossControlCommand,
        inputEnabled: true,
        onComplete: finishBossCombat,
        onFailed: failBossCombat,
        onExitToMenu: exitBossCombat,
      })}

      {phase === "wave-purification-effect" && (
        <div
          className="chapter1-wave-purification-overlay chapter2-wave-purification-overlay"
          aria-label="챕터 2 정화 에너지 100% 연출"
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

      {(phase === "wave-blackout" || phase === "boss-blackout") && (
        <div className="chapter2-wave-clear-blackout" aria-hidden="true" />
      )}

      {waveIntroTransitionActive && (
        <div className="chapter2-fullscreen-wave-intro" aria-hidden="true">
          <div className="chapter2-fullscreen-wave-intro-shutter" />
          <div className="chapter2-fullscreen-wave-intro-slash" />
          <div className="chapter2-fullscreen-wave-intro-title">
            <small>CHAPTER 2</small>
            <strong>정화 전투 개시</strong>
            <span>시험 · 팀플 오염 파편 정화</span>
          </div>
        </div>
      )}

      {ready && !exitConfirmOpen && phase !== "wave-purification-effect" && phase !== "wave-purification-exit" && phase !== "wave-blackout" && phase !== "boss-blackout" && (
        <div className="chapter2-story-test-navigation" aria-label="챕터 2 진행 테스트 이동">
          <div className="chapter2-story-test-toolbar">
            <button type="button" className="chapter2-story-test-skip" onClick={skipCurrentContext}>
              SKIP · F6
            </button>
            <button
              type="button"
              className="chapter2-story-test-toggle"
              onClick={() => setShowJumpMenu((open) => !open)}
            >
              TEST 이동 · F7
            </button>
          </div>

          {showJumpMenu && (
            <aside className="chapter2-story-test-panel" aria-label="챕터 2 원하는 위치로 이동">
              <div className="chapter2-story-test-title">CHAPTER 2 TEST NAVIGATION</div>
              <div className="chapter2-story-test-phase">
                현재: {phase === "wave" ? `WAVE ${currentWaveIndex + 1}` : phase === "boss" ? "BOSS" : integrationGate?.id === "boss" ? "BOSS GATE" : `STORY #${currentStoryIndex + 1}`}
              </div>

              <div className="chapter2-story-test-group">
                <strong>스토리 구간</strong>
                <button
                  type="button"
                  className={phase === "story" && currentStoryIndex === 0 ? "is-current" : ""}
                  onClick={() => jumpToStoryItem(0)}
                >
                  처음부터
                </button>
                {navigation.sections.map((entry) => (
                  <button
                    type="button"
                    key={`section-${entry.index}`}
                    className={phase === "story" && currentStoryIndex === entry.index ? "is-current" : ""}
                    onClick={() => jumpToStoryItem(entry.index)}
                  >
                    {entry.title}
                  </button>
                ))}
              </div>

              <div className="chapter2-story-test-group">
                <strong>일반 몬스터 웨이브</strong>
                <div className="chapter2-story-wave-grid">
                  {Array.from({ length: CHAPTER2_WAVE_COUNT }, (_, index) => (
                    <button
                      type="button"
                      key={`wave-${index}`}
                      className={phase === "wave" && currentWaveIndex === index ? "is-current is-combat" : "is-combat"}
                      onClick={() => jumpToWave(index)}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chapter2-story-test-group">
                <strong>보스 · 등장/페이즈/패턴</strong>
                <button type="button" className="is-boss" onClick={jumpToBossGate}>보스전 처음부터</button>
                <button type="button" className="is-boss" onClick={() => jumpToBossScene("phase1Intro")}>보스 등장신</button>
                <div className="chapter2-story-wave-grid">
                  {[201,202,203,204,205,206,207].map((id) => (
                    <button type="button" className="is-combat" key={`boss-p1-${id}`} onClick={() => jumpToBossPattern(id)}>{id}</button>
                  ))}
                </div>
                <button type="button" className="is-boss" onClick={() => jumpToBossScene("phaseTransition")}>1페이즈 사망 → 2페이즈 각성</button>
                <button type="button" className="is-boss" onClick={() => jumpToBossScene("phase2Intro")}>2페이즈 각성신</button>
                <div className="chapter2-story-wave-grid">
                  {[301,302,303,304,305,306,307,308,309].map((id) => (
                    <button type="button" className="is-combat" key={`boss-p2-${id}`} onClick={() => jumpToBossPattern(id)}>{id}</button>
                  ))}
                </div>
                <button type="button" className="is-boss" onClick={() => jumpToBossScene("clear")}>보스 사망/CLEAR 연출</button>
                {navigation.gates.filter((gate) => gate.id === "boss").map((gate) => (
                  <button type="button" key={`boss-gate-${gate.index}`} onClick={() => jumpToStoryItem(gate.index)}>보스 진입 스토리 · #{gate.index + 1}</button>
                ))}
                {navigation.sections.length > 0 && (
                  <button type="button" onClick={() => jumpToStoryItem(navigation.sections[navigation.sections.length - 1].index)}>마지막 스토리 구간</button>
                )}
              </div>

              <p className="chapter2-story-test-help">
                F6은 현재 스토리/웨이브/보스 패턴을 즉시 스킵합니다. F8은 다음 큰 전투 구간 또는 보스 CLEAR로 이동합니다.
              </p>
            </aside>
          )}
        </div>
      )}

      {!ready && (
        <div className="chapter2-story-loading" aria-live="polite">
          <strong>CHAPTER 2</strong>
          <span>스토리를 불러오는 중...</span>
        </div>
      )}

      {integrationGate && (
        <div className="chapter2-integration-gate" role="presentation">
          <section role="dialog" aria-modal="true" aria-label={integrationGate.title}>
            <small>CHAPTER 2 · COMBAT BRIDGE</small>
            <h2>{integrationGate.title}</h2>
            <p>{integrationGate.subtitle}</p>
            <p className="chapter2-integration-note">
              전투 연결을 준비하고 있습니다.
            </p>
            <div className="chapter2-integration-actions">
              <button type="button" className="secondary" onClick={onMenu}>메인 화면</button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setIntegrationGate(null);
                  postCommand("resumeIntegrationGate");
                }}
              >
                스토리 계속
              </button>
            </div>
          </section>
        </div>
      )}

      {exitConfirmOpen && (
        <div className="chapter2-story-exit-overlay" role="presentation">
          <section role="dialog" aria-modal="true" aria-label="스토리 중단 확인">
            <small>STORY PAUSED</small>
            <h2>스토리를 중단하시겠습니까?</h2>
            <p>현재 진행 위치는 자동 저장됩니다.</p>
            <div className="chapter2-integration-actions">
              <button type="button" className="secondary" onClick={() => setExitConfirmOpen(false)}>계속하기</button>
              <button type="button" className="danger" onClick={onMenu}>메인 화면</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
