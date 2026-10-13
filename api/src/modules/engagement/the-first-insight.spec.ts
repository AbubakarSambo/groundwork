import { readFileSync } from 'fs';
import { join } from 'path';
import { ReportsService } from '../reports/reports.service';
import { EmailService } from '../email/email.service';
import { theFirstInsight } from './the-first-insight';

/**
 * THE FIRST MEANINGFUL INSIGHT IS IN THE MAIL (engagement spec section 7; section 36, journey 5), AS EACH PERSON READS IT.
 *
 * The report-ready mail was a link: its subject was a count and its body said the shared picture was open. The lead should read what the picture found.
 * These send through the real report-ready sender and the real mail door, with the report served to each person by a double for ReportsService.sessionReport
 * (which is the read that holds the privacy and naming rules), and check what the lead, a participant, and a person with no account actually receive.
 */
const SERVED = (over: any = {}) => ({
  state: 'final',
  whereThingsStand: {
    agreed: 2, stillOpen: 1,
    settled: ['The Kenya launch date is the first of March.', 'The budget is agreed.'],
    open: ['Who owns the next step with the distributor.'],
    openWithReasons: [{ topic: 'Who owns the next step with the distributor.', settledBy: 'Name one owner for the distributor by Friday.', positions: [], restsOn: [], atStake: null }],
    ...over.stand,
  },
  theConversationWorthHaving: 'Who is going to own the next step with the distributor, and by when?',
  ...over.top,
});

function world(serve: (userId: string) => any) {
  const sent: any[] = [];
  const prismaForMail: any = {
    notification: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) }, whatsAppSend: { findMany: jest.fn(async () => []) },
    person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) }, user: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    emailPreference: { findMany: jest.fn(async () => []) }, emailAddressPreference: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({ unsubscribeToken: 't' })) },
    emailDelivery: { findFirst: jest.fn(async () => null) }, groundParticipant: { findUnique: jest.fn(async () => null) }, scheduledEmail: { create: jest.fn() },
  };
  const email: any = new EmailService({ get: (k: string) => (k === 'resend.frontendUrl' ? 'https://app.test' : undefined) } as any, {} as any, prismaForMail);
  email.isDev = () => false;
  email.theResendClient = () => ({ emails: { send: jest.fn(async (m: any) => { sent.push(m); return { data: { id: 'x' }, error: null }; }) } });
  email.delivery = { recordSend: jest.fn(async () => undefined) };
  email.holdForTheMorning = jest.fn(async () => false);
  email.writeItDown = jest.fn(async () => undefined);

  const ground = {
    id: 'g1', label: 'Kenya launch', organizationId: 'org1', initiatorId: 'u-lead', scenario: 'ALIGNMENT', brief: '', simplerWords: false,
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'wairimu@x.test', inviteToken: null, wantsTheReport: null, user: { passwordHash: 'h' } },
      { id: 'p-abi', userId: 'u-abi', email: 'abigail@x.test', inviteToken: null, wantsTheReport: null, user: { passwordHash: 'h' } },
      { id: 'p-link', userId: null, email: 'omar@x.test', inviteToken: 'tok', wantsTheReport: null, user: null },
    ],
  };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    reportNotice: { findMany: jest.fn(async () => []), create: jest.fn(async () => ({})), deleteMany: jest.fn(async () => ({})) },
  };
  const service: any = new ReportsService(prisma, {} as any, {} as any, email, { get: () => 'https://app.test' } as any, { emit: () => Promise.resolve() } as any, {} as any, { tell: async () => [] } as any);
  service.sessionReport = jest.fn(async (_g: string, _n: number, userId: string) => serve(userId));
  return { service, sent };
}
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const to = (sent: any[], address: string) => sent.find((m) => m.to === address || (Array.isArray(m.to) && m.to.includes(address)));

