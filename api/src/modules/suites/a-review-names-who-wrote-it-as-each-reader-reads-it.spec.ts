import { ForbiddenException } from '@nestjs/common';
import { ReviewsService, REVIEW_REFUSED } from './the-reviews.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { AReviewToldOnWhatsApp } from './a-review-told-on-whatsapp.service';
import { yourReviewsOnToday } from '../grounds/a-review-on-today';

/**
 * A REVIEW NAMES THE PERSON WHO ACTUALLY STARTED OR DECIDED IT (bug 2 of
 * docs/suites-against-the-workflow-model.md).
 *
 * Baridi Appliances. Wairimu (a lead) is Aisha's line manager in the staff directory. Grace and Omar
 * are admins. Kamau leads Operations. Miriam is Aisha's colleague in Sales. The organisation answered
 * "An admin" to "Who writes each review with the person?", so Grace starts Aisha's review.
 *
 * Before this change, Aisha read "Wairimu has started your review." in the app and on Today, although
 * Wairimu did nothing, and Grace's board said the review was written with Wairimu. Every reader is
 * served here as the app, Today and WhatsApp serve them.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-09-27T09:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-omar': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-aisha': 'MEMBER', 'u-miriam': 'MEMBER',
};
const p = (u: string, ext: string, name: string, department: string | null, manager: string | null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, email: null, displayName: name, givenName, familyName, department, managerExternalId: manager, active: true };
};
const directory = [
  p('u-grace', 'p-grace', 'Grace Achieng', null, null),
  p('u-omar', 'p-omar', 'Omar Abdi', 'Finance', null),
  p('u-wairimu', 'p-wairimu', 'Wairimu Kamau', 'Sales', null),
  p('u-kamau', 'p-kamau', 'Kamau Njenga', 'Operations', null),
  p('u-aisha', 'p-aisha', 'Aisha Otieno', 'Sales', 'p-wairimu'),
  p('u-miriam', 'p-miriam', 'Miriam Wanjiku', 'Sales', 'p-wairimu'),
];
const phones: Record<string, string> = { 'u-aisha': '+254722000222' };

function setup(writer: 'An admin' | 'Their manager') {
  const dues = [{ id: 'd-aisha', organizationId: ORG, personExternalId: 'p-aisha', dueOn: new Date('2026-10-05T00:00:00Z'), source: null }];
  const reviews: any[] = [];
  const sent: string[] = [];
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) =>
      where.organizationId_suite.suite === 'reviews' ? { isOn: true, answers: { every: 'Every 6 months', writer } } : null) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null)) },
    person: {
      findMany: jest.fn(async () => directory),
      findFirst: jest.fn(async ({ where }: any) => {
        const x = directory.find((d) => (where.linkedUserId ? d.linkedUserId === where.linkedUserId : d.externalId === where.externalId));
        return x ? { ...x, phone: phones[x.linkedUserId] ?? null } : null;
      }),
    },
    user: { findUnique: jest.fn(async ({ where }: any) => {
      const x = directory.find((d) => d.linkedUserId === where.id);
      return x ? { firstName: x.givenName, lastName: x.familyName, phoneNumber: null, deletedAt: null } : null;
    }) },
    evaluationDue: {
      findMany: jest.fn(async () => dues),
      findUnique: jest.fn(async ({ where }: any) => dues.find((x) => x.id === where.id) ?? null),
    },
    performanceReview: {
      findMany: jest.fn(async ({ where }: any) => reviews.filter((r) =>
        (!where.personExternalId || r.personExternalId === where.personExternalId) && (!where.evaluationDueId || where.evaluationDueId.in.includes(r.evaluationDueId)))),
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => (where.id ? r.id === where.id : r.evaluationDueId === where.evaluationDueId)) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const r = { id: 'r-aisha', managersWords: null, theirView: null, decision: null, decisionReasons: null, decidedAt: null, decidedById: null, noticed: null, startedAt: new Date(), ...data };
        reviews.push(r);
        return { id: r.id };
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(reviews.find((r) => r.id === where.id), data)),
    },
  };
  const whatsapp: any = { sendFor: jest.fn(async (_o: string, _to: string, text: string) => { sent.push(text); return { sent: true }; }) };
  const svc = new ReviewsService(prisma, undefined, new AReviewToldOnWhatsApp(new ARequestToldOnWhatsApp(prisma, whatsapp), whatsapp));
  return { svc, sent, as: (userId: string) => ({ userId, organizationId: ORG }) };
}

const DECISION = { decision: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid.' };

describe('the organisation answered "An admin", and Grace starts Aisha’s review', () => {
  it('before anybody starts it, no reader is told it is written with Wairimu, because any admin writes it', async () => {
    const { svc, as } = setup('An admin');
    for (const u of ['u-grace', 'u-wairimu']) {
      expect((await svc.board(as(u), TODAY)).next.map((x) => [x.name, x.writtenWith])).toEqual([['Aisha Otieno', null]]);
    }
  });

  it('Aisha reads that Grace started it, in the app, on Today and on WhatsApp', async () => {
    const { svc, sent, as } = setup('An admin');
    await svc.start(as('u-grace'), 'd-aisha');
    const mine = await svc.mine(as('u-aisha'));
    expect(mine).toEqual([{
      id: 'r-aisha', dueOn: '2026-10-05', writtenWithFirstName: 'Grace', stands: 'started',
      says: 'Grace has started your review. You can read it and add your own view before you meet.',
      /* Added by decision 113: nothing to appeal before the review is decided. */
      mayAppeal: false, appealStands: null, appealSays: null,
    }]);
    expect(yourReviewsOnToday(mine, ORG, TODAY).map((n) => [n.title, n.detail])).toEqual([
      ['Grace has started your review.', 'You can read it and add your own view before you meet.'],
    ]);
    expect(sent).toEqual(['Hi Aisha, Grace has started your review. Open Groundwork to read it and add your own view before you meet.']);
    expect(await svc.one(as('u-aisha'), 'r-aisha')).toMatchObject({ reader: 'person', writtenWithFirstName: 'Grace' });
    expect(JSON.stringify(mine)).not.toContain('Wairimu');
  });

  it('Grace, Omar (another admin) and Wairimu (the lead of Sales) read that it is written with Grace', async () => {
    const { svc, as } = setup('An admin');
    await svc.start(as('u-grace'), 'd-aisha');
    expect(await svc.one(as('u-grace'), 'r-aisha')).toMatchObject({ reader: 'writer', writtenWith: 'Grace Achieng', writtenWithFirstName: 'Grace' });
    expect(await svc.one(as('u-omar'), 'r-aisha')).toMatchObject({ reader: 'writer', writtenWith: 'Grace Achieng' });
    expect(await svc.one(as('u-wairimu'), 'r-aisha')).toMatchObject({ reader: 'lead', writtenWith: 'Grace Achieng', mayWrite: false });
    for (const u of ['u-grace', 'u-wairimu']) {
      expect((await svc.board(as(u), TODAY)).next.map((x) => [x.name, x.writtenWith, x.stands])).toEqual([['Aisha Otieno', 'Grace Achieng', 'started']]);
    }
  });

  it('Kamau, who leads another team, and Miriam, a colleague, are still refused it', async () => {
    const { svc, as } = setup('An admin');
    await svc.start(as('u-grace'), 'd-aisha');
    for (const u of ['u-kamau', 'u-miriam']) await expect(svc.one(as(u), 'r-aisha')).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.notYours));
    expect(await svc.mine(as('u-miriam'))).toEqual([]);
  });

  it('when Omar, another admin, decides it, Aisha reads that Omar decided it, in the app and on WhatsApp', async () => {
    const { svc, sent, as } = setup('An admin');
    await svc.start(as('u-grace'), 'd-aisha');
    await svc.decide(as('u-omar'), 'r-aisha', DECISION);
    expect(await svc.mine(as('u-aisha'))).toEqual([expect.objectContaining({
      writtenWithFirstName: 'Omar', stands: 'decided', says: 'Omar has decided your review. You can read the decision and the reasons.',
    })]);
    expect(sent[1]).toBe('Hi Aisha, Omar has decided your review. Open Groundwork to read the decision and the reasons.');
    expect(await svc.one(as('u-wairimu'), 'r-aisha')).toMatchObject({ writtenWith: 'Omar Abdi' });
  });
});

describe('the organisation answered "Their manager": unchanged', () => {
  it('Wairimu is named before she starts it, and Aisha reads that Wairimu started it', async () => {
    const { svc, sent, as } = setup('Their manager');
    expect((await svc.board(as('u-grace'), TODAY)).next.map((x) => x.writtenWith)).toEqual(['Wairimu Kamau']);
    await svc.start(as('u-wairimu'), 'd-aisha');
    expect((await svc.mine(as('u-aisha')))[0].says).toBe('Wairimu has started your review. You can read it and add your own view before you meet.');
    expect(sent).toEqual(['Hi Aisha, Wairimu has started your review. Open Groundwork to read it and add your own view before you meet.']);
    await expect(svc.start(as('u-grace'), 'd-aisha')).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyTheWriter));
  });
});
