import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ReportsService } from './reports.service';
import { BoardService } from '../board/board.service';
import { theSessionReport } from './the-session-report';
import { whatEachPersonSaidForTheSubject } from './colleagues-exact-words-stay-with-the-manager';
import {
  theMarksOfAReport, theMarkOnALine, markTheRows, theWeakestOf, withTheMarksOnItsLines, WHAT_EACH_MARK_SAYS, WHEN_THE_MARKS_DIFFER, type AMarkedRow,
} from './the-mark-on-every-line';

/**
 * THE FOUR MARKS ON EVERY LINE A LEAD READS IN A REPORT (week 6b, decision 43).
 *
 * The record lines already carried them. The lines the synthesis writes (the picture, each
 * agreement, each difference with its sides and evidence, each finding) did not. The product now
 * decides each one from the record lines behind it, when the report is built, and a line resting on
 * several takes the weakest. These read the words a person is served, for each reader.
 */
const ROWS: AMarkedRow[] = [
  { participantId: 'p-aisha', text: 'Green Mart has a quote', mark: 'proven' },
  { participantId: 'p-aisha', text: 'I sent the price list to Miriam', mark: 'confirmed' },
  { participantId: 'p-aisha', text: 'I will visit Westgate Deli on Friday', mark: 'said' },
  { participantId: 'p-miriam', text: 'Westgate Deli said they would pay next week', mark: 'memory' },
  { participantId: 'p-miriam', text: 'Kito Foods wants the freezers before December', mark: 'said' },
];

describe('the prototype wording', () => {
  it('is exactly what the prototype prints', () => {
    expect(WHAT_EACH_MARK_SAYS).toEqual({
      proven: 'Proven',
      confirmed: 'Confirmed by the person who received it',
      said: 'Only someone’s word',
      memory: 'From memory only',
    });
  });
});

describe('each of the four marks, on a line the synthesis wrote', () => {
  it('proven: a document the person added backs the record line behind it', () => {
    const m = theMarkOnALine('Green Mart has a quote from Aisha, and the quote is on its way.', ROWS);
    expect(m.mark).toBe('proven');
    expect(m.markSays).toBe('Proven');
    expect(m.markNote).toBeUndefined();
  });
  it('confirmed: the person who received the work said it arrived', () => {
    const m = theMarkOnALine('Aisha sent the price list to Miriam.', ROWS);
    expect(m).toMatchObject({ mark: 'confirmed', markSays: 'Confirmed by the person who received it' });
  });
  it('only someone’s word: said, nothing written or confirmed behind it', () => {
    const m = theMarkOnALine('Aisha will visit Westgate Deli on Friday.', ROWS);
    expect(m).toMatchObject({ mark: 'said', markSays: 'Only someone’s word' });
  });
  it('from memory only: a record line recalled with nothing attached', () => {
    const m = theMarkOnALine('Miriam remembers Westgate Deli said they would pay next week.', [
      { participantId: 'p-miriam', text: 'Westgate Deli said they would pay next week', mark: 'memory' },
    ]);
    expect(m).toMatchObject({ mark: 'memory', markSays: 'From memory only' });
  });
  it('a line no record line stands behind is only someone’s word, not silence and not proven', () => {
    expect(theMarkOnALine('The team is well placed for the quarter.', ROWS).mark).toBe('said');
  });
  it('a record line that only shares a client’s name does not lend its mark', () => {
    expect(theMarkOnALine('Green Mart wants a different shelf layout.', ROWS).mark).toBe('said');
  });
});

describe('a line built from several record lines takes the weakest, and says so', () => {
  const mixed = 'Aisha has a quote for Green Mart and Westgate Deli said they would pay next week.';
  it('names the weakest mark and says plainly that they differ', () => {
    const m = theMarkOnALine(mixed, ROWS);
    expect(m.mark).toBe('memory');
    expect(m.markSays).toBe('From memory only');
    expect(m.marksBehind).toEqual(['proven', 'memory']);
    expect(m.markNote).toBe(WHEN_THE_MARKS_DIFFER);
    expect(m.markNote).toBe(
      'This line rests on more than one thing people said, and they are not all known in the same way. It carries the mark of the one that is known least well.',
    );
  });
  it('says nothing about the difference when every record line behind it is known the same way', () => {
    const m = theMarkOnALine('Aisha has a quote for Green Mart.', [...ROWS, { participantId: 'p-aisha', text: 'Green Mart has a quote ready', mark: 'proven' }]);
    expect(m.mark).toBe('proven');
    expect(m.markNote).toBeUndefined();
    expect(m.marksBehind).toBeUndefined();
  });
  it('the order, strongest first, is the prototype’s', () => {
    expect(theWeakestOf(['proven', 'confirmed'])).toBe('confirmed');
    expect(theWeakestOf(['confirmed', 'said'])).toBe('said');
    expect(theWeakestOf(['said', 'memory', 'proven'])).toBe('memory');
  });
});

