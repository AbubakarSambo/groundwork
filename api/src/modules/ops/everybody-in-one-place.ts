/**
 * EVERYBODY'S QUARTER, SIDE BY SIDE, AND DELIBERATELY NOT ADDED UP.
 *
 * The one board. Every active person's agreed objective, what they committed
 * to, and what they contributed to sales and to the product, on one page, so
 * that "what is everybody actually doing this quarter" is a page rather than a
 * conversation with six people.
 *
 * It is the board most likely to be quietly turned into a leaderboard, so the
 * two things that would do that are prevented here rather than discouraged in a
 * comment:
 *
 *   1. NOTHING IS SUMMED ACROSS PEOPLE. A column total is a comparison wearing
 *      a number's clothes - it invites reading each row as a share of it. Down
 *      a person's own row things add up fine; across people they never do,
 *      because the rows measure different jobs.
 *
 *   2. THE ORDER IS BY NAME, ALWAYS. Sorting by contribution is the leaderboard
 *      arriving through the back door: it produces a first place and a last
 *      place out of numbers that were never on one scale. A technical
 *      contributor with no originations is not last at anything.
 *
 * What the board is FOR is the opposite of ranking: seeing that somebody has no
 * objective set, or six commitments and no contribution, or a contribution
 * nobody agreed an objective for. Those are all visible in a row read on its
 * own.
 */

/** What one person's row holds. Every count is that person's own. */
export interface OneRow {
  personId: string;
  key: string;
  displayName: string;
  functionalRole: string;

  /** What they agreed to be measured on this period. Empty is the finding. */
  objectives: {
    id: string;
    title: string;
    serves: string | null;
    status: string;
    /** Key results with neither a justification nor an approach behind them. */
    unjustifiedKeyResults: number;
  }[];

  commitments: {
    total: number;
    closed: number;
    missed: number;
    blocked: number;
    overdue: number;
  };

  /** Companies they originated, and money that arrived from them. */
  sales: {
    originated: number;
    positioned: number;
    newRevenueCents: number;
  };

  /** Pieces of work they declared, by what each one serves. */
  product: {
    total: number;
    byServes: Record<string, number>;
  };
}

/**
 * The sentence a row gets when something about it needs saying.
 *
 * Said rather than flagged red. Every one of these has a legitimate version -
 * somebody joined this week, somebody's job is not commercial - so the board
 * reports what it sees and leaves the judgement to whoever is reading.
 */
export function whatThisRowShows(row: OneRow): string[] {
  const said: string[] = [];

  if (row.objectives.length === 0) {
    said.push(
      'No objective set for this period. Everything below is work nobody agreed the shape of in advance.',
    );
  }

  const unjustified = row.objectives.reduce((n, o) => n + o.unjustifiedKeyResults, 0);
  if (unjustified > 0) {
    said.push(
      `${unjustified} ${unjustified === 1 ? 'target has' : 'targets have'} no justification or approach recorded.`,
    );
  }

  if (row.commitments.blocked > 0) {
    said.push(
      `${row.commitments.blocked} blocked. Blocked is not late - somebody is waiting on something.`,
    );
  }

  if (row.commitments.overdue > 0) {
    said.push(`${row.commitments.overdue} still open past the date they were due.`);
  }

  if (row.commitments.missed > 0) {
    said.push(`${row.commitments.missed} closed as missed.`);
  }

  if (row.objectives.length > 0 && row.commitments.total === 0) {
    said.push('An objective with nothing committed under it. The objective is the intention; the commitments are the work.');
  }

  if (row.commitments.total === 0 && row.objectives.length === 0 && row.product.total === 0 && row.sales.originated === 0) {
    said.push('Nothing recorded at all this period.');
  }

  return said;
}

/**
 * The board's order. By name, and there is no second argument.
 *
 * A function rather than a `.sort()` at the call site so that the rule has one
 * place to live and a guard has something to point at.
 */
export function inTheOrderTheBoardIsRead(rows: OneRow[]): OneRow[] {
  return [...rows].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * What is true of the QUARTER, which is the only thing that may be counted
 * across people - because it counts people, not their contributions.
 */
export function whatIsTrueOfTheQuarter(rows: OneRow[]): {
  people: number;
  withoutAnObjective: string[];
  ready: boolean;
  says: string;
} {
  const withoutAnObjective = rows.filter((r) => r.objectives.length === 0).map((r) => r.displayName);

  return {
    people: rows.length,
    withoutAnObjective,
    ready: withoutAnObjective.length === 0,
    says:
      withoutAnObjective.length === 0
        ? 'Everybody active has an objective for this period.'
        : `${withoutAnObjective.length} of ${rows.length} have no objective set for this period: ${withoutAnObjective.join(', ')}.`,
  };
}
