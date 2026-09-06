# Chapter 1 [장면] 타이틀 표시 수정 v12

적용 기준: v11 (`chapter1_scene_template_chapter2_style_v11.zip`) 적용본

## 수정 내용

- v11에서 Chapter 2 스타일 장소 타이틀 오버레이를 런타임 시작 시 미리 생성하면서,
  배경/그리드/장소명 자식 애니메이션도 그 즉시 실행되어 실제 `[장면]` 전환 시점에는 이미 끝난 상태가 되는 문제를 수정했습니다.
- 배경 줌, 그리드 이동, `LOCATION` + 장소명 텍스트 애니메이션은 이제 `.is-active`가 붙는 실제 장면 전환 순간에만 시작됩니다.
- 반복되는 장소 전환에서도 class 제거 -> reflow -> 재활성화 방식으로 애니메이션이 매번 다시 재생됩니다.
- Chapter 1의 대사, 장면 순서, 전투/보스 로직은 변경하지 않았습니다.

## 수정 파일

- `src/story/chapter1/chapter1StoryRuntime.ts`
