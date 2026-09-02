# Chapter 2 Story Integration

이 패치는 `dev/chapter2-integration`에서 챕터 2 스토리를 먼저 합치기 위한 1단계 패치입니다.

## 통합 내용

- 챕터 선택 화면의 CHAPTER 2가 실제 챕터 2 스토리 실행 화면으로 연결됩니다.
- 기존 챕터 2 최종본의 대사, 카카오톡, Word/PPT/Drive, 시험, 학생증, 별 회수, 엔딩 연출을 그대로 포함합니다.
- 챕터 2 진행 위치를 기존 `storyProgress.ts` 체크포인트 저장소에 저장합니다.
- 새로고침/메인 화면 복귀 후 CHAPTER 2의 `이어하기`가 동작할 수 있도록 story item index를 저장합니다.
- Escape 입력 시 메인 화면 복귀 확인 레이어를 표시합니다.
- 스토리 완료 시 Chapter 2 clear가 기록되고 Chapter 3가 해금됩니다.

## 전투 연결 지점

챕터 2 standalone runtime의 `combat-transition` 두 곳을 React 쪽과 연결하는 bridge gate로 바꿨습니다.

1. `일반 오염 전투` -> gate id `wave`
2. `보스전 시작` -> gate id `boss`

현재 단계에서는 gate에서 `스토리 계속` 버튼을 누르면 다음 스토리 연출로 진행합니다.
다음 단계에서 실제 챕터 2 웨이브/보스 런타임을 연결한 뒤 전투 완료 시 `resumeIntegrationGate` 명령을 보내면 됩니다.

## 주요 파일

- `src/App.tsx`
- `src/components/story/Chapter2StoryExperience.tsx`
- `src/components/story/chapter2StoryExperience.css`
- `public/chapter2_story/index.html`
- `public/chapter2_story/assets/**`

챕터 1 런타임과 챕터 1 전투 코드는 변경하지 않았습니다.
