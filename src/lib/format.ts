// 표시용 포맷 유틸

// support_amount 등에 남아 있는 마크다운 강조(**)를 제거해 표시
export function stripMarkup(text: string | null | undefined): string {
  return (text ?? "").replace(/\*+/g, "").trim();
}

// d_day(KST 정본, 서버 계산) → 라벨. 웹 D-day 표기 로직 준용(P2-4)
export function dDayLabel(dDay: number | null | undefined): string {
  if (dDay === null || dDay === undefined) return "상시";
  if (dDay < 0) return "마감";
  if (dDay === 0) return "오늘 마감";
  return `D-${dDay}`;
}

export function dDayTone(dDay: number | null | undefined): "urgent" | "normal" | "closed" {
  if (dDay === null || dDay === undefined) return "normal";
  if (dDay < 0) return "closed";
  if (dDay <= 7) return "urgent";
  return "normal";
}

export function periodLabel(period: string | null, start: string | null, end: string | null): string {
  if (period) return period;
  if (start && end) return `${start} ~ ${end}`;
  if (end) return `~ ${end}`;
  return "상시 모집";
}
