import { PartyType } from '@prisma/client';

/**
 * "PLEASE FOLLOW UP WITH THE PEOPLE WHO HAVEN'T RESPONDED" (Ebele's Halden office, 23 November 2026). She asked it in Ask and was answered with a
 * report's opening, asking her to forward documents herself: "I don't want to spend my time chasing people." Now the model reads the request
 * (kind `follow_up`), and Groundwork says back who on the check-ins she runs still owes an answer, by check-in, and asks once. Only her yes sends,
 * because a message to somebody is sent only on a person's own yes (Ask's rule; CLAUDE.md rule 4). Each reminder is the board's own nudge
 * (engagement/the-leads-own-nudge.ts): one channel, at most one a person a day, quiet hours, STOP and leave respected, from her by name.
 */
export const FOLLOW_UP_KIND = 'follow_up_the_team';
const ENDED = ['RESOLVED', 'CLOSED', 'STALLED', 'ARCHIVED', 'DELETED', 'CANCELLED'];

export interface SomebodyToFollowUp { groundId: string; participantId: string; name: string; label: string }

/** Who on the check-ins this lead runs still owes an answer: a session of theirs is open and not answered. */
export async function whoStillOwesAnAnswer(prisma: any, organizationId: string, leadUserId: string): Promise<SomebodyToFollowUp[]> {
  const grounds: any[] = (await prisma.ground.findMany({
    where: { organizationId, initiatorId: leadUserId },
    select: { id: true, label: true, status: true, participants: { select: { id: true, userId: true, partyType: true, nameGiven: true, email: true, leftAt: true, managingOnly: true, user: { select: { firstName: true, lastName: true } } } } },
  }).catch(() => [])) ?? [];
  const out: SomebodyToFollowUp[] = [];
  for (const g of grounds.filter((x) => !ENDED.includes(String(x.status)))) {
    const people = (g.participants ?? []).filter((p: any) => p.partyType !== PartyType.INITIATOR && p.userId !== leadUserId && !p.leftAt && !p.managingOnly);
    if (!people.length) continue;
    const open: any[] = (await prisma.checkIn.findMany({
      where: { groundId: g.id, participantId: { in: people.map((p: any) => p.id) }, isSetup: false, status: { notIn: ['COMPLETED', 'DECLINED'] } },
      select: { participantId: true, availableFrom: true },
    }).catch(() => [])) ?? [];
    const now = Date.now();
    /* Somebody who has said something or sent a file here has answered, even with their conversation still open: Ebele's Finance team sent
       their reconciliations and was still listed as not having responded. */
    const said: any[] = (await Promise.resolve(prisma.conversationTurn?.findMany?.({ where: { role: 'PERSON', checkIn: { groundId: g.id } }, select: { checkIn: { select: { participantId: true } } }, distinct: ['checkInId'] })).catch(() => [])) ?? [];
    const sent: any[] = (await Promise.resolve(prisma.groundDocument?.findMany?.({ where: { groundId: g.id }, select: { participantId: true }, distinct: ['participantId'] })).catch(() => [])) ?? [];
    const answered = new Set([...said.map((t) => t.checkIn?.participantId), ...sent.map((d) => d.participantId)].filter(Boolean));
    const owing = new Set(open.filter((c) => (!c.availableFrom || new Date(c.availableFrom).getTime() <= now) && !answered.has(c.participantId)).map((c) => c.participantId));
    for (const p of people.filter((x: any) => owing.has(x.id))) {
      const name = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || p.nameGiven || String(p.email ?? '').split('@')[0];
      out.push({ groundId: g.id, participantId: p.id, name, label: String(g.label ?? 'a check-in') });
    }
  }
  return out;
}

const aList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The say-back: who, by check-in, and the one question. */
export function theFollowUpSaidBack(people: SomebodyToFollowUp[]): string {
  if (!people.length) return 'Everybody on the check-ins you run has answered what is open, so there is nobody to remind right now.';
  const byLabel = new Map<string, string[]>();
  for (const p of people) byLabel.set(p.label, [...(byLabel.get(p.label) ?? []), p.name]);
  const lines = [...byLabel.entries()].map(([label, names]) => `On ${label}, ${aList(names)} ${names.length === 1 ? 'has' : 'have'} not answered yet.`);
  return `${lines.join(' ')}\n\nShall I send each of them a reminder from you now? Each gets one message, on WhatsApp where they use it and otherwise by email, and nobody gets more than one today.`;
}

/** What became of each reminder, in one short paragraph. */
export function whatBecameOfTheReminders(results: { name: string; says: string; nudged: boolean; channel?: string | null }[]): string {
  const sent = results.filter((r) => r.nudged);
  const lines = [
    sent.length ? `I sent a reminder to ${aList(sent.map((r) => `${r.name}${r.channel ? ` by ${r.channel === 'whatsapp' ? 'WhatsApp' : 'email'}` : ''}`))}.` : 'I could not send any reminder.',
    ...results.filter((r) => !r.nudged).map((r) => r.says),
    'You can ask me who is still outstanding at any time.',
  ];
  return lines.join(' ');
}
