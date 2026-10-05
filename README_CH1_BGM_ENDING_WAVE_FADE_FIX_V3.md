# CH1 BGM Ending + Wave Fade Fix V3

누적 패치입니다. V1/V2의 챕터 1 BGM 복원 및 보스 클리어 후 코어 BGM 수정 사항을 포함합니다.

## 추가 반영
1. 일반 몬스터 웨이브 전환 연출(`STORY -> SHOOTING`)이 시작되면 현재 스토리 BGM을 약 3초 동안 서서히 페이드아웃합니다.
2. 학사 시스템 정상화 연출 종료 후 `postRestoreReaction` 구간에서 코어 BGM을 약 2.5초 동안 서서히 페이드아웃합니다.
3. 본관 귀환 연출(`startStory21BackgroundIntro`)이 시작되는 순간 Chapter 1 일상 BGM을 다시 재생합니다.
4. 본관 귀환 이후 `chapterEnd`, `chapterEnding`, `chapterEndSequence` 구간의 BGM 상태를 일상 BGM으로 지정하여 장면 점프/이어하기에서도 엔딩까지 일상 BGM이 유지됩니다.
5. 동일한 페이드 요청이 대사 진행마다 반복되어도 페이드 시간이 계속 초기화되지 않도록 했습니다.
6. 페이드된 Chapter 1 BGM 구간으로 다시 점프할 경우 같은 곡의 볼륨을 정상 복원하고 재생할 수 있도록 했습니다.

## 포함 파일
- `src/story/chapter1/chapter1StoryRuntime.ts`
- `src/game/AudioSystem.ts`
- `src/App.tsx` (V1/V2 누적 보존)
