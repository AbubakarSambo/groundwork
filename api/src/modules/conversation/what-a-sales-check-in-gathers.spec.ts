import { whatThisSalesCheckInGathers, theirDealsAndLeads, SALES_CHECK_IN_GATHERS_KEY, SALES_CHECK_IN_GATHERS_PROMPT, THE_SALES_REMINDER as THE_REMINDER } from './what-a-sales-check-in-gathers';
import { SEED_PROMPTS } from './prompt-library';
import { theRecordsPrompt } from '../board/the-kind-of-work';
import { theNextStepTheyGave } from '../board/what-happens-next-to-a-record';

/**
 * WHAT A SALES CHECK-IN GATHERS (Hafsah, 16 October 2026). Read as what the model is handed and what a person reads on the board.
 */
/* Release 1's sales board is on for the organisation (release-one-sales-board), unless `on` says otherwise. */
const prismaFor = (kind: string | null, party: string, deals: any[] = [], on = true) => {
  const asked: any[] = [];
  return {
    asked,
    ground: { findUnique: async () => ({ kindOfWork: kind, organizationId: 'org-1' }) },
    organization: { findUnique: async () => ({ release1SalesBoardOn: on }) },
    groundParticipant: { findUnique: async () => ({ partyType: party }) },
    workItem: { findMany: async (q: any) => { asked.push(q); return deals.filter((d) => d.ownerParticipantId === q.where.ownerParticipantId); } },
  };
};
const stored = { getActive: async (key: string) => (key === SALES_CHECK_IN_GATHERS_KEY ? { id: 'pv-sales-7', content: 'STORED WORDS' } : null) };

describe('what a sales check-in gathers', () => {
  it('is seeded as a prompt, so the version stored in the database is the one that runs', () => {
    const seed = SEED_PROMPTS.find((p) => p.key === SALES_CHECK_IN_GATHERS_KEY);
    expect(seed?.content).toBe(SALES_CHECK_IN_GATHERS_PROMPT);
  });

  it('a rep in a sales check-in is told what the board needs, from the stored version, with its id', async () => {
    const r = await whatThisSalesCheckInGathers({ prisma: prismaFor('sales org', 'PARTICIPANT'), prompts: stored }, { groundId: 'g', participantId: 'kevin' });
    expect(r.promptVersionId).toBe('pv-sales-7');
    expect(r.block).toContain('STORED WORDS');
  });

  it('a rep in a sales team (Release 1) runs the same stored version, under the one key, with its id', async () => {
    const asked: string[] = [];
    const prompts = { getActive: async (key: string) => { asked.push(key); return stored.getActive(key); } };
    const r = await whatThisSalesCheckInGathers({ prisma: prismaFor('sales team', 'PARTICIPANT'), prompts }, { groundId: 'g', participantId: 'kevin' });
    expect(asked).toEqual(['kind_of_work.sales_org']);
    expect(r.promptVersionId).toBe('pv-sales-7');
    expect(r.block).toContain('STORED WORDS');
    expect(r.last).toBe(THE_REMINDER);
    /* No second key is seeded for a sales team, so no second copy can drift from it. */
    expect(SEED_PROMPTS.filter((p) => p.key.startsWith('kind_of_work.')).map((p) => p.key)).toEqual(['kind_of_work.sales_org']);
  });

  it('the words name every part of a deal the board shows, every lead, and who does what by when, as knowledge and not a script', () => {
    for (const part of ['The customer', 'Where it stands now', 'What it is worth', 'The last contact', 'The next step', 'The proof', 'every new lead', 'who is doing what by when']) {
      expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain(part);
    }
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('It is what to learn, not a list to read out.');
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('one thing at a time');
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('Never say there is proof unless it was added');
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('so finish');
  });

  it('lists back only the person\'s own deals and leads, never a colleague\'s', async () => {
    const deals = [
      { name: 'Kilele Hotel', stage: 'Won', fields: { Value: 'KES 200,000' }, ownerParticipantId: 'kevin' },
      { name: 'Greenfield Supermarket', stage: 'Won', fields: {}, ownerParticipantId: 'mercy' },
    ];
    const prisma = prismaFor('sales org', 'PARTICIPANT', deals);
    const r = await whatThisSalesCheckInGathers({ prisma, prompts: stored }, { groundId: 'g', participantId: 'kevin' });
    expect(prisma.asked[0].where.ownerParticipantId).toBe('kevin');
    expect(r.block).toContain('- Kilele Hotel: stage Won, worth KES 200,000, no next step said yet.');
    expect(r.block).not.toContain('Greenfield');
  });

  it('with Release 1\'s switch off for the organisation, a sales check-in is asked as before: nothing is added and the stored prompt is never read', async () => {
    const asked: string[] = [];
    const prompts = { getActive: async (key: string) => { asked.push(key); return stored.getActive(key); } };
    for (const kind of ['sales team', 'sales org']) {
      const r = await whatThisSalesCheckInGathers({ prisma: prismaFor(kind, 'PARTICIPANT', [], false), prompts }, { groundId: 'g', participantId: 'kevin' });
      expect(r).toEqual({ block: '', promptVersionId: null, last: '' });
    }
    expect(asked).toEqual([]);
  });

  it('adds nothing for the lead, or for a check-in that is not sales', async () => {
    expect((await whatThisSalesCheckInGathers({ prisma: prismaFor('sales org', 'INITIATOR'), prompts: stored }, { groundId: 'g', participantId: 'grace' })).block).toBe('');
    expect((await whatThisSalesCheckInGathers({ prisma: prismaFor('engineering release', 'PARTICIPANT'), prompts: stored }, { groundId: 'g', participantId: 'x' })).block).toBe('');
    expect((await whatThisSalesCheckInGathers({ prisma: prismaFor(null, 'PARTICIPANT'), prompts: stored }, { groundId: 'g', participantId: 'x' })).block).toBe('');
  });

  it('with nothing stored, the code\'s words run and say so with no id', async () => {
    const r = await whatThisSalesCheckInGathers({ prisma: prismaFor('sales org', 'PARTICIPANT'), prompts: { getActive: async () => null } }, { groundId: 'g', participantId: 'kevin' });
    expect(r.promptVersionId).toBeNull();
    expect(r.block).toContain('WHAT A SALES CHECK-IN GATHERS');
    expect(r.block).toContain('THEIR OWN DEALS AND LEADS SO FAR: none on record yet.');
  });

  it('one line per customer', () => {
    expect(theirDealsAndLeads([{ name: 'Savannah Cafe', stage: 'Quoted', fields: {} }, { name: 'savannah cafe', stage: 'Contacted', fields: {} }]).split('\n').length).toBe(2);
  });
});

