import { sendWhatGroundworkIsDoing, theWaitingWords, WAITING_SENDER } from './waiting-on-the-people-you-invited';
import { ENGAGEMENT_MOMENT_KEY as RELEASE_MOMENT_KEY } from './the-engagement-release-moment';
import { ROUTINE_EMAILS } from './one-routine-message-a-day';
import { WHAT_EACH_MAIL_IS } from '../email/nothing-goes-out-that-was-turned-off';
import { shouldSayWhatGroundworkIs } from '../email/what-groundwork-is';
import { GroundsCron } from '../grounds/grounds.cron';

/**
 * JOURNEY 3 AGAIN, WHILE IT HAPPENS (engagement spec section 5), AS BARAKA READS IT.
 *
 * Baraka invites Kito, Lerato, Tobi and Peter to "Distributor review" on 8 October and nobody starts. He used to hear nothing for two weeks, and then be told
 * the reminders were over. On the first reminder day he is now told, once, who was invited and when, who has been reminded, when the next reminders go, and that he
 * need not chase anyone. It is not sent once anybody has started, nor for a check-in made before the release, stalled, or with the reminders turned off.
 */
const RELEASE = new Date('2026-10-01T00:00:00Z');
const INVITED = new Date('2026-10-08T08:00:00Z');
const NOW = new Date('2026-10-11T09:30:00Z');

const person = (id: string, first: string, extra: any = {}) => ({ id, userId: `u-${id}`, email: `${first.toLowerCase()}@x.test`, managingOnly: false, nameGiven: null, invitedAt: INVITED, createdAt: INVITED, lastNudgedAt: null, user: { firstName: first, lastName: null, awaitingOrgApproval: false }, checkIns: [{ status: 'NOT_STARTED' }], ...extra });

function world(over: { participants?: any[]; told?: boolean; outcome?: 'sent' | 'held' | 'suppressed'; ground?: any; stopped?: string[]; stoppedInSettings?: string[] } = {}) {
  const told = new Set<string>(over.told ? ['engagement.once.waiting-on-the-people:g1'] : []);
  const sent: any[] = [];
  const asked: any[] = [];
  const reminded = new Date('2026-10-11T07:00:00Z');
  const participants = over.participants ?? [
    person('lead', 'Baraka', { userId: 'u-lead', checkIns: [{ status: 'NOT_STARTED' }] }),
    person('k', 'Kito', { lastNudgedAt: reminded }), person('l', 'Lerato', { lastNudgedAt: reminded }), person('t', 'Tobi', { lastNudgedAt: reminded }), person('p', 'Peter', { lastNudgedAt: reminded }),
  ];
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key === RELEASE_MOMENT_KEY ? { value: { at: RELEASE.toISOString() } } : told.has(where.key) ? { key: where.key } : null)),
      create: jest.fn(async ({ data }: any) => { told.add(data.key); return data; }),
    },
    emailAddressPreference: { findUnique: jest.fn(async ({ where }: any) => ((over.stopped ?? []).includes(where.email) ? { unsubscribedAt: new Date() } : null)) },
    user: { findUnique: jest.fn(async ({ where }: any) => ((over.stoppedInSettings ?? []).includes(where.email) ? { emailNotifications: false } : { emailNotifications: true })) },
    ground: { findMany: jest.fn(async (a: any) => { asked.push(a.where); return [{ id: 'g1', label: 'Distributor review', initiatorId: 'u-lead', chaseAfterDays: [3, 7, 14], initiator: { email: 'baraka@x.test', firstName: 'Baraka', deletedAt: null, isActive: true }, participants, ...over.ground }]; }) },
  };
  const email = { sendWaitingOnThePeople: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); return over.outcome ?? 'sent'; }) };
  return { run: (now = NOW) => sendWhatGroundworkIsDoing({ prisma, email, frontendUrl: 'https://app.test/' }, now), sent, asked, told };
}

describe('what Baraka reads on the first reminder day', () => {
  it('who was invited and when, who has been reminded, when the next reminders go, and that he need not chase', async () => {
    const w = world();
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0].to).toBe('baraka@x.test');
    expect(w.sent[0].subject).toBe('Nobody has started "Distributor review" yet, and Groundwork is following up');
    expect(w.sent[0].lines).toEqual([
      expect.stringMatching(/^Hello Baraka\. Kito, Lerato, Tobi and Peter were invited to "Distributor review" on .*8.*Oct.*, and nobody has started yet\.$/),
      'Groundwork has already sent a reminder to Kito, Lerato, Tobi and Peter.',
      expect.stringMatching(/^It will remind them again on .*15.*Oct.* and .*22.*Oct.*\.$/),
      'You do not need to chase anyone yourself. If you would like to say a word to them as well, you could write, "I would value your view on Distributor review. It takes about five minutes."',
    ]);
    expect(w.sent[0].linkUrl).toBe('https://app.test/grounds/g1');
    const read = [w.sent[0].subject, ...w.sent[0].lines].join(' ');
    expect(read).not.toMatch(/yours now|your job|you should chase|:|→|ahead|behind/i);
  });

  it('says it once, and tries again another day if it was refused', async () => {
    const w = world();
    await w.run();
    expect(await w.run()).toEqual({ tried: 0 });
    const refused = world({ outcome: 'suppressed' });
    expect(await refused.run()).toEqual({ tried: 0 });
    expect(refused.told.size).toBe(0);
    await refused.run();
    expect(refused.sent).toHaveLength(2);
  });

  it('one person invited, and nobody reminded yet', () => {
    const w = theWaitingWords('Baraka', { label: 'Distributor review', invited: ['Kito'], invitedOn: INVITED, reminded: [], remindingAgainOn: [] });
    expect(w.subject).toBe('Kito has not started "Distributor review" yet, and Groundwork is following up');
    expect(w.lines[0]).toMatch(/^Hello Baraka\. Kito was invited to "Distributor review" on /);
    expect(w.lines[1]).toBe('Groundwork sent each of them the invitation, and is about to remind them.');
    expect(w.lines[2]).toBe('It will not send any more reminders after this, and will tell you when that is so.');
  });
});

