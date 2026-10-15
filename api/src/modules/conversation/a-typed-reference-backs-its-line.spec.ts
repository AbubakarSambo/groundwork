import { aTypedReferenceBacksItsLine, proofAlreadyGiven, theReferencesIn } from './a-typed-reference-backs-its-line';
import { howALineIsKnown } from '../reports/how-a-line-is-known';
import { theEndCard } from './the-end-card';

type Row = { type: string; text: string; recallBased?: boolean | null; anchoredDocumentId?: string | null; anchoredOrigin?: string | null; anchoredPassage?: string | null };
/* Night quality run 2, week 4: what Hassan and Amina typed. */
const HASSAN = 'I sold three this week. SJT3J5K7LM to Mr Ondieki, SJT4L6M8NP to Mama Moraa and SJT5N7P9QR to Mr Obare, all in Kisii town.';
const AMINA = 'This week I sent 20 kits to Kisii on Tuesday on delivery note DN-1182, and 12 to Homa Bay on Wednesday on DN-1183.';

describe('proof given counts: a typed reference backs the line it was given for', () => {
  it("reads Hassan's three M-Pesa codes and Amina's delivery notes, and nothing in an ordinary sentence", () => {
    expect(theReferencesIn(HASSAN)).toEqual(['SJT3J5K7LM', 'SJT4L6M8NP', 'SJT5N7P9QR']);
    expect(theReferencesIn(AMINA)).toEqual(['DN-1182', 'DN-1183']);
    expect(theReferencesIn('I visited two shops in Keroka on Monday 2026.')).toEqual([]);
  });

  it("Hassan's three codes back his sale, which no longer reads as from memory", () => {
    const [row] = aTypedReferenceBacksItsLine<Row>([{ type: 'PROGRESS', text: 'I sold three this week.', recallBased: true }], [HASSAN]);
    expect(row.recallBased).toBe(false);
    expect(row.anchoredOrigin).toBe('typed');
    expect(row.anchoredPassage).toBe('SJT3J5K7LM, SJT4L6M8NP, SJT5N7P9QR');
    expect(theReferencesIn(row.anchoredPassage).length).toBe(3);
    expect(howALineIsKnown(row as any)).toBe('proven');
    /* What Hassan reads on his end card: not "You gave this from memory. Nothing written backs it yet." */
    const card = theEndCard([{ type: 'PROGRESS', text: row.text, recallBased: row.recallBased, anchoredDocumentId: null, anchoredOrigin: row.anchoredOrigin } as any], false);
    expect(JSON.stringify(card)).not.toContain('Nothing written backs it yet');
  });

  it('a sale line that carries its own code is backed by that code alone', () => {
    const rows = aTypedReferenceBacksItsLine<Row>(
      [
        { type: 'PROGRESS', text: 'SJT3J5K7LM to Mr Ondieki', recallBased: true },
        { type: 'PROGRESS', text: 'SJT4L6M8NP to Mama Moraa', recallBased: true },
        { type: 'PROGRESS', text: 'SJT5N7P9QR to Mr Obare', recallBased: true },
      ],
      [HASSAN],
    );
    expect(rows.map((r) => r.anchoredPassage)).toEqual(['SJT3J5K7LM', 'SJT4L6M8NP', 'SJT5N7P9QR']);
    expect(rows.filter((r) => howALineIsKnown(r as any) === 'proven').length).toBe(3);
  });

  it("Amina's DN-1182 line is backed", () => {
    const [row] = aTypedReferenceBacksItsLine<Row>([{ type: 'PROGRESS', text: 'Sent 20 kits to Kisii on Tuesday on delivery note DN-1182.', recallBased: true }], [AMINA]);
    expect(row.recallBased).toBe(false);
    expect(row.anchoredPassage).toBe('DN-1182');
  });

  it('a code given in an answer no line came from is kept in the transcript but backs nothing', () => {
    const rows = aTypedReferenceBacksItsLine<Row>([{ type: 'BLOCKER', text: 'The stock from Kisumu arrives late every week.', recallBased: true }], [HASSAN, 'The stock from Kisumu arrives late every week.']);
    expect(rows[0].recallBased).toBe(true);
    expect(rows[0]).not.toHaveProperty('anchoredPassage');
  });

  it('a line a document already backs is left as the document backs it', () => {
    const [row] = aTypedReferenceBacksItsLine<Row>([{ type: 'PROGRESS', text: 'I sold three this week.', recallBased: false, anchoredDocumentId: 'doc-1', anchoredOrigin: 'photo' }], [HASSAN]);
    expect(row.anchoredOrigin).toBe('photo');
  });

  it('the next turn is handed the codes as already given, so it does not ask for them again', () => {
    const block = proofAlreadyGiven(['Yes, I sold some.', HASSAN]);
    expect(block).toContain('already given: SJT3J5K7LM, SJT4L6M8NP, SJT5N7P9QR, for "I sold three this week.');
    expect(block).toMatch(/never ask for these references, or for proof of the lines they back, again/);
    expect(proofAlreadyGiven(['I sold three this week.'])).toBe('');
  });
});
