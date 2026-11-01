import { readFileSync } from 'fs';
import { join } from 'path';
import { theCheckInToAddTo, WHAT_WOULD_YOU_LIKE_TO_ADD, ADD_SOMETHING_REFUSED } from './add-something';
import { ConversationService } from './conversation.service';

/** Hafsah, after polish round 3: people can add something any time, and it goes into the record the same way an answer does. */
describe('add something, any time', () => {
  it('goes into the check-in that is open, else the next one waiting', () => {
    expect(theCheckInToAddTo([{ id: 'a', status: 'COMPLETED', sessionNumber: 3 }, { id: 'b', status: 'IN_PROGRESS', sessionNumber: 4 }, { id: 'c', status: 'NOT_STARTED', sessionNumber: 5 }])?.id).toBe('b');
    expect(theCheckInToAddTo([{ id: 'c', status: 'NOT_STARTED', sessionNumber: 6 }, { id: 'd', status: 'NOT_STARTED', sessionNumber: 5 }])?.id).toBe('d');
    expect(theCheckInToAddTo([{ id: 'a', status: 'COMPLETED', sessionNumber: 3 }])).toBeNull();
  });
  it('opens a waiting one with "What would you like to add?", and sends what they added in as an answer', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    const at = src.indexOf('async addSomething(');
    expect(at).toBeGreaterThan(-1);
    const body = src.slice(at, src.indexOf('async sendMessage(', at));
    expect(body).toContain('await this.open(target.id, userId, WHAT_WOULD_YOU_LIKE_TO_ADD)');
    expect(body).toContain('await this.sendMessage(target.id, userId, said)');
    expect(WHAT_WOULD_YOU_LIKE_TO_ADD).toBe('What would you like to add?');
  });
  it('is a route anyone in the check-in can use, for their own record only', () => {
    const ctl = readFileSync(join(__dirname, 'conversation.controller.ts'), 'utf8');
    expect(ctl).toContain("@Post('add-something/:groundId')");
    expect(ctl).toContain('this.conversation.addSomething(groundId, userId, dto.message)');
  });

  /*
   * Round 7, the mobile cinema lead: after her first session she pressed "Add something", typed next week's schedule, and was told
   * "This check-in has no session open or coming up to add to", under the button that offered it. A lead checks in when she chooses, so
   * nothing was scheduled for her. Her next check-in now opens the way "Check in yourself" opens it, and what she added goes in.
   */
  describe('a lead between sessions', () => {
    function aService(partyType: 'INITIATOR' | 'PARTICIPANT') {
      const rows: any[] = [{ id: 'ci-1', status: 'COMPLETED', sessionNumber: 1 }];
      const prisma: any = {
        groundParticipant: {
          findFirst: jest.fn(async (a: any) => (a?.where?.partyType ? { id: 'p-juma' } : { id: 'p-juma', partyType, managingOnly: false })),
        },
        ground: { findUnique: jest.fn(async () => ({ id: 'g', status: 'ACTIVE', initiatorId: 'u-juma', organizationId: 'org' })) },
        checkIn: {
          findMany: jest.fn(async () => rows.filter((r) => r.status !== 'COMPLETED')),
          findFirst: jest.fn(async () => null),
          aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
          create: jest.fn(async ({ data }: any) => { const r = { id: 'ci-2', status: 'NOT_STARTED', sessionNumber: data.sessionNumber }; rows.push(r); return r; }),
          update: jest.fn(async () => ({})),
        },
      };
      const service = Object.create(ConversationService.prototype) as any;
      service.prisma = prisma;
      service.open = jest.fn(async () => ({}));
      service.sendMessage = jest.fn(async () => ({ reply: 'I have put next week’s schedule on the board.' }));
      return { service, prisma };
    }

    it('opens her next check-in now and puts what she added in it', async () => {
      const { service, prisma } = aService('INITIATOR');
      const out = await service.addSomething('g', 'u-juma', 'Mon Nov 02, Morogoro; Tue Nov 03, Dodoma.');
      expect(prisma.checkIn.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ participantId: 'p-juma', sessionNumber: 2, status: 'NOT_STARTED' }) }));
      expect(service.open).toHaveBeenCalledWith('ci-2', 'u-juma', WHAT_WOULD_YOU_LIKE_TO_ADD);
      expect(service.sendMessage).toHaveBeenCalledWith('ci-2', 'u-juma', 'Mon Nov 02, Morogoro; Tue Nov 03, Dodoma.');
      expect(out.checkInId).toBe('ci-2');
    });

    it('somebody else with nothing open or coming up is still told so', async () => {
      const { service } = aService('PARTICIPANT');
      await expect(service.addSomething('g', 'u-juma', 'Something new.')).rejects.toThrow(ADD_SOMETHING_REFUSED.nothingToAddTo);
    });
  });
});
