import { theClockIsMoved, theQuietHoursNow } from './the-clock';

describe('the local test clock', () => {
  const keep = { ...process.env };
  afterEach(() => { process.env = { ...keep }; });

  it('is the real time unless a local run asks for it', () => {
    delete process.env.LOCAL_TEST_CLOCK; delete process.env.LOCAL_TEST_CLOCK_ALLOWED;
    expect(theClockIsMoved()).toBe(false);
    expect(Math.abs(theQuietHoursNow().getTime() - Date.now())).toBeLessThan(1000);
  });
  it('needs the allow switch as well as the moment', () => {
    process.env.NODE_ENV = 'development'; process.env.LOCAL_TEST_CLOCK = '2026-11-11T10:00:00+01:00'; delete process.env.LOCAL_TEST_CLOCK_ALLOWED;
    expect(theClockIsMoved()).toBe(false);
  });
  it('is never moved in production, even with both set', () => {
    process.env.NODE_ENV = 'production'; process.env.LOCAL_TEST_CLOCK = '2026-11-11T10:00:00+01:00'; process.env.LOCAL_TEST_CLOCK_ALLOWED = 'true';
    expect(theClockIsMoved()).toBe(false);
    expect(Math.abs(theQuietHoursNow().getTime() - Date.now())).toBeLessThan(1000);
  });
  it('starts at the moment given and runs on from there', () => {
    process.env.NODE_ENV = 'development'; process.env.LOCAL_TEST_CLOCK = '2026-11-11T10:00:00+01:00'; process.env.LOCAL_TEST_CLOCK_ALLOWED = 'true';
    expect(theClockIsMoved()).toBe(true);
    const t = theQuietHoursNow().getTime();
    expect(t).toBeGreaterThanOrEqual(Date.parse('2026-11-11T09:00:00Z'));
    expect(t).toBeLessThan(Date.parse('2026-11-11T09:01:00Z'));
  });
});
