import { theReleaseOneSalesBoardIsOnFor } from '../board/release-one-sales-board';

/**
 * A WAIT IS CLEARED WHEN EITHER SIDE SAYS IT IS DONE (Hafsah's point 14, Drop Access, 17 October; release plan Part 1A: "A wait
 * is cleared when someone says it's done. It's never reported as late after that.").
 *
 * On 15 October Joseph said "I brought Mercy her samples today, as promised." and Mercy said "Joseph finally brought the samples
 * today" and "I am not waiting on samples anymore." Her wait on Joseph for "the sample units" stayed open, and two days later
 * Grace's morning summary said "Mercy is waiting on Joseph for the sample units, which was due on Thursday 15 October and is
 * four days late." Only the person waiting could clear a wait, and only when the model read their newest account as cleared;
 * a second row for the same thing ("the samples" and "the sample units") was never cleared with the first.
 *
 * READ FROM THE RECORD, NEVER GUESSED. An open wait is cleared by a line, said after the check-in that last raised it, where:
 *  - the line is what happened (a PROGRESS line), never a worry, a wish or a promise;
 *  - it is said by the one waiting or by the one holding it (a colleague); a customer's wait is cleared only by the one waiting;
 *  - it names the thing waited for, in the thing's own words ("samples" for "the sample units");
 *  - it names the other side: the one waiting names who they waited on, the one holding it names who was waiting. Or the one
 *    waiting says they are not waiting on it any more;
 *  - it says it happened ("brought", "delivered", "sent", "is done"), with nothing in the same sentence that says it has not
 *    or not yet ("did not", "still hasn't", "will").
 * The wait is cleared on the day of that line, so it is never late after it. Behind Release 1's switch.
 */

export interface AnOpenWait {
  id: string;
  fromParticipantId: string;
  onParticipantId: string | null;
  onLabel: string | null;
  what: string;
  createdAt: Date | string;
  sourceCheckInId: string | null;
}
export interface ALineOnRecord {
  id: string;
  participantId: string;
  checkInId: string | null;
  type: string;
  text: string;
  createdAt: Date | string;
}

const SAID_OF_EVERY_WAIT = new Set(['unit', 'answer', 'reply', 'response', 'decision', 'update', 'call', 'message', 'word', 'news', 'thing', 'information', 'info', 'kes', 'ksh']);
const STOP = new Set(['the', 'a', 'an', 'for', 'of', 'on', 'to', 'from', 'with', 'and', 'or', 'my', 'our', 'their', 'his', 'her', 'its', 'this', 'that', 'some', 'any', 'about', 'in', 'at', 'by', 'it']);
const one = (w: string) => w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
const wordsOf = (t: string) => String(t ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).map((w) => w.replace(/'s$/, '').replace(/'/g, '')).filter(Boolean);
const theThingsOwnWords = (what: string): string[] => wordsOf(what).filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d/.test(w)).map(one).filter((w) => !SAID_OF_EVERY_WAIT.has(w));

const IT_HAPPENED = /\b(?:brought|delivered|sent|gave|given|handed|dropped|shared|arrived|received|got|came|paid|returned|signed|approved|answered|replied|done|sorted|cleared|finished|completed)\b/i;
const NOT_YET = /\b(?:not|never|no|still|yet|haven't|hasn't|hadn't|didn't|don't|doesn't|won't|will|going to|need to|needs to|wish|hope|should|would|could|if|until|unless|forgot)\b|n't\b|\bI'll\b|\bhe'll\b|\bshe'll\b|\bthey'll\b/i;
const NOT_WAITING_ANY_MORE = /\b(?:not|no longer)\s+waiting\s+(?:on|for)\b[^.;!?]*?(?:\b(?:any ?more|now)\b|$)|\bno longer waiting\b/i;

const sentences = (t: string) => String(t ?? '').replace(/\[[^\]]*\]/g, '').replace(/[‘’]/g, "'").split(/(?<=[.;!?])\s+/).map((s) => s.trim()).filter(Boolean);

