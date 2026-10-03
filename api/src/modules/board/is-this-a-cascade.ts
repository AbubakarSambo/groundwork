import { GroundScenario } from '@prisma/client';

/**
 * IS THERE SOMETHING ABOVE THIS OBJECTIVE?
 *
 * A cascade is one objective set high up, with teams writing their own results underneath it. It is
 * the commonest thing customers describe wanting and the product has never known when it is looking
 * at one. The situation dropdown has OKR_ALIGNMENT, but a situation chosen once at setup is a
 * statement of intent, not a fact about the work: plenty of OKR grounds hold one flat list with
 * nothing above it, and plenty of grounds that were opened as a regular check-in turn out to be a
 * department's half of a company objective the moment somebody says so.
 *
 * THE SCENARIO OPENS THE SHAPE. THE RECORD CONFIRMS IT.
 *
 * `DECLARED` is deliberately not enough on its own. If it were, every OKR ground in the product
 * would render a tree with one node in it and a heading promising a parent that nobody has named -
 * which reads as a broken screen and, worse, as the product asserting a structure the team never
 * described. So a cascade is claimed only when something ABOVE this ground is actually named, by a
 * person or by an imported row.
 *
 * AND THE PARENT IS NEVER INVENTED.
 *
 * We do not infer a company objective from a team's one. If nobody said what this hangs under, the
 * answer is that it hangs under nothing yet, and that absence is itself the useful thing to show a
 * lead: teams are writing results under an objective that has not been written down.
 */

/** What people actually said, one line per extracted entry. */
export interface CascadeEvidence {
  participantId: string;
  text: string;
}

export interface CascadeInput {
  scenario: GroundScenario;
  /** The targets set on this ground. */
  objectiveNames: string[];
  /** Imported objectives that carry a parent, from the customer's own system. */
  importedWithParents: { title: string; parentTitle: string | null }[];
  entries: CascadeEvidence[];
}

export type CascadeBasis =
  /** The situation picked at setup says this is an alignment exercise. Posture, not evidence. */
  | 'DECLARED'
  /** An imported objective carries a parent. The customer's own system says so. */
  | 'A_PARENT_IS_RECORDED'
  /** Somebody said what this sits under, in their own words. */
  | 'SAID_IN_THE_CHAT'
  /** Two or more teams are named as writing results against the same thing. */
  | 'SEVERAL_TEAMS_NAMED';

export interface CascadeRead {
  isCascade: boolean;
  basis: CascadeBasis[];
  /** Only ever the words somebody used. Null when nothing above this was named. */
  parentNamed: string | null;
  teamsNamed: string[];
  /** What to say on screen. Always present, including when the answer is no. */
  why: string;
}

/**
 * NAMING WHAT SITS ABOVE, IN SOMEBODY'S OWN WORDS.
 *
 * Anchored, because an unanchored match on "objective" or "goal" fires on every planning
 * conversation in the product. Each pattern requires a relationship word - under, beneath, rolls up,
 * feeds, cascades, part of - so that "our objective is to cut churn" does not become a claim that
 * something sits above it.
 */
