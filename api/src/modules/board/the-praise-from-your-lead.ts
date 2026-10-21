import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * THE PRAISE FROM YOUR LEAD (Groundwork does the managing, part 2). What the lead who runs the check-in praised one person for, from her
 * board (your-team-person-by-person.ts, kept as a PersonLeadAction of kind PRAISE). The person reads it in their own record, on My work and
 * in their own report, and nowhere else: no message is sent for it. Only praise is read this way; the lead's plans stay hers alone.
 */
/** The praise the lead gave one person, as that person reads it in their own record: "On Wednesday 21 October Grace said “...”". */
export async function thePraiseFromYourLead(prisma: any, participantId: string, leadFirst: string, zone: string): Promise<{ heading: string; lines: string[] } | null> {
  const rows: any[] = (await Promise.resolve(prisma?.personLeadAction?.findMany?.({ where: { participantId, kind: 'PRAISE' }, orderBy: { createdAt: 'desc' }, take: 10 })).catch(() => [])) ?? [];
  if (!rows.length) return null;
  const who = leadFirst || 'Your lead';
  return { heading: `What ${who} said about your work`, lines: rows.map((r) => `On ${whenItWas(r.createdAt, 'weekdayAndDay', zone)} ${who} said “${String(r.says).trim()}”`) };
}
