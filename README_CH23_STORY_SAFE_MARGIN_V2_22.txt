CH2/CH3 STORY SAFE MARGIN V2.22

수정 목적
- 922x960 스토리 프레임이 브라우저 하단에 딱 붙으면서 대사창/프레임 하단이 잘려 보이는 현상 수정.
- Chromium의 visualViewport / innerHeight / clientHeight 차이로 생기는 몇 px 오버플로 방지.

수정 내용
- 일반 스토리/웨이브 contain 스케일에 좌우 12px, 상하 16px 안전 여백 적용.
- 실제 사용 가능 viewport 값 중 가장 작은 값을 사용해 프레임이 화면 밖으로 내려가지 않게 함.
- 전체화면 시네마틱(1920x1080 cover)은 기존처럼 화면 전체를 채우며 안전 여백을 적용하지 않음.

V2.21 적용 후 이 패치를 추가 적용하세요.
