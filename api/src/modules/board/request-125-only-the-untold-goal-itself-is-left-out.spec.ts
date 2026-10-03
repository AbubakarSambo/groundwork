import { GroundScenario } from '@prisma/client';
import { AMINA, JUMA, RUKIA, boardAs, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 125, FINDING 5. Amina set Rukia two goals. She has told Rukia one ("Lead the client conversations fully.") and
 * not the other (eight renewals a quarter). The board left out every objective Rukia owns, so Rukia lost the one she was told.
 * Only the goal not told is left out now.
 */
const NOT_TOLD = { participantId: 'p-rukia', text: 'Close eight renewals a quarter.', awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date() };
const TOLD = { participantId: 'p-rukia', text: 'Lead the client conversations fully.', awareness: 'TOLD', authoredBy: 'lead', createdAt: new Date() };
const objectives = [
  { id: 'o-1', groundId: 'g-1', name: 'Rukia to close 8 renewals per quarter', target: 8, count: 2, prevCount: 1, ownerParticipantId: 'p-rukia', setByParticipantId: 'p-amina', sortOrder: 0, addedAtSession: 1 },
  { id: 'o-2', groundId: 'g-1', name: 'Lead the client conversations fully', target: 3, count: 1, prevCount: 1, ownerParticipantId: 'p-rukia', setByParticipantId: 'p-amina', sortOrder: 1, addedAtSession: 1 },
];
const SETUP: Setup = { scenario: GroundScenario.OKR_ALIGNMENT, whoSeesTargets: 'EVERYBODY', objectives, personObjectives: [NOT_TOLD, TOLD] };
const names = (b: any) => (b.objectives ?? []).map((o: any) => String(o.name));

describe('only the goal not told is left out of the objectives, and the goal they were told stays', () => {
  it.each([['Rukia', RUKIA]] as [string, readonly [string, 'MEMBER' | 'ADMIN']][])('%s reads the told goal and not the untold one', async (_n, who) => {
    const b = await boardAs(SETUP, ...who);
    expect(names(b).join(' | ')).toContain('Lead the client conversations fully');
    expect(JSON.stringify(b)).not.toContain('8 renewals');
    expect(JSON.stringify(b)).not.toContain('eight renewals');
  });

  it('Amina, and Juma as an admin of the organisation, read both (decisions 5 and 86)', async () => {
    const j = await boardAs(SETUP, ...JUMA);
    expect(names(j).join(' | ')).toContain('Lead the client conversations fully');
    expect(names(j).join(' | ')).toContain('8 renewals');
    const b = await boardAs(SETUP, ...AMINA);
    expect(names(b).join(' | ')).toContain('Lead the client conversations fully');
    expect(names(b).join(' | ')).toContain('8 renewals');
  });
});

