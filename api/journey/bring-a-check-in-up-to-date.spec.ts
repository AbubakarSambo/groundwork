import { run, whatWouldChange, writeTheChanges, whatWouldChangeSays } from './bring-a-check-in-up-to-date';
import { REVIEW_5_PEOPLE, REVIEW_5_OBJECTIVES, REVIEW_5_WAITS, REVIEW_5_DEALS, REVIEW_5_LINES, REVIEW_5_TURNS, review5, RUKIA_RUNS_IT, AMANI, GRACE_SET_IT_UP } from '../src/modules/board/__fixtures__/sales-board-review-5';
import { boardAs } from '../src/modules/board/the-switchboards-sections-harness';

/**
 * BRINGING "SALES TEAM, Q3" UP TO TODAY'S RULES (screens request 117, parts 1, 2, 4, 6 and 11).
 *
 * Neema's wait on "the warehouse" is the model's reading of her check-in, and stays: only the model can read it again.
 * The check-in's stored rows, as the fifth review read them, in a database double that keeps every row and every
 * write. The script's dry run says what would change and writes nothing; its write changes those rows only; and the
 * board read afterwards, as each reader, no longer says what the review found. Nobody's words are written.
 */
const LOCAL = 'postgresql://someone@localhost:5432/gw_test';
const HOSTED = 'postgresql://release:secret@db.example-host.net:5432/groundwork?sslmode=require';

function theStoredCheckIn() {
  const rows: Record<string, any[]> = {
    ground: [{ id: 'g-1', label: 'Sales team, Q3', initiatorId: 'u-rukia', participants: REVIEW_5_PEOPLE.map((p) => ({ ...p })) }],
    groundDependency: REVIEW_5_WAITS.map((d) => ({ ...d })),
    groundObjective: REVIEW_5_OBJECTIVES.map((o) => ({ ...o })),
    workItem: REVIEW_5_DEALS.map((i) => ({ ...i })),
    recordEntry: REVIEW_5_LINES.map((l) => ({ ...l })),
    conversationTurn: REVIEW_5_TURNS.map((t, i) => ({ id: `t${i}`, role: 'PERSON', ...t })),
    checkIn: [],
    groundObjectiveSnapshot: [{ id: 's1', objectiveId: 'o-said-again', sessionNumber: 1, count: 12 }],
  };
  const writes: string[] = [];
  const table = (name: string) => ({
    findMany: jest.fn(async (a: any = {}) => rows[name].filter((r) => {
      const w = a.where ?? {};
      if (w.id && r.id !== w.id) return false;
      if (w.groundId && r.groundId && r.groundId !== w.groundId) return false;
      if (w.checkInId && r.checkInId !== w.checkInId) return false;
      if (w.role && r.role !== w.role) return false;
      return true;
    })),
    update: jest.fn(async ({ where, data }: any) => { writes.push(`${name}.update ${where.id}`); Object.assign(rows[name].find((r) => r.id === where.id), data); return {}; }),
    updateMany: jest.fn(async ({ where, data }: any) => { writes.push(`${name}.updateMany ${where.objectiveId}`); rows[name].filter((r) => r.objectiveId === where.objectiveId).forEach((r) => Object.assign(r, data)); return { count: 1 }; }),
    delete: jest.fn(async ({ where }: any) => { writes.push(`${name}.delete ${where.id}`); rows[name] = rows[name].filter((r) => r.id !== where.id); return {}; }),
  });
  const prisma: any = Object.fromEntries(Object.keys(rows).map((k) => [k, table(k)]));
  prisma.$disconnect = jest.fn(async () => undefined);
  return { prisma, rows, writes };
}

