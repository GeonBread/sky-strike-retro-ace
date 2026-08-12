import { chapter1StoryDocument as part1Document } from "./chapter1StoryPart1Document";
import { chapter1StoryDocument as part2Document } from "./chapter1StoryPart2Document";
import {
  createChapter1StoryEmbeddedAssets,
  rewriteChapter1StoryAssetReferences,
} from "./chapter1StoryAssetCatalog";
import type {
  Chapter1StoryCommand,
  Chapter1StoryEvent,
  Chapter1StoryEventType,
  Chapter1StoryPart,
  Chapter1StoryRuntimeHandle,
} from "./chapter1StoryTypes";

interface RuntimeOptions {
  part: Chapter1StoryPart;
  root: HTMLElement;
  onEvent: (event: Chapter1StoryEvent) => void;
}

type CommandHandlers = Partial<Record<Chapter1StoryCommand, () => void>>;

type AttributeSnapshot = Array<[string, string]>;

function snapshotAttributes(element: Element): AttributeSnapshot {
  return Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]);
}

function restoreAttributes(element: Element, snapshot: AttributeSnapshot): void {
  for (const attribute of Array.from(element.attributes)) {
    element.removeAttribute(attribute.name);
  }
  for (const [name, value] of snapshot) {
    element.setAttribute(name, value);
  }
}

function normalizeStoryMarkup(markup: string): string {
  return rewriteChapter1StoryAssetReferences(markup);
}

function normalizeStoryRuntimeScript(source: string, part: Chapter1StoryPart): string {
  if (part !== 2) return source;

  const bossTransitionHook = `if (storyCompletionAction === 'startBossBattle') {
      startBossBattleTransition();
      return;
    }`;
  const debugPreviewHook = `    preview: playSelectedPreview
  };`;
  const flowPreviewHook = `    preview: playSelectedPreview,
    resumeFlowPreview: previewId => {
      playSelectedPreview(previewId);
      activePreviewId = null;
    }
  };`;

  if (!source.includes(bossTransitionHook)) {
    throw new Error('Chapter 1 boss transition hook was not found in the final story runtime.');
  }
  if (!source.includes(debugPreviewHook)) {
    throw new Error('Chapter 1 preview debug hook was not found in the final story runtime.');
  }

  // 원본의 5.2초 보스전 전환 연출을 유지한 뒤 외부 보스 캔버스로 넘긴다.
  // 웨이브 정화 이후의 스토리 호출만 activePreviewId를 해제해 실제 연속 진행으로 취급한다.
  let normalized = source.replace(debugPreviewHook, flowPreviewHook);

  // 학생증은 오염 추적 직후 정상 문장으로 말하지 못하고 끊어진 단어만 출력한다.
  normalized = normalized
    .replace('"정화 에너지 충전 완료."', '"정화 에너지…… 충전……."')
    .replace('"오염 신호 역추적을 시작합니다."', '"오염…… 탐색……."')
    .replace('"핵심 오염 신호 확인."', '"핵심 신호…… 확인……."')
    .replace('"학사 서버 관리 영역."', '"학사 서버…… 관리 영역……."');

  // 비상 통제 전환 레이어를 story-stage 밖으로 옮겨 컨테이너의 overflow와 비율 제한을 받지 않게 한다.
  const battleTransitionDeclaration = `  const battleTransition = document.getElementById('battleTransition');`;
  const fullscreenBattleTransitionDeclaration = `${battleTransitionDeclaration}
  battleTransition?.closest('.chapter1-story-mount')?.appendChild(battleTransition);`;
  if (!normalized.includes(battleTransitionDeclaration)) {
    throw new Error('Chapter 1 battle transition element declaration was not found.');
  }
  normalized = normalized.replace(battleTransitionDeclaration, fullscreenBattleTransitionDeclaration);

  // 배경·전환 시네마틱 중에는 Space가 대사를 다시 호출해 연출을 처음부터 재시작하지 못하게 한다.
  const storyKeyGuard = `    if (flowMode === 'story') {
      const target = event.target;`;
  const guardedStoryKey = `    if (flowMode === 'story') {
      if (event.code === 'Space' && dialogueLayer.hidden) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const target = event.target;`;
  if (!normalized.includes(storyKeyGuard)) {
    throw new Error('Chapter 1 story key handler was not found.');
  }
  normalized = normalized.replace(storyKeyGuard, guardedStoryKey);
  return normalized;
}

