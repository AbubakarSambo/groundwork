/**
 * WHAT THE ROOM SAID: THE DIRECTION A DISCOVERY SESSION IS FOR.
 *
 * Twenty-three people told us where they would expand, what stops them, and what they cannot see.
 * Read live, the report came back as a paragraph: "the main barrier to growth is not a lack of
 * demand, but a lack of specific, actionable market data." True, useful, and not a direction. The
 * lead asked which regions, which markets, which value chains, which actors, which gaps - a ranked
 * list they can act on - and got prose about the group.
 *
 * SO THIS IS THE SHAPE THAT SESSION OWES: eight lists, each item named in the room's own words,
 * each carrying WHO said it and therefore HOW MANY. The counting is done in code from the labels
 * the model returns, not by asking a model for a number: a model asked to count will produce a
 * plausible one, and the whole value of this page is that the number is real.
 *
 * AND IT IS WHAT THE PERSON WHO ANSWERED GETS BACK. They gave us their market knowledge and the
 * product handed them a paragraph about everybody. `whatYouNamed` turns the same structure into
 * their own read: what you named, how many others named it too. That is the reciprocity a one-time
 * session has to have, or nobody answers the second one.
 */

export type ThingTheRoomNamed = {
  /** In the room's words, not ours. "Jigawa", "cold storage locations", "paddy price outside Kano". */
  name: string;
  /** The labels of everybody who named it. Counted here rather than asked for. */
  namedBy: string[];
  /** One short line from somebody who named it, so the lead can see what was meant. */
  asSaid?: string | null;
};

export type TheDirection = {
  regions: ThingTheRoomNamed[];
  markets: ThingTheRoomNamed[];
  valueChains: ThingTheRoomNamed[];
  actors: ThingTheRoomNamed[];
  dataGaps: ThingTheRoomNamed[];
  networks: ThingTheRoomNamed[];
  pilots: ThingTheRoomNamed[];
  /**
   * WHAT THE ROOM SAYS THE NEXT TWELVE MONTHS TAKE. Her call, 20 September 2026: a date is relevant
   * here, as part of THEIR plan - how much to buy or offload, whether they need agents on the
   * ground, when it has to happen for next season to work. Not a commitment to us; the shape of
   * where they are trying to get to, which is what makes the data question answerable.
   */
  nextTwelveMonths: ThingTheRoomNamed[];
  /** How many accounts this was read from, so a count of four out of twenty-three reads as four. */
  outOf: number;
};

export const THE_LISTS: (keyof Omit<TheDirection, 'outOf'>)[] = [
  'regions', 'markets', 'valueChains', 'actors', 'dataGaps', 'networks', 'pilots', 'nextTwelveMonths',
];

export const DIRECTION_PROMPT = `You are reading every account from one discovery session: a group asked, once, what they are trying to grow, what stops them, where they would expand, and what they cannot see.

Produce the direction the group named together. Eight lists:

regions - places named as somewhere to expand into or cover.
markets - specific markets, cities or corridors inside those places.
valueChains - crops, products or chains named.
actors - the kinds of people or organisations somebody would need to reach.
dataGaps - information people said they do not have and need.
networks - relationships, bodies or organisations named as what would make expansion possible.
pilots - anywhere somebody said they would start, test first, or go next.
nextTwelveMonths - what somebody said their own next year takes: volumes to buy, move or sell, people on the ground they would need, and when each has to happen. Their plan, in their units, with their timing. "300 tonnes of paddy by March", "four aggregators before the rains", "double the dealer network by Q3".

RULES, AND THEY MATTER MORE THAN COVERAGE:
- Use the room's own words for a name. "Jigawa", not "northern states". "Weekly paddy price", not "better market data".
- One thing per item. If two people named the same thing in different words, that is ONE item with both labels.
- namedBy is the list of participant labels that named it, written exactly as they are given to you, in full: "Participant P", not "P". Never invent a label, never include one that did not say it. Somebody's label appears in an item only if their own account contains it.
- Leave a list empty rather than filling it. An empty list is a finding: nobody named a pilot.
- asSaid is one short phrase from one of those accounts, under 15 words, in their words.
- Never name a person, an organisation somebody works for, or anything that would identify who said what beyond the label.

Return JSON only.`;

/**
 * THE TOOL, NOT A BARE SCHEMA. `extract` takes a tool with a name, a description and an
 * `input_schema`, and hands the model exactly that one function to call. Passing the schema on its
 * own type-checks - it is `any` at the boundary - and fails at the call, which is how the first
 * version of this returned nothing on a session with twenty-three accounts in it.
 */
export const DIRECTION_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(THE_LISTS.map((k) => [k, {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        namedBy: { type: 'array', items: { type: 'string' } },
        asSaid: { type: 'string' },
      },
      required: ['name', 'namedBy'],
    },
  }])),
  required: THE_LISTS,
} as const;

export const DIRECTION_TOOL = {
  name: 'the_direction',
  description: 'The eight lists the room named, each item carrying the labels of everybody who named it.',
  input_schema: DIRECTION_SCHEMA as any,
};

/**
 * HOW A LABEL IS MATCHED, AND WHY IT IS NOT AN EXACT COMPARE.
 *
 * Asked for "Participant P", the model answers "P" - and the first version of this dropped every
 * item as an invention, so a session with twenty-three accounts in it produced seven empty lists
 * and the sentence "nothing came back that could be read as a direction yet". The guard was right
 * and the comparison was too literal.
 *
 * So a label matches on its distinguishing part: "Participant P", "participant p" and "P" are the
 * same person, and something that is nobody's label still matches nothing. The rule that a label
 * the room does not contain is dropped is unchanged - only what counts as the same label is.
 */
