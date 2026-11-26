/**
 * HAS THIS PERSON BEEN ASKED, AND HAVE THEY ANSWERED (Ebele round 2, C4: each team member got two ask mails with two subjects, the introduction's "What are you
 * currently working on?" and the standing instruction's "Your update for Rakiya", within the same day).
 *
 * One owner for the question. A person who was asked for their work in the last three days, by the introduction (the delivery that really went) or by any
 * ask the team loop wrote down (`information_gaps`), and who has not written since, is not asked for the same thing again in a second message: the earlier
 * ask stands, and the cycle that would have asked them counts them as asked. A person who has written since is free to be asked again. A message that was
 * only held (WhatsApp that Meta has not approved) was never read by anybody, so it counts for nothing.
 */
import { theirRoutineMessagesToday } from '../engagement/one-routine-message-a-day';
import { insideTheServiceWindow } from '../whatsapp/a-message-outside-the-window';

const DAY = 86_400_000;
export const ASKED_FOR_THIS_LONG = 3 * DAY;

export async function whenWereTheyLastAsked(prisma: any, a: { principalUserId: string; contact: any; now: Date; /** The ask being decided now, which is not an earlier ask. */ exceptKey?: string }): Promise<Date | null> {
  const { contact, now } = a;
  const within = (d: any) => d && now.getTime() - new Date(d).getTime() < ASKED_FOR_THIS_LONG && new Date(d).getTime() <= now.getTime() + DAY;
  const times: number[] = [];
  const to = [contact.email, contact.phone, contact.contactKey].filter(Boolean).map((x: string) => String(x).toLowerCase());
  const intros: any[] = (await prisma.introductionDelivery?.findMany?.({ where: { principalUserId: a.principalUserId, audience: 'team' } }).catch(() => [])) ?? [];
  for (const r of intros) {
    if (!to.includes(String(r.recipient).toLowerCase())) continue;
    const read = r.state === 'sent' || (r.channel === 'email' && (r.state === 'held' || r.state === 'queued'));
    const at = r.lastTriedAt ?? r.createdAt;
    if (read && within(at)) times.push(new Date(at).getTime());
  }
  const gaps: any[] = (await prisma.informationGap?.findMany?.({ where: { principalUserId: a.principalUserId, askedOfEmail: contact.contactKey, state: 'asked' } }).catch(() => [])) ?? [];
  for (const g of gaps) if (/^(?:instr|q):/.test(String(g.gapKey)) && g.gapKey !== a.exceptKey && within(g.askedAt)) times.push(new Date(g.askedAt).getTime());
  if (!times.length) return null;
  const asked = new Date(Math.max(...times));
  /* Anything they have sent since is an answer, whatever it was. */
  const wrote: any[] = (await prisma.principalMaterial?.findMany?.({ where: { principalUserId: a.principalUserId, fromUserId: `contact:${contact.id}` } }).catch(() => [])) ?? [];
  return wrote.some((m) => new Date(m.receivedAt).getTime() > asked.getTime()) ? null : asked;
}

/**
 * HOW, AND WHETHER, THEY CAN BE WRITTEN TO TODAY (Halden rerun, N1). Ebele read that 64 people would be written to. Three of them had already had the day's one routine
 * message (the year-end mail at seven), WhatsApp could not take the ask outside the 24 hours, the email was held back by the day's count, and the ask was
 * dropped with nothing on the record to tell her; and 55 she was told would get WhatsApp got an email. One owner now answers before anything is promised: the
 * say-back reads it, and so does the ask. Null is "not today".
 *
 * Inside the 24 hours on WhatsApp the ask goes as a reply, whatever the day's count. Otherwise it goes by email, and the mail door sends one routine message a
 * person a day (engagement/one-routine-message-a-day.ts, read here the same way the door reads it). With no email, WhatsApp's door decides, as before.
 */
export async function howTheyCanBeWrittenToToday(prisma: any, contact: any, now: Date): Promise<'WhatsApp' | 'email' | null> {
  if (!contact.email && !contact.phone) return null;
  if (contact.phone) {
    const person: any = contact.personId ? await prisma.person?.findFirst?.({ where: { id: contact.personId }, select: { whatsappLastInboundAt: true } }).catch(() => null) : null;
    if (insideTheServiceWindow(person?.whatsappLastInboundAt, now)) return 'WhatsApp';
    if (!contact.email) return 'WhatsApp';
  }
  const had = await theirRoutineMessagesToday(prisma, { email: contact.email, phone: contact.phone }, now);
  return had.email + had.whatsapp === 0 ? 'email' : null;
}
