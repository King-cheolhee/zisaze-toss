import { navigateToProgram } from "../lib/router";
import { dDayLabel, dDayTone, stripMarkup } from "../lib/format";

export interface CardData {
  id: string;
  title: string;
  organization: string | null;
  category: string | null;
  support_amount?: string | null;
  d_day: number | null;
}

interface Props {
  program: CardData;
  summary?: string | null; // 추천 카드의 cardSummary 등 부가 한 줄
  footer?: React.ReactNode; // 카드 하단 액션(숨기기 등)
}

export default function ProgramCardItem({ program, summary, footer }: Props) {
  const amount = stripMarkup(program.support_amount);
  return (
    <div className="card">
      <button type="button" className="card-main" onClick={() => navigateToProgram(program.id)}>
        <div className="card-badges">
          <span className={`badge badge-dday badge-${dDayTone(program.d_day)}`}>
            {dDayLabel(program.d_day)}
          </span>
          {program.category && <span className="badge badge-category">{program.category}</span>}
        </div>
        <p className="card-title">{program.title}</p>
        {program.organization && <p className="card-org">{program.organization}</p>}
        {summary ? (
          <p className="card-summary">{summary}</p>
        ) : (
          amount && <p className="card-amount">{amount}</p>
        )}
      </button>
      {footer}
    </div>
  );
}
