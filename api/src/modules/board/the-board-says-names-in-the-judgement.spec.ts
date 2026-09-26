import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * THE LEAD READ "THE INITIATOR" ABOUT HERSELF, ON THE BOARD, IN SEPTEMBER 2026.
 *
 * Fix 3 put people's names into the report. The board was left behind, and the board is the page a
 * lead opens first. Read off the running API, `GET /grounds/:id/board`, as the lead of the sales
 * check-in:
 *
 *   theJudgement.theGap:
 *     "The initiator believes the team is behind on a collective goal for one reason, but the
 *      record shows each person is working on an individual goal and is blocked by a different
 *      problem."
 *
 *   overTime.dependencies[].say:
 *     "the initiator is waiting on the credit committee for "decisions on their deals"; 2 sessions;
 *      nothing on record about escalating it."
 *
 * Both come STRAIGHT off the stored report row, which is written in labels on purpose, and the
 * board's own name pass only ever covered the whitelisted fields. Across the twenty-four scenarios
 * the scorer counted 1,370 label hits and the board's prose fields were the biggest contributors.
 *
 * WHY THIS TEST IS AN OUTPUT TEST AND NOT A CODE TEST. There are two sibling files that pin the
 * SHAPE of the naming (`the-board-uses-names-like-the-report`), and both of them stayed green
 * through the whole of this defect, because the shape they pinned was of a pass that never reached
 * these fields. So this one assembles a real board, with the report's real name resolution, and
 * reads the sentences a person would read - as the lead, and as the participant.
 */

const LEAD = {
  id: 'p-lead',
  userId: 'u-amara',
  partyType: PartyType.INITIATOR,
  email: 'amara@northbank.test',
  roleAsDescribed: 'runs the sales team',
  nameGiven: null,
  organisationGiven: null,
  managingOnly: false,
  createdAt: new Date('2026-09-01T09:00:00Z'),
  user: { firstName: 'Amara', lastName: 'Eze' },
};

const MEMBER = {
  id: 'p-dan',
  userId: 'u-daniel',
  partyType: PartyType.PARTICIPANT,
  email: 'daniel@northbank.test',
  roleAsDescribed: 'relationship officer',
  nameGiven: null,
  organisationGiven: null,
  managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'),
  user: { firstName: 'Daniel', lastName: 'Osei' },
};

/* Written the way the model writes it: in labels, with no personal name anywhere in the row. */
const REPORT = {
  releasedAt: new Date('2026-09-20T09:00:00Z'),
  sharedAs: null,
  theOpening: null,
  networkPicture: null,
  sharedPicture: 'Both people have checked in.',
  agreements: [],
  divergences: [],
  centralQuestion: null,
  engagement: {},
  theTable:
    'FIELD: What is holding up approvals?\n  standing: THIN - only 1 people answered, which is too few to rank\n  asked 4 \u00b7 answered 3 \u00b7 said they cannot 0 \u00b7 never reached 1',
  theJudgement: {
    theGap:
      'The initiator believes the team is behind on a collective goal for one reason, but the record shows each person is working on an individual goal and is blocked by a different problem.',
    startWith: 'Start with Participant A, who has been waiting longest.',
  },
  overTime: {
    dependencies: [
      {
        participantId: 'p-lead',
        say: 'the initiator is waiting on the credit committee for decisions on their deals, and there is nothing on record about escalating it.',
      },
      {
        participantId: 'p-dan',
        say: 'Participant A is waiting on the customers for their bank statements.',
      },
    ],
  },
};

const GROUND: any = {
  id: 'g-sales',
  scenario: GroundScenario.NEW_PROJECT,
  mode: GroundMode.SHARED,
  initiatorId: 'u-amara',
  createdByUserId: 'u-amara',
  organizationId: 'org-1',
  peopleWorkTogether: true,
  peersVisibleToEachOther: true,
  timelineDays: 90,
  cadence: 'WEEKLY',
  moment: 'STARTING',
  label: 'Sales this quarter',
  participants: [LEAD, MEMBER],
  checkIns: [],
  report: REPORT,
  objectives: [],
  dependencies: [],
  poll: null,
};

function boardFor(requestingUserId: string) {
  const none = { findMany: jest.fn(async () => []), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const prisma: any = {
    /* A fresh copy each time: the board names the row in place, for the reader who asked. */
    ground: { findUnique: jest.fn(async () => JSON.parse(JSON.stringify(GROUND))) },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org-1' })) },
    recordEntry: none,
    workMention: none,
    checkIn: none,
    groundDependency: none,
    groundDocument: none,
    patternDetection: none,
    groundObjective: none,
    groundObjectiveSnapshot: none,
    groundParticipant: none,
  };
  /*
   * THE REAL NAME RESOLUTION, not a stub of it. `theReportAsItWasShared` and everything under it
   * is pure - it reads the ground it is handed and nothing else - so the prototype is enough, and
   * using it means this test breaks if the rule itself breaks.
   */
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(
    prisma,
    { respond: async () => null } as any,
    { getSessionProgress: async () => null } as any,
    reports,
  );
  return svc.get('g-sales', requestingUserId);
}

describe('what the lead reads on her own board', () => {
  it('the gap is addressed to her, and names the other person', async () => {
    const board: any = await boardFor('u-amara');
    /* The reader is "you", the same way the report addresses them - see applyNames. */
    expect(board.theJudgement.theGap).toMatch(/^You believe the team is behind/);
    expect(board.theJudgement.theGap.toLowerCase()).not.toContain('the initiator');
    expect(board.theJudgement.startWith).toContain('Daniel Osei');
    expect(board.theJudgement.startWith).not.toContain('Participant A');
  });

  it('and the engine\'s own counting sheet is not on the page at all', async () => {
    /* The lead is the reader nothing else protects, and what they were being handed was slot
       names, dotted counts, "1 people" and a standing on how somebody's answers were rated. It
       reaches nobody now. See the-table-is-for-the-engine. */
    const board: any = await boardFor('u-amara');
    expect(board.theTable).toBeNull();
    expect(JSON.stringify(board)).not.toContain('standing: THIN');
    expect(JSON.stringify(board)).not.toContain('1 people answered');
  });

  it('and so does every line of what has happened over time', async () => {
    const board: any = await boardFor('u-amara');
    const lines = board.overTime.dependencies.map((d: any) => d.say);
    expect(lines[0]).toMatch(/^You are waiting on the credit committee/);
    expect(lines[1]).toContain('Daniel Osei is waiting on the customers');
    expect(lines.join(' ').toLowerCase()).not.toContain('the initiator');
    expect(lines.join(' ')).not.toContain('Participant A');
  });
});

describe('what the participant reads on the same board', () => {
  it('still gets no judgement at all - naming it must not hand it over', async () => {
    const board: any = await boardFor('u-daniel');
    expect(board.theJudgement).toBeNull();
    expect(board.theTable).toBeNull();
  });

  it('and no read across the sessions, which is the lead\'s', async () => {
    const board: any = await boardFor('u-daniel');
    expect(board.overTime).toBeNull();
  });
});
