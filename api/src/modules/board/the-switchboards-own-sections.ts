import { theWaitSaid, aHolderThatIsOnlyTheThing } from './a-wait-said-in-full';
import { howManyGoalsAreNotTold } from '../grounds/a-goal-not-told-stays-with-the-lead';
import { holdsItSaid, theReaderSaidAsYou, aThingWithoutItsHolder } from './a-holder-in-their-own-words';
import { aCommitmentSaid, looksLikeATimeOrADate, inOurVoice } from '../reports/what-the-record-shows-over-time';
import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';
import { aPartyOutside, theSameThing } from './a-thing-is-not-somebody';

/**
 * THE SWITCHBOARD'S OWN SECTIONS: THE ONES NO OTHER FIELD OF THE BOARD CARRIES (request 70).
 *
 * The prototype's switchboard (docs/modules.md G2) names 30 sections. 22 had no served field. The map in
 * docs/answers-from-engine.md ("1 October: the switchboard's 22 sections") says which of those the board
 * already carries under another name, and which it does not. This file builds the ones it does not, and
 * only those: Risks, Work plan, Timeline, Person history, Blocker check, Evidence index, and Busy or moving.
 *
 * EVERY SECTION IS ARITHMETIC OVER ROWS THE RECORD ALREADY HOLDS. No model is asked anything, nothing is
 * written, and opening the board changes nothing (decision 7). A section the record cannot fill is left
 * out, never guessed. Nothing here rates, scores or labels anybody (decision 6): each line says what was
 * said, what happened to it, or what is still open, and the person it is about is named as a person.
 *
 * WHO READS WHAT is decided once by the caller and handed in as `WhoIsReading`, so no section here decides
 * it for itself:
 *  - `personMayBeRead(id)`: whether the reader may read something that is about that one person. Their
 *    own, always. Everybody's, for whoever runs the check-in (the lead, the admin who set it up, and an
 *    admin of the organisation on a check-in that is not an evaluation). Nobody's, for an admin who has
 *    no access to an evaluation check-in.
 *  - `handoffMayBeRead(row)`: the same for a handoff, which names two people.
 *  - `mayReadEveryone`: whether the reader runs the check-in. The sections about how one person is doing
 *    (Person history beyond your own, Busy or moving) are for those readers only.
 */

export interface WhoIsReading {
  /** The reader's own participant row, when they are a party. */
  meId: string | null;
  /** The reader's own full name, first name and last name, so their name inside words about somebody else is said as "you". */
  myNames?: string[];
  /** Whether the reader runs this check-in, in the sense of the pattern rule (who-reads-a-pattern.ts). */
  mayReadEveryone: boolean;
  /** Whether the reader is the person who runs it: they are "you" in the lead's own sentences. */
  theLeadsId: string | null;
  personMayBeRead: (participantId: string | null | undefined) => boolean;
  handoffMayBeRead: (d: { fromParticipantId?: string | null; onParticipantId?: string | null; what?: string | null }) => boolean;
  /**
   * Whether the reader may read what a person committed to. The lead's own commitments are the lead's
   * intentions: a person reviewed in an evaluation check-in never reads them, and on any check-in a
   * participant never reads one of the lead's that names somebody (decisions 4 and 30). Where the reader
   * runs the check-in, or the commitment is their own, this is the same as `personMayBeRead`.
   */
  commitmentMayBeRead: (c: { participantId?: string | null; text?: string | null }) => boolean;
  /** The name this reader may read for a person, or null. The reader themselves is named 'You'. */
  nameOf: (participantId: string) => string | null;
  /** Said when this reader may not read the person's name: 'A colleague'. */
  aColleague: (participantId: string | null | undefined) => string;
}

export interface ACommitment {
  id: string;
  participantId: string | null;
  text: string;
  whenSaid: string | null;
  explicit: boolean;
  status: string;
  source: string;
  statedInSession: number | null;
  saidAgainIn: number[];
  settledBy: string | null;
  settledAt: Date | string | null;
  /** The check-in it was settled in, where it was settled in one. */
  settledInCheckInId?: string | null;
  saidWordForWord: boolean;
  whenSaidWordForWord: boolean;
  createdAt: Date | string;
}

export interface AHandoff {
  id: string;
  fromParticipantId: string;
  onParticipantId: string | null;
  onLabel: string | null;
  what: string;
  status: string;
  triedSaid: string | null;
  escalatedAt: Date | string | null;
  dueSaid: string | null;
  dueOn: Date | string | null;
  clearedAt: Date | string | null;
  createdAt: Date | string;
  /** The check-in the person first said it in. */
  sourceCheckInId?: string | null;
  /**
   * The passage of what this person typed in that check-in that `triedSaid` is, character for character,
   * or null. Set when the board is built from the record (the-handoff-words-the-person-typed). Only this
   * may be put inside quotation marks; a tidied or joined `triedSaid` never is.
   */
  triedSaidTheirWords?: string[] | null;
  /** The same for `dueSaid`. */
  dueSaidTheirWords?: string[] | null;
}

export interface ASession {
  id?: string;
  participantId: string;
  sessionNumber: number;
  status: string;
  completedAt: Date | string | null;
  isSetup?: boolean;
}

const day = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  /* Africa/Lagos: the same clock every board date is counted in. */
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
};

const saidAsDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d} ${months[m - 1]}${new Date().getUTCFullYear() === y ? '' : ` ${y}`}`;
};

const inASentence = (phrase: string): string => {
  const t = (phrase ?? '').trim().replace(/[.!?]+$/, '');
  return /^(The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That|Our|Their|His|Her|Its)\b/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};

const listed = (ns: string[]) => (ns.length <= 1 ? ns.join('') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const isAre = (who: string) => (who === 'You' ? 'are' : 'is');
const hasHave = (who: string) => (who === 'You' ? 'have' : 'has');

/** Each of their sentences in quotation marks, as they typed them, joined as a sentence reads. */
const theirSentencesQuoted = (them: string[]): string => {
  const q = them.map((t) => `"${t}"`);
  const list = q.length <= 1 ? q.join('') : `${q.slice(0, -1).join(', ')} and ${q[q.length - 1]}`;
  return `${list}${/[.!?]$/.test(them[them.length - 1]) ? '' : '.'}`;
};

/**
 * WHAT WAS TRIED. Inside quotation marks only where the words are the person's own: the stored text if
 * found in what they typed in that check-in, otherwise the sentences of theirs it was drawn from. Where
 * no sentence of theirs is its source, only that they have said it. Never their words without marks.
 */
/**
 * THE TALLY AS A SENTENCE, NO ZERO COUNTED (request 131 item 4). "0 are done, 0 are not done or dropped, and 1 is still open."
 * counted what is not there. Only what there is gets a number, and none done is said as none done yet.
 */
export function theTallySaid(done: number, notDone: number, open: number): string {
  const parts: string[] = [];
  parts.push(done > 0 ? `${done} ${done === 1 ? 'is' : 'are'} done` : 'None is done yet');
  if (notDone > 0) parts.push(`${notDone} ${notDone === 1 ? 'is' : 'are'} not done or dropped`);
  if (open > 0) parts.push(`${open} ${open === 1 ? 'is' : 'are'} still open`);
  if (parts.length === 1) return `${parts[0]}.`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}.`;
}

