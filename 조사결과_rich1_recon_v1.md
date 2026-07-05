# rich1 연동점 조사 결과 (recon v1)

> 작성: 2026-07-05 (Opus 4.8, 9개 병렬 서브에이전트 읽기전용 조사) · 정본 계획서 `구현계획서_v2.md`의 가정 검증 + 실제 코드 계약 확정
> 목적: Phase 1(rich1 additive)·Phase 2(미니앱) 구현 시 재조사 없이 이 문서를 참조. rich1 루트 = `c:\()안티그래비티\rich1`

---

## A. 핵심 판정 요약 (계획서 가정 검증)

| 영역 | 판정 | 요지 |
|---|---|---|
| A2 Bearer JWT·무쿠키 | ✅ CONFIRMED | 사용자 API 전부 `Authorization: Bearer` 인라인 검증, `cookies()`/`Set-Cookie` 0건 |
| A7-3 **빈 프로필 추천 성립** | ✅ CONFIRMED (단서 있음) | 지역+5, 전업종+10, 형태/규모 무제한 각 +8, 업력 +5 = 기본 ~36점. 선호 가점(최대+50)이 지배 → 선호 분야 사업 상위. **단 2조건 필수**(아래 B2) |
| P1-1 CORS additive | ✅ CONFIRMED | 미들웨어 최상단 가드 + matcher 확장 "한 세트"로 additive 가능, 관리자 흐름 무영향 |
| P1-3 toss/session 발급 | ✅ CONFIRMED | 기존 `createToken()` 재사용 가능, `/api/toss/*` 미존재(신설 필요) |
| 선호 파이프라인 | ✅ CONFIRMED | RANK_WEIGHTS=[40,24,14,8], 상한50, 제목1.0/카테고리0.7, `PREF_BONUS_ENABLED`토글, gemini-2.5-flash |
| 북마크/hidden 무수정 이식 | ✅ CONFIRMED | user_id FK만 신뢰, toss 유저 행이 `public.users`에 있으면 그대로 동작 |
| users 스키마(P1-2/P1-3) | ✅ CONFIRMED | email·password_hash NOT NULL, status default active, `toss_user_key` 부재 |
| P0-3 약관 페이지 부재 | ✅ CONFIRMED | /privacy·/terms **라우트**는 없음. 단 **본문 상수는 이미 존재**(아래 B4) |

---

## B. 계획서 수정 필요 (구현 전 반드시 반영)

**B1. `PUT /api/users/me` → 실제는 `PATCH`.** 라우트는 `GET`·`PATCH`만 export(PUT 핸들러 없음). 미니앱 선호/프로필 저장(P2-3·P2-7)과 P1-5 검증은 **PATCH**로 호출해야 함(PUT이면 405).

**B2. 추천 지배는 `sort=score`일 때만 + 선호 설정 시에만.**
- `/api/recommend` 기본 sort는 `deadline`(마감임박). 이때 선호 가점은 동점 tie-break에 불과.
- 홈 UI는 `?sort=score`로 호출(HomeClient.tsx:205)해야 선호 가점이 1차 정렬키가 됨. **미니앱 홈 추천도 반드시 `sort=score`로 호출.**
- `profile.active`는 `priority_keywords`(선호글 분류결과) 또는 북마크가 있어야 true. **인구통계·지역만 있고 선호글이 없으면 가점 0** → 온보딩 선호 칩(→preference_text)이 진짜 핵심.
- 진짜 100% 빈 프로필(선호도 건너뜀)은 통과 사업이 전부 ~36점 동점 → created_at/ id 순. 이 경우 계획서대로 "선호 설정하기" CTA 노출(P2-4).

**B3. 목록 API `/api/programs`에는 지역 필터 파라미터가 없다.**
- 지원 파라미터: `page,limit,search,category,source,keyword(tips|export_voucher),not_expired,expired_only,strip,fields=card,sort(newest|deadline|amount|popular)`.
- 지역(`ai_target_regions`) 앱단 매칭은 **`/api/recommend`(recommend-matcher)에만** 존재. 목록/상세는 지역을 응답 필드로 내려줄 뿐 필터 안 함.
- 영향: 미니앱 홈 "지역 필터"(P2-4③)는 목록 API로 불가. → 온보딩 지역은 **추천 정확도용(프로필 저장)**으로만 쓰고, 브라우즈 목록의 지역 필터는 (a) 제거하거나 (b) 추천 섹션에만 적용하는 것으로 P2-4 재설계 필요. **[P2 진입 시 사용자 확인 항목]**
- category 필터 실값: `금융·기술·인력·수출·내수·창업·경영·기타`(8개, `.ilike`). 홈 칩의 팁스/수출바우처는 keyword, 소상공인/스타트업 등은 source/search로 분기.

