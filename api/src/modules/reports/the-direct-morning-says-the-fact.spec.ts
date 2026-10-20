import * as SERVED from './__fixtures__/night-run-2-served.json';
import { theLeadsBoard } from '../engagement/the-night-run-bed';
import { inTheDirectMorningsWords, saidTheDirectWay } from './the-direct-morning-says-the-fact';
import { ReportsController } from './reports.controller';
import { TheWeeklyReportController } from './the-weekly-report.controller';
import { BoardController } from '../board/board.controller';
import { provenanceLine } from './confidence-in-the-picture';
import { whyItIsTooEarly } from './a-read-needs-a-run';
import { theCountsInASentence } from './the-session-report';
import { theSentenceAbout } from './the-weekly-sentence-about-each-person';
import { GROUNDWORK_DOES_NOT_CHOOSE } from '../board/where-this-is-heading';
import { WHAT_A_FORECAST_CANNOT_TELL_YOU } from '../board/the-switchboards-own-sections';
import { WHAT_CONTACT_HISTORY_IS } from '../board/a-deal-row-from-its-record';
import { NO_CRITERIA_ARE_CHECKED } from '../board/each-deal-in-its-group';
import { NOT_KNOWN_KIND } from '../board/the-kind-of-work';
import { NO_OPEN_ISSUES_ON_RECORD } from '../board/board.service';
import { whoSeesThisDifferently } from '../board/who-sees-this-differently';

/**
 * THE SENTENCES THE CODE WRITES, AS EACH READER READS THEM, WITH THE DIRECT MORNING ON AND OFF (20 October 2026).
 *
 * The "before" is what each reader was served at the end of the second night run (__fixtures__/night-run-2-served.json, from
 * engine-test/run2/raw/record.json; the leads' boards from engagement/__fixtures__/night-run-2.json). On: no hedge or defence of the
 * product's own is left, the fact is said instead, and nothing a person said is changed. Off: the very object, untouched.
 */
const S: any = (SERVED as any).default ?? SERVED;
const reader = (which: string, who: string) => S.readers.find((r: any) => r.which === which && r.reader === who);
const GRACE = reader('drop', 'grace');
const KEVIN = reader('drop', 'kevin');
const MERCY = reader('drop', 'mercy');
const WANJIRU = reader('fees', 'wanjiru');
const NJERI = reader('fees', 'njeri');

const everyString = (v: any, key = '', out: { key: string; s: string }[] = []) => {
  if (typeof v === 'string') out.push({ key, s: v });
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, key, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) everyString(x, k, out);
  return out;
};
const text = (v: any) => everyString(v).map((x) => x.s).join('\n');

