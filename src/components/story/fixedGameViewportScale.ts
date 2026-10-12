import { useEffect, useState } from "react";

export const FIXED_GAME_VIEWPORT_WIDTH = 922;
export const FIXED_GAME_VIEWPORT_HEIGHT = 960;
export const FIXED_CINEMATIC_VIEWPORT_WIDTH = 1920;
export const FIXED_CINEMATIC_VIEWPORT_HEIGHT = 1080;

function readAvailableViewport(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: FIXED_GAME_VIEWPORT_WIDTH, height: FIXED_GAME_VIEWPORT_HEIGHT };
  const visual = window.visualViewport;
  return {
    width: Math.max(1, visual?.width ?? window.innerWidth),
    height: Math.max(1, visual?.height ?? window.innerHeight),
  };
}

function readFixedViewportScale(width: number, height: number): number {
  const viewport = readAvailableViewport();
  return Math.max(0.05, Math.min(viewport.width / width, viewport.height / height));
}

export function useFixedViewportScale(width: number, height: number): number {
  const [scale, setScale] = useState(() => readFixedViewportScale(width, height));

  useEffect(() => {
    let raf = 0;
    const update = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => setScale(readFixedViewportScale(width, height)));
    };

    update();
    window.addEventListener("resize", update, { passive: true });
    window.visualViewport?.addEventListener("resize", update, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [width, height]);

  return scale;
}

export function useFixedGameViewportScale(): number {
  return useFixedViewportScale(FIXED_GAME_VIEWPORT_WIDTH, FIXED_GAME_VIEWPORT_HEIGHT);
}

export function useFixedCinematicViewportScale(): number {
  return useFixedViewportScale(FIXED_CINEMATIC_VIEWPORT_WIDTH, FIXED_CINEMATIC_VIEWPORT_HEIGHT);
}
