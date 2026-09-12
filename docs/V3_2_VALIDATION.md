# v3.2.0 검증 기록

2026-09-12 기준. 기존 v3.1 편집 개선에 추가 배경 64장을 통합하고, 포터블 패키지와 실제 Electron 동작을 확인했습니다.

## 결과

| 검증 | 결과 |
|---|---|
| 구문·자동 검사 | `npm run check` 통과 — 61개 테스트, 실패 0 |
| 배경 자산 | 기존 100장 + 추가 64장 = 164장, 18개 분류, 추가 원본 64개 고유 SHA-256 |
| 추가 원본 | 17:6 비율, 모두 PNG·850×300 이상, 추가 팩 123,244,437바이트 |
| 실제 Electron 개발 실행 | 164장 목록·분류 검색·갤러리 적용·랜덤 10회·썸네일 164개 확인 |
| 카드 출력 | 추가 64장 각각 1열·2열 850×300 PNG 출력 성공(128개), 렌더러 예외 0개 |
| 패키지 실행 | `app.isPackaged === true`, `resources/backgrounds`에서 164장 로드, 추가 64장 원본 해시 일치 |
| 포터블 빌드 | `dist/jjal-generator-v3.2-portable.exe` 생성, 404,058,655바이트 |

## 추가 이미지

브랜드 48장(MSI·GIGABYTE·ASUS·AMD·Intel·NVIDIA 각 8장), PC 데스크셋업·방 풍경 8장, 도트풍 8장을 `assets/backgrounds/`에 원본 그대로 추가했습니다. NVIDIA-06은 Dawn 캐릭터 대신 에메랄드 AI 코어 콘셉트로 반영했습니다.

생성 기록은 [BACKGROUND_EXPANSION_GENERATION.json](BACKGROUND_EXPANSION_GENERATION.json)에 있으며, 각 항목에 ID·프롬프트·참고 파일·크기·바이트·SHA-256·검수 메모를 포함합니다. 생성 원본과 참고 자료는 `work/background-expansion/`에 별도로 보관합니다.

## 패키지 확인 경로

- 개발 패키지: `dist/win-unpacked/resources/app.asar`
- 내장 배경 리소스: `dist/win-unpacked/resources/backgrounds/` — 164개 PNG, 312,401,285바이트
- 포터블 실행 파일: `dist/jjal-generator-v3.2-portable.exe`
- 실제 패키지 검증 스크립트: `work/background-expansion/scripts/verify-packaged.cjs`

실제 Electron 검증은 사용자 데이터와 임시 파일을 프로젝트 내부 격리 폴더에 생성했습니다. 기존 사용자 저장소와 기존 100장 원본은 변경하지 않았습니다.
