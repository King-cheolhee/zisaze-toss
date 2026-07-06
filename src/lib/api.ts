import { kvGet, kvRemove, kvSet, resolveAnonymousKey } from "./bridge";
import type {
  BookmarkItem,
  MePatch,
  MeProfile,
  ProgramFull,
  ProgramListParams,
  ProgramListResponse,
  RecommendResponse,
  SessionUser,
} from "./types";

// BASE: 프로덕션(.ait, tossmini CDN)은 절대 URL 직호출(P1-1 CORS 허용 오리진).
// 개발(localhost)은 빈 문자열 → vite 프록시(same-origin)로 우회.
const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.DEV ? "" : "https://www.zisaze.com");

const TOKEN_KEY = "zisaze.token";
const ANON_KEY = "zisaze.anonymousKey";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let tokenCache: string | null = null;
let tokenLoaded = false;
let issuing: Promise<string> | null = null;

async function loadToken(): Promise<string | null> {
  if (!tokenLoaded) {
    tokenCache = await kvGet(TOKEN_KEY);
    tokenLoaded = true;
  }
  return tokenCache;
}

// 익명키 → JWT 발급(P1-3). 동시 401이 몰려도 발급은 1회만(in-flight 공유).
function issueSession(knownKey?: string): Promise<string> {
  if (!issuing) {
    issuing = (async () => {
      const anonymousKey = knownKey ?? (await resolveAnonymousKey());
      const res = await fetch(`${API_BASE}/api/toss/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymousKey }),
      });
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        user?: SessionUser;
        token?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.success || !data.token) {
        throw new ApiError(res.status, data?.error ?? "세션 발급에 실패했어요.");
      }
      tokenCache = data.token;
      tokenLoaded = true;
      await kvSet(TOKEN_KEY, data.token);
      await kvSet(ANON_KEY, anonymousKey); // 토큰이 어떤 익명키로 발급됐는지 기록(계정 전환 감지용)
      return data.token;
    })().finally(() => {
      issuing = null;
    });
  }
  return issuing;
}

export async function ensureSession(): Promise<string> {
  return (await loadToken()) ?? issueSession();
}

// 앱 부트 전용: 현재 토스 익명키가 저장된 토큰의 주인과 같은지 확인한다.
// 다르면(토스 계정 전환·기기 이전 등) 이전 사용자 토큰을 파기하고 새 세션을 발급한다
// (recodex P1: 저장 토큰이 다른 사용자의 프로필·북마크에 접근하는 문제 차단).
export async function bootstrapSession(): Promise<{ identityChanged: boolean }> {
  const key = await resolveAnonymousKey();
  const storedKey = await kvGet(ANON_KEY);
  const identityChanged = storedKey !== null && storedKey !== key;
  if (identityChanged) await clearSession();
  else if (storedKey === null) await kvSet(ANON_KEY, key); // 기존 설치도 다음 부트부터 감지 가능하게 기록
  await ((await loadToken()) ?? issueSession(key));
  return { identityChanged };
}

export async function clearSession(): Promise<void> {
  tokenCache = null;
  tokenLoaded = true;
  await kvRemove(TOKEN_KEY);
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false } = options;

  const doFetch = (token: string | null) => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let token = auth ? await ensureSession() : null;
  let res = await doFetch(token);

  // 401 → 세션 재발급 1회 재시도 (P2-2 규약. 토큰은 익명키로 언제든 재발급 가능)
  if (auth && res.status === 401) {
    await clearSession();
    token = await issueSession();
    res = await doFetch(token);
  }

  const data = (await res.json().catch(() => null)) as
    | (T & { success?: boolean; error?: string })
    | null;
  if (!res.ok || data === null || data.success === false) {
    throw new ApiError(res.status, data?.error ?? `요청에 실패했어요. (${res.status})`);
  }
  return data;
}

// ---------- 공개 API (인증 불필요) ----------

export function fetchPrograms(params: ProgramListParams = {}): Promise<ProgramListResponse> {
  const q = new URLSearchParams({ fields: "card", not_expired: "true" });
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.category) q.set("category", params.category);
  if (params.sort) q.set("sort", params.sort);
  return apiFetch<ProgramListResponse>(`/api/programs?${q.toString()}`);
}

export async function fetchProgram(id: string): Promise<ProgramFull> {
  const data = await apiFetch<{ program: ProgramFull }>(`/api/programs/${encodeURIComponent(id)}`);
  return data.program;
}

// ---------- 사용자 API (Bearer) ----------

export function fetchRecommendations(page = 1, limit = 12): Promise<RecommendResponse> {
  return apiFetch<RecommendResponse>(`/api/recommend?sort=score&page=${page}&limit=${limit}`, {
    auth: true,
  });
}

export async function fetchMe(): Promise<MeProfile> {
  const data = await apiFetch<{ user: MeProfile }>("/api/users/me", { auth: true });
  return data.user;
}

export async function updateMe(patch: MePatch): Promise<MeProfile> {
  const data = await apiFetch<{ user: MeProfile }>("/api/users/me", {
    method: "PATCH",
    body: patch,
    auth: true,
  });
  return data.user;
}

export async function fetchBookmarks(sort: "deadline" | "added" = "added"): Promise<BookmarkItem[]> {
  const data = await apiFetch<{ data: BookmarkItem[]; total: number }>(
    `/api/bookmarks?sort=${sort}`,
    { auth: true },
  );
  return data.data;
}

export async function fetchBookmarkIds(): Promise<string[]> {
  const data = await apiFetch<{ ids: string[] }>("/api/bookmarks/ids", { auth: true });
  return data.ids;
}

export function addBookmark(programId: string): Promise<unknown> {
  return apiFetch("/api/bookmarks", { method: "POST", body: { programId }, auth: true });
}

export function removeBookmark(programId: string): Promise<unknown> {
  return apiFetch(`/api/bookmarks?programId=${encodeURIComponent(programId)}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function fetchHiddenIds(): Promise<string[]> {
  const data = await apiFetch<{ ids: string[] }>("/api/hidden/ids", { auth: true });
  return data.ids;
}

export function addHidden(programId: string): Promise<unknown> {
  return apiFetch("/api/hidden", { method: "POST", body: { programId }, auth: true });
}

export function removeHidden(programId: string): Promise<unknown> {
  return apiFetch(`/api/hidden?programId=${encodeURIComponent(programId)}`, {
    method: "DELETE",
    auth: true,
  });
}

// 내 데이터 삭제(탈퇴, H17): 서버 행 삭제 후 로컬 토큰 파기
export async function deleteMyData(): Promise<void> {
  await apiFetch("/api/toss/session", { method: "DELETE", auth: true });
  await clearSession();
}
