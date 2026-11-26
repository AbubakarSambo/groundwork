/**
 * A REPORT ON REQUEST, AS EACH READER READS IT (Batch S, S8).
 *
 * Read as a person reads it: the words of each step, for a department head, a member of the same department and the lead of another
 * department. The fake database holds only what the reads ask for; the model is a stand-in that answers the way a model would.
 */
jest.mock('../assistant/a-quarter-or-a-year-by-asking', () => ({
  theDeskInOneSentence: async () => 'the company’s priorities are "Ship the Lagos hub" and "Cut late deliveries".',
}));
import { ReportsOnRequestService, REPORT_ON_REQUEST_KIND } from './reports-on-request.service';
import { inParts } from './the-report-on-request';
import { AForwardFromATeamMemberService } from '../public-api/a-forward-from-a-team-member.service';
import { LocalInboundMailController } from '../public-api/local-inbound-mail.controller';

const ORG = 'org-1';
const T0 = new Date('2026-11-01T09:00:00Z');

function aWorld() {
  const users: any[] = [
    { id: 'u-fatima', role: 'LEAD', email: 'fatima@acme.test', firstName: 'Fatima', lastName: 'Wali' },
    { id: 'u-emeka', role: 'LEAD', email: 'emeka@acme.test', firstName: 'Emeka', lastName: 'Obi' },
    { id: 'u-ruth', role: 'LEAD', email: 'ruth@acme.test', firstName: 'Ruth', lastName: 'Achieng' },
    { id: 'u-amina', role: 'MEMBER', email: 'amina@acme.test', firstName: 'Amina', lastName: 'Bello' },
    { id: 'u-tunde', role: 'MEMBER', email: 'tunde@acme.test', firstName: 'Tunde', lastName: 'Ade' },
  ];
  const people: any[] = [
    { id: 'p-fatima', organizationId: ORG, linkedUserId: 'u-fatima', externalId: 'x-fatima', department: 'Operations', email: 'fatima@acme.test', givenName: 'Fatima', active: true },
    { id: 'p-emeka', organizationId: ORG, linkedUserId: 'u-emeka', externalId: 'x-emeka', department: 'Operations' },
    { id: 'p-ruth', organizationId: ORG, linkedUserId: 'u-ruth', externalId: 'x-ruth', department: 'Finance' },
    { id: 'p-amina', organizationId: ORG, linkedUserId: 'u-amina', externalId: 'x-amina', department: 'Operations' },
    { id: 'p-tunde', organizationId: ORG, linkedUserId: 'u-tunde', externalId: 'x-tunde', department: 'Operations' },
  ];
  const party = (id: string, userId: string, partyType: 'INITIATOR' | 'PARTICIPANT', n: number) => ({ id, userId, partyType, createdAt: new Date(T0.getTime() + n), email: users.find((u) => u.id === userId)!.email, nameGiven: null, organisationGiven: null, user: users.find((u) => u.id === userId) });
  const released = (sharedPicture: string) => ({ theOpening: null, sharedPicture, agreements: [], divergences: [], centralQuestion: '', releasedAt: T0 });
  const grounds: any[] = [
    /* Fatima's own check-in. */
    { id: 'g-dispatch', organizationId: ORG, label: 'Dispatch weekly', scenario: 'WORKPLAN', initiatorId: 'u-fatima', createdByUserId: 'u-fatima', overWhatsApp: true,
      participants: [party('pa-f', 'u-fatima', 'INITIATOR', 0), party('pa-t', 'u-tunde', 'PARTICIPANT', 1)],
      report: { ...released('The initiator and Participant A agree the Ikeja van is late twice a week.'), releasedAt: null } },
    /* Emeka runs it, and Emeka is in Operations, as Fatima is. Amina takes part. */
    { id: 'g-warehouse', organizationId: ORG, label: 'Warehouse daily', scenario: 'WORKPLAN', initiatorId: 'u-emeka', createdByUserId: 'u-emeka', overWhatsApp: true,
      participants: [party('pb-e', 'u-emeka', 'INITIATOR', 0), party('pb-a', 'u-amina', 'PARTICIPANT', 1)],
      report: released('Participant A says stock counts now match the system on four days out of five.') },
    /* An evaluation in Operations: never read by a lead of the same department. */
    { id: 'g-plan', organizationId: ORG, label: 'Performance plan for a driver', scenario: 'PIP', initiatorId: 'u-emeka', createdByUserId: 'u-emeka', overWhatsApp: true,
      participants: [party('pc-e', 'u-emeka', 'INITIATOR', 0)], report: released('Participant A missed three routes.') },
    /* Finance, run by Ruth, with Fatima taking part: she may read it, and it is still not her department's. */
    { id: 'g-budget', organizationId: ORG, label: 'Budget review', scenario: 'WORKPLAN', initiatorId: 'u-ruth', createdByUserId: 'u-ruth', overWhatsApp: true,
      participants: [party('pe-r', 'u-ruth', 'INITIATOR', 0), party('pe-f', 'u-fatima', 'PARTICIPANT', 1)], report: released('The budget is two weeks late.') },
    /* Finance, run by Ruth: not Fatima's department. */
    { id: 'g-finance', organizationId: ORG, label: 'Finance month-end', scenario: 'WORKPLAN', initiatorId: 'u-ruth', createdByUserId: 'u-ruth', overWhatsApp: true,
      participants: [party('pd-r', 'u-ruth', 'INITIATOR', 0)], report: released('The month-end close took nine days.') },
  ];
  const contextItems: any[] = [
    { groundId: 'g-dispatch', closedAt: null, audience: 'EVERYONE', kind: 'WAY_OF_WORKING', text: 'Every late van is logged before noon.', createdAt: T0 },
    { groundId: 'g-warehouse', closedAt: null, audience: 'EVERYONE', kind: 'COACHING', text: 'Coach the night shift on cycle counts.', createdAt: T0 },
    { groundId: 'g-dispatch', closedAt: null, audience: 'LEAD_ONLY', kind: 'PERSON_NOTE', text: 'Tunde is struggling.', createdAt: T0 },
  ];
  const requests: any[] = [];
  const materials: any[] = [];
  const proposals: any[] = [];
  const turns: any[] = [];
  let n = 0;
  const id = (p: string) => `${p}-${++n}`;
  const where = (row: any, w: any): boolean => Object.entries(w ?? {}).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      if ('in' in v) return v.in.includes(row[k]);
      if ('notIn' in v) return !v.notIn.includes(row[k]);
      if ('not' in v) return row[k] !== v.not;
      return where(row[k], v);
    }
    return row[k] === v;
  });
  const prisma: any = {
    user: { findUnique: async ({ where: w }: any) => users.find((u) => u.id === w.id) ?? null, findFirst: async () => null, findMany: async () => [] },
    inboundForward: { findUnique: async () => null, findFirst: async () => null, create: async ({ data }: any) => data, update: async ({ data }: any) => data },
    organization: { findUnique: async () => ({ id: ORG, slug: 'acme', name: 'Acme' }) },
    person: {
      findMany: async ({ where: w }: any) => people.filter((p) => p.organizationId === w.organizationId && (!w.linkedUserId?.in || w.linkedUserId.in.includes(p.linkedUserId)) && (!w.email || p.email === String(w.email.equals).toLowerCase())),
      findFirst: async ({ where: w }: any) => people.find((p) => p.organizationId === w.organizationId && p.linkedUserId === w.linkedUserId) ?? null,
    },
    ground: {
      findMany: async ({ where: w }: any) => grounds.filter((g) => where(g, w)).map((g) => ({ ...g, participants: g.participants.map((p: any) => ({ userId: p.userId })) })),
      findUnique: async ({ where: w }: any) => grounds.find((g) => g.id === w.id) ?? null,
    },
    groundContextItem: { findMany: async ({ where: w }: any) => contextItems.filter((c) => where(c, w)) },
    reportOnRequest: {
      findFirst: async ({ where: w }: any) => requests.filter((r) => where(r, w)).sort((a, b) => b.createdAt - a.createdAt)[0] ?? null,
      findUnique: async ({ where: w }: any) => requests.find((r) => r.id === w.id) ?? null,
      findMany: async ({ where: w }: any) => requests.filter((r) => where(r, w)),
      create: async ({ data }: any) => { const r = { id: id('req'), createdAt: new Date(T0.getTime() + n), ...data }; requests.push(r); return r; },
      update: async ({ where: w, data }: any) => Object.assign(requests.find((r) => r.id === w.id), data),
    },
    reportMaterial: {
      findUnique: async ({ where: w }: any) => (w.id ? materials.find((m) => m.id === w.id) : materials.find((m) => m.requestId === w.requestId_contentHash.requestId && m.contentHash === w.requestId_contentHash.contentHash)) ?? null,
      findMany: async ({ where: w }: any) => materials.filter((m) => where({ readAt: null, ...m }, w)),
      create: async ({ data }: any) => { const m = { id: id('mat'), receivedAt: new Date(T0.getTime() + n), readAt: null, ...data }; materials.push(m); return m; },
      update: async ({ where: w, data }: any) => Object.assign(materials.find((m) => m.id === w.id), data),
    },
    assistantTurn: { create: async ({ data }: any) => { turns.push(data); return data; } },
    assistantProposal: {
      findFirst: async ({ where: w }: any) => proposals.filter((p) => where(p, w)).slice(-1)[0] ?? null,
      findMany: async ({ where: w }: any) => proposals.filter((p) => where(p, w)),
      create: async ({ data }: any) => { const p = { id: id('prop'), state: 'PARKED', ...data }; proposals.push(p); return p; },
      update: async ({ where: w, data }: any) => Object.assign(proposals.find((p) => p.id === w.id), data),
    },
  };
  return { prisma, requests, materials, proposals, turns };
}

