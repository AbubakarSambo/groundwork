import { THE_LINES_REWRITTEN } from './every-line-is-read-before-it-is-kept';
import { ReportsService } from './reports.service';
import { THE_PICTURE_SCHEMA } from './the-picture-in-plain-sentences';
import { THE_JUDGEMENT_SCHEMA, THE_ROOM_JUDGEMENT_SCHEMA } from './the-judgement-over-the-answers';
import { runAtOnce } from './run-at-once-with-a-cap';
import { theSentenceWhileItIsWritten } from './the-report-is-being-written';

/**
 * WEEK 25. THE REPORT TAKES MINUTES FOR NINE PEOPLE, SO CALLS THAT DO NOT NEED EACH OTHER RUN TOGETHER
 * AND THE LEAD IS TOLD WHILE IT IS BEING WRITTEN.
 *
 * A stand-in model that waits before it answers, and notes when each call started and ended. What is
 * proved: the sentence on what a gap costs and the picture of the people are asked at the same time;
 * the judgement waits for the picture, because it is given what the picture wrote; the synthesis
 * comes first; every call is given exactly what it was given when they ran one after the other; and
 * the report that is stored is the same.
 */
const ZAINAB_SAID = "Since March 11th, I've been almost entirely focused on inbound sales support as requested by Nadia, which has meant no progress on the three partnerships.";
const NADIA_SAID = 'We had three key targets for January. Neither party has signed the partnership terms yet.';

const PARTICIPANTS = [
  {
    id: 'pid-1', partyType: 'INITIATOR', createdAt: new Date('2026-03-01'), userId: 'uid-1', email: 'nadia@drift.test',
    roleAsDescribed: null, remitAsGiven: null, managingOnly: false, nameGiven: null, organisationGiven: null,
    user: { firstName: 'Nadia', lastName: 'Haddad', email: 'nadia@drift.test' },
  },
  {
    id: 'pid-2', partyType: 'PARTICIPANT', createdAt: new Date('2026-03-02'), userId: 'uid-2', email: 'zainab@drift.test',
    roleAsDescribed: 'Partnerships lead. Three named partnerships to close this year.', remitAsGiven: 'Partnerships lead. Three named partnerships to close this year.',
    managingOnly: false, nameGiven: null, organisationGiven: null,
    user: { firstName: 'Zainab', lastName: 'Suleiman', email: 'zainab@drift.test' },
  },
];
/* Labels as labelsForParties hands them out for these two. */
const ZAINABS_LABEL = 'Participant A';

/* A line the record reader tidied: what Zainab meant, in the reader's words. It is on the record and
   the report may read it, but it is not an original, so nothing may quote it. */
const TIDIED = 'The three partnerships have had no progress since the sales work began.';

const RECORD_ROWS = [
  { id: 'r1', participantId: 'pid-2', participant: { id: 'pid-2' }, checkIn: { sessionNumber: 1 }, type: 'WORRY', text: ZAINAB_SAID, disputedAt: null, saidWordForWord: true, createdAt: new Date() },
  { id: 'r2', participantId: 'pid-1', participant: { id: 'pid-1' }, checkIn: { sessionNumber: 1 }, type: 'SUCCESS_DEFINITION', text: NADIA_SAID, disputedAt: null, saidWordForWord: true, createdAt: new Date() },
  { id: 'r3', participantId: 'pid-2', participant: { id: 'pid-2' }, checkIn: { sessionNumber: 1 }, type: 'PROGRESS', text: TIDIED, disputedAt: null, saidWordForWord: false, createdAt: new Date() },
];
const THE_ORIGINALS = [ZAINAB_SAID, NADIA_SAID, PARTICIPANTS[1].roleAsDescribed!];

