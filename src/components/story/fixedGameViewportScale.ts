import { useEffect, useState } from "react";

export const FIXED_GAME_VIEWPORT_WIDTH = 922;
export const FIXED_GAME_VIEWPORT_HEIGHT = 960;

function readFixedGameViewportScale(): number {
  if (typeof window === "undefined") return 1;
  const viewportWidth = Math.max(1, window.innerWidth);
  const viewportHeight = Math.max(1, window.innerHeight);
  return Math.max(
    0.05,
    Math.min(
      viewportWidth / FIXED_GAME_VIEWPORT_WIDTH,
      viewportHeight / FIXED_GAME_VIEWPORT_HEIGHT,
    ),
  );
}

export function useFixedGameViewportScale(): number {
  const [scale, setScale] = useState(readFixedGameViewportScale);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => setScale(readFixedGameViewportScale()));
    };

    update();
    window.addEventListener("resize", update, { passive: true });
    window.visualViewport?.addEventListener("resize", update, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  return scale;
}
