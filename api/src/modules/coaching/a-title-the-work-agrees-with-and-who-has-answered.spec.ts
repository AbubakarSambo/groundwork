import { CheckInStatus } from '@prisma/client';
import { detectFunction, needsRoleConfirmation, theKindOfWorkAgrees } from '../board/function-detection';
import { buildContribution } from '../board/reads';
import { RoleFunction } from '../board/role-maps';
import { ConversationService } from '../conversation/conversation.service';
import { reportAsOneLine, reportAsTemplateBlanks } from '../public-api/a-whatsapp-message-is-routed';

/**
 * FROM THE PULSE CHECK RERUN (15 October 2026) AND HAFSAH'S ANSWERS OF 16 OCTOBER.
 *
 * Two lines a person read were untrue, and a sales executive in a sales check-in still had to say
 * "yes, my work is sales" before the sales coaching could read her work. Each is pinned here in what a
 * person actually reads, or in what the model is actually handed.
 */

describe('"Since then, Wairimu Njoroge and Chidi Okeke have also checked in", when Chidi had not', () => {
  function aService(rows: any[]) {
    const prisma: any = {
      checkIn: { findMany: jest.fn(async () => [{ participantId: 'zawadi' }, { participantId: 'wairimu' }]) },
      groundParticipant: { count: jest.fn(async () => 3), findMany: jest.fn(async () => rows) },
    };
    return { self: { prisma }, prisma };
  }
  const people = [
    { id: 'wairimu', partyType: 'INITIATOR', nameGiven: null, user: { firstName: 'Wairimu', lastName: 'Njoroge' }, checkIns: [{ id: 'w1' }] },
    { id: 'chidi', partyType: 'PARTICIPANT', nameGiven: null, user: { firstName: 'Chidi', lastName: 'Okeke' }, checkIns: [] },
  ];

  it('the model is told, by name and from the record, who has answered this session and who has not', async () => {
    const { self, prisma } = aService(people);
    const said: string = await (ConversationService.prototype as any).buildGroundState.call(self, 'g1', true, false, { sessionNumber: 2, participantId: 'zawadi', namesMayBeSaid: true });
    expect(said).toContain('This session, Wairimu Njoroge has answered.');
    expect(said).toContain('Chidi Okeke has not answered this session yet.');
    expect(said).toContain('Never say that anybody else has checked in or answered.');
    /* This session's answers only, never every session's. */
    expect(prisma.checkIn.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ sessionNumber: 2 }) }));
    expect(prisma.groundParticipant.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { not: 'zawadi' } }) }));
  });

  it('names nobody where this check-in does not name people to each other (an evaluation, a private check-in)', async () => {
    const { self, prisma } = aService(people);
    const said: string = await (ConversationService.prototype as any).buildGroundState.call(self, 'g1', true, false, { sessionNumber: 2, participantId: 'zawadi', namesMayBeSaid: false });
    expect(said).not.toMatch(/Wairimu|Chidi/);
    expect(prisma.groundParticipant.findMany).not.toHaveBeenCalled();
  });

  it('never lists the lead as not having answered: the lead checks in only when they choose', async () => {
    const { self } = aService([{ ...people[0], checkIns: [] }, people[1]]);
    const said: string = await (ConversationService.prototype as any).buildGroundState.call(self, 'g1', true, false, { sessionNumber: 2, participantId: 'zawadi', namesMayBeSaid: true });
    expect(said).toContain('This session, nobody else has answered yet.');
    expect(said).not.toContain('Wairimu');
  });
});

