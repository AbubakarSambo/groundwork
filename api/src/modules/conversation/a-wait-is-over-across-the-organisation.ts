import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { theReleaseOneSalesBoardIsOnFor } from '../board/release-one-sales-board';
import {
  aLineSaysItIsDone, one, wordsOf, sentences,
  NOT_YET, NOT_WAITING_ANY_MORE, ONLY_PART_OF_IT, STILL_WAITING, IT_WAS_FILED,
  type AnOpenWait, type ALineOnRecord,
} from './a-wait-said-done-is-cleared';

/**
 * A WAIT IS OVER WHEN THE RECORD SAYS SO, IN ANY OF THE ORGANISATION'S CHECK-INS (polish round 15, Muchemi & Co, U36, U38, U39, U40,
 * U44 and F4).
 *
 * Brian files court papers, and he is in both "Litigation team daily" and "Fee notes". On Wednesday 14 October he said in "Litigation
 * team daily" "The reply in Kasarani Foods v. Tumaini Traders was filed today." On Friday 16 October Njeri said there "I already raised
 * FN-005 today." and "The Kasarani reply was filed on Wednesday." On Monday 19 October Wanjiru said "Njeri is no longer waiting for the
 * Kasarani reply to be filed." Even so, all week:
 *  - Wanjiru's Today, letter and morning said "Brian Otieno is waiting for the e-filing portal to be working". He had waited on the portal
 *    to "file the reply", and he said he filed it.
 *  - Her Today said every day "Njeri Wambui is waiting on the litigation team for internal communication that the FN-005 reply has been
 *    filed". Njeri waited to be told the reply was filed, and on Friday she said herself that it was, and raised FN-005.
 *  - Her fees board said on Monday "You are waiting on Brian Otieno to file the reply for FN-005". The wait was raised in "Fee notes",
 *    where Brian had said nothing; he had said it in "Litigation team daily", five days before.
 *  - Her board said "Brian Otieno has been waiting on Njeri for the record of what has been paid". Njeri said on 12 October "I recorded
 *    the FN-004 payment today."
 *
 * READ FROM THE RECORD, NEVER GUESSED. The same person in two check-ins of one organisation is the same person: what they said in one is
 * read for a wait in the other, as theirs. Only that a wait is over is written; nobody's words move between check-ins. A wait is over
 * when a line, never a worry, a wish or a promise, with nothing in its sentence that says it has not happened or not yet, says:
 *  1. what the one waiting would do once it came, done by them: Brian waited on the portal to "file the reply", and said "The reply in
 *     Kasarani Foods v. Tumaini Traders was filed today."
 *  2. the thing the one waiting was waiting to be told, said by them: Njeri waited for "notification that the FN-005 reply has been filed"
 *     and said "The Kasarani reply was filed on Wednesday." in the check-in in which she said "I already raised FN-005 today." Whoever
 *     waits to be told something, and says it, has been told.
 *  3. by the lead of the check-in, that the one waiting is no longer waiting for it: "Njeri is no longer waiting for the Kasarani reply
 *     to be filed." Once the lead has corrected it, it stays corrected (CLAUDE.md, the first principle).
 *  4. by the one holding it, that the thing was filed, lodged, served or submitted, even before the wait was raised: a filing happens
 *     once. Wanjiru said on Monday that she was waiting on Brian for "the reply for FN-005"; Brian had said the reply was filed on
 *     Wednesday. A line that names a different number ("FN-006") is about something else.
 *  5. by the one holding it, that they did what the thing is the record of: "the record of what has been paid" and "I recorded the
 *     FN-004 payment today."
 * And, with Release 1's switch on as a-wait-said-done-is-cleared has it, everything that reads in the wait's own check-in, read across
 * the organisation's check-ins too.
 *
 * A wait is cleared on the day of that line, or the day it was raised if the line came first, so it is never late after it. For every
 * organisation, as a correction of what is untrue. A check-in about one person (an evaluation) is never read or written here.
 */

export interface AWaitIn extends AnOpenWait { groundId: string; then?: string | null }
export interface ALineIn extends ALineOnRecord { groundId: string }
export interface SomebodyIn { id: string; groundId: string; userId: string | null; partyType: string; names: string[] }

/* The words that say what a thing is: never a little word, a number, or a word every sentence has ("has", "been", "what"). */
const LITTLE = new Set(['the', 'a', 'an', 'for', 'of', 'on', 'to', 'from', 'with', 'and', 'or', 'my', 'our', 'their', 'his', 'her', 'its', 'this', 'that',
  'some', 'any', 'about', 'in', 'at', 'by', 'it', 'has', 'have', 'had', 'been', 'was', 'were', 'are', 'is', 'be', 'what', 'which', 'who', 'whom', 'when',
  'where', 'whether', 'client', 'something', 'anything', 'now', 'today', 'yesterday']);
