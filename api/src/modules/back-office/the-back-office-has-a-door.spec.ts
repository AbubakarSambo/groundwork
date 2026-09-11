import { mayOpen, isTheBackOffice } from './the-back-office-has-a-door';

const now = new Date('2026-09-10T12:00:00Z');
const later = new Date('2026-09-12T12:00:00Z');
const earlier = new Date('2026-09-09T12:00:00Z');

describe('the back office has a door', () => {
  it('knows which paths are the back office, and that the door itself is not behind it', () => {
    expect(isTheBackOffice('/api/v1/ops/me')).toBe(true);
    expect(isTheBackOffice('/api/v1/admin/dashboard')).toBe(true);
    expect(isTheBackOffice('/api/v1/admin/ops/setup')).toBe(true);
    expect(isTheBackOffice('/api/v1/back-office/door/code')).toBe(false);
    expect(isTheBackOffice('/api/v1/grounds')).toBe(false);
    expect(isTheBackOffice('/api/v1/operations-something')).toBe(false);
  });

  it('is not its business outside the back office, or when nobody is signed in', () => {
    expect(mayOpen({ path: '/api/v1/grounds', signedIn: true, now })).toEqual({ open: true, because: 'not-the-back-office' });
    expect(mayOpen({ path: '/api/v1/ops/me', signedIn: false, now })).toEqual({ open: true, because: 'nobody' });
  });

  it('lets a Google session through without a code', () => {
    expect(mayOpen({ path: '/api/v1/ops/me', signedIn: true, signedInVia: 'google', now })).toEqual({ open: true, because: 'google' });
  });

  it('lets a pass through until it expires, and shuts otherwise', () => {
    expect(mayOpen({ path: '/api/v1/admin', signedIn: true, signedInVia: 'password', passExpiresAt: later, now })).toEqual({ open: true, because: 'pass' });
    expect(mayOpen({ path: '/api/v1/admin', signedIn: true, signedInVia: 'password', passExpiresAt: earlier, now })).toEqual({ open: false });
    expect(mayOpen({ path: '/api/v1/admin', signedIn: true, now })).toEqual({ open: false });
  });
});
