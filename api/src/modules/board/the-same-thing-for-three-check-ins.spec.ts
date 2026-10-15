import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { whatHasStayedTheSame, theCheckInItWasFirstSaidIn } from './the-same-thing-for-three-check-ins';
import { Logger } from '@nestjs/common';

/**
 * WEEK 12: THE PROTOTYPE'S ALERT, "Samuel has chased the same 5 leads for 3 check-ins", SERVED FROM
 * THE RECORD, AS THE LEAD, A PARTICIPANT AND AN ADMIN WHO ONLY READS EACH READ THE BOARD.
 *
 * Only the lead reads it. It is never a label, never a score, never "at risk", and never an email
 * address where a name belongs.
 */

const LEAD = {
  id: 'p-lead', userId: 'u-wairimu', partyType: PartyType.INITIATOR, email: 'w@baridi.test',
  roleAsDescribed: 'runs the sales team', nameGiven: null, organisationGiven: null, managingOnly: true,
  createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Wairimu', lastName: 'Kamau' },
};
const SAMUEL = {
  id: 'p-samuel', userId: 'u-samuel', partyType: PartyType.PARTICIPANT, email: 's@baridi.test',
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Samuel', lastName: 'Kariuki' },
};
/* Joined and never gave a name: only her address is known, and it must never stand in for a name. */
const ZAWADI = {
  id: 'p-zawadi', userId: 'u-zawadi', partyType: PartyType.PARTICIPANT, email: 'zawadi.u8@example.test',
  roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: null, lastName: null, email: 'zawadi.u8@example.test' },
};

