import { useEffect, useMemo, useRef, useState } from "react";
import { Shield } from "lucide-react";
import { sfx } from "../../game/AudioSystem";
import { saveStoryCheckpoint, type StoryCheckpoint } from "../../story/storyProgress";
import "../ui/hobanwooOverlayPanels.css";
import "./chapter2StoryExperience.css";
import "./chapter3StoryExperience.css";

type Chapter3StoryExperienceProps = {
  onExit?: () => void;
  onComplete?: () => void;
  resumeCheckpoint?: StoryCheckpoint | null;
};

type Chapter3BridgeMessage = {
  channel?: string;
  type?: string;
  detail?: {
    effectId?: string;
    segmentId?: string;
    waveIndex?: number;
    totalWaves?: number;
    hp?: number;
    maxHp?: number;
    bombs?: number;
    powerLevel?: number;
    enemies?: number;
    paused?: boolean;
    index?: number;
    sectionOrdinal?: number;
    code?: string;
  };
};

type Chapter3Screen = "selector" | "story" | "wave";
type Chapter3SelectorTab = "story" | "wave" | "pattern" | "boss";
type WaveOrigin = "story" | "selector";
type StoryLaunch =
  | { kind: "full" }
  | { kind: "continue-from-section"; ordinal: number }
  | { kind: "resume"; index: number; ordinal: number };

type StorySectionMeta = {
  ordinal: number;
  title: string;
  scene: string;
};

type WaveMeta = {
  index: number;
  title: string;
  desc: string;
  pattern: string;
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
  "graduation-day-atmosphere",
  "graduation-ceremony-background",
  "autumn-campus-location-transition",
  "location-campus-ilcheongdam",
  "location-campus-baegyangro",
  "location-campus-night-promenade",
]);

const STORY_SECTIONS: StorySectionMeta[] = [
  { ordinal: 0, title: "장면 1. 마지막 학기의 시작", scene: "마지막 학기 도입" },
  { ordinal: 1, title: "장면 2. 할 게 왜 이렇게 많냐", scene: "호반우 자취방" },
  { ordinal: 2, title: "장면 3. 9월과 10월", scene: "채용·자소서·자격증" },
  { ordinal: 3, title: "장면 4. 다시 만난 4조", scene: "일청담" },
  { ordinal: 4, title: "장면 6. 이상한 지원 기록", scene: "채용 지원 기록 오류" },
  { ordinal: 5, title: "장면 7. 졸업자가진단", scene: "졸업요건 확인" },
  { ordinal: 6, title: "장면 9. 나만 그런 게 아니다", scene: "경북대학교 백양로" },
  { ordinal: 7, title: "장면 10. 오염 흔적", scene: "밤의 경북대학교 산책로" },
  { ordinal: 8, title: "장면 11. 첫 오염 개체", scene: "몬스터 생성" },
  { ordinal: 9, title: "장면 12. 학생증 재활성화와 마지막 두 별", scene: "전투 준비" },
  { ordinal: 10, title: "장면 15. 일반 몬스터 웨이브", scene: "일반 전투 전체" },
  { ordinal: 11, title: "장면 16. 정화율 100%", scene: "일반 전투 종료" },
  { ordinal: 12, title: "장면 17. 핵심 오염원 추적", scene: "보스 추적" },
  { ordinal: 13, title: "장면 20. 최종 공간", scene: "첨성대 코어·졸업 영역" },
  { ordinal: 14, title: "장면 29. 마지막 두 별 봉인 약화", scene: "보스 후반부" },
  { ordinal: 15, title: "장면 30. 긍지의 별", scene: "별 해방" },
  { ordinal: 16, title: "장면 31. 졸업의 별", scene: "별 해방" },
  { ordinal: 17, title: "장면 32. 디그리온 본체 파괴", scene: "보스 본체 붕괴" },
  { ordinal: 18, title: "장면 33. 여섯 별 연결", scene: "최종 정화 준비" },
  { ordinal: 19, title: "장면 34. 정화 에너지 형성", scene: "최종 정화" },
  { ordinal: 20, title: "장면 35. 발사", scene: "최종 정화" },
  { ordinal: 21, title: "장면 36. 충돌", scene: "디그리온 정신 충돌" },
  { ordinal: 22, title: "장면 37. 최종 정화 후", scene: "정화 직후" },
  { ordinal: 23, title: "장면 38. 첨성대 코어 정상화", scene: "코어 정상화" },
  { ordinal: 24, title: "장면 41. 졸업식 날", scene: "졸업식" },
  { ordinal: 25, title: "장면 42. 학위수여식", scene: "학위수여식장" },
  { ordinal: 26, title: "장면 43. 졸업식이 끝난 뒤", scene: "엔딩" },
];

