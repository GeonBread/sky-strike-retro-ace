[FIXED RATIO ALL SCREENS V2.5]

요청 반영 내용
1. 스토리 화면만이 아니라 메인 화면, 본게임, 스토리 넘기기 UI, 각종 오버레이까지 전부 동일한 고정 비율 방식으로 동작하도록 변경.
2. 앱 전체를 922x960 고정 논리 뷰포트 안에서 실행하고, 브라우저 크기에 맞춰 바깥에서 균일 스케일만 적용.
3. 따라서 창이 커지거나 확대되어도 내부 요소 비율이 따로 늘어나거나 깨지지 않음.
4. 이전 V2.4에서 작업했던 호반우 크기/챕터 1~3 스토리 관련 고정 비율 파일도 함께 포함.

적용 방법
- ZIP 안의 구조를 프로젝트 루트에 그대로 덮어쓰기.
- 기존 파일 백업 후 교체 권장.

포함 파일
- src/main.tsx
- src/index.css
- src/components/story/fixedGameViewportScale.ts
- src/components/story/chapter1StoryPlayer.css
- src/components/story/Chapter2StoryExperience.tsx
- src/components/story/chapter2StoryExperience.css
- src/components/story/Chapter3StoryExperience.tsx
- src/components/story/chapter3StoryExperience.css
- src/story/chapter1/chapter1StoryRuntime.ts
- public/assets/chapter1/story/characters/*.png
