import { whoIs, whoIsWaitedOn, type ACommitment, type AHandoff, type ASession, type WhoIsReading } from './the-switchboards-own-sections';
import { theDayNumber, type AnAgreedGoal } from './what-was-agreed-at-the-start';
import { notToldYet } from '../grounds/a-goal-not-told-stays-with-the-lead';

/**
 * CHANGE SINCE LAST CHECK-IN (request 123, the onboarding board).
 *
 * The prototype (B6-ending-a-check-in/day-30-and-60.txt) gives one row per area of the work, each saying what
 * changed and whether it moved, held or was late. Built here from the record between the last two sessions
 * that were finished, with no model and nothing written (decision 7):
 *  - "Commitments": what was said and settled in the latest session, and what is still open from before the
 *    one before it;
 *  - "Waits": what was raised or cleared since the one before it, and what has been open since before it;
 *  - one row for each goal that was told to the person: marked since, past its date and still open, or the
 *    same as before.
 * Each row says what happened, never what a person is. A row that would name somebody the reader may not
 * read is left out, and the reader's own name is "you".
 *
 * WHAT THE WORDS MEAN. "moved": something was said or settled in the window. "late": something is still open
 * from before the previous session, or a goal's date has passed and it is open. "held": neither. Late wins.
 */

export type AChangeState = 'moved' | 'held' | 'late';

export interface AChangeRow {
  area: string;
  state: AChangeState;
  says: string;
  kind: 'commitments' | 'waits' | 'goal';
}

