import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { yourTeamPersonByPerson, theLeadActsOnAPerson } from './your-team-person-by-person';
import { theNightRunsDatabaseWithRecords, theLeadsBoard, theLeadOf, N } from '../engagement/the-night-run-bed';
import { R2, theRunRebuiltEachEvening, theRunAsADatabase, thePersonOf, THE_END_OF_THE_RUN } from './the-persons-record-bed';
import { rebuildThePersonsRecords, yourRecordInYourReport } from './the-persons-record-store';
import { readMyWork } from './my-work';

/**
 * YOUR TEAM, PERSON BY PERSON, AS EACH READER READS IT (Groundwork does the managing, part 2; Hafsah, 21 October 2026), from the second
 * night run (gw_night_run2) and each person's record as the run would have kept it, on Tuesday 20 October in the morning. Test data only;
 * no model is called.
 *
 * Grace and Wanjiru read a section for each person on their team: what they delivered with proof, their record and coaching, one plain
 * line on where they stand with the evidence beside it, and four one-tap actions. Honest people (Kevin, Mercy, Njeri) read as doing well;
 * Joseph (overstating) and Aisha (payments only said) need a hard conversation, with the evidence. Nobody else is served any of it.
 */
const KINDS = { drop: 'sales', fees: 'collections', lit: 'matter' } as const;
const teamOf = async (g: 'drop' | 'fees' | 'lit', o: { directMorning?: boolean; judgements?: boolean; reader?: string } = {}) =>
  yourTeamPersonByPerson(await theNightRunsDatabaseWithRecords(g, { directMorning: o.directMorning ?? true, judgements: o.judgements }), { groundId: N[g].ground.id, leadUserId: o.reader ?? theLeadOf(g).userId, board: theLeadsBoard(g), kind: KINDS[g] });
const personOf = (t: any, first: string) => t.people.find((p: any) => p.name.startsWith(`${first} `));
/* A label, a score or a verdict on a person, or a plan or an exit suggested by Groundwork. */
const LABELS = /\b(?:at risk|PIP|performance improvement|underperform\w*|low performer|poor performer|exit|dismiss\w*|fire|let go of|score|grade|rating|rated)\b|\d+\s?%/i;