const contentWords = (t: string): string[] => wordsOf(t).filter((w) => w.length >= 3 && !LITTLE.has(w) && !/^\d/.test(w) && !/^[a-z]{1,6}\d+$/.test(w)).map(one);
/* A reference with its letters, as a person writes it: "FN-005", "INV-12", "FN005". Never "on 14". */
const REF = /\b[A-Za-z]{1,6}-\d{2,8}\b|\b[A-Z]{1,6}\d{2,8}\b/g;
const numbersIn = (t: string): string[] => (String(t ?? '').match(REF) ?? []).map((n) => n.toLowerCase().replace(/-/g, ''));

/* ---- 1. What the one waiting would do once it came, done by them. ---- */
const PAST: Record<string, string> = {
  raise: 'raised', file: 'filed', lodge: 'lodged', serve: 'served', submit: 'submitted', send: 'sent', forward: 'forwarded',
  sign: 'signed', pay: 'paid', deliver: 'delivered', issue: 'issued', record: 'recorded', finish: 'finished', complete: 'completed',
  book: 'booked', invoice: 'invoiced', register: 'registered', release: 'released', ship: 'shipped', post: 'posted', publish: 'published',
};
const PRONOUN = new Set(['it', 'them', 'this', 'that', 'those', 'these', 'everything', 'all', 'one']);
const MODAL = /^\s*(?:(?:then|and|so)\s+)?(?:(?:i|we|she|he|they)\s+(?:will|can|could|would|'ll|shall)\s+|(?:i|we)'ll\s+|to\s+|(?:i|we)\s+(?:need|have|want)\s+to\s+)?(?:then\s+)?/i;
function whatTheyWouldDo(then: string | null | undefined): { done: string; object: string[]; numbers: string[] } | null {
  const t = String(then ?? '').trim().replace(/[.\s]+$/, '').replace(MODAL, '');
  const m = /^([a-z]+)\b(.*)$/i.exec(t);
  if (!m) return null;
  const done = PAST[m[1].toLowerCase()];
  if (!done) return null;
  const rest = m[2];
  const object = contentWords(rest).filter((w) => !PRONOUN.has(w) && !/ly$/.test(w));
  return { done, object, numbers: numbersIn(rest) };
}
function theyDidWhatItWasFor(line: ALineIn, wait: AWaitIn): boolean {
  if (line.participantId !== wait.fromParticipantId) return false;
  const would = whatTheyWouldDo(wait.then);
  if (!would) return false;
  return sentences(line.text).some((s) => {
    if (!new RegExp(`\\b${would.done}\\b`, 'i').test(s)) return false;
    const said = new Set(wordsOf(s).map(one));
    if (!would.object.every((w) => said.has(w))) return false;
    if (would.numbers.length && !would.numbers.every((n) => numbersIn(s).includes(n))) return false;
    return !NOT_YET.test(s) && !ONLY_PART_OF_IT.test(s) && !STILL_WAITING.test(s);
  });
}

/* ---- 2. The thing the one waiting was waiting to be told, said by them. ---- */
const TO_BE_TOLD = /^\s*(?:the\s+|an?\s+)?(?:(?:internal\s+)?(?:information|notification|communication|confirmation|news|word|notice|message)|being\s+(?:informed|told|notified)|to\s+(?:know|hear|be\s+told|be\s+informed))\s+(?:that|of|about|on|whether)?\s*(.+)$/i;
const DONE_WORD = /\b(filed|lodged|served|submitted|set|signed|approved|paid|raised|sent|received|delivered|completed|issued|registered)\b/i;
function whatTheyWaitToBeTold(what: string): { done: string; words: string[]; numbers: string[] } | null {
  const m = TO_BE_TOLD.exec(String(what ?? '').trim().replace(/[.\s]+$/, ''));
  if (!m) return null;
  const rest = m[1];
  const d = DONE_WORD.exec(rest);
  if (!d) return null;
  const done = d[1].toLowerCase();
  const words = contentWords(rest).filter((w) => w !== done && w !== one(done));
  return { done, words, numbers: numbersIn(rest) };
}
function theyWereTold(line: ALineIn, wait: AWaitIn, theirLines: ALineIn[]): boolean {
  if (line.participantId !== wait.fromParticipantId) return false;
  const told = whatTheyWaitToBeTold(wait.what);
  if (!told) return false;
  const saidIt = sentences(line.text).some((s) => {
    if (!new RegExp(`\\b${told.done}\\b`, 'i').test(s)) return false;
    const said = new Set(wordsOf(s).map(one));
    if (!told.words.every((w) => said.has(w))) return false;
    return !NOT_YET.test(s) && !ONLY_PART_OF_IT.test(s) && !STILL_WAITING.test(s);
  });
  if (!saidIt) return false;
  /* "FN-005" is named in the same check-in by the same person: "I already raised FN-005 today." */
  if (!told.numbers.length) return true;
  const there = theirLines.filter((l) => l.participantId === line.participantId && l.checkInId === line.checkInId).flatMap((l) => numbersIn(l.text));
  return told.numbers.every((n) => there.includes(n));
}

/* ---- 3. The lead says the one waiting is no longer waiting for it. ---- */
function theLeadSaysTheyAreNoLongerWaiting(line: ALineIn, wait: AWaitIn, leads: ReadonlySet<string>, namesOf: (pid: string) => string[]): boolean {
  if (!leads.has(line.participantId) || line.participantId === wait.fromParticipantId) return false;
  const thing = contentWords(wait.what);
  const waiting = namesOf(wait.fromParticipantId).flatMap((n) => wordsOf(n)).filter((w) => w.length >= 2);
  return sentences(line.text).some((s) => {
    if (!NOT_WAITING_ANY_MORE.test(s)) return false;
    const said = new Set(wordsOf(s).map(one));
    return waiting.some((w) => said.has(w)) && thing.some((w) => said.has(w));
  });
}

/* ---- 4. The one holding it says the thing was filed. ---- */
function theHolderFiledIt(line: ALineIn, wait: AWaitIn): boolean {
  if (!wait.onParticipantId || line.participantId !== wait.onParticipantId) return false;
  const thing = contentWords(wait.what).filter((w) => !['filed', 'filing', 'file'].includes(w));
  if (!thing.length) return false;
  const numbers = numbersIn(wait.what);
  return sentences(line.text).some((s) => {
    if (!IT_WAS_FILED.test(s) || NOT_YET.test(s) || ONLY_PART_OF_IT.test(s)) return false;
    const said = new Set(wordsOf(s).map(one));
    if (!thing.every((w) => said.has(w))) return false;
    /* A different number is a different thing; no number is the thing the holder has in hand. */
    const named = numbersIn(s);
    return !named.length || !numbers.length || numbers.some((n) => named.includes(n));
  });
}

/* ---- 5. The one holding it did what the thing is the record of. ---- */
const A_RECORD_OF = /^\s*(?:the\s+|a\s+)?(record|recording)\s+(?:of|for)\s+(.+)$/i;
const PAY = (w: string) => (/^(?:paid|pay|payment|paying)$/.test(w) ? 'pay' : w);
function theHolderDidWhatItIsTheRecordOf(line: ALineIn, wait: AWaitIn): boolean {
  if (!wait.onParticipantId || line.participantId !== wait.onParticipantId) return false;
  const m = A_RECORD_OF.exec(String(wait.what ?? '').trim().replace(/[.\s]+$/, ''));
  if (!m) return false;
  const of = contentWords(m[2]).map(PAY);
  if (!of.length) return false;
  return sentences(line.text).some((s) => {
    if (!/\brecorded\b/i.test(s) || NOT_YET.test(s)) return false;
    const said = new Set(wordsOf(s).map(one).map(PAY));
    return of.every((w) => said.has(w));
  });
}

/**
 * Which line, if any, ends this wait. `lines` are the organisation's lines with each speaker already given their place in the wait's
 * own check-in (see clearTheWaitsOverAcrossTheOrganisation). Pure, from rows the record holds.
 */
export function theLineThatEndsTheWait(
  wait: AWaitIn,
  lines: ALineIn[],
  namesOf: (pid: string) => string[],
  leads: ReadonlySet<string>,
  releaseOne = false,
): ALineIn | null {
  const made = new Date(wait.createdAt).getTime();
  const sorted = lines
    .filter((l) => l.checkInId !== wait.sourceCheckInId && String(l.type).toUpperCase() === 'PROGRESS')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const l of sorted) {
    const after = new Date(l.createdAt).getTime() > made;
    if (theHolderFiledIt(l, wait)) return l;
    if (!after) continue;
    if (theyDidWhatItWasFor(l, wait) || theyWereTold(l, wait, lines) || theLeadSaysTheyAreNoLongerWaiting(l, wait, leads, namesOf)
      || theHolderDidWhatItIsTheRecordOf(l, wait) || (releaseOne && aLineSaysItIsDone(l, wait, namesOf, () => [], leads))) return l;
  }
  return null;
}

