CH3_STORY_SFX_BGM_PATCH_004

누적 패치입니다. PATCH_001~003의 챕터 3 전투 효과음 및 장면 20 최종 공간 BGM 수정사항을 모두 포함합니다.

PATCH_004 추가 사항:
- 사용자 제공 '챕터 3 후반부.mp3'를 public/audio/chapter3-late-bgm.mp3로 추가.
- 장면 32의 digrion-body-break 전체 연출(17.5초)이 완전히 종료된 직후 새 후반 BGM 시작.
- 장면 20부터 재생되던 chapter3-final-space-bgm.mp3는 장면 32 본체 파괴 연출 종료 시 새 BGM으로 교체.
- 새 후반 BGM은 반복 재생하며 AudioSystem의 BGM 볼륨 설정을 그대로 사용.
- 이후 chapter-ending에서 final-ending-bgm.mp3가 시작되면 기존 방식대로 엔딩 BGM으로 교체.
- 챕터 3 선택 화면 복귀/스토리 종료 시 새 후반 BGM도 정지.

포함된 기존 챕터 3 효과음:
- 플레이어 탄 발사: Chapter 1 sfx.shoot()
- 적 피격: sfx.enemyHit()
- 적 파괴: sfx.enemyExplode()
- 폭탄: sfx.bossExplode()
- 아이템 획득: sfx.powerup()
- 플레이어 피격/격추: sfx.hit()

적용:
프로젝트 루트에 ZIP 내부 구조 그대로 덮어쓰기.
