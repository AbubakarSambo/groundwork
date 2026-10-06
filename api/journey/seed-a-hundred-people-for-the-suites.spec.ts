import { loadTheHundredPeople, thePeople } from './seed-a-hundred-people-for-the-suites';
import { NOT_A_DATABASE_ON_THIS_COMPUTER } from './a-database-on-this-computer';

/**
 * THE HUNDRED-PERSON SEED KEEPS ITS SHAPE AND KEEPS OFF EVERY DATABASE BUT THIS COMPUTER'S. What it
 * writes is checked against a real local database in docs/run-log.md; here, the people (no database
 * needed) and the refusal.
 */
describe('the hundred-person suites seed', () => {
  const people = thePeople();

  it('is a hundred people, each with one key, one manager who is somebody in it, and every team full', () => {
    expect(people).toHaveLength(100);
    expect(new Set(people.map((p) => p.key)).size).toBe(100);
    const keys = new Set(people.map((p) => p.key));
    for (const p of people) if (p.manager) expect(keys.has(p.manager)).toBe(true);
    const teams = new Map<string, number>();
    for (const p of people) if (p.team) teams.set(p.team, (teams.get(p.team) ?? 0) + 1);
    expect([...teams.values()]).toEqual(Array(9).fill(11));
  });

  it('has admins, leads and members, and two people who share a first name', () => {
    expect(people.filter((p) => p.role === 'ADMIN').map((p) => p.key)).toEqual(['ceo', 'ops.head']);
    expect(people.filter((p) => p.role === 'LEAD')).toHaveLength(17);
    expect(people.filter((p) => p.role === 'MEMBER')).toHaveLength(81);
    const firsts = people.map((p) => p.first);
    expect(firsts.length).toBeGreaterThan(new Set(firsts).size);
    const fulls = people.map((p) => `${p.first} ${p.last}`);
    expect(new Set(fulls).size).toBe(100);
  });

  it.each(['postgresql://u@db.example.com:5432/x', 'postgresql://u@10.0.0.4:5432/x', 'mysql://localhost/x', '', 'not a url'])('refuses %p and writes nothing', async (url) => {
    await expect(loadTheHundredPeople(url)).rejects.toThrow(NOT_A_DATABASE_ON_THIS_COMPUTER);
  });
});
