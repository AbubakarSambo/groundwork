import { whoIs, whoIsWaitedOn, type ACommitment, type AHandoff, type ASession, type WhoIsReading } from './the-switchboards-own-sections';
import { dayOneOf, theDayNumber, stepOfDay, aPromiseNotAGoal, type AnAgreedGoal } from './what-was-agreed-at-the-start';
import { notToldYet } from '../grounds/a-goal-not-told-stays-with-the-lead';

/**
 * THE 90 DAYS, IN THREE STEPS (request 123, the onboarding board).
 *
 * The prototype (B6-ending-a-check-in/day-30-and-60.txt) has three questions: after 30 days, is the new person settled in;
 * after 60 days, are they doing the job; after 90 days, what the lead needs to decide. This answers each from the record
 * and the setup alone, in plain sentences, with no model and nothing written (decision 7):
 *  - the goals agreed for the person and due in that step, and how many are marked met;
 *  - for the first step, what the person committed to and how much of it is done;
 *  - for the second, what the person is waiting for now;
 *  - for the third, what is still open, and that the lead decides how it ends.
 * A step that has not come yet says the day it comes and what was agreed for it.
 *
 * It says what happened, never what a person is: no sentence says that somebody is or is not settled in. A goal the lead
 * has not told the person yet is the lead's own note (decision 56) and is left out. Every row goes through the same rules
 * as the rest of the board (`personMayBeRead`, `commitmentMayBeRead`, `handoffMayBeRead`), so a reader reads nothing about
 * a person they may not read, and the reader's own name is "you".
 */
export interface AStep {
  /** "After 30 days". */
  step: string;
  day: 30 | 60 | 90;
  /** The prototype's question for this step, said to this reader. */
  question: string;
  /** Plain sentences. */
  says: string;
  /** Whether the day has come. */
  reached: boolean;
}

