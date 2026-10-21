import type { ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';
import { aLineIsAbout } from '../board/a-deals-value-and-buying-date';
import { aPromiseSomebodyElseMade } from '../conversation/a-promise-somebody-else-made';
import { aDayKey, aDayInWords } from './a-sales-report-read-from-the-deals';
import { theUnitsOf, whatTheyPay, type ADayMove, type AWaitOnTheDay } from './the-sales-team-report-from-the-record';

/**
 * A PERSON'S OWN REPORT ON A SALES CHECK-IN, READ FROM THE RECORD (Hafsah's quality pass of 18 October, section 5, O-1 to O-6; behind
 * Release 1's switch; the kit's B4-reports-and-sharing/own-report.txt). Served to the person alone, from their own deals and lines.
 *
 * Mercy's report for 14 October pasted her own words with "yesterday" under What you did well, put Greenfield's promise there too,
 * said "I will ask you how it went", kept "I expect Joseph to deliver." as if it were news, listed the quote and who decides as two
 * lines, and had no story. The kit says what she did, in the second person: "You added a photo of the Green Mart quote. It counts as
 * proof." and "You’ll visit Westgate Deli on Friday."
 */

export interface AnOwnLine { text: string; how: string | null; mark: 'proven' | 'said' }
export interface YourOwnReport { didWell: AnOwnLine[]; story: string | null; toldUs: AnOwnLine[] }

interface ALine { id: string; text: string; raw: string; type: string | null; createdAt: Date; anchoredDocumentId: string | null }

const field = (d: { fields?: Record<string, string> | null }, k: string) => String(d.fields?.[k] ?? '').trim();
const units = (n: number | null) => (n === null ? '' : `${n} ${n === 1 ? 'unit' : 'units'}`);
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const stop = (s: string) => String(s ?? '').trim().replace(/[.\s]+$/, '');
const won = (d: ADealOnRecord, last: string) => String(d.stage ?? '').toLowerCase() === last.toLowerCase() && !d.dropped;

/** A hope or an expectation about somebody else, which is neither news nor a promise: "I expect Joseph to deliver." */
const ONLY_AN_EXPECTATION = /^\s*I\s+(?:expect|hope|think|believe|trust)\b/i;

/** "I'll call Joseph again on Thursday morning." reads "You’ll call Joseph again on Thursday morning." */
export function asYourPromise(words: string): string {
  const s = stop(words).replace(/\[INFERRED:[^\]]*\]/g, '').trim()
    .replace(/\bI['’]ll\b/g, 'you’ll').replace(/\bI['’]m\b/g, 'you’re').replace(/\bI am\b/g, 'you are').replace(/\bI\b/g, 'you')
    .replace(/\bmy\b/g, 'your').replace(/\bme\b/g, 'you');
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}

