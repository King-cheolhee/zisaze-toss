// 온보딩 완료/건너뜀 플래그 (네이티브 Storage 키)
export const ONBOARDED_KEY = "zisaze.onboarded";

// O6 확정 칩 (2026-07-06 사용자 확정 — 실데이터 3,000건 집계 대조 완료)
// 분야 = programs.category 8분류, 업종 = ai_target_industries 상위('전 업종'·KSIC 숫자코드 제외)
export const FIELD_CHIPS = ["금융", "기술", "인력", "수출", "내수", "창업", "경영", "기타"] as const;

export const INDUSTRY_CHIPS = [
  "제조업",
  "소프트웨어/IT",
  "서비스업",
  "유통/판매",
  "식품",
  "문화콘텐츠",
  "바이오",
  "농림축산",
] as const;

// addressSido 저장값 = 약칭 17종.
// 근거: recommend-matcher는 normalizeSido(주소)를 ai_target_regions 각 항목의 includes()로 비교하는데,
// 실데이터(미마감 3,000건) 표기 집계에서 약칭이 정식명보다 매칭 커버리지가 항상 같거나 높음
// (예: "전북" 59건 vs "전라북도" 4건, "충북" 50건 vs "충청북도" 16건 — 2026-07-06 공개 API 집계).
export const SIDO_LIST = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

// 홈 목록 카테고리 필터 칩 (rich1 /api/programs category=ilike 실값 8종)
export const CATEGORY_FILTERS = ["금융", "기술", "인력", "수출", "내수", "창업", "경영", "기타"] as const;

const PREFERENCE_TEXT_MAX = 500;

// 온보딩 칩 선택 → preference_text 합성 (§2 A7-1).
// 이 문장이 서버의 기존 선호 파이프라인(Gemini 분류 → priority_keywords → 추천 가점)에 그대로 들어간다.
export function composePreferenceText(
  fields: string[],
  industries: string[],
  freeText: string,
): string {
  const parts: string[] = [];
  if (fields.length > 0) parts.push(`${fields.join(", ")} 분야의 지원사업을 선호합니다.`);
  if (industries.length > 0) parts.push(`업종은 ${industries.join(", ")}입니다.`);
  const free = freeText.trim();
  if (free) parts.push(free);
  return parts.join(" ").slice(0, PREFERENCE_TEXT_MAX);
}
