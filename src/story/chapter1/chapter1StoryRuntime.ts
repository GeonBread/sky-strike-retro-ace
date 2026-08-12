import { chapter1StoryDocument as part1Document } from "./chapter1StoryPart1Document";
import { chapter1StoryDocument as part2Document } from "./chapter1StoryPart2Document";
import {
  createChapter1StoryEmbeddedAssets,
  rewriteChapter1StoryAssetReferences,
} from "./chapter1StoryAssetCatalog";
import { sfx } from "../../game/AudioSystem";
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
  let normalized = source;

  // 연출 종료 뒤 일반 대사가 이어질 때 대사 레이어가 숨김 상태로 남아
  // Space를 한 번 눌러야 다음 내용이 보이는 현상을 방지한다.
  const typeCurrentLineHook = `function typeCurrentLine() {
    const item = currentDialogues[dialogueIndex];`;
  const autoRevealDialogueHook = `function typeCurrentLine() {
    const item = currentDialogues[dialogueIndex];
    if (item && !item.effectOnly && dialogueLayer.hidden) {
      dialogueLayer.hidden = false;
      dialogueLayer.classList.remove('is-opening');
    }`;
  if (!normalized.includes(typeCurrentLineHook)) {
    throw new Error('Chapter 1 dialogue line hook was not found.');
  }
  normalized = normalized.replace(typeCurrentLineHook, autoRevealDialogueHook);

  // 대사창이 숨겨진 시네마틱에서는 Space 입력으로 숨은 대사를 넘기거나
  // 연출을 재시작하지 못하게 한다. 연출은 등록된 타이머만으로 자동 진행된다.
  const storyKeyPatterns = [
    `    if (flowMode === 'story') {
      const target = event.target;`,
    `    if (flowMode === 'story') {
      if (event.repeat) return;`,
  ];
  let keyGuardApplied = false;
  for (const pattern of storyKeyPatterns) {
    if (!normalized.includes(pattern)) continue;
    const replacement = pattern.replace(
      `    if (flowMode === 'story') {`,
      `    if (flowMode === 'story') {
      if (event.code === 'Space' && dialogueLayer.hidden) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }`,
    );
    normalized = normalized.replace(pattern, replacement);
    keyGuardApplied = true;
    break;
  }
  if (!keyGuardApplied) {
    throw new Error('Chapter 1 story key handler was not found.');
  }

  // 장소명은 sceneTitle 변경 전체를 감시하지 않고 실제 장소 이동 연출에서만 호출한다.
  if (part === 1) {
    // 계단 추격 장면의 기존 WebAudio 합성음을 더 묵직한 전투 연출용 사운드로 교체한다.
    // 드론 접근 -> 락온/충전 -> 출석탄 발사/비행 -> 암전 충격이 한 흐름으로 들리도록 구성한다.
    const attendanceChargeSoundStart = `    if (effectId === 'attendance-drone-charge') {`;
    const attendanceBlackHoldSoundStart = `    if (effectId === 'attendance-black-hold') {`;
    const attendanceChargeSoundIndex = normalized.indexOf(attendanceChargeSoundStart);
    const attendanceBlackHoldSoundIndex = normalized.indexOf(attendanceBlackHoldSoundStart, attendanceChargeSoundIndex);
    if (attendanceChargeSoundIndex < 0 || attendanceBlackHoldSoundIndex < 0) {
      throw new Error('Chapter 1 attendance cinematic sound hooks were not found.');
    }
    const upgradedAttendanceSoundBlock = `    if (effectId === 'attendance-escape-run-in') {
      // 계단을 따라 추격해 오는 드론의 엔진음: 저역 추진음과 가까워지는 기계 펄스를 겹친다.
      synthTone({ frequency: 42, endFrequency: 58, duration: 5.85, gain: .082, type: 'sawtooth', filterFrequency: 360, attack: .18, release: .5 });
      synthTone({ frequency: 84, endFrequency: 126, duration: 5.85, gain: .028, type: 'triangle', filterFrequency: 720, attack: .15, release: .45, detune: -8 });
      [520, 1430, 2250, 2980, 3630, 4190, 4670, 5080].forEach((delay, index) => {
        scheduleCinematicSound(() => {
          synthNoise({ duration: .18, gain: .035 + index * .003, filterType: 'bandpass', frequency: 280 + index * 42, endFrequency: 980 + index * 75, q: 1.2, attack: .004, release: .11 });
          synthTone({ frequency: 72 + index * 5, endFrequency: 54 + index * 3, duration: .16, gain: .032, type: 'sine', filterFrequency: 420, attack: .004, release: .12 });
        }, delay);
      });
      [1150, 2780, 4050, 4930].forEach((delay, index) => {
        scheduleCinematicSound(() => synthNoise({ duration: .42, gain: .05 + index * .006, filterType: 'bandpass', frequency: 520, endFrequency: 2100 + index * 250, q: .72, attack: .01, release: .24 }), delay);
      });
      return;
    }

    if (effectId === 'attendance-drone-charge') {
      // 값싼 비프음 대신 저역 전원 상승, 락온 펄스, 압축되는 고역 스윕을 단계적으로 쌓는다.
      synthTone({ frequency: 46, endFrequency: 78, duration: 2.92, gain: .095, type: 'sine', filterFrequency: 420, attack: .08, release: .28 });
      synthTone({ frequency: 88, endFrequency: 188, duration: 2.92, gain: .052, type: 'sawtooth', filterFrequency: 760, attack: .06, release: .24, detune: -5 });
      synthNoise({ duration: 2.78, gain: .034, filterType: 'bandpass', frequency: 240, endFrequency: 2500, q: 1.15, attack: .12, release: .26 });
      [420, 980, 1450, 1830, 2140, 2380, 2560].forEach((delay, index) => {
        scheduleCinematicSound(() => {
          const base = 430 + index * 62;
          synthTone({ frequency: base, endFrequency: base * 1.42, duration: .105, gain: .026 + index * .0025, type: 'triangle', filterFrequency: 2400, attack: .002, release: .075 });
          synthNoise({ duration: .07, gain: .022, filterType: 'highpass', frequency: 1800 + index * 120, endFrequency: 4200, q: .8, attack: .001, release: .05 });
        }, delay);
      });
      scheduleCinematicSound(() => {
        synthTone({ frequency: 138, endFrequency: 420, duration: .48, gain: .065, type: 'sawtooth', filterFrequency: 1500, attack: .004, release: .18 });
        synthNoise({ duration: .34, gain: .07, filterType: 'bandpass', frequency: 620, endFrequency: 3600, q: .75, attack: .002, release: .2 });
      }, 2470);
      scheduleCinematicSound(() => {
        synthTone({ frequency: 64, endFrequency: 48, duration: .32, gain: .11, type: 'sine', filterFrequency: 360, attack: .002, release: .19 });
        synthNoise({ duration: .10, gain: .06, filterType: 'highpass', frequency: 2600, endFrequency: 5200, q: .7, attack: .001, release: .07 });
      }, 2780);
      return;
    }

    if (effectId === 'attendance-stamp-flight-blackout') {
      // 발사 순간의 포격감 + 탄이 화면을 가르는 통과음 + 암전 직전의 저역 충격을 분리한다.
      playLaunchImpact();
      synthNoise({ duration: .14, gain: .17, filterType: 'highpass', frequency: 2200, endFrequency: 6200, q: .55, attack: .001, release: .08 });
      synthTone({ frequency: 920, endFrequency: 180, duration: .22, gain: .055, type: 'sawtooth', filterFrequency: 2400, attack: .001, release: .12 });
      synthNoise({ duration: 1.55, gain: .12, filterType: 'bandpass', frequency: 520, endFrequency: 5200, q: .58, attack: .008, release: .38 });
      synthTone({ frequency: 172, endFrequency: 62, duration: 1.42, gain: .052, type: 'sawtooth', filterFrequency: 1050, attack: .006, release: .42 });
      [280, 610, 930, 1210, 1480].forEach((delay, index) => {
        scheduleCinematicSound(() => {
          synthNoise({ duration: .20, gain: .072 - index * .005, filterType: 'highpass', frequency: 980 + index * 340, endFrequency: 5200, q: .48, attack: .001, release: .14 });
        }, delay);
      });
      scheduleCinematicSound(() => {
        synthNoise({ duration: .55, gain: .11, filterType: 'bandpass', frequency: 1600, endFrequency: 340, q: .65, attack: .002, release: .34 });
        synthTone({ frequency: 410, endFrequency: 92, duration: .46, gain: .05, type: 'triangle', filterFrequency: 1200, attack: .002, release: .26 });
      }, 1620);
      scheduleCinematicSound(() => {
        synthTone({ frequency: 72, endFrequency: 29, duration: 1.05, gain: .18, type: 'sine', filterFrequency: 340, attack: .002, release: .62 });
        synthTone({ frequency: 144, endFrequency: 48, duration: .72, gain: .08, type: 'triangle', filterFrequency: 620, attack: .002, release: .42 });
        synthNoise({ duration: .42, gain: .13, filterType: 'lowpass', frequency: 980, endFrequency: 62, q: .4, attack: .001, release: .3 });
        synthNoise({ duration: .16, gain: .07, filterType: 'highpass', frequency: 2100, endFrequency: 4800, q: .55, attack: .001, release: .11 });
      }, 2750);
      scheduleCinematicSound(() => synthTone({ frequency: 760, endFrequency: 220, duration: .72, gain: .018, type: 'sine', filterFrequency: 1200, attack: .02, release: .58 }), 3060);
      return;
    }

`;
    normalized = normalized.slice(0, attendanceChargeSoundIndex)
      + upgradedAttendanceSoundBlock
      + normalized.slice(attendanceBlackHoldSoundIndex);

    // 출석탄 연출 뒤 호반우의 '뭐야?!' 수동 대사 정지를 제거한다.
    // 이제 출석탄 시네마틱이 끝나는 즉시 학생증 정화 연출이 effectOnly -> effectOnly로 자동 연결된다.
    const attendanceManualPause = `    {
      left: null,
      right: 'hobanwoo',
      speaker: 'hobanwoo',
      text: '뭐야?!',
      illustration: {
        type: 'effect',
        effect: 'attendance-black-hold',
        label: ''
      },
      scene: forcedAttendanceScene
    },
`;
    if (!normalized.includes(attendanceManualPause)) {
      throw new Error('Chapter 1 attendance manual pause hook was not found.');
    }
    while (normalized.includes(attendanceManualPause)) {
      normalized = normalized.replace(attendanceManualPause, '');
    }

    const locationIntroHook = `    if (item.effect === 'location-title-intro') {
      const introScene = item.scene || {};`;
    const locationIntroWithTitle = `    if (item.effect === 'location-title-intro') {
      const introScene = item.scene || {};
      window.__CHAPTER1_SHOW_LOCATION_TITLE__?.(introScene.title || '');`;
    if (normalized.includes(locationIntroHook)) {
      normalized = normalized.replace(locationIntroHook, locationIntroWithTitle);
    }

    const locationTransitionHook = `    } else if (item.effect === 'location-transition') {
      const destination = item.transitionScene || item.scene || {};`;
    const locationTransitionWithTitle = `    } else if (item.effect === 'location-transition') {
      const destination = item.transitionScene || item.scene || {};
      window.__CHAPTER1_SHOW_LOCATION_TITLE__?.(destination.title || '');`;
    if (normalized.includes(locationTransitionHook)) {
      normalized = normalized.replace(locationTransitionHook, locationTransitionWithTitle);
    }
    return normalized;
  }

  const bossTransitionHook = `if (storyCompletionAction === 'startBossBattle') {
      startBossBattleTransition();
      return;
    }`;
  const debugPreviewHook = `    preview: playSelectedPreview
  };`;
  const flowPreviewHook = `    preview: playSelectedPreview,
    resumeFlowPreview: previewId => {
      playSelectedPreview(previewId);
      if (previewId === 'chapter-end-dialogue') {
        storyCompletionAction = 'finish';
      }
      activePreviewId = null;
    }
  };`;

  if (!normalized.includes(bossTransitionHook)) {
    throw new Error('Chapter 1 boss transition hook was not found in the final story runtime.');
  }
  if (!normalized.includes(debugPreviewHook)) {
    throw new Error('Chapter 1 preview debug hook was not found in the final story runtime.');
  }

  // 원본의 5.2초 보스전 전환 연출을 유지한 뒤 외부 보스 캔버스로 넘긴다.
  // 웨이브 정화 이후의 스토리 호출만 activePreviewId를 해제해 실제 연속 진행으로 취급한다.
  normalized = normalized.replace(debugPreviewHook, flowPreviewHook);

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

  // 100% 직후의 대사에서는 장소명을 띄우지 않는다. 실제로 입구 배경이 공개되는 순간에만 표시한다.
  const preEnergyLocationHook = `    showSceneBackgroundOnly(energy100ClosedEntranceScene);
    storyStage.classList.add('is-pre-energy-flight-in');`;
  const preEnergyLocationWithTitle = `    showSceneBackgroundOnly(energy100ClosedEntranceScene);
    window.__CHAPTER1_SHOW_LOCATION_TITLE__?.(energy100ClosedEntranceScene.title || '');
    storyStage.classList.add('is-pre-energy-flight-in');`;
  if (normalized.includes(preEnergyLocationHook)) {
    normalized = normalized.replace(preEnergyLocationHook, preEnergyLocationWithTitle);
  }

  const bossInteriorLocationHook = `      currentSceneId = '';
      updateScene(bossInteriorPreviewScene, { silent: true });
      setBossEntryStageClass('is-entry-interior-tour');`;
  const bossInteriorLocationWithTitle = `      currentSceneId = '';
      updateScene(bossInteriorPreviewScene, { silent: true });
      window.__CHAPTER1_SHOW_LOCATION_TITLE__?.(bossInteriorPreviewScene.title || '');
      setBossEntryStageClass('is-entry-interior-tour');`;
  if (normalized.includes(bossInteriorLocationHook)) {
    normalized = normalized.replace(bossInteriorLocationHook, bossInteriorLocationWithTitle);
  }

  // 보스 완전 정화 후 두 별이 나타나는 순간 전용 효과음을 한 번 재생한다.
  const starRevealHook = `  function startStarRevealCinematic(nextCompletionAction = 'startStarAbsorption') {
    clearStarRecoveryCinematic();`;
  const starRevealWithSound = `  function startStarRevealCinematic(nextCompletionAction = 'startStarAbsorption') {
    clearStarRecoveryCinematic();
    window.__CHAPTER1_PLAY_STORY_SFX__?.('star-reveal');`;
  if (!normalized.includes(starRevealHook)) {
    throw new Error('Chapter 1 star reveal cinematic hook was not found.');
  }
  normalized = normalized.replace(starRevealHook, starRevealWithSound);

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
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding-top: clamp(30px, 3vw, 38px) !important;
  padding-bottom: clamp(30px, 3vw, 38px) !important;
}
html.is-embedded-story .dialogue-copy,
html.is-embedded-story .dialogue-layer.speaker-right .dialogue-copy {
  grid-column: 1 !important;
  grid-row: 1 !important;
  width: 100% !important;
  min-height: 0 !important;
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr) !important;
  align-items: center !important;
  align-content: center !important;
  column-gap: clamp(12px, 1.8vw, 20px) !important;
  margin: auto 0 !important;
}
html.is-embedded-story .dialogue-marker {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  align-self: center !important;
  justify-self: center !important;
  line-height: 1 !important;
  transform: none !important;
}
html.is-embedded-story .dialogue-text {
  align-self: center !important;
  margin: 0 !important;
}

