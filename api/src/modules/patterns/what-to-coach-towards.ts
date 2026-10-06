import { roleMapFor, MIN_COACHING_CONFIDENCE } from '../board/role-maps';

/**
 * WHAT THE LEAD READS BESIDE EVERY PATTERN: THE GOOD VERSION, AND ONE SMALL STEP (decision 67).
 *
 * Hafsah, 30 September 2026: for every pattern the lead sees, in every section, the lead reads what
 * to coach the person towards, the good behaviour, in one plain sentence, and one small, concrete
 * step the person could take. It is framed for the manager. It is never a verdict or a score, and
 * nothing is decided from it.
 *
 * WRITTEN BY THE PRODUCT, FROM FIXED TEXT, NEVER BY A MODEL AT READ TIME. Opening a board calls no
 * model (decision 7), so every sentence here is in this file, per code, and reviewed by a person
 * before it ships. A role can sharpen the first sentence where its own map pairs a going-wrong
 * behaviour with its good version (role-maps.ts pairs them by index, `failureSignals[n]` with
 * `successSignals[n]`); where the role has no pairing for the code, the code's own sentence stands.
 *
 * NO NAME IS IN ANY OF IT. The page places a pattern under the person it is about, and a string that
 * joined a name to a pattern is what who-reads-a-pattern refuses to serve.
 *
 * NOBODY BUT THE LEAD READS IT. The person it is about reads their own pattern and is asked what is
 * behind it; the coaching is framed for the manager, so it is null for them (see servedPatterns).
 */

export interface ACoachingLine {
  /** Finishes "Coach them towards ...", and names the good version of what the record shows. */
  towards: string;
  /** Finishes "One step they could take this week is to ...", small enough to happen this week. */
  step: string;
}

/** One line per pattern that has a plain name (E4 and F5 are never named, so they have none). */
export const COACHING_FOR_EACH_PATTERN: Readonly<Record<string, ACoachingLine>> = {
  /* Good news. The good version is to keep it going and let it be seen. */
  R3: { towards: 'carrying on crediting other people by name for what they did', step: 'thank the person they credited, in front of the team, the next time they do it' },
  M1: { towards: 'carrying on delivering what was agreed and showing the proof', step: 'share with the team how they keep the proof of what they deliver' },
  M2: { towards: 'carrying on making the work quicker for other people', step: 'write down one thing they did that let someone else move faster, and share it' },
  M3: { towards: 'carrying on making the changes that move several things at once', step: 'say which change moved the most this month, and whether it could be tried somewhere else' },
  M4: { towards: 'having the work that nobody notices seen and thanked', step: 'name the unnoticed work out loud at the next check-in' },
  C1: { towards: 'carrying on helping people reach the same understanding', step: 'write in one sentence what people now agree on, and share it with them' },
  C2: { towards: 'carrying on keeping track of what the work needs from other people', step: 'show the team how they keep track of what they wait on and what others wait on them for' },
  C3: { towards: 'carrying on turning scattered information into something clear', step: 'share one clear summary they wrote, so others can use it too' },

  /* Carrying. The good version is to share the load, so the extra work is not one person's. */
  A1: { towards: 'sharing out the coordinating, so it is not one person\'s extra work', step: 'ask someone else to take one piece of the coordinating for a month' },
  A2: { towards: 'catching problems early, so nobody has to step in at the last moment', step: 'say the next time they step in, and what would have let someone else catch it sooner' },
  A3: { towards: 'getting back to the level of work they did before the change, after listening first to what has got in their way', step: 'say what has got in their way since the change' },

  /* Worth the lead's attention. Each asks for the good opposite of what the record shows. */
  D1: { towards: 'saying something is finished only when the team who receives it has confirmed it works', step: 'get a yes from the receiving team before the next piece of work is called finished' },
  D2: { towards: 'showing work that real people have used, not only work that runs in a walkthrough', step: 'have one real user try the next piece of work before it is called ready' },
  D3: { towards: 'saying out loud when the goal for a piece of work changes', step: 'write down what finished means at the start of the next piece of work, and say so if it changes' },
  D4: { towards: 'writing down what the plan means for the work, so people can start from it', step: 'turn the last plan into three written tasks that someone can start on' },
  D5: { towards: 'finishing what sits behind the screens, and not only the screens', step: 'list what sits behind the next screen and say which parts are done' },
  D6: { towards: 'making sure more than one person can run and explain the work', step: 'choose one person to learn the work this month, and write down its main steps' },
  D7: { towards: 'asking for the time the work truly needs, and giving the reason', step: 'give the time needed for the next piece of work, with what the estimate is based on' },
  D8: { towards: 'making the work hold up after it is called finished', step: 'check the next finished piece of work once, a week later, and say what was found' },
  B1: { towards: 'reporting upward the way the team describes the work', step: 'check the next report upward with the team first, and share what they said' },
  B2: { towards: 'promising what can be delivered, and saying early when a date will slip', step: 'give the next date together with how sure they are, and say early if it moves' },
  B3: { towards: 'saying clearly who did each piece of the work', step: 'name who did each piece of work in the next report' },
  B4: { towards: 'letting the team fix problems themselves, so the founder does not have to step in', step: 'ask the team who will fix the next problem before anybody steps in' },
  B5: { towards: 'communicating in a way that clears what is blocking people', step: 'name the one thing blocking people most, and what would clear it' },
  B6: { towards: 'reaching a decision after a fair amount of research', step: 'set a date by which the research ends and a decision is made' },
  B7: { towards: 'linking what is spent to what has moved because of it', step: 'say, for the next thing they spend on, what should move and by when' },
  B8: { towards: 'answering a question about delivery with what they will do about it', step: 'say what they will do first, before giving any reason, the next time delivery is questioned' },
  B9: { towards: 'getting the team to name the same priority', step: 'ask each person to write down their top priority, and talk through the answers together' },
  B10: { towards: 'moving the work on between calls', step: 'name one thing that can move before the next call, at the end of the next one' },
  B11: { towards: 'naming what the team itself can change when something goes wrong', step: 'name one thing in the team\'s own hands the next time a problem comes up' },
  B12: { towards: 'working in a way that fits the size of the company', step: 'choose one process that is too heavy for the company\'s size and make it lighter' },
  K1: { towards: 'speaking with named buyers directly, and not only sending decks and proposals', step: 'arrange one conversation with a named buyer and say what was said' },
  K2: { towards: 'challenging spending that is not needed, as well as tracking it', step: 'pick one cost this month and say whether it is still needed' },
  K3: { towards: 'fixing a problem the first time it is raised', step: 'pick the problem raised most often and agree who fixes it, and by when' },
  K4: { towards: 'giving the important work protected time before the inbox', step: 'keep one hour a day for the important work and leave the inbox until after it' },
  K5: { towards: 'saying what a task is for when describing it', step: 'add one sentence saying what it is for to the next task they describe' },
  E1: { towards: 'showing what has been delivered recently, so the record matches the role held', step: 'say what they will deliver in the next month, and report on it at the next check-in' },
  E2: { towards: 'making the introductions they said they would, with a date', step: 'pick one introduction and give a date by which it will happen' },
  E3: { towards: 'showing up for the day-to-day work as well as the big moments', step: 'take on one day-to-day task this month' },
  E5: { towards: 'giving back in line with what is asked for', step: 'say what they will give in return for the next thing they ask for' },
  R1: { towards: 'sharing out the work, so several people are not waiting on one person', step: 'hand one piece of what they are holding to someone else' },
  R2: { towards: 'leaving people clear about what the work needs from them', step: 'write down for the others what they need to do next, after the next piece of work' },
  R4: { towards: 'keeping in touch with the people they used to work with', step: 'each say what changed, and whether they still need to work together' },
  F1: { towards: 'building some of the good ideas', step: 'pick the best idea and build the smallest piece of it this month' },
  F2: { towards: 'making the strategy clear to the team, and not only at the top', step: 'explain the strategy to the team in five minutes, and ask what is unclear' },
  F3: { towards: 'making check-ins as specific as they used to be', step: 'include a number, a date or a name in each part of the next check-in' },
  F4: { towards: 'helping the areas they are regarded for to move faster', step: 'choose one area and say what would make it move faster this month' },
};

