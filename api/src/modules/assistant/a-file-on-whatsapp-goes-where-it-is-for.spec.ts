import * as fs from 'fs';
import * as path from 'path';
import { AssistantService } from './assistant.service';
import { whatAFileIsFor, whatIsItFor, SHALL_I_ATTACH, KEPT_FOR_THE_REQUEST, thePlaces, type WhereAFileCouldGo } from './what-a-file-is-for';

/**
 * WhatsApp test, 20 November 2026, C2, C3 and C4. Every file was decided by whether a check-in was open:
 *   - Peter, a photo of a fuel receipt, "fuel for nakuru trip pls refund": "There is no check-in open to put that on. ..."
 *   - Grace, her leave-policy PDF, "our leave policy, add for everyone": the same.
 *   - Wairimu, a sales PDF, "use this in the report too": "Ask Msingi Foods reads words here. Write "back" first, ..."
 * Now one decision, from what waits for the file and what they wrote with it.
 */
const nothing: WhereAFileCouldGo = { checkIn: null, receipt: null, report: false, desk: null, spending: false };
const PHOTO = { fileName: 'image-wamid.HBgM.jpeg', named: false, what: 'photo' };
const said = (key: string) => jest.fn(async () => ({ for: key }));

describe('a file on WhatsApp goes where it is for', () => {
  it("Peter's receipt, with no request yet, is kept for the request his caption starts", async () => {
    const could = { ...nothing, spending: true };
    const model = said('spending');
    expect(await whatAFileIsFor(model as any, could, { ...PHOTO, caption: 'fuel for nakuru trip pls refund' })).toBe('spending');
    expect((model.mock.calls[0] as any)[1][0].content).toContain('"fuel for nakuru trip pls refund"');
    expect(KEPT_FOR_THE_REQUEST(PHOTO)).toBe('I have kept your photo, and it will go with your request to spend once you send it.');
  });

  it('his second photo, with no caption, goes with the request waiting for it, on his yes', async () => {
    const could = { ...nothing, spending: true, receipt: { id: 'sr-1', said: 'KES 2,500 on fuel for the Nakuru trip' } };
    const model = said('desk');
    expect(await whatAFileIsFor(model as any, could, { ...PHOTO, caption: '' })).toBe('receipt');
    expect(model).not.toHaveBeenCalled();
    expect(SHALL_I_ATTACH(PHOTO, could.receipt.said)).toBe('Shall I attach your photo to your request to spend KES 2,500 on fuel for the Nakuru trip?');
  });

  it("Grace's leave policy goes to the Desk, said back first (an admin or a lead only)", async () => {
    const could = { ...nothing, desk: { organisation: 'Msingi Foods' } };
    const doc = { fileName: 'Msingi leave policy.pdf', named: true, what: 'document', caption: 'our leave policy, add for everyone', words: 'Annual leave. Every employee gets 21 days.' };
    const model = said('desk');
    expect(await whatAFileIsFor(model as any, could, doc)).toBe('desk');
    expect((model.mock.calls[0] as any)[1][0].content).toContain('desk (on the Desk, for everyone at Msingi Foods)');
    expect(thePlaces({ ...nothing })).not.toContain('desk');
  });

  it("Wairimu's PDF goes in the report she asked for", async () => {
    const could = { ...nothing, report: true };
    expect(await whatAFileIsFor(said('report') as any, could, { fileName: 'Q4 sales.pdf', named: true, what: 'document', caption: 'use this in the report too', words: 'Q4 sales by account' })).toBe('report');
  });

  it('a photo sent during a check-in, with nothing else waiting, goes on the check-in as before', async () => {
    expect(await whatAFileIsFor(undefined, { ...nothing, checkIn: { label: 'Sales team, Q4' } }, { ...PHOTO, caption: '' })).toBe('check-in');
  });

  it('where the caption does not say, or the model names somewhere it cannot go, Ask asks plainly what it is for', async () => {
    const could = { ...nothing, spending: true, desk: { organisation: 'Msingi Foods' } };
    expect(await whatAFileIsFor(said('report') as any, could, { ...PHOTO, caption: 'fuel for nakuru trip pls refund' })).toBe('unclear');
    expect(await whatAFileIsFor(undefined, could, { ...PHOTO, caption: 'fuel for nakuru trip pls refund' })).toBe('unclear');
    expect(whatIsItFor(PHOTO, could)).toBe('Your photo is here. What is it for? It can go on the Desk, for everyone at Msingi Foods or with a new request to spend money. Tell me which, in your own words.');
    expect(whatIsItFor(PHOTO, nothing)).toBe('I have your photo, but there is nothing it can go with yet. No check-in of yours is open, and nothing of yours is waiting for a file. Tell me what it is for, and I will tell you where it can go.');
  });

  it('on WhatsApp no file is refused before the decision: in Ask, with nothing open, and during a check-in', () => {
    const door = fs.readFileSync(path.join(__dirname, '../public-api/whatsapp-for-an-organisation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const decide = 'await this.aFileHasArrived(';
    expect(door.split(decide).length - 1).toBe(3);
    expect(door.indexOf(decide)).toBeLessThan(door.indexOf("if (arrived.kind !== 'text') { await say(ASK_READS_WORDS(ask)); return; }"));
    expect(door.indexOf(decide, door.indexOf(decide) + 1)).toBeLessThan(door.indexOf("await say('There is no check-in open to put that on."));
    expect(door).toContain("if (userId && this.reportsOnRequest && arrived.kind === 'text') {");
  });
});

/** Ask, as each person reads it: Peter (member, his request waiting), Grace (admin), and a member who sends Grace's caption. */
function ask(o: { role: string; waiting?: any; modelSays?: string; parked?: any }) {
  const proposals: any[] = [];
  const row: any = o.waiting ? { ...o.waiting } : null;
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'ext-1', active: true, linkedUserId: 'u-me', email: 'me@msingi.test' })), findMany: jest.fn(async () => []) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: o.role })), findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Msingi Foods' })) },
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true })) },
    spendRequest: { findFirst: jest.fn(async () => row), findUnique: jest.fn(async () => row), update: jest.fn(async ({ data }: any) => Object.assign(row, data)) },
    assistantProposal: {
      findFirst: jest.fn(async () => o.parked ?? null),
      findMany: jest.fn(async () => []),
      create: jest.fn(async ({ data }: any) => { const p = { id: `pr${proposals.length + 1}`, ...data }; proposals.push(p); return p; }),
      update: jest.fn(async ({ where, data }: any) => { proposals.push({ id: where.id, ...data }); return data; }),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
  };
  const db: any = new Proxy(prisma, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) }) });
  const checkForChat = jest.fn(async () => ({ currency: 'KES', approverFirstName: 'Wairimu' }));
  const engine = { respond: jest.fn(async () => { throw new Error('model off'); }), extract: jest.fn(async () => (o.modelSays ? { for: o.modelSays } : null)) };
  const none = { start: async () => { throw new Error('none'); } } as any;
  const service = new AssistantService(
    db, engine as any, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    none, { forPerson: async () => { throw new Error('none'); } } as any,
    { read: async () => ({ read: false, because: 'none' }) } as any,
    { sendRoundDigest: async () => { throw new Error('none'); } } as any,
    {} as any, undefined, undefined, undefined, undefined, { checkForChat } as any,
  );
  return { service, proposals, row };
}
const textOf = (r: any) => (r?.blocks ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
const PETERS_REQUEST = { id: 'sr-peter', organizationId: 'org-msingi', userId: 'u-me', status: 'waiting', attachedName: null, amount: 2500, what: 'fuel for the Nakuru trip' };

describe('what each person reads when a file arrives on WhatsApp', () => {
  it('Peter: his photo is said back against his waiting request, and attached only on his yes', async () => {
    const a = ask({ role: 'MEMBER', waiting: PETERS_REQUEST });
    const got = await a.service.aFileArrived('org-msingi', 'p1', 'u-me', { ...PHOTO, caption: '', mimeType: 'image/jpeg', buffer: Buffer.from('x'), words: '' }, { checkIn: null });
    expect(got.for).toBe('receipt');
    expect(textOf(got.reply)).toBe('Shall I attach your photo to your request to spend KES 2,500 on fuel for the Nakuru trip?');
    expect(a.row.attachedName).toBeNull();
    const parked = a.proposals[0];
    const yes = ask({ role: 'MEMBER', waiting: PETERS_REQUEST, parked: { ...parked, state: 'PARKED', createdAt: new Date() } });
    const after = await yes.service.respond('org-msingi', 'p1', 'yes');
    expect(textOf(after)).toBe('I attached your photo to your request, so Wairimu can read it with the request.');
    expect(yes.row).toMatchObject({ attachedName: PHOTO.fileName, attachedKind: 'receipt' });
  });

  it('Grace, an admin: "our leave policy, add for everyone" is said back for the Desk, and nothing is added before her yes', async () => {
    const g = ask({ role: 'ADMIN', modelSays: 'desk' });
    const got = await g.service.aFileArrived('org-msingi', 'p1', 'u-me', { fileName: 'Msingi leave policy.pdf', named: true, what: 'document', caption: 'our leave policy, add for everyone', mimeType: 'application/pdf', buffer: Buffer.from('x'), words: 'Annual leave. Every employee gets 21 days of annual leave a year.' }, { checkIn: null });
    expect(got.for).toBe('desk');
    expect(g.proposals.some((p) => p.kind === 'organisation_document' && p.state === 'PARKED')).toBe(true);
    expect(textOf(got.reply)).toMatch(/Msingi leave policy/);
    expect(textOf(got.reply)).not.toMatch(/There is no check-in open/);
  });

  it('a member who sends the same caption is not offered the Desk, and is asked plainly what it is for', async () => {
    const m = ask({ role: 'MEMBER', modelSays: 'desk' });
    const got = await m.service.aFileArrived('org-msingi', 'p1', 'u-me', { fileName: 'Msingi leave policy.pdf', named: true, what: 'document', caption: 'our leave policy, add for everyone', mimeType: 'application/pdf', buffer: Buffer.from('x'), words: 'Annual leave.' }, { checkIn: null });
    expect(got.for).toBe('unclear');
    expect(textOf(got.reply)).toBe('“Msingi leave policy.pdf” is here. What is it for? It can go with a new request to spend money. Tell me which, in your own words.');
  });
});
