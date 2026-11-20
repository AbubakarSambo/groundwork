import * as fs from 'fs';
import * as path from 'path';
import { findUnattachedWork, sayUnattached } from './the-three-that-were-not-built';

/*
 * QUESTIONS TO ASK GROUNDWORK ARE PRIVATE, ALWAYS (CLAUDE.md; Hafsah, 15 November 2026).
 *
 * The detector used to read every person's Ask questions in the organisation to work out who was
 * mentioned in which work. These tests fail if that, or any other cross-person read of Ask content,
 * comes back.
 */
const SRC = path.join(__dirname, '..', '..');
const THE_ONE_READER = path.join('modules', 'assistant', 'a-persons-own-ask-turns.ts');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}
const withoutComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('nothing but the one reader reads what people typed to Ask Groundwork', () => {
  const READS = /assistantTurn\s*\.\s*(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|aggregate|groupBy)\b|\bassistant_turns\b/;

  it('reads the table nowhere else, so no detector or report can reach it', () => {
    const readers = sourceFiles(SRC)
      .filter((f) => READS.test(withoutComments(fs.readFileSync(f, 'utf8'))))
      .map((f) => path.relative(SRC, f));
    expect(readers).toEqual([THE_ONE_READER]);
  });

  it('and that reader only ever asks for one named person', async () => {
    const { ownAskTurns, howManyQuestionsOwnerAsked, searchOwnQuestions } = require('../assistant/a-persons-own-ask-turns');
    const db: any = { assistantTurn: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) }, $queryRaw: jest.fn(async () => []) };
    for (const nobody of [undefined, null, '', '   ']) {
      expect(() => ownAskTurns(db, 'org', nobody, { select: { content: true }, take: 5 })).toThrow();
      expect(() => howManyQuestionsOwnerAsked(db, 'org', nobody)).toThrow();
      expect(() => searchOwnQuestions(db, 'org', nobody, 'x', ['x'])).toThrow();
    }
    expect(db.assistantTurn.findMany).not.toHaveBeenCalled();
    await ownAskTurns(db, 'org', 'ana', { select: { content: true }, take: 5 });
    expect(db.assistantTurn.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: 'org', personExternalId: 'ana' });
  });
});

describe('the detector run never touches Ask questions, and is still sensible from check-ins', () => {
  const at = (n: number) => new Date(Date.UTC(2026, 10, n, 9));
  const run = async (askBeingRead: { touched: boolean }) => {
    const created: any[] = [];
    const empty = { findMany: async () => [], findFirst: async () => null, count: async () => 0,
      create: async () => ({}), update: async () => ({}), upsert: async () => ({}) };
    const trap = () => { askBeingRead.touched = true; return []; };
    const speaker = { email: 'ana@x.com', userId: 'u-ana', user: { email: 'ana@x.com' } };
    const mocked: any = {
      detectionQuietPeriod: { findMany: async () => [] },
      subject: { findMany: async () => [
        { externalId: 'atlas', title: 'Atlas launch', ownerExternalId: null, contributorExternalIds: [], parentExternalId: null, createdAt: new Date('2026-01-01') },
      ] },
      assistantTurn: { findMany: trap, findFirst: trap, count: trap, aggregate: trap, groupBy: trap },
      $queryRaw: trap,
      conversationTurn: { findMany: async () => [1, 2, 3].map((n) => ({
        content: `I spent the week on the Kilele proof, part ${n}.`, createdAt: at(n), checkIn: { participant: speaker },
      })) },
      person: { findMany: async () => [
        { externalId: 'ana', email: 'ana@x.com', managerExternalId: null, active: true, createdAt: new Date('2024-01-01') },
      ] },
      groundParticipant: { findMany: async () => [] },
      detectorResult: { findMany: async () => [], findFirst: async () => null, update: async () => ({}),
        create: async (a: any) => { created.push(a.data); return {}; } },
    };
    const prisma: any = new Proxy(mocked, { get: (t, k: string) => t[k] ?? empty });
    const { DetectorsService } = require('./detectors.service');
    const { OnboardingService } = require('../grounds/onboarding.service');
    await new DetectorsService(prisma, new OnboardingService(prisma)).run('org-a');
    return created;
  };

  it('does not read a single Ask question, and still finds the work described in check-ins', async () => {
    const trap = { touched: false };
    const found = await run(trap);
    expect(trap.touched).toBe(false);
    const unattached = found.find((f) => f.personExternalId === 'ana' && /without it touching/.test(JSON.stringify(f)));
    expect(unattached).toBeDefined();
  });

  /* What the detector now makes of a fixture, with and without Ask questions in the input. */
  it('Ask questions added to the input used to change the result, and no longer can', () => {
    const subjects: any[] = [{ externalId: 'atlas', title: 'Atlas launch', ownerExternalId: null, contributorExternalIds: [], parentExternalId: null }];
    const checkIns = [1, 2, 3].map((n) => ({ personExternalId: 'ana', content: `I spent the week on the Kilele proof, part ${n}.`, createdAt: at(n) }));
    const askOnly = [4, 5, 6].map((n) => ({ personExternalId: 'ben', content: `I'm working on the Zuri budget ${n}.`, createdAt: at(n) }));
    const fromCheckInsAlone = findUnattachedWork(subjects, checkIns).map(sayUnattached);
    const oldWayWithAsk = findUnattachedWork(subjects, [...checkIns, ...askOnly]).map((u) => `${u.personExternalId}: ${sayUnattached(u)}`);
    expect(fromCheckInsAlone).toEqual(['Has described doing work 3 times without it touching any declared objective.']);
    /* The old input also produced a line about Ben, who had only ever typed to Ask. */
    expect(oldWayWithAsk).toHaveLength(2);
  });
});
