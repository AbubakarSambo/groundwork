import type { Effort } from '../conversation/a-blocker-is-not-a-blocker-until-you-have-tried';
import { subjectFor } from './where-each-person-is-against-their-number';

/**
 * THE SAME THING, STILL OPEN, FOR THREE CHECK-INS (week 12, screens requests 3c and 11).
 *
 * The prototype's board puts one line under "What needs you in this check-in" that no read of ours
 * wrote: "Samuel has chased the same 5 leads for 3 check-ins", and under it what happened and what
 * would change it. Today carries the same line ("Samuel has followed up the same 5 leads for 3
 * check-ins. None have replied.").
 *
 * FROM THE RECORD, NEVER FROM A RATING. Two things the record already counts in check-ins:
 *   - a promise said again: `GroundCommitment.statedInSession` and `saidAgainIn`, still open;
 *   - something in the way said again: an open `GroundDependency` first said in one of the person's
 *     check-ins and said again in their latest, with three or more of their check-ins in between.
 * Nothing here reads how anybody's answers were rated, and nothing names what somebody is.
 *
 * THREE, AND NOT FEWER (decision 8). One or two check-ins is something that may be nothing; the
 * prototype names a thing only after three check-ins in a row.
 *
 * WHO READS IT. Only the person who runs the check-in. It is about one person's work across their
 * check-ins, which is each person's load, so it is never served to a colleague or to an admin who
 * only reads. The caller decides that; this file only writes the sentences, with the name the row
 * already resolved for that reader, or "a colleague".
 */

export const CHECK_INS_BEFORE_IT_IS_SAID = 3;

export interface ThePerson {
  participantId: string;
  /** The name as resolved for this reader, or "A colleague". Never an email address. */
  who: string;
  nameIsTheirRole?: boolean;
  /** The first name, for every sentence after the first. Set by `whatHasStayedTheSame`. */
  short?: string;
  /** The sessions of the check-ins they have finished. */
  finished: number[];
}

export interface APromiseKept {
  participantId: string | null;
  text: string;
  status: string;
  statedInSession: number | null;
  saidAgainIn: number[];
  /** True only where `text` is their own words, as they said them. */
  theirWords: boolean;
}

export interface AThingInTheWay {
  fromParticipantId: string;
  what: string;
  status: string;
  /** The session of their check-in in which they first said it. */
  firstSaidIn: number | null;
  /** The session of their check-in in which they last said it. */
  lastSaidIn: number | null;
  tried: Effort;
  /** What they wait on is with the reader. */
  onTheReader?: boolean;
}

export interface ToLookAt {
  /** One sentence: what happened, in the prototype's form. */
  says: string;
  /** What the record shows and what would change it, in full sentences. */
  detail: string;
  participantId: string;
  /** How many check-ins it has stayed open for. */
  checkIns: number;
}