const SITS_UNDER_SOMETHING: RegExp[] = [
  /\b(?:hangs?|sits?|falls?|comes?)\s+(?:directly\s+)?(?:under|beneath|below)\s+(.{3,70}?)(?:[.,;]|$)/i,
  /\brolls?\s+up\s+(?:in)?to\s+(.{3,70}?)(?:[.,;]|$)/i,
  /\bcascades?\s+(?:down\s+)?from\s+(.{3,70}?)(?:[.,;]|$)/i,
  /\b(?:feeds?|ladders?)\s+(?:in)?to\s+(.{3,70}?)(?:[.,;]|$)/i,
  /\b(?:our|my|the team'?s?)\s+(?:part|half|share|slice)\s+of\s+(.{3,70}?)(?:[.,;]|$)/i,
  /\b(?:in\s+service\s+of|underneath|nested\s+under)\s+(.{3,70}?)(?:[.,;]|$)/i,
];

/**
 * A TEAM IS NAMED, NOT GUESSED.
 *
 * Only where the sentence says the word - "the sales team", "engineering's key results". A bare
 * capitalised word is a person as often as it is a department, and reading one as the other on a
 * screen about who owes what is the kind of error that is never noticed and never forgiven.
 */
const A_TEAM_IS_NAMED =
  /\b([a-z][a-z& ]{2,28}?)(?:'s)?\s+(?:team|department|squad|function|unit)\b/gi;

/*
 * "ON THE TEAM" IS NOT A TEAM CALLED THE.
 *
 * Found by running the read over every entry in the database: across 1,396 real lines the only
 * thing it named was a team called "the". A determiner left standing where a department name goes
 * is the same class of fault as a whole sentence printing where a name goes.
 */
const NOT_A_TEAM_NAME = new Set([
  'the', 'a', 'an', 'this', 'that', 'our', 'my', 'your', 'their', 'his', 'her', 'its',
  'whole', 'entire', 'same', 'other', 'another', 'one', 'each', 'every', 'no', 'any', 'some',
  'for', 'with', 'on', 'in', 'to', 'of', 'at', 'by', 'from', 'and', 'or', 'but',
  'both', 'all', 'is', 'was', 'been', 'being', 'doing', 'shadowing', 'joined', 'joining',
  /* Request 65: `teamsNamed` served ["attached"], from "the attached team plan". A word that says
     how a team stands, not what it is called, is not a department. */
  'attached', 'assigned', 'new', 'wider', 'own', 'current', 'previous', 'old', 'whole', 'relevant', 'right',
]);

/**
 * THE PHRASE HAS TO NAME AN OBJECTIVE, NOT ANY NOUN AT ALL.
 *
 * Found by probing the read with nine ordinary sentences from situations that have no cascade in
 * them. Five fired. "I did my part of the onboarding checklist", "it feeds into the same problem we
 * had last month", "my half of the handover is done" - each one put a fabricated parent objective
 * at the top of a board, which is worse than showing nothing by a wide margin, and worse still on a
 * new-hire or a crisis ground where the whole frame is wrong.
 *
 * The relationship word was never enough on its own, because English uses under, part of and feeds
 * into for everything. So the thing named must ALSO read as an objective. That makes the read
 * strict: it will miss a cascade somebody described without using any of these words, and it will
 * not invent one. Missing it costs a section; inventing it costs the reader's trust in the page.
 */
const READS_AS_AN_OBJECTIVE =
  /\b(?:objectives?|goals?|okrs?|kpis?|targets?|priority|priorities|mission|strategy|strategic|ambition|north star|outcome)\b/i;

const AN_OBJECTIVE_ABOVE =
  /\b(?:company|org(?:anisation|anization)?|group|exec(?:utive)?|board|top[- ]level|overarching|parent)\s+(?:objective|goal|okrs?|target|priority)\b/i;

/** Trailing words that carry nothing - so the named parent is the thing, not a fragment. */
function tidy(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^(?:the|our|a|an|that|this)\s+/i, '')
    .replace(/[\s.,;:]+$/, '')
    .trim();
}

function looksLikeAName(s: string): boolean {
  // Three characters is a fragment, not an objective. Twelve words is a sentence, not a name.
  const words = s.split(/\s+/).filter(Boolean);
  return s.length >= 4 && words.length <= 12;
}

const DECLARES_A_CASCADE = new Set<GroundScenario>([
  GroundScenario.OKR_ALIGNMENT,
  GroundScenario.BOARD_STRATEGY,
]);

export function isThisACascade(input: CascadeInput): CascadeRead {
  const basis: CascadeBasis[] = [];
  const declared = DECLARES_A_CASCADE.has(input.scenario);
  if (declared) basis.push('DECLARED');

  let parentNamed: string | null = null;

  const imported = input.importedWithParents.find((s) => s.parentTitle && s.parentTitle.trim());
  if (imported?.parentTitle) {
    basis.push('A_PARENT_IS_RECORDED');
    parentNamed = tidy(imported.parentTitle);
  }

  const teams = new Set<string>();
  let saidItSitsUnder = false;

  for (const e of input.entries) {
    const text = e.text ?? '';
    for (const re of SITS_UNDER_SOMETHING) {
      const m = re.exec(text);
      if (!m) continue;
      const named = tidy(m[1] ?? '');
      if (!looksLikeAName(named)) continue;
      if (!READS_AS_AN_OBJECTIVE.test(named)) continue;
      saidItSitsUnder = true;
      // The first person to say it is the one quoted. A later restatement is the same fact.
      if (!parentNamed) parentNamed = named;
    }
    if (!saidItSitsUnder && AN_OBJECTIVE_ABOVE.test(text)) saidItSitsUnder = true;

    for (const m of text.matchAll(A_TEAM_IS_NAMED)) {
      /* "the sales team AND the engineering team" - the connector is part of the match, never part
         of the name. Stripped here rather than in the pattern so the pattern stays readable. */
      const t = tidy((m[1] ?? '').replace(/^(?:and|or|&|with|plus)\s+/i, '').replace(/^(?:the|our)\s+/i, ''));
      /* "for the ops", "shadowing the support" - a capture carrying a preposition or a verb is a
         fragment of a sentence, not a department. Two words is the ceiling: "customer success" is a
         team, "whole thing for the ops" is not. */
      const words = t.toLowerCase().split(/\s+/);
      const clean = words.length <= 2
        && words.every((w) => !NOT_A_TEAM_NAME.has(w))
        && t.length >= 3;
      if (clean) teams.add(t.toLowerCase());
    }
  }

  if (saidItSitsUnder) basis.push('SAID_IN_THE_CHAT');
  const teamsNamed = [...teams];
  if (teamsNamed.length >= 2) basis.push('SEVERAL_TEAMS_NAMED');

  /*
   * THE RULE. Something ABOVE this has to have been named. Two of the four kinds of basis can do
   * that and two cannot:
   *
   * DECLARED is a dropdown, and a dropdown is a statement of intent.
   *
   * SEVERAL_TEAMS_NAMED is cross-team WORK, which is a different fact. "She worked with the ops
   * team and the sales team" is a recognition check-in describing what somebody carried, and
   * reading it as a hierarchy would put an OKR frame over a conversation about one person. It
   * corroborates a cascade and never establishes one.
   */
  const isCascade = basis.includes('SAID_IN_THE_CHAT') || basis.includes('A_PARENT_IS_RECORDED');

  return { isCascade, basis, parentNamed, teamsNamed, why: sayWhy({ declared, isCascade, parentNamed, teamsNamed }) };
}

/**
 * WHAT THE SCREEN SAYS, INCLUDING WHEN THE ANSWER IS NO.
 *
 * The no case is the one worth writing carefully. A team that opened an alignment check-in and never
 * named what it aligns TO has found something out about itself, and the sentence has to say that
 * without it reading as a telling-off.
 */
function sayWhy(a: { declared: boolean; isCascade: boolean; parentNamed: string | null; teamsNamed: string[] }): string {
  if (!a.isCascade) {
    return a.declared
      ? 'Nothing above this has been named yet. These objectives stand on their own, and there is nothing to check them against. Say what they serve, if it is something wider, and they can be checked.'
      : 'Nothing here sits under a wider objective, and nothing suggests it should.';
  }
  const above = a.parentNamed
    ? `The objectives here are held as part of ${a.parentNamed}.`
    : 'People have described this as part of something wider, without naming what.';
  const who = a.teamsNamed.length >= 2
    ? ` ${a.teamsNamed.length} teams are named as working underneath it.`
    : '';
  return `${above}${who} What is shown below is whether the parts add up to it, not how any team is doing.`;
}
