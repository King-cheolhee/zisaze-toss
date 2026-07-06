// rich1 API 실측 계약 (조사결과_rich1_recon_v1.md §C 기준)

// GET /api/programs?fields=card 의 카드 컬럼 + d_day
export interface ProgramCard {
  id: string;
  title: string;
  organization: string | null;
  category: string | null;
  application_start: string | null;
  application_end: string | null;
  application_period: string | null;
  support_amount: string | null;
  max_amount: number | null;
  status: string | null;
  source: string | null;
  view_count: number | null;
  ai_eligibility: string | null;
  ai_target_industries: string[] | null;
  ai_target_regions: string[] | null;
  target_companies: string | null;
  detail_url: string | null;
  d_day: number | null;
}

// GET /api/programs/[id] 의 full 행(카드 컬럼 + 상세 필드)
export interface ProgramFull extends ProgramCard {
  support_type?: string | null;
  support_type_detail?: string | null;
  support_details?: string | null;
  card_summary?: string | null;
  ai_summary?: string | null;
  ai_key_points?: string[] | null;
  application_method?: string | null;
  executing_agency?: string | null;
  toxic_clauses?: string[] | null;
  required_documents?: string[] | null;
  selection_criteria?: string[] | null;
  target_region?: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProgramListResponse {
  programs: ProgramCard[];
  pagination: Pagination;
}

// GET /api/recommend?sort=score 응답 항목 (recommend/route.ts 응답 매핑 실측)
export interface RecommendItem {
  id: string;
  title: string;
  organization: string | null;
  category: string | null;
  applicationEnd: string | null;
  supportAmount: string;
  cardSummary: string | null;
  matchScore: number;
  matchReason: string;
  ruleScore: number;
  ruleReasons: string[];
  program: ProgramFull;
}

export interface RecommendResponse {
  success: true;
  data: RecommendItem[];
  total: number;
  pagination: Pagination;
  message?: string;
}

// POST /api/toss/session 응답 user (toUserResponse)
export interface SessionUser {
  id: string;
  email: string;
  companyName: string | null;
  businessType: string | null;
  industryCode: string | null;
  industryName: string | null;
}

// GET /api/users/me 응답 user (snake_case 컬럼 select 실측)
export interface MeProfile {
  id: string;
  email: string;
  company_name: string | null;
  ceo_name: string | null;
  ceo_birth: string | null;
  gender: "male" | "female" | null;
  business_type: string | null;
  business_number: string | null;
  business_category: string | null;
  business_item: string | null;
  business_start_date: string | null;
  industry_code: string | null;
  industry_name: string | null;
  industry_code_nts: string | null;
  company_size: string | null;
  employee_count: number | null;
  address_sido: string | null;
  address_sigungu: string | null;
  address_dong: string | null;
  address_road: string | null;
  zipcode: string | null;
  recommendation_agreed: boolean | null;
  created_at: string;
  preference_text: string | null;
}

// PATCH /api/users/me 요청 body (camelCase, !==undefined 필드만 부분 업데이트)
export interface MePatch {
  companyName?: string | null;
  ceoName?: string | null;
  ceoBirth?: string | null;
  gender?: "male" | "female" | null;
  businessStartDate?: string | null;
  businessCategory?: string | null;
  businessItem?: string | null;
  industryCode?: string | null;
  industryName?: string | null;
  industryCodeNts?: string | null;
  companySize?: string | null;
  employeeCount?: number | null;
  recommendationAgreed?: boolean;
  zipcode?: string | null;
  addressRoad?: string | null;
  addressDong?: string | null;
  addressSido?: string | null;
  addressSigungu?: string | null;
  preferenceText?: string;
}

// GET /api/bookmarks 항목: programs full 행 + d_day + bookmarkedAt
export interface BookmarkItem extends ProgramFull {
  bookmarkedAt: string;
}

export interface ProgramListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sort?: "newest" | "deadline" | "amount" | "popular";
}
