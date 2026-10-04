import { GroundScenario } from '@prisma/client';
import { boardAs, SALES_RUN, BISI, FEMI, NGOZI, JUMA, type Setup } from './the-switchboards-sections-harness';
import { NO_OPEN_ISSUES_ON_RECORD } from './board.service';
import { YOU_SEE_THE_HELP } from './help-nobody-mentioned';

/**
 * REQUEST 115 (c): WHAT THE PROTOTYPE'S SALES BOARD HAS THAT WAS NOT SERVED AT ALL, ONLY FROM WHAT THE RECORD HOLDS.
 *  - "To close the gap, two of these three": the team's aim and its count, and the open deals the reader is served.
 *  - "Help nobody mentioned. You see the help, not who said it.": a colleague named somebody as the reason
 *    something moved, and that person's own lines say nothing about it.
 *  - "Open issues": nothing on record follows an issue through its stages, so it says what would be needed.
 *  - What a target assumes: where nothing is written down, said plainly.
 * Read as Bisi who runs it, the admin who set it up, Juma an admin who only reads, Femi and Ngozi who check in
 * (with and without seeing each other), and on a performance plan.
 */
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-16T17:00:00Z'), updatedAt: new Date('2026-09-16T17:00:00Z'), ...more,
});
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales org',
  clock: { now: new Date('2026-09-23T15:00:00Z'), endsAt: new Date('2026-09-30T17:00:00Z') },
  recordLines: [
    { id: 'e-ngozi', participantId: 'p-ngozi', text: 'Six facilities are approved out of my total target of 14 for the quarter.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: 'doc-ngozi', createdAt: new Date('2026-09-16T17:00:00Z') },
    { id: 'e-kwame', participantId: 'p-kwame', text: 'That N8 million disbursed represents three approved facilities.', recallBased: true, createdAt: new Date('2026-09-22T18:00:00Z') },
    { id: 'e-femi', participantId: 'p-femi', text: 'I have 31 applications that I\'ve taken from businesses.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: 'doc-bisi', createdAt: new Date('2026-09-16T16:00:00Z') },
    { id: 'e-femi-2', participantId: 'p-femi', text: 'I filled out all the forms completely.', confirmedAt: new Date('2026-09-17T09:00:00Z'), createdAt: new Date('2026-09-22T16:00:00Z') },
    { id: 'e-ngozi-2', participantId: 'p-ngozi', text: 'I have already sent him a written escalation.', createdAt: new Date('2026-09-22T17:00:00Z') },
  ],
  documents: [
    { id: 'doc-ngozi', participantId: 'p-ngozi', fileName: 'approval-letters.pdf', visibility: 'EVERYONE' },
    { id: 'doc-bisi', participantId: 'p-bisi', fileName: 'pipeline.xlsx', visibility: 'EVERYONE' },
  ],
  items: [
    item('w-ngozi', 'Ikeja Bakery', { stage: 'Won', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-ngozi' }),
    item('w-kwame', 'Jos Grain Traders', { stage: 'Quoted', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-kwame', dueAt: new Date('2026-10-15T00:00:00Z') }),
    item('w-femi', 'Mama Ngozi Kitchens', { stage: 'Pitched', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi' }),
    item('w-femi-2', 'Lekki Cold Rooms', { stage: 'Qualified', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi-2', dueAt: new Date('2026-09-28T00:00:00Z') }),
    item('w-ngozi-2', 'Head of Credit escalation', { stage: 'Need established', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-ngozi-2' }),
    item('w-lead', 'Plateau Foods', { stage: 'Contacted', addedByUserId: 'u-bisi' }),
  ],
};
const SETUP = ['u-setup', 'ADMIN'] as const;
const aim = (id: string, name: string, n: number, count: number, owner: string | null = null) => ({
  id, groundId: 'g-1', name, target: n, count, prevCount: count, ownerParticipantId: owner, setByParticipantId: 'p-bisi', sortOrder: 0, addedAtSession: null, assumes: [], direction: 'AIM',
});
const WITH_AN_AIM: Setup = {
  ...RUN, createdByUserId: 'u-setup',
  objectives: [aim('o-approved', 'Approved facilities this quarter', 40, 38)],
  lines: [
    { id: 'l-femi', participantId: 'p-femi', type: 'PROGRESS', text: 'I have 31 applications that I have taken from businesses.', verifiability: 'HIGH', checkIn: { sessionNumber: 2 }, disputedAt: null },
    { id: 'l-ngozi', participantId: 'p-ngozi', type: 'PROGRESS', text: 'Six facilities are approved out of my target.', verifiability: 'HIGH', checkIn: { sessionNumber: 2 }, disputedAt: null },
  ],
  mentions: [
    { id: 'm-1', groundId: 'g-1', sourceParticipantId: 'p-ngozi', aboutParticipantId: 'p-kwame', kind: 'CREDIT', text: 'Kwame showed me how to fill the credit forms', sessionNumber: 2 },
    { id: 'm-2', groundId: 'g-1', sourceParticipantId: 'p-femi', aboutParticipantId: 'p-kwame', kind: 'CREDIT', text: 'Kwame checked my bank statements before I sent them', sessionNumber: 2 },
    /* Femi said this himself, so it is not help nobody mentioned. */
    { id: 'm-3', groundId: 'g-1', sourceParticipantId: 'p-ngozi', aboutParticipantId: 'p-femi', kind: 'CREDIT', text: 'Femi took the applications from businesses', sessionNumber: 2 },
  ],
};
const THE_GAP = 'To close the gap by 30 September, 2 of these 3 open deals would need to close. Each open deal is counted as one toward the aim of 40.';

describe('request 115 (c): to close the gap', () => {
  it.each([['Bisi, who runs it', BISI], ['the admin who set it up', SETUP]])('%s reads which open deals could close the gap, from the record', async (_who, reader) => {
    const b = await boardAs(WITH_AN_AIM, ...(reader as readonly [string, string]));
    expect(b.toCloseTheGap.gap).toBe(2);
    expect(b.toCloseTheGap.says).toBe(THE_GAP);
    expect(b.toCloseTheGap.deals.map((d: any) => d.name)).toEqual(['Lekki Cold Rooms', 'Head of Credit escalation', 'Plateau Foods']);
    expect(b.toCloseTheGap.deals[0].says).toBe("Lekki Cold Rooms is Femi Okonkwo's deal. Nobody has said what happens next.");
    expect(b.toCloseTheGap.deals[2].says).toBe("Plateau Foods is a deal with nobody's name on it yet. Nobody has said what happens next.");
  });

  it('where the aim is money, no deal is listed, and it says why', async () => {
    const b = await boardAs({ ...WITH_AN_AIM, objectives: [aim('o-n', 'Naira disbursed this quarter', 120, 100)] }, ...BISI);
    expect(b.toCloseTheGap.deals).toEqual([]);
    expect(b.toCloseTheGap.says).toBe('20 more are needed by 30 September. Nothing on record says what each deal is worth against this aim, so no deals are listed as closing the gap.');
  });

  /* Decision 86 reverses decision 73 for admins: Juma, an admin who only reads, now reads the aims, so he is sent it too. */
  it('Femi and Ngozi are not sent it', async () => {
    for (const reader of [FEMI, NGOZI] as (readonly [string, string])[]) {
      expect((await boardAs(WITH_AN_AIM, ...reader)).toCloseTheGap).toBeUndefined();
    }
  });

  it('Juma, an admin who only reads, is sent what Bisi is sent', async () => {
    const asJuma = (await boardAs(WITH_AN_AIM, ...JUMA)).toCloseTheGap;
    expect(asJuma.says).toBe('To close the gap by 30 September, 2 of these 3 open deals would need to close. Each open deal is counted as one toward the aim of 40.');
    expect(asJuma).toEqual((await boardAs(WITH_AN_AIM, ...BISI)).toCloseTheGap);
  });

  it('is not served on a performance plan', async () => {
    expect((await boardAs({ ...WITH_AN_AIM, scenario: GroundScenario.PIP }, ...BISI)).toCloseTheGap).toBeUndefined();
  });
});

describe('request 115 (c): help nobody mentioned', () => {
  it.each([['Bisi, who runs it', BISI], ['the admin who set it up', SETUP]])('%s reads the help, never who said it', async (_who, reader) => {
    const b = await boardAs(WITH_AN_AIM, ...(reader as readonly [string, string]));
    expect(b.helpNobodyMentioned).toEqual({
      lines: ['2 colleagues said Kwame Mensah helped them. Kwame Mensah did not mention it in their own check-ins.'],
      why: YOU_SEE_THE_HELP,
    });
    expect(JSON.stringify(b.helpNobodyMentioned)).not.toMatch(/Ngozi|Femi|forms|statements/);
  });

  it('Juma, an admin who only reads, is sent what Bisi is sent (decision 93, row 10: this pinned that he was not)', async () => {
    const b = await boardAs(WITH_AN_AIM, ...(JUMA as readonly [string, string]));
    expect(b.helpNobodyMentioned).toEqual({
      lines: ['2 colleagues said Kwame Mensah helped them. Kwame Mensah did not mention it in their own check-ins.'],
      why: YOU_SEE_THE_HELP,
    });
  });

  it.each([['Femi', FEMI], ['Ngozi', NGOZI]])('%s is not sent it', async (_who, reader) => {
    expect((await boardAs(WITH_AN_AIM, ...(reader as readonly [string, string]))).helpNobodyMentioned).toBeUndefined();
  });

  it('where people see only themselves, a participant is still not sent it', async () => {
    expect((await boardAs({ ...WITH_AN_AIM, peersVisibleToEachOther: false }, ...FEMI)).helpNobodyMentioned).toBeUndefined();
  });
});

describe('request 115 (c): open issues, and what a target assumes', () => {
  it('Bisi and the admin who set it up are told what open issues would need, and nothing is made up', async () => {
    for (const reader of [BISI, SETUP] as (readonly [string, string])[]) {
      expect((await boardAs(WITH_AN_AIM, ...reader)).openIssues).toEqual({ state: 'not-known', why: NO_OPEN_ISSUES_ON_RECORD });
    }
    for (const reader of [JUMA, FEMI, NGOZI] as (readonly [string, string])[]) {
      expect((await boardAs(WITH_AN_AIM, ...reader)).openIssues).toBeUndefined();
    }
  });

  it('an aim with nothing written down for what it assumes says so, to the lead as something she can do', async () => {
    const lead = await boardAs(WITH_AN_AIM, ...BISI);
    expect(lead.objectives.find((o: any) => o.id === 'o-approved').assumesSays).toBe('Nothing on record says what this target assumes yet.');
    const juma = await boardAs({ ...WITH_AN_AIM, whoSeesTargets: 'EVERYBODY' }, ...JUMA);
    expect(juma.objectives.find((o: any) => o.id === 'o-approved').assumesSays).toBe('Nobody has written down what this target assumes yet.');
    const written = await boardAs({ ...WITH_AN_AIM, objectives: [{ ...aim('o-approved', 'Approved facilities this quarter', 40, 38), assumes: ['Credit approves within a week.'] }] }, ...BISI);
    const o = written.objectives.find((x: any) => x.id === 'o-approved');
    expect(o.assumes).toEqual(['Credit approves within a week.']);
    expect(o.assumesSays).toBeNull();
  });
});
