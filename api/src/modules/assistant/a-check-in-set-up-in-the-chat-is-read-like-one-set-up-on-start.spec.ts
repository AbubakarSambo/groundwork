import { PartyType } from '@prisma/client';
import { askGroundwork, textOf } from './request-92-harness';
import { ConversationService } from '../conversation/conversation.service';
import { EXPECTATION_PROMPT } from '../conversation/prompt-library';
import { boardAs, person } from '../board/the-switchboards-sections-harness';

/**
 * A CHECK-IN SET UP IN THE CHAT IS READ LIKE ONE SET UP ON /start (Hafsah, in the browser, 22 November 2026: "it didn't hold").
 *
 * Msingi Foods' lead set up "Updates on sales of 8 freezers and activation of 4 Drop Access points" by talking to Groundwork. It was
 * opened as "a regular read on live work" with no kind of work, none of her targets went on record, and its board said "Nothing is on
 * this board yet". The chat opened it through GroundsService.create and nothing else: her words were never read.
 *
 * Here the lead sets it up in the chat, word for word as she would, and says yes. The model is stubbed with what Gemini returns: the one
 * reading of her words (a sales team), and her set-up's assessment (each agent's 8 freezers and 4 points, as the team's aims). Then the
 * board is served as the lead, as Kito who checks in, and as an admin.
 */
const PEOPLE = [
  person('p-lead', 'u-lead', 'Neema', 'Achieng', PartyType.INITIATOR),
  person('p-kito', 'u-kito', 'Kito', 'Dube'),
  person('p-lerato', 'u-lerato', 'Lerato', 'Nkosi'),
];

const WHAT_SHE_SAID = 'Set up a check-in for my 2 reps. They each sell 8 freezers and activate 4 Drop Access points a week.';

/** What Gemini's assessment of her set-up returns: the team's aims, in her words, with their numbers. */
const aTarget = (aim: string, words: string, target: number) => ({ id: `t-${target}`, aim, words, target, whose: 'The team', saidWordForWord: true });
const HER_SETUP_ASSESSED = [
  aTarget('Each rep sells 8 freezers a week.', 'They each sell 8 freezers', 8),
  aTarget('Each rep activates 4 Drop Access points a week.', 'activate 4 Drop Access points a week', 4),
];

/** The model, as Gemini answers each call this path makes. */
function gemini() {
  return {
    respond: jest.fn(async () => { throw new Error('no composing here'); }),
    extract: jest.fn(async (prompt: string, history: any[]) => {
      /* The one reading of the situation and the kind (which-situation-this-is.ts). */
      if (/say which situation it is, how sure you are, and what kind of work/.test(prompt)) return { scenario: 'PULSE_CHECK', confidence: 'low', kind: 'sales team' };
      /* What she said about the check-in she is setting up (a-check-in-set-up-by-talking.ts). */
      if (/Somebody is setting up a check-in in Groundwork, by chat/.test(prompt)) {
        const said = String(history?.[0]?.content ?? '');
        return /freezers/.test(said) ? { updatesOn: 'sales of 8 freezers and activation of 4 Drop Access points' } : null;
      }
      /* Each person's own number: nobody is named in what she typed, so nobody's own. */
      if (prompt === EXPECTATION_PROMPT) return { expectations: [] };
      return null;
    }),
  };
}

