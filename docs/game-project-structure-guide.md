# 게임 프로젝트 구조 안내서

이 문서는 Vite + React + TypeScript 기반 세로 스크롤 슈팅 게임 프로젝트에서 **어떤 파일이 어떤 역할을 하는지** 빠르게 찾기 위한 구조 설명서입니다.

코드 작업 시 전체 프로젝트를 매번 GPT/Codex에 넣지 않고, 이 문서를 먼저 읽힌 뒤 **수정하려는 기능과 관련된 파일만 골라서 전달**하는 용도로 작성했습니다. 이 문서는 전체 코드를 복사하지 않고, 파일별 책임과 주요 함수/메서드의 역할만 요약합니다.

---

## 1. 이 문서를 사용하는 방법

작업 요청을 할 때는 보통 아래 순서로 보면 됩니다.

```txt
1. 수정하려는 기능을 정한다.
2. 이 문서의 “수정 목적별 우선 확인 파일” 표에서 관련 파일을 찾는다.
3. 해당 파일과 관련 타입/렌더링/데이터 파일만 GPT에 전달한다.
4. 수정 범위가 애매하면 이 문서를 함께 전달하고, 필요한 추가 파일을 먼저 물어본다.
```

예를 들어 “보스가 쏘는 탄막 패턴을 바꾸고 싶다”면 먼저 아래 파일을 봅니다.

```txt
src/game/boss/bossAttackPatternSystem.ts
src/game/boss/bossPhaseSelectionSystem.ts
src/game/bullets/bulletMovementAndSpecialPatternSystem.ts
src/game/render/enemyBulletVisualRenderer.ts
src/game/entities.ts
```

반대로 “탄알 모양만 바꾸고 싶다”면 보통 아래 파일이면 충분합니다.

```txt
src/game/render/enemyBulletVisualRenderer.ts
src/game/render/gameSceneRenderer.ts
src/game/entities.ts
```

---

## 2. 최상단 폴더와 루트 파일 역할

| 경로 | 역할 | 수정 기준 |
|---|---|---|
| `src/` | 실제 게임과 UI의 원본 코드 | 게임 기능 수정 시 주 대상 |
| `public/` | 빌드 시 그대로 복사되는 이미지, 오디오, 아이콘 같은 정적 자산 | 배경, BGM, 아이콘 추가/교체 시 수정 |
| `docs/` | 프로젝트 설명서와 개발 문서 | 구조 설명, 설정법, 리팩터링 기록 추가 시 수정 |
| `dist/` | `npm.cmd run build` 결과물 | 직접 수정하지 않음 |
| `assets/` | 외부 도구 또는 AI Studio 관련 자산 폴더 | 현재 게임 로직 수정 대상 아님 |
| `node_modules/` | 설치된 라이브러리 | 직접 수정 금지 |
| `supabase/` | 온라인 랭킹용 DB/서버리스 함수 | 랭킹 API, 점수 제출, DB 구조 수정 시 확인 |
| `.env.example` | 필요한 환경변수 예시 | 새 환경변수 추가 시 수정 |
| `.env.local` | 개인 개발 환경의 실제 환경변수 | Git에 올리면 안 됨 |
| `.gitignore` | Git에서 제외할 파일 목록 | `dist`, `.env.local`, 임시 파일 제외 정책 수정 시 확인 |
| `index.html` | React 앱이 붙는 HTML 진입점 | 웹 제목, favicon, meta 태그 수정 시 확인 |
| `metadata.json` | 앱/생성 도구/배포 도구용 메타데이터일 가능성이 큰 파일 | 내용 확인 후 이름, 설명, 아이콘 같은 메타정보 수정 시 확인 |
| `package.json` | 실행 명령어와 의존성 목록 | 라이브러리 추가, script 추가/변경 시 수정 |
| `package-lock.json` | npm 설치 버전 잠금 파일 | 직접 수정하지 않음. `npm.cmd install`로 자동 갱신 |
| `pnpm-lock.yaml` | pnpm 설치 버전 잠금 파일 | pnpm을 쓰는 경우만 유지. npm 기준이면 정리 후보 |
| `pnpm-workspace.yaml` | pnpm workspace 설정 | 단일 앱 프로젝트라면 자주 수정하지 않음 |
| `README.md` | 프로젝트 소개와 실행 방법 | 프로젝트 설명, 실행법, 배포법 정리 시 수정 |
| `tsconfig.json` | TypeScript 검사/컴파일 설정 | 타입 검사 정책, alias, include/exclude 변경 시 수정 |
| `vite.config.ts` | Vite 개발 서버/빌드 설정 | base 경로, 빌드 설정, dev 서버 설정 변경 시 수정 |

`dist`는 아래 관계의 결과물입니다.

\[
\texttt{src} + \texttt{public} \xrightarrow{\text{build}} \texttt{dist}
\]

따라서 `dist`를 직접 고치는 대신 원본인 `src`나 `public`을 수정한 뒤 다시 빌드해야 합니다.

---

## 3. 수정 목적별 우선 확인 파일

| 수정하고 싶은 것 | 먼저 볼 파일 |
|---|---|
| 게임 루프, 시작/정지, 상태 보관, public API | `src/game/engine.ts` |
| 플레이어 이동, 부활, 무적, 위성 발사 | `src/game/player/playerMovementRespawnAndSatelliteSystem.ts` |
| 플레이어 기본 탄환, Vanguard 탄환 | `src/game/player/playerWeaponBulletPatternSystem.ts` |
| 플레이어 피격, 사망, 게임오버 | `src/game/player/playerDamageAndRespawnSystem.ts` |
| 플레이어 스마트 폭탄 | `src/game/player/playerSmartBombSystem.ts` |
| 일반 몬스터 이동/공격 | `src/game/enemies/enemyMovementAndAttackSystem.ts` |
| 일반 몬스터 스폰/웨이브 | `src/game/enemies/enemySpawnWaveSystem.ts` |
| 일반 몬스터가 쏘는 탄 생성 | `src/game/enemies/enemySubtypeWeaponSystem.ts` |
| 일반 몬스터 외형 | `src/game/enemies/enemyShapeRenderer.ts` |
| 보스 체력/페이즈 선택 | `src/game/boss/bossPhaseSelectionSystem.ts` |
| 보스 탄막 생성/보스 분대 소환 | `src/game/boss/bossAttackPatternSystem.ts` |
| 보스 해저드 판정/갱신 | `src/game/boss/bossPatternHazardSystem.ts` |
| 보스 해저드 시각화 | `src/game/boss/bossHazardRenderer.ts` |
| 보스 본체 외형 | `src/game/render/bossBodyRenderer.ts` |
| 탄환 이동, 유도, 분열, 폭발, 회수 | `src/game/bullets/bulletMovementAndSpecialPatternSystem.ts` |
| 탄환 디자인, 발광, 꼬리, 미사일 모양 | `src/game/render/enemyBulletVisualRenderer.ts` |
| 충돌, 데미지, 파워업 획득 | `src/game/collision/collisionDamageAndPowerUpCollectionSystem.ts` |
| 전투 화면 전체 렌더링 순서 | `src/game/render/gameSceneRenderer.ts` |
| 배경, 별, 격자, 패럴랙스 | `src/game/render/backgroundRenderer.ts` |
| 스테이지 흐름, 보스 컷신 | `src/game/stage/stageFlowAndBossCutsceneSystem.ts` |
| 개발자 샌드박스 전투 미리보기 | `src/game/sandbox/sandboxCombatPreviewSystem.ts` |
| 파티클/폭발 이펙트 | `src/game/effects/particleAndExplosionSystem.ts` |
| 파워업 낙하 이동 | `src/game/items/powerUpMovementSystem.ts` |
| 운석/엄폐 잔해 | `src/game/obstacles/debrisMeteorUpdateSystem.ts` |
| 도움 드론 행동 | `src/game/drones/helperDroneBehaviorSystem.ts` |
| 사운드/BGM/SFX | `src/game/AudioSystem.ts` |
| 점수 보상, 스테이지 클리어 보상 | `src/game/systems/rewardSystem.ts` |
| 랭킹 제출 검증 | `src/services/leaderboard/antiCheat.ts` |
| 로컬 랭킹 저장 | `src/services/leaderboard/localLeaderboard.ts` |
| 온라인 랭킹 연동 | `src/services/leaderboard/onlineLeaderboard.ts` |
| 앱 메뉴, 캔버스 연결, 게임 화면 UI | `src/App.tsx` |
| 개발자 샌드박스 UI | `src/components/DevSandbox.tsx` |
| 게임오버/점수 제출 UI | `src/components/GameOverPanel.tsx` |
| 랭킹 화면 UI | `src/components/LeaderboardPanel.tsx` |

