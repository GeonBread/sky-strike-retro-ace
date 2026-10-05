# CHAPTER 1 BGM RESUME FIX V1

기준: sky-strike_-retro-ace AI_CONTEXT 2026-10-05 19:51:24 +09:00

## 수정 내용
1. 챕터 1 보스 클리어 후 학사 코어 내부 BGM이 꺼지는 문제 수정
   - 보스 GameCanvas unmount의 `engine.stop() -> sfx.stopBgm()`이 끝난 다음에 코어 BGM과 보스 후속 스토리를 시작하도록 순서를 변경했습니다.

2. 챕터 1 스토리 이어하기 BGM 복원 보강
   - 현재 체크포인트의 세그먼트/대사 위치에 맞춰 일상 BGM, 출석드론 추격 BGM, 학사 코어 내부 BGM을 다시 선택합니다.
   - `firstPurificationCinematic`, `postRestoreReaction` 등 기존 복원표에서 누락된 실제 세그먼트를 추가했습니다.
   - 원래 BGM이 없는 `energy100Dialogue` 및 입학식 BGM 시작 전 구간은 이어하기에서도 BGM을 강제로 재생하지 않습니다.

3. 브라우저 자동재생 정책 대응
   - 챕터 1 일상 BGM과 보스 BGM도 기존 재시도 로직을 사용하게 변경하여, 이어하기/비동기 장면 전환 시 첫 재생 요청이 차단되더라도 다음 사용자 입력에서 다시 재생되도록 했습니다.

## 수정 파일
- `src/App.tsx`
- `src/game/AudioSystem.ts`
- `src/story/chapter1/chapter1StoryRuntime.ts`

## 검증
- 수정한 3개 TypeScript/TSX 파일: TypeScript `transpileModule` 구문 진단 통과
- 원본 대비 변경 범위: 위 3개 파일만 변경
- 전체 `npm run build`는 작업 환경에서 의존성 설치가 완료되지 않아 Vite 실행 파일이 없어 수행하지 못했습니다.
