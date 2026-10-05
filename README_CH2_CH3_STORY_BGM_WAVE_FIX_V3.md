# CH2 + CH3 Story/BGM/Wave Fix V3

기준: 2026-10-05 AI_CONTEXT + CH1 BGM V3 + CH2 Story V1 + CH2 Core Source BGM V2를 보존한 누적 상태에서 수정.

## Chapter 2
- 팀플 블랙홀 첫 등장 연출이 2회 보이던 원인 제거.
  - iframe 내부 중복 시각 연출은 숨김.
  - React 호스트 전체화면 연출 1회만 표시.
- 타이밍: 약 3초 동안 보스 등장/형성 연출 -> 이어서 약 2초 보스 이름 텍스트.
- 기존 밝은 보스 이름 스타일 유지.

## Chapter 3 BGM
사용자 첨부 음원을 프로젝트용 영문 파일명으로 포함.
- chapter3-daily-story-bgm.mp3 = 챕터 3 일상브금
- chapter3-strange-event-bgm.mp3 = 챕터 3 이상한 일 생겼을 때
- chapter3-contamination-event-bgm.mp3 = 챕터 3 오염 발생

스토리 BGM을 장면 이벤트 한 번이 아니라 item index 구간 상태로 복원하도록 처리.
- 장면 1~4: 챕터 3 일상 BGM
- 장면 6 진입: 일상 BGM 2.8초 페이드아웃
- 장면 6 `뭐지 ……?`: 이상한 일 BGM 시작
- 장면 10 `피곤하니까 빨리 집 가서 자야겠다.` 다음 오염 흔적 연출: 이상한 일 BGM 2.2초 페이드아웃
- 장면 10 `저게 뭐지..?`: 오염 발생 BGM 시작
- 일반 몬스터 웨이브 STORY -> SHOOTING 전환: 오염 발생 BGM 2.8초 페이드아웃
- 장면 16부터: 이상한 일 BGM 재생
- 첨성대 코어 포탈 탑승 연출: 이상한 일 BGM 3.6초 페이드아웃
- 첨성대 코어 도착 후: 기존 chapter3-final-space-bgm 유지/직접 점프 복원
- 장면 32 디그리온 본체 파괴 연출: 코어 BGM 4.2초 페이드아웃
- 본체 파괴 종료 이후: 기존 chapter3-late-bgm 유지/직접 점프 복원
- 장면 41 졸업식 날부터: 임시 졸업식 BGM으로 챕터 3 일상 BGM 사용
- 최종 chapter-ending에서는 기존 final-ending-bgm으로 전환

## Chapter 3 졸업식 날 연출
- 장면 41 시작 scene을 black_screen으로 변경.
- 약 0~3초: 완전 검정 화면.
- 약 3~5초: 검정 화면 위 `졸업식 날` 텍스트.
- 약 5초 이후: 졸업식 입구 배경을 페이드인.
- 졸업식 배경 이미지 위 날짜/장소/제목 텍스트 제거.
- 전체 연출 약 7.2초.

## Chapter 3 WAVE 10
- `안전 통로 돌파`의 movementMode를 xOnly -> free로 변경.
- 기존 좁은 전투 경계는 유지하되 그 경계 안에서 X/Y 모두 이동 가능.
- 설명 텍스트도 Y 잠금 표현 제거.

## 검증
- 수정된 Chapter 2/3 HTML의 모든 inline JavaScript를 `node --check`로 검사: 통과.
- 수정된 TS/TSX를 글로벌 TypeScript compiler로 단일 파일 검사: 문법 오류 없음. 프로젝트 의존성이 이 작업 환경에 완전히 설치되지 않아 import module resolution 오류만 발생.
- 첨부된 3개 MP3는 ffmpeg 2초 디코딩 검증 통과.
