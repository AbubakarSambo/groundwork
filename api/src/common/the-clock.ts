/**
 * THE CLOCK THE QUIET-HOURS CHECK AND THE SWEEPS READ (local test runs only).
 *
 * Quiet hours are product behaviour and are never switched off. A test run that happens at night in Lagos would otherwise have to wait for
 * the morning, so a local run may move "now" for the quiet-hours check, the sweeps, and the places that ask what day it is for the work Groundwork does for a senior person (the standing instructions, the nudges, the year-end pass and her chat). This file is the one owner of that clock: nothing in those places reads `new Date()` for "now".
 *
 *   LOCAL_TEST_CLOCK=2026-11-11T10:00:00+01:00     the moment "now" is when the API starts; it then runs on at the normal speed
 *
 * It is read only when NODE_ENV is not "production" and only when LOCAL_TEST_CLOCK_ALLOWED=true is also set, the same pattern as
 * ALLOW_LOCAL_INBOUND_MAIL. In production, or with either missing, this is the real time. Stored times (when a mail was written down, when a
 * check-in closes) are not moved: only the questions "is it quiet hours now?" and "is anything due now?" are.
 */
const startedAt = Date.now();

export function theClockIsMoved(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.LOCAL_TEST_CLOCK_ALLOWED === 'true' && Number.isFinite(Date.parse(process.env.LOCAL_TEST_CLOCK ?? ''));
}

/** The time that quiet hours and the sweeps ask about. Always `new Date()` unless a local test run moved it. */
export function theQuietHoursNow(): Date {
  if (!theClockIsMoved()) return new Date();
  return new Date(Date.parse(process.env.LOCAL_TEST_CLOCK as string) + (Date.now() - startedAt));
}
