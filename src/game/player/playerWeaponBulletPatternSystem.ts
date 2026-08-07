/**
 * 플레이어 무기 탄환 패턴 시스템
 *
 * 업로드된 `hobanu_bullet_design_demo_v26.html`의 탄 디자인/발사 패턴을 실제 게임에 맞게 이식한다.
 * 핵심 기준:
 * - 탄 외형은 `public/assets/bullets/player/*.png` 실제 이미지 파일을 사용한다.
 * - 이과/문과/예체능 계열별 발사 개수, 좌우 배치, 속도, 유도/빔 효과는 데모 v26의 spawnScience/spawnHumanities/spawnArts 흐름을 따른다.
 * - 기존 게임의 파워 레벨 1~5 구조는 그대로 유지한다.
 */

import { Bullet, type HobanuPlayerBulletKind, type PlayerWeaponStyle } from "../entities";
import { sfx } from "../AudioSystem";

const PLAYER_BULLET_SPEED_MULT = 1.16;
const DEMO_TO_GAME_SPEED = 60;

type PlayerWeaponRuntime = any;

type HobanuBulletMeta = {
  kind: HobanuPlayerBulletKind;
  sprite: string;
  label?: string;
  size: number;
  spin?: number;
  homing?: boolean;
  wave?: number;
  life?: number;
  beamBig?: boolean;
  beamPhase?: number;
  beamThickness?: number;
  beamCore?: number;
  beamAmp?: number;
  beamMaxTargets?: number;
};

const STYLE_COLOR: Record<PlayerWeaponStyle, string> = {
  science: "#38d9ff",
  humanities: "#ffd166",
  arts: "#ff5fd2",
};

const SPRITE_BY_KIND: Record<Exclude<HobanuPlayerBulletKind, "musicBeam">, string> = {
  gear: "science_gear.png",
  atom: "science_atom.png",
  formula: "science_formula_v_ir.png",
  book: "humanities_book.png",
  letter: "humanities_letter.png",
  speech: "humanities_speech.png",
  palette: "arts_palette.png",
  janggu: "arts_janggu.png",
  ball: "arts_ball.png",
  whistle: "arts_whistle.png",
};

function getPlayerWeaponStyle(engine: PlayerWeaponRuntime): PlayerWeaponStyle {
  return engine.player?.weaponStyle ?? "science";
}

function getBulletBox(kind: HobanuPlayerBulletKind, size: number): { w: number; h: number } {
  if (kind === "formula") return { w: size * 3.8, h: size * 1.85 };
  if (kind === "speech") return { w: size * 2.7, h: size * 1.8 };
  if (kind === "book") return { w: size * 1.65, h: size * 2.0 };
  if (kind === "janggu") return { w: size * 2.45, h: size * 1.7 };
  if (kind === "musicBeam") return { w: 28, h: 28 };
  return { w: size * 1.7, h: size * 1.7 };
}

function addStyledBullet(
  engine: PlayerWeaponRuntime,
  cx: number,
  cy: number,
  vx: number,
  vy: number,
  color: string,
  damage: number,
  meta: HobanuBulletMeta,
) {
  const box = getBulletBox(meta.kind, meta.size);
  engine.addPlayerBlt(
    cx - box.w / 2,
    cy - box.h / 2,
    box.w,
    box.h,
    vx * DEMO_TO_GAME_SPEED,
    vy * DEMO_TO_GAME_SPEED,
    color,
    damage,
    {
      playerWeaponStyle: getPlayerWeaponStyle(engine),
      playerWeaponLevel: Math.min(5, engine.player?.powerLevel ?? 1),
      playerBulletKind: meta.kind,
      playerBulletSprite: meta.sprite,
      playerBulletLabel: meta.label ?? "",
      playerBulletSize: meta.size,
      playerBulletSpin: meta.spin ?? 0,
      playerBulletRotation: 0,
      playerBulletTrail: [],
      playerBulletHoming: !!meta.homing,
      playerBulletWave: meta.wave ?? 0,
      playerBulletLife: meta.life,
      playerBulletMaxLife: meta.life,
      playerBeamBig: !!meta.beamBig,
      playerBeamPhase: meta.beamPhase ?? 0,
      playerBeamThickness: meta.beamThickness,
      playerBeamCore: meta.beamCore,
      playerBeamAmp: meta.beamAmp,
      playerBeamMaxTargets: meta.beamMaxTargets,
    },
  );
}

