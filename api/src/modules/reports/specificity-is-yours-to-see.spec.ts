import { withoutOtherPeoplesReads } from './own-reads-only';

/**
 * A PERSON SEES THEIR OWN SPECIFICITY, AND NOBODY ELSE'S.
 *
 * DECIDED, 1 September 2026. The report carries a specificity read for each party, and the
 * question was whether it should exist at all in a product that says it never scores people. It
 * stays, because it is there to nudge somebody towards being clear rather than to rank them - and
 * it is shown to the person it is about, so nothing is said about somebody they cannot see
 * themselves.
 *
 * That is already how the filter behaves. This exists because it was not guarded anywhere: the
 * only spec touching `specificityLabel` was about private guides, so both halves of a deliberate
 * decision could have been undone by a refactor without a single test going red.
 *
 * BOTH HALVES MATTER, AND THEY FAIL IN OPPOSITE DIRECTIONS. Losing your own turns a nudge into a
 * secret assessment. Gaining somebody else's turns the report into a comparison of colleagues,
 * which is the thing the product promises it is not.
 */
describe('GW-SPECIFICITY: whose read a person may see', () => {
  const report = () => ({
    engagement: {
      parties: [
        { label: 'Ada', contributed: true, recordEntries: 3, specificityLabel: 'high' },
        { label: 'Kwame', contributed: true, recordEntries: 2, specificityLabel: 'low' },
        { label: 'Nadia', contributed: true, recordEntries: 4, specificityLabel: 'medium' },
      ],
      specificitySignal: { Ada: 'high', Kwame: 'low', Nadia: 'medium' },
      specificityNotes: [
        { label: 'Ada', note: 'Concrete on dates.' },
        { label: 'Kwame', note: 'Vague on evidence.' },
      ],
    },
  });

  const asParticipant = (label: string) =>
    withoutOtherPeoplesReads(report() as any, {
      viewerLabel: label, viewerParticipantId: 'p-' + label, viewerIsLead: false,
    }) as any;

  it('a person keeps their own specificity, which is the point of it existing', () => {
    const seen = asParticipant('Ada');
    expect(seen.engagement.parties.find((p: any) => p.label === 'Ada').specificityLabel).toBe('high');
    expect(seen.engagement.specificitySignal).toEqual({ Ada: 'high' });
  });

  it('and their own note, so the nudge says what to do differently', () => {
    const seen = asParticipant('Ada');
    expect(seen.engagement.specificityNotes).toEqual([{ label: 'Ada', note: 'Concrete on dates.' }]);
  });

  it('THE OTHER HALF: nobody else\'s reaches them, on any of the three carriers', () => {
    const seen = asParticipant('Ada');
    for (const other of ['Kwame', 'Nadia']) {
      /* 18 October (Hafsah's quality pass, R-7): a participant keeps only their own row, so a colleague's row is gone, rating and all. */
      expect(seen.engagement.parties.find((p: any) => p.label === other)?.specificityLabel).toBeUndefined();
      expect(seen.engagement.specificitySignal[other]).toBeUndefined();
    }
    expect(seen.engagement.specificityNotes.some((n: any) => n.label !== 'Ada')).toBe(false);
  });

  /*
   * Changed 18 October (Hafsah's quality pass, R-7; CLAUDE.md, "each person's load across check-ins" is private, always): each row
   * also counts that person's lines and documents, so a participant now reads only their own row; who checked in reaches them
   * through the team picture. The lead still reads everyone's participation (every-report-read-strips-other-peoples-ratings).
   * This test is stricter than before: no colleague's row reaches a participant at all.
   */
  it('a participant reads only their own participation row, never a colleague\'s load', () => {
    const seen = asParticipant('Ada');
    expect(seen.engagement.parties.map((p: any) => p.label)).toEqual(['Ada']);
    expect(seen.engagement.parties.every((p: any) => p.contributed)).toBe(true);
  });

  it('and it works for whoever is reading, not just the first party', () => {
    const seen = asParticipant('Nadia');
    expect(seen.engagement.parties.find((p: any) => p.label === 'Nadia').specificityLabel).toBe('medium');
    expect(seen.engagement.specificitySignal).toEqual({ Nadia: 'medium' });
  });

  it('a viewer the report does not name gets nobody\'s', () => {
    const seen = withoutOtherPeoplesReads(report() as any, {
      viewerLabel: null, viewerParticipantId: null, viewerIsLead: false,
    }) as any;
    expect(seen.engagement.parties.every((p: any) => p.specificityLabel === undefined)).toBe(true);
    expect(seen.engagement.specificitySignal).toEqual({});
  });
});
