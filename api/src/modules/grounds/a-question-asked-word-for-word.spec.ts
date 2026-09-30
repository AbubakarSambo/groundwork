import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationContextService } from '../conversation/context.service';
import {
  aQuestionAsTheLeadReadsIt, asksItWordForWord, alreadyAsked, NONE_IS_ASKED_UNTIL_YOU_CONFIRM_IT, plainQuestionFrom,
  theExactQuestion, THE_EXACT_QUESTION_TOOL, whatGroundworkWillAsk, whyTheDraftDoesNotHold, withTheQuestionAsConfirmed,
  WRITTEN_BEFORE_YOU_CONFIRMED_EACH_ONE,
} from './a-question-asked-word-for-word';
import { whatWeTookFromThat, A_DUMP_SCHEMA } from './a-dump-is-many-things';
import { theQuestionsTheLeadWants } from '../conversation/what-the-context-already-holds';

/**
 * A QUESTION THE LEAD WANTS PUT TO SOMEBODY, SEEN BY THE LEAD EXACTLY AS IT WILL BE ASKED, CONFIRMED
 * ONE AT A TIME, AND THEN ASKED WORD FOR WORD. Decision 34, 28 September 2026.
 *
 * Every test here reads what somebody is actually handed: the sentence on the lead's list, the card
 * they confirm, what a participant's read of the check-in carries, the prompt the person's own
 * session is given, and the reply the person reads.
 */

const THE_LEADS_DESCRIPTION = 'Ngozi is slow on credit files and may be leaving after Q4';
const THE_LEADS_NOTE = 'She struggles with the Kano branch manager and avoids him';

describe('the sentence a lead reads, before anything is asked', () => {
  it('is one line per question, with the exact question in quotation marks', () => {
    expect(whatGroundworkWillAsk('Ngozi', 'Which accounts actually have a buying process?'))
      .toBe('Groundwork will ask Ngozi: "Which accounts actually have a buying process?"');
  });

  it('the list after a paste shows each exact question and says none is asked until it is confirmed', () => {
    const said = whatWeTookFromThat({
      success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [], waysOfWorking: [], openDecisions: [],
      notSettled: [], aboutPeople: [], commitments: [], betweenPeople: [], strategy: [], notes: [],
      questionsForPeople: [
        { who: 'Ngozi', participantId: 'p1', question: 'whether she sent the Client B proposal', exactQuestion: 'Have you sent the Client B proposal?' },
        { who: 'Tunde', participantId: 'p2', question: 'which accounts actually have a buying process?', exactQuestion: null },
      ],
    }, { asking: true })!;
    expect(said).toContain('Questions you want asked, each one exactly as Groundwork will ask it.');
    expect(said).toContain('- Groundwork will ask Ngozi: "Have you sent the Client B proposal?"');
    expect(said).toContain('- Groundwork will ask Tunde: "Which accounts actually have a buying process?"');
    expect(said).toContain(NONE_IS_ASKED_UNTIL_YOU_CONFIRM_IT);
    expect(said).not.toContain('asked in their own words');
  });

  it('and one question is said as one', () => {
    const said = whatWeTookFromThat({
      success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [], waysOfWorking: [], openDecisions: [],
      notSettled: [], aboutPeople: [], commitments: [], betweenPeople: [], strategy: [], notes: [],
      questionsForPeople: [{ who: 'Ngozi', participantId: 'p1', question: 'x', exactQuestion: 'Have you sent the Client B proposal?' }],
    }, { asking: true })!;
    expect(said).toContain('A question you want asked, exactly as Groundwork will ask it.\n- Groundwork will ask Ngozi: "Have you sent the Client B proposal?"\nThis question is not asked until you confirm it. You can confirm it, change it or leave it out.');
  });
});

