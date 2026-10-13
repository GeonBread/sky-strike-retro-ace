HOBANWOO VIEWPORT RATIO LOCK V1 - ROLLBACK

이 파일은 잘못 적용된 커밋 9255272를 되돌리기 위한 복구 스크립트입니다.
대상 브랜치: dev/chapter3-integration
복구 대상: 커밋 9255272 (viewport ratio patch)

중요:
- 이 스크립트는 git reset --hard를 사용하지 않습니다.
- git revert로 새 복구 커밋을 만들어 기존 Git 기록을 보존합니다.
- 실행 전 working tree가 clean인지 확인합니다.
- revert 후 npm run lint, npm run build를 통과한 경우에만 origin/dev/chapter3-integration 으로 push합니다.
- 패치 적용 직전 상태는 커밋 83fdc284f92166e9da7a8e4fd21cb87c10878946 입니다.
- 기존 자동 생성 백업 브랜치 backup/before-zip-patch-20261013-004332 도 그대로 남아 있습니다.

사용법:
1. 이 ZIP을 프로젝트 폴더에 풀 필요는 없습니다.
2. 프로젝트 폴더에서 터미널을 열거나, ROLLBACK_VIEWPORT_RATIO_LOCK_V1.cmd를 프로젝트 루트에 복사합니다.
3. cmd를 실행합니다.
4. 성공 시 9255272의 11개 파일 변경이 정확히 revert되어 패치 직전 상태로 돌아갑니다.

이 복구는 새 비율 수정이 아닙니다. 우선 잘못된 패치를 제거하여 기존 UI/버튼/챕터 상태를 되살리는 용도입니다.
