import { aSetupConversation, aPaste } from './request-92-harness';

/**
 * DUMPS AND DOCUMENTS (4 October 2026), fault 1: THE YES WROTE A SECOND READING.
 *
 * Driven on four realistic dumps with the real model: the list the lead was shown and the rows a yes
 * wrote were different. The yes read the pasted words again, and a model never reads the same words
 * the same way twice. Zainab's two commitments in the project plan were said back, and one different
 * commitment was written. This is the fixture of that: the first reading is the one the lead sees,
 * and the second reading, if one were made, says something else.
 */
const PASTE = 'Warehouse move. Zainab counts the 4,200 stock items by 20 October and labels every pallet by 3 November. '.repeat(6);

const SAID_BACK = aPaste({
  commitments: [
    { who: 'Zainab Musa', participantId: 'pZ', action: 'Count all 4,200 stock items', outcome: null, when: 'by 20 October', theySaidIt: false },
    { who: 'Zainab Musa', participantId: 'pZ', action: 'Label every pallet', outcome: null, when: 'by 3 November', theySaidIt: false },
  ],
  teamTargets: [{ name: 'Total budget', target: 15_000_000, notToExceed: true }],
});
const SECOND_READING = aPaste({
  commitments: [{ who: 'Zainab Musa', participantId: 'pZ', action: 'Get approval for 6 temporary staff', outcome: null, when: null, theySaidIt: false }],
});

function aLeadsCheckIn() {
  const commitments: any[] = [];
  const objectives: any[] = [];
  const PEOPLE = [{ id: 'pZ', managingOnly: false, userId: 'uZ' }];
  const harness = aSetupConversation({
    ground: { participants: PEOPLE, status: 'ACTIVE', endState: null },
    seed: {
      ground: {
        findUnique: async () => ({ id: 'g1', label: 'Warehouse move', organizationId: 'org1', initiatorId: 'userLead', scenario: 'NEW_PROJECT', timelineDays: 90, timelineStated: false, cadence: 'WEEKLY', cadenceStated: false, brief: null, status: 'ACTIVE', endState: null, participants: PEOPLE, objectives: [] }),
        update: jest.fn(async () => ({})),
      },
      groundObjective: { findMany: async () => [], createMany: jest.fn(async ({ data }: any) => { objectives.push(...data); return { count: data.length }; }) },
      groundCommitment: { findMany: async () => [], create: jest.fn(async ({ data }: any) => { commitments.push(data); return { id: `c${commitments.length}` }; }) },
      groundPaste: { findFirst: async () => null, create: async () => ({}) },
    },
    paste: SAID_BACK as any,
  });
  return { ...harness, commitments, objectives };
}

describe('the yes writes the list the lead was shown', () => {
  it('writes what was said back even when a second reading of the same words would say something else', async () => {
    const { service, commitments, objectives } = aLeadsCheckIn();
    const chat: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: PASTE }], { yesOrNo: true });
    expect(chat.proposal.say).toContain('Zainab Musa: Count all 4,200 stock items (by 20 October)');
    /* From here on, reading the paste again would give a different list. */
    (service as any).whatAPasteGives.mockResolvedValue(SECOND_READING);

    const applied: any = await service.applyContextProposal('g1', 'userLead', {
      said: PASTE,
      history: [{ role: 'user', content: PASTE }, { role: 'assistant', content: chat.proposal.say }],
    });

    expect(applied.changed).toBe('everything');
    expect(commitments.map((c) => c.text)).toEqual(['Count all 4,200 stock items', 'Label every pallet']);
    expect(commitments.map((c) => c.whenSaid)).toEqual(['by 20 October', 'by 3 November']);
    expect(objectives.map((o) => `${o.name} ${o.target}`)).toEqual(['Total budget 15000000']);
    /* And the words the lead reads after the yes are the words they read before it. */
    expect(applied.say).toContain('Zainab Musa: Count all 4,200 stock items (by 20 October)');
    expect(applied.say).not.toContain('temporary staff');
  });

  it('a yes with no list behind it still reads the paste, as it always did', async () => {
    const { service, commitments } = aLeadsCheckIn();
    (service as any).whatAPasteGives.mockResolvedValue(SECOND_READING);
    await service.applyContextProposal('g1', 'userLead', { said: PASTE, history: [{ role: 'user', content: PASTE }] });
    expect(commitments.map((c) => c.text)).toEqual(['Get approval for 6 temporary staff']);
  });

  it('a "yes, but not that one" leaves out the one named and does not change what is held for the next yes', async () => {
    const { service, commitments } = aLeadsCheckIn();
    const chat: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: PASTE }], { yesOrNo: true });
    const history = [{ role: 'user' as const, content: PASTE }, { role: 'assistant' as const, content: chat.proposal.say }];
    (service as any).whatAPasteGives.mockResolvedValue(SECOND_READING);
    await service.applyContextProposal('g1', 'userLead', { said: 'Yes, but not label every pallet', history });
    expect(commitments.map((c) => c.text)).toEqual(['Count all 4,200 stock items']);
  });
});
