import { GroundScenario } from '@prisma/client';
import { JUMA, SETUP_ADMIN, boardAs, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 125, FINDING 6 (decisions 5 and 86). The goal not told was kept from every reader who is not the lead, the admin who
 * set the check-in up included, so she read no objectives at all. Whoever runs the check-in reads it, and so does every admin of the organisation (decisions 5, 48, 56 and 86); the person it is about does not.
 */
const NOT_TOLD = { participantId: 'p-rukia', text: 'Close eight renewals a quarter.', awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date() };
const objectives = [
  { id: 'o-1', groundId: 'g-1', name: 'Rukia to close 8 renewals per quarter', target: 8, count: 2, prevCount: 1, ownerParticipantId: 'p-rukia', setByParticipantId: 'p-amina', sortOrder: 0, addedAtSession: 1 },
  { id: 'o-2', groundId: 'g-1', name: 'Lead the client conversations fully', target: 3, count: 1, prevCount: 1, ownerParticipantId: 'p-rukia', setByParticipantId: 'p-amina', sortOrder: 1, addedAtSession: 1 },
];
const SETUP: Setup = { scenario: GroundScenario.OKR_ALIGNMENT, whoSeesTargets: 'EVERYBODY', objectives, personObjectives: [NOT_TOLD], createdByUserId: 'u-setup' };
const all = (b: any) => (b.objectives ?? []).map((o: any) => String(o.name)).join(' | ');

describe('on the board, whoever runs the check-in reads the goal not told', () => {
  it('the admin who set it up reads both objectives', async () => {
    const b = await boardAs(SETUP, ...SETUP_ADMIN);
    expect(all(b)).toContain('8 renewals');
    expect(all(b)).toContain('Lead the client conversations fully');
  });

  it('an admin who only reads reads both as well, since admins read every board (decision 5)', async () => {
    const b = await boardAs(SETUP, ...JUMA);
    expect(all(b)).toContain('Lead the client conversations fully');
    expect(JSON.stringify(b)).toContain('8 renewals');
  });
});
