import { theChangeToMake, theGoalAsItWas, type AChangeToMake, type AGoalChangeSaid, type AGoalOnRecord } from '../grounds/a-goal-changed-by-its-lead';
import { numbersIn } from '../conversation/a-claim-the-numbers-do-not-support';

/**
 * A GOAL CHANGED BY ITS LEAD, SAID IN ASK (Drop Access, 22 November 2026).
 *
 * Wairimu told Ask "Freezers are out of stock until January. The team's goal changes now: each agent builds a waitlist of 15 shops.
 * Please change the target and tell the team." and read "Thank you. What you say here in Ask stays between you and Groundwork, so it is
 * not on your record yet." Nothing changed, and nobody was told. A goal change is the lead's to make, by saying so, wherever she says it:
 * her check-in already said the change back and asked her yes (a-goal-changed-by-its-lead). Ask now does the same: the model reads which
 * goals on record she changed and into what, Ask says it back and asks her yes, and on her yes the same writer changes the one goal row.
 * The rules are the ones every goal change keeps: a goal only from the goals on record, a number only from her own words.
 */
export const GOAL_CHANGE_KIND = 'goal_change';

export const GOAL_CHANGE_PROMPT_KEY = 'ask.read-a-goal-change';
export const GOAL_CHANGE_PROMPT = `Somebody who runs one or more check-ins for their team typed one message into Ask Groundwork. Below it are the goals on record for those check-ins, each with its id. Say whether the message changes any of those goals: the goal is now something else, or its number is now a different number, because they say so. A message that only reports progress, asks a question, or talks about a goal without changing it changes nothing.

Where it changes goals, give one change:
- replaces: the ids of the goals on record it takes the place of. Use only ids from the list.
- aim: the new goal as one plain, full sentence about whoever holds it, by first name, or "The team".
- target: the number aimed at, only where they said one.
- whose: the first name of the person who holds it, or "The team".
- because: why it changed, in their words, where they said.
- stopsTheWork: true where the reason stops the work itself (a stock-out, a closed road).

Where it changes nothing, give changes as false.`;

export const GOAL_CHANGE_SCHEMA = {
  name: 'a_goal_change',
  description: 'Whether the message changes a goal on record, and how.',
  input_schema: {
    type: 'object',
    properties: {
      changes: { type: 'boolean' },
      replaces: { type: 'array', items: { type: 'string' } },
      aim: { type: 'string' },
      target: { type: ['number', 'null'] },
      whose: { type: 'string' },
      because: { type: 'string' },
      stopsTheWork: { type: 'boolean' },
    },
    required: ['changes'],
  },
};

export interface ACheckInSheRuns {
  id: string;
  label: string;
  goals: AGoalOnRecord[];
  people: { id: string; firstName: string | null }[];
}

export interface AGoalChangeFound { ground: ACheckInSheRuns; said: AGoalChangeSaid; change: AChangeToMake }

/** The change she said, read by the model against the goals on record and checked by the same rules as in her check-in. Null where there is none. */
export async function theGoalChangeSheSaid(
  engine: { extract: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> } | null | undefined,
  prompts: { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined,
  message: string,
  grounds: readonly ACheckInSheRuns[],
): Promise<AGoalChangeFound | null> {
  const withGoals = grounds.filter((g) => g.goals.length);
  if (!withGoals.length || typeof engine?.extract !== 'function') return null;
  const version = await prompts?.getActive(GOAL_CHANGE_PROMPT_KEY).catch(() => null);
  const list = withGoals.flatMap((g) => g.goals.map((o) => `${o.id}: on "${g.label}", ${theGoalAsItWas(o, g.people)}${o.target != null ? `, number ${o.target}` : ''}`));
  const content = `Their message: ${String(message ?? '').slice(0, 2000)}\n\nThe goals on record:\n${list.join('\n')}`;
  const raw = await engine.extract(version?.content ?? GOAL_CHANGE_PROMPT, [{ role: 'user', content }], GOAL_CHANGE_SCHEMA, { fast: true }).catch(() => null);
  return theChangeFrom(raw, message, withGoals);
}

/** What the model said, made safe: the goals it replaces are on one check-in she runs, and its number is in her words. */
export function theChangeFrom(raw: any, message: string, grounds: readonly ACheckInSheRuns[]): AGoalChangeFound | null {
  if (!raw || raw.changes !== true || !Array.isArray(raw.replaces) || !raw.replaces.length) return null;
  const ids = raw.replaces.map((x: unknown) => String(x));
  const ground = grounds.find((g) => g.goals.some((o) => ids.includes(o.id)));
  if (!ground) return null;
  const said: AGoalChangeSaid = { replaces: ids.filter((id: string) => ground.goals.some((o) => o.id === id)), aim: raw.aim, target: raw.target, whose: raw.whose, because: raw.because, stopsTheWork: raw.stopsTheWork };
  const herNumbers = new Set(numbersIn(message).flatMap((n) => [n, Math.round(n)]));
  const change = theChangeToMake(said, ground.goals, ground.people, (n) => herNumbers.has(n));
  return change ? { ground, said, change } : null;
}

const clean = (s: string) => s.trim().replace(/[.!?\s]+$/, '');
const lowerFirst = (s: string, names: readonly string[]) => {
  const first = s.split(/\s+/)[0] ?? '';
  if (!/^[A-Z][a-z]/.test(first) || names.some((n) => n.toLowerCase() === first.replace(/[^\w'’-]/g, '').toLowerCase())) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
};
const andJoined = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');

/** The change said back for her yes, in plain sentences with no colons. */
export function theChangeSaidBack(f: AGoalChangeFound): string {
  const names = f.ground.people.map((p) => p.firstName ?? '').filter(Boolean);
  const why = f.change.because ? `, because ${lowerFirst(clean(f.change.because), names)}` : '';
  const was = [f.change.keep, ...f.change.drop].map((o) => theGoalAsItWas(o, f.ground.people));
  return `I have that the goal on “${f.ground.label}” is now “${clean(f.change.name)}”${why}. It takes the place of ${andJoined(was)}. Is that right? When you say yes, I change it, and each person in the check-in is told the new goal in their next check-in.`;
}

/** What she reads once the change is made. */
export function theChangeMade(label: string, name: string): string {
  return `Done. The goal on “${label}” is now “${clean(name)}”. Each person in the check-in is told the new goal, and asked how they are doing on it, in their next check-in.`;
}

export const THE_GOAL_LEFT_AS_IT_WAS = 'All right. I have left the goal as it was.';
