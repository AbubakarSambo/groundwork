import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsService, REVIEW_REFUSED } from './the-reviews.service';
import { APPEAL_REFUSED } from './a-review-appeal';
import { AReviewAppealToldService } from './a-review-appeal-told.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';

/**
 * A DECIDED REVIEW CAN BE APPEALED (decision 113, bug B-024; decision 6 for the reviews suite).
 *
 * Kilima Traders. Baraka leads Sales and writes Imani's review with her ("Their manager"). Imani's review is decided: "Imani moves
 * up one level in March." Imani is unhappy with it. Grace is an admin who did not decide it. Neema is Imani's colleague. Joy leads
 * Operations. Wairimu leads Sales too and does not write the review.
 *
 * Read from what the server hands each reader, and from the mail and WhatsApp messages that really go out:
 *   - Imani appeals, saying why, and adds to her reasons until it is decided; Grace, an admin who is not the reviewer, reads the
 *     review, Imani's side and the appeal, and decides it, giving reasons; Imani and Baraka read the decision and the reasons;
 *   - Baraka (the reviewer) reads that it was appealed and where it stands, and never Imani's reasons while it waits;
 *   - with no admin other than the reviewer, the appeal is saved and stays open, Imani is told so plainly, and Baraka is asked
 *     (email, and WhatsApp where it is on) to add a second admin, who then decides it;
 *   - the only admin, who is also the reviewer, cannot decide it; a colleague and a lead who does not write the review read nothing of it.
 */

/* Only the date is made up, so "8 October" is what the person reads on any day. */
beforeAll(() => jest.useFakeTimers({
  now: new Date('2026-10-08T09:00:00Z'),
  doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'hrtime', 'performance'],
}));
afterAll(() => jest.useRealTimers());

const ORG = 'org-kilima';
const BIG_WORDS = 'I closed more than anyone in March, and nobody asked me about the Karen account before this was decided.';
const p = (u: string | null, ext: string, name: string, department: string | null, manager: string | null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, displayName: name, givenName, familyName, department, managerExternalId: manager, active: true };
};
const directory = [
  p('u-grace', 'p-grace', 'Grace Achieng', 'Finance', null),
  p('u-baraka', 'p-baraka', 'Baraka Mutua', 'Sales', null),
  p('u-wairimu', 'p-wairimu', 'Wairimu Kamau', 'Sales', null),
  p('u-joy', 'p-joy', 'Joy Njeri', 'Operations', null),
  p('u-imani', 'p-imani', 'Imani Wekesa', 'Sales', 'p-baraka'),
  p('u-neema', 'p-neema', 'Neema Oduya', 'Sales', 'p-baraka'),
];
const firstNames: Record<string, string> = { 'u-grace': 'Grace', 'u-baraka': 'Baraka', 'u-wairimu': 'Wairimu', 'u-joy': 'Joy', 'u-imani': 'Imani', 'u-neema': 'Neema' };

