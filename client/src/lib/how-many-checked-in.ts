/**
 * "1 of 3 people has checked in for session 1." (user journeys, F-18). It read "1 of 3 person has checked in", the noun following how many had
 * answered when it follows how many there are: the noun goes by the total, and has or have goes by how many have.
 */
export function howManyCheckedInSentence(done: number, total: number, session: number | string): string {
  if (done === 0) return 'Nobody has checked in yet.'
  return `${done} of ${total} ${total === 1 ? 'person' : 'people'} ${done === 1 ? 'has' : 'have'} checked in for session ${session}.`
}
