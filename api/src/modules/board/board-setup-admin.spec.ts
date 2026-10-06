import { BoardService } from './board.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
    /* The board reads the viewer's row to work out whether they are an admin of THIS organisation -
       for the door, and for the rule that hides parties from each other. See
       the-board-keeps-the-same-wall.ts. Not an admin here, so these fixtures are unaffected by it. */
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'other-org' })) },
    recordEntry: none,
    workMention: none,
    checkIn: none,
    groundDependency: none,
    patternDetection: none,
    groundObjective: { ...none, create: jest.fn(async () => ({ id: 'o1' })) },
    groundObjectiveSnapshot: none,
    groundParticipant: none,
  };
  return new BoardService(prisma, /* wording pass: null ships the engine\'s own words */ { respond: async () => null } as any, { getSessionProgress: async () => null } as any,
    /*
     * The report's name pass, stubbed to hand the row back as it is. These cases are about
     * SHAPING, not about names, and their fixtures are written in plain words with no party
     * labels in them - so the real pass and this one produce the same text. The argument is
     * required rather than defaulted in the service on purpose: a board that quietly skipped it
     * would serve "the initiator" to the lead again, which is the defect it exists to stop.
     */
    { theReportAsItWasShared: (g: any) => g?.report ?? null } as any);
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
    await expect(serviceFor().get('g1', 'a-stranger')).rejects.toBeInstanceOf(NotFoundException);
    await expect(serviceFor().get('g1', 'lead')).resolves.toBeDefined();
    await expect(serviceFor().get('g1', 'member')).resolves.toBeDefined();
  });

  it('does not let a null createdByUserId match a caller', async () => {
    // Self-serve grounds carry createdByUserId = null. A loose equality check
    // here would hand the board to anyone whose id was also missing.
    const selfServe = { ...GROUND, createdByUserId: null };
    await expect(serviceFor(selfServe).get('g1', undefined as any))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