describe('the dry run says what today\'s rules would change, and writes nothing', () => {
  it('on "Sales team, Q3"', async () => {
    const db = theStoredCheckIn();
    const said: string[] = [];
    const r = await run({ url: LOCAL, args: ['--dry-run'], prismaFor: () => db.prisma, ask: async () => null, say: (l) => said.push(l) });
    expect(r).toEqual({ wrote: false, refused: null });
    expect(db.writes).toEqual([]);
    expect(said).toEqual([
      '1 check-in was read. 9 things would change.',
      'Sales team, Q3: Rukia Otieno\'s own thing to do, "to approve a discount for Baraka Mwangi and to send a price list to Amani Wekesa", is stored as a wait on "themselves". It would be taken off, because nobody waits on themselves.',
      'Sales team, Q3: the target "They want us to sign 12 shops by 20 December" is stored at 12, read from a line that only said the aim: "Success means twelve signed supply contracts with shops, and I want us to sign 12 shops by 20 December". It would go back to 0.',
      'Sales team, Q3: the team\'s aim "Sign 12 shops for kitchen appliances in Nairobi" has no number, though its own name holds 12. It would hold 12.',
      'Sales team, Q3: the target "They want us to sign 12 shops by 20 December" is the team\'s aim "Sign 12 shops for kitchen appliances in Nairobi" said again. It would be taken off.',
      'Sales team, Q3: the team\'s aim "Sign 12 shops for kitchen appliances in Nairobi" would keep the day it was said to be due by, 20 December.',
      'Sales team, Q3: the target "They want to get 12 shops onboarded" is the team\'s aim "Sign 12 shops for kitchen appliances in Nairobi" said again. It would be taken off.',
      'Sales team, Q3: Amani Wekesa\'s own aim "3 shops in Kilimani by 20 December" would keep "3 shops in Kilimani" as its name and 20 December as its date.',
      'Sales team, Q3: Rukia Otieno said, "I have signed Tuskys Westgate already, on 18 September". The Tuskys Westgate deal has nobody\'s name on it, so Rukia Otieno, who runs it, would be asked on the board whether it is Rukia Otieno\'s deal. Nobody\'s name is set until then.',
      'Sales team, Q3: Rukia Otieno said, "I will visit Naivas Karen on Monday to show them the cookers". The Naivas Karen deal has nobody\'s name on it, so Rukia Otieno, who runs it, would be asked on the board whether it is Rukia Otieno\'s deal. Nobody\'s name is set until then.',
      'This was a dry run. Nothing was written.',
    ]);
  });

  it('a hosted database is a dry run unless the host is typed back, and refused without --hosted-database', async () => {
    const refused = await run({ url: HOSTED, args: [], prismaFor: () => theStoredCheckIn().prisma, ask: async () => null, say: () => undefined });
    expect(refused.wrote).toBe(false);
    expect(refused.refused).toMatch(/not on this machine/);
    const db = theStoredCheckIn();
    const wrongHost = await run({ url: HOSTED, args: ['--hosted-database', '--write'], prismaFor: () => db.prisma, ask: async () => 'db.other-host.net', say: () => undefined });
    expect(wrongHost.wrote).toBe(false);
    expect(db.writes).toEqual([]);
    const dry = await run({ url: HOSTED, args: ['--hosted-database'], prismaFor: () => db.prisma, ask: async () => 'db.example-host.net', say: () => undefined });
    expect(dry.wrote).toBe(false);
    expect(db.writes).toEqual([]);
  });
});

describe('the write, and the board afterwards', () => {
  async function broughtUpToDate() {
    const db = theStoredCheckIn();
    await writeTheChanges(db.prisma, await whatWouldChange(db.prisma));
    return db;
  }

  it('changes only the rows it said, and none of anybody\'s words', async () => {
    const db = await broughtUpToDate();
    expect(db.rows.recordEntry).toEqual(REVIEW_5_LINES);
    expect(db.rows.conversationTurn.map((t) => t.content)).toEqual(REVIEW_5_TURNS.map((t) => t.content));
    expect(db.rows.groundDependency.map((d) => d.id)).toEqual(['d-amani', 'd-baraka', 'd-neema']);
    expect(db.rows.groundObjective.map((o) => [o.id, o.name, o.target, o.count])).toEqual([
      ['o-team', 'Sign 12 shops for kitchen appliances in Nairobi.', 12, 0],
      ['o-amani', '3 shops in Kilimani', 3, 0],
      ['o-neema', 'shops in Karen', 4, 0],
    ]);
    expect(db.rows.workItem.find((i) => i.id === 'w-tuskys').ownerParticipantId).toBeNull();
    /* Run again, and nothing more would change. */
    expect(whatWouldChangeSays(await whatWouldChange(db.prisma))).toEqual(['1 check-in was read. Nothing would change.']);
  });

  it('the lead reads one aim, with its number, its day and no false "Met", and is asked about the deal', async () => {
    const db = await broughtUpToDate();
    const setup = review5({ objectives: db.rows.groundObjective, dependencies: db.rows.groundDependency, items: db.rows.workItem });
    for (const reader of [RUKIA_RUNS_IT, GRACE_SET_IT_UP]) {
      const b = await boardAs(setup, reader[0], reader[1]);
      const served = JSON.stringify(b);
      expect(served).not.toMatch(/"word":"Met"|12 now, up from 0|themselves/);
      expect(b.headline.question).toBe('Will we sign 12 shops for kitchen appliances in Nairobi by 20 December?');
      expect((b.objectives as any[]).map((o) => o.name)).toEqual([
        expect.stringMatching(/12 shops for kitchen appliances in Nairobi/),
        "Amani Wekesa's own aim is 3 shops in Kilimani by 20 December.",
        'Neema Achieng is aiming for 4 shops in Karen.',
      ]);
    }
    const rukia = await boardAs(setup, ...RUKIA_RUNS_IT);
    const tuskys = (rukia.workRecords as any[]).flatMap((s) => s.rows ?? []).find((r: any) => r.name === 'Tuskys Westgate');
    expect(tuskys.ownerClaim.says).toBe('You said the Tuskys Westgate deal is yours. Is it?');
  });

  it('Amani reads her own aim with its day', async () => {
    const db = await broughtUpToDate();
    const setup = review5({ objectives: db.rows.groundObjective, dependencies: db.rows.groundDependency, items: db.rows.workItem });
    const amani = await boardAs(setup, ...AMANI);
    expect((amani.objectives as any[]).find((o) => o.id === 'o-amani').name).toBe('Your own aim is 3 shops in Kilimani by 20 December.');
    expect(JSON.stringify(amani)).not.toMatch(/12 now, up from 0/);
  });
});

