import { ForbiddenException } from '@nestjs/common';
import { GroundsService } from './grounds.service';

/**
 * "USE SIMPLER WORDS" IS A CHECK-IN SETTING, OFF UNTIL THE LEAD (OR AN ADMIN WHO RUNS IT) SWITCHES IT ON.
 * The guard is the one every other setting on a check-in uses.
 */
function service(opts: { initiatorId?: string; viewer?: { role: string; organizationId: string }; stored?: boolean }) {
  const update = jest.fn(async (a: any) => ({ id: 'g1', simplerWords: a.data.simplerWords }));
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async (a: any) =>
        a.select?.simplerWords
          ? { id: 'g1', simplerWords: opts.stored ?? false }
          : { initiatorId: opts.initiatorId ?? 'lead-1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', createdByUserId: 'lead-1', participants: [], status: 'OPEN', approvedById: null }),
      update,
    },
    user: { findUnique: jest.fn(async () => opts.viewer ?? { role: 'MEMBER', organizationId: 'org1' }) },
  };
  return { grounds: new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any), update };
}

describe('Use simpler words, as the lead', () => {
  it('reads as off for a check-in that has never been switched', async () => {
    const { grounds } = service({});
    expect(await grounds.getSimplerWords('g1', 'lead-1')).toEqual({ id: 'g1', simplerWords: false });
  });
  it('switches on and off', async () => {
    const { grounds, update } = service({});
    expect(await grounds.setSimplerWords('g1', 'lead-1', true)).toEqual({ id: 'g1', simplerWords: true });
    expect(await grounds.setSimplerWords('g1', 'lead-1', false)).toEqual({ id: 'g1', simplerWords: false });
    expect(update).toHaveBeenCalledTimes(2);
  });
});

describe('Use simpler words, as an admin and as a participant', () => {
  it('lets an admin of the organisation change it', async () => {
    const { grounds } = service({ viewer: { role: 'ADMIN', organizationId: 'org1' } });
    expect((await grounds.setSimplerWords('g1', 'admin-1', true)).simplerWords).toBe(true);
  });
  it('refuses anything that is not true or false, with a sentence, and changes nothing', async () => {
    const { grounds, update } = service({});
    for (const bad of ['yes', 1, null, undefined]) await expect(grounds.setSimplerWords('g1', 'lead-1', bad)).rejects.toThrow('Say whether to use simpler words, with true or false.');
    expect(update).not.toHaveBeenCalled();
  });
  it('says "read" to somebody who may not read it, and "change" to somebody who may not change it', async () => {
    const { grounds } = service({});
    await expect(grounds.getSimplerWords('g1', 'someone-else')).rejects.toThrow('can read this.');
    await expect(grounds.setSimplerWords('g1', 'someone-else', true)).rejects.toThrow('can change this.');
  });
  it('does not let a participant read it or change it, and changes nothing', async () => {
    const { grounds, update } = service({});
    await expect(grounds.setSimplerWords('g1', 'someone-else', true)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(grounds.getSimplerWords('g1', 'someone-else')).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });
});
