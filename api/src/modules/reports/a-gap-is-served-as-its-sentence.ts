/**
 * A GAP OVER TIME IS SERVED AS ITS SENTENCE.
 *
 * Each row of `overTime.gaps` is stored as `{ participantId, who, expected, recordHolds, say }`.
 * The page prints `say` and nothing else (WhatTheRecordShows.tsx). `expected` is the lead's own
 * description of the person, in the fragments they typed ("Relationship officer, Ikeja. Target 14
 * approved facilities this quarter."), and `recordHolds` is the list `say` is built from. Neither is
 * read by anything, and `expected` was served to the lead's report and the lead's board anyway: half
 * of the thirty-six "role description used as a name" on run 10.
 *
 * Kept on the stored row, as the evidence `say` was written from. Taken off at the read, in
 * `asItWasShared`, the door every report and board read goes through. The rows only ever reach a
 * lead: `overTimeForThisReader` gives a participant no gaps at all, and that stays as it is.
 */

export function gapsAsTheirSentences<T extends Record<string, any> | null | undefined>(report: T): T {
  if (!report || typeof report !== 'object') return report;
  const overTime = (report as Record<string, any>).overTime;
  if (!overTime || typeof overTime !== 'object' || !Array.isArray(overTime.gaps)) return report;
  return {
    ...(report as Record<string, any>),
    overTime: {
      ...overTime,
      gaps: overTime.gaps.map((g: any) => {
        if (!g || typeof g !== 'object') return g;
        const { expected: _expected, recordHolds: _recordHolds, ...rest } = g;
        return rest;
      }),
    },
  } as unknown as T;
}
