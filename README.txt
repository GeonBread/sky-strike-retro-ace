CH2 Sunset Exterior Path Fix V3

Changes only:
- Keeps the CH2 sunset-time story edits from V1/V2.
- Adds the user-provided sunset image at the actual asset path used by chapter2_story.
- Uses a new asset name bg_ch2_library_exterior_sunset.png to avoid stale-cache reuse of the old night image.
- library_exterior_night and combat_zone now reference the sunset asset.
- Hides the legacy resource-error banner in the integrated HTTP/Vite game; it is shown only when opening the HTML directly with file://.
