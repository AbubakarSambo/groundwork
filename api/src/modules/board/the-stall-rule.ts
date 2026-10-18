/**
 * THE STALL RULE IS THE LEAD'S, AND ONLY WHERE SHE SET ONE (Hafsah's standing decision 4, changed 18 October: "Don't apply a stall
 * rule Grace never set. When none is set, the board says 'No stall rule set yet' and offers to set one, with 'drop a deal after 3
 * working days' as the suggested default for Grace to confirm. It sits under What needs you, and as a suggestion in Context. Until
 * she confirms, nothing is marked cold or dropped by a stall rule.").
 *
 * WHERE IT IS KEPT. In how we work (a WAY_OF_WORKING line on the Context page), as the lead's own words or her yes to the suggestion:
 * "A deal is dropped after 3 working days with no answer from the customer." Her no to the suggestion is kept the same way, so it
 * is not asked again. Read only from the lines: nothing else sets it.
 */
export const THE_SUGGESTED_DAYS = 3;
export const THE_STALL_RULE_QUESTION = `Decide whether to drop a deal after ${THE_SUGGESTED_DAYS} working days with no answer`;
export const NO_STALL_RULE_YET = 'No stall rule set yet';

export const theStallRuleAsALine = (days: number) => `A deal is dropped after ${days} working days with no answer from the customer.`;
export const theStallRuleDeclined = 'Groundwork offered a stall rule, and you said not now. No deal is dropped for going quiet.';

const NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const A_RULE = /\bdrop(?:ped)?\b[^.]*?\bafter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+working\s+days?\b/i;

export interface TheStallRule {
  /** The working days with no answer after which a deal is dropped, or null where none is set. */
  days: number | null;
  /** The lead said not now to the suggestion. */
  declined: boolean;
}

export function theStallRuleIn(lines: readonly { text?: string | null; kind?: string | null; closedAt?: Date | string | null }[]): TheStallRule {
  let days: number | null = null;
  let declined = false;
  for (const l of lines) {
    if (l.closedAt) continue;
    if (l.kind && String(l.kind).toUpperCase() !== 'WAY_OF_WORKING') continue;
    const t = String(l.text ?? '').trim();
    if (t === theStallRuleDeclined) { declined = true; continue; }
    const m = A_RULE.exec(t);
    if (m) days = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBERS[m[1].toLowerCase()] ?? null;
  }
  return { days, declined: declined && days == null };
}

export async function theStallRuleOnRecord(prisma: any, groundId: string): Promise<TheStallRule> {
  const lines = ((await Promise.resolve(prisma?.groundContextItem?.findMany?.({ where: { groundId, kind: 'WAY_OF_WORKING' }, select: { text: true, kind: true, closedAt: true } })).catch(() => [])) ?? []) as any[];
  return theStallRuleIn(lines);
}