describe('a person who has stopped the emails Groundwork decides to send', () => {
  it('is not promised a reminder: with nobody left to remind there is nothing to say', async () => {
    expect(await world({ stopped: ['kito@x.test', 'lerato@x.test', 'tobi@x.test', 'peter@x.test'] }).run()).toEqual({ tried: 0 });
  });
  it('with some left, the message is the same and says nothing about who has stopped', async () => {
    const w = world({ stopped: ['kito@x.test'] });
    expect(await w.run()).toEqual({ tried: 1 });
    const read = [w.sent[0].subject, ...w.sent[0].lines].join(' ');
    expect(read).toContain('Kito, Lerato, Tobi and Peter were invited');
    expect(read).not.toMatch(/stopped|opted|unsubscribe|turned off|cannot be reached/i);
  });
  it('the Settings switch counts as stopping them too', async () => {
    expect(await world({ stoppedInSettings: ['kito@x.test', 'lerato@x.test', 'tobi@x.test', 'peter@x.test'] }).run()).toEqual({ tried: 0 });
  });
});

describe('when it is not sent', () => {
  it('before the first reminder day, and after the last, when the end-of-reminders message takes over', async () => {
    expect(await world().run(new Date('2026-10-10T09:30:00Z'))).toEqual({ tried: 0 });
    expect(await world().run(new Date('2026-10-23T09:30:00Z'))).toEqual({ tried: 0 });
    expect(await world().run(new Date('2026-10-22T09:30:00Z'))).toEqual({ tried: 1 });
  });
  it('once anybody has started: that is the partial picture, said by another message', async () => {
    const started = [person('lead', 'Baraka', { userId: 'u-lead' }), person('k', 'Kito', { checkIns: [{ status: 'IN_PROGRESS' }] }), person('l', 'Lerato')];
    expect(await world({ participants: started }).run()).toEqual({ tried: 0 });
  });
  it('a lead alone in her own check-in, or with people not yet let in or with no address', async () => {
    expect(await world({ participants: [person('lead', 'Baraka', { userId: 'u-lead' })] }).run()).toEqual({ tried: 0 });
    expect(await world({ participants: [person('lead', 'Baraka', { userId: 'u-lead' }), person('x', 'Xola', { user: { firstName: 'Xola', awaitingOrgApproval: true } }), person('y', 'Yan', { email: 'open-1@unclaimed.invalid' })] }).run()).toEqual({ tried: 0 });
  });
  it('only check-ins made at or after the release, still going, with the reminders and her notice on', async () => {
    const w = world();
    await w.run();
    expect(w.asked[0].createdAt).toEqual({ gte: RELEASE });
    expect(w.asked[0].chasingStopped).toBe(false);
    expect(w.asked[0].tellTheLead).toBe(true);
    expect(w.asked[0].status.notIn).toEqual(expect.arrayContaining(['STALLED', 'PAUSED']));
  });
});

describe('where it sits in the rules every message follows', () => {
  it('is a routine message we decide to send, so the opt-out, the day\'s one and quiet hours apply', () => {
    expect(ROUTINE_EMAILS.has(WAITING_SENDER)).toBe(true);
    expect(WHAT_EACH_MAIL_IS[WAITING_SENDER]).toBe('we decided to send it');
  });
  it('does not carry the paragraph about who can see what people say, which is not about it', () => {
    expect(shouldSayWhatGroundworkIs(WAITING_SENDER)).toBe(false);
  });
  it('is scheduled on weekdays at half past eight in Lagos, before the morning\'s reminders, so that a lead\'s own reminder does not take her one message of the day', () => {
    const opts = Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', GroundsCron.prototype.sendWhatGroundworkIsDoing);
    expect(opts.cronTime).toBe('30 8 * * 1-5');
    expect(opts.timeZone).toBe('Africa/Lagos');
  });
  it('and so are the lead\'s other insights, each before the reminders that run at 08:00 and 09:00 UTC', () => {
    const at = (name: keyof GroundsCron) => Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', (GroundsCron.prototype as any)[name]).cronTime;
    expect(at('sendTheTestCheckInMessages')).toBe('10 8 * * 2');
    expect(at('sendTheReportFollowUps')).toBe('15 8 * * 1-5');
    expect(at('sendWhoHasGoneQuiet')).toBe('45 8 * * 3');
    /* 08:45 in Lagos is 07:45 UTC; the first reminders are 08:00 UTC. */
    for (const t of ['10 8 * * 2', '15 8 * * 1-5', '45 8 * * 3', '30 8 * * 1-5']) {
      const [minute, hour] = t.split(' ').map(Number);
      expect(hour * 60 + minute).toBeLessThan(9 * 60);
    }
  });
});
