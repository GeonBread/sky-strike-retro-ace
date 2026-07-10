import type { ShipStyle } from "../../../types";
import "./hobanwooShipSelectPanel.css";

type HobanwooShipSelectPanelProps = {
  value: ShipStyle;
  onChange: (style: ShipStyle) => void;
  onClose: () => void;
};

const STYLE_OPTIONS: { id: ShipStyle; title: string; subtitle: string; icon: string }[] = [
  { id: "science", title: "이과", subtitle: "원자·실험실 계열 탄막", icon: "⚛" },
  { id: "humanities", title: "문과", subtitle: "책·문장·페이지 계열 탄막", icon: "책" },
  { id: "arts", title: "예체능", subtitle: "별·무대·리듬 계열 탄막", icon: "★" },
];

export function HobanwooShipSelectPanel({ value, onChange, onClose }: HobanwooShipSelectPanelProps) {
  return (
    <div className="hobanwooShipSelectDim" role="dialog" aria-modal="true" aria-label="기체 선택">
      <section className="hobanwooShipSelectPanel">
        <div className="hobanwooShipSelectHeader">
          <div>
            <div className="hobanwooShipSelectEyebrow">STYLE SELECT</div>
            <h2>기체 선택</h2>
          </div>
          <button type="button" onClick={onClose} className="hobanwooShipSelectClose">
            닫기
          </button>
        </div>

        <p className="hobanwooShipSelectDescription">
          선택한 계열에 따라 플레이어 디자인과 1~5단계 탄 디자인이 바뀝니다.
        </p>

        <div className="hobanwooShipStyleGrid">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={[
                "hobanwooShipStyleCard",
                value === option.id ? "selected" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => onChange(option.id)}
            >
              <span className="hobanwooShipStyleIcon">{option.icon}</span>
              <span className="hobanwooShipStyleTitle">{option.title}</span>
              <span className="hobanwooShipStyleSubtitle">{option.subtitle}</span>
              <span className="hobanwooShipStyleLevel">LV 1 → LV 5</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
