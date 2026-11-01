import { ReportsService } from './reports.service';
import { THE_LINES_REWRITTEN } from './every-line-is-read-before-it-is-kept';
import { THE_PICTURE_SCHEMA } from './the-picture-in-plain-sentences';
import { THE_JUDGEMENT_SCHEMA, THE_ROOM_JUDGEMENT_SCHEMA } from './the-judgement-over-the-answers';

/**
 * WHAT A PERSON SAID REACHES THE SESSION REPORT FROM THEIR ASSESSMENT, EVEN WHEN THE RECORD'S LINE WAS LOST (the one reader, 1 November
 * 2026). On the assessment test Brian said "I spent most of Monday phoning Baraka Hardware about their unpaid fee note of KES 380,000."
 * and the lead's own record lines were lost to one failed write, while both assessments held every word. The report is written from
 * what the synthesis reads, so that is what is checked here: it reads Brian's words, under his label and never his name, and never an
 * item the assessment keeps for the lead alone.
 */
const BRIAN_SAID = 'I spent most of Monday phoning Baraka Hardware about their unpaid fee note of KES 380,000.';
const PARTICIPANTS = [
  { id: 'pid-lead', partyType: 'INITIATOR', createdAt: new Date('2026-11-01'), userId: 'u-w', email: 'w@law.test', roleAsDescribed: null, remitAsGiven: null, managingOnly: false, nameGiven: null, organisationGiven: null, user: { firstName: 'Wanjiru', lastName: 'Kamau', email: 'w@law.test' } },
  { id: 'pid-brian', partyType: 'PARTICIPANT', createdAt: new Date('2026-11-02'), userId: 'u-b', email: 'b@law.test', roleAsDescribed: null, remitAsGiven: null, managingOnly: false, nameGiven: null, organisationGiven: null, user: { firstName: 'Brian', lastName: 'Otieno', email: 'b@law.test' } },
];
const item = (words: string, extra: Record<string, unknown> = {}, whoMaySee = 'the people in this check-in') => ({ id: words.slice(0, 6), words, from: [1], whoMaySee, saidWordForWord: true, ...extra });
const ASSESSMENTS = [
  { sessionReport: {
    kind: 'assessment', version: 1, summary: '', comparedWithLastTime: {},
    about: { checkInId: 'c-lead', groundId: 'g', participantId: 'pid-lead', who: 'Wanjiru Kamau', isTheLead: true, sessionNumber: 1, endedAt: '2026-11-04T08:00:00Z' },
    setup: {
      objective: [], success: [], team: [], timing: [], rules: [], risks: [],
      targets: [item('We must collect KES 2,400,000 by the end of the year', { target: '2400000', unit: 'KES', by: 'the end of the year' })],
      privateNotes: [item('Brian is slow to send fee notes.', { about: 'Brian' }, 'the lead only')],
    },
  } },
  { sessionReport: {
    kind: 'assessment', version: 1, summary: '', setup: null, comparedWithLastTime: {},
    about: { checkInId: 'c-brian', groundId: 'g', participantId: 'pid-brian', who: 'Brian Otieno', isTheLead: false, sessionNumber: 1, endedAt: '2026-11-05T08:00:00Z' },
    numbers: [item(BRIAN_SAID, { figure: 'KES 380,000', measures: 'the fee note for Baraka Hardware' })],
    observations: [item('I think it is going fine.', { observed: 'vague answer' }, 'the lead only')],
  } },
];

