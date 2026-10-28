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
/**
 * `direct`: the direct morning is on for the check-in's organisation (email/a-direct-email.ts). The refusal is taken plainly and the
 * conversation moves on, with nothing said about how the record will read.
 */
export function recordAndMoveOn(declinedWhat: string | null, next: { question?: string | null; owed?: string | null }, direct = false): string {
  /* Not the filing sentence: see the-same-sentence-five-times. A refusal gets a plain acknowledgement. */
  const first = declinedWhat && !direct ? whatTheAbsenceMeans(declinedWhat) : 'Understood.';
  if (next.question?.trim()) return `${first} ${next.question.trim()}`;
  if (next.owed?.trim()) return `${first} ${asAQuestion(next.owed)}`;
  /*
   * AND "Understood." ON ITS OWN IS A WHOLE TURN, WHICH IS WHY IT DOES NOT SHIP ALONE.
   *
   * Where something was declined by name, `first` already says what the record now shows and reads
   * as a turn. Where nothing was named and there is nothing left to ask, this returned the single
   * word - three times across the twenty-four-scenario run of 26 September, and the only count in
   * the whole run that came out worse than the baseline. A person who has just declined a question
   * gets one word back and is told nothing about what that means.
   *
   * We do not know WHAT was declined here, so the sentence cannot name it, but it can say the
   * thing that is true either way and that the person is actually owed: nothing goes on the record
   * about it.
   */
  /* Not "We can leave that there": this follows an answer, often a correction, and read as brushing it off (two-week check, Brian). */
  if (direct) return 'Thank you, that is noted.';
  return declinedWhat ? first : 'Understood. This record shows nothing more on that.';
}

/** The close, when nothing in the session carried a date, a number or a document: said, not chased. */
export const NOTHING_HERE_HAS_A_NUMBER = 'Nothing said this time carries a date, a number or a document, and that is how it will read.';

/** The lead closed on "I will keep monitoring": said, not chased. */
export const NO_DECISION_YET = 'No decision from you is on this record yet, and that is how it will read.';