describe('Grace reads her team, Drop Access (test)', () => {
  let t: any;
  beforeAll(async () => { t = await teamOf('drop'); });

  it('reads a section for each of the four people on her team, and none for herself', () => {
    expect(t.heading).toBe('Your team, person by person');
    expect(t.people.map((p: any) => p.name).sort()).toEqual(['Joseph Kariuki', 'Kevin Omondi', 'Mercy Wairimu', 'Peter Njoroge']);
  });

  it('Kevin is doing well: what he won and what shows each one, the one sale nothing shows yet, and the evidence beside it', () => {
    const k = personOf(t, 'Kevin');
    expect(k.delivered).toEqual({
      heading: 'What Kevin won, with proof',
      proven: [
        'Savannah Cafe is won for 6 units at KES 30,000, and the M-Pesa code RCD8M1LS4W shows it.',
        'Kilele Hotel is won for 40 units at KES 200,000, and a document Kevin added shows it.',
      ],
      onlySaid: ['Kevin said Roysambu Gym is won for KES 15,000, and nothing on file shows it yet.'],
      empty: null,
    });
    expect(k.whereTheyStand).toEqual({
      standing: 'doing well',
      says: 'Kevin is doing well.',
      evidence: [
        'Kevin said four times that something was sold, paid or signed. Three of them have proof on file.',
        'Kevin kept one of the two promises that came due. One was not done.',
        'Kevin did six of six check-ins, all on time. Six of them named the item, what changed and the day.',
      ],
    });
  });

  it('Mercy is doing well, every one of her five with proof on file', () => {
    const m = personOf(t, 'Mercy');
    expect(m.delivered.proven).toEqual([
      'Greenfield Supermarket is won for 25 units at KES 125,000, and a document Mercy added shows it.',
      "Mama Rose's Kiosk is won for 1 unit at KES 5,000, and a document Mercy added shows it.",
    ]);
    expect(m.whereTheyStand.says).toBe('Mercy is doing well.');
    expect(m.whereTheyStand.evidence[0]).toBe('Mercy said five times that something was sold, paid or signed, and every one has proof on file.');
  });

  it('Joseph needs a hard conversation, with what he said, what he took back, and the coaching that did not work', () => {
    const j = personOf(t, 'Joseph');
    expect(j.delivered.empty).toBe('Joseph has no deal won on record yet.');
    expect(j.whereTheyStand).toEqual({
      standing: 'needs a hard conversation',
      says: 'Joseph needs a hard conversation about saying things were done with nothing on file to show it.',
      evidence: [
        'Joseph said three times that something was sold, paid or signed. None of them has proof on file, and Joseph took two back later.',
        'After Joseph’s check-in on Monday 12 October, Groundwork told Joseph “Add the photo, slip or link when you say something is done.”',
        'Backing what Joseph says with proof has stayed the same since then.',
      ],
      about: 'proof',
    });
    expect(j.record.parts.find((p: any) => p.heading === 'Figures that changed').evidence).toEqual(['On Monday 12 October Joseph said 10 units for Mama Pima Stores, and on Tuesday 13 October Joseph said “Mama Pima is 15 units now, she\'s expanding.”']);
  });

  it('Peter needs coaching on one thing, with the coaching Groundwork has just given him', () => {
    const p = personOf(t, 'Peter');
    expect(p.whereTheyStand.says).toBe('Peter needs coaching on trying something before raising a blocker.');
    expect(p.whereTheyStand.evidence).toEqual([
      'Peter raised two blockers and said what had been tried first on none of them.',
      'After Peter’s check-in on Monday 19 October, Groundwork told Peter “Try one thing before you raise a blocker, and say what you tried.”',
      'No check-in since then shows whether it has changed yet.',
    ]);
  });

  it('each person has the four one-tap actions, each saying exactly what it does', () => {
    const j = personOf(t, 'Joseph');
    expect(j.actions.map((a: any) => [a.kind, a.label, a.does])).toEqual([
      ['praise', 'Praise Joseph', 'Keeps your words in Joseph’s record, where Joseph reads them on My work and in Joseph’s own report. No message is sent.'],
      ['plan', 'Start a plan', 'Keeps what you want to help Joseph with, here and under People on References and resources. Only you read it. Nothing is sent to Joseph.'],
      ['deadline', 'Set a deadline', 'Puts a due day on one of Joseph’s records. It shows on that record on your board, and nothing is sent to Joseph.'],
      ['reassign', 'Reassign leads', 'Gives one of Joseph’s records to somebody else on the team. From then on it is theirs on the board and in their check-ins. Nothing is sent to either of them.'],
    ]);
    expect(j.actions[1].suggested).toBe('Help Joseph with adding proof when saying something is done.');
    expect(j.actions[3].items.map((i: any) => i.name).sort()).toEqual(['Juja Hardware', 'Mama Pima Stores']);
    expect(personOf(t, 'Mercy').actions[0].suggested).toBe('Well done on the 2 deals you won with proof.');
  });
});

describe('Wanjiru reads her teams, Muchemi & Co (test)', () => {
  it('on fee notes, by role: Njeri (accounts) is doing well with her bank slip; Aisha needs a hard conversation; Brian needs coaching', async () => {
    const t: any = await teamOf('fees');
    const njeri = personOf(t, 'Njeri');
    expect(njeri.role).toBe('Accounts');
    expect(njeri.delivered.heading).toBe('What Njeri recorded as paid, with proof');
    expect(njeri.delivered.proven).toEqual(['On Monday 12 October Njeri said “FN-004 is paid. I received a bank slip today for the KES 250,000 remittance from Kasarani Foods and have recorded the payment.” A document Njeri added shows it.']);
    expect(njeri.whereTheyStand.says).toBe('Njeri is doing well.');
    const aisha = personOf(t, 'Aisha');
    expect(aisha.delivered.heading).toBe('What Aisha collected, with proof');
    expect(aisha.delivered.proven).toEqual([]);
    expect(aisha.delivered.onlySaid).toContain('On Monday 19 October Aisha said “FN-006 for Baraka Hardware has been paid.” Nothing on file shows it yet.');
    expect(aisha.whereTheyStand.says).toBe('Aisha needs a hard conversation about saying things were done with nothing on file to show it.');
    expect(personOf(t, 'Brian').whereTheyStand.says).toBe('Brian needs coaching on trying something before raising a blocker.');
  });

  /*
   * Changed in polish round 15 (a-day-they-checked-in.ts). Each working day now counts once, from what happened that day. David answered
   * nothing on Tuesday 13 and Monday 19 October, and answered a day late on Wednesday, Thursday and Friday. The old reading counted his
   * sessions instead, so it said "On Friday 16 October, the check-in was not done" though he answered that Friday, and it never counted
   * Tuesday. Read by the day, his record showed check-ins falling short on Wednesday evening, so the coaching came after that check-in,
   * and two check-ins since got worse: by Groundwork's own rule that is a hard conversation, with the evidence beside it.
   */
  it('on the litigation team, David’s check-ins got worse in the two check-ins since his coaching: a hard conversation, with the evidence', async () => {
    const t: any = await teamOf('lit');
    const d = personOf(t, 'David');
    expect(d.whereTheyStand.says).toBe('David needs a hard conversation about check-ins that were missed, late or vague.');
    expect(d.whereTheyStand.evidence).toEqual([
      'David did four of six check-ins, one of them on time. Two of them named the item, what changed and the day.',
      'After David’s check-in on Wednesday 14 October, Groundwork told David “Name the item, what changed and the day, every time.”',
      'How specific and on time David’s check-ins are has got worse since then.',
    ]);
    expect(d.actions[3].label).toBe('Reassign work');
  });
});