function setup(opts: { roles?: Record<string, string>; whatsapp?: boolean } = {}) {
  const roles: Record<string, string> = opts.roles ?? { 'u-grace': 'ADMIN', 'u-baraka': 'LEAD', 'u-wairimu': 'LEAD', 'u-joy': 'LEAD', 'u-imani': 'MEMBER', 'u-neema': 'MEMBER' };
  const reviews: any[] = [{
    id: 'r-imani', organizationId: ORG, evaluationDueId: 'd-imani', personExternalId: 'p-imani', startedById: 'u-baraka',
    startedAt: new Date('2026-09-20T09:00:00Z'), managersWords: 'Imani leads the Karen shops well.', managersWordsById: 'u-baraka', theirView: 'I think I am ready for more.',
    decision: 'Imani moves up one level in March.', decisionReasons: 'She has kept nearly every commitment and led two shops.', decidedById: 'u-baraka', decidedAt: new Date('2026-10-02T09:00:00Z'),
    noticed: [], recordRead: null,
  }];
  const dues = [{ id: 'd-imani', organizationId: ORG, personExternalId: 'p-imani', dueOn: new Date('2026-10-01T00:00:00Z'), kind: 'six-monthly' }];
  const sent: { to: string; subject: string; lines: string[] }[] = [];
  const phones: { to: string; text: string; kind?: string }[] = [];
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } })) },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => { const { userId } = where.userId_organizationId; return roles[userId] ? { role: roles[userId] } : null; }),
      findMany: jest.fn(async ({ where }: any) => Object.entries(roles).filter(([, r]) => r === where.role).map(([userId]) => ({ userId }))),
    },
    person: { findMany: jest.fn(async () => directory), findFirst: jest.fn(async ({ where }: any) => directory.find((x) => x.externalId === where.externalId) ?? null) },
    user: {
      findUnique: jest.fn(async ({ where }: any) => firstNames[where.id] ? { id: where.id, email: `${firstNames[where.id].toLowerCase()}@kilima.test`, firstName: firstNames[where.id], phoneNumber: opts.whatsapp ? `+2547${where.id.length}00` : null, deletedAt: null } : null),
      findMany: jest.fn(async ({ where }: any) => where.id.in.map((id: string) => ({ id, firstName: firstNames[id] }))),
    },
    evaluationDue: {
      findMany: jest.fn(async () => dues),
      findUnique: jest.fn(async ({ where }: any) => dues.find((x) => x.id === where.id) ?? null),
    },
    performanceReview: {
      findMany: jest.fn(async ({ where }: any) => reviews.filter((r) => r.organizationId === where.organizationId && (!where.personExternalId || r.personExternalId === where.personExternalId)
        && (!where.appealedAt || r.appealedAt) && (where.appealOutcome !== null || !r.appealOutcome))),
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(reviews.find((r) => r.id === where.id), data)),
    },
    suiteEvent: { create: jest.fn(async () => ({})) },
  };
  const whatsapp: any = { sendFor: jest.fn(async (_o: string, to: string, text: string, ctx: any) => { phones.push({ to, text, kind: ctx?.kind }); return { sent: true }; }) };
  const mailer: any = { sendTeamAlert: jest.fn(async (to: string, subject: string, lines: string[]) => { sent.push({ to, subject, lines }); return { sent: true }; }) };
  const config: any = { get: (k: string) => (k === 'resend.frontendUrl' ? 'https://app.kilima.test' : undefined) };
  const reach = new ARequestToldOnWhatsApp(prisma, opts.whatsapp ? whatsapp : undefined, mailer, undefined, config);
  const told = new AReviewAppealToldService(prisma, reach, opts.whatsapp ? whatsapp : undefined, mailer, config);
  const svc = new ReviewsService(prisma, undefined, undefined, told);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as, reviews, roles, sent, phones };
}

describe('a decided review the person has not appealed', () => {
  it('Imani is told she may appeal, and to whom it goes', async () => {
    const { svc, as } = setup();
    const r: any = await svc.one(as('u-imani'), 'r-imani');
    expect(r.mayAppeal).toBe(true);
    expect(r.mayAppealSays).toBe('If you disagree with this decision, you can appeal it. An admin other than Baraka reads the review, your side and your reasons, and decides.');
    expect(r.appeal).toBeNull();
    const mine = await svc.mine(as('u-imani'));
    expect(mine[0]).toMatchObject({ mayAppeal: true, appealStands: null, appealSays: null });
  });

  it('Imani cannot appeal a review that is not decided', async () => {
    const { svc, as, reviews } = setup();
    reviews[0].decision = null; reviews[0].decisionReasons = null; reviews[0].decidedAt = null; reviews[0].decidedById = null;
    await expect(svc.appeal(as('u-imani'), 'r-imani', 'No.')).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.notDecided));
    expect(((await svc.one(as('u-imani'), 'r-imani')) as any).mayAppeal).toBe(false);
  });

  it('she must say why', async () => {
    const { svc, as } = setup();
    await expect(svc.appeal(as('u-imani'), 'r-imani', '   ')).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.sayWhy));
  });
});

