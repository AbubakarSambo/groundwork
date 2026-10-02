import { aLeaveRequest, aSpendRequest, anHoursRequest, type AWaitingRequest } from './a-request-in-words';

/** The three boards, as far as this read needs them. Any may be missing; a missing one gives nothing. */
export interface TheBoards {
  leave?: { board(reader: { userId: string; organizationId: string }): Promise<{ waiting: { id: string; name: string; startsOn: string; endsOn: string; mayDecide: boolean }[] }> };
  timeSheets?: { board(reader: { userId: string; organizationId: string }): Promise<any> };
  spending?: { board(reader: { userId: string; organizationId: string }): Promise<{ currency: string | null; waiting: { id: string; firstName: string; amount: number; what: string; mayDecide: boolean }[] }> };
}

/**
 * WHAT IS WAITING FOR THIS PERSON TO APPROVE OR DECLINE (decision 82, items 1 and 9), read from the
 * boards themselves, which already say row by row whether this reader is the one who approves
 * (who-approves.ts). Nothing here decides who approves. A board this reader may not open, or a suite
 * that is off, gives nothing. Ask Groundwork and the lead's daily summary both ask this.
 */
export async function whatWaitsForYouToDecide(reader: { userId: string; organizationId: string }, boards: TheBoards): Promise<AWaitingRequest[]> {
  const out: AWaitingRequest[] = [];
  const first = (full: string) => full.trim().split(/\s+/)[0] ?? '';
  const leave = boards.leave ? await boards.leave.board(reader).catch(() => null) : null;
  for (const w of leave?.waiting ?? []) if (w.mayDecide) out.push(aLeaveRequest(w.id, null, first(w.name), w.startsOn, w.endsOn));
  const hours = boards.timeSheets ? await boards.timeSheets.board(reader).catch(() => null) : null;
  for (const week of hours?.weeks ?? []) {
    for (const p of week.people ?? []) {
      if (p.mayApprove && !p.approved && p.total > 0) out.push(anHoursRequest(p.personId, week.weekOf, first(p.name), p.minutes, p.total, p.days ?? []));
    }
  }
  const spend = boards.spending ? await boards.spending.board(reader).catch(() => null) : null;
  for (const w of spend?.waiting ?? []) if (w.mayDecide) out.push(aSpendRequest(w.id, null, w.firstName, w.amount, spend?.currency ?? null, w.what));
  return out;
}
