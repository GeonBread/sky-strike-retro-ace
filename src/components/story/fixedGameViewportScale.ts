import { useEffect, useState, type RefObject } from "react";

export const FIXED_GAME_VIEWPORT_WIDTH = 922;
export const FIXED_GAME_VIEWPORT_HEIGHT = 960;
export const FIXED_CINEMATIC_VIEWPORT_WIDTH = 1920;
export const FIXED_CINEMATIC_VIEWPORT_HEIGHT = 1080;

const STORY_SIDE_MARGIN = 28;
const STORY_TOP_MARGIN = 24;
const STORY_BOTTOM_MARGIN = 104;

function readWindowViewport(): { width: number; height: number } {
  if (typeof window === "undefined") {
    return { width: FIXED_GAME_VIEWPORT_WIDTH, height: FIXED_GAME_VIEWPORT_HEIGHT };
  }
  const visual = window.visualViewport;
  const width = Math.min(
    window.innerWidth || Infinity,
    document.documentElement?.clientWidth || Infinity,
    visual?.width || Infinity,
  );
  const height = Math.min(
    window.innerHeight || Infinity,
    document.documentElement?.clientHeight || Infinity,
    visual?.height || Infinity,
  );
  return {
    width: Number.isFinite(width) ? Math.max(1, width) : FIXED_GAME_VIEWPORT_WIDTH,
    height: Number.isFinite(height) ? Math.max(1, height) : FIXED_GAME_VIEWPORT_HEIGHT,
  };
}

function containScale(availableWidth: number, availableHeight: number): number {
  const safeWidth = Math.max(1, availableWidth - STORY_SIDE_MARGIN * 2);
  const safeHeight = Math.max(1, availableHeight - STORY_TOP_MARGIN - STORY_BOTTOM_MARGIN);
  return Math.max(
    0.05,
    Math.min(
      safeWidth / FIXED_GAME_VIEWPORT_WIDTH,
      safeHeight / FIXED_GAME_VIEWPORT_HEIGHT,
    ),
  );
}

/**
 * Chapter 2/3 story frame scale measured from the ACTUAL rendered host element.
 * This intentionally does not trust only window.innerHeight because Chromium can
 * report a viewport that does not match the usable React host area on some laptop/
 * Windows taskbar/browser configurations.
 */
export function useMeasuredGameViewportScale(
  hostRef: RefObject<HTMLElement | null>,
): number {
  const initial = () => {
    const viewport = readWindowViewport();
    return containScale(viewport.width, viewport.height);
  };
  const [scale, setScale] = useState(initial);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const host = hostRef.current;
        if (!host) {
          const viewport = readWindowViewport();
          setScale(containScale(viewport.width, viewport.height));
          return;
        }
        const rect = host.getBoundingClientRect();
        const clientWidth = host.clientWidth || rect.width;
        const clientHeight = host.clientHeight || rect.height;
        const viewport = readWindowViewport();

        // Use the smaller of the host and browser viewport so the logical frame
        // can never extend underneath browser/taskbar-covered space.
        const availableWidth = Math.max(1, Math.min(clientWidth, rect.width, viewport.width));
        const availableHeight = Math.max(1, Math.min(clientHeight, rect.height, viewport.height));
        setScale(containScale(availableWidth, availableHeight));
      });
    };

    update();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(update)
      : null;
    if (hostRef.current) observer?.observe(hostRef.current);

    window.addEventListener("resize", update, { passive: true });
    window.visualViewport?.addEventListener("resize", update, { passive: true });
    window.visualViewport?.addEventListener("scroll", update, { passive: true });

    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [hostRef]);

  return scale;
}

function readCoverScale(width: number, height: number): number {
  const viewport = readWindowViewport();
  return Math.max(0.05, Math.max(viewport.width / width, viewport.height / height));
}

export function useFixedCinematicViewportScale(): number {
  const [scale, setScale] = useState(() => readCoverScale(FIXED_CINEMATIC_VIEWPORT_WIDTH, FIXED_CINEMATIC_VIEWPORT_HEIGHT));
  useEffect(() => {
    let raf = 0;
    const update = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        setScale(readCoverScale(FIXED_CINEMATIC_VIEWPORT_WIDTH, FIXED_CINEMATIC_VIEWPORT_HEIGHT));
      });
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
