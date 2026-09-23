/**
 * THE FIELD THIS ANSWER IS STILL MISSING, AND ASKING FOR IT.
 *
 * Eighty-six of a hundred and one conversations never reached how the person vets anybody.
 * Seventy-two never reached which actors they need. Sixty never reached volumes. The report those
 * conversations produced was called worthless, and it was: nothing incomparable can be counted, and
 * most of what the brief asked for was never collected at all.
 *
 * The frame says what a complete answer holds. This is what makes the conversation hold itself to
 * it: which of those fields this person has actually given, which they have said they cannot, and
 * which one to ask for next.
 *
 * WHAT THIS IS NOT. A form, and not a script. It decides ONE thing - which subject the next turn is
 * about - and hands the model the lead's own question for it. The model still asks it in the
 * person's own words, still follows a steer, still probes the answer it gets. Determinism owns the
 * shape; the conversation owns the conversation.
 *
 * AND "I CANNOT ANSWER THAT" IS AN ANSWER. Asked twice for something somebody has already said they
 * have no way of knowing, a conversation stops being an interview and becomes an interrogation. A
 * field they have ruled out is closed for the rest of the run, and the fact that they ruled it out
 * is the finding - twenty-nine people with no way to check a new supplier is the product spec.
 */
import type { AField } from './what-a-complete-answer-holds';

export interface WhatTheyHaveFilled {
  /** Field ids this person has given a real value for. */
  filled?: string[];
  /** Field ids they were asked for and said they do not know, do not do, or have no way to. */
  cannotSay?: string[];
  /**
   * FIELD IDS ALREADY PUT TO THEM, ONE ENTRY PER ASK.
   *
   * Driven live and it was worse than having no frame at all: she said "maize and soya" in her
   * first sentence, the read did not credit it to the products field, and the conversation then
   * asked what products she wanted three turns running - through her answer about farmers and
   * agents, and through her answer about vetting - until the reply guards stripped the repeat and
   * left "Understood. What else should I know?"
   *
   * This is the same fault as asking about states twice, which took two attempts to fix at the
   * subject level, and I reintroduced it one layer down. A field is asked at most twice; after
   * that the honest reading is that they are not going to answer it, and the report says we never
   * got it rather than the conversation grinding on it.
   */
  askedFields?: string[];
}

/** After this many asks with no answer, they are not going to answer it. */
export const ENOUGH_TIMES_TO_ASK = 2;

const howOften = (ids: string[] | undefined, id: string) => (ids ?? []).filter((x) => x === id).length;

/** Whether this field is one to ask THIS person, given the kind of organisation they answer for. */
export function itAppliesToThem(field: AField, kind: string | null | undefined): boolean {
  if (!field.askedOf) return true;
  const theirs = (kind ?? '').toLowerCase();
  if (!theirs) return false;
  return field.askedOf.toLowerCase().split(/\W+/).filter((w) => w.length > 3).some((w) => theirs.includes(w));
}

/** The fields still owed by this person: theirs to answer, not given, not ruled out. */
export function whatIsStillOwed(
  frame: AField[] | null | undefined,
  state: WhatTheyHaveFilled | null | undefined,
  theirKind?: string | null,
): AField[] {
  const filled = new Set(state?.filled ?? []);
  const ruledOut = new Set(state?.cannotSay ?? []);
  return (frame ?? []).filter((f) => f?.id
    && !filled.has(f.id)
    && !ruledOut.has(f.id)
    && howOften(state?.askedFields, f.id) < ENOUGH_TIMES_TO_ASK
    && itAppliesToThem(f, theirKind));
}

/**
 * WHILE MOST OF IT IS STILL MISSING, THE FRAME COMES FIRST.
 *
 * The same shape as breadthFirst next door, and for the same reason. Early on, the most valuable
 * thing any turn can do is collect a column the lead asked for; late on, once the shape is there,
 * sharpening what somebody actually said is worth more than the last empty field. Half is the line,
 * and `>=` so a conversation exactly halfway keeps collecting.
 */
export function theFrameComesFirst(
  frame: AField[] | null | undefined,
  state: WhatTheyHaveFilled | null | undefined,
  theirKind?: string | null,
): boolean {
  const theirs = (frame ?? []).filter((f) => itAppliesToThem(f, theirKind));
  if (!theirs.length) return false;
  return whatIsStillOwed(frame, state, theirKind).length * 2 >= theirs.length;
}

/**
 * REQUIRED ONES FIRST, THEN THE REST, IN THE BRIEF'S OWN ORDER - AND NEVER THE SAME ONE TWICE
 * RUNNING.
 *
 * One that has been put to them once and not answered goes to the back rather than being dropped:
 * somebody who talked past a question often answers it when it comes back after something else.
 * Twice and it is out, which `whatIsStillOwed` decides.
 */
export function theFieldWorthAsking(
  frame: AField[] | null | undefined,
  state: WhatTheyHaveFilled | null | undefined,
  theirKind?: string | null,
): AField | null {
  const owed = whatIsStillOwed(frame, state, theirKind);
  const fresh = owed.filter((f) => howOften(state?.askedFields, f.id) === 0);
  const pick = (from: AField[]) => from.find((f) => f.required) ?? from[0] ?? null;
  return pick(fresh) ?? pick(owed);
}

/**
 * WHAT THE TURN IS TOLD, IN THE LEAD'S OWN QUESTION.
 *
 * The lead wrote the brief and the field's question was read out of it, so this hands the model that
 * question rather than a paraphrase of a paraphrase. The shape is named because a shape is what
 * makes an answer comparable: "which states" wants place names, and "about what you would expect"
 * is the same question with nothing countable in it.
 */
const WHAT_THE_SHAPE_WANTS: Record<AField['shape'], string> = {
  PLACE: 'Press for the places by name. A region is not a place somebody can be introduced in.',
  THING: 'Press for what it is called - the crop, the product, the market - not the category.',
  QUANTITY: 'Press for the number WITH its unit and its period: two thousand tonnes a quarter, not "a lot".',
  ACTOR: 'Press for the kind of person or organisation, and a named one where they have it.',
  COUNT: 'Press for how many. A number, not "several".',
  DATE: 'Press for by when. A month is enough; "soon" is not.',
  MONEY: 'Press for the amount and the currency.',
  CHOICE: 'Their situation is one of a few. Ask plainly and let them say which - do not read the options out like a form.',
};

export function askForThisField(field: AField): string {
  return [
    `THE THING THIS TURN IS FOR: ${field.asks}`,
    '',
    `This is one of the things whoever called this check-in said every answer has to hold, and this person has not said it yet. It is why they are here.`,
    WHAT_THE_SHAPE_WANTS[field.shape],
    field.oneOf?.length
      ? `Where they describe it, what you need to end up knowing is which of these they are in: ${field.oneOf.join(' / ')}. Never list these to them.`
      : '',
    'ASK IT IN THEIR WORDS AND FROM WHAT THEY HAVE ALREADY SAID. A question that arrives with no connection to the last thing they told you reads as a form, however well it is worded.',
    'AND IF THEY HAVE ALREADY SAID THEY CANNOT ANSWER IT, DO NOT ASK AGAIN. Take the answer, say plainly that it is worth knowing they have no way to, and go to something else.',
  ].filter(Boolean).join('\n');
}
