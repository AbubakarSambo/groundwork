import { theReleaseOneSalesBoardIsOnFor } from '../board/release-one-sales-board';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';

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

const sentences = (t: string) => String(t ?? '').replace(/\[[^\]]*\]/g, '').replace(/[‘’]/g, "'").split(/(?<!\b(?:v|vs|V|Vs|Mr|Mrs|Ms|Dr)\.)(?<=[.;!?])\s+/).map((s) => s.trim()).filter(Boolean);

/*
 * PART OF IT CAME, AND THE REST IS STILL AWAITED (messages test, third run, item 9). Aisha waited on the client for the witness
 * statements. On Tuesday 13 October she said "Since the last check-in, the client has sent us two of the three witness statements for
 * the Jamii Clinics employment claim. We're just waiting on the last one now." That cleared the whole wait, and Wanjiru's weekly letter
 * said "Aisha Kamau is no longer waiting on the client for the witness statements." Some of the thing is not the thing: a sentence
 * that says part of it came does not clear it, and nor does a line in which the one waiting says they are still waiting.
 */
const ONLY_PART_OF_IT = /\b(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:out\s+)?of\s+(?:the\s+|our\s+|their\s+)?(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)|some of|part of|half of|most of|all but|the first (?:one|two|three|part|half)|only (?:one|two|three|some|part))\b/i;
const STILL_WAITING = /\b(?:still|just|now)\s+waiting\b|\bwaiting\s+(?:on|for)\s+the\s+(?:last|rest|final|other|remaining)\b|\bstill\s+(?:missing|outstanding|to come)\b/i;

/*
 * WHAT AN OUTSIDE BODY GAVE, SAID BY ANYBODY IN THE CHECK-IN (messages test, third run, item 14). Brian waited on the court for a hearing
 * date. On Wednesday 14 October, four minutes later, David said in the same check-in "In Kasarani Foods v. Tumaini Traders, the hearing
 * date is set for November 12th." The litigation board still said on Thursday and Friday "Brian Otieno is waiting on the court for a
 * hearing date." A wait on somebody outside the check-in (a court, a client, a supplier) is cleared by a line from anybody in it that
 * names the whole thing waited for and says it was given, set or happened, with nothing in the sentence that says it has not.
 */
const IT_WAS_GIVEN = /\b(?:(?:is|was|has been|have been|got|were|are)\s+(?:now\s+)?(?:set|fixed|scheduled|listed|issued|granted|given|confirmed|received|delivered|sent|paid|approved|signed|filed))\b/i;
function anOutsideBodyGaveIt(line: ALineOnRecord, wait: AnOpenWait, thing: string[]): boolean {
  if (wait.onParticipantId || !String(wait.onLabel ?? '').trim()) return false;
  if (line.participantId === wait.fromParticipantId) return false;
  /* The holder's own name is not the thing: "the court to set a hearing date" is the hearing date. */
  const holder = new Set(wordsOf(String(wait.onLabel ?? '')).map(one));
  const itself = thing.filter((w) => !holder.has(w));
  if (!itself.length) return false;
  return sentences(line.text).some((s) => {
    const said = new Set(wordsOf(s).map(one));
    return itself.every((w) => said.has(w)) && (IT_WAS_GIVEN.test(s) || IT_HAPPENED.test(s)) && !NOT_YET.test(s.replace(/\bnot\s+(?:due|before)\b/gi, '')) && !ONLY_PART_OF_IT.test(s);
  });
}

/*
 * A FILING ENDS THE WAIT FOR WORK ON WHAT WAS FILED (engine test, Muchemi & Co). Wanjiru waited on Brian for "revisions to the Kasarani
 * Foods reply". On Wednesday 14 October Brian said "The reply in Kasarani Foods v. Tumaini Traders was successfully filed today." Her
 * summary on Tuesday 20 October said "You are waiting on Brian for revisions to the Kasarani Foods reply ..., which was due on Thursday
 * 15 October and is five days late." A wait for revisions, a review, comments or a draft of a thing is over once the thing itself was
 * filed, lodged, served or submitted, said by either side, with nothing in the sentence that says it has not.
 */
const WORK_ON_IT = new Set(['revision', 'review', 'comment', 'draft', 'edit', 'change', 'input', 'feedback', 'amendment', 'correction', 'final', 'finalised', 'finalized', 'version']);
const IT_WAS_FILED = /\b(?:filed|lodged|served|submitted)\b/i;
function theThingItselfWasFiled(line: ALineOnRecord, wait: AnOpenWait, thing: string[]): boolean {
  if (!thing.some((w) => WORK_ON_IT.has(w))) return false;
  const itself = thing.filter((w) => !WORK_ON_IT.has(w));
  if (!itself.length) return false;
  return sentences(line.text).some((s) => {
    const said = new Set(wordsOf(s).map(one));
    return itself.every((w) => said.has(w)) && IT_WAS_FILED.test(s) && !NOT_YET.test(s);
  });
}

