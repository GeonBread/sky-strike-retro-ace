import { useEffect, useState } from "react";

export const FIXED_GAME_VIEWPORT_WIDTH = 922;
export const FIXED_GAME_VIEWPORT_HEIGHT = 960;
export const FIXED_CINEMATIC_VIEWPORT_WIDTH = 1920;
export const FIXED_CINEMATIC_VIEWPORT_HEIGHT = 1080;

// 일반 스토리/웨이브 프레임은 브라우저 하단에 딱 붙지 않도록
// 작은 안전 여백을 남긴다. 전체화면 시네마틱에는 적용하지 않는다.
const STORY_SAFE_HORIZONTAL_PX = 24;
const STORY_SAFE_VERTICAL_PX = 120;
const STORY_SCALE_SAFETY = 0.90;

function readAvailableViewport(): { width: number; height: number } {
  if (typeof window === "undefined") {
    return { width: FIXED_GAME_VIEWPORT_WIDTH, height: FIXED_GAME_VIEWPORT_HEIGHT };
  }

  const visual = window.visualViewport;
  const documentElement = document.documentElement;

  // Chromium에서 visualViewport와 layout viewport가 소수점/브라우저 UI 때문에
  // 1~몇 px 차이 나는 경우가 있으므로 더 작은 실제 사용 가능 영역을 기준으로 한다.
  const widthCandidates = [
    window.innerWidth,
    documentElement?.clientWidth,
    visual?.width,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);

  const heightCandidates = [
    window.innerHeight,
    documentElement?.clientHeight,
    visual?.height,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);

  return {
    width: Math.max(1, Math.min(...widthCandidates)),
    height: Math.max(1, Math.min(...heightCandidates)),
  };
}

function readContainScale(width: number, height: number): number {
  const viewport = readAvailableViewport();
  const safeWidth = Math.max(1, viewport.width - STORY_SAFE_HORIZONTAL_PX * 2);
  const safeHeight = Math.max(1, viewport.height - STORY_SAFE_VERTICAL_PX * 2);
  return Math.max(0.05, Math.min(safeWidth / width, safeHeight / height) * STORY_SCALE_SAFETY);
}

function readCoverScale(width: number, height: number): number {
  const viewport = readAvailableViewport();
  return Math.max(0.05, Math.max(viewport.width / width, viewport.height / height));
}

function useViewportScale(width: number, height: number, mode: "contain" | "cover"): number {
  const readScale = () => mode === "cover" ? readCoverScale(width, height) : readContainScale(width, height);
  const [scale, setScale] = useState(readScale);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => setScale(readScale()));
    };

    update();
    window.addEventListener("resize", update, { passive: true });
    window.visualViewport?.addEventListener("resize", update, { passive: true });
    window.visualViewport?.addEventListener("scroll", update, { passive: true });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [width, height, mode]);

  return scale;
}

/** Normal story/combat: fit the whole 922x960 logical frame with a small safe margin. */
export function useFixedGameViewportScale(): number {
  return useViewportScale(FIXED_GAME_VIEWPORT_WIDTH, FIXED_GAME_VIEWPORT_HEIGHT, "contain");
}

/** Full-screen cinematic: preserve 16:9 and cover the browser, cropping only overflow. */
export function useFixedCinematicViewportScale(): number {
  return useViewportScale(FIXED_CINEMATIC_VIEWPORT_WIDTH, FIXED_CINEMATIC_VIEWPORT_HEIGHT, "cover");
}
