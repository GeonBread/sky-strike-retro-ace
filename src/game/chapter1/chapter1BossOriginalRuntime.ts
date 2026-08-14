// @ts-nocheck
/**
 * 원본 챕터 1 보스 시뮬레이터의 전투 코드를 그대로 감싼 런타임입니다.
 * 패턴의 수치, 발사식, 상태 전환, 특수 패턴 판정과 렌더링은 원본 코드를 유지합니다.
 * 현재 프로젝트와 연결하기 위해 플레이어 좌표·피격·플레이어 렌더링만 어댑터로 치환합니다.
 */

export interface Chapter1BossOriginalAdapter {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  getPlayer(): { x: number; y: number; radius: number; invulnerable: boolean };
  hitPlayer(): void;
  fatalHit?(): void;
  clearSupportEnemies?(): void;
  drawPlayer?(ctx: CanvasRenderingContext2D, player: any): void;
  drawPlayerBullets?(ctx: CanvasRenderingContext2D): void;
  onComplete?(): void;
}

export interface Chapter1BossOriginalRuntime {
  readonly state: any;
  readonly patterns: readonly any[];
  start(options?: { skipIntro?: boolean; patternId?: number; story?: boolean }): void;
  update(dt: number): void;
  render(): void;
  applyDamage(amount: number): void;
  clearEnemyProjectiles(): void;
  clearEnemyProjectilesWithinRadius(x: number, y: number, radius: number): void;
  inputDigit(digit: number): boolean;
  pointerDown(x: number, y: number): boolean;
  getMovementBounds(): { minX: number; maxX: number; minY: number; maxY: number };
  getBossHitArea(): { x: number; y: number; rx: number; ry: number };
  setPattern(patternId: number): boolean;
  isPlayerAttackAllowed(): boolean;
  skipToNextPhase(): boolean;
}

export function createChapter1BossOriginalRuntime(adapter: Chapter1BossOriginalAdapter): Chapter1BossOriginalRuntime {
  const canvas = adapter.canvas;
  const ctx = adapter.ctx;
  const hud = { textContent: "" };
  const progressBar = { style: { width: "0%" } };
  const W = canvas.width;
  const H = canvas.height;
  const TAU = Math.PI * 2;

const bossPhase1Image = new Image();
const bossPhase2Image = new Image();
const bossPurifiedImage = new Image();
bossPhase1Image.src = "/assets/chapter1/boss/body/gatekeeper_phase1.webp";
bossPhase2Image.src = "/assets/chapter1/boss/body/gatekeeper_phase2.webp";
bossPurifiedImage.src = "/assets/chapter1/boss/body/gatekeeper_purified.webp";


const bossBgStage1Image = new Image();
const bossBgStage2Image = new Image();
const bossBgStage3Image = new Image();
bossBgStage1Image.src = "/assets/chapter1/boss/backgrounds/boss_stage1.png";
bossBgStage2Image.src = "/assets/chapter1/boss/backgrounds/boss_stage2.png";
bossBgStage3Image.src = "/assets/chapter1/boss/backgrounds/boss_stage3.png";

function drawFallbackBattleBackground(purify = 0) {
  const top = `rgb(${Math.round(17 - purify * 5)}, ${Math.round(18 + purify * 18)}, ${Math.round(27 + purify * 18)})`;
  const bottom = `rgb(${Math.round(4 + purify * 6)}, ${Math.round(6 + purify * 10)}, ${Math.round(10 + purify * 12)})`;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function getBossBackgroundProfile() {
  const cinematicDestroy = state.cinematicMode === "destroy";
  const stageState = state.bossStageState;
  if (cinematicDestroy || stageState === "defeated") {
    return { baseSpeed: 94, overlay2Speed: 142, overlay3Speed: 188, overlay2Alpha: .26, overlay3Alpha: .40, redTint: .08, cyanTint: 0 };
  }
  if (stageState === "awakening") {
    return { baseSpeed: 112, overlay2Speed: 172, overlay3Speed: 218, overlay2Alpha: .36, overlay3Alpha: .34, redTint: .18, cyanTint: 0 };
  }
  if (stageState === "stage2") {
    return { baseSpeed: 122, overlay2Speed: 184, overlay3Speed: 236, overlay2Alpha: .42, overlay3Alpha: .40, redTint: .20, cyanTint: 0 };
  }
  return { baseSpeed: 86, overlay2Speed: 128, overlay3Speed: 172, overlay2Alpha: .22, overlay3Alpha: .18, redTint: .12, cyanTint: 0 };
}

function drawRepeatingVerticalMap(image, scrollAmount, alpha = 1, drawWidth = 900, xJitter = 0) {
  if (!image.complete || !image.naturalWidth) return false;
  const drawW = drawWidth;
  const drawH = drawW * (image.naturalHeight / image.naturalWidth);
  const x = (W - drawW) / 2 + xJitter;
  const offset = ((scrollAmount % drawH) + drawH) % drawH;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let y = offset - drawH; y < H; y += drawH - 1) {
    ctx.drawImage(image, x, y, drawW, drawH);
  }
  ctx.restore();
  return true;
}

function drawBossBattleBackground(type = "battle", cinematicTime = 0) {
  const purify = 0;
  const profile = getBossBackgroundProfile();
  const time = state.t;
  const baseTime = type === "cinematic" ? time * .92 + cinematicTime * .4 : time;

  ctx.fillStyle = "#040507";
  ctx.fillRect(0, 0, W, H);

  const drewBase = drawRepeatingVerticalMap(bossBgStage1Image, baseTime * profile.baseSpeed, 1, 900, Math.sin(time * .22) * 4);
  if (!drewBase) drawFallbackBattleBackground(purify);

  drawRepeatingVerticalMap(bossBgStage2Image, baseTime * profile.overlay2Speed, profile.overlay2Alpha, 910, Math.sin(time * .37) * 8);
  drawRepeatingVerticalMap(bossBgStage3Image, baseTime * profile.overlay3Speed, profile.overlay3Alpha, 920, Math.sin(time * .48 + .8) * 12);

  const vignette = ctx.createRadialGradient(W * .5, H * .5, H * .18, W * .5, H * .5, H * .82);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(.68, "rgba(0,0,0,.10)");
  vignette.addColorStop(1, "rgba(0,0,0,.46)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  if (profile.redTint > 0) {
    const redPulse = .65 + Math.sin(time * 2.2) * .08;
    const redGrad = ctx.createLinearGradient(0, 0, 0, H);
    redGrad.addColorStop(0, `rgba(255, 54, 73, ${profile.redTint * .55 * redPulse})`);
    redGrad.addColorStop(.45, `rgba(255, 31, 48, ${profile.redTint * .20 * redPulse})`);
    redGrad.addColorStop(1, `rgba(10, 0, 0, ${profile.redTint * 1.25})`);
    ctx.fillStyle = redGrad;
    ctx.fillRect(0, 0, W, H);
  }

  if (purify > 0) {
    const cyanGrad = ctx.createLinearGradient(0, 0, 0, H);
    cyanGrad.addColorStop(0, `rgba(110, 255, 228, ${.06 + purify * .16})`);
    cyanGrad.addColorStop(.55, `rgba(86, 232, 255, ${purify * .09})`);
    cyanGrad.addColorStop(1, `rgba(13, 24, 34, ${purify * .24})`);
    ctx.fillStyle = cyanGrad;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.strokeStyle = `rgba(255, 87, 107, ${type === "cinematic" ? .08 : .06})`;
  ctx.lineWidth = 1;
  const scanOffset = ((baseTime * 78) % 58 + 58) % 58;
  for (let y = scanOffset - 58; y < H; y += 58) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function getActiveBossImage() {
  if (state.bossStageState === "awakening" || state.bossStageState === "stage2" || state.bossStageState === "defeated") {
    return bossPhase2Image;
  }
  return bossPhase1Image;
}


const PATTERNS = [
  { id: 17, title: "광자 나선 스윕", desc: "약 0.26초 주기의 3갈래 회전 별탄 + 추적·고정 프리즘 레이저", duration: 8.4 },
  { id: 7, title: "서비스 접속 대기열", desc: "느린 대기열이 일정 간격으로 계속 이어지고, 접속 지연과 접속 임박 구간을 통과하는 10초 이내 패턴", duration: 9.8 },
  { id: 5, title: "웨이브 곡선 스트림", desc: "약 0.85초 주기로 발사되는 좌우 흔들림 7발 부채꼴 웨이브", duration: 8.0 },
  { id: 8, title: "지연 추적 클러스터", desc: "저속 확산 후 재가속하는 오염탄 군집", duration: 8.0 },
  { id: 19, title: "최종 강습 타임시프트", desc: "큰 별탄이 감속·정지한 뒤 조준선을 표시하고 다시 돌진하는 패턴", duration: 9.0 },
  { id: 16, title: "4연 별탄 도탄", desc: "별탄만 4개씩 발사하며 바깥쪽 2개는 벽에서 한 번 반사", duration: 8.0 },
  { id: 53, title: "오염 데이터 롤백", desc: "느린 오염탄 부채꼴을 3열 발사한 뒤 감속·정지시키고 지나온 경로로 새로고침 역행", duration: 9.4 },
  { id: 54, title: "수강신청 클릭탄", desc: "커서 5개가 순차 클릭하여 원형 파동 공격", duration: 10.5 },
  { id: 55, title: "출석 쟁탈전", desc: "출석 존으로 이동해 지각·결석 존의 둥근 사각 폭발을 피하는 패턴 · 총 3라운드", duration: 13.1 },
  { id: 59, title: "4자리 인증코드", desc: "인증코드를 확인해 입력하며, 입력을 멈추면 보스가 지속적으로 조준탄을 발사", duration: 11.5 },
  { id: 61, title: "공지 전광판 폭주", desc: "희미한 3줄 전광판에서 위험 키워드만 강조되며 모든 공격탄은 플레이어 방향으로 발사", duration: 9.2 },
  { id: 62, title: "강의실 좌표 복구", desc: "목표 강의실 안내를 확인하고 올바른 안내 통로로 이동", duration: 11.4 },
  { id: 63, title: "안내 방송 혼선", desc: "넓어진 방송 간격으로 좌우·상단 스피커가 곡선 음파벽과 시간차 교차 방송을 생성", duration: 12.4 },
  { id: 64, title: "학생증 NFC 동기화", desc: "회전하는 민트색 인증 구간에 맞춰 확장되는 NFC 링을 통과", duration: 14.6 },
  { id: 65, title: "읽지 않은 알림 누적", desc: "사방에서 온 공지 5개가 플레이어를 추적하다가 모두 누적으로 바뀐 뒤 순차 폭발", duration: 9.4 },
  { id: 66, title: "학사 데이터 강제 동기화", desc: "과거 위치에서 생성된 데이터 노드 3개가 회전 삼각형을 만들고 수축한 뒤 사방으로 돌진", duration: 9.4 },
];


const STAGE1_PATTERN_IDS = [17, 5, 8, 16, 19, 53];
const STAGE2_PATTERN_IDS = [7, 54, 55, 59, 61, 62, 63, 64, 65, 66];
const STAGE1_MAX_HP = 1200;
const STAGE2_MAX_HP = 1800;
const TOTAL_BOSS_HP = STAGE1_MAX_HP + STAGE2_MAX_HP;
const INTRO_DURATION = 5.8;
const BOSS_DESTRUCTION_DURATION = 7.8;
const BOSS_HP_CHARGE_DURATION = 3.0;
const BOSS_PATTERN_START_DELAY = 2.0;
const STAGE2_PATTERN_START_DELAY = 0.65;
const PHASE1_CLEAR_DURATION = 1.45;
const PLAYER_FIRE_INTERVAL = 0.16;
const PLAYER_BULLET_SPEED = 690;
const PLAYER_BULLET_DAMAGE = 3.0;
const SELF_COMPLETING_PATTERN_IDS = new Set([54, 55, 61, 63, 64]);


function getPatternStage(id) {
  return STAGE1_PATTERN_IDS.includes(id) ? 1 : 2;
}
function getPatternIndexById(id) {
  return PATTERNS.findIndex(pattern => pattern.id === id);
}
function getStagePatternIds(stage) {
  return stage === 1 ? STAGE1_PATTERN_IDS : STAGE2_PATTERN_IDS;
}
function getRandomPatternId(stage, excludedId = null) {
  const ids = getStagePatternIds(stage);
  const candidates = ids.filter(id => id !== excludedId);
  const pool = candidates.length ? candidates : ids;
  return pool[Math.floor(Math.random() * pool.length)];
}
function getStageDuration(stage) {
  return getStagePatternIds(stage).reduce((sum, id) => {
    const pattern = PATTERNS.find(item => item.id === id);
    return sum + (pattern ? pattern.duration : 0);
  }, 0);
}

const COMMON = {
  corruptionOrbPurple: { kind:"orb", fill:"#8d2ce6", ring:"#f1c8ff", core:"#3f0d6e", highlight:"#ffffff", glow:"#a755ff", radius:11 },
  corruptionOrbRed: { kind:"orb", fill:"#e43948", ring:"#ffd1b0", core:"#61101b", highlight:"#fff6eb", glow:"#ff4e5d", radius:14 },
  corruptionOrbCyan: { kind:"orb", fill:"#1dbbc6", ring:"#d8fbff", core:"#0c4963", highlight:"#ffffff", glow:"#36e7f3", radius:10 },
  corruptionOrbLime: { kind:"orb", fill:"#9ac925", ring:"#fff6b4", core:"#3b6510", highlight:"#fffef2", glow:"#c9f044", radius:13 },
  corruptionOrbOrange: { kind:"orb", fill:"#f2a426", ring:"#fff0d1", core:"#8b3d0d", highlight:"#fffdfa", glow:"#ffb845", radius:15 },
  corruptionOrbBlue: { kind:"orb", fill:"#3051cc", ring:"#dce5ff", core:"#151d5c", highlight:"#ffffff", glow:"#5b78ff", radius:12 },
  starGold: { kind:"star", outer:"#ffd142", inner:"#fff6d5", outline:"#5e3306", glow:"#ffd142", radius:16, points:5, innerRatio:.5 },
  starRed: { kind:"star", outer:"#ff5f6d", inner:"#fff1c4", outline:"#4f0d16", glow:"#ff5f6d", radius:18, points:5, innerRatio:.48 },
  starCyan: { kind:"star", outer:"#4fd5ff", inner:"#ebfeff", outline:"#0d3c55", glow:"#4fd5ff", radius:15, points:6, innerRatio:.45 },
  starPurple: { kind:"star", outer:"#bf6cff", inner:"#fde7ff", outline:"#3d155c", glow:"#bf6cff", radius:17, points:5, innerRatio:.42 },
  starGreen: { kind:"star", outer:"#74d84d", inner:"#f6ffdc", outline:"#285d15", glow:"#74d84d", radius:16, points:5, innerRatio:.52 },
  starBlue: { kind:"star", outer:"#4b82ff", inner:"#ffffff", outline:"#162f74", glow:"#4b82ff", radius:19, points:6, innerRatio:.4 },
};
const ORBS = ["corruptionOrbPurple","corruptionOrbRed","corruptionOrbCyan","corruptionOrbLime","corruptionOrbOrange","corruptionOrbBlue"];
const STARS = ["starGold","starRed","starCyan","starPurple","starGreen","starBlue"];

const state = {
  t: 0,
  last: performance.now(),
  paused: false,
  auto: true,
  story: false,
  showHitbox: false,
  timeScale: 1,
  patternIndex: 0,
  patternElapsed: 0,
  bossStage: 1,
  bossStageState: "stage1",
  stage1Hp: STAGE1_MAX_HP,
  stage2Hp: 0,
  stage2LatentHp: STAGE2_MAX_HP,
  awakeningElapsed: 0,
  awakeningDuration: 3.45,
  awakeningPulse: 0,
  autoDamage: false,
  phaseClearElapsed: 0,
  phaseClearDuration: PHASE1_CLEAR_DURATION,
  battleDefeatedAt: -1,
  cinematicMode: "intro",
  cinematicTime: 0,
  battleStartState: "intro",
  battleStartElapsed: 0,
  cinematicDeathSeeded: false,
  cinematicParticles: [],
  cinematicRings: [],
  purifyStartX: W / 2,
  purifyStartY: 175,
  destructionBossX: W / 2,
  destructionBossY: 175,
  destructionLastBurst: -1,
  destructionClearShown: false,
  bullets: [],
  playerBullets: [],
  playerFireCooldown: 0,
  waves: [],
  particles: [],
  cursors: [],
  activeCursor: null,
  nextCursorAt: 0,
  cursorRespawnAt: 0,
  lastTarget: null,
  hitFlash: 0,
  screenShakeTime: 0,
  screenShakeDuration: 0,
  screenShakePower: 0,
  storySerial: 0,
  boss: { x: W/2, y: 175, vx: 150, moveVx: 0, moveVy: 0, drawW: 390, drawH: 294 },
  player: { x: W/2, y: H - 95, r: 15, speed: 390, invuln: 0 },
  keys: {},
  mouse: { x: W/2, y: H - 95, down: false },
  pattern: {},
  playerHistory: [],
  stars: Array.from({length: 105}, () => ({ x: Math.random()*W, y: Math.random()*H, s: .7+Math.random()*2.2, a: .12+Math.random()*.48, v: 10+Math.random()*32 })),
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b-a)*t; }
function rand(a, b) { return a + Math.random()*(b-a); }
function easeOutCubic(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
function easeInCubic(t) { t = clamp(t, 0, 1); return t * t * t; }
function easeInOutCubic(t) { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function smoothstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

function angleDelta(a, b) {
  let d = (a - b + Math.PI) % TAU;
  if (d < 0) d += TAU;
  return d - Math.PI;
}
function currentPattern() { return PATTERNS[state.patternIndex]; }
function bossMuzzle() { return { x: state.boss.x, y: state.boss.y + state.boss.drawH*.36 }; }
function wingMuzzle(side) { return { x: state.boss.x + side*state.boss.drawW*.35, y: state.boss.y + state.boss.drawH*.22 }; }

function buildButtons() {}

function refreshButtons() {}


function clearPatternObjects(options = {}) {
  const preserveProjectiles = options.preserveProjectiles === true;
  if (!preserveProjectiles) {
    state.bullets.length = 0;
    state.playerBullets.length = 0;
    state.waves.length = 0;
  }
  state.playerFireCooldown = 0;
  state.particles.length = 0;
  state.cursors.length = 0;
  state.activeCursor = null;
  state.lastTarget = null;
}
function resetPattern(options = {}) {
  clearPatternObjects(options);
  state.patternElapsed = 0;
  state.storySerial = 0;
  // 패턴을 바꿀 때는 기본적으로 현재 좌표와 이동 흐름을 유지합니다.
  const keepBossPosition = options.keepBossPosition !== false;
  if (!keepBossPosition) {
    state.boss.x = W / 2;
    state.boss.y = 175;
  }
  // 페이즈 전환 직후에는 현재 좌표를 유지하되, 다음 패턴에서 자연스럽게 움직일 수 있도록 속도만 복구합니다.
  if (!Number.isFinite(state.boss.vx) || Math.abs(state.boss.vx) < 1) {
    state.boss.vx = Math.random() < .5 ? -150 : 150;
  }
  state.playerHistory.length = 0;
  state.pattern = {
    // 패턴마다 서로 다른 이동 궤도를 사용하되, 패턴 전환 시 현재 위치와 속도는 그대로 이어집니다.
    bossMovePhase: Math.random() * TAU,
    bossMoveStartX: state.boss.x,
    bossMoveStartY: state.boss.y,
    bossMoveBlend: 0,
    lastShot: 0,
    shootTimer: 0,
    rapidFireCount: 0,
    laserAngle: Math.PI/2,
    nextFanAt: .55,
    fanQueue: [],
    rollbackCycleId: 0,
    rollbackShotCount: 0,
    rollbackNextShotAt: 0,
    rollbackTriggerAt: 0,
    rollbackStageStart: 0,
    rollbackState: "idle",
    rollbackIconSpin: 0,
    rollbackCompleted: false,
    previousCycle: -1,
    seats: [],
    seatBlasts: [],
    seatRoundStart: .45,
    seatRoundIndex: 0,
    seatSequenceFinished: false,
    seatWarnStart: 2.0,
    seatBlastAt: 3.0,
    seatRoundEnd: 4.35,
    refreshCycleStart: .35,
    refreshIconSpin: 0,
    refreshShotCount: 0,
    refreshNextShotAt: .55,
    refreshTriggered: false,
    refreshTriggerAt: 0,
    refreshCycleId: 0,
    refreshRestartAt: 0,
    sessionTraces: [],
    nextSessionTraceAt: 2.15,
    lockNodes: [],
    lockLinks: [],
    lockCycleStart: .35,
    authCode: "",
    authInput: "",
    authMistakes: 0,
    authStatus: "show",
    authSuccessAt: -1,
    authLastInputAt: 0,
    authNextIdleShotAt: 3.25,
    authIdleVolleyCount: 0,
    authInterferenceAt: 2.7,
    authCursor: null,
    authFailedBurst: false,
    authFailureAt: -1,
    queueTokens: [],
    queueCycleStart: .35,
    serviceQueue: null,
    noticeWindows: [],
    noticeBlasts: [],
    noticeCycleStart: .35,
    noticeRound: 0,
    tickerRows: [],
    tickerAttacks: [],
    tickerTriggered: 0,
    tickerFinishing: false,
    tickerCompleted: false,
    tickerFinishAt: 8.4,
    classroomRoute: null,
    classroomCycleStart: .35,
    classroomRound: 0,
    classroomBlasts: [],
    classroomDangerStart: 2.75,
    classroomDangerEnd: 3.20,
    classroomRoundEnd: 3.85,
    deadlineStep: 0,
    deadlineSubmitted: false,
    deadlineSubmitActive: false,
    deadlineFinalBlast: null,
    deadlineBurstDone: false,
    broadcastWaves: [],
    broadcastEvents: [],
    broadcastEventIndex: 0,
    broadcastStatus: "방송 채널 연결 중",
    broadcastPulse: 0,
    broadcastCompleted: false,
    scanGates: [],
    scanSuccess: false,
    scanSuccessAt: 0,
    nfcRings: [],
    nfcSchedule: [],
    nfcSpawnIndex: 0,
    nfcSuccessCount: 0,
    nfcTotal: 0,
    priorityNotice: null,
    priorityCycleStart: .35,
    priorityRound: 0,
    unreadChain: [],
    unreadCycleStart: 0,
    unreadSpawnIndex: 0,
    unreadLocked: false,
    unreadLockAt: 0,
    unreadExplosionIndex: 0,
    unreadNextExplosionAt: 0,
    unreadCycle: 0,
    unreadAimX: W/2,
    unreadAimY: H*.7,
    syncMarkers: [],
    syncDashNodes: [],
    syncCycleStart: .25,
    syncRecordIndex: 0,
    syncStage: "record",
    syncCenterX: W/2,
    syncCenterY: H*.62,
    syncLockX: W/2,
    syncLockY: H*.62,
    syncAngle: -Math.PI/2,
    syncBurstDone: false,
    clickSequenceFinished: false,
  };
  const id = currentPattern().id;
  if (id === 7) initializeServiceQueuePhase();
  if (id === 53) initializeCorruptionRollback();
  if (id === 54) spawnCursors();
  if (id === 55) startSeatRound();
  if (id === 59) initializeAuthCode();
  if (id === 61) initializeAnnouncementOverload();
  if (id === 62) initializeClassroomRoute();
  if (id === 63) initializeBroadcastConfusion();
  if (id === 64) initializeStudentScanGates();
  if (id === 65) initializeUnreadNotifications();
  if (id === 66) initializeAcademicSync();
}
function releasePattern19Stars(speed = 640) {
  for (const bullet of state.bullets) {
    if (!bullet.active || bullet.sourcePattern !== 19 || bullet.type !== "dilation") continue;
    if (bullet.dilationState !== "launched") launchDilation(bullet, speed);
  }
}

function setPattern(index, options = {}) {
  const preserveProjectiles = options.preserveProjectiles !== false;
  // Pattern 19가 끝날 때 감속 중이거나 정지한 별탄까지 전부 재가속하여 화면에 남지 않게 합니다.
  const previousPatternId = currentPattern().id;
  const normalizedIndex = (index + PATTERNS.length) % PATTERNS.length;
  const nextPatternId = PATTERNS[normalizedIndex].id;
  if (preserveProjectiles && previousPatternId === 19 && nextPatternId !== 19) {
    releasePattern19Stars(640);
  }
  // 자동 순환, 다음 패턴, 직접 선택 모두 보스 위치를 순간 이동시키지 않습니다.
  const keepBossPosition = options.keepBossPosition !== false;
  state.patternIndex = normalizedIndex;
  resetPattern({ preserveProjectiles, keepBossPosition });
  refreshButtons();
}

function selectPattern(index) {
  state.cinematicMode = "battle";
  state.cinematicTime = 0;
  state.battleStartState = "active";
  state.battleStartElapsed = 0;
  const targetStage = getPatternStage(PATTERNS[index].id);
  if (targetStage !== state.bossStage || !["stage1", "stage2"].includes(state.bossStageState)) {
    state.bossStage = targetStage;
    state.bossStageState = targetStage === 1 ? "stage1" : "stage2";
    state.stage1Hp = targetStage === 1 ? STAGE1_MAX_HP : 0;
    state.stage2Hp = targetStage === 2 ? STAGE2_MAX_HP : 0;
    state.stage2LatentHp = STAGE2_MAX_HP;
    state.awakeningElapsed = 0;
    state.battleDefeatedAt = -1;
  }
  setPattern(index, { preserveProjectiles: true });
}

function nextPattern() {
  if (!["stage1", "stage2"].includes(state.bossStageState)) return;
  const currentId = currentPattern().id;
  const nextId = getRandomPatternId(state.bossStage, currentId);
  setPattern(getPatternIndexById(nextId), { preserveProjectiles: true });
}

function applyBossDamage(amount) {
  if (amount <= 0 || state.cinematicMode !== "battle" || state.battleStartState !== "active") return;
  if (state.bossStageState === "stage1") {
    state.stage1Hp = Math.max(0, state.stage1Hp - amount);
    if (state.stage1Hp <= 0) beginAwakening();
  } else if (state.bossStageState === "stage2") {
    state.stage2Hp = Math.max(0, state.stage2Hp - amount);
    if (state.stage2Hp <= 0) {
      adapter.clearSupportEnemies?.();
      state.bossStageState = "defeated";
      state.battleDefeatedAt = state.t;
      state.playerBullets.length = 0;
      startBossDestructionCinematic();
    }
  }
}

function updateBossHealth(dt) {
  if (!state.autoDamage) return;
  if (state.bossStageState === "stage1") {
    const rate = STAGE1_MAX_HP / Math.max(.1, getStageDuration(1));
    applyBossDamage(rate * dt);
  } else if (state.bossStageState === "stage2") {
    const rate = STAGE2_MAX_HP / Math.max(.1, getStageDuration(2));
    applyBossDamage(rate * dt);
  }
}

function beginAwakening() {
  if (state.bossStageState !== "stage1") return;
  state.stage1Hp = 0;
  state.phaseClearElapsed = 0;
  state.bossStageState = "phase1clear";
  state.boss.vx = 0;
  state.boss.moveVx = 0;
  state.boss.moveVy = 0;
  state.bullets.length = 0;
  state.playerBullets.length = 0;
  state.waves.length = 0;
  triggerScreenShake(24, .55);
  spawnParticleBurst(state.boss.x, state.boss.y + 18, "#4fd5ff", 24);
  spawnParticleBurst(state.boss.x, state.boss.y + 18, "#ffffff", 18);
  refreshButtons();
}

function updatePhase1Clear(dt) {
  state.phaseClearElapsed += dt;
  state.boss.x = lerp(state.boss.x, W / 2, 1 - Math.exp(-4.8 * dt));
  state.boss.y = lerp(state.boss.y, 175, 1 - Math.exp(-4.8 * dt));
  if (Math.random() < dt * 30) {
    const angle = Math.random() * TAU;
    const radius = rand(50, 155);
    state.particles.push({
      x: state.boss.x + Math.cos(angle) * radius,
      y: state.boss.y + 18 + Math.sin(angle) * radius * .58,
      vx: Math.cos(angle) * rand(40, 130),
      vy: Math.sin(angle) * rand(40, 130),
      age: 0,
      life: rand(.35, .85),
      color: Math.random() < .6 ? "#4fd5ff" : "#fff4c4",
      size: rand(3, 7),
    });
  }
  if (state.phaseClearElapsed >= state.phaseClearDuration) {
    state.bossStageState = "awakening";
    state.awakeningElapsed = 0;
    state.awakeningPulse = 0;
    state.stage2Hp = 0;
    state.boss.vx = 0;
    state.boss.moveVx = 0;
    state.boss.moveVy = 0;
    spawnParticleBurst(state.boss.x, state.boss.y, "#ff5f6d", 34);
    refreshButtons();
  }
}

function updateAwakening(dt) {
  state.awakeningElapsed += dt;
  state.awakeningPulse += dt;
  const progress = clamp(state.awakeningElapsed / state.awakeningDuration, 0, 1);
  const hpChargeProgress = smoothstep(progress);
  // 각성 모션과 동시에 2페이즈 체력이 0%에서 100%까지 충전됩니다.
  state.stage2Hp = STAGE2_MAX_HP * hpChargeProgress;
  state.boss.x = lerp(state.boss.x, W / 2, 1 - Math.exp(-4.5 * dt));
  state.boss.y = lerp(state.boss.y, 185, 1 - Math.exp(-3.8 * dt));
  if (Math.random() < dt * 24) {
    const angle = Math.random() * TAU;
    const radius = rand(80, 210) * (1 - progress * .35);
    state.particles.push({
      x: state.boss.x + Math.cos(angle) * radius,
      y: state.boss.y + Math.sin(angle) * radius * .65,
      vx: -Math.cos(angle) * rand(65, 150),
      vy: -Math.sin(angle) * rand(65, 150),
      age: 0,
      life: rand(.45, .95),
      color: Math.random() < .5 ? "#ff5f6d" : "#4fd5ff",
      size: rand(3, 7),
    });
  }
  if (state.awakeningElapsed >= state.awakeningDuration) {
    state.bossStage = 2;
    state.bossStageState = "stage2";
    state.stage2Hp = STAGE2_MAX_HP;
    // 체력 충전은 각성 중 이미 완료했으므로, 이후에는 정확히 2초간 대기한 뒤 패턴을 시작합니다.
    state.battleStartState = "waiting";
    state.battleStartElapsed = 0;
    const firstStage2PatternId = getRandomPatternId(2);
    setPattern(getPatternIndexById(firstStage2PatternId), {
      preserveProjectiles: false,
      keepBossPosition: true,
    });
    refreshButtons();
  }
}

function skipToNextPhase() {
  if (state.cinematicMode !== "battle") return false;

  // 1페이즈에서는 중간 대기 없이 즉시 2페이즈 각성 연출로 진입합니다.
  if (state.bossStageState === "stage1" || state.bossStageState === "phase1clear") {
    state.stage1Hp = 0;
    state.bossStage = 1;
    state.bossStageState = "awakening";
    state.awakeningElapsed = 0;
    state.awakeningPulse = 0;
    state.stage2Hp = 0;
    state.boss.vx = 0;
    state.boss.moveVx = 0;
    state.boss.moveVy = 0;
    state.bullets.length = 0;
    state.playerBullets.length = 0;
    state.waves.length = 0;
    state.cursors.length = 0;
    state.activeCursor = null;
    triggerScreenShake(24, .55);
    spawnParticleBurst(state.boss.x, state.boss.y + 18, "#ff5f6d", 34);
    refreshButtons();
    return true;
  }

  // 각성 연출 중 다시 누르면 2페이즈 전투를 즉시 시작합니다.
  if (state.bossStageState === "awakening") {
    state.awakeningElapsed = state.awakeningDuration;
    updateAwakening(0);
    return true;
  }

  // 2페이즈에서는 즉시 체력을 0으로 만들어 기존 보스 파괴/클리어 연출을 그대로 실행합니다.
  if (state.bossStageState === "stage2") {
    applyBossDamage(state.stage2Hp + 1);
    return true;
  }

  return false;
}

function resetBattle() {
  state.bossStage = 1;
  state.bossStageState = "stage1";
  state.stage1Hp = 0;
  state.battleStartState = "intro";
  state.battleStartElapsed = 0;
  state.stage2Hp = 0;
  state.stage2LatentHp = STAGE2_MAX_HP;
  state.awakeningElapsed = 0;
  state.battleDefeatedAt = -1;
  state.bullets.length = 0;
  state.waves.length = 0;
  const firstStage1PatternId = getRandomPatternId(1);
  setPattern(getPatternIndexById(firstStage1PatternId), { preserveProjectiles: false });
  refreshButtons();
  startBossIntro();
}

function startBossIntro() {
  state.cinematicMode = "intro";
  state.cinematicTime = 0;
  state.battleStartState = "intro";
  state.battleStartElapsed = 0;
  state.stage1Hp = 0;
  state.cinematicDeathSeeded = false;
  state.cinematicParticles.length = 0;
  state.cinematicRings.length = 0;
  state.bullets.length = 0;
  state.playerBullets.length = 0;
  state.waves.length = 0;
  state.cursors.length = 0;
  state.activeCursor = null;
  state.mouse.down = false;
  state.boss.x = W / 2;
  state.boss.y = 175;
  state.boss.moveVx = 0;
  state.boss.moveVy = 0;
  progressBar.style.width = "0%";
}

function finishBossIntro() {
  state.cinematicMode = "battle";
  state.cinematicTime = 0;
  state.battleStartState = "charging";
  state.battleStartElapsed = 0;
  state.stage1Hp = 0;
  state.boss.x = W / 2;
  state.boss.y = 175;
  state.boss.moveVx = 0;
  state.boss.moveVy = 0;
  state.patternElapsed = 0;
}

function updateBattleStartSequence(dt) {
  const stage2Sequence = state.bossStage === 2 && state.bossStageState === "stage2";
  const targetMaxHp = stage2Sequence ? STAGE2_MAX_HP : STAGE1_MAX_HP;

  // 페이즈 전환 대기 중에도 보스 좌표를 즉시 덮어쓰지 않고 중앙 전투 위치로 부드럽게 수렴시킵니다.
  if (stage2Sequence) {
    state.boss.x = lerp(state.boss.x, W / 2, 1 - Math.exp(-3.2 * dt));
    state.boss.y = lerp(state.boss.y, 175, 1 - Math.exp(-3.0 * dt));
  }

  if (state.battleStartState === "charging") {
    state.battleStartElapsed += dt;
    const chargeProgress = clamp(state.battleStartElapsed / BOSS_HP_CHARGE_DURATION, 0, 1);
    if (stage2Sequence) state.stage2Hp = targetMaxHp * chargeProgress;
    else state.stage1Hp = targetMaxHp * chargeProgress;
    if (chargeProgress >= 1) {
      if (stage2Sequence) state.stage2Hp = targetMaxHp;
      else state.stage1Hp = targetMaxHp;
      state.battleStartState = "waiting";
      state.battleStartElapsed = 0;
    }
    return;
  }

  if (state.battleStartState === "waiting") {
    state.battleStartElapsed += dt;
    if (stage2Sequence) state.stage2Hp = targetMaxHp;
    else state.stage1Hp = targetMaxHp;
    const startDelay = stage2Sequence ? STAGE2_PATTERN_START_DELAY : BOSS_PATTERN_START_DELAY;
    if (state.battleStartElapsed >= startDelay) {
      state.battleStartState = "active";
      state.battleStartElapsed = 0;
      state.patternElapsed = 0;
      state.playerFireCooldown = 0;
      state.pattern.bossMoveStartX = state.boss.x;
      state.pattern.bossMoveStartY = state.boss.y;
      state.pattern.bossMoveBlend = 0;
      state.boss.moveVx *= .35;
      state.boss.moveVy *= .35;
    }
  }
}

function startBossDestructionCinematic() {
  state.paused = false;
  state.cinematicMode = "destroy";
  state.cinematicTime = 0;
  state.cinematicDeathSeeded = false;
  state.cinematicParticles.length = 0;
  state.cinematicRings.length = 0;
  state.playerBullets.length = 0;
  state.bullets.length = 0;
  state.purifyStartX = state.boss.x;
  state.purifyStartY = state.boss.y;
  state.destructionBossX = state.boss.x;
  state.destructionBossY = state.boss.y;
  state.destructionLastBurst = -1;
  state.destructionClearShown = false;
  state.waves.length = 0;
  state.cursors.length = 0;
  state.activeCursor = null;
  state.mouse.down = false;
  triggerScreenShake(12, .28);
}

function testBossDestructionCinematic() {
  state.bossStage = 2;
  state.bossStageState = "defeated";
  state.stage1Hp = 0;
  state.stage2Hp = 0;
  state.battleDefeatedAt = state.t;
  state.boss.x = W / 2;
  state.boss.y = 175;
  startBossDestructionCinematic();
  refreshButtons();
}

function spawnCinematicParticle(x, y, color, speed = 120, count = 1, life = 1) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    const s = rand(speed * .35, speed);
    state.cinematicParticles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(life * .6, life),
      age: 0,
      size: rand(2, 6),
      color,
      square: Math.random() < .65,
    });
  }
}

