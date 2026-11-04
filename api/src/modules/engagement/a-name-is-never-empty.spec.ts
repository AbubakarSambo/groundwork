import { nameToCall } from './a-name-to-call-them';
import { RemindService } from '../conversation/remind.service';
import { theQuietIn, theAcrossWords } from './who-has-gone-quiet';
import { theEmailForTheLead } from '../conversation/chasing-belongs-to-the-lead';
import { theLeadsLetter } from '../email/the-leads-weekly-letter';
import { theWhatIsNewWords } from './heres-what-is-new';

/**
 * A NAME IS NEVER EMPTY (existing-users check, section 15), AS WAIRIMU READS IT.
 *
 * 26 of 364 "has not started" subjects read ` has not started "...", and Groundwork has reminded them`. Somebody whose first name was left blank is now called
 * by the rest of the name they gave, then the name they were given, then "Someone" (never their address), with the verb that goes with one person.
 */
describe('the name to call somebody by', () => {
  it.each([
    [{ user: { firstName: 'Omar', lastName: 'Bello', email: 'omar@x.test' } }, 'Omar'],
    [{ user: { firstName: '', lastName: 'Bello', email: 'b@x.test' } }, 'Bello'],
    [{ user: { firstName: '  ', lastName: '', email: null }, nameGiven: 'Femi Ade' }, 'Femi Ade'],
    /* An email is never shown in place of a name, whole or in part (Hafsah, 6 October). */
    [{ user: { firstName: '', lastName: '', email: 'amina.otieno@x.test' } }, 'Someone'],
    [{ email: 'k.mensah2@x.test' }, 'Someone'],
    [{ user: { firstName: 'sales@x.test', lastName: '', email: 'sales@x.test' } }, 'Someone'],
    [{ email: 'open-2a3aa45daca8@unclaimed.invalid' }, 'Someone'],
    [{ user: { firstName: '', lastName: '', email: '' } }, 'Someone'],
    [null, 'Someone'],
])('%j reads %s', (p: any, name) => { expect(nameToCall(p)).toBe(name); });
});

describe('the not-started email, when somebody has no first name', () => {
  const NOW = new Date('2026-10-25T08:00:00.000Z');
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());
  it('never opens with a blank, and the verb agrees', async () => {
    /* Since one calendar for each check-in (29 October), no days given is Monday to Friday, and this test's clock is a Sunday: the team says it works every day, so the test stays about what it was written for. */
    const ground = { label: 'Kenya launch', organizationId: 'org', initiatorId: 'u-w', createdAt: new Date('2026-10-02T00:00:00Z'), brief: null, workingDays: [0, 1, 2, 3, 4, 5, 6], chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: { email: 'w@x.test', firstName: 'Wairimu' } };
    const row = (id: string, first: string, last: string, email: string) => ({ id: `c${id}`, createdAt: new Date('2026-10-05T08:00:00.000Z'), sessionNumber: 1, availableFrom: null, participantId: `p${id}`, groundId: 'g1', leadToldAt: null, ground, participant: { id: `p${id}`, email, userId: `u${id}`, lastNudgedAt: new Date('2026-10-19T08:00:00.000Z'), user: { firstName: first, lastName: last, emailNotifications: true, isActive: true, deletedAt: null } } });
    const told: any[] = [];
    const prisma: any = {
      checkIn: { findMany: jest.fn(async (a: any) => (a.where?.status === 'NOT_STARTED' && a.select?.leadToldAt ? [row('1', '', '', 'amina.otieno@x.test')] : [])), updateMany: jest.fn(async () => ({})) },
      groundParticipant: { findMany: jest.fn(async () => []), update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null) },
      leaveRequest: { findMany: jest.fn(async () => []) },
    };
    const email: any = { sendNudge: jest.fn(), sendWhoHasNotStarted: jest.fn(async (_t: string, subject: string, text: string) => { told.push({ subject, text }); }), buildCheckInUrl: (i: string) => i, frontendUrl: 'https://app.test' };
    await new RemindService(prisma, email, { tell: async () => [] } as any).sendScheduledNudges();
    expect(told[0].subject).toBe('Someone has not started "Kenya launch", and Groundwork has reminded them');
    expect(told[0].subject.startsWith(' ')).toBe(false);
    expect(told[0].text).toContain('Hi Wairimu, someone has not started the check-in on "Kenya launch".');
    /* No address, and no piece of one, reads as a name. */
    expect(`${told[0].subject} ${told[0].text}`).not.toMatch(/amina|otieno|@x\.test/i);
  });
  it('two people with no name at all are two people, not one', async () => {
    const q = (n: string) => ({ participantId: n, sessionNumber: 2, status: 'NOT_STARTED', createdAt: new Date('2026-10-12T08:00:00Z'), participant: { userId: `u${n}`, managingOnly: false, nameGiven: null, user: { firstName: '', lastName: '', email: '', awaitingOrgApproval: false } } });
    const before = (n: string) => ({ ...q(n), sessionNumber: 1, status: 'COMPLETED' });
    const out = theQuietIn([q('a'), q('b'), before('a'), before('b')], 'X', 'u-lead', NOW, new Date('2026-10-01T00:00:00Z'));
    expect(out!.stoppedAfterAnswering).toEqual(['Someone', 'Someone']);
    /* And they are counted, never listed as "Someone and Someone". */
    expect(theAcrossWords('Wairimu', [out!]).lines.join(' ')).toContain('Two people answered before and have not answered since.');
  });
});

