import { useEffect, useRef, useState } from "react";
import { addBookmark, fetchBookmarkIds, fetchProgram, removeBookmark } from "../lib/api";
import type { ProgramFull } from "../lib/types";
import { openExternalURL } from "../lib/bridge";
import { dDayLabel, dDayTone, periodLabel, stripMarkup } from "../lib/format";

interface Props {
  id: string;
}

// P2-5 상세: AI 생성 영역 라벨(H16), 원문 보기 = openURL(H11 공공기관 예외), 북마크 토글
export default function ProgramDetailScreen({ id }: Props) {
  const [program, setProgram] = useState<ProgramFull | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // 초기 상태 조회가 사용자의 토글보다 늦게 도착해 되돌리는 경쟁 방지 (recodex P1)
  const userToggled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const p = await fetchProgram(id);
        if (cancelled) return;
        setProgram(p);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    userToggled.current = false;
    (async () => {
      try {
        const ids = await fetchBookmarkIds();
        if (!cancelled && !userToggled.current) setBookmarked(ids.includes(id));
      } catch {
        // 북마크 상태 조회 실패는 무시(토글 시 서버가 정본)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function toggleBookmark() {
    if (bookmarkBusy) return;
    userToggled.current = true;
    setBookmarkBusy(true);
    const next = !bookmarked;
    setBookmarked(next);
    try {
      if (next) await addBookmark(id);
      else await removeBookmark(id);
    } catch {
      setBookmarked(!next); // 실패 시 롤백
    } finally {
      setBookmarkBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="screen center-screen">
        <div className="spinner" aria-label="불러오는 중" />
      </div>
    );
  }

  if (state === "error" || !program) {
    return (
      <div className="screen center-screen">
        <p className="error-text">지원사업 정보를 불러오지 못했어요.</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          다시 시도
        </button>
      </div>
    );
  }

  const amount = stripMarkup(program.support_amount);
  const hasAiContent =
    !!program.ai_summary || !!(program.ai_key_points?.length) || !!program.ai_eligibility;

  return (
    <div className="screen detail">
      <div className="detail-body">
        <div className="card-badges">
          <span className={`badge badge-dday badge-${dDayTone(program.d_day)}`}>
            {dDayLabel(program.d_day)}
          </span>
          {program.category && <span className="badge badge-category">{program.category}</span>}
        </div>
        <h1 className="detail-title">{program.title}</h1>
        {program.organization && <p className="detail-org">{program.organization}</p>}

        <dl className="detail-info">
          <div className="detail-info-row">
            <dt>신청 기간</dt>
            <dd>
              {periodLabel(
                program.application_period,
                program.application_start,
                program.application_end,
              )}
            </dd>
          </div>
          {amount && (
            <div className="detail-info-row">
              <dt>지원 금액</dt>
              <dd>{amount}</dd>
            </div>
          )}
          {program.target_companies && (
            <div className="detail-info-row">
              <dt>지원 대상</dt>
              <dd>{stripMarkup(program.target_companies)}</dd>
            </div>
          )}
          {program.executing_agency && (
            <div className="detail-info-row">
              <dt>수행 기관</dt>
              <dd>{program.executing_agency}</dd>
            </div>
          )}
          {program.application_method && (
            <div className="detail-info-row">
              <dt>신청 방법</dt>
              <dd>{stripMarkup(program.application_method)}</dd>
            </div>
          )}
        </dl>

        {/* H16: 생성형 AI 결과물 라벨 + 한계 고지 */}
        {hasAiContent && (
          <section className="ai-section">
            <div className="ai-section-head">
              <span className="badge badge-ai">AI 요약</span>
            </div>
            {program.ai_summary && <p className="ai-summary">{stripMarkup(program.ai_summary)}</p>}
            {!!program.ai_key_points?.length && (
              <ul className="ai-points">
                {program.ai_key_points.map((point, i) => (
                  <li key={i}>{stripMarkup(point)}</li>
                ))}
              </ul>
            )}
            {program.ai_eligibility && (
              <p className="ai-eligibility">
                <strong>신청 자격</strong> {stripMarkup(program.ai_eligibility)}
              </p>
            )}
            <p className="ai-caption">
              AI가 생성한 요약이라 원문과 다를 수 있어요. 정확한 내용은 꼭 원문에서 확인해 주세요.
            </p>
          </section>
        )}
      </div>

      <div className="detail-actions">
        <button
          type="button"
          className={`btn btn-bookmark ${bookmarked ? "btn-bookmark-on" : ""}`}
          onClick={() => void toggleBookmark()}
          aria-pressed={bookmarked}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M6 4h12a1 1 0 0 1 1 1v16l-7-4.5L5 21V5a1 1 0 0 1 1-1Z"
              fill={bookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          {bookmarked ? "저장됨" : "북마크"}
        </button>
        {program.detail_url && (
          <button
            type="button"
            className="btn btn-primary btn-grow"
            onClick={() => void openExternalURL(program.detail_url!)}
          >
            원문 보기
          </button>
        )}
      </div>
    </div>
  );
}
