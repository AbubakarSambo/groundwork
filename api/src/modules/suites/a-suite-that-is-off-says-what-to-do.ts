/**
 * A SUITE THAT IS OFF SAYS WHAT TO DO ABOUT IT (screens request 154, item 8).
 *
 * Eleven suites refused with a bare statement - "The spending suite is not switched on." - and
 * nothing a reader could act on, so the screens were adding a next step themselves. Two of the
 * suites already said one, in chat: "An admin can switch them on under Suites." The same sentence
 * now goes on all of them, so a person reads the same thing wherever they meet it.
 *
 * ONE SENTENCE FOR BOTH READERS. An admin and somebody who is not an admin are told the same
 * thing, because it is true for both and a reader-aware sentence would mean threading who is
 * reading through eleven services that do not currently know. "An admin switches it on under
 * Suites" tells an admin exactly where to go and tells everybody else who to ask.
 */

/** What to add after "The X suite is not switched on." */
export const AN_ADMIN_SWITCHES_IT_ON = 'An admin switches it on under Suites.';

/** The whole refusal for one suite, named as a person would name it. */
export function thisSuiteIsOff(whatItIsCalled: string): string {
  const name = whatItIsCalled.trim().replace(/\.$/, '');
  return `${name} is not switched on. ${AN_ADMIN_SWITCHES_IT_ON}`;
}
