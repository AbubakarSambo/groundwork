import { anUnansweredAsk, type ADealsLine } from './what-a-deal-still-needs';

/**
 * WHAT TO COACH EACH REP THIS WEEK, ONE LINE ABOUT THE WORK (Hafsah's quality pass, 18 October, Q6). Grace asked what to coach each
 * rep this week, and the board said nothing. From each person's own deals and waits only, about the work and never a label on the
 * person, at most two sentences, to whoever runs the check-in:
 *  - quotes given before the budget was asked: "Quoted Ngong Road Minimart and Savannah Cafe before asking the budget.";
 *  - a deal that waits only on a colleague: "Tuskys Westgate waits on Joseph's samples.";
 *  - a quote with nothing booked: "Mama Mboga Mart has a quote and nothing booked.";
 *  - a customer's ask nobody has answered: "Wanjiru's discount has had no answer since 12 October.";
 *  - no buying date on any open deal: "No buying date is on record for any of Joseph's open deals."
 */
export interface ADealToCoach {
  name: string;
  ownerParticipantId: string | null;
  stage: string | null;
  fields: Record<string, string> | null;
  buyingDate?: string | null;
  criteria?: { criterion: string; met: boolean }[];
  lost?: unknown;
}

const listed = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const aLagosDay = (at: Date | string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(new Date(at));

export function whatToCoachThisWeek(
  participantId: string,
  first: string,
  deals: readonly ADealToCoach[],
  waits: readonly { fromParticipantId: string | null; onParticipantId: string | null; what: string | null; status: string; clearedAt?: Date | string | null }[],
  lines: readonly ADealsLine[],
  firstName: (pid: string | null) => string | null,
): string | null {
  const theirs = deals.filter((d) => d.ownerParticipantId === participantId && !d.lost);
  const open = theirs.filter((d) => !/^won$/i.test(String(d.stage ?? '')));
  const out: string[] = [];
  const quotedFirst = open.filter((d) => String(d.fields?.Quoted ?? '').trim() && (d.criteria ?? []).some((c) => c.criterion === 'budget' && !c.met));
  if (quotedFirst.length >= 2) out.push(`Quoted ${listed(quotedFirst.map((d) => d.name))} before asking the budget.`);
  for (const d of open) {
    if (out.length >= 2) break;
    const w = waits.find((x) => x.fromParticipantId === participantId && x.onParticipantId && x.onParticipantId !== participantId
      && String(x.status).toUpperCase() !== 'CLEARED' && !x.clearedAt && String(x.what ?? '').toLowerCase().includes(d.name.toLowerCase()));
    if (w) {
      const thing = String(w.what ?? '').replace(/^(?:the|a|an|some)\s+/i, '').replace(new RegExp(`\\s+for\\s+${d.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '');
      out.push(`${d.name} waits on ${firstName(w.onParticipantId) ?? 'a colleague'}'s ${thing}.`);
    }
  }
  for (const d of open) {
    if (out.length >= 2) break;
    const ask = anUnansweredAsk({ name: d.name, ownerParticipantId: d.ownerParticipantId, fields: d.fields }, lines);
    const contact = String(d.fields?.Contact ?? '').trim();
    if (ask) out.push(`${contact ? `${contact}'s` : `${d.name}'s`} discount has had no answer since ${aLagosDay(ask.on)}.`);
  }
  for (const d of open) {
    if (out.length >= 2) break;
    if (String(d.fields?.Quoted ?? '').trim() && !d.buyingDate && !String(d.fields?.['Next step'] ?? '').trim() && !(quotedFirst.length >= 2 && quotedFirst.includes(d))) out.push(`${d.name} has a quote and nothing booked.`);
  }
  if (out.length < 2 && open.length >= 2 && open.every((d) => !d.buyingDate)) out.push(`No buying date is on record for any of ${first}'s open deals.`);
  return out.length ? out.slice(0, 2).join(' ') : null;
}