/* 학사 서버 관리 영역 진입 시네마틱은 브라우저 전체 화면을 사용한다. */
html.is-embedded-story .story-stage:is(
  .is-entry-story13-zoom,
  .is-entry-open-hold,
  .is-entry-door-rush,
  .is-entry-red-hold,
  .is-entry-interior-tour
) {
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
html.is-embedded-story .story-stage:is(
  .is-entry-story13-zoom,
  .is-entry-open-hold,
  .is-entry-door-rush,
  .is-entry-red-hold,
  .is-entry-interior-tour
) .background-stack,
html.is-embedded-story .story-stage:is(
  .is-entry-story13-zoom,
  .is-entry-open-hold,
  .is-entry-door-rush,
  .is-entry-red-hold,
  .is-entry-interior-tour
) .scene-background {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

/* 기존 방사형 직선 광선은 제거하고, 중앙 광원·비네트·줌으로 내부 진입감을 만든다. */
html.is-embedded-story .story-stage.is-entry-door-rush .scene-background.is-visible {
  animation: chapter1AcademicEntryBackgroundRush 1.35s cubic-bezier(.12,.82,.18,1) both !important;
}
html.is-embedded-story .story-stage.is-entry-door-rush::before {
  background:
    radial-gradient(ellipse at 50% 50%, rgba(255,248,242,.9) 0 4%, rgba(255,92,72,.6) 11%, rgba(181,0,22,.32) 28%, rgba(58,0,8,.12) 53%, rgba(0,0,0,0) 72%),
    linear-gradient(180deg, rgba(92,0,10,.06), rgba(185,0,14,.52)) !important;
  mix-blend-mode: screen !important;
  animation: chapter1AcademicEntryGlow 1.35s ease-in both !important;
}
html.is-embedded-story .story-stage.is-entry-door-rush::after {
  inset: 0 !important;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(255,255,255,.42) 0 5%, rgba(255,122,102,.18) 15%, rgba(120,0,16,.08) 34%, transparent 58%),
    radial-gradient(ellipse at 50% 50%, transparent 0 22%, rgba(54,0,8,.18) 48%, rgba(0,0,0,.82) 100%) !important;
  box-shadow: inset 0 0 150px rgba(0,0,0,.58) !important;
  filter: blur(0) !important;
  animation: chapter1AcademicEntryTunnel 1.35s cubic-bezier(.12,.82,.18,1) both !important;
}
html.is-embedded-story .story-stage.is-entry-red-hold::before {
  background:
    radial-gradient(ellipse at 50% 48%, rgba(255,70,60,.24) 0 12%, rgba(139,0,12,.68) 50%, rgba(15,0,3,.98) 100%) !important;
}
html.is-embedded-story .story-stage.is-entry-red-hold::after {
  background:
    radial-gradient(ellipse at 50% 50%, rgba(255,80,65,.1) 0 14%, rgba(90,0,10,.12) 42%, rgba(0,0,0,.68) 100%) !important;
}
@keyframes chapter1AcademicEntryBackgroundRush {
  0% { transform: scale(1.07); filter: saturate(.98) brightness(.88) contrast(1.04); }
  38% { transform: scale(1.18); filter: saturate(1.05) brightness(.84) contrast(1.05); }
  100% { transform: scale(1.55); filter: saturate(.92) brightness(.62) contrast(1.08) blur(2px); }
}
@keyframes chapter1AcademicEntryGlow {
  0% { opacity: 0; transform: scale(.78); }
  34% { opacity: .72; transform: scale(.94); }
  100% { opacity: 1; transform: scale(1.38); }
}
@keyframes chapter1AcademicEntryTunnel {
  0% { opacity: .28; transform: scale(1); }
  42% { opacity: .62; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1.28); }
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
  localWindowValues.set("__CHAPTER1_SHOW_LOCATION_TITLE__", showLocationTitle);
  localWindowValues.set("__CHAPTER1_PLAY_STORY_SFX__", (kind: string) => {
    if (kind === "star-reveal") sfx.starReveal();
  });

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
