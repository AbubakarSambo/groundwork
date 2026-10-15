import { UsersService } from './users.service';

/**
 * "Everything you’ve written, as one file. It’s yours to keep." (what-daniel-sees.txt)
 *
 * Since U.13 a person can write back to a suggestion about them: their side, and an appeal. Both
 * are theirs, so both are in their own data file. Nothing the lead wrote, and never the verdict.
 */
describe('your data file holds your side and your appeal (C3, U.13)', () => {
  it('Daniel’s file carries what he wrote back, and nothing else from the suggestion', async () => {
    const suggestionFindMany = jest.fn(async () => [
      { theirSide: 'I was asked to clean 480 customer records.', theirSideAt: new Date('2026-09-20'), appeal: 'The records were the job I was given.', appealedAt: new Date('2026-09-22'), ground: { label: 'Daniel, the next six weeks' } },
    ]);
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ id: 'u-daniel', email: 'daniel@baridi.test', firstName: 'Daniel', lastName: 'Okafor' })) },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-d1', groundId: 'g-daniel' }]) },
      recordEntry: { findMany: jest.fn(async () => []) },
      checkIn: { findMany: jest.fn(async () => []) },
      ground: { findMany: jest.fn(async () => []) },
      suggestion: { findMany: suggestionFindMany },
    };
    const svc = new UsersService(prisma, {} as any, {} as any, {} as any, {} as any);
    const file: any = await svc.exportData('u-daniel');

    expect(file.yourSidesAndAppeals).toEqual([{
      groundLabel: 'Daniel, the next six weeks',
      yourSide: 'I was asked to clean 480 customer records.',
      yourSideAt: new Date('2026-09-20'),
      yourAppeal: 'The records were the job I was given.',
      appealedAt: new Date('2026-09-22'),
    }]);
    /* Only his own rows, and only the columns he wrote. */
    const [args] = suggestionFindMany.mock.calls[0] as any[];
    expect(args.where.aboutParticipantId).toEqual({ in: ['p-d1'] });
    expect(Object.keys(args.select).sort()).toEqual(['appeal', 'appealedAt', 'ground', 'theirSide', 'theirSideAt']);
  });
});
