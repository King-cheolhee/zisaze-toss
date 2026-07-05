# 지사제 미니앱 (앱인토스)

정부지원사업 정보 서비스 **지사제**의 토스 미니앱(앱인토스) 버전. 기존 웹서비스([zisaze.com](https://www.zisaze.com) = `rich1` 저장소)의 백엔드·데이터·추천 엔진을 **그대로 재사용**하고, 토스 앱 안에서 동작하는 프론트(WebView/CSR)만 신규 구축한다.

- **스택(예정):** Vite + React 19 + TypeScript + `@apps-in-toss/web-framework`
- **핵심 기능:** 선호 분야 온보딩 → 맞춤 추천 / 지원사업 목록·검색·필터 / 상세(AI 요약) / 원문 열기 / 북마크 / 설정
- **사용자 식별:** 토스 `getAnonymousKey`(로그인 없이) → rich1 `POST /api/toss/session` → JWT
- **백엔드:** 기존 rich1 API를 크로스오리진 호출(CORS additive 3종만 rich1에 추가)

## 문서
- `구현계획서_v2.md` — **정본 계획서**(v1은 이력용)
- `조사결과_rich1_recon_v1.md` — rich1 연동점 지도·계약·계획서 정정사항

## 원칙
- 기존 웹(rich1) 무중단: rich1 변경은 계획서 §5 Phase 1의 additive 작업만 허용.
- 토스 하드 제약(SSR 금지·라이트모드·다크패턴 금지·AI 고지 등) 상시 준수(계획서 §3).
- 토스 콘솔의 "검토 요청"·"출시하기"는 사용자가 직접 결정한다.
