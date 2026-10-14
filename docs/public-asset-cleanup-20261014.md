# Public asset cleanup — 2026-10-14

Baseline: `7a54c7d8a927c7ab6a144ebbf2a84d90594386a4` (`dev/chapter3-integration`)

## Runtime HTML moved out of `public`

The embedded Chapter 2/3 HTML runtimes are source files now and are emitted by Vite via `?url` imports.

- `public/chapter2_story/index.html` -> `src/embedded/chapter2Story.html`
- `public/chapter3_story/index.html` -> `src/embedded/chapter3Story.html`
- `public/chapter3_wave/index.html` -> `src/embedded/chapter3Wave.html`

`Chapter2StoryExperience.tsx` and `Chapter3StoryExperience.tsx` now load those Vite-emitted URLs instead of hard-coded `/chapter*_story/index.html` paths.

## Shared Hobanwoo assets

Chapter 1 now reuses the existing canonical files under:

`public/assets/common/characters/hobanwoo/`

Fourteen duplicated Chapter 1 pose files were removed after their catalog entries were redirected to the common copies:

- angry
- battle_ready
- crying
- explaining
- neutral
- sad
- shocked
- shy
- sleepy
- surprised
- thinking
- wary
- wave
- worried

Chapter-1-only poses such as `cautious_resolve`, `fierce_battle`, `sparkle`, and `troubled_crossed` remain chapter-local because no canonical common copy exists.

The game logo also uses the existing common path `public/assets/common/story/ui/game_logo.png` everywhere.

## Chapter 2 sunset background cleanup

The Chapter 2 wave runtime now uses:

`public/assets/chapter2/story/backgrounds/bg_ch2_library_exterior_sunset.png`

Both obsolete `bg_ch2_library_exterior_after_3am.png` copies are removed, including the accidental top-level `public/chapter2/backgrounds/` copy.

## Deleted unused / duplicate images

The cleanup removes only image paths that have no remaining runtime reference after the refactor. This includes:

- legacy duplicate Chapter 1 wave background copies under `public/assets/backgrounds/`
- obsolete duplicate Chapter 1 story-monster copies under `public/assets/story/chapter1/characters/`
- unused `public/assets/chapter3/story/characters/digrion.svg`
- unused legacy UI button sprites (`continue.png`, `main-menu.png`, `ranking.png`, `settings.png`, `story-mode.png`)
- duplicated Chapter 1 Hobanwoo poses and Chapter 1-local game logo described above

No audio files are deleted by this cleanup.
