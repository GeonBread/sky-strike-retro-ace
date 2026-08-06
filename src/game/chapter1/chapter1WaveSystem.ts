import { Bullet, Enemy } from "../entities";
import { CHAPTER1_ENEMY_CATALOG, CHAPTER1_WAVE_CATALOG } from "./chapter1WaveCatalog";
import {
  CHAPTER1_ENEMY_TYPE_BY_INDEX,
  createChapter1WaveRuntime,
  isChapter1EnemyType,
  type Chapter1BulletState,
  type Chapter1EnemyState,
  type Chapter1EnemyType,
  type Chapter1WaveEvent,
  type Chapter1WaveRuntime,
  type Chapter1WaveTelegraph,
} from "./chapter1WaveTypes";
import {
  CHAPTER1_ENEMY_HITBOX_SCALE,
  getChapter1BulletHitboxScale,
  getChapter1EnemyVisualScale,
} from "./chapter1WaveVisualTuning";
import {
  spawnChapter1ScheduleSlamEffectSystem,
  updateChapter1WaveImpactEffectsSystem,
} from "./chapter1WaveImpactSystem";

const BASE_WIDTH = 800;
const BASE_HEIGHT = 960;
const TAU = Math.PI * 2;
// 이전 통합 과정에서 일반 몬스터 체력을 1.3배로 올렸던 값을 원래 기준치로 되돌린다.
const CHAPTER1_ENEMY_HP_SCALE = 1.0;

type Chapter1WaveEngine = any;

type SpawnOverrides = Partial<Chapter1EnemyState> & {
  x?: number;
  y?: number;
  hp?: number;
  maxHp?: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function normalize(x: number, y: number): { x: number; y: number } {
  const distance = Math.hypot(x, y) || 1;
  return { x: x / distance, y: y / distance };
}

function getScale(engine: Chapter1WaveEngine): { x: number; y: number; uniform: number } {
  const x = engine.canvas.width / BASE_WIDTH;
  const y = engine.canvas.height / BASE_HEIGHT;
  return { x, y, uniform: Math.min(x, y) };
}

function getPlayerCanonical(engine: Chapter1WaveEngine) {
  const scale = getScale(engine);
  return {
    x: (engine.player.x + engine.player.width / 2) / scale.x,
    y: (engine.player.y + engine.player.height / 2) / scale.y,
    tilt: engine.player.tilt || 0,
  };
}

function syncEnemyEntity(engine: Chapter1WaveEngine, enemy: Enemy): void {
  const state = enemy.chapter1;
  if (!state) return;
  const catalog = CHAPTER1_ENEMY_CATALOG[state.index];
  const scale = getScale(engine);
  const visualScale = getChapter1EnemyVisualScale(state.index);
  enemy.width = catalog.displayWidth * visualScale * scale.x;
  enemy.height = catalog.displayHeight * visualScale * scale.y;
  enemy.hitWidth = Math.max(20, [72, 74, 72, 76, 74, 66, 144, 74, 78, 78][state.index]) * CHAPTER1_ENEMY_HITBOX_SCALE * scale.x;
  enemy.hitHeight = Math.max(20, [82, 76, 80, 72, 80, 94, 142, 80, 76, 76][state.index]) * CHAPTER1_ENEMY_HITBOX_SCALE * scale.y;
  enemy.x = state.cx * scale.x - enemy.width / 2;
  enemy.y = state.cy * scale.y - enemy.height / 2;
  enemy.vx = state.vx * scale.x;
  enemy.vy = state.vy * scale.y;
}

function syncBulletEntity(engine: Chapter1WaveEngine, bullet: Bullet): void {
  const state = bullet.chapter1;
  if (!state) return;
  const scale = getScale(engine);
  const hitboxScale = getChapter1BulletHitboxScale(state.sprite);
  const width = (state.hitW ?? state.drawW ?? state.r * 1.55) * hitboxScale * scale.x;
  const height = (state.hitH ?? state.drawH ?? state.r * 1.55) * hitboxScale * scale.y;
  bullet.width = Math.max(3, width);
  bullet.height = Math.max(3, height);
  bullet.hitWidth = bullet.width;
  bullet.hitHeight = bullet.height;
  bullet.x = state.cx * scale.x - bullet.width / 2;
  bullet.y = state.cy * scale.y - bullet.height / 2;
  bullet.vx = state.vx * scale.x;
  bullet.vy = state.vy * scale.y;
}

function ensureRuntime(engine: Chapter1WaveEngine): Chapter1WaveRuntime {
  if (!engine.chapter1Wave) engine.chapter1Wave = createChapter1WaveRuntime();
  return engine.chapter1Wave;
}

export function resetChapter1WaveRuntimeSystem(engine: Chapter1WaveEngine, enabled = engine.stage === 1): void {
  engine.chapter1Wave = createChapter1WaveRuntime();
  engine.chapter1Wave.enabled = enabled;
}

export function shouldUseChapter1WaveSystem(engine: Chapter1WaveEngine): boolean {
  return engine.stage === 1 && !engine.bossActive;
}

function applyEnemyOverrides(enemy: Enemy, overrides: SpawnOverrides): void {
  const state = enemy.chapter1!;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    if (key === "x") state.cx = value as number;
    else if (key === "y") state.cy = value as number;
    else if (key === "hp") enemy.hp = Math.ceil((value as number) * CHAPTER1_ENEMY_HP_SCALE);
    else if (key === "maxHp") state.maxHp = Math.ceil((value as number) * CHAPTER1_ENEMY_HP_SCALE);
    else if (key in state) (state as any)[key] = value;
  }
}

function makeEnemy(engine: Chapter1WaveEngine, index: number): Enemy {
  const catalog = CHAPTER1_ENEMY_CATALOG[index];
  const enemy = new Enemy();
  enemy.type = catalog.id;
  enemy.hp = Math.ceil(catalog.hp * CHAPTER1_ENEMY_HP_SCALE);
  enemy.visualId = index + 1;
  enemy.chapter1 = {
    index,
    cx: rand(100, BASE_WIDTH - 100),
    cy: -100,
    vx: 0,
    vy: 0,
    age: 0,
    maxHp: Math.ceil(catalog.hp * CHAPTER1_ENEMY_HP_SCALE),
    attack: rand(0.4, 1),
    burst: 0,
    burstTimer: 0,
    phase: rand(0, TAU),
    targetY: rand(120, 180),
    state: "enter",
    stateTimer: 0,
    charge: 0,
    open: false,
    releaseTimer: 0,
    absorbCooldown: 0,
    absorbPeriod: 0.38,
    collectTimer: 0,
    absorbNotice: 0,
    countdown: 4,
    nextTeleport: 2.2,
    hitFlash: 0,
    motionSeed: rand(0, TAU),
    motionX: 0,
    motionY: 0,
    waveId: ensureRuntime(engine).waveInstanceId,
  };

  const state = enemy.chapter1;
  if (index === 1) {
    const edge = Math.floor(Math.random() * 3);
    if (edge === 0) {
      state.cx = rand(80, BASE_WIDTH - 80);
      state.cy = -70;
      state.vx = rand(-40, 40);
      state.vy = rand(90, 125);
    } else if (edge === 1) {
      state.cx = -70;
      state.cy = rand(80, 260);
      state.vx = rand(115, 150);
      state.vy = rand(45, 80);
    } else {
      state.cx = BASE_WIDTH + 70;
      state.cy = rand(80, 260);
      state.vx = rand(-150, -115);
      state.vy = rand(45, 80);
    }
    state.state = "straight";
    state.attack = 0.65;
  }
  if (index === 5) {
    state.targetY = 110;
    state.vy = 48;
  }
  if (index === 8) {
    state.targetY = 155;
    state.attack = 0.35;
  }
  syncEnemyEntity(engine, enemy);
  return enemy;
}

