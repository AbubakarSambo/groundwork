import { lastValueFrom, of } from 'rxjs';
import { inTheOrganisationsDay, theOrganisationsZone, TheOrganisationsOwnDay, theDayZone, forgetTheOrganisationsZone } from './the-organisations-own-day';
import { howOftenItWasRaised } from '../modules/board/how-often-it-was-raised';
import { whatEachSessionSays } from '../modules/board/one-count-for-the-sessions';
import { theDayInWords } from '../modules/board/the-day-in-words';

/**
 * B-094. Halima checked in at 1:53 on Friday 9 October in Nairobi, which is 22:53 on 8 October in UTC and 23:53 in West Africa. The board said
 * "raised once, on 8 October" and the screens beside it said 9 October. Every day a sentence says is now the organisation's own day.
 */
const HALIMA_CHECKED_IN = new Date('2026-10-08T22:53:00Z');
const NOW = new Date('2026-10-09T08:00:00Z');

describe('B-094: the day in a sentence', () => {
  it('is 9 October in Nairobi, and was 8 October in the zone the engine always used', () => {
    expect(howOftenItWasRaised([{ at: HALIMA_CHECKED_IN, checkInId: null }] as any, NOW)?.says).toBe('This was raised once, on 8 October.');
    inTheOrganisationsDay('Africa/Nairobi', () => {
      expect(howOftenItWasRaised([{ at: HALIMA_CHECKED_IN, checkInId: null }] as any, NOW)?.says).toBe('This was raised once, on 9 October.');
      expect(theDayInWords(HALIMA_CHECKED_IN, NOW)).toBe('9 October');
      const rows = [{ sessionNumber: 2, status: 'NOT_STARTED', availableFrom: new Date('2026-10-15T22:57:00Z') }];
      expect(whatEachSessionSays(2, rows as any, 1, NOW).says).toBe('Check-in 2 opens on 16 October.');
    });
    expect(theDayZone()).toBe('Africa/Lagos');
  });
});

describe('the organisation\'s own zone', () => {
  const prismaWith = (timeZone: string | null, phones: string[]) => ({
    organization: { findUnique: jest.fn(async () => ({ timeZone })) },
    user: { findMany: jest.fn(async () => phones.map((phoneNumber) => ({ phoneNumber }))) },
  });
  it('is the one an admin named', async () => {
    forgetTheOrganisationsZone('o1');
    expect(await theOrganisationsZone(prismaWith('Africa/Nairobi', ['2348012345678']) as any, 'o1')).toBe('Africa/Nairobi');
  });
  it('is otherwise where most of its people\'s numbers are', async () => {
    forgetTheOrganisationsZone('o2');
    expect(await theOrganisationsZone(prismaWith(null, ['254700000001', '254700000002', '2348012345678']) as any, 'o2')).toBe('Africa/Nairobi');
  });
  it('is otherwise the product\'s own', async () => {
    forgetTheOrganisationsZone('o3');
    expect(await theOrganisationsZone(prismaWith(null, []) as any, 'o3')).toBe('Africa/Lagos');
  });
  it('is in force for a signed-in request, and not for one with no organisation', async () => {
    forgetTheOrganisationsZone('o4');
    const interceptor = new TheOrganisationsOwnDay(prismaWith('Africa/Nairobi', []) as any);
    const seen: string[] = [];
    const handler = { handle: () => { seen.push(theDayZone()); return of('ok'); } };
    const ctx = (user: any) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as any;
    expect(await lastValueFrom(interceptor.intercept(ctx({ organizationId: 'o4' }), handler as any))).toBe('ok');
    expect(await lastValueFrom(interceptor.intercept(ctx(undefined), handler as any))).toBe('ok');
    expect(seen).toEqual(['Africa/Nairobi', 'Africa/Lagos']);
  });
});
