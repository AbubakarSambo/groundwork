import { EmailService, withoutDeveloperComments } from '../email/email.service';
import { UnsubscribeController } from '../email/unsubscribe.controller';
import { TheWaysToStopMail, LEAD_LOSES, PARTICIPANT_LOSES, OTHER_LOSES, WHAT_STILL_ARRIVES, THE_TEAM_CONSEQUENCE } from './the-ways-to-stop-mail';

/**
 * STOPPING THE MAIL, AS EACH PERSON READS IT (decision 109, spec 27 to 31).
 *
 * Lena leads a check-in and is on a roster. Pia took part in one and has an account but no roster row. Gus was invited by address and has nothing.
 * Each gets the footer link on a mail we decided to send. The link asks first, in words for their part; only a POST stops anything; the mail we
 * decided to send then stops, the mail they asked for does not; and turning the Settings switch on undoes it.
 */
function world() {
  const people = [{ organizationId: 'o1', externalId: 'lena', email: 'lena@x.test' }];
  const prefs: any[] = [];
  const byAddress: any[] = [];
  const users = [
    { id: 'u-lena', email: 'lena@x.test', emailNotifications: true, isActive: true, deletedAt: null },
    { id: 'u-pia', email: 'pia@x.test', emailNotifications: true, isActive: true, deletedAt: null },
  ];
  const stamp = (rows: any[], where: any, data: any) => rows.filter(where).forEach((r) => Object.assign(r, data));
  const matchPerson = (c: any) => (p: any) => p.organizationId === c.organizationId && p.externalId === c.personExternalId;
  const prisma: any = {
    person: {
      findFirst: jest.fn(async ({ where }: any) => people.find((p) => (where.email ? p.email === where.email.equals : p.organizationId === where.organizationId && p.externalId === where.externalId)) ?? null),
      findMany: jest.fn(async ({ where }: any) => people.filter((p) => p.email === where.email.equals)),
    },
    emailPreference: {
      upsert: jest.fn(async ({ where, create }: any) => {
        let r = prefs.find((x) => x.organizationId === where.organizationId_personExternalId.organizationId && x.personExternalId === where.organizationId_personExternalId.personExternalId);
        if (!r) { r = { ...create, unsubscribedAt: null, roundDigest: true, nudges: true }; prefs.push(r); }
        return r;
      }),
      findUnique: jest.fn(async ({ where }: any) => prefs.find((x) => x.unsubscribeToken === where.unsubscribeToken) ?? null),
      findMany: jest.fn(async ({ where }: any) => prefs.filter((x) => where.OR.some((c: any) => matchPerson(c)({ organizationId: x.organizationId, externalId: x.personExternalId })))),
      updateMany: jest.fn(async ({ where, data }: any) => stamp(prefs, (x: any) => (where.unsubscribeToken ? x.unsubscribeToken === where.unsubscribeToken : where.OR.some((c: any) => matchPerson(c)({ organizationId: x.organizationId, externalId: x.personExternalId }))), data)),
    },
    emailAddressPreference: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        let r = byAddress.find((x) => x.email === where.email);
        if (!r) { r = { unsubscribedAt: null, ...create }; byAddress.push(r); } else Object.assign(r, update);
        return r;
      }),
      findUnique: jest.fn(async ({ where }: any) => byAddress.find((x) => (where.email ? x.email === where.email : x.unsubscribeToken === where.unsubscribeToken)) ?? null),
      updateMany: jest.fn(async ({ where, data }: any) => stamp(byAddress, (x: any) => x.email === where.email, data)),
    },
    user: { findUnique: jest.fn(async ({ where }: any) => users.find((u) => u.email === where.email) ?? null), findUniqueOrThrow: jest.fn(async ({ where }: any) => users.find((u) => u.id === where.id)) },
    ground: { findFirst: jest.fn(async ({ where }: any) => (where.initiatorId === 'u-lena' ? { id: 'g1' } : null)) },
    groundParticipant: { findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null) },
    emailDelivery: { findFirst: jest.fn(async () => null) },
    notification: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
    scheduledEmail: { create: jest.fn(async () => ({})) },
  };
  const sent: any[] = [];
  const email: any = new EmailService({ get: (k: string) => (k === 'app.publicApiUrl' ? 'https://api.test' : k === 'resend.frontendUrl' ? 'https://app.test' : undefined) } as any, {} as any, prisma);
  email.isDev = () => false;
  email.theResendClient = () => ({ emails: { send: jest.fn(async (m: any) => { sent.push(m); return { data: { id: 'x' }, error: null }; }) } });
  email.delivery = { recordSend: jest.fn(async () => undefined) };
  email.holdForTheMorning = jest.fn(async () => false);
  email.writeItDown = jest.fn(async () => undefined);
  const stops = new TheWaysToStopMail(prisma);
  const controller = new UnsubscribeController(stops);
  const mail = async (to: string, sender: string) => { const before = sent.length; await email.sendEmail({ to, subject: sender, html: '<p>Hello.</p>' }, undefined, sender); return sent.slice(before)[0]; };
  const tokenIn = (m: any) => /unsubscribe\/([\w-]+)/.exec(m.html)![1];
  return { mail, tokenIn, controller, stops, prisma, users, sent };
}

