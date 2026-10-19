import { whatIsOutstandingFor } from './the-leads-daily-nudge';

/**
 * NAME WHOSE SUPERVISOR, IN THE MORNING SUMMARY TOO (Hafsah, 19 October, point 6). David Mwangi's wait for "a clear role defined for the
 * Jamii Clinics employment claim" is on "my supervisor", his own words. Once it has sat long enough to be a risk in Wanjiru's summary, it
 * is said with his first name, as the summary names everybody, never "waiting on my supervisor" in her summary.
 */
const G = 'g-lit';
const DAVID = { id: 'p-david', groundId: G, userId: 'u-david', email: null, nameGiven: null, managingOnly: false, leftAt: null, partyType: 'PARTICIPANT', user: { firstName: 'David', lastName: 'Mwangi', awaitingOrgApproval: false } };
const THE_WAIT = { id: 'w-role', groundId: G, what: 'a clear role defined for the Jamii Clinics employment claim', namedTheThing: true, onLabel: 'my supervisor', status: 'BLOCKING', createdAt: new Date('2026-10-12T08:04:34Z'), dueOn: null, blockerKind: null, fromParticipantId: 'p-david', onParticipantId: null, triedSaid: null, sourceCheckInId: null, fromParticipant: DAVID, onParticipant: null };

it('Wanjiru reads "David’s supervisor", never "my supervisor"', async () => {
  const prisma: any = new Proxy({
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => (where?.userId ? [] : [DAVID])) },
    groundDependency: { findMany: jest.fn(async () => [THE_WAIT]) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: false })) },
  }, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) }) });
  const now = new Date('2026-11-02T05:00:00Z');
  const o = await whatIsOutstandingFor(prisma, { userId: 'u-wanjiru', organizationId: 'org', grounds: [{ id: G, label: 'Litigation team daily', scenario: 'PULSE_CHECK', overWhatsApp: true, timelineDays: 60, cadence: 'DAILY' }] }, { boards: {} as any, release: null }, now);
  const said = o.risks.map((t) => t.text).join(' ');
  expect(said).toContain('David has been waiting on David’s supervisor for a clear role defined for the Jamii Clinics employment claim');
  expect(said).not.toMatch(/\bmy supervisor\b/);
});
