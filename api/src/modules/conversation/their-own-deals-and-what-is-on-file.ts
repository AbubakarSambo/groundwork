import { numbersWithUnits, onASalesCheckInRead } from './what-does-not-add-up';
import { aLineNamesTheCustomer } from '../board/one-deal-per-customer';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * THEIR OWN DEALS, THE FIGURES THEY GAVE FOR EACH, AND WHAT IS ON FILE (engine test, second run, Drop Access, Joseph).
 *
 * Joseph said on Monday 12 October "That 10-unit deal for Mama Pima is definitely part of my 30-unit target. It's basically closed.",
 * and on Tuesday "Mama Pima is 15 units now, she's expanding." The check-in answered "Fifteen units for Mama Pima is a real
 * expansion." On Wednesday he said "Mama Pima paid a deposit." and "She'll send the M-Pesa later.", and nothing more was asked; on
 * Friday "I'm still on track for my target." passed too. The model had never been told what he had said of the deal before, or that
 * nothing was on file for it.
 *
 * So the conversation is given the facts, as facts, and the model decides what to ask: for each of the person's own deals on record,
 * its stage, the units they gave for it and the day they gave each, and what is on file for it (a payment record, a signed order, a
 * document that shows neither, or nothing written), with their own target and how much of it the record shows paid. Nothing here is
 * a sentence sent to them. Only on a sales check-in with Release 1's switch on (where the customers on record are read), and only
 * their own deals: never another person's.
 */

export interface AnOwnDeal {
  name: string;
  stage: string | null;
  ownerParticipantId: string | null;
  paid?: boolean;
  signed?: boolean;
  proven?: boolean;
  dropped?: unknown;
  fields?: Record<string, string> | null;
}

export interface ALineOfTheirs { text: string; createdAt: Date | string; participantId: string | null }

/* "wants 5 units, not 4", "it's actually 5": a figure they put right themselves. */
const THEY_PUT_IT_RIGHT = /\bnot\s+\d+\b|\bactually\b|\bcorrect(?:ed|ion)?\b|\bI (?:said|meant)\b/i;

/**
 * The units they gave for one deal, in the order they gave them, each with its day; the same figure said again is said once. Read
 * sentence by sentence, and only from a sentence that names this customer and no other one of theirs: "I'm closing Juja Hardware and
 * Mama Pima. That's 35 units." is two deals, and 35 is neither's.
 */
export function theUnitsTheyGave(deal: { name: string }, lines: readonly ALineOfTheirs[], zone: string | null, others: readonly string[] = []): { units: number; on: string; putRight: boolean }[] {
  const out: { units: number; on: string; putRight: boolean }[] = [];
  const sorted = [...lines].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const l of sorted) {
    for (const sentence of String(l.text ?? '').split(/(?<=[.!?])\s+/)) {
      if (!aLineNamesTheCustomer(sentence, deal.name)) continue;
      if (others.some((o) => o !== deal.name && aLineNamesTheCustomer(sentence, o))) continue;
      const n = numbersWithUnits(onASalesCheckInRead(sentence)).filter((x) => x.unit === 'unit');
      if (n.length !== 1) continue;
      const putRight = THEY_PUT_IT_RIGHT.test(sentence);
      if (out.length && out[out.length - 1].units === n[0].value) { if (putRight) out[out.length - 1].putRight = true; continue; }
      out.push({ units: n[0].value, on: whenItWas(l.createdAt, 'weekdayAndDay', zone ?? undefined), putRight });
    }
  }
  return out;
}

const onFile = (d: AnOwnDeal): string => {
  if (d.paid) return 'a payment record for it is on file';
  if (d.signed) return 'a signed order for it is on file, and no payment record yet';
  if (d.proven) return 'a document backs it, but it shows no payment and no signed order';
  return 'nothing written is on file for it, only what they said';
};

/** The block the conversation reads. Empty where they have no deal on record. */
export function theirOwnDealsAndWhatIsOnFile(
  deals: readonly AnOwnDeal[],
  lines: readonly ALineOfTheirs[],
  participantId: string,
  zone: string | null,
  target: { target: number; paidUnits: number } | null = null,
): string {
  const mine = deals.filter((d) => d.ownerParticipantId === participantId && !d.dropped);
  if (!mine.length) return '';
  const theirs = lines.filter((l) => l.participantId === participantId);
  const names = mine.map((d) => d.name);
  const rows = mine.map((d) => {
    const said = theUnitsTheyGave(d, theirs, zone, names);
    const putRight = said.length > 1 && said[said.length - 1].putRight ? ' They put the figure right themselves, so the latest one stands and is not asked about again.' : '';
    const units = said.length ? ` Units they gave for it: ${said.map((s) => `${s.units} on ${s.on}`).join(', then ')}.${putRight}` : '';
    return `  ${d.name}, at ${d.stage?.trim() || 'no stage yet'}: ${onFile(d)}.${units}`;
  });
  const aim = target ? [`  Their own target is ${target.target} units. The record shows ${target.paidUnits} of them sold with a payment record.`] : [];
  return [
    'THEIR OWN DEALS ON RECORD, and what is on file for each. Facts from the record, never read out as a list. Where they now say a deal is paid, signed, bigger or on track and the record above does not show it, ask for what would show it, and put an earlier figure beside a new one; never praise a figure the record does not hold.',
    ...rows,
    ...aim,
  ].join('\n');
}
