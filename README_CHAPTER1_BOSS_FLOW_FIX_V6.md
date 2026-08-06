# 챕터 1 보스 흐름 수정 V6

기준본: `sky-strike_-retro-ace_chapter1_wide_wave_guide_damage_bomb_fix_v2(1).zip`

## 반영 내용

1. 1페이즈 종료와 2페이즈 각성 중에도 플레이어가 계속 보이도록 수정
2. 페이즈 종료 시 플레이어를 화면 하단 중앙으로 부드럽게 이동시키고 이동·공격·폭탄 입력 잠금
3. 보스 연출과 전투 대기가 끝나 실제 패턴이 시작될 때만 플레이어 조작 잠금 해제
4. 2페이즈 전환 시 배경 스크롤 누적값을 유지하고 속도를 보간하여 순간적인 배경 점프 제거
5. 2페이즈 전투 시작 시 보스가 현재 위치에서 다음 패턴 궤도로 부드럽게 합류하도록 수정
6. 캠퍼스 안내 방송 음파가 정화 폭탄의 확장 반경에 닿으면 즉시 제거되도록 수정
7. `BOSS CLEAR` 표시 후 2초간 유지한 뒤 후속 스토리로 진행
8. 체크무늬 배경이 합쳐진 2페이즈 보스 스토리 이미지를 실제 투명 PNG로 교체
9. 학사 서버 정상화의 노란 전환 효과를 브라우저 전체 화면 크기로 확장
10. 스토리 화면 왼쪽 위 챕터·장면 제목 카드 제거
11. 각 페이즈의 모든 보스 패턴을 배열 순서대로 1회 실행한 뒤 랜덤 순환하며, 직전 패턴은 연속 선택되지 않도록 수정

## 수정 파일

- `src/game/engine.ts`
- `src/game/lifecycle/gameStartStateInitializer.ts`
- `src/game/lifecycle/stageRewardTransitionInitializer.ts`
- `src/game/player/playerMovementRespawnAndSatelliteSystem.ts`
- `src/game/chapter1/chapter1BossSystem.ts`
- `src/game/chapter1/chapter1BossRenderer.ts`
- `src/game/chapter1/chapter1BossOriginalRuntime.ts`
- `src/story/chapter1/chapter1StoryPart1Document.ts`
- `src/story/chapter1/chapter1StoryPart2Document.ts`
- `src/story/chapter1/chapter1StoryRuntime.ts`
- `public/assets/story/chapter1/characters/boss_gatekeeper_uploaded.png`

## 확인 결과

- 수정한 TypeScript 파일 10개를 TypeScript 5.8.3 `transpileModule`로 구문 검사 완료
- 요청 사항에 대응하는 코드 정적 검증 완료
- 교체한 보스 PNG의 실제 알파 채널과 모서리 투명도 확인 완료
- 기준 ZIP에 `node_modules`가 없으며 현재 패키지 레지스트리에서 일부 의존성을 받을 수 없어 전체 `npm run build`는 이 환경에서 실행하지 못함