function harness(delayMs: number, oneAtATime: boolean) {
  const upserts: any[] = [];
  const corpora: string[] = [];
  const any = () => jest.fn(async () => [] as any[]);
  const prisma: any = new Proxy({
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: any() },
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g-drift', initiatorId: 'uid-1', organizationId: 'o1', scenario: 'DRIFT', label: 'The partnerships work',
        brief: 'The partnerships work has been quiet since March.', peopleWorkTogether: true, participants: PARTICIPANTS,
      })),
      update: jest.fn(async () => ({})),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'o1' })) },
    groundParticipant: {
      findMany: jest.fn(async (args: any) => (args?.select?.checkIns ? PARTICIPANTS.map((p) => ({ ...p, checkIns: [] })) : PARTICIPANTS)),
      findFirst: jest.fn(async () => null),
    },
    recordEntry: {
      findMany: jest.fn(async (args: any) => RECORD_ROWS.filter((r) => !(args?.where?.disputedAt === null && r.disputedAt))),
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
      upsert: jest.fn(async (a: any) => { upserts.push(a); return { id: 'r1', groundId: 'g-drift', ...a.create }; }),
      update: jest.fn(async () => ({})),
    },
  } as any, {
    /* Every other table the synthesis reads is empty here: nothing on it, nothing to quote from it. */
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      target[prop] = new Proxy({}, {
        get: (_t, method: string) => (method === 'count' ? jest.fn(async () => 0) : /^find(First|Unique)$/.test(method) ? jest.fn(async () => null) : jest.fn(async () => [])),
      });
      return target[prop];
    },
  });

  const log: { name: string; start: number; end: number; system: string; content: string }[] = [];
  const t0 = Date.now();
  let chain: Promise<unknown> = Promise.resolve();
  const answer = (schema: any, history: any[]) => {
    const corpus = String(history?.[0]?.content ?? '');
    if (schema === THE_LINES_REWRITTEN) return { lines: [] };
    if (schema?.name === 'emit_at_stake') return { atStake: 'If this holds, the partnerships could stay where they are.' };
    if (schema === THE_PICTURE_SCHEMA) {
      return {
        opening: 'Two of two people have answered.',
        perPerson: [
          { participantId: 'pid-1', text: 'The initiator set three key targets for January.', headline: null },
          { participantId: 'pid-2', text: `${ZAINABS_LABEL} has been on inbound sales support since March.`, headline: null },
        ],
      };
    }
    if (schema === THE_ROOM_JUDGEMENT_SCHEMA || schema === THE_JUDGEMENT_SCHEMA) {
      return { theGap: `The three partnerships have not moved since ${ZAINABS_LABEL} moved to sales support.`, whatTheNumbersSay: [], whatToDo: [], whatThisCannotTellYou: [], whatWeFailedToAsk: [] };
    }
    return {
      sharedPicture: `${ZAINABS_LABEL} says the work has stopped.`,
      agreements: [],
      divergences: [{
        topic: `What ${ZAINABS_LABEL} has been working on since March.`,
        positions: [
          { participantLabel: 'the initiator', view: 'The initiator expected progress on the three key targets.' },
          { participantLabel: ZAINABS_LABEL, view: `${ZAINABS_LABEL} says sales support has come first.` },
        ],
        evidence: [],
      }],
      centralQuestion: 'What should come first now?',
    };
  };
  const anthropic: any = {
    respond: jest.fn(async (_s: string, h: any[]) => String(h?.[0]?.content ?? '')),
    extract: jest.fn(async (system: string, history: any[], schema: any) => {
      const name = schema === THE_PICTURE_SCHEMA ? 'picture'
        : (schema === THE_ROOM_JUDGEMENT_SCHEMA || schema === THE_JUDGEMENT_SCHEMA) ? 'judgement'
        : schema === THE_LINES_REWRITTEN ? 'rewrite'
        : schema?.name === 'emit_at_stake' ? 'atStake' : 'synthesis';
      const run = async () => {
        const start = Date.now() - t0;
        await new Promise((r) => setTimeout(r, delayMs));
        log.push({ name, start, end: Date.now() - t0, system, content: String(history?.[0]?.content ?? '') });
        return answer(schema, history);
      };
      if (!oneAtATime) return run();
      const mine = chain.then(run);
      chain = mine.catch(() => undefined);
      return mine;
    }),
  };
  const service = new ReportsService(prisma, { getActive: jest.fn(async () => ({ id: 'pv1', content: 'synthesize this.' })) } as any, anthropic, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, { tell: async () => [] } as any);
  return { service, upserts, log };
}

