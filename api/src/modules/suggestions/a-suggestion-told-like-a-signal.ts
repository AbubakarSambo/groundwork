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
  };
}