export interface TheNinetyDays {
  heading: 'The 90 days, in three steps';
  steps: AStep[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const dateSaid = (dayNumber: number): string =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(dayNumber * 24 * 60 * 60 * 1000));
const asWait = (s: string) => { const x = s.trim().replace(/[.!?]+$/, ''); return /^[A-Z][a-z]/.test(x) ? x.charAt(0).toLowerCase() + x.slice(1) : x; };
const andList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function theNinetyDaysInThreeSteps(a: {
  goals: AnAgreedGoal[];
  commitments: ACommitment[];
  handoffs: AHandoff[];
  sessions: ASession[];
  people: { id: string; managingOnly: boolean }[];
  startsAt?: Date | string | null;
  createdAt?: Date | string | null;
  /** The first name of whoever runs the check-in, and whether the reader is that person. */
  leadFirstName: string | null;
  readerIsTheLead: boolean;
  reader: WhoIsReading;
  now: Date;
}): TheNinetyDays | null {
  const r = a.reader;
  const dayOne = dayOneOf({ startsAt: a.startsAt, sessions: a.sessions, createdAt: a.createdAt });
  const today = theDayNumber(a.now);
  if (dayOne === null) return null;
  /* The people the three steps are about: those who take part, among those this reader may read. */
  /* The 90 days are about the person who is new, never about whoever runs the check-in (request 128 item 1): "Are you and Tobi
     Adewale settled in?" counted the lead's own goal. Kept only if nobody else is there to be about. */
  const everyone = a.people.filter((p) => !p.managingOnly && r.personMayBeRead(p.id)).map((p) => p.id);
  const withoutTheLead = everyone.filter((id) => id !== r.theLeadsId);
  const subjects = withoutTheLead.length ? withoutTheLead : everyone;
  if (!subjects.length) return null;
  const names = subjects.map((id) => whoIs(r, id));
  const you = (n: string) => n === 'You';
  const about = andList(names.map((n) => (you(n) ? 'you' : n)));
  const only = names.length === 1 ? names[0] : null;
  const isSettled = only ? (you(only) ? 'Are you settled in?' : `Is ${only} settled in?`) : `Are ${about} settled in?`;
  const doingTheJob = only ? (you(only) ? 'Are you doing the job?' : `Is ${only} doing the job?`) : `Are ${about} doing the job?`;
  const theDecision = a.readerIsTheLead ? 'What you need to decide' : `What ${a.leadFirstName?.trim() || 'your lead'} needs to decide`;

  const goalsFor = (day: number) => a.goals.filter((g) => {
    if (!subjects.includes(g.participantId) || notToldYet(g)) return false;
    if (['REFERENCE', 'COMMITMENT'].includes(String(g.kind ?? '').toUpperCase()) || !(g.text ?? '').trim() || aPromiseNotAGoal(g.text)) return false;
    const due = theDayNumber(g.dueDate);
    return due !== null && stepOfDay(due - dayOne + 1) === `By day ${day}`;
  });
  const statusOf = (g: AnAgreedGoal) => String(g.status ?? 'OPEN').toUpperCase();
  const aboutGoals = (day: number): string => {
    const gs = goalsFor(day);
    if (!gs.length) return `No goal was agreed for ${about} to be met by day ${day}.`;
    const met = gs.filter((g) => statusOf(g) === 'MET').length;
    const open = gs.filter((g) => statusOf(g) === 'OPEN').length;
    const said = `${plural(gs.length, 'goal was', 'goals were')} agreed for ${about} to be met by day ${day}.`;
    const state = gs.length === 1
      ? (met ? 'It is marked met.' : open ? 'It is still open.' : '')
      : [met ? `${met} ${met === 1 ? 'is' : 'are'} marked met` : null, open ? `${open} ${open === 1 ? 'is' : 'are'} still open` : null].filter(Boolean).join(' and ');
    return state ? `${said} ${gs.length === 1 ? state : `${state}.`}` : said;
  };

  const readable = a.commitments.filter((c) => c.participantId && subjects.includes(c.participantId) && r.commitmentMayBeRead(c));
  const done = readable.filter((c) => String(c.status).toUpperCase() === 'DONE').length;
  const openCommitments = readable.filter((c) => !['DONE', 'NOT_DONE', 'DROPPED'].includes(String(c.status).toUpperCase())).length;
  const waits = a.handoffs.filter((d) => subjects.includes(d.fromParticipantId) && !d.clearedAt && String(d.status).toUpperCase() !== 'CLEARED' && r.handoffMayBeRead(d));
  const subjectsAsSentenceStart = andList(names.map((n) => (you(n) ? 'You' : n)));
  const manyOrYou = names.length > 1 || names.some(you);

  const build = (day: 30 | 60 | 90): AStep => {
    const reached = today !== null && today - dayOne + 1 >= day;
    const sentences: string[] = [];
    if (!reached) sentences.push(`This step comes on ${dateSaid(dayOne + day - 1)}.`);
    sentences.push(aboutGoals(day));
    if (reached && day === 30 && readable.length) {
      sentences.push(`${subjectsAsSentenceStart} ${manyOrYou ? 'have' : 'has'} made ${plural(readable.length, 'commitment', 'commitments')} so far, and ${done} ${done === 1 ? 'is' : 'are'} marked done.`);
    }
    if (reached && day === 60 && waits.length) {
      const holders = [...new Set(waits.map((d) => d.fromParticipantId))].map((id) => whoIs(r, id)).map((n) => (you(n) ? 'You' : n));
      const things = andList([...new Set(waits.map((d) => { const on = whoIsWaitedOn(r, d); return `${on ? `${on} for ` : ''}${asWait(d.what)}`; }))]);
      sentences.push(`${andList(holders)} ${holders.length > 1 || holders[0] === 'You' ? 'are' : 'is'} waiting on ${things}.`);
    }
    if (reached && day === 90) {
      const goalsOpen = a.goals.filter((g) => subjects.includes(g.participantId) && !notToldYet(g)
        && !['REFERENCE', 'COMMITMENT'].includes(String(g.kind ?? '').toUpperCase()) && (g.text ?? '').trim() && !aPromiseNotAGoal(g.text) && statusOf(g) === 'OPEN').length;
      const left = [
        goalsOpen ? plural(goalsOpen, 'goal', 'goals') : null,
        openCommitments ? plural(openCommitments, 'commitment', 'commitments') : null,
        waits.length ? plural(waits.length, 'wait', 'waits') : null,
      ].filter(Boolean) as string[];
      const total = goalsOpen + openCommitments + waits.length;
      sentences.push(left.length ? `${andList(left)} ${total === 1 ? 'is' : 'are'} still open.` : 'Nothing is still open.');
      sentences.push(a.readerIsTheLead ? 'It is yours to decide how this ends.' : `${a.leadFirstName?.trim() || 'Your lead'} decides how this ends.`);
    }
    return { step: `After ${day} days`, day, question: day === 30 ? isSettled : day === 60 ? doingTheJob : theDecision, says: sentences.join(' '), reached };
  };

  return { heading: 'The 90 days, in three steps', steps: [build(30), build(60), build(90)] };
}
