import { useEffect, useState } from "react";
import { sfx } from "../../../game/AudioSystem";
import { HobanwooSpriteButton } from "./HobanwooSpriteButton";
import "./hobanwooMainMenu.css";

type HobanwooMainMenuProps = {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  interactive?: boolean;
  onStoryMode: () => void;
  onSettings: () => void;
  onShipSelect: () => void;
};

type MainMenuTimeBand = "day" | "evening" | "night" | "dawn";

function resolveMainMenuTimeBand(date = new Date()): MainMenuTimeBand {
  const hour = date.getHours();

  // 07:00~16:59: 아침/오후, 17:00~19:59: 저녁,
  // 20:00~03:59: 밤, 04:00~06:59: 새벽
  if (hour >= 7 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  if (hour >= 4 && hour < 7) return "dawn";
  return "night";
}

/**
 * 메인 화면 배경과 시작/메뉴 UI를 렌더링한다.
 * 도전 모드와 순위 메뉴는 제거하고 스토리/설정/기체 선택만 유지한다.
 */
export function HobanwooMainMenu({
  menuOpen,
  onMenuOpenChange,
  interactive = true,
  onStoryMode,
  onSettings,
  onShipSelect,
}: HobanwooMainMenuProps) {
  const [timeBand, setTimeBand] = useState<MainMenuTimeBand>(() => resolveMainMenuTimeBand());

  useEffect(() => {
    const syncTimeBand = () => setTimeBand(resolveMainMenuTimeBand());
    const timer = window.setInterval(syncTimeBand, 60_000);

    // 백그라운드 탭에서 오래 머문 뒤 돌아와도 즉시 현재 시간대로 맞춘다.
    document.addEventListener("visibilitychange", syncTimeBand);
    window.addEventListener("focus", syncTimeBand);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncTimeBand);
      window.removeEventListener("focus", syncTimeBand);
    };
  }, []);

  useEffect(() => {
    sfx.startMenuBgm();

    const resumeMenuBgm = () => sfx.resumeAll();
    window.addEventListener("pointerdown", resumeMenuBgm, { capture: true });
    window.addEventListener("keydown", resumeMenuBgm, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", resumeMenuBgm, { capture: true });
      window.removeEventListener("keydown", resumeMenuBgm, { capture: true });
      sfx.stopBgm();
    };
  }, []);

  return (
    <section
      className={[
        "hobanwooMainMenu",
        `time-${timeBand}`,
        menuOpen ? "menu-open" : "start-screen",
        interactive ? "" : "is-inert",
      ].filter(Boolean).join(" ")}
      data-time-band={timeBand}
      aria-label="메인 화면"
    >
      <div className="hobanwooMainMenuShade" />

      <img
        className="hobanwooSiteLogo"
        src="/assets/ui/logos/site-logo.png"
        alt="호반우 게임 사이트"
        draggable={false}
      />

      <div className="hobanwooMainLogoStage" aria-hidden={false}>
        <img
          className="hobanwooMainLogo"
          src="/assets/story/chapter1/ui/game_logo.png"
          alt="호반우의 졸업 대작전"
          draggable={false}
        />
      </div>

      <div
        className="hobanwooMainStartControls"
        aria-hidden={menuOpen}
      >
        <HobanwooSpriteButton
          variant="gameStart"
          disabled={menuOpen}
          onClick={() => onMenuOpenChange(true)}
        />
      </div>

      <div
        className="hobanwooMainButtonColumn hobanwooMainButtonColumnV8"
        aria-hidden={!menuOpen}
      >
        <HobanwooSpriteButton
          variant="redesignStoryMode"
          disabled={!menuOpen}
          onClick={onStoryMode}
        />

        <HobanwooSpriteButton
          variant="redesignSettings"
          disabled={!menuOpen}
          onClick={onSettings}
        />

        <button
          type="button"
          className="hobanwooShipSelectButton"
          disabled={!menuOpen}
          onClick={() => {
            sfx.uiClick();
            onShipSelect();
          }}
        >
          <span className="hobanwooShipSelectButtonGlow" aria-hidden="true" />
          <span className="hobanwooShipSelectButtonIcon" aria-hidden="true">✦</span>
          <span className="hobanwooShipSelectButtonCopy">
            <small>SHIP SELECT</small>
            <strong>기체 선택</strong>
            <em>이과 · 문과 · 예체능</em>
          </span>
          <span className="hobanwooShipSelectButtonArrow" aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  );
}