function theSameLabel(a: string): string {
  return (a ?? '').toLowerCase().replace(/^participant\s+/, '').replace(/[^a-z0-9]/g, '').trim();
}

/** Sorted by how many named it, then alphabetically, and nothing invented gets through. */
export function tidy(raw: any, knownLabels: string[], outOf: number): TheDirection {
  const known = new Map(knownLabels.map((l) => [theSameLabel(l), l]));
  const oneList = (v: any): ThingTheRoomNamed[] =>
    (Array.isArray(v) ? v : [])
      .map((x) => ({
        name: String(x?.name ?? '').trim(),
        /* A label the room does not contain is a label nobody said. Dropped, not trusted. */
        /* Mapped back to the room's own label, so what comes out is what the reader is shown. */
        namedBy: [...new Set((Array.isArray(x?.namedBy) ? x.namedBy : [])
          .map((s: unknown) => known.get(theSameLabel(String(s ?? ''))))
          .filter(Boolean))] as string[],
        asSaid: typeof x?.asSaid === 'string' && x.asSaid.trim() ? x.asSaid.trim() : null,
      }))
      .filter((x) => x.name && x.namedBy.length)
      .sort((a, b) => b.namedBy.length - a.namedBy.length || a.name.localeCompare(b.name))
      .slice(0, 12);
  return {
    regions: oneList(raw?.regions), markets: oneList(raw?.markets), valueChains: oneList(raw?.valueChains),
    actors: oneList(raw?.actors), dataGaps: oneList(raw?.dataGaps), networks: oneList(raw?.networks),
    pilots: oneList(raw?.pilots), nextTwelveMonths: oneList(raw?.nextTwelveMonths), outOf,
  };
}

/** Whether there is enough here to call a direction, which is a thing the lead has to be told. */
export function isItADirection(d: TheDirection): { enough: boolean; saying: string } {
  const shared = THE_LISTS.flatMap((k) => d[k]).filter((x) => x.namedBy.length > 1).length;
  const anything = THE_LISTS.flatMap((k) => d[k]).length;
  if (!anything) return { enough: false, saying: 'Nothing came back that could be read as a direction yet.' };
  if (!shared) {
    return {
      enough: false,
      saying: `Everybody named something different. ${anything} things were named across ${d.outOf} accounts and no two of them agreed, which is itself the finding: there is no shared priority here yet.`,
    };
  }
  return {
    enough: true,
    saying: `${shared} of the ${anything} things named were named by more than one person, out of ${d.outOf} accounts.`,
  };
}

/**
 * WHAT ONE PERSON NAMED, AND WHO ELSE NAMED IT.
 *
 * The read the person who answered gets back. It says nothing about anybody else's business and
 * names nobody: only that what they said was shared, and by how many. That is the whole of the
 * reciprocity, and it is also all this session can honestly offer them.
 */
export function whatYouNamed(d: TheDirection, yourLabel: string): { line: string; yours: { name: string; alsoNamedBy: number }[] } {
  const yours = THE_LISTS.flatMap((k) => d[k])
    .filter((x) => x.namedBy.some((l) => theSameLabel(l) === theSameLabel(yourLabel)))
    .map((x) => ({ name: x.name, alsoNamedBy: x.namedBy.length - 1 }))
    .sort((a, b) => b.alsoNamedBy - a.alsoNamedBy);
  if (!yours.length) return { line: 'Nothing you named has come back in anybody else\'s account yet.', yours: [] };
  const shared = yours.filter((y) => y.alsoNamedBy > 0);
  const line = shared.length
    ? `${shared.length} of the ${yours.length} things you named came up in other accounts too, out of ${d.outOf}.`
    : `You named ${yours.length} things, and so far nobody else has named any of them. That is worth knowing on its own.`;
  return { line, yours };
}

/**
 * TWENTY-FOUR ACCOUNTS ARE READ IN CHUNKS, AND THE CHUNKS ARE ONE DIRECTION.
 *
 * One call over the whole room either ran past the background ceiling or came back as prose with no
 * tool call, at exactly the size the session is for. Six accounts is a read the model finishes; the
 * chunks are merged by the thing named, so "Jigawa" named in three chunks is one item with everybody
 * who named it, and the counts stay what they were: real, and from the labels.
 */
export const ACCOUNTS_PER_READ = 6;

const theSameThing = (name: string): string => name.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

export function mergeDirections(parts: TheDirection[], outOf: number): TheDirection {
  const merged = (key: keyof Omit<TheDirection, 'outOf'>): ThingTheRoomNamed[] => {
    const byName = new Map<string, ThingTheRoomNamed>();
    for (const part of parts) {
      for (const item of part[key]) {
        const k = theSameThing(item.name);
        const have = byName.get(k);
        if (have) {
          have.namedBy = [...new Set([...have.namedBy, ...item.namedBy])];
          if (!have.asSaid && item.asSaid) have.asSaid = item.asSaid;
        } else {
          byName.set(k, { name: item.name, namedBy: [...item.namedBy], asSaid: item.asSaid ?? null });
        }
      }
    }
    return [...byName.values()]
      .sort((a, b) => b.namedBy.length - a.namedBy.length || a.name.localeCompare(b.name))
      .slice(0, 12);
  };
  return {
    regions: merged('regions'), markets: merged('markets'), valueChains: merged('valueChains'), actors: merged('actors'),
    dataGaps: merged('dataGaps'), networks: merged('networks'), pilots: merged('pilots'), nextTwelveMonths: merged('nextTwelveMonths'),
    outOf,
  };
}

export function inChunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
