import { boardAs, SALES_RUN, SALES_PEOPLE, BISI, KWAME, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE FOUNDER'S BOARD: "HELP NOBODY MENTIONED" SAYS "YOU" TO THE PERSON IT IS ABOUT.
 *
 * "A second founder joining" (local test database, 9a904212): Ada runs it and checks in too, and read
 * "A colleague said Ada Nwosu helped them. Ada Nwosu did not mention it in their own check-ins." about
 * herself. Here Bisi runs the check-in and also checks in, and Kwame named her as the reason something
 * moved. The section is served to whoever runs the check-in only, as before.
 */
const RUN: Setup = {
  ...SALES_RUN,
  people: SALES_PEOPLE.map((p) => (p.id === 'p-bisi' ? { ...p, managingOnly: false } : p)),
  mentions: [
    { id: 'm-1', groundId: 'g-1', sourceParticipantId: 'p-kwame', aboutParticipantId: 'p-bisi', kind: 'CREDIT', text: 'Bisi rang the bank about my approval', sessionNumber: 2 },
    { id: 'm-2', groundId: 'g-1', sourceParticipantId: 'p-ngozi', aboutParticipantId: 'p-kwame', kind: 'CREDIT', text: 'Kwame showed me how to fill the credit forms', sessionNumber: 2 },
  ],
  /* What Kwame and Ngozi said: a credit stands only where the colleague's own words hold it (the final check, 12 October). */
  turns: [
    ...(SALES_RUN.turns ?? []),
    { checkInId: 'c2-p-kwame', content: 'Bisi helped me. She rang the bank about my approval.' },
    { checkInId: 'c2-p-ngozi', content: 'Kwame helped me. He showed me how to fill the credit forms.' },
  ],
} as any;

describe('help nobody mentioned, about the person reading it', () => {
  it('Bisi reads her own line as "you", and Kwame\'s with his name', async () => {
    expect((await boardAs(RUN, ...BISI)).helpNobodyMentioned.lines).toEqual([
      'A colleague said you helped them. You did not mention it in your own check-ins.',
      'A colleague said Kwame Mensah helped them. Kwame Mensah did not mention it in their own check-ins.',
    ]);
  });
  it('Kwame is not sent it', async () => {
    expect((await boardAs(RUN, ...KWAME)).helpNobodyMentioned).toBeUndefined();
  });
  /* Changed by decision 93, row 10. This pinned "Kwame and an admin who only reads are not sent it"; Hafsah removed the admin half. */
  it('Juma, an admin who only reads, is sent it, with every name and no "you"', async () => {
    const lines = (await boardAs(RUN, ...JUMA)).helpNobodyMentioned.lines;
    expect(lines).toEqual([
      'A colleague said Bisi Adeyemi helped them. Bisi Adeyemi did not mention it in their own check-ins.',
      'A colleague said Kwame Mensah helped them. Kwame Mensah did not mention it in their own check-ins.',
    ]);
  });
});

describe('help nobody mentioned, with nothing in any transcript (quality runs 1 and 2, issue 11)', () => {
  it('Bisi reads no "A colleague said you helped them." when Kwame never said it', async () => {
    const NOBODY_SAID_IT = { ...RUN, turns: SALES_RUN.turns } as any;
    expect((await boardAs(NOBODY_SAID_IT, ...BISI)).helpNobodyMentioned).toBeUndefined();
    expect((await boardAs(NOBODY_SAID_IT, ...JUMA)).helpNobodyMentioned).toBeUndefined();
  });
});
