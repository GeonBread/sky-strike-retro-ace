# CH1 Story Monster Illustration Swap V1

## 목적
챕터 1 스토리에서 사용되는 몬스터 일러스트 4종을 더 깔끔하고 투명 배경이 확실한 새 PNG로 교체합니다.

## 교체 대상
- `monster_03_notice_drone.png` ← 알림/공지 몬스터 (주황색 벨 로봇)
- `monster_04_student_terminal.png` ← 학번발급/학생증 단말 몬스터 (초록색 ID 로봇)
- `monster_05_login_watcher.png` ← 로그인 감시 몬스터 (보라색 자물쇠 로봇)
- `monster_10_room_distorter.png` ← 좌표 왜곡기/혼선 계열 몬스터 (파란색 방향키 로봇)

## 포함 경로
이 패치는 **현재 리팩터 구조**와 **이전 구조**를 둘 다 지원하도록 동일 파일을 두 경로에 모두 넣었습니다.

### 현재 리팩터 구조
- `public/assets/chapter1/story/characters/...`

### 이전 구조 호환용
- `public/assets/story/chapter1/characters/...`

## 적용 방법
프로젝트 루트에 이 ZIP을 풀고, 기존 파일을 덮어쓰면 됩니다.

## 비고
- 코드 수정은 없습니다. 기존 파일명을 유지한 **에셋 교체형 패치**입니다.
- 따라서 해당 파일명을 참조하는 기존 스토리 런타임/문서/씬 설정은 그대로 동작합니다.
