import { GroundScenario, PartyType } from '@prisma/client';
import { person, boardAs, commitment, answered } from './the-switchboards-sections-harness';

/** Request 136 item 2: the founder's "Work plan" held only rows added on the board, not the two commitments from session 1. */
const W = { ...person('p-w', 'u-w', 'Wanjiru', 'Kamau', PartyType.INITIATOR), managingOnly: false };
const SETUP: any = {
  scenario: GroundScenario.PULSE_CHECK, people: [W], initiatorId: 'u-w', label: 'Founder’s own check-in', kindOfWork: "founder's own check-in",
  checkIns: [answered('p-w', 1, '2026-09-02T16:00:00Z')],
  commitments: [
    commitment('k-1', 'p-w', 'I will send the data room', { statedInSession: 1, saidWordForWord: true, whenSaid: 'on Wednesday', whenSaidWordForWord: true }),
    commitment('k-2', 'p-w', 'I will hire the engineer', { statedInSession: 1, saidWordForWord: true }),
  ],
  items: [{ id: 'w-1', groundId: 'g-1', kind: 'decision', name: 'Whether to raise a seed round', stage: null, ownerParticipantId: 'p-w', fields: {}, dueAt: null, sourceEntryId: null, addedByUserId: 'u-w', createdAt: new Date('2026-09-03T09:00:00Z') }],
};

describe('the founder\'s Work plan, as the founder reads it', () => {
  it('holds the rows added on the board and the commitments from the check-in', async () => {
    const b: any = await boardAs(SETUP, 'u-w', 'MEMBER');
    const plan = b.workRecords.find((s: any) => s.section === 'Work plan');
    expect(plan.state).toBe('filled');
    expect(plan.rows.map((r: any) => r.name)).toEqual(['Whether to raise a seed round', 'send the data room', 'hire the engineer']);
    const sent = plan.rows.find((r: any) => r.name === 'send the data room');
    expect(sent.owner).toBe('You');
    expect(sent.fields['Time given']).toBe('on Wednesday');
    expect(sent.fields.Status).toBe('Open');
  });
});
