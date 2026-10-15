import { whatSomeoneSaid, theSubjectAsked } from './what-they-said-that-you-may-read';

/**
 * B-125: "What did Amani say about pricing approvals?" listed all six of Amani's lines for the
 * check-in, deal figures and a target correction among them. The answer is what she said about
 * pricing approvals, and when she said nothing about it, it says so.
 */
const LINES = ['The decision came on Tuesday.', 'I closed two deals with Acme.', 'Pricing approvals take me three days each, which is slowing the quotes.', 'I am waiting for the pricing approval on the Westgate quote.', 'The Acme target should read 40, not 14.'];
const db: any = {
  ground: { findMany: async () => [{ id: 'g1', label: 'Sales team, Q4', organizationId: 'o', scenario: 'OKR_ALIGNMENT', initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', participants: [{ userId: 'u-wairimu' }, { userId: 'u-amani' }] }] },
  checkIn: { findMany: async () => [{ sessionNumber: 1, completedAt: new Date('2026-10-07T10:00:00Z') }] },
  person: { findMany: async () => [] },
};
const reports: any = { sessionReport: async () => ({ whatEachPersonSaid: [{ who: 'Amani Wekesa', isYou: false, lines: LINES }] }) };
const reader = { userId: 'u-wairimu', organizationId: 'o', role: 'LEAD' };
const ask = async (message: string) => String(((await whatSomeoneSaid({ db, reports }, reader, 'Amani', message, new Date('2026-10-08T09:00:00Z'))).blocks[0] as any).body);

describe('what somebody said about a subject', () => {
  it('reads the subject out of the question', () => {
    expect(theSubjectAsked('What did Amani say about pricing approvals?')?.said).toBe('pricing approvals');
    expect(theSubjectAsked('What did Amani say last week')).toBeNull();
    expect(theSubjectAsked('What did Amani say about last week?')).toBeNull();
  });

  it('gives only the lines about it', async () => {
    const said = await ask('What did Amani say about pricing approvals?');
    expect(said).toContain('Pricing approvals take me three days each');
    expect(said).toContain('waiting for the pricing approval on the Westgate quote');
    expect(said).not.toContain('The decision came on Tuesday');
    expect(said).not.toContain('Acme');
  });

  it('says plainly when nothing was said about it', async () => {
    expect(await ask('What did Amani say about holiday cover?')).toBe('I cannot show you that. I have nothing from Amani about holiday cover in the check-ins you can read.');
  });

  it('gives everything, as before, when no subject was named', async () => {
    const said = await ask('What did Amani say?');
    for (const l of LINES) expect(said).toContain(l.replace(/\.$/, ''));
  });
});
