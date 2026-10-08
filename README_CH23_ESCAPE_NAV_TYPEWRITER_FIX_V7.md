# CH23 ESC / Navigation / Typewriter Fix V7

Base: CH123_RESUME_DIALOGUE_CREDITS_FIX_V6

## Chapter 3
- ESC now opens the Chapter 1-style story-exit confirmation from story, wave, and the boss-story section.
- The same Chapter 1 pause-dialog classes and layout are reused.
- Chapter 3 wave combat is paused while the exit dialog is open and resumes on Continue.
- Scene 43 KNU background transition is promoted to a browser-viewport fullscreen React overlay.
- The old full-screen Chapter 3 selector UI is replaced by Chapter 2-style navigation:
  - SKIP / F6
  - TEST 이동 / F7
  - story section buttons
  - numbered wave buttons
  - boss/final-purification section buttons
  - F8 moves to the next major section.

## Chapter 2 + 3 dialogue typing SFX
- Keeps the same per-character WebAudio typing sound architecture used by Chapter 1.
- Adds speaker-specific pitch profiles for Hobanwoo, Minjae, Soyeon, Junho, professor/student, student card, and boss voices.
- Student card uses the Chapter 1 core-style low sawtooth voice.
- Boss/Digrion uses the Chapter 1 Gatekeeper-style low voice.

## Validation
- `git diff --check` passed against the V6 baseline.
- Chapter 2 HTML inline JavaScript syntax checked with Node.
- All Chapter 3 HTML inline scripts syntax checked with Node.
- `Chapter3StoryExperience.tsx` transpile/syntax validation passed with TypeScript.