describe('the draft is only a proposal, and the product checks it', () => {
  const ctx = { leadQuestion: 'ask her whether she has sent the Client B proposal', name: 'Ngozi', privateWords: [THE_LEADS_DESCRIPTION, THE_LEADS_NOTE] };

  it('a plain question to them, asking what the lead asked, holds', () => {
    expect(whyTheDraftDoesNotHold('Have you sent the Client B proposal?', ctx)).toBeNull();
  });

  it('refuses a draft that says who wants it asked, puts a label on them, or talks about them', () => {
    expect(whyTheDraftDoesNotHold('Your manager wants to know, have you sent the Client B proposal?', ctx)).toBe('it says who wants it asked');
    expect(whyTheDraftDoesNotHold('Since you are at risk, have you sent the Client B proposal?', ctx)).toBe('it puts a label on a person');
    expect(whyTheDraftDoesNotHold('Has Ngozi sent the Client B proposal?', ctx)).toBe('it talks about them rather than to them');
    expect(whyTheDraftDoesNotHold('Has she sent the Client B proposal?', ctx)).toBe('it talks about them rather than to them');
  });

  it("refuses a draft carrying the lead's private description or notes of the person", () => {
    expect(whyTheDraftDoesNotHold('Now that you may be leaving after Q4, have you sent the Client B proposal?', ctx))
      .toBe('it carries words from your private notes');
    expect(whyTheDraftDoesNotHold('Have you sent the Client B proposal, or do you avoid the Kano branch manager?', ctx))
      .toBe('it carries words from your private notes');
  });

  it('refuses a draft that is not a question, is two, or asks something else', () => {
    expect(whyTheDraftDoesNotHold('Tell me about the proposal.', ctx)).toBe('it is not a question');
    expect(whyTheDraftDoesNotHold('Have you sent it? And when?', ctx)).toBe('it is more than one question');
    expect(whyTheDraftDoesNotHold('How was your week?', ctx)).toBe('it asks something other than what you asked');
  });

  it("falls back to the lead's own words made a sentence, never to the failed draft", () => {
    const out = theExactQuestion('Now that you may be leaving after Q4, have you sent the Client B proposal?', ctx);
    expect(out.fromTheDraft).toBe(false);
    expect(out.exactQuestion).toBe('Ask her whether she has sent the Client B proposal?');
    expect(out.exactQuestion).not.toMatch(/leaving|Q4|avoid|Kano/);
    expect(plainQuestionFrom('Amina - which accounts actually have a buying process', 'Amina')).toBe('Which accounts actually have a buying process?');
  });
});

/* ---------------------------------------------------------------------------------------------- */

function aGroundsServiceWith(lines: any[], opts: { drafted?: string; viewerRole?: string } = {}) {
  const participants = [
    { id: 'pN', userId: 'userN', email: 'ngozi@example.test', nameGiven: null, partyType: 'PARTICIPANT', managingOnly: false, roleAsDescribed: THE_LEADS_DESCRIPTION, user: { firstName: 'Ngozi', lastName: 'Balogun' }, createdAt: new Date('2026-09-02') },
    { id: 'pL', userId: 'userLead', email: 'lead@example.test', nameGiven: null, partyType: 'INITIATOR', managingOnly: false, roleAsDescribed: null, user: { firstName: 'Wairimu', lastName: 'Kamau' }, createdAt: new Date('2026-08-31') },
  ];
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'userLead', createdAt: new Date(), scenario: 'OKR_ALIGNMENT',
    status: 'ACTIVE', endState: null, peersVisibleToEachOther: true, timelineDays: null, restrictExternalVisibility: true,
    participants, checkIns: [], resolution: null, patternDetections: [], report: null,
  };
  const pick = (row: any, select?: any) => (select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : row);
  const matches = (row: any, where: any = {}) => Object.entries(where).every(([k, v]) => {
    if (k === 'kind' && v && typeof v === 'object' && 'in' in (v as any)) return (v as any).in.includes(row.kind);
    return v === null ? row[k] == null : row[k] === v;
  });
  const extractCalls: any[] = [];
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: opts.viewerRole ?? 'MEMBER', organizationId: 'org1' })) },
    groundParticipant: {
      findFirst: async ({ where }: any = {}) => participants.find((p) => !where?.id || p.id === where.id) ?? null,
      findMany: async () => participants.map((p) => ({ ...p, checkIns: [] })),
    },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async ({ where }: any = {}) => (where?.participantId === 'pN' ? [{ text: THE_LEADS_NOTE }] : []) },
    checkIn: { aggregate: async () => ({ _max: { sessionNumber: 1 } }), findMany: async () => [], count: async () => 0 },
    groundContextItem: {
      findMany: jest.fn(async ({ where, select }: any = {}) => lines.filter((l) => matches(l, where)).map((l) => pick(l, select))),
      findFirst: jest.fn(async ({ where, select }: any = {}) => { const l = lines.find((x) => matches(x, where)); return l ? pick(l, select) : null; }),
      update: jest.fn(async ({ where, data, select }: any) => { const l = lines.find((x) => x.id === where.id); Object.assign(l, data); return pick(l, select); }),
    },
  };
  const anthropic: any = {
    respond: async () => '',
    extract: jest.fn(async (system: string, history: any[], tool: any) => {
      extractCalls.push({ system, history, tool });
      if (tool.name === THE_EXACT_QUESTION_TOOL.name) return { question: opts.drafted ?? 'Have you sent the Client B proposal?' };
      if (tool.name === (A_DUMP_SCHEMA as any).name) {
        return {
          questionsForPeople: [{ personName: 'Ngozi', question: 'ask her whether she has sent the Client B proposal' }],
          aboutPeople: [{ personName: 'Ngozi', observation: 'drags her feet with the regional office' }],
        };
      }
      return null;
    }),
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, anthropic, { get: () => reports } as any);
  return { service, prisma, extractCalls, lines };
}

