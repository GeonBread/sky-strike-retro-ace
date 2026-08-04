# Chapter 1 Story Final Reintegration

This build uses `chapter1_story_최종본.zip` as the sole story source.

- No iframe
- No postMessage bridge
- Story markup/runtime embedded under `src/story/chapter1`
- React host under `src/components/story`
- Original final-story assets under `public/assets/story/chapter1`
- Existing Chapter 1 wave and boss runtimes preserved

After overwriting an older iframe integration, run:

`APPLY_CHAPTER1_STORY_FINAL.cmd`

This removes the obsolete `public/story` folder that ZIP overwrite cannot delete.
