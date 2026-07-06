import { useCallback, useEffect, useState } from "react";
import { bootstrapSession, fetchMe } from "./lib/api";
import { kvGet, kvRemove, kvSet } from "./lib/bridge";
import { ONBOARDED_KEY } from "./lib/constants";
import { useRoute } from "./lib/router";
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

  if (route.name === "program") {
    return <ProgramDetailScreen id={route.id} />;
  }

  return (
    <>
      {route.name === "home" && <HomeScreen />}
      {route.name === "bookmarks" && <BookmarksScreen />}
      {route.name === "settings" && <SettingsScreen />}
      <BottomNav active={route.name} />
    </>
  );
}
