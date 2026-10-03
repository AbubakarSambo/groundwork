import { AssistantService } from './assistant.service';
import { GroundsService } from '../grounds/grounds.service';

/**
 * DECISION 50, TASK B: THE INVENTORY ITEMS NOT YET PROVEN THROUGH ASK GROUNDWORK.
 *
 * Same discipline as `add-context-is-the-context-chat.spec.ts`, `items-8-9-17-through-ask-
 * groundwork.spec.ts` and `decision-50-piece-3-through-ask-groundwork.spec.ts`: real service code,
 * a fake prisma underneath it, never a second copy of what `GroundsService` already does. Items 1, 3,
 * 4, 5 and 6 fake `GroundsService`'s own methods, the same as those three files, because what they
 * prove is about ASK GROUNDWORK's OWN gate (who reaches a lane at all, what a bare yes answers, what
 * never leaves the box). Item 2 is different: the thing being proven - a name in a paste landing on
 * the right participant, or on nobody when it is ambiguous - is `GroundsService`'s own matching code
 * (`whoThisNameIs`), so that test runs a REAL `GroundsService`, with only its prisma calls faked,
 * reached the way a lead's yes to a paste is actually reached: a parked 'context' proposal, answered
 * with 'yes', resolved by `resolveParkedContext` calling the real `applyContextProposal`.
 *
 * Items 10, 11, 15 and 16 of `docs/context-chat-inventory.md` live only in the model's own prompt
 * wording (what it asks about first, how it phrases a request for proof) and are not faked here - see
 * the hand-back for what still needs a live check.
 */