const aWaitingQuestion = () => ({
  id: 'q1', groundId: 'g1', kind: 'QUESTION_FOR_PERSON', text: 'ask her whether she has sent the Client B proposal',
  aboutParticipantId: 'pN', audience: 'LEAD_ONLY', closedAt: null, createdAt: new Date('2026-09-28'),
  exactQuestion: 'Have you sent the Client B proposal?', questionConfirmedAt: null,
});
/* Kept before 28 September: the lead's shorthand, and no sentence. */
const anOlderQuestion = () => ({
  id: 'q0', groundId: 'g1', kind: 'QUESTION_FOR_PERSON', text: 'which accounts actually have a buying process?',
  aboutParticipantId: 'pN', audience: 'LEAD_ONLY', closedAt: null, createdAt: new Date('2026-09-22'),
  exactQuestion: null, questionConfirmedAt: null,
});

describe('the drafter reads the question and the first name, and nothing private', () => {
  it('drafts each question once, and is never handed the lead\'s description or notes', async () => {
    const { service, extractCalls } = aGroundsServiceWith([]);
    const got = await (service as any).whatAPasteGives('g1', 'x'.repeat(500));
    expect(got.questionsForPeople).toEqual([expect.objectContaining({ who: expect.stringContaining('Ngozi'), participantId: 'pN', exactQuestion: 'Have you sent the Client B proposal?' })]);
    const drafter = extractCalls.filter((c) => c.tool.name === THE_EXACT_QUESTION_TOOL.name);
    expect(drafter).toHaveLength(1);
    const handed = `${drafter[0].system}\n${JSON.stringify(drafter[0].history)}`;
    for (const privateBit of ['slow on credit files', 'leaving after Q4', 'Kano branch manager', 'drags her feet']) expect(handed).not.toContain(privateBit);
  });

  it('where the draft carries the lead\'s private words, the lead is shown their own question instead', async () => {
    const { service } = aGroundsServiceWith([], { drafted: 'Since you may be leaving after Q4, have you sent the Client B proposal?' });
    const got = await (service as any).whatAPasteGives('g1', 'y'.repeat(500));
    expect(got.questionsForPeople[0].exactQuestion).toBe('Ask her whether she has sent the Client B proposal?');
  });
});

