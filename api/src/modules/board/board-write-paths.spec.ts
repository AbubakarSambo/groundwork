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
    service: new BoardService(prisma, /* wording pass: null ships the engine\'s own words */ { respond: async () => null } as any, { getSessionProgress: async () => null } as any,
    /*
     * The report's name pass, stubbed to hand the row back as it is. These cases are about
     * SHAPING, not about names, and their fixtures are written in plain words with no party
     * labels in them - so the real pass and this one produce the same text. The argument is
     * required rather than defaulted in the service on purpose: a board that quietly skipped it
     * would serve "the initiator" to the lead again, which is the defect it exists to stop.
     */
    { theReportAsItWasShared: (g: any) => g?.report ?? null } as any),
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

describe('a target carries the unit the lead writes (polish round 1, 25 October)', () => {
  it('"120" with "units" is stored with its unit; a blank unit is none', async () => {
    const { service, objectiveCreate } = makeService();
    await service.createObjective('g1', 'lead', { name: 'Units sold by 30 October', target: 120, unit: ' units ' });
    expect(objectiveCreate.mock.calls[0][0].data.unit).toBe('units');
    await service.createObjective('g1', 'lead', { name: 'Paying companies', target: 11, unit: '  ' });
    expect(objectiveCreate.mock.calls[1][0].data.unit).toBeNull();
  });
});

describe('the lead names whose goal a target is (polish round 1, 25 October)', () => {
  it('a person in the check-in, or nobody, which is whoever runs it', async () => {
    const { service, objectiveUpdate } = makeService();
    (service as any).prisma.groundParticipant = { ...(service as any).prisma.groundParticipant, findFirst: jest.fn(async ({ where }: any) => (where.id === 'p-kevin' && where.groundId === 'g1' ? { id: 'p-kevin' } : null)) };
    await service.updateObjective('g1', 'o1', 'lead', { ownerParticipantId: 'p-kevin' });
    expect(objectiveUpdate.mock.calls[0][0].data.ownerParticipantId).toBe('p-kevin');
    await service.updateObjective('g1', 'o1', 'lead', { ownerParticipantId: null });
    expect(objectiveUpdate.mock.calls[1][0].data.ownerParticipantId).toBeNull();
    await service.updateObjective('g1', 'o1', 'lead', { ownerParticipantId: 'p-somebody-elsewhere' });
    expect(objectiveUpdate.mock.calls[2][0].data.ownerParticipantId).toBeNull();
  });
});

describe('A new target keeps what it assumes (Drop Access, 18 October)', () => {
  it('the lead writes what the target of 120 assumes when she makes it, and it is stored as she wrote it', async () => {
    const { service, objectiveCreate } = makeService();
    await service.createObjective('g1', 'lead', {
      name: 'Units sold by 30 October',
      target: 120,
      assumes: ['Each of the three reps sells about 40 units.', '  ', 'A sale counts only with proof of payment or a signed order.'],
    });
    expect(objectiveCreate.mock.calls[0][0].data.assumes).toEqual([
      'Each of the three reps sells about 40 units.',
      'A sale counts only with proof of payment or a signed order.',
    ]);
  });

  it('a target made with nothing it assumes is stored with an empty list', async () => {
    const { service, objectiveCreate } = makeService();
    await service.createObjective('g1', 'lead', { name: 'Units sold by 30 October', target: 120 });
    expect(objectiveCreate.mock.calls[0][0].data.assumes).toEqual([]);
  });
});

describe('GW-BOARD-WRITE-02: no writes to a section the board does not have', () => {
  it('the initiator CAN add a target to a private check-in, now that it has a board', async () => {
    /**
     * REVERSED, and it is the point of the change rather than a casualty of it.
     *
     * This asserted that a private check-in refused a target, because a private check-in had no board to
     * show one on. That was the defect: the situations most likely to be opened private are the ones
     * that most need something to track against, and they were the ones denied it.
     *
     * The gate that remains is the SECTION - a check-in whose board has no objectives section still
     * refuses one, which is asserted below with SNAPSHOT.
     */
    const { service, objectiveCreate } = makeService({ mode: GroundMode.PRIVATE });
    await service.createObjective('g1', 'lead', { name: 'x' });
    expect(objectiveCreate).toHaveBeenCalled();
  });

  it('the initiator cannot add a target to a ground whose board has no objectives section', async () => {
    /**
     * SNAPSHOT now, and this example has moved twice - which is the point of writing down why.
     *
     * It was PULSE_CHECK, until a recurring check-in became the place a team states the number it is
     * working to. It was then DRIFT, until sensing gained an objectives section, because a drift is
     * also a situation where you agree what needs to happen and track it.
     *
     * SNAPSHOT is the honest example and should be the last one: it is one session with no objective
     * by design, so its section list is empty and always will be. If a future change gives it a
     * target, this test SHOULD fail - that would mean the one single-round situation in the product
     * had quietly become a run.
     *
     * The rule itself has never changed: the gate is the SECTION, not the board. Sensing grounds
     * render a board, so asking "does this ground have a board" would let a target be written onto a
     * surface that never shows it.
     */
    const { service, objectiveCreate } = makeService({ scenario: GroundScenario.SNAPSHOT });
    await expect(service.createObjective('g1', 'lead', { name: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(objectiveCreate).not.toHaveBeenCalled();
  });

  it('but a recurring check-in CAN state a target, because its board shows one', async () => {
    /** The other half, which is the whole point of moving PULSE_CHECK out of sensing. */
    const { service, objectiveCreate } = makeService({ scenario: GroundScenario.PULSE_CHECK });
    await service.createObjective('g1', 'lead', { name: 'Reach 400k in new contracts' });
    expect(objectiveCreate).toHaveBeenCalled();
  });

  it('a party cannot toggle poll availability where the board has no poll', async () => {
    /**
     * The example moved from mode to section, for the same reason as the target above: private no longer
     * means board-less. SNAPSHOT is the honest example - one round, so nothing to schedule, so no poll
     * section and never one.
     */
    const { service } = makeService({ scenario: GroundScenario.SNAPSHOT });
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