describe('the old figure-only marks are kept and map onto the new one', () => {
  it('a figure from memory keeps "from memory" and reads as from memory only', () => {
    const m = theMarkOnALine('Twelve tickets are over a day old.', [{ participantId: 'p-aisha', text: 'Twelve tickets are over a day old', mark: 'memory' }]);
    expect(m.mark).toBe('memory');
    expect(m.figureIs).toBe('from memory');
  });
  it('a hedged figure keeps "their estimate" and reads as from memory only', () => {
    const m = theMarkOnALine('Aisha is about a third of the way through 30 visits.', [{ participantId: 'p-aisha', text: 'about a third of the way through my 30 visits', mark: 'memory' }]);
    expect(m.mark).toBe('memory');
    expect(m.figureIs).toBe('their estimate');
  });
});

describe('the marks of a whole report', () => {
  const report = {
    sharedPicture: 'Aisha has a quote for Green Mart. Westgate Deli said they would pay next week.',
    agreements: ['Aisha will visit Westgate Deli on Friday.'],
    divergences: [
      {
        topic: 'Whether Westgate Deli will pay next week or not.',
        positions: [{ participantLabel: 'participant A', view: 'Westgate Deli said they would pay next week.' }, { participantLabel: 'participant B', view: 'Nothing is written down.' }],
        evidence: ['Kito Foods wants the freezers before December.'],
      },
    ],
    findings: [{ text: 'Aisha sent the price list to Miriam.', participantId: 'p-aisha' }, { text: 'Green Mart has a quote.', participantId: 'p-miriam' }],
  };
  const marks = theMarksOfAReport(report, ROWS);

  it('has a mark for every sentence, agreement, difference, side, piece of evidence and finding', () => {
    expect(marks.sharedPicture.map((m) => m.mark)).toEqual(['proven', 'memory']);
    expect(marks.agreements.map((m) => m.mark)).toEqual(['said']);
    expect(marks.divergences[0].topic.mark).toBe('memory');
    expect(marks.divergences[0].positions.map((m) => m.mark)).toEqual(['memory', 'said']);
    expect(marks.divergences[0].evidence.map((m) => m.mark)).toEqual(['said']);
    expect(marks.findings.map((m) => m.mark)).toEqual(['confirmed', 'said']);
  });
  it('a finding is marked from that person’s own lines only, not somebody else’s proven line', () => {
    /* Green Mart has a quote is Aisha's proven line; a finding about Miriam does not borrow it. */
    expect(marks.findings[1].mark).toBe('said');
  });

  it('is served beside each line, and the lines themselves are not changed', () => {
    const served = withTheMarksOnItsLines(report, marks) as any;
    expect(served.sharedPicture).toBe(report.sharedPicture);
    expect(served.sharedPictureLines).toEqual([
      { text: 'Aisha has a quote for Green Mart.', mark: 'proven', markSays: 'Proven' },
      { text: 'Westgate Deli said they would pay next week.', mark: 'memory', markSays: 'From memory only' },
    ]);
    expect(served.agreements).toEqual(report.agreements);
    expect(served.agreementMarks[0].markSays).toBe('Only someone’s word');
    expect(served.divergences[0].topic).toBe(report.divergences[0].topic);
    expect(served.divergences[0].markSays).toBe('From memory only');
    expect(served.divergences[0].positions[0]).toMatchObject({ participantLabel: 'participant A', view: report.divergences[0].positions[0].view, markSays: 'From memory only' });
    expect(served.divergences[0].evidenceMarks[0].markSays).toBe('Only someone’s word');
    expect(served.findings[0]).toMatchObject({ text: 'Aisha sent the price list to Miriam.', participantId: 'p-aisha', markSays: 'Confirmed by the person who received it' });
  });

  it('a stored older report, with no marks stored, is read exactly as it always was', () => {
    expect(withTheMarksOnItsLines(report, undefined)).toBe(report);
    expect(withTheMarksOnItsLines(report, null)).toBe(report);
    expect(withTheMarksOnItsLines(null, marks)).toBeNull();
  });
  it('marks that no longer fit the lines are left off rather than put on the wrong line', () => {
    const grown = { ...report, agreements: [...report.agreements, 'A new agreement.'] };
    const served = withTheMarksOnItsLines(grown, marks) as any;
    expect(served.agreementMarks).toBeUndefined();
    expect(served.sharedPictureLines).toHaveLength(2);
  });
  it('carries no file, no name of who said it and no rating', () => {
    const served = JSON.stringify(withTheMarksOnItsLines(report, marks));
    expect(served).not.toMatch(/score|rated|specificity|\.jpg|\.txt/);
    for (const m of [...marks.sharedPicture, ...marks.agreements, ...marks.findings]) {
      expect(Object.keys(m).every((k) => ['mark', 'markSays', 'marksBehind', 'markNote', 'figureIs'].includes(k))).toBe(true);
    }
  });
});

