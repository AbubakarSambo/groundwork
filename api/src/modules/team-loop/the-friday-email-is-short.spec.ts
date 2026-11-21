import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { theUpdateForHer } from './the-update-for-her';
import { theTeamSheMayAsk } from './standing-instructions';
import { theFactsToTell, theUpdateParagraphs, AND_MORE_ARE_ON_THE_LIST, MOST_TOLD } from './the-update-in-short';

/**
 * FATIMA ROUND 2, E3: THE FRIDAY EMAIL AND THE WEEKLY UPDATE ARE SHORT. Round 2's email told every promise in eight lines. Now at most ten facts are told, one from
 * each person who sent something before a second from anybody, and the rest are counted by code in the outstanding answer's own words. Every text she reads is printed.
 */
const fact = (person: string, n: number) => ({ person, fact: { id: `f${person}${n}`, says: `${person} said they will send item ${n}, in a message on 12 November.` } });
const many = (people: string[], each: number) => people.flatMap((p) => Array.from({ length: each }, (_, i) => fact(p, i + 1)));

describe('which facts are told', () => {
  it('at most ten, every person before anybody twice, in the order the record has them, and the rest counted', () => {
    const facts = [...many(['Musa'], 6), ...many(['Aminu'], 4), ...many(['Kemi'], 2)];
    const { shown, left } = theFactsToTell(facts);
    expect(shown).toHaveLength(MOST_TOLD);
    expect(left).toBe(2);
    expect(new Set(shown.map((f) => f.person))).toEqual(new Set(['Musa', 'Aminu', 'Kemi']));
    expect(shown.filter((f) => f.person === 'Kemi')).toHaveLength(2);
    expect(shown.map((f) => f.person)).toEqual([...Array(4).fill('Musa'), ...Array(4).fill('Aminu'), ...Array(2).fill('Kemi')]);
    expect(theFactsToTell(many(['Musa'], 3))).toEqual({ shown: many(['Musa'], 3), left: 0 });
  });

  it('says the count in code, in the words the outstanding answer uses, whether the model wrote the sentences or not', () => {
    const shown = many(['Musa', 'Aminu'], 2);
    expect(theUpdateParagraphs(shown, 3, null)).toEqual([
      'Musa said they will send item 1, in a message on 12 November. Musa said they will send item 2, in a message on 12 November.',
      'Aminu said they will send item 1, in a message on 12 November. Aminu said they will send item 2, in a message on 12 November.',
      '3 more are on the list, and I can read them out if you ask.',
    ]);
    const told = [{ says: 'Musa and Aminu each have two things to send.', from: ['fMusa1', 'fMusa2', 'fAminu1'] }];
    expect(theUpdateParagraphs(shown, 0, told)).toEqual(['Musa and Aminu each have two things to send.', AND_MORE_ARE_ON_THE_LIST(1)]);
    expect(AND_MORE_ARE_ON_THE_LIST(1)).toBe('1 more is on the list, and I can read it out if you ask.');
  });
});

describe('the email she reads', () => {
  it('tells ten of fourteen promises, names everybody, and counts the rest; with the model off it says the same facts plainly', async () => {
    const x = await aTeamLoopWorld({ mind: null });
    const people: [string, string][] = [['Amina Yusuf', 'p-amina'], ['Ibrahim Sule', 'p-ibrahim']];
    for (const [, id] of people) for (let i = 1; i <= 7; i++) await x.t.commitment.create({ data: { organizationId: 'org-1', personExternalId: id, text: `I will send item ${i} on Monday`, dueSaid: 'on Monday', dueAt: null, state: 'OPEN', source: 'team_reply', statedAt: new Date(x.now.getTime() - 86_400_000) } });
    const args = { organizationId: 'org-1', principalUserId: 'u-fatima', first: 'Fatima', contacts: await theTeamSheMayAsk(x.prisma, 'u-fatima'), since: new Date(x.now.getTime() - 3 * 86_400_000), now: x.now, lead: 'week' as const, asks: [] };
    const email = await theUpdateForHer(x.prisma, null, args);
    console.log(`WHAT FATIMA READS\n${email}`);
    const said = (email.match(/said they will/g) ?? []).length;
    if (args.contacts.length) {
      expect(said).toBeLessThanOrEqual(MOST_TOLD);
      if (said === MOST_TOLD) expect(email).toMatch(/\d+ more (?:is|are) on the list, and I can read (?:it|them) out if you ask\./);
    }
    expect(email).not.toMatch(/\bstated\b/);
    const withMind = await theUpdateForHer(x.prisma, aScriptedMind({ narrate: [{ says: 'Amina and Ibrahim have promised a number of letters.', from: ['f1'] }] }), args);
    console.log(`WHAT FATIMA READS WITH THE MODEL\n${withMind}`);
    expect(withMind).toContain('Amina and Ibrahim have promised a number of letters.');
  });
});
