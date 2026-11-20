/**
 * A DETAIL OF A DEAL OR A WORK ITEM, SAID AS A PLAIN SENTENCE (fix plan 16 November, group 10; boards pass 4, defect 4).
 *
 * The board drew every detail as "The <label> is <value>.", which read "The units is 6.", "The quoted is KES 30,000." and "The next step by
 * is Friday." The labels are the fixed ones the record keeps (the kind of work's own detail labels), so each of those has its own sentence;
 * any other label is said as "The <label> is <value>." or, where the label is plural, "The <label> are <value>.". This is the one owner:
 * the row and the "That is not right" line both read it.
 */
const clean = (v: string) => v.trim().replace(/[.\s]+$/, '');
const hasWords = (v: string) => /[a-z]/i.test(v);

const SENTENCES: Record<string, (v: string) => string> = {
  units: (v) => (hasWords(v) ? `It is for ${v}.` : `It is for ${v} ${v === '1' ? 'unit' : 'units'}.`),
  value: (v) => `It is worth ${v}.`,
  'price each': (v) => `The price is ${v} each.`,
  contact: (v) => `The contact is ${v}.`,
  'next step': (v) => `The next step is ${v}.`,
  'buying date': (v) => `The customer will buy on ${v}.`,
  need: (v) => `The customer needs ${v}.`,
  'budget stated': (v) => `The customer's budget is ${v}.`,
  'decision maker': (v) => `The decision is made by ${v}.`,
  quoted: (v) => `The quote was ${v}.`,
  'quote accepted': (v) => (/^(yes|true)$/i.test(v) ? 'The customer accepted the quote.' : `The customer accepted the quote ${v}.`),
};

/** Every detail as a sentence, in order. "Next step by" joins the next step's sentence, or stands as "It is due by ...". */
export function theDetailsAsSentences(entries: [string, string][]): string[] {
  const by = entries.find(([l]) => l.trim().toLowerCase() === 'next step by');
  const out: string[] = [];
  for (const [label, raw] of entries) {
    const key = label.trim().toLowerCase();
    const value = clean(String(raw ?? ''));
    if (!value || key === 'next step by') continue;
    if (key === 'next step') {
      const when = by ? clean(String(by[1] ?? '')) : '';
      out.push(when ? `The next step is ${value}, by ${when}.` : `The next step is ${value}.`);
      continue;
    }
    const make = SENTENCES[key];
    if (make) { out.push(make(value)); continue; }
    const noun = label.trim().toLowerCase();
    out.push(`The ${noun} ${noun.endsWith('s') ? 'are' : 'is'} ${value}.`);
  }
  const alone = by && !entries.some(([l]) => l.trim().toLowerCase() === 'next step') ? clean(String(by[1] ?? '')) : '';
  if (alone) out.push(`The next step is due by ${alone}.`);
  return out;
}