function theChat() {
  const db = { ground: null as any, objectives: [] as any[], held: [] as any[], setupWords: null as any, kindRead: null as any };
  const engine = gemini();
  const h = askGroundwork({ userId: 'u-lead', role: 'MEMBER', engine, participants: [{ groundId: 'g-old', partyType: 'INITIATOR' }] });
  const kept: any[] = [];
  h.prisma.assistantProposal.create = jest.fn(async ({ data }: any) => { const r = { id: `pr${kept.length + 1}`, state: 'PARKED', createdAt: new Date(), ...data }; kept.push(r); return r; });
  h.prisma.assistantProposal.findFirst = jest.fn(async () => [...kept].reverse().find((r) => r.state === 'PARKED') ?? null);
  h.prisma.assistantProposal.update = jest.fn(async ({ where, data }: any) => Object.assign(kept.find((r) => r.id === where.id) ?? {}, data));
  h.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: 'u-lead', displayName: 'Neema Achieng', active: true, linkedUserId: 'u-lead' }));
  h.prisma.person.findMany = jest.fn(async ({ where }: any) => (where?.active === false ? [] : [{ externalId: 'u-lead', displayName: 'Neema Achieng', managerExternalId: null, active: true, email: 'neema@msingi.test' }]));
  /* The new check-in, as the database would hold it once opened. */
  h.prisma.ground.findUnique = jest.fn(async () => db.ground);
  h.prisma.groundParticipant.findFirst = jest.fn(async ({ where }: any) => (where?.userId === 'u-lead' ? { id: 'p-lead' } : null));
  h.prisma.checkIn.findFirst = jest.fn(async () => ({ id: 'c-lead-1', sessionNumber: 1 }));
  h.prisma.leadSetupWords = { upsert: jest.fn(async ({ create }: any) => { db.setupWords = create; return create; }), findUnique: jest.fn(async () => db.setupWords) };
  (h.service as any).truth = { forPerson: async () => ({ person: { externalId: 'u-lead' }, sessions: { value: [] } }) };

  /* GroundsService's writers, as the chat calls them. */
  (h.service as any).grounds = {
    create: jest.fn(async (_o: string, _u: string, dto: any) => {
      db.ground = { id: 'g-new', initiatorId: 'u-lead', organizationId: 'org-a', peopleWorkTogether: true, participants: PEOPLE, scenario: dto.scenario, kindOfWork: dto.kindOfWork ?? null, label: dto.label };
      return { id: 'g-new' };
    }),
    addParticipant: jest.fn(async (_g: string, _o: string, _u: string, dto: any) => ({ id: dto.email.startsWith('kito') ? 'p-kito' : 'p-lerato' })),
    addTheirWhatsAppNumber: jest.fn(async () => ({ said: 'kept' })),
    keepWhatSetupGave: jest.fn(async () => undefined),
  };

  /* The conversation's own writers, the real ones, on the same record. */
  const conversationDb: any = new Proxy({
    ground: { findUnique: jest.fn(async () => ({ ...db.ground, organization: { release1SalesBoardOn: true } })) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true })) },
    conversationTurn: { findMany: jest.fn(async () => []) },
    groundObjective: {
      count: jest.fn(async () => db.objectives.length), findMany: jest.fn(async () => db.objectives.map((o) => ({ ...o }))),
      createMany: jest.fn(async (a: any) => { db.objectives.push(...a.data); return { count: a.data.length }; }),
      create: jest.fn(async (a: any) => { db.objectives.push(a.data); return a.data; }), update: jest.fn(async () => ({})),
    },
    planProposal: { findMany: jest.fn(async () => db.held.map((x) => ({ fields: x.fields }))), create: jest.fn(async (a: any) => { db.held.push(a.data); return a.data; }) },
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), create: jest.fn(async (a: any) => a), update: jest.fn(async (a: any) => a), createMany: jest.fn(async () => ({ count: 0 })), updateMany: jest.fn(async () => ({ count: 0 })), upsert: jest.fn(async (a: any) => a.create) };
      }
      return target[prop];
    },
  });
  const conversation: any = new ConversationService(conversationDb, {} as any, engine as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  /* Her set-up's assessment is Gemini's, stubbed; what is kept from it is the conversation's own writer. */
  conversation.assessAndThenRead = jest.fn(async (checkIn: any, how: any) => {
    await conversation.keepTheAimsTheySaid(checkIn, { about: { isTheLead: true, who: 'Neema Achieng', checkInId: checkIn.id, groundId: checkIn.groundId, participantId: checkIn.participantId }, targets: HER_SETUP_ASSESSED }, how.setup);
  });
  (h.service as any).conversation = conversation;
  (h.service as any).events = { emit: jest.fn() };

  const say = async (m: string) => textOf(await h.service.respond('org-a', 'p1', m));
  /* What runs after the reply (nothing holds it) has finished. */
  const settled = async () => { for (let i = 0; i < 50; i++) await new Promise((r) => setImmediate(r)); };
  return { say, settled, db, grounds: (h.service as any).grounds, conversation };
}

