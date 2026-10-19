import { theDealsOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';

/**
 * A QUESTION HER OWN RULE ALREADY ANSWERS IS ANSWERED, NOT ASKED (Hafsah, 19 October, point 5: "Use the lead's confirmed definitions (for
 * Drop Access, Won = a signed order or a payment) instead of asking her whether something meets them.").
 *
 * Drop Access (test). Grace set, on Monday 12 October, "A sale counts only with proof of payment or a signed order." Her shared-picture
 * email that afternoon said "Here is a conversation worth having. The status of the Kilele Hotel sale is described differently. Confirm if
 * the payment confirmation for the Kilele Hotel sale meets the team's definition of a completed deal." It asked her to judge a sale
 * against her own rule, while the record already held the payment record for Kilele Hotel. To the person who set the rule, the sentence
 * that asks it is now what her rule makes of the deal, from the record:
 *   "Your rule is that a sale counts only with a payment or a signed order. There is a payment record for Kilele Hotel, so it counts."
 * Only where she set the rule, the sentence asks whether something meets it, and it names exactly one deal on record.
 */
export interface TheLeadsRuleForASale {
  deals: { name: string; paid: boolean; signed: boolean }[];
}

const THE_RULE = /\bpayment or (?:a )?signed order\b|\bsigned order or (?:a )?payment\b/i;
const ASKS_IF_IT_MEETS = /\b(?:meets?|fits?|satisf(?:y|ies)|qualif(?:y|ies) as|counts? as|is (?:a |an )?)\b[^.?!]*\b(?:definition|rule|standard|criteria|criterion)\b|\b(?:confirm|check|decide|agree)\b[^.?!]*\b(?:counts? as|is) (?:a )?(?:completed |closed |real )?(?:sale|deal|won|sold)\b/i;
const squash = (t: string) => String(t ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/\s+/g, ' ').trim();

/** The sentences of a line, with any sentence her rule answers said as what it makes of the deal. */
export function withWhatHerRuleSays(line: string, rule: TheLeadsRuleForASale | null | undefined): string {
  if (!rule || !line) return line;
  const sentences = String(line).match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [line];
  let changed = false;
  const out = sentences.map((s) => {
    if (!ASKS_IF_IT_MEETS.test(s)) return s;
    const named = rule.deals.filter((d) => d.name.trim().length >= 3 && squash(s).includes(squash(d.name)));
    if (named.length !== 1) return s;
    const d = named[0];
    changed = true;
    const tail = /\s+$/.exec(s)?.[0] ?? '';
    const proof = d.paid ? 'There is a payment record' : d.signed ? 'There is a signed order' : null;
    return `Your rule is that a sale counts only with a payment or a signed order. ${proof ? `${proof} for ${d.name}, so it counts.` : `Nothing on record shows a payment or a signed order for ${d.name} yet, so it does not count yet.`}${tail}`;
  });
  return changed ? out.join('').trim() : line;
}

/** Her rule, where she set one (a target's assumption, or her own words in the check-in), with each deal and its proof on record. */
export async function theLeadsRuleForASale(prisma: any, groundId: string): Promise<TheLeadsRuleForASale | null> {
  const ground = await Promise.resolve(prisma.ground?.findUnique?.({ where: { id: groundId }, select: { initiatorId: true, participants: { select: { id: true, userId: true, partyType: true } } } })).catch(() => null);
  if (!ground) return null;
  const hers = ((ground.participants ?? []) as any[]).filter((p) => p.partyType === 'INITIATOR' || (!!ground.initiatorId && p.userId === ground.initiatorId)).map((p) => p.id);
  const assumed = ((await Promise.resolve(prisma.groundObjective?.findMany?.({ where: { groundId }, select: { assumes: true } })).catch(() => [])) ?? []) as any[];
  const said = hers.length ? ((await Promise.resolve(prisma.recordEntry?.findMany?.({ where: { participantId: { in: hers }, disputedAt: null }, select: { text: true } })).catch(() => [])) ?? []) as any[] : [];
  const set = assumed.some((o) => (Array.isArray(o?.assumes) ? o.assumes : []).some((a: unknown) => THE_RULE.test(String(a))))
    || said.some((l) => THE_RULE.test(String(l?.text ?? '')));
  if (!set) return null;
  const deals = await theDealsOnRecord(prisma, groundId, { paymentRecord: true }).catch(() => []);
  return { deals: deals.map((d) => ({ name: d.name, paid: !!d.paid, signed: !!d.signed })) };
}