describe('"Everybody who has joined has answered", sent alone while somebody had not answered', () => {
  const report = { whereThingsStand: { saying: 'Everybody who has joined has answered. One person has not joined yet.' } };
  it('the WhatsApp line carries the sentence that keeps it true', () => {
    expect(reportAsOneLine(report, 'Pulse check')).toBe('Your report for Pulse check is ready. Everybody who has joined has answered. One person has not joined yet.');
    expect(reportAsTemplateBlanks(report, 'Pulse check')).toEqual(['Pulse check', 'Everybody who has joined has answered. One person has not joined yet.']);
  });
  it('and a line too long for one message is still cut to its first sentence, never mid-word', () => {
    const long = { whereThingsStand: { saying: `${'Three settled. '.repeat(16)}And more after that, which does not fit.` } };
    expect(reportAsTemplateBlanks(long, 'X')[1]).toBe('Three settled.');
  });
});

describe('a job title that agrees with the check-in\'s kind of work counts as confirmed (Hafsah, 16 October)', () => {
  it('"Sales executive" in a sales check-in is read as sales, confirmed, so nobody is asked again', () => {
    expect(theKindOfWorkAgrees(RoleFunction.SALES, 'sales org')).toBe(true);
    const read = detectFunction('Sales executive', [], null, 'sales org');
    expect(read.fn).toBe(RoleFunction.SALES);
    expect(read.confidence).toBeGreaterThanOrEqual(0.5);
    expect(needsRoleConfirmation(read, null)).toBe(false);
    /* And once she has spoken, with no sales words in what she said. */
    const after = detectFunction('Sales executive', ['No sales closed', 'That I am shutting it down'], read, 'sales org');
    expect(after.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('a title alone, or a title the kind of work does not agree with, is still a guess to confirm', () => {
    expect(needsRoleConfirmation(detectFunction('Sales executive', [], null, null), null)).toBe(true);
    expect(needsRoleConfirmation(detectFunction('Sales executive', [], null, 'a law firm matter'), null)).toBe(true);
    expect(needsRoleConfirmation(detectFunction('Software engineer', [], null, 'sales org'), null)).toBe(true);
  });

  it('the turn-by-turn read takes the kind of work from the check-in', async () => {
    const prisma: any = {
      conversationTurn: { findMany: jest.fn(async () => [{ content: 'No sales closed' }]) },
      groundParticipant: { findUnique: jest.fn(async () => ({ user: { jobTitle: 'Sales executive' }, ground: { kindOfWork: 'sales org' } })) },
    };
    const service = new ConversationService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, {} as any, {} as any, {} as any, { get: jest.fn(() => true) } as any);
    const read = await (service as any).roleReadForThisTurn({ id: 'ci1', participantId: 'p1', participant: { id: 'p1', roleAsDescribed: null, detectedFunction: RoleFunction.SALES, detectedFunctionConfidence: 0.4 } }, 'That I am shutting it down');
    expect(read.fn).toBe(RoleFunction.SALES);
    expect(read.confidence).toBeGreaterThanOrEqual(0.5);
  });
});

describe('the board\'s read of each person uses a confirmed role too (vi)', () => {
  const reasonFor = (confirmedAt: Date | null) => buildContribution({
    participants: [{ id: 'z', roleAsDescribed: 'Sales executive', managingOnly: false, detectedFunction: RoleFunction.SALES, detectedFunctionConfidence: 0.4, detectedFunctionConfirmedAt: confirmedAt }],
    checkIns: [{ participantId: 'z', sessionNumber: 1, status: CheckInStatus.COMPLETED }],
    entries: [{ participantId: 'z', sessionNumber: 1, text: '[VERIFIABILITY:HIGH] Kilimani Grocers said no on 14 October, before the approved 10 percent discount was offered.' }],
    mentions: [],
    dependencies: [],
  } as any, () => 'Zawadi Mwangi')[0];

  it('a confirmed role is not called provisional to the lead', () => {
    expect(reasonFor(new Date('2026-10-15')).fnConfident).toBe(true);
    expect(reasonFor(new Date('2026-10-15')).reason ?? '').not.toContain('still provisional');
  });
  it('an unconfirmed guess still is', () => {
    expect(reasonFor(null).fnConfident).toBe(false);
  });
});