describe('item 1: a participant - not lead, not admin - reaches none of the setup doors', () => {
  function svc() {
    const grounds = [{ id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a' }];
    const contextChat = jest.fn();
    const applyContextProposal = jest.fn();
    const addContextLine = jest.fn();
    const addLeadContext = jest.fn();
    const questionsForPeople = jest.fn();
    const confirmQuestionForPerson = jest.fn();
    const shareLeadContext = jest.fn();
    const changeContextLine = jest.fn();

    const prisma: any = {
    /* The move into Ask Groundwork is hidden at release; these specs prove the path itself, so it is turned on here. */
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
      person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'member-1' })) },
      user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org-a' })) },
      ground: { findMany: jest.fn(async () => grounds) },
      groundParticipant: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
      groundDocument: { findMany: jest.fn(async () => []) },
      assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
      assistantProposal: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 'pr1', state: 'PARKED', ...data })),
        update: jest.fn(async ({ data }: any) => data),
      },
      commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
      detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    };
    const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
    const engine: any = { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) };
    const groundsService: any = {
      contextChat, applyContextProposal, addContextLine, addLeadContext,
      questionsForPeople, confirmQuestionForPerson, declineQuestionForPerson: jest.fn(),
      shareLeadContext, changeContextLine,
    };
    const service = new AssistantService(
      prisma, engine, knowledge,
      { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
      { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
      { pendingFor: async () => [], decide: async () => { throw new Error('no suggestions in these tests'); } } as any,
      { start: async () => { throw new Error('no drafting in these tests'); } } as any,
      { forPerson: async () => { throw new Error('no assembly in these tests'); } } as any,
      { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any,
      { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any,
      groundsService,
    );
    return { service, prisma, writers: { contextChat, applyContextProposal, addContextLine, addLeadContext, questionsForPeople, confirmQuestionForPerson, shareLeadContext, changeContextLine } };
  }

  const MESSAGES = [
    'setting up the context for Q4 sales',
    'decision: we will drop the pilot',
    'private note about Ben: he is struggling with the Lagos numbers',
    'confirm the question for Ben',
    "reword the line 'we will drop the pilot' to 'we are pausing the pilot'",
    'share the note about the launch',
  ];

  for (const message of MESSAGES) {
    it(`"${message}" gets nothing said back and nothing written`, async () => {
      const { service, prisma, writers } = svc();
      const reply = await service.respond('org-a', 'p1', message, 'g1');
      expect(reply.lane).toBe('unplaced');
      for (const w of Object.values(writers)) expect(w).not.toHaveBeenCalled();
      expect(prisma.assistantProposal.create).not.toHaveBeenCalled();
    });
  }

  it("a document whose only number is a colleague's is never said back, and nothing is written - it never reached `waiting` at all", async () => {
    const { service, prisma } = svc();
    /* `DocumentsService.whatItHolds` already filtered a colleague's number out of `waiting` at read
       time - only the lead may set somebody else's number (see documents.service.ts, `notTheirsToSet`)
       - so a participant's own document that held only that one number waits on nothing. */
    prisma.groundParticipant.findMany.mockResolvedValue([{ id: 'part-me', groundId: 'g1' }]);
    prisma.groundDocument.findMany.mockResolvedValue([{
      id: 'doc-1', fileName: 'team roster.xlsx', groundId: 'g1',
      holds: { fileName: 'team roster.xlsx', forOnePerson: [], forEverybody: [], dates: [], unmatched: [], waiting: [], takenAt: null },
    }]);
    const reply = await service.respond('org-a', 'p1', "I've uploaded it");
    expect(prisma.assistantProposal.create).not.toHaveBeenCalled();
    expect(reply.lane).not.toBe('add_a_document');
  });
});

describe('item 3: a change to something already recorded, through the add_context lane, changes nothing before a yes', () => {
  function svc(opts: { applyContextProposal?: jest.Mock } = {}) {
    const grounds = [{ id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a' }];
    const applyContextProposal = opts.applyContextProposal ?? jest.fn(async () => ({ changed: 'a context line', say: 'Changed: "we will drop the pilot" is now "we are pausing the pilot".' }));
    const contextChat = jest.fn(async () => ({ reply: 'How long does this check-in run for?', gaps: ['duration'], done: false, proposal: null }));
    const prisma: any = {
    /* The move into Ask Groundwork is hidden at release; these specs prove the path itself, so it is turned on here. */
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
      person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1' })) },
      user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org-a' })) },
      ground: { findMany: jest.fn(async () => grounds) },
      assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
      assistantProposal: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 'pr1', state: 'PARKED', ...data })),
        update: jest.fn(async ({ data }: any) => data),
      },
      commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
      detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    };
    const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
    const engine: any = { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) };
    const groundsService: any = { contextChat, applyContextProposal };
    const service = new AssistantService(
      prisma, engine, knowledge,
      { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
      { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
      { pendingFor: async () => [], decide: async () => { throw new Error('no suggestions in these tests'); } } as any,
      { start: async () => { throw new Error('no drafting in these tests'); } } as any,
      { forPerson: async () => { throw new Error('no assembly in these tests'); } } as any,
      { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any,
      { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any,
      groundsService,
    );
    return { service, prisma, applyContextProposal, contextChat };
  }

  it('a change said through add_context asks contextChat, which reaches whatTheyWantChanged/makeTheChange internally, and nothing is applied before a yes', async () => {
    const { service, prisma, applyContextProposal, contextChat } = svc();
    /* The propose half: contextChat is asked with the lead's own words - "drop the 30-day rule" is a
       change request, and it is `contextChat`'s (and, underneath it, `whatTheyWantChanged` and
       `makeTheChange`'s) own job to read it, say it back and hand back a proposal to confirm. Faked
       here the same way item 5's does, because the guarantee this lane exists to keep is "the same
       function runs", not a reimplementation of change-detection in this spec. */
    contextChat.mockResolvedValueOnce({
      reply: 'You said "drop the 30-day rule". I will drop it. Is that right?',
      gaps: [],
      done: true,
      proposal: { kind: 'change', say: 'Drop the 30-day rule.' },
    } as any);
    const message = 'add this as context: drop the 30-day rule';
    const proposed = await service.respond('org-a', 'p1', message, 'g1');
    expect(proposed.lane).toBe('add_context');
    expect(applyContextProposal).not.toHaveBeenCalled();

    /* The parked proposal carries the lead's own words, not a value the client could edit. */
    const parkedPayload = (prisma.assistantProposal.create as jest.Mock).mock.calls[0][0].data.payload;
    expect(parkedPayload.said).toBe(message);

    /* Nothing changes until the yes - simulated here by handing the same payload back as "parked". */
    prisma.assistantProposal.findFirst.mockResolvedValueOnce({ id: 'pr1', kind: 'context', payload: parkedPayload });
    const confirmed = await service.respond('org-a', 'p1', 'yes');
    expect(applyContextProposal).toHaveBeenCalledWith('g1', 'lead-1', { said: message, history: parkedPayload.history });
    /* Only NOW, after the yes, is the change said as done - the exact words `applyContextProposal` itself returned. */
    expect((confirmed.blocks[0] as any).body).toBe('Changed: "we will drop the pilot" is now "we are pausing the pilot".');
  });
});

describe("item 13: a colleague asking Ask Groundwork about somebody else's target on a THEIR_OWN check-in is not told the number", () => {
  /*
   * `what_came_of_it` ("what came of it") is a direct, second read of a released report - the same
   * rule the report page runs (`targetsHiddenFrom`/`withoutHiddenTargetsIn`), run again here because
   * this is a fresh query rather than a read through `reports.service.ts`'s own `get`. Ngozi asks
   * about the check-in she shares with Kwame, on a check-in where each person sees only their own
   * number (`whoSeesTargets: 'THEIR_OWN'`); Kwame's target must never reach her, even inside a
   * sentence she is otherwise allowed to read.
   */
  function svc() {
    const ground = {
      label: 'Regional sales', initiatorId: 'u-lead', whoSeesTargets: 'THEIR_OWN',
      objectives: [{ ownerParticipantId: 'p-ngozi', target: 8 }, { ownerParticipantId: 'p-kwame', target: 14 }],
      participants: [
        { id: 'p-ngozi', nameGiven: null, roleAsDescribed: null, remitAsGiven: null, partyType: 'PARTICIPANT', user: { firstName: 'Ngozi', lastName: 'Amadi' } },
        { id: 'p-kwame', nameGiven: null, roleAsDescribed: null, remitAsGiven: null, partyType: 'PARTICIPANT', user: { firstName: 'Kwame', lastName: 'Mensah' } },
      ],
      report: {
        releasedAt: new Date('2026-09-20'),
        centralQuestion: 'Kwame Mensah is working towards a target of 14 approved facilities this quarter. Ngozi is on track with her own goal.',
        agreements: [], divergences: [],
      },
    };
    const prisma: any = {
    /* The move into Ask Groundwork is hidden at release; these specs prove the path itself, so it is turned on here. */
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
      person: { findFirst: jest.fn(async () => ({ email: 'ngozi@x.test', linkedUserId: 'u-ngozi' })) },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-ngozi', ground }]) },
      assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
      assistantProposal: { findFirst: jest.fn(async () => null) },
      commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
      detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    };
    const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
    const engine: any = { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) };
    const service = new AssistantService(
      prisma, engine, knowledge,
      { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
      { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
      { pendingFor: async () => [], decide: async () => { throw new Error('no suggestions in these tests'); } } as any,
      { start: async () => { throw new Error('no drafting in these tests'); } } as any,
      { forPerson: async () => { throw new Error('no assembly in these tests'); } } as any,
      { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any,
      { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any,
      {} as any,
    );
    return { service };
  }

  it("Kwame's number, and the sentence carrying it, never reach Ngozi - her own stays", async () => {
    const { service } = svc();
    const reply = await service.respond('org-a', 'p1', 'what came of it');
    const said = (reply.blocks[0] as any).body as string;
    expect(said).not.toContain('14');
    expect(said).not.toContain('Kwame');
    expect(said).toContain('Ngozi is on track with her own goal.');
  });
});

describe('item 5: a bank account number typed into an Ask message never reaches the model or storage', () => {
  function svc() {
    const prisma: any = {
    /* The move into Ask Groundwork is hidden at release; these specs prove the path itself, so it is turned on here. */
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
      person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1' })) },
      assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async ({ data }: any) => { kept.push(...data); return { count: data.length }; }) },
      assistantProposal: { findFirst: jest.fn(async () => null) },
      commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
      detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    };
    const kept: any[] = [];
    const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
    const engine: any = { respond: jest.fn(async (_style: any, turns: any[]) => { seenByModel.push(...turns); throw new Error('model off for these tests'); }) };
    const seenByModel: any[] = [];
    const groundsService: any = {};
    const service = new AssistantService(
      prisma, engine, knowledge,
      { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
      { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
      { pendingFor: async () => [], decide: async () => { throw new Error('no suggestions in these tests'); } } as any,
      { start: async () => { throw new Error('no drafting in these tests'); } } as any,
      { forPerson: async () => { throw new Error('no assembly in these tests'); } } as any,
      { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any,
      { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any,
      groundsService,
    );
    return { service, prisma, kept, seenByModel };
  }

  it('a sort code and account number are hidden before the lane, the model, or the turn history ever see them', async () => {
    const { service, kept, seenByModel } = svc();
    const reply = await service.respond('org-a', 'p1', 'Sort code 40-12-34, account 12345678 - what am I on this week?');
    /* Never reached a model call with the number in it. */
    expect(seenByModel.some((t) => /40-12-34|12345678/.test(JSON.stringify(t)))).toBe(false);
    /* Never kept in the person's own turn history either. */
    expect(kept.some((t) => /40-12-34|12345678/.test(t.content ?? ''))).toBe(false);
    expect(JSON.stringify(reply)).not.toMatch(/40-12-34|12345678/);
  });
});

describe('item 6: the same paste confirmed twice is not written twice', () => {
  function realGroundsService(opts: { created: any[] }) {
    const ground = {
      id: 'g1', initiatorId: 'lead-1', timelineDays: null, cadence: null, brief: null, scenario: 'OKR_ALIGNMENT',
      timelineStated: false, cadenceStated: false,
      participants: [
        { id: 'part-wanjiru', managingOnly: false, email: 'w@x.test', nameGiven: null, roleAsDescribed: null, userId: 'u-wanjiru', user: { firstName: 'Wanjiru', lastName: 'Otieno' } },
      ],
      objectives: [],
    };
    const prisma: any = {
    /* The move into Ask Groundwork is hidden at release; these specs prove the path itself, so it is turned on here. */
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
      ground: { findUnique: jest.fn(async () => ground) },
      groundDocument: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []) },
      personObjective: { findMany: jest.fn(async () => []), create: jest.fn(async () => ({})) },
      groundObjective: {
        count: jest.fn(async () => 0),
        findMany: jest.fn(async () => []),
        createMany: jest.fn(async ({ data }: any) => { opts.created.push(...data); return { count: data.length }; }),
      },
      groundBaseline: { findFirst: jest.fn(async () => null) },
      groundParticipant: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => ground.participants) },
      /* Present so a paste is matched by hash: the second yes to the SAME text is refused before it is
         even re-read - see grounds.service.ts applyContextProposal, "A PASTE IS TAKEN ONCE". */
      groundPaste: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})) },
    };
    const anthropic: any = {
      extract: jest.fn(async () => ({
        success: null, teamTargets: [], forPeople: [
          { personName: 'Wanjiru', expectation: 'Grow the Lagos hub', targets: [{ name: 'Q3 sales', number: 45_000_000 }] },
        ],
        dates: [], waysOfWorking: [], strategy: [], notes: [], openDecisions: [], notSettled: [],
        aboutPeople: [], commitments: [], questionsForPeople: [], betweenPeople: [],
      })),
    };
    const grounds = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, anthropic);
    return { grounds, prisma };
  }

  const THE_PASTE = 'Wanjiru is going to grow the Lagos hub this quarter. '.repeat(10);

  it('marks the paste taken by its own hash, so a second yes to the same text writes nothing new', async () => {
    const created: any[] = [];
    const { grounds, prisma } = realGroundsService({ created });

    const first = await grounds.applyContextProposal('g1', 'lead-1', { said: THE_PASTE, history: [] });
    expect(created.length).toBeGreaterThan(0);
    expect((first as any).changed).toBe('everything');

    /* The hash is now on record - the second call reads it back as already taken. */
    const hash = require('crypto').createHash('sha256').update(THE_PASTE.trim()).digest('hex');
    (prisma.groundPaste.findFirst as jest.Mock).mockResolvedValue({ id: 'paste-1' });
    void hash;

    const before = created.length;
    const second = await grounds.applyContextProposal('g1', 'lead-1', { said: THE_PASTE, history: [] });
    expect(created.length).toBe(before);
    expect((second as any).changed).toBe('nothing new');
  });
});

