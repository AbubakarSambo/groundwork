/**
 * WHICH SETUP QUESTIONS SOMEBODY HAS READ AND SIGNED OFF.
 *
 * "We may want something to show if each setup step is complete, something to make a person review
 * each setup step and sign off, like a mark-done check sign. Something minor."
 *
 * Minor is the design, not a caveat. Setup is nine questions with defaults on most of them, so the
 * useful thing is not validation - a default is a real answer - it is a way for the person to say
 * "I have looked at this one" and see at a glance which ones they have not.
 *
 * WHERE IT IS KEPT, AND THE LIMIT OF THAT. In this browser, against this check-in. It is not a
 * record about anybody and it changes nothing about the check-in, so it does not belong in the
 * database with the things that do - but it does mean somebody who reviews setup on their laptop
 * and opens it on their phone sees the ticks gone. Setting up a check-in is one sitting; that trade
 * is worth stating rather than discovering.
 *
 * Every read and write is wrapped: a private window, cleared site data, or a browser set to refuse
 * storage all make this throw, and a tick nobody can save must never stop the page rendering.
 */
const KEY = (groundId: string) => `gw.setup-reviewed.${groundId}`;

export function stepsYouHaveChecked(groundId: string): number[] {
  try {
    const raw = localStorage.getItem(KEY(groundId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

export function rememberYouCheckedIt(groundId: string, step: number): number[] {
  const next = [...new Set([...stepsYouHaveChecked(groundId), step])].sort((a, b) => a - b);
  try {
    localStorage.setItem(KEY(groundId), JSON.stringify(next));
  } catch {
    /* Nothing to do about it, and nothing worth telling somebody about a tick. */
  }
  return next;
}

export function forgetYouCheckedIt(groundId: string, step: number): number[] {
  const next = stepsYouHaveChecked(groundId).filter((n) => n !== step);
  try {
    localStorage.setItem(KEY(groundId), JSON.stringify(next));
  } catch {
    /* As above. */
  }
  return next;
}

/** What the strip at the top of Setup says. Zero of nine is a state, not an error. */
export function howFarThroughSetup(checked: number[], total: number): string {
  const done = checked.length;
  if (total === 0) return '';
  if (done === 0) return `You have not signed off any of the ${total} setup questions yet.`;
  if (done >= total) return `You have looked at all ${total} setup questions.`;
  return `${done} of ${total} setup questions signed off.`;
}
