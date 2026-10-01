import { aCommitmentSaid, looksLikeATimeOrADate, inOurVoice } from '../reports/what-the-record-shows-over-time';

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
function whoIs(r: WhoIsReading, participantId: string | null | undefined): string {
  if (!participantId) return 'Somebody';
  if (r.meId && participantId === r.meId) return 'You';
  return r.nameOf(participantId) ?? r.aColleague(participantId);
}

/** Who a handoff waits on, said inside a sentence: "you", a name, "a colleague", or the team or thing outside named for it. */
function whoIsWaitedOn(r: WhoIsReading, d: { onParticipantId?: string | null; onLabel?: string | null }): string | null {
  if (d.onParticipantId) {
    if (d.onParticipantId === r.meId) return 'you';
    const n = r.nameOf(d.onParticipantId) ?? r.aColleague(d.onParticipantId);
    return /^(A|Another|One) colleague/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n;
  }
  return d.onLabel?.trim() || null;
}

const theSessionsSoFar = (sessions: ASession[], commitments: ACommitment[]): number =>
  Math.max(1, ...sessions.filter((s) => !s.isSetup).map((s) => s.sessionNumber), ...commitments.map((c) => c.statedInSession ?? 0));

/** What a person committed to, as the end of a sentence, or null when it cannot be said in our voice. */
const clauseOf = (c: ACommitment): string | null => inOurVoice(c.text);

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
    const what = inASentence(d.what);
    const blocking = String(d.status).toUpperCase() === 'BLOCKING';
    const says = blocking
      ? (on ? `${who} cannot move on ${what} until it comes from ${on}.` : `${who} cannot move on ${what}, and nobody has been named to provide it.`)
      : (on ? `${who} ${isAre(who)} waiting on ${on} for ${what}.` : `${who} ${isAre(who)} waiting for ${what}, and nobody has been named to provide it.`);
    const since = day(d.createdAt);
    const facts: string[] = [];
    if (since) facts.push(`It was first said on ${saidAsDate(since)}.`);
    facts.push(whatWasTriedSaid(d, who) ?? 'Nobody has said what has been tried.');
    facts.push(theTimeGivenSaid(d, who) ?? 'No time has been given for it.');
    out.push({ id: `handoff-${d.id}`, says, because: facts.join(' ') });
  }

  /* 2. Commitments still open with no time, and ones said again and again and still open. */
  for (const c of commitments) {
    if (String(c.status).toUpperCase() !== 'UNKNOWN') continue;
    if (!r.personMayBeRead(c.participantId) || !r.commitmentMayBeRead(c)) continue;
    const who = c.participantId ? whoIs(r, c.participantId) : 'Somebody';
    const clause = clauseOf(c);
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
    const clause = clauseOf(c);
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
    const what = inASentence(d.what);
    push(d.createdAt, on ? `${who} said the work was waiting on ${on} for ${what}.` : `${who} said the work was waiting for ${what}.`);
    if (d.clearedAt) push(d.clearedAt, `The wait for ${what} was cleared.`);
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
      ? `${who} ${who === 'You' ? 'have' : 'has'} answered ${plural(done.length, 'session', 'sessions')} and made ${plural(total, 'commitment', 'commitments')}.${theirOwn ? ` ${doneCount} ${doneCount === 1 ? 'is' : 'are'} done, ${notDone} ${notDone === 1 ? 'is' : 'are'} not done or dropped, and ${open} ${open === 1 ? 'is' : 'are'} still open.` : ''}`
      : `${who} ${who === 'You' ? 'have' : 'has'} answered ${plural(done.length, 'session', 'sessions')}, and the record holds no commitment from ${midSentence(who)} yet.`;
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
    const onName = d.onParticipantId ? whoIsWaitedOn(r, d) : null;
    const on = onName ?? (d.onLabel?.trim() || null);
    const what = inASentence(d.what);
    const named = !!(d.onParticipantId || d.onLabel?.trim());
    const wentBack = !!d.triedSaid?.trim();
    const timeGiven = !!d.dueSaid?.trim();
    out.push({
      id: d.id,
      who,
      says: on ? `${who} ${isAre(who)} waiting on ${on} for ${what}.` : `${who} ${isAre(who)} waiting for ${what}.`,
      namesWhoHoldsIt: named,
      saidWhatWasTried: wentBack,
      timeGiven,
      checks: [
        named ? (on === 'you' ? 'You hold it.' : `${on!.charAt(0).toUpperCase()}${on!.slice(1)} holds it.`) : 'Nobody has been named as holding it.',
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
    if (waits.length) parts.push(`${who} also named ${plural(waits.length, 'thing', 'things')} the work was waiting on.`);
    eachPerson.push({ participantId: p.id, who, says: parts.join(' ') });
  }
  if (!eachPerson.length) return null;
  return {
    eachPerson,
    cannotTellYou: 'These are counts of what people said and what came of it. The record does not show how hard anybody worked, or whether the work itself moved, so nothing here says that.',
  };
}
