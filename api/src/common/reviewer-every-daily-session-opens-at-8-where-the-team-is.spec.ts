import { Cadence } from '@prisma/client';
import { theOrganisationsZone } from './the-organisations-own-day';
import { whenTheNextSessionOpens } from '../modules/grounds/the-check-ins-own-schedule';

/**
 * REVIEWER, 14 OCTOBER (D4): David's and Kevin's second sessions opened at 07:00 UTC (8am in Lagos, 10am in Nairobi) and
 * Mercy's at 05:00 UTC (8am in Nairobi). The product's own zone, used while nobody's number was in yet, was remembered for
 * ten minutes, and whoever finished inside those ten minutes got Lagos. Two people finishing at different times, with the
 * numbers going in between, must both open at 8 in Nairobi.
 */
function kilima() {
  const numbers: string[] = [];
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ timeZone: null })) },
    user: { findMany: jest.fn(async () => numbers.map((phoneNumber) => ({ phoneNumber }))) },
    person: { findMany: jest.fn(async () => []) },
  };
  return { prisma, addNumbers: (...n: string[]) => numbers.push(...n) };
}

const daily = (zone: string | null) => ({ cadence: Cadence.DAILY, workingDays: [], startedAt: new Date('2026-10-14T02:30:00Z'), startsNow: true, zone } as any);

describe('a daily check-in opens at 8 in the organisation\'s zone for everybody', () => {
  it('the zone used before any number is known is not kept, so the next person reads Nairobi', async () => {
    const { prisma, addNumbers } = kilima();
    const t0 = Date.parse('2026-10-14T03:28:00Z');
    expect(await theOrganisationsZone(prisma, 'org-kilima-a', t0)).toBe('Africa/Lagos');
    addNumbers('+254722000202', '+254722000203');
    const davidsZone = await theOrganisationsZone(prisma, 'org-kilima-a', Date.parse('2026-10-14T03:36:55Z'));
    const mercysZone = await theOrganisationsZone(prisma, 'org-kilima-a', Date.parse('2026-10-14T03:39:30Z'));
    expect(davidsZone).toBe('Africa/Nairobi');
    expect(mercysZone).toBe('Africa/Nairobi');
    const opened = new Date('2026-10-14T02:30:00Z');
    expect(whenTheNextSessionOpens(daily(davidsZone), opened, new Date('2026-10-14T03:36:55Z')).toISOString()).toBe('2026-10-15T05:00:00.000Z');
    expect(whenTheNextSessionOpens(daily(mercysZone), opened, new Date('2026-10-14T03:39:30Z')).toISOString()).toBe('2026-10-15T05:00:00.000Z');
  });

  it('numbers on the roster count too, before anybody has one on their sign-in', async () => {
    const { prisma } = kilima();
    prisma.person.findMany = jest.fn(async () => [{ phone: '+254722000202' }, { phone: '+254722000203' }]);
    expect(await theOrganisationsZone(prisma, 'org-kilima-b')).toBe('Africa/Nairobi');
  });
});
