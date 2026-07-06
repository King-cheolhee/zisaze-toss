# zisaze-toss 세션 v3 (2026-07-06)

정본 계획서 `구현계획서_v2.md`, 연동점 지도 `조사결과_rich1_recon_v1.md`, 이전 세션 `zisaze-toss_session_v2.md`. 이 문서는 이번 세션 인계용.

## 이번 세션에 한 일 — **Phase 2 (P2-2~P2-8) 전체 완료**

**P2-2 API 클라이언트 (`c71c254`)**
- `src/lib/api.ts`(세션·엔드포인트 전체) + `types.ts`(rich1 실측 계약 타입) + `bridge.ts`(브릿지 안전 래퍼).
- BASE: 프로덕션=`https://www.zisaze.com` 직호출 / 개발=vite 프록시(same-origin, `vite.config.ts` — localhost는 tossmini CORS 밖이라 필수). `VITE_API_BASE`로 오버라이드 가능.
- JWT는 SDK Storage(폴백 localStorage)에 저장, 401 시 세션 재발급 1회 재시도(in-flight 공유).
- **브릿지 핵심 발견**: 토스 브릿지는 호스트 밖에서 ①즉시 throw("ReactNativeWebView is not available") 또는 ②promise 무응답(영원히 pending, bridge-core postMessage 확인). → 모든 브릿지 호출은 타임아웃+폴백 래퍼 필수. 개발 브라우저는 `devkey_*` 로컬 고정 키로 세션 발급.
- 검증: 프록시 경유 `/api/programs?fields=card` 실데이터 응답 확인.

**P2-3~P2-7 전 화면 (`785c94b`)**
- 온보딩 2스텝(분야 8칩+업종 8칩+자유입력 / 시·도 17), 전 스텝 건너뛰기(H9), AI 고지 인라인(H16). 완료 플래그 `zisaze.onboarded`(Storage). 재설치 시 서버 preference_text/address_sido 있으면 온보딩 생략.
- 홈: 추천 섹션(`/api/recommend?sort=score` 상위 5, "회원님의 선호 기반 추천" 라벨+설정 딥링크) / 빈 프로필이면 CTA 카드. 전체 목록(fields=card, not_expired, 20개+더보기), category 칩 8종(ilike), 검색, 마감임박↔최신 정렬 토글. **지역필터 없음(A안 확정)**.
- 상세: 정보 표+AI 요약 섹션("AI 요약" 배지+한계 고지)+원문 보기(`openURL`)+북마크 토글.
- 북마크 탭(추가순↔마감임박 토글, 해제), 추천 카드 "관심 없어요"(hidden).
- 설정: 선호 칩 프리로드(합성 preference_text 역파싱, 형식 불일치 시 자유입력으로), 시·도+시·군·구, 내 데이터 삭제(모달 좌측 '닫기' H15 → DELETE 세션 → 새 사용자 재시작), privacy/terms 링크(openURL), 문의 home143@naver.com.
- 라우팅: **해시 라우터 자체 구현**(H3 — history API 직접 조작 없음, react-router 미도입). 하단 탭 3개.
- **시/도 저장값 = 약칭 17종**("서울","경기","경북"…): 실데이터 3,000건 표기 집계에서 약칭이 정식명보다 매칭 커버리지 항상 ≥ (예: "전북" 59건 vs "전라북도" 4건). matcher는 `normalizeSido(주소)`를 `region.includes()`로 비교. 집계 스크립트: scratchpad `sido_spelling_survey.js`.
- 선호 합성 규약: `"{분야칩들} 분야의 지원사업을 선호합니다. 업종은 {업종칩들}입니다. {자유입력}"` (≤500자) — 설정 화면 역파싱과 한 쌍(`constants.ts`/`SettingsScreen.tsx` 동시 수정 필요).

