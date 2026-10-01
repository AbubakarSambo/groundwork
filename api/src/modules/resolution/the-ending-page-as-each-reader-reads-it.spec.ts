import { GroundScenario, GroundStatus, PartyType } from '@prisma/client';
import { ResolutionService } from './resolution.service';
import { SuggestionsService } from '../suggestions/suggestions.service';
import { aSuggestionFromTheRecord } from '../suggestions/a-suggestion-reached-from-the-record';
import { DEFAULT_SUGGESTION_THRESHOLDS } from '../suggestions/thresholds';
import { labelsForParties } from '../reports/party-labels';

/**
 * THE ENDING PAGE, AS EACH READER READS IT (week 11; B6 "How does this end?").
 *
 * Wairimu runs "Kwame, first 90 days". Kwame is in it, and so is Aisha, a colleague on the same
 * check-in. Grace is an admin who is not in it. The engine has reached a suggestion about Kwame
 * (fewer than half of his commitments kept, with 6 or more settled), and there is one pattern that
 * has come up in three check-ins and that Kwame has answered.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - Wairimu reads the suggestion, the signals and the questions, with no count in any of it;
 *   - Kwame reads his own facts and the decision with its reasons, never the suggestion as a label,
 *     never the questions written for the lead;
 *   - Aisha, a colleague, reads nothing about Kwame;
 *   - Grace reads nothing of a suggestion that is not appealed, and nothing at all on an evaluation
 *     check-in she was not given access to;
 *   - nobody reads a label on a person.
 */

const ORG = 'org1';
const WAIRIMU = 'u-wairimu';
const KWAME = 'u-kwame';
const AISHA = 'u-aisha';
const GRACE = 'u-grace';

const party = (id: string, userId: string, type: PartyType, first: string, at: number) => ({
  id, userId, email: `${first.toLowerCase()}@baridi.test`, partyType: type, createdAt: new Date(2026, 6, at),
  roleAsDescribed: 'Sales', nameGiven: null, detectedFunction: null, detectedFunctionConfidence: null,
  user: { firstName: first, lastName: '', email: `${first.toLowerCase()}@baridi.test` },
});
const participants = [
  party('p-wairimu', WAIRIMU, PartyType.INITIATOR, 'Wairimu', 1),
  party('p-kwame', KWAME, PartyType.PARTICIPANT, 'Kwame', 2),
  party('p-aisha', AISHA, PartyType.PARTICIPANT, 'Aisha', 3),
];

const longAgo = new Date('2026-08-01T00:00:00Z');
const patterns = [
  {
    id: 'pat-1', participantId: 'p-kwame', code: 'A2', observationText: 'Stock problems were raised late, three times.',
    periodsObserved: 3, seenInSessions: [2, 3, 4], readyAt: longAgo, shownToPersonAt: longAgo,
    personAnswer: 'Onboarding stock took three weeks.', personAnsweredAt: longAgo,
    leadMark: null, talkedAboutAt: null, talkedAboutAtPeriod: null, evidenceSource: null,
  },
];

