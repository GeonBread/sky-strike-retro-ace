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
    totalWaves?: number;
  };
};

type Chapter3Screen = "selector" | "story" | "wave";
type Chapter3SelectorTab = "story" | "wave" | "pattern" | "boss";
type WaveOrigin = "story" | "selector";
type StoryLaunch =
  | { kind: "full" }
  | { kind: "section"; ordinal: number }
  | { kind: "continue-from-section"; ordinal: number };

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
]);

const STORY_SECTIONS: StorySectionMeta[] = [
  { ordinal: 0, title: "장면 1. 마지막 학기의 시작", scene: "마지막 학기 도입" },
  { ordinal: 1, title: "장면 2. 할 게 왜 이렇게 많냐", scene: "호반우 자취방" },
  { ordinal: 2, title: "장면 3. 9월과 10월", scene: "채용·자소서·자격증" },
  { ordinal: 3, title: "장면 4. 다시 만난 4조", scene: "캠퍼스 재회" },
  { ordinal: 4, title: "장면 6. 이상한 지원 기록", scene: "채용 지원 기록 오류" },
  { ordinal: 5, title: "장면 7. 졸업자가진단", scene: "졸업요건 확인" },
  { ordinal: 6, title: "장면 9. 나만 그런 게 아니다", scene: "학교 시스템 이상" },
  { ordinal: 7, title: "장면 10. 오염 흔적", scene: "밤의 캠퍼스" },
  { ordinal: 8, title: "장면 11. 첫 오염 개체", scene: "몬스터 생성" },
  { ordinal: 9, title: "장면 12. 학생증 재활성화와 마지막 두 별", scene: "전투 준비" },
  { ordinal: 10, title: "장면 15. 일반 몬스터 웨이브", scene: "일반 전투 전체" },
  { ordinal: 11, title: "장면 16. 정화율 100%", scene: "일반 전투 종료" },
  { ordinal: 12, title: "장면 17. 핵심 오염원 추적", scene: "보스 추적" },
  { ordinal: 13, title: "장면 20. 최종 공간", scene: "첨성대 코어·졸업 영역" },
  { ordinal: 14, title: "장면 21. 디그리온과 불안", scene: "디그리온 대면" },
  { ordinal: 15, title: "장면 22. 졸업 이후", scene: "디그리온 대화" },
  { ordinal: 16, title: "장면 23. 호반우의 대답", scene: "최종전 직전" },
  { ordinal: 17, title: "장면 29. 마지막 두 별 봉인 약화", scene: "보스 후반부" },
  { ordinal: 18, title: "장면 30. 긍지의 별", scene: "별 해방" },
  { ordinal: 19, title: "장면 31. 졸업의 별", scene: "별 해방" },
  { ordinal: 20, title: "장면 32. 디그리온 본체 파괴", scene: "보스 본체 붕괴" },
  { ordinal: 21, title: "장면 33. 여섯 별 연결", scene: "최종 정화 준비" },
  { ordinal: 22, title: "장면 34. 정화 에너지 형성", scene: "최종 정화" },
  { ordinal: 23, title: "장면 35. 발사", scene: "최종 정화" },
  { ordinal: 24, title: "장면 36. 충돌", scene: "디그리온 정신 충돌" },
  { ordinal: 25, title: "장면 37. 최종 정화 후", scene: "정화 직후" },
  { ordinal: 26, title: "장면 38. 첨성대 코어 정상화", scene: "코어 정상화" },
  { ordinal: 27, title: "장면 41. 졸업식 날", scene: "졸업식" },
  { ordinal: 28, title: "장면 42. 학위수여식", scene: "학위수여식장" },
  { ordinal: 29, title: "장면 43. 졸업식이 끝난 뒤", scene: "엔딩" },
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
  { index: 9, title: "WAVE 10 · 안전 통로 돌파", desc: "매우 좁은 수평 전투영역에서 Y 이동이 잠긴다. 화면 위에 학점 압박 드릴을 빽빽하게 한 줄로 채우되 단 한 자리만 비워 두고 수직 돌진하므로, 빈 자리로 정확히 이동해야 피할 수 있다", pattern: "survivalSafeGapRush" },
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

const BOSS_SECTIONS = STORY_SECTIONS.filter((section) => section.ordinal >= 13 && section.ordinal <= 26);

export function Chapter3StoryExperience({ onExit, onComplete }: Chapter3StoryExperienceProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const waveFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [fullscreenEffect, setFullscreenEffect] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Chapter3Screen>("selector");
  const [selectorTab, setSelectorTab] = useState<Chapter3SelectorTab>("story");
  const [storyLaunch, setStoryLaunch] = useState<StoryLaunch>({ kind: "full" });
  const [storyLaunchSerial, setStoryLaunchSerial] = useState(0);
  const [waveActive, setWaveActive] = useState(false);
  const [waveReady, setWaveReady] = useState(false);
  const [waveFailed, setWaveFailed] = useState(false);
  const [waveRunKey, setWaveRunKey] = useState(0);
  const [waveStartIndex, setWaveStartIndex] = useState(0);
  const [waveSingle, setWaveSingle] = useState(false);
  const [failedWaveIndex, setFailedWaveIndex] = useState<number | null>(null);
  const [waveDeathCounts, setWaveDeathCounts] = useState<Record<number, number>>({});
  const [waveOrigin, setWaveOrigin] = useState<WaveOrigin>("story");

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

  const returnToSelector = () => {
    setFullscreenEffect(null);
    setWaveActive(false);
    setWaveFailed(false);
    setWaveReady(false);
    setFailedWaveIndex(null);
    setScreen("selector");
  };

  const prepareStoryLaunch = (launch: StoryLaunch) => {
    setFullscreenEffect(null);
    setWaveActive(false);
    setWaveFailed(false);
    setWaveReady(false);
    setFailedWaveIndex(null);
    setReady(false);
    setStoryLaunch(launch);
    setScreen("story");
    setStoryLaunchSerial((serial) => serial + 1);
  };

  const launchFullStory = () => prepareStoryLaunch({ kind: "full" });
  const launchStorySection = (ordinal: number) => prepareStoryLaunch({ kind: "section", ordinal });
  const launchBossFlow = () => prepareStoryLaunch({ kind: "continue-from-section", ordinal: 13 });

  const launchWave = (index: number, single: boolean, origin: WaveOrigin = "selector") => {
    setFullscreenEffect(null);
    setWaveOrigin(origin);
    setWaveFailed(false);
    setWaveReady(false);
    setWaveStartIndex(index);
    setWaveSingle(single);
    setFailedWaveIndex(null);
    setWaveRunKey((key) => key + 1);
    setWaveActive(true);
    setScreen("wave");
  };

  useEffect(() => {
    if (!ready || screen !== "story") return;
    if (storyLaunch.kind === "full") {
      postStoryCommand("start-full-story");
      return;
    }
    if (storyLaunch.kind === "section") {
      postStoryCommand("play-section", { ordinal: storyLaunch.ordinal });
      return;
    }
    postStoryCommand("start-section-ordinal", { ordinal: storyLaunch.ordinal });
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

        if (message.type === "effect-start") {
          const effectId = message.detail?.effectId || "";
          if (effectId === "battle-running") {
            setFullscreenEffect(null);
            launchWave(0, false, "story");
            return;
          }
          if (FULLSCREEN_EFFECTS.has(effectId)) setFullscreenEffect(effectId);
          return;
        }

        if (message.type === "effect-end") {
          const effectId = message.detail?.effectId || "";
          setFullscreenEffect((current) => (current === effectId ? null : current));
          return;
        }

        if (message.type === "section-complete") {
          returnToSelector();
          return;
        }

        if (message.type === "story-complete") {
          setFullscreenEffect(null);
          setWaveActive(false);
          if (storyLaunch.kind === "full") onComplete?.();
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
            setScreen("story");
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
  }, [onComplete, onExit, storyLaunch, waveOrigin, waveStartIndex]);

  const retryWave = () => {
    if (failedWaveIndex !== null) setWaveStartIndex(failedWaveIndex);
    setFailedWaveIndex(null);
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
          <span>{section.scene} · 이 장면만 재생 후 선택 화면으로 복귀</span>
        </button>
      ))}
    </>
  );

  const renderWaveCards = () => WAVES.map((wave) => (
    <button key={wave.index} type="button" className="chapter3SelectCard" onClick={() => launchWave(wave.index, true)}>
      <b>{wave.title.split(" · ")[0]}</b>
      <strong>{wave.title.split(" · ").slice(1).join(" · ")}</strong>
      <span>{wave.desc}</span>
    </button>
  ));

  const renderPatternCards = () => WAVES.map((wave) => (
    <button key={wave.pattern} type="button" className="chapter3SelectCard is-pattern" onClick={() => launchWave(wave.index, true)}>
      <b>PATTERN · {wave.pattern}</b>
      <strong>{wave.title}</strong>
      <span>이 패턴이 적용된 웨이브만 바로 실행합니다.</span>
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
          <span>{section.scene} · 선택한 구간만 재생</span>
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
      className={`chapter3StoryExperience${fullscreenEffect ? " is-fullscreen-effect" : ""}${waveActive ? " is-wave-active" : ""}${screen === "selector" ? " is-selector-open" : ""}`}
      data-chapter3-effect={fullscreenEffect || undefined}
      aria-label="챕터 3"
    >
      <iframe
        key={`chapter3-story-${storyLaunchSerial}`}
        ref={frameRef}
        className="chapter3StoryFrame"
        src={frameSrc}
        title="CHAPTER 3 — 졸업요건 최종전"
        allow="autoplay; fullscreen"
        aria-hidden={screen === "selector" || screen === "wave"}
      />

      {screen === "selector" && (
        <div className="chapter3DetailSelector" role="dialog" aria-modal="true" aria-label="챕터 3 테스트 구간 선택">
          <div className="chapter3DetailSelectorBackdrop" aria-hidden="true" />
          <section className="chapter3DetailSelectorPanel">
            <header className="chapter3DetailSelectorHeader">
              <div><small>CHAPTER 3 · DIRECTION SELECT</small><h2>테스트할 구간을 선택하십시오</h2></div>
              <p>챕터 2와 같은 방식으로 종류를 먼저 고른 뒤 실제 장면·웨이브·패턴을 직접 선택합니다.</p>
            </header>

            <nav className="chapter3DetailTabs" aria-label="챕터 3 구간 종류">
              <button type="button" className={selectorTab === "story" ? "active" : ""} onClick={() => setSelectorTab("story")}>스토리 <span>{STORY_SECTIONS.length}</span></button>
              <button type="button" className={selectorTab === "wave" ? "active" : ""} onClick={() => setSelectorTab("wave")}>일반 웨이브 <span>{WAVES.length}</span></button>
              <button type="button" className={selectorTab === "pattern" ? "active" : ""} onClick={() => setSelectorTab("pattern")}>웨이브 패턴 <span>{WAVES.length}</span></button>
              <button type="button" className={selectorTab === "boss" ? "active" : ""} onClick={() => setSelectorTab("boss")}>보스 구간 <span>{BOSS_SECTIONS.length}</span></button>
            </nav>

            <div className="chapter3DetailGrid" data-tab={selectorTab}>
              {selectorTab === "story" && renderStoryCards()}
              {selectorTab === "wave" && renderWaveCards()}
              {selectorTab === "pattern" && renderPatternCards()}
              {selectorTab === "boss" && renderBossCards()}
            </div>

            <footer className="chapter3DetailSelectorFooter">
              <span>선택한 STORY/WAVE/PATTERN은 해당 지점에서 정확히 시작하며, 단일 테스트는 종료 후 이 화면으로 돌아옵니다.</span>
              {onExit && <button type="button" onClick={onExit}>메인으로</button>}
            </footer>
          </section>
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
          />
          {!waveReady && !waveFailed && <div className="chapter3WaveLoading">CHAPTER 3 COMBAT LOADING</div>}
        </div>
      )}

      {waveActive && waveFailed && (
        <div className="chapter3WaveRetryOverlay" role="presentation">
          <section className="chapter3WaveRetryDialog" role="dialog" aria-modal="true" aria-label="챕터 3 전투 재도전 확인">
            <small>WAVE {(failedWaveIndex ?? waveStartIndex) + 1}</small>
            <h2>다시 도전하시겠습니까?</h2>
            <p>현재 웨이브의 처음부터 다시 시작합니다.</p>
            {(waveDeathCounts[failedWaveIndex ?? waveStartIndex] ?? 0) >= 3 && <p className="chapter3WaveRetryBoost">반복 실패 보정 · 화력 레벨 5로 재시작</p>}
            <div className="chapter3WaveRetryActions">
              <button type="button" className="secondary" onClick={waveOrigin === "selector" ? returnToSelector : onExit}>아니오</button>
              <button type="button" className="primary" onClick={retryWave}>예</button>
            </div>
          </section>
        </div>
      )}

      {screen === "story" && !ready && <div className="chapter3StoryLoading" aria-live="polite">CHAPTER 3 STORY LOADING</div>}

      {screen !== "selector" && !fullscreenEffect && !waveFailed && (
        <button className="chapter3StoryRouteSelect" type="button" onClick={returnToSelector} aria-label="챕터 3 구간 선택으로 돌아가기">구간 선택</button>
      )}
    </section>
  );
}
