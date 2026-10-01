/**
 * WHAT A PERSON SAID IN THEIR CHECK-IN IS NEVER TAKEN OUT BY A RULE MEANT FOR WHAT GROUNDWORK WRITES.
 *
 * Screens request 77, 29 September 2026. Juma, an admin who only reads a sales check-in, was served
 * three of Rukia's lines under "Who owns what" with no words in them. Two of them were "Four shops for
 * me" and "Baraka has four shops in Westlands and Neema has four in Karen". Rukia's target was four
 * shops, which Juma may not see, and the rule that takes a hidden target out of the board's sentences
 * (a-hidden-target-stays-hidden) emptied every line of hers with "four" in it.
 *
 * Hafsah's ruling, the same day: a person's own words from their check-in are never removed because
 * they resemble something private. Words said in a check-in can be shown to the people in it
 * (decision 4), admins see what people said (decision 5), and people's own words are never changed
 * (decision 18). The private-file rule may still hide a file's NAME inside them, and nothing else.
 * The hidden-target rule is for text the product or the model writes: summaries, the board's
 * sentences, the report's prose.
 *
 * So the difference is made by where the words come from, not by reading them. Each surface lists
 * the fields that carry a record line word for word (below). While the rules for Groundwork's own
 * words run, each of those fields is held aside, and it is put back afterwards exactly as it was.
 */

/** A path into a served object. `*` is every entry of a list. */
export type APath = readonly string[];

/** The fields of the board that are a person's own words: each record line under "Who owns what". */
export const THEIR_OWN_WORDS_ON_THE_BOARD: readonly APath[] = [
  ['whoOwnsWhat', '*', 'items', '*', 'text'],
  /* The line a record of the kind of work came from (request 76), word for word. */
  ['workRecords', '*', 'rows', '*', 'said'],
  /* A line a document proves or a colleague confirmed, word for word (request 70, the evidence index). */
  ['evidenceIndex', '*', 'said'],
];

/**
 * The fields of a report that are a person's own words: the session report's "What each person
 * said" lines, what each person said success is, and the record line that put a condition where it
 * stands. Not a section's items: some of those are Groundwork's own lines built round a person's
 * ("Was: ... - now: ..."), so they stay under the rules for Groundwork's words.
 */
export const THEIR_OWN_WORDS_IN_A_REPORT: readonly APath[] = [
  ['whatEachPersonSaid', '*', 'lines', '*'],
  ['againstSuccess', 'definitions', '*', 'text'],
  ['againstSuccess', 'conditions', '*', 'why'],
  ['definitions', '*', 'text'],
  ['conditions', '*', 'why'],
];

/* A stand-in no rule can read anything into: characters from the private-use area, which are not
   letters, digits or spaces, so no name, number, goal or file name is ever found in one. */
const standIn = (n: number) => `${String.fromCharCode(0xE100 + (n % 0x1000))}${String.fromCharCode(0xE100 + Math.floor(n / 0x1000))}`;
const STAND_IN = /^[-]{2}$/;

/** Every place a path reaches in `value`, as the object holding it and the key. */
function placesOf(value: any, path: APath): { holder: any; key: string | number }[] {
  let here: { holder: any; key: string | number }[] = [{ holder: { root: value }, key: 'root' }];
  for (const step of path) {
    const next: { holder: any; key: string | number }[] = [];
    for (const { holder, key } of here) {
      const v = holder?.[key];
      if (v === null || typeof v !== 'object') continue;
      if (step === '*') {
        if (Array.isArray(v)) v.forEach((_, i) => next.push({ holder: v, key: i }));
      } else if (!Array.isArray(v) && step in v) {
        next.push({ holder: v, key: step });
      }
    }
    here = next;
  }
  return here;
}

/**
 * Runs `wall` over `served` with every field on `paths` held aside, then puts each back as it was.
 * `served` is copied first, so the caller's object is not changed.
 */
export function withTheirOwnWordsKept<T>(served: T, paths: readonly APath[], wall: (v: T) => T): T {
  if (!served || typeof served !== 'object') return wall(served);
  const held: string[] = [];
  const withStandIns = structuredCloneKeepingDates(served);
  for (const path of paths) {
    for (const { holder, key } of placesOf(withStandIns, path)) {
      if (typeof holder[key] !== 'string') continue;
      held.push(holder[key]);
      holder[key] = standIn(held.length - 1);
    }
  }
  if (!held.length) return wall(served);
  const walled = wall(withStandIns as T);
  const putBack = (v: any): any => {
    if (typeof v === 'string') {
      if (!STAND_IN.test(v)) return v;
      const n = (v.charCodeAt(1) - 0xE100) + (v.charCodeAt(2) - 0xE100) * 0x1000;
      return held[n] ?? '';
    }
    if (v === null || typeof v !== 'object' || v instanceof Date) return v;
    if (Array.isArray(v)) return v.map(putBack);
    if (![Object.prototype, null].includes(Object.getPrototypeOf(v))) return v;
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) out[k] = putBack(x);
    return out;
  };
  return putBack(walled);
}

/* A deep copy of plain rows and lists; a Date, a Decimal or anything else is kept as the same value. */
function structuredCloneKeepingDates(v: any): any {
  if (v === null || typeof v !== 'object' || v instanceof Date) return v;
  if (Array.isArray(v)) return v.map(structuredCloneKeepingDates);
  if (![Object.prototype, null].includes(Object.getPrototypeOf(v))) return v;
  const out: Record<string, any> = {};
  for (const [k, x] of Object.entries(v)) out[k] = structuredCloneKeepingDates(x);
  return out;
}

/** A list of lines at `listPath` loses any line whose `field` has no words in it. */
export function withoutLinesWithNoWords<T>(served: T, listPath: APath, field: string): T {
  for (const { holder, key } of placesOf(served, listPath)) {
    const list = holder[key];
    if (Array.isArray(list)) holder[key] = list.filter((x: any) => !(x && typeof x === 'object' && typeof x[field] === 'string' && !x[field].trim()));
  }
  return served;
}
