CH3_STORY_SFX_BGM_PATCH_003

누적 패치입니다. PATCH_001/002의 챕터 3 전투 효과음 수정사항을 모두 포함합니다.

추가 사항:
- 사용자 제공 KakaoTalk MP4의 오디오를 chapter3-final-space-bgm.mp3로 추출.
- 장면 20 '최종 공간' teleport-core 연출에서 포탈 이동 후 암전이 풀리고
  첨성대 코어·졸업 영역 배경이 처음 나타나는 10.2초 지점에 BGM 시작.
- AudioSystem을 통해 BGM 볼륨 설정을 그대로 따름.
- 최종 공간 음악은 반복 재생.
- 이후 chapter-ending에서 기존 final-ending-bgm.mp3가 시작되면 자연스럽게 교체됨.
- 챕터 3 선택 화면으로 복귀하거나 스토리가 끝나면 해당 BGM 정지.

포함된 기존 효과음:
- 플레이어 탄 발사: Chapter 1 sfx.shoot()
- 적 피격: sfx.enemyHit()
- 적 파괴: sfx.enemyExplode()
- 폭탄: sfx.bossExplode()
- 아이템 획득: sfx.powerup()
- 플레이어 피격/격추: sfx.hit()

적용:
프로젝트 루트에 ZIP 내부 구조 그대로 덮어쓰기.