function spawnChapter1EnemyInternal(engine: Chapter1WaveEngine, index: number, overrides: SpawnOverrides = {}): Enemy {
  const enemy = makeEnemy(engine, index);
  applyEnemyOverrides(enemy, overrides);
  if (index === 6 && overrides.hp == null) {
    enemy.hp = Math.ceil(90 * CHAPTER1_ENEMY_HP_SCALE);
    enemy.chapter1!.maxHp = enemy.hp;
  }
  syncEnemyEntity(engine, enemy);
  engine.enemies.push(enemy);
  return enemy;
}

export function spawnChapter1SandboxEnemySystem(engine: Chapter1WaveEngine, type: Chapter1EnemyType): Enemy {
  const index = CHAPTER1_ENEMY_TYPE_BY_INDEX.indexOf(type);
  const enemy = spawnChapter1EnemyInternal(engine, Math.max(0, index), {
    x: BASE_WIDTH / 2,
    y: 145,
    targetY: 145,
    state: "active",
    attack: 0.35,
  });
  enemy.hp = Math.max(enemy.hp, Math.ceil(30 * CHAPTER1_ENEMY_HP_SCALE));
  enemy.chapter1!.maxHp = enemy.hp;
  return enemy;
}

/**
 * 챕터 1 보스전 중 아이템 획득 기회를 제공할 약한 지원 몬스터 묶음을 생성한다.
 * 출석체크 드론과 결석확인 드론만 사용하며, 보스 본체와 별개로 기존 웨이브 이동·공격·드롭 규칙을 따른다.
 */
export function spawnChapter1BossSupportGroupSystem(engine: Chapter1WaveEngine, requestedCount: number): Enemy[] {
  const runtime = ensureRuntime(engine);
  const count = clamp(Math.floor(requestedCount), 4, 8);
  runtime.waveInstanceId += 1;
  const group: Enemy[] = [];

  for (let index = 0; index < count; index += 1) {
    const typeIndex = index % 2;
    const lane = (index + 1) / (count + 1);
    const x = 70 + lane * (BASE_WIDTH - 140);
    const enemy = spawnChapter1EnemyInternal(engine, typeIndex, typeIndex === 0
      ? {
          x,
          y: -70 - (index % 3) * 34,
          targetY: 215 + (index % 2) * 42,
          state: "enter",
          attack: 0.8 + index * 0.06,
        }
      : {
          x,
          y: -80 - (index % 3) * 38,
          vx: (index % 4 < 2 ? 1 : -1) * (35 + index * 3),
          vy: 78 + index * 4,
          state: "straight",
          attack: 0.65 + index * 0.05,
        });
    (enemy as any).chapter1BossSupport = true;
    group.push(enemy);
  }

  return group;
}

