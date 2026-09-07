# Chapter 2 Combat Feedback / Support / Bomb / Phase Skip Fix v18

- Removed the white ellipse flash drawn over the Chapter 2 boss body on every hit.
- Chapter 2 boss support mobs now use the exact Chapter 1 enemy-hit impact effect.
- Dead Chapter 2 boss support mobs are removed from the live enemy array immediately after the shared collision/death pass, so no inert corpse sprite remains.
- Chapter 2 normal-wave monsters now use `spawnChapter1EnemyHitEffectSystem()` and the Chapter 1 enemy-hit SFX instead of the simulator spark.
- Chapter 1 impact particles are updated/rendered during Chapter 2 wave and boss combat so the reused hit effect is visible exactly as intended.
- Chapter 2 normal-wave smart bomb now destroys a monster on the same frame the purification ring reaches it, matching Chapter 1 instead of applying multi-frame chip damage.
- Added the same outside-the-game `보스 페이즈 넘기기` button to Chapter 2 boss combat.
- The new Chapter 2 phase button has Chapter 1 semantics: phase 1 -> existing phase transition cinematic, phase 2 -> existing boss defeat/clear sequence. F6/test skip remains a current-pattern skip.
