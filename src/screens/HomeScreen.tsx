import { useCallback, useEffect, useRef, useState } from "react";
import { addHidden, fetchMe, fetchPrograms, fetchRecommendations } from "../lib/api";
import type { ProgramCard, RecommendItem } from "../lib/types";
import { CATEGORY_FILTERS } from "../lib/constants";
import { navigate } from "../lib/router";
import ProgramCardItem from "../components/ProgramCardItem";

const PAGE_SIZE = 20;
const RECO_COUNT = 5;

type SortKey = "deadline" | "newest";

// P2-4 홈: 맞춤 추천(sort=score) + 전체 목록(카테고리 필터·검색·정렬). 지역필터 없음(A안 확정)
export default function HomeScreen() {
  // ── 추천 섹션 ──
  const [recoState, setRecoState] = useState<"loading" | "ready" | "empty-profile" | "error">(
    "loading",
  );
  const [recoItems, setRecoItems] = useState<RecommendItem[]>([]);
  const [recoReload, setRecoReload] = useState(0);
  // 로드 시점의 추천 순서 — 낙관적 제거 실패 복원의 기준(도착 순서 무관 원위치)
  const recoOrderRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setRecoState("loading"); // 재시도 시 스켈레톤 표시
    (async () => {
      try {
        const me = await fetchMe();
        // 선호·지역 어느 것도 없으면(전부 건너뜀) 추천 대신 CTA 카드 (B2: 빈 프로필은 전부 동점이라 무의미)
        if (!me.preference_text && !me.address_sido) {
          if (!cancelled) setRecoState("empty-profile");
          return;
        }
        const reco = await fetchRecommendations(1, RECO_COUNT);
        if (!cancelled) {
          recoOrderRef.current = reco.data.map((r) => r.id);
          setRecoItems(reco.data);
          setRecoState("ready");
        }
      } catch {
        if (!cancelled) setRecoState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recoReload]);

  function hideRecommendation(id: string) {
    // 관심없음(P2-6 선택 기능): 낙관적 제거 후 서버 저장 실패 시 원위치 복원.
    // 제거 시점 화면의 앞이웃(anchor)만 기억하면 연속 제거에서 이미 사라진 이웃 정보가 빠져
    // 도착 순서에 따라 뒤집히므로(Codex P1: [A,B,C]→B,C 제거→[A,C,B] 재현),
    // "로드 시점의 전체 순서(recoOrderRef)"를 기준으로 나보다 앞이었던 항목 중
    // 현재 배열에 남아 있는 가장 가까운 것 뒤에 삽입한다(도착 순서 무관).
    const idx = recoItems.findIndex((r) => r.id === id);
    if (idx < 0) return;
    const removed = recoItems[idx];
    setRecoItems((prev) => prev.filter((r) => r.id !== id));
    void addHidden(id).catch(() =>
      setRecoItems((prev) => {
        if (prev.some((r) => r.id === id)) return prev;
        const order = recoOrderRef.current;
        const myPos = order.indexOf(id);
        let insertAt = 0; // 원본 순서상 앞 항목이 하나도 안 남았으면 맨 앞
        for (let i = myPos - 1; i >= 0; i--) {
          const at = prev.findIndex((r) => r.id === order[i]);
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

  // ── 전체 목록 ──
  const [programs, setPrograms] = useState<ProgramCard[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("deadline");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const requestSeq = useRef(0);

  const loadList = useCallback(
    async (nextPage: number, append: boolean) => {
      const seq = ++requestSeq.current;
      setListLoading(true);
      setListError(false);
      try {
        const res = await fetchPrograms({
          page: nextPage,
          limit: PAGE_SIZE,
          category: category ?? undefined,
          search: search || undefined,
          sort,
        });
        if (seq !== requestSeq.current) return; // 뒤늦게 도착한 이전 요청 무시
        setPrograms((prev) => (append ? [...prev, ...res.programs] : res.programs));
        setPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
      } catch {
        if (seq === requestSeq.current) {
          setListError(true);
          // 새 조건(검색·필터) 요청이 실패했는데 이전 조건의 목록·페이지 상태가 남는 것 방지
          // (page/totalPages를 남기면 '더 보기'가 새 조건의 2페이지부터 로드 — recodex 2차)
          if (!append) {
            setPrograms([]);
            setPage(1);
            setTotalPages(1);
          }
        }
      } finally {
        if (seq === requestSeq.current) setListLoading(false);
      }
    },
    [category, search, sort],
  );

  useEffect(() => {
    void loadList(1, false);
  }, [loadList]);

  function submitSearch() {
    setSearch(searchInput.trim());
  }

  return (
    <div className="screen has-bottom-nav">
      <header className="home-header">
        <h1 className="home-title">지원사업 찾기</h1>
        <div className="search-bar">
          <input
            className="search-input"
            type="search"
            placeholder="지원사업을 검색해 보세요"
            value={searchInput}
            enterKeyHint="search"
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch();
            }}
          />
          <button type="button" className="search-btn" onClick={submitSearch}>
            검색
          </button>
        </div>
      </header>

      {/* ── 맞춤 추천 (H16: 선호 기반 추천 표기) ── */}
      {!search && (
        <section className="section">
          {recoState === "loading" && <div className="skeleton-block" />}
          {recoState === "ready" && recoItems.length > 0 && (
            <>
              <div className="section-head">
                <h2 className="section-title">회원님의 선호 기반 추천</h2>
              </div>
              <p className="section-hint">
                지역·선호를 자세히 설정할수록 추천이 더 정확해져요.{" "}
                <button type="button" className="link-btn" onClick={() => navigate("settings")}>
                  설정하기
                </button>
              </p>
              <div className="card-list">
                {recoItems.map((item) => (
                  <ProgramCardItem
                    key={item.id}
                    program={{
                      id: item.id,
                      title: item.title,
                      organization: item.organization,
                      category: item.category,
                      support_amount: item.supportAmount,
                      d_day: item.program.d_day,
                    }}
                    summary={item.cardSummary}
                    footer={
                      <div className="card-footer">
                        <button
                          type="button"
                          className="link-btn link-muted"
                          onClick={() => hideRecommendation(item.id)}
                        >
                          관심 없어요
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            </>
          )}
          {recoState === "ready" && recoItems.length === 0 && (
            <div className="cta-card">
              <p className="cta-title">아직 조건에 맞는 추천이 없어요</p>
              <p className="cta-desc">선호 분야나 지역을 바꾸면 추천 폭이 넓어져요.</p>
              <button type="button" className="btn btn-secondary" onClick={() => navigate("settings")}>
                선호 설정 바꾸기
              </button>
            </div>
          )}
          {recoState === "empty-profile" && (
            <div className="cta-card">
              <p className="cta-title">선호 분야를 설정해 보세요</p>
              <p className="cta-desc">관심 분야를 알려주시면 딱 맞는 지원사업을 추천해 드려요.</p>
              <button type="button" className="btn btn-secondary" onClick={() => navigate("settings")}>
                선호 분야 설정하기
              </button>
            </div>
          )}
          {recoState === "error" && (
            <div className="cta-card">
              <p className="cta-desc">추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRecoReload((k) => k + 1)}
              >
                다시 시도
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── 전체 목록 ── */}
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{search ? `"${search}" 검색 결과` : "전체 지원사업"}</h2>
          <button
            type="button"
            className="link-btn"
            onClick={() => setSort((s) => (s === "deadline" ? "newest" : "deadline"))}
          >
            {sort === "deadline" ? "마감임박순" : "최신순"} ⇅
          </button>
        </div>

        <div className="filter-row">
          <button
            type="button"
            className={`chip chip-small ${category === null ? "chip-selected" : ""}`}
            onClick={() => setCategory(null)}
          >
            전체
          </button>
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip chip-small ${category === c ? "chip-selected" : ""}`}
              onClick={() => setCategory((prev) => (prev === c ? null : c))}
            >
              {c}
            </button>
          ))}
        </div>

        {listError && (
          <div className="cta-card">
            <p className="cta-desc">목록을 불러오지 못했어요.</p>
            <button type="button" className="btn btn-secondary" onClick={() => void loadList(1, false)}>
              다시 시도
            </button>
          </div>
        )}

        <div className="card-list">
          {programs.map((p) => (
            <ProgramCardItem key={p.id} program={p} />
          ))}
        </div>

        {listLoading && <div className="skeleton-block" />}
        {!listLoading && !listError && programs.length === 0 && (
          <p className="empty-text">조건에 맞는 지원사업이 없어요.</p>
        )}
        {!listLoading && page < totalPages && (
          <button type="button" className="btn btn-more" onClick={() => void loadList(page + 1, true)}>
            더 보기
          </button>
        )}
      </section>
    </div>
  );
}