describe('marking the rows of the record', () => {
  it('uses the one rule, and somebody else’s document proves nothing of theirs', () => {
    const rows = [
      { participantId: 'p-aisha', type: 'PROGRESS', text: 'The build is on track', recallBased: false, anchoredDocumentId: 'd-lead', anchoredOrigin: 'typed', confirmedAt: null },
      { participantId: 'p-aisha', type: 'PROGRESS', text: 'Green Mart has a quote', recallBased: false, anchoredDocumentId: 'd-aisha', anchoredOrigin: 'photo', confirmedAt: null },
      { participantId: 'p-aisha', type: 'PROGRESS', text: 'A disputed line about Lakeside', recallBased: true, disputedAt: new Date() },
    ];
    const marked = markTheRows(rows as any, new Map([['d-lead', 'p-lead'], ['d-aisha', 'p-aisha']]));
    expect(marked.map((r) => [r.text, r.mark])).toEqual([['The build is on track', 'said'], ['Green Mart has a quote', 'proven']]);
  });
});

describe('the session report: the settled and the open lines carry their marks', () => {
  const base: any = {
    sessionNumber: 1, closed: false, agreements: [], divergences: [], entries: [], previousEntries: [],
    baselineSuccess: null, startingPoint: null, previousSharedPicture: null, evidence: [], specificityLevel: null,
    centralQuestion: null, movedOnTargets: null, blocked: 0, answeredThisSession: [],
  };
  const agreements = ['Aisha will visit Westgate Deli on Friday.', '', 'Green Mart has a quote.'];
  const divergences = [
    { topic: 'Whether Westgate Deli pays next week.', positions: [{ participantLabel: 'participant A', view: 'Westgate Deli said they would pay next week.' }], evidence: ['Kito Foods wants the freezers before December.', ''] },
    { topic: '' },
  ];
  const marks = theMarksOfAReport({ sharedPicture: '', agreements, divergences, findings: [] }, ROWS);

  it('lines up the marks with the lines that are shown, even when an empty one was dropped', () => {
    const shape: any = theSessionReport({ ...base, agreements, divergences, marksOnItsLines: marks });
    expect(shape.whereThingsStand.settled).toEqual(['Aisha will visit Westgate Deli on Friday.', 'Green Mart has a quote.']);
    expect(shape.whereThingsStand.settledMarks.map((m: any) => m.markSays)).toEqual(['Only someone’s word', 'Proven']);
    expect(shape.whereThingsStand.open).toEqual(['Whether Westgate Deli pays next week.']);
    expect(shape.whereThingsStand.openMarks).toHaveLength(1);
    const reason = shape.whereThingsStand.openWithReasons[0];
    expect(reason.markSays).toBeDefined();
    expect(reason.positions[0]).toMatchObject({ who: 'participant A', view: 'Westgate Deli said they would pay next week.' });
    expect(reason.positions[0].markSays).toBeDefined();
    expect(reason.restsOn).toEqual(['Kito Foods wants the freezers before December.']);
    expect(reason.restsOnMarks.map((m: any) => m.markSays)).toEqual(['Only someone’s word']);
  });
  it('a report stored before the marks, or a closed round, reads as it did', () => {
    const shape: any = theSessionReport({ ...base, agreements, divergences });
    expect(shape.whereThingsStand.settledMarks).toBeUndefined();
    expect(shape.whereThingsStand.openMarks).toBeUndefined();
    expect(shape.whereThingsStand.openWithReasons[0].mark).toBeUndefined();
    expect(shape.whereThingsStand.settled).toHaveLength(2);
  });
  it('each record line in a section carries the mark in the prototype’s words', () => {
    const shape: any = theSessionReport({
      ...base,
      agreements: [],
      divergences: [],
      entries: [{ type: 'COMMITMENT', text: 'I will visit Westgate Deli on Friday', who: 'Aisha', recallBased: true, threadKey: null }],
    });
    const items = shape.sections.flatMap((s: any) => s.items);
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) expect(i.markSays).toBe(WHAT_EACH_MARK_SAYS[i.mark as keyof typeof WHAT_EACH_MARK_SAYS]);
  });
});