async function whatTheSynthesisReads(): Promise<string> {
  let read = '';
  const any = () => jest.fn(async () => [] as any[]);
  const prisma: any = new Proxy({
    ground: { findUnique: jest.fn(async () => ({ id: 'g', initiatorId: 'u-w', organizationId: 'o', scenario: 'DRIFT', label: 'Fee notes', brief: 'The firm’s fee notes.', peopleWorkTogether: true, participants: PARTICIPANTS })), update: jest.fn(async () => ({})) },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'o' })) },
    groundParticipant: { findMany: jest.fn(async (a: any) => (a?.select?.checkIns ? PARTICIPANTS.map((p) => ({ ...p, checkIns: [] })) : PARTICIPANTS)), findFirst: jest.fn(async () => null) },
    /* The record's lines were lost to a failed write: nothing is in them. */
    recordEntry: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    checkIn: {
      count: jest.fn(async () => 2),
      findMany: jest.fn(async (a: any) => (a?.select?.sessionReport ? ASSESSMENTS : [
        { participantId: 'pid-lead', sessionNumber: 1, status: 'COMPLETED', turns: [] },
        { participantId: 'pid-brian', sessionNumber: 1, status: 'COMPLETED', turns: [] },
      ])),
      findFirst: jest.fn(async () => ({ specificityDimensions: null, sessionNumber: 1 })),
    },
    groundDocument: { count: jest.fn(async () => 0), groupBy: any(), findMany: any() },
    adminProfile: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    report: { findUnique: jest.fn(async () => null), upsert: jest.fn(async (a: any) => ({ id: 'r1', ...a.create })), update: jest.fn(async () => ({})) },
  } as any, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      target[prop] = new Proxy({}, { get: (_t, m: string) => (m === 'count' ? jest.fn(async () => 0) : /^find(First|Unique)$/.test(m) ? jest.fn(async () => null) : jest.fn(async () => [])) });
      return target[prop];
    },
  });
  const anthropic: any = {
    respond: jest.fn(async (_s: string, h: any[]) => String(h?.[0]?.content ?? '')),
    extract: jest.fn(async (_s: string, history: any[], schema: any) => {
      if (schema === THE_LINES_REWRITTEN) return { lines: [] };
      if (schema === THE_PICTURE_SCHEMA) return { opening: 'Two people have answered.', perPerson: [] };
      if (schema === THE_ROOM_JUDGEMENT_SCHEMA || schema === THE_JUDGEMENT_SCHEMA) return { theGap: '', whatTheNumbersSay: [], whatToDo: [], whatThisCannotTellYou: [], whatWeFailedToAsk: [] };
      if (!read) read = String(history?.[0]?.content ?? '');
      return { sharedPicture: 'Brian is collecting a fee note.', agreements: [], divergences: [], centralQuestion: 'When will Baraka Hardware pay?' };
    }),
  };
  const service = new ReportsService(prisma, { getActive: jest.fn(async () => ({ id: 'pv1', content: 'synthesize this.' })) } as any, anthropic, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, { tell: async () => [] } as any);
  await service.synthesize('g').catch(() => undefined);
  return read;
}

describe('what was said reaches the session report from the assessments', () => {
  let read = '';
  beforeAll(async () => { read = await whatTheSynthesisReads(); });

  it('reads Brian’s fee note in his own words, with its figure, though the record’s lines are empty', () => {
    expect(read).toContain(`(numbers) ${BRIAN_SAID} (KES 380,000, for the fee note for Baraka Hardware)`);
  });

  it('reads the lead’s target, said in setup, though the target writer wrote nothing', () => {
    expect(read).toContain('(setup.targets) We must collect KES 2,400,000 by the end of the year (2400000, KES, by the end of the year)');
  });

  it('never reads an item kept for the lead alone: her private note, or what was noticed about Brian', () => {
    expect(read).not.toContain('slow to send fee notes');
    expect(read).not.toContain('I think it is going fine');
  });

  it('puts each person under their label, never their name', () => {
    expect(read).not.toMatch(/\[(Wanjiru|Brian)/);
  });
});

/*
 * "NOBODY HAS SAID WHAT SUCCESS LOOKS LIKE" WAS UNTRUE (assessment test, A1): the lead said it in setup, and her record's lines were
 * lost. What success looks like, as she said it, is read from her assessment too, behind the same wall as the lines.
 */
describe('what success looks like, as it was said, from the assessments', () => {
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = { checkIn: { findMany: jest.fn(async ({ where }: any) => ASSESSMENTS.filter((a) => !where.participantId || where.participantId.in.includes(a.sessionReport.about.participantId))) } };

  it('the lead reads her own target as said, though no line holds it', async () => {
    const got = await svc.whatSuccessWasSaid('g', ['pid-lead', 'pid-brian'], true, []);
    expect(got).toEqual([{ type: 'SUCCESS_DEFINITION', text: 'We must collect KES 2,400,000 by the end of the year', participantId: 'pid-lead' }]);
  });

  it('is not given twice when a line already holds it, and never to a reader not allowed that person', async () => {
    expect(await svc.whatSuccessWasSaid('g', ['pid-lead'], true, [{ text: 'We must collect KES 2,400,000 by the end of the year.' }])).toEqual([]);
    expect(await svc.whatSuccessWasSaid('g', ['pid-brian'], false, [])).toEqual([]);
  });
});
