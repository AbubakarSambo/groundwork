/**
 * A REFUSAL IS AN ANSWER: RECORD IT, SAY WHAT IT MEANS, MOVE ON.
 *
 * Six runs, 20-21 September 2026, and the commonest fault the judge named was still "repeated
 * question", with "badgering" and "questionnaire feel" beside it. Read as the person: "I manage the
 * team's overall performance. They know their individual targets." - and the product asked for the
 * individual targets twice more, then asked what she would do about it and by when, twice, then once
 * more after she said she had to get back to work. When a person declines, the product had one move:
 * rephrase and ask again. It never won the second time and it lost the person every time.
 *
 * The second move, in code: take the refusal as the answer, say what it means for the record - "Then
 * the N180m has no owners on this record, and that is what the board will show." - and go to the next
 * thing the session is for. Two asks, then this, never a third. The consequence sentence is itself a
 * kind of pressure a person can answer; a fourth question is not.
 *
 * And the close chases nothing. "Put a date or a number on that" went out to people who had said
 * "No." The close now records that nothing here carries a date or a number, and closes.
 */
import { saidToThem, asAQuestion } from './the-close-is-held-once';

/** "Then X goes on this record as not given." X is the owed thing, said to them. */
export function whatTheAbsenceMeans(owedWhat: string): string {
  const x = saidToThem(owedWhat).replace(/^(what|how|where|who|which|whether)\s+/i, (m) => m.toLowerCase()).replace(/[.]+$/, '');
  /* A noun phrase is the subject; a clause ("what is clear and what is not") is named after the colon,
     because "Then what is clear and what is not goes on this record" read as a broken sentence (smoke
     run 7, 21 Sep 2026). */
  /* One shape for every owed thing: "the goals or targets, as numbers or dates goes on this record" read as
     a broken sentence too (run 8). */
  /* No colon: "Then it goes on this record as not given: what is clear and what is not" was one of the weird
     colons (21 Sep 2026). One sentence, the thing named inside it. */
  return `Then this record shows nothing on ${x}.`;
}

/**
 * The line that ships when the model will not let a question go, or the person has declined it twice:
 * the record of the absence, and the next thing - the plan's next question where there is one, the next
 * owed thing said to them where there is not, nothing where there is nothing.
 */
export function recordAndMoveOn(declinedWhat: string | null, next: { question?: string | null; owed?: string | null }): string {
  const first = declinedWhat ? whatTheAbsenceMeans(declinedWhat) : 'That goes on this record as you put it.';
  if (next.question?.trim()) return `${first} ${next.question.trim()}`;
  if (next.owed?.trim()) return `${first} ${asAQuestion(next.owed)}`;
  return first;
}

/** The close, when nothing in the session carried a date, a number or a document: said, not chased. */
export const NOTHING_HERE_HAS_A_NUMBER = 'Nothing said this time carries a date, a number or a document, and that is how it will read.';

/** The lead closed on "I will keep monitoring": said, not chased. */
export const NO_DECISION_YET = 'No decision from you is on this record yet, and that is how it will read.';
