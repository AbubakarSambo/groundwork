import { theLineWorthPuttingToThem, aDirectiveAboutWhatTheDocumentSays } from './the-line-that-touches-what-they-said';

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

describe('the directive it produces', () => {
  const d = aDirectiveAboutWhatTheDocumentSays('The territory handover from Daniel finished in August.', [PLAN]);

  it('carries the sentence, so nothing has to be found or remembered', () => {
    expect(d).toContain('"Daniel will finish the territory handover to Margaret by 19 September."');
    expect(d).toContain('"handover-plan.txt"');
    expect(d).toContain('Demo, who runs this check-in');
  });

  /**
   * The reason this exists at all: two absolutes in the engine's prompt forbid stating a date the
   * person did not give, and the citation worth making is almost always a date. An exception
   * written into the timeframe rule itself still lost. The directive says so at the point of use.
   */
  it('and lifts the rule that was suppressing it, at the point of use', () => {
    expect(d).toContain('THE RULE ABOUT NEVER STATING A DATE THEY DID NOT GIVE YOU DOES NOT APPLY TO THIS LINE');
    expect(d).toContain('WITHOUT naming what the document says is the failure this exists to stop');
  });

  it('and refuses to decide who is right', () => {
    expect(d).toContain('Do not decide who is right');
    expect(d).toContain('Whatever they say is the record');
  });

  it('and is empty when there is nothing to put', () => {
    expect(aDirectiveAboutWhatTheDocumentSays('Everything is on track.', [PLAN])).toBe('');
  });
});
