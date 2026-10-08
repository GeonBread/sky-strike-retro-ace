# MAIN MENU / OPTIONS / CHAPTER 3 WAVE FIX V9

적용 기준: `MAIN_MENU_UI_AUDIO_REDESIGN_V8` 적용 상태

## 1. 옵션 모달 UI
- 설정(Options) 창을 화면 중앙의 modal dialog로 변경했습니다.
- 옵션을 열면 메인 화면 전체가 어두워지고 약한 blur가 적용됩니다.
- 옵션 모달은 항상 최상단에 표시됩니다.
- 닫기 버튼 또는 모달 바깥의 어두운 영역을 누르면 닫히며 메인 화면 밝기가 복원됩니다.
- 모달이 열린 동안 뒤의 메인 메뉴 버튼은 클릭되지 않습니다.
- 상단 설정 제목/닫기 버튼은 고정하고 옵션 목록만 내부 스크롤되게 하여, 스크롤 시 테두리와 제목이 겹치지 않게 했습니다.

## 2. 옵션 슬라이더 디자인
- 브라우저 기본 range 디자인을 제거했습니다.
- 기존 게임 UI의 navy / gold / red 계열 트랙과 knob로 재디자인했습니다.
- 현재 값까지 red progress가 채워집니다.
- 포커스 상태도 게임 UI 스타일로 표시됩니다.

## 3. 메인 메뉴 버튼 간격
- 스토리 모드 / 설정 / 기체 선택의 세 버튼 간격을 더 좁고 균일하게 조정했습니다.
- PNG 이미지 자체의 투명 여백 때문에 간격이 벌어지던 문제를 fixed-height hit box로 정리했습니다.
- 버튼의 실제 mouse hit area가 서로 겹치지 않도록 유지했습니다.

## 4. UI 버튼 클릭음
- 기존 전자음 느낌의 클릭음을 짧은 2단 mechanical `딸깍` 소리로 변경했습니다.
- 기존과 동일하게 SFX Volume 설정을 따릅니다.
- 스토리 대사 진행/장면 전환에는 추가되지 않습니다.

## 5. Chapter 3 TEST 이동 -> Wave 겹침 수정
- TEST 이동 메뉴에서 일반 몬스터 웨이브로 직접 이동할 때 story iframe에 남은 fullscreen/fixed inline style을 즉시 제거합니다.
- wave 화면을 켜기 전에 story iframe을 `display:none !important`로 강제 숨깁니다.
- wave 종료 후 story로 복귀할 때만 story iframe 표시 상태를 복원합니다.
- 따라서 왼쪽 story 창과 wave 화면이 동시에 보이던 현상을 막았습니다.

## 검증
- V8 기준 Git 저장소에서 `git diff --check` 통과
- 수정 TS/TSX 4개 파일 TypeScript transpile syntax 검사 통과
- 수정 CSS 파일 brace balance 검사 통과
