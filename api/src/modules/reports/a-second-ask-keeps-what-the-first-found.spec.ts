import { ReportsService } from './reports.service';
import { THE_LINES_REWRITTEN } from './every-line-is-read-before-it-is-kept';
import { THE_PICTURE_SCHEMA } from './the-picture-in-plain-sentences';
import { THE_JUDGEMENT_SCHEMA, THE_ROOM_JUDGEMENT_SCHEMA } from './the-judgement-over-the-answers';
import { liftedRunIn, A_LINE_WE_COULD_NOT_RESTATE } from './said-in-its-own-words';
import { keepWhatTheFirstFound, isAnEmptyReport } from './a-second-ask-keeps-what-the-first-found';

/**
 * ASKING AGAIN MAY NOT LOSE WHAT THE FIRST DRAFT FOUND.
 *
 * Run 26, 3 October 2026: the first draft of the project report found that the two people disagree
 * on whether the project includes automating the daily reconciliation, and one line of its evidence
 * copied eight of Tomas's words. The report was asked again, the second answer had no differences
 * at all, and because no differences meant nothing left to copy it counted as "better" and was
 * stored. The lead read a picture that named the disagreement over an empty list of differences.
 *
 * End to end, through the service: the record goes in, a stand-in model drafts a difference with a
 * copied phrase, every later ask drops the difference, and what is stored and served to the lead
 * and to each participant is read.
 */

const TOMAS_SAID = 'The daily reconciliation has to be automated before we can call this project finished, in my view.';
const AMARA_SAID = 'My understanding is that the scope is the new invoicing screens and nothing more than that for now.';
const THE_ORIGINALS = [TOMAS_SAID, AMARA_SAID];

const PARTICIPANTS = [
  {
    id: 'pid-1', partyType: 'INITIATOR', createdAt: new Date('2026-03-01'), userId: 'uid-1', email: 'amara@project.test',
    roleAsDescribed: null, remitAsGiven: null, managingOnly: false, nameGiven: null, organisationGiven: null,
    user: { firstName: 'Amara', lastName: 'Obi', email: 'amara@project.test' },
  },
  {
    id: 'pid-2', partyType: 'PARTICIPANT', createdAt: new Date('2026-03-02'), userId: 'uid-2', email: 'tomas@project.test',
    roleAsDescribed: null, remitAsGiven: null, managingOnly: false, nameGiven: null, organisationGiven: null,
    user: { firstName: 'Tomas', lastName: 'Reyes', email: 'tomas@project.test' },
  },
];

const RECORD_ROWS = [
  { id: 'r1', participantId: 'pid-2', participant: { id: 'pid-2' }, checkIn: { sessionNumber: 1 }, type: 'SUCCESS_DEFINITION', text: TOMAS_SAID, disputedAt: null, saidWordForWord: true, createdAt: new Date() },
  { id: 'r2', participantId: 'pid-1', participant: { id: 'pid-1' }, checkIn: { sessionNumber: 1 }, type: 'SUCCESS_DEFINITION', text: AMARA_SAID, disputedAt: null, saidWordForWord: true, createdAt: new Date() },
];

const THE_DIFFERENCE = 'Whether the project includes automating the daily reconciliation.';

/** The first draft: one difference, and one line of its evidence copies eight of Tomas's words. */
const FIRST_DRAFT = {
  sharedPicture: 'The two of them disagree on whether the project includes automating the daily reconciliation.',
  agreements: ['Both want the new invoicing screens finished.'],
  divergences: [{
    topic: THE_DIFFERENCE,
    positions: [
      { participantLabel: 'the initiator', view: 'The initiator sees the project as the invoicing screens only.' },
      { participantLabel: 'Participant A', view: 'Participant A sees the reconciliation work as part of the project.' },
    ],
    evidence: ['Participant A said the daily reconciliation has to be automated before we can call it done.'],
    atStake: 'When the project can be called finished.',
    settledBy: 'Agreeing in writing what the project includes.',
  }],
  centralQuestion: 'Does this project include automating the daily reconciliation?',
  inferences: [{ id: 'scope-1', text: 'The scope was never written down.', participantLabel: 'the initiator', reason: 'Neither of them mentioned a written scope.' }],
};

/** What every later ask returned in run 26: the same report with the differences gone. */
const WITHOUT_THE_DIFFERENCE = {
  ...FIRST_DRAFT,
  agreements: ['Both want the new invoicing screens finished.'],
  divergences: [],
  centralQuestion: 'What should the team do next?',
};

