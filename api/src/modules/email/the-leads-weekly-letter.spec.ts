import { GroundsCron } from '../grounds/grounds.cron';
import { EmailService } from './email.service';
import { sendTheLeadsWeeklyLetters, theLeadsLetter, theWeekInSentences, type AWeekInOneCheckIn } from './the-leads-weekly-letter';
import { whatThisMailIs, whetherToSend } from './nothing-goes-out-that-was-turned-off';

/**
 * THE LEAD'S WEEKLY LETTER (anchor piece 29), read as Wairimu reads it on Friday afternoon, and as
 * nobody else is sent it. Email is stubbed everywhere: nothing here can send.
 *
 * Wairimu leads "Help the team understand", started from the anchor link. Ten people can answer. Eight
 * checked in this week. Four of them said what they will do next, two things people said they would do
 * were done, three handoffs are waiting, and Omar and Juma did not check in.
 */
const NOW = new Date('2026-10-09T14:00:00Z');
const person = (id: string, userId: string | null, first: string, extra: any = {}) => ({ id, userId, managingOnly: false, nameGiven: null, user: { firstName: first, lastName: null, awaitingOrgApproval: false }, ...extra });

function aFriday(opts: { second?: boolean } = {}) {
  const touched = new Set<string>();
  const people = [
    person('p-w', 'u-wairimu', 'Wairimu'), person('p1', 'u1', 'Kennedy'), person('p2', 'u2', 'Femi'), person('p3', 'u3', 'Bisi'),
    person('p4', 'u4', 'Lucy'), person('p5', 'u5', 'Amina'), person('p6', 'u6', 'Tunde'), person('p7', 'u7', 'Ngozi'),
    person('p8', 'u8', 'Omar'), person('p9', 'u9', 'Juma'),
    person('p10', 'u10', 'Grace', { managingOnly: true }), person('p11', 'u11', 'Late', { user: { firstName: 'Late', lastName: null, awaitingOrgApproval: true } }),
  ];
  const watch = (name: string, o: any) => Object.fromEntries(Object.entries(o).map(([k, f]: any) => [k, (...a: any[]) => { touched.add(name); return f(...a); }]));
  const grounds = [
    { id: 'g-anchor', label: 'Help the team understand', initiatorId: 'u-wairimu' },
    ...(opts.second ? [{ id: 'g-pair', label: 'Product and Sales', initiatorId: 'u-wairimu' }] : []),
  ];
  const prisma: any = {
    ground: watch('ground', { findMany: async ({ where }: any) => { prisma.lastWhere = where; return grounds; } }),
    user: watch('user', { findUnique: async ({ where }: any) => (where.id === 'u-wairimu' ? { email: 'wairimu@baridi.test', deletedAt: null } : null) }),
    groundParticipant: watch('groundParticipant', { findMany: async () => people }),
    checkIn: watch('checkIn', { findMany: async () => ['p-w', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p10', 'p11'].map((participantId) => ({ participantId })) }),
    groundCommitment: watch('groundCommitment', { findMany: async () => ['p1', 'p2', 'p3', 'p3', 'p4', 'p10'].map((participantId) => ({ participantId })), count: async () => 2 }),
    groundDependency: watch('groundDependency', { count: async () => 3 }),
  };
  const sent: any[] = [];
  const email = { sendTheLeadsWeeklyLetter: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); }) };
  return { prisma, email, sent, touched };
}

