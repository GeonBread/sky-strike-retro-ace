# Chapter 1 BGM Interval-State Fix V2

기준: 2026-10-05 AI_CONTEXT 프로젝트 + CH1_BGM_RESUME_FIX_V1 변경 포함

## 수정 핵심

BGM을 "그 장면에서 재생 이벤트를 직접 밟았는가"가 아니라 "현재 스토리 위치 이전에 마지막으로 발동한 BGM 큐가 무엇인가"로 판정합니다.

예:
- 장면 1에서 BGM A 시작
- 장면 4에서 BGM B 시작
- 장면 2 또는 장면 3으로 TEST 이동/이어하기 -> BGM A 재생
- 장면 4 이후로 이동 -> BGM B 재생

## Chapter 1 현재 구간 상태

- 입학식 배경 공개 전: 기존 의도대로 무음
- 입학식 배경 공개 이후 ~ 출석체크 드론의 `출석을 확인합니다.` 직전: `chapter1-daily-bgm.mp3`
- `출석을 확인합니다.` 이후 ~ 첫 정화/전투 결심: `chapter1-drone-chase-bgm.mp3`
- 일반 웨이브 종료 ~ 코어 포탈 통과 전: 기존 의도대로 무음
- 코어 포탈 통과 연출의 기존 BGM 시작 큐 이후 ~ 보스 후속/챕터 엔딩: `chapter1-core-interior-bgm.mp3`

## 직접 장면 이동 처리

Part 1의 `__selectedFlowContinuation`, Part 2의 `__selectedDetailContinuation`처럼 원본 스토리를 잘라 만든 TEST 이동 구간에도 원래 위치의 BGM 상태를 상속합니다.

대사 번호 이동/현재 대사 표시 시에도 BGM 상태를 다시 동기화하므로, 같은 합성 구간 안에서 앞뒤로 이동해도 해당 위치에 맞는 BGM으로 돌아갑니다.

## 보스 클리어 후

V1에서 적용한 보스 GameCanvas 종료 후 코어 BGM 재시작 순서 수정도 `src/App.tsx`에 포함되어 있습니다. 보스 런타임 cleanup이 끝난 뒤 코어 BGM을 시작하고 후속 스토리를 재개합니다.

## 오디오 재생 보완

같은 Chapter 1 BGM이 이미 선택되어 있으나 브라우저 정책 등으로 일시정지 상태라면 Audio 객체를 새로 만들지 않고 기존 트랙 재생을 재시도합니다.

## 포함 파일

- `src/App.tsx`
- `src/game/AudioSystem.ts`
- `src/story/chapter1/chapter1StoryRuntime.ts`

프로젝트 루트에 그대로 덮어쓰면 됩니다.

## 검증

- 수정 3개 TypeScript/TSX 파일 TypeScript 파서 구문 검사 통과
- Part 1/Part 2 원본 runtimeScript에 normalizeStoryRuntimeScript 적용 검사 통과
- 전체 Vite build는 현재 작업 환경의 node_modules에 vite 실행 파일이 없어 수행하지 못함
