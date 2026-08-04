import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { createChapter1StoryRuntime } from "../../story/chapter1/chapter1StoryRuntime";
import type {
  Chapter1StoryEvent,
  Chapter1StoryPart,
  Chapter1StoryRuntimeHandle,
} from "../../story/chapter1/chapter1StoryTypes";
import "./chapter1StoryPlayer.css";

export interface Chapter1StoryPlayerHandle {
  continueAfterWavesClear(): void;
  showBossPhase2Dialogue(): void;
  continueAfterBossClear(): void;
}

interface Chapter1StoryPlayerProps {
  part: Chapter1StoryPart;
  hidden?: boolean;
  onEvent: (event: Chapter1StoryEvent) => void;
}

export const Chapter1StoryPlayer = forwardRef<
  Chapter1StoryPlayerHandle,
  Chapter1StoryPlayerProps
>(function Chapter1StoryPlayer({ part, hidden = false, onEvent }, ref) {
  const mountRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Chapter1StoryRuntimeHandle | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const root = mountRef.current;
    if (!root) return;
    const runtime = createChapter1StoryRuntime({
      part,
      root,
      onEvent: (event) => onEventRef.current(event),
    });
    runtimeRef.current = runtime;
    return () => {
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, [part]);

  useImperativeHandle(ref, () => ({
    continueAfterWavesClear() {
      runtimeRef.current?.invoke("wavesCleared");
    },
    showBossPhase2Dialogue() {
      runtimeRef.current?.invoke("showPhase2Dialogue");
    },
    continueAfterBossClear() {
      runtimeRef.current?.invoke("bossCleared");
    },
  }), []);

  return (
    <div
      className={`chapter1-story-player${hidden ? " is-hidden" : ""}`}
      aria-hidden={hidden}
    >
      <div ref={mountRef} className="chapter1-story-mount" />
    </div>
  );
});