function buildWaveEvents(engine: Chapter1WaveEngine, index: number): Chapter1WaveEvent[] {
  const W = BASE_WIDTH;
  const H = BASE_HEIGHT;
  const events: Chapter1WaveEvent[] = [];
  const push = (at: number, label: string, run: () => void) => events.push({ at, label, run });
  const anchoredEnemy = (type: number, x: number, y: number, attack: number, extra: SpawnOverrides = {}) =>
    spawnChapter1EnemyInternal(engine, type, {
      x,
      y: -105,
      targetY: y,
      attack,
      waveMotion: "anchor",
      anchorX: x,
      anchorY: y,
      anchorAmpX: 22,
      anchorAmpY: 8,
      anchorSpeed: 1.15,
      ...extra,
    });
  const crossingAbsence = (fromLeft: boolean, y: number, attack = 0.7) =>
    spawnChapter1EnemyInternal(engine, 1, {
      x: fromLeft ? -85 : W + 85,
      y,
      vx: fromLeft ? 155 : -155,
      vy: 52,
      state: "straight",
      attack,
      phase: fromLeft ? 0 : Math.PI,
    });
  const spawnWaveEnemy = (type: number, overrides: SpawnOverrides = {}) => spawnChapter1EnemyInternal(engine, type, overrides);
  const spawnEnemy = spawnWaveEnemy;
    switch (index) {
      case 0:
        [180, 360, 540].forEach((x, i) => push(i * .55, `출석 드론 ${i + 1} 진입`, () =>
          anchoredEnemy(0, x, 142 + (i % 2) * 24, .75 + i * .46, {
            anchorAmpX: 34, anchorAmpY: 10, anchorSpeed: 1.18 + i * .08
          })
        ));
        break;
      case 1:
        push(0, '좌측 결석 드론 교차 진입', () => crossingAbsence(true, 105, .55));
        push(.85, '우측 결석 드론 교차 진입', () => crossingAbsence(false, 190, .85));
        break;
      case 2:
        push(0, '좌측 공지사항 드론 배치', () => anchoredEnemy(2, 205, 145, .55, { anchorAmpX: 28, anchorSpeed: .9 }));
        push(1.45, '우측 공지사항 드론 배치', () => anchoredEnemy(2, 515, 165, .75, { anchorAmpX: 30, anchorSpeed: 1.02, phase: Math.PI }));
        break;
      case 3:
        push(0, '첫 번째 학번 터미널 진입', () => anchoredEnemy(3, 285, 132, .72, { anchorAmpX: 54, anchorSpeed: .48 }));
        push(1.15, '두 번째 학번 터미널 진입', () => anchoredEnemy(3, 435, 205, 1.35, { anchorAmpX: 48, anchorSpeed: .42, phase: Math.PI }));
        push(4.1, '출석 확인 지원 드론 투입', () => anchoredEnemy(0, 360, 112, .55, { anchorAmpX: 95, anchorSpeed: .72 }));
        break;
      case 4:
        push(0, '통합정보 로그인 감시 시작', () => spawnWaveEnemy(4, { x: W / 2, y: -110, targetY: 140, attack: .65 }));
        break;
      case 5:
        [135, 285, 435, 585].forEach((x, i) => push(i * .52, `데이터 벌레 ${i + 1} 연결`, () =>
          spawnWaveEnemy(5, {
            x, y: -90 - i * 42, targetY: 100, vy: 34,
            attack: .65 + i * .32,
            waveMotion: 'bugLane', anchorX: x,
            anchorAmpX: 46, anchorSpeed: 1.18 + i * .08,
            phase: i * .82
          })
        ));
        break;
      case 6:
        push(0, '시간표 중복 위치 탐색', () => anchoredEnemy(6, W / 2, 122, .62, { anchorAmpX: 118, anchorSpeed: .62 }));
        push(4.25, '좁아진 통로에 출석 드론 투입', () => anchoredEnemy(0, 185, 145, .48, { anchorAmpX: 30 }));
        push(4.9, '반대편 출석 드론 투입', () => anchoredEnemy(0, 535, 175, 1.0, { anchorAmpX: 30, phase: Math.PI }));
        break;
      case 7:
        push(0, '첫 번째 잔여석 마감', () => anchoredEnemy(7, 215, 155, .72, { anchorAmpX: 38, phase: 0 }));
        push(1.05, '두 번째 잔여석 마감', () => anchoredEnemy(7, 505, 175, .72, { anchorAmpX: 38, phase: Math.PI / 8 }));
        break;
      case 8:
        push(0, '장바구니 슬롯 박스 배치', () => anchoredEnemy(8, W / 2, 158, .35, { anchorAmpX: 72, anchorSpeed: .52 }));
        push(1.45, '좌측 출석 압박 투입', () => anchoredEnemy(0, 190, 142, .65, { anchorAmpX: 42 }));
        push(2.15, '우측 출석 압박 투입', () => anchoredEnemy(0, 530, 172, 1.0, { anchorAmpX: 42, phase: Math.PI }));
        break;
      case 9:
        push(0, '강의실 좌표 왜곡 시작', () => spawnWaveEnemy(9, { x: W / 2, y: -110, targetY: 138, attack: .7, nextTeleport: 1.9 }));
        push(1.6, '좌측 수강편람 데이터 유입', () => spawnWaveEnemy(5, { x: 205, y: -110, vy: 31, attack: .6, waveMotion: 'bugLane', anchorX: 205, anchorAmpX: 60 }));
        push(2.25, '우측 수강편람 데이터 유입', () => spawnWaveEnemy(5, { x: 515, y: -155, vy: 31, attack: 1.0, waveMotion: 'bugLane', anchorX: 515, anchorAmpX: 60, phase: Math.PI }));
        break;
      case 10:
        push(0, '공지 종탄 선행 투입', () => anchoredEnemy(2, W / 2, 135, .45, { anchorAmpX: 110, anchorSpeed: .52 }));
        push(2.5, '시간표 중복 경고 시작', () => anchoredEnemy(6, W / 2, 195, .42, { anchorAmpX: 88, anchorSpeed: .58 }));
        break;
      case 11:
        push(0, '로그인 잠금 장벽 전개', () => spawnWaveEnemy(4, { x: W / 2, y: -110, targetY: 140, attack: .58 }));
        push(1.75, '좌표 왜곡기 개입', () => spawnWaveEnemy(9, { x: 155, y: -110, targetY: 205, attack: .52, nextTeleport: 1.35 }));
        break;
      case 12:
        push(0, '장바구니 슬롯 중앙 배치', () => anchoredEnemy(8, W / 2, 148, .35, { anchorAmpX: 58, anchorSpeed: .48 }));
        push(1.2, '좌측 잔여석 감지 시작', () => anchoredEnemy(7, 210, 190, .8, { anchorAmpX: 30, phase: 0 }));
        push(2.25, '우측 잔여석 감지 시작', () => anchoredEnemy(7, 510, 165, .85, { anchorAmpX: 30, phase: Math.PI / 8 }));
        break;
      case 13:
        push(0, '시간표 장애물 설치 준비', () => anchoredEnemy(6, W / 2, 126, .5, { anchorAmpX: 105, anchorSpeed: .55 }));
        push(4.25, '좌측 결석 드론 통과', () => crossingAbsence(true, 130, .42));
        push(5.15, '우측 결석 드론 통과', () => crossingAbsence(false, 215, .55));
        break;
      case 14:
        [165, 360, 555].forEach((x, i) => push(i * .48, `최종 러시 1단계 · 출석 ${i + 1}`, () =>
          anchoredEnemy(0, x, 135 + (i % 2) * 28, .55 + i * .36, { anchorAmpX: 34 })
        ));
        push(5.0, '최종 러시 2단계 · 결석 교차', () => crossingAbsence(true, 115, .45));
        push(5.75, '최종 러시 2단계 · 반대편 교차', () => crossingAbsence(false, 205, .7));
        push(10.2, '최종 러시 3단계 · 공지 폭격', () => anchoredEnemy(2, W / 2, 145, .45, { anchorAmpX: 120, anchorSpeed: .58 }));
        push(15.2, '최종 러시 4단계 · 시간표 봉쇄', () => anchoredEnemy(6, W / 2, 120, .45, { anchorAmpX: 110, anchorSpeed: .55 }));
        push(21.0, '최종 러시 5단계 · 잔여석 좌측', () => anchoredEnemy(7, 210, 165, .55, { anchorAmpX: 35, phase: 0 }));
        push(22.0, '최종 러시 5단계 · 잔여석 우측', () => anchoredEnemy(7, 510, 185, .55, { anchorAmpX: 35, phase: Math.PI / 8 }));
        push(28.0, '최종 러시 6단계 · 좌표 왜곡', () => spawnWaveEnemy(9, { x: W / 2, y: -110, targetY: 145, attack: .48, nextTeleport: 1.45 }));
        break;
      case 15:
        push(0, '출결 이중 압박 · 좌측 출석', () => anchoredEnemy(0, 205, 145, .5, { anchorAmpX: 52, anchorSpeed: 1.25 }));
        push(.35, '출결 이중 압박 · 우측 출석', () => anchoredEnemy(0, 515, 175, .9, { anchorAmpX: 52, anchorSpeed: 1.25, phase: Math.PI }));
        push(1.2, '좌측 결석 드론 교차', () => crossingAbsence(true, 120, .35));
        push(1.9, '우측 결석 드론 교차', () => crossingAbsence(false, 215, .55));
        break;
      case 16:
        push(0, '긴급 공지 · 첫 번째 종탄', () => anchoredEnemy(2, 210, 145, .35, { anchorAmpX: 38, anchorSpeed: .95 }));
        push(.95, '긴급 공지 · 두 번째 종탄', () => anchoredEnemy(2, 510, 190, .75, { anchorAmpX: 40, anchorSpeed: 1.02, phase: Math.PI }));
        push(2.35, '잔여석 방사 경보', () => anchoredEnemy(7, 360, 125, .7, { anchorAmpX: 82, anchorSpeed: .7, phase: Math.PI / 8 }));
        break;
      case 17:
        push(0, '통합정보 로그인 장벽', () => spawnWaveEnemy(4, { x: W / 2, y: -110, targetY: 138, attack: .45 }));
        push(1.15, '좌측 출석 추적', () => anchoredEnemy(0, 185, 188, .65, { anchorAmpX: 58, anchorSpeed: 1.32 }));
        push(1.72, '우측 출석 추적', () => anchoredEnemy(0, 535, 155, 1.0, { anchorAmpX: 58, anchorSpeed: 1.32, phase: Math.PI }));
        break;
      case 18:
        [120, 240, 360, 480, 600].forEach((x, i) => push(i * .34, `검색 오류 데이터 ${i + 1}`, () =>
          spawnWaveEnemy(5, {
            x, y: -95 - i * 34, targetY: 100, vy: 30,
            attack: .42 + i * .22,
            waveMotion: 'bugLane', anchorX: x,
            anchorAmpX: 24, anchorSpeed: 1.0 + (i % 2) * .12,
            phase: i * .65
          })
        ));
        push(1.25, '학번 발급 터미널 개입', () => anchoredEnemy(3, 360, 205, .58, { anchorAmpX: 130, anchorSpeed: .4 }));
        break;
      case 19:
        push(0, '시간표 중복 경고', () => anchoredEnemy(6, 360, 120, .35, { anchorAmpX: 105, anchorSpeed: .58 }));
        push(.55, '좌표 왜곡기 경고 구역 침투', () => spawnWaveEnemy(9, { x: 155, y: -110, targetY: 185, attack: .62, nextTeleport: 1.5, attackInterval: 2.5 }));
        break;
      case 20:
        push(0, '잔여석 좌측 8방향', () => anchoredEnemy(7, 175, 165, .4, { anchorAmpX: 28, phase: 0 }));
        push(.8, '잔여석 우측 회전 8방향', () => anchoredEnemy(7, 545, 165, .45, { anchorAmpX: 28, phase: Math.PI / 8 }));
        push(1.6, '잔여석 중앙 8방향', () => anchoredEnemy(7, 360, 115, .5, { anchorAmpX: 45, phase: Math.PI / 16 }));
        break;
      case 21:
        push(0, '장바구니 과부하 시작', () => anchoredEnemy(8, 360, 145, .25, { anchorAmpX: 62, anchorSpeed: .5 }));
        push(1.0, '좌측 출석 드론 지원', () => anchoredEnemy(0, 185, 170, .5, { anchorAmpX: 42 }));
        push(1.42, '우측 출석 드론 지원', () => anchoredEnemy(0, 535, 145, .85, { anchorAmpX: 42, phase: Math.PI }));
        push(2.0, '좌측 데이터 벌레 지원', () => spawnWaveEnemy(5, { x: 230, y: -110, targetY: 105, vy: 28, attack: .65, waveMotion: 'bugLane', anchorX: 230, anchorAmpX: 28 }));
        push(2.45, '우측 데이터 벌레 지원', () => spawnWaveEnemy(5, { x: 490, y: -150, targetY: 105, vy: 28, attack: 1.05, waveMotion: 'bugLane', anchorX: 490, anchorAmpX: 28, phase: Math.PI }));
        break;
      case 22:
        push(0, '공지사항 파동원 배치', () => anchoredEnemy(2, 360, 140, .35, { anchorAmpX: 115, anchorSpeed: .62 }));
        push(.72, '로그인 낙하 장벽 준비', () => spawnWaveEnemy(4, { x: 360, y: -110, targetY: 205, attack: .58 }));
        push(1.55, '좌측 데이터 차단', () => spawnWaveEnemy(5, { x: 150, y: -110, targetY: 105, vy: 28, attack: .8, waveMotion: 'bugLane', anchorX: 150, anchorAmpX: 22 }));
        push(1.9, '우측 데이터 차단', () => spawnWaveEnemy(5, { x: 570, y: -140, targetY: 105, vy: 28, attack: 1.15, waveMotion: 'bugLane', anchorX: 570, anchorAmpX: 22, phase: Math.PI }));
        break;
      case 23:
        push(0, '중복 시간표 설치 경고', () => anchoredEnemy(6, 360, 120, .32, { anchorAmpX: 96, anchorSpeed: .55 }));
        push(.55, '좌측 결석 교차', () => crossingAbsence(true, 118, .42));
        push(1.25, '우측 결석 교차', () => crossingAbsence(false, 208, .52));
        push(3.1, '설치 통로 출석 추적', () => anchoredEnemy(0, 360, 165, .45, { anchorAmpX: 145, anchorSpeed: .72 }));
        break;
      case 24:
        push(0, '좌측 좌표 왜곡기', () => spawnWaveEnemy(9, { x: 165, y: -110, targetY: 150, attack: .42, nextTeleport: 1.55, arrowAngleOffset: 0, attackInterval: 2.65 }));
        push(1.0, '우측 회전 좌표 왜곡기', () => spawnWaveEnemy(9, { x: 555, y: -110, targetY: 210, attack: .45, nextTeleport: 1.7, arrowAngleOffset: Math.PI / 4, attackInterval: 2.65 }));
        push(1.65, '중앙 출석 추격 드론', () => anchoredEnemy(0, 360, 118, .55, { anchorAmpX: 118, anchorSpeed: 1.12 }));
        break;
      case 25:
        push(0, '서버 폭주 · 로그인 장벽', () => spawnWaveEnemy(4, { x: 360, y: -110, targetY: 135, attack: .4 }));
        push(1.05, '서버 폭주 · 좌측 잔여석', () => anchoredEnemy(7, 205, 190, .55, { anchorAmpX: 32, phase: 0 }));
        push(1.85, '서버 폭주 · 우측 잔여석', () => anchoredEnemy(7, 515, 170, .55, { anchorAmpX: 32, phase: Math.PI / 8 }));
        push(2.9, '서버 폭주 · 장바구니', () => anchoredEnemy(8, 360, 120, .3, { anchorAmpX: 88, anchorSpeed: .5 }));
        break;
      case 26:
        [120, 280, 440, 600].forEach((x, i) => push(i * .38, `강의실 이동 데이터 레인 ${i + 1}`, () =>
          spawnWaveEnemy(5, { x, y: -100 - i * 38, targetY: 105, vy: 29, attack: .55 + i * .3, waveMotion: 'bugLane', anchorX: x, anchorAmpX: 18, phase: i * .8 })
        ));
        push(.7, '강의실 좌표 왜곡', () => spawnWaveEnemy(9, { x: 360, y: -120, targetY: 165, attack: .55, nextTeleport: 1.5, attackInterval: 2.5 }));
        push(1.85, '학번 발급 경로 교란', () => anchoredEnemy(3, 360, 225, .65, { anchorAmpX: 145, anchorSpeed: .38 }));
        break;
      case 27:
        push(0, '첫 번째 시간표 봉쇄', () => anchoredEnemy(6, 245, 115, .28, { anchorAmpX: 54, anchorSpeed: .5, globalBlockCap: 4 }));
        push(1.0, '두 번째 시간표 봉쇄', () => anchoredEnemy(6, 475, 185, .32, { anchorAmpX: 54, anchorSpeed: .5, phase: Math.PI, globalBlockCap: 4 }));
        break;
      case 28:
        push(0, '전체 공지 1번', () => anchoredEnemy(2, 165, 120, .28, { anchorAmpX: 24, anchorSpeed: .82 }));
        push(1.0, '전체 공지 2번', () => anchoredEnemy(2, 360, 180, .48, { anchorAmpX: 30, anchorSpeed: .9, phase: Math.PI / 2 }));
        push(2.0, '전체 공지 3번', () => anchoredEnemy(2, 555, 240, .68, { anchorAmpX: 24, anchorSpeed: .82, phase: Math.PI }));
        push(1.45, '결석확인 대각선 폭격', () => crossingAbsence(true, 145, .38));
        break;
      case 29:
        push(0, '최종 혼란 1단계 · 좌측 출석', () => anchoredEnemy(0, 205, 145, .45, { anchorAmpX: 48 }));
        push(.38, '최종 혼란 1단계 · 우측 출석', () => anchoredEnemy(0, 515, 175, .78, { anchorAmpX: 48, phase: Math.PI }));
        push(1.0, '최종 혼란 1단계 · 좌측 결석', () => crossingAbsence(true, 112, .4));
        push(1.7, '최종 혼란 1단계 · 우측 결석', () => crossingAbsence(false, 210, .55));
        push(6.0, '최종 혼란 2단계 · 공지', () => anchoredEnemy(2, 360, 142, .35, { anchorAmpX: 105, anchorSpeed: .6 }));
        [170, 360, 550].forEach((x, i) => push(6.55 + i * .42, `최종 혼란 2단계 · 데이터 ${i + 1}`, () =>
          spawnWaveEnemy(5, { x, y: -105 - i * 40, targetY: 105, vy: 28, attack: .52 + i * .34, waveMotion: 'bugLane', anchorX: x, anchorAmpX: 22, phase: i * .8 })
        ));
        push(12.0, '최종 혼란 3단계 · 시간표 경고', () => anchoredEnemy(6, 360, 118, .3, { anchorAmpX: 90, anchorSpeed: .55 }));
        push(14.35, '최종 혼란 3단계 · 좌측 잔여석', () => anchoredEnemy(7, 205, 180, .5, { anchorAmpX: 28, phase: 0 }));
        push(15.15, '최종 혼란 3단계 · 우측 잔여석', () => anchoredEnemy(7, 515, 165, .5, { anchorAmpX: 28, phase: Math.PI / 8 }));
        push(20.0, '최종 혼란 4단계 · 장바구니', () => anchoredEnemy(8, 360, 135, .28, { anchorAmpX: 82, anchorSpeed: .48 }));
        push(20.8, '최종 혼란 4단계 · 좌표 왜곡', () => spawnWaveEnemy(9, { x: 160, y: -110, targetY: 190, attack: .48, nextTeleport: 1.45, arrowAngleOffset: Math.PI / 8, attackInterval: 2.55 }));
        push(21.65, '최종 혼란 4단계 · 로그인 장벽', () => spawnWaveEnemy(4, { x: 560, y: -110, targetY: 145, attack: .52 }));
        break;
    }
    return events.sort((a, b) => a.at - b.at);

}

