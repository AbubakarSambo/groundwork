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
      ground: { findUnique: jest.fn(async () => ({ initiatorId: 'init-1' })) },
      groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p2', groundId: 'g1' })) },
      leadContextNote: { create: leadCreate },
      recordEntry: { create: recordEntryCreate },
    };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);
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
      ground: {
        findUnique: jest.fn(async () => ({ id: 'g1', initiatorId: 'init-1', participants: [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder' }] })),
        update: jest.fn(async () => ({})),
      },
      groundParticipant: {
        findMany: jest.fn(async (args: any) =>
          args?.select?.checkIns
            ? [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder', checkIns: [] }]
            : [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder' }],
        ),
        findFirst: jest.fn(async () => null),
      },
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
      report: { upsert: jest.fn(async () => ({ id: 'r1' })) },
    };
    const prompts: any = { getActive: jest.fn(async () => ({ id: 'pv1', content: 'synthesize this.' })) };
    const anthropic: any = {
      extract: jest.fn(async (system: string, history: any[]) => {
        capturedSystem = system;
        capturedCorpus = history?.[0]?.content ?? '';
        return { sharedPicture: 's', agreements: [], divergences: [], centralQuestion: 'q' };
      }),
    };

    const service = new ReportsService(prisma, prompts, anthropic, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);
    await service.synthesize('g1');

    const lines = capturedCorpus.split('\n');

    // the note is present, under its own labelled section
    expect(capturedCorpus).toContain(NOTE);
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
  function makeGetService() {
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
    const leadFindMany = jest.fn(async () => [{ id: 'ln1', participantId: 'p2', text: 'private lead note about A', createdAt: new Date() }]);
    const prisma: any = {
      ground: { findFirst: jest.fn(async () => groundRow), findUnique: jest.fn(async () => groundRow) },
      groundParticipant: { findFirst: jest.fn(async () => ({ groundId: 'g1', userId: 'user-2' })), findMany: jest.fn(async () => []) },
      // get() now also computes sessionProgress via getSessionProgress(); it returns early
      // (no active participants) but still needs checkIn.aggregate not to throw.
      checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: null } })), findMany: jest.fn(async () => []) },
      organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: null, freeExtensionUsed: false })) },
      leadContextNote: { findMany: leadFindMany },
    };
    const service = new GroundsService(prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any);
    return { service, leadFindMany };
  }

  it('returns the notes to the initiator who wrote them', async () => {
    const { service, leadFindMany } = makeGetService();
    const res: any = await service.get('g1', 'org-1', 'init-1');
    expect(leadFindMany).toHaveBeenCalled();
    expect(res.leadContextNotes).toHaveLength(1);
  });

  it('returns NO notes to a participant, and the note text never appears in their view', async () => {
    const { service, leadFindMany } = makeGetService();
    const res: any = await service.get('g1', 'org-1', 'user-2');
    expect(res.leadContextNotes).toEqual([]);
    expect(leadFindMany).not.toHaveBeenCalled();
    expect(JSON.stringify(res)).not.toContain('private lead note about A');
  });
});