const listed = (ns: number[]) => (ns.length <= 1 ? ns.join('') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`);

/**
 * AFTER THE FIRST SENTENCE, THE FIRST NAME. "Samuel Kariuki has made the same promise for 3
 * check-ins. Samuel promised to…", as the prototype says "Samuel has chased the same 5 leads". A
 * title keeps the name after it ("Mr Eze"), and where two people share a first name each keeps the
 * whole name, so the lead is never left guessing which one. Never a pronoun.
 */
function firstNames(people: ThePerson[]): Map<string, string> {
  const out = new Map<string, string>();
  const firstOf = (p: ThePerson): string | null => {
    const who = (p.who ?? '').trim();
    if (!who || p.nameIsTheirRole || /colleague$|^(?:your|the) lead$/i.test(who)) return null;
    const m = who.match(/^((?:(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+)?\S+)/);
    return m ? m[1] : null;
  };
  const firsts = people.map((p) => [p.participantId, firstOf(p)] as const);
  for (const [id, f] of firsts) {
    if (f && firsts.filter(([, g]) => g === f).length === 1) out.set(id, f);
  }
  return out;
}

/** "this colleague" where the row has no name: the line is about one person, not anybody. */
function them(p: ThePerson, atTheStart: boolean): string {
  if (p.short) return p.short;
  const s = subjectFor(p, atTheStart);
  return /^(?:a|an|one|another)\s+(?:[a-z]+\s+)?colleague$/i.test(s) ? (atTheStart ? 'This colleague' : 'this colleague') : s;
}

/** "the signed lease" inside a sentence; a name at the start stays as it is. */
const inside = (phrase: string) => {
  const t = (phrase ?? '').trim().replace(/[.!?]+$/, '');
  return /^(The|A|An|Our|Their|His|Her|My)\b/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};

function aPromise(p: ThePerson, c: APromiseKept): ToLookAt | null {
  if (String(c.status).toUpperCase() !== 'UNKNOWN' || c.statedInSession == null) return null;
  const sessions = Array.from(new Set([c.statedInSession, ...(c.saidAgainIn ?? [])])).sort((a, b) => a - b);
  if (sessions.length < CHECK_INS_BEFORE_IT_IS_SAID) return null;
  const text = (c.text ?? '').trim().replace(/[.!?]+$/, '');
  const when = `in check-ins ${listed(sessions)}`;
  const start = subjectFor(p, true);
  let what: string;
  if (text && !/^(?:i|we|i'm|we're|i'll|we'll)\b/i.test(text)) {
    /* "call Lakeside on Friday": the promise, said without guessing anybody's pronoun. */
    what = `${them(p, true)} promised to ${text.charAt(0).toLowerCase()}${text.slice(1)} ${when}.`;
  } else if (text && c.theirWords) {
    /* Their own sentence, as they said it, and only then in quotation marks. */
    const raw = (c.text ?? '').trim();
    what = `${when.charAt(0).toUpperCase()}${when.slice(1)}, ${them(p, false)} said, "${/[.!?]$/.test(raw) ? raw : `${raw}.`}"`;
  } else {
    what = `${them(p, true)} made it ${when}.`;
  }
  return {
    says: `${start} has made the same promise for ${sessions.length} check-ins.`,
    detail: `${what} Nobody has said yet whether it happened. Asking ${them(p, false)} what is stopping it, or agreeing to drop it, would settle it.`,
    participantId: p.participantId,
    checkIns: sessions.length,
  };
}

function aThingInTheWay(p: ThePerson, d: AThingInTheWay): ToLookAt | null {
  if (String(d.status).toUpperCase() === 'CLEARED' || d.tried === 'went-around') return null;
  if (d.firstSaidIn == null || d.lastSaidIn == null || d.lastSaidIn <= d.firstSaidIn) return null;
  /* Still said: their latest check-in is where they last said it. Nobody mentioning it since is not
     "still in the way" (see a-blocker-nobody-raised-again). */
  const latest = Math.max(...p.finished);
  if (d.lastSaidIn !== latest) return null;
  const n = p.finished.filter((s) => s >= (d.firstSaidIn as number) && s <= (d.lastSaidIn as number)).length;
  if (n < CHECK_INS_BEFORE_IT_IS_SAID) return null;
  const start = subjectFor(p, true);
  const what = inside(d.what);
  const first = `${them(p, true)} first said in check-in ${d.firstSaidIn} that ${what} was in the way, and said so again in check-in ${d.lastSaidIn}.`;
  const next = d.onTheReader
    ? `It is waiting on you. Giving ${them(p, false)} an answer, or saying when you will, would move it.`
    : d.tried === 'escalated'
      ? `It has been taken above the person it was with. Asking ${them(p, false)} what came back would show whether it is moving.`
      : d.tried === 'nothing'
        ? 'Nobody has said yet what was tried to clear it. Finding out who could clear it, and asking them, would move it.'
        : 'So far it has only been asked about. Chasing it, or asking someone else, would move it.';
  return {
    says: `${start} has had the same thing in the way for ${n} check-ins.`,
    detail: `${first} ${next}`,
    participantId: p.participantId,
    checkIns: n,
  };
}

/**
 * Every case, longest open first, at most one of each kind per person and five in all: a list the
 * lead reads down, not a record of everything.
 */
export function whatHasStayedTheSame(
  people: ThePerson[],
  promises: APromiseKept[],
  inTheWay: AThingInTheWay[],
  most = 5,
): ToLookAt[] {
  const out: ToLookAt[] = [];
  const short = firstNames(people);
  for (const person of people) {
    const p = { ...person, short: short.get(person.participantId) };
    if (!p.finished.length) continue;
    const promise = promises
      .filter((c) => c.participantId === p.participantId)
      .map((c) => aPromise(p, c))
      .filter((x): x is ToLookAt => !!x)
      .sort((a, b) => b.checkIns - a.checkIns)[0];
    const blocked = inTheWay
      .filter((d) => d.fromParticipantId === p.participantId)
      .map((d) => aThingInTheWay(p, d))
      .filter((x): x is ToLookAt => !!x)
      .sort((a, b) => b.checkIns - a.checkIns)[0];
    if (blocked) out.push(blocked);
    if (promise) out.push(promise);
  }
  return out.sort((a, b) => b.checkIns - a.checkIns).slice(0, most);
}

/**
 * THE CHECK-IN IN WHICH SOMETHING WAS FIRST SAID, from when its row was written.
 *
 * A handoff row keeps the check-in it was last said in (`sourceCheckInId`, moved on each restatement)
 * and the time it was first written (`createdAt`), not the first check-in itself. The row is written
 * while, or just after, that check-in finishes, so the first check-in is their earliest one that
 * finished no sooner than a little before the row was written.
 */
export function theCheckInItWasFirstSaidIn(
  createdAt: Date | string,
  theirs: { sessionNumber: number; completedAt: Date | string | null }[],
): number | null {
  const at = new Date(createdAt).getTime();
  const SLACK = 2 * 60 * 60 * 1000;
  const after = theirs
    .filter((c) => c.completedAt != null && new Date(c.completedAt).getTime() >= at - SLACK)
    .map((c) => c.sessionNumber)
    .sort((a, b) => a - b);
  return after.length ? after[0] : null;
}