function seedCinematicDeathEffects() {
  if (state.cinematicDeathSeeded) return;
  state.cinematicDeathSeeded = true;
  state.cinematicRings.push({ x: state.destructionBossX, y: state.destructionBossY, age: 0, life: .7, maxR: 250, color: "#ffd84a", width: 18 });
  state.cinematicRings.push({ x: state.destructionBossX, y: state.destructionBossY, age: -.08, life: .9, maxR: 320, color: "#fff4b0", width: 8 });
  spawnCinematicParticle(state.destructionBossX, state.destructionBossY, "#ffd84a", 320, 42, .9);
  spawnCinematicParticle(state.destructionBossX, state.destructionBossY, "#ff8b22", 260, 34, .85);
}

function updateCinematicEffects(dt) {
  for (const p of state.cinematicParticles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(.25, dt);
    p.vy *= Math.pow(.25, dt);
  }
  state.cinematicParticles = state.cinematicParticles.filter(p => p.age < p.life);
  for (const r of state.cinematicRings) r.age += dt;
  state.cinematicRings = state.cinematicRings.filter(r => r.age < r.life);
}

function updateCinematic(dt) {
  if (state.cinematicMode === "intro") {
    state.cinematicTime += dt;
    if (state.cinematicTime >= INTRO_DURATION) finishBossIntro();
    return;
  }
  if (state.cinematicMode !== "destroy") return;

  state.cinematicTime = Math.min(BOSS_DESTRUCTION_DURATION, state.cinematicTime + dt);
  const t = state.cinematicTime;
  const explosionEnd = 3.0;
  const bossExitStart = 3.0;
  const bossExitEnd = 4.15;

  if (t >= .04) seedCinematicDeathEffects();

  // 약 3초 동안 보스 주위에서 노란 폭발이 연속적으로 터집니다.
  if (t < explosionEnd) {
    const burstIndex = Math.floor(t / .075);
    if (burstIndex !== state.destructionLastBurst) {
      state.destructionLastBurst = burstIndex;
      for (let i = 0; i < 2; i++) {
        const a = rand(0, TAU);
        const rr = rand(30, 180);
        const ex = state.destructionBossX + Math.cos(a) * rr;
        const ey = state.destructionBossY + Math.sin(a) * rr * .68;
        const warm = Math.random() < .6 ? "#ffd84a" : "#ff9f1f";
        spawnCinematicParticle(ex, ey, warm, rand(150, 300), rand(10, 18), rand(.35, .7));
        state.cinematicRings.push({ x: ex, y: ey, age: 0, life: rand(.18, .34), maxR: rand(34, 90), color: warm, width: rand(6, 12) });
      }
      if (Math.random() < .82) {
        state.cinematicRings.push({ x: state.destructionBossX + rand(-25, 25), y: state.destructionBossY + rand(-20, 20), age: 0, life: rand(.2, .32), maxR: rand(70, 145), color: "#fff4b0", width: rand(4, 9) });
      }
      triggerScreenShake(rand(3.5, 8), .1);
    }
    state.destructionBossY = state.purifyStartY + Math.sin(t * 48) * 3;
  } else if (t < bossExitEnd) {
    // 폭발이 끝나면 보스 본체가 그대로 위쪽으로 빠르게 이탈합니다.
    const p = smoothstep((t - bossExitStart) / Math.max(.01, bossExitEnd - bossExitStart));
    state.destructionBossY = lerp(state.purifyStartY, -state.boss.drawH - 220, p);
  } else {
    state.destructionBossY = -state.boss.drawH - 220;
  }

  // 별도의 BOSS CLEAR 패널은 표시하지 않고 플레이어 이탈과 암전으로 바로 이어집니다.
  state.destructionClearShown = false;
  updateCinematicEffects(dt);
}


function tuneStoryBullet(b) {
  // 스토리 모드에서도 원본 보스 전용 코드의 탄속·탄 수·크기를 그대로 사용한다.
  return true;
}
function spawnBullet(opts) {
  const b = {
    x: opts.x, y: opts.y,
    vx: opts.vx || 0, vy: opts.vy || 0,
    type: opts.type || "normal",
    visual: opts.visual || "corruptionOrbPurple",
    scale: opts.scale ?? 1,
    age: 0,
    active: true,
    rotation: opts.rotation || 0,
    spin: opts.spin ?? rand(-2.5, 2.5),
    homingTimer: opts.homingTimer || 0,
    delayedTriggered: false,
    dilationState: opts.dilationState || null,
    dilationFrozenAt: -1,
    dilationHold: opts.dilationHold ?? rand(.18, .72),
    bounceCount: 0,
    maxBounces: opts.maxBounces ?? 3,
    targetSpeed: opts.targetSpeed,
    history: [],
    rewindState: opts.rewindState || null,
    historyIndex: -1,
    noCull: !!opts.noCull,
    rewindOrder: opts.rewindOrder || 0,
    rewindCycle: opts.rewindCycle || 0,
    rewindRate: opts.rewindRate || 22,
    baseVx: opts.vx || 0,
    baseVy: opts.vy || 0,
    sineFreq: opts.sineFreq || 6.2,
    sineAmp: opts.sineAmp || 95,
    sourcePattern: opts.sourcePattern ?? currentPattern().id,
  };
  if (!tuneStoryBullet(b)) return null;
  state.bullets.push(b);
  return b;
}

function spawnParticleBurst(x, y, color="#ffffff", count=10) {
  for (let i=0;i<count;i++) {
    const a = Math.random()*TAU;
    const s = rand(60, 210);
    state.particles.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, age:0, life:rand(.25,.62), size:rand(2,6), color });
  }
}
function triggerScreenShake(power = 18, duration = .42) {
  const remainingRatio = state.screenShakeDuration > 0
    ? state.screenShakeTime / state.screenShakeDuration
    : 0;
  const currentPower = state.screenShakePower * remainingRatio;
  if (power >= currentPower || duration > state.screenShakeTime) {
    state.screenShakePower = Math.max(power, currentPower);
    state.screenShakeDuration = Math.max(.01, duration);
    state.screenShakeTime = Math.max(state.screenShakeTime, duration);
  }
}

function hitPlayer() {
  if (state.player.invuln > 0 || adapter.getPlayer().invulnerable) return;
  state.player.invuln = .45;
  state.hitFlash = .18;
  spawnParticleBurst(state.player.x, state.player.y, "#ff5365", 16);
  adapter.hitPlayer();
}

function canPlayerAttack() {
  return state.cinematicMode === "battle"
    && state.battleStartState === "active"
    && (state.bossStageState === "stage1" || state.bossStageState === "stage2");
}

function getBossHitArea() {
  const awakened = state.bossStageState === "stage2" || state.bossStageState === "awakening";
  return {
    x: state.boss.x,
    y: state.boss.y + 16,
    rx: state.boss.drawW * (awakened ? .2 : .19),
    ry: state.boss.drawH * (awakened ? .14 : .135),
  };
}

function triangleWave(value) {
  const wrapped = ((value % TAU) + TAU) % TAU;
  return 1 - 4 * Math.abs(Math.round(wrapped / TAU) - wrapped / TAU);
}

function smoothLaneSweep(t, phase, positions, stepDuration) {
  const raw = Math.max(0, t + phase);
  const step = Math.floor(raw / stepDuration);
  const local = (raw % stepDuration) / stepDuration;
  const eased = .5 - .5 * Math.cos(Math.PI * smoothstep(local));
  const from = positions[step % positions.length];
  const to = positions[(step + 1) % positions.length];
  return lerp(from, to, eased);
}

function getBossPatternMovement(id, t, phase, rangeX) {
  const centerX = W / 2;
  let x = centerX;
  let y = 138;
  let maxSpeed = 270;
  let maxSpeedY = 95;
  let response = 3.2;
  let acceleration = 5.2;

  switch (id) {
    // 1페이즈
    case 17: // 광자 나선: 넓은 횡이동 + 세로 나선 흔들림
      x = centerX + rangeX * .76 * Math.sin(t * .82 + phase);
      y = 140 + 28 * Math.sin(t * 1.64 + phase * .7);
      maxSpeed = 285;
      break;
    case 5: // 웨이브 스트림: 빠른 8자 궤도
      x = centerX + rangeX * .91 * Math.sin(t * 1.02 + phase);
      y = 142 + 24 * Math.sin(t * 2.04 + phase + .8);
      maxSpeed = 360;
      maxSpeedY = 120;
      response = 3.8;
      acceleration = 6.2;
      break;
    case 8: // 지연 추적: 느리고 불규칙한 타원 드리프트
      x = centerX + rangeX * (.57 * Math.sin(t * .47 + phase) + .15 * Math.sin(t * 1.31 + phase * .4));
      y = 143 + 31 * Math.cos(t * .71 + phase);
      maxSpeed = 235;
      response = 2.7;
      acceleration = 4.4;
      break;
    case 19: { // 타임시프트: 양끝에서 잠시 머무는 완만한 횡이동
      const s = Math.sin(t * .58 + phase);
      x = centerX + rangeX * .78 * s * s * s;
      y = 135 + 13 * Math.sin(t * 1.16 + phase * .5);
      maxSpeed = 245;
      response = 2.6;
      acceleration = 4.0;
      break;
    }
    case 16: // 도탄: 짧고 빠른 지그재그
      x = centerX + rangeX * (.62 * Math.sin(t * 1.42 + phase) + .18 * Math.sin(t * 2.84 + phase * .3));
      y = 137 + 16 * Math.cos(t * 1.42 + phase);
      maxSpeed = 390;
      response = 4.0;
      acceleration = 6.8;
      break;
    case 53: { // 롤백: 진행 방향이 되감기는 삼각형 궤도
      const reverse = triangleWave(t * .58 + phase);
      x = centerX + rangeX * .74 * reverse;
      y = 141 + 25 * Math.sin(t * 1.16 + phase + Math.PI / 3);
      maxSpeed = 315;
      response = 3.4;
      acceleration = 5.8;
      break;
    }

    // 2페이즈
    case 7: { // 접속 대기열: 슬롯을 한 칸씩 이동하는 흐름
      const lane = smoothLaneSweep(t, phase, [-.72, -.36, 0, .36, .72, 0], 1.45);
      x = centerX + rangeX * lane;
      y = 137 + 13 * Math.sin(t * 1.15 + phase);
      maxSpeed = 280;
      response = 3.3;
      break;
    }
    case 54: // 클릭탄: 보스 중심을 도는 작은 원형 이동
      x = centerX + rangeX * .43 * Math.cos(t * .72 + phase);
      y = 143 + 30 * Math.sin(t * .72 + phase);
      maxSpeed = 235;
      maxSpeedY = 105;
      response = 3.0;
      break;
    case 55: // 출석 쟁탈전: 전투 박스 위에서 작은 호버링
      x = centerX + rangeX * .28 * Math.sin(t * .66 + phase);
      y = 132 + 12 * Math.sin(t * 1.32 + phase * .6);
      maxSpeed = 175;
      maxSpeedY = 60;
      response = 2.7;
      break;
    case 59: { // 인증코드: 좌우 확인 후 중앙으로 돌아오는 펄스 이동
      const s = Math.sin(t * .73 + phase);
      x = centerX + rangeX * .55 * s * Math.abs(s);
      y = 137 + 14 * Math.cos(t * 1.46 + phase);
      maxSpeed = 250;
      response = 3.0;
      break;
    }
    case 61: // 공지 전광판: 화면을 넓게 훑는 일정한 스캔 이동
      x = centerX + rangeX * .88 * Math.sin(t * .62 + phase);
      y = 131 + 10 * Math.sin(t * 1.24 + phase);
      maxSpeed = 300;
      response = 3.1;
      break;
    case 62: { // 강의실 좌표: 네 개 강의실 좌표를 순서대로 연결
      const lane = smoothLaneSweep(t, phase, [-.78, -.27, .27, .78, .27, -.27], 1.7);
      x = centerX + rangeX * lane;
      y = 140 + 18 * Math.sin(t * .92 + phase);
      maxSpeed = 285;
      response = 3.2;
      break;
    }
    case 63: // 안내 방송: 큰 8자 궤도
      x = centerX + rangeX * .72 * Math.sin(t * .64 + phase);
      y = 142 + 35 * Math.sin(t * 1.28 + phase);
      maxSpeed = 275;
      maxSpeedY = 115;
      response = 3.1;
      break;
    case 64: // NFC: 원형 스캔 궤도
      x = centerX + rangeX * .55 * Math.cos(t * .58 + phase);
      y = 144 + 38 * Math.sin(t * .58 + phase);
      maxSpeed = 235;
      maxSpeedY = 110;
      response = 2.9;
      break;
    case 65: // 읽지 않은 알림: 예측하기 어려운 리사주 궤도
      x = centerX + rangeX * (.52 * Math.sin(t * .88 + phase) + .19 * Math.sin(t * 2.17 + phase * .3));
      y = 143 + 22 * Math.sin(t * 1.43 + phase + 1.1);
      maxSpeed = 330;
      maxSpeedY = 105;
      response = 3.7;
      acceleration = 6.0;
      break;
    case 66: // 강제 동기화: 좌우 대칭 다이아몬드 이동
      x = centerX + rangeX * .69 * triangleWave(t * .48 + phase);
      y = 145 + 27 * triangleWave(t * .96 + phase + Math.PI / 2);
      maxSpeed = 300;
      maxSpeedY = 105;
      response = 3.4;
      acceleration = 5.8;
      break;
    default:
      x = centerX + rangeX * .5 * Math.sin(t * .65 + phase);
      y = 138 + 16 * Math.sin(t * 1.3 + phase);
  }

  return { x, y, maxSpeed, maxSpeedY, response, acceleration };
}

