import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/** Run 9: rounds open at midnight in Nairobi and the board said "Tuesday 1 December" for the Wednesday round, because a fixed fallback of Lagos stood beside the one owner of the zone. */
describe('a round is dated in the organisation\'s own zone', () => {
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ timeZone: null })) },
    user: { findMany: jest.fn(async () => [{ phoneNumber: '+254712345678' }, { phoneNumber: '+254722345678' }]) },
    person: { findMany: jest.fn(async () => []) },
  };
  it('is Nairobi for a Kenyan team with no zone named, not the product\'s own Lagos', async () => {
    expect(await theOrganisationsZone(prisma, 'org-ke-1')).toBe('Africa/Nairobi');
  });
  it('reads the Wednesday round as Wednesday', async () => {
    const opened = new Date('2026-12-01T21:00:00Z');
    expect(whenItWas(opened, 'weekdayAndDay', (await theOrganisationsZone(prisma, 'org-ke-1')) as string)).toMatch(/Wednesday/);
    expect(whenItWas(opened, 'weekdayAndDay', 'Africa/Lagos')).toMatch(/Tuesday/);
  });
});
