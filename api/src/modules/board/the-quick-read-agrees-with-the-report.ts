import { peopleSaidDifferentThingsAbout } from '../reports/what-people-said-differently-about';
/**
 * THE QUICK READ NEVER SAYS "NO DISAGREEMENT" OVER A REPORT THAT OPENS WITH ONE (review of 1 October
 * 2026).
 *
 * On contractreview the lead's board read "Differences: None", with "no disagreement, as the written
 * report reads it", while the report it is read from opened "They disagree on what the service
 * agreement means." The tile counts the report's list of differences, and the model had named the
 * difference in the opening without putting it in the list. The difference is the one that decides
 * that check-in.
 *
 * So where the Differences tile has nothing open and the report's own opening says people disagree,
 * the tile says what the opening says, in the tile's own sentence, and counts it. Nothing is
 * invented: the topic is the report's words. Where the opening names no disagreement, the tile is
 * left exactly as it was.
 */
export interface ATile { label: string; value: string; sub: string; tone?: string }

const COUNT: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/* "They disagree on X." "Femi and you differ about X." Not "nobody disagrees", not "do not disagree". */
const A_DISAGREEMENT = /(?:^|[.!?]\s+)([^.!?]*?)\b(?:disagree|differ)s?\s+(?:on|about|over)\s+([^.!?]+)[.!?]/i;
/* "They give different numbers for the total plan." (request 132 c): a difference said without the word differ. */
const A_DIFFERENT_NUMBER = /(?:^|[.!?]\s+)([^.!?]*?)\b(?:give|gave|put|say|said|report|reported|have|had|offer|offered)\s+(?:different|differing|conflicting)\s+(?:numbers|figures|totals|dates|amounts|answers|views|costs|estimates)\s+(?:for|on|about|of)\s+([^.!?]+)[.!?]/i;
const NOT_A_DISAGREEMENT = /\b(?:not|never|no one|nobody|nothing|neither|don't|doesn't|do not|does not)\b/i;

/** The topic in the opening, and how many things it says, or null where it names none. */
export function theDisagreementTheReportOpensWith(sharedPicture: string | null | undefined): { topic: string; count: number } | null {
  const text = String(sharedPicture ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const m = text.match(A_DISAGREEMENT) ?? text.match(A_DIFFERENT_NUMBER);
  if (!m || NOT_A_DISAGREEMENT.test(m[1] ?? '')) return null;
  let what = m[2].trim();
  let count = 1;
  /* "three things: a, b, and c" and "one thing: a" count what they say they count. */
  const listed = what.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:things?|points?|matters?|questions?)\s*:\s*(.+)$/i);
  if (listed) {
    count = COUNT[listed[1].toLowerCase()] ?? Number(listed[1]) ?? 1;
    what = listed[2].split(/,\s*(?:and\s+)?|;\s*|\s+and\s+(?=whether|what|how|the|who|when)/i)[0].trim();
  }
  what = what.replace(/[,:;]+$/, '').trim();
  if (!what || what.split(/\s+/).length < 2) return null;
  return { topic: what, count: Math.max(1, count) };
}

export function theQuickReadAgreesWithTheReport<T extends ATile>(tiles: T[] | null | undefined, sharedPicture: string | null | undefined): T[] | null | undefined {
  if (!Array.isArray(tiles)) return tiles;
  const said = theDisagreementTheReportOpensWith(sharedPicture);
  if (!said) return tiles;
  return tiles.map((t) => {
    if (t?.label !== 'Differences') return t;
    /* A count of open differences is already there: the tile and the report agree. */
    if (/^\d+$/.test(String(t.value ?? '').trim()) && Number(t.value) > 0) return t;
    const more = said.count - 1;
    return {
      ...t,
      value: String(said.count),
      sub: `${peopleSaidDifferentThingsAbout(said.topic)}${more > 0 ? ` ${more} more ${more === 1 ? 'difference is' : 'differences are'} still open.` : ''}`,
      tone: 'warn',
    };
  });
}

/**
 * A QUESTION THE REPORT ASKS BETWEEN TWO WAYS OF COUNTING IS A DIFFERENCE, NOT "NOBODY SEES ANYTHING DIFFERENTLY" (B-165).
 *
 * Esther counts shops that order, Kwesi counts second orders. The report listed no difference, so the Differences read said
 * "Nobody sees anything differently. The written report finds no disagreement.", and the board asked the lead "Does a shop count when it
 * signs, or when it orders again?" two inches away. Where the read says there is no difference and the report's own central question
 * sets two ways against each other ("Does X, or Y?"), the read says the report asks it, as a difference. The question is the report's words.
 */
const AN_EITHER_OR_QUESTION = /^(?:does|do|did|is|are|was|were|should|will|would|can|could)\b[^?]*,\s*or\s+[^?]+\?$/i;

export function theDifferencesReadAgreesWithTheQuestion<T extends ATile>(tiles: T[], centralQuestion: string | null | undefined): T[] {
  const q = String(centralQuestion ?? '').replace(/\s+/g, ' ').trim();
  if (!q || !AN_EITHER_OR_QUESTION.test(q)) return tiles;
  return tiles.map((t) => (t?.label === 'Differences' && String(t.value ?? '').trim() === 'None'
    ? { ...t, value: '1', sub: `The report asks, "${q}"`, tone: 'warn' }
    : t));
}