function addSpriteBullet(
  engine: PlayerWeaponRuntime,
  kind: Exclude<HobanuPlayerBulletKind, "musicBeam">,
  cx: number,
  cy: number,
  vx: number,
  vy: number,
  size: number,
  color: string,
  label = "",
  spin = 0,
  damage = 1,
  extra: Partial<HobanuBulletMeta> = {},
) {
  addStyledBullet(engine, cx, cy, vx, vy, color, damage, {
    kind,
    sprite: SPRITE_BY_KIND[kind],
    label,
    size,
    spin,
    ...extra,
  });
}

function addMusicBeam(engine: PlayerWeaponRuntime, cx: number, cy: number, big: boolean, phase: number) {
  addStyledBullet(engine, cx, cy - 220, 0, 0, STYLE_COLOR.arts, big ? 2.2 : 1.6, {
    kind: "musicBeam",
    sprite: "",
    label: big ? "♫" : "♪",
    size: big ? 42 : 34,
    spin: 0,
    life: big ? 0.30 : 0.25,
    beamBig: big,
    beamPhase: phase,
    beamThickness: big ? 16 : 11,
    beamCore: big ? 9 : 6,
    beamAmp: big ? 16 : 11,
    beamMaxTargets: 2,
  });
}

export function firePlayerWeaponBulletPatternSystem(engine: PlayerWeaponRuntime) {
  sfx.shoot();
  const bx = engine.player.x + engine.player.width / 2;
  const by = engine.player.y - 8;
  const level = Math.min(5, engine.player.powerLevel);

  if (engine.player.color === "vanguard") {
    if (level === 1) {
      engine.addPlayerBlt(bx - 6, by - 4, 12, 28, 0, -1200, "#c084fc", 3.0);
    } else if (level === 2) {
      engine.addPlayerBlt(bx - 12, by - 4, 10, 26, 0, -1250, "#d946ef", 2.5);
      engine.addPlayerBlt(bx + 2, by - 4, 10, 26, 0, -1250, "#d946ef", 2.5);
    } else if (level === 3) {
      engine.addPlayerBlt(bx - 10, by - 4, 8, 24, -30, -1200, "#a855f7", 2.2);
      engine.addPlayerBlt(bx - 5, by - 10, 10, 32, 0, -1350, "#ffffff", 3.5);
      engine.addPlayerBlt(bx + 2, by - 4, 8, 24, 30, -1200, "#a855f7", 2.2);
    } else if (level === 4) {
      engine.addPlayerBlt(bx - 13, by, 8, 22, -45, -1150, "#22d3ee", 2.5);
      engine.addPlayerBlt(bx - 8, by - 8, 10, 30, 0, -1350, "#e879f9", 3.2);
      engine.addPlayerBlt(bx - 2, by - 8, 10, 30, 0, -1350, "#ffffff", 3.2);
      engine.addPlayerBlt(bx + 5, by, 8, 22, 45, -1150, "#22d3ee", 2.5);
    } else if (level === 5) {
      engine.addPlayerBlt(bx - 12, by - 22, 24, 48, 0, -1550, "#ffffff", 6.0);
      engine.addPlayerBlt(bx - 18, by - 4, 12, 32, -60, -1350, "#a855f7", 3.3);
      engine.addPlayerBlt(bx + 6, by - 4, 12, 32, 60, -1350, "#a855f7", 3.3);
      engine.addPlayerBlt(bx - 24, by + 6, 8, 26, -100, -1250, "#06b6d4", 2.8);
      engine.addPlayerBlt(bx + 16, by + 6, 8, 26, 100, -1250, "#06b6d4", 2.8);
    }
    return;
  }

  const style = getPlayerWeaponStyle(engine);
  if (style === "science") spawnScience(engine, bx, by, level);
  else if (style === "humanities") spawnHumanities(engine, bx, by, level);
  else spawnArts(engine, bx, by, level);
}

