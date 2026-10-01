import { AMINA, BARAKA, JUMA, RUKIA, boardAs, handoff, type Setup } from './the-switchboards-sections-harness';

/**
 * A QUOTATION MARK ON THE BOARD'S RISKS AND BLOCKER CHECK IS ONLY AROUND THE PERSON'S EXACT WORDS.
 * What was tried, and when it is due, are quoted only where found character for character in what that
 * person typed in the check-in they raised it in. Otherwise they are said plainly, with no marks.
 */
const TYPED = 'I escalated to the head of credit, Mr. Adebayo, on the 10th of May. He has not replied.';
const record = (tried: string | null, due: string | null): Setup => ({
  dependencies: [handoff('d-1', 'p-rukia', 'the credit terms', { onLabel: 'Finance', triedSaid: tried, dueSaid: due, sourceCheckInId: 'c1-p-rukia' })],
  turns: [
    { checkInId: 'c1-p-rukia', content: TYPED },
    { checkInId: 'c1-p-rukia', content: "I've chased the committee four times in writing" },
    { checkInId: 'c1-p-rukia', content: 'It should be by Friday' },
  ],
});
const because = (b: any) => b.risks[0].because as string;
const checks = (b: any) => (b.blockerCheck[0].checks as string[]).join(' ');
const readers = [['Amina', AMINA], ['Rukia', RUKIA], ['Baraka', BARAKA], ['Juma', JUMA]] as const;

describe('the board quotes only exact words, as each reader reads it', () => {
  it.each(readers)('%s: an exact quote stays quoted', async (_n, who) => {
    const b = await boardAs(record("I've chased the committee four times in writing", 'by Friday'), who[0], who[1]);
    for (const text of [because(b), checks(b)]) {
      expect(text).toContain('"I\'ve chased the committee four times in writing"');
      expect(text).toContain('The time given for it was "by Friday".');
    }
  });

  it.each(readers)('%s: a tidied version loses its quotation marks and is not called exact words', async (_n, who) => {
    const b = await boardAs(record('I have chased the committee four times in writing.', 'on Friday'), who[0], who[1]);
    for (const text of [because(b), checks(b)]) {
      expect(text).not.toContain('"');
      expect(text).toMatch(/though these are not (their|your) exact words\. I have chased the committee four times in writing\./);
      expect(text).toContain('The time given for it was on Friday.');
    }
  });

  it.each(readers)('%s: two sayings joined into one lose their quotation marks', async (_n, who) => {
    const b = await boardAs(record("I have chased the committee four times in writing. I escalated it to the Head of Credit, but he did not reply.", null), who[0], who[1]);
    for (const text of [because(b), checks(b)]) {
      expect(text).not.toContain('"');
      expect(text).toContain('Head of Credit, but he did not reply.');
    }
  });

  it('the quote is the person\'s own passage, with their own capitals and marks', async () => {
    const b = await boardAs(record('i escalated to the head of credit, mr. adebayo, on the 10th of may', null), ...AMINA);
    expect(because(b)).toContain('said, "I escalated to the head of credit, Mr. Adebayo, on the 10th of May".');
  });

  it('says it to the person themself as "You", and never quotes words typed in somebody else\'s check-in', async () => {
    const rec = record("I've chased the committee four times in writing", null);
    rec.turns = rec.turns!.map((t) => ({ ...t, checkInId: 'c1-p-baraka' }));
    const b = await boardAs(rec, ...RUKIA);
    expect(because(b)).toContain('You have said what has been tried, though these are not your exact words.');
    expect(because(b)).not.toContain('"');
  });
});
