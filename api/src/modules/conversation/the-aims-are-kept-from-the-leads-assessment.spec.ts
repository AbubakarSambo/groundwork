import { readFileSync } from 'fs';
import { join } from 'path';
import { PartyType } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { anAssessmentHolding } from './an-assessment-for-a-spec';

/**
 * THE TEAM'S AIMS ARE KEPT FROM THE LEAD'S ASSESSMENT (one source; Hafsah, 1 November 2026).
 *
 * The assessment test's setup: Wanjiru said "We must collect KES 2,400,000 by the end of the year". Her assessment held it, the
 * separate aims read failed on a dropped line, and her board said "No targets set yet". The aims are read once now, by her
 * assessment, and kept from it on the board, by the rules aims were always kept by.
 */
const WANJIRU_SAID = 'We must collect KES 2,400,000 by the end of the year, and miss no court filing deadlines this quarter.';

function theService(partyType: PartyType = PartyType.INITIATOR) {
  const board: any[] = [];
  const prisma: any = new Proxy({
    ground: { findUnique: jest.fn(async () => ({ peopleWorkTogether: true, participants: [{ id: 'p-w', partyType }] })) },
    conversationTurn: { findMany: jest.fn(async () => []) },
    groundObjective: { findMany: jest.fn(async () => board), createMany: jest.fn(async (a: any) => { board.push(...a.data); return { count: a.data.length }; }) },
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), create: jest.fn(async (a: any) => a), update: jest.fn(async (a: any) => a), createMany: jest.fn(async () => ({ count: 0 })) };
      }
      return target[prop];
    },
  });
  const svc = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any) as any;
  return { svc, board };
}

const HER_ASSESSMENT = (isTheLead: boolean) => anAssessmentHolding({
  isTheLead,
  targets: [
    { words: 'We must collect KES 2,400,000 by the end of the year', aim: 'The team is aiming to collect 2,400,000 Kenyan shillings by the end of the year.', target: 2400000, by: 'the end of the year', whose: 'The team' },
    { words: 'miss no court filing deadlines this quarter', aim: 'The team is aiming to miss no court filing deadlines this quarter.', target: null, whose: 'The team' },
    /* A number the model made up, said nowhere in her words: the aim is kept and the number is not. */
    { words: 'grow the firm', aim: 'The team is aiming to grow the firm to 40 clients.', target: 40, whose: 'The team' },
  ],
});

describe('the team\'s aims, kept from the lead\'s assessment', () => {
  it('her setup\'s targets reach the board, each a sentence about the team, with the number only where she said it', async () => {
    const { svc, board } = theService();
    await svc.keepTheAimsTheySaid({ id: 'c1', participantId: 'p-w', groundId: 'g1' }, HER_ASSESSMENT(true), { words: [WANJIRU_SAID], given: [] });
    expect(board.map((b) => [b.name, b.target, b.ownerParticipantId])).toEqual([
      ['The team is aiming to collect 2,400,000 Kenyan shillings by the end of the year.', 2400000, null],
      ['The team is aiming to miss no court filing deadlines this quarter.', null, null],
      ['The team is aiming to grow the firm to 40 clients.', null, null],
    ]);
  });

  it('a member\'s assessment sets no team aim', async () => {
    const { svc, board } = theService(PartyType.PARTICIPANT);
    await svc.keepTheAimsTheySaid({ id: 'c1', participantId: 'p-w', groundId: 'g1' }, HER_ASSESSMENT(false), null);
    expect(board).toEqual([]);
  });

  it('runs after every lead\'s assessment, on every path that ends a conversation, and the aims read of its own is gone', () => {
    const service = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    const after = service.slice(service.indexOf('async assessAndThenRead('), service.indexOf('ONE SESSION FINISHES ONCE.'));
    expect(after).toMatch(/this\.keepTheAimsTheySaid\(checkIn, assessed, how\.setup\)/);
    expect(service).not.toMatch(/result\.groundAims/);
  });
});
