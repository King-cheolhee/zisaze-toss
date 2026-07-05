# zisaze-toss 세션 v1 (2026-07-05)

정본 계획서 `구현계획서_v2.md`, 연동점 지도 `조사결과_rich1_recon_v1.md`. 이 문서는 이번 세션 인계용.

## 이번 세션에 한 일

**조사(완료)**
- 계획서 v2 정독 + rich1 `docs/AI_ONBOARDING.md` 확인.
- rich1 9개 서브시스템 병렬 조사(읽기전용) → **계획서 최대 가정 "빈 프로필 추천 성립" CONFIRMED** + 정정 6건. 상세: `조사결과_rich1_recon_v1.md`.

**Phase 0 결정(확정)** — appName=`zisaze`(불변), 콘솔 워크스페이스 재사용, MVP 승인, 사업자번호 미수집, hidden 여유시 포함, 문의 이메일 `home143@naver.com`, 로고 리포맷, GitHub 비공개 원격 생성.

**실행(완료)**
- **P0-5** git 저장소 + GitHub 비공개 원격 `git@github.com:King-cheolhee/zisaze-toss.git` main push. `.claude` 훅파일 gitignore.
- **P0-4** 브랜드 자산 초안 3종 `brand/console/`(logo_600x600, thumbnail_1000x1000, thumbnail_1932x828). 기존 로고(icon-512) 리포맷, 실제 브랜드블루 `#3182F6`. → **[사용자 확정 대기]**. 생성 스크립트: scratchpad `make_brand_assets.py`. 스크린샷은 개발 후 캡처.
- **P0-3** rich1 `/privacy`·`/terms` 정적 페이지 + 미니앱 개인정보 추가고지. **dev·main 반영(`95d6a6c`) + 라이브 배포·검증 완료**(privacy/terms/home 전부 200, 미니앱 고지·기존 본문 노출 확인). 기존 웹 무영향(신규 라우트만).
- **P0-4 v2** 브랜드 자산을 **실제 지사제 로고 파일**로 재작업(사용자 요청) — 흰 배경+실제 심볼(icon-512 색반전)+"지사제." 락업. 스크립트 `make_brand_assets_v2.py`. → **[사용자 확정 대기]**.
- **P1-2 DDL 완료·검증** — `users.toss_user_key`(text, nullable) + UNIQUE 인덱스 라이브 반영. users 53→53행, NOT NULL 0건(기존 회원 무영향). 마이그레이션 기록 `2026-07-05_users_toss_user_key.sql`(rich1 main `329ab3d`). 실행 스크립트 scratchpad `ddl_toss_user_key.js`(SUPABASE_DB_URL pg 직결).

- **Phase 1 전체 완료(라이브)** — rich1 main `fadf238`:
  - **P1-1 CORS 미들웨어**: matcher `/api/:path*` 확장 + 최상단 `!isProtected` 가드(한 세트). tossmini(zisaze 정확일치) 오리진만 CORS. 검증: preflight 204+ACAO, 비-tossmini ACAO 없음, admin 401 유지, home/programs 200.
  - **P1-3 `/api/toss/session`**: POST(anonymousKey→users upsert, 합성 email=키SHA256, 무작위 pw, 차단검사)·DELETE(원자 삭제, toss유저만). Codex 보안리뷰 반영 하드닝(cf-connecting-ip rate limit·메모리정리 등). 검증: 발급→users/me 200→멱등→탈퇴 200.
  - **P1-4 배포**: 6파일 SCP+build+restart, 회귀·CORS·세션 E2E 전부 통과.
  - **P1-5 빈프로필 추천 실증(핵심 가정 CONFIRMED)**: 선호글만 저장→Gemini `priority_keywords` 생성→`/api/recommend?sort=score` 상위10 전부 선호 매칭·전항목 가점(score>rule). R9 폴백 불필요 확정.

## 남은 일
- **P0-2 [사용자]** 콘솔 앱 등록(체크리스트 전달됨): 한글명 지사제 / appName **zisaze**(불변) / 카테고리(정부지원사업) / 이메일 home143@naver.com / 연령 만19세+. **"검토 요청"·"출시" 버튼 금지.**
- **P0-4 [사용자]** 브랜드 자산 v2 확정.
- **Phase 2 미니앱 개발(`zisaze-toss/`)**: P2-1 부트스트랩(create-ait-app, granite.config primaryColor=**#3182F6**), P2-2 API클라이언트(BASE=zisaze.com, JWT저장, 401재발급), P2-3 온보딩(핵심), P2-4 홈(**recommend는 sort=score**), P2-5 상세, P2-6 북마크/hidden, P2-7 설정, P2-8 품질게이트.
  - ⚠️ 진입 전 확정: O6 선호칩 실데이터(category 8개=금융·기술·인력·수출·내수·창업·경영·기타 + ai_target_industries 분포), **P2-4 지역필터 재설계**(목록 API엔 지역필터 없음).
  - 프로필 저장은 **PATCH** /api/users/me(camelCase, dirty). 토스 규약: SSR금지·라이트모드·다크패턴금지·AI고지·해요체.

## 주의사항(핵심 정정 — 구현 시 필수)
- **users/me는 PATCH**(PUT 아님). 홈 추천은 반드시 **`/api/recommend?sort=score`**(+선호글 있어야 가점). 목록 `/api/programs`엔 **지역 필터 없음** → P2-4 지역필터 재설계 필요.
- 실제 브랜드블루 **#3182F6**(granite.config primaryColor). users email·password_hash NOT NULL → 합성값. `PREF_BONUS_ENABLED='false'`면 가점 OFF.
- **P1-1 CORS는 matcher 확장 + 최상단 가드 "한 세트"**(빠뜨리면 사용자 API 전부 401) → 배포 전 diff 검토·라이브 검증 필수(보안 미들웨어 수정).
- **rich1 배포 절차(검증됨)**: 서버 `ubuntu@54.116.99.144:~/zisaze`, PM2 `zisaze`, PEM `c:/()안티그래비티/zisaze-crawler/LightsailDefaultKey-ap-northeast-2.pem`. `.git` 없음 → SCP+dos2unix → `npx next build`(먼저 성공 확인) → `pm2 restart zisaze` → curl 검증. dev→main은 라이브 검증 후 fast-forward.
- 토스 콘솔 "검토 요청"·"출시" 버튼은 사용자만.

## 다음 단계
1. P1-2 DDL 승인 → P1-1 CORS(diff 검토) + P1-3 toss/session 코드 → 한 번에 배포(P1-4) → P1-5 검증.
2. Phase 2 진입 전: O6 선호칩 실데이터 확정, P2-4 지역필터 재설계.
