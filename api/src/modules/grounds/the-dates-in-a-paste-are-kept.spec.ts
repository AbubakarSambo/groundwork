import { aSetupConversation, aPaste } from './request-92-harness';
import { aDateSaid, theDatesToKeep, whatWeTookFromThat } from './a-dump-is-many-things';

/**
 * DUMPS AND DOCUMENTS (4 October 2026), fault 4: THE DATES WERE SAID BACK AND THEN DROPPED.
 *
 * "These are the dates you named. They stay in this conversation and are not put on the record."
 * A quarter's end, a board meeting, a price list going out and the day a new rep starts were all in
 * the sales update, were listed, and were gone the moment the lead said yes. A date that a job
 * already carries ("Samuel will call every butchery in Ikeja by Friday 10 October") is not kept twice.
 */
const DATES = [
  { what: 'Quarter ends', when: '31 December' },
  { what: 'Board meeting', when: '15 January' },
  { what: 'Kemi starts', when: 'the 13th' },
  { what: 'Hires', when: 'end of November' },
  { what: 'Samuel Okoro to call every butchery in Ikeja', when: 'by Friday 10 October' },
];
const COMMITMENTS = [{ who: 'Samuel Okoro', participantId: 'pS', action: 'Call every butchery in Ikeja', outcome: null, when: 'by Friday 10 October', theySaidIt: true }];

describe('a date is written as one plain sentence, as the paste wrote it', () => {
  it('says the day with "on" and leaves a timing that already has its own word alone', () => {
    expect(aDateSaid('Quarter ends', '31 December')).toBe('Quarter ends on 31 December.');
    expect(aDateSaid('Kemi starts', 'the 13th')).toBe('Kemi starts on the 13th.');
    expect(aDateSaid('Price letter to customers', 'by 10 November')).toBe('Price letter to customers by 10 November.');
    expect(aDateSaid('Hires', 'end of November')).toBe('Hires at the end of November.');
    expect(aDateSaid('Insurance quote', 'soon')).toBe('Insurance quote, soon.');
  });

  it('does not keep a date a job already carries', () => {
    expect(theDatesToKeep({ dates: DATES, commitments: COMMITMENTS })).toEqual([
      'Quarter ends on 31 December.', 'Board meeting on 15 January.', 'Kemi starts on the 13th.', 'Hires at the end of November.',
    ]);
  });
});

describe('the dates are said back as what will be kept, and kept', () => {
  it('the list tells the lead who will read them, with no sentence about leaving them off the record', () => {
    const said = whatWeTookFromThat(aPaste({ dates: DATES, commitments: COMMITMENTS }), { asking: true })!;
    expect(said).toContain('These are the dates you named. Everyone on this check-in will see these.\n- Quarter ends on 31 December.\n- Board meeting on 15 January.');
    expect(said).not.toContain('are not put on the record');
    expect(said).not.toContain('Samuel Okoro to call every butchery in Ikeja by');
  });

  it('the yes writes each as a note for the whole check-in', async () => {
    const lines: any[] = [];
    const { service } = aSetupConversation({
      seed: {
        groundContextItem: { findMany: async () => [], create: async ({ data }: any) => { lines.push(data); return { id: `i${lines.length}` }; } },
        groundObjective: { findMany: async () => [] },
        groundCommitment: { findMany: async () => [], create: async () => ({ id: 'c1' }) },
      },
    });
    await (service as any).writeWhatThePasteGave('g1', aPaste({ dates: DATES, commitments: COMMITMENTS }));
    expect(lines.filter((l) => l.kind === 'NOTE').map((l) => `${l.audience} ${l.text}`)).toEqual([
      'EVERYONE Quarter ends on 31 December.', 'EVERYONE Board meeting on 15 January.', 'EVERYONE Kemi starts on the 13th.', 'EVERYONE Hires at the end of November.',
    ]);
  });
});
