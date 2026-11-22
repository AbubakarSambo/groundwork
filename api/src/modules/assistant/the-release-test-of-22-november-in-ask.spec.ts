import { AssistantService } from './assistant.service';
import { withNothing } from '../board/the-persons-record-bed';
import { thePromisesOf } from '../grounds/the-promises-counted-once';
import { whyItWentOn } from '../suites/a-request-is-recorded';
import { aLeaveRequest } from '../suites/a-request-in-words';
import { NOT_A_PERSON_YOU_LEAD } from './a-persons-history-by-asking';

/**
 * WHAT ASK TOLD AMANI, WAIRIMU AND GRACE IN THE RELEASE TEST OF 22 NOVEMBER 2026, as each of them reads it now. The model is not called, except where
 * a test gives it a reading of its own.
 *  - Amani's My work listed "Send the update on Friday", and Ask said she had said she would do nothing, and that nothing was due (#9, #10).
 *  - "whats stuck" and "where am I needed" read only "Your own report for Sales team, Q4", and nothing of her wait on Baraka (#44, #13).
 *  - Wairimu's "I have a question for Amani about her leave request" was answered from the files (#56).
 *  - Amani read "waiting for an admin" beside "Your leave requests go to Wairimu" (#54).
 *  - Wairimu's "cancel" during her goal draft stopped nobody acting for her (#20).
 *  - Grace, Wairimu's manager, read "I cannot find Wairimu in any of them" (O-15).
 */
const ORG = 'org-msingi';
const AMANI = { id: 'pe-amani', externalId: 'amani', email: 'amani@msingi.test', linkedUserId: 'u-amani' };
const PROMISE = { id: 'c-update', participantId: 'p-amani', groundId: 'g-sales', text: 'I will send the update on Friday.', whenSaid: null, status: 'UNKNOWN', createdAt: new Date('2026-11-22T04:35:13Z'), ground: { label: 'Sales team, Q4' } };
const said = (reply: any) => (reply.blocks ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');

function anAssistant(extra: Record<string, any> = {}, prismaExtra: Record<string, any> = {}) {
  const prisma = withNothing({
    person: { findFirst: jest.fn(async () => AMANI), findMany: jest.fn(async () => []) },
    commitment: { findMany: jest.fn(async () => []) },
    todo: { findMany: jest.fn(async () => []) },
    groundCommitment: { findMany: jest.fn(async () => [PROMISE]) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any = {}) => (where?.awaitingSeat ? [] : [{ id: 'p-amani', groundId: 'g-sales', userId: 'u-amani', nameGiven: 'Amani Wekesa', user: { firstName: 'Amani', lastName: 'Wekesa' }, ground: { label: 'Sales team, Q4' } }])) },
    user: { findUnique: jest.fn(async () => ({ email: AMANI.email, awaitingOrgApproval: false })) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: 'MEMBER' })), findMany: jest.fn(async () => []) },
    ...prismaExtra,
  });
  const svc: any = Object.create(AssistantService.prototype);
  Object.assign(svc, {
    prisma,
    board: {
      whoNeedsYouThisWeek: async () => ({ buckets: [], whatThisIsNot: [] }),
      waitingAcrossTheOrg: async () => ({
        waiting: [{ fromPersonKey: AMANI.email, what: 'the delivery schedule for Kilimani Fresh', onLabel: 'Baraka', status: 'BLOCKING', createdAt: new Date('2026-11-22T05:01:44Z'), groundLabel: 'Sales team, Q4', groundId: 'g-sales' }],
        waitedOn: [],
      }),
    },
    whatNeedsYou: { forReader: async () => ({ needs: [{ title: 'Your own report for Sales team, Q4 is ready', detail: null, organizationId: ORG }] }) },
    isAnAdminHere: async () => false,
    theBoardLeavesOut: async () => ({ leaveOut: new Set() }),
    waitingForYouToDecide: async () => [],
    compose: async (r: any) => r,
    ...extra,
  });
  return svc;
}

describe('what Amani said she would do is read where My work reads it (#9, #10)', () => {
  it('"what did I say I would do" and "what is due" both list "Send the update on Friday", the promise My work lists', async () => {
    const svc = anAssistant();
    const promised = said(await svc.myCommitments(ORG, AMANI.id));
    const due = said(await svc.whatIsDue(ORG, AMANI.externalId, AMANI.linkedUserId));
    console.log(`AMANI ASKS "what did I say I would do" AND READS\n${promised}\n\nAMANI ASKS "what is due" AND READS\n${due}`);
    expect(promised).toContain('You said you would do one thing that is still waiting.');
    expect(promised).toContain('In "Sales team, Q4", you said you would send the update on Friday.');
    expect(due).toBe('In "Sales team, Q4", you said you would send the update on Friday.');
    expect(due).not.toContain('Nothing is due');
    /* The one owner: My work's own reader of her promises holds the same one, and nothing else. */
    const mine = await thePromisesOf(svc.prisma, ['p-amani'], () => 'Sales team, Q4');
    expect(mine.filter((p) => p.open).map((p) => p.raw)).toEqual(['I will send the update on Friday.']);
  });

  it('a promise the record shows was done is open in neither', async () => {
    const svc = anAssistant({}, { recordEntry: { findMany: jest.fn(async () => [{ id: 'l1', participantId: 'p-amani', type: 'PROGRESS', text: 'I sent the update this morning.', createdAt: new Date('2026-11-27T08:00:00Z') }]) } });
    const mine = await thePromisesOf(svc.prisma, ['p-amani'], () => 'Sales team, Q4');
    const promised = said(await svc.myCommitments(ORG, AMANI.id));
    expect(promised.includes('send the update')).toBe(mine.some((p) => p.open));
  });
});