export function whatWasTriedSaid(d: AHandoff, who: string): string | null {
  if (!d.triedSaid?.trim()) return null;
  const them = d.triedSaidTheirWords;
  if (them?.length) return `About what has been tried, ${midSentence(who)} said, ${theirSentencesQuoted(them)}`;
  return `${who} ${hasHave(who)} said what has been tried.`;
}

/** WHEN IT IS DUE, by the same rule. */
export function theTimeGivenSaid(d: AHandoff, who: string): string | null {
  if (!d.dueSaid?.trim()) return null;
  const them = d.dueSaidTheirWords;
  if (them?.length === 1 && them[0].replace(/[.!?]+$/, '').toLowerCase() === d.dueSaid.trim().replace(/[.!?]+$/, '').toLowerCase()) return `The time given for it was "${them[0].replace(/[.!?]+$/, '')}".`;
  if (them?.length) return `About when it is due, ${midSentence(who)} said, ${theirSentencesQuoted(them)}`;
  return 'A time has been given for it.';
}

const midSentence = (who: string) => (who === 'You' ? 'you' : who);
const possessive = (who: string) => (who === 'You' ? 'Your' : `${who}'s`);

/** Who, as a sentence starts with them: the reader's own name is 'You', somebody they may not name is 'A colleague'. */
export function whoIs(r: WhoIsReading, participantId: string | null | undefined): string {
  if (!participantId) return 'Somebody';
  if (r.meId && participantId === r.meId) return 'You';
  return r.nameOf(participantId) ?? r.aColleague(participantId);
}

/** Who a handoff waits on, said inside a sentence: "you", a name, "a colleague", or the team outside named for it. A thing is not somebody (request 107 b). */
export function whoIsWaitedOn(r: WhoIsReading, d: { onParticipantId?: string | null; onLabel?: string | null; what?: string | null }): string | null {
  if (d.onParticipantId) {
    if (d.onParticipantId === r.meId) return 'you';
    const n = r.nameOf(d.onParticipantId) ?? r.aColleague(d.onParticipantId);
    return /^(A|Another|One) colleague/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n;
  }
  return aPartyOutside(d) ? d.onLabel!.trim() : null;
}

/**
 * WHAT A WAIT IN TURN WAITS ON, AS ITS OWN SENTENCE, where that was said and is a thing rather than
 * somebody: " That waits on a decision on who owns them." Nothing where it is somebody, or the same
 * thing as what is waited for (request 107 b). Put after the sentence about the wait, never inside it.
 */
export function thatWaitsOn(d: { what: string; onLabel?: string | null; onParticipantId?: string | null }): string {
  const on = (d.onLabel ?? '').trim();
  if (d.onParticipantId || !on || aPartyOutside(d) || theSameThing(on, d.what)) return '';
  return ` That waits on ${inASentence(on)}.`;
}

/*
 * THE SESSIONS SO FAR ARE THE ONES SOMEBODY FINISHED, as the report counts them (request 111 d). The board
 * counted every session row, opened or not, so a session opened early made the work plan say "open for 2
 * sessions" where the report said "open for 1 session" about the same commitment.
 */
const theSessionsSoFar = (sessions: ASession[], commitments: ACommitment[]): number =>
  Math.max(1, ...sessions.filter((s) => !s.isSetup && String(s.status).toUpperCase() === 'COMPLETED').map((s) => s.sessionNumber), ...commitments.map((c) => c.statedInSession ?? 0));

/** What a person committed to, as the end of a sentence, or null when it cannot be said in our voice. */
const clauseOf = (c: ACommitment, r?: WhoIsReading): string | null => {
  /* "me" in a promise about themselves is "you" to the person and "them" to anybody else (request 123, item 9). */
  const clause = inOurVoice(c.text, r?.meId && c.participantId === r.meId ? 'you' : 'them');
  return clause && r ? theReaderSaidAsYou(clause, r.myNames) : clause;
};

/**
 * A promise as the end of "<who> committed to ...", for a reader: "send a photo of the delivery sheets on
 * Friday". The same rule the work plan says it by (request 123 item 9), for "Who owns what" (request 130 b).
 */
export function whatTheyCommittedTo(text: string, participantId: string | null, meId: string | null, myNames?: string[]): string | null {
  return clauseOf({ text, participantId } as ACommitment, { meId, myNames } as WhoIsReading);
}

/* ------------------------------------------------------------------------------------------------
 * WORK PLAN: who is doing what, and by when
 * ---------------------------------------------------------------------------------------------- */

export interface AWorkPlanRow {
  id: string;
  participantId: string | null;
  who: string | null;
  /** One or two full sentences: what was committed to, the time given, and what has happened to it. */
  says: string;
  /** The person's own words for when, where those words read as a time. Never turned into a date. */
  when: string | null;
  state: 'open' | 'done' | 'not done' | 'dropped';
  statedInSession: number | null;
}

const stateOf = (status: string): AWorkPlanRow['state'] => {
  const s = String(status).toUpperCase();
  return s === 'DONE' ? 'done' : s === 'NOT_DONE' ? 'not done' : s === 'DROPPED' ? 'dropped' : 'open';
};