function spawnScience(engine: PlayerWeaponRuntime, x: number, y: number, lv: number) {
  const vy = -18.4 - lv * 0.62;
  if (lv === 1) {
    addSpriteBullet(engine, "gear", x, y, 0, vy, 22, "#7ef8ff", "M", 0.16, 1.2);
  } else if (lv === 2) {
    addSpriteBullet(engine, "gear", x - 15, y, -0.06, vy, 21, "#7ef8ff", "M", 0.16, 1.0);
    addSpriteBullet(engine, "gear", x + 15, y, 0.06, vy, 21, "#7ef8ff", "M", 0.16, 1.0);
  } else if (lv === 3) {
    addSpriteBullet(engine, "gear", x, y, 0, -20.1, 23, "#7ef8ff", "M", 0.16, 1.25);
    addSpriteBullet(engine, "formula", x - 28, y + 10, 0, vy, 13, "#f4ffff", "V=IR", 0, 0.95);
    addSpriteBullet(engine, "formula", x + 28, y + 10, 0, vy, 13, "#f4ffff", "V=IR", 0, 0.95);
  } else if (lv === 4) {
    addSpriteBullet(engine, "gear", x - 15, y, -0.06, -20.9, 23, "#7ef8ff", "M", 0.16, 1.15);
    addSpriteBullet(engine, "gear", x + 15, y, 0.06, -20.9, 23, "#7ef8ff", "M", 0.16, 1.15);
    addSpriteBullet(engine, "atom", x - 42, y + 16, -0.18, -19.4, 18, "#ffff9b", "☢", 0.10, 1.0);
    addSpriteBullet(engine, "atom", x + 42, y + 16, 0.18, -19.4, 18, "#ffff9b", "☢", 0.10, 1.0);
  } else {
    addSpriteBullet(engine, "gear", x, y, 0, -21.8, 25, "#7ef8ff", "M", 0.16, 1.35);
    addSpriteBullet(engine, "formula", x - 28, y + 10, 0, -20.6, 13, "#f4ffff", "V=IR", 0, 1.0);
    addSpriteBullet(engine, "formula", x + 28, y + 10, 0, -20.6, 13, "#f4ffff", "V=IR", 0, 1.0);
    addSpriteBullet(engine, "atom", x - 56, y + 22, -0.24, -19.3, 18, "#ffff9b", "☢", 0.10, 1.05);
    addSpriteBullet(engine, "atom", x + 56, y + 22, 0.24, -19.3, 18, "#ffff9b", "☢", 0.10, 1.05);
  }
}

function spawnHumanities(engine: PlayerWeaponRuntime, x: number, y: number, lv: number) {
  const letters = ["ㄱ", "ㄴ", "ㅁ", "ㅅ", "ㅇ", "ㅎ"];
  const shot = engine.playerWeaponShotIndex ?? 0;
  engine.playerWeaponShotIndex = shot + 1;
  const vy = -14.4 - lv * 0.38;
  const baseLabel = letters[shot % letters.length];
  if (lv === 1) {
    addSpriteBullet(engine, "book", x, y, 0, vy, 19, "#ffd166", "", 0.075);
  } else if (lv === 2) {
    [[-20, -1.10, "book", "", 18], [20, 1.10, "letter", baseLabel, 18]].forEach(([dx, vx, kind, label, size]) => {
      addSpriteBullet(engine, kind as any, x + Number(dx), y, Number(vx), vy, Number(size), "#ffd166", String(label), 0.075);
    });
  } else if (lv === 3) {
    [[-72, -2.15, "letter", letters[(shot + 1) % letters.length], 17], [-24, -0.82, "book", "", 18], [24, 0.82, "speech", "!", 15], [72, 2.15, "letter", letters[(shot + 2) % letters.length], 17]].forEach(([dx, vx, kind, label, size]) => {
      addSpriteBullet(engine, kind as any, x + Number(dx), y + Math.abs(Number(dx)) * 0.05, Number(vx), vy, Number(size), "#ffd166", String(label), 0.075);
    });
  } else if (lv === 4) {
    [[-108, -2.80, "letter", letters[(shot + 1) % letters.length], 17], [-66, -1.85, "book", "", 17], [-24, -0.75, "speech", "?", 15], [24, 0.75, "speech", "!", 15], [66, 1.85, "book", "", 17], [108, 2.80, "letter", letters[(shot + 2) % letters.length], 17]].forEach(([dx, vx, kind, label, size]) => {
      addSpriteBullet(engine, kind as any, x + Number(dx), y + Math.abs(Number(dx)) * 0.045, Number(vx), vy, Number(size), "#ffd166", String(label), 0.075);
    });
  } else {
    [[-132, -3.35, "letter", "ㄱ", 16], [-96, -2.55, "book", "", 17], [-60, -1.65, "speech", "?", 14], [-22, -0.68, "book", "", 18], [22, 0.68, "speech", "!", 15], [60, 1.65, "book", "", 17], [96, 2.55, "letter", "ㅁ", 17], [132, 3.35, "speech", "!", 14]].forEach(([dx, vx, kind, label, size]) => {
      addSpriteBullet(engine, kind as any, x + Number(dx), y + Math.abs(Number(dx)) * 0.04, Number(vx), vy, Number(size), "#ffd166", String(label), 0.075);
    });
  }
}

