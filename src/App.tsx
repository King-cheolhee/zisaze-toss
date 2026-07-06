import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { bootstrapSession, fetchMe } from "./lib/api";
import { kvGet, kvRemove, kvSet } from "./lib/bridge";
import { ONBOARDED_KEY } from "./lib/constants";
import { getScrollBeforeProgram, useRoute } from "./lib/router";
import BottomNav from "./components/BottomNav";
import OnboardingScreen from "./screens/OnboardingScreen";
import HomeScreen from "./screens/HomeScreen";
import ProgramDetailScreen from "./screens/ProgramDetailScreen";
import BookmarksScreen from "./screens/BookmarksScreen";
import SettingsScreen from "./screens/SettingsScreen";

type BootState = "loading" | "onboarding" | "ready" | "error";

export default function App() {
  const [boot, setBoot] = useState<BootState>("loading");
  const [bootError, setBootError] = useState<string>("");
  const route = useRoute();

  const bootstrap = useCallback(async () => {
    setBoot("loading");
    try {
      // 최초 진입: 익명키 → 세션 발급 → 토큰 저장 (P2-3)
      const { identityChanged } = await bootstrapSession();
      // 토스 계정이 바뀌었으면 이전 사용자의 온보딩 플래그도 무효
      if (identityChanged) await kvRemove(ONBOARDED_KEY);
      if ((await kvGet(ONBOARDED_KEY)) === "1") {
        setBoot("ready");
        return;
      }
      // 재설치 등으로 로컬 플래그만 사라진 경우: 서버에 선호/지역이 있으면 온보딩 생략.
      // 조회 실패를 신규 사용자로 오인하면 기존 선호를 덮어쓸 수 있으므로(recodex P1)
      // 실패는 재시도 화면으로 처리한다.
      const me = await fetchMe();
      if (me.preference_text || me.address_sido) {
        await kvSet(ONBOARDED_KEY, "1");
        setBoot("ready");
        return;
      }
      setBoot("onboarding");
    } catch (e) {
      setBootError(e instanceof Error ? e.message : "시작하지 못했어요. 다시 시도해 주세요.");
      setBoot("error");
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // 상세(program) 라우트에서도 탭 트리(홈/북마크/설정)를 언마운트하지 않고 hidden으로 유지해,
  // 상세→뒤로 시 홈의 검색·필터·정렬·페이지·스크롤 상태가 그대로 보존되게 한다.
  // (탭 간 전환 home↔bookmarks↔settings은 종전대로 조건 렌더=재마운트를 유지한다.)
  const isProgram = route.name === "program";
  const lastTabRef = useRef<"home" | "bookmarks" | "settings">("home");
  if (route.name !== "program") lastTabRef.current = route.name;

  // body 스크롤은 상세/탭 화면이 공유한다. 저장은 navigateToProgram()이 해시를 바꾸기 "전"에 해둔다
  // — 이 effect 시점에는 탭 트리가 이미 hidden으로 접혀 scrollY가 0으로 클램프되기 때문(리뷰 P2).
  // 복원은 keep-mounted라 콘텐츠 높이가 살아 있는 홈만 저장 위치로, 재마운트되는 탭은 맨 위로.
  // (페인트 전에 복원해 깜빡임 방지 → useLayoutEffect)
  const wasProgramRef = useRef(false);
  useLayoutEffect(() => {
    if (isProgram && !wasProgramRef.current) {
      window.scrollTo(0, 0);
    } else if (!isProgram && wasProgramRef.current) {
      window.scrollTo(0, lastTabRef.current === "home" ? getScrollBeforeProgram() : 0);
    }
    wasProgramRef.current = isProgram;
  }, [isProgram]);

  if (boot === "loading") {
    return (
      <div className="screen center-screen">
        <div className="spinner" aria-label="불러오는 중" />
      </div>
    );
  }

  if (boot === "error") {
    return (
      <div className="screen center-screen">
        <p className="error-text">{bootError}</p>
        <button type="button" className="btn btn-primary" onClick={() => void bootstrap()}>
          다시 시도
        </button>
      </div>
    );
  }

  if (boot === "onboarding") {
    return (
      <OnboardingScreen
        onDone={async () => {
          // 플래그 저장을 기다린 뒤 전환 — fire-and-forget이면 다음 실행에서 온보딩이 반복될 수 있음
          await kvSet(ONBOARDED_KEY, "1");
          setBoot("ready");
        }}
      />
    );
  }

  const activeTab = lastTabRef.current;
  return (
    <>
      {/* 홈만 program 라우트에서도 언마운트하지 않고 hidden으로 유지(검색·필터·정렬·페이지·스크롤 보존).
          북마크·설정은 종전대로 언마운트 — 상세에서 토글한 북마크가 복귀 시 재조회로 반영되게(리뷰 P2: stale 방지) */}
      <div hidden={isProgram}>
        {activeTab === "home" && <HomeScreen />}
        {!isProgram && activeTab === "bookmarks" && <BookmarksScreen />}
        {!isProgram && activeTab === "settings" && <SettingsScreen />}
        <BottomNav active={activeTab} />
      </div>
      {route.name === "program" && <ProgramDetailScreen id={route.id} />}
    </>
  );
}
