/**
 * A NAME HAS NO SPACE AT ITS ENDS.
 *
 * (Hafsah's screenshot of 19 November 2026: "We save this for you, Clinton ." His first name was stored as "Clinton " with the
 * space he typed after it, and every page and message that says his name printed the space.)
 *
 * A first or last name reaches a user's row through many doors: sign-up, the join page, the profile, an admin adding people, a
 * pasted list, Google. Trimming on each screen or each route leaves the next door open, which is how this one was. So it is done
 * where every one of them ends, on the write to the user's row, beside the rule that every user is a member
 * (`theMembershipFollowsTheUser`). Only the ends are touched: the name itself is the person's own, as typed.
 */
const NAMES = ['firstName', 'lastName'] as const;

function trimmed(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  for (const row of Array.isArray(data) ? data : [data]) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    for (const k of NAMES) {
      if (typeof r[k] === 'string') r[k] = (r[k] as string).trim();
      /* `{ set: '...' }`, the long way Prisma lets an update be written. */
      else if (r[k] && typeof (r[k] as { set?: unknown }).set === 'string') r[k] = { ...(r[k] as object), set: ((r[k] as { set: string }).set).trim() };
    }
  }
}

export function aNameHasNoSpaceAtItsEnds<P extends { model?: string; action: string; args?: any }>(params: P): P {
  if (params.model !== 'User' || !params.args) return params;
  if (params.action === 'upsert') { trimmed(params.args.create); trimmed(params.args.update); }
  else if (['create', 'createMany', 'update', 'updateMany'].includes(params.action)) trimmed(params.args.data);
  return params;
}