const callsAsAsked = (log: { name: string; system: string; content: string }[]) =>
  log.map((c) => `${c.name}\n${c.system}\n${c.content}`).sort();
const whatWasStored = (upserts: any[]) => JSON.parse(JSON.stringify(upserts[0].create, (k, v) => (k === 'builtAt' ? undefined : v)));

describe('the report is written faster without changing what is written', () => {
  const DELAY = 120;
  let together: ReturnType<typeof harness>;
  let oneByOne: ReturnType<typeof harness>;

  beforeAll(async () => {
    together = harness(DELAY, false);
    await together.service.synthesize('g-drift');
    oneByOne = harness(DELAY, true);
    await oneByOne.service.synthesize('g-drift');
  });

  const at = (h: ReturnType<typeof harness>, name: string) => h.log.find((c) => c.name === name)!;

  it('the sentence on what a gap costs and the picture of the people are asked at the same time', () => {
    const a = at(together, 'atStake'); const p = at(together, 'picture');
    expect(a).toBeDefined(); expect(p).toBeDefined();
    expect(a.start).toBeLessThan(p.end);
    expect(p.start).toBeLessThan(a.end);
  });

  it('the synthesis comes first, and the judgement waits for the picture and for the gap sentences', () => {
    const s = at(together, 'synthesis'); const a = at(together, 'atStake'); const p = at(together, 'picture'); const j = at(together, 'judgement');
    expect(s.end).toBeLessThanOrEqual(a.start + 5);
    expect(s.end).toBeLessThanOrEqual(p.start + 5);
    expect(j.start).toBeGreaterThanOrEqual(p.end - 5);
    expect(j.start).toBeGreaterThanOrEqual(a.end - 5);
  });

  it('every call is given exactly what it was given when they ran one after the other', () => {
    expect(callsAsAsked(together.log)).toEqual(callsAsAsked(oneByOne.log));
  });

  it('the report that is stored is the same', () => {
    expect(together.upserts.length).toBe(1);
    expect(whatWasStored(together.upserts)).toEqual(whatWasStored(oneByOne.upserts));
  });

  it('it takes less time than one after the other', () => {
    const span = (h: ReturnType<typeof harness>) => Math.max(...h.log.map((c) => c.end)) - Math.min(...h.log.map((c) => c.start));
    expect(span(together)).toBeLessThan(span(oneByOne) - DELAY / 2);
  });
});

