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
import { asksForHomework, THE_LEADS_DECISION, whatIsConcreteIn, ONE_MORE_QUESTION, THE_CLOSE_WAS_HELD } from './the-close-is-held-once';

/** From this many answers on, the model is told the question is still owed. One past the floor of five. */
export const SAY_IT_IS_STILL_OWED_FROM = 3;
/** From this many answers on, the model is told to ask it on this turn. */
export const ASK_IT_NOW_FROM = 4;
/** Where the check-ins on the runs closed by themselves, said to the model as a fact about check-ins. */
export const A_CHECK_IN_USUALLY_CLOSES_AFTER = 6;

/** The question the product asks at the close, when the model closed without it. The prompt's own sentence. */
export const WHAT_WILL_YOU_DO = 'What will you do about this, and by when?';
/** The same, where nothing kept above it names what "this" is. */
export const WHAT_WILL_YOU_DO_NEXT = 'What will you do next, and by when?';

/*
 * A HELD QUESTION ALWAYS HAS A SUBJECT (re-e, 1 October 2026). Tobi read "I have one more question before
 * we finish. By when will you do that?" with nothing above it, and once under a bare "Understood.": "that"
 * pointed at nothing. Where they said what they will do, the question says it back in their own words
 * ("By when will you ask Amina to clarify your role regarding commercial conversations?"). "About this"
 * is used only under a sentence that says what this is, and otherwise the question is about what is next.
 */
export function theCloseQuestionFor(isLead: boolean, personTurns: string[] = [], keptAbove = ''): string {
  if (isLead) return `${ONE_MORE_QUESTION} ${THE_LEADS_DECISION}`;
  const step = theirOwnNextStep(personTurns);
  if (step) return `${ONE_MORE_QUESTION} By when will you ${step}?`;
  return `${ONE_MORE_QUESTION} ${namesSomething(keptAbove) ? WHAT_WILL_YOU_DO : WHAT_WILL_YOU_DO_NEXT}`;
}

/* An acknowledgement on its own names nothing: "Understood.", "Okay.", "Thank you." */
const ONLY_AN_ACKNOWLEDGEMENT = /^(?:(?:understood|okay|ok|right|thank you|thanks|noted|got it|good|i see|that is clear|that is helpful)[\s.,!]*)+$/i;
function namesSomething(kept: string): boolean {
  const t = (kept ?? '').trim();
  if (!t || ONLY_AN_ACKNOWLEDGEMENT.test(t)) return false;
  return t.replace(/^(?:understood|okay|ok|right|thank you|thanks|noted)[.,!]?\s*/i, '').split(/\s+/).filter(Boolean).length >= 4;
}

/*
 * THE WAYS IT GETS ASKED. The prompt's own sentence and its "that is the outcome" follow-up, the lead's
 * decision, the next-step forms the model reaches for ("what is your own next step now", read in re-d),
 * and any question that asks them by when they will do something ("What will you do to get a clear
 * timeline, and by when?", "what specific question will you get an answer to, and by when?", re-e). Any
 * of them counts: the point is that the person was asked for their own next step.
 */
const ASKED_ANOTHER_WAY =
  /\b(by when will you|when will you|what have you decided|what will you do|what are you going to do|what is the (?:first|next|one) thing you (?:will )?do|what (?:is|will be) your (?:own )?(?:first |next )(?:step|move))\b/i;
/* Asking for the when on its own counts too: "What is the date you will have an answer by?", "What would you
   consider a reasonable timeframe?" (Tobi, re-e). */
const ASKED_FOR_THE_WHEN = /\b(?:what|which) (?:is the )?(?:date|day) (?:will )?you\b|\btimeframe\b[^?]*\?|\bwhen (?:will|can) you\b[^?]*\?/i;
const WILL_YOU_BY_WHEN = /\b(?:will you|you will|are you going to)\b[^?]*\bby when\b|\bby when\b[^?]*\b(?:will you|you will)\b/i;

/** Has this check-in already asked them what they will do? */
export function theyHaveBeenAsked(aiTurns: string[]): boolean {
  return (aiTurns ?? []).some((t) => {
    const text = t ?? '';
    return asksForHomework(text) || ASKED_ANOTHER_WAY.test(text) || WILL_YOU_BY_WHEN.test(text) || ASKED_FOR_THE_WHEN.test(text) || text.includes(THE_LEADS_DECISION);
  });
}

/* Their own next step, in their own words: "I will call them today", "I'll send it by Friday". */
const THEIR_OWN_NEXT_STEP =
  /\b(i will|i'll|i am going to|i'm going to|i plan to|i intend to|i'm planning to|my next step is|the first thing i(?:'ll| will) do)\b/i;

/*
 * A WHEN, AS PEOPLE SAY IT. The close bar's dates, and the ones re-e showed it did not know: Ngozi said
 * "I will do this today" and was asked "By when will you do that?"; Tobi said "within the next two weeks"
 * and "at our next scheduled meeting".
 */
