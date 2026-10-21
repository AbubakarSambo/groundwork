import { ConversationService } from './conversation.service';
import { PartyType, TurnRole } from '@prisma/client';
import { aDayIsNotATarget, theNumberIsOnlyADay } from './a-day-is-not-a-target';

/**
 * Local test of staging, 15 October. Muchemi & Co's lead, Hafsah, said "Matter A defence filed on time on 22 October". Her
 * aim was stored as "Hafsah is aiming for the Matter A defence to be filed on time on 22 October." with the target 22: the
 * day of the month, read as a count. The aim keeps its words and its day, and has no number.
 */
const MATTER_A = 'Hafsah is aiming for the Matter A defence to be filed on time on 22 October.';

describe('a day is not a target', () => {
  it('a number that is only the day of a date is not the target', () => {
    expect(aDayIsNotATarget({ name: MATTER_A, target: 22 })).toEqual({ name: MATTER_A, target: null });
    expect(theNumberIsOnlyADay('Close the audit by October 22nd.', 22)).toBe(true);
    expect(theNumberIsOnlyADay('Hand in the report by 31/12.', 31)).toBe(true);
    expect(theNumberIsOnlyADay('Open the Mombasa branch in 2027.', 2027)).toBe(true);
  });

  it('a count beside a date keeps its number, and so does an aim with no date', () => {
    expect(aDayIsNotATarget({ name: 'File 3 defences by 22 October.', target: 3 }).target).toBe(3);
    expect(aDayIsNotATarget({ name: 'Sign 22 shops by 30 November.', target: 22 }).target).toBe(22);
    expect(aDayIsNotATarget({ name: 'The team is aiming for 40 paid sales.', target: 40 }).target).toBe(40);
    expect(aDayIsNotATarget({ name: 'No missed court dates this term.', target: null }).target).toBeNull();
  });

  it('what reaches the board from her setup: the Matter A aim with no number on it', async () => {
    const participants = [{ id: 'lead', partyType: PartyType.INITIATOR, managingOnly: false, email: 'hafsah@x.test', roleAsDescribed: null, createdAt: new Date('2026-10-15'), user: { firstName: 'Hafsah', lastName: 'Jumare' } }];
    const written: any[] = [];
    const prisma: any = new Proxy({
      ground: { findUnique: jest.fn(async () => ({ participants, peopleWorkTogether: true })) },
      conversationTurn: { findMany: jest.fn(async () => [{ role: TurnRole.PERSON, content: 'Matter A defence filed on time on 22 October, and no missed court dates this term.' }]) },
      groundObjective: { count: jest.fn(async () => 0), findMany: jest.fn(async () => [] as any[]), createMany: jest.fn(async (a: any) => { written.push(...a.data); return { count: a.data.length }; }) },
    }, {
      get(target: any, prop: string) {
        if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
          target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), create: jest.fn(async (a: any) => a), update: jest.fn(async (a: any) => a), createMany: jest.fn(async () => ({ count: 0 })) };
        }
        return target[prop];
      },
    });
    const anthropic: any = { extract: jest.fn(async () => ({ groundAims: [{ name: MATTER_A, target: 22 }], expectations: [], promises: [] })) };
    const svc = new ConversationService(prisma, {} as any, anthropic, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    await svc.extractExpectations('c1', 'lead', 'g1');
    const matterA = written.find((w) => /Matter A/.test(w.name));
    console.log(`ON THE BOARD: ${JSON.stringify(matterA)}`);
    expect(matterA).toBeTruthy();
    expect(matterA.target).toBeNull();
  });
});

describe('the setup conversation says it back without the day as a number', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { proposalFrom } = require('../grounds/what-the-context-chat-heard');
  it('"Matter A defence filed on time on 22 October" is a measure with no number, even when the model gave 22', () => {
    const p: any = proposalFrom('targets', { targets: [{ name: 'Matter A defence filed on time on 22 October', target: 22 }, { name: 'Sign 12 shops by 30 November', target: null }] } as any);
    const targets = p.targets ?? [];
    console.log(`SAID BACK: ${JSON.stringify(targets)}`);
    expect(targets.find((t: any) => /Matter A/.test(t.name))?.target ?? null).toBeNull();
    expect(targets.find((t: any) => /12 shops/.test(t.name))?.target).toBe(12);
  });
});