describe('runAtOnce', () => {
  it('runs independent jobs together up to the cap, and gives the results back in the order given', async () => {
    let now = 0; let most = 0;
    const out = await runAtOnce([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, async (n) => {
      now++; most = Math.max(most, now);
      await new Promise((r) => setTimeout(r, 10 * (10 - n)));
      now--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18]);
    expect(most).toBe(4);
  });
  it('with a cap of one keeps the order jobs start in', async () => {
    const started: number[] = [];
    await runAtOnce([1, 2, 3], 1, async (n) => { started.push(n); await new Promise((r) => setTimeout(r, 5)); });
    expect(started).toEqual([1, 2, 3]);
  });
});

describe('the readers are warmed together, each given what it was given before', () => {
  it('nine people, the lead and an admin are read at once, four at a time, each with the same two reads', async () => {
    const svc = Object.create(ReportsService.prototype) as any;
    svc.logger = { warn() {}, log() {} };
    const people = Array.from({ length: 9 }, (_, i) => ({ userId: `u-${i}` }));
    svc.prisma = {
      ground: { findUnique: async () => ({ organizationId: 'o', initiatorId: 'lead', scenario: 'OKR_ALIGNMENT', participants: people, report: { direction: null } }) },
      user: { findFirst: async () => ({ id: 'admin' }) },
    };
    let now = 0; let most = 0;
    const asked: string[] = [];
    const slow = async (tag: string, userId: string) => {
      asked.push(`${tag}:${userId}`); now++; most = Math.max(most, now);
      await new Promise((r) => setTimeout(r, 20)); now--; return { tag };
    };
    svc.sessionReport = (_g: string, n: number, userId: string) => slow(`session${n}`, userId);
    svc.get = (_g: string, userId: string) => slow('report', userId);
    const out = await svc.wordTheReadsNow('g', 3);
    expect(out.map((o: any) => o.userId)).toEqual(['lead', ...people.map((p) => p.userId), 'admin']);
    expect(asked.filter((a) => a.startsWith('session3:')).length).toBe(11);
    expect(asked.filter((a) => a.startsWith('report:')).length).toBe(11);
    expect(most).toBeGreaterThan(1);
    expect(most).toBeLessThanOrEqual(4);
  });
});

describe('the lead is told while the report is being written', () => {
  it('reads as a plain sentence, with names where they are known', () => {
    expect(theSentenceWhileItIsWritten(['Participant A', 'Participant B']))
      .toBe('The report is being written with what Participant A and Participant B said. It will include everyone in a few minutes.');
    expect(theSentenceWhileItIsWritten(['Participant A'])).toBe('The report is being written with what Participant A said. It will include everyone in a few minutes.');
    expect(theSentenceWhileItIsWritten(['A', 'B', 'C', 'D', 'E'])).toBe('The report is being written with what A, B, C and others said. It will include everyone in a few minutes.');
    expect(theSentenceWhileItIsWritten([])).toBe('The report is being written. It will include everyone in a few minutes.');
  });

  function reading(ground: any, answeredIds: string[]) {
    const svc = Object.create(ReportsService.prototype) as any;
    svc.prisma = {
      ground: { findUnique: jest.fn(async () => ground) },
      checkIn: { findMany: jest.fn(async () => answeredIds.map((participantId) => ({ participantId }))) },
    };
    return svc;
  }

  it('appears on the lead\'s read while a synthesis is out, names the people who have answered, and is gone when it ends; nobody else reads it; opening builds nothing', async () => {
    const { Syntheses } = await import('../reports/the-report-is-being-written');
    const svc = reading({ initiatorId: 'uid-1', participants: PARTICIPANTS }, ['pid-2']);
    svc.synthesesOut = new Syntheses();
    const built = jest.fn();
    svc.synthesize = built; svc.synthesizeNow = built;
    const report = { sharedPicture: 'x' };

    expect(await svc.withBeingWritten('g', 'uid-1', report)).toEqual(report);
    svc.synthesesOut.begin('g', new Date('2026-10-01T10:00:00Z'));
    const lead = await svc.withBeingWritten('g', 'uid-1', report);
    expect(lead.beingWritten).toEqual({
      since: '2026-10-01T10:00:00.000Z',
      sentence: 'The report is being written with what Participant A said. It will include everyone in a few minutes.',
    });
    expect(await svc.withBeingWritten('g', 'uid-2', report)).toEqual(report);
    expect(built).not.toHaveBeenCalled();
    expect(svc.synthesesOut.since('g')).not.toBeNull();
    svc.synthesesOut.end('g');
    expect(await svc.withBeingWritten('g', 'uid-1', report)).toEqual(report);
  });

  it('is on while synthesize runs and off when it finishes, including when it fails', async () => {
    const svc = Object.create(ReportsService.prototype) as any;
    const { Syntheses } = await import('../reports/the-report-is-being-written');
    svc.synthesesOut = new Syntheses(); svc.synthesisQueue = new Map(); svc.synthesisWaiting = new Map();
    let inside: Date | null = null;
    svc.synthesizeNow = async () => { inside = svc.synthesesOut.since('g'); await new Promise((r) => setTimeout(r, 5)); return 1; };
    await svc.synthesize('g');
    expect(inside).not.toBeNull();
    expect(svc.synthesesOut.since('g')).toBeNull();
    svc.synthesizeNow = async () => { throw new Error('no'); };
    await expect(svc.synthesize('g')).rejects.toThrow();
    expect(svc.synthesesOut.since('g')).toBeNull();
  });
});
