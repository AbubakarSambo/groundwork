/**
 * WHAT THEY WILL DO, AND BY WHEN, IS ASKED BEFORE THE CHECK-IN ENDS.
 *
 * The rule has been in the prompt for weeks: before you close, ask what they will do about this, and
 * by when (SOMETHING THE NEXT SESSION CAN TEST, in prompt-library). Read on the runs of 1 October
 * 2026, it was reached less and less. On the sales check-ins, 9 of 12 people were asked it in run-21
 * and 6 of 12 in re-d; the people whose check-in closed by itself fell from 7 to 3. Two causes,
 * both read off the turns:
 *
 *   1. NOTHING TOLD THE MODEL WHERE IT WAS. It is handed the plan, the owed list, the blockers to
 *      check, the proof to ask for and the notes to give "before this session closes", and every one
 *      of those is a reason for another question. Nothing said how many answers it had, or that the
 *      question the next session depends on had not been asked yet. The check-ins that closed by
 *      themselves closed after six to nine answers, and the question was usually the ninth or tenth
 *      thing said. One more question anywhere earlier, and it was never reached.
 *
 *   2. THE CLOSE DID NOT CHECK FOR IT. The prompt says the close "is attached to the mechanism"; it
 *      was not. When the model closed without asking it, the product's one hold went to the owed list
 *      instead, and six check-ins in re-c and re-d closed with no next step and no date in them.
 *
 * WHAT THIS DOES. It tells the model where it is, as context, from the sixth answer on, while the
 * question is still unasked: how many answers there have been, that a check-in usually closes after
 * about eight, and that the question is still owed. From the seventh answer it says this is the
 * question to ask now. The model writes the question, in words from what the person told it. Only
 * if the model closes with it still unasked does the product ask it, once, as the close's one hold.
 *
 * WHAT IT DOES NOT DO.
 *  - Nothing in a one-time session. There is no next session, and the pack says never to ask it.
 *  - Nothing in a correction, a clarification or a team update, which are different objects.
 *  - Nothing once it has been asked, or once the person has already said what they will do and when.
 *  - Nothing when the person has asked to finish. Their session, their call.
 *  - It never adds a second question to a turn, and it never asks the question twice.
 */
import { asksForHomework, THE_LEADS_DECISION, whatIsConcreteIn } from './the-close-is-held-once';

/** From this many answers on, the model is told the question is still owed. One past the floor of five. */
export const SAY_IT_IS_STILL_OWED_FROM = 6;
/** From this many answers on, the model is told to ask it on this turn. */
export const ASK_IT_NOW_FROM = 7;
/** Where the check-ins on the runs closed by themselves, said to the model as a fact about check-ins. */
export const A_CHECK_IN_USUALLY_CLOSES_AFTER = 8;

/** The question the product asks at the close, when the model closed without it. The prompt's own sentence. */
export const WHAT_WILL_YOU_DO = 'What will you do about this, and by when?';
/** Where they have already said what they will do, only the when is left. It follows their own words, kept above it. */
export const BY_WHEN_WILL_YOU_DO_THAT = 'By when will you do that?';
export const theCloseQuestionFor = (isLead: boolean, personTurns: string[] = []): string =>
  `One more before this closes. ${isLead ? THE_LEADS_DECISION : theyHaveSaidWhatButNotWhen(personTurns) ? BY_WHEN_WILL_YOU_DO_THAT : WHAT_WILL_YOU_DO}`;

/*
 * THE WAYS IT GETS ASKED. The prompt's own sentence and its "that is the outcome" follow-up, the lead's
 * decision, and the next-step forms the model reaches for ("what is your own next step now", read in
 * re-d). Any of them counts: the point is that the person was asked for their own next step.
 */
const ASKED_ANOTHER_WAY =
  /\b(by when will you|what have you decided|what is the (?:first|next|one) thing you (?:will )?do|what (?:is|will be) your (?:own )?(?:first |next )(?:step|move)|what will you do (?:next|first|about (?:this|that|it))|what are you going to do (?:next|about (?:this|that|it)))\b/i;

