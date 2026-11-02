import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';
import { theLeadsLetter, theWeekOf } from './the-leads-weekly-letter';
import { theOpenSession } from '../engagement/heres-what-is-new';

/**
 * NIGHT QUALITY RUN 3 (decision 8 redone), in Esther's weekly letter and her "what is new" email. Amina Otieno
 * was invited and never joined; Jared Okoth joined and his session closed with nothing said; Hassan and Collins
 * answered. Amina is in no count and never "not yet"; Jared's silent close is not an answer.
 */
const person = (id: string, first: string, last: string, extra: any = {}) => ({ id, userId: `u-${id}`, email: `${id}@lakeshore.test`, managingOnly: false, partyType: 'PARTICIPANT', cameThroughTheLink: false, nameGiven: null, lastNudgedAt: null, user: { firstName: first, lastName: last, awaitingOrgApproval: false }, ...extra });
/* Joined means accepted the invitation (13 October): everybody but Amina accepted. Each row is as the database returns it for the one joined rule's select. */
const accepted = { acceptedAt: new Date('2026-11-01T09:00:00Z'), checkIns: [] };
const people = [
  person('esther', 'Esther', 'Achieng', { partyType: 'INITIATOR', ...accepted }),
  person('collins', 'Collins', 'Odhiambo', accepted), person('hassan', 'Hassan', 'Mwenda', accepted), person('amina', 'Amina', 'Otieno', { acceptedAt: null, checkIns: [] }), person('jared', 'Jared', 'Okoth', accepted),
];
const at = new Date('2026-11-27T09:00:00Z');
const row = (participantId: string, said: boolean) => ({ participantId, sessionNumber: 7, status: 'COMPLETED', completedAt: new Date('2026-11-24T18:00:00Z'), closedReason: said ? null : CLOSED_BY_THE_CLOCK, turns: said ? [{ id: 't' }] : [] });
const sessions = [row('collins', true), row('hassan', true), row('jared', false)];
/* Everybody but Amina has signed in once. */
const users = { findMany: async (a: any) => (a.where.id.in as string[]).filter((id) => id !== 'u-amina').map((id) => ({ id, passwordHash: 'set', googleId: null, welcomeCardSeenAt: null })) };

describe('run 3: only people who joined are counted, and a silent close is not an answer', () => {
  it("the weekly letter: three people, Jared named as not yet, Amina nowhere", async () => {
    const prisma: any = {
      user: users, emailVerificationToken: { findMany: async () => [] },
      /* The people of the check-in, and nothing for a second look: the letter decides who joined from its own read. */
      groundParticipant: { findMany: async (a: any) => (a?.where?.groundId ? people : []) },
      checkIn: { findMany: async ({ where }: any) => (where?.participant ? [] : sessions.filter((s) => !(where.AND && s.closedReason === CLOSED_BY_THE_CLOCK))) },
      groundCommitment: { findMany: async () => [], count: async () => 0 },
      groundDependency: { findMany: async () => [], count: async () => 0 },
    };
    const w = await theWeekOf(prisma, { id: 'g1', label: 'Weekly sales check-in', initiatorId: 'u-esther' }, at);
    const text = [theLeadsLetter([w])!.subject, ...theLeadsLetter([w])!.lines].join(' ');
    console.log(`ESTHER READS: ${text}`);
    expect(w.ofHowMany).toBe(3);
    expect(w.notYet).toEqual(['Jared']);
    expect(text).not.toContain('Amina');
  });

  /* Changed on wip/plan: this count now reads the one count (this-sessions-count.ts), and wip/assessment's one count counts somebody
     invited and not joined (Hafsah, 1 November 2026), so Amina is counted, and said once, as not joined, not as somebody who has not
     checked in. */
  it('the "what is new" count: Jared not answered, Amina counted and said as not joined', async () => {
    const rows = [...sessions, { participantId: 'amina', sessionNumber: 7, status: 'NOT_STARTED', closedReason: null, turns: [] }]
      .map((s) => ({ ...s, participant: people.find((p) => p.id === s.participantId) }));
    const prisma: any = { user: users, emailVerificationToken: { findMany: async () => [] }, checkIn: { findMany: async ({ where }: any) => (where?.participant ? [] : rows) } };
    const open: any = await theOpenSession(prisma, 'g1', 'u-esther');
    expect(open.ofHowMany).toBe(4);
    expect(open.answered).toBe(2);
    expect(open.notYet).toEqual(['Jared']);
    expect(open.notJoinedSays).toBe('One of them was invited and has not joined yet.');
  });
});
