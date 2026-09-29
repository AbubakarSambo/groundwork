import { readFileSync } from 'fs';
import { join } from 'path';
import { theProofSettlements, whatThisLineProves, mayBeSettledByProof, thePrompt, WHICH_COMMITMENT_A_LINE_KEEPS_PROMPT } from './settled-by-proof';
import { ConversationService } from './conversation.service';

/**
 * PROOF CAN SETTLE A COMMITMENT (week 9, decision 12). See settled-by-proof.ts. A commitment is done
 * when the same person's own line says they delivered it, and their own document backs that line or
 * the colleague who received it confirmed it. Never "not done" from proof, and when in doubt it stays.
 */

const T0 = new Date('2026-09-20T10:00:00Z');
const LATER = new Date('2026-09-25T10:00:00Z');
const EARLIER = new Date('2026-09-18T10:00:00Z');

const COMMITMENTS = [
  { id: 'k-quote', participantId: 'p-aisha', text: 'Send Green Mart the quote', status: 'UNKNOWN', settledBy: null, createdAt: T0 },
  { id: 'k-deck', participantId: 'p-aisha', text: 'Send Brian the sales deck', status: 'UNKNOWN', settledBy: null, createdAt: T0 },
  { id: 'k-westgate', participantId: 'p-aisha', text: 'Visit Westgate Deli', status: 'UNKNOWN', settledBy: null, createdAt: T0 },
];
const line = (id: string, text: string, more: Record<string, any> = {}) => ({
  id, participantId: 'p-aisha', type: 'PROGRESS', text, recallBased: true, anchoredDocumentId: null, anchoredOrigin: null,
  confirmedAt: null, disputedAt: null, createdAt: LATER, ...more,
});
const PROVEN = line('e-quote', 'I sent the Green Mart quote on Tuesday', { recallBased: false, anchoredDocumentId: 'd-aisha', anchoredOrigin: 'photo' });
const CONFIRMED = line('e-deck', 'I sent the sales deck to Brian', { confirmedAt: LATER });
const WHO_ADDED = new Map<string, string | null>([['d-aisha', 'p-aisha'], ['d-lead', 'p-lead']]);

describe('what a line can settle a commitment by', () => {
  it('her own document on a thing that happened proves it; the colleague who received it confirms it', () => {
    expect(whatThisLineProves(PROVEN, WHO_ADDED)).toBe('PROVEN');
    expect(whatThisLineProves(CONFIRMED, WHO_ADDED)).toBe('CONFIRMED');
  });
  it('not somebody else’s document, not a document we cannot find, not generated notes, not a plan, not a disputed line, not her word alone', () => {
    expect(whatThisLineProves({ ...PROVEN, anchoredDocumentId: 'd-lead' }, WHO_ADDED)).toBeNull();
    expect(whatThisLineProves({ ...PROVEN, anchoredDocumentId: 'd-missing' }, WHO_ADDED)).toBeNull();
    expect(whatThisLineProves({ ...PROVEN, anchoredOrigin: 'generated' }, WHO_ADDED)).toBeNull();
    expect(whatThisLineProves({ ...PROVEN, type: 'COMMITMENT' }, WHO_ADDED)).toBeNull();
    expect(whatThisLineProves({ ...CONFIRMED, disputedAt: LATER }, WHO_ADDED)).toBeNull();
    expect(whatThisLineProves(line('e-word', 'I sent the Green Mart quote'), WHO_ADDED)).toBeNull();
  });
  it('an open commitment, or one done on her word, may be settled by proof; never one not done, dropped, or already proven', () => {
    expect(mayBeSettledByProof(COMMITMENTS[0])).toBe(true);
    expect(mayBeSettledByProof({ ...COMMITMENTS[0], status: 'DONE', settledBy: 'SAID' })).toBe(true);
    expect(mayBeSettledByProof({ ...COMMITMENTS[0], status: 'NOT_DONE', settledBy: 'SAID' })).toBe(false);
    expect(mayBeSettledByProof({ ...COMMITMENTS[0], status: 'DROPPED' })).toBe(false);
    expect(mayBeSettledByProof({ ...COMMITMENTS[0], status: 'DONE', settledBy: 'PROVEN' })).toBe(false);
  });
});