---

# 4. `src/` 폴더 구조

```txt
src/
├─ App.tsx
├─ main.tsx
├─ index.css
├─ store.ts
├─ types.ts
├─ components/
├─ game/
├─ lib/
└─ services/
```

`src`는 실제 앱 원본 코드입니다. 게임 로직은 대부분 `src/game` 아래에 있고, React UI는 `src/App.tsx`와 `src/components`에 있습니다.

---

## 4.1 앱 진입점과 전역 상태

### `src/main.tsx`

**역할**  
React 앱을 브라우저 DOM에 붙이는 가장 첫 진입점입니다.

**주요 기능**

| 항목 | 역할 |
|---|---|
| React root 생성 | `index.html`의 root DOM에 React 앱을 연결 |
| `App` 렌더링 | 실제 앱 컴포넌트 실행 시작 |
| 전역 CSS import | `index.css`를 앱 전체에 적용 |

**수정 시점**  
앱 진입 방식, React root, 전역 provider 추가가 필요할 때 확인합니다.

---

### `src/index.css`

**역할**  
Tailwind CSS 진입 파일입니다.

**주요 기능**

| 항목 | 역할 |
|---|---|
| `@import "tailwindcss"` | Tailwind 유틸리티 스타일을 프로젝트에 적용 |

**수정 시점**  
전역 CSS, 폰트, body 스타일, 커스텀 CSS 변수를 넣고 싶을 때 확인합니다.

---

### `src/types.ts`

**역할**  
React 앱과 게임 UI에서 공통으로 쓰는 타입을 정의합니다.

**주요 타입**

| 타입 | 역할 |
|---|---|
| `GameState` | 메뉴, 플레이, 일시정지, 게임오버, 스토리 결과, 개발자 모드 등 앱 화면 상태 |
| `GameMode` | 아케이드 모드와 스토리 모드 구분 |
| `ShipColor` | 플레이어 기체 색상/기체 종류 옵션 |
| `GameSettings` | BGM, 효과음, 알림 등 사용자 설정 |
| `PlayerStats` | 최고 점수, 마지막 플레이 시각 같은 로컬 플레이어 기록 |

**수정 시점**  
새 화면 상태, 새 게임 모드, 새 기체 색상, 새 설정값을 추가할 때 확인합니다.

---

### `src/store.ts`

**역할**  
Zustand 기반 앱 전역 상태 저장소입니다.

**주요 기능**

| 함수/상태 | 역할 |
|---|---|
| `useAppStore` | 앱 화면 상태, 점수, 선택 기체, 설정, 통계, 마지막 플레이 결과를 보관 |
| `getInitialStats` | `localStorage`에서 플레이어 통계를 읽고 기본값을 생성 |
| `getInitialSettings` | `localStorage`에서 설정을 읽고 기본 설정과 병합 |
| `setGameState` | 현재 화면 상태 변경 |
| `setGameMode` | 아케이드/스토리 모드 변경 |
| `setScore` | 점수 저장 또는 함수형 업데이트 처리 |
| `setShipColor` | 선택 기체 색상 저장 |
| `updateSettings` | 설정 변경 후 `localStorage`에 저장 |
| `updateStats` | 플레이어 통계 변경 후 `localStorage`에 저장 |
| `setLastRun` | 게임오버 후 랭킹 제출에 필요한 마지막 플레이 결과 저장 |

**수정 시점**  
UI 전역 상태, 사용자 설정, 플레이 기록 저장 구조를 바꿀 때 확인합니다.

---

### `src/App.tsx`

**역할**  
앱 전체 화면 전환, 메인 메뉴, 게임 캔버스 연결, 설정 화면, 스토리 결과 화면, 랭킹 화면을 담당합니다.

**주요 컴포넌트/함수**

| 함수/컴포넌트 | 역할 |
|---|---|
| `App` | 현재 `GameState`에 따라 메뉴, 게임, 개발자 모드, 랭킹, 게임오버 화면을 전환 |
| `GameCanvas` | `GameEngine`을 생성하고 캔버스 크기, 입력, HUD 상태, 콜백을 연결 |
| `MenuButton` | 메인 메뉴 버튼 UI |
| `StoryResultPanel` | 스토리 모드 클리어/실패 결과 표시 |
| `OptionSlider` | 설정 화면의 볼륨 슬라이더 UI |
| `getRewardDetail` | 스테이지 보상 선택지의 설명 텍스트 생성 |
| `getSavedPlayerName` | 로컬 저장소에서 플레이어 이름 읽기 |
| `savePlayerName` | 플레이어 이름을 로컬 저장소에 저장 |
| `getOrCreatePlayerId` | 랭킹용 플레이어 ID를 로컬 저장소에서 읽거나 새로 생성 |
| `handleKeyDown` / `handleKeyUp` | 키보드 입력을 `GameInput`으로 변환 |
| `handleTouchStart` / `handleTouchEnd` / `handleTouchMove` | 모바일 터치 조작을 게임 입력으로 변환 |
| `handleStartGame` | 아케이드 모드 게임 시작 |
| `handleStartStory` | 스토리 모드 게임 시작 |

**수정 시점**  
메뉴 구성, 게임 시작 흐름, HUD 표시, 키보드/터치 입력, 스토리 결과 화면을 바꿀 때 확인합니다.

---

## 4.2 UI 컴포넌트

### `src/components/DevSandbox.tsx`

**역할**  
개발자용 전투 샌드박스 화면입니다. 특정 몬스터, 웨이브, 보스 페이즈, 무기 레벨, 폭탄 수, 위성 수 등을 조정해서 테스트할 수 있게 합니다.

**주요 기능**

| 함수/상태 | 역할 |
|---|---|
| `DevSandbox` | 샌드박스 UI와 `GameEngine` 샌드박스 설정을 연결 |
| `handleReset` | 현재 선택한 샌드박스 조건으로 전투 상태 재시작 |
| `selectBossChapter` | 테스트할 보스 챕터/단계를 선택 |
| `handleKeyDown` / `handleKeyUp` | 샌드박스 캔버스 입력 처리 |
| `developerMode` | 일반 실험실 모드와 보스 전투 미리보기 모드 구분 |
| `selectedType` | 단일 테스트할 몬스터 타입 |
| `selectedWave` | 테스트할 웨이브 번호 |
| `sandboxBossPhaseLock` | 특정 보스 페이즈 고정 테스트 |
| `weaponLevel`, `bombCount`, `supportCount` | 플레이어 장비 테스트 값 |

**관련 파일**

```txt
src/game/data/sandboxCatalog.ts
src/game/data/bossPhaseCatalog.ts
src/game/sandbox/sandboxCombatPreviewSystem.ts
src/game/engine.ts
```

---

### `src/components/GameOverPanel.tsx`

**역할**  
게임오버 후 점수, 스테이지, 기록, 랭킹 제출 UI를 표시합니다.

**주요 기능**

| 함수/컴포넌트 | 역할 |
|---|---|
| `GameOverPanel` | 최종 점수와 새 최고점 여부 표시, 이름 입력, 랭킹 제출 처리 |
| `StatusBadge` | 랭킹 제출 상태나 경고 상태 표시 |
| `ensureOnlineRun` | 온라인 랭킹 제출에 필요한 실행 세션 준비 |
| `getSavedPlayerName` | 저장된 플레이어 이름 읽기 |
| `savePlayerName` | 플레이어 이름 저장 |

**관련 파일**

```txt
src/services/leaderboard/antiCheat.ts
src/services/leaderboard/localLeaderboard.ts
src/services/leaderboard/onlineLeaderboard.ts
src/store.ts
```

---

### `src/components/LeaderboardPanel.tsx`

**역할**  
로컬/온라인 랭킹 목록을 불러와 표시하는 화면입니다.

**주요 기능**

