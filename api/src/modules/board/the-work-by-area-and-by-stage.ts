import { isASalesKind, type AServedSection, type AServedRecord, type KindOfWork } from './the-kind-of-work';

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
  [/^(?:site|depot|warehouse|hub|town)$/i, 'By site'],
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
      /* The area's own row is not work in it: "Kiambu County has 1 county on record" (request 132 d). */
      const inIt = rs.filter((r) => !(r.kind === 'county' && r.name.trim() === area));
      if (!inIt.length) return { area, records: 0, says: `${area} is on record, and no piece of work in it is on record yet.` };
      const kinds = [...new Set(inIt.map((r) => r.kind))];
      const counted = kinds.length === 1 ? plural(inIt.length, kinds[0]) : plural(inIt.length, 'record');
      return { area, records: inIt.length, says: `${area} has ${counted} on record.` };
    }),
  };
}

export interface ReportedAtEachStage {
  state: 'not-known';
  why: string;
  /** `addedOnTheBoard`: deals at this stage added on the board, not reported in a check-in (request 117, part 4). */
  stages: { stage: string; reported: number; withProof: number; addedOnTheBoard?: number; says: string; met?: number; lost?: boolean; withAReason?: number }[];
  /** One sentence where nobody has reported a deal at any stage, in place of a row for each empty stage. */
  says?: string;
}

/** Said once where no stage has a deal in it (request 115 f). */
export const NO_DEAL_REPORTED_YET = 'Nobody has reported a deal at any stage yet.';

export const NO_STAGE_RULES = 'Nothing on record says what a deal must show at each stage. The board counts what people reported, and how much of it has a document behind it. It cannot count how many meet the rules.';

/** Said under "Reported vs criteria met" when the stage rules are on record (Release 1's sales board; a-deals-four-criteria). */
export const THE_STAGE_RULES_ARE_COUNTED = 'Each stage counts the deals people reported at it or later, and how many of them meet what that stage needs, from the record. Won is met with a signed order or a payment record.';

/**
 * REPORTED VS CRITERIA MET, STAGE BY STAGE (the kit's board-as-lead.txt: "Contacted 186 said, 154 met", "Qualified 92 said, 31
 * met", "Won 21 said, 17 met"). With the stage rules on record, each stage counts the deals reported at it or later ("said") and
 * the deals whose record meets that stage's own rule ("met"; each deal's `stagesMet`, each-deal-in-its-group). From the rows this
 * reader is served, after every wall.
 */
function reportedAgainstTheCriteria(grid: any): ReportedAtEachStage {
  const deals: AServedRecord[] = grid ? grid.rows.filter((r: AServedRecord) => r.kind === 'deal') : [];
  const order: string[] = Array.isArray(grid?.stages) ? grid.stages : [];
  const at = (s: string | null | undefined) => order.findIndex((x) => x.toLowerCase() === String(s ?? '').trim().toLowerCase());
  /*
   * ONLY A STAGE SOMEBODY SAID IS "SAID" (Hafsah's quality pass, 18 October, B-23): "Qualified 3 said, 0 met" was read where nobody
   * had said Qualified, because a deal said at Quoted counted as said at every stage before it. Where the rows carry the stages
   * said (stagesSaid), a stage nobody said shows only how many meet it, as the kit does ("Pitched 49 met").
   */
  const knowsWhatWasSaid = deals.some((d: any) => Array.isArray(d.stagesSaid));
  const stages = order.map((stage, i) => {
    const said = deals.filter((d) => at(d.stage) >= i);
    const met = deals.filter((d) => (d.stagesMet ?? []).some((m) => m.toLowerCase() === stage.toLowerCase())).length;
    const withProof = said.filter((d) => d.known === 'proof').length;
    const metSays = met === 1 ? `1 deal meets what ${stage} needs` : `${met} deals meet what ${stage} needs`;
    const nobodySaidIt = knowsWhatWasSaid && !deals.some((d: any) => (d.stagesSaid ?? []).some((x: string) => x.toLowerCase() === stage.toLowerCase()));
    if (nobodySaidIt) return { stage, reported: null as unknown as number, met, withProof, says: `${metSays.charAt(0).toUpperCase()}${metSays.slice(1)}. Nobody reported a deal at ${stage}.` };
    const reportedSays = said.length === 1 ? `1 deal was reported at ${stage} or later` : `${said.length} deals were reported at ${stage} or later`;
    return { stage, reported: said.length, met, withProof, says: `${reportedSays}, and ${metSays}.` };
  }).filter((s) => s.reported || s.met);
  /*
   * AND LOST, AFTER THE OPEN STAGES (Hafsah, 18 October: a Lost stage). A lost deal is in none of the counts above; it is counted
   * here, with how many of them have a reason, because "Lost needs a reason".
   */
  const lost: any[] = Array.isArray(grid?.lost) ? grid.lost : [];
  const withAReason = lost.filter((l) => !!l?.reason).length;
  const lostRow = lost.length
    ? [{
      stage: 'Lost', reported: lost.length, withProof: 0, lost: true, withAReason,
      says: `${lost.length === 1 ? '1 deal was' : `${lost.length} deals were`} lost, and ${withAReason === lost.length ? (lost.length === 1 ? 'it has a reason' : 'each has a reason') : withAReason === 0 ? (lost.length === 1 ? 'no reason was given' : 'none has a reason') : `${withAReason} ${withAReason === 1 ? 'has a reason' : 'have a reason'}`}.`,
    }]
    : [];
  const all = [...stages, ...lostRow];
  return { state: 'not-known', why: THE_STAGE_RULES_ARE_COUNTED, stages: all, ...(all.length ? {} : { says: NO_DEAL_REPORTED_YET }) };
}

