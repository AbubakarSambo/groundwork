import { whoSharedItBecauseTheLeadLeft, fullNameOf, sharedByAnAdminFrom } from './who-shared-it-because-the-lead-left';

describe('the sentence everybody reads when an admin shared for a lead who has left', () => {
  it('names who shared it and why, in one plain sentence', () => {
    expect(whoSharedItBecauseTheLeadLeft('Grace Otieno', 'Rukia Mwangi')).toBe(
      'Grace Otieno shared this report, because Rukia Mwangi has left the organisation.',
    );
  });
});

describe('fullNameOf', () => {
  it('joins a first and last name', () => {
    expect(fullNameOf({ firstName: 'Grace', lastName: 'Otieno' }, 'An admin')).toBe('Grace Otieno');
  });

  it('falls back when nobody gave a name', () => {
    expect(fullNameOf(null, 'An admin')).toBe('An admin');
    expect(fullNameOf({ firstName: null, lastName: null }, 'An admin')).toBe('An admin');
  });
});

describe('sharedByAnAdminFrom, reading the fact back off the ground for every reader', () => {
  it('is undefined where the lead released it themselves', () => {
    expect(sharedByAnAdminFrom(null)).toBeUndefined();
    expect(sharedByAnAdminFrom({})).toBeUndefined();
    expect(sharedByAnAdminFrom({ timeline: [], contextNotes: [] })).toBeUndefined();
  });

  it('reads the sentence, and who and why, once an admin has shared it in the lead\'s place', () => {
    const auditLog = {
      timeline: [],
      contextNotes: [],
      sharedBecauseLeadLeft: {
        byUserId: 'u-grace', byName: 'Grace Otieno', leadName: 'Rukia Mwangi',
        sentence: 'Grace Otieno shared this report, because Rukia Mwangi has left the organisation.',
        at: '2026-09-29T10:00:00.000Z',
      },
    };
    expect(sharedByAnAdminFrom(auditLog)).toEqual({
      byName: 'Grace Otieno',
      leadName: 'Rukia Mwangi',
      sentence: 'Grace Otieno shared this report, because Rukia Mwangi has left the organisation.',
    });
  });

  it('is undefined for a malformed entry rather than serving a half sentence', () => {
    expect(sharedByAnAdminFrom({ sharedBecauseLeadLeft: { byName: 'Grace Otieno' } })).toBeUndefined();
  });
});
