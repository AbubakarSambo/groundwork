import { CheckInStatus } from '@prisma/client';

/**
 * A PHONE NUMBER ON RECORD DOES NOT MEAN THE PERSON HAS BEEN REACHED (participant activation spec, section 3 B; sections 2 and 5, "channel readiness").
 *
 * The opening notice goes to a person's phone at the moment a session opens, once. If WhatsApp was not on for the organisation then, or the number was added
 * afterwards, or the message could not go (the template was not approved, the person's number was wrong), nobody ever wrote to them there, and nothing would
 * until one of the lead's chase days. Each morning the reminders ask this about every session that is open and not started: has Groundwork ever got a WhatsApp
 * message through to this number? If not, and the person has not already been engaged some other way, they are sent the opening notice's own words
 * (the same template, no new one), once.
 *
 * "Never twice" is a fact in the send record and not a flag: a message counts as reaching them only when it went (a refused or held one is tried again), and once
 * any message has gone to the number the number is reached, whichever check-in it was about, so restarting the integration or the server cannot send a second welcome,
 * and a person with two sessions open is welcomed once and not once a day for each. Only what is open and was opened in the last three weeks is introduced this way: a
 * session nobody has opened for months is not a new arrival. Somebody who stopped the reminders, or whose lead stopped the chasing, is not written to.
 * Somebody who has started or finished a check-in in the last fortnight is already engaged and is left to the usual messages.
 */
export const CATCH_UP_KIND = 'checkin-catch-up';
const DAY = 86_400_000;
export const NOT_BEFORE_IT_HAS_BEEN_OPEN_FOR = 1 * DAY;
export const NOT_AFTER_IT_HAS_BEEN_OPEN_FOR = 21 * DAY;
export const ENGAGED_WITHIN = 14 * DAY;

/** Cheap, with no query: is this session old enough to be worth asking about, and not too old? */
export function itHasBeenOpenLongEnough(opened: Date | string, now: Date): boolean {
  const age = now.getTime() - new Date(opened).getTime();
  return age >= NOT_BEFORE_IT_HAS_BEEN_OPEN_FOR && age <= NOT_AFTER_IT_HAS_BEEN_OPEN_FOR;
}

export async function theOpeningNeverReachedThem(
  prisma: any,
  ci: { id: string; availableFrom?: Date | string | null; createdAt: Date | string; participant: { userId: string | null; remindersStoppedAt?: Date | null } },
  phoneForms: string[],
  now: Date,
): Promise<boolean> {
  if (!itHasBeenOpenLongEnough(ci.availableFrom ?? ci.createdAt, now)) return false;
  if (ci.participant.remindersStoppedAt) return false;
  /* Reached: any WhatsApp message from Groundwork has ever gone to this number, about any check-in or none. A welcome is for a number and not for a session (spec section 3 B,
     "never send duplicate welcomes"), so a person who has already been written to is not introduced again for the next session. */
  const reached = await prisma.whatsAppSend.findFirst({
    where: { phone: { in: phoneForms }, sentAt: { not: null }, NOT: { kind: { startsWith: 'admin-test' } } },
    select: { id: true },
  });
  if (reached) return false;
  /* Engaged some other way: they have a check-in going, or finished one lately. */
  if (ci.participant.userId) {
    const engaged = await prisma.checkIn.findFirst({
      where: {
        participant: { userId: ci.participant.userId },
        OR: [{ status: CheckInStatus.IN_PROGRESS }, { status: CheckInStatus.COMPLETED, completedAt: { gte: new Date(now.getTime() - ENGAGED_WITHIN) } }],
      },
      select: { id: true },
    });
    if (engaged) return false;
  }
  return true;
}