describe('Imani appeals, and Grace, an admin who did not decide it, decides', () => {
  it('goes to Grace, is told to Grace by email, and each reader reads only what they may', async () => {
    const { svc, as, sent } = setup();
    const mine: any = await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    expect(mine.mayAppeal).toBe(false);
    expect(mine.appeal).toMatchObject({
      stands: 'with-an-admin', yourReasons: BIG_WORDS, outcome: null,
      says: 'You have appealed this decision. An admin other than Baraka reads your reasons and decides. You can add to your reasons until then.',
    });
    /* Grace is told it waits. Not Baraka, not Imani. */
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'grace@kilima.test', subject: 'Imani has appealed a decision on a review' });
    expect(sent[0].lines).toEqual([
      'Hi Grace,',
      "Imani has appealed Baraka's decision on Imani's review. You are an admin who did not decide it, so you decide the appeal.",
      "Open Groundwork to read the review, Imani's side and the reasons Imani gave, and then say whether the decision stands or is changed.",
    ]);
    expect(JSON.stringify(sent)).not.toContain('Karen account');

    const grace: any = await svc.one(as('u-grace'), 'r-imani');
    expect(grace.appeal).toMatchObject({
      reader: 'admin', stands: 'with-an-admin', theirReasons: BIG_WORDS, mayDecide: true, personFirstName: 'Imani',
      says: "Imani appealed Baraka's decision on 8 October. You are an admin who did not decide this review, so you decide the appeal. Imani and Baraka both read your reasons. If you change the decision, your reasons become the reasons for the new decision, and everyone who may read the review reads them.",
    });
    expect(grace.theirView).toBe('I think I am ready for more.');

    /* Baraka decided it: he reads that it was appealed and where it stands, and not her reasons. */
    const baraka: any = await svc.one(as('u-baraka'), 'r-imani');
    expect(baraka.appeal).toMatchObject({ reader: 'reviewer', stands: 'with-an-admin', mayDecide: false });
    expect(baraka.appeal.says).toBe("Imani has appealed your decision. An admin other than you reads the review, Imani's side and the reasons, and decides.");
    expect(JSON.stringify(baraka.appeal)).not.toContain('Karen account');
    await expect(svc.decide(as('u-baraka'), 'r-imani', { decision: 'It is now two levels.', reasons: 'Because.' })).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.appealedAlready));
  });

  it('Imani can add to her reasons until it is decided, and Grace reads them beside the first', async () => {
    const { svc, as } = setup();
    await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    await expect(svc.appeal(as('u-imani'), 'r-imani', 'Again.')).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.alreadyAppealed));
    await expect(svc.addToTheAppeal(as('u-imani'), 'r-imani', '  ')).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.addSomething));
    const after: any = await svc.addToTheAppeal(as('u-imani'), 'r-imani', 'The Karen shops are in my notes from 14 September.');
    expect(after.appeal.yourReasons).toBe(BIG_WORDS);
    expect(after.appeal.additions.map((a: any) => a.said)).toEqual(['The Karen shops are in my notes from 14 September.']);
    const grace: any = await svc.one(as('u-grace'), 'r-imani');
    expect(grace.appeal.theirReasons).toBe(BIG_WORDS);
    expect(grace.appeal.additions.map((a: any) => a.said)).toEqual(['The Karen shops are in my notes from 14 September.']);
  });

  it('Grace decides that it stands, with reasons, and Imani and Baraka read the decision and the reasons', async () => {
    const { svc, as, sent } = setup({ whatsapp: true });
    await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    sent.length = 0;
    await expect(svc.decideTheAppeal(as('u-grace'), 'r-imani', { outcome: 'stands' })).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.sayWhyToBoth));
    await expect(svc.decideTheAppeal(as('u-grace'), 'r-imani', { outcome: 'maybe', reasons: 'x' })).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.keepOrChange));
    const grace: any = await svc.decideTheAppeal(as('u-grace'), 'r-imani', { outcome: 'stands', reasons: 'The Karen work is recognised in the decision. A move up in March is the usual step, and a second move is not.' });
    expect(grace.appeal).toMatchObject({ stands: 'decided', outcome: 'stands', mayDecide: false });

    const imani: any = await svc.one(as('u-imani'), 'r-imani');
    expect(imani.appeal).toMatchObject({
      stands: 'decided', outcome: 'stands', decidedByFirstName: 'Grace', reasons: 'The Karen work is recognised in the decision. A move up in March is the usual step, and a second move is not.',
      says: 'Grace, an admin, has read your appeal, and the decision stands. You can read the reasons below.',
    });
    expect(imani.decision).toEqual({ says: 'Imani moves up one level in March.', reasons: 'She has kept nearly every commitment and led two shops.' });
    const baraka: any = await svc.one(as('u-baraka'), 'r-imani');
    expect(baraka.appeal).toMatchObject({ stands: 'decided', outcome: 'stands', reasons: imani.appeal.reasons });
    expect(baraka.appeal.says).toBe('Imani appealed your decision. Grace, an admin, has read the appeal, and the decision stands. You can read the reasons below.');

    /* Both are told it is decided, by email and on WhatsApp, and neither message carries the reasons. */
    expect(sent.map((s) => [s.to, s.subject])).toEqual([['imani@kilima.test', 'Your appeal was decided, and the decision stands'], ['baraka@kilima.test', "Imani's appeal was decided, and your decision stands"]]);
    expect(sent[0].lines).toEqual(['Hi Imani,', 'Grace, an admin, has read your appeal of the decision on your review. The decision stands.', 'Open Groundwork to read the decision and the reasons.']);
    expect(sent[1].lines[1]).toBe("Grace, an admin, has read Imani's appeal of your decision on Imani's review. The decision stands.");
    expect(JSON.stringify(sent)).not.toContain('Karen');
    await expect(svc.decideTheAppeal(as('u-grace'), 'r-imani', { outcome: 'stands', reasons: 'Again.' })).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.alreadyDecided));
    await expect(svc.addToTheAppeal(as('u-imani'), 'r-imani', 'More.')).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.alreadyDecided));
  });

  it('Grace changes the decision: Imani reads the new one with her reasons, and what it said before is kept', async () => {
    const { svc, as } = setup();
    await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    await expect(svc.decideTheAppeal(as('u-grace'), 'r-imani', { outcome: 'changed', reasons: 'Because.' })).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.sayWhatItIsNow));
    await svc.decideTheAppeal(as('u-grace'), 'r-imani', { outcome: 'changed', decision: 'Imani moves up one level in January.', reasons: 'Her Karen work came in after the draft was written.' });
    const imani: any = await svc.one(as('u-imani'), 'r-imani');
    expect(imani.decision).toEqual({ says: 'Imani moves up one level in January.', reasons: 'Her Karen work came in after the draft was written.' });
    expect(imani.appeal.decisionWas).toEqual({ says: 'Imani moves up one level in March.', reasons: 'She has kept nearly every commitment and led two shops.' });
    /* The new decision is the review's own decision, drawn above the appeal, so the sentence does not say "below" (test bed copy a, 9 October). */
    expect(imani.appeal.says).toBe('Grace, an admin, has read your appeal and has changed the decision. The decision and the reasons on your review are now the new ones.');
    const baraka: any = await svc.one(as('u-baraka'), 'r-imani');
    expect(baraka.appeal.says).toBe('Imani appealed your decision. Grace, an admin, has read the appeal and has changed the decision. The decision and the reasons on this review are now the new ones.');
  });

  /* After the appeal changed the decision, Imani is told who has decided her review now, on the review and in the list Today reads. (8 October) */
  it('after the appeal changed the decision, the review and the list name the admin who changed it, and when the decision stands they still name Baraka', async () => {
    const changed = setup();
    await changed.svc.appeal(changed.as('u-imani'), 'r-imani', BIG_WORDS);
    await changed.svc.decideTheAppeal(changed.as('u-grace'), 'r-imani', { outcome: 'changed', decision: 'Imani moves up one level in January.', reasons: 'Her Karen work came in after the draft was written.' });
    const page: any = await changed.svc.one(changed.as('u-imani'), 'r-imani');
    expect(page.writtenWithFirstName).toBe('Grace');
    /* Baraka still wrote the review: "What Baraka writes", never "What Grace writes" (test bed copy a, 9 October). */
    expect(page.writerFirstName).toBe('Baraka');
    const list = await changed.svc.mine(changed.as('u-imani'));
    expect(list[0].says).toBe('Grace has decided your review. You can read the decision and the reasons.');
    expect(list[0].writtenWithFirstName).toBe('Grace');

    const stands = setup();
    await stands.svc.appeal(stands.as('u-imani'), 'r-imani', BIG_WORDS);
    await stands.svc.decideTheAppeal(stands.as('u-grace'), 'r-imani', { outcome: 'stands', reasons: 'It is the usual step.' });
    expect(((await stands.svc.one(stands.as('u-imani'), 'r-imani')) as any).writtenWithFirstName).toBe('Baraka');
    expect((await stands.svc.mine(stands.as('u-imani')))[0].says).toBe('Baraka has decided your review. You can read the decision and the reasons.');
  });

  /* Found on test bed copy a, 9 October: the admin deciding the appeal read the reviewer's decision as "Your decision", and once the
     appeal changed it the reviewer read the admin's decision as her own. Each reader is told who made the decision as it stands now. */
  it('each reader is told who made the decision as it stands, before and after the appeal changes it', async () => {
    const { svc, as } = setup();
    await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    const before: any = await svc.one(as('u-grace'), 'r-imani');
    expect([before.decidedByYou, before.decidedByFirstName]).toEqual([false, 'Baraka']);
    const baraka: any = await svc.one(as('u-baraka'), 'r-imani');
    expect([baraka.decidedByYou, baraka.decidedByFirstName]).toEqual([true, 'Baraka']);
    await svc.decideTheAppeal(as('u-grace'), 'r-imani', { outcome: 'changed', decision: 'Imani moves up one level in January.', reasons: 'Her Karen work came in after the draft was written.' });
    const after: any = await svc.one(as('u-baraka'), 'r-imani');
    expect([after.decidedByYou, after.decidedByFirstName]).toEqual([false, 'Grace']);
    const grace: any = await svc.one(as('u-grace'), 'r-imani');
    expect([grace.decidedByYou, grace.decidedByFirstName]).toEqual([true, 'Grace']);
  });

  it('Grace sees it in her list; nobody else is served that list', async () => {
    const { svc, as } = setup();
    await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    expect(await svc.appealsToDecide(as('u-grace'))).toEqual({
      appeals: [{ id: 'r-imani', name: 'Imani Wekesa', firstName: 'Imani', dueOn: '2026-10-01', appealedOn: '8 October', reviewerFirstName: 'Baraka' }],
      waitingForAnotherAdmin: [],
    });
    for (const u of ['u-imani', 'u-baraka', 'u-neema', 'u-wairimu', 'u-joy']) await expect(svc.appealsToDecide(as(u))).rejects.toThrow(new ForbiddenException(APPEAL_REFUSED.onlyAnAdmin));
  });
});