describe('no email address, nor any piece of one, appears as a name in any message', () => {
  const ADDRESS_BITS = /@|x\.test|amina|otieno|mensah|unclaimed|open-|[0-9a-f]{8}/i;
  const nameless = (n: string, email: string) => ({ participantId: n, sessionNumber: 2, status: 'NOT_STARTED', createdAt: new Date('2026-10-12T08:00:00Z'), participant: { userId: `u${n}`, managingOnly: false, nameGiven: null, email, user: { firstName: '', lastName: '', email, awaitingOrgApproval: false } } });
  it('the lead\'s not-started email, the quiet email, the weekly letter, what is new and the participant\'s week', () => {
    const people = ['amina.otieno@x.test', 'k.mensah2@x.test', 'open-2a3aa45daca8@unclaimed.invalid'];
    const names = people.map((e) => nameToCall({ user: { firstName: '', lastName: '', email: e }, email: e }));
    const lead = theEmailForTheLead({ leadName: 'Wairimu', groundLabel: 'Kenya launch', whoHasNotStarted: ['Omar', ...names], chasedOn: [3, 7], link: 'https://app.test' })!;
    expect(lead.subject).toBe('Omar and three others have not started "Kenya launch", and Groundwork has reminded them');
    const quiet = theQuietIn([...people.map((e, i) => nameless(String(i), e)), ...people.map((e, i) => ({ ...nameless(String(i), e), sessionNumber: 1, status: 'COMPLETED' }))], 'Kenya launch', 'u-lead', new Date('2026-10-25T08:00:00Z'), new Date('2026-10-01T00:00:00Z'))!;
    const letter = theLeadsLetter([{ groundId: 'g', label: 'Kenya launch', ofHowMany: 5, checkedIn: 1, saidWhatNext: 0, done: 0, waiting: 0, notYet: ['Omar', ...names], closedBy: [], waitingOn: [] } as any])!;
    const what = theWhatIsNewWords('Wairimu', [{ label: 'Kenya launch', ofHowMany: 5, answered: 1, notYet: ['Omar'], moreToCome: true, says: '1 of 5 has checked in; Omar and 3 other people haven’t started yet.' }])!;
    const all = [lead.subject, lead.text, ...theAcrossWords('Wairimu', [quiet]).lines, letter.subject, ...letter.lines, what.subject, ...what.lines].join(' ').replace(/https:\/\/app\.test/g, '');
    expect(all).not.toMatch(ADDRESS_BITS);
    expect(all).not.toMatch(/Someone(,| and) Someone/);
    expect(letter.lines.join(' ')).toContain('Omar and three others did not check in.');
  });
});
