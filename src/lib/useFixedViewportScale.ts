import { useEffect, useState } from "react";

export const GAME_VIEWPORT_WIDTH = 922;
export const GAME_VIEWPORT_HEIGHT = 960;
export const CINEMATIC_VIEWPORT_WIDTH = 1600;
export const CINEMATIC_VIEWPORT_HEIGHT = 900;
export const MAIN_MENU_VIEWPORT_WIDTH = 1600;
export const MAIN_MENU_VIEWPORT_HEIGHT = 900;

type ViewportFitMode = "contain" | "cover";

function readViewportSize() {
  if (typeof window === "undefined") return { width: 1, height: 1 };
  const viewport = window.visualViewport;
  return {
    width: Math.max(1, viewport?.width ?? window.innerWidth ?? document.documentElement.clientWidth),
    height: Math.max(1, viewport?.height ?? window.innerHeight ?? document.documentElement.clientHeight),
  };
}

export function computeFixedViewportScale(
  logicalWidth: number,
  logicalHeight: number,
  mode: ViewportFitMode = "contain",
) {
  const viewport = readViewportSize();
  const widthScale = viewport.width / Math.max(1, logicalWidth);
  const heightScale = viewport.height / Math.max(1, logicalHeight);
  return mode === "cover" ? Math.max(widthScale, heightScale) : Math.min(widthScale, heightScale);
}

/**
 * Keeps a fixed logical viewport stable while browser/page zoom changes the CSS viewport.
 * All descendants are laid out in the same logical coordinates and are scaled as one unit.
 */
export function useFixedViewportScale(
  logicalWidth: number,
  logicalHeight: number,
  mode: ViewportFitMode = "contain",
) {
  const [scale, setScale] = useState(() => computeFixedViewportScale(logicalWidth, logicalHeight, mode));

  useEffect(() => {
    let animationFrame = 0;
    const sync = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        setScale(computeFixedViewportScale(logicalWidth, logicalHeight, mode));
      });
    };

    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, [logicalHeight, logicalWidth, mode]);

  return scale;
}
