CH23 WRAPPER SCALE FIX V2.23

문제:
- Chapter 2/3의 CSS zoom 방식에서 iframe의 물리 크기와 논리 922×960 크기가 분리되지 않아,
  실제 브라우저 높이가 작은 경우 하단 대사창이 화면 밖으로 잘릴 수 있었음.

수정:
- CSS zoom 제거.
- 바깥 wrapper는 실제 화면에 들어가는 물리 크기만 가짐.
- iframe 내부 해상도는 일반 스토리/웨이브 922×960으로 고정.
- iframe 전체를 wrapper 안에서 uniform transform scale.
- Chapter 3 story와 wave 모두 전용 wrapper 추가.
- 전체화면 연출은 1920×1080 논리 해상도를 동일 방식으로 유지.

V2.22 적용 상태에서 덮어쓰기.