/**
 * WHERE A ROLE'S OWN MAP SAYS THE GOOD VERSION BETTER. Only pairs that are clearly the same thing,
 * by the map's own index: `successSignals[n]` is the good version of `failureSignals[n]`. A code with
 * no entry for a role reads the code's own sentence above, which is right for every role.
 *
 * Each entry is (pattern code, role function) to the index of the role's `successSignals`. To add a
 * pairing, read both lists in role-maps.ts and add it here; nothing else changes.
 */
export const WHERE_A_ROLE_SAYS_IT_BETTER: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  SALES: {
    K1: 3, // "Spends the week in front of buyers, and does the admin around it"
    B1: 9, // "Says plainly which deals are not going to happen"
    B11: 7, // "Names what they would do differently, then does it"
    E2: 5, // "Leaves every conversation with a dated next action somebody agreed to"
  },
  PRODUCT: {
    B6: 0, // "Makes the call with what is known and says what would change it"
    K5: 3, // "Traces the requirement to somebody the product is actually for"
  },
};

const lowerFirst = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`;
const endsWithAStop = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

export interface ACoachingForAPattern {
  /** The good behaviour, in one plain sentence. */
  coachTowards: string;
  /** One small, concrete step the person could take, in one plain sentence. */
  oneStep: string;
}

/**
 * The two sentences for one pattern, or null for a code that has none (E4, F5 and codes the library
 * does not know, which are never served at all). `roleFunction` is the person's detected function
 * and is used only when its confidence is enough to coach from (role-maps, MIN_COACHING_CONFIDENCE).
 */
export function coachingForAPattern(
  code: string,
  role?: { fn?: string | null; confidence?: number | null } | null,
): ACoachingForAPattern | null {
  const line = Object.prototype.hasOwnProperty.call(COACHING_FOR_EACH_PATTERN, code) ? COACHING_FOR_EACH_PATTERN[code] : null;
  if (!line) return null;
  let coachTowards = `Coach them towards ${line.towards}.`;
  const map = role?.fn && (role.confidence ?? 0) >= MIN_COACHING_CONFIDENCE ? roleMapFor(role.fn) : null;
  const index = map ? WHERE_A_ROLE_SAYS_IT_BETTER[map.fn]?.[code] : undefined;
  const signal = map && index !== undefined ? map.successSignals?.[index] : undefined;
  if (signal) coachTowards = endsWithAStop(`In ${map!.label.toLowerCase()}, the good version is someone who ${lowerFirst(signal.trim().replace(/[.!?]+$/, ''))}`);
  return { coachTowards, oneStep: `One step they could take this week is to ${line.step}.` };
}