function normalizeStoryStyles(styles: string): string {
  return `${rewriteChapter1StoryAssetReferences(styles)}\n\n
/* In-app integration overrides: the story owns the full viewport but is not a second app. */
html.is-embedded-story .demo-header,
html.is-embedded-story .controls,
html.is-embedded-story .scene-selector,
html.is-embedded-story #previewMenuButton,
html.is-embedded-story #endPanel,
html.is-embedded-story .dialogue-progress,
html.is-embedded-story .story-status,
html.is-embedded-story .story-location-intro,
html.is-embedded-story .scene-location,
html.is-embedded-story .portrait-frame,
html.is-embedded-story .dialogue-jump-button,
html.is-embedded-story .dialogue-jump-panel,
html.is-embedded-story .dialogue-nav-panel {
  display: none !important;
}
html.is-embedded-story body {
  margin: 0 !important;
  width: 100% !important;
  min-width: 0 !important;
  overflow: hidden !important;
}
html.is-embedded-story .demo-shell {
  width: 100% !important;
  min-height: 100dvh !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
html.is-embedded-story .story-stage {
  max-height: 100dvh !important;
}
html.is-embedded-story .story-stage.is-game-mode {
  width: min(96dvh, 100vw) !important;
}
/* 대사창은 초상화 영역을 제거하고 텍스트가 전체 폭을 사용한다. */
html.is-embedded-story .dialogue-box {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 0 !important;
}
html.is-embedded-story .dialogue-copy,
html.is-embedded-story .dialogue-layer.speaker-right .dialogue-copy {
  grid-column: 1 !important;
  grid-row: 1 !important;
  width: 100% !important;
}
/* 시작 로고 · 제작자 · NOTICE 연출은 브라우저 전체 화면을 사용한다. */
html.is-embedded-story .story-stage.is-opening-cinematic {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  max-width: none !important;
  height: 100dvh !important;
  max-height: none !important;
  aspect-ratio: auto !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  z-index: 100000 !important;
}
html.is-embedded-story .story-stage.is-opening-cinematic .opening-credits-sequence,
html.is-embedded-story .story-stage.is-opening-cinematic .story-effect-layer {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  max-width: none !important;
  max-height: none !important;
}
/* 장소가 실제로 바뀔 때만 중앙에 장소명을 짧게 띄운다. */
.chapter1-location-title-overlay {
  position: fixed;
  inset: 0;
  z-index: 160000;
  display: grid;
  place-items: center;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity .32s ease, visibility .32s ease;
}
.chapter1-location-title-overlay.is-active {
  opacity: 1;
  visibility: visible;
}
.chapter1-location-title-overlay::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(78vw, 850px);
  height: 150px;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse at center, rgba(0,0,0,.72) 0%, rgba(0,0,0,.42) 48%, rgba(0,0,0,0) 78%);
  filter: blur(4px);
}
.chapter1-location-title-overlay strong {
  position: relative;
  padding: 24px 36px;
  color: #fff;
  font-family: "Noto Sans KR", system-ui, sans-serif;
  font-size: clamp(30px, 5vw, 66px);
  font-weight: 900;
  letter-spacing: -.035em;
  text-align: center;
  text-shadow: 0 4px 22px rgba(0,0,0,.95), 0 0 20px rgba(255,255,255,.12);
}
/* 학사 시스템 비상 통제 전환은 스토리 프레임에 갇히지 않고 브라우저 전체를 덮는다. */
html.is-embedded-story .battle-transition {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  z-index: 100000 !important;
}
html.is-embedded-story .battle-transition-title strong {
  font-size: clamp(56px, 10vw, 150px) !important;
}
`;
}