**E2E 검증(브라우저, 실서버 API — 전부 증거 확보)**
- 온보딩(창업+소프트웨어/IT+경기) → preference_text 저장 → Gemini 분류 → **가점 +40 적용**(matchScore 113 vs ruleScore 73), 추천 풀 978건, 상위 전부 창업·경기 사업.
- 건너뛰기 → 저장 없음(전부 null) + 홈 CTA 카드. 재진입 시 온보딩 재노출 없음.
- 북마크 토글→서버 ids 반영→탭 목록→해제. "관심 없어요"→hidden 등록→추천에서 제외 실증.
- 설정 프리로드(칩 역파싱)→수출 추가+성남시 저장→재분류→추천에 수출 사업 신규 진입.
- 데이터 삭제→모달(닫기/삭제하기)→서버 삭제→reload→새 user id로 온보딩 재시작.
- 콘솔 에러 0건, tsc·eslint 통과.

**P2-8 품질 게이트 (`66b82b7`) — 전항 통과**
- ①웹 번들 `eval(`/`new Function` 0건(H2), 빌드에 window.open 잔존 0건 ②`.ait` 압축해제 21.1MB<100MB(H7), 웹 JS 238KB(gzip 74KB) ③해요체 전수 검수 통과(H15) ④셀프체크: SSR 없음·history 조작 없음·다크 분기 없음·외부 이동 openURL만 ⑤**Slow 3G+CPU4x FCP 5.7초<10초**(H6, dist/web 정적 서빙 측정).

**recodex 교차리뷰 P1 12건 반영 (`767baa3`)** — 계정 전환 감지(익명키 기록·불일치 시 세션 파기), 프로필 조회 실패→재시도 화면(온보딩 오인 방지), Storage 개별 실패 폴백, 온보딩 플래그 await, 북마크 조회↔토글 경쟁, 낙관적 제거 실패 복원, 목록 실패 시 이전 결과 제거, 시/도 변경 시 시/군/구 초기화, 저장 중 입력 잠금, openURL http(s) 스킴 검증, 라우터 디코딩 크래시 방어, 삭제 서버/로컬 분리. 반영 후 tsc·eslint·빌드·부트 회귀 통과.

**recodex P2 (미수정 — 다음 세션 사용자 확인)**
1. 상세→뒤로 시 홈 상태(검색·필터·스크롤) 초기화 2. API fetch 타임아웃/Abort 없음 3. 삭제 모달 접근성(포커스 트랩·ESC) 4. 활성 탭 재클릭 시 해시 히스토리 중복.

## 남은 일
- **P0-2 [사용자]** 콘솔 앱 등록(지사제/appName `zisaze` 불변/정부지원사업/home143@naver.com/만19세+/**"검토 요청"·"출시" 금지**). 브랜드 자산 v3 준비 완료.
- **Phase 3**: P3-1 자가 체크리스트 전수 → P3-2 샌드박스 QA([사용자] 번들 업로드+QR — `npm run build`가 `zisaze.ait` 생성, `npm run deploy`(ait deploy)는 콘솔 연동 필요) → P3-3 **실기기 hash 영속성 검증(R1 게이트)** → P3-4 검수 메모 → P3-5 [사용자] 검토 요청.
- 심사용 스크린샷을 실캡처로 교체 권장(현재 brand/console은 목업).
- recodex P2 4건 처리 여부 사용자 확인.

## 주의사항
- 온보딩 업종 칩은 **선호글로만** 합성(users.industry_* 정식 필드는 안 씀 — 잘못 넣으면 추천 풀 축소). 설정도 동일.
- users/me는 PATCH(camelCase). 추천은 `sort=score` 필수. preferenceText는 서버가 변경 여부 자체 비교(중복 전송 무해).
- 개발용 dev 사용자 1명이 프로덕션 DB에 남아 있음(`devkey_*`, 브라우저 localStorage 기반) — 정리하려면 설정→내 데이터 삭제. 테스트 잉여 사용자 1명은 이번 세션에서 삭제 완료.
- rich1 배포·CORS 주의사항은 v2 문서 참조(이번 세션 rich1 무변경).
- 프로덕션 `.ait`를 일반 브라우저에서 열면 "토스 앱 안에서만 사용할 수 있어요" 화면이 정상 동작.

## 다음 단계
1. [사용자] P0-2 콘솔 앱 등록 + 자산 업로드 → 샌드박스 번들 업로드 협업.
2. [AI] P3-1 자가 체크리스트 전수 점검 + P3-4 검수 메모 초안.
3. [사용자+AI] P3-2/P3-3 샌드박스·실기기 검증(특히 R1 hash 영속성 — 실패 시 §7 R1 대응).