/** A stand-in for Gemini that reads the way a model would, and remembers what it was sent. */
function aModel() {
  const sent: { schema: string; content: string }[] = [];
  const seen = new Map<string, string>();
  const engine = {
    extract: async (_system: string, history: any[], schema: any) => {
      const content = String(history[0]?.content ?? '');
      sent.push({ schema: schema.name, content });
      const words = /<<<\n([\s\S]*?)\n>>>/.exec(content)?.[1] ?? content;
      if (schema.name === 'what_they_mean') return { kind: /report/i.test(content) ? 'report' : 'question', about: 'my departments' };
      if (schema.name === 'what_they_mean_about_the_report') {
        if (/again/i.test(words)) return { means: 'again' };
        if (/^(yes|looks good)/i.test(words)) return { means: 'approve' };
        if (/drop|add/i.test(words)) return { means: 'change' };
        if (/Step: new/.test(content)) return { means: 'other' };
        if (/ready|outline/i.test(words)) return { means: 'ready' };
        if (/stop/i.test(words)) return { means: 'stop' };
        return { means: 'other' };
      }
      if (schema.name === 'the_outline') {
        /* The sources come as short ids (C1, D1...) with their names; a model names them back the same way. */
        const listed = [...content.matchAll(/^- ([CD]\d+): (.+)$/gm)].map((m) => ({ id: m[1], label: m[2] }));
        const ids = (test: (label: string, id: string) => boolean) => listed.filter((x) => test(x.label, x.id)).map((x) => x.id);
        const dropDesk = /drop the desk/i.test(content);
        return { sections: [
          { heading: 'How the warehouse and dispatch are doing', sourceIds: ids((l) => l.startsWith('the report on')) },
          { heading: 'What the March figures say', sourceIds: ids((_, id) => id.startsWith('D')) },
          ...(dropDesk ? [] : [{ heading: 'How this fits the company’s priorities', sourceIds: ids((l) => l.startsWith('the Desk')) }]),
          ...(/blocking us/i.test(content) ? [{ heading: 'What is blocking us', sourceIds: ids((l) => l.startsWith('the report on "Dispatch weekly"')) }] : []),
        ] };
      }
      if (schema.name === 'the_reading') {
        return { whatItIs: 'A forwarded email with the March delivery figures', period: 'March', from: 'Dispatch', summary: 'March deliveries were 412, up from 380 in February.',
          facts: [{ text: 'March deliveries were 412, up from 380 in February.', where: 'the first line' }], figures: [{ what: 'March deliveries', value: '412', where: 'the first line', working: '412 counted in the email' }],
          openMatters: [], notes: [], problems: [] };
      }
      if (schema.name === 'read_across') return { patterns: [{ text: 'The Ikeja van is late every week the reports cover.', sourceIds: ['C1'] }], disagreements: [], missing: [], gaps: [] };
      /* The short ids the model was given, gathered from every request so far: check-ins are C, documents D. */
      for (const x of content.matchAll(/(?:SOURCE|DOCUMENT) ([CD]\d+): ([^\n]*)/g)) seen.set(x[2], x[1]);
      const short = (name: string) => [...seen.entries()].find(([line]) => line.includes(name))?.[1] ?? 'none';
      if (schema.name === 'a_section_from_the_readings') {
        /* Each section is written from its own documents' readings only. */
        if (!/(?:SOURCE|DOCUMENT) [CD]\d+: [^\n]*Dispatch weekly/.test(content)) return { blocks: [{ kind: 'line', text: 'March deliveries were 412, up from 380 in February', sourceIds: [short('March')] }], register: [], gaps: [] };
        return {
          blocks: [{ kind: 'line', text: 'The Ikeja van is late twice a week', sourceIds: [short('Dispatch weekly')] }],
          register: [{ action: 'Log every late van before noon', owner: 'Dispatch lead', due: '30 November', priority: 'High', sourceIds: [short('Dispatch weekly')] }],
          gaps: [{ gap: 'No fuel costs were given', limits: 'The cost of the late van', recordsNeeded: 'The fuel receipts for March', who: 'Dispatch', beforeFinal: true, sourceIds: [] }],
        };
      }
      if (schema.name === 'the_report_framed') {
        return {
          title: 'How my departments are doing',
          summary: [{ text: 'Deliveries are up and the van is still late', sourceIds: [short('Warehouse daily'), short('Dispatch weekly'), short('March')] }],
          knowFirst: [
            { text: 'Stock counts now match the system on four days out of five', sourceIds: [short('Warehouse daily')] },
            { text: 'March deliveries were 412, up from 380 in February', sourceIds: [short('March')] },
            { text: 'The new route will save money', sourceIds: ['checkin:g-finance'] },
          ],
          patterns: [], decisions: [{ text: 'Decide whether to replace the Ikeja van', when: 'this month', sourceIds: [short('Dispatch weekly')] }],
          gaps: [{ gap: 'No fuel costs were given', limits: 'The cost of the late van', recordsNeeded: 'The fuel receipts for March', who: 'Dispatch', beforeFinal: true, sourceIds: [] }],
        };
      }
      return null;
    },
  };
  return { engine, sent };
}

