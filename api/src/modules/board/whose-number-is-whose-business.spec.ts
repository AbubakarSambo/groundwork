import { targetsFor, UNLESS_SOMEBODY_SAYS, WHAT_THAT_MEANS } from './whose-number-is-whose-business';

const ten = [
  { name: 'Bala', target: 40, ownerParticipantId: 'bala' },
  { name: 'Musa', target: 35, ownerParticipantId: 'musa' },
  { name: 'Amina', target: 21, ownerParticipantId: 'amina' },
];

describe('whose number is whose business', () => {
  it('shows a person their own and not their colleagues’', () => {
    const out = targetsFor(ten, 'musa', 'their own');
    expect(out.shown.map((t) => t.name)).toEqual(['Musa']);
  });

  it('but tells them the whole they are part of, which is what makes the ask reasonable', () => {
    /* "Yours is 35" is a chore. "Yours is 35, of 96 across three people" is a share of something. */
    expect(targetsFor(ten, 'musa', 'their own').alsoSay).toContain('96 across 3 people');
    expect(targetsFor(ten, 'musa', 'their own').alsoSay).not.toMatch(/Bala|Amina|40|21/);
  });

  it('leaves a target belonging to nobody visible to everybody', () => {
    /* What every board target was before owners existed, and still the common case. */
    const mixed = [...ten, { name: 'Paying companies', target: 50, ownerParticipantId: null }];
    expect(targetsFor(mixed, 'musa', 'their own').shown.map((t) => t.name)).toEqual(['Paying companies', 'Musa']);
  });

  it('shows the lead all of them, because setting them is their job', () => {
    expect(targetsFor(ten, null, 'their own', { isLead: true }).shown).toHaveLength(3);
  });

  it('puts the whole board on the wall where somebody chose that', () => {
    const out = targetsFor(ten, 'musa', 'everybody');
    expect(out.shown).toHaveLength(3);
    expect(out.alsoSay).toBeNull();
  });

  it('says nothing extra to somebody who is the only one with a number', () => {
    expect(targetsFor([ten[1]], 'musa', 'their own').alsoSay).toBeNull();
  });

  it('defaults narrow, because a default that publishes is not a default', () => {
    expect(UNLESS_SOMEBODY_SAYS).toBe('their own');
    expect(WHAT_THAT_MEANS['their own']).toContain('Nobody sees anybody else');
  });
});

import { whatTheLeadShouldKnow } from './whose-number-is-whose-business';

describe('and the lead is told where the setting is doing nothing', () => {
  const partly = [
    { name: 'Bala', target: 40, ownerParticipantId: null },
    { name: 'Musa', target: 35, ownerParticipantId: 'musa' },
  ];

  it('says how many numbers have nobody’s name on them', () => {
    /* Read live with eight of ten unassigned: the setting was on and doing nothing. */
    expect(whatTheLeadShouldKnow(partly, 'their own')).toContain('One target has nobody');
    expect(whatTheLeadShouldKnow(partly, 'their own')).toContain('everybody on this check-in can see it');
  });

  it('never guesses an owner from the words in a target', () => {
    /* "Bala" in the text is not Bala. Inferring one would attach a person's number to them on the
       strength of a string match. */
    expect(whatTheLeadShouldKnow(partly, 'their own')).not.toMatch(/Bala/);
  });

  it('says nothing where no target has an owner, because that is the ordinary case', () => {
    /* A board target belonging to the whole check-in is what every one of them was. */
    expect(whatTheLeadShouldKnow([{ name: 'Paying companies', target: 50, ownerParticipantId: null }], 'their own')).toBeNull();
  });

  it('and nothing at all where the wall is the choice', () => {
    expect(whatTheLeadShouldKnow(partly, 'everybody')).toBeNull();
  });

  it('drops the head count where the check-in is only part-way assigned', () => {
    /*
     * "aiming at 270 across 2 people" - true of the data, nonsense to a reader, and read exactly
     * that way live with eight of ten targets unassigned.
     *
     * The fixture needs somebody else's number in it: where nothing was withheld there is nothing
     * to explain, which is why `partly` alone says nothing at all.
     */
    const threeWays = [...partly, { name: 'Amina', target: 21, ownerParticipantId: 'amina' }];
    const out = targetsFor(threeWays, 'musa', 'their own');
    expect(out.alsoSay).not.toMatch(/across \d+ (person|people)/);
    /*
     * AND NOT THE TOTAL EITHER, WHICH THIS USED TO EXPECT.
     *
     * It asked for "aiming at 96" - every number added up while some of them belong to nobody.
     * Read live afterwards: a team target of 500 with four people carrying 150, 150, 150 and 50 OF
     * it came back as "aiming at 1000", the same work counted twice. Nothing in a target says
     * whether it is a whole or a part, so where the two are mixed there is no honest sum to give.
     * What is still worth saying is that something was left out and why.
     */
    expect(out.alsoSay).not.toMatch(/aiming at/);
    expect(out.alsoSay).toContain('numbers of their own');
  });

  /* CHANGED 7 October 2026 (decision 110, P3). This case kept the total at two people, and with two the whole minus your own is your
     colleague's number. The total now needs three or more people with a number. */
  it('but keeps it once every number has a name on it, and three or more people have one', () => {
    const allNamed = [
      { name: 'Musa', target: 35, ownerParticipantId: 'musa' },
      { name: 'Amina', target: 21, ownerParticipantId: 'amina' },
      { name: 'Kofi', target: 40, ownerParticipantId: 'kofi' },
    ];
    expect(targetsFor(allNamed, 'musa', 'their own').alsoSay).toContain('across 3 people');
  });

  it('and gives no total when only two people have a number, because the whole minus your own is your colleague\'s', () => {
    const two = [
      { name: 'Musa', target: 35, ownerParticipantId: 'musa' },
      { name: 'Amina', target: 21, ownerParticipantId: 'amina' },
    ];
    const read = targetsFor(two, 'musa', 'their own');
    expect(read.alsoSay).toBe('Other people on this check-in have numbers of their own, and those are theirs.');
    expect(JSON.stringify(read)).not.toContain('56');
    expect(JSON.stringify(read)).not.toContain('21');
  });

  it('read as the lead, an admin, and with everybody seeing everybody, the total is not needed and nothing is withheld', () => {
    const two = [
      { name: 'Musa', target: 35, ownerParticipantId: 'musa' },
      { name: 'Amina', target: 21, ownerParticipantId: 'amina' },
    ];
    expect(targetsFor(two, 'musa', 'their own', { isLead: true }).shown).toHaveLength(2);
    expect(targetsFor(two, 'musa', 'their own', { seesEveryShare: true }).shown).toHaveLength(2);
    expect(targetsFor(two, 'musa', 'everybody').shown).toHaveLength(2);
  });
});
