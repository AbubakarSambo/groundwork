/**
 * FOUR QUESTIONS IN A ROW IS AN INTERVIEW, AND SAYING SO IN THE PROMPT DID NOT WORK.
 *
 * The rhythm rule went in and the number did not move: 76% of turns ended on a question before, 80%
 * after. That is a rule the model reads once at the top of a long prompt and then does what it was
 * going to do anyway - the same fate as the three prompt rules found dead earlier.
 *
 * The obvious enforcement is the wrong one. Stripping a trailing question would take out the probe,
 * and the probe is the product: a warmer chat that asks for less is exactly the failure this whole
 * change had to avoid.
 *
 * So this is not text surgery, it is a fact. The model is told what it has actually just done -
 * three turns, three questions - at the moment it writes the fourth. An instruction it can weigh is
 * weak; a description of its own behaviour that it cannot argue with is harder to ignore.
 */
const A_RUN_THAT_HAS_BECOME_AN_INTERVIEW = 3;

/** Whether a turn a person read ended by asking them something. */
function endsOnAQuestion(turn: string): boolean {
  return /\?["'\u2019\u201d)\s]*$/.test((turn ?? '').trim());
}

export function tooManyQuestionsInARow(recentAiTurns: string[]): boolean {
  const last = recentAiTurns.filter((t) => (t ?? '').trim()).slice(-A_RUN_THAT_HAS_BECOME_AN_INTERVIEW);
  return last.length === A_RUN_THAT_HAS_BECOME_AN_INTERVIEW && last.every(endsOnAQuestion);
}

/**
 * The line added to the prompt when the run has happened. It says what to do INSTEAD, because "do
 * not ask a question" on its own is an instruction to stop talking, and what is wanted is the
 * observation that has been getting buried under the next question every time.
 */
export function landThisOneInstead(): string {
  return (
    'RHYTHM, RIGHT NOW: your last three turns all ended by asking them something. This one should ' +
    'not. Say the single thing you noticed in what they just told you, and stop there. They will ' +
    'keep going, and what comes next is usually the part they were not going to volunteer.'
  );
}
