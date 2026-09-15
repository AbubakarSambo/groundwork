import { targetsFor } from './whose-number-is-whose-business';

/*
 * Read live on a second check-in: a team target of 500 with four people carrying 150, 150, 150 and
 * 50 of it, and the line back said the check-in was aiming at 1000. The per-person numbers compose
 * the team's one; adding both counts the same work twice.
 */
describe('a whole is not the same work counted twice', () => {
  const me = 'p-mine';
  const teamOf500 = { name: '500 contracts', target: 500, ownerParticipantId: null };
  const shares = [
    { name: 'contracts', target: 150, ownerParticipantId: 'p-rita' },
    { name: 'contracts', target: 150, ownerParticipantId: 'p-kunle' },
    { name: 'contracts', target: 150, ownerParticipantId: 'p-amir' },
    { name: 'contracts', target: 50, ownerParticipantId: me },
  ];

  it('does not add the team number to the parts that make it up', () => {
    const { alsoSay } = targetsFor([teamOf500, ...shares], me, 'their own');
    expect(alsoSay).not.toContain('1000');
  });

  it('and gives no sum at all while a whole and its parts are mixed together', () => {
    /*
     * Naming the unowned target as the whole was the first fix and it is wrong too: a target with
     * nobody's name on it is often one nobody has been given yet, and calling that the whole
     * understates the ask as badly as adding everything overstated it.
     */
    const { alsoSay } = targetsFor([teamOf500, ...shares], me, 'their own');
    expect(alsoSay).not.toMatch(/aiming at/);
    expect(alsoSay).toContain('numbers of their own');
  });

  it('does not claim a head count while a number belongs to nobody', () => {
    const { alsoSay } = targetsFor([teamOf500, ...shares], me, 'their own');
    expect(alsoSay).not.toMatch(/across \d+ (person|people)/);
  });

  it('adds them up when every number has a name on it, which is what the head count was for', () => {
    const { alsoSay } = targetsFor(shares, me, 'their own');
    expect(alsoSay).toContain('aiming at 500 across 4 people');
  });

  it('still shows a person their own number and nobody else’s', () => {
    const { shown } = targetsFor([teamOf500, ...shares], me, 'their own');
    expect(shown.map((t) => t.ownerParticipantId)).toEqual([null, me]);
  });
});
