# CH2 + CH3 FINAL CREDITS FIX V4

누적 패치입니다. 이전 `CH2_CH3_STORY_BGM_WAVE_FIX_V3`의 변경을 포함하며, 그 상태 위에 챕터 3 최종 엔딩 크레딧을 추가했습니다.

## 최종 엔딩 타임라인
- 0~4초: 마지막 졸업식 엔딩 화면에서 천천히 화이트아웃
- 4~6초: 완전한 흰 화면 유지
- 6초: 검정 화면으로 전환
- 6~11초: 게임 로고 약 5초 표시
- 11~95초: 영화식 세로 스크롤 크레딧
- 95~110초: 플레이어 감사 문구 + THANK YOU FOR PLAYING + 게임 로고 + 마건 표기
- 110초: 엔딩 BGM 정지 후 챕터 3 완료 처리 및 메인 메뉴 복귀

## 크레딧 내용
- 감독 / 총괄 기획 / 게임 기획 / 스토리·시나리오 / 세계관 / 전투·보스·패턴 / 레벨·웨이브 / 프로그래밍 / 게임 시스템 / 스토리 시스템 / UI·UX / 아트 디렉션 / 캐릭터 / 몬스터·보스 / VFX / 사운드 / 음악 / 작사·작곡: 마건
- DEVELOPMENT TOOL: OpenAI ChatGPT
- AI MUSIC TOOLS: Suno, Google Gemini
- SUPPORTED BY: 경북대학교 기계공학부 Extreme Environment Transducer Laboratory (EETL), 정용록 교수님
- SPECIAL THANKS: 히아신스

## 구현 변경
- 기존 `chapter-ending` FIN 카드는 화면에 표시하지 않고 투명 handoff로 변경해, 화이트아웃이 실제 마지막 졸업식 장면에서 시작됩니다.
- `final-ending-bgm.mp3`를 최종 크레딧 시작과 동시에 1회 재생합니다(loop=false).
- iframe의 기존 story-complete가 5.6초 뒤 와도 즉시 메인 메뉴로 빠지지 않고 크레딧 110초가 끝날 때까지 호스트를 유지합니다.
- 브라우저 자동재생 정책으로 최종 엔딩 BGM이 막힐 경우 다음 사용자 입력에서 재생 재시도를 수행합니다.
- 크레딧 동안 구간 선택/기타 HUD는 숨깁니다.

## 검증
- `Chapter3StoryExperience.tsx`: TypeScript transpile 구문 검사 통과
- `AudioSystem.ts`: TypeScript transpile 구문 검사 통과
- `public/chapter3_story/index.html`: 모든 inline script `node --check` 통과
- CSS 중괄호 균형 검사 통과

프로젝트 루트에 ZIP 내부 구조 그대로 덮어쓰면 됩니다.
