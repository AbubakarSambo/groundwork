import { AskService } from './ask.service';
import { askStartersFor, askFirstWelcome } from '../assistant/ask-name';

/**
 * THE QUESTIONS ASK SUGGESTS ARE THE ONES IT CAN ANSWER THIS PERSON (review of the starters).
 *
 * Read as each person is served them. Miriam is a member and takes part in a check-in; Leah leads one; Gus is a guest in "Kenya launch"; Nia has no check-in;
 * Hana is held for a seat on hers. Leave and spending are offered only where the organisation has them on, the company's priorities never to a guest, adding
 * context only to somebody who runs a check-in, and the check-in questions only for a check-in the person can use.
 */
let held = new Set<string>();
jest.mock('../participants/held-for-a-seat', () => ({ theCheckInsHeldForASeat: async () => held }));

type Who = { userId: string; role: 'MEMBER' | 'GUEST'; grounds: { id: string; label: string; initiatorId: string; managingOnly?: boolean; ended?: boolean }[] };

function ask(who: Who, suitesOn: string[], contextOn = false) {
  const mine = who.grounds.filter((g) => !g.ended);
  const prisma: any = {
    organizationMembership: { findUnique: jest.fn(async () => ({ role: who.role })) },
    person: { findFirst: jest.fn(async () => ({ id: 'pp', externalId: 'x' })) },
    user: { findUnique: jest.fn(async () => ({ isEmailVerified: true })) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Baridi' })) },
    organizationSuite: { findMany: jest.fn(async () => suitesOn.map((suite) => ({ suite }))) },
    assistantTurn: { findMany: jest.fn(async () => []) },
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: contextOn } } : null)) },
    ground: { findMany: jest.fn(async () => mine.map((g) => ({ id: g.id, label: g.label, initiatorId: g.initiatorId, createdByUserId: null }))) },
    groundParticipant: { findMany: jest.fn(async () => mine.filter((g) => g.initiatorId !== who.userId).map((g) => ({ groundId: g.id, managingOnly: !!g.managingOnly }))) },
  };
  return new AskService(prisma, {} as any, {} as any, {} as any);
}
const asker = (w: Who) => ({ userId: w.userId, email: `${w.userId}@x.test`, organizationId: 'org', role: w.role }) as any;
const read = async (w: Who, suites: string[], context = false) => (await ask(w, suites, context).forReader(asker(w), null)) as any;

const SALES = { id: 'g1', label: 'Sales team, Q4', initiatorId: 'u-lead' };
const miriam: Who = { userId: 'u-miriam', role: 'MEMBER', grounds: [SALES] };
const leah: Who = { userId: 'u-lead', role: 'MEMBER', grounds: [SALES] };
const gus: Who = { userId: 'u-gus', role: 'GUEST', grounds: [{ id: 'g2', label: 'Kenya launch', initiatorId: 'u-other' }] };
const nia: Who = { userId: 'u-nia', role: 'MEMBER', grounds: [] };

beforeEach(() => { held = new Set(); });

describe('a member with no suites on', () => {
  it('is never offered leave or spending, in the starters or the welcome', async () => {
    const r = await read(miriam, []);
    expect(r.starters).toEqual(['What did I say I would do?', 'What is my check-in for, and who reads it?', 'When is my next check-in?', "What are the company's priorities right now?"]);
    expect(r.welcome).toBe('This is Ask Baridi. I answer about the whole organisation and about your own work, and you can point me at one of your check-ins whenever you want to. Ask me about the company, about your work, or about your check-ins. What you ask me stays private.');
    expect(JSON.stringify(r)).not.toMatch(/leave|spend/i);
  });
});

describe('a member with leave on', () => {
  it('is offered leave, and not spending', async () => {
    const r = await read(miriam, ['leave']);
    expect(r.starters).toContain('Ask for leave.');
    expect(r.starters.join(' ')).not.toMatch(/spend/);
    expect(r.welcome).toContain('Ask me about the company, about your work, or about your check-ins. You can also ask me for leave.');
  });
  it('with both on, is offered both in one line', async () => {
    expect((await read(miriam, ['leave', 'spend'])).starters).toContain('Ask for leave, or to spend money.');
    expect((await read(miriam, ['spend'])).starters).toContain('Ask to spend money.');
  });
});

describe('a guest', () => {
  it('is offered only what is about their own check-in, and is welcomed as a guest', async () => {
    const r = await read(gus, ['leave', 'spend'], true);
    expect(r.starters).toEqual(['What did I say I would do?', 'What is my check-in for, and who reads it?', 'When is my next check-in?']);
    expect(r.welcome).toBe('This is Ask Baridi. You are a guest here, so I answer you only about your own check-in. What you ask me stays private.');
    expect(JSON.stringify(r.starters)).not.toMatch(/company|priorities|leave|spend|context/i);
  });
});

describe('somebody with no check-in', () => {
  it('is left with the company question, and leave only if it is on', async () => {
    expect((await read(nia, [])).starters).toEqual(["What are the company's priorities right now?"]);
    expect((await read(nia, ['leave'])).starters).toEqual(["What are the company's priorities right now?", 'Ask for leave.']);
  });
});

describe('somebody held for a seat, and a check-in that has ended', () => {
  it('is not offered the check-in questions for a check-in they are refused, and it is not in their list', async () => {
    held = new Set(['g1']);
    const r = await read(miriam, []);
    expect(r.about).toEqual([]);
    expect(r.starters).toEqual(["What are the company's priorities right now?"]);
  });
  it('an ended check-in offers nothing', async () => {
    const ended: Who = { ...miriam, grounds: [{ ...SALES, ended: true }] };
    const r = await read(ended, []);
    expect(r.about).toEqual([]);
    expect(r.starters).toEqual(["What are the company's priorities right now?"]);
  });
});

describe('adding context', () => {
  it('is offered to somebody who runs a check-in, and not to a person who only takes part, and not while it is hidden', async () => {
    /* Changed 9 October (request 209): no starter offers it now, because Ask cannot take a document. The page is pointed to by the line under the caption. */
    expect((await read(leah, [], true)).starters).not.toContain('Add a document or some context to my check-in.');
    expect((await read(miriam, [], true)).starters).not.toContain('Add a document or some context to my check-in.');
    expect((await read(leah, [], false)).starters).not.toContain('Add a document or some context to my check-in.');
  });
  it('and a lead who only runs it is not offered "what did I say I would do", which is about a check-in they take part in', async () => {
    const r = await read(leah, [], true);
    expect(r.starters).not.toContain('What did I say I would do?');
    expect(r.starters).not.toContain('When is my next check-in?');
    expect(r.starters).toContain('What is my check-in for, and who reads it?');
  });
});

describe('the words themselves', () => {
  it('the pure rule agrees', () => {
    expect(askStartersFor({ isAGuest: false, takesPartInOne: false, hasOneToUse: false, runsOne: false, leaveIsOn: false, spendingIsOn: false, contextIsHere: true })).toEqual(["What are the company's priorities right now?"]);
    expect(askFirstWelcome('Baridi', false, { leaveIsOn: true, spendingIsOn: true })).toContain('You can also ask me for leave or to spend money.');
  });
});