| 함수/컴포넌트 | 역할 |
|---|---|
| `LeaderboardPanel` | 랭킹 범위 선택, 랭킹 데이터 로딩, 화면 렌더링 |
| `ScopeButton` | 전체/일간/주간 등 랭킹 범위 선택 버튼 |
| `renderRankRow` | 한 명의 랭킹 항목을 행 형태로 표시 |
| `formatScore` | 점수를 표시용 문자열로 변환 |
| `formatDuration` | 플레이 시간을 표시용 문자열로 변환 |
| `getSavedPlayerName` | 현재 플레이어 이름 읽기 |

**관련 파일**

```txt
src/services/leaderboard/index.ts
src/services/leaderboard/localLeaderboard.ts
src/services/leaderboard/onlineLeaderboard.ts
```

---

# 5. `src/game/` 폴더 구조

`src/game`는 실제 전투 엔진, 엔티티, 시스템, 렌더링, 데이터, 사운드를 담당합니다.

```txt
src/game/
├─ engine.ts
├─ entities.ts
├─ AudioSystem.ts
├─ boss/
├─ bullets/
├─ collision/
├─ data/
├─ drones/
├─ effects/
├─ enemies/
├─ items/
├─ lifecycle/
├─ obstacles/
├─ player/
├─ render/
├─ runtime/
├─ sandbox/
├─ stage/
├─ systems/
└─ utils/
```

현재 구조에서 `engine.ts`는 세부 기능을 직접 구현하기보다, 상태 보관과 시스템 호출 순서를 담당하는 오케스트레이터입니다.

\[
\texttt{engine.ts}
=
\text{상태 보관}
+
\text{게임 루프}
+
\text{시스템 호출 순서}
+
\text{외부 UI 연결 API}
\]

---

## 5.1 엔진과 엔티티

### `src/game/engine.ts`

**역할**  
게임 엔진의 중심 클래스입니다. 캔버스, 상태 필드, 게임 루프, 외부 UI 콜백, 시스템 호출 순서를 관리합니다.

**주요 메서드 그룹**

| 메서드/그룹 | 역할 |
|---|---|
| `constructor` | 캔버스와 2D context 준비, 기본 엔진 상태 초기화 |
| `start` | 새 게임 시작, 초기 상태 구성, BGM 시작, 루프 시작 |
| `stop` | 애니메이션 루프 정지, 오디오 정리 |
| `loop` | `requestAnimationFrame` 기반 프레임 루프 |
| `update` | 한 프레임의 게임 상태 갱신 진입점. 실제 흐름은 stage 시스템에 위임 |
| `render` | 한 프레임의 화면 출력 진입점. 실제 렌더링은 render 시스템에 위임 |
| `isStoryMode` | 현재 플레이 모드가 스토리 모드인지 반환 |
| `awardScore` | 점수 증가와 UI 콜백 호출 |
| `configureSandboxLoadout` | 샌드박스 테스트용 플레이어 장비 설정 |
| `resetSandboxBossCombat` | 샌드박스 보스전 상태 재설정 |
| `startNextStageAfterReward` | 스테이지 보상 선택 후 다음 스테이지 진입 |
| `checkCollisions` | 충돌 시스템 호출 wrapper |
| `updateBullets` | 탄환 이동 시스템 호출 wrapper |
| `updatePlayer` | 플레이어 시스템 호출 wrapper |
| `updateEnemies` | 일반 몬스터 시스템 호출 wrapper |
| `updateBossPatternHazards` | 보스 해저드 시스템 호출 wrapper |
| `spawnEntities` | 일반 몬스터 스폰 시스템 호출 wrapper |
| `renderEnemyShape`, `renderBossJet`, `renderEnemyBulletVisual` | 렌더링 시스템 호출 wrapper |

**수정 시점**  
새 시스템 호출 순서를 바꾸거나, UI와 연결되는 public method를 추가하거나, 게임 전체 상태 필드를 추가할 때 확인합니다. 세부 기능 수정은 대부분 하위 시스템 파일에서 처리합니다.

---

### `src/game/entities.ts`

**역할**  
게임에서 쓰는 기본 엔티티 클래스와 핵심 타입을 정의합니다.

**주요 클래스/타입**

| 항목 | 역할 |
|---|---|
| `Entity` | 위치, 크기, 속도, 활성 상태를 갖는 기본 객체 |
| `Player` | 플레이어 기체 상태. HP, 파워레벨, 폭탄, 무적 시간 등을 포함 |
| `Enemy` | 일반 몬스터/보스 공통 적 객체. 타입, HP, 공격 타이머, 페이즈 상태 등을 포함 |
| `InkCloud` | 잉크 구름 같은 잔류 공격 영역 |
| `Bullet` | 플레이어탄/적탄/보스탄 공통 탄환 객체 |
| `Particle` | 폭발, 잔상, 타격 효과용 파티클 |
| `PowerUp` | 파워업 아이템 객체 |
| `EnemyType` | 일반 적과 특수 적 타입 목록 |
| `BulletVisualType` | 탄환 시각 디자인 타입 |
| `EngineState` | 엔진 내부 전투 상태 |
| `GameInput` | 키보드/터치 입력 상태 |
| `SquadPattern` | 적 분대/편대 패턴 타입 |
| `SpaceObject` | 위치/크기 기반 충돌 대상 인터페이스 |

**수정 시점**  
새 엔티티 필드, 새 적 타입, 새 탄환 타입, 새 엔진 상태가 필요할 때 확인합니다. 여러 시스템이 동시에 타입 에러를 내면 이 파일을 먼저 봅니다.

---

### `src/game/AudioSystem.ts`

**역할**  
게임 효과음과 BGM을 재생하고, 볼륨과 오디오 상태를 관리합니다.

**주요 기능**

| 함수/메서드 | 역할 |
|---|---|
| `sfx` | 전역 오디오 시스템 인스턴스 |
| `AudioSystem.init` | 브라우저 오디오 context 초기화 |
| `setVolumes` | 전체 BGM/SFX 볼륨 설정 |
| `setCategoryVolumes` | 플레이어 발사, 적 피격, 아이템 등 카테고리별 볼륨 설정 |
| `pauseAll` / `resumeAll` | 일시정지 시 전체 오디오 정지/재개 |
| `shoot` | 플레이어 발사 효과음 |
| `satelliteShoot` | 위성 발사 효과음 |
| `satelliteDestroy` | 위성 파괴 효과음 |
| `hit` | 일반 피격음 |
| `enemyHit` | 적 피격음 |
| `enemyExplode` | 적 폭발음 |
| `powerup` | 아이템 획득음 |
| `bossHit` | 보스 피격음 |
| `bossExplode` | 보스 폭발음 |
| `bossPatternFire` | 보스 패턴 발사음 |
| `laserBlast` | 레이저/강한 에너지 공격음 |
| `bossDash` | 보스 돌진음 |
| `startBgmForPhase` | 스테이지/페이즈에 맞는 BGM 시작 |
| `startBossBgm` | 보스전 BGM 시작 |
| `startBgm` / `stopBgm` | 기본 BGM 시작/정지 |

**수정 시점**  
효과음 종류, BGM 전환, 볼륨 정책, 새로운 사운드 이벤트를 추가할 때 확인합니다.

---

## 5.2 플레이어 시스템

### `src/game/player/playerMovementRespawnAndSatelliteSystem.ts`

**역할**  
플레이어 이동, 부활, 무적 시간, 기본 발사 입력, 위성 보조 사격을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `updatePlayerMovementRespawnAndSatelliteSystem` | 입력에 따른 플레이어 위치 갱신, 화면 경계 제한, 사망 후 부활 처리, 무적 시간 감소, 플레이어 발사와 위성 발사 타이머 처리 |

**수정 시점**  
플레이어 조작감, 이동 속도, 부활 위치, 무적 시간, 위성 회전/발사 주기를 바꿀 때 확인합니다.

---

### `src/game/player/playerWeaponBulletPatternSystem.ts`

**역할**  
플레이어 기본 무기와 Vanguard 전용 무기의 탄환 생성 규칙을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `firePlayerWeaponBulletPatternSystem` | 현재 파워레벨과 기체 색상에 맞는 플레이어 탄환 묶음을 생성 |
| `addPlayerBulletEntitySystem` | 실제 플레이어 탄환 객체를 bullets 배열에 추가 |

**수정 시점**  
플레이어 탄환 개수, 속도, 색상, 데미지, Vanguard 탄환 패턴을 수정할 때 확인합니다.

---

### `src/game/player/playerSmartBombSystem.ts`