describe('what reps say becomes deals and leads with the details the board shows', () => {
  it('the sales records reading names the stages, makes a lead a deal at its first stage, and fixes the labels', () => {
    const p = theRecordsPrompt('sales org');
    expect(p).toContain('every customer a line names is one deal, a new lead included');
    expect(p).toContain("never \"Jane Mwende at Savannah Cafe\"");
    expect(p).toContain("names no deal");
    expect(p).toContain('a new lead is Contacted');
    expect(p).toContain('a yes with the payment or the order still to come is not Won');
    for (const label of ['Value (', 'Units (', 'Contact (', 'Next step (', 'Next step by (']) expect(p).toContain(label);
    expect(theRecordsPrompt('engineering release')).not.toContain('a new lead is Contacted');
  });

  it('a deal with no commitment naming it reads the next step its owner gave', () => {
    expect(theNextStepTheyGave({ 'Next step': 'Send the Minimart quote', 'Next step by': 'tomorrow by noon' }, 'Kevin')?.next)
      .toBe('Kevin said the next step is “send the Minimart quote”, by tomorrow by noon.');
    expect(theNextStepTheyGave({ 'Next step': 'Visit on Thursday at 10', 'Next step by': 'Thursday' }, 'You')?.next)
      .toBe('You said the next step is “visit on Thursday at 10”.');
    expect(theNextStepTheyGave({}, 'Kevin')).toBeNull();
    expect(theNextStepTheyGave({ 'Next step': 'Call' }, null)).toBeNull();
  });
});

describe('a count of places names no deal', () => {
  it('"two shops on Ngong Road" is not kept as a deal, a named shop is', () => {
    const { aNameThatNamesSomething } = require('../board/the-kind-of-work');
    expect(aNameThatNamesSomething('two shops on Ngong Road')).toBe(false);
    expect(aNameThatNamesSomething('3 supermarkets in Westlands')).toBe(false);
    expect(aNameThatNamesSomething('Ngong Road Minimart')).toBe(true);
    expect(aNameThatNamesSomething('Two Rivers Mall')).toBe(true);
  });
});

