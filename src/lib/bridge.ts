import { Storage, getAnonymousKey, openURL } from "@apps-in-toss/web-framework";

// 토스 네이티브 브릿지는 호스트(토스 앱) 밖에서는 postMessage 응답이 없어
// Promise가 영원히 안 끝난다(bridge-core 확인). 모든 브릿지 호출은 타임아웃으로 감싸고,
// 일반 브라우저(개발 환경)에서는 웹 표준 API로 폴백한다.

class BridgeTimeoutError extends Error {
  constructor(name: string) {
    super(`${name} 브릿지 응답이 없어요.`);
    this.name = "BridgeTimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new BridgeTimeoutError(name)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

const STORAGE_TIMEOUT_MS = 1500;
const KEY_TIMEOUT_MS = 5000;

// 네이티브 Storage 우선, 브릿지 부재 시 localStorage 폴백.
// 폴백 여부를 한 번 판정하면 캐시해 이후 호출은 타임아웃 대기 없이 즉시 처리.
// 단, 판정과 무관하게 "이번 호출"이 실패하면 반드시 localStorage로 폴백한다
// (recodex P1: 한 번 성공 후 실패하면 쓰기·삭제가 조용히 유실되던 문제).
let nativeStorageAvailable: boolean | null = null;

async function tryNative<T>(op: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  if (nativeStorageAvailable === false) return { ok: false };
  try {
    const value = await withTimeout(op(), STORAGE_TIMEOUT_MS, "Storage");
    nativeStorageAvailable = true;
    return { ok: true, value };
  } catch {
    if (nativeStorageAvailable === null) nativeStorageAvailable = false;
    return { ok: false };
  }
}

export async function kvGet(key: string): Promise<string | null> {
  const r = await tryNative(() => Storage.getItem(key));
  if (r.ok) return (r.value as string | null) ?? null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: string): Promise<void> {
  await tryNative(() => Storage.setItem(key, value));
  // localStorage에 항상 미러링: 네이티브가 세션 중 완전히 죽어도 읽기 폴백이 최신값을 갖는다
  // (recodex 2차: 개별 실패 시 두 저장소가 갈라지는 문제 — 잔여 창은 401 재발급·계정전환 감지로 자가 회복).
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장 실패는 치명적이지 않음 — 토큰은 익명키로 재발급 가능
  }
}

export async function kvRemove(key: string): Promise<void> {
  await tryNative(() => Storage.removeItem(key));
  try {
    localStorage.removeItem(key);
  } catch {
    // 무시
  }
}

// 익명 식별키. 토스 앱 안: getAnonymousKey() 실값(샌드박스는 mock).
// 일반 브라우저 개발: 서버 검증(^[\w.\-+/=:]+$, 8~512자)을 통과하는 로컬 고정 키를 생성·재사용.
const DEV_KEY_STORAGE = "zisaze.devAnonymousKey";

export async function resolveAnonymousKey(): Promise<string> {
  try {
    const result = await withTimeout(getAnonymousKey(), KEY_TIMEOUT_MS, "getAnonymousKey");
    if (result && result !== "ERROR" && result.type === "HASH" && result.hash) {
      return result.hash;
    }
    if (result === undefined) throw new Error("지원하지 않는 토스 앱 버전이에요. 토스 앱을 업데이트해 주세요.");
    throw new Error("사용자 키를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.");
  } catch (e) {
    // 브릿지 부재는 즉시 throw("ReactNativeWebView is not available…") 또는 무응답(타임아웃)
    // 두 형태로 나타난다 — 개발 환경에서는 둘 다 로컬 고정 키로 폴백.
    if (import.meta.env.DEV) {
      let devKey = localStorage.getItem(DEV_KEY_STORAGE);
      if (!devKey) {
        const rand = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
        devKey = `devkey_${rand}`;
        localStorage.setItem(DEV_KEY_STORAGE, devKey);
      }
      return devKey;
    }
    // 타임아웃 또는 브릿지 부재("… not available …") 모두 사용자 문구로 변환
    if (e instanceof BridgeTimeoutError || (e instanceof Error && /not available/i.test(e.message))) {
      throw new Error("토스 앱 안에서만 사용할 수 있어요.");
    }
    throw e;
  }
}

// 외부 URL 열기(H11): 토스 앱 안에서는 반드시 openURL. 브라우저 개발 폴백만 window.open.
// 보안(recodex P1): 서버 제공 URL이라도 http(s) 외 스킴(javascript:, intent: 등)은 실행하지 않는다.
export async function openExternalURL(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
  try {
    await withTimeout(openURL(url), KEY_TIMEOUT_MS, "openURL");
  } catch {
    if (import.meta.env.DEV) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    // 프로덕션 브릿지 실패는 무시(재탭 가능) — throw하면 호출부 void로 미처리 거부가 됨
  }
}