function clearChapter1CombatObjects(engine: Chapter1WaveEngine): void {
  engine.enemies.forEach((enemy: Enemy) => {
    if (isChapter1EnemyType(enemy.type)) enemy.active = false;
  });
  engine.bullets.forEach((bullet: Bullet) => {
    if (bullet.chapter1) bullet.active = false;
  });
  engine.enemies = engine.enemies.filter((enemy: Enemy) => enemy.active);
  engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active);
  const runtime = ensureRuntime(engine);
  runtime.telegraphs = [];
  runtime.deferred = [];
  runtime.impactParticles = [];
  runtime.vanishEffects = [];
}

function startWave(engine: Chapter1WaveEngine, index: number, skipClear = false): void {
  const runtime = ensureRuntime(engine);
  const safeIndex = clamp(Math.floor(index), 0, CHAPTER1_WAVE_CATALOG.length - 1);
  if (!skipClear) clearChapter1CombatObjects(engine);
  runtime.waveInstanceId += 1;
  runtime.selectedWave = safeIndex;
  runtime.nextWave = safeIndex + 1;
  runtime.running = true;
  runtime.elapsed = 0;
  runtime.events = buildWaveEvents(engine, safeIndex);
  runtime.eventCursor = 0;
  runtime.cueText = "";
  runtime.cueTimer = 0;
  // 웨이브 전환 배너로 전투가 멈춘 것처럼 보이지 않도록 즉시 다음 웨이브를 진행한다.
  runtime.bannerTimer = 0;
  runtime.clearTimer = 0;
}