export function reportedAgainstTheRules(kind: KindOfWork | null, sections: AServedSection[] | null | undefined, opts: { criteria?: boolean } = {}): ReportedAtEachStage | null {
  if (!kind) return null;
  if (opts.criteria && isASalesKind(kind)) {
    const grid = (sections ?? []).find((s: any) => Array.isArray(s.rows) && Array.isArray(s.stages) && s.stages.length && s.rows.some((r: any) => r.kind === 'deal')) as any;
    return reportedAgainstTheCriteria(grid ?? null);
  }
  /*
   * ANY KIND WITH STAGES (request 127 item 11). Only the sales board had "reported against the rules, stage by stage", so the
   * engineering board, whose releases and tasks have stages too, was sent none. Each stage says what was reported in the kind's
   * own word ("2 tasks were reported at Merged"), and the sales board is unchanged.
   */
  const grid = (sections ?? []).find((s: any) => Array.isArray(s.rows) && Array.isArray(s.stages) && s.stages.length && s.rows.length) as any;
  const sales = isASalesKind(kind);
  if (!sales && !grid) return null;
  const deals: AServedRecord[] = grid ? grid.rows.filter((r: AServedRecord) => sales ? r.kind === 'deal' : true) : [];
  const kinds = [...new Set(deals.map((d) => d.kind))];
  const noun = sales ? 'deal' : kinds.length === 1 ? kinds[0] : 'piece of work';
  const rules = sales ? NO_STAGE_RULES : NO_STAGE_RULES.replace('what a deal must show at each stage', 'what each piece of work must show at each stage');
  const order: string[] = Array.isArray(grid?.stages) ? grid.stages : [];
  /*
   * ONLY STAGES WITH SOMETHING IN THEM (request 115 f). Four rows of "Nobody has reported a deal at ..."
   * said nothing a reader could use. A stage with no deal is left out, in the stages' own order; where no
   * stage has one, the section says so once.
   */
  const stages = [...new Set([...order, ...deals.map((d) => d.stage).filter((s): s is string => !!s)])]
    .filter((stage) => deals.some((d) => d.stage === stage))
    .map((stage) => {
      /*
       * A DEAL ADDED ON THE BOARD WAS NOT REPORTED (request 117, part 4). Tuskys Westgate was added on the board at
       * Won, and the board said "1 deal was reported at Won". It is counted apart, as added on the board.
       */
      const here = deals.filter((d) => d.stage === stage);
      const added = here.filter((d) => (d as any).from === 'lead');
      const at = here.filter((d) => (d as any).from !== 'lead');
      const withProof = at.filter((d) => d.known === 'proof').length;
      const proof = at.length === 1
        ? (withProof ? 'it has a document behind it' : 'it has no document behind it')
        : withProof === 0 ? 'none of them has a document behind it'
          : withProof === at.length ? 'all of them have a document behind them'
            : `${withProof} of them ${withProof === 1 ? 'has' : 'have'} a document behind ${withProof === 1 ? 'it' : 'them'}`;
      const reportedSays = at.length ? `${plural(at.length, noun)} ${at.length === 1 ? 'was' : 'were'} reported at ${stage}, and ${proof}.` : '';
      const addedSays = added.length
        ? at.length
          ? `${plural(added.length, `more ${noun}`)} ${added.length === 1 ? 'was' : 'were'} added on the board at ${stage}, not reported in a check-in.`
          : `${plural(added.length, noun)} ${added.length === 1 ? 'was' : 'were'} added on the board at ${stage}, not reported in a check-in.`
        : '';
      const says = [reportedSays, addedSays].filter(Boolean).join(' ');
      return { stage, reported: at.length, withProof, ...(added.length ? { addedOnTheBoard: added.length } : {}), says };
    });
  return { state: 'not-known', why: rules, stages, ...(stages.length ? {} : { says: sales ? NO_DEAL_REPORTED_YET : `Nobody has reported a ${noun} at any stage yet.` }) };
}
