import type { Chapter1EnemyType } from "./chapter1WaveTypes";

export interface Chapter1EnemyCatalogEntry {
  id: Chapter1EnemyType;
  index: number;
  name: string;
  description: string;
  tags: readonly string[];
  hp: number;
  sprite: string;
  bulletSprite: string;
  displayWidth: number;
  displayHeight: number;
}

export const CHAPTER1_ENEMY_CATALOG: readonly Chapter1EnemyCatalogEntry[] = [
  {
    "id": "chapter1_attendance_drone",
    "index": 0,
    "name": "출석체크 드론",
    "description": "오염된 출석 확인 장치가 플레이어를 약하게 따라붙으며 출석 도장을 한 발씩 집요하게 발사합니다.",
    "tags": [
      "약한 추적 이동",
      "플레이어 조준 1발",
      "출석 도장탄"
    ],
    "hp": 15,
    "sprite": "/assets/chapter1/waves/enemies/monster_01_attendance.png",
    "bulletSprite": "/assets/chapter1/waves/bullets/bullet_01_attendance_stamp.png",
    "displayWidth": 87,
    "displayHeight": 102
  },
  {
    "id": "chapter1_absence_drone",
    "index": 1,
    "name": "결석확인 드론",
    "description": "화면 가장자리에서 정해진 방향으로 직진하며 2초마다 결석 도장탄 4발을 고정 부채꼴로 살포합니다.",
    "tags": [
      "직선 횡단",
      "2초 주기",
      "4발 고정 확산"
    ],
    "hp": 14,
    "sprite": "/assets/chapter1/waves/enemies/monster_02_absence.png",
    "bulletSprite": "/assets/chapter1/waves/bullets/bullet_02_absence_stamp.png",
    "displayWidth": 92,
    "displayHeight": 94
  },
  {
    "id": "chapter1_notice_drone",
    "index": 2,
    "name": "공지사항 드론",
    "description": "종 모양 공지탄을 아래로 떨어뜨립니다. 공지탄은 3초마다 크게 울리며 짧은 범위의 충격파를 만들고, 플레이어 탄으로 파괴할 수 있습니다.",
    "tags": [
      "파괴 가능 공지탄",
      "3초 울림",
      "근거리 충격파"
    ],
    "hp": 18,
    "sprite": "/assets/chapter1/waves/enemies/monster_03_notice.png",
    "bulletSprite": "/assets/chapter1/waves/bullets/bullet_03_bell.png",
    "displayWidth": 83,
    "displayHeight": 98
  },
  {
    "id": "chapter1_student_id_terminal",
    "index": 3,
    "name": "학번 발급 터미널",
    "description": "학번 발급 오류를 반복하며 천천히 이동하고 학생증 탄을 연속 세 장 발사합니다. 뒤쪽 탄일수록 플레이어의 이동을 더 앞질러 조준합니다.",
    "tags": [
      "느린 횡이동",
      "3연속 발급",
      "예측 조준"
    ],
    "hp": 22,
    "sprite": "/assets/chapter1/waves/enemies/monster_04_student_id_terminal.png",
    "bulletSprite": "/assets/chapter1/waves/bullets/bullet_04_student_id.png",
    "displayWidth": 97,
    "displayHeight": 92
  },
  {
    "id": "chapter1_login_guard",
    "index": 4,
    "name": "통합정보 로그인 감시자",
    "description": "비밀번호와 OTP를 요구하며 대형 잠금 카드로 로그인 장벽을 만든 뒤, 흔들리는 예고 동작 후 무겁게 낙하시킵니다.",
    "tags": [
      "대형 OTP 장벽",
      "낙하 예고",
      "고속 수직 낙하"
    ],
    "hp": 24,
    "sprite": "/assets/chapter1/waves/enemies/monster_05_login_guard.png",
    "bulletSprite": "/assets/chapter1/waves/bullets/bullet_05_password_lock.png",
    "displayWidth": 87,
    "displayHeight": 98
  },
  {
    "id": "chapter1_course_bug",
    "index": 5,
    "name": "수강편람 데이터 벌레",
    "description": "뒤엉킨 과목 데이터를 몸에 두른 채 뱀처럼 움직이고, 간격이 넓고 완만하게 흔들리는 CLTR 데이터 칩을 세 갈래로 뿌립니다.",
    "tags": [
      "사인파 이동",
      "3갈래 데이터 칩",
      "완만한 저주파 흔들림"
    ],
    "hp": 18,
    "sprite": "/assets/chapter1/waves/enemies/monster_06_course_bug.png",
    "bulletSprite": "/assets/chapter1/waves/bullets/bullet_06_cltr_chip.png",
    "displayWidth": 69,
    "displayHeight": 114
  },
  {
    "id": "chapter1_schedule_block",
    "index": 6,
    "name": "시간표 충돌 블록",
    "description": "서로 겹치지 않는 위치 두 곳을 선택해 2초 동안 중복 경고를 표시한 뒤, 대형 시간표 블록 두 개를 빠르게 내려찍습니다. 블록은 탄을 막지만 집중 공격하면 파괴됩니다.",
    "tags": [
      "2개씩 설치",
      "2초 경고",
      "중복 위치 방지"
    ],
    "hp": 28,
    "sprite": "/assets/chapter1/waves/enemies/monster_07_schedule_block.png",
    "bulletSprite": "/assets/chapter1/waves/bullets/bullet_07_schedule_conflict.png",
    "displayWidth": 166,
    "displayHeight": 164
  },
  {
    "id": "chapter1_seat_drone",
    "index": 7,
    "name": "잔여석 감지 드론",
    "description": "잔여석이 0이 되는 순간을 카운트다운한 뒤 좌석 잠금 디스크를 8방향으로만 단순하고 강하게 방출합니다.",
    "tags": [
      "4초 카운트다운",
      "8방향 방사",
      "단순 확산 패턴"
    ],
    "hp": 24,
    "sprite": "/assets/chapter1/waves/enemies/monster_08_seat_drone.png",
    "bulletSprite": "/assets/chapter1/waves/bullets/bullet_08_zero_seat.png",
    "displayWidth": 92,
    "displayHeight": 98
  },
  {
    "id": "chapter1_cart_box",
    "index": 8,
    "name": "장바구니 슬롯 박스",
    "description": "닫혀 있을 때 일정한 간격으로 플레이어 탄을 최대 8발까지 흡수합니다. 수집 시간이 끝나거나 슬롯이 가득 차면, 흡수한 개수와 정확히 같은 수의 수강신청 카트를 되쏩니다.",
    "tags": [
      "최대 8발 흡수",
      "0.38초 흡수 주기",
      "흡수량만큼 반사"
    ],
    "hp": 32,
    "sprite": "/assets/chapter1/waves/enemies/monster_09_cart_box.png",
    "bulletSprite": "/assets/chapter1/waves/bullets/bullet_09_course_cart.png",
    "displayWidth": 97,
    "displayHeight": 94
  },
  {
    "id": "chapter1_coordinate_warp",
    "index": 9,
    "name": "강의실 좌표 왜곡기",
    "description": "네 방향 화살표를 발사한 뒤 탄의 진행축을 90도로 꺾어 플레이어의 위치를 뒤틀어 추적합니다. 공격 직전 좌표망이 흔들립니다.",
    "tags": [
      "순간이동",
      "4방향 화살표",
      "90도 꺾임"
    ],
    "hp": 25,
    "sprite": "/assets/chapter1/waves/enemies/monster_10_coordinate_warp.png",
    "bulletSprite": "/assets/chapter1/waves/bullets/bullet_10_arrow.png",
    "displayWidth": 90,
    "displayHeight": 94
  }
] as const;