/**
 * REQUEST 121, PART 2: the lead's own aim, said again with no number, was left behind.
 * "You want to get 12 shops onboarded." was stored as Rukia's own aim with no number, though its name holds the team's 12.
 */
describe('the lead\'s own aim, said again with no number (request 121, part 2)', () => {
  const theLeadsOwn = () => {
    const db = theStoredCheckIn();
    const base = REVIEW_5_OBJECTIVES.find((o) => o.id === 'o-onboarded')!;
    db.rows.groundObjective.push({ ...base, id: 'o-rukia-onboarded', name: 'get 12 shops onboarded', target: null, ownerParticipantId: 'p-rukia', setByParticipantId: 'p-rukia', sortOrder: 5 });
    return db;
  };

  it('the dry run lists it, and the write takes it off', async () => {
    const db = theLeadsOwn();
    const said: string[] = [];
    await run({ url: LOCAL, args: ['--dry-run'], prismaFor: () => db.prisma, ask: async () => null, say: (l) => said.push(l) });
    expect(said).toContain('Sales team, Q3: the target "get 12 shops onboarded" is the team\'s aim "Sign 12 shops for kitchen appliances in Nairobi" said again. It would be taken off.');
    await writeTheChanges(db.prisma, await whatWouldChange(db.prisma));
    expect(db.rows.groundObjective.map((o) => o.id)).toEqual(['o-team', 'o-amani', 'o-neema']);
    expect(whatWouldChangeSays(await whatWouldChange(db.prisma))).toEqual(['1 check-in was read. Nothing would change.']);
  });

  it('nobody reads it on the board afterwards, as Rukia, Amani or the admin who set it up', async () => {
    const db = theLeadsOwn();
    await writeTheChanges(db.prisma, await whatWouldChange(db.prisma));
    const setup = review5({ objectives: db.rows.groundObjective, dependencies: db.rows.groundDependency, items: db.rows.workItem });
    for (const reader of [RUKIA_RUNS_IT, AMANI, GRACE_SET_IT_UP]) {
      const b = await boardAs(setup, reader[0], reader[1]);
      expect(JSON.stringify(b.objectives)).not.toMatch(/wants to get 12 shops onboarded|You want to get 12 shops onboarded/);
      expect(JSON.stringify(b)).not.toMatch(/7 targets are set|No number is set yet/);
    }
  });

  it('somebody else\'s own aim with no number is theirs, and stays', async () => {
    const db = theStoredCheckIn();
    const base = REVIEW_5_OBJECTIVES.find((o) => o.id === 'o-onboarded')!;
    db.rows.groundObjective.push({ ...base, id: 'o-amani-onboarded', name: 'get 12 shops onboarded', target: null, ownerParticipantId: 'p-amani', setByParticipantId: 'p-amani', sortOrder: 5 });
    await writeTheChanges(db.prisma, await whatWouldChange(db.prisma));
    expect(db.rows.groundObjective.map((o) => o.id)).toContain('o-amani-onboarded');
  });
});

/**
 * A STORED REPORT THAT SPEAKS OF MEETINGS NOBODY MENTIONED (screens requests 127, 129, 130, 131, 132, 134, 135
 * and 136; Hafsah's ask in 140, item 1).
 *
 * The line is left out when a board is served, so the screens stopped seeing it on the newest code. The row still
 * held it, which is what the screens asked to have put right: anything else that reads the row still reads the line.
 * The decision is the engine's own reading of the record, aMeetingIsOnRecord, so a check-in where somebody did
 * mention meeting someone keeps its line.
 */
