/**
 * WHEN THIS IS OVER, AS FACT, BECAUSE THE PRODUCT KNOWS AND THE PERSON DOES NOT.
 *
 * Read live on an open link, 22 September 2026. The person asked "How do i know if we are done" and
 * the answer was "You have given what you said of your expansion plans" - a summary of the
 * conversation so far, ungrammatical, and about the wrong thing. They were not asking whether this
 * conversation had covered enough. They were asking whether anything else was coming: another
 * session, another link, another week of this.
 *
 * Every fact that answers it is on the ground - how many rounds are planned, which one this is, when
 * the last one lands - and none of it was ever in front of the model, so the model did what a model
 * does with a question it cannot answer and answered the nearest one it could.
 *
 * Kept deliberately narrow: this says what the run IS. It does not tell the conversation to raise
 * it, to reassure anybody, or to close. See how-short-a-check-in-may-be.ts for what ends a session.
 */
const onADay = (d: Date): string =>
  `${d.getDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()]} ${d.getFullYear()}`;

export function whenThisIsOver(a: {
  sessionNumber: number;
  /** How many rounds this run has, where the cadence and the timeline say. Null when neither does. */
  roundsPlanned: number | null;
  /** The day the run ends, where there is one. */
  endsOn: Date | null;
  /** Runs until the lead ends it: no total, no end date, and nothing to say about how far through it is. */
  runsUntilEnded?: boolean;
}): string {
  const lines: string[] = [];
  const planned = a.runsUntilEnded ? null : a.roundsPlanned ?? null;
  if (a.runsUntilEnded) {
    lines.push(`This is session ${a.sessionNumber}. It runs until the lead ends it, so there is no set number of sessions and no end date.`);
  } else if (planned != null && planned <= 1) {
    lines.push('This is a one-off read. When this conversation ends, that is the whole of it: there is no next session and nobody will be asked again.');
  } else if (planned != null) {
    const left = Math.max(0, planned - a.sessionNumber);
    lines.push(
      `This is session ${a.sessionNumber} of ${planned}.`,
      left === 0
        ? 'This is the last one; nothing follows it.'
        : `${left === 1 ? 'One more session follows this one' : `${left} more sessions follow this one`}, each a short conversation like this one.`,
    );
  } else {
    lines.push(`This is session ${a.sessionNumber}. How many more there are has not been set.`);
  }
  if (a.endsOn && !a.runsUntilEnded) lines.push(`The whole thing ends on ${onADay(a.endsOn)}.`);
  return [
    'HOW LONG THIS RUNS (fact, not something to raise).',
    ...lines,
    'They may ask whether this is finished, or when it ends. Answer that with these facts about the run, in one sentence.',
    'Never answer it with a summary of what they said, and never invent a date or a number of sessions.',
  ].join('\n');
}

/*
 * AND WHEN THEY HAVE JUST ASKED IT, ONE LINE AT THE VERY END.
 *
 * The facts above sit in a 100,000-character prompt, where a paragraph reads as background. Watched
 * on 22 September 2026: with the facts in the prompt, "How do i know if we are done?" still got
 * "when you have answered all the questions that are relevant for your own plan" - an answer about
 * the conversation, from a run that has exactly one session. Position is the fix, and this is
 * position plus occasion: it arrives only on the turn where somebody asked.
 */
const THEY_ASKED_WHEN_THIS_IS_OVER =
  /\b(are we (nearly )?(done|finished)|is (this|that|it) (it|done|over|finished)|how (do|will|would) i know (if|when) (we|this|it) (are|is)?\s?(done|finished|over)|when (does|will|is) (this|it) (end|finish|over|stop)|how (many|much) (more |longer )?(sessions|rounds|times|weeks)|do i (have to|need to) do this again|is there another (one|session|round))\b/i;

/** Whether their last message is asking what else is coming, rather than asking about the work. */
export const theyAskedWhenThisIsOver = (message: string | null | undefined): boolean =>
  THEY_ASKED_WHEN_THIS_IS_OVER.test((message ?? '').replace(/\s+/g, ' '));

/** Sent only on the turn they ask, after everything else. */
export const THE_RUN_IS_WHAT_THEY_ASKED_ABOUT =
  'AND RIGHT NOW: their last message asks what else is coming - another session, another link, more of this. Answer that first, in one sentence, using HOW LONG THIS RUNS above. Not what they have covered, not what is left to discuss in here: how many sessions there are and when it ends.';