const at = (d: string) => new Date(`2026-09-${d}T16:00:00Z`);
const CHECK_INS = [
  ...[1, 2, 3].map((n) => ({ id: `cs${n}`, participantId: 'p-samuel', sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: at(String(7 * n + 1).padStart(2, '0')), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' } })),
  ...[1, 2, 3].map((n) => ({ id: `cz${n}`, participantId: 'p-zawadi', sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: at(String(7 * n + 1).padStart(2, '0')), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' } })),
];

const GROUND: any = {
  id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
  initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'THEIR_OWN', label: 'Sales team, Q3',
  participants: [LEAD, SAMUEL, ZAWADI],
  checkIns: CHECK_INS,
  report: null,
  objectives: [],
  dependencies: [
    /* Samuel said it in check-in 1 (08 Sep) and again in check-in 3. */
    { id: 'd1', groundId: 'g-sales', fromParticipantId: 'p-samuel', onParticipantId: null, onLabel: 'Lakeside',
      what: 'The signed order from Lakeside', status: 'WAITING', triedSaid: 'I emailed them once', escalatedAt: null,
      sourceCheckInId: 'cs3', createdAt: at('08'), updatedAt: at('22') },
    /* Zawadi said it in check-in 1 and never again: not "still in the way", so not said. */
    { id: 'd2', groundId: 'g-sales', fromParticipantId: 'p-zawadi', onParticipantId: null, onLabel: null,
      what: 'the price list', status: 'WAITING', triedSaid: null, escalatedAt: null,
      sourceCheckInId: 'cz1', createdAt: at('08'), updatedAt: at('08') },
  ],
  poll: null,
};

const COMMITMENTS = [
  { participantId: 'p-samuel', text: 'follow up the same 5 leads', status: 'UNKNOWN', statedInSession: 1, saidAgainIn: [2, 3], explicit: true, source: 'CHECK_IN', saidWordForWord: true },
  { participantId: 'p-zawadi', text: 'I will send the new prices to every shop.', status: 'UNKNOWN', statedInSession: 1, saidAgainIn: [2, 3], explicit: true, source: 'CHECK_IN', saidWordForWord: true },
];

const WRITES = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];

function prismaFor(viewerRole = 'MEMBER', data: { ground: any; checkIns: any[]; commitments: any[] } = { ground: GROUND, checkIns: CHECK_INS, commitments: COMMITMENTS }) {
  const writes: string[] = [];
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    aggregate: jest.fn(async () => ({ _max: { sessionNumber: 3 } })),
  };
  const model = (name: string, own: Record<string, any> = {}) => new Proxy({ ...reads, ...own }, {
    get(target: any, prop: string) {
      if (WRITES.includes(prop)) return jest.fn(async () => { writes.push(`${name}.${prop}`); return {}; });
      return target[prop];
    },
  });
  const prisma: any = new Proxy({
    ground: model('ground', { findUnique: jest.fn(async () => structuredClone(data.ground)) }),
    user: model('user', { findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })) }),
    checkIn: model('checkIn', { findMany: jest.fn(async () => structuredClone(data.checkIns)) }),
    groundCommitment: model('groundCommitment', { findMany: jest.fn(async () => JSON.parse(JSON.stringify(data.commitments))) }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model(prop);
      return target[prop];
    },
  });
  return { prisma, writes };
}

function boardFor(requestingUserId: string, viewerRole = 'MEMBER', data?: { ground: any; checkIns: any[]; commitments: any[] }) {
  const { prisma, writes } = prismaFor(viewerRole, data);
  const respond = jest.fn(async () => null);
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(prisma, { respond } as any, { getSessionProgress: async () => null } as any, reports);
  return { board: svc.get('g-sales', requestingUserId) as Promise<any>, writes, respond };
}

describe('the same thing for three check-ins, as each reader reads the board', () => {
  it('the lead reads it in the prototype’s form, with what happened and what would change it', async () => {
    const { board, writes, respond } = boardFor('u-wairimu');
    const b = await board;
    const lines = (b.toLookAt ?? []).map((t: any) => `${t.says} ${t.detail}`);
    expect(lines).toEqual([
      'Samuel Kariuki has had the same thing in the way for 3 check-ins. Samuel first said in check-in 1 that the signed order from Lakeside was in the way, and said so again in check-in 3. So far it has only been asked about. Chasing it, or asking someone else, would move it.',
      'Samuel Kariuki has made the same promise for 3 check-ins. Samuel promised to follow up the same 5 leads in check-ins 1, 2 and 3. Nobody has said yet whether it happened. Asking Samuel what is stopping it, or agreeing to drop it, would settle it.',
      'A colleague has made the same promise for 3 check-ins. In check-ins 1, 2 and 3, this colleague said, "I will send the new prices to every shop." Nobody has said yet whether it happened. Asking this colleague what is stopping it, or agreeing to drop it, would settle it.',
    ]);
    expect(b.toLookAt[0].participantId).toBe('p-samuel');
    /* Opening the board still writes nothing and asks the model for nothing. */
    expect(writes).toEqual([]);
    expect(respond).not.toHaveBeenCalled();
  });

  it('never an email address, a label, a score or "at risk"', async () => {
    const text = JSON.stringify((await boardFor('u-wairimu').board).toLookAt);
    expect(text).not.toMatch(/@|example\.test/);
    expect(text).not.toMatch(/at risk|PIP|exit|score|rating|vague|specific/i);
  });

  it('a participant reads none of it, not even their own', async () => {
    const b = await boardFor('u-samuel').board;
    expect(b.toLookAt).toBeUndefined();
    expect(JSON.stringify(b)).not.toMatch(/same promise|same thing in the way/);
  });

  /* Changed by decision 93, row 9. This pinned "an admin who only reads reads none of it", the restriction Hafsah removed. */
  it('an admin who only reads reads the same sentences the lead does', async () => {
    const b = await boardFor('u-grace', 'ADMIN').board;
    const lead = await boardFor('u-wairimu').board;
    expect(b.toLookAt.length).toBeGreaterThan(0);
    expect(b.toLookAt).toEqual(lead.toLookAt);
  });
});

describe('what counts as the same thing for three check-ins', () => {
  const samuel = { participantId: 'p1', who: 'Samuel', finished: [1, 2, 3] };

  it('not before three check-ins (decision 8)', () => {
    expect(whatHasStayedTheSame([samuel], [{ participantId: 'p1', text: 'call Lakeside', status: 'UNKNOWN', statedInSession: 2, saidAgainIn: [3], theirWords: true }], [])).toEqual([]);
    expect(whatHasStayedTheSame([samuel], [], [{ fromParticipantId: 'p1', what: 'the lease', status: 'WAITING', firstSaidIn: 2, lastSaidIn: 3, tried: 'nothing' }])).toEqual([]);
  });

  it('not a promise that was settled, nor a blocker that cleared or that they found a way round', () => {
    expect(whatHasStayedTheSame([samuel], [{ participantId: 'p1', text: 'call Lakeside', status: 'DONE', statedInSession: 1, saidAgainIn: [2, 3], theirWords: true }], [])).toEqual([]);
    for (const d of [{ status: 'CLEARED', tried: 'nothing' }, { status: 'WAITING', tried: 'went-around' }] as const) {
      expect(whatHasStayedTheSame([samuel], [], [{ fromParticipantId: 'p1', what: 'the lease', firstSaidIn: 1, lastSaidIn: 3, ...d }])).toEqual([]);
    }
  });

  it('not a blocker nobody has said again in their latest check-in', () => {
    expect(whatHasStayedTheSame([{ ...samuel, finished: [1, 2, 3, 4] }], [], [{ fromParticipantId: 'p1', what: 'the lease', status: 'WAITING', firstSaidIn: 1, lastSaidIn: 3, tried: 'nothing' }])).toEqual([]);
  });

  it('what they wait on with the reader asks the reader', () => {
    const [t] = whatHasStayedTheSame([samuel], [], [{ fromParticipantId: 'p1', what: 'your sign-off on the discount', status: 'WAITING', firstSaidIn: 1, lastSaidIn: 3, tried: 'asked-once', onTheReader: true }]);
    expect(`${t.says} ${t.detail}`).toBe('Samuel has had the same thing in the way for 3 check-ins. Samuel first said in check-in 1 that your sign-off on the discount was in the way, and said so again in check-in 3. It is waiting on you. Giving Samuel an answer, or saying when you will, would move it.');
  });

  it('a promise not in their own words is not put in quotation marks', () => {
    const [t] = whatHasStayedTheSame([samuel], [{ participantId: 'p1', text: 'I will call Lakeside', status: 'UNKNOWN', statedInSession: 1, saidAgainIn: [2, 3], theirWords: false }], []);
    expect(t.detail).toBe('Samuel made it in check-ins 1, 2 and 3. Nobody has said yet whether it happened. Asking Samuel what is stopping it, or agreeing to drop it, would settle it.');
    expect(t.detail).not.toContain('"');
  });

  it('uses the whole name once and the first name after it, unless two people share a first name', () => {
    const promise = (id: string) => ({ participantId: id, text: 'call Lakeside', status: 'UNKNOWN', statedInSession: 1, saidAgainIn: [2, 3], theirWords: true });
    const [one] = whatHasStayedTheSame([{ participantId: 'p1', who: 'Samuel Kariuki', finished: [1, 2, 3] }], [promise('p1')], []);
    expect(`${one.says} ${one.detail}`).toBe('Samuel Kariuki has made the same promise for 3 check-ins. Samuel promised to call Lakeside in check-ins 1, 2 and 3. Nobody has said yet whether it happened. Asking Samuel what is stopping it, or agreeing to drop it, would settle it.');
    const two = whatHasStayedTheSame([
      { participantId: 'p1', who: 'Samuel Kariuki', finished: [1, 2, 3] },
      { participantId: 'p2', who: 'Samuel Otieno', finished: [1, 2, 3] },
    ], [promise('p1'), promise('p2')], []);
    expect(two.map((t) => t.detail)).toEqual([
      'Samuel Kariuki promised to call Lakeside in check-ins 1, 2 and 3. Nobody has said yet whether it happened. Asking Samuel Kariuki what is stopping it, or agreeing to drop it, would settle it.',
      'Samuel Otieno promised to call Lakeside in check-ins 1, 2 and 3. Nobody has said yet whether it happened. Asking Samuel Otieno what is stopping it, or agreeing to drop it, would settle it.',
    ]);
    const [eze] = whatHasStayedTheSame([{ participantId: 'p1', who: 'Mr Eze Okafor', finished: [1, 2, 3] }], [promise('p1')], []);
    expect(eze.detail).toMatch(/^Mr Eze promised/);
  });

  it('reads the check-in something was first said in from when its row was written', () => {
    const theirs = [1, 2, 3].map((n) => ({ sessionNumber: n, completedAt: at(String(7 * n + 1).padStart(2, '0')) }));
    expect(theCheckInItWasFirstSaidIn(new Date('2026-09-08T16:05:00Z'), theirs)).toBe(1);
    expect(theCheckInItWasFirstSaidIn(new Date('2026-09-15T15:00:00Z'), theirs)).toBe(2);
  });
});

/**
 * SCREENS REQUEST 3c: THE SAME LINES ON THE LATEST REPORT, AS THE LEAD READS IT (GET /grounds/:id/report).
 * Built from the stored rows at the read, with no model asked and nothing written; a participant and
 * an admin who only reads get no field at all.
 */
function reportFor(requestingUserId: string, viewerRole = 'MEMBER') {
  const { prisma, writes } = prismaFor(viewerRole);
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = new Logger('test');
  /* The report as it was stored and served before this read: what this test checks is the field added to it. */
  svc.getAsBuilt = jest.fn(async () => ({ groundId: 'g-sales', report: { findings: [] } }));
  return { report: (svc as ReportsService).get('g-sales', requestingUserId, 'org-1') as Promise<any>, writes };
}

describe('the same thing for three check-ins, as each reader reads the latest report', () => {
  it('the lead reads the same sentences as on the board', async () => {
    const { report, writes } = reportFor('u-wairimu');
    const r = await report;
    const board = await boardFor('u-wairimu').board;
    expect(r.toLookAt).toEqual(board.toLookAt);
    expect((r.toLookAt ?? []).map((t: any) => `${t.says} ${t.detail}`)).toEqual([
      'Samuel Kariuki has had the same thing in the way for 3 check-ins. Samuel first said in check-in 1 that the signed order from Lakeside was in the way, and said so again in check-in 3. So far it has only been asked about. Chasing it, or asking someone else, would move it.',
      'Samuel Kariuki has made the same promise for 3 check-ins. Samuel promised to follow up the same 5 leads in check-ins 1, 2 and 3. Nobody has said yet whether it happened. Asking Samuel what is stopping it, or agreeing to drop it, would settle it.',
      'A colleague has made the same promise for 3 check-ins. In check-ins 1, 2 and 3, this colleague said, "I will send the new prices to every shop." Nobody has said yet whether it happened. Asking this colleague what is stopping it, or agreeing to drop it, would settle it.',
    ]);
    expect(JSON.stringify(r.toLookAt)).not.toMatch(/@|example\.test|at risk|PIP|score|rating/i);
    /* Opening the report rebuilds nothing: this read writes nothing (and has no model to ask). */
    expect(writes).toEqual([]);
  });

  it('a participant reads none of it, not even their own', async () => {
    const r = await reportFor('u-samuel').report;
    expect(r).not.toHaveProperty('toLookAt');
    expect(JSON.stringify(r)).not.toMatch(/same promise|same thing in the way/);
  });

  /* Changed by decision 93, row 9. This pinned "an admin who only reads reads none of it", the restriction Hafsah removed. */
  it('an admin who only reads reads the same sentences the lead does', async () => {
    const r = await reportFor('u-grace', 'ADMIN').report;
    const lead = await reportFor('u-wairimu').report;
    expect(r.toLookAt.length).toBeGreaterThan(0);
    expect(r.toLookAt).toEqual(lead.toLookAt);
  });
});

/**
 * SCREENS REQUEST 11: EACH PERSON TODAY, WITH WHAT KEEPS COMING UP UNDER THEIR LINE, from the same
 * read as toLookAt, to the lead only.
 */
describe('what keeps coming up, under each person on the lead’s board', () => {
  it('the lead reads it under Samuel, and a line that no longer says nothing needs them', async () => {
    const b = await boardFor('u-wairimu').board;
    const samuel = (b.eachPersonToday ?? []).find((r: any) => r.participantId === 'p-samuel');
    expect(samuel).toBeDefined();
    expect(samuel.who).toBe('Samuel Kariuki');
    expect(samuel.keepsComingUp).toBe('Samuel Kariuki has had the same thing in the way for 3 check-ins.');
    expect(samuel.line).not.toMatch(/nothing here needs you/);
    const zawadi = b.eachPersonToday.find((r: any) => r.participantId === 'p-zawadi');
    expect(zawadi.keepsComingUp).toBe('A colleague has made the same promise for 3 check-ins.');
    expect(JSON.stringify(b.eachPersonToday)).not.toMatch(/@|example\.test|at risk|PIP|score|rating/i);
    /* The rows are the lead's rows, one for each: nobody is added or dropped. */
    expect(b.eachPersonToday.map((r: any) => r.participantId)).toEqual(b.eachPerson.map((r: any) => r.participantId));
  });

  it('a participant gets no field', async () => {
    const b = await boardFor('u-samuel', 'MEMBER').board;
    expect(b).not.toHaveProperty('eachPersonToday');
    expect(JSON.stringify(b)).not.toMatch(/same promise|same thing in the way/);
  });

  /* Changed by decision 93, row 9. This pinned "a participant and an admin who only reads get no field". */
  it('an admin who only reads reads the same lines under each person as the lead, with no conversation point', async () => {
    const b = await boardFor('u-grace', 'ADMIN').board;
    const lead = await boardFor('u-wairimu').board;
    const noPoints = (rows: any[]) => rows.map(({ conversationPoints: _c, ...r }) => r);
    expect(noPoints(b.eachPersonToday)).toEqual(noPoints(lead.eachPersonToday));
    expect(b.eachPersonToday.find((r: any) => r.participantId === 'p-samuel').keepsComingUp)
      .toBe('Samuel Kariuki has had the same thing in the way for 3 check-ins.');
    expect(JSON.stringify(b.eachPersonToday)).not.toContain('conversationPoints');
  });
});

/*
 * AND A ROW THAT SAID "NOTHING HERE NEEDS YOU" WHILE SOMETHING KEEPS COMING UP. Aisha has checked
 * in three times with nothing in her way, so her row on its own says nothing needs the lead; she has
 * also made the same promise in all three, so something does.
 */
describe('a line that said nothing needs you, when something keeps coming up', () => {
  const AISHA = {
    id: 'p-aisha', userId: 'u-aisha', partyType: PartyType.PARTICIPANT, email: 'a@baridi.test',
    roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
    createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Aisha', lastName: 'Mwangi' },
  };
  const aishasCheckIns = [1, 2, 3].map((n) => ({ id: `ca${n}`, participantId: 'p-aisha', sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: at(String(7 * n + 1).padStart(2, '0')), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' } }));
  const data = {
    ground: { ...GROUND, participants: [LEAD, AISHA], checkIns: aishasCheckIns, dependencies: [] },
    checkIns: aishasCheckIns,
    commitments: [{ participantId: 'p-aisha', text: 'visit Green Mart with the new price list', status: 'UNKNOWN', statedInSession: 1, saidAgainIn: [2, 3], explicit: true, source: 'CHECK_IN', saidWordForWord: true }],
  };

  /*
   * CHANGED 1 OCTOBER 2026 (review of 1 October, section 3). This used to pin her row, `eachPerson`,
   * at "has checked in, and nothing here needs you this week." while the same board said she had
   * made the same promise for 3 check-ins: the page contradicting itself, which is the defect. Her
   * row now says what `eachPersonToday` says, on every list the lead reads.
   */
  it('neither her row nor the line under what keeps coming up says nothing needs the lead', async () => {
    const b = await boardFor('u-wairimu', 'MEMBER', data).board;
    const row = b.eachPerson.find((r: any) => r.participantId === 'p-aisha');
    expect(row.says).toBe('Aisha Mwangi has checked in.');
    expect(row.says).not.toMatch(/nothing here needs you/);
    const today = b.eachPersonToday.find((r: any) => r.participantId === 'p-aisha');
    expect(today.keepsComingUp).toBe('Aisha Mwangi has made the same promise for 3 check-ins.');
    expect(today.line).toBe('Aisha Mwangi has checked in.');
    expect(today.line).not.toMatch(/nothing here needs you/);
    /* A whole sentence: a capital at the start, one full stop at the end, no dangling comma. */
    expect(today.line).toMatch(/^[A-Z][^,]*[a-z]\.$/);
  });
});