**역할**  
스마트 폭탄 사용과 폭발 진행을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `triggerPlayerSmartBombSystem` | 폭탄 사용 가능 여부 확인, 폭탄 수 감소, 폭탄 상태 시작 |
| `updatePlayerSmartBombSystem` | 폭탄 반경 확장, 적탄 제거, 일반 적/운석/잔해 피해 처리, 폭발 파티클 생성 |

**수정 시점**  
폭탄 소모 방식, 폭발 범위, 폭발 속도, 피해량, 적탄 제거 정책을 바꿀 때 확인합니다.

---

### `src/game/player/playerDamageAndRespawnSystem.ts`

**역할**  
플레이어 피격, 목숨 감소, 사망/게임오버 전환을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `triggerPlayerDamageAndRespawnSystem` | 무적 상태 확인, HP 감소, 피격 파티클/화면 흔들림 생성, 사망 상태 또는 게임오버 전환 |

**수정 시점**  
플레이어 피격 판정 이후의 연출, 목숨 감소 방식, 사망 대기 시간, 게임오버 콜백을 조정할 때 확인합니다.

---

## 5.3 일반 몬스터 시스템

### `src/game/enemies/enemyMovementAndAttackSystem.ts`

**역할**  
일반 몬스터의 이동 패턴, 공격 타이머, 특수 행동, 잉크 구름 갱신을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `updateEnemyMovementAndAttackSystem` | 적 타입별 이동, 공격 타이밍, 특수 몬스터 행동, 공격 호출을 처리 |
| `updateEnemyInkCloudSystem` | 잉크 구름의 수명, 크기, 위치 등 잔류 효과 갱신 |

**수정 시점**  
일반 몬스터 이동, 공격 주기, 특수 적 행동, 잉크 구름 효과를 바꿀 때 확인합니다.

---

### `src/game/enemies/enemySpawnWaveSystem.ts`

**역할**  
일반 몬스터 웨이브 생성과 샌드박스 웨이브 생성을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `spawnEnemyWaveSystem` | 현재 스테이지/모드에 따라 일반 몬스터를 생성하고 보스 진입 조건을 처리 |
| `triggerSandboxEnemyWaveSystem` | 개발자 샌드박스에서 선택한 웨이브를 즉시 생성 |

**수정 시점**  
웨이브 구성, 몬스터 등장 타이밍, 스테이지별 스폰 정책, 샌드박스 웨이브 테스트를 바꿀 때 확인합니다.

---

### `src/game/enemies/enemySubtypeWeaponSystem.ts`

**역할**  
일반 몬스터가 공격 패턴에 따라 적탄을 생성하는 규칙을 담당합니다.

**주요 타입/함수**

| 항목 | 역할 |
|---|---|
| `EnemySubtypeWeaponPattern` | `aimed`, `homing`, `shotgun`, `straight` 같은 일반 몬스터 발사 패턴 타입 |
| `fireEnemySubtypeWeaponSystem` | 몬스터 위치와 플레이어 위치를 기준으로 조준탄, 유도탄, 산탄, 직선탄을 생성 |

**수정 시점**  
일반 몬스터가 쏘는 탄의 속도, 크기, 색상, 탄환 타입, visualType을 바꿀 때 확인합니다.

---

### `src/game/enemies/enemyAssaultCommanderSystem.ts`

**역할**  
중간 난입형 정예 몬스터인 어설트 커맨더의 생성과 공격을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `getAssaultCommanderHpMultiplierSystem` | 스테이지/전투 티어에 따른 체력 배율 계산 |
| `scaleAssaultEnemySystem` | 어설트 커맨더의 크기, 체력, 상태를 조정 |
| `spawnAssaultCommanderSystem` | 어설트 커맨더를 전투에 생성 |
| `fireAssaultCommanderSystem` | 어설트 커맨더 전용 탄막 발사 |

**수정 시점**  
정예 몬스터의 체력, 등장 방식, 크기, 공격 패턴을 바꿀 때 확인합니다.

---

### `src/game/enemies/enemyLifecycleCleanupSystem.ts`

**역할**  
몬스터 제거 시 함께 정리해야 하는 부속 오브젝트를 처리합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `deactivateEnemyAndAttachmentsSystem` | 적 비활성화와 함께 보호막, 위성, 부속 탄환 등 연결된 요소를 정리 |

**수정 시점**  
적 사망 후 남아 있으면 안 되는 부속 오브젝트 정리 규칙을 바꿀 때 확인합니다.

---

### `src/game/enemies/enemyStoryBulletTuningSystem.ts`

**역할**  
스토리 모드에서 적탄 난이도를 조정합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `tuneStoryEnemyBulletsSystem` | 스토리 모드 적탄의 속도, 데미지, 화면 내 탄 수 등을 완화 |

**수정 시점**  
스토리 모드 탄막 난이도를 낮추거나 올릴 때 확인합니다.

---

### `src/game/enemies/storyEnemyDifficultyTuningSystem.ts`

**역할**  
스토리 모드 일반 몬스터의 체력, 속도, 공격 타이밍을 조정합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `tuneStoryEnemyDifficultySystem` | 스토리 모드 전용으로 적 타입, HP, 이동속도, 첫 공격 타이밍을 보정 |

**수정 시점**  
스토리 모드 초반 난이도, 일반 몬스터 구성, 적 공격 빈도를 조정할 때 확인합니다.

---

### `src/game/enemies/enemyShapeRenderer.ts`

**역할**  
일반 몬스터의 도형 외형과 특수 시각 효과를 그립니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `renderEnemyShapeSystem` | 일반 몬스터 타입별 실루엣, 발광 코어, 보호막, 중력장 같은 시각 요소를 렌더링 |

**수정 시점**  
일반 몬스터 외형, 색상, 도형 실루엣, 특수 적 시각 효과를 바꿀 때 확인합니다.

---

## 5.4 보스 시스템

### `src/game/boss/bossPhaseSelectionSystem.ts`

**역할**  
보스 체력, 페이즈 후보 선택, 페이즈 지속 시간, 페이즈 전환을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `getBossMaxHpForTier` | 전투 티어 기준 보스 최대 체력 계산 |
| `getStoryBossMaxHpForTier` | 스토리 모드 기준 보스 최대 체력 계산 |
| `getBossMaxHp` | 현재 모드와 스테이지에 맞는 보스 최대 체력 반환 |
| `getStoryBossDelay` | 스토리 모드 보스 진입 지연 시간 반환 |
| `pickStoryBossPhase` | 스토리 모드에서 사용할 보스 페이즈 선택 |
| `pickNormalBossPhase` | 일반 보스전 페이즈 선택 |
| `pickOverdriveBossPhase` | 오버드라이브 보스 페이즈 선택 |
| `pickNextFinalBossPhase` | 최종장 보스 페이즈 순서 선택 |
| `pickChapter4BossPhase` | 챕터 4 보스 페이즈 선택 |
| `getBossPhaseDuration` | 페이즈별 지속 시간 반환 |
| `assignBossPhase` | 보스에게 특정 페이즈 상태 적용 |
| `assignNextBossPhase` | 다음 페이즈를 선택해 보스에 적용 |
| `resetBossPattern` | 보스 패턴 진행 상태 초기화 |
| `playBossLaserSoundOncePerCycle` | 보스 레이저 주기별 사운드 중복 재생 방지 |

**수정 시점**  
보스 체력, 페이즈 순서, 페이즈 길이, 스토리 모드 보스 제한을 바꿀 때 확인합니다.

---

### `src/game/boss/bossAttackPatternSystem.ts`

**역할**  
보스가 탄환을 생성하는 공격 패턴과 보스 분대 소환을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `fireBoss360Burst` | 보스 중심 기준 360도 탄막 생성 |
| `fireBossRapid` | 플레이어 방향 조준 연사 탄막 생성 |
| `triggerBossBulletCombos` | 보스 페이즈에 따른 혼합 탄막 콤보 실행 |
| `summonBossSquad` | 보스전 중 보조 적 편대 소환 |

**수정 시점**  
보스가 쏘는 탄 개수, 각도, 속도, 보조 적 소환 패턴을 바꿀 때 확인합니다.

---

### `src/game/boss/bossPatternHazardSystem.ts`

**역할**  
보스 특수 패턴의 상태, 해저드 갱신, 충돌 판정, 클리어 폭발 시퀀스를 담당합니다.

