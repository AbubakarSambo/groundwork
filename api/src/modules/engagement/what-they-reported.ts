/**
 * WHAT SOMEBODY REPORTED IN THE CHECK-IN THEY HAVE JUST FINISHED, FOR THE LEAD'S "<NAME> HAS CHECKED IN" EMAIL (direct morning, part 4).
 *
 * With the direct morning on, Grace is not told only that Kevin checked in: she is told what he reported, the customers, the units and
 * the money, and his next step, in the same words her board already shows her. Only what the person running the check-in may already
 * read on her board is said: the deals and fee notes the person owns that changed during this check-in, and the next step they gave.
 * Nothing private (no question to Ask, nobody's own report, no judgement), and nothing is worded by a model.
 *
 * Read from the record as it stands when the check-in closes. Nothing is written.
 */
const clean = (v: unknown): string => String(v ?? '').replace(/\s+/g, ' ').trim();
const MAX = 4;
/** A check-in's words are kept a few minutes after it closes (the record is written as it ends). */
const AFTER = 15 * 60 * 1000;

const valueOf = (f: Record<string, unknown>): string | null => {
  for (const [k, v] of Object.entries(f)) if (/^(?:deal\s+)?(?:value|amount|worth|size)$/i.test(k.trim()) && clean(v)) return clean(v);
  return null;
};
const unitsOf = (f: Record<string, unknown>): string | null => {
  const u = clean(f.Units ?? f.units);
  return /^\d+$/.test(u) ? u : null;
};
const unitsSaid = (u: string) => `${u} ${u === '1' ? 'unit' : 'units'}`;

/** One deal, said as a sentence. */
export function aDealSaid(item: { name: string; stage?: string | null; fields?: Record<string, unknown> | null }, firstName: string): string {
  const f = (item.fields ?? {}) as Record<string, unknown>;
  const name = clean(item.name);
  const stage = clean(item.stage).toLowerCase();
  const units = unitsOf(f);
  const value = valueOf(f);
  const forUnits = units ? ` for ${unitsSaid(units)}` : '';
  let s: string;
  if (stage === 'won') s = units ? `${name} bought ${unitsSaid(units)}` : `${name} bought`;
  else if (stage === 'lost') s = `${name} said no`;
  else if (stage === 'quoted') s = `${name} has a quote${forUnits}`;
  else if (stage === 'pitched') s = `${name} has been pitched${forUnits}`;
  else if (stage === 'contacted') s = `${name} has been contacted${units ? ` about ${unitsSaid(units)}` : ''}`;
  else if (stage) s = `${name} is at the ${stage} stage${forUnits}`;
  else s = `${firstName} spoke about ${name}${forUnits}`;
  s += value ? `, and the value ${firstName} gave is ${value}.` : '.';
  const next = clean(f['Next step']).replace(/[.\s]+$/, '');
  if (next && stage !== 'lost') s += ` The next step is "${next}".`;
  return s;
}

/** One fee note, said as a sentence. */
export function aFeeNoteSaid(item: { name: string; stage?: string | null; fields?: Record<string, unknown> | null }): string | null {
  const f = (item.fields ?? {}) as Record<string, unknown>;
  const number = clean(f.Number) || clean(item.name);
  if (!/^[A-Z]{1,4}-?\d+/.test(number)) return null;
  const client = clean(f.Client);
  const amount = valueOf(f);
  const stage = clean(item.stage).toLowerCase();
  const who = `Fee note ${number}${client ? ` for ${client}` : ''}${amount ? `, for ${amount},` : ''}`;
  const next = clean(f['Next step']).replace(/[.\s]+$/, '');
  return `${who} ${stage ? `is ${stage}` : 'was spoken about'}.${next ? ` The next step is "${next}".` : ''}`;
}

export async function whatTheyReported(
  prisma: any,
  about: { groundId: string; participantId: string; checkInId?: string | null },
  firstName: string,
): Promise<string[]> {
  try {
    const ci = about.checkInId ? await Promise.resolve(prisma?.checkIn?.findUnique?.({ where: { id: about.checkInId } })).catch(() => null) : null;
    if (!ci) return [];
    const from = new Date(ci.availableFrom ?? ci.createdAt).getTime();
    const to = new Date(ci.completedAt ?? Date.now()).getTime() + AFTER;
    const within = (d: unknown) => { const t = d ? new Date(d as any).getTime() : NaN; return t >= from && t <= to; };
    const items: any[] = (await Promise.resolve(prisma?.workItem?.findMany?.({ where: { groundId: about.groundId, ownerParticipantId: about.participantId } })).catch(() => [])) ?? [];
    const changed = items.filter((i) => i?.ownerParticipantId === about.participantId && within(i.updatedAt));
    const lines: string[] = [];
    for (const i of changed) {
      if (lines.length >= MAX) break;
      if (i.kind === 'deal') lines.push(aDealSaid(i, firstName));
      else if (i.kind === 'bill') { const l = aFeeNoteSaid(i); if (l) lines.push(l); }
    }
    if (lines.length) return lines;
    /* Nothing of that kind changed: the next thing they said they would do in this check-in, in their words. */
    const promises: any[] = (await Promise.resolve(prisma?.personObjective?.findMany?.({ where: { groundId: about.groundId, participantId: about.participantId } })).catch(() => [])) ?? [];
    const next = promises.filter((o) => o?.participantId === about.participantId && o?.kind === 'TODO' && within(o.createdAt)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
    const text = clean(next?.text).replace(/[.\s]+$/, '');
    return text ? [`${firstName} said "${text}".`] : [];
  } catch {
    return [];
  }
}
