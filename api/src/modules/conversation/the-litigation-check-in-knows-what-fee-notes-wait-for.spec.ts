import { PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { FEE_NOTES_WAIT_HEADING, theEventsBlock } from './what-the-open-fee-notes-wait-for';
import { MUCHEMI_ORG, MUCHEMI_LITIGATION, MUCHEMI_FEE_NOTES, muchemiFeeNoteItems, muchemiLitigationLines, muchemiLitigationDeadlines } from '../grounds/__fixtures__/muchemi-and-co';

/**
 * THE LITIGATION CHECK-IN KNOWS WHAT THE OPEN FEE NOTES WAIT FOR (Release 2, pull request 3 of 3). Proved on a real turn through
 * `sendMessage`, with an engine that keeps every prompt it is handed, in Muchemi & Co (test)'s litigation daily, as David, the
 * paralegal, checks in:
 *  - with Release 2 off, every prompt is exactly what it is with no fee note on record at all: the check-in asks as today;
 *  - with it on, the prompt is given, as knowledge, the events the open fee notes wait for in the matters this check-in names
 *    ("the reply is filed", "the hearing date is set" for Kasarani Foods v. Tumaini Traders), and never an amount, a fee note
 *    number, who follows one up, or a matter nobody here has named;
 *  - the conversation's own rules are untouched: the block adds no question and is never read out.
 */
const DAVID = {
  id: 'l-david', groundId: MUCHEMI_LITIGATION.id, partyType: PartyType.PARTICIPANT, managingOnly: false, userId: 'u-david',
  roleAsDescribed: 'Paralegal', createdAt: new Date('2026-09-01'), nameGiven: null, email: 'david@muchemi.test', user: { firstName: 'David', lastName: 'Mwangi' },
};
const WANJIRU = { ...DAVID, id: 'l-wanjiru', partyType: PartyType.INITIATOR, userId: 'u-wanjiru', roleAsDescribed: 'Partner', email: 'wanjiru@muchemi.test', user: { firstName: 'Wanjiru', lastName: 'Muchemi' } };

let RELEASE_2 = true;
let FEE_NOTES_ON_RECORD = true;

function theDatabase() {
  const litigation = {
    ...MUCHEMI_LITIGATION, mode: 'SHARED', moment: null, startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null, resolutionState: null,
    peersVisibleToEachOther: true, expectThemToUnblock: true, objectives: [], report: null, leadContextNotes: [], participants: [WANJIRU, DAVID],
  };
  const feeNotes = { ...MUCHEMI_FEE_NOTES, checkInType: 'invoices or fee notes', checkInTypeConfirmedAt: new Date('2026-10-05T08:00:00.000Z'), participants: [] };
  const grounds = () => (FEE_NOTES_ON_RECORD ? [litigation, feeNotes] : [litigation]);
  const items = () => [...(FEE_NOTES_ON_RECORD ? muchemiFeeNoteItems() : []), ...muchemiLitigationDeadlines()];
  return {
    ground: {
      findUnique: jest.fn(async (a: any) => grounds().find((g) => g.id === (a?.where?.id ?? MUCHEMI_LITIGATION.id)) ?? null),
      findFirst: jest.fn(async () => litigation),
      findMany: jest.fn(async (a: any) => grounds().filter((g) => (!a?.where?.scenario || g.scenario === a.where.scenario) && (!a?.where?.organizationId || g.organizationId === a.where.organizationId))),
    },
    organization: { findUnique: jest.fn(async () => ({ ...MUCHEMI_ORG, release2CollectionsOn: RELEASE_2, release1bTabsOn: false, release1SalesBoardOn: false })) },
    workItem: { findMany: jest.fn(async (a: any) => items().filter((i) => (!a?.where?.groundId || i.groundId === a.where.groundId) && (!a?.where?.kind || i.kind === a.where.kind))) },
    recordEntry: {
      /* Only the read that asks for the check-in's own lines by their check-in gets them; every other read answers as it does on an empty record. */
      findMany: jest.fn(async (a: any) => (a?.where?.participant?.groundId === MUCHEMI_LITIGATION.id && a?.select?.text && Object.keys(a.select).length === 1 ? muchemiLitigationLines() : [])),
      count: jest.fn(async () => 0),
    },
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci-david', groundId: MUCHEMI_LITIGATION.id, participantId: DAVID.id, sessionNumber: 4, status: CheckInStatus.IN_PROGRESS, isClarification: false,
        clarificationTarget: null, isSelfCorrection: false, selfCorrectionTargetSession: null, isFinal: false, participant: { ...DAVID },
      })),
      count: jest.fn(async () => 0), findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), update: jest.fn(async () => ({})),
    },
    groundParticipant: {
      count: jest.fn(async () => 2),
      findUnique: jest.fn(async () => ({ specificityHistory: [], detectedFunction: null, detectedFunctionConfidence: null, joinedAt: null, leftAt: null, leavePeriods: [] })),
      findFirst: jest.fn(async () => DAVID),
      findMany: jest.fn(async () => [WANJIRU, DAVID].map((p) => ({ ...p, checkIns: [] }))),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: {
      count: jest.fn(async () => 1),
      create: jest.fn(async (args: any) => ({ id: 't1', content: args.data.content })),
      findMany: jest.fn(async () => [{ id: 't0', role: 'PERSON', content: 'The bundle is ready.', createdAt: new Date() }]),
      delete: jest.fn(async () => ({})), update: jest.fn(async () => ({})),
    },
    groundContextItem: { findMany: jest.fn(async () => []) },
    leadContextNote: { findMany: jest.fn(async () => []) },
    participantNote: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    delivery: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    workMention: { findMany: jest.fn(async () => []) },
    adminProfile: { findUnique: jest.fn(async () => null) },
    groundDocument: { findMany: jest.fn(async () => []) },
    patternDetection: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    itemEvidence: { findMany: jest.fn(async () => []) },
  };
}

