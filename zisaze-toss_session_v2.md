# zisaze-toss 세션 v2 (2026-07-06)

정본 계획서 `구현계획서_v2.md`, 연동점 지도 `조사결과_rich1_recon_v1.md`, 이전 세션 `zisaze-toss_session_v1.md`. 이 문서는 이번 세션 인계용.

## 이번 세션에 한 일

**브랜드 자산 v3 (완료, `d053c26`)** — `brand/console/`
- `logo_600x600.png` 기존 유지(600x600 확인). `logo_600x600_dark.png` 신규: 다크 배경 `#17171C` + 브랜드블루 `#3182F6` 심볼(icon-512에서 부드러운 알파 램프로 추출).
- `thumbnail_1932x828.png` 재디자인: **"딱 맞춘 지원사업 알림"** 헤드라인 + 지사제 락업 + 우측 알림카드 목업 3장(D-day·선호일치·분야 칩).
- 스크린샷 4종 신규: 세로 636x1048 3장(`screenshot_portrait_1~3` = 온보딩 선호선택/홈 맞춤추천/상세 AI요약), 가로 1504x741 1장(`screenshot_landscape_1` = 히어로+폰 목업).
- 제작 방식: HTML 시안(Pretendard CDN) → Chrome DevTools MCP 렌더링(뷰포트 emulate, 2x 캡처 → LANCZOS 다운스케일). 시안·스크립트: 이 세션 scratchpad `brand_v3/`(shot_p1~p3, shot_l1, thumb_1932.html), `make_logo_dark.py`. 전 파일 크기 검증 완료(636x1048/1504x741/1932x828/600x600).
- ⚠️ 지금 스크린샷은 **등록용 목업**. 실제 미니앱 개발 후 실캡처로 교체 권장(심사 대비).
- `brand/console/20260705_172847.png`(242x126)는 정체불명 잔존 파일 — 건드리지 않음. 사용자 확인 필요.

**Phase 2 진입 전 확정 조사 (완료)** — 프로덕션 DB 직결은 권한 분류기가 차단(정상) → **공개 API**(`zisaze.com/api/programs?not_expired=true&fields=card`)로 미마감 3,351건 중 3,000건(30페이지 캡) 집계. 스크립트: scratchpad `o6_public_api_survey.js`.

- **O6 category 실분포(분해)**: 고용·창업 346 / 경영 337 / 수출 293 / 기술 283(+기술개발 102) / 금융 211(+자금 161) / 인력 182 / 농림축산어업 162 / 창업 155 / 생활안정 131 / 내수 80. → 계획의 8칩(금융·기술·인력·수출·내수·창업·경영·기타)은 실데이터와 대체로 정합. 온보딩 칩은 선호글에 합쳐지므로 정확 매칭 불필요, 홈 필터는 `category=ilike` 부분매칭이라 "창업"→"고용·창업", "기술"→"기술개발"도 잡힘(단 "자금"은 "금융"에 안 잡힘).
- **ai_target_industries 상위**: 전 업종 1,650(55%) / 제조업 345 / 농림축산 188 / 소프트웨어 155 / 서비스업 140 / 문화콘텐츠 108 / 바이오 77 / 정보서비스 75. KSIC 숫자코드(62, 63, 26…) 노이즈 섞여 있음 → 칩 후보에서 제외할 것.
- **지역 데이터 실태(P2-4)**: `ai_target_regions`가 미마감 공고의 99.97%(2999/3000)에 채워져 있음. 전국 908(~30%), 경기 457+경기도 95처럼 **표기 비정규**("경북"/"경상북도", "진주시" 등 시군구 혼재). `target_region`도 존재. 목록 API에 region 파라미터는 여전히 없음.
- **recommend 지역 반영 확인**: `recommend-matcher.ts`가 users.address_sido/sigungu ↔ ai_target_regions/target_region includes 매칭으로 전국 +8/+5, 시도 +25, 시군구 +30 가점. 즉 **온보딩에서 지역만 받으면 홈 추천(sort=score)에 지역이 자동 반영**됨.
- **온보딩 저장 스펙 확정**: PATCH `/api/users/me` camelCase — `preferenceText`(선호글, 변경 시에만 Gemini 재분류→`preference_signals`), `addressSido`/`addressSigungu`. 응답에 preference_text 포함.

## 사용자 확정 대기 (이번 세션 말 질문)
1. **P2-4 지역필터 방안**: A) MVP 목록 지역필터 제외, 온보딩 시/도 선택→추천 자동 반영(추천안, rich1 무수정) / B) rich1 목록 API에 region 파라미터 추가(수정+배포+표기 정규화 필요) / C) 클라이언트 필터(페이지네이션과 충돌, 비추).
2. **O6 칩 구성**: 관심분야 8칩(금융·기술·인력·수출·내수·창업·경영·기타) 유지 여부 + 업종 칩(제조업/소프트웨어·IT/서비스업/유통·판매/식품/문화콘텐츠/바이오/농림축산, '전 업종' 제외) 추가 여부.

## 남은 일
- **P0-2 [사용자]** 콘솔 앱 등록(한글명 지사제 / appName `zisaze` 불변 / 카테고리 정부지원사업 / 이메일 home143@naver.com / 만19세+ / **"검토 요청"·"출시" 버튼 금지**). 브랜드 자산은 v3로 준비 완료.
- **Phase 2 미니앱 개발**: P2-1 부트스트랩(create-ait-app, granite.config primaryColor=`#3182F6`) → P2-2 API클라이언트(BASE=zisaze.com, JWT, 401 재발급) → P2-3 온보딩(칩+선호글→preferenceText, 지역→addressSido) → P2-4 홈(**recommend sort=score**, category 필터 칩) → P2-5 상세 → P2-6 북마크/hidden → P2-7 설정 → P2-8 품질게이트. 위 확정 2건 답 받으면 착수.

## 주의사항(전 세션에서 계승 — 구현 시 필수)
- users/me는 **PATCH**(PUT 아님, camelCase, dirty만 전송). 홈 추천은 **`/api/recommend?sort=score`**(선호글 있어야 가점). 목록 `/api/programs`엔 지역 필터 없음.
- 실제 브랜드블루 **#3182F6**. `PREF_BONUS_ENABLED='false'`면 가점 OFF. 토스 규약: SSR금지·라이트모드·다크패턴금지·AI고지·해요체.
- P1-1 CORS는 matcher 확장+최상단 가드 "한 세트" — rich1 미들웨어 재수정 시 diff 검토·라이브 검증 필수.
- rich1 배포: `ubuntu@54.116.99.144:~/zisaze`, PM2 `zisaze`, PEM `c:/()안티그래비티/zisaze-crawler/LightsailDefaultKey-ap-northeast-2.pem`, SCP+dos2unix → `npx next build` → `pm2 restart zisaze` → curl 검증.
- 프로덕션 DB 직결(pg)은 훅/분류기 차단 대상 — 조사성 집계는 공개 API로.

## 다음 단계
1. 사용자: P2-4 방안·O6 칩 확정 + P0-2 콘솔 등록(+브랜드 자산 업로드).
2. 확정되면 P2-1 부트스트랩부터 Phase 2 착수(계획서 v2 승인 범위).
