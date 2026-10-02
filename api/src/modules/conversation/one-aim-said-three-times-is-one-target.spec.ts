import { ConversationService } from './conversation.service';
import { theAimsThatAreNew } from './an-aim-said-twice-is-one-aim';
import { proposalFrom } from '../grounds/what-the-context-chat-heard';
import { theHeadlineQuestion } from '../board/the-headline-and-where-each-target-stands';

/**
 * SCREENS REQUESTS 109 (b) AND 111 (b): ONE AIM, LISTED THREE TIMES, ASKED BY THE WRONG DAY, WITH NO ANSWER.
 *
 * The sales board ("Sales team, Q3"), 2 October 2026, as Rukia Otieno, who runs it, read it:
 *   "Sign 12 shops for kitchen appliances in Nairobi."
 *   "You want us to sign 12 shops by 20 December."
 *   "You want to get 12 shops onboarded."
 * and above them "Will we sign 12 shops for kitchen appliances in Nairobi by 13 December?" with no answer
 * and no bar. One aim: the team's, and Rukia saying it again twice, each kept as her own target because it
 * was matched on its exact name. The board then asked by the check-in's last day, not the day she gave, and
 * had no number to answer with, because the team's aim had been kept without the 12 in its name.
 */
/* Stored without a full stop, as the board's headline read it. */
const THE_TEAMS = { name: 'Sign 12 shops for kitchen appliances in Nairobi', target: 12 };

describe('one aim said three times is one target', () => {
  it('"I want us to sign 12 shops by 20 December." and "They want to get 12 shops onboarded." are the team\'s aim said again', () => {
    expect(theAimsThatAreNew([{ name: 'I want us to sign 12 shops by 20 December.', target: 12 }], [THE_TEAMS])).toEqual([]);
    expect(theAimsThatAreNew([{ name: 'They want to get 12 shops onboarded.', target: 12 }], [THE_TEAMS])).toEqual([]);
  });

  it('a different place, or a different number, is still a different aim', () => {
    expect(theAimsThatAreNew([{ name: 'Sign 12 shops in Mombasa.', target: 12 }], [THE_TEAMS]).length).toBe(1);
    expect(theAimsThatAreNew([{ name: 'I am aiming for 3 shops in Kilimani.', target: 3 }], [THE_TEAMS]).length).toBe(1);
  });

  function serviceWith(objectives: any[]) {
    const written: any[] = [];
    const updated: any[] = [];
    const prisma: any = {
      groundObjective: {
        findMany: jest.fn(async ({ where }: any) => objectives.filter((o) => (where.ownerParticipantId === null ? !o.ownerParticipantId : !!o.ownerParticipantId))),
        createMany: jest.fn(async ({ data }: any) => { written.push(...data); return { count: data.length }; }),
        update: jest.fn(async (args: any) => { updated.push(args); return {}; }),
      },
    };
    const svc = Object.create(ConversationService.prototype) as any;
    svc.prisma = prisma;
    svc.logger = { log: () => undefined, warn: () => undefined };
    return { svc, written, updated };
  }

  it('the lead restating the team\'s aim writes no target of her own, and the day she gave goes on the aim', async () => {
    const { svc, written, updated } = serviceWith([{ id: 'o-team', ...THE_TEAMS, ownerParticipantId: null, dueOn: null }]);
    const landed = await svc.putOwnedTargetsOnTheRecord('g-sales', [
      { participantId: 'p-rukia', name: 'I want us to sign 12 shops by 20 December.', target: 12 },
      { participantId: 'p-rukia', name: 'They want to get 12 shops onboarded.', target: 12 },
    ], 'p-rukia');
    expect(landed).toEqual([]);
    expect(written).toEqual([]);
    expect(updated).toHaveLength(1);
    expect(updated[0].where).toEqual({ id: 'o-team' });
    const due: Date = updated[0].data.dueOn;
    expect([due.getUTCDate(), due.getUTCMonth()]).toEqual([20, 11]);
  });

  it('Amani\'s own aim of 3 shops in Kilimani is still hers', async () => {
    const { svc, written } = serviceWith([{ id: 'o-team', ...THE_TEAMS, ownerParticipantId: null, dueOn: null }]);
    await svc.putOwnedTargetsOnTheRecord('g-sales', [{ participantId: 'p-amani', name: 'I am aiming for 3 shops in Kilimani.', target: 3 }], 'p-amani');
    expect(written.map((w) => w.name)).toEqual(['I am aiming for 3 shops in Kilimani.']);
  });

  it('a measure the lead names with its number in it keeps the number', () => {
    const p = proposalFrom('targets', { targets: [{ name: THE_TEAMS.name }] } as any, []);
    if (p.kind !== 'targets') throw new Error('wrong kind');
    expect(p.targets[0].target).toBe(12);
    expect(p.say).toContain('12');
  });

  it('the headline asks by the day the lead gave, and answers from the count', () => {
    const h = theHeadlineQuestion([{
      id: 'o-team', name: THE_TEAMS.name, target: 12, count: 2, start: 0, direction: 'AIM' as any, journeyDirection: 'up', word: null, dueDay: '20 December',
    }], new Date('2026-12-13T00:00:00Z'), new Date('2026-10-02T12:00:00Z'))!;
    expect(h.question).toBe('Will we sign 12 shops for kitchen appliances in Nairobi by 20 December?');
    expect(h.answer).toBe('So far it is 2 of 12. 10 more are needed by 20 December.');
    expect(h.bars).toHaveLength(1);
  });
});
