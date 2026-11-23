/**
 * THE NAME TO CALL SOMEBODY, TOLD APART FROM EVERYBODY ELSE IN THE SAME LIST OR CHECK-IN (page audit, 24 November, rows 11 and 15).
 *
 * Sentences called people by the first word of their name, so on one board "Juma said" was Juma Otieno and two people called Juma
 * Test. A person is called by their first name, and by their whole name where somebody else in the same list or check-in has the same
 * first name. Two people with the same whole name are both called by it: nothing else tells them apart, and that is the record. A list
 * may hold the same person more than once.
 *
 * The screens keep the same rule for the names they draw (client/src/lib/names-that-tell-people-apart.ts).
 */

const firstWordOf = (name: string): string => name.trim().split(/\s+/)[0] ?? '';
const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();
const tidy = (n: string | null | undefined): string => String(n ?? '').trim().replace(/\s+/g, ' ');

/** The name to call `full` by, among `everyone` (whole names, `full` itself included or not). */
export function theNameToCall(full: string | null | undefined, everyone: readonly (string | null | undefined)[]): string {
  const name = tidy(full);
  const first = firstWordOf(name);
  if (!first) return '';
  const clashes = everyone.some((n) => {
    const other = tidy(n);
    return !!other && !same(other, name) && same(firstWordOf(other), first);
  });
  return clashes ? name : first;
}

/** One caller for a whole list or check-in: names each person as `theNameToCall` does among `everyone`. */
export function namesToCallAmong(everyone: readonly (string | null | undefined)[]): (full: string | null | undefined) => string {
  return (full) => theNameToCall(full, everyone);
}
