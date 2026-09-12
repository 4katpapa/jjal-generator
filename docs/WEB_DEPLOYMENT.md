# 웹판 제작 및 배포

## 구성

웹판은 기존 `renderer/`의 카드 편집·Canvas 출력 코드를 공유합니다. `web/browser-api.js`가 Electron 연결부 대신 브라우저의 파일 선택, 다운로드, IndexedDB 저장을 담당합니다. Windows 배포본은 기존 Electron 연결부를 계속 사용합니다.

- 사양 직접 입력과 여러 줄 붙여넣기, 부품·주변기기 아이콘, 외곽선·발광·레이아웃 편집
- 배경 프리셋 검색·분류·선택과 편집 화면의 랜덤 배경
- 브라우저 디자인 저장, 자동 복구, `.speccard` 파일 백업·불러오기
- PNG와 정지·움직이는 WebP 출력. WebP 인코딩 지원 여부는 브라우저에서 확인합니다.
- 정확한 PC 부품 자동 감지는 Windows 앱에서 지원합니다.

개인 이미지와 사양은 브라우저 내부에서 처리합니다. 사용자 계정·서버 저장·유료 API는 사용하지 않습니다. 저장된 디자인은 현재 사이트 주소와 브라우저에 속하며, 사이트 데이터를 삭제하거나 주소를 변경하기 전 `.speccard` 파일로 백업해야 합니다.

## 파일 위치

| 용도 | 프로젝트 기준 경로 |
| --- | --- |
| 배경 원본 PNG | `assets/backgrounds/` |
| 아이콘 원본 PNG | `renderer/assets/spec-icons/` |
| 웹 전용 소스와 설정 | `web/` |
| 웹사이트 배포 파일 | `web/dist/` |
| 웹용 배경 WebP | `web/dist/backgrounds/images/` |
| 배경 썸네일 | `web/dist/backgrounds/thumbnails/` |
| 이전 웹 빌드 | `work/web-builds/` |

모두 기존 바탕화면 프로젝트 `C:\Users\HOME\Desktop\잡동사니\자짤\자짤 생성툴` 안에 있습니다. 원본 PNG는 변환 작업에서 읽기만 합니다. 브라우저는 선택한 이미지 한 장을 내려받으며, 사용자가 배경 팩을 별도로 설치할 필요는 없습니다.

현재 배경 164장·18개 분류 기준 원본 312,401,285바이트를 웹용 본문 23,126,340바이트와 썸네일 1,232,452바이트로 변환했습니다. 웹용 배경은 최대 가로 1,700px이며, 도트·픽셀 제목이 포함된 배경은 최근접 리샘플링과 무손실 WebP를 사용합니다. 아이콘은 리사이즈 없이 무손실 WebP로 변환합니다.

## 로컬 실행

Node.js 22 이상에서 프로젝트 루트를 기준으로 실행합니다.

```powershell
npm ci --prefix web
npm run build:web
npm run preview:web
```

미리보기 주소는 `http://127.0.0.1:4173/`입니다. `index.html`을 파일 탐색기에서 직접 열면 배경 목록과 저장소 동작을 보장할 수 없습니다. 미리보기 서버는 `web/dist/`만 제공하고 로컬 PC에서만 접속받습니다.

```powershell
npm run check
npm run test:web
```

`web/dist/`와 의존성·작업 기록은 Git에서 제외합니다. 빌드는 등록된 생성 파일만 배포하며, 이전 산출물은 프로젝트의 `work/web-builds/`에 보관합니다. 배포 폴더에 다른 파일이 추가되어 있으면 이를 보존하기 위해 빌드를 중단합니다.

## Cloudflare Pages 무료 배포

현재 상태는 로컬 웹판과 배포 준비 완료, Cloudflare 계정 생성·연결 대기입니다. 실제 공개 주소와 Google 소유권 인증값은 아직 설정하지 않았습니다.

1. Cloudflare 무료 계정을 만들고 이메일 인증을 완료합니다.
2. 대시보드의 **Workers & Pages → Create application → Pages → Connect to Git**에서 GitHub 계정을 연결합니다. 저장소 접근은 `4katpapa/jjal-generator`만 선택합니다.
3. 다음 설정으로 Pages 프로젝트를 만듭니다.

| 설정 | 값 |
| --- | --- |
| 저장소 | `4katpapa/jjal-generator` |
| Production branch | `main` |
| Framework preset | `None` |
| Root directory | `web` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js | `web/.node-version`의 22 |

기본 `*.pages.dev` 주소를 사용합니다. Workers Functions·R2·유료 Images 서비스·개인 도메인 구입은 필요하지 않습니다. **GitHub에 push할 때** Cloudflare가 빌드와 배포를 실행합니다. 사용자 PC에서 주기적으로 GitHub를 검사하는 작업은 만들지 않습니다.

4. 공개 주소가 정해지면 Pages의 **Production 환경 변수** `SITE_URL`에 그 HTTPS 주소를 설정하고 재배포합니다. 주소 끝의 `/`는 자동 정리됩니다. 예시 주소를 그대로 사용하지 않습니다.
5. 공개 HTTPS 주소에서 편집·저장·배경·다운로드를 확인합니다. 필요하면 Pages 배포 기록에서 이전 배포로 되돌립니다.

미리보기 배포는 기본적으로 검색엔진에서 제외됩니다. Production 환경에만 최종 `SITE_URL`과 Google 인증값을 설정해 미리보기 주소를 검색용 대표 주소로 사용하지 않습니다.

## Google 검색 등록

1. Google Search Console에서 **URL 접두어** 속성으로 실제 `https://…pages.dev/` 주소를 추가합니다. `pages.dev`의 DNS 소유권을 요구하는 도메인 속성 대신 URL 접두어를 사용합니다.
2. HTML 태그 인증의 `content` 값을 Pages의 Production 환경 변수 `GOOGLE_SITE_VERIFICATION`에 입력하고 재배포합니다. 이 값은 사이트의 공개 인증용 값이며 Google 비밀번호나 API 키를 입력하는 곳이 아닙니다.
3. Search Console에서 소유권 확인 후 `sitemap.xml`을 제출하고 대표 페이지 색인을 요청합니다.

`SITE_URL`이 설정되면 빌드가 canonical, Open Graph URL, `sitemap.xml`, robots의 사이트맵 주소를 함께 생성합니다. 설정 전에는 임의의 공개 주소나 잘못된 사이트맵을 생성하지 않습니다.

검색 등록은 무료이며 검색 포함 여부와 순위는 Google이 결정합니다. 실제 공개 배포·소유권 인증·검색 등록은 계정 연결 후 별도로 완료해야 합니다.

## 공식 문서

- [Cloudflare Pages Git 연결과 자동 배포](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [무료 정적 파일 요청](https://developers.cloudflare.com/pages/functions/pricing/)
- [Pages 파일·빌드 제한](https://developers.cloudflare.com/pages/platform/limits/)
- [Google 사이트 소유권 확인](https://support.google.com/webmasters/answer/9008080?hl=ko)
- [Google 재크롤링 요청](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
