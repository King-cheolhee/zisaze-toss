# zisaze-toss 세션 v4 (2026-07-06)

정본 계획서 `구현계획서_v2.md`, 연동점 지도 `조사결과_rich1_recon_v1.md`, 이전 세션 `zisaze-toss_session_v3.md`, 워크플로 설계 `워크플로_제출준비_v1.md`. 이 문서는 이번 세션 인계용.

## 이번 세션에 한 일 — **Phase 3 "제출 직전" 준비 완료 (워크플로 오케스트레이션)**

워크플로_제출준비_v1 §6 지시문대로 Workflow 도구로 fan-out 실행(사용자 승인: Workflow 방식 + 전부 범위).

**Phase 1 감사 — 전항 통과**
- 워크플로 `zisaze-audit`(리뷰 에이전트 4개 병렬, opus·high): H1~H8 / H9~H17 / 연동계약 INT-1~10 / 체크리스트 CL-1~10 = **37항목 fail 0** (pass 32·warn 4·na 1). rich1 수정 요구 발견 0 → 정지 미발동.
- cso 게이트: Sev≥MEDIUM 0건. npm audit 31건은 전부 빌드 체인(granite CLI의 fastify/babel 등) — 런타임 `.ait` 웹 번들 비포함, "No fix"(토스 SDK 고정)라 **수용**. SDK 업데이트 시 재확인.
- ponytail-audit 게이트: "Lean already. Ship."(의존성 3개, 자체 해시 라우터 53줄). 사소 2건(toggle 중복·CATEGORY_FILTERS 동값)은 churn 판단으로 미수정.

**Phase 2 코드 보완 — 16건 반영 (`src` 8파일 + index.css)**
- 워크플로 `zisaze-fix`(코딩 opus·max → 3렌즈 리뷰 병렬 → P1 반영): recodex P2 5건 + 감사 신규 4건(CL-7 재시도 4곳, CL-5 토스트 cleanup, INT-6 절단 방어, 모달 ESC 포함) 수정.
- 3렌즈 리뷰 P1 0·P2 3 → P2 3건 직접 수정: ①**홈만** keep-mounted(북마크·설정은 언마운트 유지 — 상세 토글 stale 방지) ②스크롤 캡처를 navigateToProgram의 **해시 변경 전**으로(커밋 후엔 0으로 클램프) ③모달 버튼 disabled→**aria-disabled**+가드(포커스 트랩 유지)+role="alert".
- **recodex(Codex GPT-5.5 xhigh) 교차: P1 4건 전부 반영** — ①dirty 비교를 canonical(파싱→재합성 정규형)로 ②타임아웃 범위를 res.json()까지(fetchJson) ③복원을 **orderRef(로드 시점 순서)** 기준으로 — 6가지 도착 순서 전수 검산 OK ④Tab 트랩 모달 밖 포커스 회수. Codex P2 2건은 보류(비정규 해시 가드·렌더 중 ref — 실사용 미발생/무해 판단, 아래 "사용자 확인").
- 검증: `npx tsc -b`·`npx eslint .` EXIT 0(3회), 실브라우저 E2E — 온보딩→홈 추천(창업·경기 상위)→상세→back 시 **스크롤 정확 복원 실증**(1976→0→1976), keep-mounted로 복귀 시 API 재요청 없음, 삭제 모달 a11y 트리에 dialog+description+초기 포커스 반영, 삭제→새 사용자 재시작. 콘솔 에러 0.

