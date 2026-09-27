import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * THE CHECK-INS LIST GIVES EACH READER ONLY WHAT THE CHECK-IN'S OWN PAGE WOULD (C1, U.5).
 *
 * `list()` used to send the whole row to every reader. So a participant, even the person a
 * probation check-in is about, was handed the broadcast join link, everybody's email address while
 * the lead keeps them private, and the report's agreements and differences before the report was
 * released to them. Asserted on the real `list()` output, for each reader.
 */

const LEAD = 'user-lead';
const PART = 'user-part';
const ADMIN = 'user-admin';

function ground(): any {
  return {
    id: 'g1', organizationId: 'org1', initiatorId: LEAD, label: 'Sales team, Q3', status: 'ACTIVE',
    scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', timelineDays: 84, updatedAt: new Date('2026-09-20'),
    joinToken: 'secret-join-token', groundAuditLog: [{ what: 'renamed' }], restrictExternalVisibility: true,
    participants: [
      { id: 'p-lead', userId: LEAD, email: 'wairimu@baridi.test', partyType: 'INITIATOR', createdAt: new Date('2026-09-01'), user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-part', userId: PART, email: 'miriam@baridi.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-02'), user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
      { id: 'p-omar', userId: 'user-omar', email: 'omar@baridi.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-03'), user: { firstName: 'Omar', lastName: 'Ali' } },
    ],
    checkIns: [],
    report: { releasedAt: null, agreements: [{ text: 'Both agree the deck is late' }], divergences: [{ text: 'Unreleased difference' }] },
    reportRounds: [],
    dependencies: [],
    reportActivations: [],
  };
}

function serviceFor(over: any = {}) {
  const prisma: any = {
    ground: { findMany: jest.fn().mockResolvedValue([{ ...ground(), ...over }]) },
    groundParticipant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
  };
  /* The real report service, for its one naming door (theReportAsItWasShared). */
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
}

async function listAs(userId: string, role: string, over: any = {}) {
  const [row] = (await serviceFor(over).list('org1', userId, `${userId}@baridi.test`, role)) as any[];
  return row;
}

describe('the check-ins list, as each reader gets it', () => {
  it('a participant gets no join link, nobody else\'s address, and no unreleased report text', async () => {
    const row = await listAs(PART, 'MEMBER');
    expect(row.joinToken).toBeUndefined();
    expect(row.groundAuditLog).toBeUndefined();
    const emails = Object.fromEntries(row.participants.map((p: any) => [p.id, p.email]));
    expect(emails).toEqual({ 'p-lead': null, 'p-part': 'miriam@baridi.test', 'p-omar': null });
    expect(row.report).toEqual({ releasedAt: null });
    expect(JSON.stringify(row)).not.toContain('Unreleased difference');
    /* Names stay: who is in the check-in is shown to the people in it. */
    expect(row.participants.map((p: any) => p.user?.firstName)).toEqual(['Wairimu', 'Miriam', 'Omar']);
  });

  it('the lead who runs it still gets the join link and everybody\'s address', async () => {
    const row = await listAs(LEAD, 'MEMBER');
    expect(row.joinToken).toBe('secret-join-token');
    expect(row.participants.every((p: any) => !!p.email)).toBe(true);
    expect(JSON.stringify(row)).not.toContain('Unreleased difference');
  });

  it('an admin of the organisation gets the join link, as on the check-in\'s own page, but not the hidden addresses', async () => {
    const row = await listAs(ADMIN, 'ADMIN');
    expect(row.joinToken).toBe('secret-join-token');
    expect(row.participants.filter((p: any) => p.email).length).toBe(0);
  });
});

/*
 * U.5 REVIEW: THE PEER RULE, AND THE TEAM'S REPORT BEFORE RELEASE. Where people are not named to each
 * other, the check-in's own page shows a participant only herself; the list showed everybody, with
 * each person's session rows. And the latest round's summary is report text, given to somebody who
 * does not run the check-in only once the report is released.
 */