**주요 타입**

| 타입 | 역할 |
|---|---|
| `ElectricTrail` | 전기장/전기 궤적 상태 |
| `BossGridLaser` | 그리드 레이저 상태 |
| `TimedExplosionZone` | 시간 지연 폭발 구역 |
| `TailMine` | 꼬리 지뢰 상태 |
| `SuicideDrone` | 자폭 드론 상태 |
| `BossDashState` | 보스 돌진 상태 |
| `BossSafeZoneBlast` | 안전지대 폭발 패턴 상태 |
| `BossAbsorbOrb` | 흡수 구체 상태 |
| `BossAfterimageSlash` | 잔상 베기 상태 |
| `BossCompressionField` | 압축장 상태 |
| `BossEdgeStriker` | 화면 가장자리 공격 상태 |
| `BossMazeState` | 전기 미로 패턴 상태 |
| `PlayerHistoryPoint` | 플레이어 위치 기록 |

**주요 함수**

| 함수 | 역할 |
|---|---|
| `updatePlayerPositionHistory` | 플레이어 위치 기록을 축적 |
| `getPlayerHistoryPoint` | 특정 시점의 플레이어 과거 위치 반환 |
| `instantlyDownPlayer` | 보스 해저드용 즉시 피격 처리 |
| `createBossMazeState` | 전기 미로 패턴 상태 생성 |
| `clearBossPatternHazards` | 보스 해저드 배열과 상태 초기화 |
| `clampBossToArena` | 보스 위치를 전투 영역 안으로 제한 |
| `beginBossClearSequence` | 보스 클리어 폭발 시퀀스 시작 |
| `updateBossClearExplosion` | 보스 클리어 폭발 진행 |
| `finishBossClearSequence` | 보스 클리어 후 다음 상태로 전환 |
| `updateBossPatternHazards` | 현재 보스 페이즈에 맞는 해저드 갱신 |
| `hitPlayerFromBossHazard` | 보스 해저드에 의한 플레이어 피격 처리 |
| `checkPlayerAgainstSegment` | 플레이어와 선분형 해저드 충돌 검사 |
| `distancePointToSegment` | 점과 선분 사이 거리 계산 |
| `explodeSuicideDrone` | 자폭 드론 폭발 처리 |
| `runFinalMissileElectricField` | 최종장 미사일 전기장 패턴 실행 |
| `runFinalSuicideDronePattern` | 최종장 자폭 드론 패턴 실행 |
| `runFinalDenseGridLaser` | 최종장 고밀도 그리드 레이저 실행 |
| `runFinalBossDash` | 최종장 보스 돌진 실행 |
| `runFinalSafeZoneBlast` | 최종장 안전지대 폭발 실행 |
| `runFinalAbsorptionField` | 최종장 흡수장 실행 |
| `runFinalAfterimageSlash` | 최종장 잔상 베기 실행 |
| `runFinalCompressionWalls` | 최종장 압축 벽 실행 |
| `runFinalEdgeStrikerPattern` | 최종장 가장자리 타격 실행 |
| `runFinalElectricMazePattern` | 최종장 전기 미로 실행 |
| `runOverdriveSpiralLattice` | 오버드라이브 나선 격자 탄막 실행 |
| `runOverdriveSplitMineRain` | 오버드라이브 분열 지뢰 비 실행 |
| `runOverdriveRecallBullets` | 오버드라이브 회수탄 실행 |
| `runOverdriveWarningExplosions` | 오버드라이브 경고 폭발 실행 |
| `runOverdriveTailExplosions` | 오버드라이브 꼬리 폭발 실행 |

**수정 시점**  
보스 해저드의 생성 타이밍, 충돌 판정, 피해 처리, 보스 클리어 흐름을 바꿀 때 확인합니다.

---

### `src/game/boss/bossHazardRenderer.ts`

**역할**  
보스 해저드와 보스 클리어 오버레이를 화면에 그립니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `renderBossPatternHazards` | 전기장, 그리드 레이저, 자폭 드론, 안전지대, 압축장, 미로 같은 보스 해저드 렌더링 |
| `renderBossClearOverlay` | 보스 클리어 메시지와 화면 오버레이 렌더링 |

**수정 시점**  
보스 패턴의 시각 경고, 레이저 색상, 전기 효과, 클리어 문구를 바꿀 때 확인합니다.

---

## 5.5 탄환 시스템

### `src/game/bullets/bulletMovementAndSpecialPatternSystem.ts`

**역할**  
이미 생성된 탄환의 이동, 유도, 감속, 정지, 재발사, 분열, 폭발, 회수, 잔상, 화면 밖 제거를 담당합니다.

**주요 타입/함수**

| 항목 | 역할 |
|---|---|
| `BulletMovementAndSpecialPatternOptions` | 탄환 갱신 중 필요한 모드 정보와 피격 콜백 옵션 |
| `updateBulletMovementAndSpecialPatternSystem` | 모든 활성 탄환의 특수 움직임과 제거 조건을 처리 |

**담당하는 탄환 처리 예시**

```txt
homing
slow/delayed
dilation_bullet
gravity_ball
parent_cross / parent_nsplit
mine_orb
boomerang
dash_paint_bullet
ricochet
gravity_singularity
splitting_pellet
reverse_gravity_bullet
colliding_orb
recall_shard
void_mine
satellite_bullet
electric_missile
tail_rocket
```

**수정 시점**  
탄환이 발사된 뒤 어떻게 움직이고, 분열하고, 폭발하고, 제거되는지 바꿀 때 확인합니다.

**주의**  
탄환의 시각 디자인은 이 파일이 아니라 `src/game/render/enemyBulletVisualRenderer.ts`가 담당합니다.

---

## 5.6 충돌/데미지/아이템

### `src/game/collision/collisionDamageAndPowerUpCollectionSystem.ts`

**역할**  
전투 중 충돌 판정, 데미지 적용, 적/보스 사망 처리, 파워업 획득을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `checkCollisionDamageAndPowerUpCollectionSystem` | 적탄-플레이어, 플레이어탄-적, 플레이어탄-보스, 적 몸체-플레이어, 파워업-플레이어 충돌 처리 |
| `clearAllEnemyBulletsAndRewardSystem` | 적탄 제거와 보상/점수 처리 흐름 지원 |

**수정 시점**  
피격 판정, 데미지 계산, 보스 부위 데미지, 파워업 드롭/획득 효과를 바꿀 때 확인합니다.

---

### `src/game/items/powerUpMovementSystem.ts`

**역할**  
화면에 떨어진 파워업의 이동과 제거를 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `updatePowerUpMovementSystem` | 파워업을 아래로 이동시키고 화면 밖으로 나간 파워업을 제거 |

**수정 시점**  
파워업 낙하 속도, 제거 조건, 아이템 이동 연출을 바꿀 때 확인합니다.

---

## 5.7 렌더링 시스템

### `src/game/render/gameSceneRenderer.ts`

**역할**  
한 프레임에서 전투 장면 전체를 어떤 순서로 그릴지 관리합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `renderGameSceneSystem` | 배경, 플레이어, 적, 보스, 탄환, 파티클, 파워업, HUD를 한 프레임에 그리는 전체 렌더링 순서 관리 |

**수정 시점**  
화면 구성 요소의 렌더링 순서, HUD 위치, 전투 화면 전체 구성을 바꿀 때 확인합니다.

---

### `src/game/render/backgroundRenderer.ts`

**역할**  
챕터 배경, 보스전 배경, 별, 격자 효과를 그립니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `renderChapter1ParallaxBackgroundSystem` | 챕터 1 패럴랙스 배경 이미지 레이어 렌더링 |
| `renderBackgroundSystem` | 모드/스테이지에 따른 기본 배경, 별, 전투 격자 효과 렌더링 |

**수정 시점**  
배경 색상, 별 밀도, 격자 효과, 챕터 배경 스크롤 속도를 바꿀 때 확인합니다.

---

### `src/game/render/storyChapterBackgroundAssetLoader.ts`

**역할**  
스토리 챕터 배경 이미지를 미리 로딩합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `loadChapter1BackgroundLayersSystem` | 챕터 1 배경 이미지들을 `Image` 객체로 준비하고 로딩 완료 상태를 갱신 |

**관련 파일**

```txt
src/game/data/storyChapterBackgroundCatalog.ts
src/game/render/backgroundRenderer.ts
```

