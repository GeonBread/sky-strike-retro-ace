import { HobanwooSpriteButton } from "./HobanwooSpriteButton";
import "./hobanwooMainMenu.css";

type HobanwooMainMenuProps = {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  interactive?: boolean;
  onStoryMode: () => void;
  onScoreMode: () => void;
  onRanking: () => void;
  onSettings: () => void;
  onShipSelect: () => void;
  onDevMode: () => void;
};

/**
 * 메인 화면 배경과 시작/모드 선택 UI를 렌더링한다.
 * menuOpen은 App에서 관리하므로 랭킹이나 게임 화면을 다녀와도 열린 메뉴 상태가 유지된다.
 */
export function HobanwooMainMenu({
  menuOpen,
  onMenuOpenChange,
  interactive = true,
  onStoryMode,
  onScoreMode,
  onRanking,
  onSettings,
  onShipSelect,
  onDevMode,
}: HobanwooMainMenuProps) {
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

      {/* 같은 로고 엘리먼트의 크기와 위치를 전환해 자연스러운 모핑처럼 보이게 한다. */}
      <div className="hobanwooMainLogoStage" aria-hidden={false}>
        <img
          className="hobanwooMainLogo"
          src="/assets/ui/logos/game-title-logo.png"
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
        className="hobanwooMainButtonColumn"
        aria-hidden={!menuOpen}
      >
        <HobanwooSpriteButton
          variant="redesignStoryMode"
          disabled={!menuOpen}
          onClick={onStoryMode}
        />
        <HobanwooSpriteButton
          variant="redesignScoreMode"
          disabled={!menuOpen}
          onClick={onScoreMode}
        />
        <HobanwooSpriteButton
          variant="redesignRanking"
          disabled={!menuOpen}
          onClick={onRanking}
        />
        <HobanwooSpriteButton
          variant="redesignSettings"
          disabled={!menuOpen}
          onClick={onSettings}
        />
        <button
          type="button"
          className="hobanwooTempShipButton"
          disabled={!menuOpen}
          onClick={onShipSelect}
        >
          <span className="hobanwooTempShipIcon">✦</span>
          <span>기체 선택</span>
        </button>
      </div>

      <button
        type="button"
        className="hobanwooDevModeButton"
        disabled={!menuOpen}
        onClick={onDevMode}
      >
        DEV
      </button>
    </section>
  );
}
