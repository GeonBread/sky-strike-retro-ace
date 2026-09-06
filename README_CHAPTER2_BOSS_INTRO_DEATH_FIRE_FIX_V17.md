# Chapter 2 Boss Intro / Death Retry / Player Fire Fix V17

Base: v16 applied project

## 1. Remove old purple boss-start card
- `public/chapter2_story/index.html`
- The old standalone `combat-transition` visual for `보스전 시작` is no longer rendered.
- The item remains only as the story-to-game integration gate, so TEST navigation and story resume behavior are preserved.
- Only the React full-screen `BOSS APPROACH` intro is visible.

## 2. Make BOSS APPROACH text crisp
- Removed blur filters from the intro copy animation.
- The main text no longer scales/skews while visible; motion remains on shutters, slashes, warning rings, and background.
- Reduced excessive glow around `BOSS APPROACH`.

## 3. Fix game freeze when the player fires
Root cause found in the imported v68 runtime:
- `publicHandlePlayerShot()` referenced `isPlayerAttackAllowed()` even though that function did not exist in the integrated runtime.
- The first player shot therefore entered that path and could throw a `ReferenceError`, stopping the game loop.

Fix:
- Added the missing `isPlayerAttackAllowed()` runtime function.
- Separated boss-body collision from v68 pattern-object collision.
- Boss-body hits now mirror Chapter 1 logic: canonical bullet center -> ellipse test -> normal bullet consume / beam cooldown -> direct `core.applyDamage(playerBullet.damage)`.
- v68 `handlePatternShot()` is now used only for destructible pattern objects.
- The original document-drone shield rule is retained.
- Space now calls `preventDefault()` while used as the game fire key.

Smoke test:
- One direct player bullet reduced boss HP from 2000 to 1993 with damage 7.
- 60 repeated direct shots reduced boss HP by exactly 60 without stopping the update loop.

## 4. Copy Chapter 1 full-death retry flow to Chapter 2
- Player death / HP handling still uses the common Chapter 1 game engine path.
- On final HP depletion, Chapter 2 now uses the same flow as Chapter 1:
  1. game reaches `GAMEOVER`
  2. full-screen black death fade for 1.35 s
  3. the same pause-style `다시 도전하시겠습니까?` dialog appears
  4. `예` restarts Chapter 2 boss from Phase 1
  5. `아니오` saves the boss checkpoint and returns to menu
- Added a one-shot `GAMEOVER` safety reporter in `GameCanvas` so the Chapter 2 retry callback is delivered even if a boss-specific update path misses the normal callback timing.

## Changed files
- `public/chapter2_story/index.html`
- `src/App.tsx`
- `src/components/story/Chapter2StoryExperience.tsx`
- `src/components/story/chapter2StoryExperience.css`
- `src/game/chapter2/chapter2BossOriginalRuntime.ts`
- `src/game/chapter2/chapter2BossSystem.ts`

## Validation
- TypeScript transpile parse: passed for all modified TS/TSX files.
- Targeted TypeScript compile for Chapter 2 boss runtime/system: passed.
- Chapter 2 story inline JavaScript syntax check: passed.
- Player-shot runtime smoke test: passed.
- Full Vite build was not run because the supplied lightweight project has an incomplete local `node_modules` (`vite` executable is absent).