/* ---------- each reader, through the real report and board reads ---------- */

const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  managingOnly: partyType === PartyType.INITIATOR, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: first, lastName: last }, soloArtifact: null,
});
const PEOPLE = [person('p-lead', 'u-wairimu', 'Wairimu', 'Kamau', PartyType.INITIATOR), person('p-aisha', 'u-aisha', 'Aisha', 'Otieno'), person('p-miriam', 'u-miriam', 'Miriam', 'Wanjiku')];
const CHECK_INS = [
  { id: 'c1', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-22T16:10:00Z') },
  { id: 'c2', participantId: 'p-miriam', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-23T15:00:00Z') },
];
const STORED = {
  sharedPicture: 'Aisha has a quote for Green Mart. Westgate Deli said they would pay next week.',
  agreements: ['Aisha will visit Westgate Deli on Friday.'],
  divergences: [{ topic: 'Whether Westgate Deli pays next week.', positions: [{ participantLabel: 'participant A', view: 'Westgate Deli said they would pay next week.' }], evidence: ['Kito Foods wants the freezers before December.'], atStake: '', settledBy: '' }],
  findings: [{ text: 'Aisha sent the price list to Miriam.', participantId: 'p-aisha', label: 'participant A', hasGap: false }],
};
const reportRow = (withMarks: boolean) => ({
  id: 'r1', groundId: 'g-sales', releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
  ...JSON.parse(JSON.stringify(STORED)), centralQuestion: '',
  engagement: withMarks ? { parties: [], marksOnItsLines: theMarksOfAReport(STORED, ROWS) } : { parties: [] },
  createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
});
const groundWith = (withMarks: boolean) => ({
  id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, status: 'RESOLVED',
  initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', organizationId: 'org-1', peopleWorkTogether: true, peersVisibleToEachOther: true,
  timelineDays: 90, cadence: 'WEEKLY', whoSeesTargets: 'EVERYBODY', label: 'Sales team, Q3', participants: PEOPLE, checkIns: CHECK_INS,
  report: reportRow(withMarks), objectives: [], dependencies: [], poll: null,
});
const copy = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
function prismaFor(role: string, ground: any) {
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, create: jest.fn(async () => ({})), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => copy(ground)) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1', awaitingOrgApproval: false })) }),
    checkIn: model({ findMany: jest.fn(async () => copy(CHECK_INS)) }),
    reportActivation: model({ findUnique: jest.fn(async () => ({ status: 'ACTIVATED' })) }),
  } as any, { get(target: any, prop: string) { if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model(); return target[prop]; } });
}
const READERS: [string, string, string][] = [
  ['the lead', 'u-wairimu', 'MEMBER'],
  ['a participant (Aisha)', 'u-aisha', 'MEMBER'],
  ['a participant (Miriam)', 'u-miriam', 'MEMBER'],
  ['an admin who only reads', 'u-grace', 'ADMIN'],
];
const reportAs = async (userId: string, role: string, withMarks: boolean) => {
  const grounds: any = { getSessionProgress: jest.fn(async () => ({ completed: 2, total: 2, missingParticipantIds: [], declinedParticipantIds: [] })) };
  const extract = jest.fn(async () => { throw new Error('no model at read'); });
  const svc = new ReportsService(prismaFor(role, groundWith(withMarks)), { extract } as any, {} as any, {} as any, { get: (k: string) => k === 'app.confidenceEnabled' } as any, { emit: async () => undefined } as any, grounds, { tell: async () => [] } as any);
  return svc.get('g-sales', userId, 'org-1') as Promise<any>;
};

