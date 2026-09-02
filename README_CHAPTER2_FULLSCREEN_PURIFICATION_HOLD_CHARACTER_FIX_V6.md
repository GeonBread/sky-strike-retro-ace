# Chapter 2 Fullscreen Transition / Purification / Hold Advance / Character Fix V6

## 적용 기준
- `chapter2_story_to_wave_transition_ch1_style_v5.zip`까지 적용된 프로젝트 위에 덮어쓰는 증분 패치입니다.

## 변경 사항
1. 스토리 -> 일반 웨이브 전환을 브라우저 전체 화면 연출로 확장
   - CHAPTER 1 스타일의 붉은 셔터 / 흰 대각선 슬래시 / 중앙 타이틀 타이밍은 유지
   - `CHAPTER 2 / 정화 전투 개시 / 시험 · 팀플 오염 파편 정화` 문구가 게임 캔버스 영역이 아니라 전체 viewport를 덮음

2. 일반 웨이브 완료 후 CHAPTER 1 방식의 정화 완료 흐름 적용
   - 정화 에너지 100% 상태 유지
   - 플레이어 현재 위치를 중심으로 CHAPTER 1 정화 파동 재생
   - 파동 종료 후 호반우 입력/공격 차단 + 화면 위쪽으로 상승 퇴장
   - 이후 전체 화면 암전을 유지한 상태에서 다음 스토리를 미리 진행하고, 준비된 다음 장면만 공개
   - 기존 CHAPTER 1의 플레이어 상승 퇴장 런타임을 재사용하므로 이동 궤적/속도/숨김 방식이 동일함

3. CHAPTER 2 스토리 Space 홀드 빠른 진행
   - Space를 처음 누를 때 1회 진행
   - 약 260 ms 이상 계속 누르면 약 85 ms 간격으로 다음 대사를 빠르게 진행
   - 효과/전투 integration gate 자체는 `next()` 보호 로직 때문에 강제로 건너뛰지 않음
   - Space를 떼거나 브라우저 포커스를 잃으면 즉시 반복 중지

4. CHAPTER 2 조연 캐릭터 발화 밝기/방향 수정
   - 민재 / 소연 / 준호 / 교수 / 학생의 발화 필터를 완화하여 기존의 과도한 밝기/채도를 낮춤
   - 발화 상태: saturation 0.88 / brightness 0.91 / contrast 1.01
   - 왼쪽에 배치되는 조연 전신 이미지만 좌우 반전하여 오른쪽의 호반우를 바라보는 방향으로 통일
   - 캐릭터 shell의 위치/크기는 바꾸지 않아 기존 레이아웃과 등장 크기는 유지
   - Word 등 전체 화면 효과 위로 캐릭터가 올라오는 경우에도 같은 밝기/방향 규칙 적용

## 수정 파일
- `public/chapter2_story/index.html`
- `src/App.tsx`
- `src/components/story/Chapter2StoryExperience.tsx`
- `src/components/story/chapter2StoryExperience.css`
