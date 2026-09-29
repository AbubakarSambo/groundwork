/**
 * CONFIRMED BY THE PERSON WHO RECEIVED IT (week 6 of docs/weekly-plan.md).
 *
 * The prototype marks each line a lead reads with how it is known, and one of the four marks is
 * "Confirmed by the person who received it" (docs/prototype/screens/B4-reports-and-sharing/
 * one-session.txt and team-report.txt). The prototype does not say how a line gets there. Hafsah's
 * rule, 29 September 2026: a line is confirmed when the colleague who was waiting for that work says,
 * in their own check-in, that it is no longer in their way.
 *
 * The engine already keeps who waits on whom for what (GroundDependency), and the waiter's own newest
 * account is what clears a wait. So when a wait on a colleague in the same check-in goes from waiting
 * to cleared in the waiter's own check-in, the colleague's record is read for the one line that says
 * they delivered that thing, and that line is marked. Nothing else counts: not the person themselves,
 * not a departure (departure.service clears waits too), and not a wait on somebody outside the
 * check-in. At most one line per cleared wait, and a line already confirmed stays as it was.
 *
 * Understanding which line says it was delivered is the model's job; which rows it may pick from, and
 * that it picks at most one, is code's.
 */

export const WHICH_LINE_WAS_DELIVERED_PROMPT = `A colleague was waiting on this person for something, and has now said, in their own check-in, that it is no longer in their way.

You are given what the colleague was waiting for, and this person's own record lines, numbered.

Say which ONE line, if any, is this person saying they delivered, sent, handed over or finished that very thing. Only a line about that same thing counts. A line that only plans it, promises it, or talks about something else does not count. If no line clearly says it was delivered, answer with no line.`;

export const WHICH_LINE_WAS_DELIVERED_SCHEMA = {
  name: 'emit_delivered_line',
  description: 'The one record line that says this person delivered what the colleague was waiting for, or none.',
  input_schema: {
    type: 'object',
    properties: {
      line: { type: ['integer', 'null'], description: 'Zero-based index of the line, or null when no line says it was delivered.' },
    },
    required: ['line'],
  },
};

export interface AWaitThatCleared {
  status: string;
  previousStatus: string | null;
  fromParticipantId: string;
  onParticipantId: string | null;
}

/**
 * Whether this change to a wait is one that can confirm somebody's line: it was waiting and is now
 * cleared, it was on a colleague in this check-in, and that colleague is not the waiter.
 */
export function aWaitThatConfirms(w: AWaitThatCleared): boolean {
  return w.status === 'CLEARED'
    && !!w.previousStatus && w.previousStatus !== 'CLEARED'
    && !!w.onParticipantId
    && w.onParticipantId !== w.fromParticipantId;
}

const NOT_A_THING = new Set(['about', 'after', 'again', 'from', 'have', 'into', 'just', 'more', 'need', 'needs', 'some', 'that', 'their', 'them', 'they', 'this', 'with', 'what', 'when', 'will', 'your', 'being', 'clarity', 'confirmation', 'decision', 'answer', 'update', 'thing', 'things', 'someone', 'something']);
const thingsIn = (t: string) => new Set((t ?? '').toLowerCase().replace(/['’]s\b/g, '').split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !NOT_A_THING.has(w)));

/**
 * AND THE LINE HAS TO NAME THE SAME THING. Read on the local corpus: a wait for "clarity on Wanjiru's
 * project" was matched to "We received the letter outlining the nine to eleven-month process". The
 * model is asked which line; code checks it shares at least one real word with what was waited for.
 * A line in other words for the same thing is missed, which is the safe way to be wrong: a missed
 * confirmation leaves a line as their word, a wrong one tells a lead something nobody said.
 */
export function namesTheSameThing(what: string, line: string): boolean {
  const wanted = thingsIn(what);
  if (!wanted.size) return false;
  for (const w of thingsIn(line)) if (wanted.has(w)) return true;
  return false;
}

/** The line the model picked, if it is a real, unconfirmed, undisputed one about the same thing. */
export function theLineToConfirm<T extends { id: string; text: string; confirmedAt?: Date | null; disputedAt?: Date | null }>(
  lines: readonly T[],
  picked: number | null | undefined,
  what: string,
): T | null {
  if (!Number.isInteger(picked)) return null;
  const line = lines[picked as number];
  if (!line || line.confirmedAt || line.disputedAt) return null;
  return namesTheSameThing(what, line.text) ? line : null;
}

/** How the words of the wait and a line are put to the model. */
export function thePrompt(what: string, lines: readonly { text: string }[]): string {
  return `WHAT THE COLLEAGUE WAS WAITING FOR:\n${what}\n\nTHIS PERSON'S RECORD LINES:\n${lines.map((l, i) => `[${i}] ${l.text}`).join('\n')}`;
}