**Phase 3 심사 스크린샷 실캡처 — brand/console 4종 교체**
- 기존 목업의 **반려 위험 요소 제거**: 목업에 알림 벨·자체 뒤로가기 헤더(H8 위반 소지)·"마감 전에 잊지 않도록"(미구현 알림 암시) 존재했음 → 실캡처로 전면 교체.
- 기법(세컨드브레인 html-chrome-mcp-pixel-assets): 375×618 뷰포트 DPR2 캡처(750×1236) → PIL LANCZOS 636×1048. 가로는 배너 HTML 재구성(실캡처 폰목업 + 실기능 카피 "선호에 맞는 공고만/AI 요약/북마크") 1504×741×2→축소. 4종 전부 크기 스크립트 검증 OK.
- 구성: ①온보딩(칩 선택+AI 고지+건너뛰기 보임 — H16·H9 어필) ②홈(선호 기반 추천 라벨+실데이터) ③상세(정보표+AI 요약 배지+원문 보기 — H16·H11 어필) ④가로 배너.

**Phase 4 빌드 검증 + 문서**
- `npm run build` → zisaze.ait 3.8MB, **압축해제 21.1MB<100MB**(H7), 웹 JS 242KB(gzip 75KB), **eval/new Function 0건·window.open 잔존 0건**(H2), dist/web 정적 서빙 실렌더 확인("토스 앱 안에서만 사용할 수 있어요"+재시도 = 기대 동작, 백지 아님).
- 문서 신규 2종: **`검수메모_P3-4_v1.md`**(콘솔 붙여넣기용+Q&A 대비), **`실기기테스트_P3-3_v1.md`**(R1 hash 게이트 A~G 체크리스트, 사용자 실행용).
- lesson 2건 저장: optimistic-remove-restore-order / keep-mounted-tab-state-pitfalls.

## 남은 일 (전부 [사용자] — AI 자율 범위 완료, 제출 직전 정지 상태)
1. **P0-2 콘솔 앱 등록**: 지사제 / appName `zisaze`(불변!) / 정부지원사업 / home143@naver.com / 만19세+. 브랜드 자산 `brand/console/` 준비 완료(로고·썸네일·실캡처 스크린샷 4종). 앱 설명은 검수메모_P3-4_v1.md 하단 "설명란 주의" 준수(MVP 기능만).
2. **P3-2 샌드박스**: 콘솔에 `zisaze.ait` 업로드 → QR → 본인 토스앱 테스트.
3. **P3-3 실기기 검증**: `실기기테스트_P3-3_v1.md` A~G 순서대로(핵심 = C1 재설치 후 북마크 유지 → R1 게이트).
4. **P3-5 검토 요청**: R1 통과 후 검수메모 붙여넣고 사용자가 직접 클릭. (**"검토 요청"·"출시" 버튼은 AI 금지 유지**)
5. (선택) Codex P2 2건 처리 여부: 비정규 해시 가드·렌더 중 ref 정리 — 권장: 보류(실익 없음).

## 주의사항
- dev 사용자 1명(devkey, 선호=기술·창업·제조업+경기)이 프로덕션 DB에 있음 — MCP Chrome 프로필 localStorage 기반. 정리하려면 설정→내 데이터 삭제(단 reload 시 빈 사용자 1명은 다시 생기는 구조 — 세션 v3과 동일 상태라 수용).
- constants.ts의 PREFERENCE_TEXT_MAX는 비공개로 유지(한때 export했다가 canonical 방식 채택으로 롤백).
- SettingsScreen의 canonicalPreference()는 parsePreferenceText·composePreferenceText와 한 몸 — 합성 규약 변경 시 셋을 같이 본다.
- 이번 세션 rich1 무변경(원칙 준수). npm audit 31건은 수용 판정(위 참조) — 고치려 들지 말 것.
- 워크플로 스크립트·journal은 세션 디렉터리에 보존(resume 가능): zisaze-audit(wf_8b59aa13-202)·zisaze-fix(wf_51a9aed0-f4d).

## 다음 단계
1. [사용자] 콘솔 등록 → 번들 업로드 → QR 테스트(위 남은 일 1~2).
2. [사용자+AI] 실기기 R1 게이트 — 실패 시 계획서 §7 R1 대응(Storage 재매핑→appLogin 전환) 발동, AI가 코드 작업.
3. [사용자] 검토 요청 → 반려 시 사유 공유하면 AI가 분석·수정.