describe('the team report, as each reader is served it', () => {
  it.each(READERS)('%s reads a mark beside each line, with the lines unchanged', async (_w, userId, role) => {
    const r = await reportAs(userId, role, true);
    /* Changed 1 October: Aisha reads her own name as "you" (the review, section 2). */
    expect(r.sharedPicture).toContain(userId === 'u-aisha' ? 'You have a quote for Green Mart.' : 'Aisha has a quote for Green Mart.');
    expect(r.sharedPictureLines?.map((l: any) => l.markSays)).toEqual(['Proven', 'From memory only']);
    expect(r.agreementMarks?.[0]).toMatchObject({ mark: 'said', markSays: 'Only someone’s word' });
    /* The differences are served to the lead and to an admin, and to nobody else (as before). */
    if (!r.divergences) expect(userId).toMatch(/aisha|miriam/);
    else {
      expect(r.divergences[0].markSays).toBe('From memory only');
      expect(r.divergences[0].positions[0].markSays).toBe('From memory only');
      expect(r.divergences[0].evidenceMarks[0].markSays).toBe('Only someone’s word');
    }
    /* The marks are served on the lines, once, and never as a second raw copy inside the engagement block. */
    expect(JSON.stringify(r.engagement ?? {})).not.toContain('marksOnItsLines');
    expect(JSON.stringify(r)).not.toMatch(/\bscore\b|rated|specificity/i);
  });
  it('the finding carries its mark for the reader who is served it', async () => {
    const r = await reportAs('u-wairimu', 'MEMBER', true);
    const f = r.findings.find((x: any) => x.participantId === 'p-aisha');
    expect(f.markSays).toBe('Confirmed by the person who received it');
    expect(f.text).toContain('sent the price list');
  });
  it.each(READERS)('%s: a report stored before the marks reads as it always did', async (_w, userId, role) => {
    const r = await reportAs(userId, role, false);
    /* Changed 1 October: Aisha reads her own name as "you" (the review, section 2). */
    expect(r.sharedPicture).toContain(userId === 'u-aisha' ? 'You have a quote for Green Mart.' : 'Aisha has a quote for Green Mart.');
    expect(r.sharedPictureLines).toBeUndefined();
    expect(r.agreementMarks).toBeUndefined();
    if (r.divergences) {
      expect(r.divergences[0].mark).toBeUndefined();
      expect(r.divergences[0].topic).toBe('Whether Westgate Deli pays next week.');
    }
  });
});

describe('the board carries the same marks on the report’s lines', () => {
  it.each(READERS)('%s', async (_w, userId, role) => {
    const reports = Object.create(ReportsService.prototype) as ReportsService;
    const svc = new BoardService(prismaFor(role, groundWith(true)), { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
    const board: any = await svc.get('g-sales', userId);
    const d = board.divergence;
    if (d) {
      for (const item of d.items) expect(item.markSays).toBeDefined();
      if (d.agreements?.length) expect(d.agreementMarks?.[0]?.markSays).toBe('Only someone’s word');
    }
    expect(JSON.stringify(board)).not.toContain('marksOnItsLines');
  });
});

describe('when the marks are worked out', () => {
  const src = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('at the build, before the report is stored, and never at the read', () => {
    const build = src.indexOf('theMarksOfAReport(');
    const upsert = src.indexOf('const report = await this.prisma.report.upsert(');
    expect(build).toBeGreaterThan(0);
    expect(build).toBeLessThan(upsert);
    /* The serving door only attaches what was stored: it never works a mark out. */
    const door = src.slice(src.indexOf('private asItWasShared('), src.indexOf('private peersAreNamed('));
    expect(door).toContain('withTheMarksOnItsLines');
    expect(door).not.toContain('theMarksOfAReport');
    expect(door).not.toContain('recordEntry');
  });
});

describe('what each person said, for the person it is about', () => {
  it('the words for each line go only with the lines, so a colleague’s marks are not served without them', () => {
    const out: any = whatEachPersonSaidForTheSubject([
      { who: 'Aisha', isYou: true, lines: ['I sent the deck.'], lineMarks: ['proven'], lineMarksSay: ['Proven'] } as any,
      { who: 'A colleague', isYou: false, lines: ['Ade was slow.'], lineMarks: ['said'], lineMarksSay: ['Only someone’s word'] } as any,
    ]);
    expect(out[0].lineMarksSay).toEqual(['Proven']);
    expect(out[1]).not.toHaveProperty('lineMarks');
    expect(out[1]).not.toHaveProperty('lineMarksSay');
    expect(out[1].lines).toEqual([]);
  });
});
