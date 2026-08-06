# 챕터 1 스토리 테스트 이동 / 일반 몬스터 체력 / 보스 원본 크기 수정

## 1. 스토리 테스트 이동
- 스토리 모드 우측 상단에 `TEST 이동` 버튼을 추가했습니다.
- 전반부 주요 장면, 실제 웨이브, 정화율 100% 연출, 실제 보스, 보스 격파 후 정화 및 엔딩으로 바로 이동할 수 있습니다.
- 이 메뉴는 테스트용이며 스토리 진행 데이터 저장 기능은 포함하지 않습니다.

## 2. 일반 몬스터 체력
- 챕터 1 웨이브 일반 몬스터 체력 배율을 `1.3`에서 `1.0`으로 되돌렸습니다.
- 카탈로그에 정의된 원래 체력값을 그대로 사용합니다.

## 3. 보스 원본 크기
- 스토리 모드의 실제 챕터 1 보스 캔버스 논리 해상도를 원본 보스 코드와 같은 `800 x 960`으로 고정했습니다.
- 원본 보스 코드의 `drawW = 390`, `drawH = 294` 및 패턴/보스 UI 좌표가 프로젝트 컨테이너 실측 크기에 의해 다시 계산되지 않습니다.
- 화면 표시만 5:6 비율을 유지하며 반응형으로 축소/확대됩니다.

## 수정 파일
- `src/App.tsx`
- `src/components/story/Chapter1StoryPlayer.tsx`
- `src/components/story/chapter1StoryPlayer.css`
- `src/story/chapter1/chapter1StoryRuntime.ts`
- `src/story/chapter1/chapter1StoryTypes.ts`
- `src/game/chapter1/chapter1WaveSystem.ts`