const documents: any = { textOutOf: async (f: any) => (String(f.originalname).endsWith('.zip') ? '' : f.buffer.toString('utf8')) };

function aService(w = aWorld(), m = aModel()) {
  const mailed: { to: string; subject: string; text: string; files: { filename: string }[] }[] = [];
  const email: any = { sendTheYearEndFiles: async (to: string, subject: string, text: string, files: any[]) => { mailed.push({ to, subject, text, files }); return 'sent'; } };
  return { w, m, mailed, svc: new ReportsOnRequestService(w.prisma, documents, m.engine as any, { getActive: async () => null } as any, null as any, email) };
}

/** Every document added is read before the outline, as it is in the product while they are still adding. */
async function allRead(svc: ReportsOnRequestService, w: ReturnType<typeof aWorld>) { for (const m of w.materials) await svc.readSoon(m.id); }

describe('a report on request, as each reader reads it', () => {
  it('a department head is told what she can draw on: her own check-in and her department’s, never an evaluation or another department’s', async () => {
    const { svc } = aService();
    const r = await svc.start({ organizationId: ORG, userId: 'u-fatima', message: 'Can you prepare a report on my departments?', channel: 'chat' });
    expect(r!.said).toContain('I can draw on the check-ins you can read, which are "Dispatch weekly" and "Warehouse daily".');
    expect(r!.said).toContain('I can also use the Desk, References and resources for the check-ins you run and anything you add.');
    expect(r!.said).toContain('Forward me the emails or upload the documents you want included.');
    expect(r!.said).toContain('forward emails to assistant+acme@myground.work');
    expect(r!.said).toContain("When you have added what you want, tell me, and I'll send you a first outline to check.");
    expect(r!.said).not.toMatch(/Finance month-end|Performance plan|Budget review/);
  });

  it('a member of the same department does not get the department’s check-ins this way, only the ones she takes part in', async () => {
    const { svc } = aService();
    const r = await svc.start({ organizationId: ORG, userId: 'u-amina', message: 'I need a report on my department', channel: 'chat' });
    expect(r!.said).toContain('which is "Warehouse daily"');
    expect(r!.said).not.toMatch(/Dispatch weekly|Finance month-end|Performance plan/);
    /* She takes part, so she reads the rules and decisions of it, never the lead's coaching lines. */
    expect(r!.said).not.toContain('References and resources');
  });

  it('a member who takes part in nothing is told plainly what it would be written from', async () => {
    const w = aWorld();
    w.prisma.ground.findMany = async () => [];
    const { svc } = aService(w);
    const r = await svc.start({ organizationId: ORG, userId: 'u-tunde', message: 'report please', channel: 'chat' });
    expect(r!.said).toContain('I cannot see any check-ins you can read yet, so I would write it from the Desk and anything you add.');
  });

  it('the whole exchange on the web: ask, a forwarded email read whole, the outline, a change, the yes, the report in the chat and its files by email', async () => {
    const { svc, w, m, mailed } = aService();
    const ask = { organizationId: ORG, userId: 'u-fatima' };
    await svc.start({ ...ask, message: 'Can you prepare a report on my departments and their check-ins?', channel: 'chat', about: 'your departments' });
    expect(w.proposals.filter((p) => p.kind === REPORT_ON_REQUEST_KIND && p.state === 'PARKED')).toHaveLength(1);

    const mail = await svc.byEmail({ ...ask, subject: 'Fwd: March figures', newWords: '', wholeBody: '---------- Forwarded message ---------\nMarch deliveries were 412, up from 380 in February.', hasFiles: true, files: async () => [{ name: 'routes.zip', mimeType: 'application/zip', bytes: Buffer.from('x') }] });
    expect(mail).toBe('Thank you. I have the email "March figures" you forwarded. I am reading all of it now, and I will use it in your report. I could not open routes.zip. Please send it again as a PDF, a Word file or plain text. Send me anything else, or reply when you are ready for the outline.');

    const again = await svc.byEmail({ ...ask, subject: 'Fwd: March figures', newWords: '', wholeBody: '---------- Forwarded message ---------\nMarch deliveries were 412, up from 380 in February.', hasFiles: false, files: async () => [] });
    expect(again).toContain('I already had the email "March figures" you forwarded, so I did not read it again.');
    expect(w.materials).toHaveLength(1);
    /* The outline waits for the readings: asked before they are done, it says so. */
    w.materials[0].readAt = null;
    const early = await svc.hear({ ...ask, message: "That's everything, send me the outline.", channel: 'chat' });
    expect(early!.said).toBe('I am still reading one of the 1 documents you gave me. I plan the outline from all of each document, so ask me for it again in a few minutes.');
    await allRead(svc, w);
    expect(w.materials[0].reading.summary).toBe('March deliveries were 412, up from 380 in February.');

    const outline = await svc.hear({ ...ask, message: "That's everything, send me the outline.", channel: 'chat' });
    expect(outline!.said).toContain('Here is a first outline to check. It has 3 sections.');
    expect(outline!.said).toContain('1. How the warehouse and dispatch are doing. This would use the report on "Dispatch weekly" and the report on "Warehouse daily".');
    expect(outline!.said).toContain('2. What the March figures say. This would use the email "March figures" you forwarded.');
    expect(outline!.said).toContain('3. How this fits the company’s priorities. This would use the Desk.');
    /* Before it is released, a lead's own check-in reads its forming picture; Fatima runs Dispatch weekly. */
    expect(outline!.said).not.toMatch(/Finance|Performance plan/);

    const changed = await svc.hear({ ...ask, message: 'Drop the Desk please.', channel: 'chat' });
    expect(changed!.said).toContain('Here is the outline with your changes. It has 2 sections.');
    expect(changed!.said).toContain('It does not use References and resources for "Dispatch weekly" and the Desk. Tell me if you want any of them in.');

    const yes = await svc.hear({ ...ask, message: 'Yes, looks good.', channel: 'chat' });
    expect(yes!.said).toBe('Thank you. I am reading your document together and writing the report now. It takes a few minutes. I will put it here and email you the Word and Excel files when it is ready.');
    await svc.whenWritten(w.requests[0].id);
    const report = w.turns.slice(-1)[0].content as string;
    console.log(`FATIMA READS IN ASK\n${report}`);
    expect(report).toContain('Here is your report, "How my departments are doing", written on');
    expect(report).toContain('1. Stock counts now match the system on four days out of five. This is from the report on "Warehouse daily".');
    expect(report).toContain('2. March deliveries were 412, up from 380 in February. This is from March figures.');
    /* A source she may not read, named by the model, backs nothing. */
    expect(report).toContain('3. The new route will save money. I could not find this in any of the documents, so treat it as unverified.');
    expect(report).toContain('1. No fuel costs were given. Dispatch can supply the fuel receipts for March.');
    expect(report).toContain('If you want, I can set up check-ins to ask the people who can close these gaps for the updates.');
    expect(report).toContain('I have emailed both to fatima@acme.test.');
    expect(report).toContain('I have kept this report, so you can ask me for it again at any time.');
    /* The files go to her and nobody else. */
    expect(mailed).toHaveLength(1);
    expect(mailed[0].to).toBe('fatima@acme.test');
    expect(mailed[0].files.map((f) => f.filename)).toEqual(['How my departments are doing.docx', 'How my departments are doing - actions register and evidence.xlsx']);
    /* Only the chosen sources were sent to the model: not the Desk she dropped, nor Finance. */
    const toTheWriter = m.sent.filter((s) => s.schema === 'a_section_from_the_readings' || s.schema === 'the_report_framed').map((s) => s.content).join('\n');
    expect(m.sent.filter((s) => s.schema === 'a_section_from_the_readings')).toHaveLength(2);
    expect(toTheWriter).not.toMatch(/month-end close|Ship the Lagos hub|missed three routes/);
    expect(w.requests[0].status).toBe('built');
    expect(w.proposals.find((p) => p.kind === REPORT_ON_REQUEST_KIND)!.state).toBe('ACCEPTED');

    /* Kept, so asked again it is sent again. */
    const later = await svc.start({ ...ask, message: 'Can you send me that report again?', channel: 'chat' });
    expect(later!.said).toBe(report);
  });

  it('a department head reads a colleague’s check-in without the names in it; the lead who runs it reads them', async () => {
    const { svc, m } = aService();
    await svc.start({ organizationId: ORG, userId: 'u-fatima', message: 'report on my departments', channel: 'chat' });
    await svc.hear({ organizationId: ORG, userId: 'u-fatima', message: 'ready for the outline', channel: 'chat' });
    const asked = m.sent.filter((s) => s.schema === 'the_outline').pop()!.content;
    expect(asked).toMatch(/C\d+: the report on "Warehouse daily"\. a colleague says stock counts/i);
    expect(asked).not.toMatch(/Amina|Emeka/);
    expect(asked).not.toContain('Tunde is struggling');

    const lead = aService();
    await lead.svc.start({ organizationId: ORG, userId: 'u-emeka', message: 'report on my team', channel: 'chat' });
    await lead.svc.hear({ organizationId: ORG, userId: 'u-emeka', message: 'ready', channel: 'chat' });
    expect(lead.m.sent.filter((s) => s.schema === 'the_outline').pop()!.content).toContain('Amina');
  });

  it('stop stops it, and words about something else are left for the chat', async () => {
    const { svc, w } = aService();
    await svc.start({ organizationId: ORG, userId: 'u-fatima', message: 'report on my departments', channel: 'chat' });
    expect(await svc.hear({ organizationId: ORG, userId: 'u-fatima', message: 'When is my next check-in?', channel: 'chat' })).toBeNull();
    expect((await svc.hear({ organizationId: ORG, userId: 'u-fatima', message: 'Stop.', channel: 'chat' }))!.said).toBe('Understood. I have stopped work on that report, and nothing was written. Ask me again whenever you want one.');
    expect(w.requests[0].status).toBe('stopped');
  });

  it('by email, a mail that asks for a report starts one, and the opening says how to send things by mail', async () => {
    const { svc } = aService();
    const said = await svc.byEmail({ organizationId: ORG, userId: 'u-fatima', subject: 'Report', newWords: 'Please put together a report on my departments.', wholeBody: 'Please put together a report on my departments.', hasFiles: false, files: async () => [] });
    expect(said).toContain('You can reply to this email with them attached, or forward them to assistant+acme@myground.work.');
    expect(said).toContain('I read each one once.');
  });

  it('by email, a new report asked for while an outline waits is answered about that report, never "You have no check-in open" (release test of 22 November 2026, 106)', async () => {
    const { svc } = aService();
    await svc.start({ organizationId: ORG, userId: 'u-fatima', message: 'report on my departments', channel: 'chat' });
    await svc.hear({ organizationId: ORG, userId: 'u-fatima', message: 'ready for the outline', channel: 'chat' });
    const said = await svc.byEmail({ organizationId: ORG, userId: 'u-fatima', subject: 'report', newWords: 'can you write me a short report on how my departments are going this month?', wholeBody: 'can you write me a short report on how my departments are going this month?', hasFiles: false, files: async () => [] });
    console.log(`FATIMA EMAILS FOR A REPORT WHILE AN OUTLINE WAITS, AND READS\n${said}`);
    expect(said).toMatch(/^The report you asked for is still waiting for you to check its outline\. It has \d sections\./);
    expect(said).not.toContain('with your changes');
  });

  it('on WhatsApp, a document is kept for the report, and a long report is sent in whole paragraphs', async () => {
    const { svc, w } = aService();
    await svc.start({ organizationId: ORG, userId: 'u-fatima', message: 'report', channel: 'whatsapp' });
    const said = await svc.onWhatsApp({ organizationId: ORG, userId: 'u-fatima', arrived: { kind: 'media', what: 'document', mediaId: 'm1', mimeType: 'text/plain', fileName: 'Budget.txt' }, fetchMedia: async () => ({ buffer: Buffer.from('The Q4 budget is 2.1 million naira.'), mimeType: 'text/plain' }) });
    expect(said).toBe('Thank you. I have the document Budget.txt you sent on WhatsApp. I am reading all of it now, and I will use it in your report. Add anything else, or tell me when you are ready for the outline.');
    expect(w.materials[0].via).toBe('whatsapp');
    const parts = inParts(['a'.repeat(3000), 'b'.repeat(3000), 'c'.repeat(100)].join('\n\n'));
    expect(parts).toHaveLength(2);
    expect(parts.every((p) => p.length <= 3800)).toBe(true);
    /* Dangote rerun, N2: one paragraph of 9,000 characters reached Fatima cut off after 3,800, mid-sentence. Every sentence arrives, in parts. */
    const sayBack = Array.from({ length: 64 }, (_, i) => `I will write to Person ${i} on WhatsApp and ask about “the matter still open with them”, which is still open.`).join(' ');
    const inPieces = inParts(sayBack);
    expect(inPieces.length).toBeGreaterThan(1);
    expect(inPieces.every((p) => p.length <= 3800)).toBe(true);
    expect(inPieces.join(' ').replace(/\s+/g, ' ')).toBe(sayBack.replace(/\s+/g, ' '));
    expect(inPieces.every((p) => /\.$/.test(p))).toBe(true);
  });

  it('with no model it never writes a report on a guess', async () => {
    const w = aWorld();
    const svc = new ReportsOnRequestService(w.prisma, documents, undefined, undefined, null as any);
    await svc.start({ organizationId: ORG, userId: 'u-fatima', message: 'report', channel: 'chat' });
    expect((await svc.hear({ organizationId: ORG, userId: 'u-fatima', message: 'ready', channel: 'chat' }))!.said).toContain('Here is a first outline to check.');
    expect((await svc.hear({ organizationId: ORG, userId: 'u-fatima', message: 'yes', channel: 'chat' }))!.said).toBe('I could not write the report just now. Your outline is kept, so tell me to try again when you are ready.');
    expect(w.requests[0].status).toBe('outline');
  });

  it('asked for the outline straight away, it sends one, with the section she asked for and how to add more (round 2, T8)', async () => {
    const { svc } = aService();
    const r = await svc.start({ organizationId: ORG, userId: 'u-fatima', message: 'can you show me the outline first and add a section on what is blocking us', channel: 'chat' });
    expect(r!.said).toContain('Here is a first outline to check.');
    expect(r!.said).toContain('What is blocking us. This would use the report on "Dispatch weekly".');
    expect(r!.said).toContain('Forward me the emails or upload the documents you want included.');
  });

  it('by email through POST dev/inbound-mail: ask, forward, outline, yes, and the report comes back as the reply (round 2, T8)', async () => {
    const { w, m, svc, mailed } = aService();
    const sent: { to: string; subject: string; text: string }[] = [];
    const email: any = { sendTheAssistantsReply: async (to: string, subject: string, text: string) => { sent.push({ to, subject, text }); return 'sent'; } };
    const whatsapp: any = { openCheckInsFor: async () => [], theirCheckInAccount: async () => null };
    const client: any = { attachment: async (_id: any, a: any) => (a.contentBase64 ? Buffer.from(a.contentBase64, 'base64') : null), body: async () => null };
    const forwards = new AForwardFromATeamMemberService(w.prisma, email, documents, {} as any, whatsapp, client, {} as any, m.engine as any, undefined, undefined, svc);
    const route = new LocalInboundMailController({ applyEvent: (e: any) => forwards.handle(e) } as any);
    const before = { env: process.env.NODE_ENV, allow: process.env.ALLOW_LOCAL_INBOUND_MAIL };
    process.env.NODE_ENV = 'development'; process.env.ALLOW_LOCAL_INBOUND_MAIL = 'true';
    try {
      const from = 'fatima@acme.test';
      await route.inject({ from, organizationSlug: 'acme', subject: 'Report', text: 'Please put together a report on my departments.' });
      expect(sent[0].text).toContain('You can reply to this email with them attached, or forward them to assistant+acme@myground.work.');
      await route.inject({ from, organizationSlug: 'acme', subject: 'Fwd: March figures', text: '---------- Forwarded message ---------\nMarch deliveries were 412, up from 380 in February.' });
      expect(sent[1].text).toContain('I have the email "March figures" you forwarded. I am reading all of it now');
      await allRead(svc, w);
      await route.inject({ from, organizationSlug: 'acme', subject: 'Re: Report', text: "That's everything, send me the outline.\n\nOn Fri, Groundwork wrote:\n> earlier" });
      expect(sent[2].text).toContain('Here is a first outline to check.');
      await route.inject({ from, organizationSlug: 'acme', subject: 'Re: Report', text: 'Yes, looks good.' });
      expect(sent[3].subject).toBe('Re: Report');
      expect(sent[3].text).toContain('I will email it to you, with the Word and Excel files, when it is ready.');
      await svc.whenWritten(w.requests[0].id);
      expect(mailed[0].text).toContain('2. March deliveries were 412, up from 380 in February. This is from March figures.');
      expect(w.requests[0]).toMatchObject({ status: 'built', channel: 'email' });
    } finally {
      process.env.NODE_ENV = before.env;
      if (before.allow === undefined) delete process.env.ALLOW_LOCAL_INBOUND_MAIL; else process.env.ALLOW_LOCAL_INBOUND_MAIL = before.allow;
    }
  });
});

