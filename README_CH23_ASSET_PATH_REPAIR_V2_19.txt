CH2 / CH3 ASSET PATH REPAIR V2.19

원인:
V12에서 실제 자산 파일은 public/assets/... 로 이동했지만, Chapter 2 / Chapter 3 story HTML의 동적 assetPath()는 여전히 assets/... 로 조합하고 있었습니다.
그래서 정적 경로 몇 개만 고친 V2.17로는 호반우 / 학생증 / 배경 등 런타임 동적 이미지가 계속 깨졌습니다.

수정:
- Chapter 2 동적 이미지 경로를 V12 구조로 canonicalize
- Chapter 3 동적 이미지 경로를 V12 구조로 canonicalize
- Chapter 2/3 배경 전환 함수도 같은 canonical resolver 사용
- 호반우 공용 포즈 -> /assets/common/characters/hobanwoo/
- Chapter 2 story 자산 -> /assets/chapter2/story/
- Chapter 3 story 자산 -> /assets/chapter3/story/
- Chapter 3에서 재사용하는 Chapter 2 배경 -> /assets/chapter2/story/backgrounds/
- frame / portrait_system 등 legacy -> 각 chapter story/legacy/
- 잘못 생긴 //assets/ 및 /chapter3_story//assets/ 경로 정리
