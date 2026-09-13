import { WHAT_EACH_SITUATION_ADDS } from '../conversation/what-every-check-in-owes';
import { stageOf } from '../conversation/what-a-check-in-owes';

/**
 * THE SYNTHESIS NEVER KNEW WHICH SITUATION IT WAS WRITING ABOUT.
 *
 * Read off a run of all 23: a crisis, a performance plan, a recognition check-in and a cohort all
 * ended with a version of "What is the single most important outcome, and what evidence would show
 * it?" A performance plan about one person was asked for a group outcome. The questions were
 * interchangeable because the prompt was: the stored synthesis text, the synthesis rules, the
 * leadership patterns, and how to read a disputed line. No situation. No round.
 *
 * THIS IS A CUE, NOT A SCRIPT. The same move the conversation already makes and that makes it feel
 * like a person rather than a form: the product says what it knows - which situation this is, what
 * this kind of check-in is FOR, which round of how many - and the model does the writing. Nothing
 * here is a question, or a phrase for the model to repeat. There is no list to pick from.
 *
 * AND IT IS THE SAME TABLE THE CONVERSATION READS. `WHAT_EACH_SITUATION_ADDS` already says what
 * each of the 22 situations wants covered, per role and per stage. Writing a second description of
 * the situations for the report is how the fourth copy of the card names happened; there is one.
 */
export function whatSituationThisIsAbout(
  scenario: string | null | undefined,
  sessionNumber: number,
  plannedSessions: number | null,
  isFinal = false,
): string {
  if (!scenario) return '';
  const stage = stageOf(sessionNumber, plannedSessions, isFinal);
  const wants = WHAT_EACH_SITUATION_ADDS[scenario] ?? [];
  /* Only what this situation adds at THIS stage: a first round and a last one want different
     things, and handing over all of them would be a list to work through. */
  const here = wants.filter((w) => w.stage.includes(stage as any)).map((w) => w.what);

  const where: Record<string, string> = {
    first: `This is the first of these, so nobody has been asked before and there is nothing earlier to compare against.`,
    middle: plannedSessions
      ? `This is round ${sessionNumber} of ${plannedSessions}, so there is a previous round to be different from.`
      : `This is round ${sessionNumber}, so there is a previous round to be different from.`,
    last: `This is the last of these, so it is where things ended up rather than where they are going.`,
  };

  return (
    `WHAT THIS CHECK-IN IS. The situation is ${scenario.toLowerCase().replace(/_/g, ' ')}. ${where[stage]}`
    + (here.length ? `\nWhat this kind of check-in is for, at this point: ${here.join('; ')}.` : '')
    + `\nThe question at the end belongs to THIS situation and to what these people actually said. `
    + `A question that would fit any team at any time is the wrong question. Never name the situation `
    + `or the round to them: they are having a conversation, not reading a case file.`
  );
}
