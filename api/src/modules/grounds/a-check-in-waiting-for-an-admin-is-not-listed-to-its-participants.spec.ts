import { groundsAViewerMayList } from './who-may-read-this-check-in';

/** B-126: Pia's list offered 'Hiring plan for next quarter', waiting for an admin to accept it, and opening it said 'Check-in not found'. */
describe('what a member is offered in the list', () => {
  const where: any = groundsAViewerMayList('u-pia', { role: 'MEMBER', organizationId: 'o' } as any, 'o');
  it('leaves out a check-in still waiting for an admin, even where she is on its roster', () => {
    expect(where.OR).toContainEqual({ participants: { some: { userId: 'u-pia' } }, status: { not: 'AWAITING_APPROVAL' } });
    expect(where.OR).not.toContainEqual({ participants: { some: { userId: 'u-pia' } } });
  });
  it('still offers what she set up or runs, so she can see it is waiting', () => {
    expect(where.OR).toContainEqual({ createdByUserId: 'u-pia' });
    expect(where.OR).toContainEqual({ initiatorId: 'u-pia' });
  });
});
