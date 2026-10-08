# MAIN MENU UI / AUDIO REDESIGN V8

적용 기준: `CH23_ESCAPE_NAV_TYPEWRITER_FIX_V7` 적용 상태

## 변경 사항

1. 공통 UI 버튼 클릭 효과음
   - `AudioSystem.uiClick()` 추가
   - 메인 게임 시작/스토리/설정, 알림창 확인·취소, 기체 선택/카드, 설정 닫기, 챕터 선택 버튼에 적용
   - 스토리 대사 및 장면 진행 클릭에는 적용하지 않음
   - 전체 효과음(SFX) 볼륨 설정을 따름

2. 메인 메뉴 단순화
   - 도전 모드 버튼 제거
   - 순위 버튼 제거
   - 스토리 모드 / 설정 / 기체 선택만 유지
   - 관련 메인 메뉴 접근 경로 제거

3. 설정 패널 개편
   - `설정 (Options)` 형태로 한국어 우선 표기
   - 배경음악 음량 (BGM Volume)
   - 전체 효과음 음량 (SFX Volume)
   - 플레이어 사격음 (Player Shot Volume)
   - 적 피격음 (Enemy Hit Volume)
   - 아이템 획득음 (Item Pickup Volume)
   - 각 슬라이더 아래 기능 설명 추가

4. 기체 선택 UI 개편
   - 메인 `기체 선택` 버튼을 별도 금빛 패널형 버튼으로 재디자인
   - 이과: 청록/파랑
   - 문과: 적갈/주황
   - 예체능: 보라
   - 선택 상태와 각 계열 특징을 더 명확하게 표시

5. 설정 버튼 / 기체 선택 버튼 hover 충돌 수정
   - 기존 4버튼용 음수 margin 중첩 배치 제거
   - 3버튼 전용 레이아웃 적용
   - 기체 선택 hit area를 독립 레이어로 고정

## 검증

- 수정 TypeScript/TSX 5개 파일 TypeScript parser 구문 검사 통과
- V7 기준 가상 Git 저장소에서 `git diff --check` 통과
- 전체 `tsc`는 SOURCE-ONLY 스냅샷에 React/Vite 등 외부 의존성이 없어 모듈 해석 단계에서 중단됨
