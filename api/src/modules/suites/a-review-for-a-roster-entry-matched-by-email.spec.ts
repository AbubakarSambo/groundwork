import { ForbiddenException } from '@nestjs/common';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { AReviewToldOnWhatsApp } from './a-review-told-on-whatsapp.service';
import { ReviewsService, REVIEW_REFUSED } from './the-reviews.service';

/**
 * A REVIEW FINDS ITS PERSON BY EMAIL TOO (decision 82, through a-roster-entry-and-its-sign-in.ts).
 *
 * Baridi Appliances. Aisha is on the roster, but her entry was never linked to her sign-in. It carries
 * her address as " Aisha.Otieno@Baridi.co.ke ", and she signs in as "aisha.otieno@baridi.co.ke". Leave,
 * hours and spending already know these are the same person; reviews used to read only the link, so
 * Aisha found no review about her, could not open it or add her view, and was told nothing on her phone.
 *
 * Now reviews ask the same one place. Somebody in another organisation with the same address is never
 * Aisha, and an account already linked to another entry is never matched to hers.
 */

const ORG = 'org-baridi';
const tidy = (e: string | null | undefined) => (e ?? '').trim().toLowerCase();

const REVIEW = {
  id: 'r-aisha', organizationId: ORG, evaluationDueId: 'd-aisha', personExternalId: 'p-aisha', startedById: 'u-wairimu',
  managersWords: 'Aisha is our strongest closer with butcheries.', theirView: null, decision: null, decisionReasons: null, decidedAt: null,
  noticed: [{ says: 'Closed 9 sales since March. Paystack shows all 9 payments.', mark: 'proven' }],
};

function aBaridi(opts: { aishaElsewhere?: boolean; accountTakenByAnotherEntry?: boolean } = {}) {
  const directory: any[] = [
    { externalId: 'p-wairimu', linkedUserId: 'u-wairimu', email: 'wairimu@baridi.co.ke', phone: '+254711000111', displayName: 'Wairimu Kamau', givenName: 'Wairimu', familyName: 'Kamau', department: 'Sales', managerExternalId: null, active: true, organizationId: ORG },
    /* Not linked. The same address as Aisha's sign-in, in other capitals and with spaces around it. */
    { externalId: 'p-aisha', linkedUserId: null, email: ' Aisha.Otieno@Baridi.co.ke ', phone: '+254722000222', displayName: 'Aisha Otieno', givenName: 'Aisha', familyName: 'Otieno', department: 'Sales', managerExternalId: 'p-wairimu', active: true, organizationId: ORG },
  ];
  if (opts.accountTakenByAnotherEntry) {
    directory.push({ externalId: 'p-aisha-old', linkedUserId: 'u-aisha', email: 'aisha.old@baridi.co.ke', phone: null, displayName: 'Aisha O.', givenName: 'Aisha', familyName: 'O.', department: 'Stores', managerExternalId: null, active: true, organizationId: ORG });
  }
  const users: any[] = [
    { id: 'u-wairimu', email: 'wairimu@baridi.co.ke', firstName: 'Wairimu', phoneNumber: null, deletedAt: null, organizationId: ORG },
    { id: 'u-aisha', email: 'aisha.otieno@baridi.co.ke', firstName: 'Aisha', phoneNumber: null, deletedAt: null, organizationId: opts.aishaElsewhere ? 'org-other' : ORG },
  ];
  const roles: Record<string, string> = { 'u-wairimu': 'LEAD', 'u-aisha': 'MEMBER' };
  const inOrg = (u: any, org: string) => u.organizationId === org;
  const emailsIn = (or: any[] | undefined) => (or ?? []).filter((c) => c.email).map((c) => tidy(c.email.equals));

  const reviews: any[] = [];
  const dues = [{ id: 'd-aisha', organizationId: ORG, personExternalId: 'p-aisha', dueOn: new Date('2027-03-01T00:00:00.000Z') }];
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } })) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: roles[where.userId_organizationId.userId] ?? 'MEMBER' })) },
    person: {
      findMany: jest.fn(async ({ where }: any) => directory.filter((p) => {
        if (where.organizationId && p.organizationId !== where.organizationId) return false;
        if (where.active !== undefined && p.active !== where.active) return false;
        if (where.linkedUserId?.in && !where.linkedUserId.in.includes(p.linkedUserId)) return false;
        if (where.linkedUserId === null && p.linkedUserId !== null) return false;
        const wanted = emailsIn(where.OR);
        if (wanted.length && !wanted.includes(tidy(p.email))) return false;
        return true;
      })),
      findFirst: jest.fn(async ({ where }: any) => directory.find((p) => p.organizationId === where.organizationId
        && (where.externalId ? p.externalId === where.externalId : p.linkedUserId === where.linkedUserId)) ?? null),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => users.filter((u) => {
        if (u.deletedAt) return false;
        if (where.id?.in && !where.id.in.includes(u.id)) return false;
        const wanted = emailsIn(where.OR);
        if (wanted.length && !wanted.includes(tidy(u.email))) return false;
        return inOrg(u, ORG);
      })),
      findUnique: jest.fn(async ({ where }: any) => users.find((u) => u.id === where.id) ?? null),
    },
    evaluationDue: { findUnique: jest.fn(async ({ where }: any) => dues.find((d) => d.id === where.id) ?? null) },
    performanceReview: {
      findMany: jest.fn(async ({ where }: any) => reviews.filter((r) => r.organizationId === where.organizationId && (!where.personExternalId || r.personExternalId === where.personExternalId))),
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => (where.id ? r.id === where.id : r.evaluationDueId === where.evaluationDueId)) ?? null),
      create: jest.fn(async ({ data }: any) => { const r = { ...REVIEW, ...data, id: 'r-aisha' }; reviews.push(r); return { id: r.id }; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(reviews.find((r) => r.id === where.id), data)),
    },
    resolution: { findMany: jest.fn(async () => []) },
  };
  const sent: { to: string; text: string }[] = [];
  const whatsapp: any = { sendFor: jest.fn(async (_org: string, to: string, text: string) => { sent.push({ to, text }); return { sent: true }; }) };
  const svc = new ReviewsService(prisma, undefined, new AReviewToldOnWhatsApp(new ARequestToldOnWhatsApp(prisma, whatsapp), whatsapp));
  return { svc, sent, as: (userId: string) => ({ userId, organizationId: ORG }) };
}

