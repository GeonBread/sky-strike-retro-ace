CH23 FIXED RATIO STORY/CINEMATIC V2.21

V2.20 correction.

Problem:
- V2.20 used transform:scale() directly on the Chapter 2/3 iframe.
- The iframe contains fixed/viewport-based story and cinematic layers, creating a second coordinate system.
- Chapter 3 could be pushed/cropped to one side even at browser zoom 100%.

Fix:
- Normal story browsing context remains exactly 922x960.
- Full-screen cinematic browsing context remains exactly 1920x1080.
- Physical resizing uses CSS zoom rather than iframe transform, so internal CSS/media queries keep the logical resolution.
- Normal story uses contain scaling.
- 16:9 full-screen cinematics use cover scaling: no stretching, browser viewport is filled, overflow is cropped.
- Chapter 2/3 test navigation is pinned to the physical viewport and remains scrollable.

Apply this after V2.20.
