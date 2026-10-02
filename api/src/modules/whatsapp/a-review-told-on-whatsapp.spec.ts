import 'reflect-metadata';
import { aReviewWasDecided, aReviewWasStarted } from './what-goes-to-a-phone';
import { TEMPLATES, fill, FIRST_MESSAGES, isBusinessInitiated } from './a-message-outside-the-window';
import { ARequestToldOnWhatsApp } from '../suites/a-request-told-on-whatsapp.service';
import { AReviewToldOnWhatsApp } from '../suites/a-review-told-on-whatsapp.service';
import { ReviewsService } from '../suites/the-reviews.service';
import { SuggestionsService } from '../suggestions/suggestions.service';

/**
 * A REVIEW, TOLD ON WHATSAPP (item 16, decisions 82 and 83). Read as each reader reads it.
 *
 * Baridi Appliances. Wairimu writes Aisha's review with her. When Wairimu starts it, and again when she
 * decides it, Aisha is told on WhatsApp that it waits for her in the app. Nothing of the review goes to
 * the phone: not what Groundwork noticed, not Wairimu's words, not the decision or its reasons. Wairimu,
 * Grace (an admin) and Miriam (a colleague) are told nothing on WhatsApp about Aisha's review.
 */

describe('what Aisha reads on her phone', () => {
  it('when Wairimu starts her review', () => {
    expect(aReviewWasStarted('Aisha', 'Wairimu').text).toBe(
      'Hi Aisha, Wairimu has started your review. Open Groundwork to read it and add your own view before you meet.',
    );
  });
  it('when Wairimu decides it', () => {
    expect(aReviewWasDecided('Aisha', 'Wairimu').text).toBe(
      'Hi Aisha, Wairimu has decided your review. Open Groundwork to read the decision and the reasons.',
    );
  });
  it('outside the 24 hours the same words go as two templates of ours, for Hafsah to submit', () => {
    const s = aReviewWasStarted('Aisha', 'Wairimu');
    expect(TEMPLATES[s.kind].name).toBe('groundwork_review_started');
    expect(fill(TEMPLATES[s.kind].body, s.params)).toBe(s.text);
    const d = aReviewWasDecided('Aisha', 'Wairimu');
    expect(TEMPLATES[d.kind].name).toBe('groundwork_review_decided');
    expect(d.params).toEqual(['Aisha', 'Wairimu']);
  });
  it('both count as Groundwork writing first, so they keep to one message a day', () => {
    for (const kind of ['review-started', 'review-decided']) {
      expect(isBusinessInitiated(kind)).toBe(true);
      expect(FIRST_MESSAGES.has(kind)).toBe(true);
    }
  });
});

/* ---------- who is told, through the one sender ---------- */

const REVIEW = {
  id: 'r-aisha', organizationId: 'org-baridi', evaluationDueId: 'd-aisha', personExternalId: 'p-aisha', startedById: 'u-wairimu',
  managersWords: 'Aisha is our strongest closer with butcheries.', theirView: null, decision: null, decisionReasons: null, decidedAt: null,
  noticed: [{ says: 'Closed 9 sales since March. Paystack shows all 9 payments.', mark: 'proven' }],
};