/** Whether one line says this wait is done. `namesOf` gives a person's own names (first name, full name). */
export function aLineSaysItIsDone(line: ALineOnRecord, wait: AnOpenWait, namesOf: (participantId: string) => string[], atTheCustomer: (holder: string) => string[] = () => []): boolean {
  if (String(line.type).toUpperCase() !== 'PROGRESS') return false;
  const byTheOneWaiting = line.participantId === wait.fromParticipantId;
  const byTheOneHoldingIt = !!wait.onParticipantId && line.participantId === wait.onParticipantId;
  const thing = theThingsOwnWords(wait.what);
  if (!thing.length) return false;
  if (!byTheOneWaiting && !byTheOneHoldingIt) return anOutsideBodyGaveIt(line, wait, thing);
  if (theThingItselfWasFiled(line, wait, thing)) return true;
  if (byTheOneWaiting && STILL_WAITING.test(line.text)) return false;
  /* A person at a customer is named by the customer too: Mercy waited on "Mrs. Njeri" for "the signed order", and said "Greenfield
     Supermarket signed the order!" (messages test, fourth run). */
  const otherSide = byTheOneWaiting
    ? (wait.onParticipantId ? namesOf(wait.onParticipantId) : [String(wait.onLabel ?? ''), ...atTheCustomer(String(wait.onLabel ?? ''))])
    : namesOf(wait.fromParticipantId);
  const otherWords = otherSide.flatMap((n) => wordsOf(n)).filter((w) => w.length >= 2);
  return sentences(line.text).some((s) => {
    const said = new Set(wordsOf(s).map(one));
    if (!thing.some((w) => said.has(w))) return false;
    if (byTheOneWaiting && NOT_WAITING_ANY_MORE.test(s)) return true;
    const namesTheOtherSide = otherWords.some((w) => said.has(w) || said.has(one(w)));
    return namesTheOtherSide && IT_HAPPENED.test(s) && !NOT_YET.test(s) && !ONLY_PART_OF_IT.test(s);
  });
}

