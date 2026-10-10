import { AssistantService } from './assistant.service';
import { asksWhatWeKnowOfTheirJob, parseAJobCorrection, theCorrectionSaidBack, whatTheyToldUs } from './my-job-in-ask';
import { theRoleMapQuestion, SHARE_WITH_THE_ROLE_MAP_KIND } from '../conversation/their-role-in-the-first-check-in';

/**
 * Decision 129: a person asks Ask Groundwork what it knows of their job, corrects it, and says yes or no to the role map showing what they own.
 * These read what the person is told, and what is written only after a yes.
 */
const ROW = { roleName: 'Sales representative', owns: 'the Nairobi accounts', decides: null, doingWell: 'hitting the number', dependsOn: 'finance to approve discounts', dependedOnBy: null, inTheWay: 'waiting for stock', source: 'first_check_in', sharedAt: null, createdAt: new Date('2026-10-11'), id: 'row-1', organizationId: 'org-a' };

function svc(opts: { row?: any; parked?: any; title?: string | null } = {}) {
  const proposals: any[] = []; const written: any[] = []; const states: any[] = []; const users: any[] = []; const persons: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: async () => null },
    person: {
      findFirst: jest.fn(async () => ({ id: 'per-1', externalId: 'u-1', active: true, linkedUserId: 'user-1', displayName: 'Miriam', email: 'm@x.test', title: opts.title ?? null })),
      update: jest.fn(async (a: any) => { persons.push(a); return {}; }),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org-a', jobTitle: opts.title ?? null })), update: jest.fn(async (a: any) => { users.push(a); return {}; }) },
    roleInterviewAnswer: {
      findFirst: jest.fn(async () => opts.row ?? null),
      findUnique: jest.fn(async () => opts.row ?? null),
      create: jest.fn(async ({ data }: any) => { written.push(data); return data; }),
      update: jest.fn(async (a: any) => { written.push({ updated: a }); return {}; }),
    },
    ground: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    groundParticipant: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    groundDocument: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: `pr${proposals.length + 1}`, state: 'PARKED', ...data }; proposals.push(p); return p; }),
      update: jest.fn(async (a: any) => { states.push(a); return {}; }),
    },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const engine: any = { respond: jest.fn(async () => { throw new Error('model off for these tests'); }), extract: jest.fn(async () => null) };
  const truth: any = { forPerson: async () => ({ person: { externalId: 'u-1' }, sessions: { value: [] } }) };
  const service = new AssistantService(
    prisma, engine, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any, { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('no'); } } as any, { start: async () => { throw new Error('no'); } } as any,
    truth, { read: async () => ({ read: false, because: 'no' }) } as any, { sendRoundDigest: async () => { throw new Error('no'); } } as any, {} as any,
  );
  return { service, proposals, written, states, users, persons };
}
const said = (r: any) => (r.blocks ?? []).filter((b: any) => b.type !== 'proposal').map((b: any) => b.body ?? '').filter(Boolean).join(' / ');

describe('reading what a person says about their job', () => {
  it.each([
    ['Change my job to account manager', 'roleName', 'account manager'],
    ['My role is now head of sales.', 'roleName', 'head of sales'],
    ['I now own the Mombasa accounts', 'owns', 'the Mombasa accounts'],
    ['Change what I own to the coast region', 'owns', 'the coast region'],
    ['I now depend on the depot for stock', 'dependsOn', 'the depot for stock'],
    ['What usually gets in my way is late approvals', 'inTheWay', 'late approvals'],
    ['Doing well means no customer waits more than a day', 'doingWell', 'no customer waits more than a day'],
  ])('"%s"', (m, part, value) => {
    expect(parseAJobCorrection(m)).toEqual({ part, value });
  });
  it.each(['What is the weather', 'I own a car', 'Who owns the Mombasa accounts?', 'How am I doing'])('"%s" is not a correction', (m) => {
    expect(parseAJobCorrection(m)).toBeNull();
  });
  it.each(['What do you know about my job?', 'What have I told you about my role', 'Show me my job'])('"%s" asks what is kept', (m) => {
    expect(asksWhatWeKnowOfTheirJob(m)).toBe(true);
  });
});

describe('what a person is told', () => {
  it('what is kept, in their own words, and that it is private', () => {
    expect(whatTheyToldUs({ roleName: 'Sales representative', owns: 'the Nairobi accounts', doingWell: 'hitting the number', dependsOn: 'finance to approve discounts', dependedOnBy: null, inTheWay: 'waiting for stock', roleMapShowsWhatYouOwn: false })).toBe(
      'I have your job as "Sales representative". You told me you are responsible for "the Nairobi accounts". You told me doing well looks like "hitting the number". You told me about who you depend on and who depends on you: "finance to approve discounts". You told me what usually gets in your way is "waiting for stock". All of this is private to you, and the role map does not show it. To correct any of it, say for example "Change my job to account manager" or "I now own the Mombasa accounts", and I will say it back to you before I change anything.',
    );
  });
  it('when the role map shows what they own, it says so and that the rest stays private', () => {
    expect(whatTheyToldUs({ roleName: 'Sales representative', owns: 'x y', doingWell: null, dependsOn: null, dependedOnBy: null, inTheWay: null, roleMapShowsWhatYouOwn: true })).toMatch(/The role map shows what you own\. Everything else here is private to you\./);
  });
  it('a change is said back with their words quoted', () => {
    expect(theCorrectionSaidBack('roleName', 'account manager', 'Sales representative')).toBe('Shall I change your job from "Sales representative" to "account manager"?');
    expect(theCorrectionSaidBack('owns', 'the coast', null)).toBe('Shall I record what you are responsible for as "the coast"?');
    expect(theCorrectionSaidBack('inTheWay', 'late approvals', 'waiting for stock')).toBe('Shall I change what you say usually gets in your way from "waiting for stock" to "late approvals"?');
  });
});

