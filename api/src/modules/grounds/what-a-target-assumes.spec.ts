import { readFileSync } from 'fs';
import { join } from 'path';
import { ForbiddenException } from '@nestjs/common';
import { GroundMode, GroundScenario } from '@prisma/client';
import { BoardService } from '../board/board.service';
import { targetsFor } from '../board/whose-number-is-whose-business';

/*
 * WHAT A TARGET ASSUMES (U.7, B2 Context).
 *
 * "Every target shows what it assumes." The lead writes the things a target rests on, one per line,
 * and they travel with the target: whoever may read the target reads what it assumes, and nobody
 * else. A person's share of a target is seen by that person and the lead, so what that share
 * assumes is too.
 */

const teamTarget = { id: 't1', name: 'Sales', target: 25, ownerParticipantId: null, assumes: ['6 reps each close about 4 sales.'] };
const aishasShare = { id: 't2', name: 'Aisha’s share', target: 6, ownerParticipantId: 'p-aisha', assumes: ['Aisha keeps her two supermarket buyers.'] };
const briansShare = { id: 't3', name: 'Brian’s share', target: 5, ownerParticipantId: 'p-brian', assumes: ['Brian gets the Eastside lead back.'] };
const all = [teamTarget, aishasShare, briansShare];

describe('what a target assumes is read with the target, by the same people', () => {
  it('the lead reads what every target assumes', () => {
    const { shown } = targetsFor(all, null, 'their own', { isLead: true });
    expect(shown.map((t: any) => t.assumes).flat()).toEqual([
      '6 reps each close about 4 sales.',
      'Aisha keeps her two supermarket buyers.',
      'Brian gets the Eastside lead back.',
    ]);
  });

  it('Aisha reads what the team target and her own share assume, and nothing about Brian’s share', () => {
    const { shown } = targetsFor(all, 'p-aisha', 'their own');
    const read = JSON.stringify(shown);
    expect(read).toContain('6 reps each close about 4 sales.');
    expect(read).toContain('Aisha keeps her two supermarket buyers.');
    expect(read).not.toContain('Brian gets the Eastside lead back.');
  });

  it('the ground read selects the column in both of its reads, so it reaches the Context page', () => {
    const src = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    /* Gained isADecisionAboutAPerson (decision 46, 29 September 2026) alongside assumes. */
    const selects = src.match(/objectives: \{ select: \{ id: true, name: true, target: true, ownerParticipantId: true, assumes: true, isADecisionAboutAPerson: true \}/g) ?? [];
    expect(selects.length).toBe(2);
  });
});

function makeBoard(initiatorId = 'lead') {
  const update = jest.fn(async (a: any) => ({ id: a.where.id, ...a.data }));
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', scenario: GroundScenario.NEW_PROJECT, mode: GroundMode.SHARED, initiatorId })) },
    groundObjective: { findUnique: jest.fn(async () => ({ id: 't1', groundId: 'g1', count: 3 })), update },
  };
  const service = new BoardService(prisma, { respond: async () => null } as any, { getSessionProgress: async () => null } as any,
    { theReportAsItWasShared: (g: any) => g?.report ?? null } as any);
  return { service, update };
}

describe('only the lead writes what a target assumes', () => {
  it('keeps the lead’s lines as written, without the blank ones', async () => {
    const { service, update } = makeBoard();
    await service.updateObjective('g1', 't1', 'lead', { assumes: ['  6 reps each close about 4 sales. ', '', '   ', 'Stock arrives within a week of an order.'] });
    expect(update.mock.calls[0][0].data.assumes).toEqual(['6 reps each close about 4 sales.', 'Stock arrives within a week of an order.']);
  });

  it('an empty list clears it', async () => {
    const { service, update } = makeBoard();
    await service.updateObjective('g1', 't1', 'lead', { assumes: [] });
    expect(update.mock.calls[0][0].data.assumes).toEqual([]);
  });

  it('leaves it alone when a change does not mention it', async () => {
    const { service, update } = makeBoard();
    await service.updateObjective('g1', 't1', 'lead', { target: 30 });
    expect('assumes' in update.mock.calls[0][0].data).toBe(false);
  });

  it('anybody else is refused, and nothing is written', async () => {
    const { service, update } = makeBoard('lead');
    await expect(service.updateObjective('g1', 't1', 'aisha', { assumes: ['Anything.'] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });
});
