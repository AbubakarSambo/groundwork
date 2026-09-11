/**
 * WHAT AN INTEGRATION LOOKS LIKE WHEN IT IS COPYING US RATHER THAN USING US.
 *
 * A customer's system writes a roster, writes objectives, opens check-ins for people and reads the
 * reports those people produced. A scraper reads. It reads reports it never wrote a check-in for,
 * it reads the same things over and over to learn how the engine words them, and it does so in
 * bursts because a script has no reason to wait. None of these is proof, all of them are worth a
 * person's look, and the person who can throttle or withdraw is already on the API access page.
 *
 * Pure: the numbers come in, the flags come out. What counts as a call and where the numbers
 * come from is the cron's business.
 */

export interface DayOfCalls {
  calls: number;
  reads: number;
  writes: number;
  reportReads: number;
  transcriptReads: number;
  busiestMinute: number;
  checkInsOpened: number;
  peopleWritten: number;
}

export interface Flag {
  kind: 'reads-without-writes' | 'report-harvest' | 'transcript-harvest' | 'burst';
  detail: string;
}

/** A credential may make this many authenticated calls a minute before it is told to slow down. */
export const CALLS_PER_MINUTE = 300;

/** Below this a day is too quiet to say anything about. */
const ENOUGH_TO_JUDGE = 200;

export function whatLooksWrong(d: DayOfCalls): Flag[] {
  const flags: Flag[] = [];
  if (d.calls < ENOUGH_TO_JUDGE) return flags;

  if (d.reads >= ENOUGH_TO_JUDGE && d.writes * 20 < d.reads) {
    flags.push({
      kind: 'reads-without-writes',
      detail: `${d.reads} reads against ${d.writes} writes in a day. An integration that only reads is learning, not integrating.`,
    });
  }
  if (d.reportReads >= 100 && d.reportReads > d.checkInsOpened * 3) {
    flags.push({
      kind: 'report-harvest',
      detail: `${d.reportReads} report reads for ${d.checkInsOpened} check-ins opened. Reports are being collected faster than they are being made.`,
    });
  }
  if (d.transcriptReads >= 50) {
    flags.push({
      kind: 'transcript-harvest',
      detail: `${d.transcriptReads} transcript reads in a day. Transcripts are the engine's questions and a person's words; nobody's dashboard needs fifty of them.`,
    });
  }
  if (d.busiestMinute >= CALLS_PER_MINUTE) {
    flags.push({
      kind: 'burst',
      detail: `${d.busiestMinute} calls in one minute. The limit is ${CALLS_PER_MINUTE}; calls above it were refused with a 429.`,
    });
  }
  return flags;
}

export function isARead(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

export function isAReportRead(method: string, path: string): boolean {
  return isARead(method) && /\/report(\?|$)|\/reports\//.test(path);
}

export function isATranscriptRead(method: string, path: string): boolean {
  return isARead(method) && /\/transcript(\?|$)/.test(path);
}
