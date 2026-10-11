import { yourBoard } from './your-board';

/** B-167: on her own You page, Amina read "Amina is aiming for early success for Wanjiru. You have 0 of 1." */
const reader = { userId: 'u-amina', organizationId: 'org1' };
const ground = {
  id: 'g1', label: 'Wanjiru, first 90 days', organizationId: 'org1', status: 'ACTIVE', initiatorId: 'u-amina', closedAt: null, resolvedAt: null,
  participants: [{ id: 'p-amina', userId: 'u-amina', user: { firstName: 'Amina' } }], checkIns: [],
};
const board = (rows: any) => yourBoard([ground as any], reader, { objectives: [], ownedTargets: [], commitments: [], coaching: [], todos: [], ...rows } as any);

describe('B-167: Amina reads her own goal as hers', () => {
  it('says "You are aiming for" and treats a target of one as done or not done', () => {
    const b = board({ ownedTargets: [{ id: 't1', groundId: 'g1', name: 'Amina is aiming for early success for Wanjiru', target: 1, count: 0 }] });
    expect(b.goals.map((g) => g.says)).toEqual(['You are aiming for early success for Wanjiru. You have not reached it yet.']);
  });
  it('says it has been reached once it has', () => {
    const b = board({ ownedTargets: [{ id: 't1', groundId: 'g1', name: 'Amina is aiming for early success for Wanjiru', target: 1, count: 1 }] });
    expect(b.goals[0].says).toBe('You are aiming for early success for Wanjiru. You have reached it.');
  });
  it('does the same for an objective somebody else wrote about her', () => {
    const b = board({ objectives: [{ id: 'o1', groundId: 'g1', participantId: 'p-amina', text: 'Amina is working on a plan for the first week.', status: 'OPEN', kind: 'GOAL', authoredBy: 'lead' }] });
    expect(b.goals[0].says).toBe('You are working on a plan for the first week.');
  });
  it('leaves a sentence about somebody else alone', () => {
    const b = board({ ownedTargets: [{ id: 't1', groundId: 'g1', name: 'Wanjiru is aiming for early success', target: 1, count: 0 }] });
    expect(b.goals[0].says).toMatch(/^Wanjiru is aiming for/);
  });
});
