import { refuseSomeoneHeldForASeat, REMOVED_FROM_THE_CHECK_IN, NOT_HELD_FOR_A_SEAT } from './held-for-a-seat';
import { AuthService } from '../auth/auth.service';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Mary was removed on day 28 (end-to-end check of 17 November): she stayed on every reader, and her link said it "may have been cut short". */
describe('somebody who was removed from a check-in', () => {
  it('is refused with a sentence that says she was removed', async () => {
    const prisma: any = { groundParticipant: { findFirst: jest.fn(async () => ({ awaitingSeat: false, leftAt: new Date() })) } };
    await expect(refuseSomeoneHeldForASeat(prisma, 'g', 'u')).rejects.toThrow(REMOVED_FROM_THE_CHECK_IN);
    expect(REMOVED_FROM_THE_CHECK_IN).toBe('You were removed from this check-in, so you can no longer open it. If that is a mistake, ask the person who runs it.');
  });
  it('is read as having left by the one filter every sweep spreads', () => {
    expect(NOT_HELD_FOR_A_SEAT.leftAt).toBeNull();
  });
  it('reads, on her sign-in link, that she was removed, not that it was cut short', async () => {
    const prisma: any = { emailVerificationToken: { findUnique: jest.fn(async () => ({ type: 'EMAIL_VERIFICATION', usedAt: null, expiresAt: new Date(Date.now() + 1e6), user: { deletedAt: new Date() } })) } };
    const service: any = Object.create(AuthService.prototype);
    service.prisma = prisma;
    await expect(service.consumeToken('t', 'EMAIL_VERIFICATION', { allowExpiredMessage: 'x' })).rejects.toThrow('You were removed from this check-in, so this link no longer opens it. If that is a mistake, ask the person who runs it.');
  });
});

describe('every reader of who is on the team leaves out who has left, where it loads them', () => {
  const read = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8');
  it('the board, the lists Today reads and the report all ask for people who have not left', () => {
    expect(read('board/board.service.ts')).toContain('where: { leftAt: null },\n          select: {\n            id: true, email: true, userId: true, partyType');
    expect(read('grounds/grounds.service.ts').match(/participants: \{ where: \{ leftAt: null \}, select/g)!.length).toBeGreaterThanOrEqual(4);
    const reports = read('reports/reports.service.ts');
    expect(reports).toContain('where: { participant: { groundId, leftAt: null } }');
    expect(reports).toContain('!p.managingOnly && !p.leftAt');
    expect(reports).toContain('&& !(p as any).leftAt');
  });
});
