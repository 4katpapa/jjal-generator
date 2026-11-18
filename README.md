# 자짤 스튜디오

커뮤니티에 올리는 PC 사양 자짤(기본 850×300)을 레이어 방식으로 만드는 편집기. Windows 앱(Electron)과 브라우저에서 같은 코드로 동작한다.

## 쓰는 법

1. 처음 실행하면 **프리셋 고르기**가 열린다. 하나를 고른다.
2. 상단 **내용**에서 닉네임·사진·사양을 넣는다. Windows 앱에서는 **이 PC에서 읽기**로 CPU·메인보드·RAM·그래픽카드·저장장치를 채울 수 있다(파워·케이스·쿨러는 직접 입력).
3. 캔버스에서 요소를 눌러 고르고, 끌어서 옮기고, 핸들로 크기·회전을 바꾼다. 오른쪽 위 **레이어**에서 순서(위가 앞)·숨김·잠금을, 오른쪽 아래 **속성**에서 고른 레이어의 값을 바꾼다.
4. **내보내기**에서 PNG / WebP / 움직이는 WebP로 저장한다. 출력은 항상 카드 크기 그대로다.

| 조작 | 방법 |
|---|---|
| 선택 / 여러 개 선택 | 클릭 / Shift+클릭 |
| 이동 | 끌기 (Shift: 한 방향, Alt: 붙기 끄기), 방향키 (Shift: 10px) |
| 크기 / 회전 | 모서리·변 핸들 / 위쪽 둥근 손잡이 (Shift: 15°) |
| 사진 자르기 | 사진 두 번 클릭 → 끌어서 위치, 휠로 확대, Enter로 완료 |
| 순서 | 레이어 패널에서 끌기, Ctrl+] / Ctrl+[ |
| 복제 / 묶기 / 삭제 | Ctrl+D / Ctrl+G (풀기 Ctrl+Shift+G) / Delete |
| 실행 취소 / 다시 실행 | Ctrl+Z / Ctrl+Y |
| 레이어 복사 / 잘라내기 / 붙여넣기 | Ctrl+C / Ctrl+X / Ctrl+V |
| 스타일 복사 / 붙여넣기 | Ctrl+Alt+C / Ctrl+Alt+V |
| 저장 / 내보내기 | Ctrl+S / Ctrl+E |
| 화면 확대 | Ctrl+휠 |
| 이미지 추가 | 왼쪽 **이미지**, 파일을 창에 끌어다 놓기, Ctrl+V |

배경(잠긴 바탕 레이어)과 효과 레이어는 캔버스 클릭으로 잡히지 않는다. 레이어 패널에서 고른다.

## 개발

```bash
npm install
```
```bash
npm run dev
```
```bash
npm run desktop
```

| 명령 | 내용 |
|---|---|
| `npm run dev` | 브라우저 개발 서버 (http://localhost:5183) |
| `npm run build` | 타입 검사 + `dist/` 빌드 |
| `npm run desktop` | 빌드본을 Windows 앱으로 실행 (`npm run build` 먼저) |
| `npm test` | 모델 단위 테스트 |
| `npm run desktop:smoke` | 빌드본에서 자동 검사 실행 → `smoke-result.json` |
| `npm run dist` | 포터블 exe 빌드 → `release/` |
| `npm run assets:backgrounds` / `assets:icons` | 기존 앱의 원본에서 배경·아이콘 변환 |

실제 창에서 마우스 조작까지 확인하는 검사: `JJAL_SHOT_DIR=<폴더> npx electron . --script=scripts/ui-check.cjs`

## 구조

```text
src/model/     문서 모델(레이어·내용·카드), 레이어 조작, 사양 입력 규칙
src/render/    렌더러: renderDoc(문서, 시간, 배율) 하나가 편집 화면·PNG·WebP 프레임을 모두 그린다
src/editor/    편집 상태(실행 취소), 편집 동작, 속성 정의(schema.ts), 저장·열기
src/ui/        화면: 캔버스 조작(Stage), 레이어 패널, 속성 패널, 창들
src/io/        내보내기, 움직이는 WebP 묶기, .jjal 파일, 저장소
src/presets/   기본 프리셋 8개
src/selftest.tsx  자동 검사(주소에 ?selftest)
electron/      Windows 앱 껍데기, PC 사양·글꼴 읽기
scripts/       자산 변환, 조작 검사
```

### 지켜야 할 규칙

- **속성은 `src/editor/schema.ts`에만 추가한다.** 속성 패널은 이 정의로 그려지고, 자동 검사는 여기 적힌 모든 속성에 대해 "값을 바꾸면 그림이 바뀌는지" 확인한다. 값이 영향을 주지 않는 상황이 있으면 `visible`로 감추거나 `note`로 이유를 보여준다.
- **효과는 phase(0..1)의 주기 함수로 만든다.** phase 0과 1의 그림이 같아야 움직이는 WebP가 끊기지 않는다.
- **그리기는 `renderDoc` 한 곳에서만 한다.** 미리보기와 출력이 달라지지 않게 한다.

## 자산과 라이선스

- 배경 164장·부품 아이콘 48개: 기존 "자짤 생성툴"의 이미지를 변환한 것(`public/backgrounds`, `public/icons`).
- 나눔고딕: SIL Open Font License (`public/fonts/nanum-gothic/OFL.txt`).
- 코드: MIT.
