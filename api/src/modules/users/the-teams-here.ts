import { aLineOrNothing } from './where-they-sit';

/**
 * THE TEAMS HERE ARE A LIST, NOT TYPED TEXT (Hafsah, 21 November 2026). "Sales", "sales" and "Sales team" counted as three teams,
 * because a team was whatever was typed on each person's membership. The list is the team each person here is shown
 * with on People, one spelling per team ignoring case: the spelling most people hold, and the first in the alphabet
 * between equals. Each person's team is read as People shows it (users.service.ts, theTeams). Picking a team writes that spelling; a new team is added by typing it once, and the next person picks it.
 */
export function oneKeyFor(team: string): string {
  return team.replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
}

/** The teams, from every team name on the memberships here, one spelling each, in alphabetical order, with how many are on each. */
export function theTeamsFrom(names: (string | null | undefined)[]): { name: string; people: number }[] {
  const byKey = new Map<string, Map<string, number>>();
  for (const raw of names) {
    const name = aLineOrNothing(raw ?? null);
    if (!name) continue;
    const spellings = byKey.get(oneKeyFor(name)) ?? new Map<string, number>();
    spellings.set(name, (spellings.get(name) ?? 0) + 1);
    byKey.set(oneKeyFor(name), spellings);
  }
  return [...byKey.values()]
    .map((spellings) => {
      const [name] = [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      return { name, people: [...spellings.values()].reduce((a, b) => a + b, 0) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The spelling to store for a team someone picked or typed: the team already here with the same name, ignoring case, or what they typed. */
export function theSpellingToKeep(typed: string | null | undefined, teams: { name: string }[]): string | null {
  const name = aLineOrNothing(typed ?? null);
  if (!name) return null;
  return teams.find((t) => oneKeyFor(t.name) === oneKeyFor(name))?.name ?? name;
}