function harness(restatement: 'drops it too' | 'restates it') {
  const upserts: any[] = [];
  const asks: string[] = [];
  const any = () => jest.fn(async () => [] as any[]);
  const prisma: any = new Proxy({
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: any() },
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g-project', initiatorId: 'uid-1', organizationId: 'o1', scenario: 'DRIFT', label: 'The invoicing project',
        brief: 'The invoicing project, and what it includes.', peopleWorkTogether: true, participants: PARTICIPANTS,
      })),
      update: jest.fn(async () => ({})),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'o1' })) },
    groundParticipant: {
      findMany: jest.fn(async (args: any) => (args?.select?.checkIns ? PARTICIPANTS.map((p) => ({ ...p, checkIns: [] })) : PARTICIPANTS)),
      findFirst: jest.fn(async () => null),
    },
    recordEntry: {
      findMany: jest.fn(async () => RECORD_ROWS),
      count: jest.fn(async () => RECORD_ROWS.length),
    },
    checkIn: {
      count: jest.fn(async () => 2),
      findMany: jest.fn(async () => [
        { participantId: 'pid-1', sessionNumber: 1, status: 'COMPLETED', turns: [] },
        { participantId: 'pid-2', sessionNumber: 1, status: 'COMPLETED', turns: [] },
      ]),
      findFirst: jest.fn(async () => ({ specificityDimensions: null, sessionNumber: 1 })),
    },
    groundDocument: { count: jest.fn(async () => 0), groupBy: any(), findMany: any() },
    adminProfile: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    report: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async (a: any) => { upserts.push(a); return { id: 'r1', groundId: 'g-project', ...a.create }; }),
      update: jest.fn(async () => ({})),
    },
  } as any, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      target[prop] = new Proxy({}, {
        get: (_t, method: string) => (method === 'count' ? jest.fn(async () => 0) : /^find(First|Unique)$/.test(method) ? jest.fn(async () => null) : jest.fn(async () => [])),
      });
      return target[prop];
    },
  });

  const anthropic: any = {
    respond: jest.fn(async (_s: string, h: any[]) => String(h?.[0]?.content ?? '')),
    extract: jest.fn(async (_system: string, history: any[], schema: any) => {
      const content = String(history?.[0]?.content ?? '');
      if (schema === THE_LINES_REWRITTEN) return { lines: [] };
      if (schema === THE_PICTURE_SCHEMA) {
        return {
          opening: 'Both people have answered. They disagree on what the project includes.',
          perPerson: [
            { participantId: 'pid-1', text: 'The initiator sees the project as the invoicing screens.', headline: null },
            { participantId: 'pid-2', text: 'Participant A sees the reconciliation work as part of the project.', headline: null },
          ],
        };
      }
      if (schema === THE_ROOM_JUDGEMENT_SCHEMA || schema === THE_JUDGEMENT_SCHEMA) {
        return { theGap: 'The two of them describe a different project.', whatTheNumbersSay: [], whatToDo: [], whatThisCannotTellYou: [], whatWeFailedToAsk: [] };
      }
      /* The synthesis and its re-asks. */
      if (/A previous attempt had a problem/.test(content)) { asks.push('again'); return structuredClone(WITHOUT_THE_DIFFERENCE); }
      if (/Here is the report you wrote/.test(content)) {
        asks.push('restate');
        if (restatement === 'drops it too') return structuredClone(WITHOUT_THE_DIFFERENCE);
        const restated = structuredClone(FIRST_DRAFT);
        restated.divergences[0].evidence = ['Participant A wants the reconciliation automated before the project counts as done.'];
        return restated;
      }
      asks.push('first');
      return structuredClone(FIRST_DRAFT);
    }),
  };

  const service = new ReportsService(prisma, { getActive: jest.fn(async () => ({ id: 'pv1', content: 'synthesize this.' })) } as any, anthropic, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, { tell: async () => [] } as any);
  return { service, upserts, asks };
}

function everyString(v: any, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, out));
  else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v).forEach((x) => everyString(x, out));
  return out;
}

async function run(restatement: 'drops it too' | 'restates it') {
  const h = harness(restatement);
  await h.service.synthesize('g-project');
  expect(h.upserts.length).toBe(1);
  const stored = h.upserts[0].create;
  const ground = { scenario: 'DRIFT', peersVisibleToEachOther: true, participants: PARTICIPANTS, report: { ...stored, sharedAs: null } };
  return {
    asks: h.asks,
    stored,
    lead: h.service.theReportAsItWasShared(ground, 'pid-1', true),
    tomas: h.service.theReportAsItWasShared(ground, 'pid-2', false),
  };
}