describe('a deal the lead named becomes the rep\'s when the rep speaks of it', () => {
  const { aDealTheLeadNamedBecomesTheReps } = require('../board/one-deal-per-customer');
  const leads = new Set(['grace']);
  it('Greenfield, named in Grace\'s setup, is Mercy\'s once Mercy says it', () => {
    expect(aDealTheLeadNamedBecomesTheReps('grace', 'mercy', leads, 'deal')).toBe(true);
  });
  it('a rep\'s deal stays the rep\'s, whoever else names it, and the lead naming her own deal changes nothing', () => {
    expect(aDealTheLeadNamedBecomesTheReps('kevin', 'mercy', leads, 'deal')).toBe(false);
    expect(aDealTheLeadNamedBecomesTheReps('kevin', 'grace', leads, 'deal')).toBe(false);
    expect(aDealTheLeadNamedBecomesTheReps('grace', 'grace', leads, 'deal')).toBe(false);
    expect(aDealTheLeadNamedBecomesTheReps('grace', 'mercy', leads, 'release')).toBe(false);
  });
});

describe('the sales reminder is read last, in a sales check-in only', () => {
  it('a rep in a sales check-in gets it; the lead and other kinds do not', async () => {
    const { THE_SALES_REMINDER } = require('./what-a-sales-check-in-gathers');
    expect((await whatThisSalesCheckInGathers({ prisma: prismaFor('sales org', 'PARTICIPANT'), prompts: stored }, { groundId: 'g', participantId: 'k' })).last).toBe(THE_SALES_REMINDER);
    expect((await whatThisSalesCheckInGathers({ prisma: prismaFor('sales org', 'INITIATOR'), prompts: stored }, { groundId: 'g', participantId: 'g' })).last).toBe('');
    expect(THE_SALES_REMINDER).toContain('One question at a time, about one customer.');
  });
  it('the conversation puts it after the turn\'s own question and before the last three lines', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/theHole, salesGathers\.last, heldBack, proofKindly, A_REPORT_THEY_POINT_TO, cannotBeMissed, askedLastTurn/);
    /* Changed 3 November 2026: whereItIs (the count-based "where the check-in is" block) went with the forced close. */
  });
});

describe('the session plan of a sales check-in covers the customers first', () => {
  const { theBriefForThePlanner } = require('./the-plan-for-this-session');
  const base = { scenarioLabel: 'Set goals', pack: '', sessionNumber: 2, sessionsPlanned: 15, stage: 'middle', oneTime: false, person: { firstName: 'Mercy', roleAsDescribed: null, isLead: false }, roleMap: null, leadBrief: null, recordAlreadyHolds: '', doesNotAddUp: '', owed: [], declinedOrAskedTwice: [], earlier: [], patterns: [], coachingStep: 'Ask Joseph again', howTheyAnswer: null };
  it('the planner reads what the board needs and her own deals, and that coaching fits around them', () => {
    const brief = theBriefForThePlanner({ ...base, kindOfWorkNeeds: 'WHAT A SALES CHECK-IN GATHERS\n- Greenfield Supermarket: stage Won.' });
    expect(brief).toContain('WHAT THIS CHECK-IN MUST GATHER');
    expect(brief).toContain('a coaching move fits around it, never in place of it');
    expect(brief).toContain('Greenfield Supermarket');
  });
  it('anything that is not a sales check-in is planned as before', () => {
    expect(theBriefForThePlanner(base)).not.toContain('WHAT THIS CHECK-IN MUST GATHER');
  });
});

describe('the next step on its own, for the grid', () => {
  it('is the step, capitalised, with its day', () => {
    expect(theNextStepTheyGave({ 'Next step': 'send the Minimart quote', 'Next step by': 'tomorrow by noon' }, 'Kevin')?.nextStep).toBe('Send the Minimart quote, by tomorrow by noon');
    const { whatHappensNext } = require('../board/what-happens-next-to-a-record');
    expect(whatHappensNext({ name: 'Kasarani Gym' }, [{ participantId: 'k', text: 'I will follow up with Faith at Kasarani Gym on Monday' }], () => 'Kevin').nextStep).toMatch(/^Follow up with Faith at Kasarani Gym/);
  });
});