function spawnArts(engine: PlayerWeaponRuntime, x: number, y: number, lv: number) {
  const shot = engine.playerWeaponShotIndex ?? 0;
  engine.playerWeaponShotIndex = shot + 1;
  const vy = -12.8 - lv * 0.30;
  if (lv === 1) {
    addSpriteBullet(engine, "palette", x, y, 0, vy, 20, "#ff5fd2", "", 0.1, 1, { homing: false, wave: 0 });
  } else if (lv === 2) {
    addSpriteBullet(engine, "palette", x - 14, y, -0.22, vy, 19, "#ff5fd2", "", 0.1, 1, { homing: false, wave: 0 });
    addSpriteBullet(engine, "ball", x + 14, y, 0.22, vy, 18, "#ffffff", "", 0.1, 1, { homing: false, wave: 0 });
  } else if (lv === 3) {
    addSpriteBullet(engine, "palette", x, y, 0, vy, 21, "#ff5fd2", "", 0.1, 1, { homing: false, wave: 0 });
    addSpriteBullet(engine, "janggu", x - 30, y + 10, -0.55, vy, 18, "#b76a3b", "", 0.1, 1, { homing: false, wave: 0 });
    addSpriteBullet(engine, "ball", x + 30, y + 10, 0.55, vy, 18, "#ffffff", "", 0.1, 1, { homing: false, wave: 0 });
  } else if (lv === 4) {
    addMusicBeam(engine, x, y, false, shot * 0.83);
    addSpriteBullet(engine, "palette", x - 26, y + 8, -0.42, vy, 19, "#ff5fd2", "", 0.1, 1, { homing: false, wave: 0 });
    addSpriteBullet(engine, "janggu", x + 26, y + 8, 0.42, vy, 18, "#b76a3b", "", 0.1, 1, { homing: false, wave: 0 });
  } else {
    addMusicBeam(engine, x, y, true, shot * 0.83);
    [[-44, -0.62, "palette", "#ff5fd2", 19, -0.70], [-18, -0.22, "janggu", "#b76a3b", 18, -0.35], [18, 0.22, "ball", "#ffffff", 18, 0.35], [44, 0.62, "whistle", "#ffffff", 18, 0.70]].forEach(([dx, vx, kind, color, size, wave]) => {
      addSpriteBullet(engine, kind as any, x + Number(dx), y + Math.abs(Number(dx)) * 0.07 + 10, Number(vx), vy, Number(size), String(color), "", 0.1, 1, { homing: false, wave: 0 });
    });
  }
}

export function addPlayerBulletEntitySystem(
  engine: PlayerWeaponRuntime,
  x: number,
  y: number,
  w: number,
  h: number,
  vx: number,
  vy: number,
  c: string,
  dmg: number = 1.0,
  meta: Partial<Bullet> = {},
) {
  const b = new Bullet();
  b.x = x;
  b.y = y;
  b.width = w;
  b.height = h;
  b.vx = vx * PLAYER_BULLET_SPEED_MULT;
  b.vy = vy * PLAYER_BULLET_SPEED_MULT;
  b.color = c;
  b.damage = dmg;
  b.playerWeaponStyle = getPlayerWeaponStyle(engine);
  b.playerWeaponLevel = Math.min(5, engine.player?.powerLevel ?? 1);
  Object.assign(b, meta);
  engine.bullets.push(b);
}