describe('what is stuck, and where Amani is needed, say what Today holds and who waits on whom (#44, #13)', () => {
  it('"whats stuck" says her report is ready and that she is waiting on Baraka', async () => {
    const r = said(await anAssistant().whatNeedsYouNow(ORG, AMANI.externalId, AMANI.linkedUserId, 'stuck'));
    console.log(`AMANI ASKS "whats stuck" AND READS\n${r}`);
    expect(r).toBe([
      'One thing is waiting for you.',
      '- Your own report for Sales team, Q4 is ready.',
      '',
      'You said you cannot go on without the delivery schedule for Kilimani Fresh from Baraka, and you have been waiting for it since 22 November, in the check-in Sales team, Q4.',
    ].join('\n'));
  });

  it('"where am I needed" says the same two things, and never that she waits for her own report', async () => {
    const r = said(await anAssistant().whereAmINeeded(ORG, AMANI.externalId, AMANI.linkedUserId));
    console.log(`AMANI ASKS "where am i needed" AND READS\n${r}`);
    expect(r).toContain('- Your own report for Sales team, Q4 is ready.');
    expect(r).toContain('the delivery schedule for Kilimani Fresh from Baraka');
    expect(r).not.toMatch(/waiting for your own/i);
  });

  it('with nothing either way, she is told so in one sentence', async () => {
    const svc = anAssistant({ whatNeedsYou: { forReader: async () => ({ needs: [] }) }, board: { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } });
    expect(said(await svc.whatNeedsYouNow(ORG, AMANI.externalId, AMANI.linkedUserId, 'stuck'))).toBe('Nothing is recorded as waiting on you, and you have not named anything you are waiting on.');
  });
});

describe('an approver who says she has a question about a request is asked for it (#56)', () => {
  const LEAVE = aLeaveRequest('lr-7dec', 'u-amani', 'Amani', '2026-12-07', '2026-12-10');
  it('Wairimu is told which request, and how to put the question, and nothing is sent', async () => {
    const svc = anAssistant({ waitingForYouToDecide: async () => [LEAVE] });
    const r = said(await svc.doItForYou(ORG, 'pe-wairimu', 'wairimu', 'u-wairimu', 'a_question_about_a_request', 'I have a question for Amani about her leave request'));
    console.log(`WAIRIMU SAYS "I have a question for Amani about her leave request" AND READS\n${r}`);
    expect(r).toBe(`${LEAVE.thing.charAt(0).toUpperCase()}${LEAVE.thing.slice(1)} is waiting for you. What would you like to ask Amani about it? Write "question for Amani about leave:" and then your question, and I will say it back to you before anything is sent.`);
    expect(svc.prisma.assistantProposal.create).not.toHaveBeenCalled();
  });

  it('with the question written, it is said back word for word and waits for her yes', async () => {
    const svc = anAssistant({ waitingForYouToDecide: async () => [LEAVE] }, { assistantProposal: { create: jest.fn(async () => ({ id: 'prop-1' })), findFirst: jest.fn(async () => null) } });
    const r = said(await svc.doItForYou(ORG, 'pe-wairimu', 'wairimu', 'u-wairimu', 'a_question_about_a_request', 'question for Amani about leave: who will cover Kilimani Fresh?'));
    expect(r).toBe(`You are asking Amani, “who will cover Kilimani Fresh?” It is about ${LEAVE.thing}. I will send it as you wrote it, and the request stays waiting for you. Shall I send it?`);
  });
});

describe('a request that went on to somebody else says why, from its own record (#54)', () => {
  it('Amani reads that it waited two working days for Wairimu and went to an admin', async () => {
    const prisma: any = {
      suiteEvent: { findMany: async () => [{ kind: 'asked', byUserId: 'u-amani', at: new Date('2026-11-21T04:35:13Z') }, { kind: 'escalated', toUserId: null, at: new Date('2026-11-22T05:49:10Z'), basis: { fromUserId: 'u-wairimu', days: 2, because: 'waited' } }] },
      user: { findMany: async () => [{ id: 'u-wairimu', firstName: 'Wairimu' }] },
    };
    const why = await whyItWentOn(prisma, ORG, 'leave', { id: 'lr-7dec', status: 'waiting', escalatedTo: 1 }, 'u-amani');
    console.log(`AMANI ASKS "where are my requests" AND READS, AFTER WHERE IT IS\n${why}`);
    expect(why).toBe('Groundwork passed it to an admin on 22 November, because Wairimu had not answered for 2 working days.');
    expect(await whyItWentOn(prisma, ORG, 'leave', { id: 'lr-7dec', status: 'waiting', escalatedTo: 0 }, 'u-amani')).toBeNull();
    expect(await whyItWentOn(prisma, ORG, 'leave', { id: 'lr-7dec', status: 'approved', escalatedTo: 1 }, 'u-amani')).toBeNull();
  });
});

