import { useEffect, useMemo, useRef, useState } from "react";
import "./chapter3StoryExperience.css";

type Chapter3StoryExperienceProps = {
  onExit?: () => void;
  onComplete?: () => void;
};

type Chapter3BridgeMessage = {
  channel?: string;
  type?: string;
  detail?: {
    effectId?: string;
    segmentId?: string;
    waveIndex?: number;
  };
};

const FULLSCREEN_EFFECTS = new Set([
  "certificate-study",
  "study-session",
  "combat-transition",
  "boss-battle-transition",
  "boss-transition",
  "chapter-ending",
  "time-card",
  "desktop-workflow",
  "report-save-close",
  "word-crash",
  "team-drive-uploads",
  "folder-snapshot",
  "boss-emergence",
  "exam-writing-sequence",
  "purification-shard-absorption",
  "graduation-portal-sequence",
  "graduation-portal-static",
  "diagnosis-glitch",
  "monthly-schedule",
  "job-posting-browse",
  "job-application-submit",
  "eclass-assignment-submit",
  "recruitment-result",
  "eclass-assignment-glitch",
  "recruitment-application-glitch",
  "assignment-submit-timeline",
  "graduation-portal-static-zoom",
  "diagnosis-course-mismatch",
  "first-monster-birth",
  "teleport-core",
  "digrion-body-break",
  "semester-time-passage",
  "digrion-spirit-reveal",
  "purification-energy-form",
  "purification-launch",
  "purification-collision",
  "purification-explosion",
  "student-card-shutdown",
]);

export function Chapter3StoryExperience({
  onExit,
  onComplete,
}: Chapter3StoryExperienceProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const waveFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [fullscreenEffect, setFullscreenEffect] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [waveActive, setWaveActive] = useState(false);
  const [waveReady, setWaveReady] = useState(false);
  const [waveFailed, setWaveFailed] = useState(false);
  const [waveRunKey, setWaveRunKey] = useState(0);
  const [waveStartIndex, setWaveStartIndex] = useState(0);
  const [failedWaveIndex, setFailedWaveIndex] = useState<number | null>(null);
  const [waveDeathCounts, setWaveDeathCounts] = useState<Record<number, number>>({});

  const frameSrc = useMemo(() => "/chapter3_story/index.html", []);
  const wavePower = (waveDeathCounts[waveStartIndex] ?? 0) >= 3 ? 5 : 1;
  const waveSrc = `/chapter3_wave/index.html?embedded=1&start=${waveStartIndex}&power=${wavePower}&run=${waveRunKey}`;

  useEffect(() => {
    const handleMessage = (event: MessageEvent<Chapter3BridgeMessage>) => {
      if (event.origin !== window.location.origin) return;
      const message = event.data;
      if (!message) return;

      if (event.source === frameRef.current?.contentWindow) {
        if (message.channel !== "sky-strike-chapter3-story") return;

        if (message.type === "ready") {
          setReady(true);
          return;
        }

        if (message.type === "effect-start") {
          const effectId = message.detail?.effectId || "";
          if (effectId === "battle-running") {
            setFullscreenEffect(null);
            setWaveFailed(false);
            setWaveReady(false);
            setWaveStartIndex(0);
            setFailedWaveIndex(null);
            setWaveRunKey((key) => key + 1);
            setWaveActive(true);
            return;
          }
          if (FULLSCREEN_EFFECTS.has(effectId)) setFullscreenEffect(effectId);
          return;
        }

        if (message.type === "effect-end") {
          const effectId = message.detail?.effectId || "";
          setFullscreenEffect((current) => (current === effectId ? null : current));
          if (effectId === "battle-running") setWaveActive(false);
          return;
        }

        if (message.type === "story-complete") {
          setFullscreenEffect(null);
          setWaveActive(false);
          onComplete?.();
        }
        return;
      }

      if (event.source === waveFrameRef.current?.contentWindow) {
        if (message.channel !== "sky-strike-chapter3-wave") return;

        if (message.type === "ready") {
          setWaveReady(true);
          return;
        }

        if (message.type === "wave-failed") {
          const failedWave = Math.max(0, Math.floor(message.detail?.waveIndex ?? waveStartIndex));
          setFailedWaveIndex(failedWave);
          setWaveDeathCounts((counts) => ({
            ...counts,
            [failedWave]: (counts[failedWave] ?? 0) + 1,
          }));
          setWaveFailed(true);
          return;
        }

        if (message.type === "wave-complete") {
          setWaveFailed(false);
          setWaveActive(false);
          frameRef.current?.contentWindow?.postMessage(
            { channel: "sky-strike-chapter3-host", type: "wave-complete" },
            window.location.origin,
          );
          return;
        }

        if (message.type === "exit-request") onExit?.();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onComplete, onExit, waveStartIndex]);

  const retryWave = () => {
    if (failedWaveIndex !== null) setWaveStartIndex(failedWaveIndex);
    setFailedWaveIndex(null);
    setWaveFailed(false);
    setWaveReady(false);
    setWaveRunKey((key) => key + 1);
  };

  return (
    <section
      className={`chapter3StoryExperience${fullscreenEffect ? " is-fullscreen-effect" : ""}${waveActive ? " is-wave-active" : ""}`}
      data-chapter3-effect={fullscreenEffect || undefined}
      aria-label="챕터 3 스토리"
    >
      <iframe
        ref={frameRef}
        className="chapter3StoryFrame"
        src={frameSrc}
        title="CHAPTER 3 — 졸업요건 최종전"
        allow="autoplay; fullscreen"
      />

      {waveActive && (
        <div className="chapter3WaveStage" aria-label="챕터 3 일반 몬스터 웨이브">
          <iframe
            key={`chapter3-wave-${waveRunKey}-${waveStartIndex}`}
            ref={waveFrameRef}
            className="chapter3WaveFrame"
            src={waveSrc}
            title="CHAPTER 3 일반 오염 몬스터 정화 전투"
          />
          {!waveReady && !waveFailed && (
            <div className="chapter3WaveLoading">CHAPTER 3 COMBAT LOADING</div>
          )}
        </div>
      )}

      {waveActive && waveFailed && (
        <div className="chapter3WaveRetryOverlay" role="presentation">
          <section className="chapter3WaveRetryDialog" role="dialog" aria-modal="true" aria-label="챕터 3 전투 재도전 확인">
            <small>WAVE {(failedWaveIndex ?? waveStartIndex) + 1}</small>
            <h2>다시 도전하시겠습니까?</h2>
            <p>현재 웨이브의 처음부터 다시 시작합니다.</p>
            {(waveDeathCounts[failedWaveIndex ?? waveStartIndex] ?? 0) >= 3 && (
              <p className="chapter3WaveRetryBoost">반복 실패 보정 · 화력 레벨 5로 재시작</p>
            )}
            <div className="chapter3WaveRetryActions">
              <button type="button" className="secondary" onClick={onExit}>아니오</button>
              <button type="button" className="primary" onClick={retryWave}>예</button>
            </div>
          </section>
        </div>
      )}

      {!ready && (
        <div className="chapter3StoryLoading" aria-live="polite">
          CHAPTER 3 STORY LOADING
        </div>
      )}

      {onExit && !fullscreenEffect && !waveActive && (
        <button
          className="chapter3StoryExit"
          type="button"
          onClick={onExit}
          aria-label="챕터 3 스토리 나가기"
        >
          메인으로
        </button>
      )}
    </section>
  );
}