export interface Chapter1WaveCatalogEntry {
  id: number;
  title: string;
  description: string;
  tags: readonly string[];
  expectedDuration: number;
}

export const CHAPTER1_WAVE_CATALOG: readonly Chapter1WaveCatalogEntry[] = [
  {
    "id": 0,
    "title": "출석 압박 행렬",
    "description": "출석체크 드론 세 대가 좌·중·우에서 0.55초 간격으로 들어와 번갈아 조준탄을 발사합니다. 초반 이동과 조준탄 회피를 익히는 웨이브입니다.",
    "tags": [
      "출석체크 드론 ×3",
      "순차 진입",
      "교대 조준 사격"
    ],
    "expectedDuration": 12
  },
  {
    "id": 1,
    "title": "결석 교차 확인",
    "description": "결석확인 드론 두 대가 화면 양쪽에서 대각선으로 교차하며 4발 확산탄을 살포합니다. 중앙 안전 구간이 잠깐씩 이동합니다.",
    "tags": [
      "결석확인 드론 ×2",
      "대각선 교차",
      "4발 확산"
    ],
    "expectedDuration": 12
  },
  {
    "id": 2,
    "title": "공지사항 과부하",
    "description": "좌우 공지사항 드론이 종탄을 엇갈려 떨어뜨립니다. 종탄을 먼저 파괴할지, 3초 주기의 파동 사이를 피할지 선택해야 합니다.",
    "tags": [
      "공지사항 드론 ×2",
      "종탄 시차",
      "파괴 가능한 파동원"
    ],
    "expectedDuration": 16
  },
  {
    "id": 3,
    "title": "학번 발급 대기열",
    "description": "학번 발급 터미널 두 대가 느린 행렬을 만들고 학생증 탄을 연속 발사합니다. 잠시 뒤 출석체크 드론이 추가되어 위치 이동을 강요합니다.",
    "tags": [
      "학번 터미널 ×2",
      "출석 드론 지원",
      "예측 조준"
    ],
    "expectedDuration": 17
  },
  {
    "id": 4,
    "title": "OTP 로그인 차단선",
    "description": "통합정보 로그인 감시자가 화면 위를 크게 왕복하며 대형 잠금탄 장벽을 반복 낙하시킵니다. 낙하 예고를 보고 빈 공간을 찾아야 합니다.",
    "tags": [
      "로그인 감시자 ×1",
      "대형 잠금탄",
      "수직 공간 봉쇄"
    ],
    "expectedDuration": 15
  },
  {
    "id": 5,
    "title": "수강편람 데이터 행렬",
    "description": "수강편람 데이터 벌레 네 마리가 물결 대형으로 내려오며 흔들리는 데이터 칩을 순차적으로 뿌립니다.",
    "tags": [
      "데이터 벌레 ×4",
      "뱀형 행렬",
      "물결 탄막"
    ],
    "expectedDuration": 18
  },
  {
    "id": 6,
    "title": "시간표 중복 구역",
    "description": "시간표 충돌 블록 몬스터가 두 위치를 2초 동안 경고한 뒤 장애물로 봉쇄합니다. 설치 직후 출석체크 드론 두 대가 좁아진 통로를 압박합니다.",
    "tags": [
      "시간표 블록 ×1",
      "출석 드론 ×2",
      "장애물 통로전"
    ],
    "expectedDuration": 22
  },
  {
    "id": 7,
    "title": "잔여석 동시 마감",
    "description": "잔여석 감지 드론 두 대가 약 1초 간격으로 8방향 탄을 발사합니다. 두 번째 탄막의 각도가 달라 안전 공간이 이동합니다.",
    "tags": [
      "잔여석 드론 ×2",
      "8방향 시차",
      "회전 안전 구간"
    ],
    "expectedDuration": 16
  },
  {
    "id": 8,
    "title": "장바구니 채우기",
    "description": "장바구니 슬롯 박스가 중앙에서 플레이어 탄을 최대 8발까지 흡수합니다. 좌우 출석 드론을 상대하면서 박스의 반사탄 수를 관리해야 합니다.",
    "tags": [
      "슬롯 박스 ×1",
      "출석 드론 ×2",
      "흡수량 관리"
    ],
    "expectedDuration": 20
  },
  {
    "id": 9,
    "title": "강의실 좌표 혼선",
    "description": "강의실 좌표 왜곡기가 순간이동과 90도 꺾임 화살표를 사용합니다. 아래쪽 데이터 벌레 두 마리가 좌우 진동탄을 보탭니다.",
    "tags": [
      "좌표 왜곡기 ×1",
      "데이터 벌레 ×2",
      "꺾임+진동 탄막"
    ],
    "expectedDuration": 20
  },
  {
    "id": 10,
    "title": "공지와 시간표의 충돌",
    "description": "종탄이 먼저 전장에 남고, 이어서 시간표 블록 경고가 시작됩니다. 설치된 장애물 사이에서 움직이는 파동을 회피해야 합니다.",
    "tags": [
      "공지 드론 ×1",
      "시간표 블록 ×1",
      "시차형 공간 봉쇄"
    ],
    "expectedDuration": 23
  },
  {
    "id": 11,
    "title": "로그인 좌표 오류",
    "description": "통합정보 로그인 감시자의 수직 잠금탄과 좌표 왜곡기의 90도 꺾임 화살표가 약간의 시간차를 두고 교차합니다.",
    "tags": [
      "로그인 감시자 ×1",
      "좌표 왜곡기 ×1",
      "수직·수평 교차"
    ],
    "expectedDuration": 22
  },
  {
    "id": 12,
    "title": "수강신청 잔여석 전쟁",
    "description": "장바구니 슬롯 박스가 중앙에 자리 잡고, 잔여석 드론 두 대가 번갈아 8방향 탄막을 생성합니다. 흡수 반격과 방사탄 타이밍이 교차합니다.",
    "tags": [
      "슬롯 박스 ×1",
      "잔여석 드론 ×2",
      "반사·방사 혼합"
    ],
    "expectedDuration": 24
  },
  {
    "id": 13,
    "title": "중복 시간표 봉쇄",
    "description": "시간표 장애물이 먼저 전장을 둘로 나눈 뒤 결석확인 드론 두 대가 양쪽에서 교차 진입합니다. 좁은 통로에서 확산탄을 피해야 합니다.",
    "tags": [
      "시간표 블록 ×1",
      "결석 드론 ×2",
      "좁은 통로 교차"
    ],
    "expectedDuration": 24
  },
  {
    "id": 14,
    "title": "수강신청 오픈 최종 러시",
    "description": "출석, 결석, 공지, 시간표, 잔여석, 좌표 왜곡기가 약 35초 동안 연속 투입되는 챕터 1 일반 몹 종합 웨이브입니다.",
    "tags": [
      "6단계 연속 투입",
      "복합 압박",
      "최종 러시"
    ],
    "expectedDuration": 38
  },
  {
    "id": 15,
    "title": "출결 이중 압박",
    "description": "출석체크 드론의 조준탄이 이동을 유도하는 동안 결석확인 드론 두 대가 서로 다른 시간에 화면을 교차합니다. 조준 회피와 확산탄 통과를 동시에 판단해야 합니다.",
    "tags": [
      "출석 드론 ×2",
      "결석 드론 ×2",
      "유도 후 교차 봉쇄"
    ],
    "expectedDuration": 20
  },
  {
    "id": 16,
    "title": "공지사항 긴급 재난문자",
    "description": "서로 다른 시점에 울리는 종탄 두 개와 잔여석 8방향 탄막이 연속으로 겹칩니다. 종탄을 먼저 제거하면 파동 압박을 줄일 수 있습니다.",
    "tags": [
      "공지 드론 ×2",
      "잔여석 드론 ×1",
      "파동·방사 연계"
    ],
    "expectedDuration": 22
  },
  {
    "id": 17,
    "title": "로그인 세션 충돌",
    "description": "대형 잠금탄이 낙하 위치를 봉쇄하고 출석체크 드론 두 대가 플레이어 이동 지점을 조준합니다. 낙하 예고를 읽고 짧게 이동해야 합니다.",
    "tags": [
      "로그인 감시자 ×1",
      "출석 드론 ×2",
      "낙하·조준 압박"
    ],
    "expectedDuration": 22
  },
  {
    "id": 18,
    "title": "수강편람 검색 오류",
    "description": "다섯 마리 데이터 벌레가 직선 데이터 탄을 좌우 순서로 발사하고, 학번 발급 터미널이 예측형 학생증 탄으로 빈 공간을 흔듭니다.",
    "tags": [
      "데이터 벌레 ×5",
      "학번 터미널 ×1",
      "직선벽·예측탄"
    ],
    "expectedDuration": 25
  },
  {
    "id": 19,
    "title": "시간표 좌표 붕괴",
    "description": "시간표 블록 설치 경고가 진행되는 동안 좌표 왜곡기의 화살표가 90도로 꺾입니다. 블록 설치 후에는 좁아진 공간에서 다음 화살표를 피해야 합니다.",
    "tags": [
      "시간표 블록 ×1",
      "좌표 왜곡기 ×1",
      "경고 중 꺾임탄"
    ],
    "expectedDuration": 25
  },
  {
    "id": 20,
    "title": "잔여석 양방향 봉쇄",
    "description": "잔여석 감지 드론 세 대가 0.8초 간격과 서로 다른 각도로 8방향 탄을 방출합니다. 안전 구역이 왼쪽, 오른쪽, 중앙 순서로 이동합니다.",
    "tags": [
      "잔여석 드론 ×3",
      "0.8초 순차 발사",
      "회전 안전 구역"
    ],
    "expectedDuration": 24
  },
  {
    "id": 21,
    "title": "장바구니 과부하",
    "description": "장바구니가 플레이어 탄을 흡수하는 동안 출석 드론과 데이터 벌레가 공격합니다. 장바구니를 무작정 공격하면 반사탄 수가 늘어납니다.",
    "tags": [
      "슬롯 박스 ×1",
      "출석·데이터 지원",
      "공격량 선택"
    ],
    "expectedDuration": 27
  },
  {
    "id": 22,
    "title": "공지와 로그인 동시 오류",
    "description": "종탄의 파동 직후 대형 잠금탄이 떨어지고, 양쪽 데이터 벌레가 화면 끝 체류를 막습니다. 공격 우선순위와 낙하 위치를 함께 봐야 합니다.",
    "tags": [
      "공지 드론 ×1",
      "로그인 감시자 ×1",
      "데이터 벌레 ×2"
    ],
    "expectedDuration": 27
  },
  {
    "id": 23,
    "title": "중복 시간표 교차 통행",
    "description": "시간표 경고 중 결석 드론 두 대가 교차하고, 블록이 설치된 뒤 출석 드론이 좁은 통로를 추적합니다. 설치 전후 전투 성격이 바뀝니다.",
    "tags": [
      "시간표 블록 ×1",
      "결석 드론 ×2",
      "출석 드론 ×1"
    ],
    "expectedDuration": 28
  },
  {
    "id": 24,
    "title": "좌표 왜곡 추격전",
    "description": "좌표 왜곡기 두 대가 서로 다른 각도의 화살표를 시간차로 발사하고 반대편으로 순간이동합니다. 출석 드론이 근거리 조준 압박을 추가합니다.",
    "tags": [
      "좌표 왜곡기 ×2",
      "회전 화살표",
      "출석 추격"
    ],
    "expectedDuration": 28
  },
  {
    "id": 25,
    "title": "수강신청 서버 폭주",
    "description": "로그인 잠금 장벽, 잔여석 방사탄, 장바구니 반격이 순서대로 이어집니다. 세 공격의 시차를 읽지 못하면 다음 안전 구역이 사라집니다.",
    "tags": [
      "로그인 감시자 ×1",
      "잔여석 드론 ×2",
      "슬롯 박스 ×1"
    ],
    "expectedDuration": 30
  },
  {
    "id": 26,
    "title": "강의실 대이동",
    "description": "데이터 벌레 네 마리가 세로 레인을 만들고 좌표 화살표가 레인 사이에서 꺾입니다. 학번 터미널의 예측탄이 고정된 회피 경로를 흔듭니다.",
    "tags": [
      "데이터 벌레 ×4",
      "좌표 왜곡기 ×1",
      "학번 터미널 ×1"
    ],
    "expectedDuration": 30
  },
  {
    "id": 27,
    "title": "시간표 완전 봉쇄",
    "description": "시간표 충돌 블록 몬스터 두 대가 서로 다른 시점에 경고를 띄웁니다. 전장에는 최대 네 개의 블록만 유지되며, 파괴된 자리에만 새 블록이 설치됩니다.",
    "tags": [
      "시간표 블록 ×2",
      "최대 장애물 4개",
      "순차 설치"
    ],
    "expectedDuration": 31
  },
  {
    "id": 28,
    "title": "전체 공지 폭주",
    "description": "세 개의 종탄이 서로 다른 높이와 시점에서 울리고 결석 드론이 대각선으로 통과합니다. 종탄 제거 순서가 전장의 난도를 직접 결정합니다.",
    "tags": [
      "공지 드론 ×3",
      "결석 드론 ×1",
      "종탄 제거 우선순위"
    ],
    "expectedDuration": 30
  },
  {
    "id": 29,
    "title": "수강신청 최종 혼란",
    "description": "출결 압박, 공지와 데이터, 시간표와 잔여석, 장바구니·좌표·로그인 조합이 네 단계로 연속 투입되는 고난도 종합 웨이브입니다.",
    "tags": [
      "4단계 연속 전투",
      "전체 몬스터 조합",
      "고난도 최종전"
    ],
    "expectedDuration": 45
  }
] as const;

export const CHAPTER1_ENEMY_BY_ID = Object.fromEntries(CHAPTER1_ENEMY_CATALOG.map((entry) => [entry.id, entry])) as Record<Chapter1EnemyType, Chapter1EnemyCatalogEntry>;
