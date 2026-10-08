import { BadRequestException } from '@nestjs/common';
import { ReviewsService } from './the-reviews.service';
import { APPEAL_REFUSED } from './a-review-appeal';
import { AReviewAppealToldService } from './a-review-appeal-told.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { AnAppealWaitsForANewAdmin } from './an-appeal-waits-for-a-new-admin';

/**
 * AN ADMIN ADDED AFTER THE APPEAL IS TOLD IT WAITS FOR THEM, ONCE (decision 113).
 *
 * Kilima Traders. Baraka is the only admin, and he decided Imani's review. Imani appeals. Nobody else can decide it, so Baraka is
 * asked to add a second admin. He makes Grace an admin. Before this, Grace was told nothing and had to look at her list of appeals.
 * Now she is told once, by email and on WhatsApp, with no word of the review or of Imani's reasons; she is never told twice, and
 * nothing of it is in the review's history. Read from the mail and the WhatsApp messages that really go out.
 */

beforeAll(() => jest.useFakeTimers({
  now: new Date('2026-10-08T09:00:00Z'),
  doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'hrtime', 'performance'],
}));
afterAll(() => jest.useRealTimers());

const ORG = 'org-kilima';
const HER_REASONS = 'Nobody asked me about the Karen account before this was decided.';
const p = (u: string | null, ext: string, name: string, department: string | null, manager: string | null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, displayName: name, givenName, familyName, department, managerExternalId: manager, active: true };
};
const directory = [
  p('u-grace', 'p-grace', 'Grace Achieng', 'Finance', null),
  p('u-baraka', 'p-baraka', 'Baraka Mutua', 'Sales', null),
  p('u-wairimu', 'p-wairimu', 'Wairimu Kamau', 'Sales', null),
  p('u-imani', 'p-imani', 'Imani Wekesa', 'Sales', 'p-baraka'),
];
const firstNames: Record<string, string> = { 'u-grace': 'Grace', 'u-baraka': 'Baraka', 'u-wairimu': 'Wairimu', 'u-imani': 'Imani' };

function setup(roles: Record<string, string>, o: { suiteOn?: boolean } = {}) {
  const reviews: any[] = [{
    id: 'r-imani', organizationId: ORG, evaluationDueId: 'd-imani', personExternalId: 'p-imani', startedById: 'u-baraka',
    startedAt: new Date('2026-09-20T09:00:00Z'), managersWords: 'Imani leads the Karen shops well.', managersWordsById: 'u-baraka', theirView: 'I am ready for more.',
    decision: 'Imani moves up one level in March.', decisionReasons: 'She kept nearly every commitment.', decidedById: 'u-baraka', decidedAt: new Date('2026-10-02T09:00:00Z'),
    noticed: [], recordRead: null,
  }];
  const dues = [{ id: 'd-imani', organizationId: ORG, personExternalId: 'p-imani', dueOn: new Date('2026-10-01T00:00:00Z'), kind: 'six-monthly' }];
  const events: any[] = [];
  const sent: { to: string; subject: string; lines: string[] }[] = [];
  const phones: { to: string; text: string; kind?: string }[] = [];
  const matches = (r: any, where: any) => (!where.organizationId || r.organizationId === where.organizationId)
    && (!where.personExternalId || r.personExternalId === where.personExternalId)
    && (!where.appealedAt || !!r.appealedAt) && (!('appealOutcome' in where) || !r.appealOutcome);
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async () => (o.suiteOn === false ? { isOn: false, answers: {} } : { isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } })) },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => { const { userId } = where.userId_organizationId; return roles[userId] ? { role: roles[userId] } : null; }),
      findMany: jest.fn(async ({ where }: any) => Object.entries(roles).filter(([, r]) => r === where.role).map(([userId]) => ({ userId }))),
    },
    person: { findMany: jest.fn(async () => directory), findFirst: jest.fn(async ({ where }: any) => directory.find((x) => x.externalId === where.externalId) ?? null) },
    user: {
      findUnique: jest.fn(async ({ where }: any) => firstNames[where.id] ? { id: where.id, email: `${firstNames[where.id].toLowerCase()}@kilima.test`, firstName: firstNames[where.id], phoneNumber: `+25470000${where.id.length}`, deletedAt: null } : null),
      findMany: jest.fn(async ({ where }: any) => where.id.in.map((id: string) => ({ id, firstName: firstNames[id] }))),
    },
    evaluationDue: {
      findMany: jest.fn(async () => dues),
      findUnique: jest.fn(async ({ where }: any) => dues.find((x) => x.id === where.id) ?? null),
    },
    performanceReview: {
      findMany: jest.fn(async ({ where, select }: any) => {
        const found = reviews.filter((r) => matches(r, where ?? {}));
        return select?.organizationId && Object.keys(select).length === 1 ? found.map((r) => ({ organizationId: r.organizationId })) : found;
      }),
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(reviews.find((r) => r.id === where.id), data)),
    },
    suiteEvent: {
      create: jest.fn(async ({ data }: any) => { events.push({ ...data, at: data.at ?? new Date() }); return data; }),
      findMany: jest.fn(async ({ where }: any) => events.filter((e) => Object.entries(where).every(([k, v]) => e[k] === v))),
    },
  };
  const whatsapp: any = { sendFor: jest.fn(async (_o: string, to: string, text: string, ctx: any) => { phones.push({ to, text, kind: ctx?.kind }); return { sent: true }; }) };
  const mailer: any = { sendTeamAlert: jest.fn(async (to: string, subject: string, lines: string[]) => { sent.push({ to, subject, lines }); return { sent: true }; }) };
  const config: any = { get: (k: string) => (k === 'resend.frontendUrl' ? 'https://app.kilima.test' : undefined) };
  const reach = new ARequestToldOnWhatsApp(prisma, whatsapp, mailer, undefined, config);
  const told = new AReviewAppealToldService(prisma, reach, whatsapp, mailer, config);
  const svc = new ReviewsService(prisma, undefined, undefined, told);
  const sweep = new AnAppealWaitsForANewAdmin(prisma, svc);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, sweep, as, reviews, sent, phones, events };
}