describe('the lead\'s weekly letter, as the lead reads it', () => {
  it('says what the week shows, in the scenario\'s words, and nothing else', async () => {
    const w = aFriday();
    const out = await sendTheLeadsWeeklyLetters({ prisma: w.prisma, email: w.email, frontendUrl: 'https://app.test/' }, NOW);
    expect(out).toEqual({ tried: 1 });
    expect(w.sent).toEqual([{
      to: 'wairimu@baridi.test',
      subject: 'Two things people said they would do were done; three handoffs are still waiting',
      lines: [
        'Your team is starting to move.',
        'This week, eight of ten people checked in. Four people said what they will do next. Two things people said they would do were done. Three handoffs are still waiting. Omar and Juma did not check in.',
      ],
      linkLabel: "See this week's picture",
      linkUrl: 'https://app.test/grounds/g-anchor/board',
    }]);
  });

  it('is built from check-ins started from the anchor that are still going, and never reads what anybody said', async () => {
    const w = aFriday();
    await sendTheLeadsWeeklyLetters({ prisma: w.prisma, email: w.email, frontendUrl: 'https://app.test' }, NOW);
    /* Changed by decision 114: a check-in with the anchor's scenario is the anchor's too, so it asks for either (the-anchor-is-recognised-by-its-scenario.spec.ts). */
    expect(w.prisma.lastWhere.OR).toEqual([{ startedFrom: 'anchor' }, { scenario: 'HELP_TEAM_UNDERSTAND' }]);
    /* Only counts: no turn, message, question to Ask Groundwork or report is read. */
    expect([...w.touched].sort()).toEqual(['checkIn', 'ground', 'groundCommitment', 'groundDependency', 'groundParticipant', 'user']);
  });

  it('with two check-ins, each is counted on its own under its name, and the link opens the list', async () => {
    const w = aFriday({ second: true });
    await sendTheLeadsWeeklyLetters({ prisma: w.prisma, email: w.email, frontendUrl: 'https://app.test' }, NOW);
    const letter = w.sent[0];
    expect(letter.lines.filter((l: string) => l.startsWith('"'))).toEqual(['"Help the team understand"', '"Product and Sales"']);
    expect(letter.linkUrl).toBe('https://app.test/grounds');
    expect(w.sent).toHaveLength(1);
  });

  it('goes only to the lead: a person on the check-in or an admin is not sent it', async () => {
    const w = aFriday();
    await sendTheLeadsWeeklyLetters({ prisma: w.prisma, email: w.email, frontendUrl: '' }, NOW);
    expect(w.sent.map((s) => s.to)).toEqual(['wairimu@baridi.test']);
  });

  it('is a mail we decided to send, so the stop link stops it', () => {
    expect(whatThisMailIs('sendTheLeadsWeeklyLetter')).toBe('we decided to send it');
    expect(whetherToSend('we decided to send it', { unsubscribedAt: new Date() }, 'sendTheLeadsWeeklyLetter').send).toBe(false);
  });
});

describe('the words, in other weeks', () => {
  const week = (o: Partial<AWeekInOneCheckIn> = {}): AWeekInOneCheckIn => ({ groundId: 'g', label: 'Team', ofHowMany: 5, checkedIn: 0, notYet: [], saidWhatNext: 0, done: 0, waiting: 0, ...o });
  it('a quiet week says so and does not say the team is moving', () => {
    expect(theLeadsLetter([week({ notYet: ['you', 'Omar'] })])!.lines).toEqual(["Here is your team's week.", 'Nobody has checked in this week.']);
  });
  it('everyone in, and single counts, read as a person would say them', () => {
    expect(theWeekInSentences(week({ ofHowMany: 3, checkedIn: 3, saidWhatNext: 1, done: 1, waiting: 1 })).join(' ')).toBe(
      'This week, all three people checked in. One person said what they will do next. One thing people said they would do was done. One handoff is still waiting.');
  });
  it('names up to three who did not check in, then counts the rest, and the lead is "you"', () => {
    expect(theWeekInSentences(week({ checkedIn: 1, notYet: ['you', 'Omar', 'Juma'] })).slice(-1)[0]).toBe('You, Omar and Juma did not check in.');
    expect(theWeekInSentences(week({ checkedIn: 1, notYet: ['Omar', 'Juma', 'Femi', 'Bisi'] })).slice(-1)[0]).toBe('Omar, Juma and two others did not check in.');
  });
  it('a check-in nobody can answer yet has no letter', () => {
    expect(theLeadsLetter([week({ ofHowMany: 0 })])).toBeNull();
  });
});

describe('the mail itself, with the sender stubbed', () => {
  it('is escaped, carries the link and goes through the one door every mail goes through', async () => {
    const posted: any[] = [];
    const svc: any = Object.create(EmailService.prototype);
    svc.layout = (b: string) => `<div>${b}</div>`;
    svc.sendEmail = jest.fn(async (o: any, _c: any, sender: string) => { posted.push({ ...o, sender }); });
    await svc.sendTheLeadsWeeklyLetter('wairimu@baridi.test', "Your team's week", ['"Sales & Product"', 'Nobody has checked in this week.'], "See this week's picture", 'https://app.test/grounds');
    expect(posted).toEqual([{
      to: 'wairimu@baridi.test', subject: "Your team's week", sender: 'sendTheLeadsWeeklyLetter',
      html: `<div><p>&quot;Sales &amp; Product&quot;</p><p>Nobody has checked in this week.</p><p><a href="https://app.test/grounds">See this week's picture</a></p></div>`,
    }]);
  });
});

