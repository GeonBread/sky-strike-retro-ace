export const ENEMY_TYPES = [
  { id: 'stationary', name: '기본 정지형 (Stationary)', description: '화면 상단에 정착하여 하단으로 일정 기간 탄환 조준 사격', bullet: '단발 조준탄 (Pink)' },
  { id: 'aimed', name: '조준 격발형 (Aimed)', description: '플레이어의 실시간 기체 좌표를 정확히 예측 조준사격', bullet: '조준 핑크탄' },
  { id: 'circle_shooter', name: '회전 중심 방사형 (Circle)', description: '제자리 회전하며 3갈래 나선형 탄각 방출', bullet: '원형 패턴 탄막' },
  { id: 'v_360_shooter', name: '360도 전방위 방사 (V360)', description: '사방 12개 방향으로 360도 전방위 탄막 난사', bullet: '360도 탄막' },
  { id: 'burst_shooter', name: '5연속 점사 조준형 (Burst)', description: '플레이어 방향으로 5연발 고속 점사 사격 주행', bullet: '5연사 고속 Aimed탄' },
  { id: 'satellite_shield', name: '회전 위성 실드형 (Satellite)', description: '주변에 파괴 가능한 4개 소형 보호위성 구체를 공전 가동', bullet: '위성 공전 궤도탄' },
  { id: 'boomerang_orbit', name: '부메랑 귀환형 (Boomerang)', description: '하강 돌진 후 포물선 궤적으로 다시 역귀환 복사 사격', bullet: '녹색 부메랑 복사탄' },
  { id: 'homing_shooter', name: '느린 유도탄 사격 (Homing)', description: '플레이어 기체 위치 추적하는 느림직한 추적탄 유도', bullet: '자색 유도탄' },
  { id: 'shotgun_shooter', name: '산탄 확산 분사 (Shotgun)', description: '다발 확산각으로 순간적인 벙커 탄각 샷건 방출', bullet: '황색 산탄 무더기' },
  { id: 'mine_layer', name: '기뢰 부설 매설 (Mine Layer)', description: '정지 기뢰를 허공에 투하, 4초 후 크로스 십자 방향으로 2격 분열', bullet: '십자분열 성간 기뢰' },
  { id: 'dash_paint', name: '돌진 유성 잔상 (Dash Paint)', description: '플레이어로 향해 고속 돌진하며 경로 상에 위험한 탄막 실크 잔상 고정', bullet: '가속 유성 주황탄' },
  { id: 'tank', name: '헤비급 장갑 돌격 (Tank)', description: '튼튼한 중장갑 물리 내구도 및 아랫방향 안정적 고속 지속 발사', bullet: '오버사이즈 적색탄' },
  { id: 'ricochet_shooter', name: '포트 벽면 도탄 (Ricochet)', description: '화면 양쪽 가로벽에 부딪히면 탄성을 갖고 튕기는 바운스 속 탄 사격', bullet: '벽면 도탄 바운서' },
  { id: 'counter_on_death', name: '유언 폭사 반격 (Counter)', description: '파괴 및 죽는 궤적 순간 플레이어 좌표로 강력한 반격 5각성 탄 방출', bullet: '의문의 유언탄' },
  { id: 'ink_shooter', name: '먹구름 분무 연무 (Ink Cloud)', description: '화면에 서서히 퍼지는 먹구름을 분무해 플레이어 서라운드 시야 방해', bullet: '시야 차단 먹먹구름' },
  { id: 'gravity_vortex_mob', name: '중력 고밀 중력 vortex', description: '플레이어를 중력 특이점으로 끌어들이는 위험 천만한 소용돌이 소환', bullet: '퍼플 블랙홀 미니 구체' },
  { id: 'boss', name: '기함 보스 메인 코어 (Boss)', description: '체력 3000 격파 시 14~16페이즈 오버드라이브 과충전 각성 패턴 시연', bullet: '싱귤래리티 레이저 그리드 및 카오스 교차' }
];

