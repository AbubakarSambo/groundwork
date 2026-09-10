import { isOneOfUs, recipients } from './the-team-is-told';

const roster = [
  { email: 'ceo@example.com', organizationId: 'org-us' },
  { email: 'ceo@personal.example', organizationId: 'org-us' },
  { email: 'sales@example.com', organizationId: 'org-us' },
];

describe('the team is told', () => {
  it('everybody on the roster, once each, whatever the case of the address', () => {
    expect(recipients([...roster, { email: 'CEO@example.com', organizationId: 'org-us' }])).toEqual([
      'ceo@example.com', 'ceo@personal.example', 'sales@example.com',
    ]);
  });

  it('knows our own organisation by the roster, not by a list', () => {
    expect(isOneOfUs({ id: 'org-us' }, roster)).toBe(true);
    expect(isOneOfUs({ id: 'org-new', adminEmail: 'ceo@personal.example' }, roster)).toBe(true);
    expect(isOneOfUs({ id: 'org-new', adminEmail: 'someone@customer.example' }, roster)).toBe(false);
  });
});
