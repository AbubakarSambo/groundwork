import { sentencesIn } from './where-a-sentence-actually-ends';

describe('where a sentence actually ends', () => {
  it('ends a sentence that closes with a quotation mark', () => {
    /* Fault 1, live: the mark stayed glued to the quotation and the stripper never saw it alone. */
    const s = sentencesIn('"Pipeline is strong, I should hit my number." That\'s a good start. To make sure your record is clear.');
    expect(s).toHaveLength(3);
    expect(s[1]).toBe("That's a good start.");
  });

  it('does not split a decimal in half', () => {
    /* Fault 2, live: "0.5 years" split after "0." and the halves were then dropped. */
    const s = sentencesIn('Tenure: 6 months (approx. 0.5 years). Weighted score: 6.5 for this period.');
    expect(s).toHaveLength(2);
    expect(s[0]).toContain('0.5 years');
    expect(s[1]).toContain('6.5');
  });

  it('keeps a bracket with the sentence it closes', () => {
    const s = sentencesIn('It is tracked (OPS-902.) Then it ships.');
    expect(s[0]).toBe('It is tracked (OPS-902.)');
  });

  it('does not end a sentence on a common abbreviation', () => {
    expect(sentencesIn('About 11 months (approx. 0.9 years) so far.')).toHaveLength(1);
    expect(sentencesIn('Ask Dr. Okoro about it.')).toHaveLength(1);
  });

  it('still splits ordinary prose the obvious way', () => {
    expect(sentencesIn('One thing happened. Then another! And a third?')).toEqual([
      'One thing happened.', 'Then another!', 'And a third?',
    ]);
  });

  it('keeps a trailing fragment that never got its full stop', () => {
    expect(sentencesIn('It is done. And this one trails off')).toEqual(['It is done.', 'And this one trails off']);
  });

  it('says nothing about nothing', () => {
    expect(sentencesIn('')).toEqual([]);
    expect(sentencesIn('   ')).toEqual([]);
  });
});

import { forHumans } from './outbound';

describe('and the marks that survived because of it', () => {
  it('drops the opener that was glued to a quotation', () => {
    /* Photographed live, twice in one session. */
    const out = forHumans('"Pipeline is strong, I should hit my number." That\'s a good start. What are your top two objectives?');
    expect(out).not.toContain('good start');
    expect(out).toContain('What are your top two objectives?');
    expect(out).toContain('Pipeline is strong');
  });

  it('drops the other shapes seen in the same run', () => {
    for (const mark of [
      "That's an important goal.",
      'That sense of forward motion is a good place to start.',
      "That's a clear outcome.",
    ]) {
      expect(forHumans(`${mark} What happens next?`)).toBe('What happens next?');
    }
  });

  it('and leaves a sentence that carries something alone', () => {
    /* "Eighteen per cent is a clear impact" is also a grade, and it carries the figure. Dropping it
       would delete what the person said in order to fix how it was received. */
    const keeps = 'Eighteen per cent of revenue is a clear and specific impact.';
    expect(forHumans(`${keeps} What next?`)).toContain('Eighteen per cent');
  });
});