describe('the finding is read at the moment of release, before the release is stamped', () => {
  it('as each person is served the picture they are about to read, with the team\'s picture not withheld from the participant (found on the test bed, journey 5)', async () => {
    const w = world(() => SERVED());
    await w.service.tellThemTheReportIsReady('g1', 1);
    expect(w.service.sessionReport).toHaveBeenCalledWith('g1', 1, 'u-lead', 'org1', true);
    expect(w.service.sessionReport).toHaveBeenCalledWith('g1', 1, 'u-abi', 'org1', true);
  });
  it('and the read honours it for the picture only: the words of the others stay walled until the release', () => {
    const src = readFileSync(join(__dirname, '..', 'reports', 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toContain('const pictureWithheld = !!me && !viewerIsLead && !released && !asIfReleased;');
    expect(src).toContain('const readableParticipantIds = released || viewerIsLead');
    expect(src).toContain('othersWordsAreNotYetOpen: !(released || viewerIsLead)');
  });
});

describe('the lead reads the finding, in the subject and in the body', () => {
  it('names what the people differ on, how many things are settled, the question worth answering and what to do first', async () => {
    const w = world(() => SERVED());
    await w.service.tellThemTheReportIsReady('g1', 1);
    const lead = to(w.sent, 'wairimu@x.test');
    expect(lead.subject).toBe('The people in "Kenya launch" differ on "Who owns the next step with the distributor"');
    const read = text(lead.html);
    expect(read).toContain('The people in "Kenya launch" differ on "Who owns the next step with the distributor".');
    expect(read).toContain('Two things are settled and one is still open.');
    expect(read).toContain('Here is a conversation worth having. Who is going to own the next step with the distributor, and by when?');
    expect(read).toContain('Here is what I would do first. Name one owner for the distributor by Friday.');
    expect(read).not.toMatch(/Your report is ready|is ready\.$/);
  });
});

describe('a participant reads the same finding, with no "what I would do" and no name in the subject', () => {
  it('keeps the count as the subject (decision 109 item 3) and puts the finding in the body', async () => {
    const w = world(() => SERVED());
    await w.service.tellThemTheReportIsReady('g1', 1);
    const abi = to(w.sent, 'abigail@x.test');
    expect(abi.subject).not.toContain('Who owns');
    expect(abi.subject).toContain('Kenya launch');
    const read = text(abi.html);
    expect(read).toContain('The people in "Kenya launch" differ on "Who owns the next step with the distributor".');
    expect(read).toContain('Two things are settled and one is still open.');
    expect(read).not.toContain('what I would do');
    expect(read).not.toContain('Name one owner for the distributor');
  });
});

describe('nothing is claimed that the report does not hold', () => {
  it('a report with nothing settled and nothing open sends the notice it always did', async () => {
    const w = world(() => SERVED({ stand: { agreed: 0, stillOpen: 0, settled: [], open: [], openWithReasons: [] }, top: { theConversationWorthHaving: null } }));
    await w.service.tellThemTheReportIsReady('g1', 1);
    const lead = to(w.sent, 'wairimu@x.test');
    expect(text(lead.html)).toContain('has now checked in, so the shared picture is open to all of you at the same moment.');
    expect(text(lead.html)).not.toContain('differ on');
  });
  it('a report that cannot be read for somebody sends them the notice it always did, and the others still read the finding', async () => {
    const w = world((userId) => { if (userId === 'u-abi') throw new Error('not yet let in'); return SERVED(); });
    await w.service.tellThemTheReportIsReady('g1', 1);
    expect(text(to(w.sent, 'abigail@x.test').html)).toContain('has now checked in, so the shared picture is open to all of you');
    expect(text(to(w.sent, 'wairimu@x.test').html)).toContain('differ on');
  });
  it('a person with no account is not given a finding read for nobody', async () => {
    const w = world(() => SERVED());
    await w.service.tellThemTheReportIsReady('g1', 1);
    expect(text(to(w.sent, 'omar@x.test').html)).not.toContain('differ on');
  });
  it('a participant who has not answered yet is told nothing of the finding', async () => {
    const w = world((userId) => (userId === 'u-abi' ? { sessionNumber: 1, withheldUntilYouAnswer: true, saying: 'forming' } : SERVED()));
    await w.service.tellThemTheReportIsReady('g1', 1);
    expect(text(to(w.sent, 'abigail@x.test').html)).not.toContain('differ on');
  });
});

describe('the words themselves', () => {
  it('say several differences without a list, and settled-with-none-open without a difference', () => {
    const many = theFirstInsight(SERVED({ stand: { open: ['Pricing.', 'Who signs off', 'The start date:'], agreed: 1, settled: ['x'], openWithReasons: [] } }), 'Q4', { isTheLead: true });
    expect(many!.subjectForTheLead).toBe('The people in "Q4" differ on "Pricing", and two more differences are still open');
    expect(many!.lines).toContain('One thing is settled and three are still open.');
    expect(many!.lines.join(' ')).toContain('What I would do is bring the people involved together on that one question.');
    const none = theFirstInsight(SERVED({ stand: { open: [], stillOpen: 0, agreed: 3, settled: ['a', 'b', 'c'], openWithReasons: [] } }), 'Q4', { isTheLead: true });
    expect(none!.subjectForTheLead).toBeNull();
    expect(none!.lines[0]).toBe('Three things in "Q4" are settled, and none are still open.');
  });
  it('says a difference the report wrote as a whole sentence as that sentence, and not after "differ on" (found on the test bed, journey 5)', () => {
    const real = SERVED({ stand: {
      open: ['Who owns the next step with the distributor is not agreed upon by the team.', 'Who has the authority to sign off on discounts is not clear to the team.'],
      agreed: 2, settled: ['The Q4 objective is a target of 120 million.', 'The team is working on individual commitments.'],
      openWithReasons: [{ settledBy: 'Agree on a single owner for the distributor relationship and communicate this to the entire team.' }],
    } });
    const i = theFirstInsight(real, 'Q4 priorities', { isTheLead: true })!;
    expect(i.subjectForTheLead).toBe('In "Q4 priorities", who owns the next step with the distributor is not agreed upon by the team, and one more difference is still open');
    expect(i.lines[0]).toBe('Who owns the next step with the distributor is not agreed upon by the team, and one more difference is still open.');
    expect(i.lines).toContain('Two things are settled and two are still open.');
    expect(i.lines).toContain('Here is what I would do first. Agree on a single owner for the distributor relationship and communicate this to the entire team.');
    const them = theFirstInsight(real, 'Q4 priorities', { isTheLead: false })!;
    expect(them.subjectForTheLead).toBeNull();
    expect(them.lines.join(' ')).not.toContain('what I would do');
    for (const l of [i.subjectForTheLead!, ...i.lines]) expect(l).not.toMatch(/differ on "Who|;|→/);
  });
  it('a long sentence is never cut in the middle and never makes a subject too long to read (found on the test bed)', () => {
    const long = 'The team\'s progress toward the 120,000,000 objective cannot be calculated because team members are measuring their contributions in different units.';
    const i = theFirstInsight(SERVED({ stand: { open: [long, 'Who signs off the discount is not agreed.'], agreed: 1, settled: ['x'], openWithReasons: [] } }), 'Q4 priorities', { isTheLead: true })!;
    expect(i.subjectForTheLead).toBe('The shared picture for "Q4 priorities" found two differences still open');
    expect(i.lines[0]).toBe('The team\'s progress toward the 120,000,000 objective cannot be calculated because team members are measuring their contributions in different units, and one more difference is still open.');
    expect(i.lines.join(' ')).not.toContain('...');
  });
  it('never put a colon, an arrow or a dash between pieces', () => {
    const i = theFirstInsight(SERVED(), 'Kenya launch', { isTheLead: true })!;
    for (const l of [i.subjectForTheLead!, ...i.lines]) expect(l).not.toMatch(/ [:–—-] |→|;/);
  });
});

describe('"I can help you do that": the way into Ask about the finding (screens request 198)', () => {
  const links = (html: string) => [...html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => ({ href: m[1], says: m[2].trim() }));

  it('the lead\'s main link is Ask about this check-in, and the shared picture is still one plain link away', async () => {
    const w = world(() => SERVED());
    await w.service.tellThemTheReportIsReady('g1', 1);
    const l = links(to(w.sent, 'wairimu@x.test').html);
    expect(l[0]).toEqual({ href: 'https://app.test/chat?about=g1', says: 'I can help you do that' });
    expect(l[1]).toEqual({ href: 'https://app.test/grounds/g1/session/1', says: 'Read the shared picture' });
  });

  it('a participant is given it where the report served to them names a finding, in words that are theirs', async () => {
    const w = world(() => SERVED());
    await w.service.tellThemTheReportIsReady('g1', 1);
    const l = links(to(w.sent, 'abigail@x.test').html);
    expect(l[0]).toEqual({ href: 'https://app.test/chat?about=g1', says: 'I can help you talk it through' });
    expect(text(to(w.sent, 'abigail@x.test').html)).not.toContain('I can help you do that');
  });

  it('a person with no account is sent the notice it always was, with no way into Ask', async () => {
    const w = world(() => SERVED());
    await w.service.tellThemTheReportIsReady('g1', 1);
    expect(to(w.sent, 'omar@x.test').html).not.toContain('chat?about');
    expect(links(to(w.sent, 'omar@x.test').html)[0].says).toBe('Read the shared picture →');
  });

  it('with nothing open, or a picture still withheld, the link is the one it always was', async () => {
    const none = world(() => SERVED({ stand: { agreed: 0, stillOpen: 0, settled: [], open: [], openWithReasons: [] }, top: { theConversationWorthHaving: null } }));
    await none.service.tellThemTheReportIsReady('g1', 1);
    expect(links(to(none.sent, 'wairimu@x.test').html)[0].says).toBe('Read the shared picture →');
    const held = world((u) => (u === 'u-abi' ? { sessionNumber: 1, withheldUntilYouAnswer: true } : SERVED()));
    await held.service.tellThemTheReportIsReady('g1', 1);
    expect(links(to(held.sent, 'abigail@x.test').html)[0].says).toBe('Read the shared picture →');
    expect(to(held.sent, 'abigail@x.test').html).not.toContain('chat?about');
  });
});
