import { BoardService } from './board.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GroundMode, GroundScenario } from '@prisma/client';

/**
 * GW-BOARD-WRITE tripwires.
 *
 * The board is generated and read-only, with exactly two exceptions, and they
 * are different kinds of write:
 *  - OBJECTIVES are the lead's frame. Initiator only. A target, never an
 *    assessment of a person.
 *  - The POLL's availability is logistics and never touches an account, so any
 *    party can mark themselves - but only the initiator sets the question.
 *
 * What must bite:
 *  1. A non-initiator party cannot set targets or the poll question.
 *  2. NOTHING can be written on a ground that has no board (private mode, or a
 *     sensing-family scenario), even by the initiator. A write path must not be
 *     a way around the mode boundary.
 *  3. Changing poll options clears availability, because an answer to a question
 *     that changed is not an answer.
 */

function makeService(over: {
  mode?: GroundMode;
  scenario?: GroundScenario;
  initiatorId?: string;
  existingPoll?: any;
} = {}) {
  const objectiveCreate = jest.fn(async (a: any) => ({ id: 'o1', ...a.data }));
  const objectiveUpdate = jest.fn(async (a: any) => ({ id: a.where.id, ...a.data }));
  const optionDeleteMany = jest.fn(async () => ({ count: 2 }));
  const optionCreateMany = jest.fn(async () => ({ count: 2 }));
  const pollCreate = jest.fn(async (a: any) => ({ id: 'p1', ...a.data }));
  const pollUpdate = jest.fn(async (a: any) => ({ id: a.where.id, ...a.data }));

  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1',
        scenario: over.scenario ?? GroundScenario.NEW_PROJECT,
        mode: over.mode ?? GroundMode.SHARED,
        initiatorId: over.initiatorId ?? 'lead',
      })),
    },
    groundObjective: {
      count: jest.fn(async () => 0),
      create: objectiveCreate,
      update: objectiveUpdate,
      delete: jest.fn(async () => ({})),
      findUnique: jest.fn(async () => ({ id: 'o1', groundId: 'g1', count: 3 })),
    },
    checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: 2 } })) },
    groundPoll: {
      findUnique: jest.fn(async () => over.existingPoll ?? null),
      create: pollCreate,
      update: pollUpdate,
    },
    groundPollOption: { deleteMany: optionDeleteMany, createMany: optionCreateMany },
  };
  return {
    service: new BoardService(prisma),
    objectiveCreate, objectiveUpdate, optionDeleteMany, optionCreateMany, pollCreate,
  };
}

describe('GW-BOARD-WRITE-01: only the initiator sets the frame', () => {
  it('a non-initiator party cannot add a target (tripwire)', async () => {
    const { service, objectiveCreate } = makeService({ initiatorId: 'someone-else' });
    await expect(service.createObjective('g1', 'not-the-lead', { name: 'Paying companies' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(objectiveCreate).not.toHaveBeenCalled();
  });

  it('a non-initiator party cannot set the poll question', async () => {
    const { service, pollCreate } = makeService({ initiatorId: 'someone-else' });
    await expect(service.upsertPoll('g1', 'not-the-lead', { question: 'when', options: ['Tue'] }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(pollCreate).not.toHaveBeenCalled();
  });

  it('the initiator can add a target', async () => {
    const { service, objectiveCreate } = makeService();
    await service.createObjective('g1', 'lead', { name: 'Paying companies', target: 11 });
    expect(objectiveCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Paying companies', target: 11 }) }),
    );
  });
});

describe('GW-BOARD-WRITE-02: no writes on a ground that has no board', () => {
  it('the initiator cannot add a target to a PRIVATE ground (tripwire)', async () => {
    const { service, objectiveCreate } = makeService({ mode: GroundMode.PRIVATE });
    await expect(service.createObjective('g1', 'lead', { name: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(objectiveCreate).not.toHaveBeenCalled();
  });

  it('the initiator cannot add a target to a sensing-family ground even in SHARED mode', async () => {
    const { service, objectiveCreate } = makeService({ scenario: GroundScenario.PULSE_CHECK });
    await expect(service.createObjective('g1', 'lead', { name: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(objectiveCreate).not.toHaveBeenCalled();
  });

  it('a party cannot toggle poll availability on a board-less ground', async () => {
    const { service } = makeService({ mode: GroundMode.PRIVATE });
    await expect(service.togglePollAvailability('g1', 'opt1', 'lead'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('GW-BOARD-WRITE-03: objective counts and poll replacement behave honestly', () => {
  it('bumping a count snapshots the old one, so the "this session" delta stays true', async () => {
    const { service, objectiveUpdate } = makeService();
    await service.updateObjective('g1', 'o1', 'lead', { count: 5 });
    expect(objectiveUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ count: 5, prevCount: 3 }) }),
    );
  });

  it('the first objective is not flagged as new, a later one is stamped with its session', async () => {
    const { service, objectiveCreate } = makeService();
    await service.createObjective('g1', 'lead', { name: 'first' });
    expect(objectiveCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ addedAtSession: null }) }),
    );
  });

  it('replacing the poll options clears availability (tripwire)', async () => {
    const { service, optionDeleteMany, optionCreateMany } = makeService({
      existingPoll: { id: 'p1', groundId: 'g1' },
    });
    await service.upsertPoll('g1', 'lead', { question: 'new question', options: ['Mon', 'Tue'] });
    expect(optionDeleteMany).toHaveBeenCalledWith({ where: { pollId: 'p1' } });
    expect(optionCreateMany).toHaveBeenCalled();
  });

  it('a poll with no usable options is rejected', async () => {
    const { service } = makeService();
    await expect(service.upsertPoll('g1', 'lead', { question: 'when', options: ['  ', ''] }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