describe('with no admin other than the reviewer', () => {
  const onlyBaraka = { 'u-baraka': 'ADMIN', 'u-wairimu': 'LEAD', 'u-joy': 'LEAD', 'u-imani': 'MEMBER', 'u-neema': 'MEMBER' };

  it('the appeal is saved and stays open, Imani is told plainly, and Baraka is asked by email and on WhatsApp to add a second admin', async () => {
    const { svc, as, sent, phones } = setup({ roles: onlyBaraka, whatsapp: true });
    const imani: any = await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    expect(imani.appeal.stands).toBe('needs-another-admin');
    expect(imani.appeal.says).toBe('You have appealed this decision, and your appeal is saved. It needs an admin other than Baraka, and there is not one yet. Baraka has been asked to add a second admin, and that admin will decide your appeal. You can add to your reasons until then.');
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('baraka@kilima.test');
    expect(sent[0].subject).toBe('Imani has appealed your decision, and it needs a second admin');
    expect(sent[0].lines).toEqual([
      'Hi Baraka,',
      "Imani has appealed your decision on Imani's review. An appeal has to be decided by an admin who is not you, and your organisation does not have another one yet.",
      'Please add a second admin to Groundwork. The appeal is saved and stays open, and that admin decides it as soon as they are added.',
    ]);
    expect(phones).toHaveLength(1);
    expect(phones[0]).toMatchObject({ kind: 'review-appeal-needs-admin', text: 'Hi Baraka, Imani has appealed your decision on their review. It needs an admin other than you, and there is not one yet. Please add a second admin in Groundwork, and that admin will decide it.' });
    expect(JSON.stringify([sent, phones])).not.toContain('Karen account');

    /* Baraka is the only admin and decided it: he cannot decide it, and reads where it stands without her reasons. */
    const baraka: any = await svc.one(as('u-baraka'), 'r-imani');
    expect(baraka.appeal).toMatchObject({ reader: 'reviewer', stands: 'needs-another-admin', mayDecide: false });
    expect(baraka.appeal.says).toBe('Imani has appealed your decision. It needs an admin other than you to decide it, and there is not one yet. Please add a second admin to Groundwork. Once you have, that admin decides the appeal.');
    expect(JSON.stringify(baraka.appeal)).not.toContain('Karen account');
    await expect(svc.decideTheAppeal(as('u-baraka'), 'r-imani', { outcome: 'stands', reasons: 'I stand by it.' })).rejects.toThrow(new ForbiddenException(APPEAL_REFUSED.yourOwnDecision));
    expect((await svc.appealsToDecide(as('u-baraka'))).waitingForAnotherAdmin).toEqual([
      { id: 'r-imani', name: 'Imani Wekesa', firstName: 'Imani', dueOn: '2026-10-01', appealedOn: '8 October', says: baraka.appeal.says },
    ]);
    expect((await svc.appealsToDecide(as('u-baraka'))).appeals).toEqual([]);
  });

  it('once Baraka adds Grace as a second admin, Grace reads it and decides it, and Imani and Baraka are told', async () => {
    const { svc, as, roles, sent } = setup({ roles: onlyBaraka });
    await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    roles['u-grace'] = 'ADMIN';
    const imaniNow: any = await svc.one(as('u-imani'), 'r-imani');
    expect(imaniNow.appeal.stands).toBe('with-an-admin');
    expect((await svc.appealsToDecide(as('u-grace'))).appeals.map((a) => a.id)).toEqual(['r-imani']);
    expect(((await svc.one(as('u-grace'), 'r-imani')) as any).appeal.theirReasons).toBe(BIG_WORDS);
    sent.length = 0;
    await svc.decideTheAppeal(as('u-grace'), 'r-imani', { outcome: 'stands', reasons: 'The decision matches the record.' });
    expect(sent.map((s) => s.to).sort()).toEqual(['baraka@kilima.test', 'imani@kilima.test']);
  });
});