const THE_HEDGES = [
  /It is not a verdict/, /the next session can change any part of it/, /so it is not yet clear/, /It is too early to read/,
  /It is worth confirming/, /not enough to settle anything/, /It doesn[’']t choose/, /It is not a promise/,
  /Nothing on record holds each contact with the customer/, /somebody spoke about it/, /It rests on what somebody said/,
  /Groundwork does not keep this yet/, /Groundwork does not know what kind of work/, /Groundwork does not follow an issue/,
  /see this differently/, /nobody can assume it is agreed/, /are settled, and .* still open/, /is settled, and .* still open/,
  /The parts? that changed (?:were|was)[^.]*the shared picture/,
];

describe('off: every reader reads exactly what they read today', () => {
  for (const r of [GRACE, KEVIN, MERCY, WANJIRU, NJERI]) {
    it(`${r.reader} (${r.isLead ? 'the lead' : 'a team member'}): the team report, the weekly report, the board and My work are the very objects served`, () => {
      for (const served of [r.teamReport, r.weekly, r.board ?? theLeadsBoard(r.which), r.myWork]) {
        expect(inTheDirectMorningsWords(served, false)).toBe(served);
      }
    });
  }
});

describe('on: what each reader reads', () => {
  it('Grace Achieng, the lead, at the top of her team report: the counts said as the fact, the hedge gone', () => {
    const before = GRACE.teamReport.data;
    const after = inTheDirectMorningsWords(GRACE.teamReport, true).data;
    expect(before.whereThingsStand.saying).toBe('Three things are settled, and two are still open.');
    expect(after.whereThingsStand.saying).toBe('People agree on three things, and differ on two.');
    expect(before.pictureLines[2]).toBe('4 of 5 people have answered this session. There is enough here to talk about, and not enough to settle anything.');
    expect(after.pictureLines[2]).toBe('4 of 5 people have answered this session. There is enough here to talk about.');
    expect(after.confidence.saying).toBe(before.confidence.saying);
    expect(after.amendedNote ?? '').not.toMatch(/the shared picture/);
  });

  it('Kevin Omondi, a team member, on his board: each deal\'s days said plainly, with no disclaimer', () => {
    const after = inTheDirectMorningsWords(KEVIN.board, true);
    const row = after.workRecords[0].rows[0];
    expect(KEVIN.board.workRecords[0].rows[0].contactHistorySays).toBe('Each date is a day somebody spoke about this deal in a check-in. Nothing on record holds each contact with the customer.');
    expect(row.contactHistorySays).toBe('Each date is a day this deal came up in a check-in.');
    expect(KEVIN.board.workRecords[0].rows[0].contactHistory[0].says).toBe('On 19 October, somebody spoke about it, and proof backs what they said.');
    expect(row.contactHistory[0].says).toBe('On 19 October, it came up in a check-in, with proof.');
    const plain = KEVIN.board.workRecords[0].rows.flatMap((x: any) => x.contactHistory ?? []).find((h: any) => /in their own words\.$/.test(h.says));
    expect(saidTheDirectWay(plain.says)).toBe(plain.says.replace(', somebody spoke about it, in their own words.', ', it came up in a check-in.'));
    expect(KEVIN.board.workRecords[1].why).toBe('Groundwork does not keep this yet. It needs numbers from another system, such as payment records.');
    expect(after.workRecords[1].why).toBe('');
    expect(after.divergence.items[0].whoSeesIt).toBe(KEVIN.board.divergence.items[0].whoSeesIt.replace(' see this differently.', ' said different things about this.'));
    expect(after.divergence.items[0].whoSeesIt).toMatch(/^[A-Z].* said different things about this\.$/);
  });

  it('Grace Achieng, the lead, on her board: the forecast and the open issues say the fact or nothing', () => {
    const board = theLeadsBoard('drop');
    const after = inTheDirectMorningsWords(board, true);
    const all = text(after);
    expect(all).not.toMatch(/It is not a promise|Groundwork does not follow an issue|It doesn[’']t choose/);
    if (board.forecast?.[0]?.cannotTellYou) expect(after.forecast[0].cannotTellYou).toBe('This carries the pace so far forward in a straight line.');
  });

  it('the weekly report, for the lead and for a team member: "It is worth confirming" is gone, and the counts stay', () => {
    const lead = inTheDirectMorningsWords(WANJIRU.weekly, true);
    const member = inTheDirectMorningsWords(NJERI.weekly, true);
    expect(WANJIRU.weekly.saidAndProof).toMatch(/It is worth confirming them before acting on them\.$/);
    expect(lead.saidAndProof).toBe(WANJIRU.weekly.saidAndProof.replace(' It is worth confirming them before acting on them.', ''));
    expect(member.saidAndProof).toBe('This week, you said 6 things in your check-ins. 1 of them has a photo or document behind it. 2 numbers were given from memory with nothing attached, so they cannot be checked yet.');
    expect(text(lead)).not.toMatch(/nobody can assume it is agreed/);
  });

  for (const r of [GRACE, KEVIN, MERCY, WANJIRU, NJERI]) {
    it(`${r.reader}: no hedge of the product's own is left anywhere they read, nothing they or anybody said is changed, and no name, label or score appears that was not served before`, () => {
      for (const served of [r.teamReport, r.weekly, r.board ?? theLeadsBoard(r.which), r.myWork]) {
        if (!served) continue;
        const after = inTheDirectMorningsWords(served, true);
        const was = everyString(served);
        const now = everyString(after);
        /* Only the product's own sentences: a person's words are kept, word for word. */
        const theirs = (xs: { key: string; s: string }[]) => xs.filter((x) => ['lines', 'said', 'quote', 'view', 'answer', 'text'].includes(x.key)).map((x) => x.s);
        expect(theirs(now)).toEqual(theirs(was));
        for (const h of THE_HEDGES) {
          const left = now.filter((x) => !['lines', 'said', 'quote', 'view', 'answer', 'text', 'evidence', 'positions'].includes(x.key) && h.test(x.s));
          expect(left.map((x) => x.s)).toEqual([]);
        }
        /* Nothing new: every word now served was served before, apart from the few the direct sentences use. */
        const before = new Set(text(served).toLowerCase().match(/[a-z’']+/g) ?? []);
        const added = new Set((text(after).toLowerCase().match(/[a-z’']+/g) ?? []).filter((w) => !before.has(w)));
        for (const w of added) expect(['agree', 'differ', 'came', 'up', 'round', 'second', 'read', 'summary', 'with', 'proof', 'on', 'this', 'there', 'is', 'no', 'yet', 'people', 'and', 'nothing', 'a', 'in', 'check', 'thing', 'things', 'it', 'deal', 'from', 'said', 'different', 'about', 'the', 'first', 'gave', 'next', 'step', 'or', 'date', 'named', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'each', 'day']).toContain(w);
        expect(text(after)).not.toMatch(/\b(at risk|PIP|underperform|exit)\b/i.test(text(served)) ? /$^/ : /\b(at risk|PIP|underperform)\b/i);
      }
    });
  }
});

describe('every sentence the code writes for these places is one the direct morning knows', () => {
  it('reports', () => {
    expect(saidTheDirectWay(provenanceLine({ accounts: 2, supported: false, contradicted: true, firstSeenSession: 2 }))).toBe('People said different things about this (session 2).');
    expect(saidTheDirectWay(whyItIsTooEarly(['concernFlags'])!)).toBe('This is the first round, and how steady each person has been is read from the second round on.');
    expect(saidTheDirectWay(theCountsInASentence(3, 1))).toBe('People agree on three things, and differ on one.');
    expect(saidTheDirectWay(theCountsInASentence(1, 2))).toBe('People agree on one thing, and differ on two.');
    expect(saidTheDirectWay(theCountsInASentence(0, 1))).toBe('People differ on one thing.');
    expect(saidTheDirectWay(theCountsInASentence(2, 0))).toBe('People agree on two things, and differ on nothing.');
    const named = theSentenceAbout({ label: 'Joseph Kariuki', checkedIn: true, lines: [{ type: 'PROGRESS', text: 'Visited Mama Pima Stores.' }] } as any)!;
    expect(named).toMatch(/so it is not yet clear what happens next\.$/);
    expect(saidTheDirectWay(named)).toBe(named.replace(', but gave no next step or date, so it is not yet clear what happens next.', ', and gave no next step or date.'));
  });

  it('boards', () => {
    expect(saidTheDirectWay(GROUNDWORK_DOES_NOT_CHOOSE)).toBe('');
    expect(saidTheDirectWay(WHAT_A_FORECAST_CANNOT_TELL_YOU)).toBe('This carries the pace so far forward in a straight line.');
    expect(saidTheDirectWay(WHAT_CONTACT_HISTORY_IS)).toBe('Each date is a day this deal came up in a check-in.');
    expect(saidTheDirectWay(NO_CRITERIA_ARE_CHECKED)).toBe('');
    expect(saidTheDirectWay(NOT_KNOWN_KIND)).toBe('');
    expect(saidTheDirectWay(NO_OPEN_ISSUES_ON_RECORD)).toBe('');
    expect(saidTheDirectWay(whoSeesThisDifferently(['a colleague', 'Grace Achieng'], null))).toBe('People said different things about this.');
    expect(saidTheDirectWay('It rests on what somebody said, with no proof yet.')).toBe('There is no proof yet.');
    expect(saidTheDirectWay(whoSeesThisDifferently(['Kevin Omondi', 'Grace Achieng', 'Joseph Kariuki'], 'Kevin Omondi'))).toBe('You, Grace Achieng and Joseph Kariuki said different things about this.');
  });

  it('a person\'s own words are never rewritten, even where they happen to match', () => {
    const served = { whatEachPersonSaid: [{ who: 'Joseph Kariuki', lines: ['It is not a promise, and anything that changes the pace changes where it ends.'] }] };
    expect(inTheDirectMorningsWords(served, true)).toEqual(served);
  });
});

describe('as served by the routes, for the lead, a team member and an admin', () => {
  const prismaFor = (on: boolean): any => ({
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-drop' })) },
    organization: { findUnique: jest.fn(async () => ({ id: 'org-drop', directMorningOn: on })) },
  });

  for (const on of [false, true]) {
    it(`the session's report, ${on ? 'on' : 'off'}, for Grace (the lead) and Kevin (a team member)`, async () => {
      for (const r of [GRACE, KEVIN]) {
        const reports: any = { sessionReport: jest.fn(async () => structuredClone(r.teamReport.data)), noteTheLeadRead: jest.fn(async () => undefined), theSwitchboardsPickFor: jest.fn(async () => ({})) };
        const out: any = await new ReportsController(reports, prismaFor(on)).sessionReport('g-drop', r.teamReport.sessionNumber, r.reader, 'org-drop');
        expect(out.whereThingsStand.saying).toBe(on ? 'People agree on three things, and differ on two.' : 'Three things are settled, and two are still open.');
      }
    });

    it(`the weekly report, ${on ? 'on' : 'off'}, for Wanjiru (the lead) and for an admin reading it`, async () => {
      for (const served of [WANJIRU.weekly, { ...WANJIRU.weekly, forNextWeek: [] }]) {
        const weekly: any = { read: jest.fn(async () => structuredClone(served)), noteTheLeadRead: jest.fn(async () => undefined) };
        const out: any = await new TheWeeklyReportController(weekly, prismaFor(on)).week('g-fees', 'u', 'ADMIN', 'org');
        expect(/It is worth confirming/.test(out.saidAndProof)).toBe(!on);
      }
    });

    it(`the board, ${on ? 'on' : 'off'}, for Mercy (a team member)`, async () => {
      const board: any = { get: jest.fn(async () => structuredClone(MERCY.board)) };
      const out: any = await new BoardController(board, prismaFor(on)).get('g-drop', 'u-mercy');
      expect(out.workRecords[1].why).toBe(on ? '' : 'Groundwork does not keep this yet. It needs numbers from another system, such as payment records.');
    });
  }

  it('without a database to ask, every route serves exactly what it served before', async () => {
    const reports: any = { get: jest.fn(async () => GRACE.teamReport.data) };
    expect(await new ReportsController(reports).get('g', 'u', 'o')).toBe(GRACE.teamReport.data);
  });
});
