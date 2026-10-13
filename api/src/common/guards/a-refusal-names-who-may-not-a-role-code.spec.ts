import { whoMayDoThis } from './roles.guard';

/** B-001: a lead or member who tries an admin-only action was told "This action requires one of the following roles: ADMIN". */
describe('what is said when somebody may not do it', () => {
  it.each([
    [['ADMIN'], 'Only an admin can do this.'],
    [['ADMIN', 'LEAD'], 'Only an admin or a lead can do this.'],
    [['ADMIN', 'LEAD', 'MEMBER'], 'Only an admin, a lead or a member can do this.'],
  ])('%j reads as a sentence', (roles, said) => {
    expect(whoMayDoThis(roles as string[])).toBe(said);
    expect(said).not.toMatch(/ADMIN|roles/);
  });
});
