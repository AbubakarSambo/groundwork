import { ConversationService } from './conversation.service';
import { worthRecording, WHEN_THEY_SAY_IT_IS_MISSING } from './what-they-say-happened';

/**
 * WHAT SOMEBODY SAYS HAPPENED THAT NO SYSTEM RECORDED.
 *
 * External evidence fails in ordinary ways - a call from a phone nothing is connected to, an app
 * that did not sync, a shop logged twice under two names. In every one of those the record is
 * silent and the work happened, and a product that reads silence as absence gets it backwards
 * about the person rather than about the tool.
 */
const shops = [{ externalId: 'shop-a', title: 'Mama Ngozi Provisions' }];

const svc = (over: { happened?: any[]; hasEvidence?: boolean; person?: any } = {}) => {
  const written: any[] = [];
  const s = Object.create(ConversationService.prototype) as any;
  s.logger = { warn: () => {} };
  s.anthropic = { extract: async () => ({ happened: over.happened ?? [] }) };
  s.prisma = {
    ground: { findUnique: async () => ({ organizationId: 'org1' }) },
    interaction: {
      count: async () => (over.hasEvidence === false ? 0 : 3),
      create: async (a: any) => { written.push(a.data); return {}; },
    },
    groundParticipant: { findUnique: async () => ({ user: { email: 'sam@x.test' } }) },
    person: { findFirst: async () => (over.person === undefined ? { externalId: 'p-sam' } : over.person) },
    conversationTurn: { findMany: async () => [{ content: 'x'.repeat(200) }] },
    subject: { findMany: async () => shops },
  };
  return { s, written };
};

const said = (over: any = {}) => ({
  kind: 'CALL', counterparty: 'Mama Ngozi Provisions', when: 'Tuesday',
  note: 'Called her, she asked for pricing', saysRecordIsWrong: true, ...over,
});

describe('their own account becomes evidence', () => {
  it('at its own strength, never dressed up as corroboration', async () => {
    const { s, written } = svc({ happened: [said()] });
    await s.extractWhatTheySayHappened('c1', 'p1', 'g1');
    expect(written[0].strength).toBe('SELF_REPORTED');
    expect(written[0].sourceSystem).toBe('their own account');
  });

  it('attached to the shop their system already knows', async () => {
    const { s, written } = svc({ happened: [said()] });
    await s.extractWhatTheySayHappened('c1', 'p1', 'g1');
    expect(written[0].counterpartyExternalId).toBe('shop-a');
    expect(written[0].personExternalId).toBe('p-sam');
  });

  it('and keeps their words when the shop matches nothing', async () => {
    /* Filed against the wrong shop is worse than filed against none. */
    const { s, written } = svc({ happened: [said({ counterparty: 'Some kiosk on the main road' })] });
    await s.extractWhatTheySayHappened('c1', 'p1', 'g1');
    expect(written[0].counterpartyExternalId).toBeNull();
    expect(written[0].note).toContain('Some kiosk on the main road');
  });
});

describe('what it refuses to record', () => {
  it('a description of a week rather than a thing that happened', () => {
    expect(worthRecording({ kind: 'CALL' } as any)).toBe(false);
    expect(worthRecording({ kind: 'CALL', counterparty: 'Mama Ngozi' } as any)).toBe(true);
  });

  it('a kind that is not one of the six', () => {
    expect(worthRecording({ kind: 'RESEARCH', counterparty: 'Mama Ngozi' } as any)).toBe(false);
  });

  it('anything at all in an organisation that connects no evidence', async () => {
    /*
     * A private check-in in a company that connected nothing must not quietly start building an
     * activity log about somebody out of what they said in confidence.
     */
    const { s, written } = svc({ happened: [said()], hasEvidence: false });
    await s.extractWhatTheySayHappened('c1', 'p1', 'g1');
    expect(written).toHaveLength(0);
  });

  it('and anything about somebody who is not in the directory', async () => {
    const { s, written } = svc({ happened: [said()], person: null });
    await s.extractWhatTheySayHappened('c1', 'p1', 'g1');
    expect(written).toHaveLength(0);
  });
});

describe('what the interview is told', () => {
  it('to take it, and never to press for proof', () => {
    expect(WHEN_THEY_SAY_IT_IS_MISSING).toContain('take it');
    expect(WHEN_THEY_SAY_IT_IS_MISSING).toContain('Never press them');
  });

  it('that the record is wrong more often than the person is', () => {
    /* Pressing somebody to prove it teaches them the safe answer is the one matching the record. */
    expect(WHEN_THEY_SAY_IT_IS_MISSING).toContain('wrong about them more often than the person is');
    expect(WHEN_THEY_SAY_IT_IS_MISSING).toContain('never imply the system is more likely to be right');
  });
});
