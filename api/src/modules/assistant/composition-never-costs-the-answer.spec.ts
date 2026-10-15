import { safeToUse, roleNameIn } from './the-model-words-it-and-nothing-more';
import { AssistantService } from './assistant.service';

/**
 * AN OUTAGE MUST NOT COST SOMEBODY THEIR ANSWER.
 *
 * Composition is the last thing that happens and the least important. The lane has already worked
 * out what is true; this only decides how it sounds. So every way of failing - the model off,
 * unreachable, slow, or returning something that fails the checks - ends with the person reading
 * the same true sentence they would have read anyway.
 *
 * The `composedBy` stamp is what makes that honest rather than hidden: a sentence a model wrote and
 * a sentence the rules wrote carry different weight, and somebody should be able to tell.
 */
function svc(engineBehaviour: () => Promise<string>) {
  const prisma: any = {
    subject: { findMany: jest.fn(async () => [{ sourceSystem: 'their-tool', syncedAt: new Date(), sourceDeletedAt: null }]), count: jest.fn(async () => 1) },
    person: { count: jest.fn(async () => 2), findFirst: jest.fn(async () => ({ externalId: 'u-1' })), findMany: jest.fn(async () => []) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    /* The turn is remembered and a parked proposal is looked for, both now part of every reply. */
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async (a: any) => ({ id: 'pr1', ...a.data })), update: jest.fn(async () => ({})) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
  };
  /* Retrieval is only reached by the handbook lane; these suites do not use it. */
  const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
  const engine: any = { respond: jest.fn(engineBehaviour) };
  return { service: new AssistantService(prisma, engine, knowledge, { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any, { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any, { pendingFor: async () => [], decide: async () => { throw new Error('no suggestions in these tests'); } } as any, { start: async () => { throw new Error('no drafting in these tests'); } } as any, { forPerson: async () => { throw new Error('no assembly in these tests'); } } as any, { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any, { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any, { create: async () => { throw new Error('no ground creation in these tests'); }, addParticipant: async () => { throw new Error('no ground creation in these tests'); } } as any), engine };
}

const ask = (s: AssistantService) => s.respond('org-a', 'p1', 'what can you see?');

describe('composition never costs the answer', () => {
  it('uses the model when it behaves, and says so', async () => {
    /*
     * The fixture used to drop the "last updated" date and still count as a good composition. It
     * stopped counting when the check became symmetric, which was the check being right: freshness
     * is the reason anybody asks this lane what it can see, and a fluent answer that loses it is
     * worse than the blunt one that keeps it.
     */
    /*
     * THE DATE IS BUILT FROM TODAY, NOT TYPED IN. This read "29 Aug 2026", and the composer's
     * safety check compares every date in a model's reply against the draft it was given - so at
     * midnight on the 29th the fixture started describing a day that was not the one the draft
     * mentioned, the reply was correctly rejected as invented, and a passing test began failing
     * for a reason that had nothing to do with the code.
     */
    /*
     * AND IT IS FORMATTED THE WAY THE DRAFT FORMATS IT, NOT THE WAY THIS FILE GUESSED.
     *
     * Building the date dynamically fixed the midnight problem and left a second one behind: the
     * fixture used `toLocaleDateString('en-GB', { month: 'short' })` while the draft uses
     * `toDateString()`. Those agree for eleven months of the year and disagree for September, where
     * en-GB's short month is "Sept" and toDateString gives "Sep". So the model's reply carried a
     * date the draft did not contain, the safety check correctly called it invented, composition was
     * refused, and this test failed - for the whole of September, every year. It began failing on
     * 1 September.
     *
     * The fixture now derives the date the same way the draft does. A test about whether the model
     * invented a date must not be able to fail because it disagreed with the draft about spelling.
     */
    const today = new Date().toDateString();
    const reply = `From their-tool: 1 objective and 2 people, last updated ${today}.`;
    const { service } = svc(async () => reply);
    const r = await ask(service);
    expect(r.composedBy).toBe('model');
    /* v4 since 26 September 2026, when the one wording rulebook went into the style. */
    expect(r.styleVersion).toBe('v4');
    expect((r.blocks[0] as any).body).toBe(reply);
  });

  it('refuses a composition that quietly drops a number the record produced', async () => {
    /*
     * The rule was asymmetric by accident for a long time: an INVENTED number was refused, a DROPPED
     * one went unnoticed. Both are the composer editing the record rather than wording it, and the
     * dropped one is the harder to catch by reading, because nothing looks wrong.
     */
    const { service } = svc(async () => 'A couple of things from their-tool, updated recently.');
    const r = await ask(service);
    expect(r.composedBy).toBe('rules');
    expect((r.blocks[0] as any).body).toMatch(/2 people/);
  });

  it('ships the draft when the model is unreachable', async () => {
    const { service } = svc(async () => { throw new Error('provider is down'); });
    const r = await ask(service);
    expect(r.composedBy).toBe('rules');
    expect((r.blocks[0] as any).body).toContain('1 objective');
  });

  it('ships the draft when the model invents a number', async () => {
    /* The one that would otherwise be invisible: it reads perfectly and is about somebody's work. */
    const { service } = svc(async () => '7 objectives and 2 people.');
    const r = await ask(service);
    expect(r.composedBy).toBe('rules');
    expect((r.blocks[0] as any).body).not.toContain('7 objectives');
  });

  it('ships the draft when the model returns nothing', async () => {
    const { service } = svc(async () => '   ');
    expect((await ask(service)).composedBy).toBe('rules');
  });

  it('never leaves the lane in doubt, whichever way it went', async () => {
    /* Path attribution has to survive composition, or a cost report cannot tell where a call went. */
    const good = await ask(svc(async () => '1 objective, 2 people.').service);
    const bad = await ask(svc(async () => { throw new Error('x'); }).service);
    expect(good.lane).toBe('what_you_can_see');
    expect(bad.lane).toBe('what_you_can_see');
  });

  it('calls the model at most once for a turn', async () => {
    /* The spec allows three across a turn; composition is entitled to one of them and no more. */
    const { service, engine } = svc(async () => '1 objective, 2 people.');
    await ask(service);
    expect(engine.respond).toHaveBeenCalledTimes(1);
  });

  it('does not call it at all for an unplaced input', async () => {
    /*
     * There is nothing to say better - a fixed sentence and some buttons. Rewording it would make
     * the reply a person sees most often vary for no reason, and spend a model call doing it.
     */
    const { service, engine } = svc(async () => 'anything');
    const r = await service.respond('org-a', 'p1', 'can you renegotiate my contract');
    expect(r.composedBy).toBe('rules');
    expect(engine.respond).not.toHaveBeenCalled();
  });
});

describe('the composer cannot introduce a person the record never named', () => {
  /*
   * NOT HYPOTHETICAL. Driving the handoff lane returned "Onboarding rewrite (Renewal push), from
   * Alex Smith - blocked for 2 days". There is no Alex Smith; the draft contained no name at all.
   * The composer invented a person and attributed to them the holding-up of somebody else's work,
   * in the one lane whose whole subject is who is waiting on whom - and every check passed, because
   * it kept the number.
   *
   * It happened once in five identical requests. That is the worst frequency there is: never during
   * testing, eventually in front of a customer.
   */
  it('refuses an invented name even when every number survives', () => {
    const draft = 'Waiting on you:\n- the onboarding rewrite (Renewal push) - waiting, 2 days';
    expect(safeToUse(draft, 'The onboarding rewrite (Renewal push), from Alex Smith - waiting, 2 days.')).toBe(false);
  });

  it('while a name the record did produce comes through', () => {
    const draft = 'Naomi is waiting on the pricing decision - 2 days';
    expect(safeToUse(draft, 'The pricing decision has Naomi waiting, 2 days now.')).toBe(true);
  });

  it('and ordinary sentences are not caught by it', () => {
    const draft = 'You have 2 open commitments.';
    expect(safeToUse(draft, 'You have 2 open commitments.')).toBe(true);
    expect(safeToUse(draft, 'There are 2 open commitments. You can see them below.')).toBe(true);
  });
});

describe('a colon does not open a sentence', () => {
  it('so an invented name after one is still caught', () => {
    /*
     * The sentence-start exemption exists because English capitalises first words. A colon
     * introduces a clause, not a sentence - and treating it as one puts "the client name: Alex
     * Smith" in first position, which is the easiest place to hide the exact thing this refuses.
     * The conversation-side guard had this same bug and its own test found it there.
     */
    const draft = 'Waiting on you: the onboarding rewrite - 2 days';
    expect(safeToUse(draft, 'Waiting on you: Alex Smith has the onboarding rewrite - 2 days')).toBe(false);
  });
});

describe('a word the caller says must survive, survives', () => {
  const draft = 'You are down as Engineer. Still to do: read the role brief.';

  it('because dropping one deleted the answer to the question asked', () => {
    /*
     * Asked "what is my role", the draft's "Still to do for Engineer:" came back as "Your next
     * steps:" - better English, and it deleted the answer. The invented-name rule could not see it,
     * because it only refuses what the model ADDS.
     */
    expect(safeToUse(draft, 'Your role is Engineer. Still to do: read the role brief.', ['Engineer'])).toBe(true);
    expect(safeToUse(draft, 'Your next steps: read the role brief.', ['Engineer'])).toBe(false);
  });

  it('and the caller names it, because shape alone cannot tell a name from a verb', () => {
    /*
     * I tried inferring it from capitalisation first, and it refused a good rewording of a draft
     * whose list items began "Reduce onboarding..." - an ordinary verb at the start of a line looks
     * exactly like a name. Guessing trades a fault on almost no replies for a fallback on many.
     */
    const listy = 'You own 2:\n- Reduce onboarding to under 11 days';
    expect(safeToUse(listy, 'Reduce onboarding to under 11 days. You own 2.')).toBe(true);
    expect(safeToUse(listy, 'You own 2 things, one of them onboarding, under 11 days.')).toBe(true);
  });

  it('and the onboarding lane pulls it out of its own draft', () => {
    /*
     * Read back OUT of the draft rather than passed in from elsewhere: a must-keep word that is not
     * in the draft at all would refuse every composition of that lane forever.
     */
    expect(roleNameIn({ blocks: [{ type: 'text', body: draft }] })).toEqual(['Engineer']);
    expect(roleNameIn({ blocks: [{ type: 'text', body: 'no role here' }] })).toEqual([]);
    expect(roleNameIn({ blocks: [] })).toEqual([]);
  });
});