const A_WHEN =
  /\b(today|tonight|tomorrow|this (?:week|month|quarter|morning|afternoon|evening|weekend)|next (?:week|month|quarter|meeting|scheduled meeting|one-to-one|check-in|time we meet)|(?:at|in|by) (?:our|my|the) next (?:\w+ )?(?:meeting|call|check-in|review)|within (?:the next )?(?:a|one|two|three|four|five|six|few|\d+) (?:days?|weeks?|months?)|in (?:the next )?(?:a|one|two|three|four|five|six|few|\d+) (?:days?|weeks?|months?)|end of (?:the )?(?:day|week|month|quarter)|right away|straight away|immediately)\b/i;
/* "may" is a month to the close bar's reader; "any new issues that may arise" is not a date (Tobi, re-e). */
const saysWhen = (t: string) => A_WHEN.test(t ?? '') || whatIsConcreteIn((t ?? '').replace(/\bmay\b(?!\s+\d)/gi, ''), false).includes('a date');

/** Have they already said what they will do, with a when? Then there is nothing left to ask. */
export function theyHaveSaidWhatAndWhen(personTurns: string[]): boolean {
  return (personTurns ?? []).some((t) => THEIR_OWN_NEXT_STEP.test(t ?? '') && saysWhen(t ?? ''));
}

/** Have they said what they will do, without a when? Then only the when is left. */
export function theyHaveSaidWhatButNotWhen(personTurns: string[]): boolean {
  return (personTurns ?? []).some((t) => THEIR_OWN_NEXT_STEP.test(t ?? ''));
}

/** Their own words for what they will do, said to them: "I will ask Amina to clarify my role" -> "ask Amina to clarify your role". */
export function theirOwnNextStep(personTurns: string[]): string | null {
  for (let i = (personTurns ?? []).length - 1; i >= 0; i--) {
    const t = (personTurns[i] ?? '').trim();
    const m = THEIR_OWN_NEXT_STEP.exec(t);
    if (!m) continue;
    let rest = t.slice((m.index ?? 0) + m[0].length).split(/[.!?;\n]/)[0] ?? '';
    rest = rest.replace(/^\s*(?:also|still|then|just|definitely|probably|now)\s+/i, '').replace(/^\s*to\s+/i, '').trim();
    rest = rest
      .replace(/\bmyself\b/gi, 'yourself').replace(/\bmine\b/gi, 'yours').replace(/\bmy\b/gi, 'your')
      .replace(/\bme\b/gi, 'you').replace(/\bour\b/gi, 'your').replace(/\bI'm\b/g, "you're").replace(/\bI\b/g, 'you');
    const words = rest.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 16) continue;
    if (/^(?:do|be)\s+(?:it|that|this)\b/i.test(rest)) continue;
    /* "continue to monitor" is how they work, not a step with a day: "By when will you continue to monitor" reads oddly (Tobi, re-e). */
    if (/^(?:continue|keep|carry on)\b/i.test(rest)) continue;
    return rest.replace(/[,\s]+$/, '');
  }
  return null;
}

/** The question the last turn before the close asked, so the close does not stack another on a fresh answer. */
export function theyHaveJustAnsweredIt(aiTurns: string[], personTurns: string[]): boolean {
  const before = (aiTurns ?? []).length >= 2 ? aiTurns[aiTurns.length - 2] : '';
  const last = (personTurns ?? [])[(personTurns ?? []).length - 1] ?? '';
  return theyHaveBeenAsked([before]) || (THEIR_OWN_NEXT_STEP.test(last) && saysWhen(last));
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
      ? 'This is the last question you should ask before you close. Ask it now. Make it the one question in this turn. Use words from what they have told you, about the thing in the way or the thing that is due. Do not ask anything else in this turn. When they have answered, close.'
      : 'Ask it as soon as the thing you are asking about now is answered. At the latest, it is your next question. Keep to one question in each turn.',
    w.isLead
      ? 'They run this check-in, so ask what they have decided, not what homework they will do.'
      : 'If they say there is nothing to do yet, that is a real answer. Write it down and close; never ask it twice.',
  ].join('\n');
}

/**
 * WHY THE CLOSE WAS HELD, SAID TO THE MODEL ON THE TURN AFTER. THE_CLOSE_WAS_HELD names a date, a number
 * or a document, which is one of the two holds. When the hold asked for their next step, the model is
 * told that instead, so it does not read their answer as a missing date and ask a second time.
 */
export const THE_CLOSE_WAS_HELD_FOR_THE_NEXT_STEP =
  'THE CLOSE WAS HELD ONCE, by the product, to ask them what they will do about what they told you, and by when (for the person who runs this check-in: what they have decided). They have now answered that. Whatever they gave, do not ask it again and do not ask for a day they did not give: "nothing yet" and "soon" are recorded as what they said. If you were closing, close now, in the shortest turn of the session, with the marker.';

export function whyTheCloseWasHeld(aiTurns: string[]): string {
  const held = [...(aiTurns ?? [])].reverse().find((t) => (t ?? '').includes(ONE_MORE_QUESTION));
  const theQuestion = held ? held.slice(held.lastIndexOf(ONE_MORE_QUESTION) + ONE_MORE_QUESTION.length) : '';
  return theQuestion && theyHaveBeenAsked([theQuestion]) ? THE_CLOSE_WAS_HELD_FOR_THE_NEXT_STEP : THE_CLOSE_WAS_HELD;
}
