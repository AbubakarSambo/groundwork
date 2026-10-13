import { helpNobodyMentioned } from './help-nobody-mentioned';

/*
 * "2 colleagues said you helped them." / "A colleague said Hassan Mwenda helped them." reached the lead in both quality runs
 * (gw-pr-tools/quality/run1/audit.md, run2/audit.md, issue 11) with nothing behind it in any transcript. A credit now stands only where
 * the colleague's own words name the person and say they helped. Without the check both lines below are served.
 */
const people = [{ id: 'hassan' }, { id: 'amina' }, { id: 'collins' }];
const nameOf = (id: string) => ({ hassan: 'Hassan Mwenda', amina: 'Amina Otieno', collins: 'Collins Odhiambo' } as Record<string, string>)[id] ?? null;
const mentions = [
  { sourceParticipantId: 'amina', aboutParticipantId: 'hassan', kind: 'CREDIT', text: 'loaded the van for the Keroka run' },
  { sourceParticipantId: 'collins', aboutParticipantId: 'hassan', kind: 'CREDIT', text: 'shared the Keroka shop list' },
];

describe('help nobody mentioned needs a transcript', () => {
  it('the lead reads nothing when no colleague said it in their own words', () => {
    const words = new Map([['amina', ['I sent the stock on Tuesday.']], ['collins', ['I did eleven kits this week.']]]);
    expect(helpNobodyMentioned(mentions, [], people, nameOf, null, words)).toBeNull();
    /* And Hassan, reading his own, does not read "2 colleagues said you helped them." */
    expect(helpNobodyMentioned(mentions, [], people, nameOf, 'hassan', words)).toBeNull();
  });

  it('the lead reads it, counted right, where one colleague said it', () => {
    const words = new Map([['amina', ['Hassan helped me load the van for Keroka.']], ['collins', ['I did eleven kits this week.']]]);
    expect(helpNobodyMentioned(mentions, [], people, nameOf, null, words)?.lines).toEqual([
      'A colleague said Hassan Mwenda helped them. Hassan Mwenda did not mention it in their own check-ins.',
    ]);
    expect(helpNobodyMentioned(mentions, [], people, nameOf, 'hassan', words)?.lines).toEqual([
      'A colleague said you helped them. You did not mention it in your own check-ins.',
    ]);
  });
});