export function triggerChapter1SandboxWaveSystem(engine: Chapter1WaveEngine, waveIndex: number): void {
  const runtime = ensureRuntime(engine);
  runtime.enabled = true;
  runtime.sandboxSingleWave = true;
  runtime.allWavesCleared = false;
  startWave(engine, waveIndex, false);
}

function finishWave(engine: Chapter1WaveEngine): void {
  const runtime = ensureRuntime(engine);
  if (!runtime.running) return;
  const cleared = runtime.selectedWave;
  runtime.running = false;
  runtime.clearTimer = 0;
  if (typeof engine.awardScore === "function") engine.awardScore(450 + cleared * 75);

  if (engine.isSandbox || runtime.sandboxSingleWave) {
    runtime.nextWave = cleared;
    return;
  }

  if (cleared >= CHAPTER1_WAVE_CATALOG.length - 1) {
    runtime.allWavesCleared = true;
    runtime.telegraphs = [];
    runtime.deferred = [];
    engine.bullets.forEach((bullet: Bullet) => {
      if (bullet.isEnemy) bullet.active = false;
    });
    engine.bullets = engine.bullets.filter((bullet: Bullet) => bullet.active);

    // Story integration can own the transition after the real chapter-1 waves.
    // When this callback is present, do not enter the automatic boss path.
    if (typeof engine.onChapter1WavesComplete === "function") {
      runtime.enabled = false;
      engine.clearingForBoss = false;
      engine.paused = true;
      engine.onChapter1WavesComplete();
      return;
    }

    engine.clearingForBoss = true;
    return;
  }

  startWave(engine, cleared + 1, true);
}

/**
 * 테스트 중 현재 챕터 1 웨이브를 즉시 완료하고 다음 웨이브로 진행한다.
 * 실제 게임 규칙에는 자동으로 호출되지 않으며, 스토리 테스트 UI에서만 사용한다.
 */
export function skipCurrentChapter1WaveSystem(engine: Chapter1WaveEngine): boolean {
  const runtime = ensureRuntime(engine);
  if (!runtime.enabled || runtime.allWavesCleared || engine.bossActive) return false;
  if (!runtime.running) {
    const next = engine.isSandbox ? runtime.selectedWave : runtime.nextWave;
    startWave(engine, next, engine.isSandbox);
  }
  clearChapter1CombatObjects(engine);
  runtime.eventCursor = runtime.events.length;
  finishWave(engine);
  return true;
}

function updateDeferred(engine: Chapter1WaveEngine): void {
  const runtime = ensureRuntime(engine);
  for (let index = runtime.deferred.length - 1; index >= 0; index -= 1) {
    const action = runtime.deferred[index];
    if (runtime.clock < action.time) continue;
    runtime.deferred.splice(index, 1);
    action.run();
  }
}

function defer(engine: Chapter1WaveEngine, delay: number, run: () => void): void {
  const runtime = ensureRuntime(engine);
  runtime.deferred.push({ time: runtime.clock + delay, run });
}

export function updateChapter1WaveDirectorSystem(engine: Chapter1WaveEngine, dt: number): void {
  const runtime = ensureRuntime(engine);
  if (!runtime.enabled || engine.bossActive || engine.clearingForBoss) return;

  runtime.cueTimer = Math.max(0, runtime.cueTimer - dt);
  runtime.bannerTimer = Math.max(0, runtime.bannerTimer - dt);
  runtime.clearTimer = Math.max(0, runtime.clearTimer - dt);
  runtime.telegraphs.forEach((telegraph) => {
    telegraph.age += dt;
  });
  runtime.telegraphs = runtime.telegraphs.filter((telegraph) => telegraph.age < telegraph.life);

  if (!runtime.running) {
    if (runtime.allWavesCleared) return;
    if (runtime.clearTimer > 0) return;
    const next = engine.isSandbox ? runtime.selectedWave : runtime.nextWave;
    startWave(engine, next, engine.isSandbox);
  }

  runtime.elapsed += dt;
  runtime.clock += dt;
  updateDeferred(engine);

  while (runtime.eventCursor < runtime.events.length && runtime.events[runtime.eventCursor].at <= runtime.elapsed) {
    const event = runtime.events[runtime.eventCursor++];
    event.run();
    runtime.cueText = event.label;
    runtime.cueTimer = 1;
  }

  const allEventsRun = runtime.eventCursor >= runtime.events.length;
  const liveEnemies = engine.enemies.some((enemy: Enemy) => enemy.active && isChapter1EnemyType(enemy.type));
  if (allEventsRun && !liveEnemies) finishWave(engine);
}

function aimedVelocity(x: number, y: number, targetX: number, targetY: number, speed: number) {
  const direction = normalize(targetX - x, targetY - y);
  return { vx: direction.x * speed, vy: direction.y * speed };
}

