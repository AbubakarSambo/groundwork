/**
 * THE PRODUCT PROPOSES A CONVERSATION. THIS IS WHERE SOMEBODY GETS TO ANSWER IT.
 *
 * The detectors have always produced suggestions, and `ScenariosService.decide` has always been
 * ready to take a yes or a no. What was never built is the half in between: nothing surfaced a
 * suggestion to the person it was addressed to. `GET /suggestions` and `POST /suggestions/:id`
 * exist, so a customer's engineer could answer one through the API - the person it is about could
 * not. A proposal nobody can see is a proposal that expires, and every one of them expired.
 *
 * WHY THE DECLINE MATTERS MORE THAN THE ACCEPT. A suggestion that stands for fourteen days and
 * lapses looks the same in the record as one nobody ever read, so the detector has no idea it was
 * wrong and proposes it again. A decline is the only thing that starts the ninety-day cooling in
 * `COOLING_DAYS` - which means, until now, that cooling had never once been reached by a person
 * saying no. Giving somebody a way to say "not this" is what stops the assistant nagging.
 *
 * WHAT A YES DOES NOT DO. It does not open a check-in. A suggestion carries a scenario and a name;
 * a check-in needs a moment, a timeframe, participants and a brief - decisions this person has not
 * made yet and that no default should make for them. So the yes is recorded as the real decision it
 * is, and hands back the setup flow with the one thing it does know already filled in.
 */
import { CANDIDATE_LIFE_DAYS } from '../detectors/a-conversation-the-record-suggests';

/** Only what the wording needs. Kept narrow so this file can be tested without a database. */
export interface Suggestible {
  id: string;
  scenario: string;
  says: string;
  confidence: number;
  personExternalId: string | null;
  expiresAt: Date;
}

/**
 * THE ROW IS NOT THE TYPE, AND ASSUMING IT WAS COST A WORKING SET OF TESTS.
 *
 * `Candidate.says` is a field on the detector's output; `scenario_candidates` has no such column.
 * `propose` folds it into the evidence blob as `evidence.says`, so a row read straight back has
 * `says` undefined - and every test passed, because a fake I wrote supplied it at the top level
 * exactly as I had imagined it. Looking at the actual table is what found it.
 *
 * The fallback is not decoration. A candidate written before `says` was folded in, or by a detector
 * that omits it, would otherwise render the word "undefined" into a sentence about a colleague.
 */
export function fromRow(row: {
  id: string;
  scenario: string;
  confidence: number;
  personExternalId: string | null;
  expiresAt: Date;
  evidence?: unknown;
}): Suggestible {
  const said = (row.evidence as { says?: unknown } | null)?.says;
  return {
    id: row.id,
    scenario: row.scenario,
    confidence: row.confidence,
    personExternalId: row.personExternalId,
    expiresAt: row.expiresAt,
    says: typeof said === 'string' && said.trim()
      ? said.trim()
      : `The record suggests a ${row.scenario.toLowerCase().replace(/_/g, ' ')} conversation.`,
  };
}

/**
 * How many days are left, told the way a person counts them.
 *
 * Rounded UP, and that is the whole reason this is a function. A suggestion expiring in nine hours
 * is not "0 days left" - it is the last day, and rounding down would say the thing that gets
 * somebody to put it off until it is gone.
 */
export function daysLeft(s: Suggestible, now: Date): number {
  const ms = s.expiresAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

/**
 * WHAT IT IS SURE OF, IN WORDS, BECAUSE 0.72 IS NOT A THING A PERSON CAN WEIGH.
 *
 * Three bands rather than a number. A percentage invites somebody to treat a detector's arithmetic
 * as a measurement of a colleague, which it is not - it is how much of a pattern was present.
 */
export function howSure(confidence: number): string {
  if (confidence >= 0.75) return 'The signs for this are strong';
  if (confidence >= 0.5) return 'There are some signs of this';
  return 'This is a faint signal';
}

/**
 * The one line that gets read.
 *
 * `says` is the detector's own sentence and is quoted rather than reworded. It is the only part
 * carrying what actually happened, and a paraphrase of evidence is not evidence.
 */
export function suggestionLine(s: Suggestible, now: Date): string {
  const left = daysLeft(s, now);
  const window = left === 0
    ? 'It has run out of time to be useful.'
    : left === 1
      ? 'Today is the last day this is worth acting on.'
      : `It is worth acting on for another ${left} days.`;
  return `${s.says} ${howSure(s.confidence)}. ${window}`;
}

/** Nothing pending is a real and good answer, and it should not read as a failure to find any. */
export const NOTHING_PENDING =
  'Nothing is waiting on you. Nothing in the record is suggesting a conversation right now.';

/**
 * Asked once, with the answer it takes stated plainly - and stating only what a yes actually does.
 *
 * The first wording said "say yes and I will start it for you". Reading it back on a live reply is
 * what showed it up: a yes records the decision and hands back the setup flow, and nothing in this
 * product opens a check-in without somebody choosing a moment, a timeframe and who is in it. A
 * sentence promising more than the next screen delivers is how a person decides the thing lies.
 */
export function askAbout(_s: Suggestible): string {
  return 'Do you want this one? Say yes and I will take you to setting it up, or no and I will stop raising it.';
}

/**
 * WHERE A YES GOES.
 *
 * The scenario is passed as the stored value, not as the picker's label. The label map lives in the
 * client and translating here would be a second copy of it - the exact shape of every bug in this
 * repo that took a day to find. The client accepts the stored value directly for that reason.
 */
export function setupLink(scenario: string): string {
  return `/grounds/new?scenario=${encodeURIComponent(scenario)}`;
}

/**
 * WHAT A YES SAYS, WITH THE PATH TAKEN OUT OF IT.
 *
 * It used to read "Open /grounds/new?scenario=... to set it up". In the product that path works. In
 * the embedded panel the same sentence is read on the customer's own page, where a relative path
 * resolves against THEIR origin - so the one instruction the reply gave was broken exactly where the
 * API story lives, and reading fine everywhere it was tested.
 *
 * The words no longer contain a link at all. Where to go is a `next_step` block beside them, and the
 * panel decides what to do with it: a customer whose own application has a place to set a check-in
 * up points at that, and one who has not gets our page. Neither is decided here, because this code
 * cannot know which application it is being read inside.
 */
export function acceptedLine(_s: Suggestible): string {
  return 'Right. I have recorded that you want this one, and it will not be raised at you again. Setting it up is the next step - the type is filled in already, and the rest is yours to decide.';
}

/** Where setting it up lives, as something a panel can route rather than a path in prose. */
export function acceptedNextStep(s: Suggestible): {
  label: string;
  href: string;
  kind: 'set_up_a_check_in';
  context: Record<string, string>;
} {
  return {
    label: 'Set up this check-in',
    href: setupLink(s.scenario),
    kind: 'set_up_a_check_in',
    context: { scenario: s.scenario },
  };
}

/**
 * A DECLINE SAYS WHAT IT COSTS, because "no" here is not free and somebody should know that.
 *
 * Ninety days of silence on this exact suggestion is a long time, and a person who thinks they are
 * saying "not today" is actually saying "not this quarter".
 */
export function declinedLine(coolingDays: number): string {
  return `I have left it. I will not raise this one again for ${coolingDays} days.`;
}

/** For the comment above `daysLeft` to stay true if the life of a candidate ever changes. */
export const LIFE_DAYS = CANDIDATE_LIFE_DAYS;
