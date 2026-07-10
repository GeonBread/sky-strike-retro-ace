import { useState } from "react";
import { HobanwooSpriteButton } from "./HobanwooSpriteButton";
import "./hobanwooMainMenu.css";

type HobanwooMainMenuProps = {
  onStoryMode: () => void;
  onScoreMode: () => void;
  onRanking: () => void;
  onSettings: () => void;
  onShipSelect: () => void;
  onDevMode: () => void;
};

export function HobanwooMainMenu({
  onStoryMode,
  onScoreMode,
  onRanking,
  onSettings,
  onShipSelect,
  onDevMode,
}: HobanwooMainMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="hobanwooMainMenu" aria-label="메인 화면">
      <div className="hobanwooMainMenuShade" />

      {!menuOpen && (
        <div className="hobanwooMainStartLayer">
          <img
            className="hobanwooMainLogo"
            src="/assets/ui/logos/graduation_operation_logo.png"
            alt="호반우의 졸업 대작전"
            draggable={false}
          />

          <div className="hobanwooMainStartButton">
            <HobanwooSpriteButton
              variant="gameStart"
              onClick={() => setMenuOpen(true)}
            />
          </div>
        </div>
      )}

      {menuOpen && (
        <>
          <div className="hobanwooMainButtonColumn">
            <HobanwooSpriteButton variant="redesignStoryMode" onClick={onStoryMode} />
            <HobanwooSpriteButton variant="redesignScoreMode" onClick={onScoreMode} />
            <HobanwooSpriteButton variant="redesignRanking" onClick={onRanking} />
            <HobanwooSpriteButton variant="redesignSettings" onClick={onSettings} />
            <button type="button" className="hobanwooTempShipButton" onClick={onShipSelect}>
              <span className="hobanwooTempShipIcon">✦</span>
              <span>기체 선택</span>
            </button>
          </div>

          <button type="button" className="hobanwooDevModeButton" onClick={onDevMode}>
            DEV
          </button>
        </>
      )}
    </section>
  );
}