---

### `src/game/render/bossBodyRenderer.ts`

**역할**  
보스 본체의 장갑, 날개, 추진기, 포드 등 외형을 그립니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `renderBossBodySystem` | 보스 티어와 상태에 맞는 보스 본체 시각 디자인 렌더링 |

**수정 시점**  
보스 기체 외형, 티어별 색상, 추진기 효과, 본체 디자인을 바꿀 때 확인합니다.

---

### `src/game/render/enemyBulletVisualRenderer.ts`

**역할**  
적탄과 보스탄의 시각 디자인을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `getBulletVisualTypeSystem` | 탄환 속성에 따라 사용할 시각 타입 결정 |
| `renderEnemyBulletVisualSystem` | visualType에 맞는 탄환 렌더링 함수로 분기 |
| `renderPlasmaBoltSystem` | 플라즈마 볼트 형태 탄환 렌더링 |
| `renderCometNeedleSystem` | 혜성 바늘형 탄환 렌더링 |
| `renderCoreOrbSystem` | 코어 구체형 탄환 렌더링 |
| `renderCrackedCoreSystem` | 균열 코어형 탄환 렌더링 |
| `renderDroneMissileSystem` | 드론 미사일형 탄환 렌더링 |
| `renderTeslaSparkSystem` | 테슬라 스파크형 탄환 렌더링 |
| `renderSporeGlobSystem` | 포자 구체형 탄환 렌더링 |
| `renderCosmicPlasmaCoreSystem` | 코스믹 플라즈마 코어 렌더링 |
| `renderCometSpearSystem` | 코멧 스피어형 탄환 렌더링 |
| `renderTeslaSpineMissileSystem` | 테슬라 척추 미사일형 탄환 렌더링 |
| `renderRiftShardSystem` | 리프트 조각형 탄환 렌더링 |
| `renderPhaseCoreSystem` | 위상 코어형 탄환 렌더링 |
| `renderStarBeaconSystem` | 스타 비콘형 탄환 렌더링 |

**수정 시점**  
탄환의 모양, 꼬리, 발광, 입체감, 미사일/로켓 느낌, 색상을 바꿀 때 확인합니다.

---

### `src/game/render/palette.ts`

**역할**  
플레이어 기체 색상 팔레트를 정의합니다.

**주요 상수**

| 상수 | 역할 |
|---|---|
| `SHIP_COLORS` | blue/red/green/yellow/vanguard 기체 색상 값 모음 |

**수정 시점**  
플레이어 기체 색상 옵션이나 기본 색상 팔레트를 조정할 때 확인합니다.

---

## 5.8 스테이지, 샌드박스, 라이프사이클

### `src/game/stage/stageFlowAndBossCutsceneSystem.ts`

**역할**  
게임 상태별 업데이트 흐름과 보스 컷신 진행을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `updateStageFlowAndBossCutsceneSystem` | PLAYING, 컷신, 보스 클리어, 스토리/샌드박스 모드에 따른 업데이트 분기와 보스 등장/전환 컷신 처리 |

**수정 시점**  
보스 등장 연출, 페이즈 전환 컷신, 스테이지 진행 순서를 바꿀 때 확인합니다.

---

### `src/game/sandbox/sandboxCombatPreviewSystem.ts`

**역할**  
개발자 샌드박스에서 단일 적, 웨이브, 보스전을 미리보기로 반복 실행합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `configureSandboxLoadoutSystem` | 샌드박스용 플레이어 무기/폭탄/위성 수 설정 |
| `resetSandboxBossCombatSystem` | 샌드박스 보스전 상태 초기화 |
| `updateSandboxCombatPreviewSystem` | 샌드박스 적/보스 상태를 반복 갱신하고 죽은 더미를 재생성 |

**수정 시점**  
개발자 모드 테스트 방식, 더미 적 재생성, 보스 페이즈 고정 테스트를 바꿀 때 확인합니다.

---

### `src/game/lifecycle/gameStartStateInitializer.ts`

**역할**  
새 게임 시작 시 전투 상태를 초기화합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `initializeGameStartStateSystem` | 플레이어, 점수, 스테이지, 보스 상태, 배열 상태, 타이머, 샌드박스 기본값 초기화 |

**수정 시점**  
시작 체력, 시작 폭탄 수, 첫 스테이지, 첫 보스 기준, 초기 스폰 타이머를 바꿀 때 확인합니다.

---

### `src/game/lifecycle/stageRewardTransitionInitializer.ts`

**역할**  
스테이지 클리어 보상 선택 이후 다음 스테이지로 넘어갈 때 상태를 재설정합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `initializeStageRewardTransitionSystem` | 스테이지 증가, 보스 상태 초기화, 전투 배열 정리, 배경/잔해 재설정, BGM 전환 |

**수정 시점**  
스테이지 전환 조건, 보상 이후 초기화, 다음 스테이지 BGM, 보스 재등장 기준을 바꿀 때 확인합니다.

---

## 5.9 파티클, 장애물, 드론

### `src/game/effects/particleAndExplosionSystem.ts`

**역할**  
파티클 이동/수명 갱신과 폭발 파티클 생성을 담당합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `updateParticleEffectSystem` | 파티클 위치, 속도, 수명, 투명도를 갱신하고 죽은 파티클 제거 |
| `spawnExplosionParticleBurstSystem` | 특정 위치에 폭발 파티클 묶음 생성 |

**수정 시점**  
폭발 입자 개수, 크기, 속도, 수명, 색상 연출을 바꿀 때 확인합니다.

---

### `src/game/obstacles/debrisMeteorUpdateSystem.ts`

**역할**  
엄폐 잔해와 운석 장애물을 생성하고 갱신합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `spawnInitialDebrisCoverSystem` | 전투 시작/스테이지 전환 시 초기 엄폐 잔해 생성 |
| `updateDebrisAndMeteorSystem` | 운석 생성, 운석 이동, 잔해/운석 충돌, 플레이어 충돌 처리 |

**수정 시점**  
운석 등장 빈도, 낙하 속도, 엄폐물 체력, 적탄 차단 규칙을 바꿀 때 확인합니다.

---

### `src/game/obstacles/debrisCoverTypes.ts`

**역할**  
엄폐 잔해 상태 타입을 정의합니다.

| 타입 | 역할 |
|---|---|
| `DebrisCoverState` | 엄폐 잔해의 위치, 크기, 체력, 충돌 판정에 필요한 상태 |

---

### `src/game/obstacles/meteorObstacleTypes.ts`

**역할**  
운석 장애물 상태 타입을 정의합니다.

| 타입 | 역할 |
|---|---|
| `MeteorObstacleState` | 운석의 위치, 속도, 회전, 체력 같은 상태 |

---

### `src/game/drones/helperDroneBehaviorSystem.ts`

**역할**  
플레이어 주변 도움 드론의 행동을 갱신합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `updateHelperDroneBehaviorSystem` | 공격/방어/호밍/레이저 드론의 회전, 발사, 차단, 충전, 타격 처리 |

**수정 시점**  
드론 발사 주기, 방어 범위, 호밍 타겟팅, 레이저 충전 방식을 바꿀 때 확인합니다.

---

### `src/game/drones/helperDroneTypes.ts`

**역할**  
도움 드론 상태 타입을 정의합니다.

| 타입 | 역할 |
|---|---|
| `HelperDroneType` | attack, homing, defense, orbit, laser 같은 드론 종류 |
| `HelperDroneState` | 드론 종류, 회전 각도, 발사 타이머, 레이저 충전 상태 |

---

## 5.10 데이터 파일

### `src/game/data/bossPhaseCatalog.ts`

**역할**  
보스 페이즈 후보 목록을 정의합니다.

**주요 상수**

| 상수 | 역할 |
|---|---|
| `NORMAL_BOSS_PHASES` | 일반 보스전 페이즈 후보 |
| `OVERDRIVE_BOSS_PHASES` | 오버드라이브 보스전 페이즈 후보 |
| `OVERLORD_BOSS_PHASES` | 최종/상위 보스전 페이즈 후보 |

**수정 시점**  
보스가 사용할 페이즈 목록, 페이즈 등장 순서, 특정 페이즈 포함 여부를 바꿀 때 확인합니다.

---

### `src/game/data/sandboxCatalog.ts`

