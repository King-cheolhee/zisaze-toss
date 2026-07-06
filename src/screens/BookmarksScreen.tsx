import { useEffect, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const list = await fetchBookmarks(sort);
        if (cancelled) return;
        setItems(list);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sort]);

  function remove(id: string) {
    setItems((prev) => prev.filter((b) => b.id !== id));
    void removeBookmark(id).catch(() => {
      // 실패해도 다음 로드에서 서버 상태로 복원됨
    });
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