export const WAVES_DATA = [
  { id: 0, title: "적 강습 수평 함대", desc: "수평 배치 열로 5개 column_shooter 기체가 일제 강하합니다." },
  { id: 1, title: "센터 원형 방사 나선", desc: "중앙 상단지점에서 여러 circle_shooter가 원을 그리며 하강 확장합니다." },
  { id: 2, title: "대칭형 V자 360 대열", desc: "좌우 완벽 대칭 V라인으로 360형 기체들이 대열을 갖추어 내려옵니다." },
  { id: 3, title: "기어 톱니 쌍방 공전 회전", desc: "4기의 회전 중심 기체들이 공중 기동을 하며 호위 탄각을 전개합니다." },
  { id: 4, title: "배틀 크로스-X 결합", desc: "X자 가교 배열로 강하하며 플레이어의 이동 축을 잠금합니다." },
  { id: 5, title: "갈지자 지그재그 편대", desc: "지그재그 궤적으로 움직이며 좌우로 수평 교차 사격을 전개합니다." },
  { id: 6, title: "서라운드 360 포위망", desc: "중앙 중심점에서 위상 각도를 쪼개 사방 6기를 포위 돌파 형식으로 낙하합니다." },
  { id: 7, title: "중장갑 열차 선도 편대", desc: "중형 선도 리더 기체를 필두로 단열 추종 포진들이 줄줄이 뒤따릅니다." },
  { id: 8, title: "쌍방 스플릿 성간 클러스터", desc: "3기가 정착한 후 좌우로 바삐 회항하며 확산 점사탄을 방출합니다." },
  { id: 9, title: "십자 탄막 기뢰 지대", desc: "안정적인 기뢰선 3기가 화면 전역에 공전 기뢰망 진단을 구축합니다." },
  { id: 10, title: "바리케이드 광선 교차 트랩", desc: "좌우 양끝에 중형 방호 바리케이드 2기가 광선 가교 컬리전을 발동하며 내려옵니다." },
  { id: 11, title: "위성 실드 & 에덴 포크", desc: "공전 위성을 대동한 궤도함과 위성 실드 기체들이 전열을 차단합니다." },
  { id: 12, title: "스위프 디셀 버스트 융단", desc: "가속 돌진 후 도료 페인트를 잔뜩 흩뿌리는 가속 스플레시 돌격대입니다." },
  { id: 13, title: "정상 결전 아포칼립스 콤보", desc: "부메랑 함선, 오비탈 실드, 디셀러 가속도가 합쳐진 올스타 엘리트 대열입니다." },
  { id: 14, title: "고탄성 벽면 튕김 도탄포", desc: "양 외벽에 닿으면 각도가 튕겨 유도되는 바운스 탄막 소대를 구축합니다." },
  { id: 15, title: "공동 폭사 반격 수호장", desc: "격파 및 가해 시 플레이어 방향으로 5가닥 복수 반격탄을 뿜는 부대입니다." },
  { id: 16, title: "시야 차단 먹먹 잉크 분무", desc: "두 기의 은폐성 잉크 분산기에서 먹구름 시야 디버프를 전후방 투하합니다." },
  { id: 17, title: "중력 블랙홀 특이점 구용돌이", desc: "좌우에서 플레이어 기체를 인력장으로 강제 흡정 인동하는 싱귤래리티 보병망입니다." }
];

export const MOTION_PROFILES = [
  { id: 'stationary', name: '정지 정착형 기동 (Stationary Anchor)', desc: '화면 상단으로 급강하한 뒤, 완벽 제동하여 일정 Y좌표에 고정 정박 수성 사격', targets: ['stationary', 'column_shooter', 'v_360_shooter', 'barricade_wall'] },
  { id: 'linear_sweep', name: '선형 스위프 사선 주행 (Linear & Slide Grid)', desc: '일정 속도 축을 가지고 부드럽게 사선으로 흐르거나 양 벽을 가로지르는 주행 패턴', targets: ['circle_shooter', 'split_cluster', 'mine_layer', 'ink_shooter'] },
  { id: 'swoop_boomerang', name: '부메랑 왕복 돌진 (Swoop Boomerang Curves)', desc: '플레이어를 위협하기 위해 곡선으로 급속 낙하 기습 후, 다시 원호를 그리며 귀항 기전', targets: ['boomerang_orbit'] },
  { id: 'satellite_bodyguard', name: '위성 대물 보호기동 (Orbital Bodyguards)', desc: '자심을 공전하는 다수의 외곽 보호 위성들을 회전 제어하며 기체를 호위 주행', targets: ['satellite_shield'] },
  { id: 'dash_fast', name: '초고속 유성 돌격 (Meteor Dashing Rush)', desc: '플레이어의 좌표를 한 차례 노려 고밀 잔상 선을 긴급 고정하며 화면 하단으로 돌진 관통', targets: ['dash_paint', 'burst_shooter', 'sweeper'] },
  { id: 'boundary_bounce', name: '외벽 도탄 고탄성 기동 (Wall ricochet)', desc: '화면 가로 좌측과 우측 끝의 투명 자기장 배리어 벽에 충돌 시 반사 각도로 도탄 굴절 기동', targets: ['ricochet_shooter'] },
  { id: 'aimed_stalking', name: '플레이어 기체 표적 추격 (Target Stalking Flow)', desc: '플레이어의 기체 움직임을 일정 가속도로 지속 인식하며 좌우 수평 위치를 정렬 융착', targets: ['aimed', 'homing_shooter', 'gravity_vortex_mob', 'tank', 'burst_shooter'] }
];
