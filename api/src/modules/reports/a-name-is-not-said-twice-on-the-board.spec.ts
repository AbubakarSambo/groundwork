import { aStoredSentenceReadsRight, everyStoredSentenceReadsRight } from './a-stored-sentence-reads-right';

/** Requests 129 item 6, 133 item 3, 135 item 2: "Amani Wekesa says Amani paid ...", "Aisha says that for refunds, Aisha closes ...". */
const NAMES = ['Aisha Wanjiku', 'Amani Wekesa'];
describe('a name in the sentence about that person, as the lead reads it', () => {
  it.each([
    ['Aisha says that for refunds, Aisha closes the ticket when the instruction is sent, because an old rule said so.', 'Aisha says that for refunds, they close the ticket when the instruction is sent, because an old rule said so.'],
    ['Amani Wekesa says Amani paid 1,200 shillings on Tuesday by M-Pesa.', 'Amani Wekesa says they paid 1,200 shillings on Tuesday by M-Pesa.'],
    ['Amani Wekesa says Amani is growing maize and soya in Kaduna and Kano.', 'Amani Wekesa says they are growing maize and soya in Kaduna and Kano.'],
  ])('%s', (said, right) => {
    expect(aStoredSentenceReadsRight(said, NAMES)).toBe(right);
  });
  it('does not touch a quotation, or a sentence about two people', () => {
    expect(aStoredSentenceReadsRight('Aisha Wanjiku said, "Aisha closes it."', NAMES)).toBe('Aisha Wanjiku said, "Aisha closes it."');
    expect(aStoredSentenceReadsRight('Amani Wekesa says Aisha paid 1,200 shillings.', NAMES)).toBe('Amani Wekesa says Aisha paid 1,200 shillings.');
  });
  it('is applied to everything the board sends', () => {
    const b = everyStoredSentenceReadsRight({ eachPersonToday: [{ line: 'Amani Wekesa says Amani is growing maize.' }] }, NAMES);
    expect(b.eachPersonToday[0].line).toBe('Amani Wekesa says they are growing maize.');
  });
});
