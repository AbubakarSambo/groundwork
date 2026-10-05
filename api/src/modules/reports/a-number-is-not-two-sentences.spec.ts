import { aStoredSentenceReadsRight } from './a-stored-sentence-reads-right';

/**
 * "RECEIVING 0. 5% FOR TWO YEARS" (run 32, the advisor report, lead and participant both).
 *
 * The model put a space inside a decimal, and every sentence splitter in the product then did the
 * only thing it could with it. Two broken lines, the second starting lower case because it is the
 * middle of a number: "...is 'receiving 0." and "5% for two years'."
 *
 * A digit, a full stop, a space and a digit is never two sentences.
 */
describe('a number is not two sentences', () => {
  it('closes the decimal the model split', () => {
    expect(aStoredSentenceReadsRight('You said Peter Kimani is receiving 0. 5% for two years.'))
      .toContain('receiving 0.5% for two years');
  });

  it('works on a percentage of any size', () => {
    expect(aStoredSentenceReadsRight('Late deliveries are at 19. 4% this quarter.')).toContain('19.4%');
  });

  /*
   * THE CASE THAT NARROWED THE RULE. My first version was "a digit, a full stop, a space, a
   * digit", and this test caught it joining a real sentence boundary. There is no telling those
   * apart from the digits alone, so the rule asks for a per cent sign and nothing else does.
   */
  it('leaves a real sentence boundary alone, even with a number on each side', () => {
    const two = 'The target is 40. 12 shops have ordered.';
    expect(aStoredSentenceReadsRight(two)).toContain('40. 12 shops');
  });

  it('and leaves a decimal with no per cent sign alone, because it cannot be told from a boundary', () => {
    const unsure = 'The target is 1. 5 million by March.';
    expect(aStoredSentenceReadsRight(unsure)).toContain('1. 5 million');
  });
});

/**
 * AND THE TITLE FIX IS NOT HERE, DELIBERATELY. Run 32 also showed "Ngozi Eze is waiting on Mr." -
 * cut off at the title. Dropping the stop would stop any splitter breaking there and is British
 * style, and it made three board tests red: they pin "...waiting on Mr. Adebayo for a date for
 * the credit decision", which is correct English. A change that rewrites three correct sentences
 * to repair one broken one is not a fix. It belongs where the splitting happens, or in task 1.6's
 * check of the rendered line.
 */
describe('a decimal repair never touches what somebody said', () => {
  it('leaves a quotation exactly as it was written', () => {
    const quoted = 'Ngozi said "we are at 0. 5% this month" in her check-in.';
    expect(aStoredSentenceReadsRight(quoted)).toContain('"we are at 0. 5% this month"');
  });
});
