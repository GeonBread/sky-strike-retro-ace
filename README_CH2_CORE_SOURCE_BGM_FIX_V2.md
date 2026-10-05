# CH2_CORE_SOURCE_BGM_FIX_V2

적용 기준: CH2_STORY_EFFECT_BGM_BOSS_UI_FIX_V1 + CH1_BGM_ENDING_WAVE_FADE_FIX_V3 이후 프로젝트

## 변경 사항

1. 스토리 #202 (내부 index 201, `study-session`)
   - 직전까지 유지되던 Chapter 1 일상 BGM을 복원한 뒤 2.2초 동안 페이드아웃.
   - #202로 직접 점프해도 동일하게 동작.

2. 스토리 #203 (내부 index 202, `핵심 오염원 출현` section marker)
   - 무음 구간으로 고정.
   - 직접 점프했을 때 이전 장면 BGM이 남지 않게 정리.

3. 스토리 #204 (내부 index 203, 학생증 `미회수 별 신호 확인함.`)
   - 첨부 음원 `챕터 2 핵심 오염원 출현.mp3`를 프로젝트 오디오로 추가.
   - 실제 프로젝트 파일명: `public/audio/chapter2-core-contamination-source-bgm.mp3`
   - #204부터 책임의 블랙홀 포탈 직전까지 해당 곡을 구간 BGM으로 유지.
   - 해당 구간 중간 장면으로 바로 점프/이어하기해도 같은 곡 복원.

4. 책임의 블랙홀 포탈
   - 기존 V1의 포탈 BGM 페이드 동작을 새 핵심 오염원 BGM 기준으로 연결.
   - 포탈에서 3.6초 페이드아웃 후 블랙홀 입장 구간의 프리보스 BGM으로 전환.

## 포함 파일

- `src/components/story/Chapter2StoryExperience.tsx`
- `src/game/AudioSystem.ts`
- `public/audio/chapter2-core-contamination-source-bgm.mp3`