describe('"cancel" during a goal draft stops the draft, whatever else the model might pick (#20)', () => {
  const DRAFT = { id: 'd-onb', workingTitle: 'onboarding', state: 'DRAFTING', measure: null, target: null, reason: null };
  it('Wairimu reads that the draft is stopped, and the draft is abandoned', async () => {
    const update = jest.fn(async () => ({}));
    const engine = { extract: jest.fn(async () => ({ for: 'the_check_in', stops: true })) };
    const svc = anAssistant({ engine }, { objectiveDraft: { findFirst: jest.fn(async () => DRAFT), update }, assistantProposal: { findFirst: jest.fn(async () => null) } });
    const r = said(await svc.answer(ORG, 'pe-wairimu', 'wairimu', 'cancel', false, undefined, 'u-wairimu', false, { kind: 'wants', about: null, parts: 1, guide: 'stop_a_delegate' }));
    console.log(`WAIRIMU SAYS "cancel" DURING HER DRAFT AND READS\n${r}`);
    expect(r).toBe('I have stopped the draft of "onboarding". Nothing was set.');
    expect(update).toHaveBeenCalledWith({ where: { id: 'd-onb' }, data: { state: 'ABANDONED' } });
  });

  it('with no reading from the model, a message the rules place elsewhere is not taken as the draft\'s answer', async () => {
    const answer = jest.fn();
    const svc = anAssistant({ engine: null, drafts: { answer } }, { objectiveDraft: { findFirst: jest.fn(async () => DRAFT) } });
    expect(await svc.continueTheDraft(ORG, 'wairimu', 'what is due', async () => true)).toBeNull();
    expect(answer).not.toHaveBeenCalled();
  });
});

describe('a manager reads the history of somebody who reports to her (O-15, Hafsah, 21 November 2026)', () => {
  const SALES = {
    id: 'g-sales', label: 'Sales team, Q4', initiatorId: 'u-wairimu',
    participants: [
      { id: 'p-wairimu', userId: 'u-wairimu', nameGiven: null, managingOnly: false, user: { firstName: 'Wairimu', lastName: 'Njoroge' } },
      { id: 'p-amani', userId: 'u-amani', nameGiven: null, managingOnly: false, user: { firstName: 'Amani', lastName: 'Wekesa' } },
    ],
  };
  const grace = (reportsToGrace: string[]) => anAssistant({}, {
    ground: { findMany: jest.fn(async () => [SALES]) },
    organizationMembership: { findMany: jest.fn(async ({ where }: any) => (where.reportsToUserId === 'u-grace' ? reportsToGrace.map((userId) => ({ userId })) : [])), findUnique: jest.fn(async () => ({ role: 'ADMIN' })) },
  });

  it('Grace is looked up in the check-in Wairimu runs, as Wairimu\'s manager, and Amani there is not hers to read', async () => {
    const svc = grace(['u-wairimu']);
    const pages: any[] = [];
    const readMyWork = jest.spyOn(require('../board/my-work'), 'readMyWork').mockImplementation(async (_p: any, _b: any, input: any) => {
      pages.push(input);
      return { on: true, view: 'lead', checkInName: 'Sales team, Q4', person: { participantId: input.personId, name: 'Wairimu Njoroge', firstName: 'Wairimu' }, checkIns: { due: 3, done: 3, onTime: 3, specific: 1 }, numbers: [], performing: { behaviours: [] }, coaching: { better: [] } };
    });
    const r = said(await svc.aPersonsHistory(ORG, 'u-grace', 'Wairimu'));
    console.log(`GRACE ASKS "how has Wairimu been doing" AND READS\n${r}`);
    expect(pages).toEqual([{ groundId: 'g-sales', userId: 'u-grace', personId: 'p-wairimu', asTheirManager: true }]);
    expect(r).toContain('This is Wairimu’s history in "Sales team, Q4", read from their check-ins.');
    expect(r).toContain('Wairimu has done 3 of 3 check-ins, 3 on time and 1 with specific answers.');
    expect(said(await svc.aPersonsHistory(ORG, 'u-grace', 'Amani'))).toBe(NOT_A_PERSON_YOU_LEAD('Amani'));
    readMyWork.mockRestore();
  });

  it('nobody reports to her: nobody in a check-in she does not run is read', async () => {
    expect(said(await grace([]).aPersonsHistory(ORG, 'u-grace', 'Wairimu'))).toBe(NOT_A_PERSON_YOU_LEAD('Wairimu'));
  });
});