const WAVES: WaveMeta[] = [
  { index: 0, title: "WAVE 1 · 졸업 검수 아이 기초", desc: "졸업 검수 아이 6기가 상단에서 내려오며 천천히 조준 사격. 기본 피하기와 우선 처치를 익히는 입문 웨이브", pattern: "droneBasic" },
  { index: 1, title: "WAVE 2 · 측면 검수 진입", desc: "졸업 검수 아이 8기가 좌우 화면 바깥에서 진입해 곡선 움직임과 조준탄으로 측면을 압박", pattern: "droneSides" },
  { index: 2, title: "WAVE 3 · 심사 포인터 3중 조준", desc: "졸업 심사 포인터 드론 3기가 상단에서 동시에 추적 조준 후 레이저를 발사", pattern: "laserTop3" },
  { index: 3, title: "WAVE 4 · 심사 포인터 변형 대열", desc: "심사 포인터 드론 12기가 현재 대열에서 조준·레이저 사격을 끝낸 뒤 V자·원환·양측 열·지그재그 순으로 다음 배치로 이동", pattern: "laserSquad" },
  { index: 4, title: "WAVE 5 · 학점 압박 드릴 체험", desc: "학점 압박 드릴 3기가 플레이어를 조준한 뒤 가속하면서 고속 돌진", pattern: "chargerTriple" },
  { index: 5, title: "WAVE 6 · 횡방향 회피 시험", desc: "전투영역의 세로 폭이 크게 압축되고 Y 이동이 잠긴다. 화면 위쪽의 학점 압박 드릴이 점선으로 조준한 뒤 가속 돌진하며, 공격 없이 좌우 이동만으로 연속 돌진을 버티는 회피 전용 웨이브", pattern: "survivalHorizontalRush" },
  { index: 6, title: "WAVE 7 · 좌우 교대 드릴 돌진", desc: "학점 압박 드릴 10기가 좌우 바깥에서 한 마리씩 교대로 진입해 조준 후 돌진", pattern: "chargerAlternate12" },
  { index: 7, title: "WAVE 8 · 미제출 폭주체 소규모 포위", desc: "미제출 폭주체 6기가 외곽에서 플레이어를 포위한 뒤 추적·자폭하고 6방향 파편을 방출", pattern: "suicide6" },
  { index: 8, title: "WAVE 9 · 시계방향 드릴 순환", desc: "학점 압박 드릴이 시계방향으로 순환 돌진하고, 4번째부터 중앙의 검수 아이 5기가 오각형 회전 사격으로 방해", pattern: "chargerClock8" },
  { index: 9, title: "WAVE 10 · 안전 통로 돌파", desc: "매우 좁은 전투영역 안에서 가로·세로 이동이 모두 가능하다. 화면 위에 학점 압박 드릴을 빽빽하게 한 줄로 채우되 단 한 자리만 비워 두고 수직 돌진하므로, 경계 안에서 빈 통로를 찾아 정확히 회피해야 한다", pattern: "survivalSafeGapRush" },
  { index: 10, title: "WAVE 11 · 수정 마감 폭탄 배치", desc: "수정 마감 폭탄 5기가 상단·좌측·우측에서만 진입해 안전 간격으로 위치를 선점한 뒤 점멸 → 진동 → 폭발", pattern: "mine5" },
  { index: 11, title: "WAVE 12 · 수정 마감 폭탄 밀집", desc: "수정 마감 폭탄 9기가 상단·좌측·우측에서만 진입해 촘촘히 배치되고 이동 공간을 제한", pattern: "mine9" },
  { index: 12, title: "WAVE 13 · 수정안 큐브 분열 체험", desc: "대형 수정안 큐브 2기가 1→2→4→8로 연속 분열. 일부 단계만 사격하고 마지막 조각은 추적에 집중", pattern: "splitter2" },
  { index: 13, title: "WAVE 14 · 결재 파일 부메랑 체험", desc: "결재 파일 캐리어 6기가 좌우 대칭으로 진입해 부유하며 각자 하나의 서류 부메랑만 운용", pattern: "boomerSym6" },
  { index: 14, title: "WAVE 15 · 결재 파일 왕복 압박", desc: "결재 파일 캐리어 6기가 육각 대열로 화면을 순회하며 서류 부메랑을 왕복 운용", pattern: "boomerHex" },
  { index: 15, title: "WAVE 16 · 외곽 레이저 5단 압축", desc: "좌우 화면 밖의 졸업 심사 포인터 드론이 정확히 5회의 동기화 레이저 포격을 수행한다. 매 포격이 끝날 때마다 전투영역이 크게 한 단계씩 축소되어 마지막에는 매우 좁은 공간에서 5번째 포격을 피해야 한다", pattern: "survivalOuterLaser" },
  { index: 16, title: "WAVE 17 · 졸업 서류 판넬 장대 행렬", desc: "졸업 서류 판넬 24기가 S자 행렬을 이루고, 파괴된 자리는 뒤 문서가 자연스럽게 전진해 메움. 양 사이드 검수 아이 8기가 곡선 지원 사격", pattern: "snakeEscort24" },
  { index: 17, title: "WAVE 18 · 이동 전투구역", desc: "작아진 전투영역 자체가 좌우로 이동한다. 졸업 검수 아이는 항상 프레임 바깥을 따라다니며 안쪽으로 조준탄을 쏘고, 플레이어는 움직이는 영역 안에서 살아남아야 한다", pattern: "survivalMovingZone" },
  { index: 18, title: "WAVE 19 · 졸업요건 견인 십자 횡단", desc: "졸업요건 견인기 쌍이 먼저 위·아래를 횡단하고, 제거 후 좌·우 견인 쌍이 이어서 진입", pattern: "tractorSequence" },
  { index: 19, title: "WAVE 20 · 진로방해 전기망", desc: "진로방해 연결체 7기가 점멸 예고선을 만든 뒤 서로 전기장을 연결해 이동 경로를 봉쇄", pattern: "linkStatic7" },
  { index: 20, title: "WAVE 21 · 전기선 재배치 · 기하학 회피", desc: "진로방해 연결체가 전투영역 바깥에서 빠르게 재배치되며 X·수평·수직·다이아몬드·모래시계·별·십자 등 여러 기하학 전기선을 연속 형성한다. 예고선을 보고 빈 공간만 찾아 회피한다", pattern: "survivalElectricReposition" },
  { index: 21, title: "WAVE 22 · 이동식 진로방해망", desc: "진로방해 연결체 31기가 하단까지 넓게 전개되고 일정 시간마다 위치를 바꿔 전기 네트워크를 재구성", pattern: "mobileLink31" },
  { index: 22, title: "WAVE 23 · 진로분기 체험", desc: "진로분기 변칙체 4기가 정렬 진입 후 상·하·좌·우 중 방향과 이동거리를 선택해 장거리 변칙 이동", pattern: "branch4Entry" },
  { index: 23, title: "WAVE 24 · 미이수 초대군", desc: "미이수 군집체 144기가 초고밀도로 밀려오며 일부만 느리게 사격. 집중사격으로 생존 통로를 확보", pattern: "swarm144" },
  { index: 24, title: "WAVE 25 · 수정 마감 폭탄 연쇄", desc: "수정 마감 폭탄이 1→2→4→8→16 순으로 증식 배치되고 이전 단계가 사라져야 다음 단계가 진입", pattern: "mineCascade" },
  { index: 25, title: "WAVE 26 · 미제출 폭주체 사방 대포위", desc: "미제출 폭주체 14기가 사방에서 동시에 접근해 추적·연속 자폭하는 후반 고난도 압박전", pattern: "suicide14" },
  { index: 26, title: "WAVE 27 · 이중나선 교차 포화진", desc: "검수 아이 두 줄이 화면 위 바깥에서부터 순차 진입해 이중나선을 형성하고, 결재 파일 캐리어와 심사 포인터 드론이 중앙 교차 구역을 압박", pattern: "geoHelixMixed" },
  { index: 27, title: "WAVE 28 · 수정 마감 오엽 폭발진", desc: "수정 마감 폭탄이 다섯 꽃잎을 만들고 검수 아이 원환과 심사 포인터 오각형이 안쪽에서 동시 압박", pattern: "mineFlowerMixed" },
  { index: 28, title: "WAVE 29 · 전기 만다라 혼성진", desc: "진로방해 연결체의 이중 팔각 만다라 + 외곽 검수 아이 원환 + 중앙 심사 포인터. 전기망이 팽창·수축하며 회전 재배치", pattern: "electricMandalaMixed" },
  { index: 29, title: "WAVE 30 · 진로분기 대혼선", desc: "진로분기 변칙체 12기가 대열 진입 후 각자 방향과 이동거리를 바꾸며 화면 전체를 가로지름", pattern: "branch12Entry" },
  { index: 30, title: "WAVE 31 · 풍차 돌격 붕괴진", desc: "풍차 진형을 이루던 학점 압박 드릴은 가속 돌진, 진로분기 변칙체는 장거리 방향 전환, 미제출 폭주체는 순차 자폭으로 진형에서 이탈", pattern: "geoMorphWindmill" },
  { index: 31, title: "WAVE 32 · 초고밀도 압축 돌진벽", desc: "좁아진 전투영역을 기준으로 학점 압박 드릴이 좌우에서 거의 빈틈 없이 밀집된 벽을 만들고 단 한 줄의 안전 통로만 남겨 횡단한다. 옆으로 대충 피해서는 통과할 수 없도록 밀도를 높였으며 이후 수직 돌진벽까지 이어진다", pattern: "survivalCompressedRush" },
  { index: 32, title: "WAVE 33 · 견인 롤러코스터 압박선", desc: "위·아래 졸업요건 견인선이 전장을 압박하고 검수 아이 22기가 롤러코스터 궤도를 주행하는 동안 양 사이드 학점 압박 드릴이 2기씩 난입", pattern: "tractorRollercoaster" },
  { index: 33, title: "WAVE 34 · 팽창·수축 만화경 관제진", desc: "만화경 부대가 좌우로 횡단하며 극단적으로 팽창·압축. 진로방해 연결체·심사 레이저·진로분기 변칙체·수정안 큐브의 고유 행동도 유지", pattern: "geoMorphKaleido" },
  { index: 34, title: "WAVE 35 · 졸업요건 총합 혼전", desc: "이전 웨이브의 핵심 배치들을 순차적으로 재등장시키는 최종 종합전. 각 배치에서 일정 수 이상의 몬스터가 처리되면 살아남은 몬스터는 그대로 전장에 남고 다음 배치가 합류한다. 전투영역 축소·이동·재확장도 단계별로 섞인다", pattern: "grandFinaleMixed" },
];

const BOSS_SECTIONS = STORY_SECTIONS.filter((section) => section.ordinal >= 13 && section.ordinal <= 23);

