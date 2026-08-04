# Story mode start routing fix

## Fixed behavior

- Story mode uses the dedicated top-level `STORY` application state.
- Challenge/arcade mode continues to use `PLAYING`.
- Mode and application state are updated atomically through `useAppStore.setState`.
- The `PLAYING` branch renders only the arcade `GameCanvas`.
- The `STORY` branch renders only `Chapter1StoryExperience`.

This prevents a story-mode click from rendering the arcade game while `gameMode` is changing.
