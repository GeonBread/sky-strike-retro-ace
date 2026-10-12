CH23 CH1 OUTPUT PARITY V2.26

이번 버전은 V2.20~V2.25의 별도 wrapper/zoom/host-measure scaling을 폐기합니다.
챕터 1과 동일한 출력 구조를 챕터 2/3에 적용합니다.

- React host/iframe 자체에는 scale/zoom을 적용하지 않음
- story iframe은 24:25 영역으로만 배치
- iframe 내부 story-stage를 정확히 922x960으로 고정
- iframe 내부에서 window.innerWidth / 922, window.innerHeight / 960으로 단 한 번만 uniform scale
- 전체화면 연출은 iframe/browser 전체화면 레이어로 유지
- 챕터 2/3 기존 TEST 이동, 웨이브, 보스, 최종 크레딧 로직은 pre-ratio 최신본으로 복구
- V12 이후 asset/audio 경로로 갱신

V2.25 위에 그대로 덮어쓰십시오.
