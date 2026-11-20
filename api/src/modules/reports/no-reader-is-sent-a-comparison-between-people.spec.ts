import { withoutComparisons, withoutComparisonsBetweenPeople, withoutComparisonsAnywhere } from './no-comparison-between-people';
import { withoutOtherPeoplesReads } from './own-reads-only';

/**
 * NO READER IS SENT A COMPARISON BETWEEN PEOPLE (B-110, wider). The sentences below were written for the lead, or into a person's own read, and each
 * ranks somebody against others. They are taken out wherever they are served; counts of who has answered stay.
 */
const COMPARES = [
  "This person's record contains significantly fewer and less specific entries than others on the same ground.",
  "One party's record contains fewer exchanges than the others.",
  'Chidi gave much less detail than the rest of the team.',
  'Zawadi is behind the team on follow-through.',
  'Amani was the most engaged person in the check-in.',
  'Her answers were thinner compared with the others.',
  'Juma sits below the team average for specific answers.',
];

describe('a sentence that ranks one person against others', () => {
  it.each(COMPARES)('is taken out: %s', (sentence) => {
    expect(withoutComparisons(`Four people answered. ${sentence} The renewals are open.`)).toBe('Four people answered. The renewals are open.');
  });
  it.each([
    'Two of the six people have checked in.',
    'Nobody has checked in yet, out of three people.',
    '5 of 6 people have checked in for the third check-in, and Omar has not yet.',
    'The renewals are slower than last quarter.',
    'Kilifi is slow because the stock arrives late.',
  ])('stays: %s', (sentence) => {
    expect(withoutComparisons(sentence)).toBe(sentence);
  });
});

describe('a thing the team owns is not the team (Hafsah\u2019s run, 20 November 2026)', () => {
  it('keeps "against the team\u2019s target", and still takes out "against the team"', () => {
    const kept = 'People in this check-in said different things about how progress against the team\u2019s target of 40 new shops a week is described.';
    expect(withoutComparisons(kept)).toBe(kept);
    expect(withoutComparisons("Progress against the team's target is slow.")).toBe("Progress against the team's target is slow.");
    expect(withoutComparisons('Amani was measured against the team. She called on 3 shops.')).toBe('She called on 3 shops.');
    expect(withoutComparisons('Kito is behind the team. He is waiting on stock.')).toBe('He is waiting on stock.');
  });
});

describe('a report as every reader is served it', () => {
  const report: any = {
    sharedPicture: `Five people answered. ${COMPARES[0]} The work is on track.`,
    theOpening: COMPARES[2],
    findings: [{ label: 'Chidi', text: `He is waiting on stock. ${COMPARES[1]}` }],
    divergences: [{ topic: 'Who owns renewals', positions: [{ who: 'Amani', view: 'Fewer calls than the others, I know.' }] }],
    engagement: { note: `Built from what each said. ${COMPARES[3]}`, parties: [{ label: 'A', sessions: 3 }] },
  };
  for (const [who, input] of [['the lead', { viewerLabel: null, viewerParticipantId: null, viewerIsLead: true }], ['a participant', { viewerLabel: 'A', viewerParticipantId: 'p1', viewerIsLead: false }]] as const) {
    it(`reads no comparison, as ${who}, and a person's own words are untouched`, () => {
      const out = withoutOtherPeoplesReads(report, input);
      const text = JSON.stringify(out);
      expect(text).not.toMatch(/significantly fewer|fewer exchanges than the others|rest of the team|behind the team/);
      expect(out.sharedPicture).toBe('Five people answered. The work is on track.');
      expect(out.findings[0].text).toBe('He is waiting on stock.');
      expect(out.engagement.parties).toEqual([{ label: 'A', sessions: 3 }]);
      /* What Amani said, word for word, is hers. */
      expect(out.divergences[0].positions[0].view).toBe('Fewer calls than the others, I know.');
    });
  }
  it('is the same function the board and Ask use, and leaves their own words', () => {
    const board = { saying: COMPARES[2], contribution: [{ note: `Said little. ${COMPARES[5]}` }], words: COMPARES[2] };
    const out = withoutComparisonsAnywhere(board);
    expect(out.saying).toBe('');
    expect(out.contribution[0].note).toBe('Said little.');
    expect(out.words).toBe(COMPARES[2]);
    expect(withoutComparisonsBetweenPeople({ theOpening: 'Two of six have answered.' }).theOpening).toBe('Two of six have answered.');
  });
});
