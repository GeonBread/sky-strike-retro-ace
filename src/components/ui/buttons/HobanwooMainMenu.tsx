import { useEffect } from "react";
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
        menuOpen ? "menu-open" : "start-screen",
        interactive ? "" : "is-inert",
      ].filter(Boolean).join(" ")}
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