async function theBoardAs(db: any, userId: string, role: string) {
  const objectives = db.objectives.map((o: any, i: number) => ({ id: `o-${i}`, groundId: 'g-1', count: 0, prevCount: 0, sortOrder: i, addedAtSession: null, ...o }));
  return boardAs({ people: PEOPLE, initiatorId: 'u-lead', label: db.ground?.label, scenario: db.ground?.scenario, objectives, checkIns: [], kindOfWork: db.ground?.kindOfWork ?? null }, userId, role);
}

describe('a check-in set up in the chat, as Neema at Msingi Foods sets it up', () => {
  async function setItUp() {
    const chat = theChat();
    const said: string[] = [];
    said.push(await chat.say(WHAT_SHE_SAID));
    said.push(await chat.say('Kito Dube kito@msingi.test\nLerato Nkosi lerato@msingi.test'));
    said.push(await chat.say('Every week'));
    said.push(await chat.say('yes'));
    await chat.settled();
    return { ...chat, said };
  }

  it('is said back and opened as a sales team, with her words kept, and her targets on record with nothing waiting for a card', async () => {
    const { said, grounds, db, conversation } = await setItUp();
    expect(said[2]).toBe('Here is the check-in I will open. It is called "Updates on sales of 8 freezers and activation of 4 Drop Access points", and it asks for updates on sales of 8 freezers and activation of 4 Drop Access points. I will run it as a check-in to set goals and keep the team on track. Kito Dube (kito@msingi.test) and Lerato Nkosi (lerato@msingi.test) will be in it, and each of them will be emailed an invitation. They will check in every week. Shall I open it?');
    expect(said[3]).toBe('I have opened "Updates on sales of 8 freezers and activation of 4 Drop Access points". Kito Dube and Lerato Nkosi have been invited.');
    expect(grounds.create.mock.calls[0][2]).toEqual(expect.objectContaining({ scenario: 'OKR_ALIGNMENT', kindOfWork: 'sales team', cadence: 'WEEKLY' }));
    expect(db.setupWords?.text).toContain('They each sell 8 freezers and activate 4 Drop Access points a week.');
    /* Read as /start reads a set-up: assessed as set-up, her targets read from her words, then what else set-up gave. */
    expect(conversation.assessAndThenRead).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-lead-1', participantId: 'p-lead', groundId: 'g-new' }), expect.objectContaining({ howItEnded: 'setup saved', setup: expect.objectContaining({ words: expect.arrayContaining([WHAT_SHE_SAID]) }) }));
    expect(grounds.keepWhatSetupGave).toHaveBeenCalledWith('g-new', 'u-lead', 'c-lead-1');
    expect(db.held).toEqual([]);
    expect(db.objectives.map((o: any) => [o.name, o.target, o.ownerParticipantId])).toEqual([
      ['Each rep sells 8 freezers a week.', 8, null],
      ['Each rep activates 4 Drop Access points a week.', 4, null],
    ]);
  });

  it('the lead, Kito and an admin each read a sales board with her two targets, and nobody reads that nothing is on it', async () => {
    const { db } = await setItUp();
    for (const [userId, role] of [['u-lead', 'MEMBER'], ['u-kito', 'MEMBER'], ['u-admin', 'ADMIN']] as const) {
      const b = await theBoardAs(db, userId, role);
      const served = JSON.stringify(b);
      expect(b.kindOfWork).toBe('sales team');
      expect((b.objectives ?? []).map((o: any) => o.name)).toEqual(['Each rep sells 8 freezers a week.', 'Each rep activates 4 Drop Access points a week.']);
      expect((b.objectives ?? []).map((o: any) => o.target)).toEqual([8, 4]);
      expect(served).not.toContain('Nothing is on this board yet');
      expect(served).not.toContain('No targets set yet');
    }
  });
});
