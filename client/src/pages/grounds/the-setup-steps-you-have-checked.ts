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
 * WHERE IT IS KEPT, AND WHY IT MOVED. It was `localStorage`, keyed on the check-in, and that made
 * it two things it should not have been.
 *
 * It belonged to a BROWSER rather than to a person: walked as a second admin of an organisation, her
 * Setup tab opened with two questions already signed off, because somebody else had signed them off
 * in that browser - under a row reading "You have signed this off", a claim about a person made from
 * a store with no idea which person. And it survived a reload but not a change of laptop, while the
 * row it draws asserts that somebody reviewed something.
 *
 * The reasoning for keeping it out of the database was that it is not a record. It is: it says a
 * named person read a named question on a named date, which is the kind of thing somebody points at
 * afterwards. So it is a table, one row per person per question, and this module is the calls.
 *
 * IT STILL GATES NOTHING. No report reads it, nothing is blocked by an unsigned question, and
 * nobody sees anybody else's marks. It is one person's note that they have looked.
 */
import { apiClient } from '@/api/client';

/** The questions this person has signed off on this check-in. Theirs alone. */
export async function stepsYouHaveChecked(groundId: string): Promise<number[]> {
  const r = await apiClient.get<{ steps: number[] }>(`/grounds/${groundId}/setup-sign-offs`);
  return r.data.steps ?? [];
}

export async function rememberYouCheckedIt(groundId: string, step: number): Promise<number[]> {
  const r = await apiClient.post<{ steps: number[] }>(`/grounds/${groundId}/setup-sign-offs/${step}`, {});
  return r.data.steps ?? [];
}

export async function forgetYouCheckedIt(groundId: string, step: number): Promise<number[]> {
  const r = await apiClient.delete<{ steps: number[] }>(`/grounds/${groundId}/setup-sign-offs/${step}`);
  return r.data.steps ?? [];
}

export function howFarThroughSetup(checked: number[], total: number): string {
  const done = checked.length;
  if (total === 0) return '';
  if (done === 0) return `You have not signed off any of the ${total} setup questions yet.`;
  if (done >= total) return `You have looked at all ${total} setup questions.`;
  return `${done} of ${total} setup questions signed off.`;
}
