import { ForbiddenException } from '@nestjs/common';
import { GroundsService } from '../grounds/grounds.service';
import { ReportsService } from './reports.service';

/**
 * Lead-context separation tripwire (permanent).
 *
 * Lead-supplied context is a private INPUT channel: the initiator adds a note about a
 * participant (or the ground) to DIRECT and WEIGH synthesis. Three walls must hold, or
 * the feature becomes a way to launder the lead's opinion into a stated claim, or to
 * leak it to the person it is about:
 *
 *   1. WRITE SEPARATION - a note is stored in its own leadContextNote store and NEVER as
 *      a RecordEntry (which would splice it into the person's own record stream).
 *   2. CORPUS SEPARATION - at synthesis it enters its OWN labelled LEAD-SUPPLIED CONTEXT
 *      section, never a party's record-stream line, governed by synthesis rule 10
 *      (direction, never a claim).
 *   3. READ-BACK GATE - only the initiator sees the notes back; a participant viewing the
 *      ground gets none. The note never appears in a participant's view.
 *
 * If any of these goes red, the privacy/attribution wall is broken. Do not "fix" the test
 * to make it pass - fix the code, or you have re-opened the leak.
 */

// ---------------------------------------------------------------------------
// 1. WRITE SEPARATION
// ---------------------------------------------------------------------------
describe('lead-context write separation (GroundsService.addLeadContext)', () => {
  function makeGrounds() {
    const recordEntryCreate = jest.fn(async () => {
      throw new Error('recordEntry.create must NEVER be called for lead context');
    });
    const leadCreate = jest.fn(async (a: any) => ({ id: 'ln1', ...a.data }));
    const prisma: any = {
    /**
     * `GroundBaseline` is read by `get()` and by the report now - the team's starting point, which had
     * no reader until it was built. A mock without it throws on `findFirst` of undefined, which is what
     * these four suites did the moment the read landed. Null here means "not stated", the state every
     * one of these fixtures is actually in.
     */
    groundBaseline: { findFirst: jest.fn(async () => null) },
    /** Read by `get()` since per-person objectives were built. Empty is "nobody has stated one". */
    personObjective: { findMany: jest.fn(async () => []) },
      ground: { findUnique: jest.fn(async () => ({ initiatorId: 'init-1' })) },
      user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
      groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p2', groundId: 'g1' })) },
      leadContextNote: { create: leadCreate },
      workMention: { findMany: jest.fn(async () => []) },
      recordEntry: { create: recordEntryCreate },
    };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
    return { service, recordEntryCreate, leadCreate };
  }

  it('stores the note in leadContextNote and NEVER as a RecordEntry', async () => {
    const { service, recordEntryCreate, leadCreate } = makeGrounds();
    await service.addLeadContext('g1', 'init-1', { participantId: 'p2', text: 'A has been carrying on-call solo.' });
    expect(leadCreate).toHaveBeenCalledTimes(1);
    expect(recordEntryCreate).not.toHaveBeenCalled();
  });

  it('rejects a non-initiator - a participant cannot write context about anyone', async () => {
    const { service, recordEntryCreate, leadCreate } = makeGrounds();
    await expect(
      service.addLeadContext('g1', 'not-the-initiator', { participantId: 'p2', text: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(leadCreate).not.toHaveBeenCalled();
    expect(recordEntryCreate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. CORPUS SEPARATION
// ---------------------------------------------------------------------------
describe('lead-context corpus separation (ReportsService.synthesize)', () => {
  it('injects the note into a LEAD-SUPPLIED CONTEXT section, never a record-stream line, under rule 10', async () => {
    const NOTE = 'ZZNOTE_lead_says_A_carries_oncall_solo';
    const RECORD = 'ZZRECORD_party_A_own_spoken_words';
    let capturedSystem = '';
    let capturedCorpus = '';

    const prisma: any = {
    /**
     * `GroundBaseline` is read by `get()` and by the report now - the team's starting point, which had
     * no reader until it was built. A mock without it throws on `findFirst` of undefined, which is what
     * these four suites did the moment the read landed. Null here means "not stated", the state every
     * one of these fixtures is actually in.
     */
    groundBaseline: { findFirst: jest.fn(async () => null) },
    /** Read by `get()` since per-person objectives were built. Empty is "nobody has stated one". */
    personObjective: { findMany: jest.fn(async () => []) },
      ground: {
        findUnique: jest.fn(async () => ({ id: 'g1', initiatorId: 'init-1', participants: [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder' }] })),
        update: jest.fn(async () => ({})),
      },
      user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
      groundParticipant: {
        findMany: jest.fn(async (args: any) =>
          args?.select?.checkIns
            ? [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder', checkIns: [] }]
            : [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder' }],
        ),
        findFirst: jest.fn(async () => null),
      },
      workMention: { findMany: jest.fn(async () => []) },
      recordEntry: {
        findMany: jest.fn(async () => [{ participant: { id: 'p1' }, type: 'COMMITMENT', text: RECORD }]),
        count: jest.fn(async () => 1),
      },
      checkIn: {
        count: jest.fn(async () => 1),
        findMany: jest.fn(async () => [{ participantId: 'p1' }]),
        findFirst: jest.fn(async () => ({ specificityDimensions: null, sessionNumber: 1 })),
      },
      groundDocument: { count: jest.fn(async () => 0), groupBy: jest.fn(async () => []), findMany: jest.fn(async () => []) },
      patternDetection: { findMany: jest.fn(async () => []) },
      adminProfile: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
      // the note lives in its OWN store, queried separately from any record entry
      leadContextNote: { findMany: jest.fn(async () => [{ participantId: 'p1', text: NOTE }]) },
      report: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({ id: 'r1' })) },
    };
    const prompts: any = { getActive: jest.fn(async () => ({ id: 'pv1', content: 'synthesize this.' })) };
    /*
     * EVERY CORPUS, NOT THE LAST ONE.
     *
     * `synthesize` makes more than one model call now - the synthesis itself, and the one that
     * writes the picture in plain sentences. This kept only the most recent corpus, so it started
     * asserting against whichever call happened to run last.
     *
     * Keeping them all is the stronger test anyway, and it is why the second assertion below
     * exists: the lead's private note must be in the synthesis corpus, under its own heading, and
     * must not appear in ANY other corpus. A note that reached the wording call would be the same
     * leak one surface further on.
     */
    const corpora: string[] = [];
    const anthropic: any = {
      extract: jest.fn(async (system: string, history: any[]) => {
        const corpus = history?.[0]?.content ?? '';
        corpora.push(corpus);
        /* The synthesis is the call that is handed the lead's context. Its system prompt and its
           corpus are captured together, so neither can be read off a different call. */
        if (/LEAD-SUPPLIED CONTEXT/.test(corpus)) {
          capturedCorpus = corpus;
          capturedSystem = system;
        }
        return { sharedPicture: 's', agreements: [], divergences: [], centralQuestion: 'q' };
      }),
    };

    const service = new ReportsService(prisma, prompts, anthropic, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, { tell: async () => [] } as any);
    await service.synthesize('g1');

    const lines = capturedCorpus.split('\n');

    // the note is present, under its own labelled section
    expect(capturedCorpus).toContain(NOTE);

    /* AND IN NOTHING ELSE. The note is the lead's, and only the synthesis is entitled to it. */
    for (const other of corpora.filter((c) => c !== capturedCorpus)) {
      expect(other).not.toContain(NOTE);
    }
    expect(lines.findIndex((l) => l.startsWith('LEAD-SUPPLIED CONTEXT'))).toBeGreaterThanOrEqual(0);

    // record-stream lines look like: [label] (TYPE) text  -- the note must NEVER be one
    const recordStream = lines.filter((l) => /^\[[^\]]+\] \([A-Z_]+\) /.test(l));
    expect(recordStream.some((l) => l.includes(NOTE))).toBe(false);
    // sanity: the party's OWN record IS a record-stream line (proves the filter works)
    expect(recordStream.some((l) => l.includes(RECORD))).toBe(true);

    // synthesis rule 10 governs how the model may use it (never quote/attribute/assert)
    expect(capturedSystem).toMatch(/LEAD-SUPPLIED CONTEXT IS DIRECTION, NEVER A CLAIM/);
  });
});

// ---------------------------------------------------------------------------
// 3. READ-BACK GATE
// ---------------------------------------------------------------------------
describe('lead-context read-back gate (GroundsService.get)', () => {
  function makeGetService(rows: any[] = [{ id: 'ln1', participantId: 'p2', text: 'private lead note about A', audience: 'LEAD_ONLY', createdAt: new Date() }]) {
    const groundRow: any = {
      id: 'g1', organizationId: 'org-1', initiatorId: 'init-1',
      createdAt: new Date(), timelineDays: 84, brief: 'b', groundAuditLog: null,
      status: 'ACTIVE', scenario: 'OKR_ALIGNMENT',
      participants: [
        { id: 'p1', userId: 'init-1', partyType: 'INITIATOR', email: 'i@x', soloArtifactShared: false },
        { id: 'p2', userId: 'user-2', partyType: 'PARTICIPANT', email: 'a@x', soloArtifactShared: false },
      ],
      checkIns: [], report: null, resolution: null, patternDetections: [],
    };
    /**
     * ANSWERS THE QUESTION IT WAS ASKED. A mock returning the same row whatever the where clause says
     * cannot tell a working audience filter from a missing one - it fails the first and passes the
     * second, which is the wrong way round.
     */
    const leadFindMany = jest.fn(async (args: any) => {
      const wanted = args?.where?.audience;
      return rows.filter((r: any) => !wanted || r.audience === wanted);
    });
    const prisma: any = {
    /**
     * `GroundBaseline` is read by `get()` and by the report now - the team's starting point, which had
     * no reader until it was built. A mock without it throws on `findFirst` of undefined, which is what
     * these four suites did the moment the read landed. Null here means "not stated", the state every
     * one of these fixtures is actually in.
     */
    groundBaseline: { findFirst: jest.fn(async () => null) },
    /** Read by `get()` since per-person objectives were built. Empty is "nobody has stated one". */
    personObjective: { findMany: jest.fn(async () => []) },
      ground: { findFirst: jest.fn(async () => groundRow), findUnique: jest.fn(async () => groundRow) },
      user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
      groundParticipant: { findFirst: jest.fn(async () => ({ groundId: 'g1', userId: 'user-2' })), findMany: jest.fn(async () => []) },
      // get() now also computes sessionProgress via getSessionProgress(); it returns early
      // (no active participants) but still needs checkIn.aggregate not to throw.
      checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: null } })), findMany: jest.fn(async () => []) },
      organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: null, freeExtensionUsed: false })) },
      leadContextNote: { findMany: leadFindMany },
    };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
    return { service, leadFindMany };
  }

  it('returns the notes to the initiator who wrote them', async () => {
    const { service, leadFindMany } = makeGetService();
    const res: any = await service.get('g1', 'org-1', 'init-1');
    expect(leadFindMany).toHaveBeenCalled();
    expect(res.leadContextNotes).toHaveLength(1);
  });

  /**
   * THE GUARANTEE IS UNCHANGED; THE MECHANISM IS NOT.
   *
   * This used to assert `leadFindMany` was never called for a participant, because the only way a
   * note reached anybody was the query running at all. Notes now carry an audience, so a participant
   * DOES get a query - filtered, in the database, to the notes addressed to everyone.
   *
   * That is a stronger boundary than not querying, not a weaker one: the filter lives in the where
   * clause rather than in a caller remembering to skip it. What must never change is the line below
   * it - a private note's text does not appear in a participant's view.
   *
   * The mock has to answer the question it was ASKED for that to mean anything. One that returns the
   * same row whatever the where clause says would fail this for a reason that has nothing to do with
   * the product, and pass it for one too.
   */
  it('never lets a private note reach a participant, whatever query runs', async () => {
    const { service, leadFindMany } = makeGetService();
    const res: any = await service.get('g1', 'org-1', 'user-2');
    expect(leadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ audience: 'EVERYONE' }) }),
    );
    expect(res.leadContextNotes).toEqual([]);
    expect(JSON.stringify(res)).not.toContain('private lead note about A');
  });

  /**
   * The other half of the same rule, and the reason the audience column exists: a note the lead
   * addressed to everyone must actually arrive.
   */
  it('does hand a participant a note addressed to everyone', async () => {
    const { service } = makeGetService([
      { id: 'n2', participantId: null, text: 'we are deciding whether to renew', audience: 'EVERYONE', createdAt: new Date() },
    ]);
    const res: any = await service.get('g1', 'org-1', 'user-2');
    expect(JSON.stringify(res)).toContain('we are deciding whether to renew');
  });
});
