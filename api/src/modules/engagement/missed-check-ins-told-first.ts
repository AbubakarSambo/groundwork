import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { whoHasMissedCheckIns, whatThePersonIsToldAboutMissing } from '../grounds/missed-check-ins';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { hasBeenToldOnce, nowToldOnce, isAlreadyHeld } from './a-message-sent-once';
import { whoTheyAre } from './one-routine-message-a-day';

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
        /* An opening already went to them today: the notice rides with the next opening, or goes another day, never as a second message today. */
        if (await anOpeningWentToThemToday(prisma, user.email, now)) continue;
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

/**
 * THE MISSED NOTICE RIDES WITH THE OPENING (reviewer, 14 October). On 17 October Mercy got the WhatsApp opening, the email
 * "Your next check-in is open: Sales daily" and a separate email "You've missed your last two check-ins on "Sales daily"".
 * The opening on two doors is one opening; the missed notice is folded into the opening email where one goes, and is
 * otherwise held to a day with no opening, so a person never gets an opening and a separate missed email on one day.
 */
const startOfTheDay = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

export async function anOpeningWentToThemToday(prisma: any, email: string, now: Date = new Date()): Promise<boolean> {
  const today = startOfTheDay(now);
  try {
    const them = await whoTheyAre(prisma, { email });
    const mail = await prisma.notification?.findFirst?.({
      where: { channel: 'email', outcome: 'sent', createdAt: { gte: today }, toAddress: { in: them.emails }, sender: { in: ['sendSessionReady', 'sendParticipantInvite'] } },
      select: { id: true },
    });
    if (mail) return true;
    const waiting = await prisma.scheduledEmail?.findFirst?.({ where: { sender: 'sendSessionReady', toAddress: { in: them.emails }, sentAt: null }, select: { id: true } });
    if (waiting) return true;
    if (!them.phones.length) return false;
    const opened = await prisma.whatsAppSend?.findFirst?.({ where: { phone: { in: them.phones }, createdAt: { gte: today }, sentAt: { not: null }, kind: { startsWith: 'checkin-open' } }, select: { id: true } });
    return !!opened;
  } catch {
    return false;
  }
}

/** The missed notice for this person on this check-in, as lines the opening email carries, with the key it is remembered by; null when there is nothing to tell. */
export async function theMissedNoticeToFold(prisma: any, userId: string | null | undefined, participantId: string, now: Date = new Date()): Promise<{ key: string; lines: string[] } | null> {
  if (!userId) return null;
  const told = (await whatThePersonIsToldAboutMissing(prisma, userId, null, now).catch(() => [] as Awaited<ReturnType<typeof whatThePersonIsToldAboutMissing>>)).find((t) => t.participantId === participantId);
  if (!told) return null;
  const key = onceKeyForThePerson(told.participantId, told.streakFrom);
  if (await hasBeenToldOnce(prisma, key)) return null;
  const [first, ...rest] = told.text.split(/(?<=\.)\s+/);
  return { key, lines: [first, rest.join(' '), `If something is in the way, you can tell ${told.leadName ?? 'your manager'} why on your Today page.`].filter((l) => l.trim()) };
}

export { nowToldOnce as rememberTheMissedNoticeTold };
