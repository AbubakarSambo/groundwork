import { whoMayConfirmSetup, confirmedByAnAdminSentence, fullNameOr, ONLY_THE_LEAD_CONFIRMS_SETUP } from './who-may-confirm-setup';

describe('who may confirm setup on this check-in (decision 63)', () => {
  const checkIn = { initiatorId: 'lead-1' };

  it('the lead may confirm, no lookup needed', () => {
    expect(whoMayConfirmSetup('lead-1', checkIn)).toEqual({ allowed: true, as: 'lead' });
  });

  it('an admin may not confirm while the lead is still in the organisation', () => {
    const decision = whoMayConfirmSetup('admin-1', checkIn, {
      lead: { isActive: true, firstName: 'Tunde', lastName: 'Ade' },
      confirmer: { role: 'ADMIN', organizationId: 'org-1', firstName: 'Ngozi', lastName: 'Bello' },
      organizationId: 'org-1',
    });
    expect(decision).toEqual({ allowed: false });
  });

  it('a participant who is neither the lead nor an admin may never confirm', () => {
    const decision = whoMayConfirmSetup('participant-1', checkIn, {
      lead: { isActive: false, firstName: 'Tunde', lastName: 'Ade' },
      confirmer: { role: 'MEMBER', organizationId: 'org-1' },
      organizationId: 'org-1',
    });
    expect(decision).toEqual({ allowed: false });
  });

  it('an admin of a different organisation may never confirm, even once the lead has left', () => {
    const decision = whoMayConfirmSetup('admin-2', checkIn, {
      lead: { isActive: false, firstName: 'Tunde', lastName: 'Ade' },
      confirmer: { role: 'ADMIN', organizationId: 'org-2' },
      organizationId: 'org-1',
    });
    expect(decision).toEqual({ allowed: false });
  });

  it('an admin of the same organisation may confirm once the lead has left it', () => {
    const decision = whoMayConfirmSetup('admin-1', checkIn, {
      lead: { isActive: false, firstName: 'Tunde', lastName: 'Ade' },
      confirmer: { role: 'ADMIN', organizationId: 'org-1', firstName: 'Ngozi', lastName: 'Bello' },
      organizationId: 'org-1',
    });
    expect(decision).toEqual({ allowed: true, as: 'admin', confirmedByName: 'Ngozi Bello', leadName: 'Tunde Ade' });
  });

  it('falls back to plain words when a name is missing', () => {
    const decision = whoMayConfirmSetup('admin-1', checkIn, {
      lead: { isActive: false },
      confirmer: { role: 'ADMIN', organizationId: 'org-1' },
      organizationId: 'org-1',
    });
    expect(decision).toEqual({ allowed: true, as: 'admin', confirmedByName: 'An admin', leadName: 'The person who ran this check-in' });
  });

  it('builds the one sentence people on the check-in read', () => {
    expect(confirmedByAnAdminSentence('Ngozi Bello', 'Tunde Ade'))
      .toBe('Ngozi Bello confirmed this because Tunde Ade has left the organisation.');
  });

  it('fullNameOr falls back to the given word when there is no name', () => {
    expect(fullNameOr({ firstName: 'Ngozi', lastName: 'Bello' }, 'An admin')).toBe('Ngozi Bello');
    expect(fullNameOr(null, 'An admin')).toBe('An admin');
    expect(fullNameOr({}, 'An admin')).toBe('An admin');
  });

  it('the refusal is a plain sentence, not a code', () => {
    expect(ONLY_THE_LEAD_CONFIRMS_SETUP).toContain('Only the person who runs this check-in');
    expect(ONLY_THE_LEAD_CONFIRMS_SETUP).toContain('left the organisation');
  });
});
