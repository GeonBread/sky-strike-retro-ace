# Chapter 1 Prologue Reality-Overlap Fix v10

기준: `chapter1_chapter2_story_dialogue_lore_update_v9.zip` 적용본

## 변경 사항

챕터 1 프롤로그의 첨성대 코어 설명을 최신 대사로 교체했습니다.

기존 문장:

- `첨성대 코어는 현실의 첨성대를 중심으로 경북대학교 곳곳과 이어져 있었다.`

삭제 후 다음 두 문장으로 변경:

- `첨성대 코어는 현실과 겹쳐 존재하지만,`
- `평범한 학생이 직접 보거나 들어갈 수 있는 공간은 아니었다.`

사용자가 제공한 최신 프롤로그 전체 36개 나레이터 대사와 정확히 일치하도록 반영했습니다.

대사가 1개 늘어났으므로 프롤로그 `dialogueText("prologue", n)` 구조도 0~35로 재정렬했습니다. 또한 첨성대 코어 설명 구간의 기존 일러스트 연출이 두 새 문장에도 그대로 이어지도록 텍스트 기반 연출 매핑을 함께 수정했습니다.

챕터 2 및 챕터 1의 프롤로그 외 스토리 내용은 변경하지 않았습니다.

## 검증

- 최신 프롤로그 36개 문장 exact-match 검증 통과
- 프롤로그 dialogue index 0~35 연속성 검증 통과
- 내장 bootstrap JavaScript `node --check` 통과
- 내장 runtime JavaScript `node --check` 통과
- `chapter1StoryPart1Document.ts` TypeScript `tsc --noEmit` 통과