describe('what everybody on it reads', () => {
  it.each(['drop', 'fees', 'lit'] as const)('%s: no label, score or verdict on a person, no plan or exit suggested, and no colon joining pieces', async (g) => {
    const t: any = await teamOf(g);
    for (const p of t.people) {
      const lines = [p.delivered.heading, ...p.delivered.proven, ...p.delivered.onlySaid, p.delivered.empty, p.whereTheyStand?.says, ...(p.whereTheyStand?.evidence ?? []), ...p.actions.flatMap((a: any) => [a.label, a.does, a.suggested])].filter(Boolean) as string[];
      for (const line of lines) {
        const outside = line.replace(/“[^”]*”/g, '');
        expect([p.name, line, LABELS.test(outside)]).toEqual([p.name, line, false]);
        expect([p.name, line, /:/.test(outside)]).toEqual([p.name, line, false]);
      }
    }
  });
});

describe('who is served it, and the switches', () => {
  it('a team member is served none of it', async () => {
    expect(await teamOf('drop', { reader: thePersonOf('drop', 'Kevin').userId })).toBeNull();
  });
  it('with judgements of a person off, no line on where they stand and no record or coaching is built or served; what they won still is', async () => {
    const t: any = await teamOf('drop', { judgements: false });
    for (const p of t.people) {
      expect(p.whereTheyStand).toBeNull();
      expect(p.record).toBeNull();
    }
    expect(personOf(t, 'Kevin').delivered.proven).toHaveLength(2);
    expect(JSON.stringify(t)).not.toMatch(/coached|Groundwork told|hard conversation|needs coaching|doing well/);
  });
  it('the board adds it only for the lead, beside the direct morning, and only through yourTeamPersonByPerson', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'board.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const at = src.indexOf('(asServed as any).yourTeam = team');
    expect(at).toBeGreaterThan(0);
    const before = src.slice(Math.max(0, at - 1800), at);
    expect(before).toMatch(/if \(isInitiator\) \{\s*const morning = await theDirectMorningFor/);
    expect(before).toMatch(/const team = await yourTeamPersonByPerson\(this\.prisma, \{ groundId, leadUserId: requestingUserId/);
  });
});

/* ------------------------------------------------------------------------------------------------ the one-tap actions */

function aDatabaseForTheActions(o: { directMorning?: boolean } = {}) {
  const db: any = theRunAsADatabase('drop', { directMorning: o.directMorning ?? true });
  const kept: any[] = [];
  const lines: any[] = [];
  db.personLeadAction = {
    create: jest.fn(async ({ data }: any) => { const row = { id: `a-${kept.length + 1}`, createdAt: new Date('2026-10-21T09:00:00Z'), ...data }; kept.push(row); return row; }),
    findMany: jest.fn(async ({ where }: any = {}) => kept.filter((r) => (!where?.participantId || r.participantId === where.participantId) && (!where?.kind || r.kind === where.kind) && (!where?.groundId || r.groundId === where.groundId))),
  };
  db.groundContextItem = { ...db.groundContextItem, create: jest.fn(async ({ data }: any) => { const row = { id: `l-${lines.length + 1}`, ...data }; lines.push(row); return row; }) };
  const writes: any[] = [];
  const write = { updateWorkItem: jest.fn(async (g: string, i: string, u: string, dto: any) => { writes.push({ g, i, u, dto }); return { id: i }; }) };
  return { db, kept, lines, writes, write };
}
const DROP = R2.drop.ground.id;
const GRACE = R2.drop.ground.initiatorId;
const JOSEPH = thePersonOf('drop', 'Joseph');
const MERCY = thePersonOf('drop', 'Mercy');
const PETER = thePersonOf('drop', 'Peter');
const josephsItem = (name: string) => (R2.drop.items as any[]).find((i) => i.name === name && i.ownerParticipantId === JOSEPH.participantId);

describe('the one-tap actions', () => {
  it('only the lead who runs it may tap one', async () => {
    const a = aDatabaseForTheActions();
    await expect(theLeadActsOnAPerson(a.db, a.write, DROP, JOSEPH.participantId, MERCY.userId, { kind: 'praise', text: 'Well done.' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(a.kept).toEqual([]);
  });

  it('praise is kept in Mercy’s record, and Mercy reads it on My work and in her own report; Grace reads what she did on the board', async () => {
    const a = aDatabaseForTheActions();
    const r = await theLeadActsOnAPerson(a.db, a.write, DROP, MERCY.participantId, GRACE, { kind: 'praise', text: 'Well done on Greenfield Supermarket, with the signed order on file.' });
    expect(r.says).toBe('Your words are kept in Mercy’s record. Mercy reads them on My work and in Mercy’s own report.');
    expect(a.kept).toEqual([expect.objectContaining({ kind: 'PRAISE', participantId: MERCY.participantId, byUserId: GRACE, says: 'Well done on Greenfield Supermarket, with the signed order on file.' })]);
    const table = await theRunRebuiltEachEvening('drop', rebuildThePersonsRecords);
    a.db.personRecord = table;
    const page: any = await readMyWork(a.db, null, { groundId: DROP, userId: MERCY.userId, personId: null }, THE_END_OF_THE_RUN);
    expect(page.record.fromYourLead).toEqual({ heading: 'What Grace said about your work', lines: ['On Wednesday 21 October Grace said “Well done on Greenfield Supermarket, with the signed order on file.”'] });
    const report = await yourRecordInYourReport(a.db, DROP, 6, MERCY.userId);
    expect(report!.fromYourLead!.lines).toEqual(['On Wednesday 21 October Grace said “Well done on Greenfield Supermarket, with the signed order on file.”']);
    /* Joseph's own page carries nothing of Mercy's praise. */
    const his: any = await readMyWork(a.db, null, { groundId: DROP, userId: JOSEPH.userId, personId: null }, THE_END_OF_THE_RUN);
    expect(his.record.fromYourLead).toBeUndefined();
  });

  it('start a plan keeps a People line about Joseph that only Grace reads, and is never shown to Joseph', async () => {
    const a = aDatabaseForTheActions();
    const r = await theLeadActsOnAPerson(a.db, a.write, DROP, JOSEPH.participantId, GRACE, { kind: 'plan', text: 'Help Joseph with adding proof when saying something is done.' });
    expect(r.says).toBe('Your plan for Joseph is kept here and under People on References and resources. Only you read it.');
    expect(a.lines).toEqual([expect.objectContaining({ kind: 'HELP_WITH', audience: 'LEAD_ONLY', aboutParticipantId: JOSEPH.participantId, text: 'Help Joseph with adding proof when saying something is done.' })]);
    expect(a.kept[0]).toMatchObject({ kind: 'PLAN', itemId: 'l-1' });
    a.db.personRecord = await theRunRebuiltEachEvening('drop', rebuildThePersonsRecords);
    const his: any = await readMyWork(a.db, null, { groundId: DROP, userId: JOSEPH.userId, personId: null }, THE_END_OF_THE_RUN);
    expect(JSON.stringify(his)).not.toContain('Help Joseph with adding proof');
  });

  it('set a deadline puts the day on one of Joseph’s records through the board’s own writer', async () => {
    const a = aDatabaseForTheActions();
    const item = josephsItem('Juja Hardware');
    const r = await theLeadActsOnAPerson(a.db, a.write, DROP, JOSEPH.participantId, GRACE, { kind: 'deadline', itemId: item.id, due: '2026-10-30' });
    expect(r.says).toBe('Juja Hardware is due on Friday 30 October. It shows on that record on your board.');
    expect(a.writes).toEqual([{ g: DROP, i: item.id, u: GRACE, dto: { due: '2026-10-30' } }]);
    expect(a.kept[0]).toMatchObject({ kind: 'DEADLINE', says: 'Juja Hardware, which Joseph has, is due on Friday 30 October.', itemId: item.id });
  });

  it('reassign gives one of Joseph’s leads to Peter through the same writer, and refuses a record that is not his', async () => {
    const a = aDatabaseForTheActions();
    const item = josephsItem('Mama Pima Stores');
    const r = await theLeadActsOnAPerson(a.db, a.write, DROP, JOSEPH.participantId, GRACE, { kind: 'reassign', itemId: item.id, toParticipantId: PETER.participantId });
    expect(r.says).toBe('Mama Pima Stores is Peter’s now, on the board and in Peter’s check-ins.');
    expect(a.writes).toEqual([{ g: DROP, i: item.id, u: GRACE, dto: { ownerParticipantId: PETER.participantId } }]);
    expect(a.kept[0]).toMatchObject({ kind: 'REASSIGN', says: 'Mama Pima Stores went from Joseph to Peter.', toParticipantId: PETER.participantId });
    const kevins = (R2.drop.items as any[]).find((i) => i.ownerParticipantId === thePersonOf('drop', 'Kevin').participantId);
    await expect(theLeadActsOnAPerson(a.db, a.write, DROP, JOSEPH.participantId, GRACE, { kind: 'reassign', itemId: kevins.id, toParticipantId: PETER.participantId })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('what she did is on Joseph’s section of her board', async () => {
    const a = aDatabaseForTheActions();
    await theLeadActsOnAPerson(a.db, a.write, DROP, JOSEPH.participantId, GRACE, { kind: 'plan', text: 'Help Joseph with adding proof when saying something is done.' });
    const db: any = await theNightRunsDatabaseWithRecords('drop', { directMorning: true });
    db.personLeadAction = a.db.personLeadAction;
    db.workItem = a.db.workItem;
    const t: any = await yourTeamPersonByPerson(db, { groundId: DROP, leadUserId: GRACE, board: theLeadsBoard('drop'), kind: 'sales' });
    expect(personOf(t, 'Joseph').fromYou).toEqual(['On Wednesday 21 October you started a plan for Joseph, saying “Help Joseph with adding proof when saying something is done.”']);
    expect(personOf(t, 'Mercy').fromYou).toEqual([]);
  });
});

/*
 * BROWSER TEST, 21 OCTOBER 2026: the borrowers of Pesa Ndogo Lenders (test) checked in five Mondays running, all on time, and Halima read
 * "Achieng needs coaching on checking in on time and naming the item, what changed and the day." Only the part that fell short is named.
 */
describe('coaching on check-ins names only the part that fell short', () => {
  it('somebody on time every week, never naming the item, needs coaching on naming the item only', () => {
    const { whereTheyStand } = require('./what-the-lead-reads-about-each-person');
    const checkIns = [1, 2, 3, 4, 5].map((n) => ({ checkInId: `c${n}`, sessionNumber: n, on: `Monday ${n} October`, done: true, onTime: true, specific: false }));
    const record = { claims: [], changes: [], promises: [], blockers: [], focus: [], checkIns, summary: { claims: 0, proven: 0, changed: 0, keptOnTime: 0, keptLate: 0, notDone: 0, late: 0, blockersRaised: 0, blockersTriedFirst: 0, checkInsDue: 5, checkInsDone: 5, checkInsOnTime: 5, checkInsSpecific: 0, promisesDue: 0 } };
    const stood = whereTheyStand({ groundId: 'g', participantId: 'p-achieng', record, coaching: [], lastSession: 5, builtAt: new Date() } as any, 'Achieng', 'Freezer loans, cohort 1');
    expect(stood.says).toBe('Achieng needs coaching on naming the item, what changed and the day.');
  });
});

describe('a borrower repays, and does not collect', () => {
  it('Achieng’s part is headed with what she repaid', () => {
    const { whatTheyDelivered } = require('./what-the-lead-reads-about-each-person');
    expect(whatTheyDelivered({ participantId: 'p-achieng', name: 'Achieng', role: 'Borrower', kind: 'collections', board: null, stored: null }).heading).toBe('What Achieng repaid, with proof');
    expect(whatTheyDelivered({ participantId: 'p-brian', name: 'Brian', role: 'Associate', kind: 'collections', board: null, stored: null }).heading).toBe('What Brian collected, with proof');
  });
});