describe('the lead confirms, changes or leaves out each question on its own', () => {
  it('the list has the exact sentence on every card, the older question marked as written before', async () => {
    const { service } = aGroundsServiceWith([anOlderQuestion(), aWaitingQuestion()]);
    const cards = await service.questionsForPeople('g1', 'userLead');
    expect(cards.map((c) => c.says)).toEqual([
      'Groundwork will ask Ngozi Balogun: "Which accounts actually have a buying process?"',
      'Groundwork will ask Ngozi Balogun: "Have you sent the Client B proposal?"',
    ]);
    expect(cards.map((c) => c.status)).toEqual(['waiting', 'waiting']);
    expect(cards[0].writtenBeforeConfirming).toBe(true);
    expect(cards[0].note).toBe(WRITTEN_BEFORE_YOU_CONFIRMED_EACH_ONE);
    expect(cards[1].note).toBeNull();
  });

  it('confirm keeps the sentence as shown, and says so', async () => {
    const { service, lines } = aGroundsServiceWith([aWaitingQuestion()]);
    const out = await service.confirmQuestionForPerson('g1', 'userLead', 'q1');
    expect(out.say).toBe('I have confirmed it. Groundwork will ask Ngozi Balogun "Have you sent the Client B proposal?" in their next check-in, word for word.');
    expect(lines[0].exactQuestion).toBe('Have you sent the Client B proposal?');
    expect(lines[0].questionConfirmedAt).toBeInstanceOf(Date);
  });

  it('an older question is confirmed in exactly the words its card showed', async () => {
    const { service, lines } = aGroundsServiceWith([anOlderQuestion()]);
    await service.confirmQuestionForPerson('g1', 'userLead', 'q0');
    expect(lines[0].exactQuestion).toBe('Which accounts actually have a buying process?');
  });

  it("an edit becomes the question, in the lead's words and nobody else's", async () => {
    const { service, lines } = aGroundsServiceWith([aWaitingQuestion()]);
    const out = await service.confirmQuestionForPerson('g1', 'userLead', 'q1', { exactQuestion: '  Did the Client B proposal go out this week?  ' });
    expect(lines[0].exactQuestion).toBe('Did the Client B proposal go out this week?');
    expect(out.says).toBe('Groundwork will ask Ngozi Balogun: "Did the Client B proposal go out this week?"');
    await expect(service.confirmQuestionForPerson('g1', 'userLead', 'q1', { exactQuestion: '   ' })).rejects.toThrow('Write the question as you want it asked first.');
  });

  it('not now leaves it out, and it is asked of nobody', async () => {
    const { service, lines } = aGroundsServiceWith([aWaitingQuestion()]);
    await service.confirmQuestionForPerson('g1', 'userLead', 'q1');
    const out = await service.declineQuestionForPerson('g1', 'userLead', 'q1');
    expect(out.say).toBe('I have left it out. Groundwork will not ask Ngozi Balogun this question.');
    expect(lines[0].closedAt).toBeInstanceOf(Date);
    expect(lines[0].questionConfirmedAt).toBeNull();
    expect(await service.questionsForPeople('g1', 'userLead')).toEqual([]);
  });

  it('only the lead can confirm or leave one out, and a participant cannot even read the list', async () => {
    const { service } = aGroundsServiceWith([aWaitingQuestion()]);
    await expect(service.confirmQuestionForPerson('g1', 'userN', 'q1')).rejects.toThrow(/Only the person who runs this check-in/);
    await expect(service.declineQuestionForPerson('g1', 'userN', 'q1')).rejects.toThrow(/Only the person who runs this check-in/);
    await expect(service.questionsForPeople('g1', 'userN')).rejects.toThrow(/Only the person who runs this check-in can see or change the questions for people/);
  });
});

describe('the check-in read, for each reader', () => {
  it('the lead gets the cards; a participant gets no list and no line of it, not even their own', async () => {
    const { service } = aGroundsServiceWith([aWaitingQuestion(), anOlderQuestion()]);
    const lead: any = await service.get('g1', 'org1', 'userLead');
    expect(lead.questionsForPeople.map((c: any) => c.says)).toContain('Groundwork will ask Ngozi Balogun: "Have you sent the Client B proposal?"');
    const ngozi: any = await service.get('g1', 'org1', 'userN');
    expect(ngozi.questionsForPeople).toBeUndefined();
    const read = JSON.stringify(ngozi);
    expect(read).not.toContain('Client B proposal');
    expect(read).not.toContain('buying process');
  });
});

