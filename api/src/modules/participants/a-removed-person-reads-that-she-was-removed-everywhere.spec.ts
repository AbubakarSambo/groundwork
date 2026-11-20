import { readFileSync } from 'fs';
import { join } from 'path';
import { AuthService } from '../auth/auth.service';
import { REMOVED_FROM_THE_CHECK_IN, REMOVED_FROM_THE_CHECK_IN_AT_SIGN_IN } from './held-for-a-seat';
import { theNewestRecordOfEachPerson } from '../patterns/what-the-record-shows-the-lead';

/** Run 5 (19 November): Mary was removed, and the sign-in page still said "I sent a sign-in link to mary@...", WhatsApp said her number was not connected yet, and the board still read "Mary has said 5 pieces of work were done without showing the proof". */
describe('somebody who was removed', () => {
  it('is told on the sign-in page that no link was sent, in the server\'s words, and is sent nothing', async () => {
    const prisma: any = {
      user: { findUnique: jest.fn(async () => null) },
      /* She left her seat: asked for a seat still held (leftAt null), nothing is found. */
      groundParticipant: { findFirst: jest.fn(async ({ where }: any) => (where?.leftAt === null ? null : { id: 'p-mary' })) },
      pendingSignup: { upsert: jest.fn() },
      emailVerificationToken: { create: jest.fn() },
    };
    const service: any = Object.create(AuthService.prototype);
    service.prisma = prisma;
    const answer = await service.entrySave('Mary@TaaSolar.test', undefined, undefined, undefined);
    expect(answer.removedSays).toBe('You were removed from the check-in this address was on, so I did not send a sign-in link. If that is a mistake, ask the person who runs it.');
    expect(REMOVED_FROM_THE_CHECK_IN_AT_SIGN_IN).toBe(answer.removedSays);
    expect(prisma.pendingSignup.upsert).not.toHaveBeenCalled();
    expect(prisma.emailVerificationToken.create).not.toHaveBeenCalled();
  });

  it('is told on WhatsApp that she was removed, not that her number waits to be linked', () => {
    const src = readFileSync(join(__dirname, '..', 'public-api', 'whatsapp-for-an-organisation.service.ts'), 'utf8');
    const removed = src.indexOf('await say(REMOVED_FROM_THE_CHECK_IN)');
    const waiting = src.indexOf('is not connected to a Groundwork sign-in yet');
    expect(removed).toBeGreaterThan(0);
    expect(removed).toBeLessThan(waiting);
    expect(REMOVED_FROM_THE_CHECK_IN).toBe('You were removed from this check-in, so you can no longer open it. If that is a mistake, ask the person who runs it.');
  });

  it('is not read for the lead from the record: only people who have not left', async () => {
    const asked: any[] = [];
    const prisma: any = { checkIn: { findMany: jest.fn(async (args: any) => { asked.push(args); return []; }) } };
    await theNewestRecordOfEachPerson(prisma, 'g');
    expect(asked[0].where.participant).toEqual({ leftAt: null });
  });
});
