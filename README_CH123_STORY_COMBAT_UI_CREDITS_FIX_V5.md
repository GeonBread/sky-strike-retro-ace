# CH1 / CH2 / CH3 Story · Combat · UI · Credits Fix V5

Baseline: CH2_CH3_FINAL_CREDITS_FIX_V4_2

## Chapter 3
- Scene 43 `졸업식이 끝난 뒤` background changed to the generic Kyungpook National University campus background (`chapter3/backgrounds/campus_day.png`).
- Chapter 3 monster-wave iframe now receives keyboard focus automatically on iframe load and again on the wave `ready` signal. WASD / arrow input no longer requires an initial mouse click.

## Chapter 2
- Chapter 2 boss BGM is now owned by the host story phase across `boss-intro`, `boss`, and `boss-blackout`, so normal story progression reliably starts `/audio/chapter2-boss-bgm.mp3` before and during the fight.

## Chapter 1
- Chapter 1 wave enemy death visuals were aligned with Chapter 3: 14/22 death particles, matching velocity damping, streak/diamond rendering, expanding death pulse, and short screen shake.
- The same Chapter 1 death effect is used for normal bullet kills, smart-bomb kills, and enemy-body collision kills.

## Chapter 1 / 2 / 3
- Added a dedicated student-card dialogue presentation using a warm yellow/gold frame, glow, marker, text treatment, and `STUDENT ID` label.
- The style is activated only when the speaker is `student_card`; boss dialogue styles remain separate.

## Ending credits
- Added a `RIGHTS & PERMISSIONS / 저작권 · 사용 허가` section.
- Credit text states that the Hobanwoo character and Kyungpook National University-related copyrighted works / marks are used with permission.

## Validation
- `git diff --check` passed against the V4.2 reconstructed baseline.
- Modified TypeScript/TSX files passed TypeScript `transpileModule` syntax diagnostics.
- JavaScript embedded in the modified Chapter 2 and Chapter 3 story HTML files passed `node --check`.
- Full project `tsc --noEmit` could not resolve external packages because the supplied source snapshot does not contain `node_modules` / installed React/Vite type dependencies.
