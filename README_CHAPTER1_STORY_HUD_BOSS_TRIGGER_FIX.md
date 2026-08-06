# 챕터 1 스토리 표시·정화·보스 전환 수정

## 반영 내용

1. 스토리 장면의 장소명 표시를 복구했습니다.
   - `scene-location`은 스토리 장면에서 다시 표시됩니다.
   - 기존에 제거 요청된 큰 챕터 타이틀 카드(`story-location-intro`)는 계속 숨깁니다.
   - 실제 전투 화면에서는 기존 CSS 규칙에 따라 장소명이 표시되지 않습니다.

2. 챕터 1 웨이브 중 개별 몬스터 투입 안내 문구를 제거했습니다.
   - `좌측 출석체크 드론`, `우측 결석 드론 교차 진입` 같은 중앙 문구만 제거했습니다.
   - 웨이브 번호와 웨이브 제목은 유지합니다.

3. 체력과 폭탄 HUD를 굵고 단순한 대형 아이콘으로 변경했습니다.
   - 체력: 굵은 육각 방패 형태
   - 폭탄: 굵은 원형 폭탄 형태

4. 아이템 획득 판정을 넓혔습니다.
   - 플레이어 기준 획득 박스를 5.5배로 확대했습니다.
   - 적탄 피격 판정은 변경하지 않았습니다.

5. 정화율 100% 연출을 현재 호반우 위치 중심으로 표시합니다.
   - 정화 파동은 웨이브 종료 시점의 호반우 중심에서 발생합니다.
   - 약 2초 동안 정화 파동을 보여준 뒤 호반우가 위로 상승합니다.
   - 호반우가 화면에서 사라진 뒤 약 2초 후 다음 대사가 시작됩니다.

6. 보스 직전 마지막 대사 후 즉시 실제 보스로 전환합니다.
   - `나도 널 막고 이 서버를 고칠 거야!`가 끝나면 스토리 파일의 구형 보스 전환을 실행하지 않습니다.
   - `boss-ready` 이벤트를 즉시 보내 프로젝트의 실제 챕터 1 보스를 시작합니다.

7. 스토리 모드 보스 탄막 보정을 제거했습니다.
   - 보스 탄 삭제 없음
   - 보스 탄속 감속 없음
   - 보스 발사 간격 완화 없음
   - 보스 화면 탄 수 제한 없음
   - 기존 보스 전용 코드의 원래 탄막을 그대로 사용합니다.

## 수정 파일

- `src/App.tsx`
- `src/index.css`
- `src/components/story/chapter1StoryPlayer.css`
- `src/story/chapter1/chapter1StoryRuntime.ts`
- `src/game/chapter1/chapter1WaveRenderer.ts`
- `src/game/chapter1/chapter1BossSystem.ts`
- `src/game/engine.ts`
- `src/game/lifecycle/gameStartStateInitializer.ts`
- `src/game/player/playerMovementRespawnAndSatelliteSystem.ts`
- `src/game/render/gameSceneRenderer.ts`
- `src/game/collision/collisionDamageAndPowerUpCollectionSystem.ts`
