import { useEffect, useState } from "react";

export const FIXED_GAME_VIEWPORT_WIDTH = 922;
export const FIXED_GAME_VIEWPORT_HEIGHT = 960;
export const FIXED_CINEMATIC_VIEWPORT_WIDTH = 1920;
export const FIXED_CINEMATIC_VIEWPORT_HEIGHT = 1080;

function readAvailableViewport(): { width: number; height: number } {
  if (typeof window === "undefined") {
    return { width: FIXED_GAME_VIEWPORT_WIDTH, height: FIXED_GAME_VIEWPORT_HEIGHT };
  }
  const visual = window.visualViewport;
  return {
    width: Math.max(1, visual?.width ?? window.innerWidth),
    height: Math.max(1, visual?.height ?? window.innerHeight),
  };
}

function readContainScale(width: number, height: number): number {
  const viewport = readAvailableViewport();
  return Math.max(0.05, Math.min(viewport.width / width, viewport.height / height));
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
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [width, height, mode]);

  return scale;
}

/** Normal story/combat: fit the whole 922x960 logical frame inside the browser. */
export function useFixedGameViewportScale(): number {
  return useViewportScale(FIXED_GAME_VIEWPORT_WIDTH, FIXED_GAME_VIEWPORT_HEIGHT, "contain");
}

/** Full-screen cinematic: preserve 16:9 and cover the browser, cropping only overflow. */
export function useFixedCinematicViewportScale(): number {
  return useViewportScale(FIXED_CINEMATIC_VIEWPORT_WIDTH, FIXED_CINEMATIC_VIEWPORT_HEIGHT, "cover");
}
