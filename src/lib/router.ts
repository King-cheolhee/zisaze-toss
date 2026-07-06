import { useSyncExternalStore } from "react";

// 해시 기반 라우터 (H3: history.pushState/replaceState 직접 조작 금지 —
// location.hash 할당은 브라우저 표준 내비게이션이라 히스토리가 자연히 쌓여
// 토스 내비바 뒤로가기·안드로이드 하드웨어 뒤로가기와 호환된다)

export type Route =
  | { name: "home" }
  | { name: "program"; id: string }
  | { name: "bookmarks" }
  | { name: "settings" };

function parseHash(): Route {
  const seg = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (seg[0] === "program" && seg[1]) {
    // 잘못된 퍼센트 인코딩(%E0%A 등)이 decodeURIComponent에서 던지면 홈으로 폴백
    try {
      return { name: "program", id: decodeURIComponent(seg[1]) };
    } catch {
      return { name: "home" };
    }
  }
  if (seg[0] === "bookmarks") return { name: "bookmarks" };
  if (seg[0] === "settings") return { name: "settings" };
  return { name: "home" };
}

let current: Route = parseHash();

function subscribe(onChange: () => void) {
  const handler = () => {
    current = parseHash();
    onChange();
  };
  window.addEventListener("hashchange", handler);
  return () => window.removeEventListener("hashchange", handler);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current);
}

export function navigate(path: "home" | "bookmarks" | "settings"): void {
  location.hash = path === "home" ? "/" : `/${path}`;
}

export function navigateToProgram(id: string): void {
  location.hash = `/program/${encodeURIComponent(id)}`;
}

export function goBack(): void {
  history.back();
}
