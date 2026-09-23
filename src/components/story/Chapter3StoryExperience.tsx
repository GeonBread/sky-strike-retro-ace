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

type Chapter3StoryStart = "full" | "post-wave" | "boss" | "ending";
type Chapter3Screen = "selector" | "story" | "wave";
type WaveOrigin = "story" | "selector";

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

const STORY_START_SECTION: Record<Exclude<Chapter3StoryStart, "full">, string> = {
  "post-wave": "장면 16.",
  boss: "장면 20.",
  ending: "장면 33.",
};

export function Chapter3StoryExperience({
  onExit,
  onComplete,
}: Chapter3StoryExperienceProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const waveFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [fullscreenEffect, setFullscreenEffect] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Chapter3Screen>("selector");
  const [storyStart, setStoryStart] = useState<Chapter3StoryStart>("full");
  const [storyLaunchSerial, setStoryLaunchSerial] = useState(0);
  const [waveActive, setWaveActive] = useState(false);
  const [waveReady, setWaveReady] = useState(false);
  const [waveFailed, setWaveFailed] = useState(false);
  const [waveRunKey, setWaveRunKey] = useState(0);
  const [waveStartIndex, setWaveStartIndex] = useState(0);
  const [failedWaveIndex, setFailedWaveIndex] = useState<number | null>(null);
  const [waveDeathCounts, setWaveDeathCounts] = useState<Record<number, number>>({});
  const [waveOrigin, setWaveOrigin] = useState<WaveOrigin>("story");

  const frameSrc = useMemo(() => "/chapter3_story/index.html?hostSelector=1", []);
  const wavePower = (waveDeathCounts[waveStartIndex] ?? 0) >= 3 ? 5 : 1;
  const waveSrc = `/chapter3_wave/index.html?embedded=1&start=${waveStartIndex}&power=${wavePower}&run=${waveRunKey}`;

  const postStoryCommand = (type: string, detail?: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(
      { channel: "sky-strike-chapter3-host", type, detail },
      window.location.origin,
    );
  };

  const returnToSelector = () => {
    setFullscreenEffect(null);
    setWaveActive(false);
    setWaveFailed(false);
    setWaveReady(false);
    setFailedWaveIndex(null);
    setScreen("selector");
  };

  const launchStory = (start: Chapter3StoryStart) => {
    setFullscreenEffect(null);
    setWaveActive(false);
    setWaveFailed(false);
    setWaveReady(false);
    setFailedWaveIndex(null);
    setStoryStart(start);
    setScreen("story");
    setStoryLaunchSerial((serial) => serial + 1);
  };

  const launchWave = () => {
    setFullscreenEffect(null);
    setWaveOrigin("selector");
    setWaveFailed(false);
    setWaveReady(false);
    setWaveStartIndex(0);
    setFailedWaveIndex(null);
    setWaveRunKey((key) => key + 1);
    setWaveActive(true);
    setScreen("wave");
  };

  useEffect(() => {
    if (!ready || screen !== "story") return;
    if (storyStart === "full") {
      postStoryCommand("start-full-story");
      return;
    }
    postStoryCommand("start-section", { titlePrefix: STORY_START_SECTION[storyStart] });
  }, [ready, screen, storyStart, storyLaunchSerial]);

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
            setWaveOrigin("story");
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
          if (storyStart === "full") onComplete?.();
          else returnToSelector();
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
          if (waveOrigin === "story") {
            frameRef.current?.contentWindow?.postMessage(
              { channel: "sky-strike-chapter3-host", type: "wave-complete" },
              window.location.origin,
            );
          } else {
            setScreen("selector");
          }
          return;
        }

        if (message.type === "exit-request") {
          if (waveOrigin === "selector") returnToSelector();
          else onExit?.();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onComplete, onExit, storyStart, waveOrigin, waveStartIndex]);

  const retryWave = () => {
    if (failedWaveIndex !== null) setWaveStartIndex(failedWaveIndex);
    setFailedWaveIndex(null);
    setWaveFailed(false);
    setWaveReady(false);
    setWaveRunKey((key) => key + 1);
  };

  return (
    <section
      className={`chapter3StoryExperience${fullscreenEffect ? " is-fullscreen-effect" : ""}${waveActive ? " is-wave-active" : ""}${screen === "selector" ? " is-selector-open" : ""}`}
      data-chapter3-effect={fullscreenEffect || undefined}
      aria-label="챕터 3"
    >
      <iframe
        ref={frameRef}
        className="chapter3StoryFrame"
        src={frameSrc}
        title="CHAPTER 3 — 졸업요건 최종전"
        allow="autoplay; fullscreen"
        aria-hidden={screen === "selector" || screen === "wave"}
      />

      {screen === "selector" && (
        <div className="chapter3StartSelector" role="dialog" aria-modal="true" aria-label="챕터 3 시작 지점 선택">
          <div className="chapter3StartSelectorBackdrop" aria-hidden="true" />
          <section className="chapter3StartSelectorPanel">
            <header className="chapter3StartSelectorHeader">
              <div>
                <small>CHAPTER 3 · START SELECT</small>
                <h2>시작 지점을 선택하십시오</h2>
              </div>
              <p>챕터 2와 같은 방식으로 스토리와 전투 구간을 바로 선택합니다.</p>
            </header>

            <div className="chapter3StartSelectorGrid">
              <button type="button" className="chapter3StartCard is-wide" onClick={() => launchStory("full")}>
                <b>FULL STORY</b>
                <strong>챕터 3 전체 진행</strong>
                <span>첫 장면부터 일반 전투, 디그리온 구간, 졸업식 엔딩까지 연속으로 진행합니다.</span>
              </button>

              <button type="button" className="chapter3StartCard" onClick={launchWave}>
                <b>WAVE</b>
                <strong>일반 몬스터 웨이브</strong>
                <span>챕터 3 일반 오염 전투를 1웨이브부터 바로 시작합니다.</span>
              </button>

              <button type="button" className="chapter3StartCard" onClick={() => launchStory("post-wave")}>
                <b>STORY · POST WAVE</b>
                <strong>정화 100% 이후</strong>
                <span>일반 전투 종료 직후 장면 16부터 스토리를 확인합니다.</span>
              </button>

              <button type="button" className="chapter3StartCard" onClick={() => launchStory("boss")}>
                <b>BOSS WAVE</b>
                <strong>디그리온 보스 웨이브</strong>
                <span>현재는 코어 진입·디그리온 등장·보스전 진입 구간을 실행하며, 실제 보스 런타임 통합 시 이 버튼에 그대로 연결됩니다.</span>
              </button>

              <button type="button" className="chapter3StartCard" onClick={() => launchStory("ending")}>
                <b>ENDING</b>
                <strong>최종 정화 · 졸업식</strong>
                <span>여섯 별 연결과 최종 정화부터 졸업식 엔딩까지 확인합니다.</span>
              </button>
            </div>

            <footer className="chapter3StartSelectorFooter">
              <span>※ 디그리온 실제 보스 전투 런타임은 추후 통합 시 BOSS SECTION 버튼에 그대로 연결됩니다.</span>
              {onExit && <button type="button" onClick={onExit}>메인으로</button>}
            </footer>
          </section>
        </div>
      )}

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
              <button type="button" className="secondary" onClick={waveOrigin === "selector" ? returnToSelector : onExit}>아니오</button>
              <button type="button" className="primary" onClick={retryWave}>예</button>
            </div>
          </section>
        </div>
      )}

      {screen === "story" && !ready && (
        <div className="chapter3StoryLoading" aria-live="polite">
          CHAPTER 3 STORY LOADING
        </div>
      )}

      {screen !== "selector" && !fullscreenEffect && !waveFailed && (
        <button
          className="chapter3StoryRouteSelect"
          type="button"
          onClick={returnToSelector}
          aria-label="챕터 3 시작 지점 선택으로 돌아가기"
        >
          구간 선택
        </button>
      )}
    </section>
  );
}
