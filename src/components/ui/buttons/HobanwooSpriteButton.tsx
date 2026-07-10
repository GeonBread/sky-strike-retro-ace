import { type CSSProperties, useState } from "react";
import "./hobanwooSpriteButton.css";

type ButtonState = "normal" | "hover" | "pressed" | "disabled" | "selected";

export type HobanwooButtonVariant =
  | "gameStart"
  | "redesignStoryMode"
  | "redesignScoreMode"
  | "redesignRanking"
  | "redesignSettings"
  | "pauseContinue"
  | "mainMenu"
  | "leaderboardLocal"
  | "leaderboardOnline"
  | "refresh"
  | "back"
  | "confirm"
  | "cancel";

type HobanwooButtonSize = "start" | "main" | "sub" | "wide" | "pause" | "dialog";

type HobanwooSpriteButtonProps = {
  variant: HobanwooButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
  size?: HobanwooButtonSize;
};

type VariantMeta = {
  label: string;
  size: HobanwooButtonSize;
  normal: string;
  hover?: string;
  pressed?: string;
  disabled?: string;
  selected?: string;
};

type Particle = {
  id: number;
  dx: number;
  dy: number;
};

const BASE_PATH = "/assets/ui/buttons/";

const variantMap: Record<HobanwooButtonVariant, VariantMeta> = {
  gameStart: {
    label: "게임 시작",
    size: "start",
    normal: "game-start.png",
  },
  redesignStoryMode: {
    label: "스토리 모드",
    size: "main",
    normal: "story-mode.png",
  },
  redesignScoreMode: {
    label: "도전 모드",
    size: "main",
    normal: "challenge-mode.png",
  },
  redesignRanking: {
    label: "순위",
    size: "sub",
    normal: "ranking.png",
  },
  redesignSettings: {
    label: "설정",
    size: "sub",
    normal: "settings.png",
  },
  pauseContinue: {
    label: "계속하기",
    size: "pause",
    normal: "continue.png",
  },
  mainMenu: {
    label: "메인 화면",
    size: "pause",
    normal: "main-menu.png",
  },
  leaderboardLocal: {
    label: "로컬 랭킹",
    size: "wide",
    normal: "local.png",
  },
  leaderboardOnline: {
    label: "온라인 랭킹",
    size: "wide",
    normal: "online.png",
  },
  refresh: {
    label: "새로고침",
    size: "wide",
    normal: "refresh.png",
  },
  back: {
    label: "돌아가기",
    size: "wide",
    normal: "back.png",
  },
  confirm: {
    label: "확인",
    size: "dialog",
    normal: "confirm.png",
  },
  cancel: {
    label: "취소",
    size: "dialog",
    normal: "cancel.png",
  },
};

function getImageSrc(variant: HobanwooButtonVariant, state: ButtonState): string {
  const item = variantMap[variant];
  return BASE_PATH + (item[state] ?? item.normal);
}

export function HobanwooSpriteButton({
  variant,
  onClick,
  disabled = false,
  selected = false,
  className = "",
  size,
}: HobanwooSpriteButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const state: ButtonState = disabled
    ? "disabled"
    : pressed
      ? "pressed"
      : hovered
        ? "hover"
        : selected
          ? "selected"
          : "normal";

  const item = variantMap[variant];
  const resolvedSize = size ?? item.size;
  const src = getImageSrc(variant, state);

  const createParticles = () => {
    const nextParticles = Array.from({ length: 10 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 10 + Math.random() * 0.28;
      const dist = 34 + Math.random() * 42;

      return {
        id: Date.now() + index,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
      };
    });

    setParticles(nextParticles);
    window.setTimeout(() => setParticles([]), 520);
  };

  const handleClick = () => {
    if (disabled) return;

    setClicked(false);
    requestAnimationFrame(() => setClicked(true));
    createParticles();
    onClick?.();
  };

  return (
    <span className="hobanwooButtonWrap">
      <button
        type="button"
        className={[
          "hobanwooSpriteButton",
          `size-${resolvedSize}`,
          clicked ? "clicked" : "",
          selected ? "selected" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleClick}
        onAnimationEnd={() => setClicked(false)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => {
          setHovered(false);
          setPressed(false);
        }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        disabled={disabled}
        aria-label={item.label}
      >
        <img src={src} alt="" draggable={false} />
      </button>

      {particles.map((particle) => (
        <span
          key={particle.id}
          className="hobanwooButtonParticle"
          style={
            {
              "--dx": `${particle.dx.toFixed(1)}px`,
              "--dy": `${particle.dy.toFixed(1)}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