describe('Aisha, on the roster but never linked, finds her own review by her email', () => {
  it('she is told on WhatsApp, at the phone on her roster entry, when Wairimu starts it', async () => {
    const { svc, sent, as } = aBaridi();
    await svc.start(as('u-wairimu'), 'd-aisha');
    expect(sent).toEqual([{ to: '+254722000222', text: 'Hi Aisha, Wairimu has started your review. Open Groundwork to read it and add your own view before you meet.' }]);
  });

  it('she finds it among the reviews about her, in a plain sentence', async () => {
    const { svc, as } = aBaridi();
    await svc.start(as('u-wairimu'), 'd-aisha');
    expect(await svc.mine(as('u-aisha'))).toEqual([{
      id: 'r-aisha', dueOn: '2027-03-01', writtenWithFirstName: 'Wairimu', stands: 'started',
      says: 'Wairimu has started your review. You can read it and add your own view before you meet.',
      /* Added by decision 113: nothing to appeal before the review is decided. */
      mayAppeal: false, appealStands: null, appealSays: null,
    }]);
  });

  /* Changed by decision 93, row 15. This pinned "and never reads Wairimu’s words", the restriction Hafsah removed. */
  it('she opens it as the person it is about, adds her view, and reads Wairimu’s words beside it', async () => {
    const { svc, as } = aBaridi();
    await svc.start(as('u-wairimu'), 'd-aisha');
    const read: any = await svc.writeView(as('u-aisha'), 'r-aisha', 'I want to lead the supermarket accounts.');
    expect(read.reader).toBe('person');
    expect(read.theirView).toBe('I want to lead the supermarket accounts.');
    expect(read.managersWords).toBe('Aisha is our strongest closer with butcheries.');
    expect(read.managersWordsHeading).toBe('What Wairimu writes');
    expect(read.whereYouDiffer).toEqual({
      says: 'Wairimu and you have each written your own view of your work. Here they are side by side, so you can see where they differ before you meet.',
      managersWords: 'Aisha is our strongest closer with butcheries.',
      yourView: 'I want to lead the supermarket accounts.',
    });
    expect((await svc.mine(as('u-aisha')))[0].says).toBe('Wairimu has started your review, and your own view is in it. You can read it and change your view before you meet.');
  });

  it('when Wairimu decides it, Aisha is told that too', async () => {
    const { svc, sent, as } = aBaridi();
    await svc.start(as('u-wairimu'), 'd-aisha');
    await svc.decide(as('u-wairimu'), 'r-aisha', { decision: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid.' });
    expect(sent.map((s) => s.text)).toContain('Hi Aisha, Wairimu has decided your review. Open Groundwork to read the decision and the reasons.');
    expect((await svc.mine(as('u-aisha')))[0].says).toBe('Wairimu has decided your review. You can read the decision and the reasons.');
  });
});

describe('the same address is not enough on its own', () => {
  it('a sign-in in another organisation with Aisha’s address finds nothing, cannot open it, and is told nothing', async () => {
    const { svc, sent, as } = aBaridi({ aishaElsewhere: true });
    await svc.start(as('u-wairimu'), 'd-aisha');
    expect(sent).toEqual([]);
    expect(await svc.mine(as('u-aisha'))).toEqual([]);
    await expect(svc.one(as('u-aisha'), 'r-aisha')).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.notYours));
  });

  it('a sign-in already linked to another roster entry is that entry’s, not Aisha’s', async () => {
    const { svc, as } = aBaridi({ accountTakenByAnotherEntry: true });
    await svc.start(as('u-wairimu'), 'd-aisha');
    expect(await svc.mine(as('u-aisha'))).toEqual([]);
    await expect(svc.writeView(as('u-aisha'), 'r-aisha', 'My view.')).rejects.toThrow();
  });
});
