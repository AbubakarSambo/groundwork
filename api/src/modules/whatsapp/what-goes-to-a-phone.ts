import { TEMPLATES, fill } from './a-message-outside-the-window';
import { whatToDoToday, type ChasingPolicy } from '../conversation/chasing-belongs-to-the-lead';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * THE MESSAGES GROUNDWORK STARTS ON WHATSAPP, IN THE WORDS A PERSON READS (survey item 7,
 * decisions 82 and 83).
 *
 * Each is its template's body with the product's own words put in its blanks, so a person reads the
 * same sentence whether it goes as free text inside the 24 hours or as the approved template outside
 * them. The bodies are Hafsah's (a-message-outside-the-window.ts, docs/whatsapp-templates.md).
 */
export interface ANotice { kind: string; text: string; params: string[] }

export interface WhoAndWhat {
  /** The person's first name; "there" when nobody knows it, so the greeting still reads. */
  firstName: string | null | undefined;
  /** The check-in's name, as the lead gave it. */
  label: string;
}

const first = (w: WhoAndWhat) => w.firstName?.trim() || 'there';
const notice = (kind: string, params: string[]): ANotice => ({ kind, text: fill(TEMPLATES[kind].body, params), params });

/** checkin_open: a session has opened, the first or a later one. */
export const theCheckInIsOpen = (w: WhoAndWhat) => notice('checkin-open', [first(w), w.label]);
/** checkin_due_tomorrow, with the day it is due ("Thursday 8 October"). */
export const itIsDueTomorrow = (w: WhoAndWhat, dueAt: Date) => notice('due-tomorrow', [first(w), w.label, whenItWas(dueAt, 'weekdayAndDay')]);
/** checkin_opens_soon, with the time it opens ("10:00 am"). */
export const itOpensSoon = (w: WhoAndWhat, opensAt: Date) => notice('opens-soon', [first(w), w.label, whenItWas(opensAt, 'hourOfDay')]);
/** checkin_overdue: only while it is still open (whatToSendThisMorning decides). */
export const itIsOverdue = (w: WhoAndWhat) => notice('overdue', [first(w), w.label]);
/** checkin_team_almost_in: {{3}} of {{4}} people, never anything they said. */
export const theTeamIsAlmostIn = (w: WhoAndWhat, answered: number, ofHowMany: number) => notice('team-almost-in', [first(w), w.label, String(answered), String(ofHowMany)]);
/**
 * THE ANCHOR'S NUDGE ON WHATSAPP (piece 30; decision 105 item 3): the person's own last open promise, to them only.
 * The promise is made safe for a template blank: no new line, no tab, no run of more than four spaces, and cut at a
 * word to 120 characters with no trailing stop, so the sentence around it still reads.
 */
export function aPromiseForABlank(promise: string): string {
  const flat = String(promise ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {5,}/g, '    ').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  if (flat.length <= 120) return flat;
  const cut = flat.slice(0, 120);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 60)).replace(/[,;:\s]+$/, '');
}
export const itFollowsUpTheirPromise = (w: WhoAndWhat, theirOwnPromise: string) => notice('anchor-follow-up', [first(w), aPromiseForABlank(theirOwnPromise), w.label]);

/** checkin_your_view_matters, with the lead's first name. */
export const yourViewMatters = (w: WhoAndWhat, leadFirstName: string | null | undefined) => notice('your-view-matters', [first(w), w.label, leadFirstName?.trim() || 'your lead']);

/**
 * WHEN A SESSION IS DUE. A session never shuts at a set hour: it stays open and takes answers until
 * the person answers it, or the whole check-in ends. It is due when the next one would open, one step
 * of the check-in's rhythm after this one opened. A check-in with no rhythm (one-off, or opened by the
 * lead's own check-in) has no due day, so nothing says it is due or overdue.
 */
export const DAYS_BETWEEN_SESSIONS: Record<string, number> = { DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30 };
export function whenItIsDue(openedAt: Date | string, cadence: string | null | undefined): Date | null {
  const step = cadence ? DAYS_BETWEEN_SESSIONS[cadence] : undefined;
  if (!step) return null;
  return new Date(new Date(openedAt).getTime() + step * 86_400_000);
}

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