const FINAL_CREDITS_TOTAL_MS = 110_000;

type FinalCreditSection = {
  role: string;
  label: string;
  names: string[];
};

const FINAL_CREDIT_SECTIONS: FinalCreditSection[] = [
  { role: "DIRECTOR", label: "감독", names: ["마건"] },
  { role: "PROJECT LEAD", label: "총괄 기획", names: ["마건"] },
  { role: "GAME DESIGN", label: "게임 기획", names: ["마건"] },
  { role: "STORY & SCENARIO", label: "스토리 · 시나리오", names: ["마건"] },
  { role: "WORLD DESIGN", label: "세계관 설정", names: ["마건"] },
  { role: "BATTLE DESIGN", label: "전투 · 보스 · 패턴 기획", names: ["마건"] },
  { role: "LEVEL DESIGN", label: "스테이지 · 몬스터 웨이브 설계", names: ["마건"] },
  { role: "PROGRAMMING", label: "프로그래밍", names: ["마건"] },
  { role: "GAME SYSTEM DEVELOPMENT", label: "게임 시스템 개발", names: ["마건"] },
  { role: "STORY SYSTEM DEVELOPMENT", label: "스토리 시스템 개발", names: ["마건"] },
  { role: "UI / UX DESIGN", label: "UI · UX 디자인", names: ["마건"] },
  { role: "ART DIRECTION", label: "아트 디렉션", names: ["마건"] },
  { role: "CHARACTER DESIGN", label: "캐릭터 디자인", names: ["마건"] },
  { role: "MONSTER & BOSS DESIGN", label: "몬스터 · 보스 디자인", names: ["마건"] },
  { role: "VISUAL EFFECTS", label: "비주얼 이펙트", names: ["마건"] },
  { role: "SOUND DIRECTION", label: "사운드 기획 · 연출", names: ["마건"] },
  { role: "MUSIC DIRECTION", label: "음악 기획 · 연출", names: ["마건"] },
  { role: "LYRICS / COMPOSITION", label: "작사 · 작곡", names: ["마건"] },
];


const CHAPTER3_PROGRESS_KEY = "sky-strike-chapter3-story-progress-v1";

// STORY_DATA item indices. BGM is treated as an interval state, not a one-shot cue:
// jumping directly into any item restores the track that should own that story range.
const CH3_SCENE6_START_INDEX = 62;
const CH3_STRANGE_BGM_START_INDEX = 68;
const CH3_CORRUPTION_TRACE_FADE_INDEX = 108;
const CH3_CONTAMINATION_BGM_START_INDEX = 109;
const CH3_WAVE_TRANSITION_INDEX = 150;
const CH3_POST_WAVE_STRANGE_BGM_START_INDEX = 153;
const CH3_CORE_PORTAL_INDEX = 172;
const CH3_CORE_STORY_START_INDEX = 173;
const CH3_DIGRION_BODY_BREAK_INDEX = 228;
const CH3_LATE_STORY_START_INDEX = 229;
const CH3_GRADUATION_DAY_INDEX = 292;

function isChapter3OwnedBgm(track: string | null): boolean {
  return track === "/audio/chapter3-daily-story-bgm.mp3"
    || track === "/audio/chapter3-strange-event-bgm.mp3"
    || track === "/audio/chapter3-contamination-event-bgm.mp3"
    || track === "/audio/chapter3-wave-bgm.mp3"
    || track === "/audio/chapter3-final-space-bgm.mp3"
    || track === "/audio/chapter3-late-bgm.mp3"
    || track === "/audio/final-ending-bgm.mp3";
}

type Chapter3SavedProgress = { index: number; sectionOrdinal: number };
type Chapter3WaveHud = { hp: number; maxHp: number; bombs: number; powerLevel: number; waveIndex: number; totalWaves: number; enemies: number };

function readChapter3Progress(): Chapter3SavedProgress {
  if (typeof window === "undefined") return { index: 0, sectionOrdinal: 0 };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHAPTER3_PROGRESS_KEY) || "null") as Partial<Chapter3SavedProgress> | null;
    return {
      index: Math.max(0, Math.floor(Number(parsed?.index) || 0)),
      sectionOrdinal: Math.max(0, Math.min(STORY_SECTIONS.length - 1, Math.floor(Number(parsed?.sectionOrdinal) || 0))),
    };
  } catch {
    return { index: 0, sectionOrdinal: 0 };
  }
}

function writeChapter3Progress(progress: Chapter3SavedProgress): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAPTER3_PROGRESS_KEY, JSON.stringify(progress));
}

function chapter3StoryCheckpoint(index: number): StoryCheckpoint {
  return {
    version: 1,
    chapter: 3,
    kind: "story",
    part: 1,
    segment: "chapter3_full",
    dialogueIndex: Math.max(0, Math.floor(index)),
    completionAction: "chapter3-item-index",
    savedAt: Date.now(),
  };
}

function chapter3WaveCheckpoint(waveIndex: number): StoryCheckpoint {
  return {
    version: 1,
    chapter: 3,
    kind: "wave",
    waveIndex: Math.max(0, Math.floor(waveIndex)),
    savedAt: Date.now(),
  };
}