**역할**  
개발자 샌드박스에서 선택할 수 있는 적 타입, 웨이브, 움직임 프로필을 정의합니다.

**주요 상수**

| 상수 | 역할 |
|---|---|
| `ENEMY_TYPES` | 샌드박스에서 선택 가능한 단일 적 타입 목록 |
| `WAVES_DATA` | 샌드박스 웨이브 프리셋 목록 |
| `MOTION_PROFILES` | 샌드박스 이동 패턴 프리셋 |

**수정 시점**  
개발자 모드 테스트 옵션을 추가하거나 웨이브 프리셋을 바꿀 때 확인합니다.

---

### `src/game/data/storyChapterBackgroundCatalog.ts`

**역할**  
스토리 챕터 배경 에셋 경로와 패럴랙스 설정값을 정의합니다.

**주요 상수**

| 상수 | 역할 |
|---|---|
| `STORY_CHAPTER1_PARALLAX_LAYERS` | 챕터 1 배경 이미지 경로 목록 |
| `STORY_CHAPTER1_PARALLAX_SPEEDS` | 레이어별 스크롤 속도 |
| `STORY_CHAPTER1_PARALLAX_ALPHAS` | 레이어별 투명도 |

**수정 시점**  
스토리 챕터 배경 이미지, 레이어 속도, 투명도를 조정할 때 확인합니다.

---

## 5.11 보상, 유틸, 런타임 타입

### `src/game/systems/rewardSystem.ts`

**역할**  
스테이지 클리어 보상 후보와 보상 적용을 담당합니다.

**주요 타입/함수**

| 항목 | 역할 |
|---|---|
| `STAGE_REWARD_CHOICES` | 선택 가능한 스테이지 보상 목록 |
| `StageRewardTarget` | 보상이 적용될 플레이어/엔진 상태 구조 |
| `RewardDrone` | 보상으로 추가되는 드론 타입 구조 |
| `getStageClearChoices` | 현재 상태에 맞는 보상 선택지 생성 |
| `applyStageClearReward` | 선택한 보상을 실제 플레이어/엔진 상태에 적용 |

**수정 시점**  
스테이지 보상 종류, 보상 효과, 보상 선택지 개수를 바꿀 때 확인합니다.

---

### `src/game/utils/geometry.ts`

**역할**  
간단한 기하/충돌 유틸리티를 제공합니다.

**주요 타입/함수**

| 항목 | 역할 |
|---|---|
| `Box` | 사각형 충돌 영역 타입 |
| `intersects` | 두 사각형 충돌 여부 계산 |

**수정 시점**  
기본 사각형 충돌 판정 방식이나 충돌 타입을 바꿀 때 확인합니다.

---

### `src/game/runtime/gameEngineRuntimeContext.ts`

**역할**  
게임 시스템들이 공통으로 참조하는 `GameEngine`의 주요 상태 구조를 정리합니다.

**주요 타입**

| 타입 | 역할 |
|---|---|
| `GameEngineRuntimeContext` | 캔버스, context, 플레이어, 적, 탄환, 파티클, 보스 상태, 샌드박스 상태, 콜백 등 엔진 런타임 필드 목록 |

**수정 시점**  
여러 시스템에서 공통으로 필요한 엔진 필드를 추가하거나 이름을 바꿀 때 확인합니다.

---

# 6. 랭킹 서비스

```txt
src/services/leaderboard/
├─ antiCheat.ts
├─ index.ts
├─ localLeaderboard.ts
├─ onlineLeaderboard.ts
└─ types.ts
```

### `src/services/leaderboard/antiCheat.ts`

**역할**  
랭킹 제출 전 이름, 점수, 스테이지, 플레이 시간, 버전 정보를 검증합니다.

**주요 함수/상수**

| 항목 | 역할 |
|---|---|
| `GAME_VERSION` | 게임 클라이언트 버전 |
| `RULES_VERSION` | 랭킹 검증 규칙 버전 |
| `sanitizePlayerName` | 플레이어 이름에서 허용되지 않는 문자 제거 |
| `createLocalRunSession` | 로컬 실행 세션 ID와 토큰 생성 |
| `validateScoreSubmission` | 점수 제출값이 비정상인지 검사 |
| `buildSubmission` | 플레이 결과를 랭킹 제출 payload로 변환 |

**수정 시점**  
랭킹 검증 기준, 점수 상한, 플레이 시간 기준, 이름 허용 문자를 바꿀 때 확인합니다.

---

### `src/services/leaderboard/localLeaderboard.ts`

**역할**  
브라우저 `localStorage` 기반 로컬 랭킹 저장소입니다.

**주요 함수/메서드**

| 항목 | 역할 |
|---|---|
| `localLeaderboard` | 로컬 랭킹 저장소 인스턴스 |
| `LocalLeaderboardRepository` | 로컬 랭킹 저장/조회 클래스 |
| `isConfigured` | 로컬 랭킹 사용 가능 여부 반환 |
| `getTopScores` | 상위 점수 목록 조회 |
| `getBestEntryForPlayer` | 특정 플레이어의 최고 기록 조회 |
| `submitScore` | 새 점수를 로컬 랭킹에 저장 |
| `getRank` | 제출 점수의 순위 계산 |
| `clear` | 로컬 랭킹 초기화 |

**수정 시점**  
로컬 저장 방식, 랭킹 정렬 기준, 저장 개수 제한을 바꿀 때 확인합니다.

---

### `src/services/leaderboard/onlineLeaderboard.ts`

**역할**  
Supabase 기반 온라인 랭킹 저장소입니다.

**주요 함수/메서드**

| 항목 | 역할 |
|---|---|
| `onlineLeaderboard` | 온라인 랭킹 저장소 인스턴스 |
| `OnlineLeaderboardRepository` | 온라인 랭킹 API 호출 클래스 |
| `isConfigured` | Supabase 환경변수 설정 여부 확인 |
| `startRun` | 서버 측 실행 세션 시작 요청 |
| `getTopScores` | 온라인 상위 점수 목록 조회 |
| `getBestEntryForPlayer` | 특정 플레이어의 온라인 최고 기록 조회 |
| `submitScore` | 온라인 랭킹에 점수 제출 |
| `deleteEntriesForPlayer` | 특정 플레이어 기록 삭제 |
| `getRank` | 온라인 랭킹 순위 조회 |
| `mapRow` | Supabase row를 앱 내부 랭킹 entry로 변환 |
| `getSupabaseUrl` / `getSupabaseAnonKey` | 환경변수에서 Supabase 설정값 읽기 |

**수정 시점**  
Supabase 테이블 구조, 온라인 랭킹 조회 방식, 서버 함수 호출 방식을 바꿀 때 확인합니다.

---

### `src/services/leaderboard/index.ts`

**역할**  
랭킹 서비스 모듈의 barrel export 파일입니다.

**주요 기능**

| 항목 | 역할 |
|---|---|
| antiCheat export | 랭킹 제출 생성/검증 함수 재수출 |
| localLeaderboard export | 로컬 랭킹 저장소 재수출 |
| onlineLeaderboard export | 온라인 랭킹 저장소 재수출 |
| type export | 랭킹 관련 타입 재수출 |

**수정 시점**  
랭킹 서비스에서 새 함수나 타입을 외부에서 import하기 쉽게 만들 때 확인합니다.

---

### `src/services/leaderboard/types.ts`

**역할**  
랭킹 관련 타입 정의 파일입니다.

**주요 타입 예시**

| 타입 | 역할 |
|---|---|
| `LeaderboardEntry` | 랭킹 목록의 한 기록 |
| `LeaderboardScope` | 전체/일간/주간 같은 랭킹 범위 |
| `LeaderboardRepository` | 로컬/온라인 저장소 공통 인터페이스 |
| `LeaderboardRunSession` | 플레이 실행 세션 정보 |
| `ScoreSubmission` | 점수 제출 payload |
| `CompletedRunSummary` | 게임오버 후 표시/제출할 플레이 결과 요약 |
| `ValidationResult` | 랭킹 제출 검증 결과 |

**수정 시점**  
랭킹 데이터 구조나 API payload 구조를 바꿀 때 확인합니다.

---

# 7. `lib` 폴더

### `src/lib/utils.ts`

**역할**  
UI className 병합 유틸리티를 제공합니다.

**주요 함수**

| 함수 | 역할 |
|---|---|
| `cn` | `clsx`와 `tailwind-merge`를 조합해 조건부 className을 안전하게 병합 |

