CH3 STORY SFX PATCH 002 (cumulative)

적용 내용
- 챕터 3 플레이어 발사음: 챕터 1 sfx.shoot() 재사용
- 적 피격음: 챕터 1 sfx.enemyHit() 재사용
- 적 파괴음: 챕터 1 sfx.enemyExplode() 재사용
- 스마트 폭탄 사용음: 챕터 1 sfx.bossExplode() 재사용
- 아이템 획득음: 챕터 1 sfx.powerup() 재사용
- 플레이어 피격/격추음: 챕터 1 플레이어 피해 처리와 동일한 sfx.hit() 재사용

적용 방법
- 프로젝트 루트에 이 ZIP 내부 구조 그대로 덮어쓰기

검증
- public/chapter3_wave/index.html 내 JavaScript 구문 검사 통과
- Chapter3StoryExperience.tsx TypeScript transpile 구문 검사 통과
- 전체 npm lint/build는 제공된 프로젝트의 node_modules 의존성 일부가 누락되어 실행 불가