/* ---------------------------------------------------------------------------------------------- */

function aSessionFor(lines: any[], reply: string, earlierAi: string[] = []) {
  const ground = {
    id: 'g1', organizationId: 'org1', scenario: GroundScenario.OKR_ALIGNMENT, moment: null, label: 'The lending round',
    mode: 'SHARED', timelineDays: 90, brief: null, startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null,
    cadence: null, resolutionState: null, initiatorId: 'pL', peersVisibleToEachOther: null, expectThemToUnblock: true,
    objectives: [], report: null, leadContextNotes: [],
    participants: [
      { id: 'pL', groundId: 'g1', partyType: PartyType.INITIATOR, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-01-01'), nameGiven: null, email: 'lead@example.com', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'pN', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-01-02'), nameGiven: null, email: 'ngozi@example.com', user: { firstName: 'Ngozi', lastName: 'Balogun' } },
    ],
  };
  const prompts: string[] = [];
  const seed: any = {
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci1', groundId: 'g1', participantId: 'pN', sessionNumber: 2, status: CheckInStatus.IN_PROGRESS,
        isClarification: false, clarificationTarget: null, isSelfCorrection: false, selfCorrectionTargetSession: null, isFinal: false,
        participant: { id: 'pN', userId: 'user-n', groundId: 'g1', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, user: { firstName: 'Ngozi', lastName: 'Balogun' } },
      })),
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => [{ id: 'ci0' }, { id: 'ci1' }]),
      findFirst: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
    },
    groundParticipant: {
      count: jest.fn(async () => 2),
      findUnique: jest.fn(async () => ({ specificityHistory: [] })),
      findFirst: jest.fn(async () => ground.participants[1]),
      findMany: jest.fn(async () => ground.participants.map((p) => ({ ...p, checkIns: [] }))),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: {
      count: jest.fn(async () => 1),
      create: jest.fn(async (args: any) => ({ id: 't1', content: args.data.content })),
      findMany: jest.fn(async (args: any = {}) => (args?.where?.role === 'AI'
        ? earlierAi.map((content) => ({ content }))
        : [{ id: 't0', role: 'PERSON', content: 'I spent the week on the Client B work.', createdAt: new Date() }])),
      delete: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
    },
    /* The mock hands back every line whatever the query says, so the session's own filter is what is tested. */
    groundContextItem: { findMany: jest.fn(async () => lines) },
    participantNote: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    delivery: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    recordEntry: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    workMention: { findMany: jest.fn(async () => []) },
    adminProfile: { findUnique: jest.fn(async () => null) },
    leadContextNote: { findMany: jest.fn(async () => []) },
    groundDocument: { findMany: jest.fn(async () => []) },
    patternDetection: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
  };
  const nothingBack = (method: string) => async () => (String(method).endsWith('Many') || String(method) === 'groupBy' ? [] : null);
  const prisma: any = new Proxy(seed, {
    get: (target: any, model: string) => new Proxy(target[model] ?? {}, { get: (m: any, method: string) => m[method] ?? nothingBack(method) }),
  });
  const anthropic: any = { respond: jest.fn(async (system: string) => { prompts.push(system); return reply; }) };
  const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)) };
  const nothing: any = { get: () => undefined };
  const service = new ConversationService(prisma, promptStore, anthropic, new ConversationContextService(prisma), nothing, nothing, nothing, nothing, nothing, nothing);
  return { service, prompts, seed };
}

const CONFIRMED = 'Have you sent the Client B proposal?';
const lines = () => [
  { kind: 'QUESTION_FOR_PERSON', text: 'ask her whether she has sent the Client B proposal', aboutParticipantId: 'pN', exactQuestion: CONFIRMED, questionConfirmedAt: new Date() },
  /* Drafted and never confirmed. */
  { kind: 'QUESTION_FOR_PERSON', text: 'whether the Lagos pilot is still on', aboutParticipantId: 'pN', exactQuestion: 'Is the Lagos pilot still going ahead?', questionConfirmedAt: null },
  /* Kept before 28 September: no sentence at all. */
  { kind: 'QUESTION_FOR_PERSON', text: 'which accounts actually have a buying process?', aboutParticipantId: 'pN', exactQuestion: null, questionConfirmedAt: null },
];

