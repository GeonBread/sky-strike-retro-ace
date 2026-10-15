CH1 WAVE NO EARLY SEAM V6

Fixes the false/early repeat seam in the Chapter 1 long map.

Cause in V5:
- V5 placed a previous full-map copy above the current one from t=0.
- Because the bitmap moves downward, the top/bottom join entered the viewport immediately.
- The screenshot seam near the top was that join, not the real end of the 2048px map.

Fix:
- Keep the map moving downward exactly as before.
- Start with the BOTTOM of the full scaled map aligned to the bottom of the viewport.
- Traverse the entire full-height source before the top/bottom loop join can enter the viewport.
- Do not change clouds, cloud speed, map speed, or the supplied map asset.
