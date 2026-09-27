import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * "Last updated on Wednesday 23 September at 6pm. The board only changes when something new comes
 * in, such as a check-in, a report, a decision or a number from another system." (board-as-lead.txt,
 * board-as-participant.txt, read-only-view.txt: the same line for every reader.)
 *
 * The time is the server's `lastChangedAt`, the newest thing in the record the board is built from.
 * Opening the board does not move it. Where the record holds no time yet, only the second sentence
 * is said, because it is still true.
 */
export const THE_BOARD_ONLY_CHANGES =
  'The board only changes when something new comes in, such as a check-in, a report, a decision or a number from another system.'

function atTime(d: Date | string): string {
  return whenItWas(d, 'hourOfDay').replace(':00', '').replace(/\s+/g, '').toLowerCase()
}

export function whenTheBoardLastChanged(at: string | null | undefined): string {
  if (!at) return THE_BOARD_ONLY_CHANGES
  return `Last updated on ${whenItWas(at, 'weekdayAndDay')} at ${atTime(at)}. ${THE_BOARD_ONLY_CHANGES}`
}
