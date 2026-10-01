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
  Chapter1StoryRuntimeState,
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

  // ESC 중단/재접속 시 현재 대사 위치를 복원할 수 있도록 디버그 API에
  // completionAction과 resumeCheckpoint를 추가한다. 일반 플레이에서는 이 API를 UI에 노출하지 않는다.
  const debugStateHook = `getState: () => ({ mode: flowMode, segment: currentSegmentId, dialogueIndex, kills:`;
  const debugStateWithCompletion = `getState: () => ({ mode: flowMode, segment: currentSegmentId, dialogueIndex, completionAction: storyCompletionAction, kills:`;
  if (!normalized.includes(debugStateHook)) {
    throw new Error('Chapter 1 story progress state hook was not found.');
  }
  normalized = normalized.replace(debugStateHook, debugStateWithCompletion);

  const debugSetKillsHook = `    setKills: value => {`;
  const debugResumeCheckpointHook = `    resumeCheckpoint: checkpoint => {
      const segmentId = String(checkpoint?.segment || '');
      if (!segmentId || !storySegments[segmentId]) return false;
      clearFlowTimers();
      activePreviewId = null;
      resetGameState();
      gameLayer.hidden = true;
      storyStage.classList.remove('is-game-mode');
      storyStage.classList.add('is-full-story');
      const completionAction = String(checkpoint?.completionAction || 'finish');
      beginStory(segmentId, completionAction, { forceFullScene: true, preserveScene: false });
      const requestedIndex = Math.max(0, Math.floor(Number(checkpoint?.dialogueIndex) || 0));
      dialogueIndex = Math.min(Math.max(0, currentDialogues.length - 1), requestedIndex);
      if (currentDialogues[dialogueIndex]?.effectOnly) {
        dialogueLayer.hidden = true;
        dialogueLayer.classList.remove('is-opening');
      }
      return true;
    },
    setKills: value => {`;
  if (!normalized.includes(debugSetKillsHook)) {
    throw new Error('Chapter 1 story checkpoint restore hook was not found.');
  }
  normalized = normalized.replace(debugSetKillsHook, debugResumeCheckpointHook);

  // 프롤로그 입학식 장면은 두리번거리는 wander 카메라를 사용하지 않는다.
  // 검은 화면을 잠깐 유지한 뒤 약 1.4초간 페이드 인하고, 완전히 나타난 원본 그림을 약 3초간 정지 표시한다.
  const admissionWanderPreview = `      effectOnly: true, effect: 'scene-preview', previewStyle: 'wander', effectDuration: 3000, scene: { ...admissionDayScene }`;
  const admissionStaticPreview = `      effectOnly: true, effect: 'scene-preview', previewStyle: 'admission-hold-fit', effectDuration: 4650, scene: { ...admissionDayScene }`;
  if (normalized.includes(admissionWanderPreview)) {
    normalized = normalized.replace(admissionWanderPreview, admissionStaticPreview);
  }

  // 게이트키퍼 최초 등장 이펙트는 story-stage 폭 확장에 의존하지 않고 전체 뷰포트 호스트로 직접 이동시킨다.
  if (part === 2) {
    const storyEffectLayerDeclarationHook = `  const storyEffectLayer = document.getElementById('storyEffectLayer');`;
    const storyEffectLayerViewportSetup = `  const storyEffectLayer = document.getElementById('storyEffectLayer');
  const storyEffectLayerHome = storyEffectLayer.parentNode;
  const storyEffectLayerHomeNextSibling = storyEffectLayer.nextSibling;
  const storyEffectViewportHost = document.body;

  function restoreStoryEffectLayerHome() {
    storyEffectLayer.classList.remove('is-global-gatekeeper-entrance');
    if (!storyEffectLayerHome || storyEffectLayer.parentNode === storyEffectLayerHome) return;
    if (storyEffectLayerHomeNextSibling && storyEffectLayerHomeNextSibling.parentNode === storyEffectLayerHome) {
      storyEffectLayerHome.insertBefore(storyEffectLayer, storyEffectLayerHomeNextSibling);
    } else {
      storyEffectLayerHome.appendChild(storyEffectLayer);
    }
  }

  function mountStoryEffectLayerFullscreen() {
    storyEffectLayer.classList.add('is-global-gatekeeper-entrance');
    if (storyEffectLayer.parentNode !== storyEffectViewportHost) storyEffectViewportHost.appendChild(storyEffectLayer);
  }`;
    if (!normalized.includes(storyEffectLayerDeclarationHook)) {
      throw new Error('Chapter 1 story effect layer declaration hook was not found.');
    }
    normalized = normalized.replace(storyEffectLayerDeclarationHook, storyEffectLayerViewportSetup);

    const hideStoryEffectViewportHook = `    storyEffectLayer.classList.remove('is-visible');
    storyEffectLabel.textContent = '';`;
    const hideStoryEffectViewportFix = `    storyEffectLayer.classList.remove('is-visible');
    storyEffectLabel.textContent = '';
    restoreStoryEffectLayerHome();`;
    if (!normalized.includes(hideStoryEffectViewportHook)) {
      throw new Error('Chapter 1 story effect hide hook was not found.');
    }
    normalized = normalized.replace(hideStoryEffectViewportHook, hideStoryEffectViewportFix);

    const showStoryEffectViewportHook = `    const isGatekeeperEntrance = effectId === 'gatekeeper-entrance';
    storyStage.classList.toggle('is-gatekeeper-entrance-fullscreen', isGatekeeperEntrance);`;
    const showStoryEffectViewportFix = `    const isGatekeeperEntrance = effectId === 'gatekeeper-entrance';
    storyStage.classList.remove('is-gatekeeper-entrance-fullscreen');
    if (isGatekeeperEntrance) mountStoryEffectLayerFullscreen();
    else restoreStoryEffectLayerHome();`;
    if (!normalized.includes(showStoryEffectViewportHook)) {
      throw new Error('Chapter 1 story effect show hook was not found.');
    }
    normalized = normalized.replace(showStoryEffectViewportHook, showStoryEffectViewportFix);
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
      const introScene = item.scene || {};
      storyStage.classList.remove('is-prologue-black-transition', 'is-prologue-black-hold');
      updateScene(introScene, { force: true, suppressFlash: true });`;
    const locationIntroWithTitle = `    if (item.effect === 'location-title-intro') {
      const introScene = item.scene || {};
      storyStage.classList.remove('is-prologue-black-transition', 'is-prologue-black-hold');
      updateScene(introScene, { force: true, suppressFlash: true });
      window.__CHAPTER1_SHOW_LOCATION_TITLE__?.(introScene.title || '', introScene);`;
    if (normalized.includes(locationIntroHook)) {
      normalized = normalized.replace(locationIntroHook, locationIntroWithTitle);
    }

    const locationTransitionHook = `    } else if (item.effect === 'location-transition') {
      const destination = item.transitionScene || item.scene || {};`;
    const locationTransitionWithTitle = `    } else if (item.effect === 'location-transition') {
      const destination = item.transitionScene || item.scene || {};
      window.__CHAPTER1_SHOW_LOCATION_TITLE__?.(destination.title || '', destination);`;
    if (normalized.includes(locationTransitionHook)) {
      normalized = normalized.replace(locationTransitionHook, locationTransitionWithTitle);
    }

    // 출석탄 발사와 학생증의 기존 등장/발광은 그대로 유지하고,
    // 학생증 발광 이후에만 에너지 응축 -> 정화 빔 -> 드론 피격 -> 정화 조각 변환을 추가한다.
    // 기존 effect id를 유지하므로 출석탄 시네마틱과의 연결과 전체화면 처리도 그대로 보존된다.
    const firstPurificationDurationHook = `      effect: 'attendance-student-card-purification',
      effectDuration: 9600,`;
    const firstPurificationDurationUpgrade = `      effect: 'attendance-student-card-purification',
      effectDuration: 13800,`;
    if (!normalized.includes(firstPurificationDurationHook)) {
      throw new Error('Chapter 1 first purification duration hook was not found.');
    }
    while (normalized.includes(firstPurificationDurationHook)) {
      normalized = normalized.replace(firstPurificationDurationHook, firstPurificationDurationUpgrade);
    }

    // 학생증 발광 뒤 에너지가 압축되고, 빔 발사/드론 피격/정화 조각 생성 타이밍에 맞춰
    // 저역 충전음 -> 고역 응축음 -> 발사 충격 -> 1초 지속 빔 -> 정화 잔향을 순서대로 쌓는다.
    const firstPurificationSoundHook = `    if (effectId === 'attendance-student-card-purification') {
      return;
    }`;
    const firstPurificationSoundUpgrade = `    if (effectId === 'attendance-student-card-purification') {
      synthTone({ frequency: 82, endFrequency: 118, duration: 6.1, gain: .042, type: 'sine', filterFrequency: 520, attack: .12, release: .42 });
      synthTone({ frequency: 164, endFrequency: 320, duration: 6.2, gain: .02, type: 'triangle', filterFrequency: 1250, attack: .12, release: .32 });
      [2100, 2540, 2970, 3400, 3820, 4250, 4680, 5090].forEach((delay, index) => {
        scheduleCinematicSound(() => {
          const base = 390 + index * 48;
          synthTone({ frequency: base, endFrequency: base * 1.22, duration: .14, gain: .013 + index * .0017, type: 'triangle', filterFrequency: 2900, attack: .002, release: .09 });
          synthNoise({ duration: .09, gain: .01 + index * .001, filterType: 'highpass', frequency: 1300 + index * 140, endFrequency: 4700, q: .65, attack: .001, release: .055 });
        }, delay);
      });
      scheduleCinematicSound(() => {
        synthTone({ frequency: 188, endFrequency: 610, duration: 1.24, gain: .058, type: 'sawtooth', filterFrequency: 1800, attack: .006, release: .18 });
        synthTone({ frequency: 580, endFrequency: 1260, duration: .92, gain: .026, type: 'triangle', filterFrequency: 3300, attack: .004, release: .14 });
        synthNoise({ duration: .9, gain: .038, filterType: 'bandpass', frequency: 760, endFrequency: 4200, q: .86, attack: .004, release: .22 });
      }, 5340);
      scheduleCinematicSound(() => {
        synthTone({ frequency: 64, endFrequency: 28, duration: .96, gain: .21, type: 'sine', filterFrequency: 360, attack: .001, release: .48 });
        synthTone({ frequency: 1240, endFrequency: 190, duration: .46, gain: .08, type: 'sawtooth', filterFrequency: 2800, attack: .001, release: .18 });
        synthNoise({ duration: .46, gain: .16, filterType: 'bandpass', frequency: 1900, endFrequency: 180, q: .54, attack: .001, release: .24 });
        synthNoise({ duration: .22, gain: .095, filterType: 'highpass', frequency: 2600, endFrequency: 6200, q: .5, attack: .001, release: .1 });
      }, 5720);
      scheduleCinematicSound(() => {
        synthTone({ frequency: 520, endFrequency: 430, duration: 2.7, gain: .034, type: 'sawtooth', filterFrequency: 1800, attack: .01, release: .24 });
        synthNoise({ duration: 2.72, gain: .06, filterType: 'bandpass', frequency: 980, endFrequency: 2450, q: .74, attack: .01, release: .18 });
      }, 5880);
      scheduleCinematicSound(() => {
        synthTone({ frequency: 980, endFrequency: 410, duration: .48, gain: .03, type: 'triangle', filterFrequency: 2400, attack: .002, release: .22 });
        synthNoise({ duration: .32, gain: .04, filterType: 'highpass', frequency: 1400, endFrequency: 4200, q: .6, attack: .002, release: .12 });
      }, 9640);
      scheduleCinematicSound(() => {
        synthTone({ frequency: 128, endFrequency: 52, duration: .72, gain: .12, type: 'sine', filterFrequency: 460, attack: .001, release: .36 });
        synthTone({ frequency: 760, endFrequency: 220, duration: .56, gain: .05, type: 'sawtooth', filterFrequency: 2100, attack: .001, release: .18 });
        synthNoise({ duration: .36, gain: .11, filterType: 'bandpass', frequency: 1600, endFrequency: 220, q: .48, attack: .001, release: .18 });
      }, 10120);
      scheduleCinematicSound(() => {
        synthTone({ frequency: 680, endFrequency: 420, duration: 1.9, gain: .015, type: 'sine', filterFrequency: 1500, attack: .02, release: .82 });
        synthTone({ frequency: 980, endFrequency: 620, duration: 1.35, gain: .011, type: 'triangle', filterFrequency: 2300, attack: .03, release: .72 });
      }, 11120);
      return;
    }`;
    if (!normalized.includes(firstPurificationSoundHook)) {
      throw new Error('Chapter 1 first purification sound hook was not found.');
    }
    normalized = normalized.replace(firstPurificationSoundHook, firstPurificationSoundUpgrade);

    // Chapter 3 정화 시네마틱처럼 빔 발사 중에는 부드러운 장주기 흔들림이 아니라
    // 0.075초 단위의 날카로운 전체화면 흔들림을 별도 클래스로 켰다가 끈다.
    const firstPurificationEffectClassHook = `    playCinematicEffectSound(effectId);
    storyStage.classList.toggle('is-dialogue-blackout', effectId === 'attendance-black-hold');`;
    const firstPurificationEffectClassUpgrade = `    if (effectId === 'attendance-student-card-purification') {
      target.classList.remove('is-first-purify-firing', 'is-first-purify-drone-impact');
      window.setTimeout(() => target.classList.add('is-first-purify-firing'), 5560);
      window.setTimeout(() => target.classList.remove('is-first-purify-firing'), 8620);
      window.setTimeout(() => target.classList.add('is-first-purify-drone-impact'), 10120);
      window.setTimeout(() => target.classList.remove('is-first-purify-drone-impact'), 11120);
    }
    playCinematicEffectSound(effectId);
    storyStage.classList.toggle('is-dialogue-blackout', effectId === 'attendance-black-hold');`;
    if (!normalized.includes(firstPurificationEffectClassHook)) {
      throw new Error('Chapter 1 first purification effect class hook was not found.');
    }
    normalized = normalized.replace(firstPurificationEffectClassHook, firstPurificationEffectClassUpgrade);

    // 테스트 장면을 선택해도 해당 장면만 재생하고 메뉴로 돌아가지 않는다.
    // 선택한 지점부터 Part 1의 남은 실제 스토리 세그먼트를 이어 붙여 Part 2까지 자연스럽게 진행한다.
    const part1DebugPreviewHook = `    preview: playSelectedPreview
  };`;
    const part1FlowPreviewHook = `    preview: playSelectedPreview,
    resumeFlowPreview: previewId => {
      if (previewId === 'full-flow') {
        restartFlow();
        return;
      }

      const orderedFlowSegments = [
        ['prologue-dialogue', 'prologue'],
        ['opening-credits-cinematic', 'openingCredits'],
        ['entrance-dialogue', 'entrance'],
        ['notice-dialogue', 'notice'],
        ['login-dialogue', 'login'],
        ['room-dialogue', 'room'],
        ['attendance-dialogue', 'attendance'],
        ['attendance-escape-dialogue', 'attendanceEscape'],
        ['first-purification-dialogue', 'firstPurification'],
        ['decision-dialogue', 'decision']
      ];
      const startIndex = orderedFlowSegments.findIndex(([id]) => id === previewId);

      if (startIndex >= 0 || previewId === 'first-purification-cinematic') {
        unlockDialogueAudio();
        clearFlowTimers();
        hideSceneSelector();
        activePreviewId = null;
        endPanel.hidden = true;
        resetGameState();
        gameLayer.hidden = true;
        storyStage.classList.remove('is-game-mode');

        const selectedSegments = previewId === 'first-purification-cinematic'
          ? ['firstPurificationCinematic', 'firstPurification', 'decision']
          : orderedFlowSegments.slice(startIndex).map(([, segmentId]) => segmentId);
        storySegments.__selectedFlowContinuation = selectedSegments.flatMap(segmentId => storySegments[segmentId] || []);
        beginStory('__selectedFlowContinuation', 'finish', { forceFullScene: true });
        return;
      }

      playSelectedPreview(previewId);
      activePreviewId = null;
    }
  };`;
    if (!normalized.includes(part1DebugPreviewHook)) {
      throw new Error('Chapter 1 Part 1 preview debug hook was not found.');
    }
    normalized = normalized.replace(part1DebugPreviewHook, part1FlowPreviewHook);
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
      activePreviewId = null;

      if (previewId === 'boss-dialogue') {
        storyCompletionAction = 'startBossBattle';
      } else if (previewId === 'chapter-end-dialogue') {
        storyCompletionAction = 'finish';
      }
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
    window.__CHAPTER1_SHOW_LOCATION_TITLE__?.(energy100ClosedEntranceScene.title || '', energy100ClosedEntranceScene);
    storyStage.classList.add('is-pre-energy-flight-in');`;
  if (normalized.includes(preEnergyLocationHook)) {
    normalized = normalized.replace(preEnergyLocationHook, preEnergyLocationWithTitle);
  }

  const bossInteriorLocationHook = `      currentSceneId = '';
      updateScene(bossInteriorPreviewScene, { silent: true });
      setBossEntryStageClass('is-entry-interior-tour');`;
  const bossInteriorLocationWithTitle = `      currentSceneId = '';
      updateScene(bossInteriorPreviewScene, { silent: true });
      window.__CHAPTER1_SHOW_LOCATION_TITLE__?.(bossInteriorPreviewScene.title || '', bossInteriorPreviewScene);
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

  // v26: v24에서 일반 웨이브 직후에 잘못 붙었던 3초 백색 → 2초 암전은 제거한다.
  // 일반 웨이브 종료 뒤에는 기존의 2초 암전 흐름을 유지하고,
  // 실제 코어 영역 포탈 진입(startBossEntryCinematic)에서만 긴 전이를 사용한다.
  const energyBlackoutV24 = `  function startEnergy100BlackDialogueSequence() {
    clearPreEnergySequence();
    stopTyping();
    flowMode = 'story-transition';
    document.body.dataset.flowMode = 'story';
    game.running = false;
    game.keys.clear();
    dialogueLayer.hidden = true;
    gameLayer.hidden = true;
    storyStage.classList.remove('is-game-mode');
    storyStage.classList.add('is-full-story');
    setActor('left', null, null, {});
    setActor('right', null, null, {});
    hideActorCluster('left');
    hideStoryEffects();
    finishIllustrationHide();

    showSceneBackgroundOnly(energy100BlackScene);
    storyStage.classList.add('is-pre-energy-whiteout');

    preEnergySequenceTimers.push(window.setTimeout(() => {
      storyStage.classList.remove('is-pre-energy-whiteout');
      storyStage.classList.add('is-pre-energy-blackout');
    }, 3000));

    preEnergySequenceTimers.push(window.setTimeout(() => {
      storyStage.classList.remove('is-pre-energy-blackout');
      beginStory('energy100Dialogue', 'startBossIntro', { forceFullScene: true, preserveScene: true });
    }, 5000));
  }`;
  const energyBlackoutRestored = `  function startEnergy100BlackDialogueSequence() {
    clearPreEnergySequence();
    stopTyping();
    flowMode = 'story-transition';
    document.body.dataset.flowMode = 'story';
    game.running = false;
    game.keys.clear();
    dialogueLayer.hidden = true;
    gameLayer.hidden = true;
    storyStage.classList.remove('is-game-mode');
    storyStage.classList.add('is-full-story');
    setActor('left', null, null, {});
    setActor('right', null, null, {});
    hideActorCluster('left');
    hideStoryEffects();
    finishIllustrationHide();

    showSceneBackgroundOnly(energy100BlackScene);
    storyStage.classList.add('is-pre-energy-blackout');

    preEnergySequenceTimers.push(window.setTimeout(() => {
      storyStage.classList.remove('is-pre-energy-blackout');
      beginStory('energy100Dialogue', 'startBossIntro', { forceFullScene: true, preserveScene: true });
    }, 2000));
  }`;
  if (normalized.includes(energyBlackoutV24)) normalized = normalized.replace(energyBlackoutV24, energyBlackoutRestored);

  const playerExitV24 = `      /* 포탈 진입 후 3초간 백색 전이, 이어서 2초간 암전 상태를 유지합니다. */
      startEnergy100BlackDialogueSequence();
    }, 1700);`;
  const playerExitRestored = `      /* 일반 오염 웨이브 종료 직후에는 기존 흐름대로 2초 암전만 유지합니다. */
      startEnergy100BlackDialogueSequence();
    }, 2000);`;
  if (normalized.includes(playerExitV24)) normalized = normalized.replace(playerExitV24, playerExitRestored);

  // 실제 코어 영역 포탈 입장 장면: 포탈이 회전·흔들리며 화면을 삼키고,
  // 서서히 백색으로 전환 → 백색 약 3초 유지 → 서서히 암전 → 검정 약 2초 유지 후 맵 공개.
  const corePortalMarkupHook = `      <div class="chapter1-core-portal-ring">
        <div class="chapter1-core-portal-window"></div>
      </div>`;
  const corePortalMarkupV26 = `      <div class="chapter1-core-portal-ring">
        <div class="chapter1-core-portal-window"></div>
      </div>
      <div class="chapter1-core-portal-entry-fade"></div>`;
  if (normalized.includes(corePortalMarkupHook)) normalized = normalized.replace(corePortalMarkupHook, corePortalMarkupV26);

  // 포탈 레이어를 story-stage 내부가 아니라 챕터 1 전체 뷰포트 호스트에 붙인다.
  // 스토리 프레임이 24:25로 중앙 정렬되어 있어도 포탈 중심은 실제 브라우저 화면 정중앙을 유지한다.
  const corePortalHostHook = `    storyStage.appendChild(corePortalOverlay);`;
  const corePortalHostFullscreen = `    const portalHost = storyStage.closest('.chapter1-story-mount') || storyStage;
    portalHost.appendChild(corePortalOverlay);`;
  if (!normalized.includes(corePortalHostHook)) {
    throw new Error('Chapter 1 core portal host hook was not found.');
  }
  normalized = normalized.replace(corePortalHostHook, corePortalHostFullscreen);

  const corePortalEntryHook = `  function startBossEntryCinematic(bossIntroCompletionAction = 'startBossBattle') {
    stopTyping();
    if (dialogueOpenTimer !== null) window.clearTimeout(dialogueOpenTimer);
    dialogueOpenTimer = null;
    dialogueLayer.classList.remove('is-opening');
    dialogueLayer.hidden = true;
    gameLayer.hidden = true;
    game.running = false;
    game.keys.clear();
    flowMode = 'story-transition';
    document.body.dataset.flowMode = 'story';
    storyStage.classList.remove('is-game-mode');
    storyStage.classList.add('is-full-story');
    setActor('left', null, null, {});
    setActor('right', null, null, {});
    hideActorCluster('left');
    hideStoryEffects();
    finishIllustrationHide();

    const portal = ensureCorePortalOverlay();
    portal.classList.add('is-opening');
    void portal.offsetWidth;
    portal.classList.add('is-entering');

    corePortalSequenceTimer = window.setTimeout(() => {
      currentSceneId = '';
      updateScene(bossInteriorPreviewScene, { silent: true });
      window.__CHAPTER1_SHOW_LOCATION_TITLE__?.('학사 코어 영역');
      portal.classList.remove('is-opening', 'is-entering');
      portal.remove();
      corePortalOverlay = null;
      corePortalSequenceTimer = null;
      beginStory('bossIntro', bossIntroCompletionAction, { forceFullScene: true, preserveScene: true });
    }, 2200);
  }`;
  const corePortalEntryV26 = `  function startBossEntryCinematic(bossIntroCompletionAction = 'startBossBattle') {
    stopTyping();
    if (dialogueOpenTimer !== null) window.clearTimeout(dialogueOpenTimer);
    dialogueOpenTimer = null;
    dialogueLayer.classList.remove('is-opening');
    dialogueLayer.hidden = true;
    gameLayer.hidden = true;
    game.running = false;
    game.keys.clear();
    flowMode = 'story-transition';
    document.body.dataset.flowMode = 'story';
    storyStage.classList.remove('is-game-mode');
    storyStage.classList.add('is-full-story', 'is-core-portal-fullscreen');
    setActor('left', null, null, {});
    setActor('right', null, null, {});
    hideActorCluster('left');
    hideStoryEffects();
    finishIllustrationHide();

    const portal = ensureCorePortalOverlay();
    portal.classList.remove('is-opening', 'is-entering', 'is-traveling');
    void portal.offsetWidth;
    portal.classList.add('is-opening', 'is-entering', 'is-traveling');
    playPlayerExitSound();

    corePortalSequenceTimer = window.setTimeout(() => {
      currentSceneId = '';
      updateScene(bossInteriorPreviewScene, { silent: true });
      portal.classList.remove('is-opening', 'is-entering', 'is-traveling');
      portal.remove();
      corePortalOverlay = null;
      storyStage.classList.remove('is-core-portal-fullscreen');
      setBossEntryStageClass('');

      /* 보스맵 도착 화면은 story-stage의 좌표계나 카메라 애니메이션을 사용하지 않는다.
         document.body에 고정 전체화면 레이어를 직접 붙여 좌우 밀림 가능성을 제거한다. */
      document.querySelectorAll('.chapter1-boss-map-arrival-fullscreen, .chapter1-boss-map-dialogue-reveal').forEach(node => node.remove());
      const arrivalOverlay = document.createElement('div');
      arrivalOverlay.className = 'chapter1-boss-map-arrival-fullscreen';
      arrivalOverlay.style.setProperty('--chapter1-boss-map-arrival-image', 'url(\"' + assetPath('bg_academic_system_corrupted.png') + '\")');

      /* Chapter 3 코어 진입처럼 배경이 처음 공개되는 장면 전환 안에서 장소명을 함께 보여준다.
         별도의 카메라 이동은 추가하지 않고 기존 4초 정지 화면 위에서 타이틀만 페이드 인/아웃한다. */
      const arrivalTitle = document.createElement('div');
      arrivalTitle.className = 'chapter1-boss-map-arrival-title';
      const arrivalTitleKicker = document.createElement('small');
      arrivalTitleKicker.textContent = 'LOCATION';
      const arrivalTitleName = document.createElement('strong');
      arrivalTitleName.textContent = bossInteriorPreviewScene.title || '학사 코어 영역';
      const arrivalTitleSubtitle = document.createElement('span');
      arrivalTitleSubtitle.textContent = bossInteriorPreviewScene.subtitle || '핵심 오염원 구역';
      arrivalTitle.append(arrivalTitleKicker, arrivalTitleName, arrivalTitleSubtitle);
      arrivalOverlay.appendChild(arrivalTitle);
      document.body.appendChild(arrivalOverlay);

      corePortalSequenceTimer = window.setTimeout(() => {
        corePortalSequenceTimer = null;
        beginStory('bossIntro', bossIntroCompletionAction, { forceFullScene: true, preserveScene: true });

        /* 전체화면 학사 코어 내부 장면에서 일반 스토리 화면으로 넘어갈 때 검정 페이드로 연결한다. */
        const dialogueRevealOverlay = document.createElement('div');
        dialogueRevealOverlay.className = 'chapter1-boss-map-dialogue-reveal';
        document.body.appendChild(dialogueRevealOverlay);
        arrivalOverlay.remove();
        requestAnimationFrame(() => dialogueRevealOverlay.classList.add('is-revealing'));
        window.setTimeout(() => dialogueRevealOverlay.remove(), 900);
      }, 4000);
    }, 8500);
  }`;
  if (!normalized.includes(corePortalEntryHook)) {
    throw new Error('Chapter 1 core portal entry hook was not found.');
  }
  normalized = normalized.replace(corePortalEntryHook, corePortalEntryV26);

  // 보스맵 도착용 body 고정 레이어가 흐름 중단 시 남지 않도록 정리한다.
  const clearBossArrivalOverlayHook = `  function clearBossEntrySequence() {
    bossEntrySequenceTimers.forEach(timer => window.clearTimeout(timer));
    bossEntrySequenceTimers = [];`;
  const clearBossArrivalOverlayV2 = `  function clearBossEntrySequence() {
    bossEntrySequenceTimers.forEach(timer => window.clearTimeout(timer));
    bossEntrySequenceTimers = [];
    document.querySelectorAll('.chapter1-boss-map-arrival-fullscreen, .chapter1-boss-map-dialogue-reveal').forEach(node => node.remove());`;
  if (normalized.includes(clearBossArrivalOverlayHook)) {
    normalized = normalized.replace(clearBossArrivalOverlayHook, clearBossArrivalOverlayV2);
  }

  // 실제 전투용 startBossAppearance는 원래 게임 프레임 크기를 유지한다.
  // 전체화면은 bossIntro 안의 gatekeeper-entrance 스토리 연출에만 적용한다.
  const clearPortalFullscreenHook = `    gameLayer.classList.remove('is-energy-complete', 'is-boss-arriving');`;
  if (normalized.includes(clearPortalFullscreenHook)) {
    normalized = normalized.replace(clearPortalFullscreenHook, `${clearPortalFullscreenHook}
    storyStage.classList.remove('is-core-portal-fullscreen');`);
  }

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
html.is-embedded-story .story-stage,
html.is-embedded-story .story-stage.is-full-story,
html.is-embedded-story .story-stage.is-game-mode {
  width: min(96dvh, 100vw) !important;
  height: 100dvh !important;
  max-height: 100dvh !important;
  aspect-ratio: 24 / 25 !important;
  border: 0 !important;
  box-shadow: none !important;
}
/* Chapter 3 기준 스토리 UI: 화면 비율, 대사창 비율, 타이포그래피를 동일하게 고정한다. */
html.is-embedded-story .story-stage.is-full-story:not(.is-game-mode) {
  width: min(96dvh, 100vw) !important;
  height: 100dvh !important;
  max-height: 100dvh !important;
  aspect-ratio: 24 / 25 !important;
}
/* 입학식은 검은 화면에서 천천히 드러난 뒤 카메라 이동 없이 정지한다. */
@keyframes chapter1AdmissionIllustrationFadeIn {
  0%, 5.4% { opacity: 0; }
  35.5%, 100% { opacity: 1; }
}
html.is-embedded-story .story-stage.is-scene-preview[data-preview-style="admission-hold-fit"] {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  max-width: none !important;
  height: 100dvh !important;
  max-height: none !important;
  aspect-ratio: auto !important;
  border: 0 !important;
  box-shadow: none !important;
  background: #050506 !important;
}
html.is-embedded-story .story-stage.is-scene-preview[data-preview-style="admission-hold-fit"] .background-stack,
html.is-embedded-story .story-stage.is-scene-preview[data-preview-style="admission-hold-fit"] .scene-background {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
}
html.is-embedded-story .story-stage.is-scene-preview[data-preview-style="admission-hold-fit"] .scene-background.is-visible {
  background-size: contain !important;
  background-repeat: no-repeat !important;
  background-position: center center !important;
  animation: chapter1AdmissionIllustrationFadeIn 4.65s cubic-bezier(.22,.61,.36,1) both !important;
  transform: none !important;
  filter: none !important;
}
html.is-embedded-story .story-stage.is-scene-preview[data-preview-style="admission-hold-fit"] .background-dim,
html.is-embedded-story .story-stage.is-scene-preview[data-preview-style="admission-hold-fit"] .scene-vignette {
  opacity: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
html.is-embedded-story .dialogue-layer {
  left: 3.5% !important;
  right: 3.5% !important;
  bottom: 4.5% !important;
}
html.is-embedded-story .dialogue-box {
  min-height: clamp(142px, 18vw, 202px) !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding-top: clamp(30px, 3vw, 38px) !important;
  padding-bottom: clamp(30px, 3vw, 38px) !important;
  padding-left: clamp(26px, 3vw, 42px) !important;
  padding-right: clamp(26px, 3vw, 42px) !important;
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
  row-gap: 0 !important;
  margin: auto 0 !important;
}
html.is-embedded-story .dialogue-marker {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  align-self: center !important;
  justify-self: center !important;
  font-size: clamp(24px, 3vw, 38px) !important;
  line-height: 1 !important;
  transform: none !important;
}
html.is-embedded-story .dialogue-text {
  width: 100% !important;
  min-width: 0 !important;
  align-self: center !important;
  margin: 0 !important;
  padding-right: 0 !important;
  font-family: "Noto Sans KR", system-ui, sans-serif !important;
  font-size: clamp(18px, 2.3vw, 31px) !important;
  font-weight: 800 !important;
  line-height: 1.48 !important;
  letter-spacing: -.025em !important;
  word-break: keep-all !important;
  white-space: pre-line !important;
}
html.is-embedded-story .speaker-tag {
  left: 34px !important;
  top: -31px !important;
  min-width: 176px !important;
  padding: 8px 20px !important;
  font-size: clamp(13px, 1.5vw, 18px) !important;
}
html.is-embedded-story .dialogue-layer.speaker-right .speaker-tag {
  left: auto !important;
  right: 34px !important;
}
html.is-embedded-story .continue-indicator {
  right: 28px !important;
  bottom: 18px !important;
  font-size: 22px !important;
}

/* 코어 포탈 진입 동안만 포탈용 스토리 스테이지를 브라우저 전체 화면으로 확장한다. */
html.is-embedded-story .story-stage.is-core-portal-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  max-width: none !important;
  height: 100dvh !important;
  max-height: none !important;
  aspect-ratio: auto !important;
  border: 0 !important;
  box-shadow: none !important;
  z-index: 100000 !important;
}
html.is-embedded-story .story-stage.is-core-portal-fullscreen .chapter1-core-portal-overlay {
  width: 100% !important;
  height: 100% !important;
}

/* bossIntro에서 게이트키퍼가 처음 실체화하는 6.5초 스토리 연출만 실제 브라우저 전체화면으로 표시한다.
   전투용 startBossAppearance/GameCanvas에는 이 규칙을 적용하지 않는다. */
html.is-embedded-story .story-stage.is-gatekeeper-entrance-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  max-width: none !important;
  height: 100dvh !important;
  max-height: none !important;
  aspect-ratio: auto !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  z-index: 100000 !important;
}
html.is-embedded-story .story-stage.is-gatekeeper-entrance-fullscreen .background-stack,
html.is-embedded-story .story-stage.is-gatekeeper-entrance-fullscreen .scene-background,
html.is-embedded-story .story-stage.is-gatekeeper-entrance-fullscreen .story-effect-layer,
html.is-embedded-story .story-stage.is-gatekeeper-entrance-fullscreen .gatekeeper-entrance-effect {
  width: 100% !important;
  height: 100% !important;
}
html.is-embedded-story .story-stage.is-gatekeeper-entrance-fullscreen.is-cinematic-effect .story-effect-layer {
  position: absolute !important;
  inset: 0 !important;
  z-index: 100001 !important;
  opacity: 1 !important;
  transform: none !important;
}
html.is-embedded-story .story-stage.is-gatekeeper-entrance-fullscreen .gatekeeper-entrance-effect {
  position: absolute !important;
  inset: 0 !important;
  border-radius: 0 !important;
}

/* 게이트키퍼 최초 등장 이펙트는 story-stage 밖의 Chapter 1 전체 뷰포트 호스트에서 렌더링한다. */
html.is-embedded-story .chapter1-story-mount > .story-effect-layer.is-global-gatekeeper-entrance,
html.is-embedded-story body > .story-effect-layer.is-global-gatekeeper-entrance {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  z-index: 100004 !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
  transition: none !important;
  pointer-events: none !important;
}
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .gatekeeper-entrance-effect {
  position: absolute !important;
  display: block !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: inset 0 0 88px rgba(0,0,0,.82), inset 0 0 170px rgba(110,0,10,.3) !important;
}
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .story-effect-label {
  display: none !important;
}
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .gatekeeper-portal {
  left: 50% !important;
  top: 49% !important;
  width: min(54vw, 54dvh, 560px) !important;
  height: min(54vw, 54dvh, 560px) !important;
}
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .gatekeeper-entrance-core {
  left: 50% !important;
  top: 52% !important;
  width: min(64vw, 64dvh, 620px) !important;
}

/* Chapter 3 디그리온 등장 타이틀의 3단 구성을 Chapter 1 색상/명칭으로 이식한다. */
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title {
  position: absolute !important;
  z-index: 30 !important;
  left: 50% !important;
  top: 4.8% !important;
  width: min(88vw, 980px) !important;
  padding: 12px 26px 16px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 6px !important;
  transform: translate(-50%, -18px) scale(.97);
  opacity: 0;
  text-align: center;
  color: #fff;
  background: linear-gradient(180deg, rgba(20,0,3,.88), rgba(20,0,3,.42), transparent);
  border-radius: 20px;
  text-shadow: 0 4px 26px rgba(0,0,0,.95), 0 0 28px rgba(230,0,0,.45);
  pointer-events: none;
}
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title::before,
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title::after {
  content: "";
  position: absolute;
  left: 50%;
  width: min(700px, 72vw);
  height: 2px;
  transform: translateX(-50%) scaleX(.1);
  opacity: 0;
  background: linear-gradient(90deg, transparent, rgba(230,0,0,.82), #fff1c2, rgba(191,124,38,.9), transparent);
  box-shadow: 0 0 18px rgba(230,0,0,.58), 0 0 30px rgba(191,124,38,.3);
}
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title::before { top: 2px; }
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title::after { bottom: 2px; }
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title-kicker {
  font-size: clamp(11px, .85vw, 15px);
  line-height: 1.15;
  letter-spacing: .38em;
  font-weight: 1000;
  color: #ffc3c8;
}
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title-rank {
  font-size: clamp(18px, 1.55vw, 28px);
  line-height: 1.12;
  letter-spacing: .12em;
  font-weight: 900;
  color: #fff3e0;
}
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title-name {
  font-family: "Noto Sans KR", system-ui, sans-serif;
  font-size: clamp(38px, 4.8vw, 76px);
  line-height: 1.02;
  letter-spacing: .045em;
  font-weight: 1000;
  white-space: nowrap;
  background: linear-gradient(180deg, #fff 0%, #ffe4e4 34%, #ff5757 68%, #ffd983 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 18px rgba(230,0,0,.35));
}
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance.is-visible .chapter1-gatekeeper-boss-title {
  animation: chapter1GatekeeperBossTitleReveal 6.5s cubic-bezier(.2,.82,.2,1) both;
}
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance.is-visible .chapter1-gatekeeper-boss-title::before,
html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance.is-visible .chapter1-gatekeeper-boss-title::after {
  animation: chapter1GatekeeperBossTitleLineReveal 6.5s ease both;
}
@keyframes chapter1GatekeeperBossTitleReveal {
  0%, 62% { opacity: 0; transform: translate(-50%, -18px) scale(.97); filter: blur(5px); }
  70%, 94% { opacity: 1; transform: translate(-50%, 0) scale(1); filter: none; }
  100% { opacity: .92; transform: translate(-50%, 0) scale(1); filter: none; }
}
@keyframes chapter1GatekeeperBossTitleLineReveal {
  0%, 64% { opacity: 0; transform: translateX(-50%) scaleX(.1); }
  74%, 100% { opacity: 1; transform: translateX(-50%) scaleX(1); }
}
@media (max-width: 900px), (max-height: 720px) {
  html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title {
    top: 2.7% !important;
    width: min(92vw, 760px) !important;
    padding: 8px 14px 10px !important;
    gap: 4px !important;
  }
  html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title-kicker { font-size: 10px; }
  html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title-rank { font-size: 15px; }
  html.is-embedded-story .story-effect-layer.is-global-gatekeeper-entrance .chapter1-gatekeeper-boss-title-name { font-size: clamp(28px, 5vw, 48px); }
}

/* CH1 코어 영역 이동: 일러스트 없이, 세워진 타원형 포탈 자체가 영롱하게 발광한다. */
html.is-embedded-story .chapter1-core-portal-overlay {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  z-index: 100001;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  background:
    radial-gradient(ellipse at 50% 43%, rgba(255,252,218,.16) 0 9%, rgba(255,222,91,.11) 18%, rgba(100,216,255,.08) 31%, transparent 57%),
    radial-gradient(ellipse at 50% 43%, rgba(72,170,255,.07), transparent 64%);
  transition: opacity .35s ease;
}
html.is-embedded-story .chapter1-core-portal-overlay::before,
html.is-embedded-story .chapter1-core-portal-overlay::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 43%;
  width: min(52vw, 500px);
  height: min(72dvh, 650px);
  border-radius: 50% / 44%;
  transform: translate(-50%, -50%) scale(.72);
  opacity: 0;
  pointer-events: none;
}
html.is-embedded-story .chapter1-core-portal-overlay::before {
  border: 2px solid rgba(174,238,255,.38);
  box-shadow:
    0 0 36px rgba(255,248,194,.56),
    0 0 86px rgba(255,210,67,.32),
    0 0 150px rgba(88,211,255,.28),
    inset 0 0 58px rgba(152,236,255,.2);
  filter: blur(7px);
}
html.is-embedded-story .chapter1-core-portal-overlay::after {
  width: min(62vw, 590px);
  height: min(82dvh, 740px);
  background:
    repeating-conic-gradient(from 12deg at 50% 50%, rgba(255,255,255,.09) 0 3deg, transparent 3deg 15deg),
    radial-gradient(ellipse at center, transparent 35%, rgba(129,225,255,.10) 48%, rgba(255,219,86,.08) 56%, transparent 69%);
  filter: blur(11px);
}
html.is-embedded-story .chapter1-core-portal-overlay.is-opening,
html.is-embedded-story .chapter1-core-portal-overlay.is-entering { opacity: 1; }
html.is-embedded-story .chapter1-core-portal-overlay.is-opening::before,
html.is-embedded-story .chapter1-core-portal-overlay.is-entering::before {
  animation: chapter1CorePortalWarpA 1.7s ease-in-out infinite;
}
html.is-embedded-story .chapter1-core-portal-overlay.is-opening::after,
html.is-embedded-story .chapter1-core-portal-overlay.is-entering::after {
  animation: chapter1CorePortalWarpB 2.2s ease-in-out infinite reverse;
}
html.is-embedded-story .chapter1-core-portal-ring {
  position: absolute;
  left: 50%;
  top: 43%;
  width: min(25vw, 238px);
  height: min(55dvh, 520px);
  transform: translate(-50%, -50%) scale(.025);
  border-radius: 50% / 44%;
  padding: clamp(10px, 1.35vw, 16px);
  background:
    conic-gradient(from 0deg, #fff 0deg, #fffbd1 36deg, #ffd84d 92deg, #85e6ff 155deg, #fff 214deg, #ffe26b 278deg, #8ce7ff 326deg, #fff 360deg);
  box-shadow:
    0 0 18px 5px rgba(255,255,245,1),
    0 0 45px 12px rgba(255,228,112,.96),
    0 0 92px 28px rgba(255,195,42,.67),
    0 0 156px 46px rgba(92,211,255,.48),
    0 0 220px 68px rgba(255,223,92,.22),
    inset 0 0 26px rgba(255,255,255,.94);
  filter: saturate(1.34) brightness(1.22);
  opacity: 0;
  isolation: isolate;
}
html.is-embedded-story .chapter1-core-portal-ring::before,
html.is-embedded-story .chapter1-core-portal-ring::after {
  content: "";
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}
html.is-embedded-story .chapter1-core-portal-ring::before {
  inset: -11%;
  border: 3px solid rgba(231,249,255,.68);
  box-shadow: 0 0 32px rgba(123,225,255,.78), 0 0 62px rgba(255,216,84,.38);
  filter: blur(3px);
  animation: chapter1CorePortalRimPulse 1.2s ease-in-out infinite;
}
html.is-embedded-story .chapter1-core-portal-ring::after {
  inset: -24%;
  border: 2px solid rgba(255,236,157,.25);
  filter: blur(8px);
  animation: chapter1CorePortalRimPulse 1.65s ease-in-out infinite reverse;
}
html.is-embedded-story .chapter1-core-portal-window {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 50% / 44%;
  background:
    radial-gradient(ellipse at 50% 42%, rgba(188,242,255,.22), transparent 34%),
    linear-gradient(rgba(5,9,24,.13), rgba(15,0,32,.26)),
    url("/assets/story/chapter1/backgrounds/bg_academic_system_corrupted.png") center / 112% 112% no-repeat;
  box-shadow:
    inset 0 0 82px rgba(0,0,0,.7),
    inset 0 0 34px rgba(157,235,255,.86),
    inset 0 0 10px rgba(255,249,199,.92);
  animation: chapter1CorePortalSurface 2.15s ease-in-out infinite;
}
html.is-embedded-story .chapter1-core-portal-window::before {
  content: "";
  position: absolute;
  inset: -14%;
  border-radius: inherit;
  background:
    repeating-linear-gradient(102deg, transparent 0 18px, rgba(255,255,255,.075) 19px 21px, transparent 22px 44px),
    radial-gradient(ellipse at 38% 43%, rgba(255,250,210,.18), transparent 34%);
  mix-blend-mode: screen;
  filter: blur(4px);
  animation: chapter1CorePortalSurfaceShimmer 1.35s ease-in-out infinite alternate;
}
html.is-embedded-story .chapter1-core-portal-overlay.is-opening .chapter1-core-portal-ring {
  animation: chapter1CorePortalOpen 2.5s cubic-bezier(.16,.86,.22,1) both;
}
html.is-embedded-story .chapter1-core-portal-overlay.is-entering .chapter1-core-portal-ring {
  animation: chapter1CorePortalEnter 2.35s cubic-bezier(.5,.02,.2,1) both;
}
html.is-embedded-story .chapter1-core-portal-entry-fade {
  position: absolute;
  z-index: 80;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: #fff;
}
html.is-embedded-story .chapter1-core-portal-overlay.is-traveling .chapter1-core-portal-entry-fade {
  animation: chapter1CorePortalWhiteBlack 8.5s linear both;
}
html.is-embedded-story .chapter1-core-portal-overlay.is-traveling {
  animation: chapter1CorePortalCameraShake 2.35s cubic-bezier(.18,.82,.2,1) both;
}
html.is-embedded-story .chapter1-core-portal-sparks,
html.is-embedded-story .chapter1-core-portal-sparks::before,
html.is-embedded-story .chapter1-core-portal-sparks::after {
  position: absolute;
  content: "";
  left: 50%;
  top: 43%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fffef0;
  box-shadow:
    -132px -118px 0 #ffd84d,
    118px -132px 0 #fff,
    -146px 82px 0 #7edcff,
    144px 105px 0 #ffd84d,
    0 -206px 0 #fff,
    -74px 198px 0 #95e9ff,
    82px 206px 0 #fff0a6;
  opacity: 0;
  filter: drop-shadow(0 0 8px #fff) drop-shadow(0 0 18px #ffd84d);
}
html.is-embedded-story .chapter1-core-portal-overlay.is-opening .chapter1-core-portal-sparks,
html.is-embedded-story .chapter1-core-portal-overlay.is-opening .chapter1-core-portal-sparks::before,
html.is-embedded-story .chapter1-core-portal-overlay.is-opening .chapter1-core-portal-sparks::after,
html.is-embedded-story .chapter1-core-portal-overlay.is-entering .chapter1-core-portal-sparks,
html.is-embedded-story .chapter1-core-portal-overlay.is-entering .chapter1-core-portal-sparks::before,
html.is-embedded-story .chapter1-core-portal-overlay.is-entering .chapter1-core-portal-sparks::after {
  animation: chapter1CorePortalSparks 1.3s ease-in-out infinite;
}
html.is-embedded-story .chapter1-core-portal-sparks::before { transform: rotate(55deg) scale(.82); }
html.is-embedded-story .chapter1-core-portal-sparks::after { transform: rotate(112deg) scale(.66); }
@keyframes chapter1CorePortalOpen {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.025); filter: saturate(1.2) brightness(1.4) blur(4px); }
  26% { opacity: 1; transform: translate(-50%, -50%) scale(.30); filter: saturate(1.5) brightness(1.65) blur(1px); }
  70% { opacity: 1; transform: translate(-50%, -50%) scale(1.06); filter: saturate(1.42) brightness(1.33); }
  86% { opacity: 1; transform: translate(-50%, -50%) scale(.97); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: saturate(1.34) brightness(1.22); }
}
@keyframes chapter1CorePortalEnter {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
  16% { opacity: 1; transform: translate(calc(-50% - 8px), calc(-50% + 5px)) scale(1.08) rotate(-10deg); }
  30% { opacity: 1; transform: translate(calc(-50% + 10px), calc(-50% - 6px)) scale(1.22) rotate(14deg); }
  46% { opacity: 1; transform: translate(calc(-50% - 9px), calc(-50% + 7px)) scale(1.52) rotate(-28deg); filter: saturate(1.55) brightness(1.55); }
  64% { opacity: 1; transform: translate(calc(-50% + 12px), calc(-50% - 8px)) scale(2.35) rotate(74deg); }
  82% { opacity: 1; transform: translate(calc(-50% - 6px), calc(-50% + 4px)) scale(4.6) rotate(220deg); filter: saturate(1.68) brightness(1.72); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(7.8) rotate(520deg); filter: saturate(1.8) brightness(2.05) blur(1px); }
}
@keyframes chapter1CorePortalCameraShake {
  0% { transform: translate(0,0) rotate(0deg); }
  18% { transform: translate(-5px,3px) rotate(-.6deg); }
  34% { transform: translate(7px,-5px) rotate(.8deg); }
  52% { transform: translate(-8px,5px) rotate(-1deg); }
  70% { transform: translate(9px,-4px) rotate(1.2deg); }
  86% { transform: translate(-5px,3px) rotate(-.5deg); }
  100% { transform: translate(0,0) rotate(0deg); }
}
@keyframes chapter1CorePortalWhiteBlack {
  0%, 19% { opacity: 0; background: #fff; }
  30% { opacity: 1; background: #fff; }
  65% { opacity: 1; background: #fff; }
  76% { opacity: 1; background: #000; }
  100% { opacity: 1; background: #000; }
}
@keyframes chapter1CorePortalSparks {
  0%, 100% { opacity: .28; filter: drop-shadow(0 0 6px #fff) drop-shadow(0 0 12px #ffd84d); }
  50% { opacity: 1; filter: drop-shadow(0 0 14px #fff) drop-shadow(0 0 28px #7edcff); }
}
@keyframes chapter1CorePortalWarpA {
  0%,100% { opacity: .34; transform: translate(-50%,-50%) scale(.88, .94); }
  50% { opacity: .86; transform: translate(-50%,-50%) scale(1.08, 1.02); }
}
@keyframes chapter1CorePortalWarpB {
  0%,100% { opacity: .18; transform: translate(-50%,-50%) scale(.88, 1.03) skewX(-1.3deg); }
  50% { opacity: .62; transform: translate(-50%,-50%) scale(1.06, .96) skewX(1.6deg); }
}
@keyframes chapter1CorePortalRimPulse {
  0%,100% { opacity: .45; transform: scale(.94); }
  50% { opacity: 1; transform: scale(1.07); }
}
@keyframes chapter1CorePortalSurface {
  0%,100% { background-position: center, center, 50% 50%; filter: brightness(.93) saturate(1.08); }
  50% { background-position: center, center, 52% 47%; filter: brightness(1.16) saturate(1.3); }
}
@keyframes chapter1CorePortalSurfaceShimmer {
  0% { opacity: .34; transform: translateX(-3%) skewY(-.8deg) scale(1.02); }
  100% { opacity: .8; transform: translateX(3%) skewY(.8deg) scale(1.06); }
}

/* 포탈 통과 직후 학사 코어 내부 장면: 카메라는 고정하고 검정 페이드로 장면 전환만 추가한다. */
html.is-embedded-story .chapter1-boss-map-arrival-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 100002 !important;
  width: 100vw !important;
  height: 100dvh !important;
  overflow: hidden !important;
  pointer-events: none !important;
  background: #050506 !important;
  transform: none !important;
  filter: none !important;
}
html.is-embedded-story .chapter1-boss-map-arrival-fullscreen::before {
  content: "";
  position: absolute;
  inset: 0;
  background-color: #050506;
  background-image: var(--chapter1-boss-map-arrival-image);
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  opacity: 0;
  transform: none;
  animation: chapter1BossMapArrivalReveal 4s ease-in-out both;
}
html.is-embedded-story .chapter1-boss-map-arrival-fullscreen::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  background: #000;
  opacity: 1;
  animation: chapter1BossMapArrivalBlackTransition 4s ease-in-out both;
}
html.is-embedded-story .chapter1-boss-map-arrival-title {
  position: absolute;
  z-index: 4;
  left: 50%;
  top: 50%;
  width: min(88vw, 1040px);
  min-height: 190px;
  padding: 24px 30px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  transform: translate(-50%, -46%) scale(.96);
  opacity: 0;
  text-align: center;
  color: #fff;
  background: radial-gradient(ellipse at center, rgba(0,0,0,.72), rgba(0,0,0,.24) 56%, transparent 78%);
  text-shadow: 0 5px 28px rgba(0,0,0,.92);
  animation: chapter1BossMapArrivalTitle 4s cubic-bezier(.2,.82,.2,1) both;
}
html.is-embedded-story .chapter1-boss-map-arrival-title::before,
html.is-embedded-story .chapter1-boss-map-arrival-title::after {
  content: "";
  position: absolute;
  left: 50%;
  width: min(740px, 76vw);
  height: 2px;
  transform: translateX(-50%);
  background: linear-gradient(90deg, transparent, rgba(191,124,38,.86), #fff2c7, rgba(230,0,0,.72), transparent);
  box-shadow: 0 0 18px rgba(191,124,38,.5);
}
html.is-embedded-story .chapter1-boss-map-arrival-title::before { top: 12px; }
html.is-embedded-story .chapter1-boss-map-arrival-title::after { bottom: 12px; }
html.is-embedded-story .chapter1-boss-map-arrival-title small {
  font-size: clamp(11px, 1vw, 15px);
  letter-spacing: .42em;
  font-weight: 1000;
  color: #d9b56b;
}
html.is-embedded-story .chapter1-boss-map-arrival-title strong {
  font-family: "Noto Sans KR", system-ui, sans-serif;
  font-size: clamp(40px, 5.4vw, 82px);
  line-height: 1.08;
  letter-spacing: -.025em;
  font-weight: 1000;
  color: #fff;
  text-shadow: 0 5px 28px rgba(0,0,0,.92), 0 0 30px rgba(191,124,38,.34);
}
html.is-embedded-story .chapter1-boss-map-arrival-title span {
  font-size: clamp(11px, .95vw, 16px);
  letter-spacing: .18em;
  font-weight: 800;
  color: rgba(255,239,205,.8);
}
@keyframes chapter1BossMapArrivalTitle {
  0%, 18% { opacity: 0; transform: translate(-50%, -46%) scale(.96); filter: blur(5px); }
  32%, 70% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: none; }
  88%, 100% { opacity: 0; transform: translate(-50%, -53%) scale(1.02); filter: blur(2px); }
}
html.is-embedded-story .chapter1-boss-map-dialogue-reveal {
  position: fixed !important;
  inset: 0 !important;
  z-index: 100003 !important;
  width: 100vw !important;
  height: 100dvh !important;
  pointer-events: none !important;
  background: #000 !important;
  opacity: 1;
  transition: opacity .8s ease !important;
}
html.is-embedded-story .chapter1-boss-map-dialogue-reveal.is-revealing {
  opacity: 0;
}
@keyframes chapter1BossMapArrivalReveal {
  0%, 7% { opacity: 0; }
  24%, 100% { opacity: 1; }
}
@keyframes chapter1BossMapArrivalBlackTransition {
  0%, 8% { opacity: 1; }
  28%, 76% { opacity: 0; }
  100% { opacity: 1; }
}

/* 학사 코어 영역 진입 시네마틱은 브라우저 전체 화면을 사용한다. */
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

/* 보스맵 도착 장면은 기존 academicInteriorTour의 좌우/상하 카메라 이동을 완전히 제거한다. */
html.is-embedded-story .story-stage.is-entry-interior-tour .scene-background.is-visible {
  animation: none !important;
  transform: none !important;
  filter: none !important;
  background-position: center center !important;
}
html.is-embedded-story .story-stage.is-entry-interior-tour .scene-vignette {
  animation: none !important;
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
/* Chapter 1의 [장면] 장소 타이틀은 Chapter 2의 LOCATION 템플릿을 그대로 사용한다. */
.chapter1-location-title-overlay {
  position: fixed;
  inset: 0;
  z-index: 160000;
  overflow: hidden;
  isolation: isolate;
  background: #050506;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.chapter1-location-title-overlay.is-active {
  visibility: visible;
  animation: chapter1GlobalLocationEnvelope var(--chapter1-location-title-duration, 2.5s) linear both;
}
.chapter1-location-title-background {
  position: absolute;
  z-index: 0;
  inset: -3%;
  background-color: #050506;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center center;
  filter: brightness(1) saturate(1.02) contrast(1.02);
  transform: scale(1.045);
}
.chapter1-location-title-vignette {
  position: absolute;
  z-index: 1;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0,0,0,.16), rgba(0,0,0,.04) 38%, rgba(0,0,0,.38) 100%),
    radial-gradient(circle at 50% 48%, rgba(0,0,0,0) 22%, rgba(0,0,0,.58) 100%);
}
.chapter1-location-title-grid {
  position: absolute;
  z-index: 2;
  inset: 0;
  opacity: .12;
  background-image:
    linear-gradient(rgba(255,255,255,.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.055) 1px, transparent 1px);
  background-size: 54px 54px;
}
.chapter1-location-title-copy {
  position: absolute;
  z-index: 4;
  left: 50%;
  top: 50%;
  width: min(900px, 84vw);
  min-height: 190px;
  display: grid;
  place-content: center;
  gap: 10px;
  transform: translate(-50%, -50%);
  text-align: center;
  background: radial-gradient(ellipse at center, rgba(0,0,0,.72), rgba(0,0,0,.26) 52%, transparent 76%);
  opacity: 0;
}
.chapter1-location-title-copy::before,
.chapter1-location-title-copy::after {
  content: "";
  position: absolute;
  left: 50%;
  width: min(720px, 76vw);
  height: 2px;
  transform: translateX(-50%);
  background: linear-gradient(90deg, transparent, rgba(191,124,38,.82), #fff1c2, rgba(191,124,38,.82), transparent);
  box-shadow: 0 0 16px rgba(191,124,38,.72);
}
.chapter1-location-title-copy::before { top: 16px; }
.chapter1-location-title-copy::after { bottom: 16px; }
.chapter1-location-title-copy small {
  color: #d6ad62;
  font-size: clamp(10px, 1vw, 14px);
  font-weight: 1000;
  letter-spacing: .34em;
}
.chapter1-location-title-copy strong {
  color: #fff;
  font-family: "Noto Sans KR", system-ui, sans-serif;
  font-size: clamp(40px, 6.4vw, 86px);
  font-weight: 1000;
  letter-spacing: -.05em;
  text-align: center;
  text-shadow: 0 4px 0 rgba(0,0,0,.9), 0 0 16px rgba(255,255,255,.18), 0 0 42px rgba(191,124,38,.42);
}
/* 오버레이는 런타임 시작 때 미리 생성되므로, 자식 애니메이션은 실제 장소 타이틀이 활성화될 때만 시작해야 한다. */
.chapter1-location-title-overlay.is-active .chapter1-location-title-background {
  animation: chapter1GlobalLocationCamera var(--chapter1-location-title-duration, 2.5s) cubic-bezier(.2,.78,.2,1) both;
}
.chapter1-location-title-overlay.is-active .chapter1-location-title-grid {
  animation: chapter1GlobalLocationGrid var(--chapter1-location-title-duration, 2.5s) linear both;
}
.chapter1-location-title-overlay.is-active .chapter1-location-title-copy {
  animation: chapter1GlobalLocationCopy var(--chapter1-location-title-duration, 2.5s) cubic-bezier(.2,.86,.2,1) both;
}
/* Chapter 2 템플릿으로 대체되므로 기존 Chapter 1 장소 타이틀 카드 자체는 화면에 노출하지 않는다. */
html.is-embedded-story #storyLocationIntro,
html.is-embedded-story #locationTransition {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
@keyframes chapter1GlobalLocationEnvelope {
  0% { opacity: 0; }
  6%, 92% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes chapter1GlobalLocationCamera {
  0% { transform: scale(1.085); filter: brightness(.74) saturate(.9); }
  20% { filter: brightness(1) saturate(1.02); }
  100% { transform: scale(1.025); filter: brightness(1) saturate(1.02); }
}
@keyframes chapter1GlobalLocationGrid {
  from { background-position: 0 0, 0 0; }
  to { background-position: 0 96px, 96px 0; }
}
@keyframes chapter1GlobalLocationCopy {
  0%, 13% { opacity: 0; transform: translate(-50%, -50%) scale(.9); }
  23%, 82% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -53%) scale(1.035); }
}

/* 첫 정화 조각 흡수: 학생증 뒤의 방사형(repeating-conic) 광선은 제거하고
   기존 aura/glint/drop-shadow의 부드러운 발광만 유지한다. */
html.is-embedded-story [data-effect="first-purification-absorb"] .purify-card-rays {
  display: none !important;
  opacity: 0 !important;
  animation: none !important;
  background: none !important;
}


/* 출석탄 -> 첫 정화 후반부 리워크 V3.
   Chapter 3 최종 정화/디그리온 몸체 파괴의 시각 문법을 가져오되,
   1) 학생증 위에 실제 정화 에너지 덩어리 생성
   2) 3초간 파장/입자가 수렴하며 덩어리가 맥동·성장
   3) 일정 굵기 원통형 빔을 왼쪽으로 3초 발사 + 학생증 반동 + 날카로운 화면 흔들림
   4) 드론 단독 샷 -> 우측에서 같은 원통형 빔 관통 -> 백색화/파편/파동 -> 발광 조각 잔류 순으로 구성한다. */
html.is-embedded-story [data-effect="attendance-student-card-purification"] {
  isolation:isolate !important;
  background:#020205 !important;
  overflow:hidden !important;
}
html.is-embedded-story [data-effect="attendance-student-card-purification"].is-first-purify-firing {
  animation:chapter1PurifySharpShake .075s steps(1,end) infinite !important;
}
html.is-embedded-story [data-effect="attendance-student-card-purification"].is-first-purify-drone-impact {
  animation:chapter1PurifyImpactShake .068s steps(1,end) infinite !important;
}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-card {
  overflow:visible !important;
  animation:chapter1PurifyCardPresence 13.8s linear both !important;
}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-card img {
  position:relative;
  z-index:2;
  animation:chapter1PurifyCardChargeGlow 13.8s linear both !important;
}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-card-rays {
  z-index:1;
  background:
    radial-gradient(circle,rgba(255,253,226,.92) 0 9%,rgba(255,237,154,.26) 28%,rgba(255,203,56,.08) 51%,transparent 72%),
    radial-gradient(circle,transparent 0 47%,rgba(255,243,189,.42) 58%,transparent 72%) !important;
  animation:chapter1PurifyCardAura 13.8s linear both !important;
}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-yellow {
  animation:chapter1PurifyAmbientGold 13.8s linear both !important;
}

/* 학생증 바로 위에 생성되는 핵심 정화 에너지 덩어리. */
html.is-embedded-story .chapter1-purify-card-orb {
  position:absolute;
  z-index:8;
  left:50%;
  top:50%;
  width:min(17vmin,190px);
  aspect-ratio:1;
  transform:translate(-50%,-50%) scale(.08);
  opacity:0;
  pointer-events:none;
  animation:chapter1PurifyOrbTimeline 13.8s linear both;
}
html.is-embedded-story .chapter1-purify-card-orb .orb-aura {
  position:absolute;
  inset:-115%;
  border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,242,.55) 0 4%,rgba(255,232,120,.35) 15%,rgba(255,191,28,.15) 36%,transparent 67%);
  filter:blur(18px);
  animation:chapter1PurifyOrbAura .62s ease-in-out infinite alternate;
}
html.is-embedded-story .chapter1-purify-card-orb .orb-shell {
  position:absolute;
  inset:13%;
  border-radius:44% 56% 51% 49% / 53% 43% 57% 47%;
  background:
    radial-gradient(circle at 39% 33%,#fff 0 3%,rgba(255,255,255,.72) 4%,transparent 10%),
    radial-gradient(circle at 50% 48%,#fffce3 0 9%,#ffe875 18%,#ffc932 38%,#ed9811 61%,rgba(113,48,0,.88) 79%);
  box-shadow:
    inset 0 0 22px rgba(255,255,255,.5),
    0 0 20px #fff,
    0 0 52px rgba(255,225,98,.98),
    0 0 112px rgba(255,174,18,.82),
    0 0 190px rgba(255,130,0,.36);
  animation:chapter1PurifyOrbBlob .38s ease-in-out infinite alternate;
}
html.is-embedded-story .chapter1-purify-card-orb .orb-shell::before,
html.is-embedded-story .chapter1-purify-card-orb .orb-shell::after {
  content:"";
  position:absolute;
  left:50%;top:50%;
  border-radius:50%;
  transform:translate(-50%,-50%) rotate(18deg) scaleY(.68);
  pointer-events:none;
}
html.is-embedded-story .chapter1-purify-card-orb .orb-shell::before {
  width:164%;height:164%;
  border:2px solid rgba(255,238,159,.72);
  box-shadow:0 0 20px rgba(255,222,94,.62),inset 0 0 18px rgba(255,230,125,.2);
  animation:chapter1PurifyOrbOrbit .84s linear infinite;
}
html.is-embedded-story .chapter1-purify-card-orb .orb-shell::after {
  width:214%;height:108%;
  border:1px solid rgba(255,195,37,.42);
  transform:translate(-50%,-50%) rotate(-37deg) scaleY(.7);
  animation:chapter1PurifyOrbOrbitReverse 1.18s linear infinite;
}
html.is-embedded-story .chapter1-purify-card-orb .orb-core {
  position:absolute;
  z-index:2;
  left:50%;top:50%;
  width:24%;aspect-ratio:1;
  transform:translate(-50%,-50%) rotate(45deg);
  background:linear-gradient(135deg,#fff 0 28%,#fff2a1 29% 52%,#ffd03b 53% 76%,#ed9210 77%);
  box-shadow:0 0 14px #fff,0 0 38px #ffe064,0 0 74px rgba(255,177,19,.9);
  animation:chapter1PurifyOrbCore .24s ease-in-out infinite alternate;
}

html.is-embedded-story .chapter1-purify-cinematic-vignette {
  position:absolute;z-index:3;inset:0;pointer-events:none;opacity:0;
  background:
    radial-gradient(circle at 50% 49%,rgba(255,223,92,.075) 0 13%,transparent 43%),
    radial-gradient(circle at 50% 49%,transparent 0 28%,rgba(0,0,0,.28) 60%,rgba(0,0,0,.84) 100%);
  animation:chapter1PurifyVignette 13.8s linear both;
}
html.is-embedded-story .chapter1-purify-charge-field {
  position:absolute;z-index:7;left:50%;top:49%;width:min(46vw,600px);aspect-ratio:1;
  transform:translate(-50%,-50%);opacity:0;pointer-events:none;
  animation:chapter1PurifyChargeField 13.8s linear both;
}
html.is-embedded-story .chapter1-purify-energy-wave {
  position:absolute;left:50%;top:50%;border-radius:50%;opacity:.0;
  transform:translate(-50%,-50%) scale(1.65);
  border:2px solid rgba(255,231,139,.7);
  box-shadow:0 0 20px rgba(255,221,91,.52),inset 0 0 25px rgba(255,232,141,.13);
  background:radial-gradient(circle,transparent 0 64%,rgba(255,236,158,.12) 70%,transparent 82%);
}
html.is-embedded-story .chapter1-purify-energy-wave.wave-a{width:54%;aspect-ratio:1;animation:chapter1PurifyWaveConverge 1.05s ease-in infinite}
html.is-embedded-story .chapter1-purify-energy-wave.wave-b{width:76%;aspect-ratio:1;animation:chapter1PurifyWaveConverge 1.22s .18s ease-in infinite}
html.is-embedded-story .chapter1-purify-energy-wave.wave-c{width:98%;aspect-ratio:1;animation:chapter1PurifyWaveConverge 1.38s .35s ease-in infinite}
html.is-embedded-story .chapter1-purify-charge-ring {
  position:absolute;left:50%;top:50%;border-radius:50%;border-style:solid;transform:translate(-50%,-50%);opacity:0;
}
html.is-embedded-story .chapter1-purify-charge-ring.ring-a{width:46%;aspect-ratio:1;border-width:2px;border-color:rgba(255,247,194,.78);box-shadow:0 0 18px rgba(255,231,130,.62);animation:chapter1PurifyRingSpin 1s linear infinite}
html.is-embedded-story .chapter1-purify-charge-ring.ring-b{width:66%;aspect-ratio:1;border-width:2px;border-style:dashed;border-color:rgba(255,207,66,.48);animation:chapter1PurifyRingSpinReverse 1.35s linear infinite}
html.is-embedded-story .chapter1-purify-charge-ring.ring-c{width:84%;height:42%;border-width:1px;border-color:rgba(255,239,163,.28);transform:translate(-50%,-50%) rotate(-31deg);animation:chapter1PurifyEllipseSpin 1.7s linear infinite}
html.is-embedded-story .chapter1-purify-charge-core{display:none !important}
html.is-embedded-story .chapter1-purify-charge-particles{position:absolute;inset:0}
html.is-embedded-story .chapter1-purify-charge-particles i{
  position:absolute;left:50%;top:50%;width:var(--purify-particle-size,7px);height:var(--purify-particle-size,7px);
  margin-left:calc(var(--purify-particle-size,7px)/-2);margin-top:calc(var(--purify-particle-size,7px)/-2);
  border-radius:50%;opacity:0;
  background:radial-gradient(circle,#fff 0 24%,#fff0a1 38%,#ffc92b 68%,rgba(255,185,14,0) 78%);
  box-shadow:0 0 10px #fff,0 0 22px rgba(255,204,51,.82);
  transform:rotate(var(--purify-particle-angle)) translateX(var(--purify-particle-radius));
  animation:chapter1PurifyParticleConverge 1.24s var(--purify-particle-delay) ease-in infinite;
}

/* 빔 뒤쪽의 속도선. 방사형 광선이 아니라 수평 흐름으로만 사용한다. */
html.is-embedded-story .chapter1-purify-beam-streaks{position:absolute;z-index:4;inset:0;overflow:hidden;pointer-events:none;opacity:0}
html.is-embedded-story .chapter1-purify-beam-streaks i{position:absolute;left:100%;top:var(--purify-streak-y);width:var(--purify-streak-w);height:var(--purify-streak-h);border-radius:999px;background:linear-gradient(90deg,transparent,rgba(255,242,173,.78),#fff,rgba(255,205,54,.18));filter:blur(var(--purify-streak-blur));opacity:.7}
html.is-embedded-story [data-effect="attendance-student-card-purification"].is-first-purify-firing .chapter1-purify-beam-streaks{opacity:1}
html.is-embedded-story [data-effect="attendance-student-card-purification"].is-first-purify-firing .chapter1-purify-beam-streaks i{animation:chapter1PurifyStreakRush .22s var(--purify-streak-delay) linear infinite}

/* 1차 정화 빔: 끝까지 같은 두께의 원통형 기둥. */
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-wave {
  z-index:12 !important;left:-3% !important;top:42.2% !important;width:58.5% !important;height:14.6% !important;
  opacity:0;border-radius:999px !important;transform-origin:right center !important;overflow:visible !important;
  background:linear-gradient(180deg,rgba(255,181,21,.12) 0%,rgba(255,216,74,.72) 10%,rgba(255,247,190,.98) 25%,#fff 43% 57%,rgba(255,246,184,.98) 75%,rgba(255,211,60,.7) 90%,rgba(255,173,12,.12) 100%) !important;
  box-shadow:0 0 18px #fff,0 0 42px rgba(255,236,143,.98),0 0 96px rgba(255,199,49,.84),0 0 170px rgba(255,143,0,.34) !important;
  filter:none !important;
  animation:chapter1PurifyBeam 13.8s linear both !important;
}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-wave::before {
  content:"";position:absolute;inset:25% 0;border-radius:999px !important;clip-path:none !important;
  background:linear-gradient(180deg,rgba(255,255,255,.82),#fff 34% 66%,rgba(255,255,255,.82)) !important;
  box-shadow:0 0 18px #fff,0 0 38px rgba(255,245,193,.95);filter:none !important;
}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-wave::after {
  content:"";position:absolute;inset:5% 0;border-radius:999px !important;clip-path:none !important;
  background:repeating-linear-gradient(90deg,transparent 0 42px,rgba(255,255,255,.10) 42px 55px,rgba(255,224,91,.12) 55px 74px,transparent 74px 118px) !important;
  background-size:190px 100% !important;mix-blend-mode:screen;filter:blur(1px) !important;
  animation:chapter1PurifyBeamFlow .19s linear infinite;
}
html.is-embedded-story .chapter1-purify-beam-impact{position:absolute;z-index:16;left:55%;top:49%;width:min(24vw,290px);aspect-ratio:1;transform:translate(-50%,-50%);opacity:0;pointer-events:none;animation:chapter1PurifyBeamImpactLife 13.8s linear both}
html.is-embedded-story .chapter1-purify-beam-impact-core{position:absolute;left:50%;top:50%;width:42%;aspect-ratio:1;transform:translate(-50%,-50%) scale(.24);border-radius:50%;background:radial-gradient(circle,#fff 0 12%,#fff9d2 22%,#ffdd68 46%,rgba(255,190,29,.3) 64%,transparent 78%);box-shadow:0 0 28px #fff,0 0 62px rgba(255,225,107,.94),0 0 116px rgba(255,181,26,.65);animation:chapter1PurifyImpactCore 13.8s linear both}
html.is-embedded-story .chapter1-purify-beam-impact-ring{position:absolute;left:50%;top:50%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%) scale(.18);opacity:0}
html.is-embedded-story .chapter1-purify-beam-impact-ring.ring-a{width:62%;border:4px solid rgba(255,244,177,.9);box-shadow:0 0 22px rgba(255,230,121,.82),inset 0 0 16px rgba(255,244,190,.48);animation:chapter1PurifyImpactRingA 13.8s linear both}
html.is-embedded-story .chapter1-purify-beam-impact-ring.ring-b{width:88%;border:2px solid rgba(255,205,68,.52);box-shadow:0 0 38px rgba(255,194,40,.44);animation:chapter1PurifyImpactRingB 13.8s linear both}
html.is-embedded-story .chapter1-purify-launch-flash{position:absolute;z-index:60;inset:0;opacity:0;pointer-events:none;background:radial-gradient(circle at 52% 49%,#fff 0 5%,#fff8ce 13%,rgba(255,222,95,.72) 28%,rgba(255,190,31,.12) 55%,transparent 76%);mix-blend-mode:screen;animation:chapter1PurifyLaunchFlash 13.8s linear both}

/* 2차 샷: 드론만 화면에 남긴 뒤, 오른쪽에서 같은 원통형 정화 빔이 화면을 가로질러 관통한다. */
html.is-embedded-story .chapter1-purify-drone-halo{position:absolute;z-index:5;left:50%;top:49%;width:min(58vw,620px);aspect-ratio:1;transform:translate(-50%,-50%) scale(.7);opacity:0;border-radius:50%;background:radial-gradient(circle,rgba(126,33,155,.12) 0 16%,rgba(45,5,65,.18) 37%,transparent 70%);filter:blur(18px);animation:chapter1PurifyDroneHalo 13.8s linear both}
html.is-embedded-story .chapter1-purify-drone-beam{
  position:absolute;z-index:13;left:-4%;top:42.6%;width:108%;height:13.8%;opacity:0;transform-origin:right center;pointer-events:none;border-radius:999px;
  background:linear-gradient(180deg,rgba(255,177,17,.10),rgba(255,216,75,.72) 10%,rgba(255,246,183,.98) 25%,#fff 43% 57%,rgba(255,247,190,.98) 75%,rgba(255,210,58,.72) 90%,rgba(255,172,10,.1));
  box-shadow:0 0 16px #fff,0 0 40px rgba(255,238,153,.98),0 0 94px rgba(255,196,44,.84),0 0 170px rgba(255,144,0,.32);
  animation:chapter1PurifyDroneBeam 13.8s linear both;
}
html.is-embedded-story .chapter1-purify-drone-beam::before{content:"";position:absolute;inset:25% 0;border-radius:999px;background:#fff;box-shadow:0 0 18px #fff,0 0 36px rgba(255,246,196,.94)}
html.is-embedded-story .chapter1-purify-drone-beam::after{content:"";position:absolute;inset:5% 0;border-radius:999px;background:repeating-linear-gradient(90deg,transparent 0 45px,rgba(255,255,255,.1) 45px 62px,rgba(255,219,77,.13) 62px 84px,transparent 84px 124px);background-size:205px 100%;mix-blend-mode:screen;animation:chapter1PurifyBeamFlow .17s linear infinite}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-drone{left:50% !important;top:49% !important;width:min(31%,320px) !important;height:47% !important;z-index:11 !important;animation:chapter1PurifyDroneBeamHit 13.8s linear both !important}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-ring{left:50% !important;top:49% !important;animation:chapter1PurifyConversionRing 13.8s linear both !important}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-burst{left:50% !important;top:49% !important;animation:chapter1PurifyConversionBurst 13.8s linear both !important}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-fragment{width:52px !important;height:52px !important;left:calc(50% - 26px) !important;top:calc(49% - 26px) !important;z-index:21 !important;filter:brightness(1.35) saturate(1.2) drop-shadow(0 0 10px #fff) drop-shadow(0 0 26px rgba(255,238,142,1)) drop-shadow(0 0 62px rgba(255,190,20,.98)) drop-shadow(0 0 112px rgba(255,132,0,.58));animation:chapter1PurifyFragmentBirth 13.8s linear both,chapter1PurifyFragmentGlow .72s 11.72s ease-in-out infinite alternate !important}
html.is-embedded-story [data-effect="attendance-student-card-purification"] .attendance-post-fragment::before{display:none !important}
html.is-embedded-story .chapter1-purify-drone-shards{position:absolute;z-index:18;inset:0;pointer-events:none}
html.is-embedded-story .chapter1-purify-drone-shards i{position:absolute;left:50%;top:49%;width:7px;height:16px;border-radius:4px;background:linear-gradient(#fff8cc,#ffc83b);box-shadow:0 0 8px #fff,0 0 18px #ffd044;opacity:0;transform:rotate(var(--purify-shard-a)) translateX(3vmin) scale(.3);animation:chapter1PurifyDroneShard 13.8s var(--purify-shard-delay) linear both}
html.is-embedded-story .chapter1-purify-death-wave{position:absolute;z-index:19;left:50%;top:49%;width:18vmin;height:18vmin;border-radius:50%;transform:translate(-50%,-50%) scale(.12);opacity:0;pointer-events:none;border:clamp(4px,.48vmin,8px) solid #ffd84a;box-shadow:0 0 28px rgba(255,238,151,.96),0 0 72px rgba(255,197,35,.7),inset 0 0 34px rgba(255,246,194,.38);animation:chapter1PurifyDeathWaveA 13.8s linear both}
html.is-embedded-story .chapter1-purify-death-wave.wave-b{border-width:clamp(2px,.26vmin,4px);border-color:#fff4b0;animation-name:chapter1PurifyDeathWaveB}

@keyframes chapter1PurifyCardPresence{
  0%,4%{opacity:0;transform:translate(-50%,-50%) scale(.76)}7.5%{opacity:1;transform:translate(-50%,-50%) scale(1.04)}13.5%{opacity:1;transform:translate(-50%,-50%) scale(1)}18%,38.8%{opacity:1;transform:translate(-50%,-50%) scale(1.02)}
  40.2%{opacity:1;transform:translate(calc(-50% + 6.2vw),-50%) rotate(2.4deg) scale(1.04)}43%{opacity:1;transform:translate(calc(-50% + 7.2vw),calc(-50% - 3px)) rotate(3.6deg) scale(1.03)}46%{opacity:1;transform:translate(calc(-50% + 6.8vw),calc(-50% + 3px)) rotate(3deg) scale(1.025)}49%{opacity:1;transform:translate(calc(-50% + 7.4vw),calc(-50% - 2px)) rotate(3.8deg) scale(1.02)}52%{opacity:1;transform:translate(calc(-50% + 6.9vw),calc(-50% + 2px)) rotate(3.2deg) scale(1.02)}56%{opacity:1;transform:translate(calc(-50% + 7.1vw),-50%) rotate(2.6deg) scale(1.015)}61.8%{opacity:.92;transform:translate(calc(-50% + 6.5vw),-50%) rotate(1.2deg) scale(1.01)}64%,100%{opacity:0;transform:translate(calc(-50% + 6.5vw),-50%) scale(1.01)}
}
@keyframes chapter1PurifyCardChargeGlow{0%,15%{filter:drop-shadow(0 24px 30px rgba(0,0,0,.78)) drop-shadow(0 0 18px rgba(255,224,112,.52))}22%{filter:drop-shadow(0 0 28px rgba(255,239,164,.78)) drop-shadow(0 0 68px rgba(255,209,60,.5))}30%{filter:brightness(1.1) drop-shadow(0 0 38px rgba(255,249,211,.94)) drop-shadow(0 0 88px rgba(255,207,53,.78))}38.8%{filter:brightness(1.28) drop-shadow(0 0 52px #fff) drop-shadow(0 0 124px rgba(255,218,86,1))}40.3%,61%{filter:brightness(1.12) drop-shadow(0 0 34px rgba(255,246,190,.9)) drop-shadow(0 0 84px rgba(255,204,43,.76))}64%,100%{filter:brightness(.8)}}
@keyframes chapter1PurifyCardAura{0%,9%{opacity:0;transform:scale(.7)}13%{opacity:.36}18%{opacity:.82;transform:scale(1.02)}23%{opacity:.25;transform:scale(1.16)}28%{opacity:.78;transform:scale(1.02)}33%{opacity:.28;transform:scale(1.2)}38.6%{opacity:1;transform:scale(1.12)}40.8%{opacity:.12;transform:scale(1.38)}44%,100%{opacity:0}}
@keyframes chapter1PurifyAmbientGold{0%,8%{opacity:0}12%{opacity:.34}18%{opacity:.78}25%{opacity:.96}31%{opacity:.42}37%{opacity:.8}40%{opacity:.14}62%,100%{opacity:0}}
@keyframes chapter1PurifyOrbTimeline{0%,15.5%{opacity:0;transform:translate(-50%,-50%) scale(.08)}17.5%{opacity:.7;transform:translate(-50%,-50%) scale(.24)}20%{opacity:1;transform:translate(-50%,-50%) scale(.46)}22.5%{transform:translate(-50%,-50%) scale(.34)}25%{transform:translate(-50%,-50%) scale(.62)}27.4%{transform:translate(-50%,-50%) scale(.48)}30%{transform:translate(-50%,-50%) scale(.78)}32.2%{transform:translate(-50%,-50%) scale(.61)}34.5%{transform:translate(-50%,-50%) scale(.98)}36.4%{transform:translate(-50%,-50%) scale(.8)}38.4%{transform:translate(-50%,-50%) scale(1.18)}39.7%{opacity:1;transform:translate(-50%,-50%) scale(1.38)}40.45%{opacity:1;transform:translate(-50%,-50%) scale(.12);filter:brightness(2)}41.2%,100%{opacity:0;transform:translate(-50%,-50%) scale(1.8)}}
@keyframes chapter1PurifyOrbAura{from{transform:scale(.84);opacity:.62}to{transform:scale(1.2);opacity:1}}
@keyframes chapter1PurifyOrbBlob{from{border-radius:44% 56% 51% 49% / 53% 43% 57% 47%;transform:scale(.92) rotate(-2deg)}to{border-radius:57% 43% 45% 55% / 43% 59% 41% 57%;transform:scale(1.1) rotate(2deg)}}
@keyframes chapter1PurifyOrbOrbit{to{transform:translate(-50%,-50%) rotate(378deg) scaleY(.68)}}
@keyframes chapter1PurifyOrbOrbitReverse{to{transform:translate(-50%,-50%) rotate(-397deg) scaleY(.7)}}
@keyframes chapter1PurifyOrbCore{from{transform:translate(-50%,-50%) rotate(45deg) scale(.72)}to{transform:translate(-50%,-50%) rotate(45deg) scale(1.32)}}
@keyframes chapter1PurifyVignette{0%,14%{opacity:0}20%{opacity:.34}37%{opacity:.88}40%{opacity:.18}48%{opacity:.48}62%{opacity:.15}66%{opacity:.5}72%{opacity:.18}100%{opacity:.12}}
@keyframes chapter1PurifyChargeField{0%,15.5%{opacity:0}18%{opacity:.52}22%,38.8%{opacity:1}40.7%{opacity:.24}41.5%,100%{opacity:0}}
@keyframes chapter1PurifyWaveConverge{0%{opacity:0;transform:translate(-50%,-50%) scale(1.75)}18%{opacity:.78}72%{opacity:.46}100%{opacity:0;transform:translate(-50%,-50%) scale(.18)}}
@keyframes chapter1PurifyRingSpin{0%{opacity:.46;transform:translate(-50%,-50%) rotate(0deg) scale(.9)}50%{opacity:.9;transform:translate(-50%,-50%) rotate(180deg) scale(1.08)}100%{opacity:.46;transform:translate(-50%,-50%) rotate(360deg) scale(.9)}}
@keyframes chapter1PurifyRingSpinReverse{0%{opacity:.28;transform:translate(-50%,-50%) rotate(0deg) scale(1.08)}50%{opacity:.68;transform:translate(-50%,-50%) rotate(-180deg) scale(.92)}100%{opacity:.28;transform:translate(-50%,-50%) rotate(-360deg) scale(1.08)}}
@keyframes chapter1PurifyEllipseSpin{0%{opacity:.24;transform:translate(-50%,-50%) rotate(-31deg) scale(1.05)}50%{opacity:.54;transform:translate(-50%,-50%) rotate(149deg) scale(.94)}100%{opacity:.24;transform:translate(-50%,-50%) rotate(329deg) scale(1.05)}}
@keyframes chapter1PurifyParticleConverge{0%{opacity:0;transform:rotate(var(--purify-particle-angle)) translateX(var(--purify-particle-radius)) scale(.35)}12%{opacity:.95}78%{opacity:1}100%{opacity:0;transform:rotate(calc(var(--purify-particle-angle) + 130deg)) translateX(6px) scale(.1)}}
@keyframes chapter1PurifyBeam{0%,39.8%{opacity:0;transform:scaleX(.02) scaleY(.82)}40.25%{opacity:1;transform:scaleX(.16) scaleY(1.05)}41.6%{opacity:1;transform:scaleX(1) scaleY(1.18)}44%,59.8%{opacity:1;transform:scaleX(1) scaleY(1)}61.6%{opacity:.5;transform:scaleX(1) scaleY(.78)}62.6%,100%{opacity:0;transform:scaleX(1) scaleY(.25)}}
@keyframes chapter1PurifyBeamFlow{to{background-position:-190px 0}}
@keyframes chapter1PurifyStreakRush{0%{opacity:0;transform:translateX(0) scaleX(.2)}16%{opacity:.8}100%{opacity:0;transform:translateX(-150vw) scaleX(1.4)}}
@keyframes chapter1PurifyBeamImpactLife{0%,39.7%{opacity:0}40.2%{opacity:1}42.8%{opacity:1}45.2%,100%{opacity:0}}
@keyframes chapter1PurifyImpactCore{0%,39.8%{opacity:0;transform:translate(-50%,-50%) scale(.18)}40.3%{opacity:1;transform:translate(-50%,-50%) scale(.72)}41.2%{opacity:1;transform:translate(-50%,-50%) scale(1.14)}43.8%{opacity:.38;transform:translate(-50%,-50%) scale(1.48)}45.3%,100%{opacity:0;transform:translate(-50%,-50%) scale(1.8)}}
@keyframes chapter1PurifyImpactRingA{0%,39.9%{opacity:0;transform:translate(-50%,-50%) scale(.22)}40.8%{opacity:.94;transform:translate(-50%,-50%) scale(.84)}43.8%{opacity:.26;transform:translate(-50%,-50%) scale(1.54)}45.4%,100%{opacity:0;transform:translate(-50%,-50%) scale(1.84)}}
@keyframes chapter1PurifyImpactRingB{0%,40.1%{opacity:0;transform:translate(-50%,-50%) scale(.3)}41.2%{opacity:.62;transform:translate(-50%,-50%) scale(.94)}44.1%{opacity:.22;transform:translate(-50%,-50%) scale(1.62)}45.6%,100%{opacity:0;transform:translate(-50%,-50%) scale(1.98)}}
@keyframes chapter1PurifyLaunchFlash{0%,39.7%{opacity:0}40.15%{opacity:.96}40.8%{opacity:.32}42%,100%{opacity:0}}
@keyframes chapter1PurifySharpShake{0%,100%{transform:translate(0,0)}12.5%{transform:translate(8px,-4px)}25%{transform:translate(-7px,5px)}37.5%{transform:translate(6px,6px)}50%{transform:translate(-8px,-5px)}62.5%{transform:translate(7px,3px)}75%{transform:translate(-5px,-6px)}87.5%{transform:translate(5px,5px)}}
@keyframes chapter1PurifyImpactShake{0%,100%{transform:translate(0,0)}20%{transform:translate(6px,-3px)}40%{transform:translate(-5px,4px)}60%{transform:translate(5px,5px)}80%{transform:translate(-4px,-4px)}}
@keyframes chapter1PurifyDroneHalo{0%,62%{opacity:0;transform:translate(-50%,-50%) scale(.7)}66%{opacity:.36;transform:translate(-50%,-50%) scale(1)}72%{opacity:.48}84%{opacity:.62;transform:translate(-50%,-50%) scale(1.08)}90%,100%{opacity:.18;transform:translate(-50%,-50%) scale(1.16)}}
@keyframes chapter1PurifyDroneBeam{0%,69.2%{opacity:0;transform:scaleX(.035) scaleY(.84)}71.4%{opacity:.72;transform:scaleX(.28) scaleY(1.02)}73.8%{opacity:1;transform:scaleX(1) scaleY(1.12)}75.2%,80.6%{opacity:1;transform:scaleX(1) scaleY(1)}82%{opacity:.36;transform:scaleX(1) scaleY(.68)}83.1%,100%{opacity:0;transform:scaleX(1) scaleY(.22)}}
@keyframes chapter1PurifyDroneBeamHit{0%,62.8%{opacity:0;transform:translate(-50%,-50%) scale(.82);filter:blur(8px) brightness(.55)}65.5%{opacity:1;transform:translate(-50%,-50%) scale(1);filter:blur(0) brightness(1)}71.4%{opacity:1;transform:translate(-50%,-50%) scale(1.01);filter:brightness(1.08)}73.8%{transform:translate(calc(-50% - 5px),calc(-50% + 2px)) scale(1.02) rotate(-1.5deg)}75%{transform:translate(calc(-50% + 6px),calc(-50% - 3px)) scale(1.025) rotate(1.6deg)}76.2%{transform:translate(calc(-50% - 6px),calc(-50% + 3px)) scale(1.03) rotate(-1.7deg)}77.4%{transform:translate(calc(-50% + 5px),calc(-50% - 3px)) scale(1.04) rotate(1.5deg)}79.2%{filter:brightness(1.45) saturate(.58) drop-shadow(0 0 34px rgba(255,229,128,.78))}81.2%{opacity:1;transform:translate(-50%,-50%) scale(1.08);filter:brightness(2.1) saturate(.18) drop-shadow(0 0 52px rgba(255,239,164,.96))}83.8%{opacity:1;transform:translate(-50%,-50%) scale(1.12);filter:brightness(3.4) saturate(0) blur(1px) drop-shadow(0 0 68px rgba(255,247,190,1))}86.2%{opacity:.42;transform:translate(-50%,-50%) scale(.68);filter:brightness(4) saturate(0) blur(9px)}88.2%{opacity:0;transform:translate(-50%,-50%) scale(.18);filter:brightness(4) saturate(0) blur(18px)}100%{opacity:0}}
@keyframes chapter1PurifyConversionRing{0%,81.8%{opacity:0;transform:translate(-50%,-50%) scale(.2)}84.2%{opacity:1;transform:translate(-50%,-50%) scale(.82)}88.4%{opacity:.4;transform:translate(-50%,-50%) scale(1.5)}92%,100%{opacity:0;transform:translate(-50%,-50%) scale(1.85)}}
@keyframes chapter1PurifyConversionBurst{0%,82.8%{opacity:0;transform:translate(-50%,-50%) scale(.12)}84.8%{opacity:1;transform:translate(-50%,-50%) scale(.9)}88.8%{opacity:.9;transform:translate(-50%,-50%) scale(1.2)}93%,100%{opacity:0;transform:translate(-50%,-50%) scale(1.8)}}
@keyframes chapter1PurifyDroneShard{0%,83.4%{opacity:0;transform:rotate(var(--purify-shard-a)) translateX(3vmin) scale(.2)}84.4%{opacity:1}91%{opacity:.7;transform:rotate(var(--purify-shard-a)) translateX(calc(11vmin + var(--purify-shard-r))) scale(.9)}95%,100%{opacity:0;transform:rotate(var(--purify-shard-a)) translateX(calc(17vmin + var(--purify-shard-r))) scale(.35)}}
@keyframes chapter1PurifyDeathWaveA{0%,84%{opacity:0;transform:translate(-50%,-50%) scale(.12)}85%{opacity:1}91%{opacity:.34;transform:translate(-50%,-50%) scale(5.8)}94%,100%{opacity:0;transform:translate(-50%,-50%) scale(7.4)}}
@keyframes chapter1PurifyDeathWaveB{0%,84.6%{opacity:0;transform:translate(-50%,-50%) scale(.1)}86%{opacity:.9}92%{opacity:.26;transform:translate(-50%,-50%) scale(7.2)}95%,100%{opacity:0;transform:translate(-50%,-50%) scale(8.8)}}
@keyframes chapter1PurifyFragmentBirth{0%,86.2%{opacity:0;transform:translateY(14px) rotate(0deg) scale(.15)}88.6%{opacity:1;transform:translateY(0) rotate(9deg) scale(1.2)}91%{opacity:1;transform:translateY(-7px) rotate(16deg) scale(.96)}100%{opacity:1;transform:translateY(-11px) rotate(12deg) scale(1)}}
@keyframes chapter1PurifyFragmentGlow{from{filter:brightness(1.18) saturate(1.12) drop-shadow(0 0 9px #fff) drop-shadow(0 0 22px rgba(255,232,124,.92)) drop-shadow(0 0 48px rgba(255,193,31,.82))}to{filter:brightness(1.58) saturate(1.28) drop-shadow(0 0 14px #fff) drop-shadow(0 0 34px rgba(255,240,150,1)) drop-shadow(0 0 72px rgba(255,184,12,1)) drop-shadow(0 0 122px rgba(255,132,0,.68))}}

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
  const embeddedAssets = createChapter1StoryEmbeddedAssets();
  localWindowValues.set("EMBEDDED_ASSETS", embeddedAssets);

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

  // Part 1 첫 정화 후반부 전용 레이어. 기존 출석탄/학생증 마크업은 그대로 두고,
  // 학생증 위 정화 에너지 덩어리, 수렴 파장/입자, 원통형 빔, 속도선, 드론 파편/확장 파동을 추가한다.
  if (part === 1) {
    const firstPurificationEffect = root.querySelector<HTMLElement>('[data-effect="attendance-student-card-purification"]');
    if (firstPurificationEffect && !firstPurificationEffect.querySelector('.chapter1-purify-card-orb')) {
      const card = firstPurificationEffect.querySelector<HTMLElement>('.attendance-post-card');

      const orb = document.createElement('div');
      orb.className = 'chapter1-purify-card-orb';
      orb.setAttribute('aria-hidden', 'true');
      const orbAura = document.createElement('div'); orbAura.className = 'orb-aura';
      const orbShell = document.createElement('div'); orbShell.className = 'orb-shell';
      const orbCore = document.createElement('div'); orbCore.className = 'orb-core';
      orb.append(orbAura, orbShell, orbCore);
      card?.appendChild(orb);

      const chargeField = document.createElement('div');
      chargeField.className = 'chapter1-purify-charge-field';
      chargeField.setAttribute('aria-hidden', 'true');
      const waveA = document.createElement('div'); waveA.className = 'chapter1-purify-energy-wave wave-a';
      const waveB = document.createElement('div'); waveB.className = 'chapter1-purify-energy-wave wave-b';
      const waveC = document.createElement('div'); waveC.className = 'chapter1-purify-energy-wave wave-c';
      const chargeCore = document.createElement('div'); chargeCore.className = 'chapter1-purify-charge-core';
      const chargeRingA = document.createElement('div'); chargeRingA.className = 'chapter1-purify-charge-ring ring-a';
      const chargeRingB = document.createElement('div'); chargeRingB.className = 'chapter1-purify-charge-ring ring-b';
      const chargeRingC = document.createElement('div'); chargeRingC.className = 'chapter1-purify-charge-ring ring-c';
      const chargeParticles = document.createElement('div'); chargeParticles.className = 'chapter1-purify-charge-particles';
      const particleAngles = [-164,-139,-116,-92,-68,-43,-18,6,31,55,79,104,129,153,177,202,227,252,276,301,326,348];
      particleAngles.forEach((angle,index)=>{
        const particle=document.createElement('i');
        particle.style.setProperty('--purify-particle-angle',`${angle}deg`);
        particle.style.setProperty('--purify-particle-radius',`${132+(index%6)*29}px`);
        particle.style.setProperty('--purify-particle-delay',`${(index%8)*0.065}s`);
        particle.style.setProperty('--purify-particle-size',`${5+(index%4)*2}px`);
        chargeParticles.appendChild(particle);
      });
      chargeField.append(waveA,waveB,waveC,chargeCore,chargeRingA,chargeRingB,chargeRingC,chargeParticles);

      const beamImpact=document.createElement('div');
      beamImpact.className='chapter1-purify-beam-impact';beamImpact.setAttribute('aria-hidden','true');
      const impactCore=document.createElement('div');impactCore.className='chapter1-purify-beam-impact-core';
      const impactRingA=document.createElement('div');impactRingA.className='chapter1-purify-beam-impact-ring ring-a';
      const impactRingB=document.createElement('div');impactRingB.className='chapter1-purify-beam-impact-ring ring-b';
      beamImpact.append(impactCore,impactRingA,impactRingB);

      const launchFlash=document.createElement('div');launchFlash.className='chapter1-purify-launch-flash';launchFlash.setAttribute('aria-hidden','true');
      const cinematicVignette=document.createElement('div');cinematicVignette.className='chapter1-purify-cinematic-vignette';cinematicVignette.setAttribute('aria-hidden','true');

      const streaks=document.createElement('div');streaks.className='chapter1-purify-beam-streaks';streaks.setAttribute('aria-hidden','true');
      for(let i=0;i<18;i++){
        const streak=document.createElement('i');
        streak.style.setProperty('--purify-streak-y',`${7+(i*5.1)%88}%`);
        streak.style.setProperty('--purify-streak-w',`${180+(i%5)*70}px`);
        streak.style.setProperty('--purify-streak-h',`${1+(i%3)}px`);
        streak.style.setProperty('--purify-streak-blur',`${i%4===0?1.3:.25}px`);
        streak.style.setProperty('--purify-streak-delay',`${(i%7)*0.018}s`);
        streaks.appendChild(streak);
      }

      const droneHalo=document.createElement('div');droneHalo.className='chapter1-purify-drone-halo';droneHalo.setAttribute('aria-hidden','true');
      const droneBeam=document.createElement('div');droneBeam.className='chapter1-purify-drone-beam';droneBeam.setAttribute('aria-hidden','true');

      const shards=document.createElement('div');shards.className='chapter1-purify-drone-shards';shards.setAttribute('aria-hidden','true');
      for(let i=0;i<28;i++){
        const shard=document.createElement('i');
        shard.style.setProperty('--purify-shard-a',`${(i*47)%360}deg`);
        shard.style.setProperty('--purify-shard-delay',`${(i%9)*0.012}s`);
        shard.style.setProperty('--purify-shard-r',`${(i%5)*1.6}vmin`);
        shards.appendChild(shard);
      }
      const deathWaveA=document.createElement('div');deathWaveA.className='chapter1-purify-death-wave';deathWaveA.setAttribute('aria-hidden','true');
      const deathWaveB=document.createElement('div');deathWaveB.className='chapter1-purify-death-wave wave-b';deathWaveB.setAttribute('aria-hidden','true');

      firstPurificationEffect.append(cinematicVignette,chargeField,streaks,beamImpact,launchFlash,droneHalo,droneBeam,shards,deathWaveA,deathWaveB);
    }
  }

  // Chapter 3의 보스 등장 타이틀 구조를 참고해 Chapter 1 최초 보스 등장에도 이름 연출을 추가한다.
  // 실제 전투 HUD가 아니라 storyEffectLayer 안의 gatekeeper-entrance 시네마틱에만 붙인다.
  if (part === 2) {
    const gatekeeperEntrance = root.querySelector<HTMLElement>(".gatekeeper-entrance-effect");
    if (gatekeeperEntrance && !gatekeeperEntrance.querySelector(".chapter1-gatekeeper-boss-title")) {
      const bossTitle = document.createElement("div");
      bossTitle.className = "chapter1-gatekeeper-boss-title";
      bossTitle.setAttribute("aria-hidden", "true");

      const kicker = document.createElement("div");
      kicker.className = "chapter1-gatekeeper-boss-title-kicker";
      kicker.textContent = "CHAPTER 1 · BOSS";

      const rank = document.createElement("div");
      rank.className = "chapter1-gatekeeper-boss-title-rank";
      rank.textContent = "학사 코어 핵심 오염원";

      const name = document.createElement("div");
      name.className = "chapter1-gatekeeper-boss-title-name";
      name.textContent = "수강신청 게이트키퍼";

      bossTitle.append(kicker, rank, name);
      gatekeeperEntrance.appendChild(bossTitle);
    }
  }

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
    "학사 코어 영역",
    "학사 코어 영역 입구",
    "학사 코어 영역 내부",
    "코어 영역 포탈",
    "정상화된 학사 서버",
    "경북대학교 본관",
  ]);
  const overlayDocument = (() => {
    try {
      return window.parent && window.parent !== window ? window.parent.document : document;
    } catch {
      return document;
    }
  })();
  const overlayWindow = (() => {
    try {
      return window.parent && window.parent !== window ? window.parent : window;
    } catch {
      return window;
    }
  })();

  const locationOverlay = overlayDocument.createElement("div");
  locationOverlay.className = "chapter1-location-title-overlay";
  locationOverlay.setAttribute("aria-hidden", "true");
  locationOverlay.style.setProperty("--chapter1-location-title-duration", "2500ms");

  const locationOverlayBackground = overlayDocument.createElement("div");
  locationOverlayBackground.className = "chapter1-location-title-background";
  const locationOverlayVignette = overlayDocument.createElement("div");
  locationOverlayVignette.className = "chapter1-location-title-vignette";
  const locationOverlayGrid = overlayDocument.createElement("div");
  locationOverlayGrid.className = "chapter1-location-title-grid";
  const locationOverlayCopy = overlayDocument.createElement("div");
  locationOverlayCopy.className = "chapter1-location-title-copy";
  const locationOverlayLabel = overlayDocument.createElement("small");
  locationOverlayLabel.textContent = "LOCATION";
  const locationOverlayText = overlayDocument.createElement("strong");
  locationOverlayCopy.append(locationOverlayLabel, locationOverlayText);
  locationOverlay.append(locationOverlayBackground, locationOverlayVignette, locationOverlayGrid, locationOverlayCopy);
  overlayDocument.body.appendChild(locationOverlay);

  let locationOverlayTimer: number | null = null;
  let lastLocationTitle = "";
  const showLocationTitle = (rawTitle: string, rawScene?: unknown) => {
    const title = rawTitle.trim();
    if (!locationTitles.has(title) || title === lastLocationTitle) return;
    lastLocationTitle = title;

    const scene = rawScene && typeof rawScene === "object"
      ? rawScene as Record<string, unknown>
      : null;
    const backgroundRef = typeof scene?.background === "string" ? scene.background : "";
    const resolvedBackground = backgroundRef && backgroundRef !== "none"
      ? (embeddedAssets[backgroundRef] ?? embeddedAssets[`assets/${backgroundRef}`] ?? backgroundRef)
      : "";
    const backgroundColor = typeof scene?.backgroundColor === "string" ? scene.backgroundColor : "#050506";
    const backgroundPosition = typeof scene?.position === "string" ? scene.position : "center center";

    locationOverlayText.textContent = title;
    locationOverlayBackground.style.backgroundColor = backgroundColor;
    locationOverlayBackground.style.backgroundPosition = backgroundPosition;
    if (resolvedBackground) {
      locationOverlayBackground.style.backgroundImage = `url(${JSON.stringify(resolvedBackground)})`;
    } else {
      const activeScene = root.querySelector<HTMLElement>(".scene-background.is-visible");
      const activeStyle = activeScene ? window.getComputedStyle(activeScene) : null;
      locationOverlayBackground.style.backgroundImage = activeStyle?.backgroundImage && activeStyle.backgroundImage !== "none"
        ? activeStyle.backgroundImage
        : "none";
      if (!scene?.position && activeStyle?.backgroundPosition) {
        locationOverlayBackground.style.backgroundPosition = activeStyle.backgroundPosition;
      }
    }

    locationOverlay.classList.remove("is-active");
    void locationOverlay.offsetWidth;
    locationOverlay.classList.add("is-active");
    if (locationOverlayTimer !== null) overlayWindow.clearTimeout(locationOverlayTimer);
    locationOverlayTimer = overlayWindow.setTimeout(() => {
      locationOverlayTimer = null;
      locationOverlay.classList.remove("is-active");
    }, 2500) as unknown as number;
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
    locationOverlay.remove();
    document.querySelectorAll(
      ".story-effect-layer.is-global-gatekeeper-entrance, .chapter1-core-portal-overlay, .chapter1-boss-map-arrival-fullscreen, .chapter1-boss-map-dialogue-reveal",
    ).forEach((element) => element.remove());
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
    getState() {
      const debugApi = localWindowValues.get("__CHAPTER1_FLOW_DEBUG__") as
        | { getState?: () => Record<string, unknown> }
        | undefined;
      const state = debugApi?.getState?.();
      if (!state) return null;
      return {
        mode: String(state.mode ?? ""),
        segment: String(state.segment ?? ""),
        dialogueIndex: Math.max(0, Math.floor(Number(state.dialogueIndex) || 0)),
        completionAction: String(state.completionAction ?? "finish"),
      };
    },
    restoreState(state) {
      const debugApi = localWindowValues.get("__CHAPTER1_FLOW_DEBUG__") as
        | { resumeCheckpoint?: (checkpoint: Chapter1StoryRuntimeState) => boolean }
        | undefined;
      return debugApi?.resumeCheckpoint?.(state) === true;
    },
    dispose,
  };
}
