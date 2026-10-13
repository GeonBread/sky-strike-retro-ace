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
  Chapter1StoryRuntimeState,
} from "../../story/chapter1/chapter1StoryTypes";
import "./chapter1StoryPlayer.css";

export interface Chapter1StoryPlayerHandle {
  continueAfterWavesClear(): void;
  showBossPhase2Dialogue(): void;
  continueAfterBossClear(): void;
  jumpToPreview(previewId: string): void;
  getRuntimeState(): Chapter1StoryRuntimeState | null;
  restoreRuntimeState(state: Chapter1StoryRuntimeState): boolean;
}

export interface Chapter1StoryPreviewRequest {
  id: string;
  token: number;
  flowContinuation?: boolean;
}

interface Chapter1StoryPlayerProps {
  part: Chapter1StoryPart;
  hidden?: boolean;
  previewRequest?: Chapter1StoryPreviewRequest | null;
  onEvent: (event: Chapter1StoryEvent) => void;
}

export const Chapter1StoryPlayer = forwardRef<
  Chapter1StoryPlayerHandle,
  Chapter1StoryPlayerProps
>(function Chapter1StoryPlayer({ part, hidden = false, previewRequest = null, onEvent }, ref) {
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

  useEffect(() => {
    if (!previewRequest) return;
    runtimeRef.current?.invoke("preview", {
      previewId: previewRequest.id,
      flowContinuation: previewRequest.flowContinuation === true,
    });
  }, [part, previewRequest]);

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
    jumpToPreview(previewId: string) {
      runtimeRef.current?.invoke("preview", { previewId });
    },
    getRuntimeState() {
      return runtimeRef.current?.getState() ?? null;
    },
    restoreRuntimeState(state: Chapter1StoryRuntimeState) {
      return runtimeRef.current?.restoreState(state) ?? false;
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