function moveBoss(dt, factor = 1) {
  const boss = state.boss;
  const margin = boss.drawW * .47;
  const minX = margin;
  const maxX = W - margin;
  const minY = 108;
  const maxY = 188;
  const rangeX = (maxX - minX) / 2;
  const id = currentPattern().id;
  const phase = Number.isFinite(state.pattern.bossMovePhase) ? state.pattern.bossMovePhase : 0;
  const profile = getBossPatternMovement(id, state.patternElapsed, phase, rangeX);

  if (!Number.isFinite(boss.moveVx)) boss.moveVx = 0;
  if (!Number.isFinite(boss.moveVy)) boss.moveVy = 0;
  if (!Number.isFinite(boss.x)) boss.x = W / 2;
  if (!Number.isFinite(boss.y)) boss.y = 175;

  // 기존 패턴의 이동 배율은 속도에 작은 보정만 주고, 궤도 자체는 패턴별 프로필이 결정합니다.
  const legacyScale = clamp(.92 + factor * .34, .92, 1.22);
  // 새 패턴 및 2페이즈 전환 직후에는 현재 위치에서 목표 궤도로 부드럽게 합류한다.
  state.pattern.bossMoveBlend = clamp((state.pattern.bossMoveBlend ?? 0) + dt / 1.15, 0, 1);
  const join = smoothstep(state.pattern.bossMoveBlend);
  const targetX = clamp(lerp(state.pattern.bossMoveStartX ?? boss.x, profile.x, join), minX, maxX);
  const targetY = clamp(lerp(state.pattern.bossMoveStartY ?? boss.y, profile.y, join), minY, maxY);
  const desiredVx = clamp((targetX - boss.x) * profile.response, -profile.maxSpeed * legacyScale, profile.maxSpeed * legacyScale);
  const desiredVy = clamp((targetY - boss.y) * profile.response, -profile.maxSpeedY, profile.maxSpeedY);
  const blend = 1 - Math.exp(-profile.acceleration * dt);

  boss.moveVx = lerp(boss.moveVx, desiredVx, blend);
  boss.moveVy = lerp(boss.moveVy, desiredVy, blend);
  boss.x += boss.moveVx * dt;
  boss.y += boss.moveVy * dt;

  // 프레임 드롭 때만 경계 안으로 부드럽게 복귀하도록 안전 보정합니다.
  if (boss.x < minX) {
    boss.x = minX;
    boss.moveVx = Math.max(0, boss.moveVx * .35);
  } else if (boss.x > maxX) {
    boss.x = maxX;
    boss.moveVx = Math.min(0, boss.moveVx * .35);
  }
  if (boss.y < minY) {
    boss.y = minY;
    boss.moveVy = Math.max(0, boss.moveVy * .35);
  } else if (boss.y > maxY) {
    boss.y = maxY;
    boss.moveVy = Math.min(0, boss.moveVy * .35);
  }
}

function updatePattern(dt) {
  const id = currentPattern().id;
  const p = state.pattern;
  p.lastShot += dt * (state.story ? .68 : 1);

  if (id === 17) {
    moveBoss(dt, .15);
    p.shootTimer += dt;
    const cycle = p.shootTimer % 2.8;
    const m = bossMuzzle();
    const targetAngle = Math.atan2(state.player.y-m.y, state.player.x-m.x);
    if (cycle < 1.2) p.laserAngle = targetAngle;
    if (cycle >= 1.8 && cycle < 2.5) checkLaserHit(m.x, m.y, p.laserAngle, 22);
    if (p.lastShot > .26) {
      p.lastShot = 0;
      const offset = p.rapidFireCount++ * .15;
      for (let i=0;i<3;i++) {
        const a = i/3*TAU + offset;
        spawnBullet({ x:m.x, y:m.y, vx:Math.cos(a)*315, vy:Math.sin(a)*315, type:"crystal", visual:i===0?"starGreen":i===1?"starCyan":"starPurple", scale:.68 });
      }
    }
  }

  else if (id === 7) {
    updateServiceQueuePhase(dt);
  }

  else if (id === 5) {
    moveBoss(dt, .8);
    if (p.lastShot > .85) {
      p.lastShot = 0;
      const m = bossMuzzle();
      for (let i=0;i<7;i++) {
        const a = Math.PI/2 + (i-3)*.2 + Math.sin(state.t*5)*.2;
        spawnBullet({ x:m.x, y:m.y, vx:Math.cos(a)*250, vy:Math.sin(a)*250, visual:i%2?"starBlue":"starCyan", scale:.56, spin:(i-3)*.35 });
      }
    }
  }

  else if (id === 8) {
    moveBoss(dt, .25);
    const cycle = state.patternElapsed % 1.8;
    if (cycle < .65 && p.lastShot > .16) {
      p.lastShot = 0;
      const m = bossMuzzle();
      for (let i=0;i<6;i++) {
        const a = i/6*TAU + cycle*2.5;
        spawnBullet({ x:m.x+Math.cos(a)*30, y:m.y+Math.sin(a)*30, vx:Math.cos(a)*55, vy:Math.sin(a)*55, type:"delayed", homingTimer:.85, visual:ORBS[i], scale:.72 });
      }
    }
  }

  else if (id === 19) {
    moveBoss(dt, .08);
    p.shootTimer += dt;
    const cycle = p.shootTimer % 4.2;
    const m = bossMuzzle();
    const enoughTimeForFinalLaunch = state.patternElapsed < currentPattern().duration - 1.35;
    if (cycle < 2.2 && enoughTimeForFinalLaunch && p.lastShot > .18) {
      p.lastShot = 0;
      const sway = Math.sin(state.t*4.5)*.25;
      for (let i=0;i<9;i++) {
        const a = Math.PI*.17 + i/8*Math.PI*.66 + sway;
        const speed = i%2===0 ? 430 : 320;
        spawnBullet({ x:m.x, y:m.y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, type:"dilation", dilationState:"flying", visual:i%2===0?"starPurple":"starRed", scale:.56 });
      }
    }
    if (cycle>=2.25 && cycle<3.25) {
      for (const b of state.bullets) if (b.active && b.type==="dilation" && b.dilationState==="frozen" && Math.random()<.24) launchDilation(b, 590);
    }
    if (cycle>=3.25) {
      for (const b of state.bullets) if (b.active && b.type==="dilation" && b.dilationState==="frozen") launchDilation(b, 590);
    }
  }

  else if (id === 16) {
    moveBoss(dt, .22);
    if (p.lastShot > .95) {
      p.lastShot = 0;
      const m = bossMuzzle();
      const base = Math.atan2(state.player.y-m.y, state.player.x-m.x);
      const shiftCycle = p.rapidFireCount++ % 3;
      const shift = shiftCycle === 1 ? .20 : shiftCycle === 2 ? -.20 : 0;
      const offsets = [-.49, -.14, .14, .49];
      for (let i=0;i<4;i++) {
        const a = base + shift + offsets[i];
        const outer = i===0 || i===3;
        spawnBullet({
          x:m.x, y:m.y,
          vx:Math.cos(a)*(outer?320:300),
          vy:Math.sin(a)*(outer?320:300),
          type:outer?"ricochet":"normal",
          visual:outer?"starGold":(i===1?"starCyan":"starPurple"),
          scale:outer?.62:.58,
          maxBounces:outer?1:0,
        });
      }
    }
  }

  else if (id === 53) {
    updateCorruptionRollback(dt);
  }

  else if (id === 54) {
    updateClickPattern(dt);
  }

  else if (id === 55) {
    updateSeatScramble(dt);
  }



  else if (id === 59) {
    updateAuthCodePattern(dt);
  }


  else if (id === 61) {
    updateAnnouncementOverload(dt);
  }

  else if (id === 62) {
    updateClassroomRoute(dt);
  }

  else if (id === 63) {
    updateBroadcastConfusion(dt);
  }

  else if (id === 64) {
    updateStudentScanGates(dt);
  }

  else if (id === 65) {
    updateUnreadNotifications(dt);
  }

  else if (id === 66) {
    updateAcademicSync(dt);
  }
}



function playerInsideRect(rect, padding = 0) {
  return state.player.x >= rect.x - rect.width / 2 - padding &&
    state.player.x <= rect.x + rect.width / 2 + padding &&
    state.player.y >= rect.y - rect.height / 2 - padding &&
    state.player.y <= rect.y + rect.height / 2 + padding;
}

function circleHitsRect(cx, cy, radius, rect) {
  const left = rect.x - rect.width / 2;
  const top = rect.y - rect.height / 2;
  const nearestX = clamp(cx, left, left + rect.width);
  const nearestY = clamp(cy, top, top + rect.height);
  return Math.hypot(cx - nearestX, cy - nearestY) <= radius;
}

function initializeAnnouncementOverload() {
  const p = state.pattern;
  p.tickerAttacks = [];
  p.tickerTriggered = 0;
  p.tickerFinishing = false;
  p.tickerCompleted = false;
  p.tickerFinishAt = 8.4;
  // 전광판은 3줄로 유지하되, 일반 공지의 투명도와 카드 밀도를 낮춰 탄 가독성을 확보한다.
  const specs = [
    { y: 350, dir: 1, speed: 142, start: -140 },
    { y: 458, dir: -1, speed: 152, start: W + 150 },
    { y: 566, dir: 1, speed: 162, start: -260 },
  ];
  const words = [
    { text: '신입생 안내', attack: null },
    { text: '필독', attack: 'required' },
    { text: '행사 안내', attack: null },
    { text: '강의실 변경', attack: 'change' },
    { text: '학생 인증', attack: null },
    { text: '긴급', attack: 'urgent' },
    { text: '서버 점검', attack: 'maintenance' },
  ];
  p.tickerRows = specs.map((spec, rowIndex) => {
    const spacing = 278;
    const items = [];
    for (let i=0;i<6;i++) {
      const word = words[(i + rowIndex * 3) % words.length];
      items.push({
        x: spec.start + spec.dir * i * spacing,
        text: word.text,
        attack: word.attack,
        armed: true,
        width: word.attack ? 146 : 158,
      });
    }
    return { ...spec, spacing, items };
  });
}

function queueTickerAttack(type, x, y) {
  state.pattern.tickerAttacks.push({ type, x, y, age: 0, fired: false, life: .92 });
  state.pattern.tickerTriggered++;
}

function fireTickerAttack(attack) {
  const x = attack.x;
  const y = attack.y + 28;
  const aim = Math.atan2(state.player.y - y, state.player.x - x);
  if (attack.type === 'required') {
    for (const offset of [-.22, 0, .22]) {
      const a = aim + offset;
      spawnBullet({
        x, y,
        vx: Math.cos(a) * 245,
        vy: Math.sin(a) * 245,
        visual: offset === 0 ? 'starGold' : 'starCyan',
        scale: .57,
      });
    }
  } else if (attack.type === 'change') {
    spawnBullet({
      x, y,
      vx: Math.cos(aim) * 215,
      vy: Math.sin(aim) * 215,
      type: 'sine',
      visual: 'corruptionOrbPurple',
      scale: .72,
      sineFreq: 6.5,
      sineAmp: 92,
    });
  } else if (attack.type === 'urgent') {
    spawnBullet({
      x, y,
      vx: Math.cos(aim) * 305,
      vy: Math.sin(aim) * 305,
      visual: 'starRed',
      scale: .68,
    });
  } else if (attack.type === 'maintenance') {
    for (let i = -2; i <= 2; i++) {
      const a = aim + i * .12;
      spawnBullet({
        x, y,
        vx: Math.cos(a) * 220,
        vy: Math.sin(a) * 220,
        visual: i === 0 ? 'corruptionOrbCyan' : 'corruptionOrbBlue',
        scale: i === 0 ? .58 : .44,
      });
    }
  }
  spawnParticleBurst(x, y, attack.type === 'maintenance' ? '#4fd5ff' : '#ff5f6d', 10);
}

function updateAnnouncementOverload(dt) {
  const p = state.pattern;
  moveBoss(dt, .05);
  const triggerX = W/2;
  const spawning = state.patternElapsed < p.tickerFinishAt;
  if (!spawning) p.tickerFinishing = true;

  for (const row of p.tickerRows || []) {
    const finishBoost = spawning ? 1 : 1.85;
    for (const item of row.items) {
      const oldX = item.x;
      item.x += row.dir * row.speed * finishBoost * dt;
      const crossed = row.dir > 0
        ? oldX < triggerX && item.x >= triggerX
        : oldX > triggerX && item.x <= triggerX;
      if (spawning && item.attack && item.armed && crossed) {
        item.armed = false;
        queueTickerAttack(item.attack, triggerX, row.y);
      }
      if (spawning && row.dir > 0 && item.x > W + 150) {
        const minX = Math.min(...row.items.map(v => v.x));
        item.x = minX - row.spacing;
        item.armed = true;
      } else if (spawning && row.dir < 0 && item.x < -150) {
        const maxX = Math.max(...row.items.map(v => v.x));
        item.x = maxX + row.spacing;
        item.armed = true;
      }
    }
  }
  for (const attack of p.tickerAttacks) {
    attack.age += dt;
    if (!attack.fired && attack.age >= .42) {
      attack.fired = true;
      fireTickerAttack(attack);
    }
  }
  p.tickerAttacks = p.tickerAttacks.filter(a => a.age < a.life);

  if (p.tickerFinishing && !p.tickerCompleted) {
    const rowsGone = (p.tickerRows || []).every(row => row.items.every(item =>
      row.dir > 0 ? item.x > W + 220 : item.x < -220
    ));
    const attacksGone = p.tickerAttacks.length === 0;
    const bulletsGone = !state.bullets.some(b => b.active && b.sourcePattern === 61);
    if (rowsGone && attacksGone && bulletsGone) {
      p.tickerCompleted = true;
      nextPattern();
      return;
    }
  }
}

function initializeClassroomRoute() {
  const p = state.pattern;
  p.classroomRound = 0;
  p.classroomCycleStart = .35;
  p.classroomBlasts = [];
  p.classroomDangerStart = 2.75;
  p.classroomDangerEnd = 3.20;
  p.classroomRoundEnd = 3.85;
  p.classroomSequenceFinished = false;
  buildClassroomRoute();
}

function buildClassroomRoute() {
  const p = state.pattern;
  const rooms = ['IT 101', '인문 203', '사범 305', '공대 117'];
  const targetIndex = Math.floor(Math.random() * rooms.length);
  p.classroomRoute = {
    rooms,
    targetIndex,
    targetRoom: rooms[targetIndex],
    resolved: false,
    hitChecked: false,
    pulse: Math.random() * TAU,
  };
  p.classroomCycleStart = state.patternElapsed;
  p.classroomRound++;
}

function createClassroomBlast(laneIndex, laneWidth) {
  const left = laneIndex * laneWidth + 7;
  const top = 292;
  const width = laneWidth - 14;
  const height = H - 304;
  const x = left + width / 2;
  const y = top + height / 2;
  const shards = Array.from({length: 24}, (_, i) => ({
    angle: i / 24 * TAU + rand(-.11, .11),
    speed: rand(115, 330),
    length: rand(12, 34),
    phase: rand(0, TAU),
  }));
  state.pattern.classroomBlasts.push({
    x, y, left, top, width, height,
    age: 0,
    life: 1.08,
    shards,
  });
  for (let i = 0; i < 4; i++) {
    spawnParticleBurst(
      left + width * (.18 + i * .21),
      top + height * rand(.22, .82),
      i % 2 ? '#ff9a72' : '#ff3345',
      11
    );
  }
}

function updateClassroomRoute(dt) {
  const p = state.pattern;
  const route = p.classroomRoute;
  if (!route) return;
  moveBoss(dt, .05);
  for (const blast of p.classroomBlasts) blast.age += dt;
  p.classroomBlasts = p.classroomBlasts.filter(blast => blast.age < blast.life);

  const local = state.patternElapsed - p.classroomCycleStart;
  const laneWidth = W / 4;
  if (local >= p.classroomDangerStart && !route.hitChecked) {
    route.hitChecked = true;
    for (let i = 0; i < 4; i++) {
      if (i !== route.targetIndex) createClassroomBlast(i, laneWidth);
    }
    triggerScreenShake(20, .58);
    state.hitFlash = Math.max(state.hitFlash, .14);
    const safeLeft = route.targetIndex * laneWidth;
    const safeRight = safeLeft + laneWidth;
    if (state.player.x < safeLeft + state.player.r || state.player.x > safeRight - state.player.r) hitPlayer();

    // 폭발이 발생한 즉시 다음 강의실 좌표를 제시합니다.
    // 폭발 이펙트는 classroomBlasts에 남아 재생되며, 패턴 자체는 유지됩니다.
    if (p.classroomRound < 3) {
      buildClassroomRoute();
      return;
    }
  }
  if (local >= p.classroomRoundEnd) {
    if (p.classroomRound >= 3) {
      if (!p.classroomSequenceFinished) {
        p.classroomSequenceFinished = true;
        nextPattern();
      }
      return;
    }
    buildClassroomRoute();
  }
}

function initializeBroadcastConfusion() {
  const p = state.pattern;
  p.broadcastWaves = [];
  p.broadcastEvents = [
    { time: .65, side: "left", label: "서문 안내 채널" },
    { time: 2.25, side: "right", label: "동문 안내 채널" },
    { time: 3.85, side: "left", label: "강의동 안내 채널" },
    { time: 5.45, side: "right", label: "본관 안내 채널" },
    { time: 7.05, side: "left", label: "교차 방송 A" },
    { time: 8.15, side: "right", label: "교차 방송 B" },
    { time: 9.95, side: "top", label: "전체 캠퍼스 방송" },
  ];
  p.broadcastEventIndex = 0;
  p.broadcastStatus = "방송 채널 연결 중";
  p.broadcastPulse = 0;
  p.broadcastCompleted = false;
}

function spawnBroadcastWave(side, label) {
  const p = state.pattern;
  let source;
  let baseAngle;
  if (side === "left") {
    source = { x: 18, y: rand(390, 520) };
    baseAngle = 0;
  } else if (side === "right") {
    source = { x: W - 18, y: rand(390, 520) };
    baseAngle = Math.PI;
  } else {
    source = { x: rand(430, 850), y: 190 };
    baseAngle = Math.PI / 2;
  }
  const gapOffset = side === "top" ? rand(-.42, .42) : rand(-.30, .30);
  p.broadcastWaves.push({
    side,
    label,
    x: source.x,
    y: source.y,
    age: 0,
    warning: .52,
    radius: 30,
    speed: side === "top" ? 205 : 220,
    gapAngle: baseAngle + gapOffset,
    gapHalf: side === "top" ? .18 : .16,
    thickness: 15,
    bands: [0, 28, 56],
  });
  p.broadcastStatus = label;
}

function updateBroadcastConfusion(dt) {
  const p = state.pattern;
  moveBoss(dt, .045);
  p.broadcastPulse += dt;

  while (p.broadcastEventIndex < p.broadcastEvents.length &&
    state.patternElapsed >= p.broadcastEvents[p.broadcastEventIndex].time) {
    const event = p.broadcastEvents[p.broadcastEventIndex++];
    spawnBroadcastWave(event.side, event.label);
  }

  for (const wave of p.broadcastWaves) {
    wave.age += dt;
    if (wave.age < wave.warning) continue;
    wave.radius = 30 + (wave.age - wave.warning) * wave.speed;
    const dx = state.player.x - wave.x;
    const dy = state.player.y - wave.y;
    const distance = Math.hypot(dx, dy);
    const playerAngle = Math.atan2(dy, dx);
    const insideGap = Math.abs(angleDelta(playerAngle, wave.gapAngle)) <= wave.gapHalf;
    if (!insideGap) {
      for (const offset of wave.bands) {
        if (Math.abs(distance - (wave.radius + offset)) <= wave.thickness + state.player.r) {
          hitPlayer();
          break;
        }
      }
    }
  }
  p.broadcastWaves = p.broadcastWaves.filter(wave => wave.age < wave.warning || wave.radius < 1520);
  if (p.broadcastEventIndex >= p.broadcastEvents.length && p.broadcastWaves.length === 0 && !p.broadcastCompleted) {
    p.broadcastCompleted = true;
    p.broadcastStatus = "안내 방송 정상화";
    nextPattern();
    return;
  }
}

function initializeStudentScanGates() {
  const p = state.pattern;
  p.scanSuccess = false;
  p.scanSuccessAt = 0;
  p.nfcRings = [];
  // NFC 인증 구간 회전 속도를 낮춰 화면 하단에서도 충분히 따라갈 수 있게 합니다.
  // 링 확장 속도와 안전 구간 크기는 기존 값을 그대로 유지합니다.
  p.nfcSchedule = [
    { time:.45, spin:.28, gap:.44, speed:142 },
    { time:2.45, spin:-.32, gap:.42, speed:150 },
    { time:4.45, spin:.36, gap:.39, speed:156 },
    { time:6.45, spin:-.40, gap:.37, speed:162 },
    { time:8.45, spin:.44, gap:.36, speed:168 },
  ];
  p.nfcSpawnIndex = 0;
  p.nfcSuccessCount = 0;
  p.nfcTotal = p.nfcSchedule.length;
}

function spawnNfcRing(spec, index) {
  const source = bossMuzzle();
  state.pattern.nfcRings.push({
    x: source.x,
    y: source.y,
    radius: 74,
    age: 0,
    warning: .58,
    speed: spec.speed,
    gapAngle: Math.PI/2 + (index%2===0 ? -.7 : .65),
    gapHalf: spec.gap,
    spin: spec.spin,
    resolved: false,
    result: null,
  });
}

function updateStudentScanGates(dt) {
  const p = state.pattern;
  moveBoss(dt, .035);
  while (p.nfcSpawnIndex < p.nfcSchedule.length &&
    state.patternElapsed >= p.nfcSchedule[p.nfcSpawnIndex].time) {
    spawnNfcRing(p.nfcSchedule[p.nfcSpawnIndex], p.nfcSpawnIndex);
    p.nfcSpawnIndex++;
  }

  for (const ring of p.nfcRings) {
    ring.age += dt;
    ring.gapAngle += ring.spin * dt;
    const oldRadius = ring.radius;
    if (ring.age >= ring.warning) ring.radius += ring.speed * dt;

    const dx = state.player.x - ring.x;
    const dy = state.player.y - ring.y;
    const playerDistance = Math.hypot(dx, dy);
    // 플레이어 중심점 하나가 아니라 실제 판정 크기까지 포함해 링 통과를 감지합니다.
    // 빠르게 움직이거나 프레임 간 링이 크게 진행해도 인증 누락이 나지 않도록
    // 이전/현재 반지름 사이의 swept annulus와 플레이어 원의 교차를 사용합니다.
    const playerPassRadius = Math.max(18, state.player.r + 12);
    const crossedPlayer = oldRadius - playerPassRadius <= playerDistance
      && ring.radius + playerPassRadius >= playerDistance;

    if (!ring.resolved && ring.age >= ring.warning && crossedPlayer) {
      ring.resolved = true;
      const playerAngle = Math.atan2(dy, dx);
      // 민트색 구간 경계에 플레이어 몸체가 걸친 경우도 정상 통과로 인정합니다.
      const angularBodyMargin = Math.asin(
        Math.min(0.24, playerPassRadius / Math.max(playerDistance, playerPassRadius + 1)),
      );
      const safeMargin = angularBodyMargin + 0.055;
      const safe = Math.abs(angleDelta(playerAngle, ring.gapAngle)) <= ring.gapHalf + safeMargin;
      ring.result = safe ? 'success' : 'fail';
      if (safe) {
        p.nfcSuccessCount++;
        spawnParticleBurst(state.player.x, state.player.y, '#74d84d', 22);
      } else {
        hitPlayer();
        spawnParticleBurst(state.player.x, state.player.y, '#ff5f6d', 18);
      }
    }
  }
  p.nfcRings = p.nfcRings.filter(r => r.radius < 1020);
  if (p.nfcSpawnIndex >= p.nfcTotal && p.nfcRings.length === 0 && !p.scanSuccess) {
    p.scanSuccess = true;
    p.scanSuccessAt = state.patternElapsed;
    nextPattern();
    return;
  }
}

function initializeUnreadNotifications() {
  const p = state.pattern;
  p.unreadCycle = 0;
  startUnreadNotificationCycle();
}

function startUnreadNotificationCycle() {
  const p = state.pattern;
  p.unreadCycle++;
  p.unreadChain = [];
  p.unreadCycleStart = state.patternElapsed;
  p.unreadSpawnIndex = 0;
  p.unreadLocked = false;
  p.unreadLockAt = 0;
  p.unreadExplosionIndex = 0;
  p.unreadNextExplosionAt = 0;
  p.unreadAimX = state.player.x;
  p.unreadAimY = state.player.y;
  p.unreadOrigins = [
    { x: -48, y: 330 },
    { x: W + 48, y: 390 },
    { x: 245, y: 188 },
    { x: W - 250, y: 188 },
    { x: W * .5, y: H + 48 },
  ];
}

function spawnUnreadNotification(index) {
  const p = state.pattern;
  const origin = p.unreadOrigins[index];
  p.unreadChain.push({
    x: origin.x,
    y: origin.y,
    prevX: origin.x,
    prevY: origin.y,
    vx: 0,
    vy: 0,
    index: index + 1,
    state: "following",
    phaseOffset: index * TAU / 5 + rand(-.25, .25),
    orbitRadius: 38 + (index % 3) * 13,
    explosionAge: 0,
    hitChecked: false,
  });
  spawnParticleBurst(origin.x, origin.y, "#ff5f6d", 9);
}