describe('the job, behind the switch', () => {
  const cron = (on: boolean) => {
    const c: any = Object.create(GroundsCron.prototype);
    c.prisma = { platformSetting: { findUnique: async () => (on ? { value: { on: true } } : { value: { on: false } }) }, ground: { findMany: jest.fn(async () => []) } };
    c.email = { sendTheLeadsWeeklyLetter: jest.fn() };
    c.config = { get: () => 'https://app.test' };
    c.logger = { log: jest.fn(), warn: jest.fn() };
    return c;
  };
  /* Changed on 8 October (engagement spec section 24, decision 117): the anchor is off at release and its check-ins follow through the ordinary flow, so with
     the switch off the job no longer looks at nothing. It looks at every check-in that is NOT the anchor's, and the anchor's only while the switch is on. */
  it('with the switch off it looks only at check-ins that are not the anchor\'s', async () => {
    const c = cron(false);
    expect(await c.sendTheLeadsWeeklyLettersInner(NOW)).toEqual({ tried: 0 });
    expect(c.prisma.ground.findMany).toHaveBeenCalled();
    const where = c.prisma.ground.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).toContain('"not":"HELP_TEAM_UNDERSTAND"');
    expect(JSON.stringify(where)).not.toContain('"scenario":"HELP_TEAM_UNDERSTAND"');
  });
  it('with the switch on it looks at every check-in, the anchor\'s included', async () => {
    const c = cron(true);
    expect(await c.sendTheLeadsWeeklyLettersInner(NOW)).toEqual({ tried: 0 });
    expect(c.prisma.ground.findMany).toHaveBeenCalled();
    expect(JSON.stringify(c.prisma.ground.findMany.mock.calls[0][0].where)).not.toContain('HELP_TEAM_UNDERSTAND');
  });
  it('is scheduled for Friday at three in the afternoon in Lagos', () => {
    const opts = Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', GroundsCron.prototype.sendTheLeadsWeeklyLetters);
    expect(opts.cronTime).toBe('0 15 * * 5');
    expect(opts.timeZone).toBe('Africa/Lagos');
  });
});

/*
 * KEVIN'S CLAIM IN WAIRIMU'S LETTER (decision 137; change 4). Her letters said for three weeks that the work "is waiting on Fatuma Bello", on
 * Kevin's word alone. The claim stays, as Kevin's account with the note beside it, and the subject never names Fatuma as the one it waits on.
 */
describe('a wait on a colleague only the speaker claims, in the letter', () => {
  function withWaits(waits: any[], promises: any[] = []) {
    const w = aFriday();
    w.prisma.groundDependency = { count: async () => waits.length, findMany: async () => waits };
    const before = w.prisma.groundCommitment;
    w.prisma.groundCommitment = { ...before, findMany: async (q: any) => (q?.where?.participantId?.in ? promises : before.findMany(q)) };
    return w;
  }
  const kevinOnFatuma = { id: 'd1', groundId: 'g-anchor', fromParticipantId: 'p1', onParticipantId: 'p2', status: 'WAITING', what: 'the final prices', triedSaid: null };

  it('is Kennedy\'s account with the note, and the subject does not name Femi', async () => {
    const w = withWaits([kevinOnFatuma]);
    await sendTheLeadsWeeklyLetters({ prisma: w.prisma, email: w.email, frontendUrl: 'https://app.test/' }, NOW);
    expect(w.sent[0].subject).toBe('Two things people said they would do were done; one handoff is still waiting');
    expect(w.sent[0].lines).toContain('Kennedy says the work is waiting on Femi for the final prices.');
  });

  it('once Femi has promised it, the handoff is counted on Femi, as before', async () => {
    const w = withWaits([kevinOnFatuma], [{ groundId: 'g-anchor', participantId: 'p2', text: 'I will send the final prices on Monday.' }]);
    await sendTheLeadsWeeklyLetters({ prisma: w.prisma, email: w.email, frontendUrl: 'https://app.test/' }, NOW);
    expect(w.sent[0].subject).toBe('Two things people said they would do were done; one handoff is still waiting, on Femi');
    expect(w.sent[0].lines.join(' ')).not.toMatch(/Not backed/);
  });
});
