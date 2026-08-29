import { describeEvidence, evidenceBlock, ageInDays, EVIDENCE_RULE, EVIDENCE_STALE_AFTER_DAYS } from './what-the-numbers-show';

const NOW = new Date('2026-11-14T09:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const ev = (n: number, state: any = { leads: 14, qualified: 7, proposals: 4, paying: 2 }) =>
  ({ objectiveExternalId: 'okr:sahar', observedAt: daysAgo(n), state });

describe('how old the numbers are is part of the number', () => {
  it('fresh evidence is stated plainly', () => {
    expect(describeEvidence(ev(0), NOW)).toMatch(/paying: 2 \(as of today\)/);
    expect(describeEvidence(ev(1), NOW)).toMatch(/as of yesterday/);
    expect(describeEvidence(ev(5), NOW)).toMatch(/as of 5 days ago/);
  });

  it('and stale evidence is shown WITH its age rather than withheld', () => {
    /*
     * A check-in that confidently cites a three-week-old number is worse than one citing none - the
     * person knows it is stale, and being asked as though it were current tells them the thing is
     * not really watching. It is often the only number anybody has, so it is shown and dated.
     */
    const said = describeEvidence(ev(EVIDENCE_STALE_AFTER_DAYS + 7), NOW);
    expect(said).toMatch(/last seen 21 days ago, so this may have moved/);
    expect(said).toMatch(/paying: 2/);
  });

  it('and evidence dated in the future does not read as negative days', () => {
    expect(ageInDays(new Date(NOW.getTime() + 86_400_000), NOW)).toBe(0);
  });
});

describe('what may be said about being behind', () => {
  it('it may be said plainly, because the person can see the same numbers', () => {
    /*
     * Hafsah's call. An earlier draft refused to state a gap at all on the grounds that telling
     * somebody they are behind is a judgement. That was too careful: two of six with the quarter two
     * thirds gone IS behind, and pretending otherwise makes the conversation dishonest before it
     * starts.
     */
    expect(EVIDENCE_RULE).toMatch(/MAY say plainly that something is behind/);
    expect(EVIDENCE_RULE).toMatch(/pretending otherwise makes the conversation dishonest/);
  });

  it('but it is the reason for a question, never the conclusion of one', () => {
    expect(EVIDENCE_RULE).toMatch(/REASON for your question, never the conclusion/);
    expect(EVIDENCE_RULE).toMatch(/Do not decide what it means about them/);
    expect(EVIDENCE_RULE).toMatch(/do not compare them to anybody else/);
  });

  it('and the person may say the numbers are wrong', () => {
    /* Their own system can be out of date, and they would know before it does. */
    expect(EVIDENCE_RULE).toMatch(/if the numbers look wrong to them, record that/);
  });

  it('and it never asks for a number it already holds', () => {
    expect(EVIDENCE_RULE).toMatch(/Never ask them for a number you already have/);
  });
});

describe('the block', () => {
  it('is empty when there is nothing, rather than an empty heading', () => {
    expect(evidenceBlock([], NOW)).toEqual([]);
  });

  it('and names the objective each number is about', () => {
    const [block] = evidenceBlock([{ text: 'Bring in six paying clients', evidence: ev(2) }], NOW);
    expect(block).toMatch(/- Bring in six paying clients: leads: 14/);
  });
});
