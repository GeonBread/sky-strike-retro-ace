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
  const [fullscreenEffect, setFullscreenEffect] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const frameSrc = useMemo(() => "/chapter3_story/index.html", []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<Chapter3BridgeMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.channel !== "sky-strike-chapter3-story") return;

      if (message.type === "ready") {
        setReady(true);
        return;
      }

      if (message.type === "effect-start") {
        const effectId = message.detail?.effectId || "";
        if (FULLSCREEN_EFFECTS.has(effectId)) setFullscreenEffect(effectId);
        return;
      }

      if (message.type === "effect-end") {
        const effectId = message.detail?.effectId || "";
        setFullscreenEffect((current) => (current === effectId ? null : current));
        return;
      }

      if (message.type === "story-complete") {
        setFullscreenEffect(null);
        onComplete?.();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onComplete]);

  return (
    <section
      className={`chapter3StoryExperience${fullscreenEffect ? " is-fullscreen-effect" : ""}`}
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

      {!ready && (
        <div className="chapter3StoryLoading" aria-live="polite">
          CHAPTER 3 STORY LOADING
        </div>
      )}

      {onExit && !fullscreenEffect && (
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