export function yourOwnReport(input: {
  /** Their own lines from this session's check-in, as people read them (`text`) and as kept (`raw`). */
  lines: readonly ALine[];
  /** Their own deals. */
  deals: readonly ADealOnRecord[];
  /** What moved on their deals that day. */
  moves: readonly ADayMove[];
  /** The documents they added, with the day each was added. */
  documents: readonly { id: string; createdAt: Date | string }[];
  waits: readonly AWaitOnTheDay[];
  me: string;
  firstName: (pid: string | null) => string | null;
  /** Their own target, where the lead set one ("40 units"). */
  target: { amount: number; unit: string } | null;
  lastStage: string;
  zone: string;
  /** Their words with who "him" is. */
  named: (l: ALine) => string;
}): YourOwnReport {
  const used = new Set<string>();
  const didWell: AnOwnLine[] = [];
  const toldUs: AnOwnLine[] = [];
  const theirWon = input.deals.filter((d) => won(d, input.lastStage));

  /* What you did well (O-1): a sale with a document you added behind it, said once, in the second person. */
  for (const d of theirWon) {
    const backing = input.lines.filter((l) => !!l.anchoredDocumentId && (aLineIsAbout(l.raw, d) || l.raw.toLowerCase().includes(d.name.split(/\s+/)[0].toLowerCase())));
    const docId = backing.map((l) => l.anchoredDocumentId).find((id) => input.documents.some((x) => x.id === id));
    if (!docId || !(d.signed || d.paid)) continue;
    const doc = input.documents.find((x) => x.id === docId)!;
    const n = theUnitsOf(d);
    const value = field(d, 'Value');
    const what = d.paid ? 'payment' : 'signed order';
    didWell.push({
      text: `You got ${d.name}’s ${what}${n !== null ? ` for ${units(n)}` : ''}${value ? `, ${value}` : ''}, on ${aDayInWords(aDayKey(new Date(doc.createdAt), input.zone))}, and you added it. It counts as proof.`,
      how: null,
      mark: 'proven',
    });
    for (const l of backing) used.add(l.id);
  }

  /* What you told us (O-5): what moved on your deals that day, each said once: a yes, a quote with who decides, a need. */
  for (const m of [...input.moves].sort((a, b) => Number(!!b.accepted) - Number(!!a.accepted))) {
    const d = input.deals.find((x) => x.id === m.dealId);
    if (!d) continue;
    const contact = field(d, 'Contact');
    const quoted = field(d, 'Quoted');
    const n = theUnitsOf(d);
    if (!contact || n === null) continue;
    const decides = field(d, 'Decision maker').toLowerCase().startsWith(contact.toLowerCase());
    if (m.accepted) {
      const pays = whatTheyPay(d, input.waits);
      toldUs.push({ text: `${contact} at ${d.name} said yes to ${units(n)}${quoted ? ` at ${quoted}` : ''}${pays ? `, and ${contact} pays ${pays}` : ''}.`, how: `You said this. A message from ${contact} would prove it.`, mark: 'said' });
    } else if (/quot/i.test(m.to) && quoted) {
      toldUs.push({ text: `You quoted ${contact} at ${d.name} ${quoted} for ${units(n)}${decides ? `, and ${contact} decides` : ''}.`, how: 'You said this. A copy of the quote would prove it.', mark: 'said' });
    } else if (/need/i.test(m.to)) {
      const each = field(d, 'Price each');
      toldUs.push({ text: `${contact} at ${d.name} wants ${units(n)}${each ? ` if they are ${each} each` : ''}.`, how: 'You said this.', mark: 'said' });
    } else continue;
    for (const l of input.lines) {
      if (String(l.type ?? '').toUpperCase() === 'COMMITMENT' && !aPromiseSomebodyElseMade(l.text)) continue;
      if (aLineIsAbout(l.raw, d) || new RegExp(`\\b${contact}\\b`).test(l.raw)) used.add(l.id);
    }
  }

  /* A customer's promise (O-2) is what you told us about their deal, never something you did well. */
  for (const l of input.lines) {
    if (used.has(l.id) || !aPromiseSomebodyElseMade(l.text)) continue;
    const d = theirWon.find((x) => String((x as any).paysWhen ?? '').trim() && (aLineIsAbout(l.raw, x) || field(x, 'Next step') === l.text.trim()))
      ?? input.deals.find((x) => aLineIsAbout(l.raw, x) || field(x, 'Next step') === l.text.trim());
    if (!d) continue;
    const pays = String((d as any).paysWhen ?? '').trim();
    const contact = field(d, 'Contact').replace(/\.(?=\s)/g, '');
    const onDelivery = /^pays on delivery on (.+)$/i.exec(pays);
    const text = onDelivery ? `${d.name} takes delivery on ${onDelivery[1]} and pays then.` : pays ? `${d.name} ${pays}.` : null;
    if (!text) continue;
    toldUs.push({ text, how: `You said this. A message from ${contact || d.name} would prove it.`, mark: 'said' });
    used.add(l.id);
  }

  /* Your own promises (O-3), in the second person, and no expectation about somebody else (O-4). */
  for (const l of input.lines) {
    if (used.has(l.id)) continue;
    if (ONLY_AN_EXPECTATION.test(l.text)) { used.add(l.id); continue; }
    if (String(l.type ?? '').toUpperCase() !== 'COMMITMENT') continue;
    toldUs.push({ text: asYourPromise(input.named(l)), how: null, mark: 'said' });
    used.add(l.id);
  }
  /* Anything else you said that happened, in your own words, so nothing is lost. */
  for (const l of input.lines) {
    if (used.has(l.id) || String(l.type ?? '').toUpperCase() !== 'PROGRESS') continue;
    toldUs.push({ text: /[.!?]$/.test(l.text.trim()) ? l.text.trim() : `${l.text.trim()}.`, how: l.anchoredDocumentId ? 'A document you added backs this.' : 'You said this.', mark: l.anchoredDocumentId ? 'proven' : 'said' });
    used.add(l.id);
  }

  /* The story (O-6): where your sales stand against your target, and what waits on somebody else. */
  const sentences: string[] = [];
  if (theirWon.length && input.target) {
    const first = [...theirWon].sort((a, b) => a.firstOnRecordAt.getTime() - b.firstOnRecordAt.getTime());
    const sold = theirWon.reduce((n, d) => n + (theUnitsOf(d) ?? 0), 0);
    const latest = first[first.length - 1];
    sentences.push(`${latest.name} is your ${ORDINALS[first.length - 1] ?? `number ${first.length}`} sale, ${sold} of your ${input.target.amount} ${input.target.unit}.`);
  }
  for (const d of input.deals.filter((x) => !won(x, input.lastStage) && !x.dropped)) {
    const w = input.waits.find((x) => x.fromParticipantId === input.me && x.onParticipantId && x.onParticipantId !== input.me && !x.clearedAt
      && String(x.what ?? '').toLowerCase().includes(d.name.toLowerCase()));
    if (!w) continue;
    const thing = stop(String(w.what ?? '')).replace(/^(?:the|a|an|some)\s+/i, '').replace(new RegExp(`\\s+for\\s+${d.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '');
    sentences.push(`${d.name} is still waiting on ${input.firstName(w.onParticipantId) ?? 'a colleague'}’s ${thing}.`);
    break;
  }
  return { didWell, story: sentences.length ? sentences.join(' ') : null, toldUs };
}
