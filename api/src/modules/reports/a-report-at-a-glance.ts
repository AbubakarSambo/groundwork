/**
 * A REPORT AT A GLANCE: ONE FACT FOR EACH FOLDED LINE (the light prototype's s60; docs/light-rebuild/
 * sales-first.md, section 2, rules 3 and 4).
 *
 * The light reports keep the summary, the numbers and what asks for an answer open, and fold every
 * other part to one line: its name, one fact, a chevron. The facts come from the record, served as
 * data, never read off the screen. So they are built here from the report exactly as this reader is
 * served it, after every wall: a fact never says more than the part it sums up, and a part this
 * reader is not served gets no fact. A fact the report cannot say is left out, never made up.
 */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The first sentence of a paragraph, without its full stop, for a one-line fact. */
export function firstSentence(text: unknown): string | null {
  if (typeof text !== 'string' || !text.trim()) return null;
  const first = text.trim().split(/(?<=[.!?])\s+/)[0];
  return first.replace(/\.$/, '');
}

export interface ASessionReportAtAGlance {
  /** "How much this report can rely on" (was "What this is built from"). */
  reliesOn?: string;
  /** "What each person did" (was "What people said this session"). */
  eachPersonDid?: string;
  /** "The picture from everybody". */
  picture?: string;
  /** "Not raised again". */
  notRaisedAgain?: string;
  /** "What everybody said good looks like". */
  goodLooksLike?: string;
  /** "What this sits under". */
  sitsUnder?: string;
}

/** The session's team report, as served to this reader. */
export function theSessionReportAtAGlance(r: any): ASessionReportAtAGlance {
  if (!r || typeof r !== 'object') return {};
  const out: ASessionReportAtAGlance = {};
  const relies = firstSentence(r.confidence?.saying);
  if (relies) out.reliesOn = relies;
  const people = Array.isArray(r.whatEachPersonSaid) ? r.whatEachPersonSaid.length : 0;
  if (people) out.eachPersonDid = `${plural(people, 'person', 'people')}, each in their own words`;
  const picture = (Array.isArray(r.picture) ? r.picture : [])
    .filter((l: any) => l && !['basis', 'reads', 'written', 'direction', r.finding?.key].includes(l.key));
  const firstLine = firstSentence(picture[0]?.text);
  if (firstLine) out.picture = firstLine;
  const quiet = firstSentence(r.whatWentQuiet);
  if (quiet) out.notRaisedAgain = quiet;
  const definitions = Array.isArray(r.againstSuccess?.definitions) ? r.againstSuccess.definitions.length : 0;
  if (definitions) out.goodLooksLike = `${plural(definitions, 'person', 'people')} said it in their own words`;
  else if (r.againstSuccess) {
    const said = firstSentence(r.againstSuccess.saying);
    if (said) out.goodLooksLike = said;
  }
  if (r.cascade) out.sitsUnder = r.cascade.parentNamed ? String(r.cascade.parentNamed) : 'Nothing above this has been named yet';
  return out;
}

export interface AWeeklyReportAtAGlance {
  threeInARow?: string;
  saidAndProof?: string;
  whatChanged?: string;
}

/** The weekly report, as served to this reader. */
export function theWeeklyReportAtAGlance(w: any): AWeeklyReportAtAGlance {
  if (!w || typeof w !== 'object') return {};
  const out: AWeeklyReportAtAGlance = {};
  const n = Array.isArray(w.threeInARow) ? w.threeInARow.length : 0;
  if (n) out.threeInARow = `${plural(n, 'thing')} that ${n === 1 ? 'keeps' : 'keep'} happening`;
  const said = firstSentence(w.saidAndProof);
  if (said) out.saidAndProof = said;
  const result = firstSentence(Array.isArray(w.whatChanged?.result) ? w.whatChanged.result[0] : null);
  if (result) out.whatChanged = result;
  return out;
}

/**
 * The report as served, with its facts beside it: added by the route, after the service's last read
 * (every wall) has run, and only where there is a fact to give.
 */
export function withItsFacts<T>(served: T, facts: (r: any) => object): T {
  if (!served || typeof served !== 'object' || (served as any).withheldUntilYouAnswer) return served;
  const inThisReport = facts(served);
  return Object.keys(inThisReport).length ? ({ ...(served as any), inThisReport } as T) : served;
}