function addEnemyBullet(engine: Chapter1WaveEngine, options: Partial<Chapter1BulletState> & { x: number; y: number }): Bullet {
  const bullet = new Bullet();
  bullet.isEnemy = true;
  if (engine.player?.isDead) {
    bullet.active = false;
    return bullet;
  }
  bullet.damage = 1;
  bullet.type = "normal";
  const state: Chapter1BulletState = {
    sprite: options.sprite ?? 0,
    cx: options.x,
    cy: options.y,
    vx: options.vx ?? 0,
    vy: options.vy ?? 180,
    r: options.r ?? 11,
    age: 0,
    life: options.life ?? 8,
    rotation: options.rotation ?? 0,
    spin: options.spin ?? 0,
    phase: options.phase ?? rand(0, TAU),
    baseX: options.x,
    baseY: options.y,
    behavior: options.behavior ?? "linear",
    ownerType: options.ownerType ?? -1,
    destructible: options.destructible ?? false,
    hp: options.hp ?? 1,
    maxHp: options.maxHp ?? options.hp ?? 1,
    drawW: options.drawW,
    drawH: options.drawH,
    hitW: options.hitW,
    hitH: options.hitH,
    hold: options.hold,
    targetY: options.targetY,
    turned: options.turned,
    nextPulse: options.nextPulse,
    pulseCue: options.pulseCue,
    dropStarted: options.dropStarted,
    dropSpeed: options.dropSpeed,
    installed: options.installed,
    scheduleSlot: options.scheduleSlot,
    sineAmplitude: options.sineAmplitude,
    sineFrequency: options.sineFrequency,
    maxR: options.maxR,
    thickness: options.thickness,
    skipStandardPlayerCollision: true,
  };
  if ([0, 1, 2, 3, 5, 7, 8].includes(state.sprite)) state.r *= 1.22;
  bullet.chapter1 = state;
  syncBulletEntity(engine, bullet);
  engine.bullets.push(bullet);
  return bullet;
}

function addNoticeRing(engine: Chapter1WaveEngine, bell: Bullet): void {
  const bellState = bell.chapter1;
  if (!bellState) return;
  const ring = addEnemyBullet(engine, {
    x: bellState.cx,
    y: bellState.cy,
    sprite: 2,
    r: 10,
    maxR: 84,
    life: 0.72,
    behavior: "ring",
    ownerType: 2,
    thickness: 11,
  });
  ring.chapter1!.anchorBullet = bell;
  engine.spawnExplosion?.(ring.x + ring.width / 2, ring.y + ring.height / 2, "#ffd472", 8);
}

function occupiedScheduleSlots(engine: Chapter1WaveEngine): Set<string> {
  const runtime = ensureRuntime(engine);
  const occupied = new Set<string>();
  engine.bullets.forEach((bullet: Bullet) => {
    if (bullet.active && bullet.chapter1?.ownerType === 6 && bullet.chapter1.scheduleSlot) occupied.add(bullet.chapter1.scheduleSlot);
  });
  runtime.telegraphs.forEach((telegraph) => {
    if (telegraph.kind === "blockZone" && telegraph.scheduleSlot && !telegraph.cancelled) occupied.add(telegraph.scheduleSlot);
  });
  return occupied;
}

function attackEnemy(engine: Chapter1WaveEngine, enemy: Enemy): void {
  const state = enemy.chapter1;
  if (!state || engine.player?.isDead) return;
  const player = getPlayerCanonical(engine);
  const rate = 1;
  const speed = 205;

  switch (state.index) {
    case 0: {
      const velocity = aimedVelocity(state.cx, state.cy + 22, player.x, player.y, 220);
      addEnemyBullet(engine, { x: state.cx, y: state.cy + 25, vx: velocity.vx, vy: velocity.vy, sprite: 0, r: 11, spin: 0.7, ownerType: 0 });
      state.attack = 1.35 * rate;
      break;
    }
    case 1: {
      const base = Math.atan2(state.vy || 1, state.vx || 0);
      [-0.27, -0.09, 0.09, 0.27].forEach((offset) => {
        addEnemyBullet(engine, { x: state.cx, y: state.cy + 18, vx: Math.cos(base + offset) * speed, vy: Math.sin(base + offset) * speed, sprite: 1, r: 11, spin: offset * 2, ownerType: 1 });
      });
      state.attack = 2 * rate;
      break;
    }
    case 2:
      addEnemyBullet(engine, { x: state.cx, y: state.cy + 28, vx: rand(-22, 22), vy: 82, sprite: 2, r: 17, life: 10, destructible: true, hp: 5, maxHp: 5, behavior: "bell", nextPulse: 3, ownerType: 2 });
      state.attack = 3.8 * rate;
      break;
    case 3:
      state.burst = 3;
      state.burstTimer = 0;
      state.attack = 2.65 * rate;
      break;
    case 4: {
      const laneWidth = BASE_WIDTH / 7;
      const gap = clamp(Math.floor(player.x / laneWidth), 1, 5);
      for (let lane = 1; lane <= 6; lane += 1) {
        if (lane === gap) continue;
        const x = laneWidth * lane;
        ensureRuntime(engine).telegraphs.push({ kind: "line", x1: x, y1: state.cy + 25, x2: x, y2: BASE_HEIGHT, age: 0, life: 0.9, color: "#b47aff" });
        addEnemyBullet(engine, { x, y: state.cy + 42, vx: 0, vy: 0, sprite: 4, r: 26, life: 7, drawW: 74, drawH: 48, hitW: 70, hitH: 44, behavior: "holdDrop", hold: 0.88, ownerType: 4 });
      }
      state.dropPulse = 0.75;
      state.attack = 3.65 * rate;
      break;
    }
    case 5:
      addEnemyBullet(engine, { x: state.cx, y: state.cy + 30, vx: 0, vy: 158, sprite: 5, r: 12, behavior: "linear", spin: 0.08, ownerType: 5 });
      state.attack = 2.15 * rate;
      break;
    case 6: {
      const laneWidth = BASE_WIDTH / 5;
      const blockWidth = Math.min(122, laneWidth * 0.84);
      const blockHeight = 112;
      const warningLife = 2;
      const rows = [390, 545, 700];
      const occupied = occupiedScheduleSlots(engine);
      const preferredY = clamp(player.y - 120, rows[0], rows[rows.length - 1]);
      const candidates: Array<{ key: string; x: number; y: number; score: number }> = [];
      for (let row = 0; row < rows.length; row += 1) {
        for (let lane = 0; lane < 5; lane += 1) {
          const key = String(lane) + ":" + String(row);
          if (occupied.has(key)) continue;
          candidates.push({ key, x: laneWidth * (lane + 0.5), y: rows[row], score: Math.abs(rows[row] - preferredY) + rand(0, 95) });
        }
      }
      candidates.sort((a, b) => a.score - b.score);
      const cap = Number.isFinite(state.globalBlockCap) ? state.globalBlockCap! : Infinity;
      const selected = candidates.slice(0, Math.min(2, Math.max(0, cap - occupied.size)));
      for (const slot of selected) {
        const warning: Chapter1WaveTelegraph = {
          kind: "blockZone",
          x: slot.x,
          y: slot.y,
          w: blockWidth,
          h: blockHeight,
          age: 0,
          life: warningLife,
          color: "#ff5b68",
          label: "중복!",
          scheduleSlot: slot.key,
          ownerEnemy: enemy,
          cancelled: false,
          resolved: false,
        };
        ensureRuntime(engine).telegraphs.push(warning);
        defer(engine, warningLife, () => {
          if (!enemy.active || warning.cancelled || warning.resolved) return;
          warning.resolved = true;
          addEnemyBullet(engine, {
            x: slot.x,
            y: -blockHeight,
            vx: 0,
            vy: 1420,
            sprite: 6,
            r: blockWidth * 0.42,
            drawW: blockWidth,
            drawH: blockHeight,
            hitW: blockWidth - 8,
            hitH: blockHeight - 8,
            life: 11,
            destructible: true,
            hp: 24,
            maxHp: 24,
            behavior: "blockSlam",
            targetY: slot.y,
            ownerType: 6,
            scheduleSlot: slot.key,
          });
        });
      }
      state.attack = 5.8 * rate;
      break;
    }
    case 7:
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4 + state.phase;
        addEnemyBullet(engine, { x: state.cx, y: state.cy + 5, vx: Math.cos(angle) * 190, vy: Math.sin(angle) * 190, sprite: 7, r: 13, spin: 1.2, ownerType: 7 });
      }
      state.countdown = 4;
      state.attack = 4 * rate;
      break;
    case 8: {
      if (state.open) {
        state.attack = 0.45;
        break;
      }
      if (state.charge <= 0 || state.collectTimer > 0) {
        state.attack = 0.35;
        break;
      }
      const shots = Math.min(8, state.charge);
      state.charge = 0;
      state.collectTimer = 0;
      state.absorbCooldown = 0;
      state.open = true;
      state.releaseTimer = 2.7;
      for (let index = 0; index < shots; index += 1) {
        defer(engine, index * 0.09, () => {
          if (!enemy.active) return;
          const angle = shots === 1 ? Math.PI / 2 : lerp(0.34, Math.PI - 0.34, index / (shots - 1));
          addEnemyBullet(engine, { x: state.cx, y: state.cy + 30, vx: Math.cos(angle) * 145, vy: Math.sin(angle) * 145 + 65, sprite: 8, r: 13, behavior: "homing", life: 7, spin: 0.7, ownerType: 8 });
        });
      }
      state.attack = 4.8 * rate;
      break;
    }
    case 9: {
      const offset = state.arrowAngleOffset || 0;
      for (let index = 0; index < 4; index += 1) {
        const angle = offset - Math.PI / 2 + index * Math.PI / 2;
        addEnemyBullet(engine, { x: state.cx, y: state.cy, vx: Math.cos(angle) * 210, vy: Math.sin(angle) * 210, sprite: 9, r: 12, behavior: "turn90", life: 7, ownerType: 9, rotation: offset });
      }
      state.attack = (state.attackInterval || 2.75) * rate;
      break;
    }
  }
}