function aStoredReportSaying(lines: { text: string }[], overTime: Record<string, unknown>) {
  const db = theStoredCheckIn();
  db.rows.recordEntry.length = 0;
  lines.forEach((l, i) => db.rows.recordEntry.push({ id: `r${i}`, participantId: 'p-amani', checkInId: 'c1', type: 'PROGRESS', text: l.text, saidWordForWord: true, createdAt: new Date('2026-09-01') }));
  db.rows.groundObjective.length = 0;
  db.rows.groundDependency.length = 0;
  db.rows.workItem.length = 0;
  db.rows.report = [{ id: 'rep-1', groundId: 'g-1', overTime }];
  db.prisma.report = {
    findUnique: jest.fn(async ({ where }: any) => db.rows.report.find((r: any) => r.groundId === where.groundId) ?? null),
    update: jest.fn(async ({ where, data }: any) => { db.writes.push(`report.update ${where.id}`); Object.assign(db.rows.report.find((r: any) => r.id === where.id), data); return {}; }),
  };
  return db;
}

const THE_MEETINGS = [
  'Nobody on record has said who arranged the meetings that happened, so this cannot tell you who secured them.',
  'Nobody on record has said who arranged the meetings that happened. Ask who secured each one before crediting anybody with them.',
];

describe('a stored report that speaks of meetings nobody mentioned', () => {
  const overTime = () => ({
    sessions: 2,
    cannotTellYou: ['Nobody has put a number on the backlog.', THE_MEETINGS[0]],
    toSettleFirst: [THE_MEETINGS[1], 'Who closes a refund, and when?'],
    stillOpen: [], commitments: [], dependencies: [], gaps: [], patterns: [],
  });

  it('says what it would take out, and takes out only those two lines', async () => {
    const db = aStoredReportSaying([{ text: 'I closed 40 tickets this week and reopened none.' }], overTime());
    const said: string[] = [];
    await run({ url: LOCAL, args: ['--dry-run'], prismaFor: () => db.prisma, ask: async () => null, say: (l) => said.push(l) });
    expect(said.join('\n')).toContain('though nobody in this check-in spoke of a meeting');
    expect(db.rows.report[0].overTime.cannotTellYou).toEqual(overTime().cannotTellYou);

    await writeTheChanges(db.prisma, await whatWouldChange(db.prisma));
    expect(db.rows.report[0].overTime.cannotTellYou).toEqual(['Nobody has put a number on the backlog.']);
    expect(db.rows.report[0].overTime.toSettleFirst).toEqual(['Who closes a refund, and when?']);
    expect(db.rows.report[0].overTime.sessions).toBe(2);
    expect(whatWouldChangeSays(await whatWouldChange(db.prisma))).toEqual(['1 check-in was read. Nothing would change.']);
  });

  it('leaves the line where somebody did speak of a meeting', async () => {
    const db = aStoredReportSaying([{ text: 'I met with Aisha on Tuesday and we agreed the new rule.' }], overTime());
    expect(whatWouldChangeSays(await whatWouldChange(db.prisma))).toEqual(['1 check-in was read. Nothing would change.']);
    expect(db.rows.report[0].overTime.cannotTellYou).toEqual(overTime().cannotTellYou);
  });

  it('a check-in with no stored report at all is left alone', async () => {
    const db = aStoredReportSaying([{ text: 'I closed 40 tickets this week.' }], overTime());
    db.rows.report.length = 0;
    expect(whatWouldChangeSays(await whatWouldChange(db.prisma))).toEqual(['1 check-in was read. Nothing would change.']);
  });
});

/**
 * THE FOUNDER'S AIM, STORED WITH NO NUMBER (screens request 136, item 1). "Get to 20 paying customers by December."
 * held target null, so her board had no answer and no bar. Rule 3 keeps the figure that is in the aim's own name, and
 * now reads this shape of sentence too.
 */
describe('an aim that goes "to" a number keeps it', () => {
  it('the dry run says so, and the write sets it', async () => {
    const db = theStoredCheckIn();
    db.rows.groundObjective.length = 0;
    db.rows.groundObjective.push({
      id: 'o-founder', groundId: 'g-1', name: 'Get to 20 paying customers by December.', target: null, count: 0, prevCount: 0,
      ownerParticipantId: null, setByParticipantId: 'p-rukia', dueOn: null, suggestedCount: null, suggestedSaid: null,
      suggestedAtSession: null, createdAt: new Date('2026-09-01'), sortOrder: 0,
    });
    const said: string[] = [];
    await run({ url: LOCAL, args: ['--dry-run'], prismaFor: () => db.prisma, ask: async () => null, say: (l) => said.push(l) });
    expect(said.join('\n')).toContain('has no number, though its own name holds 20');
    expect(db.rows.groundObjective[0].target).toBeNull();

    await writeTheChanges(db.prisma, await whatWouldChange(db.prisma));
    expect(db.rows.groundObjective[0].target).toBe(20);
  });
});