const nothingBack = (method: string) => async () => (String(method).endsWith('Many') || String(method) === 'groupBy' ? [] : null);
const everythingElseAnswersEmpty = (seed: Record<string, any>) => new Proxy(seed, {
  get: (target: any, model: string) => new Proxy(target[model] ?? {}, { get: (m: any, method: string) => m[method] ?? nothingBack(method) }),
});

function aService() {
  const prisma: any = everythingElseAnswersEmpty(theDatabase());
  const handed: string[] = [];
  const keep = (...args: unknown[]) => { handed.push(JSON.stringify(args)); };
  const anthropic: any = {
    respond: jest.fn(async (...args: unknown[]) => { keep(...args); return 'What moved on the Kasarani matter today?'; }),
    extract: jest.fn(async (...args: unknown[]) => { keep(...args); return null; }),
    respondWithMedia: jest.fn(async (...args: unknown[]) => { keep(...args); return ''; }),
  };
  const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)) };
  const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
  const service = new ConversationService(prisma, promptStore, anthropic, new ConversationContextService(prisma), nothing, nothing, nothing, nothing, nothing, nothing);
  return { service, handed, anthropic };
}
const turnPrompts = (a: any) => (a.respond as jest.Mock).mock.calls.map((c) => JSON.stringify(c));

describe('with Release 2 off, the litigation check-in asks exactly as today', () => {
  afterEach(() => { RELEASE_2 = true; FEE_NOTES_ON_RECORD = true; });

  it('every prompt David’s turn hands the model is the same as with no fee note on record at all', async () => {
    RELEASE_2 = false;
    const withThem = aService();
    await withThem.service.sendMessage('ci-david', 'u-david', 'The hearing date is set in the Kasarani matter.');
    FEE_NOTES_ON_RECORD = false;
    const without = aService();
    await without.service.sendMessage('ci-david', 'u-david', 'The hearing date is set in the Kasarani matter.');
    expect(turnPrompts(withThem.anthropic).length).toBeGreaterThan(0);
    expect(turnPrompts(withThem.anthropic)).toEqual(turnPrompts(without.anthropic));
    expect(withThem.handed.join('\n')).not.toContain(FEE_NOTES_WAIT_HEADING);
  });
});

describe('with it on, the litigation check-in knows what the open fee notes wait for, and never the money', () => {
  afterEach(() => { RELEASE_2 = true; FEE_NOTES_ON_RECORD = true; });

  it('David’s turn is given the two events in the Kasarani matter, as knowledge, with no amount, number or person', async () => {
    const { service, anthropic } = aService();
    await service.sendMessage('ci-david', 'u-david', 'The hearing date is set in the Kasarani matter.');
    const all = turnPrompts(anthropic).join('\n');
    expect(all).toContain(FEE_NOTES_WAIT_HEADING);
    expect(all).toContain('- Kasarani Foods v. Tumaini Traders: the reply is filed');
    expect(all).toContain('- Kasarani Foods v. Tumaini Traders: the hearing date is set');
    expect(all).toContain('never mention fees, bills, money or payment');
    const block = all.slice(all.indexOf(FEE_NOTES_WAIT_HEADING), all.indexOf(FEE_NOTES_WAIT_HEADING) + 900);
    for (const never of ['KES', 'FN-', '250,000', 'Brian', 'Aisha', 'Baraka', 'Upendo', 'Nyota']) expect(block).not.toContain(never);
  });

  it('with no fee note waiting for an event, the block is not there and the prompt is as before', async () => {
    FEE_NOTES_ON_RECORD = false;
    const { service, anthropic } = aService();
    await service.sendMessage('ci-david', 'u-david', 'The hearing date is set in the Kasarani matter.');
    expect(turnPrompts(anthropic).join('\n')).not.toContain(FEE_NOTES_WAIT_HEADING);
  });
});

describe('the block, as the model reads it', () => {
  it('is knowledge, never a script: it says what to notice, and adds no question beyond the day it happened', () => {
    const b = theEventsBlock([{ matter: 'Kasarani Foods v. Tumaini Traders', event: 'the reply is filed' }]);
    expect(b).toContain('It is knowledge, not a question list');
    expect(b).toContain('never read it out');
    expect(theEventsBlock([])).toBe('');
  });
});
