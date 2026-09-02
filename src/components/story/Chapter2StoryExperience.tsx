import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

interface Chapter2BridgeMessage {
  channel?: string;
  type?: string;
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
  onWaveIndexChange: (waveIndex: number) => void;
  onComplete: () => void;
  onFailed: (waveIndex: number) => void;
  onExitToMenu: (waveIndex: number) => void;
}

interface Chapter2StoryExperienceProps {
  onStoryResult: (result: { outcome: "cleared" | "failed"; stage: number; durationMs: number }) => void;
  onMenu: () => void;
  resumeCheckpoint: StoryCheckpoint | null;
  renderWaveCombat?: (props: Chapter2WaveRenderProps) => ReactNode;
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

export function Chapter2StoryExperience({
  onStoryResult,
  onMenu,
  resumeCheckpoint,
  renderWaveCombat,
}: Chapter2StoryExperienceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startedAtRef = useRef(Date.now());
  const restoredRef = useRef(false);
  const completedRef = useRef(false);
  const lastCheckpointSignatureRef = useRef("");
  const resumeWavePendingRef = useRef(resumeCheckpoint?.chapter === 2 && resumeCheckpoint.kind === "wave");
  const currentWaveIndexRef = useRef(
    resumeCheckpoint?.chapter === 2 && resumeCheckpoint.kind === "wave" ? resumeCheckpoint.waveIndex : 0,
  );
  const requestedWaveIndexRef = useRef<number | null>(null);
  const waveCommandIdRef = useRef(0);
  const [phase, setPhase] = useState<"story" | "wave">("story");
  const [waveStartIndex, setWaveStartIndex] = useState(currentWaveIndexRef.current);
  const [currentWaveIndex, setCurrentWaveIndex] = useState(currentWaveIndexRef.current);
  const [waveControlCommand, setWaveControlCommand] = useState<Chapter2WaveControlCommand | null>(null);
  const [integrationGate, setIntegrationGate] = useState<Chapter2IntegrationGate | null>(null);
  const [navigation, setNavigation] = useState<Chapter2StoryNavigation>({ itemCount: 0, sections: [], gates: [] });
  const [currentStoryIndex, setCurrentStoryIndex] = useState(resumeCheckpoint?.kind === "story" && resumeCheckpoint.chapter === 2 ? Math.max(0, resumeCheckpoint.dialogueIndex) : 0);
  const [showJumpMenu, setShowJumpMenu] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [ready, setReady] = useState(false);

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
        if (resumeWavePendingRef.current) {
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
          else postCommand("jumpToIntegrationGate");
        }
        return;
      }

      if (data.type === "progress") {
        if (Number.isInteger(data.state?.index)) setCurrentStoryIndex(Number(data.state?.index));
        if (phase === "story" && !resumeWavePendingRef.current) persistCheckpoint(data.state);
        return;
      }

      if (data.type === "integration-gate") {
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
  }, [onStoryResult, phase, renderWaveCombat, resumeIndex, resumeWaveIndex]);

  useEffect(() => {
    const handlePageHide = () => {
      if (phase === "wave") persistWaveCheckpoint(currentWaveIndexRef.current);
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

  const skipCurrentContext = () => {
    if (phase === "wave") {
      issueWaveControl("skip");
      return;
    }
    if (integrationGate) {
      setIntegrationGate(null);
      postCommand("resumeIntegrationGate");
      return;
    }
    postCommand("skipCurrent");
  };

  const jumpToStoryItem = (index: number) => {
    const safeIndex = Math.max(0, Math.min(Math.max(0, navigation.itemCount - 1), Math.floor(index)));
    requestedWaveIndexRef.current = null;
    resumeWavePendingRef.current = false;
    setWaveControlCommand(null);
    setIntegrationGate(null);
    setPhase("story");
    setShowJumpMenu(false);
    window.setTimeout(() => postCommand("jumpTo", { index: safeIndex }), 20);
  };

  const jumpToWave = (waveIndex: number) => {
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
    requestedWaveIndexRef.current = safeIndex;
    resumeWavePendingRef.current = false;
    setIntegrationGate(null);
    setShowJumpMenu(false);
    window.setTimeout(() => postCommand("jumpToIntegrationGate", { gateId: "wave" }), 20);
  };

  const jumpToBossGate = () => {
    requestedWaveIndexRef.current = null;
    resumeWavePendingRef.current = false;
    setWaveControlCommand(null);
    setIntegrationGate(null);
    setPhase("story");
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
        else postCommand("jumpToIntegrationGate");
      }
    };
    window.addEventListener("keydown", handleTestKey);
    return () => window.removeEventListener("keydown", handleTestKey);
  }, [phase, integrationGate, navigation.itemCount]);

  const finishWaveCombat = () => {
    setWaveControlCommand(null);
    setPhase("story");
    window.setTimeout(() => postCommand("resumeIntegrationGate"), 50);
  };

  const failWaveCombat = (waveIndex: number) => {
    persistWaveCheckpoint(waveIndex);
    onStoryResult({ outcome: "failed", stage: 2, durationMs: Date.now() - startedAtRef.current });
  };

  const exitWaveCombat = (waveIndex: number) => {
    persistWaveCheckpoint(waveIndex);
    onMenu();
  };

  return (
    <div className="chapter2-story-experience">
      <div className={`chapter2-story-frame-shell${phase === "wave" ? " is-combat-hidden" : ""}`}>
        <iframe
          ref={iframeRef}
          className="chapter2-story-frame"
          src="/chapter2_story/index.html?embedded=1"
          title="챕터 2 · 중간고사와 팀 프로젝트"
          allow="autoplay"
        />
      </div>

      {phase === "wave" && renderWaveCombat?.({
        startWaveIndex: waveStartIndex,
        controlCommand: waveControlCommand,
        onWaveIndexChange: (waveIndex) => {
          currentWaveIndexRef.current = waveIndex;
          setCurrentWaveIndex(waveIndex);
          persistWaveCheckpoint(waveIndex);
        },
        onComplete: finishWaveCombat,
        onFailed: failWaveCombat,
        onExitToMenu: exitWaveCombat,
      })}

      {ready && !exitConfirmOpen && (
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
                현재: {phase === "wave" ? `WAVE ${currentWaveIndex + 1}` : integrationGate?.id === "boss" ? "BOSS GATE" : `STORY #${currentStoryIndex + 1}`}
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
                <strong>보스·후반부</strong>
                <button type="button" className="is-boss" onClick={jumpToBossGate}>보스전 시작 지점</button>
                {navigation.gates.filter((gate) => gate.id === "boss").map((gate) => (
                  <button type="button" key={`boss-gate-${gate.index}`} onClick={() => jumpToStoryItem(gate.index)}>
                    보스 진입 연출 · #{gate.index + 1}
                  </button>
                ))}
                {navigation.sections.length > 0 && (
                  <button type="button" onClick={() => jumpToStoryItem(navigation.sections[navigation.sections.length - 1].index)}>
                    마지막 스토리 구간
                  </button>
                )}
              </div>

              <p className="chapter2-story-test-help">
                F6은 현재 스토리 연출/웨이브를 즉시 스킵합니다. F8은 다음 전투 지점으로 이동합니다.
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
              {integrationGate.id === "boss"
                ? "챕터 2 일반 몬스터 웨이브는 연결되었습니다. 보스전은 다음 통합 단계에서 이 위치에 연결합니다."
                : "전투 연결을 준비하고 있습니다."}
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
