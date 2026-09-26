import { ReportsService } from './reports.service';
import { theBoardsJudgementFor, whatAParticipantMayRead } from './the-judgement-is-the-leads';
import { theTableStaysWithTheEngine } from './the-table-is-for-the-engine';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * THE LEAD WAS READING THE ENGINE'S COUNTING SHEET. Task 1.2, fix 4.
 *
 * `theTable` is what the judgement is computed from and the only thing the model is handed. It was
 * also being served: it is a column on the report row, `asItWasShared` spreads the row, and the
 * board asked for it by name. A participant was protected by the denylist in
 * `the-judgement-is-the-leads`; the lead was protected by nothing and got all of it, on their
 * report and on their board. Measured across the twenty-four scenarios: 800 machine-table words,
 * 400 in each, and none anywhere else.
 *
 * What a lead was reading, word for word:
 *
 *   FIELD: What is holding up approvals?
 *     standing: THIN - only 1 people answered, which is too few to rank
 *     asked 4 · answered 3 · said they cannot 0 · never reached 1
 *       2   67%  the credit committee
 *
 * Slot names in capitals, counts joined with dots and middle dots, a sentence starting in lower
 * case, "1 people", and a standing on how a person's answers were rated - which a lead may never
 * see at all.
 *
 * ASSERTED ON WHAT COMES OUT OF THE DOOR, not on the helper. The read path is
 * `theReportAsItWasShared`, and everything under it is pure, so the prototype is enough to run the
 * real one. The board's half is pinned the same way in
 * board/the-board-says-names-in-the-judgement.spec.ts, on an assembled board.
 */

const THE_TABLE =
  'FIELD: What is holding up approvals?\n'
  + '  standing: THIN - only 1 people answered, which is too few to rank\n'
  + '  asked 4 · answered 3 · said they cannot 0 · never reached 1\n'
  + '    2   67%  the credit committee';

const LEAD = {
  id: 'p-lead',
  partyType: PartyType.INITIATOR,
  roleAsDescribed: 'runs the sales team',
  email: 'amara@northbank.test',
  createdAt: new Date('2026-09-01T09:00:00Z'),
  user: { firstName: 'Amara', lastName: 'Eze' },
};
const MEMBER = {
  id: 'p-dan',
  partyType: PartyType.PARTICIPANT,
  roleAsDescribed: 'relationship officer',
  email: 'daniel@northbank.test',
  createdAt: new Date('2026-09-01T10:00:00Z'),
  user: { firstName: 'Daniel', lastName: 'Osei' },
};

const GROUND: any = {
  scenario: GroundScenario.NEW_PROJECT,
  peersVisibleToEachOther: true,
  participants: [LEAD, MEMBER],
  report: {
    sharedAs: null,
    sharedPicture: 'Both people have checked in.',
    theTable: THE_TABLE,
    theJudgement: { theGap: 'The initiator and Participant A disagree about whose target it is.' },
  },
};

const read = (participantId: string | null, isLead: boolean) =>
  (Object.create(ReportsService.prototype) as ReportsService).theReportAsItWasShared(GROUND, participantId, isLead) as any;

describe('the machine\'s table on the report', () => {
  it('is not in what the lead is served', () => {
    const served = read('p-lead', true);
    expect(served.theTable).toBeUndefined();
    expect(JSON.stringify(served)).not.toContain('standing: THIN');
    expect(JSON.stringify(served)).not.toContain('1 people');
  });

  it('and is not in what a participant is served either', () => {
    const served = whatAParticipantMayRead(read('p-dan', false), { isLead: false, participantId: 'p-dan' });
    expect(served.theTable).toBeUndefined();
    expect(JSON.stringify(served)).not.toContain('standing: THIN');
  });

  it('and the rest of the report is untouched', () => {
    // Taking one field away must not take the report with it.
    const served = read('p-lead', true);
    expect(served.sharedPicture).toBe('Both people have checked in.');
    expect(served.theJudgement.theGap).toContain('Daniel Osei');
  });
});

describe('the machine\'s table on the board', () => {
  it('reaches the lead as null, not as the sheet', () => {
    expect(theBoardsJudgementFor(GROUND.report, { isLead: true }).theTable).toBeNull();
  });

  it('and a participant still gets nothing at all', () => {
    expect(theBoardsJudgementFor(GROUND.report, { isLead: false })).toEqual({ theJudgement: null, theTable: null });
  });
});

describe('but it is still computed and still stored', () => {
  it('the stored row keeps it - this is a read rule, not a write rule', () => {
    // It is the evidence behind the judgement and the thing to look at when a judgement is wrong.
    read('p-lead', true);
    expect(GROUND.report.theTable).toBe(THE_TABLE);
  });

  it('and the stripper copies rather than emptying what it was handed', () => {
    const row = { theTable: 'working', sharedPicture: 'the picture' };
    expect(theTableStaysWithTheEngine(row)).toEqual({ sharedPicture: 'the picture' });
    expect(row.theTable).toBe('working');
  });

  it('and a row that never had one comes back as it was', () => {
    const row = { sharedPicture: 'the picture' };
    expect(theTableStaysWithTheEngine(row)).toBe(row);
    expect(theTableStaysWithTheEngine(null)).toBeNull();
  });
});