describe('a finding in the chat names the documents it rests on (the documents test, 24 November 2026)', () => {
  it('names up to three documents, counts the rest, and says plainly when nothing backs a line', async () => {
    const { theReportInTheChat } = await import('./the-report-files');
    const doc = (n: number) => ({ id: `material:${n}`, kind: 'material' as const, label: `the document R${n}.docx you uploaded`, name: `R${n}.docx`, text: '' });
    const w: any = {
      title: 'The year', summary: [{ text: 'It was a busy year', sources: [doc(1)] }],
      knowFirst: [
        { text: 'The same error came back in fifteen weeks', sources: [doc(1), doc(2), doc(3), doc(4), doc(5)] },
        { text: 'The fair was paid twice', sources: [doc(1), doc(2)] },
        { text: 'The van is booked for April', sources: [] },
      ],
      patterns: [], sections: [], decisions: [], register: [], gaps: [], evidence: [], sources: [doc(1)],
    };
    const said = theReportInTheChat(w, { on: new Date('2026-11-20T09:00:00Z'), documents: 5, emailedTo: 'fatima@acme.test', channel: 'chat' });
    expect(said).toContain('1. The same error came back in fifteen weeks. This is from R1.docx, R2.docx and 3 other documents.');
    expect(said).toContain('2. The fair was paid twice. This is from R1.docx and R2.docx.');
    expect(said).toContain('3. The van is booked for April. I could not find this in any of the documents, so treat it as unverified.');
    expect(said).toContain('written on 20 November 2026 from all 5 documents you gave me.');
  });
});
