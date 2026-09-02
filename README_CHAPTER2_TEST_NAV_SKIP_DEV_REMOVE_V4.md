# Chapter 2 test navigation / instant skip / DEV removal v4

Base: apply after `chapter2_wave_visual_scale_hp_fix_v3.zip`.

## Changes

- Replaced the Chapter 2 story-only skip buttons with a persistent `TEST 이동` panel.
- The panel remains available during Chapter 2 story and Chapter 2 wave combat.
- Story destinations are read from the Chapter 2 story runtime's section markers instead of being hard-coded in React.
- Any Chapter 2 wave 1-20 can be selected directly.
- `SKIP / F6` skips the current story item/effect, or skips the current Chapter 2 wave.
- Chapter 2 wave test skip now bypasses the normal 1.45 s inter-wave gap and clears remaining wave bullets/effects before starting the next wave immediately.
- `F7` toggles the destination panel. The embedded story iframe forwards F6/F7/F8 to the React host, so the shortcuts work while the story iframe has focus.
- `F8` moves to the next combat gate; during the wave phase it jumps to the boss gate.
- The boss gate is selectable from the same panel. The actual Chapter 2 boss runtime has not been integrated yet; when it is connected, this same navigation layer is the intended control surface for boss-phase skip/jump.
- Removed the main-menu DEV button, DEV route, and `DEV_MODE` game state. The old sandbox component is no longer reachable or bundled from App.

## Files changed

- `src/App.tsx`
- `src/types.ts`
- `src/components/story/Chapter2StoryExperience.tsx`
- `src/components/story/chapter2StoryExperience.css`
- `src/components/ui/buttons/HobanwooMainMenu.tsx`
- `src/components/ui/buttons/hobanwooMainMenu.css`
- `src/game/chapter2/chapter2WaveSystem.ts`
- `public/chapter2_story/index.html`
