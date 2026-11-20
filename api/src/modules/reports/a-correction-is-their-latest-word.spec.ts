import { theCorrectionsOnRecord, withWhatACorrectionSettled, isOnlyACorrection } from './a-correction-is-their-latest-word';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 1. Mercy, 13 October: "That's 25 units, KES 120,000, in the bag." Mercy, 14 October,
 * as her answer holds it: "Okay, so for Greenfield, we got the order signed yesterday for 25 units. I mistakenly said it was KES
 * 120,000, but it's actually KES 125,000. Delivery is set for Friday, and they'll pay then." The report served to Grace (and to Amina,
 * and Mercy's own board) as it was, below.
 */
const MERCY = '73cc71dd-246f-4c23-93fc-3a7d1cc95188';
const KEVIN = 'c70d2a56-1a2d-48ac-948f-635b6aa817fe';
const LINES = [
  { participantId: MERCY, text: "Yes, I called Mrs. Njeri today and Greenfield signed the order! That's 25 units, KES 120,000, in the bag. I've got the photo of the signed order too." },
  { participantId: MERCY, text: "Okay, so for Greenfield, we got the order signed yesterday for 25 units. I mistakenly said it was KES 120,000, but it's actually KES 125,000. Delivery is set for Friday, and they'll pay then. As for Tuskys Westgate, Peter is still waiting for Joseph to bring the samples." },
  { participantId: KEVIN, text: 'It confirms the M-Pesa payment of KES 200,000 from Kilele Hotel for 40 units, with the code QJK4TL2MX9.' },
];
const REPORT = {
  divergences: [
    {
      topic: 'There is a divergence in how individual sales targets are understood.',
      positions: [{ view: "You stated that Kevin Omondi's target is 40 units.", participantLabel: 'You' }, { view: 'Kevin Omondi described their own personal target as 120 units.', participantLabel: 'Kevin Omondi' }],
    },
    {
      topic: 'The value of the signed deal with Greenfield Supermarket is reported differently in the same week.',
      evidence: ["In one check-in, Mercy Wairimu's record celebrates the Greenfield deal as being 'in the bag' for KES 120,000.", 'A later check-in from Mercy Wairimu records that the signed order for the same 25 units is actually for KES 125,000.'],
      positions: [
        { view: 'Mercy Wairimu first reported the Greenfield deal as 25 units for KES 120,000.', participantLabel: 'Mercy Wairimu' },
        { view: 'In a later check-in the same week, Mercy Wairimu stated the same deal was for KES 125,000.', participantLabel: 'Mercy Wairimu' },
      ],
      settledBy: 'Confirm the final amount for the Greenfield deal and update the record.',
    },
  ],
  centralQuestion: 'The value of the signed deal with Greenfield Supermarket is reported differently in the same week',
  engagement: { session2Focus: ['There is a divergence in how individual sales targets are understood.', 'The value of the signed deal with Greenfield Supermarket is reported differently in the same week.'] },
  theJudgement: {
    whatToDo: [
      { move: "Clarify with Kevin Omondi that Kevin's personal sales target is 40 units, not 120 units.", startWith: 'Kevin Omondi' },
      { move: 'Ask Mercy Wairimu which of the two figures for the Greenfield Supermarket deal, KES 120,000 or KES 125,000, is the correct one.', because: 'Mercy Wairimu reported two different values for the same signed order in the same week.', startWith: 'Mercy Wairimu' },
    ],
    whatTheNumbersSay: [
      { says: 'Mercy Wairimu has a signed order from Greenfield Supermarket for 25 units, which meets your standard for a sale.', fieldId: 'Mercy Wairimu' },
      { says: 'Mercy Wairimu reported two different values for the Greenfield Supermarket deal, KES 120,000 and KES 125,000, in the same week.', fieldId: 'Mercy Wairimu' },
    ],
  },
};
const whoIs = (label: string) => ({ 'Mercy Wairimu': MERCY, 'Kevin Omondi': KEVIN, You: 'p-grace' } as Record<string, string>)[label] ?? null;

describe('a person correcting themselves settles it', () => {
  it('Mercy\'s own words hold one correction: KES 120,000 was wrong, KES 125,000 is right', () => {
    const c = theCorrectionsOnRecord(LINES);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ participantId: MERCY, wrong: [120000], right: [125000] });
  });

  it('the report keeps no difference, no judgement line and no question about the figure she corrected; the rest stays', () => {
    const { report, leftOut } = withWhatACorrectionSettled(REPORT, theCorrectionsOnRecord(LINES), whoIs);
    const all = JSON.stringify(report);
    expect(all).not.toContain('120,000');
    expect(all).not.toMatch(/which of the two figures|two different values|first reported/);
    expect(report.divergences.map((d: any) => d.topic)).toEqual(['There is a divergence in how individual sales targets are understood.']);
    expect(report.centralQuestion).toBeNull();
    expect(report.engagement.session2Focus).toEqual(['There is a divergence in how individual sales targets are understood.']);
    expect(report.theJudgement.whatToDo.map((x: any) => x.startWith)).toEqual(['Kevin Omondi']);
    expect(report.theJudgement.whatTheNumbersSay.map((x: any) => x.says)).toEqual(['Mercy Wairimu has a signed order from Greenfield Supermarket for 25 units, which meets your standard for a sale.']);
    expect(leftOut.length).toBe(3);
  });

  it('two people with two figures is still a difference between people', () => {
    const d = { topic: 'Greenfield', positions: [{ view: 'KES 120,000', participantLabel: 'Mercy Wairimu' }, { view: 'KES 125,000', participantLabel: 'Kevin Omondi' }] };
    expect(isOnlyACorrection(d, theCorrectionsOnRecord(LINES), whoIs)).toBe(false);
  });

  it('with no correction on record, nothing is left out', () => {
    const { report, leftOut } = withWhatACorrectionSettled(REPORT, theCorrectionsOnRecord([LINES[0], LINES[2]]), whoIs);
    expect(leftOut).toEqual([]);
    expect(report.divergences).toHaveLength(2);
  });
});