export function cancelChapter1ScheduleWarningsSystem(engine: Chapter1WaveEngine, owner: Enemy): void {
  const runtime = ensureRuntime(engine);
  runtime.telegraphs.forEach((telegraph) => {
    if (telegraph.kind !== "blockZone" || telegraph.ownerEnemy !== owner) return;
    telegraph.cancelled = true;
    telegraph.kind = "blockZoneCancel";
    telegraph.age = 0;
    telegraph.life = 0.62;
    telegraph.cancelSeed = rand(0, TAU);
  });
}

export function deactivateChapter1EnemySystem(engine: Chapter1WaveEngine, enemy: Enemy): void {
  if (!isChapter1EnemyType(enemy.type)) return;
  if (enemy.chapter1?.index === 6) cancelChapter1ScheduleWarningsSystem(engine, enemy);
}

export function updateChapter1WaveEnemiesSystem(engine: Chapter1WaveEngine, dt: number): void {
  if (engine.clearingForBoss) return;
  if (engine.isSandbox && engine.sandboxMode === "single") {
    const runtime = ensureRuntime(engine);
    runtime.elapsed += dt;
    runtime.clock += dt;
    updateDeferred(engine);
    runtime.telegraphs.forEach((telegraph) => { telegraph.age += dt; });
    runtime.telegraphs = runtime.telegraphs.filter((telegraph) => telegraph.age < telegraph.life);
  }
  const player = getPlayerCanonical(engine);

  engine.enemies.forEach((enemy: Enemy) => {
    if (!enemy.active || !isChapter1EnemyType(enemy.type) || !enemy.chapter1) return;
    const state = enemy.chapter1;
    const oldX = state.cx;
    const oldY = state.cy;
    const freezeMovement = engine.isSandbox && engine.sandboxMode === "single" && !engine.sandboxMovementEnabled;
    state.age += dt;
    if (!engine.player?.isDead) state.attack -= dt;
    state.stateTimer -= dt;
    state.phase += dt;
    state.hitFlash = Math.max(0, state.hitFlash - dt);
    state.dropPulse = Math.max(0, (state.dropPulse || 0) - dt);

    if (state.index !== 1 && state.index !== 5 && state.state === "enter") {
      state.cy = lerp(state.cy, state.targetY, Math.min(1, dt * 2.4));
      if (Math.abs(state.cy - state.targetY) < 3) state.state = "active";
    }

    switch (state.index) {
      case 0:
        state.cx += clamp(player.x - state.cx, -75, 75) * dt * 0.46;
        state.cy += clamp((player.y - 280) - state.cy, -35, 35) * dt * 0.15;
        state.cx += Math.sin(state.age * 2.2 + state.phase) * 14 * dt;
        break;
      case 1:
        state.cx += state.vx * dt;
        state.cy += state.vy * dt;
        if (state.cx < -140 || state.cx > BASE_WIDTH + 140 || state.cy > BASE_HEIGHT + 140) enemy.active = false;
        break;
      case 2:
        state.cx += Math.sin(state.age * 1.25 + state.phase) * 55 * dt;
        break;
      case 3: {
        const targetX = BASE_WIDTH / 2 + Math.sin(state.age * 0.45 + state.motionSeed) * 185;
        state.cx = lerp(state.cx, targetX, Math.min(1, dt * 2.1));
        if (state.burst > 0 && !engine.player?.isDead) {
          state.burstTimer -= dt;
          if (state.burstTimer <= 0) {
            const index = 3 - state.burst;
            const predictedX = clamp(player.x + (index - 1) * player.tilt * 55, 30, BASE_WIDTH - 30);
            const velocity = aimedVelocity(state.cx, state.cy + 28, predictedX, player.y, 225 + index * 28);
            addEnemyBullet(engine, { x: state.cx, y: state.cy + 28, vx: velocity.vx, vy: velocity.vy, sprite: 3, r: 13, spin: 0.08, ownerType: 3 });
            state.burst -= 1;
            state.burstTimer = 0.18;
          }
        }
        break;
      }
      case 4:
        state.cx = BASE_WIDTH / 2 + Math.sin(state.age * 1.18 + state.motionSeed) * 178 + Math.sin(state.age * 3.45 + state.motionSeed * 0.7) * 32;
        state.cy = state.targetY + Math.sin(state.age * 2.05 + state.motionSeed) * 34 + Math.cos(state.age * 4.2) * 7;
        break;
      case 5:
        state.cy += state.vy * dt;
        state.cx += Math.sin(state.age * 2.6 + state.phase) * 105 * dt;
        if (state.cy > BASE_HEIGHT + 120) {
          state.cy = -100;
          state.cx = rand(120, BASE_WIDTH - 120);
        }
        break;
      case 6: {
        const step = Math.floor(state.age * 1.2) % 4;
        const targets = [BASE_WIDTH * 0.25, BASE_WIDTH * 0.5, BASE_WIDTH * 0.75, BASE_WIDTH * 0.5];
        state.cx = lerp(state.cx, targets[step], Math.min(1, dt * 2.8));
        break;
      }
      case 7:
        state.cx = BASE_WIDTH / 2 + Math.cos(state.age * 0.82 + state.phase) * 190;
        state.cy = state.targetY + Math.sin(state.age * 1.42) * 45;
        state.countdown = Math.max(0, Math.ceil(state.attack));
        break;
      case 8:
        state.cx = BASE_WIDTH / 2 + Math.sin(state.age * 0.55) * 130;
        state.absorbCooldown = Math.max(0, state.absorbCooldown - dt);
        state.absorbNotice = Math.max(0, state.absorbNotice - dt);
        if (state.open) {
          state.releaseTimer -= dt;
          if (state.releaseTimer <= 0) {
            state.open = false;
            state.attack = 0.35;
          }
        } else if (state.charge > 0) {
          state.collectTimer = Math.max(0, state.collectTimer - dt);
          if (state.charge >= 8 || state.collectTimer <= 0) {
            state.collectTimer = 0;
            state.attack = 0;
          } else {
            state.attack = Math.max(state.attack, state.collectTimer + 0.04);
          }
        }
        break;
      case 9:
        state.cx += Math.sin(state.age * 2.1 + state.phase) * 34 * dt;
        state.cy += Math.cos(state.age * 1.7) * 16 * dt;
        state.nextTeleport -= dt;
        if (state.nextTeleport <= 0 && state.state === "active") {
          const nextX = rand(90, BASE_WIDTH - 90);
          const nextY = rand(95, 260);
          ensureRuntime(engine).telegraphs.push({ kind: "warp", x1: state.cx, y1: state.cy, x2: nextX, y2: nextY, age: 0, life: 0.35, color: "#69d8ff" });
          state.cx = nextX;
          state.cy = nextY;
          state.nextTeleport = rand(2.2, 3.3);
        }
        break;
    }

    if (state.waveMotion === "anchor") {
      const speed = state.anchorSpeed || 1;
      const targetX = (state.anchorX ?? BASE_WIDTH / 2) + Math.sin(state.age * speed + state.phase) * (state.anchorAmpX ?? 20);
      const targetY = (state.anchorY ?? state.targetY) + Math.cos(state.age * speed * 1.37 + state.phase) * (state.anchorAmpY ?? 8);
      state.cx = lerp(state.cx, targetX, Math.min(1, dt * 2.8));
      if (state.state === "active") state.cy = lerp(state.cy, targetY, Math.min(1, dt * 2.5));
    } else if (state.waveMotion === "bugLane") {
      const laneX = (state.anchorX ?? BASE_WIDTH / 2) + Math.sin(state.age * (state.anchorSpeed || 1.2) + state.phase) * (state.anchorAmpX ?? 48);
      state.cx = lerp(state.cx, laneX, Math.min(1, dt * 4));
    }

    if (freezeMovement) {
      state.cx = oldX;
      state.cy = oldY;
    }

    state.motionX = lerp(state.motionX, (state.cx - oldX) / Math.max(dt, 0.001), Math.min(1, dt * 8));
    state.motionY = lerp(state.motionY, (state.cy - oldY) / Math.max(dt, 0.001), Math.min(1, dt * 8));
    syncEnemyEntity(engine, enemy);

    if (!engine.player?.isDead && state.attack <= 0 && enemy.active && (state.state === "active" || state.index === 1 || state.index === 5)) attackEnemy(engine, enemy);
  });
}

