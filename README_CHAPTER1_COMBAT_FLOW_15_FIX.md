# 챕터 1 스토리 전투 흐름 15개 수정

이 수정본은 `sky-strike_-retro-ace_chapter1_story_test_hp_boss_size_fix.zip`을 기준으로 작성했다.
기존 프로젝트 폴더에 압축 내용을 덮어쓴 뒤 `npm.cmd run dev`로 실행한다.

## 적용 내용

1. 스토리 진행 막대, 장면 위치 인트로, 우측 상단 STORY 상태 배지를 숨겼다.
2. 실제 전투 진입 시 React HUD의 `STORY CHAPTER 1` 제목을 표시하지 않는다.
3. 챕터 1에서는 `satellite` 보조 드론 아이템을 드롭하지 않는다.
4. 일반 웨이브 클리어 후 배너·대기 시간을 0으로 두어 다음 웨이브를 즉시 진행한다.
5. 정화율 100%에서는 스토리 파일의 임시 게임 화면으로 전환하지 않는다. 실제 웨이브 캔버스를 정지한 상태에서 정화 파동만 덧씌운 뒤 후속 대사로 이동한다.
6. 원본 챕터 1 보스 체력을 1페이즈 1200, 2페이즈 1800으로 변경했다. 기존 400/600의 3배다.
7. 보스전 중 약 10.5~15초 간격으로 출석체크 드론·결석확인 드론 4~8마리를 투입한다. 첫 묶음은 약 7.5초 뒤부터 등장한다.
8. 일반 플레이어 피격 판정을 10×10에서 6×6으로 줄이고, 원본 챕터 1 보스 탄막의 중심 판정 반경도 축소했다.
9. 스마트 폭탄 발동 즉시 일반 적탄과 원본 보스 내부 탄막·파동·커서를 제거한다.
10. 2페이즈 시작 지연을 줄이고 현재 보스 위치에서 다음 패턴 궤도로 1.15초간 부드럽게 합류하도록 했다.
11. 스토리 웨이브 사망 시 전투 가이드 대사, 보스 사망 시 보스 직전 대사로 복귀한다.
12. 보스 파괴 연출 중에도 살아 있는 플레이어 캐릭터를 계속 렌더링한다.
13. React 보상 선택 화면과 보스 클리어 보상 선택 분기를 제거했다.
14. 스토리 모드 보스 클리어 시 스테이지를 챕터 2로 넘기지 않고 챕터 1 보스 후속 스토리 콜백으로 복귀한다.
15. 일반 아이템 드롭 확률을 12%에서 16%로 높였다. 보스 지원 몬스터는 28%다.

## 추가 정리

- 보스 1페이즈 종료와 최종 격파 진입 시 남아 있는 지원 몬스터와 지원 몬스터 탄을 즉시 제거한다.
- 정화 오버레이에는 별도의 제목·수치 HUD를 표시하지 않는다.
- 챕터 1 지원 몬스터가 떨어뜨리는 아이템은 회복 또는 화력 강화만 나온다.

## 수정 파일

- `src/App.tsx`
- `src/components/story/chapter1StoryPlayer.css`
- `src/story/chapter1/chapter1StoryRuntime.ts`
- `src/game/lifecycle/gameStartStateInitializer.ts`
- `src/game/player/playerSmartBombSystem.ts`
- `src/game/collision/collisionDamageAndPowerUpCollectionSystem.ts`
- `src/game/chapter1/chapter1WaveSystem.ts`
- `src/game/chapter1/chapter1BossTypes.ts`
- `src/game/chapter1/chapter1BossSystem.ts`
- `src/game/chapter1/chapter1BossOriginalRuntime.ts`
- `src/game/chapter1/chapter1BossRenderer.ts`
- `src/game/stage/stageFlowAndBossCutsceneSystem.ts`
- `src/game/boss/bossPatternHazardSystem.ts`

## 검증

- 수정된 TS/TSX 파일의 TypeScript 구문 변환 검사 통과
- 챕터 1 전·후반 스토리 런타임 JavaScript 구문 검사 통과
- 원본 보스 런타임 생성, 1페이즈 HP 1200, 탄막 초기화 메서드 실행 검사 통과
- 16개 소스 정적 조건 검사 통과
- 전체 `npm run build`는 작업 환경의 패키지 저장소에서 `zustand@5.0.14`를 내려받을 수 없어 완료하지 못했다.
