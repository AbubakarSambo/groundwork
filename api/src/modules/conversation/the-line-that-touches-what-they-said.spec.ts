import { theLineWorthPuttingToThem, whatToPutToThem, theReplyAlreadyQuotesIt } from './the-line-that-touches-what-they-said';

const PLAN = {
  fileName: 'handover-plan.txt',
  who: 'Demo',
  fromTheLead: true,
  content: [
    'Handover plan, agreed 5 September.',
    'Daniel will finish the territory handover to Margaret by 19 September.',
    'Margaret will book fifteen qualified meetings a month from October.',
  ].join('\n'),
};

describe('the line worth putting to them', () => {
  it('finds the sentence that speaks to what they said and disagrees with it', () => {
    const hit = theLineWorthPuttingToThem('The territory handover from Daniel finished in August.', [PLAN]);
    expect(hit?.line).toContain('19 September');
    expect(hit?.fileName).toBe('handover-plan.txt');
    expect(hit?.fromTheLead).toBe(true);
  });

  /**
   * AND A SHARED MONTH IS NOT A SHARED SUBJECT. The plan's own header - "Handover plan, agreed 5
   * September." - matched somebody saying the handover finishes 19 September: two shared words,
   * "handover" and "september", two different dates, and the document flagged as contradicting
   * itself. Two things being about September is what makes them comparable, not what makes them
   * disagree.
   */
  it('does not flag a line whose only real overlap is the month', () => {
    const hit = theLineWorthPuttingToThem('Daniel finishes the territory handover by 30 September.', [PLAN]);
    expect(hit?.line).not.toContain('Handover plan, agreed');
  });

  /* Agreement is not worth a turn. */
  it('says nothing when they agree with the document', () => {
    expect(theLineWorthPuttingToThem('Daniel finishes the territory handover by 19 September.', [PLAN])).toBeNull();
  });

  it('and nothing when they gave no date at all', () => {
    expect(theLineWorthPuttingToThem('The territory handover from Daniel is going fine.', [PLAN])).toBeNull();
  });

  it('and nothing when the subject is unrelated', () => {
    expect(theLineWorthPuttingToThem('I rewrote the onboarding email in August.', [PLAN])).toBeNull();
  });

  it('and nothing when there are no shared documents', () => {
    expect(theLineWorthPuttingToThem('The handover finished in August.', [])).toBeNull();
  });

  /**
   * FOUND BY DRIVING IT, NOT BY READING IT. The date pattern had capturing groups, so
   * `String.match` without /g returned [whole, group1, group2] with `undefined` for the optional
   * ones - and lowercasing that threw. A live check-in answered 500 on the first real sentence.
   */
  it('survives text where the optional parts of the pattern do not match', () => {
    expect(() => theLineWorthPuttingToThem('It was done in August, before the quarter started.', [PLAN])).not.toThrow();
    expect(() => theLineWorthPuttingToThem('We agreed 5/9 and then Q3 and then week 2.', [PLAN])).not.toThrow();
  });
});

describe('what gets put to them', () => {
  const put = whatToPutToThem('The territory handover from Daniel finished in August.', [PLAN])!;

  /**
   * THE PRODUCT SAYS THE FACT. Four attempts at making the model say it - attribution on every
   * document, instructions about what to do with them, a deterministic directive carrying the exact
   * sentence, and an exception written into BOTH of the prompt rules that were suppressing it - got
   * as far as "There's a document called handover-plan" and never the line. Two absolutes forbid
   * stating a date the person did not give, both of them right, and the citation worth making is
   * almost always a date. More prose loses to an absolute.
   */
  it('quotes the document exactly, and says whose it is', () => {
    expect(put.citation).toContain('"Daniel will finish the territory handover to Margaret by 19 September."');
    expect(put.citation).toContain('"handover-plan.txt"');
    expect(put.citation).toContain('Demo, who runs this check-in');
  });

  /** A document can be out of date, and the person is usually the one who knows. */
  it('and does not call them wrong', () => {
    expect(put.citation).toContain('the document may well be the part that is wrong');
    expect(put.citation).not.toMatch(/you are (wrong|mistaken)|that is incorrect/i);
  });

  it('and tells the session the fact is already on the screen, so it asks instead of repeating', () => {
    expect(put.directive).toContain('ALREADY BEEN PUT TO THEM');
    expect(put.directive).toContain('Do NOT quote the document again');
    expect(put.directive).toContain('Ask which is right');
  });

  it('and refuses to decide who is right', () => {
    expect(put.directive).toContain('take whatever they answer as the record');
  });

  it('and is nothing at all when there is nothing to put', () => {
    expect(whatToPutToThem('Everything is on track.', [PLAN])).toBeNull();
  });
});

/**
 * ON THE ODD TURN WHERE THE MODEL DOES QUOTE IT, printing the line twice is worse than not printing
 * it at all - so the non-streaming path checks before prepending.
 */
describe('whether the reply already quotes it', () => {
  const LINE = 'Daniel will finish the territory handover to Margaret by 19 September.';

  it('is true when the reply carries the document\'s words', () => {
    expect(theReplyAlreadyQuotesIt('The plan says Daniel will finish the territory handover to Margaret by 19 September. Which is right?', LINE)).toBe(true);
  });

  it('and true for a near-quote, since the person has still read it', () => {
    expect(theReplyAlreadyQuotesIt('It says "daniel will finish the territory handover to margaret" - which is right?', LINE)).toBe(true);
  });

  it('and false for the reply this whole thing exists for', () => {
    expect(theReplyAlreadyQuotesIt('Which is right? A plan can be out of date.', LINE)).toBe(false);
    expect(theReplyAlreadyQuotesIt("There's a document called handover-plan. Which is right?", LINE)).toBe(false);
  });
});
