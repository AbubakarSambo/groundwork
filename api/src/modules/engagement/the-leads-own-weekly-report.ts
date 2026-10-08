import { NOTHING_MOVED } from '../reports/the-weekly-report';

/**
 * WHAT THE LEAD'S OWN WEEKLY REPORT SAYS, FOR HER WEEKLY LETTER (engagement spec section 24).
 *
 * The letter does not word anything of its own about what moved or what to do. It takes the sentences of the weekly report the lead already reads (the report
 * page serves them through the one wrapper that swaps names in), as she is served them: `TheWeeklyReportService.read` for her, on a check-in she runs.
 * Only this week's report is used; the service reads the latest week there is, and a report kept in an earlier week says nothing about this one.
 */
export interface TheWeeklyReportAsServed {
  weekStart: string | null;
  whatChanged?: { moved: string[] };
  forNextWeek?: { do: string; why: string }[];
}

const DAY = 86_400_000;

export function whatTheLeadsWeeklyReportSays(read: TheWeeklyReportAsServed | null | undefined, now: Date): { moved: string[]; toDo: { do: string; why: string }[] } | null {
  if (!read?.weekStart) return null;
  const started = new Date(`${read.weekStart}T00:00:00Z`).getTime();
  if (!Number.isFinite(started) || now.getTime() - started >= 7 * DAY) return null;
  const moved = (read.whatChanged?.moved ?? []).map((s) => String(s ?? '').trim()).filter((s) => s && s !== NOTHING_MOVED);
  const toDo = (read.forNextWeek ?? []).map((t) => ({ do: String(t.do ?? '').trim(), why: String(t.why ?? '').trim() })).filter((t) => t.do);
  return moved.length || toDo.length ? { moved, toDo } : null;
}
