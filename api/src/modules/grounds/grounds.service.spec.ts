import { GroundsService, SAFE_PARTICIPANT_SELECT } from './grounds.service';

/**
 * Trust invariants (GW-01). These guard the product's load-bearing rule -
 * "record ownership is the mechanism" - against regression. If any of these
 * fail, a participant's private data is leaking through the ground view.
 */
describe('GroundsService - participant serialization (GW-01)', () => {
  const SENSITIVE = ['inviteToken', 'inviteTokenExpiresAt', 'soloArtifact', 'specificityHistory', 'lastNudgedAt'];

  it('SAFE_PARTICIPANT_SELECT never exposes sensitive fields', () => {
    for (const field of SENSITIVE) {
      expect((SAFE_PARTICIPANT_SELECT as Record<string, unknown>)[field]).toBeUndefined();
    }
    // soloArtifactAt (timestamp) is allowed; soloArtifact (content) is not.
    expect((SAFE_PARTICIPANT_SELECT as Record<string, unknown>).soloArtifactAt).toBe(true);
    expect((SAFE_PARTICIPANT_SELECT as Record<string, unknown>).soloArtifact).toBeUndefined();
  });

  it('get() loads participants through the safe select only', async () => {
    let capturedInclude: any;
    const prisma: any = {
    /**
     * `GroundBaseline` is read by `get()` and by the report now - the team's starting point, which had
     * no reader until it was built. A mock without it throws on `findFirst` of undefined, which is what
     * these four suites did the moment the read landed. Null here means "not stated", the state every
     * one of these fixtures is actually in.
     */
    groundBaseline: { findFirst: jest.fn(async () => null) },
    /**
     * A non-lead's read now queries the notes too, filtered in the database to those addressed to
     * everyone - so this delegate is reached where it previously was not. Empty: these suites are
     * about participant serialisation and the org boundary, not about context notes.
     */
    leadContextNote: { findMany: jest.fn(async () => []) },
    /** Read by `get()` since per-person objectives were built. Empty is "nobody has stated one". */
    personObjective: { findMany: jest.fn(async () => []) },
      ground: {
        findFirst: jest.fn(async (args: any) => {
          capturedInclude = args.include;
          return { id: args.where.id, organizationId: args.where.organizationId, participants: [], checkIns: [] };
        }),
      },
      organization: { findUnique: jest.fn(async () => null) },
      checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: null } })) },
      user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
      groundParticipant: { findMany: jest.fn(async () => []) },
    };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
    await service.get('g1', 'org1');

    expect(prisma.ground.findFirst).toHaveBeenCalled();
    // The participants relation must be a field-selected projection, not `true`.
    expect(capturedInclude.participants).toEqual({ select: SAFE_PARTICIPANT_SELECT });
    for (const field of SENSITIVE) {
      expect(capturedInclude.participants.select[field]).toBeUndefined();
    }
  });

  it('get() is scoped to the requesting organization', async () => {
    const prisma: any = {
    /**
     * `GroundBaseline` is read by `get()` and by the report now - the team's starting point, which had
     * no reader until it was built. A mock without it throws on `findFirst` of undefined, which is what
     * these four suites did the moment the read landed. Null here means "not stated", the state every
     * one of these fixtures is actually in.
     */
    groundBaseline: { findFirst: jest.fn(async () => null) },
    /**
     * A non-lead's read now queries the notes too, filtered in the database to those addressed to
     * everyone - so this delegate is reached where it previously was not. Empty: these suites are
     * about participant serialisation and the org boundary, not about context notes.
     */
    leadContextNote: { findMany: jest.fn(async () => []) },
    /** Read by `get()` since per-person objectives were built. Empty is "nobody has stated one". */
    personObjective: { findMany: jest.fn(async () => []) },
      ground: { findFirst: jest.fn(async (args: any) => ({ id: 'g1', organizationId: args.where.organizationId, participants: [], checkIns: [] })) },
      organization: { findUnique: jest.fn(async () => null) },
      checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: null } })) },
      user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
      groundParticipant: { findMany: jest.fn(async () => []) },
    };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
    await service.get('g1', 'org-A');
    expect(prisma.ground.findFirst.mock.calls[0][0].where.organizationId).toBe('org-A');
  });
});

