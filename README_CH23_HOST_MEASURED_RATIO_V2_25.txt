CH23 HOST-MEASURED RATIO FIX V2.25

이전 V2.20~V2.24의 window viewport 추정값 의존 방식을 제거하고,
챕터 2/3 React 호스트의 실제 렌더링 크기를 ResizeObserver로 측정하여
922x960 논리 프레임 전체를 contain 스케일합니다.

- 챕터 1: 변경 없음
- 챕터 2/3 일반 스토리: 922x960 전체가 화면 안에 들어오도록 실제 host 기준 측정
- 챕터 2/3 웨이브: 동일 원칙 적용
- 하단 104px 안전영역 확보
- 전체화면 시네마틱: 기존 1920x1080 cover 유지
- CSS 마지막에 FINAL OVERRIDE를 추가하여 과거 패치 규칙보다 우선하도록 처리