**수정 시점**  
공통 UI 유틸리티를 추가할 때 확인합니다.

---

# 8. `public/` 정적 자산

```txt
public/
├─ starblaze-icon.svg
├─ assets/backgrounds/
│  ├─ chapter1_parallax_layer_1.png
│  ├─ chapter1_parallax_layer_2.png
│  └─ chapter1_parallax_layer_3.png
└─ audio/
   ├─ 1phase bgm (Stellar Drift1).mp3
   ├─ 2phase (Stellar Drift2).mp3
   └─ 3phase (Starfall Circuit).mp3
```

| 경로 | 역할 |
|---|---|
| `public/starblaze-icon.svg` | 브라우저 favicon 또는 앱 아이콘 |
| `public/assets/backgrounds/` | 스토리/챕터 배경 이미지 원본 |
| `public/audio/` | 게임 BGM 원본 파일 |

**수정 시점**  
배경 이미지, 아이콘, BGM을 추가/교체할 때 수정합니다. 코드에서는 보통 `/audio/...`, `/assets/backgrounds/...` 같은 절대 경로로 접근합니다.

---

# 9. `docs/` 문서 폴더

```txt
docs/
├─ leaderboard-setup.md
└─ game-project-structure-guide.md
```

| 파일 | 역할 |
|---|---|
| `leaderboard-setup.md` | 랭킹/Supabase 설정 안내 문서 |
| `game-project-structure-guide.md` | 현재 문서. 프로젝트 구조와 파일별 책임 설명 |

**수정 시점**  
설치 방법, 배포 방법, 구조 변경 내용, 랭킹 설정 절차를 문서화할 때 수정합니다.

---

# 10. `supabase/` 폴더

```txt
supabase/
├─ schema.sql
├─ .temp/
└─ functions/
   ├─ start-run/index.ts
   └─ submit-score/index.ts
```

| 경로 | 역할 |
|---|---|
| `schema.sql` | 온라인 랭킹 DB 테이블/정책 정의 |
| `functions/start-run/index.ts` | 온라인 랭킹 실행 세션 시작 서버 함수 |
| `functions/submit-score/index.ts` | 점수 제출 검증/저장 서버 함수 |
| `.temp/` | Supabase CLI 내부 임시 정보 |

**수정 시점**  
온라인 랭킹 보안, DB 구조, 서버 검증 로직, 점수 제출 API를 바꿀 때 확인합니다.

---

# 11. 기능별 파일 선택 예시

## 11.1 탄알 디자인을 바꾸고 싶을 때

먼저 볼 파일:

```txt
src/game/render/enemyBulletVisualRenderer.ts
src/game/render/gameSceneRenderer.ts
src/game/entities.ts
```

필요할 수 있는 추가 파일:

```txt
src/game/enemies/enemySubtypeWeaponSystem.ts
src/game/boss/bossAttackPatternSystem.ts
src/game/bullets/bulletMovementAndSpecialPatternSystem.ts
```

판단 기준:

```txt
모양/색/꼬리/발광만 수정 = render/enemyBulletVisualRenderer.ts
탄이 어떻게 움직이는지 수정 = bullets/bulletMovementAndSpecialPatternSystem.ts
누가 어떤 탄을 발사하는지 수정 = enemies 또는 boss의 공격 시스템
```

---

## 11.2 보스 패턴을 바꾸고 싶을 때

먼저 볼 파일:

```txt
src/game/boss/bossPhaseSelectionSystem.ts
src/game/boss/bossAttackPatternSystem.ts
src/game/boss/bossPatternHazardSystem.ts
src/game/boss/bossHazardRenderer.ts
src/game/render/bossBodyRenderer.ts
```

판단 기준:

```txt
보스가 어떤 페이즈를 쓸지 = bossPhaseSelectionSystem.ts
보스가 어떤 탄을 쏠지 = bossAttackPatternSystem.ts
보스가 레이저/전기장/미로 같은 위험 지대를 만들지 = bossPatternHazardSystem.ts
그 위험 지대가 어떻게 보일지 = bossHazardRenderer.ts
보스 본체 디자인 = bossBodyRenderer.ts
```

---

## 11.3 일반 몬스터를 추가하고 싶을 때

먼저 볼 파일:

```txt
src/game/entities.ts
src/game/enemies/enemyMovementAndAttackSystem.ts
src/game/enemies/enemySpawnWaveSystem.ts
src/game/enemies/enemySubtypeWeaponSystem.ts
src/game/enemies/enemyShapeRenderer.ts
src/game/data/sandboxCatalog.ts
```

판단 기준:

```txt
새 적 타입 이름 추가 = entities.ts
새 적 이동/공격 동작 = enemyMovementAndAttackSystem.ts
새 적 등장 조건 = enemySpawnWaveSystem.ts
새 적 발사 탄 = enemySubtypeWeaponSystem.ts
새 적 외형 = enemyShapeRenderer.ts
샌드박스에서 테스트 가능하게 하기 = sandboxCatalog.ts
```

---

## 11.4 플레이어 무기를 바꾸고 싶을 때

먼저 볼 파일:

```txt
src/game/player/playerWeaponBulletPatternSystem.ts
src/game/player/playerMovementRespawnAndSatelliteSystem.ts
src/game/entities.ts
src/game/render/gameSceneRenderer.ts
```

판단 기준:

```txt
발사되는 탄 개수/속도/데미지 = playerWeaponBulletPatternSystem.ts
발사 타이밍/입력/위성 발사 = playerMovementRespawnAndSatelliteSystem.ts
탄환이 화면에 보이는 방식 = gameSceneRenderer.ts 또는 bullet renderer
```

---

## 11.5 스토리 모드 난이도를 바꾸고 싶을 때

먼저 볼 파일:

```txt
src/game/enemies/storyEnemyDifficultyTuningSystem.ts
src/game/enemies/enemyStoryBulletTuningSystem.ts
src/game/boss/bossPhaseSelectionSystem.ts
src/game/stage/stageFlowAndBossCutsceneSystem.ts
```

판단 기준:

```txt
일반 적 체력/속도/공격 타이밍 완화 = storyEnemyDifficultyTuningSystem.ts
적탄 속도/데미지/개수 완화 = enemyStoryBulletTuningSystem.ts
스토리 보스 체력/페이즈 제한 = bossPhaseSelectionSystem.ts
스토리 스테이지 진행 흐름 = stageFlowAndBossCutsceneSystem.ts
```

---

## 11.6 랭킹 문제를 수정하고 싶을 때

먼저 볼 파일:

```txt
src/components/GameOverPanel.tsx
src/components/LeaderboardPanel.tsx
src/services/leaderboard/antiCheat.ts
src/services/leaderboard/localLeaderboard.ts
src/services/leaderboard/onlineLeaderboard.ts
src/services/leaderboard/types.ts
supabase/functions/start-run/index.ts
supabase/functions/submit-score/index.ts
supabase/schema.sql
```

판단 기준:

```txt
UI 표시 문제 = components
로컬 저장 문제 = localLeaderboard.ts
온라인 API 문제 = onlineLeaderboard.ts + supabase/functions
점수 검증 기준 문제 = antiCheat.ts + submit-score/index.ts
DB 구조 문제 = schema.sql
```

---

# 12. 리팩터링 시 유지할 기준

앞으로 코드 작업을 할 때는 아래 기준을 유지합니다.

```txt
engine.ts
= 게임 루프
= 상태 보관
= 시스템 호출 순서
= render/update 진입점
= 외부 UI와 연결되는 public API

세부 기능
= player / enemies / boss / bullets / collision / render / stage / sandbox / effects / items / obstacles / drones 폴더에서 담당
```

새 파일을 만들 때는 파일 이름이 역할을 직접 드러내야 합니다.

좋은 예:

```txt
enemySubtypeWeaponSystem.ts
bossPhaseSelectionSystem.ts
bulletMovementAndSpecialPatternSystem.ts
enemyBulletVisualRenderer.ts
stageFlowAndBossCutsceneSystem.ts
```

피하는 이름:

```txt
system.ts
manager.ts
helper.ts
utils.ts
logic.ts
core.ts
```

단, `src/game/utils/geometry.ts`, `src/lib/utils.ts`처럼 정말 범용 유틸리티만 모은 파일은 예외적으로 허용할 수 있습니다.