function world(opts: { scenario?: GroundScenario; decided?: boolean; createdByUserId?: string | null } = {}) {
  const ground = {
    id: 'g1', label: 'Kwame, first 90 days', organizationId: ORG, initiatorId: WAIRIMU, createdByUserId: opts.createdByUserId ?? null,
    /* CHANGED 1 October: a suggestion is reached only on an evaluation check-in (decision 6, clarified
       29 September), so the world these tests read is a performance plan. The prototype's "first 90
       days" ending is noted for Hafsah, not built. */
    scenario: opts.scenario ?? GroundScenario.PIP, cadence: 'WEEKLY', peersVisibleToEachOther: null, status: GroundStatus.ACTIVE,
    participants, patternDetections: patterns,
  };
  const suggestions: any[] = [];
  const members: Record<string, string> = { [GRACE]: 'ADMIN', [WAIRIMU]: 'MEMBER', [KWAME]: 'MEMBER', [AISHA]: 'MEMBER' };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.id) return participants.find((p) => p.id === where.id && (!where.groundId || where.groundId === 'g1')) ?? null;
        return participants.find((p) => p.userId === where.userId) ?? null;
      }),
      findMany: jest.fn(async () => participants),
    },
    user: { findFirst: jest.fn(async ({ where }: any) => (members[where.id] === 'ADMIN' ? { id: where.id, role: 'ADMIN', organizationId: ORG } : null)),
            findMany: jest.fn(async () => []) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: members[where.userId_organizationId.userId] ?? 'MEMBER' })) },
    resolution: { findUnique: jest.fn(async () => null) },
    platformSetting: { findUnique: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    patternDetection: { updateMany: jest.fn(async () => ({})) },
    suggestion: {
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: 's-1', decision: null, decisionReason: null, decidedById: null, decidedAt: null, theirSide: null, theirSideAt: null,
          appeal: null, appealedAt: null, appealOutcome: null, appealReason: null, appealDecidedById: null, appealDecidedAt: null,
          createdAt: new Date('2026-08-01T00:00:00Z'), ...data,
        };
        suggestions.push(row);
        return { id: row.id };
      }),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async ({ where }: any) => suggestions.filter((r) => {
        if (where?.about) return participants.find((p) => p.id === r.aboutParticipantId)?.userId === where.about.userId;
        return true;
      })),
    },
    /* The word-once cache: nothing kept, nothing asked. */
    wordedLine: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
  };
  const svc = new SuggestionsService(prisma);
  const resolution = new ResolutionService(prisma, {} as any, {} as any, {} as any, { get: () => '' } as any, svc);
  return { prisma, svc, resolution, suggestions };
}

async function withASuggestion(w: ReturnType<typeof world>, decided = false) {
  const made = aSuggestionFromTheRecord('g1', {
    aboutParticipantId: 'p-kwame', aboutLabel: labelsForParties(participants as any).get('p-kwame')!,
    leadLabel: labelsForParties(participants as any).get('p-wairimu')!,
    commitmentsSettledRecently: { kept: 2, of: 8 }, ownWords: 'Onboarding stock took three weeks.',
  }, DEFAULT_SUGGESTION_THRESHOLDS)!;
  expect(made).not.toBeNull();
  await w.svc.record(made);
  if (decided) {
    Object.assign(w.suggestions[0], { decision: 'Extra support for the next six weeks', decisionReason: 'The stock delay was not his doing.', decidedAt: new Date('2026-08-05') });
  }
}

const served = (x: unknown) => JSON.stringify(x);
const LABELS = /\b(PIP|at[- ]risk|exit|low[- ]performer|underperform\w*)\b/i;
const RATINGS = /specificity|confidence|severity|rating|score|"verdict"/i;

