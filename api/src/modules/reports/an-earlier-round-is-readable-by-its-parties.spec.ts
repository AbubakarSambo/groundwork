import { ReportsService } from './reports.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

/**
 * READING WHAT A ROUND SAID AT THE TIME.
 *
 * Kept so a picture somebody read at day 14 is still there at day 90, and so a ninety-day account
 * can be read back from the record rather than re-derived from transcripts at the end.
 *
 * The permission is not a new one. This is the same content at an earlier moment, so it is readable
 * by exactly the people the current report is readable by, and by nobody else - and only once the
 * report has been released, because release is the mutual reveal that stops one person reading the
 * picture before the other has finished.
 */
const svc = (over: { releasedAt?: Date | null; rounds?: any[] } = {}) => {
  const s = Object.create(ReportsService.prototype) as any;
  s.prisma = {
    /* The org-admin read asks the role now, not only the organisation. */
    user: { findUnique: async () => ({ role: 'ADMIN', organizationId: 'org1' }) },
    ground: {
      findUnique: async () => ({
        organizationId: 'org1',
        scenario: 'NEW_PROJECT',
        initiatorId: 'ceo',
        report: { releasedAt: over.releasedAt === undefined ? new Date() : over.releasedAt },
        participants: [{ userId: 'ed' }],
      }),
    },
    reportRound: {
      findMany: async () => over.rounds ?? [{ round: 2, sharedPicture: 'A picture.', divergences: [], takenAt: new Date() }],
    },
  };
  return s;
};

describe('who may read an earlier round', () => {
  it('the lead may', async () => {
    expect((await svc().rounds('g1', 'ceo', 'org1')).rounds).toHaveLength(1);
  });

  it('somebody who was in it may', async () => {
    expect((await svc().rounds('g1', 'ed', 'org1')).rounds).toHaveLength(1);
  });

  it('an admin of the organisation may', async () => {
    expect((await svc().rounds('g1', 'someone-else', 'org1')).rounds).toHaveLength(1);
  });

  it('and a stranger may not - and is not told the check-in exists', async () => {
    /*
     * NotFound, not Forbidden. A 403 answers "this check-in exists, it is just not yours", so a
     * stranger with a list of guessed ids could tell real check-ins from imaginary ones - GW-PRI-04,
     * which `get()` has always honoured and this endpoint did not. Changed with the rule, not
     * around it: the refusal is the same, what it discloses is not.
     */
    await expect(svc().rounds('g1', 'nobody', 'another-org')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('before anything has been revealed', () => {
  it('there is nothing to read, even for the lead', async () => {
    /* Release is the mutual reveal. Handing an unreleased round back here would be a way round it. */
    const out = await svc({ releasedAt: null }).rounds('g1', 'ceo', 'org1');
    expect(out.rounds).toEqual([]);
  });
});

describe('the same rounds, read as a sequence', () => {
  it('comes back beside them, so the report can show how things moved', async () => {
    const out = await svc().rounds('g1', 'ceo', 'org1');
    expect((out as any).moved).toHaveLength(1);
    expect((out as any).moved[0].says).toBe('A picture.');
  });
});

describe('what comes back', () => {
  it('is a named list, so a column added later cannot escape into somebody\'s report', async () => {
    const out = await svc({
      rounds: [{ round: 2, sharedPicture: 'A picture.', agreements: [], divergences: [], centralQuestion: 'q', takenAt: new Date(), amendedAt: null, amendedNote: null }],
    }).rounds('g1', 'ceo', 'org1');
    expect(Object.keys(out.rounds[0]).sort()).toEqual([
      'agreements', 'amendedAt', 'amendedNote', 'centralQuestion',
      'divergences', 'round', 'sharedPicture', 'takenAt',
    ]);
  });

  it('carries the mark when a round was changed after it was taken', async () => {
    const out = await svc({
      rounds: [{ round: 2, sharedPicture: 'A picture.', divergences: [], takenAt: new Date(), amendedAt: new Date(), amendedNote: 'Updated after somebody corrected their own check-in.' }],
    }).rounds('g1', 'ceo', 'org1');
    expect(out.rounds[0].amendedNote).toContain('corrected their own check-in');
  });
});
