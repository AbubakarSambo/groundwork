/**
 * A SESSION OPENED BY EMAIL STAYS ON EMAIL (Hafsah, 19 October, point 8; messages test of 19 October, finding 4).
 *
 * Amos (Drop Access) and David (Muchemi & Co.) were let in at 09:15 on Monday 12 October and emailed "You can start your check-in
 * now". The WhatsApp opening for that session was rightly held back (webhooks.listener.ts: one channel per opening), but at 11:30
 * the morning reminders sent each of them "This is Groundwork, writing for Drop Access (test). Hi Amos, your check-in for Sales
 * team, Q4 is due tomorrow, Tuesday 13 October. ..." as their first WhatsApp message ever, for the same session. A session whose
 * opening went by email, and not on WhatsApp, is not reminded "due tomorrow" on WhatsApp: its opening chose the channel.
 *
 * Opened by email: "You can start your check-in now" or "your next check-in is ready" went to the person after the session was made,
 * and no WhatsApp opening went for it. A session also opened on WhatsApp is reminded there as before.
 */
export const THE_EMAILS_THAT_OPEN_A_SESSION = ['sendYouAreInNow', 'sendSessionReady'];

export async function itWasOpenedByEmailOnly(
  prisma: any,
  checkIn: { id: string; createdAt: Date | string },
  addresses: (string | null | undefined)[],
): Promise<boolean> {
  const to = [...new Set(addresses.filter((a): a is string => !!a && !!a.trim()).map((a) => a.trim().toLowerCase()))];
  if (!to.length) return false;
  const onWhatsApp = await Promise.resolve(prisma?.whatsAppSend?.findFirst?.({ where: { checkInId: checkIn.id, kind: { startsWith: 'checkin-open' }, sentAt: { not: null } }, select: { id: true } })).catch(() => null);
  if (onWhatsApp) return false;
  const byEmail = await Promise.resolve(prisma?.notification?.findFirst?.({
    where: { channel: 'email', sender: { in: THE_EMAILS_THAT_OPEN_A_SESSION }, outcome: { in: ['sent', 'held'] }, OR: to.map((a) => ({ toAddress: { equals: a, mode: 'insensitive' } })), createdAt: { gte: new Date(checkIn.createdAt) } },
    select: { id: true },
  })).catch(() => null);
  return !!byEmail;
}
