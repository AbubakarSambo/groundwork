/**
 * THE NAME TO CALL SOMEBODY, TOLD APART FROM EVERYBODY ELSE IN THE SAME LIST OR CHECK-IN (page audit, 24 November, rows 11 and 15).
 *
 * Every page called people by the first word of their name, so on one board "Juma" was Juma Otieno and two people called Juma Test,
 * and the People page said "Neema and Neema are invited". A person is called by their first name, and by their whole name where
 * somebody else in the same list or check-in has the same first name. Two people with the same whole name are both called by it:
 * nothing else on the page tells them apart, and that is the record. A list may hold the same person more than once.
 *
 * The engine keeps the same rule for the sentences it writes (api/src/common/names-that-tell-people-apart.ts).
 */

const firstWordOf = (name: string): string => name.trim().split(/\s+/)[0] ?? ''
const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

/** The name to call `full` by, among `everyone` (full names, `full` itself included or not). */
export function theNameToCall(full: string | null | undefined, everyone: readonly (string | null | undefined)[]): string {
  const name = String(full ?? '').trim().replace(/\s+/g, ' ')
  const first = firstWordOf(name)
  if (!first) return ''
  /* Somebody else is a different whole name with the same first name; a list may hold the same person more than once. */
  const clashes = everyone.some((n) => {
    const other = String(n ?? '').trim().replace(/\s+/g, ' ')
    return !!other && !same(other, name) && same(firstWordOf(other), first)
  })
  return clashes ? name : first
}

/** One caller for a whole list or check-in: `callThem(full)` names each person as `theNameToCall` does among `everyone`. */
export function namesToCallAmong(everyone: readonly (string | null | undefined)[]): (full: string | null | undefined) => string {
  return (full) => theNameToCall(full, everyone)
}
