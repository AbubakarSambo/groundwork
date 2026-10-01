import { askGroundwork, textOf } from './request-92-harness';
import { INTERVIEW_INVITATION } from './the-role-interview';

/**
 * THE ROLE INTERVIEW, AS THE PERSON READS IT IN ASK GROUNDWORK (request 25, part a).
 *
 * Miriam Wanjiku is a Sales rep at Baridi Appliances. Her admin sent her the role interview. She
 * answers four questions one at a time, each is said back with the others in plain sentences, and
 * only her yes writes one row. Her words are kept as she typed them. A model words nothing.
 */
const LABELS = /\b(PIP|exit|at[- ]risk|low[- ]performer|flight risk|score|rating|rated)\b/i;

function miriam(opts: { answered?: number } = {}) {
  const h = askGroundwork({ userId: 'u-miriam' });
  const proposals: any[] = [{
    id: 'iv1', state: 'PARKED', kind: 'role_interview', organizationId: 'org-a', personExternalId: 'u-1', createdAt: new Date(0),
    summary: INTERVIEW_INVITATION('Sales rep'), payload: { roleName: 'Sales rep', answered: opts.answered ?? 0, answers: {} },
  }];
  let n = 0;
  h.prisma.assistantProposal.findFirst = jest.fn(async ({ where }: any) =>
    [...proposals].reverse().find((p) => p.state === where.state && p.personExternalId === where.personExternalId) ?? null);
  h.prisma.assistantProposal.create = jest.fn(async ({ data }: any) => {
    const row = { id: `pr${++n}`, state: 'PARKED', createdAt: new Date(), ...data };
    proposals.push(row);
    return row;
  });
  h.prisma.assistantProposal.update = jest.fn(async ({ where, data }: any) => {
    const p = proposals.find((x) => x.id === where.id)!;
    Object.assign(p, data);
    return p;
  });
  h.prisma.person.count = jest.fn(async () => 6);
  h.prisma.todo = { findMany: jest.fn(async () => []) };
  const rows: any[] = [];
  h.prisma.roleInterviewAnswer = { create: jest.fn(async ({ data }: any) => { rows.push(data); return data; }) };
  return { ...h, proposals, rows };
}

const say = (h: ReturnType<typeof miriam>, m: string) => h.service.respond('org-a', 'p1', m);

describe('the role interview in Ask Groundwork', () => {
  it('waits until she says start, then asks the four questions one at a time', async () => {
    const h = miriam();
    expect(textOf(await say(h, 'start'))).toBe('What do you own in your job as Sales rep? Tell me in your own words, for example "the sales target and the sales team".');
    expect(textOf(await say(h, 'My own customers and their deals'))).toBe('What do you decide yourself, without asking anybody first?');
    expect(textOf(await say(h, 'What discount I give up to 10 percent'))).toBe('Who do you depend on to do your job?');
    expect(textOf(await say(h, 'The Sales lead and Operations for stock'))).toBe('And who depends on you to do theirs?');
    expect(h.rows).toHaveLength(0);
  });

  it('says all four back in plain sentences and writes nothing until yes', async () => {
    const h = miriam();
    for (const m of ['start', 'My own customers and their deals.', 'What discount I give up to 10 percent', 'The Sales lead and Operations for stock']) await say(h, m);
    const reply = await say(h, 'The customers I sign, for their first delivery');
    const said = textOf(reply);
    expect(said).toBe('You said you own "my own customers and their deals", you decide "what discount I give up to 10 percent", you depend on "the Sales lead and Operations for stock", and "the customers I sign, for their first delivery" depend on you. Shall I save this for the role map?');
    expect(reply.blocks.some((b: any) => b.type === 'proposal')).toBe(true);
    expect(h.rows).toHaveLength(0);
  });

  it('reads her own leading words back as one sentence, not twice', async () => {
    const h = miriam();
    for (const m of ['start', 'I own my own customers', 'I decide the discount', 'I depend on the Sales lead']) await say(h, m);
    expect(textOf(await say(h, 'New customers depend on me'))).toBe('You said you own "my own customers", you decide "the discount", you depend on "the Sales lead", and "new customers" depend on you. Shall I save this for the role map?');
  });

  it('keeps a name\'s capital and only lowers the first letter of a plain word', async () => {
    const h = miriam();
    for (const m of ['start', 'Kwame\'s deliveries', 'Whatever I think fair', 'Operations and Finance']) await say(h, m);
    expect(textOf(await say(h, 'All new customers'))).toBe('You said you own "Kwame\'s deliveries", you decide "whatever I think fair", you depend on "Operations and Finance", and "all new customers" depend on you. Shall I save this for the role map?');
  });

  it('a yes writes one row, her words exactly as she typed them, and says what it is for', async () => {
    const h = miriam();
    const typed = ['start', 'I own my own customers.', 'I decide the discount', 'I depend on the Sales lead', 'New customers depend on me'];
    for (const m of typed) await say(h, m);
    const saved = textOf(await say(h, 'yes'));
    expect(saved).toBe('I have saved this for the role map. It shows what the Sales rep job owns. It is about the job and not about you.');
    expect(h.rows).toEqual([{
      organizationId: 'org-a', personExternalId: 'u-1', roleName: 'Sales rep',
      owns: 'I own my own customers.', decides: 'I decide the discount', dependsOn: 'I depend on the Sales lead', dependedOnBy: 'New customers depend on me',
      promptVersionId: null,
    }]);
    expect(saved).not.toMatch(LABELS);
  });

  it('a no writes nothing and offers the four questions again', async () => {
    const h = miriam();
    for (const m of ['start', 'a', 'b', 'c', 'd']) await say(h, m);
    expect(textOf(await say(h, 'no'))).toBe('I have left it as it was. Nothing was saved. If you would like to go through the questions again, say "start".');
    expect(h.rows).toHaveLength(0);
    expect(textOf(await say(h, 'start'))).toContain('What do you own in your job as Sales rep?');
  });

  it('something other than yes or no does not save it, and a later yes cannot', async () => {
    const h = miriam();
    for (const m of ['start', 'a', 'b', 'c', 'd']) await say(h, m);
    await say(h, 'what are my to-dos');
    await say(h, 'yes');
    expect(h.rows).toHaveLength(0);
  });

  it('answers something else she asks before she starts, and says once that the interview is waiting', async () => {
    const h = miriam();
    const first = textOf(await say(h, 'what can you see'));
    expect(first).toContain('Your admin has asked you four short questions about your job as Sales rep, so that the role map can show what the job owns. It is about the job and not about you, and nobody is marked on it. Say "start" when you are ready, or "not now" if you would rather not.');
    expect(first).not.toMatch(LABELS);
    const second = textOf(await say(h, 'what can you see'));
    expect(second).not.toContain('Your admin has asked you four short questions');
  });

  it('"not now" leaves it, and saves nothing', async () => {
    const h = miriam();
    expect(textOf(await say(h, 'not now'))).toBe('That is fine. I have not saved anything. Say "start" any time you want to go through the four questions.');
    expect(h.proposals[0].state).toBe('DECLINED');
    expect(h.rows).toHaveLength(0);
  });

  it('asks again for an empty or a very long answer rather than keeping it', async () => {
    const h = miriam({ answered: 1 });
    h.proposals[0].payload.started = true;
    h.proposals[0].payload.answers = { owns: 'x' };
    expect(textOf(await say(h, '   '))).toBe('I did not catch an answer there. Could you say it again in a sentence or two?');
    expect(textOf(await say(h, 'a'.repeat(1001)))).toContain('That is a long answer.');
    expect(h.proposals[0].payload.answered).toBe(1);
  });
});
