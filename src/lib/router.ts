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

// 현재 해시 경로(선행 # 제거). 최초 진입 시 ""는 홈 "/"과 같은 화면이므로 동치로 정규화한다.
function currentPath(): string {
  const p = location.hash.replace(/^#/, "");
  return p === "" ? "/" : p;
}

export function navigate(path: "home" | "bookmarks" | "settings"): void {
  const target = path === "home" ? "/" : `/${path}`;
  // 활성 탭을 다시 눌러도 같은 해시 대입이 히스토리를 한 칸 쌓는 것 방지(뒤로가기 중복) — 현재와 같으면 no-op
  if (currentPath() === target) return;
  location.hash = target;
}

// 상세 진입 직전의 body 스크롤 스냅샷. hashchange 이후(리액트 커밋 뒤)에는 탭 트리가
// hidden으로 접혀 window.scrollY가 0으로 클램프되므로, 해시를 바꾸기 전에 캡처해야 한다.
// App이 상세→탭 복귀 시 이 값으로 복원한다(리뷰 P2: 저장 시점 보정).
let scrollBeforeProgram = 0;

export function getScrollBeforeProgram(): number {
  return scrollBeforeProgram;
}

export function navigateToProgram(id: string): void {
  const target = `/program/${encodeURIComponent(id)}`;
  if (currentPath() === target) return;
  scrollBeforeProgram = window.scrollY;
  location.hash = target;
}

export function goBack(): void {
  history.back();
}