function updateUnreadNotifications(dt) {
  const p = state.pattern;
  moveBoss(dt, .04);
  const local = state.patternElapsed - p.unreadCycleStart;
  const spawnTimes = [.16, .34, .52, .70, .88];

  while (p.unreadSpawnIndex < spawnTimes.length && local >= spawnTimes[p.unreadSpawnIndex]) {
    spawnUnreadNotification(p.unreadSpawnIndex);
    p.unreadSpawnIndex++;
  }

  if (!p.unreadLocked) {
    for (const node of p.unreadChain) {
      node.prevX = node.x;
      node.prevY = node.y;
      const orbitAngle = state.t * 1.55 + node.phaseOffset;
      const targetX = state.player.x + Math.cos(orbitAngle) * node.orbitRadius;
      const targetY = state.player.y + Math.sin(orbitAngle) * node.orbitRadius * .72;
      const dx = targetX - node.x;
      const dy = targetY - node.y;
      const distance = Math.hypot(dx, dy) || 1;
      const speed = 152 + node.index * 5;
      const step = Math.min(distance, speed * dt);
      node.x += dx / distance * step;
      node.y += dy / distance * step;
      if (Math.hypot(node.x - state.player.x, node.y - state.player.y) < 21 + state.player.r) hitPlayer();
    }
  }

  if (!p.unreadLocked && p.unreadSpawnIndex === 5 && local >= 2.70) {
    p.unreadLocked = true;
    p.unreadLockAt = state.patternElapsed;
    p.unreadNextExplosionAt = state.patternElapsed + .72;
    p.unreadAimX = state.player.x;
    p.unreadAimY = state.player.y;
    for (const node of p.unreadChain) node.state = "locked";
  }

  if (p.unreadLocked && p.unreadExplosionIndex < p.unreadChain.length &&
    state.patternElapsed >= p.unreadNextExplosionAt) {
    const index = p.unreadExplosionIndex;
    const node = p.unreadChain[index];
    node.state = "exploding";
    node.explosionAge = 0;
    if (Math.hypot(node.x - state.player.x, node.y - state.player.y) < 64 + state.player.r) hitPlayer();

    const aimAngle = Math.atan2(p.unreadAimY - node.y, p.unreadAimX - node.x);
    spawnBullet({
      x: node.x,
      y: node.y,
      vx: Math.cos(aimAngle) * 188,
      vy: Math.sin(aimAngle) * 188,
      visual: ORBS[index % ORBS.length],
      scale: .66,
    });
    for (const side of [-1, 1]) {
      const a = aimAngle + side * .52;
      spawnBullet({
        x: node.x,
        y: node.y,
        vx: Math.cos(a) * 225,
        vy: Math.sin(a) * 225,
        visual: STARS[(index + (side > 0 ? 1 : 3)) % STARS.length],
        scale: .52,
      });
    }
    spawnParticleBurst(node.x, node.y, "#ff4158", 20);
    p.unreadExplosionIndex++;
    p.unreadNextExplosionAt += .22;
  }

  for (const node of p.unreadChain) {
    if (node.state === "exploding") node.explosionAge += dt;
  }

  if (p.unreadLocked && p.unreadExplosionIndex >= p.unreadChain.length &&
    state.patternElapsed >= p.unreadNextExplosionAt + .48 &&
    state.patternElapsed < currentPattern().duration - 4.25) {
    startUnreadNotificationCycle();
  }
}

function initializeAcademicSync() {
  const p = state.pattern;
  p.syncCycleStart = state.patternElapsed;
  p.syncMarkers = [];
  if (!p.syncDashNodes) p.syncDashNodes = [];
  p.syncRecordIndex = 0;
  p.syncStage = "record";
  p.syncCenterX = state.player.x;
  p.syncCenterY = state.player.y;
  p.syncLockX = state.player.x;
  p.syncLockY = state.player.y;
  p.syncAngle = -Math.PI / 2;
  p.syncBurstDone = false;
}

function setSyncStage(nextStage) {
  const p = state.pattern;
  if (p.syncStage === nextStage) return;
  p.syncStage = nextStage;
  if (nextStage === "warning") {
    p.syncLockX = p.syncCenterX;
    p.syncLockY = p.syncCenterY;
  }
  if (nextStage === "dash" && !p.syncBurstDone) {
    p.syncBurstDone = true;
    for (let i = 0; i < p.syncMarkers.length; i++) {
      const node = p.syncMarkers[i];
      const radial = Math.atan2(node.y - p.syncLockY, node.x - p.syncLockX);
      node.vx = Math.cos(radial) * 390;
      node.vy = Math.sin(radial) * 390;
      node.state = "dash";
      const aim = Math.atan2(state.player.y - node.y, state.player.x - node.x);
      spawnBullet({
        x: node.x,
        y: node.y,
        vx: Math.cos(aim) * 260,
        vy: Math.sin(aim) * 260,
        visual: STARS[(i + 2) % STARS.length],
        scale: .56,
      });
      spawnParticleBurst(node.x, node.y, "#4fd5ff", 14);
    }
    state.waves.push({ x: p.syncLockX, y: p.syncLockY, r: 16, maxR: 155, age: 0, life: .85, width: 13 });
  }
}

function updateAcademicSync(dt) {
  const p = state.pattern;
  moveBoss(dt, .07);
  if (!p.syncDashNodes) p.syncDashNodes = [];
  for (let i = p.syncDashNodes.length - 1; i >= 0; i--) {
    const node = p.syncDashNodes[i];
    node.prevX = node.x;
    node.prevY = node.y;
    node.x += node.vx * dt;
    node.y += node.vy * dt;
    node.age += dt;
    if (Math.hypot(node.x - state.player.x, node.y - state.player.y) < 22 + state.player.r) hitPlayer();
    if (node.x < -90 || node.x > W + 90 || node.y < -90 || node.y > H + 90 || node.age > 4.8) {
      p.syncDashNodes.splice(i, 1);
    }
  }
  const local = state.patternElapsed - p.syncCycleStart;
  const recordTimes = [.24, .54, .84];

  while (p.syncRecordIndex < recordTimes.length && local >= recordTimes[p.syncRecordIndex]) {
    p.syncMarkers.push({
      x: state.player.x,
      y: state.player.y,
      prevX: state.player.x,
      prevY: state.player.y,
      vx: 0,
      vy: 0,
      age: 0,
      index: p.syncRecordIndex + 1,
      state: "recorded",
      pulse: Math.random() * TAU,
    });
    p.syncRecordIndex++;
  }

  let nextStage = "record";
  if (local >= 1.10 && local < 1.72) nextStage = "converge";
  else if (local >= 1.72 && local < 2.70) nextStage = "orbit";
  else if (local >= 2.70 && local < 3.08) nextStage = "warning";
  else if (local >= 3.08 && local < 3.52) nextStage = "collapse";
  else if (local >= 3.52) nextStage = "dash";
  setSyncStage(nextStage);

  if (nextStage === "converge" || nextStage === "orbit") {
    const follow = 1 - Math.exp(-(nextStage === "orbit" ? 2.2 : 3.8) * dt);
    p.syncCenterX = lerp(p.syncCenterX, state.player.x, follow);
    p.syncCenterY = lerp(p.syncCenterY, state.player.y, follow);
  }
  if (nextStage === "orbit") p.syncAngle += dt * 2.35;
  if (nextStage === "converge") p.syncAngle += dt * 1.15;

  if (nextStage === "converge" || nextStage === "orbit" || nextStage === "warning" || nextStage === "collapse") {
    const centerX = nextStage === "warning" || nextStage === "collapse" ? p.syncLockX : p.syncCenterX;
    const centerY = nextStage === "warning" || nextStage === "collapse" ? p.syncLockY : p.syncCenterY;
    let radius = nextStage === "converge" ? 170 : 150;
    if (nextStage === "collapse") {
      const progress = clamp((local - 3.08) / .44, 0, 1);
      radius = lerp(150, 54, easeOutCubic(progress));
    }
    for (let i = 0; i < p.syncMarkers.length; i++) {
      const node = p.syncMarkers[i];
      node.prevX = node.x;
      node.prevY = node.y;
      node.age += dt;
      const angle = p.syncAngle + i * TAU / 3;
      const tx = centerX + Math.cos(angle) * radius;
      const ty = centerY + Math.sin(angle) * radius * .78;
      const follow = 1 - Math.exp(-(nextStage === "collapse" ? 12 : 6) * dt);
      node.x = lerp(node.x, tx, follow);
      node.y = lerp(node.y, ty, follow);
      node.state = nextStage;
      if (nextStage === "collapse" && Math.hypot(node.x - state.player.x, node.y - state.player.y) < 24 + state.player.r) hitPlayer();
    }

    if (nextStage === "collapse" && p.syncMarkers.length === 3) {
      for (let i = 0; i < 3; i++) {
        const a = p.syncMarkers[i];
        const b = p.syncMarkers[(i + 1) % 3];
        if (distancePointToSegment(state.player.x, state.player.y, a.x, a.y, b.x, b.y) < 12 + state.player.r) hitPlayer();
      }
    }
  }

  if (nextStage === "dash") {
    for (const node of p.syncMarkers) {
      node.prevX = node.x;
      node.prevY = node.y;
      node.x += node.vx * dt;
      node.y += node.vy * dt;
      node.age += dt;
      if (Math.hypot(node.x - state.player.x, node.y - state.player.y) < 22 + state.player.r) hitPlayer();
    }
  }

  if (local >= 4.28 && state.patternElapsed < currentPattern().duration - 4.15) {
    if (p.syncStage === "dash" && p.syncMarkers.length) {
      for (const node of p.syncMarkers) {
        p.syncDashNodes.push({ ...node });
      }
    }
    initializeAcademicSync();
  }
}

function initializeServiceQueuePhase() {
  state.pattern.serviceQueue = {
    progress: 0,
    rows: [],
    pendingRows: [],
    nextRowAt: .28,
    spawnInterval: .72,
    maxActiveRows: 4,
    minSpawnSeparation: 120,
    spawnY: 158,
    rowSerial: 0,
    completedRows: 0,
    normalRowsSpawned: 0,
    delayRowsSpawned: 0,
    finalRowsSpawned: 0,
    aheadStart: 3849,
    behind: 186,
    waitSeconds: 9,
    status: "캠퍼스 서버 접속 대기 중",
    delayTriggered: false,
    delayFlash: 0,
    finalWaveTriggered: false,
    finalWavePending: false,
    finalRowPassed: false,
    routeGapX: W / 2,
    success: false,
    successAt: 0,
    hardEndAt: 9.45,
  };
}

function queueGapStartFromCenter(count, gapWidth, spacing, centerX) {
  const startX = (W - (count - 1) * spacing) / 2;
  const centerIndex = Math.round((centerX - startX) / spacing);
  return clamp(
    centerIndex - Math.floor((gapWidth - 1) / 2),
    1,
    count - gapWidth - 1,
  );
}

function getQueueGapCenterX(count, gapWidth, spacing, gapStart) {
  const startX = (W - (count - 1) * spacing) / 2;
  return startX + (gapStart + (gapWidth - 1) / 2) * spacing;
}

function spawnServiceQueueRow(options = {}) {
  const q = state.pattern.serviceQueue;
  if (!q || q.success) return;

  const spacing = options.spacing || 34;
  const count = Math.floor((W - 34) / spacing);
  // Five empty token slots leave a visibly wide, fair corridor.
  const gapWidth = options.gapWidth || 5;
  const startX = (W - (count - 1) * spacing) / 2;
  const minGapCenter = startX + (1 + (gapWidth - 1) / 2) * spacing;
  const maxGapCenter = startX + (count - gapWidth - 1 + (gapWidth - 1) / 2) * spacing;

  let requestedCenter;
  if (typeof options.gapCenterX === "number") {
    requestedCenter = options.gapCenterX;
  } else if (typeof options.gapCenterRatio === "number") {
    requestedCenter = W * options.gapCenterRatio;
  } else {
    const base = Number.isFinite(q.routeGapX) ? q.routeGapX : state.player.x;
    const maxShift = options.maxGapShift ?? 118;
    requestedCenter = base + rand(-maxShift, maxShift);
  }

  requestedCenter = clamp(requestedCenter, minGapCenter, maxGapCenter);
  const gapStart = queueGapStartFromCenter(count, gapWidth, spacing, requestedCenter);
  const actualCenter = getQueueGapCenterX(count, gapWidth, spacing, gapStart);
  q.routeGapX = actualCenter;

  q.rows.push({
    id: ++q.rowSerial,
    state: "warning",
    age: 0,
    warningTime: options.warningTime ?? .42,
    y: options.y ?? q.spawnY,
    speed: options.speed ?? 260,
    spacing,
    count,
    gapWidth,
    gaps: [gapStart],
    gapCenterX: actualCenter,
    progressGain: options.progressGain ?? 20,
    counted: false,
    finalRow: !!options.finalRow,
    kind: options.kind || "normal",
    label: options.label || "WAIT",
    phaseOffset: Math.random() * TAU,
  });
}

function queueRowHasToken(row, index) {
  return !row.gaps.some((start) => index >= start && index < start + row.gapWidth);
}

function updateServiceQueueRows(dt) {
  const q = state.pattern.serviceQueue;
  if (!q) return;

  for (const row of q.rows) {
    row.age += dt;
    if (row.state === "warning" && row.age >= row.warningTime) {
      row.state = "moving";
      row.age = 0;
    }

    if (row.state === "moving") {
      row.y += row.speed * dt;
      const startX = (W - (row.count - 1) * row.spacing) / 2;
      for (let i = 0; i < row.count; i++) {
        if (!queueRowHasToken(row, i)) continue;
        const tx = startX + i * row.spacing;
        if (Math.hypot(state.player.x - tx, state.player.y - row.y) < 13 + state.player.r) {
          hitPlayer();
          break;
        }
      }

      // 플레이어 라인을 완전히 지나간 시점에 해당 대기열 통과로 인정합니다.
      if (!row.counted && row.y > state.player.y + state.player.r + 34) {
        row.counted = true;
        q.completedRows++;
        q.progress = Math.min(100, q.progress + row.progressGain);
        if (row.finalRow) q.finalRowPassed = true;
      }

      if (row.y > H + 48) {
        row.state = "done";
      }
    }
  }

  q.rows = q.rows.filter((row) => row.state !== "done");
}

function triggerQueueDelayEvent() {
  const q = state.pattern.serviceQueue;
  if (!q || q.delayTriggered) return;

  q.delayTriggered = true;
  q.progress = Math.max(0, q.progress - 8);
  q.waitSeconds = 9;
  q.status = "접속자가 많아 대기시간이 증가했습니다.";
  q.delayFlash = .8;

  const base = clamp(q.routeGapX || state.player.x, 220, W - 220);
  // 지연 대기열도 기존 줄 사이의 간격을 유지하며 계속 이어집니다.
  q.pendingRows.push(
    {
      kind: "delay",
      gapCenterX: base - 52,
      gapWidth: 5,
      progressGain: 15,
      speed: 258,
      warningTime: .44,
      label: "DELAY",
      maxGapShift: 70,
    },
    {
      kind: "delay",
      gapCenterX: base + 52,
      gapWidth: 5,
      progressGain: 15,
      speed: 258,
      warningTime: .44,
      label: "DELAY",
      maxGapShift: 70,
    },
  );
}

function triggerQueueFinalWave() {
  const q = state.pattern.serviceQueue;
  if (!q || q.finalWaveTriggered || q.success) return;

  q.finalWaveTriggered = true;
  q.finalWavePending = true;
  q.status = "접속 임박 · 이어지는 마지막 대기열 통로를 통과하세요.";
}

function spawnReachableQueueFinalWave() {
  const q = state.pattern.serviceQueue;
  if (!q || !q.finalWavePending || q.success) return;

  q.finalWavePending = false;
  const base = clamp(q.routeGapX || state.player.x, 230, W - 230);
  const direction = base < W / 2 ? 1 : -1;
  q.pendingRows.push(
    {
      kind: "final",
      gapCenterX: clamp(base + direction * 58, 230, W - 230),
      gapWidth: 5,
      warningTime: .46,
      speed: 255,
      progressGain: 15,
      label: "NEAR",
      maxGapShift: 65,
    },
    {
      kind: "final",
      gapCenterX: clamp(base - direction * 30, 230, W - 230),
      gapWidth: 5,
      warningTime: .46,
      speed: 255,
      progressGain: 15,
      finalRow: true,
      label: "FINAL",
      maxGapShift: 65,
    },
  );
}

function completeServiceQueuePhase() {
  const q = state.pattern.serviceQueue;
  if (!q || q.success) return;
  q.progress = 100;
  q.success = true;
  q.successAt = state.patternElapsed;
  q.status = "접속되었습니다. 수강신청 페이지로 이동합니다.";
  q.rows.length = 0;
  spawnParticleBurst(state.boss.x, state.boss.y, "#35d6b2", 34);
}

function updateServiceQueuePhase(dt) {
  moveBoss(dt, .12);
  const q = state.pattern.serviceQueue;
  if (!q) return;

  q.delayFlash = Math.max(0, q.delayFlash - dt);
  updateServiceQueueRows(dt);

  if (!q.success && state.patternElapsed >= q.hardEndAt) {
    completeServiceQueuePhase();
    return;
  }

  // 네 번째 일반 대기열이 예약되면 지연 구간을 이어 붙입니다.
  if (!q.delayTriggered && q.normalRowsSpawned >= 4) {
    triggerQueueDelayEvent();
  }

  // 지연 대기열 두 줄이 모두 생성된 직후 마지막 대기열을 예약합니다.
  if (!q.finalWaveTriggered && q.delayTriggered && q.delayRowsSpawned >= 2) {
    triggerQueueFinalWave();
  }

  spawnReachableQueueFinalWave();

  const spawnAreaClear = q.rows.every((row) =>
    row.state === "moving" && row.y >= q.spawnY + q.minSpawnSeparation
  );
  const canSpawn =
    !q.success &&
    state.patternElapsed >= q.nextRowAt &&
    q.rows.length < q.maxActiveRows &&
    spawnAreaClear;

  if (canSpawn) {
    let options = null;

    if (q.normalRowsSpawned < 4) {
      q.normalRowsSpawned++;
      options = {
        kind: "normal",
        progressGain: 12,
        gapWidth: 5,
        maxGapShift: 72,
        warningTime: .42,
        speed: 260,
        label: "WAIT",
      };
    } else if (q.pendingRows.length > 0) {
      options = q.pendingRows.shift();
    }

    if (options) {
      spawnServiceQueueRow(options);
      if (options.kind === "delay") q.delayRowsSpawned++;
      if (options.kind === "final") q.finalRowsSpawned++;
      q.nextRowAt = state.patternElapsed + q.spawnInterval;
    }
  }

  if (!q.success && q.finalRowPassed && q.progress >= 100) {
    completeServiceQueuePhase();
  }

  if (q.success && state.patternElapsed - q.successAt > .45) {
    state.pattern.lastShot = 0;
  }
}

function initializeCorruptionRollback() {
  const p = state.pattern;
  p.rollbackCycleId = 1;
  p.rollbackShotCount = 0;
  p.rollbackNextShotAt = state.patternElapsed + .45;
  p.rollbackTriggerAt = 0;
  p.rollbackStageStart = 0;
  p.rollbackState = "firing";
  p.rollbackIconSpin = 0;
  p.rollbackCompleted = false;
}

function spawnCorruptionRollbackFan(order) {
  const p = state.pattern;
  const m = bossMuzzle();
  const count = 9;
  const centers = [-.12, 0, .12];
  const center = Math.PI / 2 + centers[order - 1];
  const spread = Math.PI * 2 / 3;
  for (let i = 0; i < count; i++) {
    const normalized = count === 1 ? 0 : i / (count - 1) - .5;
    const angle = center + normalized * spread;
    const speed = 205 + order * 10 + Math.abs(normalized) * 18;
    spawnBullet({
      x: m.x + Math.cos(angle) * 16,
      y: m.y + Math.sin(angle) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      type: "rewind",
      rewindState: "out",
      rewindOrder: order,
      rewindCycle: p.rollbackCycleId,
      rewindRate: 34,
      visual: ORBS[(i + order * 2) % ORBS.length],
      scale: .62 + (i % 3) * .07,
      spin: normalized * 1.2,
    });
  }
  spawnParticleBurst(m.x, m.y, order === 3 ? "#ffffff" : "#a855f7", 12);
}

function beginCorruptionRollback() {
  const p = state.pattern;
  if (p.rollbackState !== "firing") return;
  p.rollbackState = "decelerate";
  p.rollbackStageStart = state.patternElapsed;
  for (const b of state.bullets) {
    if (b.type === "rewind" && b.rewindCycle === p.rollbackCycleId && b.rewindState === "out") {
      b.rewindState = "decelerate";
    }
  }
  spawnParticleBurst(state.boss.x, state.boss.y, "#4fd5ff", 24);
}

function updateCorruptionRollback(dt) {
  const p = state.pattern;
  moveBoss(dt, .10);
  p.rollbackIconSpin += dt * (p.rollbackState === "reverse" ? 4.4 : 1.6);

  if (p.rollbackState === "firing" && p.rollbackShotCount < 3 && state.patternElapsed >= p.rollbackNextShotAt) {
    p.rollbackShotCount++;
    spawnCorruptionRollbackFan(p.rollbackShotCount);
    p.rollbackNextShotAt += .90;
    if (p.rollbackShotCount === 3) p.rollbackTriggerAt = state.patternElapsed + .65;
  }

  if (p.rollbackState === "firing" && p.rollbackShotCount === 3 &&
    p.rollbackTriggerAt > 0 && state.patternElapsed >= p.rollbackTriggerAt) {
    beginCorruptionRollback();
  }

  if (p.rollbackState === "decelerate" && state.patternElapsed - p.rollbackStageStart >= .35) {
    p.rollbackState = "freeze";
    p.rollbackStageStart = state.patternElapsed;
    for (const b of state.bullets) {
      if (b.type === "rewind" && b.rewindCycle === p.rollbackCycleId && b.active) {
        b.rewindState = "freeze";
        b.vx = 0;
        b.vy = 0;
      }
    }
  }

  if (p.rollbackState === "freeze" && state.patternElapsed - p.rollbackStageStart >= .22) {
    p.rollbackState = "reverse";
    p.rollbackStageStart = state.patternElapsed;
    for (const b of state.bullets) {
      if (b.type === "rewind" && b.rewindCycle === p.rollbackCycleId && b.active) {
        b.rewindState = "reverse";
        b.historyIndex = b.history.length - 1;
      }
    }
  }

  if (p.rollbackState === "reverse") {
    const active = state.bullets.some(b => b.type === "rewind" && b.rewindCycle === p.rollbackCycleId && b.active);
    if (!active) {
      p.rollbackState = "complete";
      p.rollbackCompleted = true;
      spawnParticleBurst(state.boss.x, state.boss.y, "#35d6b2", 28);
    }
  }
}

function launchDilation(b, speed) {
  const dx = state.player.x-b.x;
  const dy = state.player.y-b.y;
  const d = Math.hypot(dx,dy)||1;
  b.vx = dx/d*speed;
  b.vy = dy/d*speed;
  b.dilationState = "launched";
  b.visual = "starRed";
  spawnParticleBurst(b.x,b.y,"#ec4899",3);
}

function checkLaserHit(x, y, angle, halfWidth) {
  const dx = state.player.x-x;
  const dy = state.player.y-y;
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const proj = dx*ux+dy*uy;
  if (proj<=0 || proj>3000) return;
  const cx = x+proj*ux, cy=y+proj*uy;
  if (Math.hypot(state.player.x-cx,state.player.y-cy) < halfWidth+state.player.r) hitPlayer();
}

function spawnCursors() {
  state.cursors.length = 0;
  state.activeCursor = null;
  for (let i=0;i<5;i++) {
    state.cursors.push({
      id:i,
      state:"orbit",
      x:state.boss.x,
      y:state.boss.y,
      angle:-Math.PI/2+i*TAU/5,
      orbitRadius:115+(i%2)*12,
      orbitSpeed:.9+i*.08,
      startX:0,startY:0,targetX:0,targetY:0,
      moveT:0,clickT:0,scale:1,clickDone:false,
    });
  }
  state.nextCursorAt = state.patternElapsed+.9;
  state.cursorRespawnAt = 0;
}
function chooseClickTarget() {
  const margin=88;
  const zones=[
    {x1:margin,x2:W*.35,y1:260,y2:H-margin},
    {x1:W*.35,x2:W*.65,y1:245,y2:H-margin},
    {x1:W*.65,x2:W-margin,y1:260,y2:H-margin},
  ];
  for (let attempt=0;attempt<16;attempt++) {
    const z=zones[Math.floor(Math.random()*zones.length)];
    const target={x:rand(z.x1,z.x2),y:rand(z.y1,z.y2)};
    if (!state.lastTarget || Math.hypot(target.x-state.lastTarget.x,target.y-state.lastTarget.y)>145) {
      state.lastTarget=target;
      return target;
    }
  }
  return {x:rand(margin,W-margin),y:rand(250,H-margin)};
}
function activateNextCursor() {
  if (state.activeCursor) return;
  const c=state.cursors.find(v=>v.state==="orbit");
  if (!c) {
    if (!state.cursorRespawnAt) state.cursorRespawnAt=state.patternElapsed+1.4;
    return;
  }
  const target=chooseClickTarget();
  c.state="move";
  c.startX=c.x;c.startY=c.y;c.targetX=target.x;c.targetY=target.y;
  c.moveT=0;c.clickT=0;c.clickDone=false;
  state.activeCursor=c;
}
function forceNextClick() {
  if (currentPattern().id!==54) return;
  if (state.activeCursor) {
    state.activeCursor.moveT=1;
    state.activeCursor.state="click";
    state.activeCursor.clickT=.16;
  } else activateNextCursor();
}
function createClickWave(x,y) {
  state.waves.push({x,y,r:16,maxR:180,age:0,life:1.05,width:13});
  spawnParticleBurst(x,y,"#ffffff",9);
}
function updateClickPattern(dt) {
  moveBoss(dt, .10);
  for (const c of state.cursors) {
    if (c.state==="orbit") {
      c.angle += c.orbitSpeed*dt;
      c.x = state.boss.x+Math.cos(c.angle)*c.orbitRadius;
      c.y = state.boss.y+55+Math.sin(c.angle)*c.orbitRadius*.52;
      c.scale=1+Math.sin(state.t*3+c.angle)*.035;
    } else if (c.state==="move") {
      c.moveT += dt/.72;
      const t=easeOutCubic(clamp(c.moveT,0,1));
      c.x=lerp(c.startX,c.targetX,t);c.y=lerp(c.startY,c.targetY,t);c.scale=1.06;
      if (c.moveT>=1) { c.state="click";c.clickT=0;c.x=c.targetX;c.y=c.targetY; }
    } else if (c.state==="click") {
      c.clickT+=dt;c.scale=.92+Math.sin(state.t*70)*.03;
      if (!c.clickDone && c.clickT>=.18) { createClickWave(c.targetX,c.targetY);c.clickDone=true; }
      if (c.clickT>=.34) {
        c.state="dead";
        if (state.activeCursor===c) state.activeCursor=null;
        state.nextCursorAt=state.patternElapsed+.38;
      }
    }
  }
  if (!state.activeCursor && state.patternElapsed>=state.nextCursorAt) activateNextCursor();
  if (!state.activeCursor && state.cursors.length && state.cursors.every(c=>c.state==="dead")) {
    if (!state.pattern.clickSequenceFinished) {
      state.pattern.clickSequenceFinished = true;
      state.cursorRespawnAt = 0;
      nextPattern();
    }
    return;
  }
}


