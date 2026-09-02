import React, { useEffect, useMemo, useRef, useState } from "react";
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

interface Chapter2StoryExperienceProps {
  onStoryResult: (result: { outcome: "cleared" | "failed"; stage: number; durationMs: number }) => void;
  onMenu: () => void;
  resumeCheckpoint: StoryCheckpoint | null;
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

export function Chapter2StoryExperience({
  onStoryResult,
  onMenu,
  resumeCheckpoint,
}: Chapter2StoryExperienceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startedAtRef = useRef(Date.now());
  const restoredRef = useRef(false);
  const completedRef = useRef(false);
  const lastCheckpointSignatureRef = useRef("");
  const [integrationGate, setIntegrationGate] = useState<Chapter2IntegrationGate | null>(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const resumeIndex = useMemo(() => {
    if (resumeCheckpoint?.kind !== "story" || resumeCheckpoint.chapter !== 2) return null;
    if (resumeCheckpoint.completionAction !== "chapter2-item-index") return null;
    return Math.max(0, Math.floor(resumeCheckpoint.dialogueIndex));
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

  useEffect(() => {
    const handleMessage = (event: MessageEvent<Chapter2BridgeMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.channel !== BRIDGE_CHANNEL) return;

      if (data.type === "ready") {
        setReady(true);
        if (!restoredRef.current && resumeIndex !== null) {
          restoredRef.current = true;
          window.setTimeout(() => postCommand("jumpTo", { index: resumeIndex }), 40);
        }
        return;
      }

      if (data.type === "progress") {
        persistCheckpoint(data.state);
        return;
      }

      if (data.type === "integration-gate") {
        persistCheckpoint(data.state);
        setIntegrationGate({
          id: data.gateId || "wave",
          title: data.title || (data.gateId === "boss" ? "보스전 시작" : "일반 오염 전투"),
          subtitle: data.subtitle || "전투 시스템 연결 지점",
        });
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
  }, [onStoryResult, resumeIndex]);

  useEffect(() => {
    const handlePageHide = () => postCommand("requestState");
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  return (
    <div className="chapter2-story-experience">
      <div className="chapter2-story-frame-shell">
        <iframe
          ref={iframeRef}
          className="chapter2-story-frame"
          src="/chapter2_story/index.html?embedded=1"
          title="챕터 2 · 중간고사와 팀 프로젝트"
          allow="autoplay"
        />
      </div>

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
              현재 패치는 챕터 2 스토리를 먼저 통합한 단계입니다. 다음 통합 단계에서 이 지점에 실제 챕터 2 전투를 연결합니다.
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