describe('in Ask Groundwork', () => {
  it('"What do you know about my job?" is answered from their own row', async () => {
    const { service } = svc({ row: ROW });
    const r = await service.respond('org-a', 'p1', 'What do you know about my job?');
    expect(said(r)).toMatch(/^I have your job as "Sales representative"\. You told me you are responsible for "the Nairobi accounts"\./);
  });
  it('with nothing kept, says so and how to tell it', async () => {
    const { service } = svc();
    expect(said(await service.respond('org-a', 'p1', 'What do you know about my job?'))).toMatch(/^I do not have anything about your job yet\./);
  });
  it('a correction is said back and nothing is written until a yes', async () => {
    const { service, proposals, written, users } = svc({ row: ROW, title: 'Sales representative' });
    const r: any = await service.respond('org-a', 'p1', 'Change my job to account manager');
    expect(said(r)).toBe('Shall I change your job from "Sales representative" to "account manager"?');
    expect(r.blocks.some((b: any) => b.type === 'proposal')).toBe(true);
    expect(written).toHaveLength(0);
    expect(users).toHaveLength(0);
    expect(proposals[0].kind).toBe('role_correction');
  });
  it('a yes writes one new row and sets the title, a no writes nothing', async () => {
    const parked = { id: 'pc', kind: 'role_correction', state: 'PARKED', payload: { part: 'roleName', value: 'account manager' } };
    const yes = svc({ row: ROW, title: 'Sales representative', parked });
    const r = await yes.service.respond('org-a', 'p1', 'yes');
    expect(said(r)).toMatch(/^I have changed it\. I have your job as "account manager"\./);
    expect(yes.written[0]).toMatchObject({ roleName: 'account manager', owns: 'the Nairobi accounts', doingWell: 'hitting the number', source: 'correction', sharedAt: null });
    expect(yes.users[0]).toMatchObject({ data: { jobTitle: 'account manager' } });
    const no = svc({ row: ROW, parked });
    expect(said(await no.service.respond('org-a', 'p1', 'no'))).toBe('I have left it as it was. Nothing was changed.');
    expect(no.written).toHaveLength(0);
  });
  it('a sentence that only starts "I own" is not taken as a correction by somebody who has told us nothing', async () => {
    const { service, proposals } = svc();
    const r = await service.respond('org-a', 'p1', 'I own a laptop that needs a new battery');
    expect(proposals.filter((p) => p.kind === 'role_correction')).toHaveLength(0);
    expect(said(r)).not.toMatch(/Shall I (change|record)/);
  });
});

describe('after the first check-in, may the role map show what they own', () => {
  const parked = { id: 'ps', kind: SHARE_WITH_THE_ROLE_MAP_KIND, state: 'PARKED', summary: theRoleMapQuestion('Sales representative', 'the Nairobi accounts'), payload: { rowId: 'row-1', roleName: 'Sales representative' } };
  it('a yes lets the role map show what they own, and says that the rest stays private', async () => {
    const w = svc({ row: ROW, parked });
    const r = await w.service.respond('org-a', 'p1', 'yes');
    expect(said(r)).toBe('I have let the role map show what the Sales representative job owns. It is about the job and not about you. Everything else you told me stays private to you.');
    expect(w.written[0].updated.data.sharedAt).toBeInstanceOf(Date);
    expect(w.persons[0]).toMatchObject({ data: { title: 'Sales representative' } });
  });
  it('a no shows nothing', async () => {
    const w = svc({ row: ROW, parked });
    expect(said(await w.service.respond('org-a', 'p1', 'no'))).toBe('That is fine. The role map will not show anything, and what you told me about your job stays private to you.');
    expect(w.written).toHaveLength(0);
  });
  it('another message is answered as usual, the request stays, and the question is put once more', async () => {
    const w = svc({ row: ROW, parked });
    const r: any = await w.service.respond('org-a', 'p1', 'What do you know about my job?');
    expect(said(r)).toMatch(/^I have your job as "Sales representative"\./);
    expect(said(r)).toContain(parked.summary);
    expect(r.blocks.filter((b: any) => b.type === 'proposal')).toEqual([{ type: 'proposal', proposalId: 'ps', summary: parked.summary }]);
    expect(w.states.some((s) => s.data.state === 'DROPPED')).toBe(false);
    expect(w.written).toHaveLength(0);
  });
});
