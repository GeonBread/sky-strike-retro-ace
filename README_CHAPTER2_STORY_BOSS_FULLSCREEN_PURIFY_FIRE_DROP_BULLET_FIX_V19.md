# CHAPTER 2 Story/Boss Fullscreen + Purification + Fire/Drop/Bullet Fix V19

적용 기준: v18 (`chapter2_combat_hit_support_bomb_phase_skip_fix_v18.zip`) 적용본 위 증분 패치.

## 1. 스토리 최초 보스 등장 연출 전체화면화
- 스토리의 `boss-emergence` 시작 신호를 부모 React 런타임으로 전달함.
- 기존 게임 프레임/iframe 안에서만 보이던 보스 등장 장면 위에 브라우저 전체 화면 오버레이를 동기화함.
- 기존 챕터 2 보스/블랙홀 에셋과 등장 타이밍(4.2 s)을 유지함.
- 연출 종료/스킵 시 부모 전체화면 오버레이도 즉시 종료됨.

## 2. 보스 격파 후 별 방출 정화파동을 CH1 게이트키퍼 방식으로 교체
CH1 `chapter1BossOriginalRuntime.ts`의 게이트키퍼 사망 정화 링 수치를 그대로 사용함.
- 1차 링: `life=0.7`, `maxR=250`, `#ffd84a`, `width=18`
- 2차 링: `0.08 s` 지연, `life=0.9`, `maxR=320`, `#fff4b0`, `width=8`
- 알파: `(1-p) * 0.8`
- 선 굵기: `max(2, width*(1-p))`
- 반경: `maxR * easeOutCubic(p)`
- shadow blur: `18`
기존 CH2 전용 장시간 CSS 파동은 별 방출(reveal) 모드에서 숨겨 중복 표시되지 않게 함.

## 3. 보스 등장/페이즈 전환 중 플레이어 발사 + 발사음 완전 차단
- CH2 보스 코어의 `isPlayerAttackAllowed()`가 false인 동안 `firePlayerBullet()` 자체를 호출하지 않음.
- 따라서 탄환뿐 아니라 `sfx.shoot()`도 발생하지 않음.
- 위성 공격 역시 동일한 사격 허용 상태를 따름.
- 실제 패턴/페이즈가 시작되어 `isPlayerAttackAllowed()`가 true가 된 뒤에만 사격 가능.

## 4. CH2 보스 지원몹 아이템 드롭률 감소
- CH2 보스 지원몹: `28% -> 7%`
- CH1 보스 지원몹 `28%`는 그대로 유지.
- 일반몹/assault commander 확률도 변경하지 않음.

## 5. CH2 보스 지원몹 탄환 원본 정합
v18까지 보스 지원몹은 CH2 report/page drone 이미지를 사용하면서도 탄환은 공통 `corrupt_orb`를 발사하고 있었음.
원본 CH2 일반 웨이브의 report drone 기본탄은 `miniShard`이므로 다음과 같이 수정함.
- 기본탄: 원본 `miniShard` 외형
- 속도: 원본 기본탄과 동일하게 `245`
- 보스전 지원몹은 기존 요청대로 단순 탄만 발사하도록 `boomerangPage` 추가 사격은 사용하지 않음.

## 수정 파일
- `src/components/story/Chapter2StoryExperience.tsx`
- `src/components/story/chapter2StoryExperience.css`
- `public/chapter2_story/index.html`
- `src/game/player/playerMovementRespawnAndSatelliteSystem.ts`
- `src/game/collision/collisionDamageAndPowerUpCollectionSystem.ts`
- `src/game/chapter2/chapter2BossSystem.ts`
- `src/game/entities.ts`
- `src/game/data/hobanwooEnemyBulletVisualCatalog.ts`
- `src/game/render/hobanwooEnemyBulletShapeRenderer.ts`

## 검증
- CH2 story HTML inline JavaScript `node --check` 통과.
- 수정 TSX syntax-only transpile 검사 통과.
- 수정된 비-React TypeScript 파일 `tsc --noEmit` 검사 통과.
