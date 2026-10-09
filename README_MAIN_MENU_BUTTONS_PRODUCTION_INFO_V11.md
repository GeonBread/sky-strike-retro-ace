# MAIN_MENU_BUTTONS_PRODUCTION_INFO_V11

기준: MAIN_MENU_TIME_BACKGROUND_V10 적용 상태

## 변경 사항
- 사용자 제공 PNG 4종을 메인 메뉴 버튼으로 적용
  - 스토리 모드
  - 설정
  - 기체 선택
  - 제작 정보
- 버튼마다 독립된 클릭 영역과 hover/pressed 효과 적용
- 제작 정보(Production Information) 모달 추가
  - 제작자: 마건
  - 개발 도구: OpenAI ChatGPT
  - 음악 제작 도구: Suno, Google Gemini
  - 후원·지원: 경북대학교 기계공학부 Extreme Environment Transducer Laboratory (EETL), 정용록 교수님
  - Special Thanks: 히아신스
  - 저작권·사용 허가 문구
  - GitHub 저장소 링크
- 제작 정보 모달은 배경 딤/블러, 내부 스크롤, 외부 클릭 닫기 지원

## GitHub 링크
현재 프로젝트 스냅샷과 패치 파일에는 `git remote origin` 정보가 포함되어 있지 않아,
`src/App.tsx`의 `GAME_GITHUB_URL`은 로컬 사용자명과 프로젝트명 기준으로
`https://github.com/magun/sky-strike_-retro-ace` 로 설정했습니다.
실제 원격 저장소 주소가 다르면 이 상수 한 줄만 실제 URL로 교체하면 됩니다.

## 검증
- TypeScript transpile syntax check: PASS
- V10 기준 git diff --check: PASS
