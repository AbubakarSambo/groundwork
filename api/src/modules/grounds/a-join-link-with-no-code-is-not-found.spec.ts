import { NotFoundException } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { whatToSayAboutADatabaseError } from '../../common/filters/a-database-error-is-not-a-message';

/** B-150: /entry/join-preview with a wrong parameter logged an unhandled exception. B-151: while the database was down every request said 'The database refused that request.' */
describe('a join link with no code', () => {
  it.each([undefined, null, '', '   ', ['a']])('%j is not found, and the database is never asked', async (token) => {
    const prisma: any = { ground: { findUnique: jest.fn() } };
    const service: any = Object.create(GroundsService.prototype);
    service.prisma = prisma;
    await expect(service.getJoinPreview(token as any)).rejects.toThrow(new NotFoundException('Join link not found'));
    expect(prisma.ground.findUnique).not.toHaveBeenCalled();
  });
});

describe('a database that cannot be reached', () => {
  it('is said as a moment to wait, not as a refusal', () => {
    const e = Object.assign(new Error("Can't reach database server at localhost:5432"), { name: 'PrismaClientKnownRequestError', code: 'P1001' });
    expect(whatToSayAboutADatabaseError(e)).toEqual({ status: 503, message: 'Groundwork cannot reach its records for a moment. Nothing was changed. Please try again in a minute.' });
    const init = Object.assign(new Error('x'), { name: 'PrismaClientInitializationError' });
    expect(whatToSayAboutADatabaseError(init)?.status).toBe(503);
  });
});
