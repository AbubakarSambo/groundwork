import { ReportsService } from './reports.service';
import { gapsOverTime, overTimeForThisReader } from './what-the-record-shows-over-time';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * WHAT THE LEAD READS UNDER "WHAT THE RECORD SHOWS", AND WHAT NOBODY ELSE DOES.
 *
 * Sales, run 10, on the lead's report and the lead's board, eighteen times each: "Ngozi Eze was taken
 * on for: Relationship officer, Ikeja. Target 14 approved facilities this quarter. What the record
 * holds about it: 1 session on reco...", with the same description served again, raw, beside it.
 * Asserted through `theReportAsItWasShared`, as the lead and as the person it is about.
 */

/* tools/score_run.py, PROBLEMS: "role description used as a name" and "slot names glued to answers". */
const ROLE_AS_A_NAME = /\. Target \d+ [a-z ]+this quarter\.|(?<=[a-z])\. Target \d+/;
const SLOT_NAMES = /(said this was for:|What they report:|Where they say they stand now:|What they say is in the way:|reported this:|named this as being in the way:)/;

const at = (d: number) => new Date(`2026-09-0${d}T09:00:00Z`);
const LEAD = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'bisi@bank.test', createdAt: at(1), user: { firstName: 'Bisi', lastName: 'Adeyemi' } };
const NGOZI = { id: 'p-ngozi', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'ngozi@bank.test', createdAt: at(2), user: { firstName: 'Ngozi', lastName: 'Eze' } };

const gaps = gapsOverTime([
  { participantId: 'p-ngozi', label: 'Participant A', expected: 'Relationship officer, Ikeja. Target 14 approved facilities this quarter.', lines: 6, checkable: 1, documented: 0, openCommitments: 1, owedToOthers: 0, sessions: 1 },
  { participantId: 'p-lead', label: 'the initiator', expected: 'Manages the three relationship officers in Lagos. Owns the quarterly target.', lines: 9, checkable: 4, documented: 1, openCommitments: 0, owedToOthers: 0, sessions: 1 },
]);
const overTime = { sessions: 1, commitments: [], dependencies: [], patterns: [], gaps, stillOpen: [], cannotTellYou: [], toSettleFirst: [] };
const ground = (report: any): any => ({ scenario: GroundScenario.PULSE_CHECK, peersVisibleToEachOther: true, participants: [LEAD, NGOZI], report });
const readAs = (report: any, participantId: string | null, isLead: boolean) =>
  (Object.create(ReportsService.prototype) as ReportsService).theReportAsItWasShared(ground(report), participantId, isLead) as any;

describe('a gap over time is served as its sentence', () => {
  it('the lead reads whole sentences, with names, and nothing else on the row', () => {
    const served = readAs({ overTime }, 'p-lead', true).overTime.gaps;
    expect(served).toEqual([
      {
        participantId: 'p-ngozi',
        who: 'Ngozi Eze',
        say: 'Ngozi Eze is a relationship officer for Ikeja, with a goal of 14 approved facilities this quarter. '
          + 'Since then, the record holds 1 session, 6 lines of what was said, 1 with a name, a number or a date in it, '
          + 'none backed by a document and 1 commitment still open.',
      },
      {
        participantId: 'p-lead',
        who: 'You',
        say: 'The role written down for you is to manage the three relationship officers in Lagos, and to own the quarterly target. '
          + 'Since then, the record holds 1 session, 9 lines of what was said, 4 with a name, a number or a date in them '
          + 'and 1 backed by a document.',
      },
    ]);
    const text = JSON.stringify(served);
    expect(text).not.toMatch(ROLE_AS_A_NAME);
    expect(text).not.toMatch(SLOT_NAMES);
  });

  it('a stored row written the old way loses the raw description at the read too', () => {
    const old = { ...overTime, gaps: [{ participantId: 'p-ngozi', who: 'Participant A', expected: 'Relationship officer, Ikeja. Target 14 approved facilities this quarter.', recordHolds: '1 session on record', say: 'x' }] };
    expect(readAs({ overTime: old }, 'p-lead', true).overTime.gaps[0]).toEqual({ participantId: 'p-ngozi', who: 'Ngozi Eze', say: 'x' });
  });

  it('the person it is about is given none of it, as before', () => {
    const theirs = overTimeForThisReader(overTime as any, { isLead: false, participantId: 'p-ngozi' });
    expect(readAs({ overTime: theirs }, 'p-ngozi', false).overTime.gaps).toEqual([]);
  });
});