export function updateChapter1WaveBulletsSystem(engine: Chapter1WaveEngine, dt: number): Set<Bullet> {
  updateChapter1WaveImpactEffectsSystem(engine, dt);
  const handled = new Set<Bullet>();
  const player = getPlayerCanonical(engine);

  engine.bullets.forEach((bullet: Bullet) => {
    const state = bullet.chapter1;
    if (!bullet.active || !state) return;
    handled.add(bullet);
    state.age += dt;
    state.rotation += state.spin * dt;
    state.hitFlash = Math.max(0, (state.hitFlash ?? 0) - dt);

    if (state.behavior === "ring") {
      const anchor = state.anchorBullet as Bullet | undefined;
      if (!anchor?.active || !anchor.chapter1) {
        bullet.active = false;
        return;
      }
      state.cx = anchor.chapter1.cx;
      state.cy = anchor.chapter1.cy;
      state.r = lerp(8, state.maxR ?? 84, clamp(state.age / state.life, 0, 1));
      if (state.age >= state.life) bullet.active = false;
      syncBulletEntity(engine, bullet);
      return;
    }

    switch (state.behavior) {
      case "bell": {
        const omega = TAU / 3;
        const swing = Math.sin(state.age * omega + state.phase);
        state.cx += (state.vx + swing * 24) * dt;
        state.cy += state.vy * dt;
        state.rotation = swing * 0.28;
        state.nextPulse = (state.nextPulse ?? 3) - dt;
        state.pulseCue = clamp(1 - state.nextPulse / 0.62, 0, 1);
        if (state.nextPulse <= 0) {
          addNoticeRing(engine, bullet);
          state.vx = rand(-45, 45);
          state.nextPulse = 3;
          state.pulseCue = 0;
        }
        break;
      }
      case "holdDrop":
        if (state.age < (state.hold ?? 0.88)) {
          state.cx = state.baseX + Math.sin(state.age * 34 + state.phase) * (2 + state.age * 5);
          state.cy = state.baseY + Math.sin(state.age * 22 + state.phase) * 2.5;
        } else {
          if (!state.dropStarted) {
            state.dropStarted = true;
            state.dropSpeed = 175;
          }
          state.dropSpeed = Math.min(690, (state.dropSpeed ?? 175) + 1180 * dt);
          state.vy = state.dropSpeed;
          state.cy += state.vy * dt;
        }
        break;
      case "sine":
        state.cy += state.vy * dt;
        state.cx = state.baseX + state.vx * state.age + Math.sin(state.age * (state.sineFrequency ?? 2.15) + state.phase) * (state.sineAmplitude ?? 22);
        break;
      case "blockSlam":
        state.vy = Math.min(1850, state.vy + 2400 * dt);
        state.cy += state.vy * dt;
        if (state.cy >= (state.targetY ?? state.cy)) {
          state.cy = state.targetY ?? state.cy;
          state.vx = 0;
          state.vy = 0;
          state.rotation = 0;
          state.behavior = "blockInstalled";
          state.installed = true;
          const scale = getScale(engine);
          spawnChapter1ScheduleSlamEffectSystem(
            engine,
            state.cx * scale.x,
            state.cy * scale.y,
            (state.drawW ?? 98) * scale.x,
            (state.drawH ?? 98) * scale.y,
          );
        }
        break;
      case "blockInstalled":
        state.vx = 0;
        state.vy = 0;
        break;
      case "homing":
        if (state.age > 0.55) {
          const direction = normalize(player.x - state.cx, player.y - state.cy);
          state.vx = lerp(state.vx, direction.x * 220, Math.min(1, dt * 1.7));
          state.vy = lerp(state.vy, direction.y * 220, Math.min(1, dt * 1.7));
        }
        state.cx += state.vx * dt;
        state.cy += state.vy * dt;
        break;
      case "turn90":
        state.cx += state.vx * dt;
        state.cy += state.vy * dt;
        if (!state.turned && state.age > 0.66) {
          state.turned = true;
          const speed = 245;
          if (Math.abs(state.vx) > Math.abs(state.vy)) {
            state.vx = 0;
            state.vy = Math.sign(player.y - state.cy || 1) * speed;
          } else {
            state.vy = 0;
            state.vx = Math.sign(player.x - state.cx || 1) * speed;
          }
          state.rotation += Math.PI / 2;
        }
        break;
      default:
        state.cx += state.vx * dt;
        state.cy += state.vy * dt;
        break;
    }

    if (state.cx < -180 || state.cx > BASE_WIDTH + 180 || state.cy < -180 || state.cy > BASE_HEIGHT + 180 || state.age > state.life) {
      bullet.active = false;
    }
    syncBulletEntity(engine, bullet);
  });
  return handled;
}

export function getChapter1WaveProgressSystem(engine: Chapter1WaveEngine) {
  const runtime = ensureRuntime(engine);
  return {
    waveIndex: runtime.selectedWave,
    waveCount: CHAPTER1_WAVE_CATALOG.length,
    running: runtime.running,
    cueText: runtime.cueText,
    cueTimer: runtime.cueTimer,
    bannerTimer: runtime.bannerTimer,
    allWavesCleared: runtime.allWavesCleared,
  };
}
