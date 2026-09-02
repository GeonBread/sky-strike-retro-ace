# Chapter 2 Story + Wave Integration

이 패치는 현재 챕터 1 프로젝트를 기준으로 챕터 2 스토리와 `chapter2_wave_simulation_v6` 일반 몬스터 전투를 합치는 누적 패치입니다.

## 통합 원칙

- 챕터 2 웨이브 시뮬레이터에서 가져온 것은 적, 적 탄환, 이동/공격 패턴, 텔레그래프, 파티클/잔상/강조선 등 전투 효과와 웨이브 순서입니다.
- 시뮬레이터의 임시 플레이어, 플레이어 탄, LIFE HUD, 테스트용 조작 UI, 테스트 배경은 사용하지 않습니다.
- 플레이어 캐릭터, 무기, 이동, 피격, 무적시간, 체력 3칸, 폭탄 3개, 일시정지 UI와 게임 프레임은 기존 챕터 1 `GameCanvas`/`GameEngine`을 그대로 사용합니다.
- 챕터 1 스토리/웨이브/보스 코드는 기존 구조를 유지합니다.

## 챕터 2 스토리

- CHAPTER 2 선택 시 실제 챕터 2 스토리 런타임으로 진입합니다.
- 카카오톡, Word/PPT/Drive, 시험, 학생증, 별 회수, 엔딩 연출을 포함합니다.
- 스토리 item index를 기존 `storyProgress.ts` 체크포인트에 저장합니다.
- 테스트용 스킵 UI를 추가했습니다.
  - `SKIP 1` / `F6`: 현재 대사 타이핑 또는 현재 연출을 즉시 완료하고 다음 진행
  - `+10` / `F7`: 현재 위치에서 10 item 앞으로 점프
  - `다음 전투` / `F8`: 다음 `combat-transition` 위치로 점프

## 챕터 2 일반 몬스터 웨이브

스토리의 `일반 오염 전투` gate에서 실제 전투로 전환됩니다.

- V6 최신 어려운 웨이브 20개를 순서대로 사용합니다.
- 웨이브 사이에는 기존 탄환/잔존 효과를 유지합니다.
- 적이 처치/이탈/자폭 등으로 사라지고 해당 웨이브 이벤트가 모두 발생해야 다음 웨이브로 진행합니다.
- 플레이어의 기존 탄환이 챕터 2 적에게 피해를 줍니다.
- 챕터 1의 기존 스마트 폭탄이 챕터 2 탄환 제거 및 적 피해에도 적용됩니다.
- 챕터 2 공격에 피격되면 기존 `GameEngine`의 플레이어 피해/무적/게임오버 처리를 그대로 사용합니다.
- 메인 화면 복귀 또는 사망 시 현재 Chapter 2 wave index를 기존 StoryWaveCheckpoint 형식으로 저장합니다.
- 전투 완료 시 iframe story gate를 자동 재개합니다.

## 아직 연결하지 않은 부분

`보스전 시작` gate는 유지되어 있으며 현재는 스토리 계속 버튼이 표시됩니다. 다음 단계에서 챕터 2 보스 런타임을 이 gate에 연결하면 됩니다.

## 주요 변경 파일

- `src/App.tsx`
- `src/components/story/Chapter2StoryExperience.tsx`
- `src/components/story/chapter2StoryExperience.css`
- `src/game/engine.ts`
- `src/game/stage/stageFlowAndBossCutsceneSystem.ts`
- `src/game/render/gameSceneRenderer.ts`
- `src/game/chapter2/chapter2WaveSystem.ts`
- `public/assets/chapter2/waves/**`
- `public/chapter2_story/**`
