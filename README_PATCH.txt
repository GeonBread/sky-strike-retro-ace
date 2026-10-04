CH3_STORY_SFX_PATCH_001

[적용 내용]
- 챕터 3 일반 전투의 플레이어 발사음: 챕터 1 sfx.shoot() 재사용
- 적 피격음: 챕터 1 sfx.enemyHit() 재사용
- 적 파괴음: 챕터 1 sfx.enemyExplode() 재사용
- 스마트 폭탄 사용음: 챕터 1 sfx.bossExplode() 재사용

[동작 기준]
- 플레이어 탄환이 적에 맞을 때 피격음 재생
- 플레이어 탄환으로 적을 처치할 때 피격음 뒤 파괴음 재생
- 화면 밖 이탈 등 단순 정리에서는 파괴음 미재생
- 폭탄으로 적이 다수 제거되어도 각 적마다 파괴음을 중첩하지 않고, 챕터 1과 동일하게 폭탄 사용 순간의 효과음만 재생

[수정 파일]
- src/components/story/Chapter3StoryExperience.tsx
- public/chapter3_wave/index.html

[적용 방법]
이 ZIP의 내용을 프로젝트 루트에 그대로 덮어쓰면 됩니다.
