# CH1 / CH2 / CH3 Resume, Dialogue UI, Credits Fix V6

기준: `CH123_STORY_COMBAT_UI_CREDITS_FIX_V5` 적용 상태

## Chapter 1

- 저장된 몬스터 웨이브에서 직접 재개할 때 전투 BGM이 시작된 뒤 다시 페이드아웃되는 현상을 수정했습니다.
- STORY -> SHOOTING 장면 전환에서 요청된 페이드아웃은 그대로 유지합니다.
- 숨겨진 Chapter 1 StoryPlayer의 늦은 페이드 요청은 현재 전투 BGM에 영향을 주지 않습니다.
- 같은 웨이브 BGM을 다시 시작할 때 진행 중인 BGM fade를 취소하고 정상 볼륨을 복구합니다.
- 기존 story / wave / boss 체크포인트 복원을 재확인하고, story 위치를 750 ms 주기로 보강 저장하며 pagehide / visibility hidden에서도 저장합니다.
- 수강신청 게이트키퍼 및 학생증 대사창의 이름 위 작은 영문 표기를 제거했습니다.

## Chapter 2

- 마지막 Story item / Wave / Boss 위치를 체크포인트로 저장하고 재진입 시 해당 위치에서 계속 진행하도록 저장 처리를 보강했습니다.
- 메인 화면으로 나갈 때와 탭/페이지 이탈 시 현재 위치를 즉시 저장합니다.
- 팀플 블랙홀 및 학생증 대사창의 이름 위 작은 영문 표기를 제거했습니다.
- 민재 / 소연 / 준호에게 각각 별도 색상과 분위기의 전용 대사창을 추가했습니다.
  - 민재: 녹색 계열
  - 소연: 로즈 계열
  - 준호: 보라-청색 계열

## Chapter 3

- 공용 StoryCheckpoint 시스템에 Chapter 3를 연결했습니다.
- 마지막 Story item을 저장하고 재진입 시 해당 대사부터 계속합니다.
- 몬스터 웨이브 진행 중 종료하면 현재 Wave를 저장하고, 재진입 시 해당 Wave에서 즉시 시작합니다.
- 직접 복원된 Wave를 모두 끝내면 기존 웨이브 이후 Story 지점으로 정상 연결합니다.
- 탭/페이지 이탈, 전투 종료 선택, 전투 실패 후 메인 화면 선택에서도 현재 위치를 저장합니다.
- 디그리온 및 학생증 대사창의 이름 위 작은 영문 표기를 제거했습니다.
- 민재 / 소연 / 준호에게 각각 별도 전용 대사창을 추가했습니다.
- 최종 엔딩 로고가 엔딩곡 약 8.7초 지점부터 나타납니다.
- 약 11초에 본 크레딧 스크롤이 시작될 때 별도의 로고로 교체하지 않고, 화면 중앙에 있던 동일 로고가 크레딧의 첫 요소로서 그대로 위로 천천히 올라갑니다.

## 공통 BGM 안전 처리

- `AudioSystem.startBgmForPhase()`가 동일한 전투 BGM을 재사용할 때 남아 있는 fade를 취소하고 설정 볼륨을 복원하도록 수정했습니다.
- 따라서 저장된 전투 위치로 직접 재진입하는 경우 STORY 전환용 fade가 전투 BGM에 이어서 적용되지 않습니다.

## 변경 파일

- `public/chapter2_story/index.html`
- `public/chapter3_story/index.html`
- `src/App.tsx`
- `src/components/story/Chapter2StoryExperience.tsx`
- `src/components/story/Chapter3StoryExperience.tsx`
- `src/components/story/chapter3StoryExperience.css`
- `src/game/AudioSystem.ts`
- `src/story/chapter1/chapter1StoryRuntime.ts`

## 검증

- V5 기준 `git diff --check` 통과
- 수정 TypeScript / TSX 5개 파일 TypeScript 구문 검사 통과
- Chapter 2 Story HTML inline JavaScript 구문 검사 통과
- Chapter 3 Story HTML inline JavaScript 19개 블록 구문 검사 통과