const onlyBaraka = () => ({ 'u-baraka': 'ADMIN', 'u-wairimu': 'LEAD', 'u-imani': 'MEMBER', 'u-grace': 'MEMBER' } as Record<string, string>);

describe('Baraka, the only admin and the reviewer, makes Grace an admin while Imani\'s appeal waits', () => {
  it('Grace is told once, by email and on WhatsApp, with no word of the review or the reasons', async () => {
    const roles = onlyBaraka();
    const { svc, sweep, as, sent, phones, events } = setup(roles);
    await svc.appeal(as('u-imani'), 'r-imani', HER_REASONS);
    expect(sent.map((s) => s.to)).toEqual(['baraka@kilima.test']);
    sent.length = 0; phones.length = 0;

    roles['u-grace'] = 'ADMIN';
    await sweep.anAdminWasMade({ organizationId: ORG, userId: 'u-grace' });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'grace@kilima.test', subject: 'Imani has appealed a decision on their review' });
    expect(sent[0].lines).toEqual([
      'Hi Grace,',
      "Imani has appealed Baraka's decision on their review. You are an admin who did not decide it, so you decide the appeal.",
      'Open Groundwork to read the review, their side and their reasons, and then say whether the decision stands or is changed.',
    ]);
    expect(phones).toHaveLength(1);
    expect(phones[0]).toMatchObject({
      kind: 'review-appeal-waiting',
      text: 'Hi Grace, Imani has appealed a decision on their review, and you are an admin who can decide it. Open Groundwork to read their reasons and decide.',
    });
    expect(JSON.stringify([sent, phones])).not.toMatch(/Karen|March|commitment/);

    /* Never twice: not when she is made an admin again, and not by the hourly sweep. */
    await sweep.anAdminWasMade({ organizationId: ORG, userId: 'u-grace' });
    expect(await sweep.sweepNow()).toEqual({ told: 0 });
    expect(sent).toHaveLength(1);
    expect(phones).toHaveLength(1);
    expect(events.filter((e) => e.kind === 'appeal-told').map((e) => e.toUserId)).toEqual(['u-grace']);

    /* Nothing of it is in the review's history, which a lead of the team reads too. */
    roles['u-wairimu'] = 'LEAD';
    expect((await svc.history(as('u-grace'), 'r-imani')).said.join(' ')).not.toMatch(/appeal|told/i);
  });

  it('the hourly sweep tells an admin who appeared some other way, once', async () => {
    const roles = onlyBaraka();
    const { svc, sweep, as, sent } = setup(roles);
    await svc.appeal(as('u-imani'), 'r-imani', HER_REASONS);
    sent.length = 0;
    expect(await sweep.sweepNow()).toEqual({ told: 0 });
    roles['u-grace'] = 'ADMIN';
    expect(await sweep.sweepNow()).toEqual({ told: 1 });
    expect(await sweep.sweepNow()).toEqual({ told: 0 });
    expect(sent.map((s) => s.to)).toEqual(['grace@kilima.test']);
  });

  it('an admin who was told when Imani appealed is not told again', async () => {
    const roles: Record<string, string> = { ...onlyBaraka(), 'u-grace': 'ADMIN' };
    const { svc, sweep, as, sent } = setup(roles);
    await svc.appeal(as('u-imani'), 'r-imani', HER_REASONS);
    expect(sent.map((s) => s.to)).toEqual(['grace@kilima.test']);
    expect(await sweep.sweepNow()).toEqual({ told: 0 });
    expect(sent).toHaveLength(1);
  });

  it('the person and the reviewer are never told as admins, and nobody is told once it is decided or with the suite off', async () => {
    const roles = onlyBaraka();
    const { svc, sweep, as, sent, reviews } = setup(roles);
    await svc.appeal(as('u-imani'), 'r-imani', HER_REASONS);
    sent.length = 0;
    roles['u-imani'] = 'ADMIN';
    expect(await sweep.sweepNow()).toEqual({ told: 0 });
    roles['u-imani'] = 'MEMBER';
    reviews[0].appealOutcome = 'stands';
    roles['u-grace'] = 'ADMIN';
    expect(await sweep.sweepNow()).toEqual({ told: 0 });
    expect(sent).toHaveLength(0);

    const offNow = setup({ ...onlyBaraka(), 'u-grace': 'ADMIN' }, { suiteOn: false });
    Object.assign(offNow.reviews[0], { appeal: HER_REASONS, appealedAt: new Date('2026-10-07T09:00:00Z') });
    expect(await offNow.svc.tellNewAdminsOfOpenAppeals(ORG)).toEqual({ told: 0 });
    expect(offNow.sent).toHaveLength(0);
  });
});