describe('the footer link, for everyone', () => {
  it.each(['lena@x.test', 'pia@x.test', 'gus@x.test'])('is on a mail we decided to send to %s, and says what it covers', async (to) => {
    const w = world();
    const m = await w.mail(to, 'sendNudge');
    expect(withoutDeveloperComments(m.html)).toContain('To stop the emails we decide to send: <a href="https://app.test/unsubscribe/');
    expect(m.html).toContain('Emails you ask for, such as a sign-in link, will still reach you.');
    expect(m.headers['List-Unsubscribe']).toMatch(/^<https:\/\/api\.test\/api\/v1\/unsubscribe\/[\w-]+>$/);
    expect(m.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('is not on a sign-in link, which nobody means to stop', async () => {
    const w = world();
    const m = await w.mail('gus@x.test', 'sendMagicLinkEmail');
    expect(m.html).not.toContain('unsubscribe');
  });
});

describe('what the link asks, as each reader reads it', () => {
  it('asks Lena as a lead, and changes nothing', async () => {
    const w = world();
    const t = w.tokenIn(await w.mail('lena@x.test', 'sendNudge'));
    const q: any = await w.controller.whatWouldStop(t);
    expect(q.title).toBe('Are you sure you want to stop Groundwork insight emails?');
    expect(q.says).toEqual([LEAD_LOSES, THE_TEAM_CONSEQUENCE, WHAT_STILL_ARRIVES]);
    expect(LEAD_LOSES).toBe("If you turn these emails off, you won't receive Groundwork's email insights about team progress, stalled engagement, emerging differences, people who may need attention, positive contributions or recommendations for what to do next. You can still access Groundwork directly.");
    expect([q.keepLabel, q.stopLabel]).toEqual(['Keep email insights', 'Turn off email insights']);
    expect(q.stopped).toBe(false);
    expect(await w.stops.stoppedFromAMail('lena@x.test')).toBe(false);
    await w.controller.whatWouldStop(t);
    expect(await w.stops.stoppedFromAMail('lena@x.test')).toBe(false);
  });

  it('asks Pia as a participant, in the participant words', async () => {
    const w = world();
    const q: any = await w.controller.whatWouldStop(w.tokenIn(await w.mail('pia@x.test', 'sendNudge')));
    expect(q.says[0]).toBe(PARTICIPANT_LOSES);
    expect(PARTICIPANT_LOSES).toBe("If you turn these emails off, you won't receive Groundwork's email summaries about your progress, open commitments, blockers, things you're waiting on, or useful changes between check-ins. You can still use Groundwork directly.");
    expect(JSON.stringify(q)).not.toMatch(/team progress|stalled engagement/);
  });

  it('asks Gus, who is on no roster, in plain words that name no role', async () => {
    const w = world();
    const q: any = await w.controller.whatWouldStop(w.tokenIn(await w.mail('gus@x.test', 'sendNudge')));
    expect(q.says).toEqual([OTHER_LOSES, WHAT_STILL_ARRIVES]);
  });

  it('says a kind sentence to a link it does not know, never that it is broken', async () => {
    const q: any = await world().controller.whatWouldStop('nope');
    expect(q.known).toBe(false);
    expect(q.says[0]).toMatch(/usually means these emails have already stopped/);
  });
});

describe('after the answer', () => {
  it.each(['lena@x.test', 'pia@x.test', 'gus@x.test'])('%s no longer gets what we decide to send, and still gets what they ask for', async (to) => {
    const w = world();
    const t = w.tokenIn(await w.mail(to, 'sendNudge'));
    const done: any = await w.controller.stop(t);
    expect(done.says).toBe('Done. Groundwork will stop sending these emails. ' + WHAT_STILL_ARRIVES + ' You can turn them back on in Settings.');
    expect(await w.mail(to, 'sendNudge')).toBeUndefined();
    expect(await w.mail(to, 'sendRoundDigest')).toBeUndefined();
    expect(await w.mail(to, 'sendReportReady')).toBeDefined();
    expect(await w.mail(to, 'sendMagicLinkEmail')).toBeDefined();
    expect(await w.mail(to, 'sendSubscriptionRenewal')).toBeDefined();
  });

  it('the undo on the page brings them back', async () => {
    const w = world();
    const t = w.tokenIn(await w.mail('gus@x.test', 'sendNudge'));
    await w.controller.stop(t);
    expect(((await w.controller.whatWouldStop(t)) as any).stopped).toBe(true);
    await w.controller.undo(t);
    expect(await w.mail('gus@x.test', 'sendNudge')).toBeDefined();
  });

  it('turning the switch on in Settings undoes a stop made from a mail, and Settings says so while it is stopped', async () => {
    const w = world();
    await w.controller.stop(w.tokenIn(await w.mail('lena@x.test', 'sendNudge')));
    expect(await w.stops.stoppedFromAMail('lena@x.test')).toBe(true);
    await w.stops.turnBackOnFor('lena@x.test');
    expect(await w.stops.stoppedFromAMail('lena@x.test')).toBe(false);
    expect(await w.mail('lena@x.test', 'sendNudge')).toBeDefined();
  });
});
