import type { AServedSection, AServedRecord, KindOfWork } from './the-kind-of-work';

/**
 * THE WORK BY AREA, AND WHAT WAS REPORTED AT EACH SALES STAGE (request 107 c).
 *
 * The prototype's boards group the work "By site", "By county", "By team" and "By queue", and a sales
 * board puts "Reported qualified: 299, criteria met: 165." beside its grid. Both are read here from the
 * records this reader is already served, after every wall, so they count nothing the reader cannot
 * already read row by row. Nothing is made up to fill them:
 *
 *  - AN AREA only where a record holds one: a detail said about it named its site, county, team, queue,
 *    branch, region or location, or the record is a county itself. Groundwork keeps no area for a
 *    person, so where no record names one the board says so.
 *  - CRITERIA are not held anywhere. A sales check-in has stages, and the stage of each deal is what
 *    somebody reported; nothing on record says what a deal must show to be at that stage. So each
 *    stage serves what was reported, how many of those have a document behind them, and says plainly
 *    that the rules are not on record.
 */
const AREA_KEYS: [RegExp, string][] = [
  [/^site$/i, 'By site'],
  [/^county$/i, 'By county'],
  [/^team$/i, 'By team'],
  [/^queue$/i, 'By queue'],
  [/^(?:area|branch|region|location)$/i, 'By area'],
];

const plural = (n: number, kind: string) => `${n} ${n === 1 ? kind : `${kind}s`}`;

export type TheWorkByArea =
  | { state: 'filled'; heading: string; areas: { area: string; records: number; says: string }[] }
  | { state: 'not-known'; why: string };

export const NO_AREA_ON_RECORD = 'Nothing on record says which site, county, team or queue each piece of work belongs to, so the work cannot be shown by area yet.';

export function theWorkByArea(sections: AServedSection[] | null | undefined): TheWorkByArea {
  const rows: AServedRecord[] = (sections ?? []).flatMap((s: any) => (Array.isArray(s.rows) ? s.rows : []));
  const byHeading = new Map<string, Map<string, AServedRecord[]>>();
  for (const r of rows) {
    let area: string | null = null;
    let heading: string | null = null;
    if (r.kind === 'county') { area = r.name.trim(); heading = 'By county'; }
    for (const [k, v] of Object.entries(r.fields ?? {})) {
      if (area) break;
      const hit = AREA_KEYS.find(([re]) => re.test(k.trim()));
      if (hit && typeof v === 'string' && v.trim()) { area = v.trim(); heading = hit[1]; }
    }
    if (!area || !heading) continue;
    const m = byHeading.get(heading) ?? new Map<string, AServedRecord[]>();
    m.set(area, [...(m.get(area) ?? []), r]);
    byHeading.set(heading, m);
  }
  if (!byHeading.size) return { state: 'not-known', why: NO_AREA_ON_RECORD };
  /* The heading most records are grouped by. */
  const [heading, areas] = [...byHeading.entries()].sort((a, b) => [...b[1].values()].flat().length - [...a[1].values()].flat().length)[0];
  return {
    state: 'filled',
    heading,
    areas: [...areas.entries()].map(([area, rs]) => {
      const kinds = [...new Set(rs.map((r) => r.kind))];
      const counted = kinds.length === 1 ? plural(rs.length, kinds[0]) : plural(rs.length, 'record');
      return { area, records: rs.length, says: `${area} has ${counted} on record.` };
    }),
  };
}

export interface ReportedAtEachStage {
  state: 'not-known';
  why: string;
  stages: { stage: string; reported: number; withProof: number; says: string }[];
  /** One sentence where nobody has reported a deal at any stage, in place of a row for each empty stage. */
  says?: string;
}

/** Said once where no stage has a deal in it (request 115 f). */
export const NO_DEAL_REPORTED_YET = 'Nobody has reported a deal at any stage yet.';

export const NO_STAGE_RULES = 'Nothing on record says what a deal must show to be at each stage, so the board counts what people reported and how much of it has a document behind it, but not how many meet the rules.';

export function reportedAgainstTheRules(kind: KindOfWork | null, sections: AServedSection[] | null | undefined): ReportedAtEachStage | null {
  if (kind !== 'sales org') return null;
  const grid = (sections ?? []).find((s: any) => Array.isArray(s.rows) && s.rows.some((r: AServedRecord) => r.kind === 'deal')) as any;
  const deals: AServedRecord[] = grid ? grid.rows.filter((r: AServedRecord) => r.kind === 'deal') : [];
  const order: string[] = Array.isArray(grid?.stages) ? grid.stages : [];
  /*
   * ONLY STAGES WITH SOMETHING IN THEM (request 115 f). Four rows of "Nobody has reported a deal at ..."
   * said nothing a reader could use. A stage with no deal is left out, in the stages' own order; where no
   * stage has one, the section says so once.
   */
  const stages = [...new Set([...order, ...deals.map((d) => d.stage).filter((s): s is string => !!s)])]
    .filter((stage) => deals.some((d) => d.stage === stage))
    .map((stage) => {
      const at = deals.filter((d) => d.stage === stage);
      const withProof = at.filter((d) => d.known === 'proof').length;
      const proof = at.length === 1
        ? (withProof ? 'it has a document behind it' : 'it has no document behind it')
        : withProof === 0 ? 'none of them has a document behind it'
          : withProof === at.length ? 'all of them have a document behind them'
            : `${withProof} of them ${withProof === 1 ? 'has' : 'have'} a document behind ${withProof === 1 ? 'it' : 'them'}`;
      const says = `${plural(at.length, 'deal')} ${at.length === 1 ? 'was' : 'were'} reported at ${stage}, and ${proof}.`;
      return { stage, reported: at.length, withProof, says };
    });
  return { state: 'not-known', why: NO_STAGE_RULES, stages, ...(stages.length ? {} : { says: NO_DEAL_REPORTED_YET }) };
}