/** Clears every open wait in the organisation of this check-in that a line on record ends. Returns how many. */
export async function clearTheWaitsOverAcrossTheOrganisation(prisma: any, groundId: string): Promise<number> {
  const here = await Promise.resolve(prisma.ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true } })).catch(() => null);
  if (!here?.organizationId) return 0;
  const grounds: any[] = (await Promise.resolve(prisma.ground?.findMany?.({ where: { organizationId: here.organizationId }, select: { id: true, scenario: true } })).catch(() => [])) ?? [];
  const ids = grounds.filter((g) => !isEvaluationCheckIn(g.scenario)).map((g) => g.id);
  if (!ids.length) return 0;
  const waits: AWaitIn[] = (await prisma.groundDependency.findMany({
    where: { groundId: { in: ids }, status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null },
    select: { id: true, groundId: true, fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, then: true, createdAt: true, sourceCheckInId: true },
  })) ?? [];
  if (!waits.length) return 0;
  const rows: any[] = (await prisma.groundParticipant.findMany({
    where: { groundId: { in: ids } },
    select: { id: true, groundId: true, userId: true, partyType: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
  })) ?? [];
  const people: SomebodyIn[] = rows.map((p) => ({
    id: p.id, groundId: p.groundId, userId: p.userId ?? null, partyType: String(p.partyType ?? ''),
    names: [p.user?.firstName, p.user?.lastName, p.nameGiven].filter((n): n is string => !!n && !!String(n).trim()),
  }));
  const lines: ALineIn[] = ((await prisma.recordEntry.findMany({
    where: { disputedAt: null, type: 'PROGRESS', participant: { groundId: { in: ids } } },
    select: { id: true, participantId: true, checkInId: true, type: true, text: true, createdAt: true, participant: { select: { groundId: true } } },
  })) ?? []).map((l: any) => ({ ...l, groundId: l.groundId ?? l.participant?.groundId }));
  const releaseOne = await theReleaseOneSalesBoardIsOnFor(prisma, groundId).catch(() => false);
  return (await theWaitsOverAcrossTheOrganisation(waits, lines, people, async (id, clearedAt) => {
    await prisma.groundDependency.updateMany({ where: { id, clearedAt: null }, data: { status: 'CLEARED', clearedAt } });
  }, releaseOne)).length;
}

