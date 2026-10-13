import { colleaguesOf } from './colleagues';

/**
 * E1, Riverbank Trading (an organisation made before the rebuild): seven of the eleven colleagues had
 * never given a name. The colleague list left them out, so a lead adding people to a check-in could
 * not pick them, where the list before showed every colleague. Nobody's address may come out of the
 * list (decision 27) and an address is never a name (decision 115), so they are listed as someone who
 * has not given a name yet, with their role and team, and picked by their id.
 */
const people: Record<string, { firstName: string; lastName: string }> = {
  mira: { firstName: 'Mira', lastName: 'Costa' },
  dov: { firstName: 'Dov', lastName: 'Ellison' },
  qx7: { firstName: '', lastName: '' },
  zt2: { firstName: '', lastName: '' },
};
const team: Record<string, string> = { mira: 'Sales', dov: 'Sales', qx7: 'Operations', zt2: 'Sales' };
const db: any = {
  organizationMembership: {
    findUnique: async () => ({ role: 'LEAD' }),
    findMany: async () => Object.keys(people).filter((id) => id !== 'mira').map((id) => ({ userId: id, role: 'MEMBER', team: team[id], user: people[id] })),
  },
  user: { findUnique: async () => ({ awaitingOrgApproval: false, email: 'mira@riverbank.test' }) },
  groundParticipant: { findMany: async () => [] },
};

describe('a colleague who has not given a name is still in the list', () => {
  it('lists the person with a plain stand-in, their role and team, and no address', async () => {
    const seen = await colleaguesOf(db, 'riverbank', 'mira');
    expect(seen.map((c) => c.id).sort()).toEqual(['dov', 'qx7', 'zt2']);
    const nameless = seen.filter((c) => c.id !== 'dov');
    expect(nameless.map((c) => c.name)).toEqual(['Someone who has not given a name yet', 'Someone who has not given a name yet']);
    expect(nameless.map((c) => c.team).sort()).toEqual(['Operations', 'Sales']);
    expect(JSON.stringify(seen)).not.toMatch(/@/);
  });

  it('puts the people with a name first', async () => {
    const seen = await colleaguesOf(db, 'riverbank', 'mira');
    expect(seen[0].name).toBe('Dov Ellison');
  });
});