export function theWorkPlan(
  commitments: ACommitment[],
  sessions: ASession[],
  r: WhoIsReading,
): AWorkPlanRow[] {
  const so = theSessionsSoFar(sessions, commitments);
  const leadLabel = r.theLeadsId ? whoIs(r, r.theLeadsId) : 'The person running this check-in';
  return commitments
    .filter((c) => r.personMayBeRead(c.participantId) && r.commitmentMayBeRead(c))
    .map((c) => {
      const who = c.participantId ? whoIs(r, c.participantId) : null;
      const says = aCommitmentSaid({
        who: who ?? 'Somebody',
        what: c.text,
        when: c.whenSaid,
        statedInSession: c.statedInSession,
        restatedIn: [...(c.saidAgainIn ?? [])].sort((a, b) => a - b),
        status: c.status,
        theySaidIt: !!c.explicit,
        settledBy: c.settledBy,
        fromAPaste: c.source === 'PASTE',
        leadLabel,
        saidWordForWord: c.saidWordForWord === true,
        whenSaidWordForWord: c.whenSaidWordForWord === true,
      }, so);
      const when = c.whenSaid && (c.whenSaidWordForWord === true || looksLikeATimeOrADate(c.whenSaid)) ? c.whenSaid.trim() : null;
      return { id: c.id, participantId: c.participantId, who, says, when, state: stateOf(c.status), statedInSession: c.statedInSession ?? null };
    })
    /* What is still open first, then what ended, each in the order it was said. */
    .sort((a, b) => Number(b.state === 'open') - Number(a.state === 'open') || (a.statedInSession ?? 0) - (b.statedInSession ?? 0));
}

/* ------------------------------------------------------------------------------------------------
 * RISKS: what could go wrong, each with the facts it rests on
 * ---------------------------------------------------------------------------------------------- */

export interface ARisk {
  id: string;
  /** One full sentence about the work. */
  says: string;
  /** The facts in the record it rests on, in full sentences. */
  because: string;
}

const MOST_RISKS = 10;

/** When a wait was first said, what was tried, and the time given, in full sentences. */
function theFactsOfAWait(d: AHandoff, who: string): string {
  const since = day(d.createdAt);
  const facts: string[] = [];
  if (since) facts.push(`It was first said on ${saidAsDate(since)}.`);
  facts.push(whatWasTriedSaid(d, who) ?? 'Nobody has said what has been tried.');
  facts.push(theTimeGivenSaid(d, who) ?? 'No time has been given for it.');
  return facts.join(' ');
}

const isOpen = (d: AHandoff) => String(d.status).toUpperCase() !== 'CLEARED' && !d.clearedAt;

export function theRisks(
  commitments: ACommitment[],
  handoffs: AHandoff[],
  sessions: ASession[],
  targetsNobodyOwns: string | null,
  r: WhoIsReading,
): ARisk[] {
  const out: ARisk[] = [];

  /* 1. Somebody cannot move until something comes. */
  for (const d of handoffs) {
    if (String(d.status).toUpperCase() === 'CLEARED' || d.clearedAt) continue;
    if (!r.handoffMayBeRead(d)) continue;
    const who = whoIs(r, d.fromParticipantId);
    const on = whoIsWaitedOn(r, d);
    const what = inASentence(on ? aThingWithoutItsHolder(d.what, d.onLabel) : d.what);
    const blocking = String(d.status).toUpperCase() === 'BLOCKING';
    const says = blocking
      ? (on ? `${who} cannot move on ${what} until it comes from ${on}.` : `${who} cannot move on ${what}, and nobody has been named to provide it.`)
      : (on ? theWaitSaid(who, isAre(who), on, what) : `${who} ${isAre(who)} waiting for ${what}, and nobody has been named to provide it.`);
    out.push({ id: `handoff-${d.id}`, says: `${says}${thatWaitsOn(d)}`, because: theFactsOfAWait(d, who) });
  }

  /* 2. Commitments still open with no time, and ones said again and again and still open. */
  for (const c of commitments) {
    if (String(c.status).toUpperCase() !== 'UNKNOWN') continue;
    if (!r.personMayBeRead(c.participantId) || !r.commitmentMayBeRead(c)) continue;
    const who = c.participantId ? whoIs(r, c.participantId) : 'Somebody';
    const clause = clauseOf(c, r);
    const what = clause ? `committed to ${clause}` : 'made a commitment';
    const times = 1 + (c.saidAgainIn ?? []).length;
    const hasATime = !!c.whenSaid && looksLikeATimeOrADate(c.whenSaid);
    if (times >= 3) {
      out.push({
        id: `again-${c.id}`,
        says: `${who} ${what}, and it has come up ${times} times now without anybody saying it happened.`,
        because: `It was first said in session ${c.statedInSession ?? 'one'} and said again in ${(c.saidAgainIn ?? []).length === 1 ? 'session' : 'sessions'} ${listed((c.saidAgainIn ?? []).map(String))}.`,
      });
    } else if (!hasATime) {
      out.push({
        id: `no-time-${c.id}`,
        says: `${who} ${what}, and no time was given for it, so nobody can tell when it would be late.`,
        because: 'Nobody has said yet whether it happened.',
      });
    }
  }

  /* 3. A number nobody owns, in the board's own sentence. */
  if (targetsNobodyOwns && targetsNobodyOwns.trim()) {
    out.push({ id: 'targets-nobody-owns', says: targetsNobodyOwns.trim(), because: 'It comes from the targets this check-in holds.' });
  }

  void sessions;
  return out.slice(0, MOST_RISKS);
}

/* ------------------------------------------------------------------------------------------------
 * TIMELINE: what happened, in order
 * ---------------------------------------------------------------------------------------------- */

export interface ATimelineEvent {
  /** The day, "2026-09-14", counted in Lagos time. */
  on: string;
  says: string;
}

const MOST_EVENTS = 40;

