CH1 WAVE MAP FORCE V2

- Adds the user-supplied maps_joined_v2.png as a NEW runtime asset name:
  public/assets/chapter1/combat/backgrounds/chapter1_wave_map_v2.png
- Updates the Chapter 1 parallax catalog to load that new file.
- Deletes the old chapter1_wave_map.png so there is no stale/fallback asset left.
- Does NOT change the Chapter 1 scrolling/parallax renderer.
- Does NOT change cloud assets, cloud alpha, or cloud speeds.

After applying, restart the Vite dev server or do a hard reload once.
