# 호반우의 졸업 대작전 프로젝트 구조

기술 프로젝트명: `hobanwoo-graduation-operation`

## Public asset layout

- `public/assets/common/`: 공용 배경, UI, 플레이어, 공용 캐릭터
- `public/assets/audio/`: `common`, `chapter1`, `chapter2`, `chapter3` 오디오
- `public/assets/chapter1/`: Chapter 1 `story` / `combat`
- `public/assets/chapter2/`: Chapter 2 `story` / `combat`
- `public/assets/chapter3/`: Chapter 3 `story` / `combat`
- `src/embedded/chapter2Story.html`: Chapter 2 story runtime source (Vite `?url` asset)
- `src/embedded/chapter3Story.html`: Chapter 3 story runtime source (Vite `?url` asset)
- `src/embedded/chapter3Wave.html`: Chapter 3 wave runtime source (Vite `?url` asset)

기존 챕터별 중복 asset 폴더는 통합되며, 런타임 코드에서 참조되지 않는 이미지 파일은 정리됩니다.
