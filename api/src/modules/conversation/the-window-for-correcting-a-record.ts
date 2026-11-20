import { BadRequestException } from '@nestjs/common';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * A REPORT THAT IS FINAL STOPS BEING CORRECTABLE.
 *
 * "It seems you can still correct a report when it's final. We should set a cap time for which
 * you can correct a report once it's in."
 *
 * There was one lock and it was about SESSIONS, not about the report: a session cannot be
 * corrected once a later session has started, because the later ones build on it. That leaves the
 * case she found - a round closed, the report released to everybody, the next session not opened
 * yet - wide open. So a person could read a released report, watch other people read it, and then
 * quietly change the account it was built from.
 *
 * WHY A WINDOW RATHER THAN A LOCK AT RELEASE. Somebody who spots a real error in their own account
 * usually spots it BY reading the released report - that is the moment they see it next to
 * somebody else's. Slamming the door at release means the only way to fix a genuine error is to
 * wait for the next session, and on a monthly cadence that is a month of a wrong record. So there
 * is a grace period, it is short, and every correction inside it is marked on the shared report as
 * arriving after release, which is what `signedOffAt` handling already does for sign-off.
 *
 * THE DEFAULT IS SEVEN DAYS, and it is a platform setting rather than a constant because it is a
 * policy about somebody's record and policies get argued about. Read the same way the billing
 * limits are: a missing or nonsense row means the number we shipped with, never zero - zero would
 * silently make every released report uncorrectable, which is the most damaging reading of a bad
 * row.
 */
export const CORRECTION_WINDOW_KEY = 'correction_window_days';
export const DEFAULT_CORRECTION_WINDOW_DAYS = 7;
export const MAX_CORRECTION_WINDOW_DAYS = 90;

/** Whether a stored value is a window we would accept. Zero IS allowed here - see below. */
export function isAWindow(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_CORRECTION_WINDOW_DAYS;
}

export interface WhenTheReportWasReleased {
  /** When the shared report went out, or null while it has not. */
  releasedAt: Date | null;
  /** The window, in days, already read from settings. */
  windowDays: number;
  /** For the message, so a person is told the date rather than an arithmetic problem. */
  now?: Date;
}

/**
 * The decision, as a pure function, because the interesting part is the arithmetic and the
 * sentence - not the query. A window of zero means "closed at release", which is a legitimate
 * policy for an organisation that wants the record fixed the moment it is shared; it is not the
 * default precisely because it strands a genuine error.
 */
export function whetherItCanStillBeCorrected({
  releasedAt,
  windowDays,
  now = new Date(),
}: WhenTheReportWasReleased): { allowed: true } | { allowed: false; saying: string } {
  /* Not released: the round is still open, and the session lock is the only rule that applies. */
  if (!releasedAt) return { allowed: true };

  const closesAt = new Date(releasedAt.getTime() + windowDays * 24 * 60 * 60 * 1000);
  if (now.getTime() <= closesAt.getTime()) return { allowed: true };

  const day = whenItWas(closesAt, 'full');
  return {
    allowed: false,
    saying:
      windowDays === 0
        ? 'This report has been shared, so the account behind it is final. Anything you want to add goes in your next check-in, where it is recorded as a change rather than as a correction.'
        : `Corrections to this check-in closed on ${day}, ${windowDays} day${windowDays === 1 ? '' : 's'} after the report went out. Anything you want to add goes in your next check-in, where it is recorded as a change rather than as a correction.`,
  };
}

/** The same decision, thrown. Kept beside it so the sentence a person reads is written once. */
export function refuseIfTheWindowHasClosed(input: WhenTheReportWasReleased): void {
  const verdict = whetherItCanStillBeCorrected(input);
  if (!verdict.allowed) throw new BadRequestException(verdict.saying);
}
