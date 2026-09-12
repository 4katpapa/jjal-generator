# v4.0.0 릴리스 검증

검증일: 2026-09-13. 원본 프로젝트에서 Windows 포터블과 공유 웹판을 배포합니다.

## 로컬 검사와 패키지

- `npm run check`: 74개 통과. `npm run test:web`: 12개 통과.
- `npm run build:web`: 배경 164개·썸네일 164개·아이콘 3종·나눔고딕 OTF 2개와 라이선스 포함.
- `npm run dist -- --config.directories.output=work/release-v4.0.0-20260913/build`: 성공.
- 실행 파일: `dist/jjal-generator-v4.0.0-portable.exe`, 406,795,084바이트. Windows x64용.
- 체크섬: `dist/SHA256SUMS-v4.0.0.txt`.
- 실행 파일과 포함된 앱의 Windows 버전 정보: 4.0.0. ASAR 패키지 버전도 4.0.0.
- ASAR 안 편집 코드·아이콘·글꼴·라이선스 등 25개 파일이 현재 원본과 바이트 단위로 일치.
- 패키지의 배경 PNG 164개가 원본과 일치.
- 최종 포터블에서 추출한 압축 묶음의 무결성 검사 통과. 그 안의 ASAR가 위에서 검증한 ASAR와 SHA-256 일치.
- SHA-256: `e1371b1e2710770efb85ff916379ff91404f35cce441f025ce76ffdf32651e06`.

## GitHub와 공개 웹

배포와 공개 환경 확인을 진행 중입니다. 대상은 [v4.0.0 릴리스](https://github.com/4katpapa/jjal-generator/releases/tag/v4.0.0)와 [공식 웹판](https://jjaltool.kro.kr/)입니다.

## 범위와 복구

- 기존 v3.21 실행 파일과 태그·릴리스를 보존합니다. 사용자 디자인·개인 이미지·브라우저 저장소를 교체하지 않습니다.
- 릴리스 작업 전 변경 파일 22개를 `work/release-v4.0.0-20260913/before/`에 복사하고 SHA-256을 확인했습니다.
- 패키지 검증 상세는 같은 작업 폴더의 `package-verification.json`, 복구 기준은 `recovery.json`에 있습니다.
- 패키지 무결성은 실제 Windows GUI 사용 확인과 구분합니다. Windows 네이티브 GUI, 실제 휴대전화, 모든 기존 사용자 파일의 호환성은 이번 확인 범위에 포함하지 않습니다.
- 이전 공개 커밋: `4a019f551d9d3286b8d6a8bb967022f20fb78ba7`. 이전 Cloudflare 배포: `9317ddd9-95d2-452a-999c-76bd78ecf1b0`.