/** Each open wait a line on record says is done, with the day it was said. Pure, from rows the record holds. */
export function theWaitsSaidDone(
  waits: AnOpenWait[],
  lines: ALineOnRecord[],
  namesOf: (participantId: string) => string[],
  lastRaisedAt: (w: AnOpenWait) => Date,
  atTheCustomer: (holder: string) => string[] = () => [],
): { id: string; clearedAt: Date; lineId: string }[] {
  const out: { id: string; clearedAt: Date; lineId: string }[] = [];
  for (const w of waits) {
    const after = lastRaisedAt(w).getTime();
    const done = lines
      .filter((l) => l.checkInId !== w.sourceCheckInId && new Date(l.createdAt).getTime() > after)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .find((l) => aLineSaysItIsDone(l, w, namesOf, atTheCustomer));
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
  /* The customers each person outside the check-in is at: the deals whose contact they are. */
  const deals: any[] = (await Promise.resolve(prisma.workItem?.findMany?.({ where: { groundId, kind: 'deal' }, select: { name: true, fields: true } })).catch(() => [])) ?? [];
  const bare = (n: string) => String(n ?? '').trim().replace(/^(?:mr|mrs|ms|miss|dr)\.?\s+/i, '').toLowerCase();
  const atTheCustomer = (holder: string): string[] => {
    const h = bare(holder);
    if (!h) return [];
    return (Array.isArray(deals) ? deals : []).filter((d) => {
      const contact = typeof d?.fields?.Contact === 'string' ? bare(d.fields.Contact.split(',')[0]) : '';
      return contact && contact === h;
    }).map((d) => String(d.name ?? '')).filter(Boolean);
  };
  const cleared = theWaitsSaidDone(waits, lines, namesOf, (w) => {
    const at = w.sourceCheckInId ? doneAt.get(w.sourceCheckInId) : null;
    const made = new Date(w.createdAt);
    return at && at.getTime() > made.getTime() ? at : made;
  }, atTheCustomer);
  for (const c of cleared) {
    await prisma.groundDependency.updateMany({ where: { id: c.id, clearedAt: null }, data: { status: 'CLEARED', clearedAt: c.clearedAt } });
  }
  return cleared.length;
}

/*
 * A WAIT FOR AN EVENT ENDS WHEN ANYBODY IN THE ORGANISATION SAYS IT HAPPENED, IN ANY OF ITS CHECK-INS (messages test, fourth run).
 * Muchemi & Co. On Monday 12 October Wanjiru said in "Fee notes" that she was waiting "for the reply to be filed in Kasarani Foods v.
 * Tumaini Traders" and "for the hearing date to be set for the third Kasarani Foods fee note", and in "Litigation team daily" for
 * "confirmation of the Kasarani Foods filing". On Tuesday Brian said in "Litigation team daily" "The reply in Kasarani Foods v. Tumaini
 * Traders was filed today.", and on Wednesday David said there "In Kasarani Foods versus Tumaini Traders, the hearing date is set for
 * November 12th." The Fee notes board still had her waiting for both on Thursday and Friday: a wait was read only against the lines of
 * the check-in it was said in, and only from the person waiting or holding it.
 *
 * A wait for an event is one whose thing says the event: "<the thing> to be <filed, set, signed, ...> ..." or "confirmation of the
 * <matter> filing". It is over when a line said after it, in any of the organisation's check-ins that are not about one person, names
 * the thing and the matter it is about (its proper names, "Kasarani"), says it was filed, set or signed, and nothing in the sentence says
 * it has not or not yet, or that only part of it happened. Who said it does not matter: an event is a fact about the work. Only that
 * the wait is over is written (cleared on the day of that line); nobody's words move between check-ins. A correction of what is untrue,
 * so for every organisation.
 */
const AN_EVENT = /^\s*(?:the\s+|a\s+)?(.+?)\s+to\s+be\s+(filed|lodged|served|submitted|set|fixed|scheduled|listed|issued|granted|signed|approved|confirmed|heard|registered)\b(.*)$/i;
const A_FILING_CONFIRMED = /^\s*(?:the\s+)?(?:confirmation|news|word)\s+(?:of|that)\s+(?:the\s+)?(.+?)\s+(filing|lodging|submission)\s*$/i;
const AS_DONE: Record<string, string> = { filing: 'filed', lodging: 'lodged', submission: 'submitted' };
const NAME_WORD = /\b[A-Z][a-z]{2,}\b/g;

export interface AnEvent { thing: string[]; done: string; names: string[] }

/** The event a wait is for, or null when it is not one. */
export function theEventAWaitIsFor(what: string): AnEvent | null {
  const w = String(what ?? '').trim().replace(/[.\s]+$/, '');
  const a = AN_EVENT.exec(w);
  const b = a ? null : A_FILING_CONFIRMED.exec(w);
  if (!a && !b) return null;
  const head = (a ? a[1] : '').trim();
  const rest = a ? `${a[1]} ${a[3]}` : b![1];
  const names = [...new Set([...rest.matchAll(NAME_WORD)].map((m) => one(m[0].toLowerCase())))];
  const thing = a ? theThingsOwnWords(head).filter((x) => !names.includes(x)) : [];
  if (!thing.length && !names.length) return null;
  return { thing, done: a ? a[2].toLowerCase() : AS_DONE[b![2].toLowerCase()], names };
}

/** Whether one line says the event happened. */
export function aLineSaysTheEventHappened(line: { text: string }, e: AnEvent): boolean {
  return sentences(line.text).some((s) => {
    const said = new Set(wordsOf(s).map(one));
    if (!e.thing.every((w) => said.has(w))) return false;
    /* The matter: its first proper name at least ("Kasarani"). */
    if (e.names.length && !said.has(e.names[0])) return false;
    if (!new RegExp(`\\b${e.done}\\b`, 'i').test(s)) return false;
    return !NOT_YET.test(s.replace(/\bnot\s+(?:due|before)\b/gi, '')) && !ONLY_PART_OF_IT.test(s) && !STILL_WAITING.test(s);
  });
}

/** Clears, across the organisation of this check-in, every open wait for an event a line says happened. Returns how many. */
export async function clearTheWaitsAnEventEnded(prisma: any, groundId: string): Promise<number> {
  const here = await Promise.resolve(prisma.ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true } })).catch(() => null);
  if (!here?.organizationId) return 0;
  const grounds: any[] = (await Promise.resolve(prisma.ground?.findMany?.({ where: { organizationId: here.organizationId }, select: { id: true, scenario: true } })).catch(() => [])) ?? [];
  const ids = grounds.filter((g) => !isEvaluationCheckIn(g.scenario)).map((g) => g.id);
  if (!ids.length) return 0;
  const waits: AnOpenWait[] = (await prisma.groundDependency.findMany({
    where: { groundId: { in: ids }, status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null },
    select: { id: true, fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, createdAt: true, sourceCheckInId: true },
  })) ?? [];
  const events = waits.map((w) => ({ w, e: theEventAWaitIsFor(w.what) })).filter((x): x is { w: AnOpenWait; e: AnEvent } => !!x.e);
  if (!events.length) return 0;
  const lines: ALineOnRecord[] = (await prisma.recordEntry.findMany({
    where: { disputedAt: null, type: 'PROGRESS', participant: { groundId: { in: ids } } },
    select: { id: true, participantId: true, checkInId: true, type: true, text: true, createdAt: true },
  })) ?? [];
  let n = 0;
  for (const { w, e } of events) {
    const after = new Date(w.createdAt).getTime();
    const done = lines
      .filter((l) => l.checkInId !== w.sourceCheckInId && new Date(l.createdAt).getTime() > after)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .find((l) => aLineSaysTheEventHappened(l, e));
    if (!done) continue;
    await prisma.groundDependency.updateMany({ where: { id: w.id, clearedAt: null }, data: { status: 'CLEARED', clearedAt: new Date(done.createdAt) } });
    n++;
  }
  return n;
}
