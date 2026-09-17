/**
 * A SECOND PRESS IS NOT A SECOND ANSWER.
 *
 * Found by driving, in 80 of the hundred journeys: the reply to an answer takes several seconds
 * and nothing on the screen says so, so people press again. Every press created a turn, so the
 * record held the same sentence twice — and the record is the entire product. 116 of the check-ins
 * examined afterwards carried a duplicated answer.
 *
 * Two shapes, and they are different:
 *  - the first press has already been answered → the second press should get THAT answer back,
 *    not a new one, because asking the engine again produces a different question about a
 *    sentence the person has said once;
 *  - the first press is still being answered → say so plainly, and store nothing.
 *
 * Deliberately not a database constraint: somebody may genuinely repeat themselves in a long
 * session, minutes apart, and that repetition is theirs and belongs in the record. What is
 * excluded is the same sentence arriving twice inside the window in which a person is still
 * waiting for the first one.
 */

/** How long a person will wait, press again, and mean it as the same answer. */
export const A_SECOND_PRESS_WINDOW_MS = 120_000;

export const STILL_ON_YOUR_LAST_ANSWER =
  'Still reading your last answer - this can take a few seconds. Nothing was lost.';

export interface ATurnAlreadyThere {
  role: 'PERSON' | 'AI';
  content: string;
  createdAt: Date;
}

export type Verdict =
  | { kind: 'a new answer' }
  | { kind: 'the same answer, already answered'; reply: string }
  | { kind: 'the same answer, still working' };

/**
 * `turns` in the order they were written. `now` is passed in rather than read, so the window is
 * testable without waiting two minutes.
 */
export function isThisTheSameAnswerAgain(
  turns: readonly ATurnAlreadyThere[],
  message: string,
  now: Date = new Date(),
): Verdict {
  const said = message.trim();
  if (!said) return { kind: 'a new answer' };

  const lastPersonAt = [...turns].reverse().findIndex((t) => t.role === 'PERSON');
  if (lastPersonAt === -1) return { kind: 'a new answer' };
  const index = turns.length - 1 - lastPersonAt;
  const last = turns[index];

  if (last.content.trim() !== said) return { kind: 'a new answer' };
  if (now.getTime() - last.createdAt.getTime() > A_SECOND_PRESS_WINDOW_MS) return { kind: 'a new answer' };

  const answeredAfter = turns.slice(index + 1).find((t) => t.role === 'AI');
  if (answeredAfter) {
    return { kind: 'the same answer, already answered', reply: answeredAfter.content };
  }
  return { kind: 'the same answer, still working' };
}
