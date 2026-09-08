/**
 * IT SAID "THE NEXT SCREEN WILL ASK WHO IS CHECKING IN" THREE TIMES AND NEVER WENT THERE.
 *
 * Read off a live demo. The person answered "its 3 people - 3 names - go ahead to next stage", then
 * "ok", then "alright. lets go", and each time got another paragraph promising the next screen. The
 * setup could not be finished and nothing on the screen said why.
 *
 * THE DEADLOCK, EXACTLY.
 *
 * Two things decide whether setup ends, and they do not talk to each other. The model decides when
 * to stop asking: the prompt tells it that once it has what it needs its reply must be a warm closer
 * with NO question mark, saying what happens next. The product decides when the screen advances:
 * `onboardingIsReady` requires `mode`, `initial` and `decision` to have been extracted.
 *
 * When the model closes and one of those three did not extract, the state is unrecoverable - and not
 * as a matter of degree. The model has stopped asking questions. A field is only ever populated from
 * something the person SAYS, and a person only says things in answer to being asked. So no further
 * turn can populate the missing field, which means the gate cannot open on any future turn, no
 * matter how many the person spends. The loop is not unlikely; it is closed.
 *
 * This is the second time in this file's history, one field along. The comment on `required: ['mode']`
 * describes it happening when `mode` never populated: "the wrap-up card never rendered, and the
 * conversation ended with the assistant saying 'next you will add the people involved' above a screen
 * with nothing to click." That fix made ONE field more reliable. It could not stop the next field
 * doing the same thing, because the deadlock is in the disagreement, not in any one field.
 *
 * SO THE RULE IS ABOUT THE DISAGREEMENT. If the assistant has stopped asking, setup is over -
 * whatever extraction managed to get. That is not a lowered standard: it is the only reading under
 * which the gate is answerable. Anything still missing is shown as missing; the screen already
 * prints what is actually on the record underneath the reply, and the people step and the check-in
 * itself both come after this and both collect more.
 *
 * TWO, NOT ONE. A single closer can be the model wrapping one thread before opening another, and
 * ending setup on it would cut a conversation that was still going. Two in a row, with the person
 * having spoken in between, is the model being asked to continue and having nothing to ask - which
 * is the deadlock and nothing else.
 */

/** A reply with no question in it is a reply that cannot produce another answer. */
export function itAskedNothing(text: string | null | undefined): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  return !t.includes('?');
}

export interface ATurn {
  role: string;
  content?: string | null;
}

/**
 * Whether the assistant has stopped asking, and so cannot reach the gate however long this goes on.
 *
 * `reply` is the turn about to be sent, which is not in `messages` yet.
 */
export function theSetupHasStoppedAsking(messages: ATurn[], reply: string): boolean {
  if (!itAskedNothing(reply)) return false;

  /* The assistant turn before this one. Anything that is not an assistant turn is skipped rather
     than treated as a break: the person answering in between is the normal shape, and is in fact
     what makes two closers a deadlock rather than one long reply. */
  const previous = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!previous) return false;

  /* And the person must actually have spoken since. Two assistant turns in a row with nobody
     between them is one reply in two parts, not a person stuck. */
  const lastAssistantAt = messages.map((m) => m.role).lastIndexOf('assistant');
  const personSpokeSince = messages.slice(lastAssistantAt + 1).some((m) => m.role === 'user');
  if (!personSpokeSince) return false;

  return itAskedNothing(previous.content);
}

/** What is still missing, so the person is told rather than left to notice. */
export function whatSetupNeverGot(extracted: { mode?: string; initial?: string; decision?: string }): string[] {
  const missing: string[] = [];
  if (!extracted.initial) missing.push('what the situation is');
  if (!extracted.decision) missing.push('why now');
  if (!extracted.mode) missing.push('whether this is starting, underway, or looking back');
  return missing;
}
