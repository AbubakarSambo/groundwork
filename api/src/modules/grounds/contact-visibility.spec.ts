import { GroundsService } from './grounds.service';
import { ForbiddenException } from '@nestjs/common';

/**
 * PRIVACY BOUNDARY TRIPWIRE - participant-to-participant contact visibility.
 *
 * Decision: names / roles / roster / presence stay visible always (presence is a
 * deliberate nudge); ONLY the email (harvestable contact detail) is hidden, on a
 * per-ground initiator toggle (`restrictExternalVisibility`, default true).
 *
 * Asserted on the REAL get() output (not the code path): when the toggle is on, a
 * participant sees no OTHER participant's email but always their own; when off, emails
 * are visible; names/roster are visible either way. Proven to bite: remove the
 * `!isSelf ? null` gate in get() and the toggle-on / self cases go red.
 */

const P = (over: any) => ({
  id: over.id, userId: over.userId, email: over.email, partyType: 'PARTICIPANT',
  roleAsDescribed: over.role ?? 'Contributor', invitedAt: new Date(), notifiedAt: new Date(),
  soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date(),
  // name is surfaced so the roster shows WHO is here without the email
  user: over.userId ? { firstName: over.firstName, lastName: over.lastName } : null,
});

function serviceFor(restrict: boolean) {
  const participants = [
    P({ id: 'pA', userId: 'userA', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', role: 'Engineer' }),
    P({ id: 'pB', userId: 'userB', email: 'blair@example.com', firstName: 'Blair', lastName: 'Kane', role: 'Designer' }),
  ];
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'userInit', createdAt: new Date(),
    timelineDays: null, restrictExternalVisibility: restrict,
    participants, checkIns: [], resolution: null, patternDetections: [],
    // released report short-circuits getSessionProgress (keeps the test to get()'s own logic)
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: null, createdAt: new Date() },
  };
  const prisma: any = {
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
}

const emailOf = (res: any, id: string) => res.participants.find((p: any) => p.id === id).email;

describe('GW-PRIVACY-CONTACT: participant-to-participant email visibility on get()', () => {
  it('toggle ON (restrict=true): A sees B name/role/presence but NOT B email; A still sees own email', async () => {
    const res: any = await serviceFor(true).get('g1', 'org1', 'userA');
    // roster / presence intact
    expect(res.participants.map((p: any) => p.id).sort()).toEqual(['pA', 'pB']);
    expect(emailOf(res, 'pB')).toBeNull();                 // other participant's email hidden
    const b = res.participants.find((p: any) => p.id === 'pB');
    expect(b.user).toEqual({ firstName: 'Blair', lastName: 'Kane' }); // NAME still visible
    expect(b.user.email).toBeUndefined();                  // and no email leaks via the user object
    expect(b.roleAsDescribed).toBe('Designer');            // role still visible
    expect(b.partyType).toBe('PARTICIPANT');               // presence still visible
    // self always sees own
    expect(emailOf(res, 'pA')).toBe('ada@example.com');
  });

  it('toggle OFF (restrict=false): A sees B email', async () => {
    const res: any = await serviceFor(false).get('g1', 'org1', 'userA');
    expect(emailOf(res, 'pB')).toBe('blair@example.com');
    expect(emailOf(res, 'pA')).toBe('ada@example.com');
  });

  it('self always sees own email, even with the toggle ON (viewing as B this time)', async () => {
    const res: any = await serviceFor(true).get('g1', 'org1', 'userB');
    expect(emailOf(res, 'pB')).toBe('blair@example.com');  // B sees own
    expect(emailOf(res, 'pA')).toBeNull();                 // but not A's
  });

  it('the INITIATOR is exempt: with the toggle ON the initiator still sees every peer email', async () => {
    // ground.initiatorId is 'userInit' - the admin/inviter. Their admin roster must keep
    // working. If the exemption is removed, both of these go null and this bites.
    const res: any = await serviceFor(true).get('g1', 'org1', 'userInit');
    expect(emailOf(res, 'pA')).toBe('ada@example.com');
    expect(emailOf(res, 'pB')).toBe('blair@example.com');
  });
});

describe('GW-PRIVACY-CONTACT: setExternalVisibility is initiator-only', () => {
  function svcForWrite() {
    const prisma: any = {
      ground: {
        findUnique: async () => ({ initiatorId: 'userInit' }),
        update: async (a: any) => ({ id: a.where.id, restrictExternalVisibility: a.data.restrictExternalVisibility }),
      },
    };
    return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
  }

  it('a non-initiator cannot change the setting', async () => {
    await expect(svcForWrite().setExternalVisibility('g1', 'userA', false)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('the initiator can change the setting', async () => {
    const out: any = await svcForWrite().setExternalVisibility('g1', 'userInit', false);
    expect(out.restrictExternalVisibility).toBe(false);
  });
});
