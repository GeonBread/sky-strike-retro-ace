import type { ShipStyle } from "../../../types";
import { sfx } from "../../../game/AudioSystem";
import "./hobanwooShipSelectPanel.css";

type HobanwooShipSelectPanelProps = {
  value: ShipStyle;
  onChange: (style: ShipStyle) => void;
  onClose: () => void;
};

type StyleOption = {
  id: ShipStyle;
  title: string;
  english: string;
  subtitle: string;
  detail: string;
  icon: string;
};

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: "science",
    title: "이과",
    english: "SCIENCE",
    subtitle: "정밀 · 분석형",
    detail: "원자 · 공식 · 기어 계열 탄막",
    icon: "⚛",
  },
  {
    id: "humanities",
    title: "문과",
    english: "HUMANITIES",
    subtitle: "서사 · 기록형",
    detail: "책 · 편지 · 말풍선 계열 탄막",
    icon: "文",
  },
  {
    id: "arts",
    title: "예체능",
    english: "ARTS",
    subtitle: "리듬 · 표현형",
    detail: "팔레트 · 장구 · 볼 계열 탄막",
    icon: "★",
  },
];

export function HobanwooShipSelectPanel({ value, onChange, onClose }: HobanwooShipSelectPanelProps) {
  const close = () => {
    sfx.uiClick();
    onClose();
  };

  return (
    <div className="hobanwooShipSelectDim" role="presentation" onMouseDown={onClose}>
      <section
        className="hobanwooShipSelectPanel"
        role="dialog"
        aria-modal="true"
        aria-label="기체 선택"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="hobanwooShipSelectHeader">
          <div>
            <div className="hobanwooShipSelectEyebrow">SHIP SELECT</div>
            <h2>기체 선택 <span>(Ship Select)</span></h2>
          </div>
          <button type="button" onClick={close} className="hobanwooShipSelectClose">
            닫기 <span>(Close)</span>
          </button>
        </div>

        <p className="hobanwooShipSelectDescription">
          전공 계열에 따라 기체의 분위기와 1~5단계 탄 디자인이 달라집니다.
        </p>

        <div className="hobanwooShipStyleGrid">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={[
                "hobanwooShipStyleCard",
                `style-${option.id}`,
                value === option.id ? "selected" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => {
                sfx.uiClick();
                onChange(option.id);
              }}
              aria-pressed={value === option.id}
            >
              <span className="hobanwooShipStyleTopline">{option.english}</span>
              <span className="hobanwooShipStyleIcon">{option.icon}</span>
              <span className="hobanwooShipStyleTitle">{option.title}</span>
              <span className="hobanwooShipStyleSubtitle">{option.subtitle}</span>
              <span className="hobanwooShipStyleDetail">{option.detail}</span>
              <span className="hobanwooShipStyleLevel">LV 1 → LV 5</span>
              <span className="hobanwooShipStyleSelectedMark" aria-hidden="true">✓ 선택됨</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