/** Whether one line says this wait is done. `namesOf` gives a person's own names (first name, full name). */
export function aLineSaysItIsDone(line: ALineOnRecord, wait: AnOpenWait, namesOf: (participantId: string) => string[]): boolean {
  if (String(line.type).toUpperCase() !== 'PROGRESS') return false;
  const byTheOneWaiting = line.participantId === wait.fromParticipantId;
  const byTheOneHoldingIt = !!wait.onParticipantId && line.participantId === wait.onParticipantId;
  if (!byTheOneWaiting && !byTheOneHoldingIt) return false;
  const thing = theThingsOwnWords(wait.what);
  if (!thing.length) return false;
  const otherSide = byTheOneWaiting
    ? (wait.onParticipantId ? namesOf(wait.onParticipantId) : [String(wait.onLabel ?? '')])
    : namesOf(wait.fromParticipantId);
  const otherWords = otherSide.flatMap((n) => wordsOf(n)).filter((w) => w.length >= 2);
  return sentences(line.text).some((s) => {
    const said = new Set(wordsOf(s).map(one));
    if (!thing.some((w) => said.has(w))) return false;
    if (byTheOneWaiting && NOT_WAITING_ANY_MORE.test(s)) return true;
    const namesTheOtherSide = otherWords.some((w) => said.has(w) || said.has(one(w)));
    return namesTheOtherSide && IT_HAPPENED.test(s) && !NOT_YET.test(s);
  });
}

/** Each open wait a line on record says is done, with the day it was said. Pure, from rows the record holds. */
export function theWaitsSaidDone(
  waits: AnOpenWait[],
  lines: ALineOnRecord[],
  namesOf: (participantId: string) => string[],
  lastRaisedAt: (w: AnOpenWait) => Date,
): { id: string; clearedAt: Date; lineId: string }[] {
  const out: { id: string; clearedAt: Date; lineId: string }[] = [];
  for (const w of waits) {
    const after = lastRaisedAt(w).getTime();
    const done = lines
      .filter((l) => l.checkInId !== w.sourceCheckInId && new Date(l.createdAt).getTime() > after)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .find((l) => aLineSaysItIsDone(l, w, namesOf));
    if (done) out.push({ id: w.id, clearedAt: new Date(done.createdAt), lineId: done.id });
  }
  return out;
}

/** Clears, on one check-in, every open wait a line on record says is done. Only with Release 1's switch on. Returns how many. */
export async function clearTheWaitsSaidDone(prisma: any, groundId: string): Promise<number> {
  if (!(await theReleaseOneSalesBoardIsOnFor(prisma, groundId))) return 0;
  const waits: AnOpenWait[] = await prisma.groundDependency.findMany({
    where: { groundId, status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null },
    select: { id: true, fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, createdAt: true, sourceCheckInId: true },
  });
  if (!waits.length) return 0;
  const people: any[] = await prisma.groundParticipant.findMany({
    where: { groundId },
    select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
  });
  const namesOf = (pid: string): string[] => {
    const p = people.find((x) => x.id === pid);
    return [p?.user?.firstName, p?.user?.lastName, p?.nameGiven].filter((n): n is string => !!n && !!String(n).trim());
  };
  const lines: ALineOnRecord[] = await prisma.recordEntry.findMany({
    where: { disputedAt: null, type: 'PROGRESS', participant: { groundId } },
    select: { id: true, participantId: true, checkInId: true, type: true, text: true, createdAt: true },
  });
  const sources = [...new Set(waits.map((w) => w.sourceCheckInId).filter(Boolean))] as string[];
  const checkIns: any[] = sources.length
    ? await prisma.checkIn.findMany({ where: { id: { in: sources } }, select: { id: true, completedAt: true } })
    : [];
  const doneAt = new Map(checkIns.map((c) => [c.id, c.completedAt ? new Date(c.completedAt) : null]));
  const cleared = theWaitsSaidDone(waits, lines, namesOf, (w) => {
    const at = w.sourceCheckInId ? doneAt.get(w.sourceCheckInId) : null;
    const made = new Date(w.createdAt);
    return at && at.getTime() > made.getTime() ? at : made;
  });
  for (const c of cleared) {
    await prisma.groundDependency.updateMany({ where: { id: c.id, clearedAt: null }, data: { status: 'CLEARED', clearedAt: c.clearedAt } });
  }
  return cleared.length;
}
