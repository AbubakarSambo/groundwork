import { whatTheSwitchboardPicks, whatTheSwitchboardServes, aKindTheSwitchboardNeeds, theTypeOnRecord, theTypeOfAKind } from './the-switchboard';

/**
 * THE PROGRAMME FAMILY IN THE SWITCHBOARD (pilot, November 2026). A trader training programme, a government programme and a where-next
 * workshop read as a type from their kind of work, and the programme board is picked for them only where the organisation's Release 4
 * switch is on, each under its own scenario. Off, and for every pair with no row, the board is today's.
 */
const ON = { release1SalesBoardOn: false, release2CollectionsOn: false, release4TeamsOn: true };
const OFF = { release1SalesBoardOn: false, release2CollectionsOn: false, release4TeamsOn: false };
const prismaFor = (sw: Record<string, boolean>) => ({ organization: { findUnique: jest.fn(async () => sw) } });
const ground = (kindOfWork: string, scenario: string) => ({ organizationId: 'org', scenario, kindOfWork, kindOfWorkSetBy: 'read', checkInType: null, checkInTypeConfirmedAt: null });
const KINDS: [string, string, string][] = [
  ['trader training programme', 'trader programme', 'COHORT_CHECK'],
  ['a government programme', 'government programme', 'PULSE_CHECK'],
  ['MarketView where next', 'where next', 'DISCOVERY'],
];

describe('the type is read from the kind of work', () => {
  it.each(KINDS)('%s reads as %s', (kind, type, scenario) => {
    expect(theTypeOfAKind(kind)).toBe(type);
    expect(theTypeOnRecord(ground(kind, scenario))).toEqual({ type, confirmed: false, from: 'its kind of work' });
  });
});

describe('what it picks', () => {
  it.each(KINDS)('%s: the programme board with Release 4 on, today\'s board with it off', (_k, type, scenario) => {
    expect(whatTheSwitchboardPicks(scenario, type, ON).board).toBe('the programme board');
    expect(whatTheSwitchboardPicks(scenario, type, OFF)).toMatchObject({ board: 'today', reports: 'today', because: 'its switch is off' });
    expect(whatTheSwitchboardPicks(scenario, type, { release2CollectionsOn: true }).board).toBe('today');
  });
  it('the board follows the type, so any other scenario reaches it too, with today\'s reports (15 November: the scenario no longer decides the board)', () => {
    for (const [, type] of KINDS) expect(whatTheSwitchboardPicks('REALIGN_TEAM', type, ON)).toMatchObject({ board: 'the programme board', reports: 'today', because: 'its row' });
  });
});

describe('what the board is told', () => {
  it.each(KINDS)('%s: the type and the programme board where Release 4 is on, and nothing at all where it is off', async (kind, type, scenario) => {
    expect(await whatTheSwitchboardServes(prismaFor(ON), ground(kind, scenario))).toEqual({ type, typeConfirmed: false, drawnAs: expect.any(String), board: 'the programme board', reports: 'short' });
    /* 15 November 2026: every board is on for every organisation, so a stored switch of false no longer hides it (the-switchboard.ts theSwitchesOf). */
    expect(await whatTheSwitchboardServes(prismaFor(OFF), ground(kind, scenario))).toEqual(await whatTheSwitchboardServes(prismaFor(ON), ground(kind, scenario)));
  });
});

describe('detection reaches these kinds', () => {
  it.each(KINDS)('%s may be given to a check-in where Release 4 is on, and not where it is off', async (kind) => {
    expect(await aKindTheSwitchboardNeeds(prismaFor(ON), kind, 'org')).toBe(true);
    expect(await aKindTheSwitchboardNeeds(prismaFor(OFF), kind, 'org')).toBe(true);
  });
});