function aBaridi() {
  const sent: { to: string; text: string; context: any }[] = [];
  const directory = [
    { externalId: 'p-wairimu', linkedUserId: 'u-wairimu', displayName: 'Wairimu Kamau', givenName: 'Wairimu', familyName: 'Kamau', department: 'Sales', managerExternalId: null, active: true },
    { externalId: 'p-aisha', linkedUserId: 'u-aisha', displayName: 'Aisha Otieno', givenName: 'Aisha', familyName: 'Otieno', department: 'Sales', managerExternalId: 'p-wairimu', active: true },
  ];
  const phones: Record<string, string> = { 'u-wairimu': '+254711000111', 'u-aisha': '+254722000222' };
  const reviews: any[] = [];
  const dues = [{ id: 'd-aisha', organizationId: 'org-baridi', personExternalId: 'p-aisha', dueOn: new Date('2027-03-01') }];
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } })) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: where.userId_organizationId.userId === 'u-wairimu' ? 'LEAD' : 'MEMBER' })) },
    person: {
      findMany: jest.fn(async () => directory),
      findFirst: jest.fn(async ({ where }: any) => {
        const p = directory.find((x) => (where.linkedUserId ? x.linkedUserId === where.linkedUserId : x.externalId === where.externalId));
        return p ? { ...p, phone: phones[p.linkedUserId] } : null;
      }),
    },
    user: { findUnique: jest.fn(async ({ where }: any) => ({ 'u-wairimu': { firstName: 'Wairimu', phoneNumber: null, deletedAt: null }, 'u-aisha': { firstName: 'Aisha', phoneNumber: null, deletedAt: null } } as any)[where.id] ?? null) },
    evaluationDue: { findUnique: jest.fn(async ({ where }: any) => dues.find((d) => d.id === where.id) ?? null) },
    performanceReview: {
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => (where.id ? r.id === where.id : r.evaluationDueId === where.evaluationDueId)) ?? null),
      create: jest.fn(async ({ data }: any) => { const r = { ...REVIEW, ...data, id: 'r-aisha' }; reviews.push(r); return { id: r.id }; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(reviews.find((r) => r.id === where.id), data)),
    },
    resolution: { findMany: jest.fn(async () => []) },
  };
  const whatsapp: any = { sendFor: jest.fn(async (_org: string, to: string, text: string, context: any) => { sent.push({ to, text, context }); return { sent: true }; }) };
  const told = new AReviewToldOnWhatsApp(new ARequestToldOnWhatsApp(prisma, whatsapp), whatsapp);
  const svc = new ReviewsService(prisma, undefined, told);
  return { svc, sent, as: (userId: string) => ({ userId, organizationId: 'org-baridi' }) };
}

describe('who is told', () => {
  it('Aisha is told when Wairimu starts her review and when she decides it, and nobody else is told anything', async () => {
    const { svc, sent, as } = aBaridi();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    await svc.decide(as('u-wairimu'), id, { decision: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid.' });
    expect(sent.map((s) => [s.to, s.text, s.context.kind])).toEqual([
      ['+254722000222', 'Hi Aisha, Wairimu has started your review. Open Groundwork to read it and add your own view before you meet.', 'review-started'],
      ['+254722000222', 'Hi Aisha, Wairimu has decided your review. Open Groundwork to read the decision and the reasons.', 'review-decided'],
    ]);
  });

  it('nothing of the review reaches the phone: no noticed line, no manager’s words, no decision, no reasons', async () => {
    const { svc, sent, as } = aBaridi();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    await svc.writeWords(as('u-wairimu'), id, 'Aisha is our strongest closer with butcheries.');
    await svc.decide(as('u-wairimu'), id, { decision: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid.' });
    expect(JSON.stringify(sent)).not.toMatch(/Paystack|strongest closer|supermarket|9 sales|butcheries/);
  });

  it('a decision corrected later is not a second message', async () => {
    const { svc, sent, as } = aBaridi();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    await svc.decide(as('u-wairimu'), id, { decision: 'Aisha leads the supermarket accounts.', reasons: 'Her sales.' });
    await svc.decide(as('u-wairimu'), id, { decision: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid.' });
    expect(sent.filter((s) => s.context.kind === 'review-decided')).toHaveLength(1);
  });

  it('Nest gives the reviews their WhatsApp teller and the suggestions, rather than nothing', () => {
    /* Before, both were imported as types only, so Nest read `Function` and, being optional, gave nothing. */
    const types = Reflect.getMetadata('design:paramtypes', ReviewsService) ?? [];
    expect(types).toContain(SuggestionsService);
    expect(types).toContain(AReviewToldOnWhatsApp);
  });
});
