CH1 WAVE FULL LENGTH LOOP V5

Fixes Chapter 1 campus-map scrolling for the supplied 228x2048 vertical map.

Root cause fixed:
- Old renderer used performance.now(), so time spent in menus/story before combat
  already advanced the map. The wave could therefore begin mid-map and wrap early.

New behavior:
- Exact supplied map remains the Chapter 1 wave map.
- Map is scaled to canvas width while preserving the complete vertical aspect ratio.
- Repeat spacing is the FULL scaled map height, never the viewport/old-map height.
- Map scroll phase uses chapter1Wave.clock, which starts with Chapter 1 combat.
- Existing cloud layers, cloud speeds and cloud alpha are unchanged.
