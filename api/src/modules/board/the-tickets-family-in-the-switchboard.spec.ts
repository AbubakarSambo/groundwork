import { whatTheSwitchboardPicks, whatTheSwitchboardServes, aKindTheSwitchboardNeeds, theTypeOnRecord, theTypeOfAKind } from './the-switchboard';
import { BoardService } from './board.service';

/**
 * THE TICKETS FAMILY IN THE SWITCHBOARD (pilot, November 2026). Support, operations and engineering check-ins read as a type from their
 * kind of work, and the tickets board is picked for them only where the organisation's Release 4 switch is on. Off, and for every pair
 * with no row, the board is today's. Read with a support desk, a distribution operations and an engineering release check-in.
 */
const ON = { release1SalesBoardOn: false, release2CollectionsOn: false, release4TeamsOn: true };
const OFF = { release1SalesBoardOn: false, release2CollectionsOn: false, release4TeamsOn: false };
const prismaFor = (sw: Record<string, boolean>) => ({ organization: { findUnique: jest.fn(async () => sw) } });
const ground = (kindOfWork: string, scenario = 'OKR_ALIGNMENT') => ({ organizationId: 'org', scenario, kindOfWork, kindOfWorkSetBy: 'read', checkInType: null, checkInTypeConfirmedAt: null });
const KINDS: [string, string][] = [['support desk', 'support tickets'], ['distribution operations', 'incidents'], ['engineering release', 'engineering tasks']];

describe('the type is read from the kind of work', () => {
  it.each(KINDS)('%s reads as %s', (kind, type) => {
    expect(theTypeOfAKind(kind)).toBe(type);
    expect(theTypeOnRecord(ground(kind))).toEqual({ type, confirmed: false, from: 'its kind of work' });
  });
});

describe('what it picks', () => {
  it.each(KINDS)('%s: the tickets board with Release 4 on, today\'s board with it off', (_k, type) => {
    expect(whatTheSwitchboardPicks('OKR_ALIGNMENT', type, ON).board).toBe('the tickets board');
    expect(whatTheSwitchboardPicks('OKR_ALIGNMENT', type, OFF)).toMatchObject({ board: 'today', reports: 'today', because: 'its switch is off' });
    expect(whatTheSwitchboardPicks('OKR_ALIGNMENT', type, { release2CollectionsOn: true }).board).toBe('today');
  });
  it('the board follows the type, so any other scenario reaches it too, with today\'s reports (15 November: the scenario no longer decides the board)', () => {
    for (const [, type] of KINDS) expect(whatTheSwitchboardPicks('PULSE_CHECK', type, ON)).toMatchObject({ board: 'the tickets board', reports: 'today', because: 'its row' });
  });
});

describe('what the board is told', () => {
  it.each(KINDS)('%s: the type and the tickets board where Release 4 is on, and nothing at all where it is off', async (kind, type) => {
    expect(await whatTheSwitchboardServes(prismaFor(ON), ground(kind))).toEqual({ type, typeConfirmed: false, drawnAs: expect.any(String), board: 'the tickets board', reports: 'short' });
/* 15 November 2026: every board is on for every organisation, so a stored switch of false no longer hides it (the-switchboard.ts theSwitchesOf). */
    expect(await whatTheSwitchboardServes(prismaFor(OFF), ground(kind))).toEqual(await whatTheSwitchboardServes(prismaFor(ON), ground(kind)));
  });
  it('a sales team is served the sales board too (every board is on)', async () => {
    expect(await whatTheSwitchboardServes(prismaFor(ON), ground('sales team'))).toMatchObject({ type: 'sales team', board: 'the sales board' });
  });
  it('the board carries the key only where Release 4 is on', async () => {
    const mk = (sw: Record<string, boolean>) => Object.assign(Object.create(BoardService.prototype), { prisma: prismaFor(sw) });
/* 15 November 2026: every board is on for every organisation, so a stored switch of false no longer hides it (the-switchboard.ts theSwitchesOf). */
    expect(await (mk(OFF) as any).theSwitchboardsPick(ground('support desk'))).toEqual(await (mk(ON) as any).theSwitchboardsPick(ground('support desk')));
    expect(await (mk(ON) as any).theSwitchboardsPick(ground('support desk'))).toEqual({ switchboard: { type: 'support tickets', typeConfirmed: false, drawnAs: expect.any(String), board: 'the tickets board', reports: 'short' } });
  });
});

describe('detection reaches these kinds', () => {
  it.each(KINDS)('%s may be given to a check-in where Release 4 is on, and not where it is off', async (kind) => {
    expect(await aKindTheSwitchboardNeeds(prismaFor(ON), kind, 'org')).toBe(true);
    expect(await aKindTheSwitchboardNeeds(prismaFor(OFF), kind, 'org')).toBe(true);
  });
});
