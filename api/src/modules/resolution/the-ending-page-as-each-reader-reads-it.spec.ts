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
 *   - Wairimu reads the suggestion, with the count behind it (decision 86), the signals and the questions;
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
  it('reads the suggestion for Kwame, with the count behind it (decision 86)', async () => {
    const w = world();
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', WAIRIMU) as any).theEndingPage;
    expect(page.reader).toBe('lead');
    expect(page.suggestions).toHaveLength(1);
    const s = page.suggestions[0];
    expect(s.headline).toBe('Groundwork suggests extra support for Kwame');
    expect(s.why).toBe('In the last four weeks, Kwame kept two of the eight commitments made in this check-in. That is 25%. When fewer than half are kept, Groundwork suggests extra support.');
    expect(s.whatWouldChangeIt).toBe('If Kwame keeps at least half of the commitments made in this check-in over the next four weeks.');
    expect(s.theirOwnAnswer).toBe('Onboarding stock took three weeks.');
    expect(s.otherChoices).toEqual(['Keep things as they are', 'Talk it through with Kwame before deciding']);
    /* Decision 86 reverses decision 53: the lead reads the count, said once, in the suggestion's why. */
    expect(served(page).match(/That is \d+%/g)).toEqual(['That is 25%']);
    expect(served(page)).not.toMatch(LABELS);
    expect(served(page)).not.toMatch(RATINGS);
  });

  it('reads no stored signal about Kwame; Kwame reads his own as a plain sentence, with his own words beside it', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const w = world();
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', WAIRIMU) as any).theEndingPage;
    expect(page.signals ?? []).toEqual([]);
    expect(served(page.signals ?? [])).not.toContain('Stock problems were raised late, three times.');
    expect(served(page.signals ?? [])).not.toContain('Steps in to stop things failing');
    const his = (await w.resolution.get('g1', KWAME) as any).theEndingPage;
    expect(his.signals).toHaveLength(1);
    expect(his.signals[0]).toMatchObject({
      participantId: 'p-kwame', yours: true, heading: 'Steps in to stop things failing',
      whatHappened: 'Stock problems were raised late, three times.', theirWords: 'Onboarding stock took three weeks.',
    });
    /* A pattern is never joined to a name in one string. */
    expect(his.signals[0].heading).not.toMatch(/Kwame/);
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
    expect(page.signals[0].whoSeesIt).toBe('Only you see this. Nothing is decided from it.');
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

  it('reads no stored signal and no suggestion when she set the check-in up and handed it to Wairimu', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const w = world({ scenario: GroundScenario.PIP, createdByUserId: GRACE });
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', GRACE) as any).theEndingPage;
    expect(page.suggestions).toEqual([]);
    expect(page.signals ?? []).toEqual([]);
    expect(served(page)).not.toContain('Stock problems were raised late, three times.');
  });
});

/**
 * KWAME'S FIRST 90 DAYS IS AN EVALUATION CHECK-IN (decision 75, item 25). This block used to prove that nothing
 * was reached on a new hire's first 90 days. Hafsah decided on 2 October that a probation or a first 90 days is
 * an evaluation check-in, as the prototype shows ("Groundwork suggests keeping Kwame on"), so it now proves the
 * opposite, for every reader: the engine reaches a suggestion there, Wairimu reads it with the count behind it (decision 86), Kwame reads
 * his own facts, Aisha reads nothing about Kwame, and Grace, an admin who was not given access, reads nothing.
 */
describe("on Kwame's first 90 days, which is an evaluation check-in", () => {
  const probation = () => world({ scenario: GroundScenario.NEW_HIRE });

  it('Wairimu reads the suggestion for Kwame, with the count behind it (decision 86)', async () => {
    const w = probation();
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', WAIRIMU) as any).theEndingPage;
    expect(page.suggestions).toHaveLength(1);
    expect(page.suggestions[0].headline).toBe('Groundwork suggests extra support for Kwame');
    expect(page.suggestions[0].why).toBe('In the last four weeks, Kwame kept two of the eight commitments made in this check-in. That is 25%. When fewer than half are kept, Groundwork suggests extra support.');
    expect(served(page).match(/That is \d+%/g)).toEqual(['That is 25%']);
    expect(served(page)).not.toMatch(LABELS);
  });

  it('Kwame reads his own facts and what would change them, never the suggestion', async () => {
    const w = probation();
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', KWAME) as any).theEndingPage;
    expect(page.suggestions).toEqual([]);
    expect(page.aboutYou[0].facts).toBe(
      'In the last four weeks, you kept two of your eight commitments in this check-in. When fewer than half are kept, Groundwork suggests extra help to Wairimu.',
    );
    expect(served(page)).not.toMatch(/Groundwork suggests extra support for/);
  });

  it('Aisha, a colleague, reads nothing about Kwame', async () => {
    const w = probation();
    await withASuggestion(w, true);
    const page = (await w.resolution.get('g1', AISHA) as any).theEndingPage;
    expect(page).toMatchObject({ suggestions: [], aboutYou: [], appealed: [] });
    expect(served(page)).not.toMatch(/Kwame/);
  });

  it('Grace, an admin who was not given access, reads nothing at all', async () => {
    const w = probation();
    await withASuggestion(w, true);
    await expect(w.resolution.get('g1', GRACE)).rejects.toThrow('You are not part of this check-in.');
  });
});

/*
 * DECISION 86 REVERSES DECISION 74, ITEM 2. This block was "with the person-only reach, only Kwame
 * reads the signal about Kwame". There is no such reach now: with nothing put in force, Wairimu and
 * Grace, who set the check-in up, read the signal after Kwame's turn, and Kwame is told Wairimu sees it.
 * Aisha, a colleague, still reads none.
 */
describe('with no setting at all, only Kwame reads the stored signal about Kwame, even after his turn (decision 86, then Hafsah, 2 November 2026)', () => {
  it('Wairimu reads the suggestion, and no stored signal or what Kwame said beside it', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const w = world();
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', WAIRIMU) as any).theEndingPage;
    expect(page.suggestions).toHaveLength(1);
    expect(page.signals ?? []).toEqual([]);
    expect(served(page.signals ?? [])).not.toContain('Kwame saw this first');
  });

  it('Kwame reads his own signal, and is told only he sees it, which is now true', async () => {
    /* Hafsah, 2 November 2026: only the person reads a stored pattern now, so they are told only they see it. */

    const w = world();
    await withASuggestion(w, true);
    const page = (await w.resolution.get('g1', KWAME) as any).theEndingPage;
    expect(page.signals).toHaveLength(1);
    expect(page.signals[0].yours).toBe(true);
    expect(page.signals[0].whoSeesIt).toBe('Only you see this. Nothing is decided from it.');
  });

  it('Grace, who set the check-in up, reads no stored signal', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const w = world({ scenario: GroundScenario.PIP, createdByUserId: GRACE });
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', GRACE) as any).theEndingPage;
    expect(page.signals ?? []).toEqual([]);
  });

  it('Aisha, a colleague, reads no signal', async () => {
    const w = world();
    await withASuggestion(w);
    const page = (await w.resolution.get('g1', AISHA) as any).theEndingPage;
    expect(page.signals ?? []).toEqual([]);
  });
});
