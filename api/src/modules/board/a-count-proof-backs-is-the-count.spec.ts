import { whatToDoWithTheRead, theNumberItProves, howMuchIsProven, type ALineOnRecord } from './what-the-record-says-a-number-is';
import { aTypedReferenceBacksItsLine } from '../conversation/a-typed-reference-backs-its-line';

/*
 * Proof given counts (Hafsah, 12 October). Night run 2, week 4: Hassan typed three M-Pesa codes for three
 * sales, and the lead's board read "Hassan Mwenda has none of their 8 kits yet." A participant's own
 * number is offered to the lead to accept; a number proof backs is the count.
 */
const HASSAN = 'I sold three this week. SJT3J5K7LM to Mr Ondieki, SJT4L6M8NP to Mama Moraa and SJT5N7P9QR to Mr Obare, all in Kisii town.';
const hisKits = { id: 'o-hassan', name: 'kits', target: 8, count: 0, prevCount: 0, ownerParticipantId: 'p-hassan' } as any;

function aLine(text: string, typed: string): ALineOnRecord {
  const [row] = aTypedReferenceBacksItsLine<{ text: string; recallBased?: boolean | null; anchoredOrigin?: string | null; anchoredPassage?: string | null }>([{ text, recallBased: true }], [typed]);
  return { text, who: 'p-hassan', saidByTheLead: false, kind: 'PROGRESS', proven: howMuchIsProven(row) };
}

describe('a count proof backs is the count on the board', () => {
  it("Hassan's three coded sales land as 3 of his 8", () => {
    const line = aLine('I sold three this week.', HASSAN);
    const read = { objectiveId: 'o-hassan', count: 3, said: 'I sold three this week.' };
    expect(line.proven).toBe(3);
    expect(whatToDoWithTheRead(read, hisKits, [line])).toBe('land');
    expect(theNumberItProves(read, line)).toBe(3);
  });

  it('one code for a claim of three lands as 1, the number the proof holds', () => {
    const line = aLine('I sold three this week.', 'I sold three this week. SJT3J5K7LM to Mr Ondieki.');
    expect(theNumberItProves({ count: 3 }, line)).toBe(1);
  });

  it('his word alone is still offered to the lead, not counted', () => {
    const line = aLine('I sold three this week.', 'I sold three this week.');
    expect(line.proven).toBeNull();
    expect(whatToDoWithTheRead({ objectiveId: 'o-hassan', count: 3, said: 'I sold three this week.' }, hisKits, [line])).toBe('offer');
  });

  it('a line his own document backs counts in full', () => {
    expect(howMuchIsProven({ recallBased: false, anchoredDocumentId: 'd1', anchoredOrigin: 'photo' })).toBe(Infinity);
    expect(howMuchIsProven({ recallBased: false, anchoredDocumentId: 'd1', anchoredOrigin: 'generated' })).toBeNull();
  });
});