export function theTimeline(
  commitments: ACommitment[],
  handoffs: AHandoff[],
  sessions: ASession[],
  closedAt: Date | string | null,
  r: WhoIsReading,
): ATimelineEvent[] {
  const events: { on: string; says: string; order: number }[] = [];
  let order = 0;
  const push = (when: Date | string | null | undefined, says: string) => {
    const on = day(when);
    if (on) {
      const start = /^(The|You|Your|A colleague|Another colleague|One colleague)\b/.test(says) ? says.charAt(0).toLowerCase() + says.slice(1) : says;
      events.push({ on, says: `On ${saidAsDate(on)}, ${start}`, order: order++ });
    }
  };

  const firstAnswer = new Map<number, Date | string>();
  for (const s of sessions) {
    if (s.isSetup || !s.completedAt || String(s.status).toUpperCase() !== 'COMPLETED') continue;
    const at = firstAnswer.get(s.sessionNumber);
    if (!at || new Date(s.completedAt) < new Date(at)) firstAnswer.set(s.sessionNumber, s.completedAt);
  }
  for (const [n, at] of firstAnswer) push(at, `The first answers for session ${n} came in.`);

  for (const c of commitments) {
    if (!r.personMayBeRead(c.participantId) || !r.commitmentMayBeRead(c)) continue;
    const who = c.participantId ? whoIs(r, c.participantId) : 'Somebody';
    const clause = clauseOf(c, r);
    push(c.createdAt, clause ? `${who} committed to ${clause}.` : `${who} made a commitment, which is in the record.`);
    const state = stateOf(c.status);
    if (state !== 'open' && c.settledAt) {
      push(c.settledAt, clause ? `${possessive(who)} commitment to ${clause} was marked ${state}.` : `${possessive(who)} commitment was marked ${state}.`);
    }
  }

  for (const d of handoffs) {
    if (!r.handoffMayBeRead(d)) continue;
    const who = whoIs(r, d.fromParticipantId);
    const on = whoIsWaitedOn(r, d);
    const what = inASentence(on ? aThingWithoutItsHolder(d.what, d.onLabel) : d.what);
    push(d.createdAt, `${on ? `${who} said the work was waiting on ${on} for ${what}.` : `${who} said the work was waiting for ${what}.`}${thatWaitsOn(d)}`);
    if (d.clearedAt) push(d.clearedAt, `The wait for ${inASentence(d.what)} was cleared.`);
  }
  if (closedAt) push(closedAt, 'The check-in was closed.');

  return events
    .sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : a.order - b.order))
    .slice(-MOST_EVENTS)
    .map(({ on, says }) => ({ on, says }));
}

/* ------------------------------------------------------------------------------------------------
 * PERSON HISTORY: one person's record over time, facts only
 * ---------------------------------------------------------------------------------------------- */

export interface APersonHistory {
  participantId: string;
  who: string;
  /** Where the record stands for them so far, in full sentences. */
  says: string;
  sessions: { n: number; on: string | null; says: string }[];
}

