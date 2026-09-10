# CHAPTER 2 Boss Support Fire + Exam Fullscreen + Purification Fullscreen Fix V20

적용 기준: v19 (`chapter2_story_boss_fullscreen_purify_fire_drop_bullet_fix_v19.zip`) 적용본 위 증분 패치.

## 1. 챕터 2 보스전 지원몹 연사 속도 상향
- 지원몹이 사용하는 탄 자체는 기존 CH2 report/page drone의 `miniShard`를 그대로 유지함.
- 탄속 `245`, 크기 `12x12`, 외형 `chapter2_mini_shard`는 변경하지 않음.
- 첫 발사 대기: `0.55/0.73 s` 수준 -> `0.24/0.32 s` 수준으로 단축.
- 반복 발사 간격: `1.15~1.45 s` -> `0.52~0.68 s`로 단축.
- 즉, 원본 탄의 물성/외형은 유지하고 발사 빈도만 약 2배 빠르게 조정함.

## 2. 챕터 2 중간고사 문제 풀이 연출 전체화면화
- `exam-writing-sequence` 연출 시작/종료를 부모 React 런타임에서 감지함.
- 해당 연출 동안 스토리 iframe 셸을 기존 922x960 게임 폭에서 `100vw x 100dvh`로 확장함.
- 시험지, 책상, 펜 필기, 페이지 전환, 이름/학번 필기, 마지막 암전 등 기존 연출 내용과 타이밍은 유지함.
- 연출 종료/스킵/테스트 이동 시 자동으로 기존 게임 폭으로 복귀함.

## 3. 보스 격파 후 별 2개 방출 정화 파동 전체화면화
- 기존 v19에서 사용한 CH1 게이트키퍼 정화 파동 수식은 그대로 유지함.
- 차이점은 파동 canvas를 CH2 story iframe 내부가 아니라 부모 브라우저 document에 직접 부착함.
- 따라서 파동이 922x960 게임 화면 경계에서 잘리지 않고 브라우저 전체 화면 레이어에서 표시됨.
- 별/보스/배경 연출 자체는 기존 스토리 프레임 구성을 유지함.
- 효과 종료/스킵 시 부모 화면에 생성한 canvas도 즉시 제거됨.

## 수정 파일
- `src/game/chapter2/chapter2BossSystem.ts`
- `src/components/story/Chapter2StoryExperience.tsx`
- `src/components/story/chapter2StoryExperience.css`
- `public/chapter2_story/index.html`

## 검증
- CH2 story HTML inline JavaScript `node --check` 통과.
- `Chapter2StoryExperience.tsx` syntax-only TypeScript transpile 검사 통과.
- `chapter2BossSystem.ts` syntax-only TypeScript transpile 검사 통과.
- 지원몹 miniShard 탄속/외형 유지 및 발사 간격 변경 static assertion 통과.
- 시험 연출 전체화면 class 및 별 방출 parent canvas 연결 static assertion 통과.
