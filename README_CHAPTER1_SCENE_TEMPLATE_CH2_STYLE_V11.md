# Chapter 1 Scene Title Template -> Chapter 2 Style (v11)

적용 기준: `chapter1_prologue_reality_overlap_fix_v10.zip`까지 적용된 프로젝트

## 변경 내용

- Chapter 1에서 실제 장소가 바뀔 때 표시되는 `[장면]`/장소 타이틀 연출을 Chapter 2의 LOCATION 템플릿과 동일한 계열로 교체했습니다.
- 기존 Chapter 1의 단순 중앙 장소명 / AREA CHANGE 카드 노출은 숨겼습니다.
- 새 템플릿 구성:
  - 브라우저 전체 화면 오버레이
  - 현재 이동 대상 장면의 배경 이미지
  - 배경 카메라 줌/밝기 전환
  - 비네트
  - 옅은 이동 그리드
  - 금색 `LOCATION` 라벨
  - 중앙 대형 장소명
  - 위/아래 금색 라인
  - Chapter 2와 동일한 2.5초 등장/유지/퇴장 타이밍
- Chapter 1의 대사, 장면 순서, 장소 이름, 전투/보스 로직은 변경하지 않았습니다.
- 기존 Chapter 1 장소 타이틀 이벤트를 그대로 사용하므로 별도의 스토리 데이터 수정은 필요 없습니다.

## 수정 파일

- `src/story/chapter1/chapter1StoryRuntime.ts`

## 확인

- 단일 파일 TypeScript 검사 통과:
  `tsc src/story/chapter1/chapter1StoryRuntime.ts --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --lib DOM,ES2022 --skipLibCheck`