**B4. P0-3 약관 본문은 이미 존재(재사용).** `src/lib/legal/privacy.ts`(`PRIVACY_CONTENT`), `src/lib/legal/terms.ts`(`TERMS_CONTENT`), 시행일 2026-05-22. 현재 `LegalModal`로만 노출(URL 페이지 없음). → /privacy·/terms 라우트를 만들 때 **이 상수를 import**(DRY). 단 현재 본문은 웹 기준이라 **토스 익명키·미니앱 선호 수집 항목 미반영** → 미니앱용 고지 추가 필요.
- 개인정보 책임자 이메일: 방침에 `home143@naver.com`. 계획서 P0-2 고객센터는 `contact@zisaze.com`. **불일치 — 사용자 확정 필요.**

**B5. 브랜드 값.** `primaryColor`라는 설정 키는 rich1에 없음. 실질 CTA/링크 파랑 = **`#2563EB`(accent-600)**, 본문 네이비 = `#1E2E4A`(primary-900). 미니앱 `granite.config` primaryColor = `#2563EB` 채택.

**B6. 합성 이메일/비밀번호 필요.** email NOT NULL UNIQUE + password_hash NOT NULL. toss 유저는 결정적 합성 email(`toss_<hash앞12>@miniapp.zisaze.com`) + 임의 password_hash 필요. `gender`는 CHECK(male/female/null)라 제3값 INSERT 금지.

---

## C. 미니앱이 호출할 API 계약 (실측)

**로그인 응답 형태(=toss/session이 복제할 형태), auth/login/route.ts:53-64**
```
{ success:true, user:{ id, email, companyName, businessType, industryCode, industryName }, token }
```
`createToken({ userId, username, role:'user', type:'user' })` (7일, HS256, JWT_SECRET). Bearer 검증 = 각 라우트 인라인 `verifyToken(token)` → `payload.userId`.

**GET /api/users/me** → `{ success, user:{ ...프로필 전 컬럼, preference_text, hasPushSubscription, pushDevices } }` (preference_signals는 미포함)

**PATCH /api/users/me** (camelCase body, `!==undefined`인 필드만 부분 업데이트):
```
{ companyName, ceoName, ceoBirth, gender, businessStartDate, businessCategory, businessItem,
  industryCode, industryName, industryCodeNts, companySize, employeeCount, recommendationAgreed,
  zipcode, addressRoad, addressDong, addressSido, addressSigungu, preferenceText }
```
→ `preferenceText`가 기존값과 다르면 서버가 `preference_signals=null` 후 gemini 분류 fire-and-forget. **클라 전송 규약: dirty(실제 타이핑)일 때만 `preferenceText` 포함**(로드값 비교 아님).

**GET /api/recommend?sort=score** (Bearer) → 응답 항목 `{ id, title, organization, category, applicationEnd, supportAmount, cardSummary, matchScore, matchReason, ruleScore, program{...full} }`

**GET /api/programs?fields=card&page&limit&search&category&sort** → `{ programs:[{...card컬럼, d_day}], pagination:{page,limit,total,totalPages} }`
**GET /api/programs/[id]** → `{ program:{...full, d_day} }` (비UUID면 400)

**북마크/hidden** (Bearer, GET/POST/DELETE + /ids):
- `POST /api/bookmarks {programId}` → `{success, bookmark}` (upsert 멱등)
- `DELETE /api/bookmarks?programId=` → `{success}`
- `GET /api/bookmarks/ids` → `{success, ids:string[]}`
- hidden 동일(테이블 user_hidden_programs, POST 응답키 `hidden`)

program-fields CARD 컬럼: `id,title,organization,category,application_start,application_end,application_period,support_amount,max_amount,status,source,view_count,ai_eligibility,ai_target_industries,ai_target_regions,target_companies,detail_url`

---

## D. rich1 additive 변경 상세 설계 (Phase 1)

