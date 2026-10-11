import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { whoHasMissedCheckIns, whatThePersonIsToldAboutMissing } from '../grounds/missed-check-ins';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { hasBeenToldOnce, nowToldOnce, isAlreadyHeld } from './a-message-sent-once';

/**
 * MISSED CHECK-INS, TOLD TO THE PERSON FIRST, BY EMAIL (decision 136, change 8).
 *
 * The person who has missed two check-ins in a row is told, in the app (Today) and once by email, before their lead hears anything. Once per run of
 * misses, never daily: it is remembered by the run's first missed session, so a new run after they came back is told again. It is a routine message,
 * so the one-a-day rule holds it like any reminder. No WhatsApp: a first message on WhatsApp needs an approved template, and none is added or changed
 * for this (decision 131).
 */
export const MISSED_SENDER = 'sendMissedCheckIns';

export const onceKeyForThePerson = (participantId: string, streakFrom: number | null) => `missed.person.${participantId}.${streakFrom ?? 0}`;

export interface TheMissedDoors {
  prisma: any;
  email: { sendMissedCheckIns: (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => Promise<'sent' | 'held' | 'suppressed' | unknown> };
  frontendUrl: string;
}

export async function sendTheMissedCheckInsToThePeople(deps: TheMissedDoors, now: Date = new Date()): Promise<{ tried: number }> {
  const { prisma } = deps;
  const grounds: any[] = await everyRowAPageAtATime((page: any) => prisma.ground.findMany({
    where: { status: { notIn: [...A_GROUND_NO_MESSAGE_IS_ABOUT] } }, select: { id: true }, orderBy: { id: 'asc' }, ...page,
  }), 1000);
  const found = await whoHasMissedCheckIns(prisma, grounds.map((g) => g.id), now);
  const users = [...new Set(found.map((f) => f.userId).filter((u): u is string => !!u))];
  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  let tried = 0;
  for (const userId of users) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, deletedAt: true, isActive: true } });
      if (!user?.email || user.deletedAt || user.isActive === false) continue;
      for (const t of await whatThePersonIsToldAboutMissing(prisma, userId, null, now)) {
        const key = onceKeyForThePerson(t.participantId, t.streakFrom);
        if (await hasBeenToldOnce(prisma, key)) continue;
        if (await isAlreadyHeld(prisma, MISSED_SENDER, user.email)) continue;
        const link = t.openCheckInId ? `${base}/checkin/${t.openCheckInId}` : `${base}/today`;
        const [first, ...rest] = t.text.split(/(?<=\.)\s+/);
        const went = await deps.email.sendMissedCheckIns(user.email, `${first.replace(/\.$/, '')} on "${t.label}"`, [first, rest.join(' '), `If something is in the way, you can tell ${t.leadName ?? 'your manager'} why on your Today page.`], t.openCheckInId ? 'Check in now' : 'Open Today', link);
        await nowToldOnce(prisma, key, went as any, { sender: MISSED_SENDER, to: user.email });
        if (went !== 'suppressed') tried++;
      }
    } catch {
      /* One person's notice that could not be sent never stops the others. */
    }
  }
  return { tried };
}
