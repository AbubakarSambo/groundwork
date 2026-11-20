import {
  THE_SWITCHBOARD, CHECK_IN_TYPES, whatTheSwitchboardPicks, theTypeOnRecord, theTypeToOffer, theTypeOfAKind, oneOfTheTypes,
  whatTheSwitchboardServes, theSwitchesOf,
} from './the-switchboard';
import { MUCHEMI_ORG, MUCHEMI_FEE_NOTES, MUCHEMI_LITIGATION } from '../grounds/__fixtures__/muchemi-and-co';
import { ReportsController } from '../reports/reports.controller';
import { ReportsService } from '../reports/reports.service';
import { BoardService } from './board.service';

/**
 * THE SWITCHBOARD (release plan, Part 0 and Part 2; Release 2, "Switchboard foundation"): scenario plus type picks the board and
 * the reports, in one table, with today's behaviour for every pair not listed, every row whose organisation's switch is off,
 * and every row whose board is not built yet. Read with Muchemi & Co (test)'s two check-ins and Drop Access's sales team.
 */
const OFF = { release1SalesBoardOn: false, release2CollectionsOn: false };
const R2 = { release1SalesBoardOn: false, release2CollectionsOn: true };

describe('the table', () => {
  it('has the rows the release plan names, and no others yet', () => {
    expect(THE_SWITCHBOARD.map((r) => [r.scenario, r.type, r.board, r.switch, r.release, r.built])).toEqual([
      ['OKR_ALIGNMENT', 'sales team', 'the sales board', 'release1SalesBoardOn', 'Release 1', true],
      ['COLLECTIONS', 'invoices or fee notes', 'the collections board', 'release2CollectionsOn', 'Release 2, pull request 2', true],
      ['COLLECTIONS', 'loans', 'the loans board', 'release2CollectionsOn', 'Release 2, pull request 2', true],
      /* Release 2, pull request 3 draws the matter board (the-matter-board.ts), so its row is built now. */
      ['PULSE_CHECK', 'legal matter', 'the matter board', 'release2CollectionsOn', 'Release 2, pull request 3', true],
      /* The tickets family, behind Release 4's switch (pilot, November 2026): support, operations and engineering share one board. */
      ['OKR_ALIGNMENT', 'support tickets', 'the tickets board', 'release4TeamsOn', 'Release 4', true],
      ['OKR_ALIGNMENT', 'incidents', 'the tickets board', 'release4TeamsOn', 'Release 4', true],
      ['OKR_ALIGNMENT', 'engineering tasks', 'the tickets board', 'release4TeamsOn', 'Release 4', true],
      /* The programme family, behind the same switch (pilot, November 2026): a trader programme, a government programme and a where-next workshop. */
      ['COHORT_CHECK', 'trader programme', 'the programme board', 'release4TeamsOn', 'Release 4', true],
      ['PULSE_CHECK', 'government programme', 'the programme board', 'release4TeamsOn', 'Release 4', true],
      ['DISCOVERY', 'where next', 'the programme board', 'release4TeamsOn', 'Release 4', true],
      /* The number-tracking family, behind the same switch (pilot, November 2026): a founder's own check-in and a quarter's metrics. */
      ['PULSE_CHECK', 'founder check-in', 'the numbers board', 'release4TeamsOn', 'Release 4', true],
      ['OKR_ALIGNMENT', 'quarter metrics', 'the numbers board', 'release4TeamsOn', 'Release 4', true],
      /* The kinds that had a board but no row (15 November): a sales organisation, a leadership team, a funded project, client delivery. */
      ['OKR_ALIGNMENT', 'sales organisation', 'the sales organisation board', 'release4TeamsOn', 'Release 4', true],
      ['BOARD_STRATEGY', 'leadership team', 'the leadership board', 'release4TeamsOn', 'Release 4', true],
      ['WORKPLAN_BUDGET', 'funded project', 'the project board', 'release5ProjectsOn', 'Release 5', true],
      ['WORKPLAN_BUDGET', 'client delivery', 'the project board', 'release5ProjectsOn', 'Release 5', true],
    ]);
    expect(CHECK_IN_TYPES).toEqual(['sales team', 'invoices or fee notes', 'loans', 'legal matter', 'support tickets', 'incidents', 'engineering tasks', 'trader programme', 'government programme', 'where next', 'founder check-in', 'quarter metrics', 'sales organisation', 'leadership team', 'funded project', 'client delivery']);
  });

  it('collections reports are full, with the weekly numbers the release plan names', () => {
    const fees = THE_SWITCHBOARD.find((r) => r.type === 'invoices or fee notes')!;
    expect(fees.reports).toEqual({ team: 'full', own: true, weekly: true, weeklyNumbers: ['collected this week', 'due', 'overdue', 'paid with proof'] });
  });

  it('every row is a pair no other row has', () => {
    const keys = THE_SWITCHBOARD.map((r) => `${r.scenario}/${r.type}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('what it picks', () => {
  it('a pair with no row picks today\'s board and reports, whatever the switches say', () => {
    for (const sw of [OFF, R2, { release1SalesBoardOn: true, release2CollectionsOn: true }]) {
      expect(whatTheSwitchboardPicks('PULSE_CHECK', null, sw)).toEqual({ board: 'today', reports: 'today', row: null, because: 'no row for this pair' });
      expect(whatTheSwitchboardPicks('PULSE_CHECK', 'a type nobody has', sw).board).toBe('today');
    }
  });

  it('with every switch off, every row picks today\'s board and reports', () => {
    for (const r of THE_SWITCHBOARD) {
      const pick = whatTheSwitchboardPicks(r.scenario, r.type, OFF);
      expect([r.type, pick.board, pick.reports, pick.because]).toEqual([r.type, 'today', 'today', 'its switch is off']);
    }
  });

  it('Release 1\'s row picks the sales board only where Release 1\'s switch is on, as its own code already draws it', () => {
    expect(whatTheSwitchboardPicks('OKR_ALIGNMENT', 'sales team', { release1SalesBoardOn: true }).board).toBe('the sales board');
    expect(whatTheSwitchboardPicks('OKR_ALIGNMENT', 'sales team', R2).board).toBe('today');
    /* The board follows the type, not the scenario: a sales team read as another situation still reaches its board, as the screen already drew it. */
    expect(whatTheSwitchboardPicks('NEW_HIRE', 'sales team', { release1SalesBoardOn: true }).board).toBe('the sales board');
    expect(whatTheSwitchboardPicks('NEW_HIRE', 'sales team', { release1SalesBoardOn: true }).reports).toBe('today');
  });

  /* Release 2, pull request 2 drew the collections board and its reports; pull request 3 draws the matter board, so all three rows are built. */
  it('Release 2\'s rows pick the collections board, the loans board and the matter board where the switch is on', () => {
    expect(whatTheSwitchboardPicks('COLLECTIONS', 'invoices or fee notes', R2)).toEqual(expect.objectContaining({ board: 'the collections board', because: 'its row' }));
    expect(whatTheSwitchboardPicks('COLLECTIONS', 'loans', R2)).toEqual(expect.objectContaining({ board: 'the loans board', because: 'its row' }));
    expect((whatTheSwitchboardPicks('COLLECTIONS', 'loans', R2).reports as any).team).toBe('full');
    expect(whatTheSwitchboardPicks('PULSE_CHECK', 'legal matter', R2)).toEqual(expect.objectContaining({ board: 'the matter board', because: 'its row' }));
    expect(whatTheSwitchboardPicks('PULSE_CHECK', 'legal matter', OFF)).toEqual(expect.objectContaining({ board: 'today', because: 'its switch is off' }));
  });
});

describe('the type of a check-in, from its own record, at read time', () => {
  it('Muchemi\'s litigation daily is a legal matter, read from its kind of work, not confirmed, and nothing is written', () => {
    expect(theTypeOnRecord(MUCHEMI_LITIGATION)).toEqual({ type: 'legal matter', confirmed: false, from: 'its kind of work' });
  });

  it('a sales team the lead chose herself is a confirmed sales team; a sales org is a sales organisation', () => {
    expect(theTypeOnRecord({ scenario: 'OKR_ALIGNMENT', kindOfWork: 'sales team', kindOfWorkSetBy: 'lead' })).toEqual({ type: 'sales team', confirmed: true, from: 'its kind of work' });
    expect(theTypeOnRecord({ scenario: 'OKR_ALIGNMENT', kindOfWork: 'sales org', kindOfWorkSetBy: 'lead' }).type).toBe('sales organisation');
    expect(theTypeOfAKind('asset loans')).toBe('loans');
    /* The tickets family has types now (pilot, November 2026), so an engineering release reads as engineering tasks; a sales org still has none. */
    expect(theTypeOfAKind('engineering release')).toBe('engineering tasks');
    expect(theTypeOfAKind('sales org')).toBe('sales organisation');
  });

  it('a type the lead confirmed wins, and only a type the scenario offers counts', () => {
    expect(theTypeOnRecord({ ...MUCHEMI_FEE_NOTES, checkInType: 'invoices or fee notes', checkInTypeConfirmedAt: new Date('2026-10-19') })).toEqual({ type: 'invoices or fee notes', confirmed: true, from: 'the lead' });
    expect(theTypeOnRecord({ ...MUCHEMI_FEE_NOTES, checkInType: 'legal matter', checkInTypeConfirmedAt: new Date('2026-10-19') }).type).toBeNull();
    expect(theTypeOnRecord({ ...MUCHEMI_FEE_NOTES, checkInType: 'loans', checkInTypeConfirmedAt: null }).type).toBeNull();
    expect(oneOfTheTypes(' Loans ')).toBe('loans');
    expect(oneOfTheTypes('loan')).toBeNull();
  });

  it('for the fee notes check-in, nobody has confirmed a type, so "What it is" is offered the one read from Wanjiru\'s words', () => {
    expect(theTypeOnRecord(MUCHEMI_FEE_NOTES).type).toBeNull();
    expect(theTypeToOffer(MUCHEMI_FEE_NOTES, { billWord: MUCHEMI_ORG.billWord })).toEqual({ type: 'invoices or fee notes', confirmed: false, readFrom: 'your words' });
  });
});

describe('what the board and the reports are told', () => {
  const prismaFor = (sw: Record<string, boolean> | 'broken') => ({
    organization: { findUnique: jest.fn(async () => { if (sw === 'broken') throw new Error('away'); return sw; }) },
  });

  it('serves the same where the stored switch says off, or its row cannot be read (every board is on)', async () => {
    /* 15 November 2026: every board is on for every organisation. A stored false, a broken row or a missing organisation no longer hides it. */
    const on = await whatTheSwitchboardServes(prismaFor(R2), MUCHEMI_LITIGATION);
    expect(on).toMatchObject({ board: 'the matter board' });
    expect(await whatTheSwitchboardServes(prismaFor(OFF), MUCHEMI_LITIGATION)).toEqual(on);
    expect(await whatTheSwitchboardServes(prismaFor('broken'), MUCHEMI_LITIGATION)).toEqual(on);
    expect(await theSwitchesOf(prismaFor('broken'), 'org')).toEqual({ release1SalesBoardOn: true, release2CollectionsOn: true, release4TeamsOn: true, release5ProjectsOn: true });
  });

  it('where Release 2 is on: the type, whether it was confirmed, and the board its row picks (the matter board for the litigation daily, read from its own record)', async () => {
    expect(await whatTheSwitchboardServes(prismaFor(R2), MUCHEMI_LITIGATION)).toEqual({ type: 'legal matter', typeConfirmed: false, board: 'the matter board', drawnAs: 'a law firm matter', reports: 'full' });
    expect(await whatTheSwitchboardServes(prismaFor(R2), MUCHEMI_FEE_NOTES)).toEqual({ type: null, typeConfirmed: false, board: 'today', drawnAs: null, reports: 'today' });
  });

  it('the board carries the switchboard key whatever the stored switch says', async () => {
    const board = Object.assign(Object.create(BoardService.prototype), { prisma: prismaFor(OFF) });
    expect(await (board as any).theSwitchboardsPick(MUCHEMI_LITIGATION)).toMatchObject({ switchboard: { board: 'the matter board' } });
    const on = Object.assign(Object.create(BoardService.prototype), { prisma: prismaFor(R2) });
    expect(await (on as any).theSwitchboardsPick(MUCHEMI_LITIGATION)).toEqual({ switchboard: { type: 'legal matter', typeConfirmed: false, board: 'the matter board', drawnAs: 'a law firm matter', reports: 'full' } });
  });

  it('a session report is served with the pick whatever the stored switch says', async () => {
    const theReport = { inShort: 'Three fee notes moved this week.', sections: [] };
    for (const [sw, expected] of [[OFF, { type: 'legal matter', typeConfirmed: false, board: 'the matter board', drawnAs: 'a law firm matter', reports: 'full' }], [R2, { type: 'legal matter', typeConfirmed: false, board: 'the matter board', drawnAs: 'a law firm matter', reports: 'full' }]] as const) {
      const prisma: any = { ...prismaFor(sw as any), ground: { findUnique: jest.fn(async () => MUCHEMI_LITIGATION) } };
      const reports = Object.assign(Object.create(ReportsService.prototype), { prisma });
      reports.sessionReport = jest.fn(async () => ({ ...theReport }));
      reports.noteTheLeadRead = jest.fn(async () => undefined);
      const ctl = new ReportsController(reports);
      const served: any = await ctl.sessionReport(MUCHEMI_LITIGATION.id, 1, 'u-wanjiru', MUCHEMI_ORG.id);
      expect(served.switchboard).toEqual(expected);
      if (!expected) expect(Object.keys(served)).not.toContain('switchboard');
      expect(served.inShort).toBe('Three fee notes moved this week.');
    }
  });
});
