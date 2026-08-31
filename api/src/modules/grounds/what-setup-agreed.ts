/**
 * NOTHING TURNED SETUP INTO SOMETHING THE FIRST CHECK-IN COULD MEASURE AGAINST.
 *
 * Only two things in this codebase create a `PersonObjective`, and both run INSIDE a check-in
 * conversation. So whatever a lead agreed in the entry chat, wrote in the brief, or settled in the
 * context chat existed as prose and nothing else - and the first check-in opened with no objective
 * for anybody, which is most of why it feels long and shapeless. It has to establish from scratch
 * what the setup already decided.
 *
 * WHAT THIS IS, AND WHAT IT CAREFULLY IS NOT.
 *
 * It records what the LEAD said they expect of each person, as the lead's expectation, marked
 * unseen. That last part is the whole safety of it: `seenBySubject: false` is what the six
 * explanations read to refuse pressing anybody about a thing nobody showed them, and it is true
 * here by construction - the person has not read it, because they have not arrived yet.
 *
 * It is NOT agreement. Nobody has agreed to anything at setup except the lead, with themselves. The
 * first check-in is where the other person gets to say what they understood, and the value of the
 * whole product is in the gap between the two. Recording the lead's version as though it were
 * shared would close that gap by fiat and produce a report that agrees with itself.
 *
 * AUTHORED BY THE LEAD, NEVER BY US. `authoredBy` says who wrote it so the record can tell an
 * expectation somebody set from one the product inferred. This writes 'lead-setup', which is
 * neither the person it is about nor an integration.
 */

export const AUTHORED_AT_SETUP = 'lead-setup';

export interface AgreedAtSetup {
  /** Which participant it is about. */
  participantId: string;
  /** What the lead expects of them, in the lead's words. Never rewritten. */
  text: string;
}

/**
 * WHAT MAKES AN EXPECTATION WORTH RECORDING.
 *
 * A sentence with nothing checkable in it - "do a good job", "be more proactive" - is worse than no
 * objective at all: it looks like a standard, cannot be met or missed, and the first check-in will
 * measure somebody against it anyway. The interview is better at drawing these out than a setup
 * chat is, so the bar to write one here is deliberately high and silence is the ordinary answer.
 */
const TOO_THIN = [
  'do a good job', 'work hard', 'be proactive', 'be more proactive', 'do well', 'help out',
  'be a team player', 'communicate well', 'take ownership', 'hit the ground running',
  'add value', 'make an impact', 'be reliable', 'step up', 'deliver results',
];

/**
 * The lead's framing stripped off, so the same thin sentence is caught however it is introduced.
 * "I want them to be more proactive" and "be more proactive" are one expectation.
 */
const FRAMING = /^(i (would |just )?(want|need|expect|would like)( them)?( to)?|they (should|need to|must|will)|to)\s+/i;

function theExpectationItself(text: string): string {
  return (text ?? '')
    .trim()
    .replace(FRAMING, '')
    .replace(/[.!?]+$/, '')
    .trim()
    .toLowerCase();
}

/**
 * WHAT MAKES AN EXPECTATION WORTH RECORDING.
 *
 * A sentence with nothing checkable in it - "do a good job", "be more proactive" - is worse than no
 * objective at all: it looks like a standard, cannot be met or missed, and the first check-in will
 * measure somebody against it anyway.
 *
 * DELIBERATELY CRUDE, AND HONEST ABOUT IT. This cannot judge whether an expectation is any good;
 * the interview is far better at that and will push on a vague one for two attempts. Its only job
 * is to stop the obvious junk reaching the record dressed as a standard. Silence is the ordinary
 * answer and costs nothing, because the check-in draws the expectation out anyway.
 *
 * THE THIN-PHRASE LIST EARNS ITS PLACE ONLY BECAUSE OF THE STRIPPING. My first version matched the
 * whole string against it, and every phrase in the list was already too short or too few words to
 * pass the checks below - so the list was decoration, and two deliberate breakages of it changed
 * nothing. It matches the expectation with the lead's framing removed, which is what people
 * actually type.
 */
export function worthRecording(text: string): boolean {
  const t = (text ?? '').trim();
  if (t.length < 15) return false;

  const itself = theExpectationItself(t);
  if (TOO_THIN.some((p) => itself === p)) return false;

  /* Something checkable: a number, or enough words to have named a thing. */
  return /\d/.test(t) || t.split(/\s+/).length >= 5;
}

/**
 * WHAT THE LEAD IS TOLD BEFORE ANY OF IT IS WRITTEN DOWN.
 *
 * Recording an expectation about somebody without telling the person who set it what that means is
 * how a product ends up holding a standard nobody knew they had set. It is one sentence and it goes
 * in the chat, not in a tooltip.
 */
export const WHAT_RECORDING_IT_MEANS =
  'Anything you name here is recorded as YOUR expectation, not as something agreed. It is marked as '
  + 'not yet seen by them, so nothing in the record will hold them to it until they have read it - '
  + 'and their first check-in asks what they understood, in their own words, before it shows them '
  + 'yours. Where the two differ, that difference is the finding.';
