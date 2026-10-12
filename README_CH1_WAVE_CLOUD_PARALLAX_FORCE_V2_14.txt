CH1 cloud parallax visibility fix V2.14

- Cloud images are loaded directly by backgroundRenderer.ts instead of relying on the generic Chapter 1 background-layer ready state.
- Far/small clouds: 5 px/s, alpha 0.32 total, slowest.
- Campus map: existing 14 px/s downward infinite loop.
- Near/large clouds: 34 px/s, alpha 0.38, fastest.
- Far clouds are rendered at two half-cycle offsets because the supplied far-cloud sheet is intentionally sparse.
- Includes both V12 refactor asset paths and legacy background compatibility copies.