/** Has this check-in already asked them what they will do? */
export function theyHaveBeenAsked(aiTurns: string[]): boolean {
  return (aiTurns ?? []).some((t) => {
    const text = t ?? '';
    return asksForHomework(text) || ASKED_ANOTHER_WAY.test(text) || text.includes(THE_LEADS_DECISION);
  });
}

/* Their own next step, in their own words: "I will call them today", "I'll send it by Friday". */
const THEIR_OWN_NEXT_STEP =
  /\b(i will|i'll|i am going to|i'm going to|i plan to|i intend to|i'm planning to|my next step is|the first thing i(?:'ll| will) do)\b/i;

/** Have they already said what they will do, with a when? Then there is nothing left to ask. */
export function theyHaveSaidWhatAndWhen(personTurns: string[]): boolean {
  return (personTurns ?? []).some((t) => THEIR_OWN_NEXT_STEP.test(t ?? '') && whatIsConcreteIn(t ?? '', false).includes('a date'));
}

/** Have they said what they will do, without a when? Then only the when is left. */
export function theyHaveSaidWhatButNotWhen(personTurns: string[]): boolean {
  return (personTurns ?? []).some((t) => THEIR_OWN_NEXT_STEP.test(t ?? ''));
}

export interface WhereTheCheckInIs {
  /** Everything they have said in this check-in, in order, including the message being answered. */
  personTurns: string[];
  /** Everything this check-in has said to them, in order. */
  aiTurns: string[];
  oneTime: boolean;
  isLead: boolean;
  /** A correction, a clarification, or a team update: none of them owes a next step. */
  notACheckIn: boolean;
  /** They have just asked to finish. */
  askedToFinish: boolean;
}

/** Is the question still owed in this check-in? Read the same way by the prompt and by the close. */
export function theNextStepIsStillOwed(w: WhereTheCheckInIs): boolean {
  if (w.oneTime || w.notACheckIn || w.askedToFinish) return false;
  if (theyHaveBeenAsked(w.aiTurns)) return false;
  if (theyHaveSaidWhatAndWhen(w.personTurns)) return false;
  return true;
}

/**
 * THE BLOCK THE MODEL READS. Empty until the sixth answer, and empty once the question has been asked
 * or answered. It says where the check-in is and what is still owed; the model writes the question.
 */
export function whereTheCheckInIs(w: WhereTheCheckInIs): string {
  const answers = (w.personTurns ?? []).filter((t) => (t ?? '').trim()).length;
  if (answers < SAY_IT_IS_STILL_OWED_FROM) return '';
  if (!theNextStepIsStillOwed(w)) return '';
  const onlyWhen = !w.isLead && theyHaveSaidWhatButNotWhen(w.personTurns);
  const what = w.isLead
    ? 'what they have decided to do about what they have told you, and by when'
    : onlyWhen
      ? 'by when they will do the thing they said they will do'
      : 'what they will do about what they have told you, and by when';
  const now = answers >= ASK_IT_NOW_FROM;
  return [
    `WHERE THIS CHECK-IN IS. They have given ${answers} answers. A check-in like this usually closes after about ${A_CHECK_IN_USUALLY_CLOSES_AFTER}, and you have not yet asked them ${what}. The next check-in can only test what they say here.`,
    now
      ? 'This is the last question you should ask before you close. Ask it now, as the one question in this turn, in words taken from what they have told you: the thing in the way, or the thing that is due. Do not ask anything else in this turn. When they have answered, close.'
      : 'Ask it as soon as the thing you are asking about now is answered. At the latest, it is your next question. Keep to one question in each turn.',
    w.isLead
      ? 'They run this check-in, so ask what they have decided, not what homework they will do.'
      : 'If they say there is nothing to do yet, that is a real answer. Write it down and close; never ask it twice.',
  ].join('\n');
}