describe("in the person's own session", () => {
  it('only a confirmed question reaches the prompt, as its exact sentence, to be asked word for word', async () => {
    const { service, prompts, seed } = aSessionFor(lines(), 'Thanks. What moved this week?');
    await service.sendMessage('ci1', 'user-n', 'The Client B work is moving.');
    const prompt = prompts.join('\n');
    expect(prompt).toContain(`- "${CONFIRMED}"`);
    expect(prompt).toContain('Ask each one exactly as it is written, word for word');
    for (const never of ['Lagos pilot', 'buying process', 'ask her whether']) expect(prompt).not.toContain(never);
    /* And the query itself leaves the unconfirmed ones out, not only the filter after it. */
    const where = seed.groundContextItem.findMany.mock.calls[0][0].where;
    expect(where.NOT).toEqual([
      { kind: 'QUESTION_FOR_PERSON', questionConfirmedAt: null },
      { kind: 'QUESTION_FOR_PERSON', exactQuestion: null },
    ]);
  });

  it('where the model asks it in its own words, the person reads the confirmed words', async () => {
    const { service } = aSessionFor(lines(), 'Good to hear. Did you manage to send over the proposal for Client B yet? Tell me what happened.');
    const out = await service.sendMessage('ci1', 'user-n', 'The Client B work is moving.');
    expect(out.reply).toContain(CONFIRMED);
    expect(out.reply).not.toContain('Did you manage to send over');
    expect(out.reply).toContain('Tell me what happened.');
  });

  it('where the model asks it word for word, nothing is changed', async () => {
    const said = `Good to hear. ${CONFIRMED}`;
    const { service } = aSessionFor(lines(), said);
    const out = await service.sendMessage('ci1', 'user-n', 'The Client B work is moving.');
    expect(out.reply).toBe(said);
  });

  it('once asked in any of their check-ins, it is not in the prompt again', async () => {
    const { service, prompts } = aSessionFor(lines(), 'What moved this week?', [`Last time. ${CONFIRMED}`]);
    await service.sendMessage('ci1', 'user-n', 'The Client B work is moving.');
    /* The turn before is quoted back by its own block; the lead's block is what must be gone. */
    expect(prompts.join('\n')).not.toContain(`- "${CONFIRMED}"`);
    expect(prompts.join('\n')).not.toContain('WORD FOR WORD');
  });

  it('a question about somebody else never reaches this person', async () => {
    const theirs = [{ ...lines()[0], aboutParticipantId: 'pL' }];
    const { service, prompts } = aSessionFor(theirs, 'What moved this week?');
    await service.sendMessage('ci1', 'user-n', 'The Client B work is moving.');
    expect(prompts.join('\n')).not.toContain(CONFIRMED);
  });
});

describe('the pieces the session uses', () => {
  it('the block holds the exact sentences and never says to use its own words', () => {
    const b = theQuestionsTheLeadWants([CONFIRMED]);
    expect(b).toContain(`- "${CONFIRMED}"`);
    expect(b).toContain('Never say who wants it asked');
    expect(b).not.toContain('in your own words');
    expect(theQuestionsTheLeadWants([])).toBe('');
  });

  it('word for word is case and punctuation aside, and a different question is not it', () => {
    expect(asksItWordForWord('ok. have you sent the client b proposal', CONFIRMED)).toBe(true);
    expect(asksItWordForWord('Have you sent the Client C proposal?', CONFIRMED)).toBe(false);
    expect(alreadyAsked(['What moved?', `So. ${CONFIRMED}`], CONFIRMED)).toBe(true);
  });

  it('a reply with no question like it is left alone, because the model decides when', () => {
    const r = withTheQuestionAsConfirmed('What moved this week?', CONFIRMED);
    expect(r).toEqual({ text: 'What moved this week?', asked: false, putBack: false });
  });

  it('an older line is shown to the lead as written before, and is waiting', () => {
    const card = aQuestionAsTheLeadReadsIt({ id: 'q0', text: 'Amina - which accounts actually have a buying process', aboutParticipantId: 'p1', exactQuestion: null, questionConfirmedAt: new Date() }, 'Amina');
    expect(card.status).toBe('waiting');
    expect(card.says).toBe('Groundwork will ask Amina: "Which accounts actually have a buying process?"');
    expect(card.note).toBe(WRITTEN_BEFORE_YOU_CONFIRMED_EACH_ONE);
  });
});

