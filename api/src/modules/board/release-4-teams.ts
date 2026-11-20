/**
 * RELEASE 4, GOALS AND TARGETS FOR EVERY KIND OF TEAM (release plan, Release 4; Hafsah, 24 October 2026). One switch per organisation,
 * `Organization.release4TeamsOn`, off for every organisation until Groundwork staff switch it on (scripts/release-4-teams.ts). On, the
 * board draws each team type (support desk, operations, engineering, sales org, subscriptions, leadership) as its kit picture; off, the
 * board reads exactly as before. It changes how the board is laid out, never what it says or who reads what.
 */
/** ALWAYS ON (Hafsah, 15 November 2026: everything has a board; reverses the October hide, decisions 88 and 91). The column is no longer read and nothing stored is changed. */
export async function theRelease4TeamsIsOn(_prisma?: any, _organizationId?: string | null): Promise<boolean> {
  return true;
}

/** A target's unit: the one stored on it, else "%" for a rate (a share to keep at or above), else none. */
export function theUnitOfATarget(o: { unit?: string | null; direction?: string | null } | null | undefined): string | null {
  const u = String(o?.unit ?? '').trim();
  if (u) return u.slice(0, 12);
  return o?.direction === 'RATE' ? '%' : null;
}

/** A figure with its unit, as the board writes it: "91%", "KES 7 million" stays the figure's own words, "9.5h", "4 units". */
export function aFigureWithItsUnit(v: number, unit: string | null | undefined): string {
  const s = Number.isInteger(v) ? v.toLocaleString('en-GB') : String(Math.round(v * 10) / 10);
  if (!unit) return s;
  if (unit === '%') return `${s}%`;
  if (unit === 'h') return `${s}h`;
  if (/^[A-Z]{3}$/.test(unit)) return `${unit} ${s}`;
  return `${s} ${unit}`;
}

/**
 * THE MORNING'S TARGET LINES FOR A TEAM THAT IS NOT A SALES TEAM (Release 4): each team target in one sentence, with its unit and where
 * it stands, from the board as served. "Tickets resolved within a day is at 91% against 90%, and it is met." A limit not to go over
 * reads "against at most 3%".
 */
export function theTeamsTargetsSaid(board: any): string[] {
  const team = ((board?.objectives ?? []) as any[]).filter((o) => !o.ownerParticipantId && o.target != null);
  return team.map((o) => {
    const count = typeof o.count === 'number' ? aFigureWithItsUnit(o.count, o.unit) : null;
    const target = `${o.journey?.direction === 'down' || o.direction === 'LIMIT' || o.direction === 'ZERO' ? 'at most ' : ''}${aFigureWithItsUnit(Number(o.target), o.unit)}`;
    const word = String(o.stands?.word ?? '').trim().toLowerCase();
    const name = String(o.name ?? '').trim().replace(/[.]+$/, '');
    return count == null
      ? `${name} has no figure on record yet, against ${target}.`
      : `${name} is at ${count} against ${target}${word ? `, and it is ${word}` : ''}.`;
  });
}