describe('the pairs the model gives are each checked', () => {
  const lines = [PROVEN, CONFIRMED];
  it('a document and a confirmation each settle the commitment they are about', () => {
    expect(theProofSettlements(COMMITMENTS, lines, WHO_ADDED, [{ commitment: 1, line: 'A' }, { commitment: 2, line: 'B' }])).toEqual([
      { id: 'k-quote', settledBy: 'PROVEN', lineId: 'e-quote', wasOpen: true },
      { id: 'k-deck', settledBy: 'CONFIRMED', lineId: 'e-deck', wasOpen: true },
    ]);
  });
  it('a pair about a different thing stays open, even when the model gives it', () => {
    expect(theProofSettlements(COMMITMENTS, lines, WHO_ADDED, [{ commitment: 3, line: 'A' }, { commitment: 3, line: 'B' }])).toEqual([]);
  });
  it('a line from before the promise cannot keep it', () => {
    expect(theProofSettlements(COMMITMENTS, [{ ...PROVEN, createdAt: EARLIER }], WHO_ADDED, [{ commitment: 1, line: 'A' }])).toEqual([]);
  });
  it('somebody else’s line never settles her commitment', () => {
    expect(theProofSettlements(COMMITMENTS, [{ ...CONFIRMED, participantId: 'p-miriam' }], WHO_ADDED, [{ commitment: 2, line: 'A' }])).toEqual([]);
  });
  it('one line keeps one commitment, a commitment is settled once, and nonsense is dropped', () => {
    const two = [{ ...COMMITMENTS[0] }, { ...COMMITMENTS[0], id: 'k-quote-2' }];
    expect(theProofSettlements(two, [PROVEN], WHO_ADDED, [{ commitment: 1, line: 'A' }, { commitment: 2, line: 'A' }]).map((s) => s.id)).toEqual(['k-quote']);
    expect(theProofSettlements(COMMITMENTS, lines, WHO_ADDED, [{ commitment: 9, line: 'A' }, { commitment: 1, line: 'Z' }, { commitment: 1.5, line: 'A' }, { commitment: 1, line: 7 }])).toEqual([]);
    expect(theProofSettlements(COMMITMENTS, lines, WHO_ADDED, null)).toEqual([]);
  });
  it('a commitment done on her word gains the mark, and is not reopened', () => {
    const said = [{ ...COMMITMENTS[0], status: 'DONE', settledBy: 'SAID' }];
    expect(theProofSettlements(said, [PROVEN], WHO_ADDED, [{ commitment: 1, line: 'A' }])).toEqual([{ id: 'k-quote', settledBy: 'PROVEN', lineId: 'e-quote', wasOpen: false }]);
  });
  it('the model is told to pair only what says it was done, and to leave doubt out', () => {
    expect(WHICH_COMMITMENT_A_LINE_KEEPS_PROMPT).toContain('When in doubt, leave it out.');
    expect(thePrompt(COMMITMENTS.slice(0, 1), [PROVEN])).toBe('WHAT THEY SAID THEY WOULD DO:\n1. Send Green Mart the quote\n\nWHAT THEY DID, BACKED:\nA. I sent the Green Mart quote on Tuesday');
  });
});

describe('settling by proof, through the service', () => {
  function aService(commitments: any[], lines: any[], pairs: any[]) {
    const prisma: any = {
      groundCommitment: { findMany: jest.fn(async () => commitments), updateMany: jest.fn(async () => ({ count: 1 })) },
      recordEntry: { findMany: jest.fn(async () => lines) },
      groundDocument: { findMany: jest.fn(async () => [{ id: 'd-aisha', participantId: 'p-aisha' }, { id: 'd-lead', participantId: 'p-lead' }]) },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ pairs })) };
    const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
    return { svc: new ConversationService(prisma, {} as any, anthropic, {} as any, nothing, nothing, nothing, nothing, nothing, nothing) as any, prisma, anthropic };
  }

  it('her own document settles one as done and proven; the colleague’s word settles another as done and confirmed', async () => {
    const { svc, prisma } = aService(COMMITMENTS, [PROVEN, CONFIRMED], [{ commitment: 1, line: 'A' }, { commitment: 2, line: 'B' }]);
    expect(await svc.settleByProof('p-aisha')).toBe(2);
    expect(prisma.groundCommitment.updateMany.mock.calls.map((c: any) => c[0])).toEqual([
      { where: { id: 'k-quote', status: 'UNKNOWN' }, data: { status: 'DONE', settledAt: expect.any(Date), settledInCheckInId: null, settledBy: 'PROVEN' } },
      { where: { id: 'k-deck', status: 'UNKNOWN' }, data: { status: 'DONE', settledAt: expect.any(Date), settledInCheckInId: null, settledBy: 'CONFIRMED' } },
    ]);
  });

  it('a line about something else leaves the commitment open', async () => {
    const { svc, prisma } = aService([COMMITMENTS[2]], [PROVEN], [{ commitment: 1, line: 'A' }]);
    expect(await svc.settleByProof('p-aisha')).toBe(0);
    expect(prisma.groundCommitment.updateMany).not.toHaveBeenCalled();
  });

  it('one done on her word keeps its status and date, and gains the mark', async () => {
    const { svc, prisma } = aService([{ ...COMMITMENTS[0], status: 'DONE', settledBy: 'SAID' }], [PROVEN], [{ commitment: 1, line: 'A' }]);
    await svc.settleByProof('p-aisha');
    expect(prisma.groundCommitment.updateMany.mock.calls[0][0]).toEqual({
      where: { id: 'k-quote', status: 'DONE', OR: [{ settledBy: null }, { settledBy: 'SAID' }] }, data: { settledBy: 'PROVEN' },
    });
  });

  it('asks no model when no line of hers is backed or confirmed', async () => {
    const { svc, anthropic } = aService(COMMITMENTS, [line('e-word', 'I sent the Green Mart quote')], []);
    expect(await svc.settleByProof('p-aisha')).toBe(0);
    expect(anthropic.extract).not.toHaveBeenCalled();
  });

  it('never writes not done', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    const body = src.slice(src.indexOf('async settleByProof('), src.indexOf('async settleWhatTheySaidTheyWouldDo('));
    expect(body).not.toContain("'NOT_DONE'");
  });

  it('runs when her own document backs a line, and when a colleague confirms one', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const anchor = src.slice(src.indexOf('async anchorRecordToDocuments('), src.indexOf('async reviseDetectedFunction('));
    expect(anchor).toContain('if (backed) await this.settleByProof(participantId)');
    const confirm = src.slice(src.indexOf('private async confirmWhatArrived('), src.indexOf('async extractDependencies('));
    expect(confirm).toContain('await this.settleByProof(onParticipantId)');
  });
});
