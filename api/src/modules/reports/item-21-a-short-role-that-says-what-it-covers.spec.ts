import { ReportsService } from './reports.service';
import { gapsOverTime, overTimeForThisReader } from './what-the-record-shows-over-time';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * ITEM 21, THE ENGINEERING BOARD: A SHORT ROLE THAT SAYS WHAT IT COVERS IS NOT "A TITLE ALONE".
 *
 * "Rebuilding the payments integration" (local test database, c6e70dcb): Ifeoma, who runs it, read
 * "Rita Adeleke is down as "Finance operations. Owns daily reconciliation", and nothing on record says
 * what that role covers." and "Samuel Otieno is down as "Senior engineer, doing the build", and
 * nothing on record says what that role covers." Both say what the role covers. Any description of
 * five words or fewer was read as a job title alone. Served to the lead only, as before.
 */
const at = (d: number) => new Date(`2026-09-0${d}T09:00:00Z`);
const person = (id: string, first: string, last: string, lead = false) => ({ id, partyType: lead ? PartyType.INITIATOR : PartyType.PARTICIPANT, roleAsDescribed: null, email: `${id}@pay.test`, createdAt: at(lead ? 1 : 2), user: { firstName: first, lastName: last } });
const PEOPLE = [person('p-ifeoma', 'Ifeoma', 'Chukwu', true), person('p-rita', 'Rita', 'Adeleke'), person('p-samuel', 'Samuel', 'Otieno')];
const holds = { lines: 12, checkable: 2, documented: 0, openCommitments: 0, owedToOthers: 0, sessions: 1 };
const gaps = gapsOverTime([
  { participantId: 'p-rita', label: 'Participant A', expected: 'Finance operations. Owns daily reconciliation.', ...holds },
  { participantId: 'p-samuel', label: 'Participant B', expected: 'Senior engineer, doing the build.', ...holds },
  { participantId: 'p-lead', label: 'Participant C', expected: 'Government Liaison Consultant', ...holds },
]);
const overTime = { sessions: 1, commitments: [], dependencies: [], patterns: [], gaps, stillOpen: [], cannotTellYou: [], toSettleFirst: [] };
const ground = (report: any): any => ({ scenario: GroundScenario.NEW_PROJECT, peersVisibleToEachOther: true, participants: PEOPLE, report });
const readAs = (report: any, participantId: string | null, isLead: boolean) =>
  (Object.create(ReportsService.prototype) as ReportsService).theReportAsItWasShared(ground(report), participantId, isLead) as any;
const SINCE = 'Since then, the record holds 1 check-in, 12 lines of what was said, 2 with a name, a number or a date in them and none backed by a document.';

describe('a short role that says what it covers', () => {
  it('Ifeoma, who runs it, reads what each role covers', () => {
    const says = readAs({ overTime }, 'p-ifeoma', true).overTime.gaps.map((g: any) => g.say);
    expect(says[0]).toBe(`Rita Adeleke works in finance operations. Rita owns daily reconciliation. ${SINCE}`);
    expect(says[1]).toBe(`Samuel Otieno is a senior engineer, doing the build. ${SINCE}`);
  });
  it('a title alone still says so', () => {
    expect(gaps[2].say).toBe(`Participant C is down as "Government Liaison Consultant", and nothing on record says what that role covers. ${SINCE}`);
  });
  it('Rita, who checks in, is given none of it, as before', () => {
    const theirs = overTimeForThisReader(overTime as any, { isLead: false, participantId: 'p-rita' });
    expect(readAs({ overTime: theirs }, 'p-rita', false).overTime.gaps).toEqual([]);
  });
});
