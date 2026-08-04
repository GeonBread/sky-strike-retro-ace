import { CHAPTER1_ENEMY_CATALOG, CHAPTER1_WAVE_CATALOG } from "../chapter1/chapter1WaveCatalog";

export const ENEMY_TYPES = CHAPTER1_ENEMY_CATALOG.map((enemy) => ({
  id: enemy.id,
  name: enemy.name,
  description: enemy.description,
  bullet: enemy.tags.join(" · "),
}));

export const WAVES_DATA = CHAPTER1_WAVE_CATALOG.map((wave) => ({
  id: wave.id,
  title: wave.title,
  desc: wave.description,
}));

export const MOTION_PROFILES = CHAPTER1_ENEMY_CATALOG.map((enemy) => ({
  id: enemy.id,
  name: `${enemy.name} 전용 이동·공격`,
  desc: enemy.description,
  targets: [enemy.id],
}));