export type AMorningMessage = 'overdue' | 'due-tomorrow' | 'chase';

/**
 * WHICH ONE MESSAGE, IF ANY, A CHECK-IN NOT YET ANSWERED GETS THIS MORNING.
 *
 * In order of use to the person: overdue (once, and only while it is still open), due tomorrow
 * (once), then the lead's chase days, by the same rule as the email reminder (never twice in a day,
 * nothing once the lead stopped chasing or asked for no reminders). The chase is
 * checkin_team_almost_in or checkin_your_view_matters, which the caller picks from the counts.
 */
export function whatToSendThisMorning(input: {
  policy: ChasingPolicy;
  daysOpen: number;
  dueAt: Date | null;
  now: Date;
  /** The morning messages this check-in has already had. */
  alreadyHad: ReadonlySet<string>;
  hoursSinceLastChase: number | null;
}): AMorningMessage | null {
  if (input.policy.stopped || input.policy.days.length === 0) return null;
  if (input.dueAt && input.dueAt.getTime() <= input.now.getTime() && !input.alreadyHad.has('overdue')) return 'overdue';
  const tomorrow = new Date(input.now.getTime() + 86_400_000);
  if (input.dueAt && dayOf(input.dueAt) === dayOf(tomorrow) && !input.alreadyHad.has('due-tomorrow')) return 'due-tomorrow';
  const decided = whatToDoToday({ policy: input.policy, daysOpen: input.daysOpen, hoursSinceLastNudge: input.hoursSinceLastChase, leadAlreadyTold: false });
  return decided.do === 'nudge them' ? 'chase' : null;
}

/**
 * WHICH CHASE: the team's picture is coming together (at least half of the people who can answer
 * have), or their view matters (fewer than half, or nobody else to count). Counts leave out anybody
 * not yet let in (decision 77), and a check-in about one person is never "the team's picture".
 */
export function whichChase(input: { answered: number; ofHowMany: number; aboutOnePerson: boolean }): 'team-almost-in' | 'your-view-matters' {
  if (input.aboutOnePerson || input.ofHowMany < 2) return 'your-view-matters';
  return input.answered * 2 >= input.ofHowMany ? 'team-almost-in' : 'your-view-matters';
}

/** The order a person's morning messages are kept in when more than one is due: one goes. */
export const MORNING_ORDER: AMorningMessage[] = ['overdue', 'due-tomorrow', 'chase'];

/**
 * groundwork_request_waiting (decision 82, item 1): a leave, hours or spending request waits for this
 * approver. {{3}} is the request in a-request-in-words.ts's words ("leave from ... to ...").
 */
export const aRequestIsWaiting = (approverFirstName: string | null | undefined, personFirstName: string, what: string) =>
  notice('request-waiting', [approverFirstName?.trim() || 'there', personFirstName.trim() || 'somebody', what]);

/** groundwork_request_decided: the person is told what was decided about their own request, and by whom. */
export const aRequestWasDecided = (personFirstName: string | null | undefined, what: string, outcome: 'approved' | 'declined', deciderFirstName: string | null | undefined) =>
  notice('request-decided', [personFirstName?.trim() || 'there', what, outcome, deciderFirstName?.trim() || 'the person who approves it']);

/**
 * groundwork_review_started and groundwork_review_decided (item 16): the person's review waits for them
 * in the app. Only who started or decided it is said, never a word of the review itself.
 */
export const aReviewWasStarted = (personFirstName: string | null | undefined, writerFirstName: string | null | undefined) =>
  notice('review-started', [personFirstName?.trim() || 'there', writerFirstName?.trim() || 'The person who writes it with you']);
export const aReviewWasDecided = (personFirstName: string | null | undefined, writerFirstName: string | null | undefined) =>
  notice('review-decided', [personFirstName?.trim() || 'there', writerFirstName?.trim() || 'The person who writes it with you']);
