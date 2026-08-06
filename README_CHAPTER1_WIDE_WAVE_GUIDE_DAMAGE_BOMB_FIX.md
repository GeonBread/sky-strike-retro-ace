# 챕터 1 넓은 웨이브 화면·전투 가이드·피격·폭탄 수정

이 수정본은 `sky-strike_-retro-ace_chapter1_story_hud_boss_trigger_fix_v2.zip`을 기준으로 작성했다.

## 반영 사항

1. 스토리 모드 챕터 1 웨이브 전투 화면을 스토리 화면과 같은 넓은 24:25 표시 영역으로 변경했다.
2. 플레이어 최종 사망 대기 중에는 챕터 1 웨이브 몬스터, 일반 서브타입 몬스터, 원본 챕터 1 보스가 새 공격을 생성하지 않는다.
3. 폭탄 사용 즉시 적탄을 삭제하지 않고, 호반우 위치에 고정된 정화 파동이 닿은 몬스터와 탄환부터 순차적으로 제거한다.
4. 플레이어 피격 시 폭발 파티클과 화면 밖 강제 이동을 제거했다. 화면이 붉게 변했다가 0.85초 동안 서서히 복구되고, 체력이 남아 있으면 2.8초간 무적 상태가 된다.
5. 화력 강화·체력 회복·보조 드론 아이템 아이콘을 굵은 검은 외곽선과 단순한 큰 실루엣으로 다시 그렸다.
6. 실제 챕터 1 웨이브 전투 우측 하단에 임시 `WAVE SKIP` 버튼을 추가했다.
7. 스토리의 전투 개시 이후 실제 게임 화면을 먼저 띄우고, 화면을 유지한 채 하단 전투 가이드 대화창을 표시한다. 방향키·SPACE·SHIFT·아이템을 안내한 뒤 `건투를 빈다` 문구 다음에 실제 웨이브를 시작한다.
8. 아이템 획득 전용 판정 범위를 5.5배에서 7.5배로 확대했다. 적탄 피격 판정은 변경하지 않았다.
9. 이전 요구사항대로 스토리 모드 원본 보스의 탄속·탄 수·탄 크기 약화는 적용하지 않는다.

## 수정 파일

- `src/App.tsx`
- `src/components/story/chapter1StoryPlayer.css`
- `src/game/engine.ts`
- `src/game/lifecycle/gameStartStateInitializer.ts`
- `src/game/player/playerDamageAndRespawnSystem.ts`
- `src/game/player/playerMovementRespawnAndSatelliteSystem.ts`
- `src/game/player/playerSmartBombSystem.ts`
- `src/game/collision/collisionDamageAndPowerUpCollectionSystem.ts`
- `src/game/enemies/enemySubtypeWeaponSystem.ts`
- `src/game/chapter1/chapter1WaveSystem.ts`
- `src/game/chapter1/chapter1BossOriginalRuntime.ts`
- `src/game/chapter1/chapter1BossSystem.ts`
- `src/game/chapter1/chapter1BossRenderer.ts`
- `src/game/render/gameSceneRenderer.ts`

## 검사

- 전체 `src` TS/TSX 구문 변환 검사 통과
- 임시 React/Zustand 타입 스텁을 사용한 전체 `src` TypeScript 의미 검사 통과
- 플레이어 비치명·치명 피격 상태 전환 테스트 통과
- 폭탄 사용 순간 즉시 삭제되지 않는지 확인
- 폭탄 반경 안쪽 대상만 순차적으로 제거되는지 확인
- 13개 정적 연결 조건 검사 통과

`npm ci` 및 실제 Vite 전체 빌드는 내부 패키지 저장소에 `zustand@5.0.14`가 없어 수행하지 못했다.