/**
 * GW-24: participant invite resend - keeps the existing token alive (minting
 * one only if the row somehow has none) and re-sends the email. Throws when
 * the participant has already accepted.
 */
describe('GroundsService.resendParticipantInvite - GW-24', () => {
  function makePrisma(ground: any, participant: any, initiator: any) {
    const updated: any[] = [];
    return {
      updated,
      prisma: {
        ground: { findFirst: jest.fn(async () => ground) },
        groundParticipant: {
          findFirst: jest.fn(async () => participant),
          update: jest.fn(async (args: any) => { updated.push(args.data); return {}; }),
        },
        user: { findUnique: jest.fn(async () => initiator) },
        checkIn: { findFirst: jest.fn(async () => null) },
      } as any,
    };
  }

  it('generates a new token and sends the invite this situation sends', async () => {
    const ground = { id: 'g1', organizationId: 'org1', label: 'Test Ground', initiatorId: 'u1' };
    const participant = { id: 'p1', groundId: 'g1', email: 'other@test.com', userId: null };
    const initiator = { id: 'u1', firstName: 'Alice' };
    const { prisma, updated } = makePrisma(ground, participant, initiator);
    const emailSent: any[] = [];
    const email: any = { sendTheInviteThisGroundSends: jest.fn(async (...args: any[]) => { emailSent.push(args); }) };

    const service = new GroundsService(prisma, email, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
    const result = await service.resendParticipantInvite('g1', 'p1', 'org1');

    expect(result.message).toBe('Invite resent');
    expect(updated[0].inviteToken).toBeTruthy();
    expect(updated[0].inviteTokenExpiresAt).toBeInstanceOf(Date);
    expect(emailSent).toHaveLength(1);
  });

  it('keeps the existing token instead of rotating it, so earlier emails stay live', async () => {
    // A resend used to overwrite the token, silently killing every invite
    // email sent before it - whichever copy the person actually opens, if it
    // isn't the newest, they land on "this link has already been used"
    // despite never having clicked anything.
    const ground = { id: 'g1', organizationId: 'org1', label: 'Test Ground', initiatorId: 'u1' };
    const participant = { id: 'p1', groundId: 'g1', email: 'other@test.com', userId: null, inviteToken: 'the-original-token' };
    const initiator = { id: 'u1', firstName: 'Alice' };
    const { prisma, updated } = makePrisma(ground, participant, initiator);
    const email: any = { sendTheInviteThisGroundSends: jest.fn(async () => undefined) };

    const service = new GroundsService(prisma, email, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      { respond: async () => '' } as any,
    );
    await service.resendParticipantInvite('g1', 'p1', 'org1');

    expect(updated[0].inviteToken).toBe('the-original-token');
    expect(email.sendTheInviteThisGroundSends.mock.calls[0][3]).toBe('the-original-token');
  });

  it('throws BadRequest when the participant has already accepted', async () => {
    const ground = { id: 'g1', organizationId: 'org1', label: 'Test', initiatorId: 'u1' };
    const participant = { id: 'p1', groundId: 'g1', email: 'x@test.com', userId: 'already-set' };
    const { prisma } = makePrisma(ground, participant, null);
    const { BadRequestException } = await import('@nestjs/common');
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );

    await expect(service.resendParticipantInvite('g1', 'p1', 'org1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

/**
 * GW-ORG-BOUNDARY: a user cannot retrieve a ground that belongs to another
 * organization unless they are also a linked participant on it. This is a
 * permanent tripwire - if the org-scoped lookup or the participant fallback
 * ever gets loosened, this test goes red before merge.
 */
describe('GroundsService.get - org boundary (GW-ORG-BOUNDARY)', () => {
  const GROUND = { id: 'g1', organizationId: 'org-A', scenario: 'NEW_PROJECT', participants: [], checkIns: [] };

  function makePrisma({ findFirstResult, participantLink, findUniqueResult, user }: any) {
    return {
      ground: {
        findFirst: jest.fn(async () => findFirstResult),
        findUnique: jest.fn(async () => findUniqueResult),
      },
      /* `get()` now asks who is reading (assertMaySeeGround) before it loads anything. */
      user: { findUnique: jest.fn(async () => user ?? { role: 'MEMBER', organizationId: 'org1' }) },
      groundParticipant: {
        findFirst: jest.fn(async () => participantLink),
        findMany: jest.fn(async () => []),
      },
      organization: { findUnique: jest.fn(async () => null) },
      checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: null } })) },
      /** Read by `get()` since the baseline was built. Null is "not stated", which these fixtures are. */
      groundBaseline: { findFirst: jest.fn(async () => null) },
    /**
     * A non-lead's read now queries the notes too, filtered in the database to those addressed to
     * everyone - so this delegate is reached where it previously was not. Empty: these suites are
     * about participant serialisation and the org boundary, not about context notes.
     */
    leadContextNote: { findMany: jest.fn(async () => []) },
      /** Read by `get()` since per-person objectives were built. Empty is "nobody has stated one". */
      personObjective: { findMany: jest.fn(async () => []) },
      groundDocument: { count: jest.fn(async () => 0) },
    } as any;
  }

  it('throws NotFoundException for a requester in a different org with no participant link', async () => {
    const { NotFoundException } = await import('@nestjs/common');
    const prisma = makePrisma({ findFirstResult: null, participantLink: null, findUniqueResult: null });
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );

    await expect(service.get('g1', 'org-B', 'user-outsider')).rejects.toBeInstanceOf(NotFoundException);
    // Refused by assertMaySeeGround before the ground is loaded at all: nothing is read for a stranger.
    expect(prisma.ground.findFirst).not.toHaveBeenCalled();
  });

  it('throws NotFoundException even with no requestingUserId at all (anonymous/service call)', async () => {
    const { NotFoundException } = await import('@nestjs/common');
    const prisma = makePrisma({ findFirstResult: null, participantLink: null, findUniqueResult: null });
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );

    await expect(service.get('g1', 'org-B')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('succeeds for a genuine cross-org participant (linked via GroundParticipant)', async () => {
    const prisma = makePrisma({
      findFirstResult: null,
      participantLink: { id: 'p1', groundId: 'g1', userId: 'user-linked' },
      /* assertMaySeeGround reads the participants off the ground itself. */
      findUniqueResult: { ...GROUND, participants: [{ userId: 'user-linked' }] },
    });
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );

    const result = await service.get('g1', 'org-B', 'user-linked');
    expect(result.id).toBe('g1');
    expect(prisma.groundParticipant.findFirst).toHaveBeenCalledWith({ where: { groundId: 'g1', userId: 'user-linked' } });
  });

  it('succeeds for a same-org ADMIN via the primary org-scoped lookup', async () => {
    const prisma = makePrisma({
      findFirstResult: { ...GROUND }, participantLink: null, findUniqueResult: { ...GROUND },
      user: { role: 'ADMIN', organizationId: 'org-A' },
    });
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );

    const result = await service.get('g1', 'org-A', 'user-admin');
    expect(result.id).toBe('g1');
  });

  it('a same-org MEMBER who is neither lead nor party is told it is not there, as list() already tells them', async () => {
    /* This used to succeed: any member of the organisation could read any ground in it, report and
       all. The list gives a non-admin their own grounds only; the read now gives the same answer. */
    const { NotFoundException } = await import('@nestjs/common');
    const prisma = makePrisma({
      findFirstResult: { ...GROUND }, participantLink: null, findUniqueResult: { ...GROUND },
      user: { role: 'MEMBER', organizationId: 'org-A' },
    });
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      { respond: async () => '' } as any,
    );
    await expect(service.get('g1', 'org-A', 'user-member')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.ground.findFirst).not.toHaveBeenCalled();
  });
});
