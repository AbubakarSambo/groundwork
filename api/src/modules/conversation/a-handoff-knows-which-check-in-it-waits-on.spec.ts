import { DependencyStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { theCheckInItWaitsOn } from './which-check-in-it-waits-on';
import { anAssessmentHolding } from './an-assessment-for-a-spec';

/**
 * REQUEST 18 (a) AND THE FIRST HALF OF (b): A HANDOFF NAMES THE OTHER CHECK-IN IT WAITS ON ONLY WHEN
 * THAT IS CERTAIN, AND KEEPS THE PERSON'S OWN WORDS FOR WHEN.
 */
const here = { id: 'sales', organizationId: 'org-baridi' };
const finance = { id: 'finance', organizationId: 'org-baridi', label: 'Finance, Q3' };
const sales = { id: 'sales', organizationId: 'org-baridi', label: 'Sales team, Q3' };
const ops = { id: 'ops', organizationId: 'org-baridi', label: 'Distribution operations' };

describe('which other check-in a handoff waits on', () => {
  it('links "Finance" when the organisation has exactly one Finance check-in', () => {
    expect(theCheckInItWaitsOn('Finance', here, [sales, finance, ops])).toBe('finance');
    expect(theCheckInItWaitsOn('the finance team', here, [sales, finance, ops])).toBe('finance');
    expect(theCheckInItWaitsOn('Operations', here, [sales, finance, ops])).toBe('ops');
  });

  it('is null when two check-ins fit, because guessing would show a request to the wrong team', () => {
    const second = { id: 'finance-2', organizationId: 'org-baridi', label: 'Finance, budget' };
    expect(theCheckInItWaitsOn('Finance', here, [sales, finance, second])).toBeNull();
  });

  it('is null for a check-in of another organisation', () => {
    const theirs = { id: 'their-finance', organizationId: 'org-kijani', label: 'Finance' };
    expect(theCheckInItWaitsOn('Finance', here, [sales, theirs])).toBeNull();
    /* And the other organisation's check-in does not make an ordinary one ambiguous. */
    expect(theCheckInItWaitsOn('Finance', here, [sales, finance, theirs])).toBe('finance');
  });

  it('is never the handoff\'s own check-in, and not certain when it fits as well as another', () => {
    expect(theCheckInItWaitsOn('Sales', here, [sales, finance])).toBeNull();
    const salesLeadership = { id: 'sl', organizationId: 'org-baridi', label: 'Sales leadership' };
    expect(theCheckInItWaitsOn('Sales', here, [sales, salesLeadership, finance])).toBeNull();
  });

  it('is null for a team that has no check-in, and for words that say no team', () => {
    expect(theCheckInItWaitsOn('the client’s legal team', here, [sales, finance, ops])).toBeNull();
    expect(theCheckInItWaitsOn('the team', here, [sales, finance, ops])).toBeNull();
    expect(theCheckInItWaitsOn(null, here, [finance])).toBeNull();
  });
});

describe('the handoff the conversation records', () => {
  const scaffold = (said: { dependencies: any[] }, others = [sales, finance, ops], transcript = 'PERSON: I am waiting on Finance for credit terms for Westgate Deli. They said by Friday.') => {
    const created: any[] = [];
    const prisma: any = {
      /* The waits come from the conversation's assessment now (one source, 1 November 2026), not a call of the writer's own. */
      checkIn: { findUnique: async () => ({ sessionReport: anAssessmentHolding({ blockers: said.dependencies }) }) },
      ground: {
        findUnique: async () => ({ mode: 'SHARED', scenario: 'OKR_ALIGNMENT', organizationId: 'org-baridi', participants: [{ id: 'p-miriam', email: 'miriam@baridi.test', user: { firstName: 'Miriam', lastName: 'Wanjiku' } }] }),
        findMany: async () => others,
      },
      conversationTurn: { findMany: async () => [
        { role: 'PERSON', content: transcript.replace(/^PERSON: /, '') },
      ] },
      groundDependency: {
        findMany: async () => [],
        create: async ({ data }: any) => { created.push(data); return { id: `d${created.length}`, ...data }; },
        update: async () => ({}),
      },
      blockerTrace: { deleteMany: async () => ({}), findUnique: async () => null, upsert: async () => ({}) },
    };
    const svc = Object.create(ConversationService.prototype) as any;
    svc.prisma = prisma;
    svc.anthropic = { extract: async () => { throw new Error('the waits are read from the assessment, never a call of their own'); } };
    svc.events = { emit: () => {} };
    svc.logger = { log: () => {}, warn: () => {} };
    svc.prompts = { getActive: async () => { throw new Error('none'); } };
    return { svc, created };
  };
  const finance18 = { what: 'credit terms for Westgate Deli', onName: null, onLabel: 'Finance', status: 'WAITING', namedTheThing: true };

  it('carries the check-in it waits on and the person\'s own words for when', async () => {
    const { svc, created } = scaffold({ dependencies: [{ ...finance18, dueSaid: 'by Friday' }] });
    await svc.extractDependencies('c1', 'p-miriam', 'sales');
    expect(created).toHaveLength(1);
    expect(created[0].waitingOnGroundId).toBe('finance');
    expect(created[0].dueSaid).toBe('by Friday');
    expect(created[0].dueOn).toBeInstanceOf(Date);
    expect(created[0].dueOn.getUTCDay()).toBe(5);
  });

  it('links nothing when two check-ins fit, when it is the check-in itself, or when it is another company\'s', async () => {
    const two = scaffold({ dependencies: [finance18] }, [sales, finance, { id: 'f2', organizationId: 'org-baridi', label: 'Finance, budget' }]);
    await two.svc.extractDependencies('c1', 'p-miriam', 'sales');
    expect(two.created[0].waitingOnGroundId).toBeNull();

    const own = scaffold({ dependencies: [{ ...finance18, onLabel: 'Sales' }] });
    await own.svc.extractDependencies('c1', 'p-miriam', 'sales');
    expect(own.created[0].waitingOnGroundId).toBeNull();

    const other = scaffold({ dependencies: [finance18] }, [sales, { id: 'their', organizationId: 'org-kijani', label: 'Finance' }]);
    await other.svc.extractDependencies('c1', 'p-miriam', 'sales');
    expect(other.created[0].waitingOnGroundId).toBeNull();
  });

  it('keeps the words for when only if they are the person\'s own exact words', async () => {
    const reworded = scaffold({ dependencies: [{ ...finance18, dueSaid: 'on Friday the 2nd' }] });
    await reworded.svc.extractDependencies('c1', 'p-miriam', 'sales');
    expect(reworded.created[0].dueSaid).toBeNull();
    expect(reworded.created[0].dueOn).toBeNull();

    const soon = scaffold({ dependencies: [{ ...finance18, dueSaid: 'soon' }] }, undefined, 'PERSON: Finance will get back to me soon, for the credit terms for Westgate Deli.');
    await soon.svc.extractDependencies('c1', 'p-miriam', 'sales');
    expect(soon.created[0].dueSaid).toBe('soon');
    expect(soon.created[0].dueOn).toBeNull();
  });

  it('never links a handoff waiting on a person in the check-in', async () => {
    const { svc, created } = scaffold({ dependencies: [{ ...finance18, onName: 'Miriam', onLabel: null }] });
    await svc.extractDependencies('c1', 'p-other', 'sales');
    expect(created[0].waitingOnGroundId).toBeNull();
    expect(DependencyStatus.WAITING).toBe('WAITING');
  });

  /*
   * A COLLEAGUE NAMED AS THE LABEL IS THAT COLLEAGUE (polish round 15, F4). Brian's wait was kept on the label "Njeri", not on Njeri,
   * so when Njeri said "I recorded the FN-004 payment today." nothing could end it, and Wanjiru's board said for a week "Brian Otieno
   * has been waiting on Njeri for the record of what has been paid".
   */
  it('a wait whose label is the name of somebody in the check-in is on that person', async () => {
    const { svc, created } = scaffold({ dependencies: [{ ...finance18, onLabel: 'Miriam' }] });
    await svc.extractDependencies('c1', 'p-other', 'sales');
    expect(created[0].onParticipantId).toBe('p-miriam');
    expect(created[0].onLabel).toBeNull();
  });
});