/** The waits the record ends, each with the day it ended. Each speaker is read as their place in the wait's own check-in. */
export async function theWaitsOverAcrossTheOrganisation(
  waits: AWaitIn[],
  lines: ALineIn[],
  people: SomebodyIn[],
  clear: (id: string, clearedAt: Date) => Promise<void> = async () => undefined,
  releaseOne = false,
): Promise<{ id: string; clearedAt: Date; lineId: string }[]> {
  const byId = new Map(people.map((p) => [p.id, p]));
  const namesOf = (pid: string) => byId.get(pid)?.names ?? [];
  const out: { id: string; clearedAt: Date; lineId: string }[] = [];
  for (const w of waits) {
    const there = people.filter((p) => p.groundId === w.groundId);
    const placeHere = (speaker: string): string | null => {
      const p = byId.get(speaker);
      if (!p) return null;
      if (p.groundId === w.groundId) return p.id;
      return p.userId ? there.find((x) => x.userId === p.userId)?.id ?? null : null;
    };
    const leads = new Set(there.filter((p) => p.partyType === 'INITIATOR').map((p) => p.id));
    /* "Njeri", written as a label, is Njeri: a wait kept with a colleague's own name as its label is on that colleague. */
    const label = String(w.onLabel ?? '').trim().toLowerCase();
    const named = !w.onParticipantId && label
      ? there.filter((p) => p.names.some((n) => n.trim().toLowerCase() === label) || p.names.slice(0, 2).join(' ').trim().toLowerCase() === label)
      : [];
    const wait: AWaitIn = named.length === 1 ? { ...w, onParticipantId: named[0].id } : w;
    const read = lines
      .map((l) => ({ l, as: placeHere(l.participantId) }))
      .filter((x): x is { l: ALineIn; as: string } => !!x.as)
      .map(({ l, as }) => ({ ...l, participantId: as }));
    const ended = theLineThatEndsTheWait(wait, read, namesOf, leads, releaseOne);
    if (!ended) continue;
    const clearedAt = new Date(Math.max(new Date(w.createdAt).getTime(), new Date(ended.createdAt).getTime()));
    await clear(w.id, clearedAt);
    out.push({ id: w.id, clearedAt, lineId: ended.id });
  }
  return out;
}
