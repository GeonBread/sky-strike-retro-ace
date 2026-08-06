# 챕터 1 전투 화면·플레이어·보스 전환·HUD 수정

기준본: `sky-strike_-retro-ace_chapter1_wide_wave_guide_damage_bomb_fix_v2(1).zip`

## 반영 내용

### 1. 스토리·웨이브·보스 화면 크기 통일

- 스토리, 몬스터 웨이브, 보스 전투의 외부 프레임을 모두 `24:25` 비율로 통일했습니다.
- 표시 크기는 다음과 같습니다.

```css
width: min(96dvh, 100vw);
height: min(100dvh, 104.167vw);
aspect-ratio: 24 / 25;
```

- 보스 전투의 원본 탄막·충돌·지원 몬스터 로직은 `800 × 960` 좌표계에 맞춰져 있으므로, 내부 보스 캔버스는 원본 해상도를 유지하고 넓어진 프레임 중앙에 배치했습니다.
- 따라서 보스 패턴을 가로로 늘리거나 충돌 좌표를 바꾸지 않고도 외부 화면 크기를 스토리 모드와 맞췄습니다.

### 2. 플레이어 크기와 이동 속도 통일

공통값을 `src/game/chapter1/chapter1WaveVisualTuning.ts`에 추가했습니다.

```ts
CHAPTER1_STORY_PLAYER_VISUAL_WIDTH = 137;
CHAPTER1_STORY_PLAYER_MOVE_SPEED = 480;
```

- 웨이브와 보스에서 호반우 표시 폭을 동일하게 적용했습니다.
- 기존 스토리 전투 이동 속도 `415 px/s`를 `480 px/s`로 높였습니다.
- 웨이브와 보스 모두 같은 이동 속도를 사용합니다.
- 일반 점수 모드의 기존 이동 속도는 변경하지 않았습니다.

### 3. 보스 시작 전 마지막 대사에서 멈추는 문제 수정

원인은 웨이브 정화 후 후반부 스토리를 테스트 미리보기 방식으로 재생하면서 `activePreviewId`가 남아 있던 것입니다.

- 실제 연속 진행 전용 `resumeFlowPreview` 경로를 추가했습니다.
- 웨이브 정화 후 스토리는 미리보기가 아니라 실제 흐름으로 처리됩니다.
- 보스 직전 마지막 대사가 끝나면 원본 보스 전환 연출을 재생합니다.
- 전환 완료 후 `boss-ready` 이벤트가 React 게임 화면으로 전달되어 실제 보스 전투가 시작됩니다.

### 4. 체력·폭탄 아이콘 확대

- 체력 아이콘: `30 × 32 px` → `36 × 38 px`
- 폭탄 아이콘: `32 × 32 px` → `38 × 38 px`
- 모바일 크기도 함께 확대했습니다.

### 5. 다음 웨이브 버튼 이동

- 기존 캔버스 내부의 `WAVE SKIP` 버튼을 제거했습니다.
- 게임 화면 바깥 여백에 `다음 웨이브` 버튼을 배치했습니다.
- 좁은 세로 화면에서는 전투 프레임 아래쪽 여백으로 이동하도록 반응형 규칙을 추가했습니다.

### 6. POWER UP LV 표시 제거

- HUD의 `POWER LV n` 표시를 완전히 제거했습니다.
- 파워업 아이템과 무기 레벨 상승 기능 자체는 유지했습니다.

## 수정 파일

- `src/App.tsx`
- `src/components/story/Chapter1StoryPlayer.tsx`
- `src/components/story/chapter1StoryPlayer.css`
- `src/game/chapter1/chapter1BossRenderer.ts`
- `src/game/chapter1/chapter1WaveVisualTuning.ts`
- `src/game/player/playerMovementRespawnAndSatelliteSystem.ts`
- `src/game/render/gameSceneRenderer.ts`
- `src/index.css`
- `src/story/chapter1/chapter1StoryRuntime.ts`

## 적용 및 확인

1. 현재 작업 내용을 먼저 커밋하거나 별도 브랜치에 보관합니다.
2. ZIP을 압축 해제합니다.
3. 압축 해제된 프로젝트 내용을 기존 프로젝트 폴더에 붙여넣어 덮어씁니다.
4. 프로젝트 루트에서 다음 명령을 실행합니다.

```powershell
git status
npm.cmd install
npx.cmd tsc --noEmit
npm.cmd run dev
npm.cmd run build
```

## 권장 커밋 메시지

```text
fix: unify chapter1 combat sizing and restore boss transition flow
```
