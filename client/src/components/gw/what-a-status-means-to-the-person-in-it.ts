import type { GroundStatus } from '@/types'

/**
 * A STATUS IS A SENTENCE, NOT AN ENUM.
 *
 * The Setup tab printed `AWAITING_PARTIES` at a person, in capitals, under the word "Status". That
 * is the database's word for the row, and a party reading it has to guess: awaiting which parties,
 * and am I one of them? Seen on Zainab's own Setup tab.
 *
 * Every status here is written from the reader's side - what is true, and whether anything is
 * waiting on THEM. Nothing is invented: each line says only what the status itself asserts.
 */
export const WHAT_A_STATUS_MEANS: Record<GroundStatus, string> = {
  AWAITING_LEAD: 'Waiting on the person running it to set it up',
  OPEN: 'Open',
  AWAITING_PARTIES: 'Open - waiting on people to check in',
  REPORT_READY: 'The report is ready to read',
  ACTIVE: 'Running',
  RESOLVED: 'Finished',
  STALLED: 'Stalled - nothing has moved for a while',
  PAUSED: 'Paused',
  CLOSED: 'Closed',
}

/**
 * The status in plain words. An unrecognised status falls back to the enum with its underscores
 * taken out rather than to a made-up sentence: a wrong reassurance is worse than a blunt word.
 */
export function whatThisStatusMeans(status: string | null | undefined): string {
  if (!status) return 'Not set'
  return WHAT_A_STATUS_MEANS[status as GroundStatus] ?? status.replace(/_/g, ' ').toLowerCase()
}