describe('Wairimu, who runs the check-in, reads the suggestion, the signals and the questions', () => {
  it('reads the suggestion for Kwame, with no count in anything she reads', async () => {
    const w = world();
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', WAIRIMU) as any).theEndingPage;
    expect(page.reader).toBe('lead');
    expect(page.suggestions).toHaveLength(1);
    const s = page.suggestions[0];
    expect(s.headline).toBe('Groundwork suggests extra support for Kwame');
    expect(s.why).toBe('In the last four weeks, Kwame has kept fewer of the commitments made in this check-in than Groundwork looks for.');
    expect(s.whatWouldChangeIt).toBe('If Kwame keeps more of the commitments made in this check-in over the next four weeks.');
    expect(s.theirOwnAnswer).toBe('Onboarding stock took three weeks.');
    expect(s.otherChoices).toEqual(['Keep things as they are', 'Talk it through with Kwame before deciding']);
    /* decision 53: no count for the lead, anywhere in what the page hands her. */
    expect(served(page)).not.toMatch(/\d+ of \d+|\d+ in 100|\d+%/);
    expect(served(page)).not.toMatch(LABELS);
    expect(served(page)).not.toMatch(RATINGS);
  });

  it('reads the signal behind it as a plain sentence, with what Kwame said beside it', async () => {
    const w = world();
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', WAIRIMU) as any).theEndingPage;
    expect(page.signals).toHaveLength(1);
    expect(page.signals[0]).toMatchObject({
      participantId: 'p-kwame', yours: false, heading: 'Steps in to stop things failing',
      whatHappened: 'Stock problems were raised late, three times.', theirWords: 'Onboarding stock took three weeks.',
    });
    expect(page.signals[0].whoSeesIt).toBe('Kwame saw this first and said what is behind it.');
    /* A pattern is never joined to a name in one string. */
    expect(page.signals[0].heading).not.toMatch(/Kwame/);
  });

  it('reads the questions to ask, in plain full sentences', async () => {
    const w = world();
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', WAIRIMU) as any).theEndingPage;
    const asked = page.questions.map((q: any) => q.question);
    expect(asked).toContain("Were Kwame's goals clear enough from the first day?");
    expect(asked).toContain('Is there something Kwame needed from you or from the team that has not been given yet?');
    expect(asked.every((q: string) => /[.?]$/.test(q))).toBe(true);
    expect(page.questions.every((q: any) => q.aboutName === 'Kwame')).toBe(true);
  });

  it('reads no suggestion while Kwame has not had his turn (decision 53), but still the signals', async () => {
    const w = world();
    await withASuggestion(w);
    w.suggestions[0].createdAt = new Date(); // reached just now, not yet seen or answered
    const page = (await w.resolution.get('g1', WAIRIMU) as any).theEndingPage;
    expect(page.suggestions).toEqual([]);
    expect(page.questions.map((q: any) => q.question)).not.toContain("Were Kwame's goals clear enough from the first day?");
  });

  it('reads an empty page, not an error, when nothing was reached', async () => {
    const w = world();
    const page = (await w.resolution.get('g1', WAIRIMU) as any).theEndingPage;
    expect(page.suggestions).toEqual([]);
  });
});

describe('Kwame, the person it is about, reads his own facts and the decision with its reasons', () => {
  it('reads the facts, what would change them, and never the suggestion, the verdict or the questions', async () => {
    const w = world();
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', KWAME) as any).theEndingPage;
    expect(page.reader).toBe('person');
    expect(page.suggestions).toEqual([]);
    expect(page.questions).toEqual([]);
    expect(page.aboutYou).toHaveLength(1);
    expect(page.aboutYou[0].facts).toBe(
      'In the last four weeks, you kept two of your eight commitments in this check-in. When fewer than half are kept, Groundwork suggests extra help to Wairimu.',
    );
    expect(page.aboutYou[0].whatWouldChangeIt).toBe('Keeping at least half of your commitments in this check-in over the next four weeks.');
    expect(page.aboutYou[0].decision).toBeNull();
    expect(served(page)).not.toMatch(/Groundwork suggests extra support for/);
    expect(served(page)).not.toMatch(LABELS);
    expect(served(page)).not.toMatch(RATINGS);
  });

  it('reads the decision with its reasons once it is made, and his own signal', async () => {
    const w = world();
    await withASuggestion(w, true);
    const page = (await w.resolution.get('g1', KWAME) as any).theEndingPage;
    expect(page.aboutYou[0].decision).toMatchObject({ says: 'Extra support for the next six weeks', reasons: 'The stock delay was not his doing.' });
    expect(page.signals).toHaveLength(1);
    expect(page.signals[0].yours).toBe(true);
    expect(page.signals[0].whoSeesIt).toBe('Wairimu can see this too, with anything you say about it. Nothing is decided from it.');
  });
});

describe('Aisha, a colleague on the same check-in, reads nothing about Kwame', () => {
  it('reads no suggestion, no signal and no question', async () => {
    const w = world();
    await withASuggestion(w, true);
    const page = (await w.resolution.get('g1', AISHA) as any).theEndingPage;
    expect(page).toMatchObject({ reader: 'person', suggestions: [], aboutYou: [], signals: [], questions: [], appealed: [] });
    expect(served(page)).not.toMatch(/Kwame/);
  });
});

