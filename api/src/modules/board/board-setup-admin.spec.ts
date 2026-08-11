import { BoardService } from './board.service';
import { ForbiddenException } from '@nestjs/common';
import { GroundMode, GroundScenario } from '@prisma/client';

/**
 * WHO MAY READ A BOARD.
 *
 * An eighteen-ground org run found the admin locked out of every board she had
 * created. She sets a ground up and hands it to a lead, so she is neither
 * `initiatorId` nor a participant - the only two identities the guard checked -
 * while her own admin page renders a "Team board" link straight at it. Lead 200,
 * participant 200, the person who created the whole thing 403.
 *
 * The line these tests hold: she may READ. She must not pick up the initiator's
 * write powers by the same door, because objectives are the lead's frame and
 * handing them to whoever did the setup would quietly change whose ground it is.
 */

const GROUND = {
  id: 'g1',
  scenario: GroundScenario.NEW_PROJECT,
  mode: GroundMode.SHARED,
  initiatorId: 'lead',
  createdByUserId: 'admin',
  peopleWorkTogether: true,
  timelineDays: 90,
  cadence: 'WEEKLY',
  moment: 'STARTING',
  participants: [{ id: 'p1', userId: 'member', roleAsDescribed: 'builds the thing', user: { firstName: 'Mem', lastName: 'Ber' } }],
  checkIns: [],
  report: null,
  objectives: [],
  dependencies: [],
  poll: null,
};

function serviceFor(ground: any = GROUND) {
  const none = { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    recordEntry: none,
    workMention: none,
    checkIn: none,
    groundDependency: none,
    patternDetection: none,
    groundObjective: { ...none, create: jest.fn(async () => ({ id: 'o1' })) },
  };
  return new BoardService(prisma);
}

describe('the admin who set the ground up', () => {
  it('may read the board she created', async () => {
    // The whole finding, in one line: this used to throw.
    const board = await serviceFor().get('g1', 'admin');
    expect(board).toBeDefined();
    expect((board as any).groundId ?? 'g1').toBe('g1');
  });

  it('still may not set the lead\'s targets', async () => {
    // Read access must not become write access. Objectives are the lead's
    // frame of what the ground aims at; the person who did the paperwork does
    // not get to set it.
    await expect(serviceFor().createObjective('g1', 'admin', { name: 'ship it' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('leaves everybody else exactly where they were', async () => {
    await expect(serviceFor().get('g1', 'a-stranger')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(serviceFor().get('g1', 'lead')).resolves.toBeDefined();
    await expect(serviceFor().get('g1', 'member')).resolves.toBeDefined();
  });

  it('does not let a null createdByUserId match a caller', async () => {
    // Self-serve grounds carry createdByUserId = null. A loose equality check
    // here would hand the board to anyone whose id was also missing.
    const selfServe = { ...GROUND, createdByUserId: null };
    await expect(serviceFor(selfServe).get('g1', undefined as any))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
