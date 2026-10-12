V2.7 - V2.6 이후 메인 화면 이미지 경로 복구

원인:
V12 구조정리 뒤 public 자산이 common/chapter별 canonical 경로로 이동했는데,
V2.6 메인화면 파일이 구조정리 이전 URL을 다시 사용하여 배경/로고/메뉴 버튼이 404가 됐습니다.

수정:
- 메인 배경 day/evening/dawn -> /assets/common/backgrounds/
- night -> /assets/chapter3/story/backgrounds/campus_night.png
- 사이트 로고 -> /assets/common/ui/logos/site-logo.png
- 게임 로고 -> /assets/chapter1/story/ui/game_logo.png
- V11 메뉴 버튼 4종 -> /assets/common/ui/buttons/

V2.6이 적용된 상태에서 이 ZIP을 추가 적용하면 됩니다.