export interface AChangeSinceLast {
  heading: 'Change since last check-in';
  /** "Between session 5 and session 6." */
  between: string;
  rows: AChangeRow[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const asWait = (s: string) => lowerFirst(s.trim().replace(/[.!?]+$/, ''));
const t = (d: Date | string | null | undefined): number | null => {
  if (!d) return null;
  const x = new Date(d).getTime();
  return Number.isNaN(x) ? null : x;
};
const dateSaid = (d: Date | string): string => {
  const x = new Date(d);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long' }).format(x);
};
const isSettled = (status: string) => ['DONE', 'NOT_DONE', 'DROPPED'].includes(String(status).toUpperCase());

export function changeSinceTheLastCheckIn(a: {
  commitments: ACommitment[];
  handoffs: AHandoff[];
  goals: AnAgreedGoal[];
  sessions: ASession[];
  people: { id: string; managingOnly: boolean }[];
  reader: WhoIsReading;
  now: Date;
}): AChangeSinceLast | null {
  const r = a.reader;
  const done = a.sessions.filter((s) => !s.isSetup && String(s.status).toUpperCase() === 'COMPLETED');
  const numbers = [...new Set(done.map((s) => s.sessionNumber))].sort((x, y) => x - y);
  if (numbers.length < 2) return null;
  const n = numbers[numbers.length - 1];
  const p = numbers[numbers.length - 2];
  const lastOf = (k: number) => Math.max(...done.filter((s) => s.sessionNumber === k).map((s) => t(s.completedAt) ?? 0));
  const from = lastOf(p);
  const to = Math.max(lastOf(n), from);
  const inWindow = (d: Date | string | null | undefined) => { const x = t(d); return x !== null && x > from && x <= to; };
  const rows: AChangeRow[] = [];

  /* COMMITMENTS, person by person, among those this reader may read. */
  const mine = a.commitments.filter((c) => c.participantId && r.personMayBeRead(c.participantId) && r.commitmentMayBeRead(c));
  const byPerson = new Map<string, ACommitment[]>();
  for (const c of mine) byPerson.set(c.participantId!, [...(byPerson.get(c.participantId!) ?? []), c]);
  const said: string[] = [];
  let moved = false;
  let late = false;
  for (const [pid, cs] of byPerson) {
    const who = whoIs(r, pid);
    const have = who === 'You' ? 'have' : 'has';
    const made = cs.filter((c) => c.statedInSession === n).length;
    const settledNow = cs.filter((c) => isSettled(c.status) && inWindow(c.settledAt));
    const kept = settledNow.filter((c) => String(c.status).toUpperCase() === 'DONE').length;
    const notKept = settledNow.length - kept;
    const open = cs.filter((c) => !isSettled(c.status) && c.statedInSession !== null && c.statedInSession < p).length;
    if (made) { said.push(`${who} made ${plural(made, 'commitment', 'commitments')} in check-in ${n}.`); moved = true; }
    if (kept || notKept) {
      const was = (k: number) => (k === 1 ? 'was' : 'were');
      const parts = [kept ? `${kept} ${was(kept)} marked done` : null, notKept ? `${notKept} ${was(notKept)} marked not done` : null].filter(Boolean).join(' and ');
      said.push(`Of ${who === 'You' ? 'your' : `${who}'s`} commitments, ${parts} since check-in ${p}.`);
      moved = true;
    }
    if (open) { said.push(`${who} still ${have} ${plural(open, 'commitment', 'commitments')} open from before check-in ${p}.`); late = true; }
  }
  if (byPerson.size) {
    rows.push({
      area: 'Commitments', kind: 'commitments',
      state: late ? 'late' : moved ? 'moved' : 'held',
      says: said.length ? said.join(' ') : `Nothing changed in the commitments between check-in ${p} and check-in ${n}.`,
    });
  }

  /* WAITS, among those this reader may read. */
  const waits = a.handoffs.filter((d) => r.handoffMayBeRead(d));
  const waitSays: string[] = [];
  let waitMoved = false;
  let waitLate = false;
  for (const d of waits) {
    const who = whoIs(r, d.fromParticipantId);
    const on = whoIsWaitedOn(r, d);
    const what = asWait(d.what);
    const open = !d.clearedAt && String(d.status).toUpperCase() !== 'CLEARED';
    const raisedNow = inWindow(d.createdAt);
    const clearedNow = inWindow(d.clearedAt);
    const started = t(d.createdAt);
    const wait = `${who} ${who === 'You' ? 'are' : 'is'} waiting ${on ? `on ${on} ` : ''}for ${what}`;
    if (clearedNow) { waitSays.push(`The wait for ${what} was cleared on ${dateSaid(d.clearedAt!)}.`); waitMoved = true; }
    else if (raisedNow) { waitSays.push(`${wait}, and said so for the first time on ${dateSaid(d.createdAt)}.`); waitMoved = true; }
    else if (open && started !== null && started <= from) { waitSays.push(`${wait}, and has been since ${dateSaid(d.createdAt)}.`); waitLate = true; }
  }
  if (waits.length) {
    rows.push({
      area: 'Waits', kind: 'waits',
      state: waitLate ? 'late' : waitMoved ? 'moved' : 'held',
      says: waitSays.length ? waitSays.slice(0, 5).join(' ') : `Nothing changed in what anybody is waiting for between check-in ${p} and check-in ${n}.`,
    });
  }

  /* GOALS told to a person this reader may read. */
  const subjects = new Set(a.people.filter((x) => !x.managingOnly).map((x) => x.id));
  const today = theDayNumber(a.now);
  for (const g of a.goals) {
    if (!subjects.has(g.participantId) || !r.personMayBeRead(g.participantId) || notToldYet(g)) continue;
    const kind = String(g.kind ?? '').toUpperCase();
    if (kind === 'REFERENCE' || kind === 'COMMITMENT') continue;
    const text = (g.text ?? '').trim();
    if (!text) continue;
    const status = String(g.status ?? 'OPEN').toUpperCase();
    const due = theDayNumber(g.dueDate);
    let state: AChangeState = 'held';
    let says = `Nothing has changed on this goal between check-in ${p} and check-in ${n}.`;
    if (status !== 'OPEN' && inWindow(g.statusChangedAt)) {
      state = 'moved';
      const word = status === 'MET' ? 'met' : status === 'DROPPED' ? 'dropped' : status === 'CHANGED' ? 'changed' : status.toLowerCase();
      says = `This goal was marked ${word} between check-in ${p} and check-in ${n}.`;
    } else if (status === 'OPEN' && due !== null && today !== null && due < today) {
      state = 'late';
      says = `This goal was due on ${dateSaid(g.dueDate!)} and is still open.`;
    }
    rows.push({ area: text, state, says, kind: 'goal' });
  }

  if (!rows.length) return null;
  return { heading: 'Change since last check-in', between: `Between check-in ${p} and check-in ${n}.`, rows };
}
