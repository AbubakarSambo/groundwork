import { ForbiddenException } from '@nestjs/common';
import { ReviewsService } from './the-reviews.service';

/*
 * WHO READS A REVIEW WITH RELEASE 7 ON (Hafsah's decision, 25 October): the person, their manager, HR where the organisation has someone
 * holding the HR duty, and an admin only where they set up or approved one of the person's check-ins. With Release 7 off, as before.
 * Hand-written: Kilima Traders. Baraka leads Sales and writes Imani's review. Halima holds the HR duty. Grace is an admin who set up the
 * Sales check-in Imani is in; Otieno is an admin who set up nothing of hers. Neema is Imani's colleague.
 */
const ORG = 'org-kilima';
const p = (u: string, ext: string, name: string, department: string, manager: string | null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, displayName: name, givenName, familyName, department, managerExternalId: manager, active: true };
};
const directory = [
  p('u-grace', 'p-grace', 'Grace Achieng', 'Finance', null), p('u-otieno', 'p-otieno', 'Otieno Ouma', 'Finance', null),
  p('u-baraka', 'p-baraka', 'Baraka Mutua', 'Sales', null), p('u-halima', 'p-halima', 'Halima Yusuf', 'People', null),
  p('u-imani', 'p-imani', 'Imani Wekesa', 'Sales', 'p-baraka'), p('u-neema', 'p-neema', 'Neema Oduya', 'Sales', 'p-baraka'),
];
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-otieno': 'ADMIN', 'u-baraka': 'LEAD', 'u-halima': 'MEMBER', 'u-imani': 'MEMBER', 'u-neema': 'MEMBER' };

function setup(on: boolean) {
  const review = { id: 'r-imani', organizationId: ORG, evaluationDueId: 'd-imani', personExternalId: 'p-imani', startedById: 'u-baraka', startedAt: new Date('2026-09-20'), managersWords: 'Imani leads the Karen shops well.', managersWordsById: 'u-baraka', theirView: null, decision: null, noticed: [], recordRead: null };
  const prisma: any = {
    organization: { findUnique: async () => ({ release7PeopleOn: on }) },
    organizationSuite: { findUnique: async ({ where }: any) => (where.organizationId_suite.suite === 'duties' ? { answers: { hr: 'u-halima' } } : { isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } }) },
    organizationMembership: { findUnique: async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null), findMany: async ({ where }: any) => Object.entries(roles).filter(([, r]) => r === where.role).map(([userId]) => ({ userId })) },
    person: { findMany: async () => directory, findFirst: async ({ where }: any) => directory.find((x) => x.externalId === where.externalId) ?? null },
    user: { findUnique: async ({ where }: any) => ({ id: where.id, firstName: where.id.slice(2) }), findMany: async ({ where }: any) => where.id.in.map((id: string) => ({ id, firstName: id.slice(2) })) },
    evaluationDue: { findUnique: async () => ({ id: 'd-imani', dueOn: new Date('2026-10-01') }), findMany: async () => [] },
    performanceReview: { findUnique: async () => review, findMany: async () => [review] },
    ground: { findFirst: async ({ where }: any) => (where.OR.some((c: any) => Object.values(c)[0] === 'u-grace') ? { id: 'g-sales' } : null) },
    suiteEvent: { create: async () => ({}) },
  };
  const svc = new ReviewsService(prisma);
  return { read: (userId: string) => svc.one({ userId, organizationId: ORG } as any, 'r-imani') };
}

describe('who reads a review, Release 7 on', () => {
  it('the person, the manager who writes it, and HR read it', async () => {
    const { read } = setup(true);
    await expect(read('u-imani')).resolves.toBeTruthy();
    await expect(read('u-baraka')).resolves.toBeTruthy();
    await expect(read('u-halima')).resolves.toBeTruthy();
  });

  it('an admin who set up one of her check-ins reads it; an admin who set up none does not', async () => {
    const { read } = setup(true);
    await expect(read('u-grace')).resolves.toBeTruthy();
    await expect(read('u-otieno')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a colleague never reads it', async () => {
    const { read } = setup(true);
    await expect(read('u-neema')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('who reads a review, Release 7 off', () => {
  it('as before: every admin reads it, and HR who is not a manager does not', async () => {
    const { read } = setup(false);
    await expect(read('u-otieno')).resolves.toBeTruthy();
    await expect(read('u-halima')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
