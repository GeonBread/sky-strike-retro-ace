CHAPTER 1·2·3 실제 전투 맵 적용 V1

[적용]
앞서 제공한 챕터 3 보스 통합 패치가 적용된 프로젝트 기준입니다.
이 ZIP의 압축을 풀지 말고 프로젝트의 기존
 tools/chapter1_patch_runner/APPLY_PATCH.cmd
위로 그대로 드래그하세요.
기존 패치 프로그램의 백업·검증·자동 커밋·푸시 흐름을 사용합니다.
새로운 패치 실행 프로그램은 동봉하지 않았습니다.

[이미지 연결]
맵 1.png → 챕터 1 몬스터 웨이브
 public/assets/chapter1/combat/backgrounds/chapter1_wave_map.png
맵 2.png → 챕터 2 몬스터 웨이브
 public/assets/chapter2/combat/backgrounds/chapter2_wave_map.png
맵 3.png → 챕터 3 몬스터 웨이브
 public/assets/chapter3/combat/backgrounds/chapter3_wave_map.png
챕터 2 보스 맵.png → 챕터 2 보스전
 public/assets/chapter2/combat/boss/backgrounds/chapter2_boss_map.png
챕터 3 보스 맵.png → 챕터 3 보스전
 public/assets/chapter3/combat/boss/backgrounds/chapter3_boss_map.png

다섯 이미지는 업로드한 PNG 바이트 그대로 복사했습니다.
임의 그림 수정·크롭·반전·리사이즈는 하지 않았습니다.

[움직임]
기존 챕터 1 맵과 같은 위 → 아래 방향으로 반복 스크롤합니다.
기준 속도는 기존 맵과 동일한 8px/s입니다.
긴 맵 전체를 화면 높이에 압축하지 않고 원본 종횡비로 확대하여 스크롤합니다.
챕터 1의 기존 구름 레이어와 속도는 유지했습니다.
챕터 2·3은 각 전투 런타임의 시간으로 이동하므로 전투 일시정지 시 함께 정지합니다.
챕터 3의 패턴 전환·전장 회전/크기 변형에도 같은 전투 맵을 사용합니다.
보스 등장·각성 장면에도 보스 맵을 연결했으며,
클리어 후 정화된 배경으로 전환하는 기존 연출은 유지했습니다.
챕터 2의 PPT/회의 화면과 챕터 3의 가짜 메인 메뉴처럼
공격 자체에 속하는 특수 화면은 기존 연출을 따릅니다.

[검증]
npm run lint 통과
npm run test:chapter3 — 자동 검증 208개 통과
npm run build 통과
추가 검증: 아래 방향 이동, 이미지 비율, 반복 경계 화면 채움,
임베디드 웨이브/네이티브 렌더러의 동일 스크롤 기하,
업로드 원본 5종과 적용 파일의 SHA-256 동일성.
브라우저에서 다섯 실제 전투 렌더 경로의 이미지 로딩·그리기를 확인했습니다.

[범위]
이 ZIP은 맵 적용 변경분입니다. 보스 패턴·호반우 사격·기존 스토리 진행은 유지합니다.