describe('the list, where people are not named to each other', () => {
  const hidden = {
    peersVisibleToEachOther: false,
    checkIns: [
      { id: 'c-m', participantId: 'p-part', sessionNumber: 1, status: 'COMPLETED', createdAt: new Date(), completedAt: new Date() },
      { id: 'c-o', participantId: 'p-omar', sessionNumber: 1, status: 'NOT_STARTED', createdAt: new Date(), completedAt: null },
    ],
    dependencies: [{ what: 'the deck', status: 'OPEN', createdAt: new Date(), fromParticipantId: 'p-omar', onParticipantId: 'p-lead', onLabel: 'Wairimu' }],
    reportRounds: [{ sessionNumber: 1, finding: 'Omar is behind', sharedPicture: 'Omar has not closed anything.' }],
  };

  it('a participant is given only herself: her row, her sessions, nothing owed between others', async () => {
    const row = await listAs(PART, 'MEMBER', hidden);
    expect(row.peersVisibleEffective).toBe(false);
    expect(row.participants.map((p: any) => p.id)).toEqual(['p-part']);
    expect(row.checkIns.map((c: any) => c.id)).toEqual(['c-m']);
    expect(row.dependencies).toEqual([]);
    expect(row.glance.progress).toMatchObject({ answeredThisRound: 0, ofPeople: 0 });
    expect(row.reportRounds).toBeUndefined();
    expect(JSON.stringify(row)).not.toMatch(/Omar/);
  });

  it('the lead and an admin still see everyone', async () => {
    for (const [who, role] of [[LEAD, 'MEMBER'], [ADMIN, 'ADMIN']] as const) {
      const row = await listAs(who, role, hidden);
      expect(row.participants.map((p: any) => p.id)).toEqual(['p-lead', 'p-part', 'p-omar']);
      expect(row.checkIns.map((c: any) => c.id)).toEqual(['c-m', 'c-o']);
      expect(row.latestSummary).toBe('Omar has not closed anything.');
    }
  });

  it('a participant is given the latest summary only once the report is released', async () => {
    const shown = { reportRounds: [{ sessionNumber: 1, finding: 'Deals moved', sharedPicture: 'Three deals moved.' }] };
    expect((await listAs(PART, 'MEMBER', shown)).latestSummary).toBeNull();
    const released = await listAs(PART, 'MEMBER', { ...shown, report: { releasedAt: new Date(), agreements: [], divergences: [] } });
    expect(released.latestSummary).toBe('Three deals moved.');
  });
});

/*
 * U.5 RE-REVIEW: THE SUMMARY IS STORED IN LABELS, AND IS SERVED WITH NAMES IN, THROUGH THE REPORT'S OWN
 * DOOR. Nobody reads "Participant A" or "the initiator" on the list, or on Today, which reads it.
 */
describe('the latest summary on the list, as each reader gets it', () => {
  const stored = {
    report: { releasedAt: new Date(), agreements: [], divergences: [], sharedAs: null },
    reportRounds: [{ sessionNumber: 1, finding: 'Participant B is behind.', sharedPicture: 'The initiator counts on Participant B for 4 sales. Participant A has closed 2.' }],
  };
  it('a participant reads names, never a label', async () => {
    const row = await listAs(PART, 'MEMBER', stored);
    for (const t of [row.latestSummary, row.latestFinding]) {
      expect(t).toBeTruthy();
      expect(t).not.toMatch(/Participant [A-Z]\b|the initiator/i);
    }
  });
  it('the lead reads names too', async () => {
    const row = await listAs(LEAD, 'MEMBER', stored);
    expect(row.latestSummary).not.toMatch(/Participant [A-Z]\b|the initiator/i);
    expect(row.latestSummary).toMatch(/Omar|Miriam/);
  });
  it('where people are not named to each other, a participant reads "a colleague", never a name or a label', async () => {
    const row = await listAs(PART, 'MEMBER', { ...stored, peersVisibleToEachOther: false });
    expect(row.latestSummary).not.toMatch(/Omar|Participant [A-Z]\b/);
  });
});