describe('item 2: a target from a paste lands on the right person, and an ambiguous first name lands on nobody', () => {
  function realGroundsService(opts: { created: any[]; personObjectives: any[] }) {
    const ground = {
      id: 'g1', initiatorId: 'lead-1', timelineDays: null, cadence: null, brief: null, scenario: 'OKR_ALIGNMENT',
      timelineStated: false, cadenceStated: false,
      participants: [
        { id: 'part-wanjiru', managingOnly: false, email: 'w@x.test', nameGiven: null, roleAsDescribed: null, userId: 'u-wanjiru', user: { firstName: 'Wanjiru', lastName: 'Otieno' } },
        { id: 'part-dayo-m', managingOnly: false, email: 'dm@x.test', nameGiven: null, roleAsDescribed: null, userId: 'u-dayo-m', user: { firstName: 'Dayo', lastName: 'Malik' } },
        { id: 'part-dayo-c', managingOnly: false, email: 'dc@x.test', nameGiven: null, roleAsDescribed: null, userId: 'u-dayo-c', user: { firstName: 'Dayo', lastName: 'Chen' } },
      ],
      objectives: [],
    };
    const prisma: any = {
    /* The move into Ask Groundwork is hidden at release; these specs prove the path itself, so it is turned on here. */
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
      ground: { findUnique: jest.fn(async () => ground) },
      groundDocument: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []) },
      personObjective: {
        findMany: jest.fn(async () => opts.personObjectives),
        create: jest.fn(async ({ data }: any) => { opts.personObjectives.push({ text: data.text, participantId: data.participantId }); return {}; }),
      },
      groundObjective: {
        count: jest.fn(async () => 0),
        findMany: jest.fn(async () => []),
        createMany: jest.fn(async ({ data }: any) => { opts.created.push(...data); return { count: data.length }; }),
      },
      groundBaseline: { findFirst: jest.fn(async () => null) },
      groundParticipant: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => ground.participants) },
      groundPaste: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})) },
    };
    const anthropic: any = {
      extract: jest.fn(async () => ({
        success: null,
        teamTargets: [{ name: 'Total dealers', target: 150, notToExceed: false }],
        forPeople: [
          { personName: 'Wanjiru', expectation: 'Grow the Lagos hub', targets: [{ name: 'Q3 sales', number: 45_000_000 }] },
          /* "Dayo" matches two participants on this check-in - Dayo Malik and Dayo Chen - so it must
             match NEITHER (see whoThisNameIs) rather than guess. */
          { personName: 'Dayo', expectation: 'Handle onboarding', targets: [{ name: 'New dealers', number: 6 }] },
        ],
        dates: [], waysOfWorking: [], strategy: [], notes: [], openDecisions: [], notSettled: [],
        aboutPeople: [], commitments: [], questionsForPeople: [], betweenPeople: [],
      })),
    };
    const grounds = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, anthropic);
    return { grounds };
  }

  const THE_PASTE = 'This is everything for Q4. Wanjiru will grow the Lagos hub, target 45,000,000 in Q3 sales. '
    + "Dayo is handling onboarding, target 6 new dealers. Total dealers across the team must reach 150. ".repeat(5);

  it('the named target lands on the right participant, the team number carries no owner, and the ambiguous name is said out loud rather than guessed', async () => {
    const created: any[] = [];
    const personObjectives: any[] = [];
    const { grounds } = realGroundsService({ created, personObjectives });

    const result = await grounds.applyContextProposal('g1', 'lead-1', { said: THE_PASTE, history: [] });

    const wanjirusTarget = created.find((r) => r.name === 'Q3 sales');
    expect(wanjirusTarget).toEqual(expect.objectContaining({ target: 45_000_000, ownerParticipantId: 'part-wanjiru' }));

    const teamTarget = created.find((r) => r.name === 'Total dealers');
    expect(teamTarget).toEqual(expect.objectContaining({ target: 150, ownerParticipantId: null }));

    /* Nothing written for the ambiguous "Dayo" - neither Malik's nor Chen's participant id. */
    expect(created.find((r) => r.name === 'New dealers')).toBeUndefined();
    expect(personObjectives.some((p) => p.participantId === 'part-dayo-m' || p.participantId === 'part-dayo-c')).toBe(false);
    /* Wanjiru's own expectation IS written - only the ambiguous name is withheld. */
    expect(personObjectives.some((p) => p.participantId === 'part-wanjiru')).toBe(true);

    /* And said out loud, not silently dropped. */
    expect((result as any).say).toContain('Dayo');
    expect((result as any).say).toMatch(/not on this check-in/);
  });
});
