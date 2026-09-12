# 브랜드 배경 48종과 일반 배경 보강 — 제작·통합 기록

작성·공식 자료 확인: 2026-09-12. 상태: **64장 생성·검수·앱 자산 통합 완료** — v3.2.0.

MSI·GIGABYTE·ASUS·AMD·Intel·NVIDIA를 각 8장씩, 총 48장으로 제작했다. 회사별 로고·심볼·캐릭터를 확인하고 이를 새로운 풍경·소재·일러스트에 활용했다. 아래 장면과 색 조합은 이 프로젝트를 위한 창작 제안이다. 공식 배경화면을 그대로 복제하는 작업은 아니다.

후속 요청에 따라 기존 100장을 조사했다. 도트풍은 064 한 장이 있으며, 데스크 관련 055·056은 실제 원본에 데스크톱 PC 구성이 나타나지 않았다. 따라서 **PC 데스크셋업·방 풍경 8종을 추가 제안**하고, 이미 존재하는 도트풍의 주제를 넓힐 **도트 8종은 선택 가능한 보강 후보**로 분리했다.

| 구분 | 수량 | 상태 |
|---|---:|---|
| 브랜드 배경 | 48 | 회사별 8장 생성·검수·통합 |
| PC 데스크셋업·방 풍경 | 8 | 8장 생성·검수·통합 |
| 다양한 주제의 도트풍 | 8 | 8장 생성·검수·통합 |
| 합계 | 64 | 기존 100장에 추가해 내장 164장 |

## 제작 공통 기준

- 카드 기준은 **850×300, 17:6**. 생성 원본은 이 비율에 맞는 가로 파노라마로 제작한다. 도구가 더 큰 해상도를 반환하면 실제 크기를 기록하고 프로젝트 안에 원본을 보존한다.
- 아래 표의 **왼쪽 여백**은 글씨를 왼쪽 약 65%, 피사체를 오른쪽 약 25%에 배치한다는 뜻이다. 오른쪽 여백은 반대이며, 중앙 여백은 중앙 약 70%를 낮은 대비로 두고 강조 요소를 바깥쪽에 배치한다.
- 글씨 영역도 벽·안개·수면·큰 색면으로 자연스럽게 이어지도록 한다. 강한 조명, 캐릭터 얼굴, 촘촘한 회로, 굵은 로고가 사양 뒤를 가로지르지 않게 한다.
- 브랜드 48종은 회사마다 어두움 4·밝음 3·중간 1, 중앙 여백 4·왼쪽 여백 2·오른쪽 여백 2로 배분한다. 합계는 어두움 24·밝음 18·중간 6, 중앙 24·왼쪽 12·오른쪽 12이다.
- 브랜드 배경에는 지정한 회사·제품군의 로고와 심볼을 허용한다. 사양 문구, 광고 문장, 가격, 임의의 모델명, 카드 프레임은 넣지 않는다. 기존 일반 배경 100장의 로고 제외 기준은 그대로 유지한다.
- 로고는 정확한 철자·획·비율, 캐릭터는 얼굴·실루엣·대표 색을 공식 참고 이미지와 대조한다. 단순히 브랜드색만 사용한 일반 풍경이 되지 않도록 각 배경에 식별 요소를 적어도 하나 남긴다.
- 마스코트 장면은 같은 캐릭터의 외형을 유지한다. 역사적인 광고·데모 캐릭터에는 복고·아카이브 태그를 붙인다. 일반 동물이나 임의의 로봇을 새 공식 마스코트처럼 표기하지 않는다.
- 실제 생성 원본과 검수 메모는 `work/background-expansion/`에 보관하고, 채택한 64장은 `assets/backgrounds/`에 원본 PNG로 통합했다. 전체 생성 기록과 SHA-256은 `docs/BACKGROUND_EXPANSION_GENERATION.json`에 기록했다.

## 회사별 활용 요소와 공식 참고 자료

### MSI

