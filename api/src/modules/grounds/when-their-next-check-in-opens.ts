import { Cadence } from '@prisma/client';
import { whenTheNextSessionOpens } from './the-check-ins-own-schedule';
import { checksInOnlyWhenTheyChoose } from './the-lead-checks-in-when-they-choose';
import { isShut } from './a-ground-that-has-ended';
import { totalSessionsFor } from './session-count';

/**
 * WHEN THEIR NEXT CHECK-IN OPENS, BEFORE IT EXISTS (sales-first.md, section 5: "Your next check-in opens
 * tomorrow at …" as one line on the card before they finish).
 *
 * The next session's row is only written when this one completes (ConversationService.ensureNextSession),
 * so the card shown just before "That's right, finish" had nothing to say. This reads the same schedule,
 * with the same reasons for there being no next one, without writing anything:
 *
 *   - a lead checks in when they choose, so nothing is scheduled for them;
 *   - a check-in that has ended, or is answered once, or waits for its lead (sequential), has no time;
 *   - the closing session, the last planned one, and one that would open on or after the end date have none.
 *
 * The time is the schedule's own: a daily check-in opens at 8 in the morning in the organisation's zone.
 */
export interface TheGroundsSchedule {
  status?: string | null;
  cadence?: Cadence | string | null;
  cadenceAnchorDay?: number | null;
  workingDays?: number[] | null;
  startsAt?: Date | null;
  createdAt?: Date | null;
  endsAt?: Date | null;
  timelineDays?: number | null;
}

export function whenTheirNextCheckInWouldOpen(
  ground: TheGroundsSchedule | null | undefined,
  them: { managingOnly?: boolean | null; partyType?: string | null } | null | undefined,
  thisOne: { sessionNumber: number; isFinal?: boolean | null; availableFrom?: Date | null; createdAt?: Date | null },
  zone: string | null,
  now: Date = new Date(),
): Date | null {
  if (!ground || checksInOnlyWhenTheyChoose(them as any)) return null;
  if (isShut(ground.status as any)) return null;
  const cadence = (ground.cadence ?? Cadence.FORTNIGHTLY) as Cadence;
  if (cadence === Cadence.ONE_TIME || cadence === Cadence.SEQUENTIAL) return null;
  if (thisOne.isFinal) return null;
  const planned = totalSessionsFor(ground.timelineDays ?? null, cadence);
  if (planned != null && thisOne.sessionNumber >= planned) return null;
  const lastOpenedAt = thisOne.availableFrom ?? thisOne.createdAt ?? now;
  const opens = whenTheNextSessionOpens(
    {
      cadence,
      anchorDay: ground.cadenceAnchorDay ?? null,
      workingDays: ground.workingDays ?? [],
      startedAt: ground.startsAt ?? ground.createdAt ?? lastOpenedAt,
      startsNow: !ground.startsAt,
      zone,
    },
    new Date(lastOpenedAt),
    now,
  );
  if (ground.endsAt && opens >= ground.endsAt) return null;
  return opens;
}
