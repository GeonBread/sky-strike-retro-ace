HOBANWOO_CH1_MAP_DEAD_CLEANUP_V1

1) Replaces the Chapter 1 scrolling wave map with maps_joined_v2.png supplied by the user.
   Existing scrolling/parallax logic and cloud layers are unchanged.
2) Removes source files that are unreachable from src/main.tsx.
3) Removes notification UI assets used only by the deleted orphan component.
4) Removes unused direct npm dependencies and obsolete AI Studio metadata/HMR config.

Not removed: sandbox combat runtime / reward runtime that are still referenced by live engine source.