function startSeatRound() {
  const p = state.pattern;
  const cols = 4;
  const rows = 2;
  const outerX = 22;
  const topY = 255;
  const bottomPad = 20;
  const gapX = 10;
  const gapY = 12;
  const cellW = (W - outerX * 2 - gapX * (cols - 1)) / cols;
  const cellH = (H - topY - bottomPad - gapY * (rows - 1)) / rows;
  const positions = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = outerX + col * (cellW + gapX);
      const top = topY + row * (cellH + gapY);
      positions.push({
        x: left + cellW / 2,
        y: top + cellH / 2,
        left,
        top,
        width: cellW,
        height: cellH,
      });
    }
  }

  const order = positions.map((_, i) => i).sort(() => Math.random() - .5);
  const safeSet = new Set(order.slice(0, 2));
  p.seats = positions.map((pos, i) => {
    const safe = safeSet.has(i);
    const dangerLabel = Math.random() < .5 ? "지각" : "결석";
    return {
      ...pos,
      safe,
      zoneLabel: safe ? "출석" : dangerLabel,
      zoneStatus: safe ? "정상 출석 · 안전" : `${dangerLabel} 처리 · 폭발`,
      pulse: Math.random() * TAU,
    };
  });
  p.seatBlasts = [];
  p.seatRoundStart = state.patternElapsed;
  p.seatRoundIndex++;
}

function playerInsideSafeSeat() {
  const p = state.pattern;
  return (p.seats || []).some((seat) => {
    if (!seat.safe) return false;
    const inset = 10;
    return state.player.x >= seat.left + inset &&
      state.player.x <= seat.left + seat.width - inset &&
      state.player.y >= seat.top + inset &&
      state.player.y <= seat.top + seat.height - inset;
  });
}

function updateSeatScramble(dt) {
  const p = state.pattern;
  moveBoss(dt, .12);
  const local = state.patternElapsed - p.seatRoundStart;

  if (local >= p.seatBlastAt && !p.seatBlasts.length) {
    for (const seat of p.seats) {
      if (seat.safe) continue;
      p.seatBlasts.push({
        x: seat.x,
        y: seat.y,
        left: seat.left,
        top: seat.top,
        width: seat.width,
        height: seat.height,
        age: 0,
        life: .78,
      });
      spawnParticleBurst(seat.x, seat.y, "#ff4e5d", 10);
    }
  }

  for (const blast of p.seatBlasts) blast.age += dt;

  const blastActive = p.seatBlasts.some((blast) => blast.age >= .06 && blast.age <= .58);
  if (blastActive && !playerInsideSafeSeat()) hitPlayer();

  p.seatBlasts = p.seatBlasts.filter((blast) => blast.age < blast.life);
  if (local >= p.seatRoundEnd) {
    if (p.seatRoundIndex >= 3) {
      if (!p.seatSequenceFinished) {
        p.seatSequenceFinished = true;
        nextPattern();
      }
      return;
    }
    startSeatRound();
  }
}

function spawnRewindShot(order) {
  const p = state.pattern;
  const m = bossMuzzle();
  const count = 7;
  const spacing = 34;
  const speed = 300;
  const sway = (order - 2) * .035;

  for (let i = 0; i < count; i++) {
    const lane = i - (count - 1) / 2;
    const angle = Math.PI / 2 + lane * .025 + sway;
    const visualPool = order % 2 === 0 ? ORBS : STARS;
    const visual = visualPool[(i + order + p.refreshCycleId) % visualPool.length];
    spawnBullet({
      x: m.x + lane * spacing,
      y: m.y + Math.abs(lane) * 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      visual,
      scale: order % 2 === 0 ? .55 : .52,
      type: "rewind",
      rewindState: "out",
      rewindOrder: order,
      rewindCycle: p.refreshCycleId,
      noCull: true,
      spin: lane * .18,
    });
  }

  spawnParticleBurst(m.x, m.y, order === 3 ? "#ffffff" : "#4fd5ff", 12);
}
function triggerRefreshRewind() {
  const p = state.pattern;
  if (p.refreshTriggered) return;
  p.refreshTriggered = true;
  p.refreshReverseStartedAt = state.patternElapsed;
  for (const b of state.bullets) {
    if (b.type === "rewind" && b.rewindCycle === p.refreshCycleId && b.rewindState === "out") {
      b.rewindState = "reverse";
      b.historyIndex = b.history.length - 1;
    }
  }
  spawnParticleBurst(state.boss.x, state.boss.y, "#4fd5ff", 22);
}

function restartRefreshCycle() {
  const p = state.pattern;
  p.refreshCycleId++;
  p.refreshShotCount = 0;
  p.refreshTriggered = false;
  p.refreshTriggerAt = 0;
  p.refreshNextShotAt = state.patternElapsed + .55;
  p.refreshRestartAt = 0;
}

function updateRefreshRewind(dt) {
  const p = state.pattern;
  moveBoss(dt, .13);
  p.refreshIconSpin += dt * (p.refreshTriggered ? 5.2 : 1.7);

  if (!p.refreshTriggered && p.refreshShotCount < 3 && state.patternElapsed >= p.refreshNextShotAt) {
    p.refreshShotCount++;
    spawnRewindShot(p.refreshShotCount);
    p.refreshNextShotAt += 1.0;

    if (p.refreshShotCount === 3) {
      // 세 번째 탄 열이 충분히 전진한 뒤 새로고침을 작동시킵니다.
      p.refreshTriggerAt = state.patternElapsed + .72;
    }
  }

  if (!p.refreshTriggered && p.refreshShotCount === 3 && p.refreshTriggerAt > 0 && state.patternElapsed >= p.refreshTriggerAt) {
    triggerRefreshRewind();
  }

  if (p.refreshTriggered) {
    const activeCycleBullets = state.bullets.some((b) =>
      b.type === "rewind" && b.rewindCycle === p.refreshCycleId && b.active
    );
    if (!activeCycleBullets) {
      if (!p.refreshRestartAt) p.refreshRestartAt = state.patternElapsed + .65;
      if (state.patternElapsed >= p.refreshRestartAt) restartRefreshCycle();
    }
  }
}

function distancePointToSegment(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1;
  const len=dx*dx+dy*dy||1;
  const t=clamp(((px-x1)*dx+(py-y1)*dy)/len,0,1);
  return Math.hypot(px-(x1+dx*t),py-(y1+dy*t));
}

function updateDuplicateSession(dt) {
  const p=state.pattern;
  moveBoss(dt,.1);
  p.sessionHistory = p.sessionHistory || [];
  p.sessionHistory.push({x:state.player.x,y:state.player.y});
  if(p.sessionHistory.length>150) p.sessionHistory.shift();

  if(state.patternElapsed>=p.nextSessionTraceAt && p.sessionHistory.length>55){
    const sample=p.sessionHistory.filter((_,i)=>i%2===0).map(v=>({...v}));
    p.sessionTraces.push({points:sample,index:0,age:0,life:3.2,active:true,color:p.sessionTraces.length%2?"#ff5f6d":"#bf6cff"});
    p.nextSessionTraceAt += 2.25;
  }

  for(const trace of p.sessionTraces){
    trace.age+=dt;
    trace.index=Math.min(trace.points.length-1,trace.index+dt*38);
    const head=Math.floor(trace.index);
    const start=Math.max(1,head-16);
    for(let i=start;i<=head;i++){
      const a=trace.points[i-1],b=trace.points[i];
      if(distancePointToSegment(state.player.x,state.player.y,a.x,a.y,b.x,b.y)<18+state.player.r){
        hitPlayer();break;
      }
    }
    if(trace.age>=trace.life) trace.active=false;
  }
  p.sessionTraces=p.sessionTraces.filter(v=>v.active);
}

function initializeLockNodes(){
  const p=state.pattern;
  const labels=["선수","전필","학점","승인"];
  p.lockNodes=labels.map((label,i)=>({label,angle:-Math.PI/2+i*TAU/4,x:0,y:0}));
  p.lockLinks=[];
  p.lockCycleStart=.35;
}

function rebuildLockLinks(){
  const p=state.pattern;
  const candidates=[[0,1],[1,2],[2,3],[3,0],[0,2],[1,3]].sort(()=>Math.random()-.5);
  p.lockLinks=candidates.slice(0,3).map(pair=>({a:pair[0],b:pair[1]}));
}

function updatePrerequisiteLocks(dt){
  const p=state.pattern;
  moveBoss(dt,.08);
  const centerX=W/2,centerY=455;
  const radiusX=300,radiusY=155;
  for(const n of p.lockNodes){
    n.angle+=dt*.36;
    n.x=centerX+Math.cos(n.angle)*radiusX;
    n.y=centerY+Math.sin(n.angle)*radiusY;
  }
  const local=state.patternElapsed-p.lockCycleStart;
  if(local>=0&&!p.lockLinks.length) rebuildLockLinks();
  const active=local>=1.05&&local<2.55;
  if(active){
    for(const link of p.lockLinks){
      const a=p.lockNodes[link.a],b=p.lockNodes[link.b];
      if(distancePointToSegment(state.player.x,state.player.y,a.x,a.y,b.x,b.y)<18+state.player.r) hitPlayer();
    }
  }
  if(local>=3.05){p.lockCycleStart=state.patternElapsed+.15;p.lockLinks=[];}
}

function makeAuthCode(){
  let code="";
  for(let i=0;i<4;i++) code+=Math.floor(Math.random()*10);
  return code;
}

function getAuthPadLayout(){
  const rect=canvas.getBoundingClientRect();
  const displayedWidth=rect.width||W;
  const compact=displayedWidth<=620||window.innerWidth<=800;

  if(compact){
    return {
      compact:true,
      columns:3,
      xs:[W*.20,W*.50,W*.80],
      startY:390,
      gapY:118,
      radius:48,
      panelWidth:Math.min(W-80,560),
      panelY:220,
    };
  }

  return {
    compact:false,
    columns:5,
    xs:[W*.12,W*.31,W*.50,W*.69,W*.88],
    startY:390,
    gapY:126,
    radius:40,
    panelWidth:Math.min(W-80,520),
    panelY:225,
  };
}

function updateAuthPadLayout(){
  const p=state.pattern;
  if(!p.authPads) return getAuthPadLayout();
  const layout=getAuthPadLayout();

  for(let i=0;i<p.authPads.length;i++){
    const pad=p.authPads[i];
    if(layout.compact&&i===9){
      pad.x=W/2;
      pad.y=layout.startY+layout.gapY*3;
    }else{
      const row=Math.floor(i/layout.columns);
      const col=i%layout.columns;
      pad.x=layout.xs[col];
      pad.y=layout.startY+row*layout.gapY;
    }
    pad.r=layout.radius;
  }
  return layout;
}

function initializeAuthCode(){
  const p=state.pattern;
  p.authCode=makeAuthCode();
  p.authInput="";
  p.authMistakes=0;
  p.authStatus="show";
  p.authSuccessAt=-1;
  p.authLastInputAt=0;
  p.authNextIdleShotAt=3.25;
  p.authIdleVolleyCount=0;
  p.authInterferenceAt=Infinity;
  p.authCursor=null;
  p.authFailedBurst=false;
  p.authFailureAt=-1;
  const digits=[0,1,2,3,4,5,6,7,8,9];
  p.authPads=digits.map(digit=>({
    digit,
    x:W/2,
    y:H/2,
    r:40,
    flash:0,
  }));
  updateAuthPadLayout();
}

function inputAuthDigit(digit){
  if(currentPattern().id!==59) return false;
  const p=state.pattern;
  if(p.authStatus!=="input") return true;
  p.authLastInputAt=state.patternElapsed;
  p.authNextIdleShotAt=state.patternElapsed+.78;
  const expected=Number(p.authCode[p.authInput.length]);
  const pad=p.authPads.find(v=>v.digit===digit);
  if(pad) pad.flash=.28;
  if(digit===expected){
    p.authInput+=String(digit);
    spawnParticleBurst(pad?.x??W/2,pad?.y??H/2,"#74d84d",7);
    if(p.authInput.length===4){
      p.authStatus="success";
      p.authSuccessAt=state.patternElapsed;
      spawnParticleBurst(state.boss.x,state.boss.y,"#74d84d",28);
    }
  }else{
    p.authMistakes++;
    p.authInput="";
    triggerScreenShake(30, .52);
    state.hitFlash = Math.max(state.hitFlash, .22);
    if(pad){
      for(let i=0;i<8;i++){
        const a=i/8*TAU;
        spawnBullet({x:pad.x,y:pad.y,vx:Math.cos(a)*210,vy:Math.sin(a)*210,visual:ORBS[i%ORBS.length],scale:.72});
      }
    }
    if(p.authMistakes>=3) triggerAuthFailure();
  }
  return true;
}

function triggerAuthFailure(){
  const p=state.pattern;
  if(p.authFailedBurst) return;
  p.authFailedBurst=true;
  p.authStatus="failed";
  p.authFailureAt=state.patternElapsed;

  // 인증 실패는 작은 탄막 패널티 대신 학사 서버 전체가 터지는 광역 폭발로 처리한다.
  // 현재 탄/파동은 모두 지우고, 강한 화면 흔들림과 연속 폭발을 보여준 뒤 플레이어 HP만 1칸 감소시킨다.
  state.bullets.length=0;
  state.waves.length=0;
  state.cursors.length=0;
  state.activeCursor=null;
  state.mouse.down=false;
  state.hitFlash=Math.max(state.hitFlash,.72);
  triggerScreenShake(72,1.35);

  // 중앙 대폭발 + 화면 곳곳의 연쇄 폭발을 겹쳐 광역기 규모를 크게 보이게 한다.
  spawnParticleBurst(W*.5,H*.52,"#ffffff",38);
  spawnParticleBurst(W*.5,H*.52,"#ffcc45",34);
  for(let i=0;i<30;i++){
    const ex=rand(W*.04,W*.96);
    const ey=rand(H*.06,H*.94);
    const color=i%4===0?"#ffffff":i%3===0?"#ffd95c":i%2===0?"#ff7a38":"#ff3428";
    spawnParticleBurst(ex,ey,color,rand(10,20));
  }
  adapter.fatalHit?.();
}

function fireAuthIdleVolley(){
  const p=state.pattern;
  const muzzle=bossMuzzle();
  const aim=Math.atan2(state.player.y-muzzle.y,state.player.x-muzzle.x);
  const volley=p.authIdleVolleyCount++;

  if(volley%2===0){
    // Small three-way corruption burst aimed at the current player position.
    for(let i=-1;i<=1;i++){
      const a=aim+i*.13;
      const speed=215+Math.abs(i)*12;
      spawnBullet({
        x:muzzle.x,
        y:muzzle.y,
        vx:Math.cos(a)*speed,
        vy:Math.sin(a)*speed,
        visual:ORBS[(volley+i+ORBS.length)%ORBS.length],
        scale:.72,
      });
    }
  }else{
    // Alternating wing shots keep the keypad phase dangerous without using click bullets.
    for(const side of [-1,1]){
      const wing=wingMuzzle(side);
      const a=Math.atan2(state.player.y-wing.y,state.player.x-wing.x)+side*.045;
      spawnBullet({
        x:wing.x,
        y:wing.y,
        vx:Math.cos(a)*238,
        vy:Math.sin(a)*238,
        visual:STARS[(volley+(side>0?1:0))%STARS.length],
        scale:.76,
      });
    }
  }
  spawnParticleBurst(muzzle.x,muzzle.y,"#ff5f6d",6);
}

function updateAuthCodePattern(dt){
  const p=state.pattern;
  moveBoss(dt,.06);
  for(const pad of p.authPads||[]) pad.flash=Math.max(0,pad.flash-dt);

  if(p.authStatus==="show"&&state.patternElapsed>=2.55){
    p.authStatus="input";
    p.authLastInputAt=state.patternElapsed;
    p.authNextIdleShotAt=state.patternElapsed+.68;
  }

  // 입력하지 않거나 입력 도중 멈추면 보스가 계속 플레이어를 향해 탄을 발사합니다.
  // 숫자를 누를 때마다 잠시 유예되고, 성공하면 즉시 발사가 중단됩니다.
  // 광역 폭발이 발생한 뒤에는 추가 탄막을 더 생성하지 않는다.
  if(p.authStatus==="input"&&state.patternElapsed>=p.authNextIdleShotAt){
    fireAuthIdleVolley();
    const baseInterval=state.story?1.02:.84;
    p.authNextIdleShotAt=state.patternElapsed+baseInterval;
  }

  if(p.authStatus==="input"&&state.patternElapsed>=10.3) triggerAuthFailure();
  if(p.authStatus==="success" && p.authSuccessAt>=0 && state.patternElapsed-p.authSuccessAt>=1.0){
    p.authSuccessAt=Infinity;
    nextPattern();
    return;
  }

  // Pattern 59에서는 자동 마우스 커서 간섭과 클릭 파동탄을 생성하지 않습니다.
  // 숫자 패드는 플레이어가 직접 마우스로 클릭하거나 숫자 키로 입력합니다.
  p.authCursor=null;
}

function initializeQueueTokens(){
  const p=state.pattern;
  p.queueTokens=Array.from({length:5},(_,i)=>({
    number:5-i,
    state:"waiting",
    angle:-Math.PI/2+i*TAU/5,
    x:state.boss.x,y:state.boss.y,
    launchAt:.95+i*1.22,
    lockAge:0,
  }));
  p.queueCycleStart=state.patternElapsed;
}

function updateServerQueue(dt){
  const p=state.pattern;
  moveBoss(dt,.09);
  const local=state.patternElapsed-p.queueCycleStart;
  for(const token of p.queueTokens){
    if(token.state==="waiting"){
      token.angle+=dt*.72;
      token.x=state.boss.x+Math.cos(token.angle)*145;
      token.y=state.boss.y+45+Math.sin(token.angle)*80;
      if(local>=token.launchAt){token.state="lock";token.lockAge=0;}
    }else if(token.state==="lock"){
      token.lockAge+=dt;
      if(token.lockAge>=.55){
        const a=Math.atan2(state.player.y-token.y,state.player.x-token.x);
        spawnBullet({x:token.x,y:token.y,vx:Math.cos(a)*430,vy:Math.sin(a)*430,visual:STARS[(5-token.number)%STARS.length],scale:.72});
        for(const side of[-1,1]){
          spawnBullet({x:token.x,y:token.y,vx:Math.cos(a+side*.18)*330,vy:Math.sin(a+side*.18)*330,visual:ORBS[(token.number+side+6)%ORBS.length],scale:.42});
        }
        spawnParticleBurst(token.x,token.y,"#4fd5ff",10);
        token.state="done";
      }
    }
  }
  if(local>=7.45) initializeQueueTokens();
}

function updateBullets(dt) {
  const movementMult = state.story ? .62 : .8;
  for (const b of state.bullets) {
    if (!b.active) continue;
    b.age += dt;
    b.rotation += b.spin*dt;

    if (b.type==="sine") {
      const speed = Math.hypot(b.baseVx, b.baseVy) || 1;
      const px = -b.baseVy / speed;
      const py = b.baseVx / speed;
      const lateral = Math.sin(b.age * b.sineFreq) * b.sineAmp;
      b.vx = b.baseVx + px * lateral;
      b.vy = b.baseVy + py * lateral;
    }
    if (b.type==="delayed") {
      b.homingTimer-=dt;
      if (b.homingTimer>0) {
        const brake=Math.pow(.95,dt*60);
        b.vx*=brake;b.vy*=brake;
      } else if (!b.delayedTriggered) {
        b.delayedTriggered=true;
        const a=Math.atan2(b.vy,b.vx);
        b.vx=Math.cos(a)*320*(state.story?.52:1);
        b.vy=Math.sin(a)*320*(state.story?.52:1);
      }
    }
    if (b.type==="dilation") {
      if (b.dilationState==="flying") {
        const brake=Math.pow(.92,dt*60);
        b.vx*=brake;b.vy*=brake;
        if (Math.hypot(b.vx,b.vy)<4) {
          b.vx=0;
          b.vy=0;
          b.dilationState="frozen";
          b.dilationFrozenAt=b.age;
        }
      } else if (b.dilationState==="frozen") {
        const frozenFor = b.dilationFrozenAt >= 0 ? b.age - b.dilationFrozenAt : 0;
        const patternAlreadyChanged = b.sourcePattern === 19 && currentPattern().id !== 19;
        if (patternAlreadyChanged || frozenFor >= (b.dilationHold ?? .45)) {
          launchDilation(b, 590);
        }
      }
    }

    const oldX=b.x, oldY=b.y;
    let movedByRewind=false;
    if(b.type==="rewind"){
      if(b.rewindState==="out"){
        b.history.push({x:b.x,y:b.y});
        if(b.history.length>420)b.history.shift();
      }else if(b.rewindState==="decelerate"){
        b.history.push({x:b.x,y:b.y});
        if(b.history.length>420)b.history.shift();
        const brake=Math.pow(.84,dt*60);
        b.vx*=brake;b.vy*=brake;
      }else if(b.rewindState==="freeze"){
        movedByRewind=true;
      }else if(b.rewindState==="reverse"){
        movedByRewind=true;
        b.historyIndex-=dt*(b.rewindRate||22);
        const hi=Math.floor(b.historyIndex);
        if(hi<=0){b.active=false;}
        else{const a=b.history[hi],c=b.history[Math.max(0,hi-1)];const f=b.historyIndex-hi;b.x=lerp(c.x,a.x,f);b.y=lerp(c.y,a.y,f);}
      }
    }
    if(!movedByRewind){
      b.x += b.vx*movementMult*dt;
      b.y += b.vy*movementMult*dt;
    }


    if (b.type==="ricochet" && b.bounceCount<b.maxBounces) {
      if (b.x<8) {b.x=8;b.vx=Math.abs(b.vx);b.bounceCount++;spawnParticleBurst(b.x,b.y,"#ffd142",3);}
      else if (b.x>W-8) {b.x=W-8;b.vx=-Math.abs(b.vx);b.bounceCount++;spawnParticleBurst(b.x,b.y,"#ffd142",3);}
      if (b.y<8) {b.y=8;b.vy=Math.abs(b.vy);b.bounceCount++;}
    }

    const metric=COMMON[b.visual];
    const hitR=(metric?.radius||10)*b.scale*.6;
    if (Math.hypot(b.x-state.player.x,b.y-state.player.y)<hitR+state.player.r) {
      b.active=false;hitPlayer();
    }
    if (!b.noCull && (b.x<-120||b.x>W+120||b.y<-120||b.y>H+120)) b.active=false;
    b.prevX=oldX;b.prevY=oldY;
  }
  state.bullets=state.bullets.filter(b=>b.active);

  if (state.story && state.bullets.length>64) {
    const excess=state.bullets.length-64;
    state.bullets.splice(0,excess);
  }
}

function updateWaves(dt) {
  for (const w of state.waves) {
    w.age+=dt;
    const p=clamp(w.age/w.life,0,1);
    w.r=lerp(16,w.maxR,easeOutCubic(p));
    const d=Math.hypot(w.x-state.player.x,w.y-state.player.y);
    if (Math.abs(d-w.r)<w.width*.52+state.player.r) hitPlayer();
  }
  state.waves=state.waves.filter(w=>w.age<w.life);
}
function updateParticles(dt) {
  for (const p of state.particles) {
    p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    const drag=Math.pow(.12,dt);p.vx*=drag;p.vy*=drag;
  }
  state.particles=state.particles.filter(p=>p.age<p.life);
}
function getPlayerMovementBounds() {
  const id = currentPattern().id;
  const p = state.pattern;
  const r = state.player.r;
  if (id === 55 && (p.seats || []).length) {
    const left = Math.min(...p.seats.map(seat => seat.left));
    const right = Math.max(...p.seats.map(seat => seat.left + seat.width));
    const top = Math.min(...p.seats.map(seat => seat.top));
    const bottom = Math.max(...p.seats.map(seat => seat.top + seat.height));
    return { minX:left+r, maxX:right-r, minY:top+r, maxY:bottom-r };
  }
  if (id === 62) {
    return { minX:7+r, maxX:W-7-r, minY:292+r, maxY:H-12-r };
  }
  return { minX:24, maxX:W-24, minY:245, maxY:H-24 };
}

function updatePlayer(dt) {
  const external = adapter.getPlayer();
  state.player.x = external.x;
  state.player.y = external.y;
  state.player.r = external.radius;
  state.player.invuln = external.invulnerable ? Math.max(state.player.invuln, .05) : Math.max(0, state.player.invuln - dt);
  state.playerHistory.push({x:state.player.x,y:state.player.y});
  if(state.playerHistory.length>180)state.playerHistory.shift();
}
function spawnPlayerBullet(offsetX) {
  state.playerBullets.push({
    x: state.player.x + offsetX,
    y: state.player.y - 18,
    vx: 0,
    vy: -PLAYER_BULLET_SPEED,
    age: 0,
    active: true,
    damage: PLAYER_BULLET_DAMAGE,
  });
}

function updatePlayerAttack(dt) {}

function updatePlayerBullets(dt) {}

function updateBackground(dt) {
  for (const s of state.stars) {s.y+=s.v*dt;if(s.y>H+3){s.y=-3;s.x=Math.random()*W;}}
}

function update(dt) {
  state.t += dt;
  state.screenShakeTime = Math.max(0, state.screenShakeTime - dt);
  if (state.screenShakeTime <= 0) state.screenShakePower = 0;
  updateBackground(dt);
  if (state.cinematicMode !== "battle") {
    updateCinematic(dt);
    state.hitFlash = Math.max(0, state.hitFlash - dt);
    return;
  }
  updatePlayer(dt);
  updatePlayerAttack(dt);

  if (state.battleStartState !== "active") {
    updateBattleStartSequence(dt);
    updatePlayerBullets(dt);
    updateParticles(dt);
    state.hitFlash = Math.max(0, state.hitFlash - dt);
    return;
  }

  if (state.bossStageState === "phase1clear") {
    updatePhase1Clear(dt);
  } else if (state.bossStageState === "awakening") {
    updateAwakening(dt);
  } else if (state.bossStageState === "defeated") {
    state.boss.x = lerp(state.boss.x, W / 2, 1 - Math.exp(-2.2 * dt));
  } else {
    state.patternElapsed += dt;
    updatePattern(dt);
    updateBossHealth(dt);
    if (state.auto && !SELF_COMPLETING_PATTERN_IDS.has(currentPattern().id) && state.patternElapsed >= currentPattern().duration && ["stage1", "stage2"].includes(state.bossStageState)) {
      nextPattern();
    }
  }

  updatePlayerBullets(dt);
  updateBullets(dt);
  updateWaves(dt);
  updateParticles(dt);
  state.hitFlash = Math.max(0, state.hitFlash - dt);
}



