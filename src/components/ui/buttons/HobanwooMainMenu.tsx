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
  onProductionInfo: () => void;
};

type MainMenuTimeBand = "day" | "evening" | "night" | "dawn";

type MainMenuArtButtonProps = {
  src: string;
  label: string;
  tone: "story" | "settings" | "ship" | "production";
  disabled: boolean;
  onClick: () => void;
};

function resolveMainMenuTimeBand(date = new Date()): MainMenuTimeBand {
  const hour = date.getHours();

  // 07:00~16:59: 아침/오후, 17:00~19:59: 저녁,
  // 20:00~03:59: 밤, 04:00~06:59: 새벽
  if (hour >= 7 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  if (hour >= 4 && hour < 7) return "dawn";
  return "night";
}

function MainMenuArtButton({
  src,
  label,
  tone,
  disabled,
  onClick,
}: MainMenuArtButtonProps) {
  return (
    <button
      type="button"
      className={`hobanwooMainArtButton tone-${tone}`}
      disabled={disabled}
      aria-label={label}
      onClick={() => {
        if (disabled) return;
        sfx.uiClick();
        onClick();
      }}
    >
      <img src={src} alt="" draggable={false} />
    </button>
  );
}

/**
 * 메인 화면 배경과 시작/메뉴 UI를 렌더링한다.
 * 메인 메뉴는 스토리 모드 / 설정 / 기체 선택 / 제작 정보 네 항목으로 구성한다.
 */
export function HobanwooMainMenu({
  menuOpen,
  onMenuOpenChange,
  interactive = true,
  onStoryMode,
  onSettings,
  onShipSelect,
  onProductionInfo,
}: HobanwooMainMenuProps) {
  const [timeBand, setTimeBand] = useState<MainMenuTimeBand>(() => resolveMainMenuTimeBand());

  useEffect(() => {
    const syncTimeBand = () => setTimeBand(resolveMainMenuTimeBand());
    const timer = window.setInterval(syncTimeBand, 60_000);

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
        src="/assets/common/ui/logos/site-logo.png"
        alt="호반우 게임 사이트"
        draggable={false}
      />

      <div className="hobanwooMainLogoStage" aria-hidden={false}>
        <img
          className="hobanwooMainLogo"
          src="/assets/chapter1/story/ui/game_logo.png"
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
        className="hobanwooMainButtonColumn hobanwooMainButtonColumnV11"
        aria-hidden={!menuOpen}
      >
        <MainMenuArtButton
          src="/assets/common/ui/buttons/main_menu_story_mode_v11.png"
          label="스토리 모드"
          tone="story"
          disabled={!menuOpen}
          onClick={onStoryMode}
        />
        <MainMenuArtButton
          src="/assets/common/ui/buttons/main_menu_settings_v11.png"
          label="설정"
          tone="settings"
          disabled={!menuOpen}
          onClick={onSettings}
        />
        <MainMenuArtButton
          src="/assets/common/ui/buttons/main_menu_ship_select_v11.png"
          label="기체 선택"
          tone="ship"
          disabled={!menuOpen}
          onClick={onShipSelect}
        />
        <MainMenuArtButton
          src="/assets/common/ui/buttons/main_menu_production_info_v11.png"
          label="제작 정보"
          tone="production"
          disabled={!menuOpen}
          onClick={onProductionInfo}
        />
      </div>
    </section>
  );
}