describe('once appealed, the reviewer cannot rewrite the review under the admin who decides', () => {
  it('Baraka cannot change his words after Imani appeals', async () => {
    const { svc, as, reviews } = setup({ ...onlyBaraka(), 'u-grace': 'ADMIN' });
    await svc.appeal(as('u-imani'), 'r-imani', HER_REASONS);
    await expect(svc.writeWords(as('u-baraka'), 'r-imani', 'Imani was never ready.')).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.wordsKept));
    expect(reviews[0].managersWords).toBe('Imani leads the Karen shops well.');
  });
});

describe('the admin who decides is told truly who reads their reasons', () => {
  it('a changed decision\'s reasons are read by everyone who may read the review, and Grace is told so', async () => {
    const { svc, as } = setup({ ...onlyBaraka(), 'u-grace': 'ADMIN' });
    await svc.appeal(as('u-imani'), 'r-imani', HER_REASONS);
    const grace: any = await svc.one(as('u-grace'), 'r-imani');
    expect(grace.appeal.says).toBe("Imani appealed Baraka's decision on 8 October. You are an admin who did not decide this review, so you decide the appeal. Imani and Baraka both read your reasons. If you change the decision, your reasons become the reasons for the new decision, and everyone who may read the review reads them.");
  });
});

describe('once decided, the person\'s reasons stay with the admin who decided', () => {
  it('an admin added after Grace decided reads the outcome and Grace\'s reasons, and not Imani\'s', async () => {
    const roles: Record<string, string> = { ...onlyBaraka(), 'u-grace': 'ADMIN' };
    const { svc, as } = setup(roles);
    await svc.appeal(as('u-imani'), 'r-imani', HER_REASONS);
    await svc.addToTheAppeal(as('u-imani'), 'r-imani', 'The Karen notes are from 14 September.');
    await svc.decideTheAppeal(as('u-grace'), 'r-imani', { outcome: 'stands', reasons: 'The decision matches the record.' });
    roles['u-wairimu'] = 'ADMIN';
    const wairimu: any = await svc.one(as('u-wairimu'), 'r-imani');
    expect(wairimu.appeal).toMatchObject({ reader: 'admin', stands: 'decided', outcome: 'stands', reasons: 'The decision matches the record.', theirReasons: null, additions: [], mayDecide: false });
    expect(JSON.stringify(wairimu.appeal)).not.toContain('Karen');
    const grace: any = await svc.one(as('u-grace'), 'r-imani');
    expect(grace.appeal.theirReasons).toBe(HER_REASONS);
    expect(grace.appeal.additions.map((a: any) => a.said)).toEqual(['The Karen notes are from 14 September.']);
  });
});