describe('Grace, an admin who is not in the check-in', () => {
  it('reads no suggestion that is not appealed, and no question, on a check-in she set up', async () => {
    const w = world({ createdByUserId: GRACE });
    await withASuggestion(w, true);
    const page = (await w.resolution.get('g1', GRACE) as any).theEndingPage;
    expect(page).toMatchObject({ reader: 'admin', suggestions: [], aboutYou: [], appealed: [], questions: [] });
  });

  it('reads the suggestion only once it is appealed', async () => {
    const w = world({ createdByUserId: GRACE });
    await withASuggestion(w, true);
    Object.assign(w.suggestions[0], { appeal: 'I did not get the stock.', appealedAt: new Date('2026-08-06') });
    const page = (await w.resolution.get('g1', GRACE) as any).theEndingPage;
    expect(page.appealed).toHaveLength(1);
    expect(page.appealed[0].appeal.says).toBe('I did not get the stock.');
  });

  it('reads nothing at all on an evaluation check-in she was not given access to', async () => {
    const w = world({ scenario: GroundScenario.PIP });
    await withASuggestion(w, true);
    await expect(w.resolution.get('g1', GRACE)).rejects.toThrow('You are not part of this check-in.');
  });

  it('reads the signals and no suggestion when she set the check-in up and handed it to Wairimu', async () => {
    const w = world({ scenario: GroundScenario.PIP, createdByUserId: GRACE });
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', GRACE) as any).theEndingPage;
    expect(page.suggestions).toEqual([]);
    expect(page.signals).toHaveLength(1);
  });
});

/**
 * ON AN ORDINARY CHECK-IN, NOTHING (decision 6, clarified 29 September). "Kwame, first 90 days" is a
 * new hire's check-in, not an evaluation one. Nothing can be reached on it, and a row that exists on
 * it anyway (written before this rule, or by hand) is served to nobody, decided and appealed with it.
 */
describe('on a first-90-days check-in, which is not an evaluation check-in', () => {
  async function aRowThatShouldNotBeThere() {
    const w = world({ scenario: GroundScenario.NEW_HIRE });
    await expect(withASuggestion(w)).rejects.toThrow('A suggestion is only reached on a performance plan, a recognition or a contract renewal.');
    const made = aSuggestionFromTheRecord('g1', {
      aboutParticipantId: 'p-kwame', aboutLabel: labelsForParties(participants as any).get('p-kwame')!,
      commitmentsSettledRecently: { kept: 2, of: 8 }, ownWords: null,
    }, DEFAULT_SUGGESTION_THRESHOLDS)!;
    w.suggestions.push({
      ...made, id: 's-old', organizationId: ORG, decision: 'Extra support', decisionReason: 'Stock was late.', decidedById: WAIRIMU, decidedAt: new Date('2026-08-05'),
      theirSide: 'Stock took three weeks.', theirSideAt: new Date('2026-08-02'), appeal: 'I did not get the stock.', appealedAt: new Date('2026-08-06'),
      appealOutcome: null, appealReason: null, appealDecidedById: null, appealDecidedAt: null, createdAt: new Date('2026-08-01T00:00:00Z'),
    });
    return w;
  }

  it.each([['Wairimu', WAIRIMU], ['Kwame', KWAME], ['Aisha', AISHA], ['Grace', GRACE]])('%s reads no suggestion, count or what would change it', async (_who, userId) => {
    const w = await aRowThatShouldNotBeThere();
    const page = (await w.resolution.get('g1', userId) as any).theEndingPage;
    expect(page).toMatchObject({ suggestions: [], aboutYou: [], appealed: [] });
    expect(served(page)).not.toMatch(/Groundwork suggests|commitments|What would change|kept/i);
  });
});