describe('a second ask keeps what the first draft found', () => {
  describe('when every later ask drops the difference', () => {
    let r: Awaited<ReturnType<typeof run>>;
    beforeAll(async () => { r = await run('drops it too'); });

    it('the report was asked again, and asked to restate, as in run 26', () => {
      expect(r.asks).toEqual(['first', 'again', 'restate']);
    });

    it('the stored report keeps the difference and the question written about it', () => {
      expect(r.stored.divergences.map((d: any) => d.topic)).toEqual([THE_DIFFERENCE]);
      expect(r.stored.centralQuestion).toBe('Does this project include automating the daily reconciliation?');
    });

    it('and contains no passage copied from anybody, with the line that could not be restated saying so', () => {
      const copied = everyString(r.stored).map((s) => liftedRunIn(s, THE_ORIGINALS)).filter(Boolean);
      expect(copied).toEqual([]);
      expect(r.stored.divergences[0].evidence).toEqual([A_LINE_WE_COULD_NOT_RESTATE]);
    });

    for (const who of ['lead', 'tomas'] as const) {
      it(`${who === 'lead' ? 'Amara, the lead,' : 'Tomas'} reads the difference, and none of Tomas's words copied`, () => {
        const served = r[who];
        expect(served.divergences.map((d: any) => d.topic)).toEqual([THE_DIFFERENCE]);
        expect(everyString(served).map((s) => liftedRunIn(s, THE_ORIGINALS)).filter(Boolean)).toEqual([]);
      });
    }
  });

  describe('when the restatement says it in its own words', () => {
    let r: Awaited<ReturnType<typeof run>>;
    beforeAll(async () => { r = await run('restates it'); });

    it('the difference is stored with the restated evidence', () => {
      expect(r.stored.divergences.map((d: any) => d.topic)).toEqual([THE_DIFFERENCE]);
      expect(r.stored.divergences[0].evidence).toEqual(['Participant A wants the reconciliation automated before the project counts as done.']);
      expect(everyString(r.stored).map((s) => liftedRunIn(s, THE_ORIGINALS)).filter(Boolean)).toEqual([]);
    });
  });
});

describe('keepWhatTheFirstFound', () => {
  it('puts back a list the second answer shortened, and nothing it kept or added', () => {
    const { report, putBack } = keepWhatTheFirstFound(
      { agreements: ['a', 'b'], divergences: [{ topic: 'x' }], centralQuestion: 'About x?', sharedPicture: 'one' },
      { agreements: ['a', 'b', 'c'], divergences: [], centralQuestion: 'Generic?', sharedPicture: 'two' },
    );
    expect(putBack).toEqual(['divergences']);
    expect(report).toEqual({ agreements: ['a', 'b', 'c'], divergences: [{ topic: 'x' }], centralQuestion: 'About x?', sharedPicture: 'two' });
  });

  it('puts back a part the second answer left empty', () => {
    const { report, putBack } = keepWhatTheFirstFound(
      { driftTrace: { agreedAtStart: 'y' }, divergences: [] } as any,
      { driftTrace: {}, divergences: [] } as any,
    );
    expect(putBack).toEqual(['driftTrace']);
    expect(report.driftTrace).toEqual({ agreedAtStart: 'y' });
  });

  it('changes nothing when nothing was lost', () => {
    const second = { agreements: ['a'], divergences: [{ topic: 'x' }], centralQuestion: 'q' };
    expect(keepWhatTheFirstFound({ agreements: ['a'], divergences: [{ topic: 'y' }], centralQuestion: 'p' }, second)).toEqual({ report: second, putBack: [] });
  });
});

describe('a second answer with neither differences nor agreements', () => {
  it('keeps both lists, and the central question, from the first draft', () => {
    const first = { sharedPicture: 'A.', agreements: ['Both want it done.', 'Both trust the plan.'], divergences: [{ topic: 'Scope' }], centralQuestion: 'Is it in scope?' };
    const second = { sharedPicture: 'B.', agreements: [], divergences: [], centralQuestion: 'What next?' };
    const { report, putBack } = keepWhatTheFirstFound(first, second);
    expect(report.agreements).toEqual(first.agreements);
    expect(report.divergences).toEqual(first.divergences);
    expect(report.centralQuestion).toBe('Is it in scope?');
    expect(report.sharedPicture).toBe('B.');
    expect(putBack).toEqual(['divergences', 'agreements']);
  });

  it('keeps a longer list from the second answer rather than the first', () => {
    const { report } = keepWhatTheFirstFound({ agreements: ['One.'], divergences: [] } as any, { agreements: ['One.', 'Two.'], divergences: [{ topic: 'New' }] } as any);
    expect(report.agreements).toHaveLength(2);
    expect(report.divergences).toHaveLength(1);
  });

  it('knows an empty report, so it is never stored over a full one', () => {
    expect(isAnEmptyReport({ sharedPicture: '', agreements: [], divergences: [], centralQuestion: '' })).toBe(true);
    expect(isAnEmptyReport({ sharedPicture: '', agreements: ['x'], divergences: [], centralQuestion: '' })).toBe(false);
  });
});
