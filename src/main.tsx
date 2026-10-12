import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const FIXED_APP_VIEWPORT_WIDTH = 922;
const FIXED_APP_VIEWPORT_HEIGHT = 960;

function readFixedAppScale(): number {
  if (typeof window === 'undefined') return 1;
  const viewportWidth = Math.max(1, window.innerWidth);
  const viewportHeight = Math.max(1, window.innerHeight);
  return Math.max(
    0.05,
    Math.min(
      viewportWidth / FIXED_APP_VIEWPORT_WIDTH,
      viewportHeight / FIXED_APP_VIEWPORT_HEIGHT,
    ),
  );
}

function buildEmbeddedAppUrl(): string {
  if (typeof window === 'undefined') return '/?embedded=1';
  const url = new URL(window.location.href);
  url.searchParams.set('embedded', '1');
  return url.toString();
}

function FixedRatioAppShell() {
  const [scale, setScale] = useState(readFixedAppScale);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const embeddedAppUrl = useMemo(() => buildEmbeddedAppUrl(), []);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => setScale(readFixedAppScale()));
    };

    update();
    window.addEventListener('resize', update, { passive: true });
    window.visualViewport?.addEventListener('resize', update, { passive: true });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  const focusEmbeddedApp = () => {
    iframeRef.current?.focus();
    iframeRef.current?.contentWindow?.focus();
  };

  return (
    <div className="fixedAppShell" onPointerDown={focusEmbeddedApp}>
      <div
        className="fixedAppViewport"
        style={{
          width: FIXED_APP_VIEWPORT_WIDTH,
          height: FIXED_APP_VIEWPORT_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        <iframe
          ref={iframeRef}
          className="fixedAppViewportFrame"
          title="호반우의 졸업 대작전"
          src={embeddedAppUrl}
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
}

const isEmbeddedApp =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('embedded') === '1';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isEmbeddedApp ? <App /> : <FixedRatioAppShell />}
  </StrictMode>,
);
