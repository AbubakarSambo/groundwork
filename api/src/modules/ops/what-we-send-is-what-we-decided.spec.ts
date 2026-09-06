/**
 * THE ASSISTANT HAD NO MEMORY OF THIS COMPANY, AND IT WAS NEVER THE ASSISTANT'S FAULT.
 *
 * It reads what was pushed to it. We pushed people, objectives, evidence and
 * interactions — and never what the product is, the moat, the phases, the
 * freeze, or what a piece of work has to serve. All of it in our own system,
 * with a published route standing open the whole time.
 */
import { whatThisCompanyDecided, whatServingMeans, OUR_SOURCE_SYSTEM } from './what-this-company-decided';
import { WHAT_WORK_CAN_SERVE } from './what-a-piece-of-work-serves';

const held = {
  statement: {
    version: 3,
    headline: 'A record of what a team agreed and whether it happened.',
    saidOutLoud: 'It is the record, not the meeting.',
    isIt: ['Opened at a specific moment'],
    isNotIt: ['A permanent evaluation layer'],
  },
  moat: [{ name: 'The record', statement: 'Nobody else holds what people separately agreed.' }],
  phases: [
    {
      name: 'Prove',
      intent: 'The product works for real use cases.',
      startsOn: new Date('2026-09-01'),
      endsOn: new Date('2026-10-31'),
      exitCondition: 'Ten companies onboarded.',
      exitMetric: 'targets.companies_onboarded',
    },
    {
      name: 'Team',
      intent: 'A company that runs without one person.',
      startsOn: new Date('2026-09-01'),
      endsOn: new Date('2026-11-30'),
      exitCondition: 'The team can run the company.',
      exitMetric: null,
    },
  ],
  freeze: { because: 'September is for making what exists work.', until: new Date('2026-09-30') },
  resources: [{ title: 'Sales deck', category: 'SALES_DECK', risks: ['Overpromises on the AI'] }],
  serves: whatServingMeans(),
};

describe('what we send', () => {
  const cards = whatThisCompanyDecided(held);
  const byKey = new Map(cards.map((c) => [c.key, c]));

  it('carries what the product is, including what it is not', () => {
    const card = byKey.get('what-we-are')!;
    expect(card.body).toContain('A permanent evaluation layer');
    expect(card.kind).toBe('PRODUCT_MAP');
  });

  it('and the moat, the workplan, the freeze and what work has to serve', () => {
    expect([...byKey.keys()]).toEqual(
      expect.arrayContaining(['the-moat', 'the-workplan', 'the-freeze', 'what-work-can-serve']),
    );
  });

  it('and says plainly where a phase ends on somebody deciding rather than a number', () => {
    /* Sending "done when the team can run the company" with no note that nothing
       measures it would offer the assistant a number that does not exist. */
    expect(byKey.get('the-workplan')!.body).toContain('somebody decides');
  });

  it('and every card carries a stable key, so an edit supersedes rather than duplicating', () => {
    for (const c of cards) {
      expect(c.externalId).toBe(c.key);
      expect(c.sourceSystem).toBe(OUR_SOURCE_SYSTEM);
      expect(c.sourceRef).toBeTruthy();
    }
  });

  it('and one card per decision, not one handbook', () => {
    /* Retrieval scores a question against a card. One document holding the moat,
       the phases and the freeze scores badly against "what are we not doing this
       month" and loses to anything shorter. */
    expect(cards.length).toBeGreaterThanOrEqual(5);
    expect(cards.every((c) => c.body.length < 4000)).toBe(true);
  });

  it('and nothing about a named person', () => {
    /* A card is what the company agreed, readable by everybody in it. Somebody's
       record is a different kind of thing and must not arrive wearing this one's
       clothes. */
    const all = cards.map((c) => c.body).join('\n');
    expect(all).not.toMatch(/\b(Hafsah|Sahar|Abubakar|Adam|Nate|James)\b/);
  });
});

describe('what work has to serve', () => {
  it('is read from the enum, so the card cannot drift from the rule', () => {
    expect(whatServingMeans().map((s) => s.label).sort()).toEqual(
      WHAT_WORK_CAN_SERVE.map((w) => w.serves).sort(),
    );
  });
});

describe('a decision that is no longer in force', () => {
  it('is not sent as though it were', () => {
    const lapsed = { ...held, freeze: null };
    expect(whatThisCompanyDecided(lapsed).find((c) => c.key === 'the-freeze')).toBeUndefined();
  });
});