export function Chapter3StoryExperience({ onExit, onComplete, resumeCheckpoint }: Chapter3StoryExperienceProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const waveFrameRef = useRef<HTMLIFrameElement | null>(null);
  const legacyProgressRef = useRef(readChapter3Progress());
  const initialCheckpointRef = useRef<StoryCheckpoint | null>(
    resumeCheckpoint?.chapter === 3 ? resumeCheckpoint : null,
  );
  const resumedWaveCheckpointRef = useRef(initialCheckpointRef.current?.kind === "wave");
  const initialStoryIndex = initialCheckpointRef.current?.kind === "story"
    ? Math.max(0, Math.floor(initialCheckpointRef.current.dialogueIndex))
    : legacyProgressRef.current.index;
  const initialStoryOrdinal = legacyProgressRef.current.sectionOrdinal;
  const initialWaveIndex = initialCheckpointRef.current?.kind === "wave"
    ? Math.max(0, Math.floor(initialCheckpointRef.current.waveIndex))
    : 0;
  const currentStoryIndexRef = useRef(initialStoryIndex);
  const currentStorySectionOrdinalRef = useRef(initialStoryOrdinal);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [currentStorySectionOrdinal, setCurrentStorySectionOrdinal] = useState(initialStoryOrdinal);

  const [fullscreenEffect, setFullscreenEffect] = useState<string | null>(null);
  const [chapter43LocationTransitionActive, setChapter43LocationTransitionActive] = useState(false);
  const [showJumpMenu, setShowJumpMenu] = useState(false);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Chapter3Screen>(initialCheckpointRef.current?.kind === "wave" ? "wave" : "story");
  const [selectorTab, setSelectorTab] = useState<Chapter3SelectorTab>("story");
  const [storyLaunch, setStoryLaunch] = useState<StoryLaunch>({ kind: "resume", index: initialStoryIndex, ordinal: initialStoryOrdinal });
  const [storyLaunchSerial, setStoryLaunchSerial] = useState(0);
  const [waveActive, setWaveActive] = useState(initialCheckpointRef.current?.kind === "wave");
  const [waveReady, setWaveReady] = useState(false);
  const [waveFailed, setWaveFailed] = useState(false);
  const [waveRetryPromptVisible, setWaveRetryPromptVisible] = useState(false);
  const waveRetryPromptTimerRef = useRef<number | null>(null);
  const finalCreditsTimerRef = useRef<number | null>(null);
  const finalCreditsActiveRef = useRef(false);
  const [finalCreditsActive, setFinalCreditsActive] = useState(false);
  const [finalCreditsRunKey, setFinalCreditsRunKey] = useState(0);
  const [waveRunKey, setWaveRunKey] = useState(initialCheckpointRef.current?.kind === "wave" ? 1 : 0);
  const [waveStartIndex, setWaveStartIndex] = useState(initialWaveIndex);
  const [waveSingle, setWaveSingle] = useState(false);
  const [failedWaveIndex, setFailedWaveIndex] = useState<number | null>(null);
  const [waveDeathCounts, setWaveDeathCounts] = useState<Record<number, number>>({});
  const [waveOrigin, setWaveOrigin] = useState<WaveOrigin>("story");
  const [storyIsTestJump, setStoryIsTestJump] = useState(false);
  const [exitConfirmMode, setExitConfirmMode] = useState<"story" | "wave" | null>(null);
  const [wavePaused, setWavePaused] = useState(false);
  const [waveHud, setWaveHud] = useState<Chapter3WaveHud>({ hp: 3, maxHp: 3, bombs: 3, powerLevel: 1, waveIndex: initialWaveIndex, totalWaves: WAVES.length, enemies: 0 });

  useEffect(() => {
    if (!waveActive) return;
    sfx.startBgmForPhase(3);
    return () => {
      if (sfx.currentBgmTrack === "/audio/chapter3-wave-bgm.mp3") sfx.stopBgm();
    };
  }, [waveActive]);
  useEffect(() => () => {
    if (waveRetryPromptTimerRef.current !== null) {
      window.clearTimeout(waveRetryPromptTimerRef.current);
      waveRetryPromptTimerRef.current = null;
    }
    if (finalCreditsTimerRef.current !== null) {
      window.clearTimeout(finalCreditsTimerRef.current);
      finalCreditsTimerRef.current = null;
    }
    finalCreditsActiveRef.current = false;
  }, []);

  useEffect(() => {
    const persistCurrentLocation = () => {
      if (storyIsTestJump || finalCreditsActiveRef.current) return;
      if (waveActive && waveOrigin === "story") {
        saveStoryCheckpoint(chapter3WaveCheckpoint(waveHud.waveIndex));
        return;
      }
      if (screen === "story") {
        saveStoryCheckpoint(chapter3StoryCheckpoint(currentStoryIndexRef.current));
      }
    };
    const handlePageHide = () => persistCurrentLocation();
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") persistCurrentLocation();
    };
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [screen, storyIsTestJump, waveActive, waveOrigin, waveHud.waveIndex]);

  const frameSrc = useMemo(
    () => `/chapter3_story/index.html?hostSelector=1&run=${storyLaunchSerial}`,
    [storyLaunchSerial],
  );
  const wavePower = (waveDeathCounts[waveStartIndex] ?? 0) >= 3 ? 5 : 1;
  const waveSrc = `/chapter3_wave/index.html?embedded=1&start=${waveStartIndex}&power=${wavePower}&single=${waveSingle ? 1 : 0}&run=${waveRunKey}`;

  const postStoryCommand = (type: string, detail?: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(
      { channel: "sky-strike-chapter3-host", type, detail },
      window.location.origin,
    );
  };

  const postWaveCommand = (type: string, detail?: Record<string, unknown>) => {
    waveFrameRef.current?.contentWindow?.postMessage(
      { channel: "sky-strike-chapter3-wave-host", type, detail },
      window.location.origin,
    );
  };

  const openExitConfirm = (mode: "story" | "wave") => {
    setExitConfirmMode(mode);
    if (mode === "wave") {
      setWavePaused(true);
      postWaveCommand("set-paused", { paused: true });
    } else {
      postStoryCommand("set-exit-confirm", { open: true });
    }
  };

  const closeExitConfirm = () => {
    const mode = exitConfirmMode;
    setExitConfirmMode(null);
    if (mode === "wave") {
      setWavePaused(false);
      postWaveCommand("set-paused", { paused: false });
      window.requestAnimationFrame(() => {
        waveFrameRef.current?.focus({ preventScroll: true });
        waveFrameRef.current?.contentWindow?.focus();
      });
    } else if (mode === "story") {
      postStoryCommand("set-exit-confirm", { open: false });
      window.requestAnimationFrame(() => frameRef.current?.contentWindow?.focus());
    }
  };

  const leaveChapter3FromExitConfirm = () => {
    const mode = exitConfirmMode;
    if (!storyIsTestJump) {
      if (mode === "wave") saveStoryCheckpoint(chapter3WaveCheckpoint(waveHud.waveIndex));
      else saveStoryCheckpoint(chapter3StoryCheckpoint(currentStoryIndexRef.current));
    }
    if (mode === "wave") postWaveCommand("set-paused", { paused: false });
    if (mode === "story") postStoryCommand("set-exit-confirm", { open: false });
    setWavePaused(false);
    setExitConfirmMode(null);
    onExit?.();
  };

  const clearWaveRetryPromptTimer = () => {
    if (waveRetryPromptTimerRef.current !== null) {
      window.clearTimeout(waveRetryPromptTimerRef.current);
      waveRetryPromptTimerRef.current = null;
    }
  };

  const clearFinalCreditsTimer = () => {
    if (finalCreditsTimerRef.current !== null) {
      window.clearTimeout(finalCreditsTimerRef.current);
      finalCreditsTimerRef.current = null;
    }
  };

  const beginFinalCredits = () => {
    if (finalCreditsActiveRef.current) return;
    finalCreditsActiveRef.current = true;
    clearFinalCreditsTimer();
    setFinalCreditsRunKey((key) => key + 1);
    setFinalCreditsActive(true);
    setWaveActive(false);
    setFullscreenEffect("chapter-ending");
    sfx.resumeAll();
    sfx.startFinalEndingBgm();

    finalCreditsTimerRef.current = window.setTimeout(() => {
      finalCreditsTimerRef.current = null;
      finalCreditsActiveRef.current = false;
      setFinalCreditsActive(false);
      setFullscreenEffect(null);
      if (isChapter3OwnedBgm(sfx.currentBgmTrack)) sfx.stopBgm();
      if (storyIsTestJump) {
        returnToSelector();
        return;
      }
      writeChapter3Progress({ index: 0, sectionOrdinal: 0 });
      onComplete?.();
    }, FINAL_CREDITS_TOTAL_MS);
  };

  const resetStoryFramePresentation = () => {
    // Some Chapter 3 cinematics temporarily promote the story iframe with inline
    // !important positioning. A direct TEST jump to combat must scrub that state
    // synchronously or the old story surface can remain visible beside the wave.
    const storyFrame = frameRef.current;
    if (!storyFrame) return;
    [
      "position", "inset", "left", "top", "right", "bottom",
      "width", "height", "min-width", "min-height", "max-width", "max-height",
      "margin", "transform", "z-index", "opacity", "visibility", "display",
      "pointer-events", "aspect-ratio"
    ].forEach((property) => storyFrame.style.removeProperty(property));
  };

  const hideStoryFrameForWave = () => {
    resetStoryFramePresentation();
    const storyFrame = frameRef.current;
    if (!storyFrame) return;
    storyFrame.style.setProperty("display", "none", "important");
    storyFrame.style.setProperty("opacity", "0", "important");
    storyFrame.style.setProperty("pointer-events", "none", "important");
  };

  const restoreStoryFrameForStory = () => {
    resetStoryFramePresentation();
  };

  const returnToSelector = () => {
    restoreStoryFrameForStory();

    if (isChapter3OwnedBgm(sfx.currentBgmTrack)) sfx.stopBgm();
    clearFinalCreditsTimer();
    finalCreditsActiveRef.current = false;
    setFinalCreditsActive(false);
    setFullscreenEffect(null);
    clearWaveRetryPromptTimer();
    setWaveActive(false);
    setWaveFailed(false);
    setWaveRetryPromptVisible(false);
    setWaveReady(false);
    setFailedWaveIndex(null);
    setExitConfirmMode(null);
    setWavePaused(false);
    setStoryIsTestJump(false);
    setScreen("story");
    setShowJumpMenu(true);
  };

  const prepareStoryLaunch = (launch: StoryLaunch, testJump = true) => {
    restoreStoryFrameForStory();
    clearFinalCreditsTimer();
    finalCreditsActiveRef.current = false;
    setFinalCreditsActive(false);
    setFullscreenEffect(null);
    clearWaveRetryPromptTimer();
    setWaveActive(false);
    setWaveFailed(false);
    setWaveRetryPromptVisible(false);
    setWaveReady(false);
    setFailedWaveIndex(null);
    setExitConfirmMode(null);
    setWavePaused(false);
    setStoryIsTestJump(testJump);
    setShowJumpMenu(false);
    setReady(false);
    setStoryLaunch(launch);
    setScreen("story");
    setStoryLaunchSerial((serial) => serial + 1);
  };

  const launchFullStory = () => prepareStoryLaunch({ kind: "full" }, true);
  const launchStorySection = (ordinal: number) => prepareStoryLaunch({ kind: "continue-from-section", ordinal }, true);
  const launchBossFlow = () => prepareStoryLaunch({ kind: "continue-from-section", ordinal: 13 }, true);

  const launchWave = (index: number, single: boolean, origin: WaveOrigin = "selector") => {
    const safeIndex = Math.max(0, Math.min(WAVES.length - 1, Math.floor(index)));
    // Hide the story iframe immediately before React commits the wave state. This
    // prevents the old left-side story panel from lingering during direct TEST jumps.
    hideStoryFrameForWave();
    setFullscreenEffect(null);
    setShowJumpMenu(false);
    setWaveOrigin(origin);
    clearWaveRetryPromptTimer();
    setWaveFailed(false);
    setWaveRetryPromptVisible(false);
    setWaveReady(false);
    setWaveStartIndex(safeIndex);
    setWaveSingle(single);
    setFailedWaveIndex(null);
    setExitConfirmMode(null);
    setWavePaused(false);
    setWaveHud({ hp: 3, maxHp: 3, bombs: 3, powerLevel: (waveDeathCounts[safeIndex] ?? 0) >= 3 ? 5 : 1, waveIndex: safeIndex, totalWaves: WAVES.length, enemies: 0 });
    if (origin === "story" && !storyIsTestJump) {
      saveStoryCheckpoint(chapter3WaveCheckpoint(safeIndex));
    }
    setWaveRunKey((key) => key + 1);
    setWaveActive(true);
    setScreen("wave");
  };

  const skipCurrentContext = () => {
    if (waveActive || screen === "wave") {
      const nextWave = Math.min(WAVES.length - 1, Math.max(waveStartIndex, waveHud.waveIndex) + 1);
      if (nextWave > Math.max(waveStartIndex, waveHud.waveIndex)) launchWave(nextWave, false, "selector");
      else returnToSelector();
      return;
    }
    postStoryCommand("skip-current");
  };

  const jumpToNextMajorContext = () => {
    if (waveActive || screen === "wave") {
      launchBossFlow();
      return;
    }
    const nextOrdinal = Math.min(STORY_SECTIONS.length - 1, currentStorySectionOrdinalRef.current + 1);
    launchStorySection(nextOrdinal);
  };

  useEffect(() => {
    if (!ready || screen !== "story") return;
    if (storyLaunch.kind === "full") {
      postStoryCommand("start-full-story");
      return;
    }
    if (storyLaunch.kind === "resume") {
      postStoryCommand("start-item-index", { index: storyLaunch.index });
      return;
    }
    const section = STORY_SECTIONS[storyLaunch.ordinal];
    if (section) postStoryCommand("start-section", { titlePrefix: section.title });
    else postStoryCommand("start-section-ordinal", { ordinal: storyLaunch.ordinal });
  }, [ready, screen, storyLaunch]);

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

        if (message.type === "final-space-bgm-start") {
          sfx.resumeAll();
          sfx.startChapter3FinalSpaceBgm();
          return;
        }

        if (message.type === "late-story-bgm-start") {
          sfx.resumeAll();
          sfx.startChapter3LateBgm();
          return;
        }

        if (message.type === "effect-start") {
          const effectId = message.detail?.effectId || "";
          if (effectId === "combat-transition") {
            sfx.fadeOutBgm(2800);
          }
          if (effectId === "teleport-core") {
            sfx.fadeOutBgm(3600);
          }
          if (effectId === "digrion-body-break") {
            // Scene 32: fade the core BGM during the body-destruction cinematic.
            sfx.fadeOutBgm(4200);
          }
          if (effectId === "graduation-campus-return-fullscreen") {
            setChapter43LocationTransitionActive(true);
          }
          if (effectId === "battle-running") {
            setFullscreenEffect(null);
            launchWave(0, false, "story");
            return;
          }
          if (effectId === "chapter-ending") {
            beginFinalCredits();
          }
          if (FULLSCREEN_EFFECTS.has(effectId)) setFullscreenEffect(effectId);
          return;
        }

        if (message.type === "effect-end") {
          const effectId = message.detail?.effectId || "";
          if (effectId === "graduation-campus-return-fullscreen") {
            setChapter43LocationTransitionActive(false);
          }
          setFullscreenEffect((current) => (current === effectId ? null : current));
          return;
        }

        if (message.type === "progress-change") {
          const storyIndex = Math.max(0, Math.floor(message.detail?.index ?? 0));

          // Scene 1~4: user-supplied Chapter 3 daily BGM. Scene 6 begins by fading it out.
          if (storyIndex < CH3_SCENE6_START_INDEX) {
            sfx.startChapter3DailyBgm();
          } else if (storyIndex === CH3_SCENE6_START_INDEX) {
            sfx.startChapter3DailyBgm();
            sfx.fadeOutBgm(2800);
          }

          // Scene 6 "뭐지 ……?" -> Scene 10 "피곤하니까..." keeps the strange-event BGM.
          if (storyIndex >= CH3_STRANGE_BGM_START_INDEX && storyIndex < CH3_CORRUPTION_TRACE_FADE_INDEX) {
            sfx.startChapter3StrangeEventBgm();
          }
          // Immediately after "피곤하니까 빨리 집 가서 자야겠다." the trace cinematic fades it out.
          if (storyIndex === CH3_CORRUPTION_TRACE_FADE_INDEX) {
            sfx.startChapter3StrangeEventBgm();
            sfx.fadeOutBgm(2200);
          }

          // "저게 뭐지..?" starts the contamination BGM and keeps it through the pre-wave story.
          if (storyIndex >= CH3_CONTAMINATION_BGM_START_INDEX && storyIndex < CH3_WAVE_TRANSITION_INDEX) {
            sfx.startChapter3ContaminationEventBgm();
          }
          // STORY -> SHOOTING transition fades the current story BGM before wave BGM takes over.
          if (storyIndex === CH3_WAVE_TRANSITION_INDEX) {
            sfx.startChapter3ContaminationEventBgm();
            sfx.fadeOutBgm(2800);
          }

          // Scene 16 onward restores the strange-event BGM until the core portal begins.
          if (storyIndex >= CH3_POST_WAVE_STRANGE_BGM_START_INDEX && storyIndex < CH3_CORE_PORTAL_INDEX) {
            sfx.startChapter3StrangeEventBgm();
          }
          if (storyIndex === CH3_CORE_PORTAL_INDEX) {
            sfx.startChapter3StrangeEventBgm();
            sfx.fadeOutBgm(3600);
          }

          // Direct scene jumps inside the core restore the intended core/late-game tracks.
          if (storyIndex >= CH3_CORE_STORY_START_INDEX && storyIndex <= CH3_DIGRION_BODY_BREAK_INDEX) {
            sfx.startChapter3FinalSpaceBgm();
          }
          if (storyIndex >= CH3_LATE_STORY_START_INDEX && storyIndex < CH3_GRADUATION_DAY_INDEX) {
            sfx.startChapter3LateBgm();
          }

          // Scene 41 uses the supplied Chapter 3 daily track as the temporary graduation BGM.
          if (storyIndex >= CH3_GRADUATION_DAY_INDEX) {
            sfx.startChapter3DailyBgm();
          }

          const sectionOrdinal = Math.max(0, Math.floor(message.detail?.sectionOrdinal ?? 0));
          currentStoryIndexRef.current = storyIndex;
          currentStorySectionOrdinalRef.current = sectionOrdinal;
          setCurrentStoryIndex(storyIndex);
          setCurrentStorySectionOrdinal(sectionOrdinal);
          if (!storyIsTestJump) {
            writeChapter3Progress({ index: storyIndex, sectionOrdinal });
            saveStoryCheckpoint(chapter3StoryCheckpoint(storyIndex));
          }
          return;
        }

        if (message.type === "escape-request") {
          if (finalCreditsActiveRef.current) return;
          if (exitConfirmMode === "story") closeExitConfirm();
          else openExitConfirm("story");
          return;
        }

        if (message.type === "test-key") {
          const code = String(message.detail?.code || "");
          if (code === "F6") skipCurrentContext();
          else if (code === "F7") setShowJumpMenu((open) => !open);
          else if (code === "F8") jumpToNextMajorContext();
          return;
        }

        if (message.type === "section-complete") {
          return;
        }

        if (message.type === "story-complete") {
          // The final credits own the end of Chapter 3. The iframe finishes its short
          // handoff effect after 5.6 s, but the host must stay alive until the 1:50
          // ending track and full credits sequence have completed.
          if (finalCreditsActiveRef.current) return;
          setFullscreenEffect(null);
          setWaveActive(false);
          if (isChapter3OwnedBgm(sfx.currentBgmTrack)) sfx.stopBgm();
          if (storyIsTestJump) {
            returnToSelector();
          } else {
            writeChapter3Progress({ index: 0, sectionOrdinal: 0 });
            onComplete?.();
          }
        }
        return;
      }

      if (event.source === waveFrameRef.current?.contentWindow) {
        if (message.channel !== "sky-strike-chapter3-wave") return;

        if (message.type === "ready") {
          setWaveReady(true);
          // The iframe has just become the active combat surface. Focus it immediately
          // so WASD/arrow input works without requiring an initial mouse click.
          window.requestAnimationFrame(() => {
            waveFrameRef.current?.focus({ preventScroll: true });
            waveFrameRef.current?.contentWindow?.focus();
          });
          return;
        }

        // Chapter 3 combat reuses the exact Chapter 1 procedural SFX.
        // The wave runs inside an iframe, so it asks the host to play the shared AudioSystem sounds.
        if (message.type === "sfx-player-shoot") {
          sfx.resumeAll();
          sfx.shoot();
          return;
        }

        if (message.type === "sfx-enemy-hit") {
          sfx.resumeAll();
          sfx.enemyHit();
          return;
        }

        if (message.type === "sfx-enemy-explode") {
          sfx.resumeAll();
          sfx.enemyExplode();
          return;
        }

        if (message.type === "sfx-smart-bomb") {
          sfx.resumeAll();
          sfx.bossExplode();
          return;
        }

        if (message.type === "sfx-powerup") {
          sfx.resumeAll();
          sfx.powerup();
          return;
        }

        if (message.type === "sfx-player-hit") {
          sfx.resumeAll();
          sfx.hit();
          return;
        }

        if (message.type === "hud-state") {
          const activeWaveIndex = Math.max(0, Math.floor(message.detail?.waveIndex ?? waveStartIndex));
          setWaveHud({
            hp: Math.max(0, Math.floor(message.detail?.hp ?? 3)),
            maxHp: Math.max(1, Math.floor(message.detail?.maxHp ?? 3)),
            bombs: Math.max(0, Math.floor(message.detail?.bombs ?? 3)),
            powerLevel: Math.max(1, Math.min(5, Math.floor(message.detail?.powerLevel ?? 1))),
            waveIndex: activeWaveIndex,
            totalWaves: Math.max(1, Math.floor(message.detail?.totalWaves ?? WAVES.length)),
            enemies: Math.max(0, Math.floor(message.detail?.enemies ?? 0)),
          });
          if (waveOrigin === "story" && !storyIsTestJump) {
            saveStoryCheckpoint(chapter3WaveCheckpoint(activeWaveIndex));
          }
          return;
        }

        if (message.type === "escape-request") {
          if (exitConfirmMode === "wave") closeExitConfirm();
          else openExitConfirm("wave");
          return;
        }

        if (message.type === "pause-state") {
          setWavePaused(Boolean(message.detail?.paused));
          return;
        }

        if (message.type === "wave-failed") {
          const failedWave = Math.max(0, Math.floor(message.detail?.waveIndex ?? waveStartIndex));
          if (waveOrigin === "story" && !storyIsTestJump) {
            saveStoryCheckpoint(chapter3WaveCheckpoint(failedWave));
          }
          setFailedWaveIndex(failedWave);
          setWaveDeathCounts((counts) => ({
            ...counts,
            [failedWave]: (counts[failedWave] ?? 0) + 1,
          }));
          clearWaveRetryPromptTimer();
          setWaveRetryPromptVisible(false);
          setWaveFailed(true);
          // Chapter 1 exact flow: fade the combat screen to full black for 1.35 s,
          // then reveal the retry prompt only after the blackout has completed.
          waveRetryPromptTimerRef.current = window.setTimeout(() => {
            waveRetryPromptTimerRef.current = null;
            setWaveRetryPromptVisible(true);
          }, 1350);
          return;
        }

        if (message.type === "wave-complete") {
          clearWaveRetryPromptTimer();
          setWaveRetryPromptVisible(false);
          setWaveFailed(false);
          setExitConfirmMode(null);
          setWavePaused(false);
          setWaveActive(false);
          if (waveOrigin === "story") {
            if (resumedWaveCheckpointRef.current) {
              // A page/session resumed directly inside combat, so the hidden story iframe
              // was never paused at its original battle gate. Continue from the first
              // post-wave story item explicitly instead of sending a resume signal to
              // an iframe that has no paused gate state.
              resumedWaveCheckpointRef.current = false;
              const postWaveIndex = CH3_POST_WAVE_STRANGE_BGM_START_INDEX;
              const postWaveOrdinal = 11;
              writeChapter3Progress({ index: postWaveIndex, sectionOrdinal: postWaveOrdinal });
              saveStoryCheckpoint(chapter3StoryCheckpoint(postWaveIndex));
              prepareStoryLaunch({ kind: "resume", index: postWaveIndex, ordinal: postWaveOrdinal }, false);
            } else {
              restoreStoryFrameForStory();
              setScreen("story");
              frameRef.current?.contentWindow?.postMessage(
                { channel: "sky-strike-chapter3-host", type: "wave-complete" },
                window.location.origin,
              );
            }
          } else {
            returnToSelector();
          }
          return;
        }

        if (message.type === "exit-request") {
          if (waveOrigin === "selector") {
            returnToSelector();
          } else {
            if (!storyIsTestJump) saveStoryCheckpoint(chapter3WaveCheckpoint(waveHud.waveIndex));
            onExit?.();
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onComplete, onExit, storyIsTestJump, storyLaunch, waveOrigin, waveStartIndex, waveHud.waveIndex, screen, waveActive, exitConfirmMode, currentStorySectionOrdinal]);

  useEffect(() => {
    const handleHostKeyboard = (event: KeyboardEvent) => {
      if (finalCreditsActiveRef.current) return;
      if (event.code === "Escape") {
        if (exitConfirmMode) {
          event.preventDefault();
          closeExitConfirm();
          return;
        }
        if (screen === "story" || screen === "wave" || waveActive) {
          event.preventDefault();
          openExitConfirm(waveActive || screen === "wave" ? "wave" : "story");
        }
        return;
      }
      if (event.code === "F6" || event.code === "F7" || event.code === "F8") {
        event.preventDefault();
        if (event.code === "F6") skipCurrentContext();
        else if (event.code === "F7") setShowJumpMenu((open) => !open);
        else jumpToNextMajorContext();
      }
    };
    window.addEventListener("keydown", handleHostKeyboard, true);
    return () => window.removeEventListener("keydown", handleHostKeyboard, true);
  }, [exitConfirmMode, screen, waveActive, waveStartIndex, waveHud.waveIndex, currentStorySectionOrdinal]);

  const retryWave = () => {
    clearWaveRetryPromptTimer();
    if (failedWaveIndex !== null) setWaveStartIndex(failedWaveIndex);
    setFailedWaveIndex(null);
    setWaveRetryPromptVisible(false);
    setWaveFailed(false);
    setWaveReady(false);
    setWaveRunKey((key) => key + 1);
  };

  const renderStoryCards = () => (
    <>
      <button type="button" className="chapter3SelectCard is-wide" onClick={launchFullStory}>
        <b>FULL STORY</b><strong>챕터 3 전체 진행</strong><span>첫 장면부터 일반 전투와 최종 정화·졸업식까지 연속 진행합니다.</span>
      </button>
      {STORY_SECTIONS.map((section) => (
        <button key={section.ordinal} type="button" className="chapter3SelectCard" onClick={() => launchStorySection(section.ordinal)}>
          <b>{String(section.ordinal + 1).padStart(2, "0")} · STORY</b>
          <strong>{section.title}</strong>
          <span>{section.scene} · 선택한 장면부터 이후 장면이 자연스럽게 계속 이어집니다.</span>
        </button>
      ))}
    </>
  );

  const renderWaveCards = () => WAVES.map((wave) => (
    <button key={wave.index} type="button" className="chapter3SelectCard" onClick={() => launchWave(wave.index, false)}>
      <b>{wave.title.split(" · ")[0]}</b>
      <strong>{wave.title.split(" · ").slice(1).join(" · ")}</strong>
      <span>{wave.desc}</span>
    </button>
  ));

  const renderPatternCards = () => WAVES.map((wave) => (
    <button key={wave.pattern} type="button" className="chapter3SelectCard is-pattern" onClick={() => launchWave(wave.index, false)}>
      <b>PATTERN · {wave.pattern}</b>
      <strong>{wave.title}</strong>
      <span>이 패턴의 웨이브에서 시작해 이후 웨이브를 자동으로 계속 진행합니다.</span>
    </button>
  ));

  const renderBossCards = () => (
    <>
      <button type="button" className="chapter3SelectCard is-wide" onClick={launchBossFlow}>
        <b>BOSS FLOW</b><strong>장면 20부터 보스 흐름 연속 진행</strong><span>최종 공간 진입부터 이후 스토리를 계속 진행합니다.</span>
      </button>
      {BOSS_SECTIONS.map((section) => (
        <button key={section.ordinal} type="button" className="chapter3SelectCard is-boss" onClick={() => launchStorySection(section.ordinal)}>
          <b>BOSS SECTION</b>
          <strong>{section.title}</strong>
          <span>{section.scene} · 선택 지점부터 이후 보스 스토리를 계속 진행</span>
        </button>
      ))}
      <div className="chapter3BossRuntimeNotice">
        <b>BOSS PATTERN</b>
        <span>디그리온 실제 보스 전투 런타임은 아직 프로젝트에 통합되어 있지 않아, 존재하지 않는 패턴 버튼은 만들지 않았습니다. 보스 런타임 통합 후 이 탭에 실제 패턴별 실행 버튼을 연결합니다.</span>
      </div>
    </>
  );

  return (
    <section
      className={`chapter3StoryExperience${fullscreenEffect ? " is-fullscreen-effect" : ""}${waveActive ? " is-wave-active" : ""}${screen === "selector" ? " is-selector-open" : ""}${finalCreditsActive ? " is-final-credits" : ""}`}
      data-chapter3-effect={fullscreenEffect || undefined}
      data-wave-paused={wavePaused ? "true" : undefined}
      aria-label="챕터 3"
    >
      <iframe
        key={`chapter3-story-${storyLaunchSerial}`}
        ref={frameRef}
        className="chapter3StoryFrame"
        src={frameSrc}
        title="CHAPTER 3 — 졸업요건 최종전"
        allow="autoplay; fullscreen"
        aria-hidden={screen === "selector" || screen === "wave" || finalCreditsActive}
      />

      {chapter43LocationTransitionActive && (
        <div className="chapter3FullscreenLocationTransition" aria-label="경북대학교 배경 전환">
          <div className="chapter3FullscreenLocationBackground" />
          <div className="chapter3FullscreenLocationVignette" />
          <div className="chapter3FullscreenLocationCopy">
            <small>LOCATION</small>
            <strong>경북대학교</strong>
          </div>
        </div>
      )}

      {finalCreditsActive && (
        <div
          key={`chapter3-final-credits-${finalCreditsRunKey}`}
          className="chapter3FinalCreditsOverlay"
          role="presentation"
          aria-label="호반우의 졸업 대작전 최종 엔딩 크레딧"
        >
          <div className="chapter3FinalCreditsWhiteout" aria-hidden="true" />
          <div className="chapter3FinalCreditsBlackout" aria-hidden="true" />

          <div className="chapter3FinalCreditsScrollViewport">
            <div className="chapter3FinalCreditsTrack">
              <div className="chapter3FinalCreditsLeadLogo" aria-label="호반우의 졸업 대작전">
                <img src="/chapter3_story/assets/story/common/ui/game_logo.png" alt="호반우의 졸업 대작전" />
              </div>

              <header className="chapter3FinalCreditsHeading">
                <small>FINAL CREDITS</small>
                <strong>호반우의 졸업 대작전</strong>
              </header>

              {FINAL_CREDIT_SECTIONS.map((section) => (
                <section className="chapter3FinalCreditSection" key={`${section.role}-${section.label}`}>
                  <small>{section.role}</small>
                  <h2>{section.label}</h2>
                  {section.names.map((name) => <p key={name}>{name}</p>)}
                </section>
              ))}

              <div className="chapter3FinalCreditsDivider" aria-hidden="true" />

              <section className="chapter3FinalCreditSection is-tools">
                <small>DEVELOPMENT TOOL</small>
                <h2>개발 도구</h2>
                <p>OpenAI ChatGPT</p>
              </section>

              <section className="chapter3FinalCreditSection is-tools">
                <small>AI MUSIC TOOLS</small>
                <h2>AI 음악 제작 도구</h2>
                <p>Suno</p>
                <p>Google Gemini</p>
              </section>

              <div className="chapter3FinalCreditsDivider" aria-hidden="true" />

              <section className="chapter3FinalCreditSection is-support">
                <small>SUPPORTED BY</small>
                <h2>후원 · 지원</h2>
                <p>경북대학교 기계공학부</p>
                <p>Extreme Environment Transducer Laboratory</p>
                <p>EETL</p>
                <p className="chapter3FinalCreditsSupportName">정용록 교수님</p>
              </section>

              <section className="chapter3FinalCreditSection is-rights">
                <small>RIGHTS &amp; PERMISSIONS</small>
                <h2>저작권 · 사용 허가</h2>
                <p>호반우 캐릭터 및 경북대학교 관련 저작물·표장은<br />사용 허가를 받아 제작되었습니다.</p>
              </section>

              <section className="chapter3FinalCreditSection is-special">
                <small>SPECIAL THANKS</small>
                <h2>Special Thanks</h2>
                <p>히아신스</p>
              </section>
            </div>
          </div>

          <div className="chapter3FinalCreditsThanks">
            <div>
              <p>그리고,</p>
              <strong>이 게임을 끝까지 플레이해 주신<br />당신에게.</strong>
              <span>THANK YOU FOR PLAYING</span>
              <img src="/chapter3_story/assets/story/common/ui/game_logo.png" alt="호반우의 졸업 대작전" />
              <small>DIRECTED &amp; CREATED BY · 마건</small>
              <small>© 2026 마건</small>
            </div>
          </div>
        </div>
      )}

      {ready && !exitConfirmMode && !waveFailed && !finalCreditsActive && (
        <div className="chapter2-story-test-navigation chapter3-story-test-navigation" aria-label="챕터 3 진행 테스트 이동">
          <div className="chapter2-story-test-toolbar">
            <button type="button" className="chapter2-story-test-skip" onClick={skipCurrentContext}>
              SKIP · F6
            </button>
            <button
              type="button"
              className="chapter2-story-test-toggle"
              onClick={() => setShowJumpMenu((open) => !open)}
            >
              TEST 이동 · F7
            </button>
          </div>

          {showJumpMenu && (
            <aside className="chapter2-story-test-panel" aria-label="챕터 3 원하는 위치로 이동">
              <div className="chapter2-story-test-title">CHAPTER 3 TEST NAVIGATION</div>
              <div className="chapter2-story-test-phase">
                현재: {waveActive || screen === "wave" ? `WAVE ${waveHud.waveIndex + 1}` : `STORY #${currentStoryIndex + 1}`}
              </div>

              <div className="chapter2-story-test-group">
                <strong>스토리 구간</strong>
                <button type="button" className={screen === "story" && currentStorySectionOrdinal === 0 ? "is-current" : ""} onClick={launchFullStory}>처음부터</button>
                {STORY_SECTIONS.map((section) => (
                  <button
                    type="button"
                    key={`chapter3-section-${section.ordinal}`}
                    className={screen === "story" && currentStorySectionOrdinal === section.ordinal ? "is-current" : ""}
                    onClick={() => launchStorySection(section.ordinal)}
                  >
                    {section.title}
                  </button>
                ))}
              </div>

              <div className="chapter2-story-test-group">
                <strong>일반 몬스터 웨이브</strong>
                <div className="chapter2-story-wave-grid">
                  {WAVES.map((wave) => (
                    <button
                      type="button"
                      key={`chapter3-wave-${wave.index}`}
                      className={(waveActive || screen === "wave") && waveHud.waveIndex === wave.index ? "is-current is-combat" : "is-combat"}
                      onClick={() => launchWave(wave.index, false, "selector")}
                      title={wave.title}
                    >
                      {wave.index + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chapter2-story-test-group">
                <strong>보스 · 최종 정화 구간</strong>
                <button type="button" className="is-boss" onClick={launchBossFlow}>보스 흐름 처음부터</button>
                {BOSS_SECTIONS.map((section) => (
                  <button type="button" className="is-boss" key={`chapter3-boss-${section.ordinal}`} onClick={() => launchStorySection(section.ordinal)}>
                    {section.title}
                  </button>
                ))}
              </div>

              <p className="chapter2-story-test-help">
                F6은 현재 구간을 스킵하고, F8은 다음 큰 구간으로 이동합니다. 장면과 웨이브 선택 방식은 챕터 2와 동일합니다.
              </p>
            </aside>
          )}
        </div>
      )}

      {waveActive && (
        <div className="chapter3WaveStage" aria-label="챕터 3 일반 몬스터 웨이브">
          <iframe
            key={`chapter3-wave-${waveRunKey}-${waveStartIndex}-${waveSingle ? "single" : "flow"}`}
            ref={waveFrameRef}
            className="chapter3WaveFrame"
            src={waveSrc}
            title="CHAPTER 3 일반 오염 몬스터 정화 전투"
            tabIndex={0}
            onLoad={() => {
              window.requestAnimationFrame(() => {
                waveFrameRef.current?.focus({ preventScroll: true });
                waveFrameRef.current?.contentWindow?.focus();
              });
            }}
          />
          {!waveReady && !waveFailed && <div className="chapter3WaveLoading">CHAPTER 3 COMBAT LOADING</div>}
        </div>
      )}

      {waveActive && !waveFailed && (
        <div className="chapter3WaveHostHud" aria-hidden="true">
          <div className="chapter3WaveHudTopRight">
            <div className="chapter3WaveHudHp">
              {[...Array(waveHud.maxHp)].map((_, i) => (
                <Shield key={i} size={18} className={i < waveHud.hp ? "text-rose-500 fill-rose-500" : "text-slate-800 fill-transparent"} />
              ))}
            </div>
            <span className="chapter3WavePowerBadge">POWER LV {waveHud.powerLevel}</span>
          </div>
          <div className="chapter3WaveHudBottomRight" aria-label={`폭탄 ${waveHud.bombs} / 3`}>
            {[...Array(3)].map((_, i) => (
              <span key={i} className={`combat-hud-bomb-icon${i < waveHud.bombs ? " is-active" : ""}`} />
            ))}
          </div>
        </div>
      )}

      {waveActive && waveFailed && (
        <div className="chapter1-combat-death-overlay chapter3WaveDeathOverlay" role="presentation">
          {waveRetryPromptVisible && (
            <div className="chapterGamePauseOverlay chapterCombatRetryOverlay chapter3WaveRetryOverlay">
              <section className="chapterGamePauseDialog chapter3WaveRetryDialog" role="dialog" aria-modal="true" aria-label="챕터 3 전투 재도전 확인">
                <small>WAVE {String((failedWaveIndex ?? waveStartIndex) + 1).padStart(2, "0")}</small>
                <h2>다시 도전하시겠습니까?</h2>
                <p>현재 웨이브의 처음부터 다시 시작합니다.</p>
                {(waveDeathCounts[failedWaveIndex ?? waveStartIndex] ?? 0) >= 3 && <p className="chapter3WaveRetryBoost">반복 실패 보정 · 화력 레벨 5로 재시작</p>}
                <div className="chapterGamePauseActions chapter3WaveRetryActions isConfirm">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      if (waveOrigin === "selector") {
                        returnToSelector();
                      } else {
                        if (!storyIsTestJump) saveStoryCheckpoint(chapter3WaveCheckpoint(failedWaveIndex ?? waveHud.waveIndex));
                        onExit?.();
                      }
                    }}
                  >
                    아니오
                  </button>
                  <button type="button" className="primary" onClick={retryWave}>예</button>
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {screen === "story" && !ready && <div className="chapter3StoryLoading" aria-live="polite">CHAPTER 3 STORY LOADING</div>}

      {exitConfirmMode && (
        <div className="chapterGamePauseOverlay chapterStoryPauseOverlay" role="presentation">
          <section className="chapterGamePauseDialog chapterStoryPauseDialog" role="dialog" aria-modal="true" aria-label="스토리 중단 확인">
            <small>STORY PAUSED</small>
            <h2>스토리를 중단하시겠습니까?</h2>
            <p>진행 기록은 자동 저장됩니다.</p>
            <div className="chapterGamePauseActions isConfirm">
              <button type="button" className="secondary" onClick={closeExitConfirm}>계속하기</button>
              <button type="button" className="danger" onClick={leaveChapter3FromExitConfirm}>메인화면</button>
            </div>
          </section>
        </div>
      )}

    </section>
  );
}
