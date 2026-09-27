/**
 * "YOU ARE IN." The line after joining, on Today and on the check-ins list (U.3 review).
 *
 * It said "Open one to start contributing." to everybody, including somebody with no check-in to
 * open. Now it says only what is true: with check-ins, open one; with none, one will appear here when
 * somebody adds you; while the list is not known yet, neither.
 */
export function YouAreIn({ checkIns }: { checkIns: number | null }) {
  const then = checkIns === null
    ? 'You will see your check-ins and reports here.'
    : checkIns > 0
      ? 'You will see your check-ins and reports here. Open one to take part.'
      : 'You have no check-ins yet. When someone adds you to one, you will see it here.'
  return (
    <div className="gw-today-in" role="status">
      <b>You are in.</b> {then}
    </div>
  )
}
