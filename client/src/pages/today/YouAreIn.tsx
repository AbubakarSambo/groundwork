import { Callout } from '@/components/gw/ui'

/**
 * "YOU ARE IN." The line after joining, on Today and on the check-ins list (U.3 review).
 *
 * It said "Open one to start contributing." to everybody, including somebody with no check-in to
 * open. Now it says only what is true: with check-ins, open one; with none, one will appear here when
 * somebody adds you; while the list is not known yet, neither.
 *
 * REBUILT FROM THE SHARED PARTS (group 2): `Callout` with `tone="success"` for the prototype's
 * green line, in place of the page's own `gw-today-in` class.
 */
export function YouAreIn({ checkIns, mayStart = false }: {
  checkIns: number | null
  /** Whether this person may open check-ins themselves; then the line with none says they can start one (U.5 review). */
  mayStart?: boolean
}) {
  const then = checkIns === null
    ? 'You will see your check-ins and reports here.'
    : checkIns > 0
      ? 'You will see your check-ins and reports here. Open one to take part.'
      : mayStart
        ? 'You have no check-ins yet. Start one, or when someone adds you to one, you will see it here.'
        : 'You have no check-ins yet. When someone adds you to one, you will see it here.'
  return (
    <Callout tone="success" role="status">
      <b>You are in.</b> {then}
    </Callout>
  )
}
