import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * A VERDICT, TOLD LIKE A SIGNAL (C3, U.13; docs/decisions.md rule 6).
 *
 * "The engine may reach a verdict (keep, reward, support, plan, exit). People never see it as a
 * label. The manager sees a suggestion, with why, what would change it, and the person's own
 * answer, and decides, giving a reason. The person sees the facts and the decision with its
 * reasons, and can add their side or appeal. An admin decides appeals. Good suggestions work the
 * same way."
 *
 * This file decides WHAT EACH READER IS SERVED of one stored suggestion. Each reader gets their own
 * shape, built field by field from the row, so nothing reaches a reader because the whole row was
 * passed through:
 *
 *   - the lead who runs the check-in reads the suggestion (headline, why, what would change it, the
 *     person's own answer, the choices), their own decision, the person's side, and any appeal;
 *   - the person it is about reads the facts about their work, what would change them, the
 *     decision with its reasons, their own side, and their appeal. Never the headline, never the
 *     lead's "why", never the verdict;
 *   - an admin reads a suggestion only once it has been appealed, because deciding the appeal is
 *     the only thing an admin does with it;
 *   - anybody else, including a colleague in the same check-in, reads nothing.
 *
 * `verdict` is never in any shape. No shape says how anybody's answers were rated.
 *
 * The engine writes the text (docs/requests-to-engine.md, request 15). It is stored in labels, like
 * a report, and `name` puts in the names this reader may read.
 */

export const VERDICTS = ['keep', 'reward', 'support', 'plan', 'exit'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const APPEAL_OUTCOMES = ['stands', 'changed'] as const;
export type AppealOutcome = (typeof APPEAL_OUTCOMES)[number];

/**
 * A LABEL ON A PERSON, which no text the engine hands us may carry, for any reader. The lead reads
 * "Groundwork suggests a performance plan for Daniel", which is a suggestion in a sentence; never
 * "PIP", "at risk", "exit" or "low performer", which are tags.
 */
export const A_LABEL_ON_A_PERSON = /\b(PIP|at[- ]risk|exit|low[- ]performer|under-?perform\w*|poor performer)\b/i;

export interface SuggestionRow {
  id: string;
  organizationId: string;
  groundId: string;
  aboutParticipantId: string;
  verdict: string;
  headline: string;
  why: string;
  whatWouldChangeIt: string | null;
  theirOwnAnswer: string | null;
  ifYouAgree: string | null;
  otherChoices: string[] | null;
  forTheEnding: string | null;
  factsForThem: string;
  whatWouldChangeItForThem: string | null;
  promptVersionId?: string | null;
  decision: string | null;
  decisionReason: string | null;
  decidedById: string | null;
  decidedAt: Date | string | null;
  theirSide: string | null;
  theirSideAt: Date | string | null;
  appeal: string | null;
  appealedAt: Date | string | null;
  appealOutcome: string | null;
  appealReason: string | null;
  appealDecidedById: string | null;
  appealDecidedAt: Date | string | null;
  /** When the person caught up before anyone decided (decision 75, item 24). Null when they have not. */
  caughtUpAt?: Date | string | null;
  createdAt: Date | string;
}

/** What the shapes need to know besides the row: who is who, by the name this reader may read. */
export interface WhoIsWho {
  checkIn: { id: string; label: string };
  /** The person the suggestion is about, by first name. */
  aboutName: string;
  /** The person who runs the check-in, by first name. */
  leadName: string;
  /** The admin who decided the appeal, by first name, once they have. */
  appealDeciderName: string | null;
  /** Puts the names this reader may read into the engine's text. */
  name: (text: string) => string;
}

const iso = (d: Date | string | null | undefined): string | null => (d ? new Date(d).toISOString() : null);

/**
 * THE PERSON HAS CAUGHT UP SINCE THIS WAS SUGGESTED (decision 75, item 24). The suggestion keeps the facts it
 * was reached on, which the person first read, and is never rewritten. But if, before anyone decided, the person
 * is back at or above the line that reached it, every reader of it is told so, in a plain sentence with the date.
 * The lead and an admin read it with no count behind it (decision 53); the person reads it as "you".
 */
export function theyCaughtUp(row: Pick<SuggestionRow, 'caughtUpAt'>, who: Pick<WhoIsWho, 'aboutName'>, as: 'lead' | 'person' | 'admin'): string | null {
  if (!row.caughtUpAt) return null;
  const on = whenItWas(row.caughtUpAt, 'weekdayAndDay');
  if (!on) return null;
  return as === 'person'
    ? `You have caught up since this was suggested. Since ${on}, you have kept as many of your commitments in this check-in as Groundwork looks for.`
    : `${who.aboutName} has caught up since this was suggested. Since ${on}, ${who.aboutName} has kept as many of the commitments made in this check-in as Groundwork looks for.`;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * HOW LONG THE PERSON HAS TO BE SEEN TO HAVE HAD THEIR TURN, BEFORE WHOEVER RUNS THE CHECK-IN READS
 * IT ANYWAY (decision 53, "the more private way", reusing decision 39's timing for a pattern).
 *
 * Decision 13 requires the product to tell the person about a suggestion as soon as it is reached,
 * not to wait for them to open a page - so unlike a pattern, which only counts as "shown" once a
 * page that carries it is opened (who-reads-a-pattern.ts, `shownToPersonAt`), a suggestion is taken
 * as shown the moment it exists. `createdAt` is that moment. Three days is decision 39's wait for a
 * person who has been shown something and not yet answered; the longer, seven-day wait that pattern
 * gives for somebody who may never have opened the page does not apply here, because the product's
 * own rule is that they were already told.
 */
export const DAYS_THE_PERSON_HAS_TO_BE_SEEN_TO_HAVE_HAD_THEIR_TURN = 3;

/**
 * WHETHER WHOEVER RUNS THE CHECK-IN MAY READ THIS SUGGESTION YET (decision 53). The person it is
 * about reads it, and only them, until they have said something about it - their side, or an
 * appeal, either of which only exists once they have read it - or three days have passed since it
 * was reached. Without that, a row is not served to whoever runs the check-in at all.
 */
export function theLeadMayReadIt(
  row: Pick<SuggestionRow, 'theirSide' | 'appeal' | 'createdAt'>,
  now: Date = new Date(),
): boolean {
  if ((row.theirSide ?? '').trim() || (row.appeal ?? '').trim()) return true;
  const created = new Date(row.createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now.getTime() - created >= DAYS_THE_PERSON_HAS_TO_BE_SEEN_TO_HAVE_HAD_THEIR_TURN * DAY;
}

export interface TheDecision { says: string; reasons: string; at: string | null }
export interface TheAppealDecision { outcome: AppealOutcome; says: string; reasons: string; by: string; at: string | null }

/** "The decision stays." or "The decision is changed." Said the same way to every reader. */
export function whatTheAppealDecided(outcome: string | null): string {
  return outcome === 'changed' ? 'The decision is changed.' : 'The decision stays.';
}

function theDecision(row: SuggestionRow): TheDecision | null {
  if (!row.decision) return null;
  return { says: row.decision, reasons: row.decisionReason ?? '', at: iso(row.decidedAt) };
}

function theAppealDecision(row: SuggestionRow, who: WhoIsWho): TheAppealDecision | null {
  if (!row.appealOutcome) return null;
  const outcome: AppealOutcome = row.appealOutcome === 'changed' ? 'changed' : 'stands';
  return {
    outcome,
    says: whatTheAppealDecided(outcome),
    reasons: row.appealReason ?? '',
    by: who.appealDeciderName ?? 'An admin',
    at: iso(row.appealDecidedAt),
  };
}

/** What the lead who runs the check-in is served. */
export interface ForTheLead {
  id: string;
  checkIn: { id: string; label: string };
  aboutName: string;
  headline: string;
  why: string;
  whatWouldChangeIt: string | null;
  theirOwnAnswer: string | null;
  ifYouAgree: string | null;
  otherChoices: string[];
  /** True when the suggestion is about how the check-in ends, so it belongs on the ending page. */
  aboutTheEnding: boolean;
  decision: TheDecision | null;
  theirSide: string | null;
  appeal: { says: string; at: string | null } | null;
  appealDecision: TheAppealDecision | null;
  /** The lead may change their decision until it is appealed. */
  mayChangeTheDecision: boolean;
  /** "Kwame has caught up since this was suggested. ..." when he did before anyone decided (item 24). */
  caughtUp: string | null;
  /**
   * DECISION 56, ITEM 3. Set only where this suggestion is about somebody with a goal the lead has
   * written and not told them about yet - wherever an untold goal counts against the person, the
   * lead is shown it as a conversation point here too. Filled in by the caller (suggestions.service.ts
   * knows the goal rows; this shaper does not), never by anybody but the lead.
   */
  conversationPoints?: string[];
}

export function forTheLead(row: SuggestionRow, who: WhoIsWho): ForTheLead {
  return {
    id: row.id,
    checkIn: who.checkIn,
    aboutName: who.aboutName,
    headline: who.name(row.headline),
    why: who.name(row.why),
    whatWouldChangeIt: row.whatWouldChangeIt ? who.name(row.whatWouldChangeIt) : null,
    theirOwnAnswer: row.theirOwnAnswer ?? null,
    ifYouAgree: row.ifYouAgree ? who.name(row.ifYouAgree) : null,
    otherChoices: (row.otherChoices ?? []).map(who.name),
    aboutTheEnding: !!row.forTheEnding,
    decision: theDecision(row),
    theirSide: row.theirSide ?? null,
    appeal: row.appeal ? { says: row.appeal, at: iso(row.appealedAt) } : null,
    appealDecision: theAppealDecision(row, who),
    mayChangeTheDecision: !row.appeal,
    caughtUp: theyCaughtUp(row, who, 'lead'),
  };
}

/** What the person the suggestion is about is served. Facts and the decision; never the verdict. */
export interface ForThePerson {
  id: string;
  checkIn: { id: string; label: string };
  leadName: string;
  facts: string;
  whatWouldChangeIt: string | null;
  decision: TheDecision | null;
  yourSide: string | null;
  yourAppeal: { says: string; at: string | null } | null;
  appealDecision: TheAppealDecision | null;
  /** An appeal can be made once, and only once there is a decision. */
  mayAppeal: boolean;
  /** "You have caught up since this was suggested. ..." when they did before anyone decided (item 24). */
  caughtUp: string | null;
}

export function forThePerson(row: SuggestionRow, who: WhoIsWho): ForThePerson {
  return {
    id: row.id,
    checkIn: who.checkIn,
    leadName: who.leadName,
    facts: who.name(row.factsForThem),
    whatWouldChangeIt: row.whatWouldChangeItForThem ? who.name(row.whatWouldChangeItForThem) : null,
    decision: theDecision(row),
    yourSide: row.theirSide ?? null,
    yourAppeal: row.appeal ? { says: row.appeal, at: iso(row.appealedAt) } : null,
    appealDecision: theAppealDecision(row, who),
    mayAppeal: !!row.decision && !row.appeal,
    caughtUp: theyCaughtUp(row, who, 'person'),
  };
}

/**
 * What an admin is served, and only once the suggestion has been appealed: what they need to
 * decide the appeal fairly: the suggestion as the lead read it, the decision with its reasons, the
 * person's side, and the appeal.
 */
export interface ForAnAdmin {
  id: string;
  checkIn: { id: string; label: string };
  aboutName: string;
  leadName: string;
  headline: string;
  why: string;
  whatWouldChangeIt: string | null;
  theirOwnAnswer: string | null;
  decision: TheDecision | null;
  theirSide: string | null;
  appeal: { says: string; at: string | null };
  appealDecision: TheAppealDecision | null;
  /** False when this admin made the decision being appealed: somebody else decides. */
  mayDecide: boolean;
  /** As the lead reads it, when the person caught up before anyone decided (item 24). */
  caughtUp: string | null;
}

export function forAnAdmin(row: SuggestionRow, who: WhoIsWho, readerId: string): ForAnAdmin | null {
  if (!row.appeal) return null;
  return {
    id: row.id,
    checkIn: who.checkIn,
    aboutName: who.aboutName,
    leadName: who.leadName,
    headline: who.name(row.headline),
    why: who.name(row.why),
    whatWouldChangeIt: row.whatWouldChangeIt ? who.name(row.whatWouldChangeIt) : null,
    theirOwnAnswer: row.theirOwnAnswer ?? null,
    decision: theDecision(row),
    theirSide: row.theirSide ?? null,
    appeal: { says: row.appeal, at: iso(row.appealedAt) },
    appealDecision: theAppealDecision(row, who),
    mayDecide: !row.appealOutcome && row.decidedById !== readerId,
    caughtUp: theyCaughtUp(row, who, 'admin'),
  };
}
