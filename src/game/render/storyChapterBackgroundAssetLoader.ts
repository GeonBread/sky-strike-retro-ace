/**
 * 스토리 챕터 배경 에셋 로더
 *
 * 스토리 챕터 배경 이미지를 브라우저 Image 객체로 준비하고 렌더링 가능 상태를 갱신한다.
 * 배경 이미지 선로딩 방식이나 레이어 준비 완료 판정을 조정할 때 이 파일을 수정한다.
 */

import { STORY_CHAPTER1_PARALLAX_LAYERS } from "../data/storyChapterBackgroundCatalog";

type StoryBackgroundAssetRuntime = any;

/**
 * 챕터 1 패럴랙스 배경 이미지들을 로드하고 모든 레이어가 준비되면 ready 상태를 true로 바꾼다.
 * 서버 렌더링처럼 Image 생성자가 없는 환경에서는 아무 작업도 하지 않는다.
 */
export function loadChapter1BackgroundLayersSystem(engine: StoryBackgroundAssetRuntime) {
  if (typeof Image === "undefined") return;

  engine.chapter1BackgroundLayers = STORY_CHAPTER1_PARALLAX_LAYERS.map((src) => {
    const img = new Image();
    img.onload = () => {
      engine.chapter1BackgroundReady = engine.chapter1BackgroundLayers.every(
        (layer: HTMLImageElement) => layer.complete && layer.naturalWidth > 0,
      );
    };
    img.src = src;
    return img;
  });
}