describe('everybody else', () => {
  it('a colleague cannot appeal, add, decide or read it', async () => {
    const { svc, as } = setup();
    await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    await expect(svc.appeal(as('u-neema'), 'r-imani', 'Mine too.')).rejects.toThrow(new ForbiddenException(APPEAL_REFUSED.onlyThePerson));
    await expect(svc.addToTheAppeal(as('u-neema'), 'r-imani', 'More.')).rejects.toThrow(new ForbiddenException(APPEAL_REFUSED.onlyThePerson));
    await expect(svc.decideTheAppeal(as('u-neema'), 'r-imani', { outcome: 'stands', reasons: 'x' })).rejects.toThrow(new ForbiddenException(APPEAL_REFUSED.onlyAnAdmin));
    await expect(svc.one(as('u-neema'), 'r-imani')).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.notYours));
  });

  it('a lead who does not write the review reads nothing of the appeal, and cannot decide it', async () => {
    const { svc, as } = setup();
    await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    const wairimu: any = await svc.one(as('u-wairimu'), 'r-imani');
    expect(wairimu.appeal).toBeNull();
    expect(JSON.stringify(wairimu)).not.toContain('Karen account');
    expect((await svc.history(as('u-wairimu'), 'r-imani')).said.join(' ')).not.toMatch(/appeal/i);
    await expect(svc.decideTheAppeal(as('u-wairimu'), 'r-imani', { outcome: 'stands', reasons: 'x' })).rejects.toThrow(new ForbiddenException(APPEAL_REFUSED.onlyAnAdmin));
    await expect(svc.one(as('u-joy'), 'r-imani')).rejects.toThrow(ForbiddenException);
  });

  it('an admin who is the person cannot decide their own appeal', async () => {
    const { svc, as, roles } = setup();
    roles['u-imani'] = 'ADMIN';
    await svc.appeal(as('u-imani'), 'r-imani', BIG_WORDS);
    await expect(svc.decideTheAppeal(as('u-imani'), 'r-imani', { outcome: 'changed', decision: 'Two levels.', reasons: 'Mine.' })).rejects.toThrow(new ForbiddenException(APPEAL_REFUSED.yourOwnReview));
  });

  it('there is nothing to decide where nothing was appealed', async () => {
    const { svc, as } = setup();
    await expect(svc.decideTheAppeal(as('u-grace'), 'r-imani', { outcome: 'stands', reasons: 'x' })).rejects.toThrow(new BadRequestException(APPEAL_REFUSED.notAppealed));
    expect(((await svc.one(as('u-grace'), 'r-imani')) as any).appeal).toBeNull();
  });
});
