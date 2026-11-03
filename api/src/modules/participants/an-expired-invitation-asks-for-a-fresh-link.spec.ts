import { ParticipantsService, FRESH_LINK_REPLY } from './participants.service';
import { INVITATION_HAS_EXPIRED, assertInviteLinkStillOpens } from './an-invite-link-still-opens';
import { whenItAsks } from './when-it-asks';

/**
 * THE INVITATION (A3, #/join/invite) AND ITS EXPIRED LINK (#/join/expired), AS THE SERVER GIVES THEM.
 *
 * - A live invitation says which organisation, until when, and how often it asks.
 * - An expired one says only the lead's first name, for "If this isn't the address Wairimu invited,
 *   ask her to add the right one."
 * - "Send me a fresh link" gives the same reply whatever is typed, and sends only to the address the
 *   invitation went to. Privacy: an address that was not invited learns nothing and nothing is sent.
 */
const DAY = 24 * 60 * 60 * 1000;

function make(row: any) {
  const sent: any[] = [];
  const updates: any[] = [];
  const prisma: any = {
    groundParticipant: {
      findUnique: jest.fn(async ({ where }: any) => (row && where.inviteToken === row.inviteToken ? row : null)),
      update: jest.fn(async (a: any) => { updates.push(a); return {}; }),
    },
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1', label: 'Sales team, Q3', scenario: 'TEAM_UPDATES', brief: null,
        cadence: 'DAILY', cadenceAnchorDay: null, workingDays: [1, 2, 3, 4, 5],
        endsAt: new Date('2026-09-30T00:00:00Z'),
        initiator: { firstName: 'Wairimu', lastName: 'Kamau' },
        organization: { name: 'Baridi Appliances' },
      })),
    },
    checkIn: { count: jest.fn(async () => 0) },
  };
  const email: any = { sendTheInviteThisGroundSends: jest.fn(async (...a: any[]) => { sent.push(a); return {}; }) };
  const service = new ParticipantsService(prisma, {} as any, email, {} as any);
  return { service, sent, updates };
}

const live = { id: 'p1', groundId: 'g1', inviteToken: 'tok', email: 'peter@ouma-agencies.test', userId: null, roleAsDescribed: null, inviteTokenExpiresAt: new Date(Date.now() + 5 * DAY) };
const expired = { ...live, inviteTokenExpiresAt: new Date(Date.now() - DAY) };

describe('a live invitation', () => {
  it('says the organisation, the end date and how often it asks', async () => {
    const { service } = make(live);
    const p: any = await service.preview('tok');
    expect(p.organisationName).toBe('Baridi Appliances');
    expect(p.leadFirstName).toBe('Wairimu');
    expect(p.endsAt).toBe('2026-09-30T00:00:00.000Z');
    /* Changed 3 November 2026 (Hafsah): the hour it opens and its name, from what setup holds. */
    expect(p.schedule).toBe('About ten minutes each weekday, from 8am, for Sales team, Q3.');
    expect(p.expired).toBeUndefined();
  });
});

describe('an expired invitation', () => {
  it('says only that it expired, and the lead\'s first name', async () => {
    const { service } = make(expired);
    expect(await service.preview('tok')).toEqual({ expired: true, leadFirstName: 'Wairimu' });
  });

  it('accepting it says the new sentence, which no longer promises an option that did not exist', () => {
    expect(() => assertInviteLinkStillOpens(expired)).toThrow(INVITATION_HAS_EXPIRED);
    expect(INVITATION_HAS_EXPIRED).toBe('This invitation link has expired. Invitation links last 14 days. Open the link again and ask for a fresh one, or ask the person who invited you.');
    expect(INVITATION_HAS_EXPIRED).not.toMatch(/send me a new link/);
  });
});

describe('"Send me a fresh link"', () => {
  it('to the address it went to: renews the same link for 14 days and sends it', async () => {
    const { service, sent, updates } = make(expired);
    const res = await service.sendAFreshLink('tok', ' Peter@Ouma-Agencies.test ');
    expect(res).toEqual({ says: FRESH_LINK_REPLY });
    expect(sent).toHaveLength(1);
    expect(sent[0][1]).toBe('peter@ouma-agencies.test');
    expect(sent[0][3]).toBe('tok');
    const until = updates[0].data.inviteTokenExpiresAt.getTime();
    expect(until).toBeGreaterThan(Date.now() + 13.9 * DAY);
    expect(until).toBeLessThan(Date.now() + 14.1 * DAY);
  });

  it('PRIVACY: an address that was not invited gets the same reply, and nothing is sent or changed', async () => {
    const { service, sent, updates } = make(expired);
    expect(await service.sendAFreshLink('tok', 'someone@else.test')).toEqual({ says: FRESH_LINK_REPLY });
    expect(sent).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it('PRIVACY: a token that is not an invitation gets the same reply, and nothing is sent', async () => {
    const { service, sent } = make(expired);
    expect(await service.sendAFreshLink('not-a-token', 'peter@ouma-agencies.test')).toEqual({ says: FRESH_LINK_REPLY });
    expect(sent).toHaveLength(0);
  });

  it('an invitation already accepted is not sent again', async () => {
    const { service, sent } = make({ ...expired, userId: 'u9' });
    expect(await service.sendAFreshLink('tok', 'peter@ouma-agencies.test')).toEqual({ says: FRESH_LINK_REPLY });
    expect(sent).toHaveLength(0);
  });

  it('the reply is one plain sentence', () => {
    expect(FRESH_LINK_REPLY).toBe('If that is the address the invitation went to, a fresh link is on its way. Open it from your email.');
  });
});

/* Changed 3 November 2026 (Hafsah: "'From 4pm' and the topic in the invitation come from what setup already holds: the check-in's opening
   time and its name or purpose. If either isn't set, leave it out; don't guess."). A daily check-in opens at 8 in the morning, so it
   says so; every other rhythm opens at the start of its day, so no hour is said. With no name given here, no topic is said. */
describe('how often it asks, in words', () => {
  it.each([
    [{ cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5] }, 'About ten minutes each weekday, from 8am.'],
    [{ cadence: 'DAILY', workingDays: [] }, 'About ten minutes each day, from 8am.'],
    [{ cadence: 'DAILY', workingDays: [1, 3, 5] }, 'About ten minutes on Mondays, Wednesdays and Fridays, from 8am.'],
    [{ cadence: 'WEEKLY', cadenceAnchorDay: 1 }, 'About ten minutes every week, on Mondays.'],
    [{ cadence: 'WEEKLY' }, 'About ten minutes every week.'],
    [{ cadence: 'FORTNIGHTLY' }, 'About ten minutes every two weeks.'],
    [{ cadence: 'MONTHLY' }, 'About ten minutes once a month.'],
    [{ cadence: 'SEQUENTIAL', leadFirstName: 'Wairimu' }, 'About ten minutes each time Wairimu checks in.'],
    [{ cadence: 'ONE_TIME' }, 'One check-in, of about ten minutes.'],
    [{ cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5], label: 'Deal progress' }, 'About ten minutes each weekday, from 8am, for Deal progress.'],
    [{ cadence: 'WEEKLY', cadenceAnchorDay: 1, label: 'Deal progress' }, 'About ten minutes every week, on Mondays, for Deal progress.'],
    [{ cadence: 'ONE_TIME', label: 'Deal progress' }, 'One check-in, of about ten minutes, for Deal progress.'],
  ])('%j reads "%s"', (g, sentence) => {
    expect(whenItAsks(g as any)).toBe(sentence);
  });
});
