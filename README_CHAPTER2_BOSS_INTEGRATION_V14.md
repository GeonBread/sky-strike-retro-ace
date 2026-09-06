# Chapter 2 Boss Integration V14

## 적용 기준
- `chapter1_chapter2_world_lore_dialogue_update_v13.zip`까지 적용된 프로젝트 위에 덮어쓰기.
- 프로젝트 상대 경로를 유지한 증분 패치.

## 통합 원칙
업로드된 `chapter2_boss_exam_teamplay_idea_lab_updated_v68`에서 다음만 이식함.
- 보스 1/2페이즈 로직
- 보스 PNG 에셋
- 보스 최초 등장 연출
- 1페이즈 파괴 -> 2페이즈 각성 전환 연출
- 최종 파괴/CLEAR 연출
- 201~207, 301~309 보스 패턴 및 패턴 전용 효과

다음은 보스 랩에서 가져오지 않음.
- 테스트용 플레이어
- 테스트용 플레이어 탄환/조작
- LIFE HUD
- 보스 랩 전용 HUD/테스트 UI
- 보스 랩 자체 키보드/터치 이벤트 루프

실제 전투에서는 기존 게임의 호반우 플레이어, 이동/발사/무기, HP, 폭탄, 피격/무적,
일시정지, 기본 전투 HUD를 그대로 사용함.

## 화면 크기
v68 보스 원본 설계 해상도는 `800 x 960`임.
프로젝트 스토리 전투 캔버스 `922 x 960`에서 가로/세로를 따로 늘리지 않음.

- uniform scale = 1.0
- source = 800 x 960
- destination = 800 x 960
- horizontal offset = 61 px

따라서 보스/탄막/연출 비율과 원본 크기를 유지하고 좌우 여백만 동일하게 둠.
기존 호반우 플레이어는 같은 좌표 투영을 사용해 보스 패턴과 충돌함.

## 보스 흐름
스토리의 기존 `보스전 시작` integration gate에서 실제 보스 전투를 시작함.

1. v68 보스 등장신
2. Phase 1 / HP 2000
3. 201~207 시험 계열 패턴
4. Phase 1 파괴 연출
5. Phase 2 각성 전환신
6. Phase 2 / HP 2200
7. 301~309 팀플 계열 패턴
8. 최종 파괴 연출
9. CLEAR
10. 검은 화면 전환 후 기존 Chapter 2 스토리 재개

## 패턴
### Phase 1
- 201 간단한 계산 문제
- 202 F학점 폭탄
- 203 동그라미 채점 폭발
- 204 오염 탄막
- 205 블랙홀 탄
- 206 추적 레이저 오염포격
- 207 봐야 될 전공책

### Phase 2
- 301 PPT 텍스트 공격
- 302 PPT 도형 물리 공격
- 303 팀원별 형식 불일치
- 304 공유 문서함 드론
- 305 팀플 단체 채팅 레이저
- 306 Zoom 미팅 공격
- 307 복붙 및 이전으로
- 308 미팅 패턴 · 카톡 채팅방 미사일
- 309 미팅 패턴 · Word 보고서 오류

## 기존 호반우 시스템 연결
- 기존 플레이어 탄환을 v68 보스/파괴 가능 패턴 오브젝트에 연결함.
- 기존 폭탄은 보스 패턴 탄막을 정리하고 보스에 1회 피해를 줌.
- 계산 문제 및 보스 시네마틱처럼 v68에서 사격이 금지되는 구간에서는 기존 호반우 탄환도 즉시 정리함.
- 보스 랩 내부 플레이어 렌더링은 비활성화하여 호반우가 중복 표시되지 않음.
- 보스 랩 내부 HUD 렌더링은 비활성화하여 프로젝트 기본 UI가 유지됨.

## TEST 이동/스킵
기존 Chapter 2 TEST 이동 패널에 보스 항목을 연결함.

- 보스전 처음부터
- 보스 등장신
- Phase 1 패턴 201~207 직접 이동
- 1페이즈 사망 -> 2페이즈 각성
- 2페이즈 각성신
- Phase 2 패턴 301~309 직접 이동
- 보스 사망/CLEAR 연출

보스 전투 중 `F6`은 현재 패턴/연출 스킵,
`F7`은 TEST 이동 패널,
`F8`은 최종 CLEAR 연출로 빠르게 이동하도록 기존 테스트 흐름과 연결함.

## 추가 파일
- `src/game/chapter2/chapter2BossOriginalRuntime.ts`
- `src/game/chapter2/chapter2BossPhasePack.ts`
- `src/game/chapter2/chapter2BossRenderer.ts`
- `src/game/chapter2/chapter2BossSystem.ts`
- `src/game/chapter2/chapter2BossTypes.ts`
- `src/game/chapter2/chapter2BossViewportProjection.ts`
- `public/assets/chapter2/boss/boss_phase1.png`
- `public/assets/chapter2/boss/boss_phase2.png`

## 수정 파일
- `src/App.tsx`
- `src/components/story/Chapter2StoryExperience.tsx`
- `src/game/engine.ts`
- `src/game/render/gameSceneRenderer.ts`
- `src/game/stage/stageFlowAndBossCutsceneSystem.ts`

## 검사
- 수정/신규 TypeScript 및 TSX 파일 `transpileModule` 문법 검사 통과.
- 상대 import 경로 존재 검사 통과.
- v68 원본 패턴 ID 16개 확인.
- 헤드리스 런타임 스모크 테스트:
  - Phase 1 등장신 시작/스킵
  - 201 시작
  - 304 직접 이동 및 Phase 2 HP 확인
  - Phase 1 clear -> Phase 2 transition 체인
  - 최종 clear -> completion callback
  모두 통과.
- 렌더 스모크 테스트: 201~207, 301~309 전 패턴 및 주요 시네마틱 render 호출 통과.

전체 Vite build는 전달받은 경량 소스에 `node_modules`가 없고 이 환경의 npm 오프라인 캐시에
필요 패키지가 모두 존재하지 않아 실행하지 못함. 프로젝트 파일 자체의 구문/로컬 import/런타임 흐름은 위 검사로 검증함.
