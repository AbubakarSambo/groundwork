import { aCheckInToApprove, aLeaveRequest, aSeatRequest, aSpendRequest, anHoursRequest, type AWaitingRequest, type AWaitingDecision } from './a-request-in-words';

/** The three boards, as far as this read needs them. Any may be missing; a missing one gives nothing. */
export interface TheBoards {
  leave?: { board(reader: { userId: string; organizationId: string }): Promise<{ waiting: { id: string; name: string; startsOn: string; endsOn: string; mayDecide: boolean }[] }> };
  timeSheets?: { board(reader: { userId: string; organizationId: string }): Promise<any> };
  spending?: { board(reader: { userId: string; organizationId: string }): Promise<{ currency: string | null; waiting: { id: string; firstName: string; amount: number; what: string; mayDecide: boolean }[] }> };
  /** People waiting to be let in, for an admin only: the list People shows (who-is-waiting-at-the-door.service.ts). */
  door?: { waitingFor(reader: { userId: string; organizationId: string }): Promise<{ organisationName: string; waiting: { id: string; name: string | null; email: string }[] }> };
  /** Check-ins waiting for an admin to approve them, for an admin only: the list the check-ins page and Today show. */
  checkIns?: { waitingFor(reader: { userId: string; organizationId: string }): Promise<{ id: string; label: string; createdBy: string | null }[]> };
}

/**
 * WHAT IS WAITING FOR THIS PERSON TO APPROVE OR DECLINE (decision 82, items 1 and 9), read from the
 * boards themselves, which already say row by row whether this reader is the one who approves
 * (who-approves.ts). Nothing here decides who approves. A board this reader may not open, or a suite
 * that is off, gives nothing. Ask Groundwork and the lead's daily summary both ask this.
 */
export async function whatWaitsForYouToDecide(reader: { userId: string; organizationId: string }, boards: TheBoards): Promise<AWaitingDecision[]> {
  const out: AWaitingDecision[] = [];
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
  const door = boards.door ? await boards.door.waitingFor(reader).catch(() => null) : null;
  for (const w of door?.waiting ?? []) out.push(aSeatRequest(w.id, null, first(w.name || w.email.split('@')[0]), door!.organisationName));
  const checkIns = boards.checkIns ? await boards.checkIns.waitingFor(reader).catch(() => []) : [];
  for (const g of checkIns) out.push(aCheckInToApprove(g.id, first(g.createdBy ?? 'Someone'), g.label));
  return out;
}
