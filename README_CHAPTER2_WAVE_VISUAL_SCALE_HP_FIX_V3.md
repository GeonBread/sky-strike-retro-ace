# Chapter 2 wave visual scale / HP fix v3

Apply this patch after `chapter2_wave_integration_patch_v2.zip`.

Changes:
- Preserve the source simulator's original 900x1200 -> 720x960 uniform visual scale.
- Use the wider 922x960 project field by widening X positions only; enemy/bullet/effect shapes are no longer horizontally stretched.
- Keep the original monster size (`MONSTER_SCALE = 1.28`) from the supplied wave simulator.
- Remove individual enemy HP bars completely.
- Reduce Chapter 2 wave enemy HP to 65% of the previously integrated values while preserving relative HP differences and hard-wave multipliers.
- Keep Chapter 1 player, weapon, HUD, HP, bombs, input, and base game UI unchanged.