function drawCinematicBackground(type, t) {
  drawBossBattleBackground("cinematic", t);

  if (type === "intro") {
    const scan = clamp((t - .45) / 1.75, 0, 1);
    if (scan > 0 && scan < 1) {
      const sy = lerp(-70, H + 70, scan);
      const g = ctx.createLinearGradient(0, sy - 65, 0, sy + 65);
      g.addColorStop(0, "rgba(255,61,82,0)");
      g.addColorStop(.5, "rgba(255,61,82,.19)");
      g.addColorStop(1, "rgba(255,61,82,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, sy - 65, W, 130);
      ctx.strokeStyle = "rgba(255,109,121,.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(W, sy);
      ctx.stroke();
    }
  }
}

function drawCinematicBossLayer(image, x, y, w, h, alpha = 1, filter = "none") {
  if (!image || !image.complete || !image.naturalWidth) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter = filter;
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

function drawCinematicEntranceTitle(t) {
  const p = smoothstep((t - 3.3) / .65);
  const out = 1 - smoothstep((t - 5.15) / .5);
  const a = p * out;
  if (a <= 0) return;
  const y = lerp(H - 215, H - 255, p);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(5, 12, 29, .84)";
  ctx.strokeStyle = "#ff5265";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 310, y - 46, 620, 92, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f3e7c9";
  ctx.font = "900 28px sans-serif";
  ctx.fillText("수강신청 게이트키퍼", W / 2, y - 9);
  ctx.fillStyle = "#ff7a89";
  ctx.font = "900 13px sans-serif";
  ctx.fillText("ACADEMIC SERVER ACCESS DENIED", W / 2, y + 24);
  ctx.restore();
}

function drawCinematicIntroBoss(t) {
  const entryP = easeOutCubic(clamp((t - 1.25) / 2.15, 0, 1));
  const settleP = smoothstep((t - 3.25) / .8);
  const dockP = smoothstep((t - 5.05) / .75);
  const centerY = lerp(-280, 385, entryP) + Math.sin(t * 2.7) * 4 * settleP;
  const y = lerp(centerY, 175, dockP);
  const x = W / 2 + Math.sin(t * 1.2) * 3 * settleP * (1 - dockP);
  const w = lerp(510, state.boss.drawW, dockP);
  const h = lerp(384, state.boss.drawH, dockP);

  const glitch = t > .8 && t < 2.85 ? (1 - clamp((t - .8) / 2.05, 0, 1)) : 0;
  if (glitch > 0) {
    for (let i = 0; i < 5; i++) {
      drawCinematicBossLayer(getActiveBossImage(), x + rand(-26, 26) * glitch, y + rand(-8, 8), w, h, .11 + glitch * .08, `hue-rotate(${i % 2 ? 300 : 165}deg) saturate(1.7)`);
    }
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 4.2) * .008 * settleP * (1 - dockP));
  if (entryP < .98) {
    ctx.shadowColor = "#ff3f55";
    ctx.shadowBlur = 26;
  }
  drawCinematicBossLayer(getActiveBossImage(), 0, 0, w, h, 1);
  ctx.restore();

  const ringAlpha = clamp((t - 2.25) / .8, 0, 1) * (1 - clamp((t - 4.55) / .7, 0, 1));
  if (ringAlpha > 0) {
    ctx.save();
    ctx.translate(x, y + 18);
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = "#ff4d60";
    ctx.shadowColor = "#ff4d60";
    ctx.shadowBlur = 18;
    ctx.lineWidth = 5;
    ctx.rotate(t * 1.9);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 210 + i * 20, i * 1.7, i * 1.7 + 1.25);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (t > 1.15 && t < 3.45) {
    ctx.save();
    const p = clamp((t - 1.15) / 2.3, 0, 1);
    for (let i = 0; i < 22; i++) {
      const a = i * TAU / 22 + t * .25;
      const rr = lerp(460, 120, easeInOutCubic(p));
      const sx = x + Math.cos(a) * rr;
      const sy = y + Math.sin(a) * rr * .58;
      ctx.globalAlpha = .25 + .65 * (1 - p);
      ctx.fillStyle = i % 3 === 0 ? "#ffffff" : "#ff4d60";
      ctx.shadowColor = "#ff4d60";
      ctx.shadowBlur = 12;
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
    }
    ctx.restore();
  }

  drawCinematicEntranceTitle(t);
}

function drawCinematicRings() {
  for (const r of state.cinematicRings) {
    if (r.age < 0) continue;
    const p = clamp(r.age / r.life, 0, 1);
    ctx.save();
    ctx.globalAlpha = (1 - p) * .8;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = Math.max(2, r.width * (1 - p));
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.maxR * easeOutCubic(p), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawCinematicParticles() {
  for (const p of state.cinematicParticles) {
    const k = 1 - p.age / p.life;
    ctx.save();
    ctx.globalAlpha = clamp(k, 0, 1);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 9;
    const size = p.size * (.45 + k);
    if (p.square) ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, size / 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawDestroyingProjectiles() {
}

function drawCinematicDestructionBoss(t) {
  const explosionEnd = 3.0;
  const bossExitEnd = 4.15;
  const preLaunch = clamp(t / explosionEnd, 0, 1);
  const x = state.destructionBossX;
  const y = state.destructionBossY;
  const w = state.boss.drawW;
  const h = state.boss.drawH;
  const shakeStrength = t < explosionEnd ? (5 + preLaunch * 10) : 0;
  const sx = Math.sin(t * 70) * shakeStrength;
  const sy = Math.cos(t * 58) * shakeStrength * .62;

  // 폭발 중에는 흔들리고, 폭발이 끝난 뒤에는 현재 2페이즈 외형 그대로 위로 이탈합니다.
  if (t < bossExitEnd) {
    ctx.save();
    if (t < explosionEnd) ctx.translate(sx, sy);
    drawCinematicBossLayer(bossPhase2Image, x, y, w, h, 1);
    ctx.restore();
  }

  if (t < explosionEnd) {
    const pulse = .52 + Math.sin(t * 15) * .16;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = .75;
    ctx.strokeStyle = "#ffd84a";
    ctx.shadowColor = "#ffb21f";
    ctx.shadowBlur = 30;
    ctx.lineWidth = 6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 120 + i * 34 + Math.sin(t * 8 + i) * 14, t * (1.25 + i * .22), t * (1.25 + i * .22) + Math.PI * (pulse + .5));
      ctx.stroke();
    }
    ctx.restore();

    const flash = .28 + Math.max(0, Math.sin(t * 24)) * .32;
    ctx.save();
    ctx.globalAlpha = flash;
    const g = ctx.createRadialGradient(x, y, 28, x, y, Math.max(w, h) * .72);
    g.addColorStop(0, "rgba(255,255,220,.95)");
    g.addColorStop(.25, "rgba(255,216,74,.82)");
    g.addColorStop(.55, "rgba(255,159,31,.34)");
    g.addColorStop(1, "rgba(255,159,31,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(w, h) * .72, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // 위로 이탈하는 동안 별도의 불꽃이나 추진광은 표시하지 않습니다.


}

function drawCinematicHpBar(hpRatio, alpha, stateLabel) {
  if (alpha <= 0) return;
  const x = W / 2;
  const y = 28;
  const outerW = 610;
  const outerH = 48;
  const trackX = x - outerW / 2 + 18;
  const trackY = y + 13;
  const trackW = outerW - 36;
  const trackH = 22;
  const fillW = Math.max(0, (trackW - 6) * clamp(hpRatio, 0, 1));
  const purified = stateLabel === "";
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(6, 14, 33, .9)";
  ctx.strokeStyle = "#08090d";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(x - outerW / 2, y, outerW, outerH, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#efe2c5";
  ctx.beginPath();
  ctx.roundRect(x - outerW / 2 + 7, y + 7, outerW - 14, outerH - 14, 13);
  ctx.fill();
  ctx.fillStyle = "#0d1423";
  ctx.beginPath();
  ctx.roundRect(trackX, trackY, trackW, trackH, 9);
  ctx.fill();
  if (fillW > 0) {
    const grad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
    grad.addColorStop(0, purified ? "#74f2d6" : "#ff7f8f");
    grad.addColorStop(1, purified ? "#32b9c8" : "#cf2337");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(trackX + 3, trackY + 3, fillW, trackH - 6, 7);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(5, 12, 28, .84)";
  ctx.beginPath();
  ctx.roundRect(x - 175, y - 14, 350, 32, 13);
  ctx.fill();
  ctx.strokeStyle = purified ? "#52dfc2" : "#e54859";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = purified ? "#ddfff7" : "#f2e5c8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 18px sans-serif";
  ctx.fillText("수강신청 게이트키퍼", x, y + 2);
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#f2e6ca";
  ctx.fillText("BOSS HP", trackX + 10, trackY + trackH / 2);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${Math.ceil(hpRatio * 100)}%`, trackX + trackW - 10, trackY + trackH / 2);
  // 시네마틱 게이지 아래의 상태 문구도 표시하지 않습니다.
  ctx.restore();
}

function renderCinematic() {
  const type = state.cinematicMode;
  const t = state.cinematicTime;
  let cameraX = 0;
  let cameraY = 0;
  if (type === "destroy" && t < 3.1) {
    const p = 1 - clamp(t / 3.1, 0, 1);
    cameraX = Math.sin(t * 88) * 4.5 * p;
    cameraY = Math.cos(t * 73) * 3 * p;
  }
  ctx.save();
  ctx.translate(cameraX, cameraY);
  drawCinematicBackground(type, t);
  drawCinematicRings();
  if (type === "intro") drawCinematicIntroBoss(t);
  else drawCinematicDestructionBoss(t);
  drawCinematicParticles();
  ctx.restore();

  if (type === "destroy") {
    // 호반우가 화면 밖으로 빠진 뒤 전체 화면을 검게 페이드하고 약 2초간 유지합니다.
    const blackFadeStart = 5.35;
    const blackFullAt = 5.80;
    if (t >= blackFadeStart) {
      const alpha = smoothstep((t - blackFadeStart) / Math.max(.01, blackFullAt - blackFadeStart));
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}

function drawBackground() {
  drawBossBattleBackground("battle", 0);
}

function drawBoss() {
  const b = state.boss;
  const awakening = state.bossStageState === "awakening";
  const awakened = state.bossStage === 2 || awakening;
  const bob = Math.sin(state.t * (awakened ? 2.35 : 1.8)) * (awakened ? 7 : 5);
  const shake = awakening ? Math.sin(state.t * 58) * (1 - clamp(state.awakeningElapsed / state.awakeningDuration, 0, 1)) * 9 : 0;
  const tilt = Math.sin(state.t * (awakened ? 1.35 : .9)) * (awakened ? .018 : .012);

  if (awakened) {
    ctx.save();
    ctx.translate(b.x, b.y + bob);
    const auraAlpha = awakening ? .42 : .18;
    ctx.globalAlpha = auraAlpha;
    ctx.strokeStyle = awakening ? "#ff5f6d" : "#4fd5ff";
    ctx.lineWidth = awakening ? 9 : 5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 24;
    for (let i = 0; i < 3; i++) {
      const radius = 150 + i * 32 + Math.sin(state.t * 3 + i) * 8;
      ctx.beginPath();
      ctx.arc(0, 0, radius, state.t * (.35 + i * .12), state.t * (.35 + i * .12) + Math.PI * 1.25);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(b.x + shake, b.y + bob);
  ctx.rotate(tilt);
  const scale = awakening ? 1 + Math.sin(state.t * 12) * .025 : 1;
  ctx.scale(scale, scale);
  const activeBossImage = getActiveBossImage();
  if (activeBossImage.complete && activeBossImage.naturalWidth) {
    ctx.drawImage(activeBossImage, -b.drawW / 2, -b.drawH / 2, b.drawW, b.drawH);
  } else {
    ctx.fillStyle = "#e7dcc2";
    ctx.strokeStyle = "#0a0a0d";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(-150, -80, 300, 180, 30);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}


function drawHealthTrack({ y, label, value, max, active, locked, colorA, colorB, awakening }) {
  const x = W / 2;
  const outerW = 660;
  const outerH = 28;
  const labelW = 154;
  const valueW = 132;
  const trackX = x - outerW / 2 + labelW;
  const trackW = outerW - labelW - valueW;
  const ratio = clamp(max > 0 ? value / max : 0, 0, 1);
  const glow = active || awakening;

  ctx.save();
  ctx.shadowColor = glow ? colorB : "rgba(0,0,0,.24)";
  ctx.shadowBlur = glow ? 15 : 7;
  ctx.fillStyle = active ? "#efe3c6" : "rgba(43,52,73,.92)";
  ctx.strokeStyle = active ? "#0a0a0d" : "rgba(111,126,161,.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x - outerW / 2, y, outerW, outerH, 12);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = active ? "#111827" : "#151d31";
  ctx.beginPath();
  ctx.roundRect(trackX, y + 6, trackW, outerH - 12, 7);
  ctx.fill();

  if (ratio > 0) {
    const grad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
    grad.addColorStop(0, colorA);
    grad.addColorStop(1, colorB);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(trackX + 2, y + 8, Math.max(0, (trackW - 4) * ratio), outerH - 16, 5);
    ctx.fill();
  }

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = active ? "#10131a" : "#c7d0e8";
  ctx.font = "900 12px sans-serif";
  ctx.fillText(label, x - outerW / 2 + 14, y + outerH / 2 + .5);

  ctx.textAlign = "right";
  ctx.fillStyle = locked ? "#8d9ab9" : active ? "#10131a" : "#ffffff";
  ctx.font = "900 12px sans-serif";
  const valueText = locked ? "LOCKED" : `${Math.ceil(ratio * 100)}% · ${Math.ceil(value)}/${max}`;
  ctx.fillText(valueText, x + outerW / 2 - 13, y + outerH / 2 + .5);
  ctx.restore();
}

function drawBossHealthBar() {
  const stage1Active = state.bossStageState === "stage1";
  const phase1Clear = state.bossStageState === "phase1clear";
  const awakening = state.bossStageState === "awakening";
  const stage2Active = state.bossStageState === "stage2";
  const defeated = state.bossStageState === "defeated";
  const stage2Sequence = state.bossStage === 2 && (stage2Active || awakening || defeated);

  const ratio = stage1Active || phase1Clear
    ? clamp(state.stage1Hp / STAGE1_MAX_HP, 0, 1)
    : awakening || stage2Active
      ? clamp(state.stage2Hp / STAGE2_MAX_HP, 0, 1)
      : 0;

  const currentValue = stage1Active || phase1Clear
    ? state.stage1Hp
    : awakening || stage2Active
      ? state.stage2Hp
      : 0;

  const currentMax = stage1Active || phase1Clear ? STAGE1_MAX_HP : STAGE2_MAX_HP;
  const percentText = `${Math.ceil(ratio * 100)}%`;
  const preBattleCharging = state.battleStartState === "charging";
  const preBattleWaiting = state.battleStartState === "waiting";
  const waitRemaining = Math.max(0, (state.bossStage === 2 ? STAGE2_PATTERN_START_DELAY : BOSS_PATTERN_START_DELAY) - state.battleStartElapsed);
  const stageBadge = preBattleCharging
    ? stage2Sequence ? "2페 준비" : "기동 중"
    : preBattleWaiting
      ? stage2Sequence ? "2페 대기" : "전투 대기"
      : phase1Clear ? "1페 종료" : stage1Active ? "1페이즈" : awakening ? "각성" : defeated ? "격파" : "2페이즈";
  const stageLine = preBattleCharging
    ? `${stage2Sequence ? '2페이즈' : '1페이즈'} 체력 충전 중 · ${Math.ceil(ratio * 100)}%`
    : preBattleWaiting
      ? `게이지 충전 완료 · 패턴 개시까지 ${waitRemaining.toFixed(1)}초`
      : phase1Clear
        ? `1페이즈 종료 연출 진행 중 · 2페이즈 각성 준비`
        : stage1Active
          ? ""
      : awakening
        ? `2페이즈 각성 · 체력 재구축 중 · ${Math.ceil(ratio * 100)}%`
        : defeated
          ? ``
          : "";

  const knuRedLight = '#ef6776';
  const knuRed = '#cf233d';
  const knuGray = '#7b7771';
  const knuBlueLight = '#8ecfd7';
  const knuBlue = '#4f9db0';
  const knuCream = '#e9ddc4';
  const knuTrack = '#07172f';
  const badgeBlue = '#dff9ff';
  const badgeRed = '#ffe2e6';

  const accentA = (stage1Active || phase1Clear) ? knuBlueLight : knuRedLight;
  const accentB = (stage1Active || phase1Clear) ? knuBlue : knuRed;
  const capColor = (stage1Active || phase1Clear) ? '#6fb8c4' : '#d5344b';
  const stageTextColor = phase1Clear ? '#bdeeff' : stage1Active ? '#8fd9e5' : awakening ? '#ffb6bf' : defeated ? '#a9efd7' : '#ff93a1';
  const pulse = (awakening || phase1Clear || (!stage1Active && !phase1Clear && ratio < .25 && !defeated)) ? 1 + Math.sin(state.t * 10) * .03 : 1;

  const x = W / 2;
  const titleY = 6;
  const titleW = 332;
  const titleH = 32;
  const outerY = 43;
  const outerW = 566;
  const outerH = 38;
  const innerPad = 18;
  const innerInset = 3;
  const trackX = -outerW / 2 + innerPad;
  const trackY = outerY + 9;
  const trackW = outerW - innerPad * 2;
  const trackH = outerH - 18;
  const fillX = trackX + innerInset;
  const fillY = trackY + innerInset;
  const fillH = trackH - innerInset * 2;
  const fillW = Math.max(0, (trackW - innerInset * 2) * ratio);

  ctx.save();
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(0,0,0,.3)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(5, 16, 44, .88)';
  ctx.strokeStyle = '#0a0a0d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x - titleW / 2, titleY, titleW, titleH, 14);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#f3e7c9';
  ctx.textAlign = 'center';
  ctx.font = '900 18px sans-serif';
  ctx.fillText('수강신청 게이트키퍼', x, titleY + titleH / 2 + 1);

  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(pulse, 1);

  ctx.shadowColor = awakening ? 'rgba(255,83,113,.38)' : 'rgba(0,0,0,.22)';
  ctx.shadowBlur = awakening ? 18 : 8;
  ctx.fillStyle = knuCream;
  ctx.strokeStyle = '#0a0a0d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(-outerW / 2, outerY, outerW, outerH, 16);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (const side of [-1, 1]) {
    ctx.fillStyle = capColor;
    ctx.strokeStyle = '#0a0a0d';
    ctx.lineWidth = 4;
    const capX = side < 0 ? -outerW / 2 - 4 : outerW / 2 - 24;
    ctx.beginPath();
    ctx.roundRect(capX, outerY + 5, 28, outerH - 10, 10);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = knuTrack;
  ctx.strokeStyle = '#18253f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(trackX, trackY, trackW, trackH, 9);
  ctx.fill();
  ctx.stroke();

  if (fillW > 0) {
    const grad = ctx.createLinearGradient(fillX, 0, fillX + trackW, 0);
    grad.addColorStop(0, accentA);
    grad.addColorStop(.55, accentB);
    grad.addColorStop(1, accentB);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackW, trackH, 9);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(fillX, fillY, fillW, fillH, 7);
    ctx.fill();
    ctx.globalAlpha = .18;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fillX + 6, fillY + 2, Math.max(0, fillW - 12), 4);
    ctx.globalAlpha = .10;
    for (let sx = fillX + 16; sx < fillX + fillW; sx += 34) {
      ctx.fillRect(sx, fillY, 8, fillH);
    }
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(trackX + .6, trackY + .6, trackW - 1.2, trackH - 1.2, 8);
  ctx.stroke();

  // left badge
  ctx.fillStyle = (stage1Active || phase1Clear) ? 'rgba(143,217,229,.18)' : defeated ? 'rgba(123,230,194,.16)' : 'rgba(255,105,123,.16)';
  ctx.beginPath();
  ctx.roundRect(trackX + 6, trackY + 2, 82, trackH - 4, 8);
  ctx.fill();
  ctx.fillStyle = (stage1Active || phase1Clear) ? badgeBlue : defeated ? '#d9fff2' : badgeRed;
  ctx.textAlign = 'center';
  ctx.font = '900 11px sans-serif';
  ctx.fillText(stageBadge, trackX + 47, trackY + trackH / 2 + .5);

  // right percent badge
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath();
  ctx.roundRect(trackX + trackW - 74, trackY + 2, 68, trackH - 4, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '900 12px sans-serif';
  ctx.fillText(percentText, trackX + trackW - 40, trackY + trackH / 2 + .5);

  ctx.restore();

  // 게이지 하단의 페이즈 전환·충전·대기 상태 문구는 표시하지 않습니다.

  ctx.restore();
}


function drawAwakeningOverlay() {
  if (state.bossStageState !== "awakening") return;
  const t = state.awakeningElapsed;
  const progress = clamp(t / state.awakeningDuration, 0, 1);
  const flash = Math.max(0, 1 - t / .6);
  const textAlpha = clamp((t - .35) / .45, 0, 1) * (1 - clamp((t - 2.9) / .5, 0, 1));
  const ringProgress = easeOutCubic(clamp((t - .2) / 2.45, 0, 1));
  const worldRadius = Math.max(W, H) * (0.42 + ringProgress * 0.34);

  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, `rgba(34, 0, 6, ${0.26 + flash * 0.24})`);
  bg.addColorStop(.5, `rgba(80, 0, 12, ${0.08 + flash * 0.12})`);
  bg.addColorStop(1, `rgba(5, 7, 14, ${0.74 + flash * 0.12})`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = flash * .34;
  ctx.fillStyle = "#ff3345";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = .18 + (1 - progress) * .14;
  ctx.strokeStyle = "rgba(255,58,76,.25)";
  ctx.lineWidth = 2;
  for (let x = -W * .1; x <= W * 1.1; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, H * .18);
    ctx.lineTo(x + W * .12, H);
    ctx.stroke();
  }
  for (let y = H * .22; y <= H; y += 58) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = textAlpha * .9;
  const panelWidth = W * .24;
  const panelHeight = H * .66;
  const panelY = H * .17;
  const leftX = -panelWidth * .18;
  const rightX = W - panelWidth * .82;
  const makePanelGradient = (x0: number, x1: number) => {
    const g = ctx.createLinearGradient(x0, panelY, x1, panelY + panelHeight);
    g.addColorStop(0, "rgba(86, 0, 12, .74)");
    g.addColorStop(1, "rgba(9, 12, 22, .38)");
    return g;
  };
  ctx.fillStyle = makePanelGradient(leftX, leftX + panelWidth);
  ctx.fillRect(leftX, panelY, panelWidth, panelHeight);
  ctx.fillStyle = makePanelGradient(rightX + panelWidth, rightX);
  ctx.fillRect(rightX, panelY, panelWidth, panelHeight);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 74, 94, .68)";
  ctx.strokeRect(leftX, panelY, panelWidth, panelHeight);
  ctx.strokeRect(rightX, panelY, panelWidth, panelHeight);
  ctx.restore();

  ctx.save();
  ctx.translate(state.boss.x, state.boss.y + 18);
  ctx.strokeStyle = `rgba(255,95,109,${.92 - progress * .28})`;
  ctx.shadowColor = "#ff5f6d";
  ctx.shadowBlur = 32;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 72 + worldRadius, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = `rgba(79,213,255,${.76 - progress * .18})`;
  ctx.beginPath();
  ctx.arc(0, 0, 42 + worldRadius * .78, -state.t * 2.2, -state.t * 2.2 + Math.PI * 1.45);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = `rgba(255, 214, 110, ${.48 - progress * .16})`;
  ctx.beginPath();
  ctx.arc(0, 0, 28 + worldRadius * .54, state.t * 2.4, state.t * 2.4 + Math.PI * 1.86);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = textAlpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#ff3345";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#ffffff";
  ctx.font = "1000 42px sans-serif";
  ctx.fillText("2페이즈 각성", W / 2, 360);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffb6bf";
  ctx.font = "900 15px sans-serif";
  ctx.fillText("학사 시스템 전투 프로토콜 해제", W / 2, 397);
  ctx.restore();
}


function drawDefeatOverlay() {
  if (state.bossStageState !== "defeated" || state.cinematicMode !== "battle") return;
  const age = Math.max(0, state.t - state.battleDefeatedAt);
  ctx.save();
  ctx.globalAlpha = clamp(age / .45, 0, 1);
  ctx.fillStyle = "rgba(3, 7, 16, .68)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff4b0";
  ctx.shadowColor = "#ffb21f";
  ctx.shadowBlur = 24;
  ctx.font = "1000 40px sans-serif";
  ctx.fillText("BOSS CLEAR", W / 2, H / 2 - 12);
  ctx.shadowBlur = 0;
  ctx.font = "900 15px sans-serif";
  ctx.fillStyle = "#ffd84a";
  ctx.fillText("수강신청 게이트키퍼 격파", W / 2, H / 2 + 34);
  ctx.restore();
}

function drawPhase1ClearOverlay() {
  if (state.bossStageState !== "phase1clear") return;
  const t = clamp(state.phaseClearElapsed / Math.max(.01, state.phaseClearDuration), 0, 1);
  const alpha = Math.sin(t * Math.PI);
  ctx.save();
  ctx.globalAlpha = .18 + alpha * .2;
  ctx.fillStyle = "rgba(79,213,255,.28)";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.translate(state.boss.x, state.boss.y + 18);
  ctx.globalAlpha = .45 + alpha * .4;
  ctx.strokeStyle = "#8fd9e5";
  ctx.shadowColor = "#4fd5ff";
  ctx.shadowBlur = 22;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, 52 + easeOutCubic(t) * 210, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,244,196,.95)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 28 + easeOutCubic(t) * 160, -state.t * 2.4, -state.t * 2.4 + Math.PI * 1.25);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#4fd5ff";
  ctx.shadowBlur = 18;
  ctx.font = "1000 34px sans-serif";
  ctx.fillText("1페이즈 클리어", W / 2, 360);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#bdeeff";
  ctx.font = "900 14px sans-serif";
  ctx.fillText("보스 전투 시스템 재구성 중", W / 2, 392);
  ctx.restore();
}

function drawStarPath(points, outer, inner) {
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const r=i%2===0?outer:inner;const a=-Math.PI/2+i*Math.PI/points;
    const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();
}
function drawGlow(color,r,intensity=.85){ctx.save();ctx.globalAlpha*=intensity*.18;ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,r*1.8,0,TAU);ctx.fill();ctx.globalAlpha*=1.4;ctx.beginPath();ctx.arc(0,0,r*1.32,0,TAU);ctx.fill();ctx.restore();}
function drawCommonBullet(b) {
  const style=COMMON[b.visual];if(!style)return;
  const pulse=1+Math.sin(state.t*(style.kind==="orb"?6:5)+b.age)*.035;
  const r=style.radius*b.scale;
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rotation);ctx.scale(pulse,pulse);
  drawGlow(style.glow,r,.88);
  if(style.kind==="orb"){
    ctx.fillStyle=style.fill;ctx.strokeStyle="#09090f";ctx.lineWidth=Math.max(2,r*.18);ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.stroke();
    ctx.strokeStyle=style.ring;ctx.lineWidth=Math.max(1.5,r*.14);ctx.beginPath();ctx.arc(0,0,r*.68,0,TAU);ctx.stroke();
    ctx.fillStyle=style.core;ctx.beginPath();ctx.arc(r*.12,r*.08,r*.34,0,TAU);ctx.fill();
    ctx.fillStyle=style.highlight;ctx.beginPath();ctx.arc(-r*.32,-r*.35,r*.18,0,TAU);ctx.fill();
  }else{
    ctx.fillStyle=style.outer;ctx.strokeStyle="#09090e";ctx.lineWidth=Math.max(2,r*.15);drawStarPath(style.points,r,r*style.innerRatio);ctx.fill();ctx.stroke();
    ctx.fillStyle=style.inner;drawStarPath(style.points,r*.52,r*.24);ctx.fill();
    ctx.fillStyle="rgba(255,255,255,.86)";ctx.beginPath();ctx.arc(-r*.12,-r*.2,r*.1,0,TAU);ctx.fill();
  }
  if(state.showHitbox){ctx.strokeStyle="rgba(255,255,255,.8)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r*.6,0,TAU);ctx.stroke();}
  ctx.restore();
}

function drawLaser() {
  if(currentPattern().id!==17)return;
  const p=state.pattern;const cycle=p.shootTimer%2.8;const m=bossMuzzle();
  if(cycle>=2.5)return;
  const firing=cycle>=1.8;const locking=cycle>=1.2&&cycle<1.8;
  const len=1800;const ex=m.x+Math.cos(p.laserAngle)*len,ey=m.y+Math.sin(p.laserAngle)*len;
  ctx.save();
  if(firing){
    const hue=(state.t*80)%360;ctx.strokeStyle=`hsla(${hue},90%,62%,.88)`;ctx.lineWidth=44;ctx.shadowColor=`hsla(${hue},95%,55%,.95)`;ctx.shadowBlur=25;ctx.setLineDash([]);
  }else{
    ctx.strokeStyle=locking?(Math.floor(state.t*14)%2?"rgba(255,255,255,.9)":"rgba(244,63,94,.8)"):"rgba(79,213,255,.62)";
    ctx.lineWidth=locking?5:2;ctx.setLineDash(locking?[]:[9,7]);ctx.shadowColor=locking?"#f43f5e":"#38bdf8";ctx.shadowBlur=locking?16:5;
  }
  ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(ex,ey);ctx.stroke();
  if(firing){ctx.strokeStyle="#fff";ctx.lineWidth=10;ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(ex,ey);ctx.stroke();}
  ctx.restore();
}

function drawWave(w) {
  const p=w.age/w.life,a=1-p;
  ctx.save();ctx.globalAlpha=a;ctx.strokeStyle="#ff3445";ctx.lineWidth=w.width;ctx.shadowColor="#ff3445";ctx.shadowBlur=13;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,TAU);ctx.stroke();
  ctx.strokeStyle="#fff4c4";ctx.lineWidth=3;ctx.shadowBlur=0;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,TAU);ctx.stroke();
  if(state.showHitbox){ctx.globalAlpha=a*.45;ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.beginPath();ctx.arc(w.x,w.y,w.r+w.width*.5,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(w.x,w.y,Math.max(0,w.r-w.width*.5),0,TAU);ctx.stroke();}
  ctx.restore();
}
function drawCursorShape(x,y,rotation,scale,pressed){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(scale,scale);ctx.lineJoin="round";ctx.lineCap="round";ctx.lineWidth=5;ctx.strokeStyle="#050508";ctx.fillStyle=pressed?"#e9edf5":"#fff";
  ctx.beginPath();ctx.moveTo(-9,-22);ctx.lineTo(24,7);ctx.lineTo(7,11);ctx.lineTo(16,31);ctx.lineTo(5,36);ctx.lineTo(-4,15);ctx.lineTo(-18,28);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle="#5b6475";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-9);ctx.lineTo(7,9);ctx.stroke();ctx.restore();
}
function drawCursors() {
  for(const c of state.cursors){if(c.state==="dead")continue;const rot=Math.atan2(state.player.y-c.y,state.player.x-c.x)-Math.PI*.25;const shake=c.state==="click"?Math.sin(state.t*80)*4:0;drawCursorShape(c.x+shake,c.y,rot,c.scale,c.state==="click");
    if(c.state==="click"){ctx.save();ctx.globalAlpha=clamp(c.clickT*4,0,1);ctx.strokeStyle="#ff3345";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(c.targetX-16,c.targetY-16);ctx.lineTo(c.targetX+16,c.targetY+16);ctx.moveTo(c.targetX+16,c.targetY-16);ctx.lineTo(c.targetX-16,c.targetY+16);ctx.stroke();ctx.restore();}
  }
}
function drawParticles(){for(const p of state.particles){const a=1-p.age/p.life;ctx.save();ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);ctx.restore();}}
function drawPlayerBullet(b){
  const length = 18;
  const width = 5.5;
  const glow = state.bossStageState === "stage2" ? "#ff6a7b" : "#62d6ff";
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.shadowColor = glow;
  ctx.shadowBlur = 12;
  const grad = ctx.createLinearGradient(0, -length, 0, length);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(.45, "#ffe7ad");
  grad.addColorStop(1, glow);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -length);
  ctx.lineTo(width, -2);
  ctx.lineTo(width * .6, length * .55);
  ctx.lineTo(0, length);
  ctx.lineTo(-width * .6, length * .55);
  ctx.lineTo(-width, -2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#0a0a0d";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.fillRect(-1.2, -length + 4, 2.4, length * .95);
  ctx.restore();
}
function drawPlayerBullets(){ adapter.drawPlayerBullets?.(ctx); }
function drawPlayer(){ adapter.drawPlayer?.(ctx, state.player); }



function drawQueuePersonToken(x, y, radius, danger, phase, label) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = 1 + Math.sin(state.t * 16 + phase) * .045;
  ctx.scale(pulse, pulse);
  ctx.shadowColor = danger ? "#ff5f6d" : "#35d6b2";
  ctx.shadowBlur = danger ? 14 : 9;
  ctx.fillStyle = danger ? "#641824" : "#e9fffb";
  ctx.strokeStyle = danger ? "#ff8a95" : "#35d6b2";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = danger ? "#fff1f3" : "#158b78";
  ctx.beginPath();
  ctx.arc(0, -4, 4.2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-7, 2, 14, 8, 4);
  ctx.fill();

  if (label === "FINAL" && Math.floor(state.t * 8 + phase) % 2 === 0) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawServiceQueuePanel() {
  const q = state.pattern.serviceQueue;
  if (!q) return;
  const panelW = 455;
  const panelH = 154;
  // 서비스 접속 대기창은 중앙 정렬을 유지하되 보스 본체 아래에 배치합니다.
  const panelX = (W - panelW) / 2;
  const bossBottom = state.boss.y + state.boss.drawH / 2;
  const panelY = Math.min(H - panelH - 24, bossBottom + 18);
  const shake = q.delayFlash > 0 ? q.delayFlash * 5 : 0;
  const ox = Math.sin(state.t * 63) * shake;
  const oy = Math.cos(state.t * 57) * shake * .45;
  const ahead = Math.max(0, Math.round(q.aheadStart * (1 - q.progress / 100)));
  const wait = q.success ? 0 : Math.max(1, Math.ceil(q.waitSeconds * (1 - q.progress / 100)));
  const minute = Math.floor(wait / 60);
  const second = wait % 60;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.shadowColor = q.delayFlash > 0 ? "#ff5f6d" : "rgba(53,214,178,.35)";
  ctx.shadowBlur = q.delayFlash > 0 ? 24 : 10;
  ctx.fillStyle = "rgba(250,253,253,.94)";
  ctx.strokeStyle = q.success ? "#35d6b2" : q.delayFlash > 0 ? "#ff5f6d" : "#8adfd0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "900 20px sans-serif";
  ctx.fillStyle = "#171a22";
  ctx.fillText(q.success ? "서비스 접속이 완료되었습니다." : "서비스", panelX + 18, panelY + 28);
  if (!q.success) {
    const prefixWidth = ctx.measureText("서비스").width;
    ctx.fillStyle = "#22bca3";
    ctx.fillText(" 접속대기", panelX + 18 + prefixWidth, panelY + 28);
    const prefix2 = prefixWidth + ctx.measureText(" 접속대기").width;
    ctx.fillStyle = "#171a22";
    ctx.fillText(" 중입니다.", panelX + 18 + prefix2, panelY + 28);
  }

  ctx.textAlign = "right";
  ctx.font = "800 14px sans-serif";
  ctx.fillStyle = q.delayFlash > 0 ? "#d92f48" : "#343945";
  ctx.fillText(`예상대기시간 : ${minute}분 ${String(second).padStart(2, "0")}초`, panelX + panelW - 18, panelY + 28);

  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(panelX + 18, panelY + 52, panelW - 36, 20);
  ctx.fillStyle = q.success ? "#35d6b2" : "#28c5ad";
  ctx.fillRect(panelX + 18, panelY + 52, (panelW - 36) * q.progress / 100, 20);
  ctx.strokeStyle = "rgba(0,0,0,.08)";
  ctx.strokeRect(panelX + 18, panelY + 52, panelW - 36, 20);

  ctx.textAlign = "left";
  ctx.font = "700 13px sans-serif";
  ctx.fillStyle = "#4b5260";
  ctx.fillText(`현재 앞 대기자 ${ahead}명, 뒤 대기자 ${q.behind}명입니다.`, panelX + 18, panelY + 91);
  ctx.fillText(q.status, panelX + 18, panelY + 113);
  ctx.font = "800 12px sans-serif";
  ctx.fillStyle = q.delayTriggered && !q.success ? "#d92f48" : "#5c6472";
  ctx.fillText("※ 재접속하면 대기시간이 더 길어집니다.", panelX + 18, panelY + 136);

  ctx.textAlign = "right";
  ctx.font = "900 13px monospace";
  ctx.fillStyle = "#128a76";
  ctx.fillText(`${Math.round(q.progress)}%`, panelX + panelW - 18, panelY + 91);
  ctx.restore();
}

function drawServiceQueueRows() {
  const q = state.pattern.serviceQueue;
  if (!q) return;
  for (const row of q.rows) {
    const warning = row.state === "warning";
    const startX = (W - (row.count - 1) * row.spacing) / 2;
    const warnProgress = warning ? clamp(row.age / row.warningTime, 0, 1) : 1;
    const shake = warning ? warnProgress * 3.6 : 0;

    for (const gapStart of row.gaps) {
      const left = startX + (gapStart - .55) * row.spacing;
      const width = (row.gapWidth + .1) * row.spacing;
      ctx.save();
      ctx.globalAlpha = warning ? .35 + warnProgress * .45 : .22;
      ctx.fillStyle = "rgba(53,214,178,.20)";
      ctx.strokeStyle = "#35d6b2";
      ctx.lineWidth = warning ? 3 : 1.5;
      ctx.setLineDash(warning ? [8, 6] : [4, 7]);
      ctx.beginPath();
      ctx.roundRect(left, row.y - 29, width, 58, 14);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    for (let i = 0; i < row.count; i++) {
      if (!queueRowHasToken(row, i)) continue;
      const x = startX + i * row.spacing + Math.sin(state.t * 28 + i + row.phaseOffset) * shake;
      const y = row.y + Math.cos(state.t * 25 + i * .7 + row.phaseOffset) * shake * .55;
      drawQueuePersonToken(x, y, 12.5, warning, i * .37 + row.phaseOffset, row.label);
    }

    if (warning) {
      ctx.save();
      ctx.globalAlpha = .52 + Math.sin(state.t * 20) * .22;
      ctx.fillStyle = "#ff6c7d";
      ctx.textAlign = "center";
      ctx.font = "900 13px sans-serif";
      ctx.fillText(row.finalRow ? "접속 임박 · 최종 대기열" : "대기열 이동 경고", W / 2, row.y - 35);
      ctx.restore();
    }
  }
}

function drawServiceQueuePhase() {
  drawServiceQueuePanel();
  drawServiceQueueRows();
}

function drawSeatScramble(){
  const p = state.pattern;
  const local = state.patternElapsed - p.seatRoundStart;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(7,14,30,.82)';
  ctx.strokeStyle = '#78c8ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(W/2-105, 207, 210, 38, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 14px sans-serif';
  ctx.fillText(`출석 쟁탈전 ${Math.min(3, p.seatRoundIndex)} / 3`, W/2, 227);
  ctx.restore();
  const warningProgress = clamp((local - p.seatWarnStart) / Math.max(.001, p.seatBlastAt - p.seatWarnStart), 0, 1);
  const warningActive = local >= p.seatWarnStart && local < p.seatBlastAt;

  for (const seat of p.seats || []) {
    const safe = seat.safe;
    const dangerPulse = warningActive && !safe ? Math.sin(state.t * (18 + warningProgress * 22) + seat.pulse) : 0;
    const shake = warningActive && !safe ? warningProgress * 5.5 : 0;
    const scale = warningActive && !safe ? 1 + warningProgress * .035 + Math.abs(dangerPulse) * .02 : 1;

    ctx.save();
    ctx.translate(seat.x + Math.sin(state.t * 31 + seat.pulse) * shake, seat.y + Math.cos(state.t * 27 + seat.pulse) * shake);
    ctx.scale(scale, scale);
    ctx.shadowColor = safe ? "#74d84d" : "#ff5f6d";
    ctx.shadowBlur = safe ? 15 : 12 + warningProgress * 24;
    ctx.fillStyle = safe ? "rgba(31,95,44,.42)" : `rgba(85,19,28,${.34 + warningProgress * .26})`;
    ctx.strokeStyle = safe ? "#a7f3a0" : (warningActive && dangerPulse > 0 ? "#ffffff" : "#ff7a86");
    ctx.lineWidth = safe ? 4 : 3 + warningProgress * 5;
    ctx.beginPath();
    ctx.roundRect(-seat.width / 2, -seat.height / 2, seat.width, seat.height, 22);
    ctx.fill();
    ctx.stroke();

    const boxW = Math.min(150, seat.width * .62);
    const boxH = 64;
    ctx.fillStyle = safe ? "rgba(27,107,47,.9)" : "rgba(121,24,38,.9)";
    ctx.strokeStyle = safe ? "#b8ffb2" : "#ff7a86";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 17px sans-serif";
    ctx.fillText(seat.zoneLabel, 0, -8);
    ctx.font = "800 12px sans-serif";
    ctx.fillStyle = safe ? "#d9ffd2" : "#ffd8dc";
    const dangerText = warningActive ? `${seat.zoneLabel} 존 · 폭발 임박` : seat.zoneStatus;
    ctx.fillText(safe ? seat.zoneStatus : dangerText, 0, 15);
    ctx.restore();
  }

  for (const blast of p.seatBlasts || []) {
    const progress = clamp(blast.age / blast.life, 0, 1);
    const expand = .92 + Math.sin(progress * Math.PI) * .07;
    ctx.save();
    ctx.translate(blast.x, blast.y);
    ctx.scale(expand, expand);
    ctx.globalAlpha = 1 - progress * .68;
    ctx.shadowColor = "#ff3345";
    ctx.shadowBlur = 28;
    ctx.fillStyle = `rgba(255,45,66,${.72 - progress * .32})`;
    ctx.strokeStyle = progress < .45 ? "#ffffff" : "#ffb6be";
    ctx.lineWidth = 7 - progress * 3;
    ctx.beginPath();
    ctx.roundRect(-blast.width / 2, -blast.height / 2, blast.width, blast.height, 22);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha *= .55;
    ctx.fillStyle = "rgba(255,225,160,.72)";
    ctx.beginPath();
    ctx.roundRect(-blast.width * .38, -blast.height * .35, blast.width * .76, blast.height * .7, 16);
    ctx.fill();
    ctx.restore();
  }
}

function drawCorruptionRollback(){
  const p = state.pattern;
  if (p.rollbackState === "firing") return;
  const reverse = p.rollbackState === "reverse";
  const complete = p.rollbackState === "complete";
  const color = complete ? "#74d84d" : reverse ? "#35d6b2" : "#4fd5ff";
  const label = complete ? "ROLLBACK COMPLETE" : reverse ? "DATA ROLLBACK" : p.rollbackState === "freeze" ? "REFRESH LOCK" : "REFRESHING";
  ctx.save();
  ctx.translate(state.boss.x, state.boss.y - 10);
  ctx.rotate(p.rollbackIconSpin);
  ctx.globalAlpha = .78 + Math.sin(state.t * 22) * .18;
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(0, 0, 58, .35, TAU - .6);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(52, -28);
  ctx.lineTo(78, -18);
  ctx.lineTo(56, -3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "1000 14px monospace";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillText(label, state.boss.x, state.boss.y + 76);
  ctx.restore();
}

function drawDuplicateSessions(){
  for(const trace of state.pattern.sessionTraces||[]){
    const head=Math.floor(trace.index);const start=Math.max(0,head-28);
    ctx.save();ctx.strokeStyle=trace.color;ctx.lineWidth=22;ctx.globalAlpha=.22;ctx.shadowColor=trace.color;ctx.shadowBlur=16;ctx.beginPath();
    for(let i=start;i<=head;i++){const pt=trace.points[i];if(i===start)ctx.moveTo(pt.x,pt.y);else ctx.lineTo(pt.x,pt.y);}ctx.stroke();
    ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.globalAlpha=.8;ctx.stroke();
    const pt=trace.points[head];if(pt){ctx.fillStyle=trace.color;ctx.beginPath();ctx.arc(pt.x,pt.y,15,0,TAU);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();}
    ctx.restore();
  }
}

function drawPrerequisiteLocks(){
  const p=state.pattern;const local=state.patternElapsed-p.lockCycleStart;const active=local>=1.05&&local<2.55;const warning=local<1.05;
  for(const link of p.lockLinks||[]){const a=p.lockNodes[link.a],b=p.lockNodes[link.b];ctx.save();ctx.strokeStyle=active?"#ff3345":"#ffd142";ctx.lineWidth=active?30:5;ctx.globalAlpha=active?.72:.65;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=active?20:8;ctx.setLineDash(warning?[12,8]:[]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
  for(const n of p.lockNodes||[]){ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle="#151925";ctx.strokeStyle="#f2e6ca";ctx.lineWidth=4;ctx.shadowColor="#dc3342";ctx.shadowBlur=12;ctx.beginPath();ctx.arc(0,0,34,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="900 14px sans-serif";ctx.fillText(n.label,0,1);ctx.restore();}
}

function drawAuthCode(){
  const p=state.pattern;
  const layout=updateAuthPadLayout();
  const panelX=W/2-layout.panelWidth/2;
  const panelH=108;
  const titleY=layout.panelY+25;
  const codeY=layout.panelY+68;

  ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillStyle="rgba(5,10,25,.82)";ctx.strokeStyle="#6f86bd";ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(panelX,layout.panelY,layout.panelWidth,panelH,18);ctx.fill();ctx.stroke();
  ctx.fillStyle="#dce6ff";
  ctx.font=layout.compact?"800 18px sans-serif":"800 16px sans-serif";
  ctx.fillText("수강신청 4자리 인증코드",W/2,titleY);
  const shown=p.authStatus==="show"?p.authCode:p.authInput.padEnd(4,"_").split("").join("  ");
  ctx.fillStyle=p.authStatus==="success"?"#74d84d":p.authStatus==="failed"?"#ff5f6d":"#fff";
  ctx.font=layout.compact?"1000 42px monospace":"1000 38px monospace";
  ctx.fillText(shown,W/2,codeY);
  if(p.authStatus==="success"){
    // SUCCESS는 모든 보스/탄막 렌더링이 끝난 뒤 최상단 오버레이로 그립니다.
  }else if(p.authStatus==="failed"){
    ctx.font="900 18px sans-serif";
    ctx.fillText("AUTH FAILED",W/2,layout.panelY+128);
  }

  const padsLocked=p.authStatus==="show";
  const padUnlockFade=padsLocked?0:clamp((state.patternElapsed-2.55)/.22,0,1);
  const padOpacity=padsLocked?.20:(.38+.62*padUnlockFade);
  for(const pad of p.authPads||[]){
    ctx.save();
    ctx.translate(pad.x,pad.y);
    ctx.globalAlpha=padOpacity;
    const hot=pad.flash>0;
    ctx.fillStyle=hot?"#74d84d":padsLocked?"#10182b":"#1b294b";
    ctx.strokeStyle=hot?"#d9ffd2":padsLocked?"#53617e":"#8298cb";
    ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,pad.r,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle=padsLocked?"#8791aa":"#fff";
    ctx.font=layout.compact?"1000 30px monospace":"1000 25px monospace";
    ctx.fillText(String(pad.digit),0,1);
    ctx.restore();
  }
  ctx.restore();
}

function drawAuthResultTopOverlay(){
  const p=state.pattern;
  if(currentPattern().id!==59) return;

  if(p.authStatus==="failed" && p.authFailureAt>=0){
    const age=Math.max(0,state.patternElapsed-p.authFailureAt);
    const flash=1-smoothstep(clamp(age/1.18,0,1));
    ctx.save();

    // 첫 순간 화면 전체가 흰색으로 터지고, 바로 주황/적색 충격파가 뒤따른다.
    const whiteFlash=1-smoothstep(clamp(age/.22,0,1));
    if(whiteFlash>0){
      ctx.globalAlpha=.92*whiteFlash;
      ctx.fillStyle="#ffffff";
      ctx.fillRect(0,0,W,H);
      ctx.globalAlpha=1;
    }

    const g=ctx.createRadialGradient(W*.5,H*.52,12,W*.5,H*.52,Math.max(W,H)*.92);
    g.addColorStop(0,`rgba(255,255,242,${.98*flash})`);
    g.addColorStop(.14,`rgba(255,221,92,${.96*flash})`);
    g.addColorStop(.38,`rgba(255,93,38,${.88*flash})`);
    g.addColorStop(.72,`rgba(166,14,8,${.74*flash})`);
    g.addColorStop(1,`rgba(40,0,0,${.58*flash})`);
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);

    // 두 겹의 충격파 링을 빠르게 확장시켜 거대한 폭발의 압력을 표현한다.
    const ringProgress=clamp(age/.92,0,1);
    const ringEase=1-Math.pow(1-ringProgress,3);
    for(let ring=0;ring<2;ring++){
      const delayed=clamp(ringEase-ring*.16,0,1);
      if(delayed<=0) continue;
      const radius=Math.max(W,H)*(0.08+delayed*.82);
      ctx.globalAlpha=(1-delayed)*(.95-ring*.2);
      ctx.strokeStyle=ring===0?"#fff6c9":"#ffb02e";
      ctx.lineWidth=18-ring*7;
      ctx.shadowColor=ring===0?"#ffffff":"#ff6a1f";
      ctx.shadowBlur=34;
      ctx.beginPath();
      ctx.arc(W*.5,H*.52,radius,0,TAU);
      ctx.stroke();
    }

    ctx.globalAlpha=.78*flash;
    ctx.fillStyle="#ffffff";
    for(let i=0;i<16;i++){
      const a=i/16*TAU+age*1.05;
      const r=Math.max(W,H)*(.10+age*.78);
      ctx.beginPath();
      ctx.arc(W*.5+Math.cos(a)*r*.38,H*.52+Math.sin(a)*r*.3,46+age*190,0,TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  if(p.authStatus==="success"){
    const age=p.authSuccessAt>=0&&Number.isFinite(p.authSuccessAt)?Math.max(0,state.patternElapsed-p.authSuccessAt):0;
    const pulse=1+Math.sin(age*10)*.025;
    ctx.save();
    ctx.translate(W/2,92);
    ctx.scale(pulse,pulse);
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.shadowColor="#50ff8a";
    ctx.shadowBlur=30;
    ctx.fillStyle="#ffffff";
    ctx.font="1000 58px sans-serif";
    ctx.strokeStyle="rgba(0,25,12,.92)";
    ctx.lineWidth=9;
    ctx.strokeText("SUCCESS",0,0);
    ctx.fillText("SUCCESS",0,0);
    ctx.restore();
  }
}

function drawServerQueue(){
  const p=state.pattern;
  for(const token of p.queueTokens||[]){if(token.state==="done")continue;ctx.save();ctx.translate(token.x,token.y);const locked=token.state==="lock";ctx.shadowColor=locked?"#ff5f6d":"#4fd5ff";ctx.shadowBlur=locked?20:12;ctx.fillStyle=locked?"#641824":"#10284e";ctx.strokeStyle=locked?"#ff8a95":"#9fe9ff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,31,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="1000 20px monospace";ctx.fillText(String(token.number),0,-3);ctx.font="800 9px sans-serif";ctx.fillText(locked?"CONNECT":"WAIT",0,16);ctx.restore();if(locked){ctx.save();ctx.strokeStyle="rgba(255,95,109,.72)";ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(token.x,token.y);ctx.lineTo(state.player.x,state.player.y);ctx.stroke();ctx.restore();}}
}


function drawAnnouncementOverload() {
  const p = state.pattern;

  // 별도의 제목/설명 사각형 없이 전광판과 중앙 통과선만 표시합니다.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8,8]);
  ctx.beginPath();
  ctx.moveTo(W/2, 205);
  ctx.lineTo(W/2, H-30);
  ctx.stroke();
  ctx.restore();

  const attackPalette = {
    required: ['#ffd142', '필독 · 3연 별탄'],
    change: ['#bf6cff', '변경 · 곡선 오염탄'],
    urgent: ['#ff5f6d', '긴급 · 조준 별탄'],
    maintenance: ['#4fd5ff', '점검 · 원형 파동'],
  };

  for (const row of p.tickerRows || []) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,18,38,.24)';
    ctx.strokeStyle = 'rgba(91,121,182,.48)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, row.y-34, W-80, 68, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    for (const item of row.items) {
      if (item.x < -220 || item.x > W+220) continue;
      const danger = !!item.attack;
      const palette = danger ? attackPalette[item.attack] : ['#78c8ff', item.text];
      const nearCenter = Math.abs(item.x-W/2) < 88;
      ctx.save();
      ctx.translate(item.x, row.y);
      const pulse = nearCenter && danger ? 1 + Math.sin(state.t*22)*.05 : 1;
      ctx.scale(pulse,pulse);
      ctx.globalAlpha = danger ? 1 : .22;
      ctx.shadowColor = palette[0];
      ctx.shadowBlur = danger ? 16 : 0;
      ctx.fillStyle = danger ? 'rgba(36,17,45,.96)' : 'rgba(25,42,70,.52)';
      ctx.strokeStyle = danger ? palette[0] : 'rgba(120,200,255,.42)';
      ctx.lineWidth = danger ? 4 : 1.5;
      ctx.beginPath();
      ctx.roundRect(-item.width/2,-24,item.width,48,10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = danger ? '#ffffff' : '#b7c9e8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = danger ? '1000 15px sans-serif' : '900 14px sans-serif';
      ctx.fillText(item.text,0,-3);
      ctx.font = '800 9px sans-serif';
      ctx.fillStyle = danger ? palette[0] : '#91a5c7';
      ctx.fillText(danger ? palette[1] : '일반 공지',0,13);
      ctx.restore();
    }
  }

  for (const attack of p.tickerAttacks || []) {
    const pulse = .65 + Math.sin(state.t*26 + attack.age*8)*.25;
    ctx.save();
    ctx.globalAlpha = attack.fired ? Math.max(0,1-(attack.age-.42)/.5) : pulse;
    ctx.strokeStyle = attackPalette[attack.type][0];
    ctx.fillStyle = 'rgba(6,11,24,.88)';
    ctx.lineWidth = 4;
    ctx.shadowColor = attackPalette[attack.type][0];
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(attack.x, attack.y, 34 + attack.age*18, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.font='1000 11px sans-serif';
    ctx.fillText(attack.type==='required'?'필독':attack.type==='change'?'변경':attack.type==='urgent'?'긴급':'점검', attack.x, attack.y);
    ctx.restore();
  }
}

function drawClassroomRoute() {
  const p = state.pattern;
  const route = p.classroomRoute;
  if (!route) return;
  const local = state.patternElapsed - p.classroomCycleStart;
  const active = local >= p.classroomDangerStart && local < p.classroomDangerEnd;
  const warningLead = .72;
  const warningStart = p.classroomDangerStart - warningLead;
  const warning = local >= warningStart && local < p.classroomDangerStart;
  const warningProgress = clamp((local - warningStart) / warningLead, 0, 1);
  const laneWidth = W / 4;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(6,13,31,.86)';
  ctx.strokeStyle = '#78c8ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 255, 205, 510, 70, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px sans-serif';
  ctx.fillText(`목표 강의실: ${route.targetRoom}`, W / 2, 230);
  ctx.font = '700 12px sans-serif';
  ctx.fillStyle = '#a9c8ff';
  ctx.fillText('올바른 안내 칸으로 이동하십시오', W / 2, 254);
  for (let i = 0; i < 4; i++) {
    const x = i * laneWidth;
    const correct = i === route.targetIndex;
    const dangerVisual = !correct && (warning || active);
    const shakeStrength = !correct && warning ? Math.pow(warningProgress, 1.35) : 0;
    const shakeX = Math.sin(state.t * 44 + i * 2.17) * 7.5 * shakeStrength;
    const shakeY = Math.sin(state.t * 57 + i * 1.31) * 4.2 * shakeStrength;
    const warningPulse = .5 + .5 * Math.sin(state.t * 24 + i * .8);

    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.fillStyle = dangerVisual
      ? `rgba(255,54,75,${active ? .56 : .18 + warningProgress * .22 + warningPulse * .08})`
      : correct ? 'rgba(40,197,173,.17)' : 'rgba(45,70,116,.13)';
    ctx.fillRect(x + 3, 286, laneWidth - 6, H - 286);
    ctx.strokeStyle = correct ? '#35d6b2' : dangerVisual ? '#ff6474' : '#6f87bd';
    ctx.lineWidth = correct ? 4 : dangerVisual ? 2.5 + warningProgress * 2 : 2;
    ctx.setLineDash(dangerVisual ? [] : [10, 7]);
    if (dangerVisual) {
      ctx.shadowColor = '#ff3345';
      ctx.shadowBlur = 8 + warningProgress * 18;
    }
    ctx.strokeRect(x + 7, 292, laneWidth - 14, H - 304);
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.fillStyle = correct ? '#35d6b2' : dangerVisual ? '#ff6978' : '#30456f';
    ctx.beginPath();
    ctx.moveTo(x + laneWidth / 2, 315);
    ctx.lineTo(x + laneWidth / 2 + 28, 350);
    ctx.lineTo(x + laneWidth / 2 + 9, 350);
    ctx.lineTo(x + laneWidth / 2 + 9, 385);
    ctx.lineTo(x + laneWidth / 2 - 9, 385);
    ctx.lineTo(x + laneWidth / 2 - 9, 350);
    ctx.lineTo(x + laneWidth / 2 - 28, 350);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 15px sans-serif';
    ctx.fillText(route.rooms[i], x + laneWidth / 2, 415);
    ctx.restore();
  }

  for (const blast of p.classroomBlasts || []) {
    const progress = clamp(blast.age / blast.life, 0, 1);
    const burst = Math.sin(progress * Math.PI);
    const flash = 1 - clamp(progress / .24, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .9 * (1 - progress);
    ctx.fillStyle = `rgba(255,45,67,${.42 + flash * .38})`;
    ctx.shadowColor = '#ff3345';
    ctx.shadowBlur = 42 + burst * 36;
    ctx.beginPath();
    ctx.roundRect(
      blast.left - burst * 10,
      blast.top - burst * 10,
      blast.width + burst * 20,
      blast.height + burst * 20,
      24
    );
    ctx.fill();
    ctx.strokeStyle = flash > .2 ? '#ffffff' : '#ff8d72';
    ctx.lineWidth = 12 - progress * 7;
    ctx.stroke();

    const ringRadius = 30 + progress * Math.max(blast.width, blast.height) * .76;
    ctx.globalAlpha = (1 - progress) * .82;
    ctx.strokeStyle = progress < .3 ? '#fff6d7' : '#ff5f6d';
    ctx.lineWidth = 15 - progress * 10;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, ringRadius, 0, TAU);
    ctx.stroke();

    for (const shard of blast.shards || []) {
      const distance = shard.speed * progress * .72;
      const sx = blast.x + Math.cos(shard.angle) * distance;
      const sy = blast.y + Math.sin(shard.angle) * distance;
      ctx.globalAlpha = (1 - progress) * (.55 + Math.sin(shard.phase + state.t * 18) * .25);
      ctx.strokeStyle = shard.phase > Math.PI ? '#ffd18a' : '#ff4e5d';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(
        sx - Math.cos(shard.angle) * shard.length,
        sy - Math.sin(shard.angle) * shard.length
      );
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawBroadcastSpeaker(side, source, active) {
  ctx.save();
  ctx.translate(source.x, source.y);
  if (side === "right") ctx.scale(-1, 1);
  if (side === "top") ctx.rotate(Math.PI / 2);
  const pulse = 1 + Math.sin(state.t * 18) * .05;
  ctx.scale(pulse, pulse);
  ctx.shadowColor = active ? "#ff5f6d" : "#4fd5ff";
  ctx.shadowBlur = active ? 22 : 10;
  ctx.fillStyle = "rgba(9,18,39,.94)";
  ctx.strokeStyle = active ? "#ff5f6d" : "#78c8ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-20, -30, 40, 60, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = active ? "#ff5f6d" : "#4fd5ff";
  ctx.beginPath();
  ctx.moveTo(20, -24);
  ctx.lineTo(58, -42);
  ctx.lineTo(58, 42);
  ctx.lineTo(20, 24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBroadcastConfusion() {
  const p = state.pattern;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(7,14,30,.84)";
  ctx.strokeStyle = p.broadcastStatus === "안내 방송 정상화" ? "#74d84d" : "#ffd142";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 250, 214, 500, 66, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 19px sans-serif";
  ctx.fillText("캠퍼스 안내 방송 채널 충돌", W / 2, 237);
  ctx.font = "800 12px sans-serif";
  ctx.fillStyle = p.broadcastStatus === "안내 방송 정상화" ? "#baffb9" : "#ffe9a8";
  ctx.fillText(p.broadcastStatus, W / 2, 263);
  ctx.restore();

  for (const wave of p.broadcastWaves || []) {
    const warning = wave.age < wave.warning;
    drawBroadcastSpeaker(wave.side, wave, warning);
    if (warning) {
      const alpha = .35 + Math.sin(state.t * 24 + wave.age * 8) * .22;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#ff5f6d";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(wave.x, wave.y);
      ctx.lineTo(wave.x + Math.cos(wave.gapAngle) * 420, wave.y + Math.sin(wave.gapAngle) * 420);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    for (const offset of wave.bands) {
      const radius = wave.radius + offset;
      ctx.save();
      ctx.strokeStyle = offset === 28 ? "#ffffff" : "#4fd5ff";
      ctx.lineWidth = offset === 28 ? 11 : 18;
      ctx.shadowColor = "#4fd5ff";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius, wave.gapAngle + wave.gapHalf, wave.gapAngle - wave.gapHalf + TAU);
      ctx.stroke();
      ctx.restore();
    }

    const inner = wave.radius - 12;
    const outer = wave.radius + 72;
    for (const sign of [-1, 1]) {
      const a = wave.gapAngle + sign * wave.gapHalf;
      ctx.save();
      ctx.strokeStyle = "#35d6b2";
      ctx.lineWidth = 5;
      ctx.shadowColor = "#35d6b2";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(wave.x + Math.cos(a) * inner, wave.y + Math.sin(a) * inner);
      ctx.lineTo(wave.x + Math.cos(a) * outer, wave.y + Math.sin(a) * outer);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawStudentScanGates() {
  const p = state.pattern;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = p.scanSuccess ? 'rgba(31,105,52,.78)' : 'rgba(7,14,30,.84)';
  ctx.strokeStyle = p.scanSuccess ? '#74d84d' : '#35d6b2';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(W/2-250, 214, 500, 70, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 19px sans-serif';
  ctx.fillText(p.scanSuccess ? '학생증 NFC 동기화 완료' : '학생증 NFC 인증 구간 동기화', W/2, 237);
  ctx.font = '800 12px sans-serif';
  ctx.fillStyle = p.scanSuccess ? '#caffbf' : '#a9fff0';
  ctx.fillText(`인증 성공 ${p.nfcSuccessCount || 0} / ${p.nfcTotal || 0} · 민트색 구간으로 링을 통과`, W/2, 263);
  ctx.restore();

  for (const ring of p.nfcRings || []) {
    const warning = ring.age < ring.warning;
    const pulse = .72 + Math.sin(state.t*20 + ring.age*9)*.18;
    if (warning) {
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#ffd142';
      ctx.lineWidth = 5;
      ctx.setLineDash([12,9]);
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = ring.result==='fail' ? '#ff2d43' : '#ff5f6d';
    ctx.lineWidth = 18;
    ctx.shadowColor = '#ff3345';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, ring.gapAngle + ring.gapHalf, ring.gapAngle - ring.gapHalf + TAU);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = ring.result==='success' ? '#ffffff' : '#35d6b2';
    ctx.lineWidth = 22;
    ctx.shadowColor = '#35d6b2';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, ring.gapAngle-ring.gapHalf, ring.gapAngle+ring.gapHalf);
    ctx.stroke();
    ctx.restore();

    for (const sign of [-1,1]) {
      const a = ring.gapAngle + sign*ring.gapHalf;
      ctx.save();
      ctx.strokeStyle='#ffffff';
      ctx.lineWidth=4;
      ctx.beginPath();
      ctx.moveTo(ring.x+Math.cos(a)*(ring.radius-18), ring.y+Math.sin(a)*(ring.radius-18));
      ctx.lineTo(ring.x+Math.cos(a)*(ring.radius+18), ring.y+Math.sin(a)*(ring.radius+18));
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawUnreadNotifications() {
  const p = state.pattern;
  const notices = p.unreadChain || [];
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(7,14,30,.86)";
  ctx.strokeStyle = p.unreadLocked ? "#ff5f6d" : "#ffd142";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 245, 218, 490, 62, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 19px sans-serif";
  ctx.fillText(p.unreadLocked ? "공지 5개가 누적 상태로 전환되었습니다" : "사방에서 읽지 않은 공지가 추적 중입니다", W / 2, 240);
  ctx.font = "800 12px sans-serif";
  ctx.fillStyle = p.unreadLocked ? "#ffb3bd" : "#ffe9a8";
  ctx.fillText(p.unreadLocked ? "곧 순서대로 폭발합니다" : "한곳에 몰리지 않도록 계속 이동하십시오", W / 2, 264);
  ctx.restore();

  for (const node of notices) {
    if (node.state === "following") {
      ctx.save();
      ctx.globalAlpha = .28;
      ctx.strokeStyle = "#ffd142";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 8]);
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(state.player.x, state.player.y);
      ctx.stroke();
      ctx.restore();
    }

    if (node.state === "exploding") {
      const progress = clamp(node.explosionAge / .52, 0, 1);
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = "rgba(255,48,70,.72)";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 7 - progress * 4;
      ctx.shadowColor = "#ff4e5d";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 26 + progress * 48, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const locked = node.state === "locked";
    const pulse = locked ? 1 + Math.sin(state.t * 24 + node.index) * .09 : 1 + Math.sin(state.t * 7 + node.index) * .025;
    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(Math.sin(state.t * 3 + node.index) * .06);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = locked ? "#ff4e5d" : "#ffd142";
    ctx.shadowBlur = locked ? 20 : 12;
    ctx.fillStyle = locked ? "rgba(92,16,30,.96)" : "rgba(245,247,252,.97)";
    ctx.strokeStyle = locked ? "#ff5f6d" : "#aab8d9";
    ctx.lineWidth = locked ? 4 : 3;
    ctx.beginPath();
    ctx.roundRect(-34, -23, 68, 46, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = locked ? "#ffffff" : "#27334f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "1000 11px sans-serif";
    ctx.fillText(locked ? "누적" : "미확인", 0, 3);
    ctx.fillStyle = "#ff3345";
    ctx.beginPath();
    ctx.arc(28, -19, 12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "1000 11px sans-serif";
    ctx.fillText(String(node.index), 28, -19);
    ctx.restore();
  }
}

function drawAcademicSync() {
  const p = state.pattern;
  const nodes = p.syncMarkers || [];
  const dashNodes = p.syncDashNodes || [];
  const stageLabels = {
    record: "과거 위치 데이터 기록 중",
    converge: "기록 데이터가 현재 위치로 집결 중",
    orbit: "동기화 삼각 노드 회전",
    warning: "강제 동기화 수축 경고 · 삼각형 밖으로 이탈",
    collapse: "동기화 영역 강제 수축",
    dash: "동기화 노드 역방향 분산",
  };

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(7,14,30,.86)";
  ctx.strokeStyle = p.syncStage === "collapse" ? "#ff5f6d" : "#4fd5ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 255, 216, 510, 66, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 19px sans-serif";
  ctx.fillText("학사 데이터 강제 동기화", W / 2, 239);
  ctx.font = "800 12px sans-serif";
  ctx.fillStyle = p.syncStage === "collapse" ? "#ffb3bd" : "#bdefff";
  ctx.fillText(stageLabels[p.syncStage] || stageLabels.record, W / 2, 263);
  ctx.restore();

  if (nodes.length === 3 && ["converge", "orbit", "warning", "collapse"].includes(p.syncStage)) {
    const warning = p.syncStage === "warning";
    const collapse = p.syncStage === "collapse";
    ctx.save();
    ctx.strokeStyle = collapse ? "#ff3345" : warning ? "#ffd142" : "#4fd5ff";
    ctx.lineWidth = collapse ? 22 : warning ? 6 : 4;
    ctx.setLineDash(warning ? [14, 10] : []);
    ctx.shadowColor = collapse ? "#ff3345" : "#4fd5ff";
    ctx.shadowBlur = collapse ? 24 : 13;
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    ctx.lineTo(nodes[1].x, nodes[1].y);
    ctx.lineTo(nodes[2].x, nodes[2].y);
    ctx.closePath();
    ctx.stroke();
    if (collapse) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.lineTo(nodes[1].x, nodes[1].y);
      ctx.lineTo(nodes[2].x, nodes[2].y);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  const centerX = ["warning", "collapse", "dash"].includes(p.syncStage) ? p.syncLockX : p.syncCenterX;
  const centerY = ["warning", "collapse", "dash"].includes(p.syncStage) ? p.syncLockY : p.syncCenterY;
  if (p.syncStage !== "record") {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-state.t * 1.8);
    ctx.strokeStyle = p.syncStage === "collapse" ? "#ff5f6d" : "#35d6b2";
    ctx.lineWidth = 5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 18;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 31 + i * 9, i * TAU / 3, i * TAU / 3 + .72);
      ctx.stroke();
    }
    ctx.rotate(state.t * 1.8);
    ctx.fillStyle = "rgba(7,14,30,.88)";
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "1000 10px sans-serif";
    ctx.fillText("SYNC", 0, 1);
    ctx.restore();
  }

  function drawSyncNode(node, dashOnly = false, recorded = false) {
    if (dashOnly) {
      ctx.save();
      ctx.strokeStyle = "rgba(79,213,255,.7)";
      ctx.lineWidth = 13;
      ctx.shadowColor = "#4fd5ff";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(node.prevX, node.prevY);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();
      ctx.restore();
    }

    const pulse = 1 + Math.sin(state.t * 9 + node.pulse) * .07;
    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(state.t * (node.index % 2 ? 1.8 : -1.8));
    ctx.scale(pulse, pulse);
    ctx.shadowColor = recorded ? "#ffd142" : "#4fd5ff";
    ctx.shadowBlur = recorded ? 12 : 20;
    ctx.fillStyle = recorded ? "rgba(255,236,170,.9)" : "rgba(19,69,103,.96)";
    ctx.strokeStyle = recorded ? "#ffd142" : "#dffaff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * TAU / 6;
      const x = Math.cos(a) * 27;
      const y = Math.sin(a) * 27;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-state.t * (node.index % 2 ? 1.8 : -1.8));
    ctx.fillStyle = recorded ? "#8a5b00" : "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "1000 11px sans-serif";
    ctx.fillText(`D${node.index}`, 0, 1);
    ctx.restore();
  }

  for (const node of dashNodes) {
    drawSyncNode(node, true, false);
  }

  for (const node of nodes) {
    const isDash = p.syncStage === "dash";
    const recorded = p.syncStage === "record";
    drawSyncNode(node, isDash, recorded);
  }
}


function drawSpecialPattern(){
  const id=currentPattern().id;
  if(id===7)drawServiceQueuePhase();
  else if(id===53)drawCorruptionRollback();
  else if(id===55)drawSeatScramble();
  else if(id===59)drawAuthCode();
  else if(id===61)drawAnnouncementOverload();
  else if(id===62)drawClassroomRoute();
  else if(id===63)drawBroadcastConfusion();
  else if(id===64)drawStudentScanGates();
  else if(id===65)drawUnreadNotifications();
  else if(id===66)drawAcademicSync();
}

function render() {
  if (state.cinematicMode !== "battle") {
    renderCinematic();
    hud.textContent = "";
    const duration = state.cinematicMode === "intro" ? INTRO_DURATION : BOSS_DESTRUCTION_DURATION;
    progressBar.style.width = `${clamp(state.cinematicTime / duration, 0, 1) * 100}%`;
    return;
  }
  ctx.fillStyle = '#070b16';
  ctx.fillRect(0, 0, W, H);
  const shakeRatio = state.screenShakeDuration > 0
    ? clamp(state.screenShakeTime / state.screenShakeDuration, 0, 1)
    : 0;
  const shakePower = state.screenShakePower * shakeRatio * shakeRatio;
  const shakeX = shakePower > 0 ? Math.sin(state.t * 87) * shakePower : 0;
  const shakeY = shakePower > 0 ? Math.cos(state.t * 73) * shakePower * .72 : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawBackground();
  if (state.battleStartState === "active") drawLaser();
  drawBoss();
  if (state.battleStartState === "active" && state.bossStageState !== "awakening" && state.bossStageState !== "defeated") drawSpecialPattern();
  for(const w of state.waves)drawWave(w);
  drawParticles();
  drawPlayerBullets();
  for(const b of state.bullets)drawCommonBullet(b);
  if(currentPattern().id===54)drawCursors();
  drawPlayer();
  drawPhase1ClearOverlay();
  drawAwakeningOverlay();
  drawDefeatOverlay();
  drawBossHealthBar();
  ctx.restore();
  if(state.hitFlash>0){ctx.save();ctx.globalAlpha=state.hitFlash*1.75;ctx.fillStyle="#ff3345";ctx.fillRect(0,0,W,H);ctx.restore();}
  drawAuthResultTopOverlay();

  const ph=currentPattern();
  hud.textContent="";

  const displayedProgress = state.battleStartState !== "active"
    ? 0
    : state.bossStageState === "awakening"
      ? clamp(state.awakeningElapsed / state.awakeningDuration, 0, 1) * 100
    : ph.id===7 && state.pattern.serviceQueue
      ? state.pattern.serviceQueue.progress
      : clamp(state.patternElapsed/ph.duration,0,1)*100;
  progressBar.style.width=`${displayedProgress}%`;
}


  let completionSent = false;

  function startRuntime(options = {}) {
    completionSent = false;
    state.story = !!options.story;
    resetBattle();
    if (Number.isFinite(options.patternId)) {
      const index = getPatternIndexById(Number(options.patternId));
      if (index >= 0) selectPattern(index);
    } else if (options.skipIntro) {
      finishBossIntro();
      state.battleStartState = "active";
      state.stage1Hp = STAGE1_MAX_HP;
      state.patternElapsed = 0;
    }
  }

  function updateRuntime(dt) {
    update(Math.min(.1, Math.max(0, dt)));
    if (!completionSent && state.cinematicMode === "destroy" && state.cinematicTime >= BOSS_DESTRUCTION_DURATION) {
      completionSent = true;
      adapter.onComplete?.();
    }
  }

  function clearEnemyProjectilesRuntime() {
    state.bullets.length = 0;
    state.waves.length = 0;
    state.cursors.length = 0;
    state.activeCursor = null;
    state.mouse.down = false;
  }

  function clearEnemyProjectilesWithinRadiusRuntime(x, y, radius) {
    const radiusSq = Math.max(0, radius) ** 2;
    for (const bullet of state.bullets) {
      if (!bullet.active) continue;
      const dx = bullet.x - x;
      const dy = bullet.y - y;
      if (dx * dx + dy * dy <= radiusSq) bullet.active = false;
    }
    state.bullets = state.bullets.filter(bullet => bullet.active);
  }

  function inputDigitRuntime(digit) {
    if (currentPattern().id !== 59 || state.cinematicMode !== "battle") return false;
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) return false;
    return inputAuthDigit(digit) !== false;
  }

  function pointerDownRuntime(x, y) {
    if (state.cinematicMode !== "battle") return false;
    if (currentPattern().id === 59) {
      updateAuthPadLayout();
      const pad = (state.pattern.authPads || []).find(v => Math.hypot(x - v.x, y - v.y) <= v.r + 12);
      if (pad) {
        inputAuthDigit(pad.digit);
        return true;
      }
    }
    state.mouse.down = true;
    state.mouse.x = x;
    state.mouse.y = y;
    return false;
  }

  function setPatternRuntime(patternId) {
    const index = getPatternIndexById(patternId);
    if (index < 0) return false;
    selectPattern(index);
    return true;
  }

  return {
    state,
    patterns: PATTERNS,
    start: startRuntime,
    update: updateRuntime,
    render,
    applyDamage: applyBossDamage,
    clearEnemyProjectiles: clearEnemyProjectilesRuntime,
    clearEnemyProjectilesWithinRadius: clearEnemyProjectilesWithinRadiusRuntime,
    inputDigit: inputDigitRuntime,
    pointerDown: pointerDownRuntime,
    getMovementBounds: getPlayerMovementBounds,
    getBossHitArea,
    setPattern: setPatternRuntime,
    isPlayerAttackAllowed: canPlayerAttack,
    skipToNextPhase,
  };
}