export function thePersonHistory(
  people: { id: string; managingOnly: boolean }[],
  commitments: ACommitment[],
  handoffs: AHandoff[],
  sessions: ASession[],
  r: WhoIsReading,
): APersonHistory[] {
  const out: APersonHistory[] = [];
  for (const p of people) {
    if (p.managingOnly) continue;
    /* Your own always; somebody else's only for whoever runs the check-in. */
    if (!(r.mayReadEveryone || (r.meId && p.id === r.meId))) continue;
    if (!r.personMayBeRead(p.id)) continue;
    const who = whoIs(r, p.id);
    const mine = sessions.filter((s) => s.participantId === p.id && !s.isSetup).sort((a, b) => a.sessionNumber - b.sessionNumber);
    const done = mine.filter((s) => String(s.status).toUpperCase() === 'COMPLETED');
    if (!done.length) continue;
    const theirCommitments = commitments.filter((c) => c.participantId === p.id);
    const theirWaits = handoffs.filter((d) => d.fromParticipantId === p.id);
    const perSession = done.map((s) => {
      const made = theirCommitments.filter((c) => c.statedInSession === s.sessionNumber).length;
      const raised = theirWaits.filter((d) => !!s.id && d.sourceCheckInId === s.id).length;
      const bits: string[] = [];
      if (made) bits.push(`made ${plural(made, 'commitment', 'commitments')}`);
      if (raised) bits.push(`named ${plural(raised, 'thing', 'things')} the work was waiting on`);
      const says = bits.length
        ? `In session ${s.sessionNumber}, ${midSentence(who)} ${bits.join(' and ')}.`
        : `In session ${s.sessionNumber}, ${midSentence(who)} answered, and the record holds no new commitment or wait from it.`;
      return { n: s.sessionNumber, on: day(s.completedAt), says };
    });
    const total = theirCommitments.length;
    const doneCount = theirCommitments.filter((c) => stateOf(c.status) === 'done').length;
    const notDone = theirCommitments.filter((c) => stateOf(c.status) === 'not done' || stateOf(c.status) === 'dropped').length;
    const open = total - doneCount - notDone;
    /* How many were kept is the person's own (decision 24): only they are told the tally, never whoever runs the check-in. */
    const theirOwn = !!r.meId && p.id === r.meId;
    const summary = total
      ? `${who} ${who === 'You' ? 'have' : 'has'} answered ${plural(done.length, 'session', 'sessions')} and made ${plural(total, 'commitment', 'commitments')}.${theirOwn ? ` ${theTallySaid(doneCount, notDone, open)}` : ''}`
      /* The name once (run-25): "Kwame Mensah has answered 1 session, and the record holds no commitment from Kwame Mensah yet." */
      : `${who} ${who === 'You' ? 'have' : 'has'} answered ${plural(done.length, 'session', 'sessions')}, and ${who === 'You' ? 'have' : 'has'} made no commitment on record yet.`;
    out.push({ participantId: p.id, who, says: summary, sessions: perSession });
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * BLOCKER CHECK: for each open handoff, what the record says about whether it is real
 * ---------------------------------------------------------------------------------------------- */

export interface ABlockerCheck {
  id: string;
  who: string;
  /** What is waited on and from whom, as a full sentence. */
  says: string;
  /** Whether somebody, not only something outside, is named as holding it. */
  namesWhoHoldsIt: boolean;
  /** Whether the person said what they had tried. */
  saidWhatWasTried: boolean;
  /** Whether a time was given. */
  timeGiven: boolean;
  /** The three facts above, in full sentences, and what is missing from them. */
  checks: string[];
}

export function theBlockerCheck(handoffs: AHandoff[], r: WhoIsReading): ABlockerCheck[] {
  const out: ABlockerCheck[] = [];
  for (const d of handoffs) {
    if (String(d.status).toUpperCase() === 'CLEARED' || d.clearedAt) continue;
    if (!r.handoffMayBeRead(d)) continue;
    const who = whoIs(r, d.fromParticipantId);
    const on = whoIsWaitedOn(r, d);
    const what = inASentence(on ? aThingWithoutItsHolder(d.what, d.onLabel) : d.what);
    const named = !!(d.onParticipantId || aPartyOutside(d));
    const wentBack = !!d.triedSaid?.trim();
    const timeGiven = !!d.dueSaid?.trim();
    out.push({
      id: d.id,
      who,
      says: `${theWaitSaid(who, isAre(who), on, what)}${thatWaitsOn(d)}`,
      namesWhoHoldsIt: named,
      saidWhatWasTried: wentBack,
      timeGiven,
      checks: [
        named ? holdsItSaid(on!) : 'Nobody has been named as holding it.',
        whatWasTriedSaid(d, who) ?? 'Nobody has said what has been tried.',
        theTimeGivenSaid(d, who) ?? 'No time has been given for it.',
      ],
    });
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * EVIDENCE INDEX: every line a document proves or a colleague confirmed
 * ---------------------------------------------------------------------------------------------- */

export interface AnEvidenceLine {
  id: string;
  participantId: string | null;
  who: string | null;
  /** The line as the person said it, word for word. */
  said: string;
  /** What backs it, in a full sentence. */
  backedBy: string;
  sessionNumber: number | null;
}

export function theEvidenceIndex(
  lines: { id: string; participantId: string | null; text: string; mark: string; sessionNumber: number | null; wordsMayBeRead: boolean }[],
  r: WhoIsReading,
): AnEvidenceLine[] {
  return lines
    .filter((l) => (l.mark === 'proven' || l.mark === 'confirmed') && l.wordsMayBeRead && r.personMayBeRead(l.participantId))
    .map((l) => {
      const who = l.participantId ? whoIs(r, l.participantId) : null;
      return {
        id: l.id,
        participantId: l.participantId,
        who,
        said: l.text,
        backedBy: l.mark === 'proven'
          ? `A document ${who === 'You' ? 'you' : who ?? 'somebody'} added shows this.`
          : 'The colleague who received this work confirmed it.',
        sessionNumber: l.sessionNumber,
      };
    })
    .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0));
}

/* ------------------------------------------------------------------------------------------------
 * BUSY OR MOVING: how much of what was said turned into something that happened, as counts
 * ---------------------------------------------------------------------------------------------- */

export interface ABusyOrMoving {
  /** One sentence for each person who has answered, in counts from the record. */
  eachPerson: { participantId: string; who: string; says: string }[];
  /** What these counts cannot tell anybody. */
  cannotTellYou: string;
}

export function theBusyOrMoving(
  people: { id: string; managingOnly: boolean }[],
  commitments: ACommitment[],
  handoffs: AHandoff[],
  sessions: ASession[],
  r: WhoIsReading,
): ABusyOrMoving | null {
  /* For whoever runs the check-in only: it reads one person's activity against what came of it. */
  if (!r.mayReadEveryone) return null;
  const eachPerson: ABusyOrMoving['eachPerson'] = [];
  for (const p of people) {
    if (p.managingOnly || !r.personMayBeRead(p.id)) continue;
    const answered = sessions.filter((s) => s.participantId === p.id && !s.isSetup && String(s.status).toUpperCase() === 'COMPLETED').length;
    if (!answered) continue;
    const mine = commitments.filter((c) => c.participantId === p.id);
    const waits = handoffs.filter((d) => d.fromParticipantId === p.id);
    if (!mine.length && !waits.length) continue;
    const who = whoIs(r, p.id);
    /* Counts of what was said, never of how many were kept: that tally is the person's own (decision 24). */
    const parts: string[] = [];
    if (mine.length) parts.push(`${who} has made ${plural(mine.length, 'commitment', 'commitments')} across ${plural(answered, 'answered session', 'answered sessions')}.`);
    /* "also" only after the commitments (item 21): Kwabena read "Blessing Okafor also named 1 thing ..." with nothing before it. */
    if (waits.length) {
      parts.push(mine.length
        ? `${who} also named ${plural(waits.length, 'thing', 'things')} the work was waiting on.`
        : `${who} named ${plural(waits.length, 'thing', 'things')} the work was waiting on, across ${plural(answered, 'answered session', 'answered sessions')}.`);
    }
    eachPerson.push({ participantId: p.id, who, says: parts.join(' ') });
  }
  if (!eachPerson.length) return null;
  return {
    eachPerson,
    cannotTellYou: 'These are counts of what people said and what came of it. The record does not show how hard anybody worked, or whether the work itself moved, so nothing here says that.',
  };
}

/* ------------------------------------------------------------------------------------------------
 * LEAD ACTIONS: what the person who runs the check-in needs to do, from the record
 * ---------------------------------------------------------------------------------------------- */

export interface ALeadAction {
  id: string;
  /** What the lead needs to do, as a full sentence. To the lead, "You"; to anybody else who runs it, the lead's name. */
  says: string;
  /** The facts it rests on, in full sentences, or null when the sentence above already says them. */
  because: string | null;
}

const MOST_LEAD_ACTIONS = 10;

/**
 * Only for whoever runs the check-in. A participant never reads the lead's own list (decision 6 and
 * CLAUDE.md: a participant never reads the lead's judgement), and an admin with no access reads nothing.
 * A goal the lead set and has not told the person about is the lead's own private note (decision 56), so
 * it reaches the lead alone: `untoldGoals` is empty for anybody else.
 */
export function theLeadActions(
  commitments: ACommitment[],
  handoffs: AHandoff[],
  sessions: ASession[],
  untoldGoals: { participantId: string }[],
  r: WhoIsReading,
): ALeadAction[] {
  if (!r.mayReadEveryone || !r.theLeadsId) return [];
  const lead = whoIs(r, r.theLeadsId);
  const needs = lead === 'You' ? 'You need' : `${lead} needs`;
  const leadInASentence = midSentence(lead);
  const out: ALeadAction[] = [];

  /* 1. Somebody is waiting on the lead. */
  for (const d of handoffs) {
    if (!isOpen(d) || d.onParticipantId !== r.theLeadsId || d.fromParticipantId === r.theLeadsId) continue;
    if (!r.handoffMayBeRead(d)) continue;
    const who = whoIs(r, d.fromParticipantId);
    out.push({
      id: `waiting-on-the-lead-${d.id}`,
      says: `${needs} to get back to ${midSentence(who)}, who ${isAre(who)} waiting on ${leadInASentence} for ${inASentence(d.what)}.`,
      because: theFactsOfAWait(d, who),
    });
  }

  /* 2. Somebody is waiting and nobody has been named to provide it. */
  for (const d of handoffs) {
    if (!isOpen(d) || d.onParticipantId || aPartyOutside(d)) continue;
    if (!r.handoffMayBeRead(d)) continue;
    const who = whoIs(r, d.fromParticipantId);
    const what = inASentence(d.what);
    out.push({
      id: `nobody-named-${d.id}`,
      says: d.fromParticipantId === r.theLeadsId
        ? `${needs} to find out who can provide ${what}, because nobody has been named yet.${thatWaitsOn(d)}`
        /* "that" is not optional here (request 132 f): without it the lead read "…who can provide the fuel allowance
           for October Aisha Wanjiku is waiting for", where the thing and the person run into one another. */
        : `${needs} to find out who can provide ${what} that ${midSentence(who)} ${isAre(who)} waiting for, because nobody has been named yet.${thatWaitsOn(d)}`,
      because: theFactsOfAWait(d, who),
    });
  }

  /* 3. A goal the lead set for somebody and has not told them about (decision 56, items 1 and 3). */
  const toldOf = new Set<string>();
  const howMany = howManyGoalsAreNotTold(untoldGoals);
  for (const g of untoldGoals) {
    if (!g.participantId || toldOf.has(g.participantId) || !r.personMayBeRead(g.participantId)) continue;
    toldOf.add(g.participantId);
    const who = r.nameOf(g.participantId) ?? r.aColleague(g.participantId);
    out.push({
      id: `tell-${g.participantId}`,
      says: (howMany.get(g.participantId) ?? 1) > 1
        ? `${needs} to talk ${who} through the ${howMany.get(g.participantId)} goals ${leadInASentence} set for this work, because ${who} has not been told about them yet.`
        : `${needs} to talk ${who} through a goal ${leadInASentence} set for this work, because ${who} has not been told about it yet.`,
      because: 'The goal still counts, and Groundwork will not tell its number until it has been talked through.',
    });
  }

  /* 4. What the lead committed to and nobody has said happened, in the sentence the work plan and the report write for it. */
  for (const row of theWorkPlan(commitments.filter((c) => c.participantId === r.theLeadsId), sessions, r)) {
    if (row.state !== 'open') continue;
    out.push({ id: `own-${row.id}`, says: row.says, because: null });
  }

  return out.slice(0, MOST_LEAD_ACTIONS);
}

/* ------------------------------------------------------------------------------------------------
 * OBLIGATIONS: what each side promised, and what the others are waiting on them for
 * ---------------------------------------------------------------------------------------------- */

export interface AnObligationSide {
  /** The person, or null for somebody outside the check-in named for a wait (a team, a firm, a person). */
  participantId: string | null;
  who: string;
  /** What this side committed to, each in the sentence the work plan writes for it. */
  promised: string[];
  /** What somebody here is waiting on this side for, still open, each as a full sentence. */
  othersWaitFor: string[];
}

/**
 * One side per person, in the order of the check-in, then each party outside it that somebody named.
 * Built from the work plan and the open waits, so every line is under the same wall as those: a reader
 * sees only the commitments and the waits they may read, and a side with nothing in it is left out.
 */
export function theObligations(
  people: { id: string; managingOnly: boolean }[],
  commitments: ACommitment[],
  handoffs: AHandoff[],
  sessions: ASession[],
  r: WhoIsReading,
): AnObligationSide[] {
  const plan = theWorkPlan(commitments, sessions, r);
  const open = handoffs.filter((d) => isOpen(d) && r.handoffMayBeRead(d) && d.onParticipantId !== d.fromParticipantId);
  const waitSaid = (d: AHandoff) => {
    const who = whoIs(r, d.fromParticipantId);
    const on = whoIsWaitedOn(r, d);
    return `${on ? theWaitSaid(who, isAre(who), on, inASentence(aThingWithoutItsHolder(d.what, d.onLabel))) : `${who} ${isAre(who)} waiting for ${inASentence(d.what)}.`}${thatWaitsOn(d)}`;
  };
  const out: AnObligationSide[] = [];
  for (const p of people) {
    if (!r.personMayBeRead(p.id)) continue;
    const promised = plan.filter((row) => row.participantId === p.id).map((row) => row.says);
    const othersWaitFor = open.filter((d) => d.onParticipantId === p.id).map(waitSaid);
    if (!promised.length && !othersWaitFor.length) continue;
    out.push({ participantId: p.id, who: whoIs(r, p.id), promised, othersWaitFor });
  }
  const outside = new Map<string, string[]>();
  for (const d of open) {
    const label = !d.onParticipantId ? d.onLabel?.trim() : null;
    if (!label) continue;
    const key = label.toLowerCase();
    outside.set(key, [...(outside.get(key) ?? [label]), waitSaid(d)]);
  }
  for (const [, [label, ...lines]] of outside) out.push({ participantId: null, who: label, promised: [], othersWaitFor: lines });
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * FORECAST: where a team number is heading, if it keeps the pace the record shows
 * ---------------------------------------------------------------------------------------------- */

export interface AForecast {
  objectiveId: string;
  /** The target, in the sentence the board already serves this reader for it. */
  about: string;
  /** Where the pace so far would take it by the last session, against the aim or the limit. */
  says: string;
  /** The counts it rests on, read when each session closed. */
  restsOn: string;
  /** What it cannot tell anybody. */
  cannotTellYou: string;
}

export const WHAT_A_FORECAST_CANNOT_TELL_YOU =
  'This carries the pace so far forward in a straight line. It is not a promise, and anything that changes the pace changes where it ends.';

/**
 * A team's number only (decided for Hafsah to confirm, 1 October): a target with an owner is about one
 * person, and the prototype keeps a forecast about one person off ("a forecast about one person feels
 * like a judgement on them"), so it is never forecast here, and nothing is forecast on an evaluation
 * check-in. Built only from targets this reader is already served (targetsFor, decision 56's untold
 * goals and who-sees-targets have run before this), from the counts stored when each session closed.
 * Needs a number to aim at, two sessions counted, and the check-in still to run past the last count.
 */
export function theForecast(
  targets: { id: string; about: string; target: number | null; ownerParticipantId: string | null; direction: 'AIM' | 'LIMIT' | 'RATE' | 'DEADLINE' | 'ZERO' }[],
  counts: { objectiveId: string; sessionNumber: number; count: number }[],
  totalSessions: number | null,
): AForecast[] {
  if (!totalSessions) return [];
  const read = (n: number) => aNumberPeopleCanRead(n);
  const out: AForecast[] = [];
  for (const t of targets) {
    /* A date to meet is met or not, so it has no pace to carry forward (decision 75, item 17). */
    if (t.direction === 'DEADLINE') continue;
    if (t.ownerParticipantId || (typeof t.target !== 'number' && t.direction !== 'ZERO') || !t.about?.trim()) continue;
    const mine = counts.filter((c) => c.objectiveId === t.id).sort((a, b) => a.sessionNumber - b.sessionNumber);
    if (mine.length < 2) continue;
    const first = mine[0];
    const last = mine[mine.length - 1];
    if (last.sessionNumber <= first.sessionNumber || last.sessionNumber >= totalSessions) continue;
    const pace = (last.count - first.count) / (last.sessionNumber - first.sessionNumber);
    const ends = Math.max(0, Math.round(last.count + pace * (totalSessions - last.sessionNumber)));
    const target = t.target as number;
    let says: string;
    if (t.direction === 'ZERO') {
      /* A count to keep at zero: none is where it should stay, and any at all is already a breach. */
      says = last.count === 0
        ? `It has stayed at zero since session ${first.sessionNumber}. If nothing changes, it will still be zero by session ${totalSessions}.`
        : `It is at ${read(last.count)}, and this should stay at zero, so any at all is already a breach whatever the pace.`;
    } else if (t.direction === 'RATE') {
      /* A share, carried in a straight line like a count, and never past 100%. */
      const share = Math.min(100, ends);
      says = pace === 0
        ? `It has stayed at ${read(last.count)}% since session ${first.sessionNumber}, so if nothing changes it would still be ${read(last.count)}% by session ${totalSessions}, against an aim of ${read(target)}% or more.`
        : `If it keeps changing at the pace it has since session ${first.sessionNumber}, it would be about ${read(share)}% by session ${totalSessions}, against an aim of ${read(target)}% or more.`;
    } else {
      const against = t.direction === 'LIMIT' ? `against a limit of ${read(target)}` : `against an aim of ${read(target)}`;
      says = pace === 0
        ? `It has not moved since session ${first.sessionNumber}, so if nothing changes it would still be ${read(last.count)} by session ${totalSessions}, ${against}.`
        : `If it keeps moving at the pace it has since session ${first.sessionNumber}, it would be about ${read(ends)} by session ${totalSessions}, ${against}.`;
    }
    const unit = t.direction === 'RATE' ? '%' : '';
    out.push({
      objectiveId: t.id,
      about: t.about.trim(),
      says,
      restsOn: `It was ${read(first.count)}${unit} in session ${first.sessionNumber} and ${read(last.count)}${unit} in session ${last.sessionNumber}, and this check-in runs for ${totalSessions} sessions.`,
      cannotTellYou: WHAT_A_FORECAST_CANNOT_TELL_YOU,
    });
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * WHO WAITED ON WHOM: every wait in the record, open or cleared, with its dates
 * ---------------------------------------------------------------------------------------------- */

export interface AWait {
  id: string;
  /** One full sentence: who waited on whom, for what, and from when to when. */
  says: string;
  /** The day it was first said, "2026-09-16", in Lagos time. */
  startedAt: string | null;
  /** The day it was cleared, or null while it is still open. */
  clearedAt: string | null;
  /** Whole days from the first day to the day it was cleared; null while it is open, so opening the board never moves it. */
  days: number | null;
}

export function whoWaitedOnWhom(handoffs: AHandoff[], r: WhoIsReading): AWait[] {
  return handoffs
    .filter((d) => r.handoffMayBeRead(d) && d.onParticipantId !== d.fromParticipantId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((d) => {
      const who = whoIs(r, d.fromParticipantId);
      const on = whoIsWaitedOn(r, d);
      const what = inASentence(d.what);
      const since = day(d.createdAt);
      const clearedOn = d.clearedAt ? day(d.clearedAt) : null;
      const cleared = !isOpen(d);
      const days = since && clearedOn ? Math.round((Date.parse(clearedOn) - Date.parse(since)) / 86_400_000) : null;
      const onWhom = on ? ` on ${on}` : '';
      const says = cleared
        ? (since && clearedOn && days === 0
          ? `${who} waited${onWhom} for ${what} on ${saidAsDate(since)}, and it was cleared the same day.`
          : since && clearedOn
          ? `${who} waited${onWhom} for ${what} from ${saidAsDate(since)} until it was cleared on ${saidAsDate(clearedOn)}, ${days === 1 ? '1 day' : `${days} days`} in all.`
          : `${who} waited${onWhom} for ${what}, and it has been cleared.`)
        : (since
          ? `${who} ${hasHave(who)} been waiting${onWhom} for ${what} since ${saidAsDate(since)}, and it has not been cleared.`
          : `${who} ${isAre(who)} waiting${onWhom} for ${what}, and it has not been cleared.`);
      return { id: d.id, says: `${says}${thatWaitsOn(d)}`, startedAt: since, clearedAt: cleared ? clearedOn : null, days: cleared ? days : null };
    });
}

/* ------------------------------------------------------------------------------------------------
 * CONTRADICTIONS: where the record says two different things about one person's own commitment
 * ---------------------------------------------------------------------------------------------- */

export interface AContradiction {
  id: string;
  /** The commitment both things are about. */
  commitmentId: string;
  participantId: string | null;
  who: string;
  /** Both things the record says, in one full sentence, with the sessions. */
  says: string;
}

/**
 * A commitment named at the start of a sentence: in their words where the stored text is a passage of what
 * they typed (as the work plan quotes it, followed by a comma), otherwise in ours.
 */
function aCommitmentNamed(c: ACommitment, who: string, r?: WhoIsReading): string {
  const theirWords = c.saidWordForWord === true ? c.text.trim().replace(/[.!?]+$/, '') : '';
  if (theirWords) return `${possessive(who)} commitment, "${theirWords}",`;
  const clause = clauseOf(c, r);
  return clause ? `${possessive(who)} commitment to ${clause}` : `A commitment of ${who === 'You' ? 'yours' : `${who}'s`}`;
}

/**
 * A commitment marked done, not done or dropped in one session, and then said again in a later session
 * as something still to do. Where two people said different things, the board already serves it as
 * `divergence`, so this is only what one person's own record says twice. Under the work plan's wall.
 */
export function theContradictions(commitments: ACommitment[], sessions: ASession[], r: WhoIsReading): AContradiction[] {
  const out: AContradiction[] = [];
  for (const c of commitments) {
    const state = stateOf(c.status);
    if (state === 'open' || !c.participantId) continue;
    if (!r.personMayBeRead(c.participantId) || !r.commitmentMayBeRead(c)) continue;
    const settledIn = c.settledInCheckInId ? sessions.find((s) => s.id === c.settledInCheckInId)?.sessionNumber ?? null : null;
    const settledSession = settledIn ?? (c.settledAt
      ? sessions
        .filter((s) => s.participantId === c.participantId && !s.isSetup && s.completedAt && new Date(s.completedAt).getTime() >= new Date(c.settledAt as any).getTime())
        .sort((a, b) => a.sessionNumber - b.sessionNumber)[0]?.sessionNumber ?? null
      : null);
    if (settledSession == null) continue;
    const later = [...(c.saidAgainIn ?? [])].filter((n) => n > settledSession).sort((a, b) => a - b);
    if (!later.length) continue;
    const who = whoIs(r, c.participantId);
    const clause = clauseOf(c, r);
    const theCommitment = aCommitmentNamed(c, who, r);
    const again = later.length === 1 ? `session ${later[0]}` : `sessions ${listed(later.map(String))}`;
    out.push({
      id: `again-after-${state.replace(' ', '-')}-${c.id}`,
      commitmentId: c.id,
      participantId: c.participantId,
      who,
      says: `${theCommitment} was marked ${state} in session ${settledSession}, and in ${again} ${midSentence(who)} said it again as something still to do.`,
    });
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * QUESTIONS FOR THE LEAD: what only the person who runs the check-in can answer
 * ---------------------------------------------------------------------------------------------- */

export interface AQuestionForTheLead {
  id: string;
  /** One question, as a full sentence. */
  question: string;
  /** Why it is asked: what the record holds, and what it cannot say. */
  because: string;
}

const MOST_QUESTIONS = 10;

/**
 * Questions, never conclusions, each built from rows so the same facts always ask the same questions:
 * a commitment said again and again with no outcome, a commitment the record says two things about, and
 * a wait nobody has gone back about. Only for whoever runs the check-in, as the rest of the lead's own
 * reading is. What the lead themselves needs to do is in `leadActions`, not here.
 */
export function theQuestionsForTheLead(
  commitments: ACommitment[],
  handoffs: AHandoff[],
  sessions: ASession[],
  r: WhoIsReading,
): AQuestionForTheLead[] {
  if (!r.mayReadEveryone || !r.theLeadsId) return [];
  const lead = whoIs(r, r.theLeadsId);
  const onlyTheLead = lead === 'You' ? 'only you can find out' : `only ${lead} can find out`;
  const out: AQuestionForTheLead[] = [];

  /* 1. Said in three sessions or more, and nobody has said whether it happened. */
  for (const c of commitments) {
    if (stateOf(c.status) !== 'open' || (c.saidAgainIn ?? []).length < 2 || !c.participantId) continue;
    if (!r.personMayBeRead(c.participantId) || !r.commitmentMayBeRead(c)) continue;
    const who = whoIs(r, c.participantId);
    const named = aCommitmentNamed(c, who).replace(/^Your\b/, 'your').replace(/^A commitment/, 'a commitment');
    const said = [c.statedInSession ?? 1, ...[...(c.saidAgainIn ?? [])].sort((a, b) => a - b)].map(String);
    out.push({
      id: `said-again-${c.id}`,
      question: `Has ${named} happened, or is it still wanted?`,
      because: `${who} said it in sessions ${listed(said)}, and nobody has said whether it happened.`,
    });
  }

  /* 2. Where the record says two things about one commitment. */
  const byId = new Map(commitments.map((c) => [c.id, c]));
  for (const x of theContradictions(commitments, sessions, r)) {
    const c = byId.get(x.commitmentId);
    if (!c) continue;
    const named = aCommitmentNamed(c, x.who).replace(/^Your\b/, 'your').replace(/^A commitment/, 'a commitment');
    out.push({ id: `which-${x.id}`, question: `Is ${named} done, or still to do?`, because: x.says });
  }

  /* 3. A wait on somebody in the check-in, other than the lead, that nobody has gone back about. */
  for (const d of handoffs) {
    if (!isOpen(d) || d.triedSaid?.trim() || !d.onParticipantId || d.onParticipantId === r.theLeadsId || d.onParticipantId === d.fromParticipantId) continue;
    if (!r.handoffMayBeRead(d)) continue;
    const who = whoIs(r, d.fromParticipantId);
    const on = whoIsWaitedOn(r, d);
    /* The reader's own wait is asked of them as theirs (item 21, the MarketView Q4 board). */
    out.push(who === 'You'
      ? { id: `went-back-${d.id}`, question: `Have you gone back to ${on} about ${inASentence(d.what)}?`, because: 'Nothing on record says you have. If you raised it outside the check-in, say so in your check-in.' }
      : {
        id: `went-back-${d.id}`,
        question: `Has anybody gone back to ${on} about ${inASentence(d.what)}, which ${midSentence(who)} ${isAre(who)} waiting for?`,
        because: `Nothing on record says anybody has, so ${onlyTheLead} whether it was raised outside the check-in.`,
      });
  }

  /* 4. A wait on somebody outside the check-in that nobody has chased. */
  for (const d of handoffs) {
    if (!isOpen(d) || d.triedSaid?.trim() || d.onParticipantId || !aPartyOutside(d)) continue;
    if (!r.handoffMayBeRead(d)) continue;
    const who = whoIs(r, d.fromParticipantId);
    /* Omar read "What has been tried to get the full, detailed breakdowns ... from Marketing and Product Development, which
       you are waiting for?" with "only you can find out what was done": his own wait, asked as if somebody else's (item 21). */
    /* A holder that is only the thing waited for is not asked about twice: "What has been tried to get "the tax view" from the tax view". */
    const theThing = inASentence(String(d.what ?? '').trim().replace(/^["\u201c](.*)["\u201d]$/, '$1'));
    const fromWhom = aHolderThatIsOnlyTheThing(d.onLabel, d.what) ? '' : ` from ${(d.onLabel ?? '').trim()}`;
    out.push(who === 'You'
      ? { id: `chased-${d.id}`, question: `What have you tried to get ${theThing}${fromWhom}?`, because: 'Nothing on record says you have chased it. If you did, outside the check-in, say so in your check-in.' }
      : {
        id: `chased-${d.id}`,
        question: `What has been tried to get ${theThing}${fromWhom}, which ${midSentence(who)} ${isAre(who)} waiting for?`,
        because: `Nothing on record says anybody has chased it, so ${onlyTheLead} what was done outside the check-in.`,
      });
  }

  return out.slice(0, MOST_QUESTIONS);
}
