CH1 WAVE USE THIS MAP V3

This patch does only one thing for Chapter 1 wave:
- forces the wave map layer to use the exact user-supplied vertical campus map image
- keeps cloud layers unchanged
- keeps parallax scroll behavior unchanged

Changed runtime reference:
- src/game/data/storyChapterBackgroundCatalog.ts
  from: /assets/chapter1/combat/backgrounds/chapter1_wave_map.png
  to:   /assets/chapter1/combat/backgrounds/chapter1_wave_map_v3.png

Added asset:
- public/assets/chapter1/combat/backgrounds/chapter1_wave_map_v3.png

Deletes stale assets if they exist:
- public/assets/chapter1/combat/backgrounds/chapter1_wave_map.png
- public/assets/chapter1/combat/backgrounds/chapter1_wave_map_v2.png

Important:
- If your working tree is dirty, commit or stash first.
- After applying, restart Vite dev server or hard reload once.
