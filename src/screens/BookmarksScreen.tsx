import { useEffect, useRef, useState } from "react";
import { fetchBookmarks, removeBookmark } from "../lib/api";
import type { BookmarkItem } from "../lib/types";
import { navigate } from "../lib/router";
import ProgramCardItem from "../components/ProgramCardItem";

type Sort = "added" | "deadline";

// P2-6 북마크: 서버 저장 목록 + 카드 해제 토글
export default function BookmarksScreen() {
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [sort, setSort] = useState<Sort>("added");
  const [reloadKey, setReloadKey] = useState(0);
  // 로드 시점의 전체 순서 — 낙관적 제거 실패 복원의 기준(도착 순서 무관 원위치)
  const orderRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const list = await fetchBookmarks(sort);
        if (cancelled) return;
        orderRef.current = list.map((b) => b.id);
        setItems(list);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sort, reloadKey]);

  function remove(id: string) {
    // 낙관적 제거 후 서버 실패 시 원위치 복원. 제거 시점 화면의 앞이웃(anchor)만 기억하면
    // 연속 제거에서 이미 사라진 이웃 정보가 빠져 도착 순서에 따라 뒤집히므로(Codex P1:
    // [A,B,C]→B,C 제거→[A,C,B] 재현), "로드 시점의 전체 순서(orderRef)"를 기준으로
    // 나보다 앞이었던 항목 중 현재 배열에 남아 있는 가장 가까운 것 뒤에 삽입한다(도착 순서 무관).
    const idx = items.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const removed = items[idx];
    setItems((prev) => prev.filter((b) => b.id !== id));
    void removeBookmark(id).catch(() =>
      setItems((prev) => {
        if (prev.some((b) => b.id === id)) return prev;
        const order = orderRef.current;
        const myPos = order.indexOf(id);
        let insertAt = 0; // 원본 순서상 앞 항목이 하나도 안 남았으면 맨 앞
        for (let i = myPos - 1; i >= 0; i--) {
          const at = prev.findIndex((b) => b.id === order[i]);
          if (at >= 0) {
            insertAt = at + 1;
            break;
          }
        }
        const next = [...prev];
        next.splice(insertAt, 0, removed);
        return next;
      }),
    );
  }

  return (
    <div className="screen has-bottom-nav">
      <header className="home-header">
        <h1 className="home-title">북마크</h1>
      </header>

      <section className="section">
        {state === "ready" && items.length > 0 && (
          <div className="section-head">
            <h2 className="section-title">저장한 지원사업 {items.length}개</h2>
            <button
              type="button"
              className="link-btn"
              onClick={() => setSort((s) => (s === "added" ? "deadline" : "added"))}
            >
              {sort === "added" ? "추가한 순" : "마감임박순"} ⇅
            </button>
          </div>
        )}

        {state === "loading" && <div className="skeleton-block" />}

        {state === "error" && (
          <div className="cta-card">
            <p className="cta-desc">북마크를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              다시 시도
            </button>
          </div>
        )}

        {state === "ready" && items.length === 0 && (
          <div className="cta-card">
            <p className="cta-title">아직 저장한 지원사업이 없어요</p>
            <p className="cta-desc">마음에 드는 지원사업을 북마크해 두면 여기에서 볼 수 있어요.</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("home")}>
              지원사업 둘러보기
            </button>
          </div>
        )}

        <div className="card-list">
          {items.map((b) => (
            <ProgramCardItem
              key={b.id}
              program={b}
              footer={
                <div className="card-footer">
                  <button type="button" className="link-btn link-muted" onClick={() => remove(b.id)}>
                    북마크 해제
                  </button>
                </div>
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
