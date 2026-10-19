/**
 * A SALE COUNTS ONLY WITH A PAYMENT OR A SIGNED ORDER, WHERE THE LEAD SAID SO (Hafsah, 19 October: "use Drop Access's confirmed
 * definition: Won = a signed order or a payment"; messages test, fourth run).
 *
 * Grace set on Monday 12 October "A sale counts only with proof of payment or a signed order." On Monday Mercy said "I've already won
 * Greenfield Supermarket for 25 units." and "Mrs. Njeri from Greenfield Supermarket said yes on the phone." The order was signed on
 * Tuesday and added on Wednesday. Grace's summary on Tuesday 13 October said "55 more units are needed to reach the target of 120 units",
 * counting Greenfield's 25 as sold on Mercy's word. Where the lead set that rule (a target's assumption, or her own words), a deal said to
 * be won counts toward what is sold only with a payment record or a signed order; until then it is said as not counted yet, by name.
 * Every check-in where the lead set no such rule reads as before.
 */
export const THE_RULE_FOR_A_SALE = /\bpayment or (?:a )?signed order\b|\bsigned order or (?:a )?payment\b/i;

/** Whether the lead of this check-in set the rule: in a target's assumptions, or in her own words on record. */
export async function theLeadSetTheRuleForASale(prisma: any, groundId: string, ground?: { initiatorId?: string | null; participants?: { id: string; userId?: string | null; partyType?: string | null }[] } | null): Promise<boolean> {
  const assumed = ((await Promise.resolve(prisma.groundObjective?.findMany?.({ where: { groundId }, select: { assumes: true } })).catch(() => [])) ?? []) as any[];
  if (assumed.some((o) => (Array.isArray(o?.assumes) ? o.assumes : []).some((a: unknown) => THE_RULE_FOR_A_SALE.test(String(a))))) return true;
  const g = ground ?? await Promise.resolve(prisma.ground?.findUnique?.({ where: { id: groundId }, select: { initiatorId: true, participants: { select: { id: true, userId: true, partyType: true } } } })).catch(() => null);
  const hers = ((g?.participants ?? []) as any[]).filter((p) => p.partyType === 'INITIATOR' || (!!g?.initiatorId && p.userId === g.initiatorId)).map((p) => p.id);
  if (!hers.length) return false;
  const said = ((await Promise.resolve(prisma.recordEntry?.findMany?.({ where: { participantId: { in: hers }, disputedAt: null }, select: { text: true } })).catch(() => [])) ?? []) as any[];
  return said.some((l) => THE_RULE_FOR_A_SALE.test(String(l?.text ?? '')));
}
