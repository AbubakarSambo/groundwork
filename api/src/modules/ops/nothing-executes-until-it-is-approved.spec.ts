/**
 * An approval that does not stop anything is a form.
 *
 * The acceptance test is blunt: James submits a material change, it appears in
 * the CEO's queue, and NOTHING EXECUTES until she decides. The failure mode is
 * the ordinary one — the flag is stored, the queue renders, the work starts
 * anyway, and nobody finds out until the thing is built.
 *
 * The four states below are all different, and only one of them opens the gate.
 * "Not rejected" is the wrong test: an item nobody has looked at yet passes it.
 */
import { mayMoveOutOfProposed } from './nothing-executes-until-it-is-approved';

const item = { approvalRequired: true, title: 'Separate the infrastructure' };
const freely = { approvalRequired: false, title: 'A small fix' };

describe('a roadmap item that needs a decision', () => {
  it('cannot start when nobody has been asked', () => {
    const gate = mayMoveOutOfProposed(item, [], 'IN_PROGRESS');
    expect(gate.allowed).toBe(false);
    expect(gate.because).toMatch(/none has been asked for/);
  });

  it('cannot start while a decision is pending', () => {
    const gate = mayMoveOutOfProposed(item, [{ status: 'PENDING' }], 'READY');
    expect(gate.allowed).toBe(false);
    expect(gate.because).toMatch(/waiting on a decision/);
  });

  it('cannot start when changes were asked for', () => {
    const gate = mayMoveOutOfProposed(item, [{ status: 'CHANGES_REQUESTED' }], 'IN_PROGRESS');
    expect(gate.allowed).toBe(false);
    expect(gate.because).toMatch(/changes asked for/);
  });

  it('cannot start when it was turned down', () => {
    const gate = mayMoveOutOfProposed(item, [{ status: 'REJECTED' }], 'IN_PROGRESS');
    expect(gate.allowed).toBe(false);
    expect(gate.because).toMatch(/turned down/);
  });

  it('starts once it is approved', () => {
    const gate = mayMoveOutOfProposed(item, [{ status: 'APPROVED' }], 'IN_PROGRESS');
    expect(gate.allowed).toBe(true);
  });

  it('and an approval outweighs an earlier round of changes', () => {
    /** Asking for changes and then approving is the normal path, not a conflict. */
    const gate = mayMoveOutOfProposed(item, [{ status: 'CHANGES_REQUESTED' }, { status: 'APPROVED' }], 'READY');
    expect(gate.allowed).toBe(true);
  });

  it('but may still sit in PROPOSED, which is where waiting happens', () => {
    expect(mayMoveOutOfProposed(item, [], 'PROPOSED').allowed).toBe(true);
  });

  it('and every status that is not PROPOSED is gated, not just IN_PROGRESS', () => {
    for (const status of ['READY', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const) {
      expect(mayMoveOutOfProposed(item, [], status).allowed).toBe(false);
    }
  });
});

describe('an item that needs no decision', () => {
  it('moves freely', () => {
    expect(mayMoveOutOfProposed(freely, [], 'IN_PROGRESS').allowed).toBe(true);
  });
});

describe('an approval is a request of one person', () => {
  /**
   * Holding the capability is not enough. An approval addressed to somebody is
   * a question put to THEM, and letting anybody with the right grant answer it
   * turns the queue into a list anyone can clear — which is the same as having
   * no queue, except that it looks like there is one.
   */
  const { ForbiddenException } = jest.requireActual('@nestjs/common');
  const { OpsBuildService } = jest.requireActual('./ops-build.service');

  const approval = { id: 'a1', approverId: 'hafsah-id', status: 'PENDING' };
  const serviceFor = (row = approval) => {
    const prisma = {
      opsApproval: {
        findUnique: async () => row,
        update: async ({ data }: never) => ({ ...row, ...(data as object) }),
      },
    };
    return new OpsBuildService(prisma);
  };
  const asPerson = (personId: string) => ({
    personId,
    key: personId,
    displayName: personId,
    functionalRole: 'CEO',
    capabilities: ['roadmap:approve', 'ceo:board'],
  });

  it('is refused to somebody else, however senior', async () => {
    await expect(serviceFor().decide('a1', 'APPROVED', undefined, asPerson('james-id'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('and the refusal says it was somebody else who was asked', async () => {
    await expect(serviceFor().decide('a1', 'APPROVED', undefined, asPerson('james-id'))).rejects.toThrow(
      /asked of somebody else/,
    );
  });

  it('is allowed to the person it was addressed to', async () => {
    await expect(
      serviceFor().decide('a1', 'APPROVED', 'Go.', asPerson('hafsah-id')),
    ).resolves.toMatchObject({ status: 'APPROVED' });
  });

  it('and cannot be decided a second time', async () => {
    const decided = { ...approval, status: 'APPROVED' };
    await expect(
      serviceFor(decided).decide('a1', 'REJECTED', undefined, asPerson('hafsah-id')),
    ).rejects.toThrow(/deciding twice/);
  });
});
