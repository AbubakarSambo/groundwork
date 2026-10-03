/**
 * EACH WAIT UNDER WHOEVER HOLDS IT, AND EACH THING ONCE (item 18, the onboarding and project boards,
 * 2 October 2026).
 *
 * The coaching lists put every wait a person had under the one holder any of them named. On "Atlas
 * delivery" Tunde read "Samuel Aryee has been waiting on Kwabena Mensah for the details for the
 * analysis and approval for the external dataset", but the approval waits on Finance, not on Kwabena.
 * On "Engagement Director, first 90 days" Tobi read "Put ... a briefing on pricing structures ... three
 * dates and times for the meeting ... in writing to Dr Amina Bello", two things nobody said Amina
 * holds. And a thing recorded twice was listed twice: "waiting for the data team's market sizing
 * extract and the data team's market sizing extract".
 *
 * So the waits are grouped by who holds them, in the order they first come up, each thing is said
 * once, and the waits with nobody named stay a group of their own, said without a holder.
 */
export interface AWaitToGroup { what: string; who: string | null }

export interface WaitsOnOneHolder { who: string | null; items: string[] }

const theThing = (what: string) => (what ?? '').replace(/[.\s]+$/, '').trim();

/*
 * THE SAME THING SAID THREE WAYS IS ONE THING (run-25, sales). Femi's coaching read "Put their documents, especially
 * the bank statements, the bank statements from the customers and the three remaining bank statements in writing".
 * Each wait was recorded in other words, so each passed as a new thing. A wait whose words, without the little words,
 * numbers, "remaining" or "outstanding", and who it comes from, are all already in a thing said before it is that
 * thing again, and is said once. Only where it has two such words or more ("bank statements"): one word alone ("the
 * dataset") is too little to tell "the dataset" from "approval for the dataset".
 */
const LITTLE = new Set(('the a an their his her my our your its this that these those of for to and or with especially including '
  + 'all some any more other rest remaining outstanding missing last next new few several each every').split(' '));
const A_NUMBER_WORD = /^(?:\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|dozen)$/i;
const itsWords = (thing: string): string[] =>
  thing.toLowerCase()
    /* Who it comes from is the holder, not the thing: "the bank statements from the customers". */
    .replace(/\s+from\s+.+$/, '')
    .split(/[^\p{L}\p{N}'’-]+/u)
    .map((w) => w.replace(/['’]s$/, ''))
    .filter((w) => w && !LITTLE.has(w) && !A_NUMBER_WORD.test(w));

export function theSameThingAgain(thing: string, before: string[]): boolean {
  const mine = [...new Set(itsWords(thing))];
  if (mine.length < 2) return false;
  return before.some((b) => {
    const theirs = new Set(itsWords(b));
    return mine.every((w) => theirs.has(w));
  });
}

export function eachWaitUnderWhoeverHoldsIt(waits: AWaitToGroup[]): WaitsOnOneHolder[] {
  const groups: WaitsOnOneHolder[] = [];
  const said = new Set<string>();
  const saidSoFar: string[] = [];
  for (const w of waits) {
    const it = theThing(w.what);
    const key = it.toLowerCase();
    if (!it || said.has(key) || theSameThingAgain(it, saidSoFar)) continue;
    said.add(key);
    saidSoFar.push(it);
    const who = (w.who ?? '').trim() || null;
    let g = groups.find((x) => (x.who ?? '').toLowerCase() === (who ?? '').toLowerCase());
    if (!g) { g = { who, items: [] }; groups.push(g); }
    g.items.push(it);
  }
  /* The waits with a holder first, the ones with nobody named last. */
  return [...groups.filter((g) => g.who), ...groups.filter((g) => !g.who)];
}

/** Two things are "a and b", three are "a, b and c". */
export const andList = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/**
 * "on Kwabena Mensah for the details for the analysis, and for approval for the external dataset":
 * the part of a sentence after "has been waiting", each group with its own holder.
 */
export function waitingOnEachHolder(groups: WaitsOnOneHolder[]): string {
  const parts = groups.map((g) => `${g.who ? `on ${g.who} ` : ''}for ${andList(g.items)}`);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}