describe('the context chat, when a paste holds a question for somebody', () => {
  it("serves the lead the exact sentence per question beside the list, and writes nothing", async () => {
    const ground = {
      id: 'g1', label: 'The lending round', scenario: 'OKR_ALIGNMENT', initiatorId: 'userLead', timelineDays: 90, cadence: 'WEEKLY',
      brief: null, timelineStated: true, cadenceStated: true, organizationId: 'org1',
      participants: [{ id: 'pN', managingOnly: false }], objectives: [],
    };
    const seed: any = {
      ground: { findUnique: async () => ground },
      user: { findUnique: async () => ({ role: 'MEMBER', organizationId: 'org1' }) },
    };
    const writes: string[] = [];
    const prisma: any = new Proxy(seed, {
      get: (t: any, model: string) => new Proxy(t[model] ?? {}, {
        get: (m: any, method: string) => m[method] ?? (async () => {
          if (/^(create|update|upsert|delete)/.test(String(method))) writes.push(`${model}.${String(method)}`);
          return String(method).endsWith('Many') ? [] : String(method) === 'count' ? 0 : null;
        }),
      }),
    });
    const anthropic: any = { respond: async () => 'Here is what I read.', extract: async () => null };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, anthropic, { get: () => undefined } as any);
    jest.spyOn(service as any, 'whatAPasteGives').mockResolvedValue({
      success: null, teamTargets: [], forPeople: [], dates: [], unmatched: [], waysOfWorking: [], openDecisions: [],
      notSettled: [], aboutPeople: [], commitments: [], betweenPeople: [], strategy: [], notes: [],
      questionsForPeople: [{ who: 'Ngozi', participantId: 'pN', question: 'ask her whether she has sent the Client B proposal', exactQuestion: 'Have you sent the Client B proposal?' }],
    });
    const out: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: 'z'.repeat(500) }]);
    expect(out.proposal.say).toContain('Groundwork will ask Ngozi: "Have you sent the Client B proposal?"');
    expect(out.proposal.questionsForPeople).toEqual([{
      id: null, participantId: 'pN', who: 'Ngozi', exactQuestion: 'Have you sent the Client B proposal?',
      says: 'Groundwork will ask Ngozi: "Have you sent the Client B proposal?"', status: 'not yet kept',
    }]);
    expect(writes.filter((w) => w.startsWith('groundContextItem'))).toEqual([]);
  });
});

describe('one yes to a paste keeps a question and never confirms it', () => {
  const CODE = require('fs').readFileSync(require('path').join(__dirname, 'grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('the writer keeps the exact sentence and never sets when it was confirmed', () => {
    const writer = CODE.slice(CODE.indexOf('private async writeWhatThePasteGave('), CODE.indexOf('async shareLeadContext('));
    expect(writer).toContain('exactQuestion: opts.exactQuestion.slice(0, 400)');
    expect(writer).not.toContain('questionConfirmedAt');
  });

  it('and only the lead\'s yes to one question sets it', () => {
    const setters = CODE.split('\n').filter((l: string) => /questionConfirmedAt:\s*new Date\(\)/.test(l));
    expect(setters).toHaveLength(1);
    const confirm = CODE.slice(CODE.indexOf('async confirmQuestionForPerson('), CODE.indexOf('async declineQuestionForPerson('));
    expect(confirm).toContain('questionConfirmedAt: new Date()');
  });
});
