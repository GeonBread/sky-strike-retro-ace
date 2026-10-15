CH1 WAVE EXACT MAP V4

This patch forces Chapter 1 wave rendering to use the exact user-supplied 228x2048 map image.

Key difference from previous patches:
- The map is stored under src/assets and imported by Vite.
- backgroundRenderer.ts draws that imported image directly.
- It no longer depends on any old public chapter1_wave_map*.png file.
- Old public map variants are deleted.
- Cloud assets and cloud/parallax speeds remain unchanged.

If the game still shows the old map after this patch, the running game is not using this Git working tree/build.
