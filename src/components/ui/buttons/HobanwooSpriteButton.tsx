import { CSSProperties, useState } from "react";
import "./hobanwooSpriteButton.css";

type ButtonState = "normal" | "hover" | "pressed" | "disabled" | "selected";

export type HobanwooButtonVariant =
  | "gameStart"
  | "redesignStoryMode"
  | "redesignScoreMode"
  | "redesignRanking"
  | "redesignSettings";

type HobanwooSpriteButtonProps = {
  variant: HobanwooButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
  size?: "start" | "main" | "sub";
};

type VariantMeta = {
  label: string;
  size: "start" | "main" | "sub";
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
    normal: "game_start_state_normal.png",
    hover: "game_start_state_hover.png",
    pressed: "game_start_state_pressed.png",
    disabled: "game_start_state_disabled.png",
    selected: "game_start_state_selected.png",
  },
  redesignStoryMode: {
    label: "스토리 모드",
    size: "main",
    normal: "redesign_story_mode_large.png",
  },
  redesignScoreMode: {
    label: "점수 모드",
    size: "main",
    normal: "redesign_challenge_mode_large.png",
  },
  redesignRanking: {
    label: "순위",
    size: "sub",
    normal: "redesign_rank_panel.png",
  },
  redesignSettings: {
    label: "설정",
    size: "sub",
    normal: "redesign_settings_panel.png",
  },
};

function getImageSrc(variant: HobanwooButtonVariant, state: ButtonState) {
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
    const nextParticles = Array.from({ length: 12 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 12 + Math.random() * 0.35;
      const dist = 42 + Math.random() * 48;

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
