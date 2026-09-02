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

interface Chapter2BridgeMessage {
  channel?: string;
  type?: string;
  state?: Chapter2StoryStateMessage;
  gateId?: "wave" | "boss" | string;
  title?: string;
  subtitle?: string;
}

interface Chapter2IntegrationGate {
  id: "wave" | "boss" | string;
  title: string;
  subtitle: string;
}

interface Chapter2WaveRenderProps {
  startWaveIndex: number;
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
  const [phase, setPhase] = useState<"story" | "wave">("story");
  const [waveStartIndex, setWaveStartIndex] = useState(currentWaveIndexRef.current);
  const [integrationGate, setIntegrationGate] = useState<Chapter2IntegrationGate | null>(null);
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
    saveStoryCheckpoint(chapter2WaveCheckpoint(safeIndex));
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent<Chapter2BridgeMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.channel !== BRIDGE_CHANNEL) return;

      if (data.type === "ready") {
        setReady(true);
        if (restoredRef.current) return;
        restoredRef.current = true;
        if (resumeWavePendingRef.current) {
          window.setTimeout(() => postCommand("jumpToIntegrationGate", { gateId: "wave" }), 50);
        } else if (resumeIndex !== null) {
          window.setTimeout(() => postCommand("jumpTo", { index: resumeIndex }), 40);
        }
        return;
      }

      if (data.type === "progress") {
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
          const startIndex = resumeWavePendingRef.current ? resumeWaveIndex : 0;
          resumeWavePendingRef.current = false;
          currentWaveIndexRef.current = startIndex;
          setWaveStartIndex(startIndex);
          persistWaveCheckpoint(startIndex);
          setIntegrationGate(null);
          setPhase("wave");
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

  useEffect(() => {
    if (phase !== "story") return;
    const handleTestKey = (event: KeyboardEvent) => {
      if (event.code === "F6") {
        event.preventDefault();
        postCommand("skipCurrent");
      } else if (event.code === "F7") {
        event.preventDefault();
        postCommand("jumpBy", { count: 10 });
      } else if (event.code === "F8") {
        event.preventDefault();
        postCommand("jumpToIntegrationGate");
      }
    };
    window.addEventListener("keydown", handleTestKey);
    return () => window.removeEventListener("keydown", handleTestKey);
  }, [phase]);

  const finishWaveCombat = () => {
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
        onWaveIndexChange: (waveIndex) => persistWaveCheckpoint(waveIndex),
        onComplete: finishWaveCombat,
        onFailed: failWaveCombat,
        onExitToMenu: exitWaveCombat,
      })}

      {phase === "story" && ready && !integrationGate && !exitConfirmOpen && (
        <div className="chapter2-story-test-navigation" aria-label="챕터 2 테스트 스킵">
          <button type="button" onClick={() => postCommand("skipCurrent")}>SKIP 1 · F6</button>
          <button type="button" onClick={() => postCommand("jumpBy", { count: 10 })}>+10 · F7</button>
          <button type="button" onClick={() => postCommand("jumpToIntegrationGate")}>다음 전투 · F8</button>
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
