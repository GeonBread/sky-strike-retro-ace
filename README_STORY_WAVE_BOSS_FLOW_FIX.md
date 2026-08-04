# Chapter 1 story combat flow fix

## Runtime flow

- Story `전투 개시` transition -> real project chapter-1 wave system
- Final real wave clear -> source story 100% purification-energy cinematic
- Story boss battle transition -> real project chapter-1 boss directly
- Source story's temporary canvas boss appearance/battle is not started in embedded mode
- Existing phase-2 dialogue and post-boss purification story remain connected

## Modified files

- `src/App.tsx`
- `src/game/engine.ts`
- `src/game/chapter1/chapter1WaveSystem.ts`
- `src/components/story/Chapter1StoryPlayer.tsx`
- `src/story/chapter1/chapter1StoryTypes.ts`
- `src/story/chapter1/chapter1StoryPart2Document.ts`
