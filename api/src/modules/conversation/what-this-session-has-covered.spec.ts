import { sayWhatHasBeenCovered, theSpineLinesIn, whatThisSessionHasCovered, whereTheSpineIs } from './what-this-session-has-covered';
import { buildScenarioPackForParty } from './prompt-library';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * Adversarial runs, 20 Sep 2026: "repeated question" 35 times, "questionnaire feel" 22. The owed
 * list is proved from entries extracted at completion, so during a session nothing ever reads as
 * answered. This reads the session itself.
 */
describe('what this session has covered', () => {
  const things = [
    { id: 'own-work', what: 'what they are working on' },
    { id: 'in-the-way', what: 'what is getting in the way' },
    { id: 'weekly', what: 'the weekly delivery number they would need to hit' },
    { id: 'needs-others', what: 'what they need from other people' },
  ];
  const turns = [
    { role: 'AI' as const, content: 'What are you working on this week, and where does it stand?' },
    { role: 'PERSON' as const, content: 'The Zenith proposal. It went out on Tuesday, 12 pages.' },
    { role: 'AI' as const, content: 'What is getting in the way right now?' },
    { role: 'PERSON' as const, content: 'Nothing much, things are moving along fine really.' },
    { role: 'AI' as const, content: 'What would you say the weekly delivery number is that you would need to hit?' },
    { role: 'PERSON' as const, content: "I don't focus on a weekly number. My focus is on having the payment ready." },
  ];

  it('tells answered, vague, declined and not-asked apart', () => {
    const c = whatThisSessionHasCovered(things, turns);
    expect(c.get('own-work')?.state).toBe('answered');
    expect(c.get('own-work')?.answer).toContain('Zenith');
    expect(c.get('in-the-way')?.state).toBe('answered-vaguely');
    expect(c.get('weekly')?.state).toBe('declined');
    expect(c.get('needs-others')?.state).toBe('not-asked');
  });

  /* Bola, smoke run 7: "What do you need from others to move forward?" - "I'm fine for now." - then the close
     was held on "what you need from other people". */
  it('hears the owed thing in the words it is asked in', () => {
    const c = whatThisSessionHasCovered(things, [
      ...turns,
      { role: 'AI' as const, content: 'What do you need from others to move forward?' },
      { role: 'PERSON' as const, content: "I'm fine for now. Thanks." },
    ]);
    expect(c.get('needs-others')?.state).not.toBe('not-asked');
    const plan = whatThisSessionHasCovered([{ id: 'my-part', what: 'the part of the plan that is theirs to do' }], [
      { role: 'AI' as const, content: 'What is the next action you are taking to secure those sales, and by when?' },
      { role: 'PERSON' as const, content: 'I have already secured them, the invoices are with the dealers.' },
    ]);
    expect(plan.get('my-part')?.state).not.toBe('not-asked');
  });

  it('and the block says what to do with each, leaving only the unasked as still to cover', () => {
    const { notAsked, block } = sayWhatHasBeenCovered(things, whatThisSessionHasCovered(things, turns));
    expect(notAsked.map((t) => t.id)).toEqual(['needs-others']);
    expect(block).toContain('ALREADY ANSWERED THIS SESSION');
    expect(block).toContain('they said "The Zenith proposal');
    expect(block).toContain('ASKED ONCE, ANSWERED WITHOUT ANYTHING SPECIFIC');
    expect(block).toContain('LEAVE THESE');
    expect(block).toContain('the weekly delivery number they would need to hit (declined)');
  });

  it('a thing asked twice is left, whatever came back', () => {
    const twice = [
      ...turns,
      { role: 'AI' as const, content: 'Is there anything getting in the way that you have not mentioned?' },
      { role: 'PERSON' as const, content: 'Not really, no, it is all fine.' },
    ];
    const { leave } = sayWhatHasBeenCovered(things, whatThisSessionHasCovered(things, twice));
    expect(leave.map((l) => `${l.thing.id}:${l.why}`)).toEqual(expect.arrayContaining(['in-the-way:asked twice']));
  });
});

describe('where the spine is', () => {
  const pack = buildScenarioPackForParty(GroundScenario.DISCOVERY, PartyType.PARTICIPANT);

  it('reads the nine quoted lines out of the discovery pack', () => {
    const spine = theSpineLinesIn(pack);
    expect(spine).toHaveLength(9);
    expect(spine[0].what).toMatch(/expand or grow/);
    expect(spine[8].what).toMatch(/twelve months/);
  });

  it('says which lines are done and which is next, so the model does not start from the top', () => {
    const block = whereTheSpineIs(pack, [
      { role: 'AI', content: 'What are you trying to expand or grow over the next two to three years?' },
      { role: 'PERSON', content: 'Double our paddy intake to 40 tonnes a week by next dry season.' },
      { role: 'AI', content: 'What is stopping you from doing that now?' },
      { role: 'PERSON', content: 'Supply. We cannot find enough aggregators.' },
    ]);
    expect(block).toContain('ALREADY ANSWERED THIS SESSION');
    expect(block).toContain('40 tonnes');
    expect(block).toContain('NEXT ON THE SPINE');
    expect(block).toContain('If that constraint disappeared tomorrow');
    expect(block).not.toContain('NEXT ON THE SPINE, when the current thread is done: "What are you trying to expand');
  });

  it('is empty before the first question and says the spine is done when it is', () => {
    expect(whereTheSpineIs(pack, [])).toBe('');
    const spine = theSpineLinesIn(pack);
    const turns = spine.flatMap((q) => [{ role: 'AI' as const, content: q.what }, { role: 'PERSON' as const, content: 'Kano and Jigawa, 300 tonnes by March.' }]);
    expect(whereTheSpineIs(pack, turns)).toContain('THE SPINE IS DONE');
  });
});