export function createChapter1StoryRuntime({
  part,
  root,
  onEvent,
}: RuntimeOptions): Chapter1StoryRuntimeHandle {
  const storyDocument = part === 1 ? part1Document : part2Document;
  const htmlAttributeSnapshot = snapshotAttributes(document.documentElement);
  const bodyAttributeSnapshot = snapshotAttributes(document.body);
  const commandHandlers: CommandHandlers = {};
  const timeoutIds = new Set<number>();
  const intervalIds = new Set<number>();
  const animationFrameIds = new Set<number>();
  const eventListeners: Array<{
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }> = [];
  let disposed = false;

  const trackedSetTimeout: typeof window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const id = window.setTimeout(() => {
      timeoutIds.delete(id);
      if (typeof handler === "function") handler(...args);
      else window.eval(handler);
    }, timeout);
    timeoutIds.add(id);
    return id;
  }) as typeof window.setTimeout;

  const trackedClearTimeout: typeof window.clearTimeout = ((id?: number) => {
    if (typeof id === "number") timeoutIds.delete(id);
    window.clearTimeout(id);
  }) as typeof window.clearTimeout;

  const trackedSetInterval: typeof window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const id = window.setInterval(handler, timeout, ...args);
    intervalIds.add(id);
    return id;
  }) as typeof window.setInterval;

  const trackedClearInterval: typeof window.clearInterval = ((id?: number) => {
    if (typeof id === "number") intervalIds.delete(id);
    window.clearInterval(id);
  }) as typeof window.clearInterval;

  const trackedRequestAnimationFrame: typeof window.requestAnimationFrame = (callback) => {
    const id = window.requestAnimationFrame((time) => {
      animationFrameIds.delete(id);
      if (!disposed) callback(time);
    });
    animationFrameIds.add(id);
    return id;
  };

  const trackedCancelAnimationFrame: typeof window.cancelAnimationFrame = (id) => {
    animationFrameIds.delete(id);
    window.cancelAnimationFrame(id);
  };

  const localWindowValues = new Map<PropertyKey, unknown>();
  localWindowValues.set("EMBEDDED_ASSETS", createChapter1StoryEmbeddedAssets());

  let scopedWindow: Window & typeof globalThis;
  scopedWindow = new Proxy(window, {
    get(target, property) {
      if (property === "window" || property === "self" || property === "parent") return scopedWindow;
      if (property === "setTimeout") return trackedSetTimeout;
      if (property === "clearTimeout") return trackedClearTimeout;
      if (property === "setInterval") return trackedSetInterval;
      if (property === "clearInterval") return trackedClearInterval;
      if (property === "requestAnimationFrame") return trackedRequestAnimationFrame;
      if (property === "cancelAnimationFrame") return trackedCancelAnimationFrame;
      if (property === "addEventListener") {
        return (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
          eventListeners.push({ type, listener, options });
          window.addEventListener(type, listener, options);
        };
      }
      if (property === "removeEventListener") {
        return (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
          window.removeEventListener(type, listener, options);
          const index = eventListeners.findIndex((entry) => entry.type === type && entry.listener === listener);
          if (index >= 0) eventListeners.splice(index, 1);
        };
      }
      if (localWindowValues.has(property)) return localWindowValues.get(property);
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(_target, property, value) {
      localWindowValues.set(property, value);
      return true;
    },
    has(target, property) {
      return localWindowValues.has(property) || property in target;
    },
  }) as Window & typeof globalThis;

  const storyBridge = {
    emit(type: Chapter1StoryEventType, detail: Record<string, unknown> = {}) {
      if (!disposed) onEvent({ type, detail });
    },
    register(handlers: CommandHandlers) {
      Object.assign(commandHandlers, handlers);
    },
  };

  const styleElement = document.createElement("style");
  styleElement.dataset.chapter1StoryRuntime = String(part);
  styleElement.textContent = normalizeStoryStyles(storyDocument.styles);
  document.head.appendChild(styleElement);
  root.innerHTML = normalizeStoryMarkup(storyDocument.markup);

  const locationTitles = new Set([
    "경북대학교 중앙광장",
    "경북대학교 도서관 구관 앞",
    "공대 12호관 앞",
    "도서관 구관 출입구",
    "공대 강의실",
    "중앙광장 안내 구역",
    "강의실 안내 지점",
    "학사 통로",
    "봉쇄된 학사 통로",
    "오염된 학사 통로",
    "학사 서버 외곽",
    "학사 서버 내부 통로",
    "학사 서버 심층부",
    "학사 서버 관리 영역 입구",
    "학사 서버 관리 영역 내부",
    "학사 서버 관리 영역",
    "정상화된 학사 서버",
    "경북대학교 본관",
  ]);
  const locationOverlay = document.createElement("div");
  locationOverlay.className = "chapter1-location-title-overlay";
  locationOverlay.setAttribute("aria-hidden", "true");
  const locationOverlayText = document.createElement("strong");
  locationOverlay.appendChild(locationOverlayText);
  root.appendChild(locationOverlay);
  let locationOverlayTimer: number | null = null;
  let lastLocationTitle = "";
  const sceneTitleElement = root.querySelector<HTMLElement>("#sceneTitle");
  const showLocationTitle = (rawTitle: string) => {
    const title = rawTitle.trim();
    if (!locationTitles.has(title) || title === lastLocationTitle) return;
    lastLocationTitle = title;
    locationOverlayText.textContent = title;
    locationOverlay.classList.remove("is-active");
    void locationOverlay.offsetWidth;
    locationOverlay.classList.add("is-active");
    if (locationOverlayTimer !== null) trackedClearTimeout(locationOverlayTimer);
    locationOverlayTimer = trackedSetTimeout(() => {
      locationOverlayTimer = null;
      locationOverlay.classList.remove("is-active");
    }, 1750) as unknown as number;
  };
  const locationObserver = sceneTitleElement
    ? new MutationObserver(() => showLocationTitle(sceneTitleElement.textContent ?? ""))
    : null;
  if (sceneTitleElement && locationObserver) {
    locationObserver.observe(sceneTitleElement, { childList: true, characterData: true, subtree: true });
  }

  const executeScript = (source: string): void => {
    const runner = new Function(
      "window",
      "document",
      "storyBridge",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      source,
    );
    runner(
      scopedWindow,
      document,
      storyBridge,
      trackedRequestAnimationFrame,
      trackedCancelAnimationFrame,
      trackedSetTimeout,
      trackedClearTimeout,
      trackedSetInterval,
      trackedClearInterval,
    );
  };

  try {
    for (const bootstrapScript of storyDocument.bootstrapScripts) executeScript(bootstrapScript);
    executeScript(normalizeStoryRuntimeScript(storyDocument.runtimeScript, part));
  } catch (error) {
    dispose();
    throw error;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const id of timeoutIds) window.clearTimeout(id);
    for (const id of intervalIds) window.clearInterval(id);
    for (const id of animationFrameIds) window.cancelAnimationFrame(id);
    timeoutIds.clear();
    intervalIds.clear();
    animationFrameIds.clear();
    for (const { type, listener, options } of eventListeners) {
      window.removeEventListener(type, listener, options);
    }
    eventListeners.length = 0;
    locationObserver?.disconnect();
    if (locationOverlayTimer !== null) window.clearTimeout(locationOverlayTimer);
    locationOverlayTimer = null;
    styleElement.remove();
    root.replaceChildren();
    restoreAttributes(document.documentElement, htmlAttributeSnapshot);
    restoreAttributes(document.body, bodyAttributeSnapshot);
  }

  return {
    invoke(command, detail) {
      if (command === "preview") {
        const previewId = String(detail?.previewId ?? "");
        const debugApi = localWindowValues.get("__CHAPTER1_FLOW_DEBUG__") as
          | {
              preview?: (id: string) => void;
              resumeFlowPreview?: (id: string) => void;
            }
          | undefined;
        if (previewId) {
          if (detail?.flowContinuation === true) debugApi?.resumeFlowPreview?.(previewId);
          else debugApi?.preview?.(previewId);
        }
        return;
      }
      commandHandlers[command]?.();
    },
    dispose,
  };
}