활용 요소는 MSI 워드마크, 용 모티프, 클래식 드래곤 방패, 붉은 용 캐릭터 Lucky다. 과거 게이밍 아이덴티티의 빨강·검정·은색은 강한 배경의 출발점으로 쓰고, 밝은 배경에서는 은백색·벚꽃색·먹색으로 변주한다. [MSI 게이밍 아이덴티티 설명](https://us.msi.com/about/profile), [공식 Lucky 상품](https://es-store.msi.com/products/lucky-mascot-plushie).

MSI 공식 연혁은 2023년 기업 CI 통합 시 드래곤 방패를 제거했다고 설명한다. 드래곤 방패 이미지는 **클래식 게이밍 요소**로 구분하고, 최신 기업 로고라고 표기하지 않는다. [MSI 브랜드 연혁](https://www.msi.com/about/brandStory).

### GIGABYTE / AORUS

GIGABYTE 워드마크, AORUS의 매(Falcon) 심볼, LCD 안에 사는 작은 매 CHIBI를 활용할 수 있다. AORUS는 GIGABYTE의 게이밍 브랜드이며, CHIBI는 공식 제품 설명에 등장하는 캐릭터다. [AORUS Falcon 로고 설명](https://www.aorus.com/en-us/Keyfeature/1277/), [CHIBI 공식 소개](https://global.aorus.com/blog-detail.php?i=840).

AORUS의 주황색 강조를 중심으로 검정·금속색을 조합하고, 밝은 배경에는 AERO 계열의 은백색 디자인을 참고한다. AERO와 AORUS를 같은 로고로 합치지 않는다. [GIGABYTE/AORUS 화이트 구성과 AERO 디자인](https://global.aorus.com/blog-detail.php?i=1200).

### ASUS / ROG / TUF

ASUS 워드마크, ROG의 각진 눈 모양인 Fearless Eye, TUF Gaming 심볼, ROG SAGA의 기계 쥐 캐릭터 OMNI를 활용한다. ROG는 네온·미래 도시, TUF는 금속·산업 공간, ASUS 기본 워드마크는 밝고 단정한 구성을 제안한다. 이는 각 요소를 이용한 제작 방향이다. [ROG 로고 설명](https://rog.asus.com/hk-en/articles/fun-fact-friday/what-is-the-rog-logo-the-design-behind-the-fearless-eye/), [OMNI 공식 캐릭터 소개](https://rog.asus.com/microsite/rog-saga/zh-hant/gamers/omni/), [TUF Gaming 로고 발표](https://www.asus.com/ca-en/news/vl9gg6xgdi7fbsg5/).

### AMD

AMD Arrow 로고, Ryzen의 원형 모티프, Radeon 워드마크를 중심으로 구성한다. 주황색 원형과 적색 강조, CPU·GPU 패키징에서 출발한 기하 구조는 서로 다른 테마로 사용한다. [AMD 로고·제품군 자료](https://www.amd.com/en/partner/browse-by-resource/marketing-materials.html), [AMD 상표 목록](https://www.amd.com/en/legal/trademarks.html).

Ruby는 ATI/AMD Radeon의 **과거 기술 데모 캐릭터**다. AMD의 현재 기업 마스코트라는 표현은 사용하지 않는다. 눈 덮인 산과 Ruby를 활용한 Whiteout 데모도 공식 아카이브에서 확인했다. [AMD Ruby 데모 발표](https://ir.amd.com/news-events/press-releases/detail/212/amd-delivers-unified-gaming-strategy-at-gdc-2013), [AMD GPUOpen의 Ruby: Whiteout](https://gpuopen.com/archived/radeon-hd-2000-series-real-time-demos/).

### Intel

Intel 워드마크, Core 배지, Arc 워드마크와 파랑 계열을 활용한다. 유리·타일·웨이퍼·클린룸을 주요 소재로 제안하고, Arc에는 보라·파랑 공간을 배정한다. [Intel 브랜드 소개와 파랑색](https://download.intel.com/newsroom/archive/2025/en-us-2020-09-02-sparking-the-next-era-for-the-intel-brand.pdf), [Intel Arc 제품 가이드](https://cdrdv2-public.intel.com/792016/A580%20Product%20Guide%20v1.2.pdf).

BunnyPeople은 반도체 제조 작업자의 방진복을 소재로 한 **1997년 광고 캐릭터**다. 복고 테마에서는 색색의 방진복과 춤추는 포즈를 활용한다. [Intel Bunny People 광고 발표](https://www.intel.com/pressroom/archive/releases/1997/CN12297A.HTM).

### NVIDIA

NVIDIA의 눈 심볼과 GeForce RTX 워드마크를 활용한다. 초록·검정·은백색을 중심으로 광선·반사·계산 구조를 표현하는 배경을 제안한다. [NVIDIA 공식 로고 자료](https://nvidianews.nvidia.com/multimedia/corporate/nvidia-logos), [NVIDIA의 RTX 기술 데모 소개](https://www.nvidia.com/en-us/geforce/community/demos/).

Dawn은 GeForce FX 기술 데모의 요정 캐릭터다. NVIDIA의 현재 기업 마스코트라는 표현은 사용하지 않고, 숲과 빛을 중심으로 한 **데모 아카이브 테마**로 활용한다. [Dawn 데모 소개](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-4-animation-dawn-demo), [Dawn의 요정·숲 설정](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-3-skin-dawn-demo).

## 브랜드 배경 제작 목록 — 48종

### MSI — 8종

| ID | 제목 · 핵심 장면 | 활용 요소 | 색 조합 · 밝기 | 표현 · 글씨 여백 | 생성 키워드 |
|---|---|---|---|---|---|
| MSI-01 | 붉은 용의 문장: 검은 표면 위에 떠 있는 붉은 방패 | 클래식 드래곤 방패 | 블랙·스칼렛·실버 / 어두움 | 금속 3D 렌더 · 왼쪽 | classic MSI dragon shield, scarlet rim light, matte black metal, restrained smoke |
| MSI-02 | 금빛 회로의 서명: 가장자리의 금속 명판과 가는 회로 | MSI 워드마크 | 흑연·샴페인골드·브론즈 / 어두움 | 고급 제품 매크로 · 중앙 | MSI wordmark, brushed black metal, fine champagne gold circuit traces |
| MSI-03 | 서리 속 은룡: 반투명 얼음에 얕게 새긴 용의 흔적 | 용 심볼 | 펄화이트·아이스블루·실버 / 밝음 | 반투명 얼음 조각 · 중앙 | MSI dragon motif, frosted glass relief, ice crystals at edges, pearl white |
| MSI-04 | 기계 용의 격납고: 금속 비늘과 붉은 눈을 가진 용 | 용 모티프·작은 MSI 표시 | 건메탈·크림슨·쿨그레이 / 어두움 | SF 기계 생물 콘셉트 · 오른쪽 | mechanical dragon, layered metal scales, crimson eye, industrial hangar |
| MSI-05 | Lucky의 봄 소풍: 벚꽃 아래 앉아 있는 작은 붉은 용 | Lucky | 크림·벚꽃핑크·민트 / 밝음 | 부드러운 캐릭터 일러스트 · 왼쪽 | MSI Lucky dragon, cherry blossom picnic, pastel spring, soft illustration |
| MSI-06 | Lucky의 심야 게임방: 책상 끝에서 패드를 든 Lucky | Lucky·MSI 표시 | 네이비·레드·시안 / 어두움 | 작은 디오라마 · 중앙 | MSI Lucky gaming nook, controller, tiny desk, red cyan ambient lighting |
| MSI-07 | 붉은 먹과 용: 종이 위에 흐르는 붓선과 용 실루엣 | 용 심볼·작은 MSI 표시 | 미색·먹색·주홍 / 밝음 | 수묵과 붉은 잉크 · 오른쪽 | ink dragon silhouette, vermilion brush accents, warm rice paper, minimal |
| MSI-08 | 용 비늘의 노을: 낮은 사구와 비늘 같은 겹침을 연결 | 용 비늘 모티프·MSI 워드마크 | 구리·버건디·샌드 / 중간 | 추상 풍경 일러스트 · 중앙 | dragon-scale dunes, copper sunset, layered sculptural sand, burgundy haze |

### GIGABYTE / AORUS — 8종

| ID | 제목 · 핵심 장면 | 활용 요소 | 색 조합 · 밝기 | 표현 · 글씨 여백 | 생성 키워드 |
|---|---|---|---|---|---|
| GIGABYTE-01 | 주황빛 매의 문장: 카본 위에 빛나는 날카로운 매 심볼 | AORUS Falcon | 블랙·오렌지·건메탈 / 어두움 | 카본·금속 3D 렌더 · 왼쪽 | AORUS falcon emblem, orange edge lighting, black carbon, angular metal |
| GIGABYTE-02 | 금속 날개의 궤적: 깃털 모양 냉각핀과 발광 선 | Falcon 모티프·AORUS 표시 | 차콜·앰버·티타늄 / 어두움 | 하드웨어 추상 매크로 · 중앙 | falcon wing heatsink fins, titanium feathers, amber light trails |
| GIGABYTE-03 | AERO 화이트 갤러리: 은백색 판재와 유리 곡면 | AERO 워드마크 | 실버·오프화이트·옅은 라일락 / 밝음 | 미니멀 제품 공간 · 중앙 | GIGABYTE AERO, silver white gallery, glass arcs, quiet iridescent accents |
| GIGABYTE-04 | 푸른 기판 도시: 회로가 야간 도시의 길처럼 이어짐 | GIGABYTE 워드마크 | 인디고·전기블루·시안 / 어두움 | 아이소메트릭 기술 도시 · 오른쪽 | GIGABYTE wordmark, blue circuit-board city, isometric towers, quiet atmosphere |
| GIGABYTE-05 | CHIBI의 작은 작업대: 매 캐릭터와 미니 키보드 | CHIBI | 크림·살구·스카이블루 / 밝음 | 귀여운 미니어처 일러스트 · 왼쪽 | AORUS CHIBI little falcon, miniature keyboard workbench, pastel desk |
| GIGABYTE-06 | CHIBI의 우주 유영: 작은 우주복과 먼 행성 | CHIBI·AORUS 표시 | 미드나잇블루·앰버·보라 / 어두움 | 캐릭터 SF 일러스트 · 중앙 | AORUS CHIBI astronaut, tiny spacesuit, distant planet, sparse stars |
| GIGABYTE-07 | 설산 위의 매: 흰 산맥 위 작은 매 심볼 | Falcon·화이트 제품군 모티프 | 아이스화이트·청회색·민트 / 밝음 | 종이층 풍경 · 오른쪽 | AORUS falcon, white mountain layers, icy paper-cut landscape, mint shadows |
| GIGABYTE-08 | 황금 하늘의 비상: 날개 실루엣과 잔잔한 구름 바다 | Falcon 모티프·AORUS 표시 | 오커·코퍼·더스티블루 / 중간 | 시네마틱 풍경 · 중앙 | falcon silhouette in flight, golden cloud sea, copper dusk, broad calm sky |

### ASUS / ROG / TUF — 8종

| ID | 제목 · 핵심 장면 | 활용 요소 | 색 조합 · 밝기 | 표현 · 글씨 여백 | 생성 키워드 |
|---|---|---|---|---|---|
| ASUS-01 | 네온 Fearless Eye: 유리 위에 떠오르는 ROG 눈 | ROG Fearless Eye | 블랙·마젠타·시안 / 어두움 | 네온 유리 3D 렌더 · 왼쪽 | ROG Fearless Eye, floating neon glass, magenta cyan glow, black backdrop |
| ASUS-02 | TUF 정비 격납고: 두꺼운 금속 패널과 작은 경고색 | TUF Gaming 심볼 | 흑연·카키·앰버 / 어두움 | 산업 공간 콘셉트 · 중앙 | TUF Gaming emblem, reinforced metal panels, industrial hangar, amber accents |
| ASUS-03 | ASUS 푸른 백색 공간: 부드러운 수평선과 은색 로고 | ASUS 워드마크 | 화이트·페일블루·실버 / 밝음 | 미니멀 건축 렌더 · 중앙 | ASUS wordmark, airy white architecture, silver surfaces, pale blue horizon |
| ASUS-04 | ROG 빗속의 도시: 건물 끝의 눈 모양 홀로그램 | ROG Fearless Eye | 남청·레드·바이올렛 / 어두움 | 야간 도시 일러스트 · 오른쪽 | ROG holographic eye, rainy futuristic skyline, red violet reflections |
| ASUS-05 | OMNI 스케이트 파크: 보드를 든 OMNI와 둥근 램프 | OMNI | 크림·라벤더·코랄 / 밝음 | 파스텔 캐릭터 일러스트 · 왼쪽 | ROG OMNI mechanical mouse, skateboard, pastel skatepark, playful pose |
| ASUS-06 | OMNI의 정비 시간: 공구 옆에 앉은 작은 로봇 | OMNI·작은 ROG 표시 | 딥퍼플·시안·레드 / 어두움 | SF 작업실 디오라마 · 중앙 | ROG OMNI workshop, small tools, sci-fi maintenance bay, cyan red lighting |
| ASUS-07 | 진주빛 ROG 프리즘: 흰 유리에 새긴 눈과 옅은 무지개 | ROG Fearless Eye | 펄화이트·페일핑크·아쿠아 / 밝음 | 유리·프리즘 추상 · 오른쪽 | ROG eye etched in pearl glass, restrained pastel refraction, white prism |
| ASUS-08 | ROG 거리의 색면: 가장자리에 겹친 눈 심볼과 찢긴 종이 | ROG Fearless Eye | 웜그레이·코발트·레드 / 중간 | 스트리트 콜라주 · 중앙 | ROG eye street-art collage, torn paper edges, cobalt red shapes, quiet center |

### AMD — 8종

| ID | 제목 · 핵심 장면 | 활용 요소 | 색 조합 · 밝기 | 표현 · 글씨 여백 | 생성 키워드 |
|---|---|---|---|---|---|
| AMD-01 | Ryzen 일식: 원형 심볼을 닮은 주황빛 코로나 | Ryzen 원형 모티프·작은 Ryzen 표시 | 블랙·번트오렌지·앰버 / 어두움 | 우주 추상 일러스트 · 왼쪽 | AMD Ryzen circular motif, solar eclipse corona, burnt orange, dark space |
| AMD-02 | Radeon 빛의 터널: 적색 빛줄기와 낮은 GPU 실루엣 | Radeon 워드마크 | 차콜·크림슨·건메탈 / 어두움 | SF 하드웨어 렌더 · 중앙 | Radeon wordmark, crimson light tunnel, low GPU silhouette, dark metal |
| AMD-03 | 백색 Arrow 조각: 세라믹 표면의 화살표 심볼 | AMD Arrow | 화이트·웜그레이·옅은 살구 / 밝음 | 미니멀 세라믹 부조 · 중앙 | AMD Arrow logo, white ceramic relief, soft apricot bounce light |
| AMD-04 | 칩렛의 공중 도시: 연결된 작은 칩 섬과 빛의 다리 | 칩렛 개념·AMD 표시 | 버건디·코퍼·블랙 / 어두움 | 반도체 기반 SF 풍경 · 오른쪽 | AMD chiplet-inspired floating islands, copper links, burgundy computational city |
| AMD-05 | Ruby의 설원: 붉은 방한복 인물과 눈 덮인 산 | 과거 Ruby·Whiteout 모티프 | 설백·아이스블루·레드 / 밝음 | 캐릭터 풍경 일러스트 · 왼쪽 | AMD Ruby Whiteout homage, red winter suit, snowy mountains, quiet snowfall |
| AMD-06 | Ruby의 야간 옥상: 붉은 옷의 인물과 먼 도시 불빛 | 과거 Ruby·작은 Radeon 표시 | 네이비·루비레드·청록 / 어두움 | 복고 SF 캐릭터 아트 · 중앙 | AMD Ruby demo character, rooftop at night, ruby red outfit, distant teal city |
| AMD-07 | Ryzen 주황빛 붓원: 종이 위에 그린 원형과 옅은 먹선 | Ryzen 원형 모티프 | 아이보리·오렌지·먹색 / 밝음 | 붓·종이 추상화 · 오른쪽 | Ryzen circular motif, orange ink brush ring, ivory paper, restrained charcoal |
| AMD-08 | 실리콘의 스펙트럼: 웨이퍼 표면의 얕은 무지개 | AMD Arrow·웨이퍼 모티프 | 샴페인·테라코타·보라 / 중간 | 반도체 매크로 추상 · 중앙 | AMD Arrow detail, iridescent silicon wafer, champagne terracotta violet |

### Intel — 8종

| ID | 제목 · 핵심 장면 | 활용 요소 | 색 조합 · 밝기 | 표현 · 글씨 여백 | 생성 키워드 |
|---|---|---|---|---|---|
| INTEL-01 | 푸른 코어의 빛: 정밀한 칩 표면과 작은 Intel 로고 | Intel 워드마크·칩 모티프 | 네이비·코발트·시안 / 어두움 | 반도체 매크로 렌더 · 왼쪽 | Intel wordmark, luminous blue silicon core, fine etched chip, cyan rim light |
| INTEL-02 | Arc 성운의 문: 청보라 공간에 열린 빛의 아치 | Intel Arc 워드마크 | 딥퍼플·블루·마젠타 / 어두움 | 우주 SF 일러스트 · 중앙 | Intel Arc, blue violet nebula portal, soft cosmic arch, quiet negative space |
| INTEL-03 | Core 세라믹 타일: 층을 이룬 흰 사각판과 파란 배지 | Core 배지 | 화이트·아쿠아·페일블루 / 밝음 | 부드러운 제품 3D · 중앙 | Intel Core badge, layered ceramic square tiles, white aqua, clean shadows |
| INTEL-04 | 웨이퍼 위의 도시광: 원형 표면을 타고 번지는 청보라 반사 | Intel 표시·웨이퍼 | 잉크블루·바이올렛·실버 / 어두움 | 기술 매크로 사진풍 · 오른쪽 | Intel silicon wafer, blue violet radial reflections, precision grid at edge |
| INTEL-05 | BunnyPeople 클린룸: 방진복 작업자와 작은 웨이퍼 | 과거 BunnyPeople | 화이트·스카이블루·옅은 노랑 / 밝음 | 미니어처 캐릭터 공간 · 왼쪽 | Intel BunnyPeople, cleanroom suits, miniature wafer lab, white sky blue |
| INTEL-06 | BunnyPeople의 복고 파티: 색색의 방진복과 춤추는 포즈 | 과거 BunnyPeople | 남청·보라·옐로·블루 / 어두움 | 1990년대 광고풍 3D · 중앙 | Intel BunnyPeople dancing, colorful cleanroom suits, retro 1990s party lighting |
| INTEL-07 | 푸른 유리의 정원: 작은 로고와 겹친 투명 판재 | Intel 워드마크 | 아이스블루·민트·화이트 / 밝음 | 유리 조각·미니멀 정물 · 오른쪽 | Intel wordmark, layered blue glass garden, frosted transparent planes, mint |
| INTEL-08 | Intel Inside의 기억: 오래된 배지와 베이지 PC 재질 | 클래식 Intel Inside 배지 | 베이지·블루·실버 / 중간 | 1990년대 소재 콜라주 · 중앙 | classic Intel Inside badge, beige PC plastic, brushed silver, nostalgic texture |

### NVIDIA — 8종

| ID | 제목 · 핵심 장면 | 활용 요소 | 색 조합 · 밝기 | 표현 · 글씨 여백 | 생성 키워드 |
|---|---|---|---|---|---|
| NVIDIA-01 | 에메랄드 Eye: 검은 공간에 떠 있는 초록 유리 심볼 | NVIDIA 눈 심볼 | 블랙·라임·에메랄드 / 어두움 | 유리·빛 3D 렌더 · 왼쪽 | NVIDIA eye emblem, emerald glass, lime rim light, matte black atmosphere |
| NVIDIA-02 | RTX 반사의 방: 거울과 프리즘 사이를 지나는 광선 | GeForce RTX 워드마크 | 차콜·그린·바이올렛 / 어두움 | 광선·반사 실험 공간 · 중앙 | GeForce RTX, ray-traced mirror room, prism caustics, green violet accents |
| NVIDIA-03 | 백색 Eye 부조: 무광 흰 표면에 얕게 새긴 심볼 | NVIDIA 눈 심볼 | 화이트·페일민트·실버 / 밝음 | 미니멀 세라믹 부조 · 중앙 | NVIDIA eye embossed in white ceramic, pale mint shadows, matte surface |
| NVIDIA-04 | 계산의 숲: 빛나는 노드가 나무처럼 뻗는 데이터 구조 | NVIDIA 표시·계산 구조 모티프 | 블랙·라임·딥틸 / 어두움 | 기술·자연 융합 추상 · 오른쪽 | NVIDIA eye detail, computational lattice forest, green nodes, sparse data branches |
| NVIDIA-05 | Dawn의 아침 숲: 나무 끝 작은 요정과 부드러운 햇살 | 과거 Dawn | 세이지·민트·연금색 / 밝음 | 판타지 숲 일러스트 · 왼쪽 | NVIDIA Dawn fairy, woodland attire, morning forest, mint leaves, soft golden light |
| NVIDIA-06 | 에메랄드 AI 코어: 어두운 관측실의 발광 GPU 크리스털과 궤도 링 | NVIDIA AI 코어·눈 심볼 | 딥네이비·에메랄드·바이올렛·시안 / 어두움 | 시네마틱 SF 제품 콘셉트 · 중앙 | NVIDIA AI accelerator core, faceted GPU crystal, emerald glow, violet cyan orbital rings |
| NVIDIA-07 | 백색 냉각핀 건축: GPU 금속핀을 닮은 조용한 구조물 | GPU 냉각핀·NVIDIA 표시 | 실버·오프화이트·옅은 라임 / 밝음 | 하드웨어 기반 건축 추상 · 오른쪽 | NVIDIA eye detail, silver GPU heatsink architecture, paper-like white fins |
| NVIDIA-08 | 초록 인광의 기억: CRT빛과 초기 3D를 떠올리는 도형 | NVIDIA 눈 심볼 | 회녹색·라임·실버 / 중간 | 레트로 디지털 콜라주 · 중앙 | NVIDIA eye, green phosphor glow, retro low-poly shapes, brushed silver texture |

## 기존 일반 배경 확인

제작 기록 `docs/BACKGROUND_GENERATION.json`의 100개 항목에서 제목·표현·개별 키워드를 확인했다. 도트와 데스크에 직접 해당하는 원본 3장을 실제로 열어 아래와 같이 판정했다. 제작 제목만으로 PC의 존재를 판단하지 않았다.

| 기존 번호 | 제목 | 실제 원본에서 확인한 내용 | 분류 |
|---|---|---|---|
| 064 | 픽셀 밤 호수 | 계단형 픽셀 윤곽, 달·숲·호수·산장, 밤색 팔레트 | 도트풍 1종 확인 |
| 055 | 투명 데스크 셋업 | 유리와 흰 책상, 창밖 물가, 책·조명·의자. 본체·모니터·키보드는 보이지 않음 | 책상 풍경이지만 PC 셋업은 미충족 |
| 056 | 레트로 CRT 책상 | 나무 책상과 CRT 장치. 장치는 TV에 가까운 형태이며 PC 본체·키보드는 보이지 않음 | 레트로 소품 풍경, 명확한 데스크톱 셋업은 미충족 |

원본 확인 링크: [064 픽셀 밤 호수](../assets/backgrounds/07_일러스트/064_픽셀_밤_호수.png), [055 투명 데스크 셋업](../assets/backgrounds/06_컴퓨터_디지털/055_투명_데스크_셋업.png), [056 레트로 CRT 책상](../assets/backgrounds/06_컴퓨터_디지털/056_레트로_CRT_책상.png).

### PC 데스크셋업·방 풍경 — 추가 기획 8종

모든 항목에서 **별도 데스크톱 본체, 모니터, 키보드, 마우스**가 함께 보여야 한다. 방 풍경에는 책상 이외에도 창문·벽·바닥·가구가 드러나게 한다. 화면에는 읽을 수 있는 글자나 가짜 앱 UI를 넣지 않고, 추상 화면이나 단순한 풍경을 표시한다. 실제 PC 셋업의 존재를 확인한 뒤 통과시키며, 제목과 실제 이미지가 어긋난 결과는 수정한다.

가로 17:6에서도 기기가 잘리지 않도록 PC는 화면 바깥쪽에 모은다. 1열용은 한쪽 65%에 낮은 대비의 벽·창가를 남기고, 2열용은 중앙 70%의 방 내부를 차분하게 이어준다.

| ID | 제목 · 구체적인 PC와 공간 | 색 조합 · 밝기 | 표현 · 글씨 여백 | 생성 키워드 |
|---|---|---|---|---|
| DESK-01 | 햇살 드는 화이트 셋업: 흰 본체·모니터·키보드와 원목 책상, 얇은 커튼 | 크림·우드·세이지 / 밝음 | 인테리어 사진풍 · 왼쪽 | white desktop PC tower, monitor, keyboard and mouse, oak desk, sunlit curtains |
| DESK-02 | 비 오는 밤의 게임방: 검은 유리 본체·듀얼 모니터·주변기기, 빗방울 맺힌 창 | 네이비·시안·마젠타 / 어두움 | 시네마틱 방 풍경 · 오른쪽 | rainy gaming room, visible desktop tower, dual monitors, keyboard mouse, neon window |
| DESK-03 | 식물과 우드 셋업: 본체가 보이는 넓은 책상과 화분·책장 | 세이지·월넛·아이보리 / 밝음 | 자연스러운 실내 사진풍 · 중앙 | desktop PC room, walnut desk, visible PC tower monitor keyboard mouse, plants and bookshelf |
| DESK-04 | 노을빛 다락방 작업실: 창 아래 컴퓨터 본체·모니터와 경사진 천장 | 살구·테라코타·더스티블루 / 중간 | 애니메이션 배경화 · 왼쪽 | attic desktop PC studio at sunset, sloped ceiling, tower monitor keyboard mouse, cozy room |
| DESK-05 | 우주선의 개인 컴퓨터실: 분리형 PC 본체·모니터·주변기기와 행성 관측창 | 인디고·실버·아쿠아 / 어두움 | SF 실내 콘셉트 · 중앙 | spaceship private desktop PC cabin, separate tower monitor keyboard mouse, planet viewport |
| DESK-06 | 고양이가 쉬는 컴퓨터 방: 본체 옆 방석에서 잠든 고양이와 PC 책상 | 크림·페일핑크·올리브 / 밝음 | 부드러운 생활 일러스트 · 오른쪽 | cat beside desktop PC setup, visible tower monitor keyboard mouse, pastel home office |
| DESK-07 | 눈 오는 밤의 개발자 방: 데스크톱과 책, 따뜻한 스탠드, 창밖의 눈 | 남청·앰버·브라운 / 어두움 | 따뜻한 실내 일러스트 · 왼쪽 | snowy night desktop computer room, tower monitor keyboard mouse, warm desk lamp, books |
| DESK-08 | 1990년대 베이지 PC 방: 베이지 본체·CRT 컴퓨터 모니터·키보드·볼 마우스 | 베이지·올리브·앰버 / 중간 | 복고 인테리어 일러스트 · 오른쪽 | 1990s beige desktop computer room, PC tower, CRT computer monitor, keyboard, ball mouse |

### 도트풍 — 선택 가능한 보강 후보 8종

기존 064가 있으므로 도트풍이 없는 것으로 집계하지 않는다. 여러 주제의 도트풍을 원하는 경우 다음 8종을 선택해 확장할 수 있다. 기존 호수 장면과 다른 장소·시간대·소재를 배정했다.

도트풍의 공통 표현은 눈에 보이는 사각 픽셀, 계단형 윤곽, 제한된 색상, 선택적인 디더링이다. 화면을 흐린 그림 위에 격자만 얹은 결과는 피한다. AI로 제작한 도트풍의 실제 픽셀 크기·격자 정합성은 생성 결과를 보고 확인하며, 현재 계획 단계에서 정수 배율 픽셀 아트라고 보증하지 않는다.

| ID | 주제 · 장면 | 색 조합 · 밝기 | 글씨 여백 | 생성 키워드 |
|---|---|---|---|---|
| PIXEL-01 | 자연: 벚꽃나무와 낮은 언덕의 봄 들판 | 벚꽃핑크·연두·크림 / 밝음 | 중앙 | pixel art cherry blossom meadow, limited palette, crisp square pixels, calm sky |
| PIXEL-02 | SF: 고리 행성을 바라보는 달 기지 | 인디고·민트·라일락 / 어두움 | 왼쪽 | pixel art lunar base, ringed planet, sparse stars, low-detail space |
| PIXEL-03 | 미래 도시: 비 내리는 네온 골목과 고가철도 | 네이비·마젠타·청록 / 어두움 | 오른쪽 | pixel art rainy neon city, elevated railway, cyan magenta, quiet mist |
| PIXEL-04 | 과학: 잠수정 불빛이 비추는 해저 연구소 | 딥블루·아쿠아·앰버 / 어두움 | 중앙 | pixel art underwater research station, submarine light, sparse marine particles |
| PIXEL-05 | 동물: 사막여우와 선인장이 있는 황혼 사막 | 샌드·코랄·보라 / 중간 | 왼쪽 | pixel art fennec fox, cactus desert at dusk, warm sand, clear stepped silhouettes |
| PIXEL-06 | 컴퓨터: 비 오는 창가의 작은 PC 방 | 남청·앰버·청록 / 어두움 | 오른쪽 | pixel art cozy PC room, desktop tower monitor keyboard mouse, rainy window |
| PIXEL-07 | 게임 감성: 아케이드 기계와 낮은 네온 불빛 | 딥퍼플·시안·체리레드 / 어두움 | 중앙 | pixel art retro arcade interior, blank cabinet screens, restrained neon, calm center |
| PIXEL-08 | 계절: 눈 덮인 마을과 따뜻한 창문 불빛 | 아이스블루·크림·피치 / 밝음 | 왼쪽 | pixel art snowy village, warm window lights, pale blue snow, crisp pixel clusters |

## 생성 순서와 보관 계획

제작을 시작할 때는 먼저 각 회사의 대표 로고 테마와 캐릭터 테마를 1장씩 만든다. 첫 확인 대상은 MSI-01·05, GIGABYTE-01·05, ASUS-01·05, AMD-01·05, INTEL-01·05, NVIDIA-01·05의 12종이다. 로고가 작은 카드에서도 인식되는지와 캐릭터 외형을 먼저 확인한 뒤 나머지 36종을 진행한다.

일반 배경은 DESK-01과 DESK-02로 장비의 존재·방 구도를 먼저 검증한다. 선택 후보인 도트풍을 진행한다면 PIXEL-02와 PIXEL-06으로 픽셀 표현과 가독성을 확인한다. 각 이미지는 850×300의 1열·2열 사양을 실제로 겹쳐 확인한다.

생성한 64장의 원본과 참고 자료는 프로젝트 내부 `work/background-expansion/`에 보관했다. 채택 원본은 기존 `assets/backgrounds/` 아래 회사별·데스크·도트 폴더에 추가했으며 기존 100장과 기존 생성 기록은 보존했다. 새 생성 기록에는 ID·프롬프트·참고 자료·실제 크기·해시·검수 상태를 기록했다. NVIDIA-06은 Dawn 캐릭터 대신 에메랄드 AI 코어 콘셉트로 교체했다.