**P1-1 CORS (src/middleware.ts, 기존 admin JWT 블록 무수정):**
1. matcher에 `'/api/:path*'` 추가(기존 admin/collect 2개 유지).
2. `middleware()` 최상단(기존 line24 OPTIONS보다 앞)에 삽입:
   - `const origin = request.headers.get('origin') ?? ''`
   - `const isTossmini = /^https:\/\/[a-z0-9-]+\.(apps|private-apps)\.tossmini\.com$/.test(origin)` (appName=zisaze → `zisaze.apps.tossmini.com` / `zisaze.private-apps.tossmini.com` 매칭)
   - `const isProtected = pathname.startsWith('/api/admin') || pathname.startsWith('/api/collect')`
   - OPTIONS+isTossmini → 204 + ACAO(origin에코)·Allow-Methods·Allow-Headers(Authorization,Content-Type)·Max-Age·Vary:Origin
   - `!isProtected` → `NextResponse.next()` + (isTossmini면 ACAO·Allow-Headers·Vary 세팅) return
   - 이후 기존 admin 게이트 도달은 isProtected뿐 → 무영향. **⚠️ matcher 확장과 early-return은 반드시 한 세트**(빠뜨리면 사용자 API 전부 401).

**P1-2 DDL:** `ALTER TABLE users ADD COLUMN toss_user_key text UNIQUE;` (nullable). SUPABASE_DB_URL pg 직결. **실행 전 사용자 승인 필수.**

**P1-3 POST /api/toss/session (신설, /api/toss/session/route.ts):**
- 입력 `{ anonymousKey }` 검증 → `users`에서 `toss_user_key=key` 조회, 없으면 INSERT(합성 email `toss_<key12>@miniapp.zisaze.com`, 임의 password_hash, `toss_user_key=key`, `status='active'`, terms/privacy_agreed_at=now) → `createToken({userId,username:email,role:'user',type:'user'})` → `{success,user,token}`(login과 동일 형태). IP rate limit.
- `DELETE`(Bearer) → 해당 user + 연관행(bookmarks/hidden CASCADE) 삭제(탈퇴).
- 미들웨어 matcher 확장 후 `/api/toss/session`은 비보호 경로라 CORS 자동 적용.

---

## E. 개인정보 인벤토리 (P0-3 근거) — 미니앱이 저장/수집

- 토스 익명 식별자 → `users.toss_user_key`(신규) + 합성 email/password_hash(로그인 불가값)
- 선호 분야 자유글 → `users.preference_text`(≤500자) + 파생 `users.preference_signals`(JSONB, gemini 분류)
- 선택 프로필: 지역(`address_sido/sigungu/dong/road`,`zipcode`), 업종(`industry_code/name/nts`,`business_category/item`,`company_size`,`employee_count`), 성별(`gender`)
- 북마크(`user_bookmarks`), 관심없음(`user_hidden_programs`)
- 위탁: AWS Lightsail(Seoul), Supabase(Seoul), AI분석 Anthropic/Google Gemini(식별정보 익명화), 사업자정보 조회
- 삭제: 탈퇴 시 user행+연관행 즉시 파기

---

## F. 브랜드 자산 (P0-4 / P2-1 근거) — public/ 실측

- `zisaze-symbol-brand.png` 128×128(심볼 단독) · `icon-512.png` 512×512 · `icon-192/180.png` · `favicon.png` 32×32
- `zisaze-lockup-dark.png`/`-light.png` 각 1200×560(로고+텍스트 락업)
- `og-image.png` 1200×630
- 색: **실제 로고/아이콘 블루 = `#3182F6`**(icon-512.png 실측, 토스 블루 계열). CSS accent-600은 `#2563EB`(globals.css)로 미세하게 다름 → **미니앱 granite.config primaryColor는 아이콘과 일치하는 `#3182F6` 권장**(토스 앱 내 자기 아이콘과 일관, 토스 네이티브 느낌). 네이비 `#1E2E4A`. 한글명 "지사제", 로마자 "Zisaze", 태그라인 "지원사업제도를 모두 모아"
- ⚠️ 토스 로고 규격 600×600(투명불가·각진정사각)은 심볼 128×128이 작음 → icon-512(512×512)를 소스로 리포맷.
- **P0-4 산출(완료):** `brand/console/logo_600x600.png`, `thumbnail_1000x1000.png`, `thumbnail_1932x828.png`(모두 #3182F6 배경+흰 심볼/워드마크). 스크린샷 636×1048은 개발 후 캡처. 생성 스크립트는 scratchpad `make_brand_assets.py`(재현 가능).
