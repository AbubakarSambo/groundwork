/**
 * WHAT A MACHINE MAY DO, NAMED SO A CUSTOMER CAN REASON ABOUT IT.
 *
 * These are the strings in the integration contract, so they are lowercase and colon-separated
 * rather than our usual enum shape - a customer reads them in their own console and pastes them
 * into their own config. Renaming one is a breaking change to somebody else's deployment.
 */
export const SCOPES = [
  'graph:write',
  'subjects:write',
  'knowledge:write',
  'checkins:write',
  /* Opening a check-in from an integration. Separate from checkins:write, which only links an
     existing one to an objective - the two are different powers and a customer should be able to
     grant the smaller. */
  'grounds:write',
  'findings:read',
  /*
   * Its own scope rather than folded into findings:read. A handover brief is the list of what is
   * outstanding on one named person's desk, which is a good deal more than a finding - so granting
   * an integration the right to read findings must not silently grant it this too. Adding a scope
   * is additive; the note above about renaming still holds.
   */
  'handovers:read',
  /* A report is the synthesis of what several people independently said. Its own scope, so granting
     an integration findings does not silently grant it everybody's account of the quarter. */
  'reports:read',
  'proposals:read',
  'proposals:write',
  'chat:write',
  /*
   * ISSUABLE, so the route that asks for it can be called.
   *
   * `GET /api/org/v1/roles` has required `graph:read` since it was written, and this list did not
   * contain it — so the scope could not be granted by any credential and the route was a permanent
   * 403 on a documented address. Adding a scope is additive: nothing that already works stops
   * working, and `graph:write` is treated as holding it below, because a caller who may write the
   * shape of an organisation may certainly read it back.
   */
  'graph:read',
] as const;

export type Scope = (typeof SCOPES)[number];

export const isScope = (s: string): s is Scope => (SCOPES as readonly string[]).includes(s);

/**
 * A TOKEN MAY NARROW WHAT ITS CREDENTIAL HOLDS, NEVER WIDEN IT.
 *
 * The OAuth grant lets a caller ask for a subset - useful for a script that only ever reads - and a
 * request for anything outside what was issued is refused rather than quietly trimmed. Trimming
 * would hand back a token that looks like the one they asked for and does less, which is how an
 * integration fails at 3am with a permission error nobody can trace to a typo in a config file.
 */
export function resolveGrantedScopes(held: string[], requested?: string | null): { ok: true; scopes: string[] } | { ok: false; unheld: string[] } {
  if (!requested?.trim()) return { ok: true, scopes: held };
  const asked = requested.trim().split(/\s+/);
  const unheld = asked.filter((s) => !held.includes(s));
  if (unheld.length) return { ok: false, unheld };
  return { ok: true, scopes: asked };
}

/**
 * A SCOPE THAT ANOTHER SCOPE ALREADY IMPLIES.
 *
 * Only where the wider power obviously contains the narrower one. Writing the graph and then being
 * refused a read of it is not a security boundary, it is a paperwork error that an integration
 * meets at three in the morning.
 */
const IMPLIED: Record<string, string[]> = {
  'graph:read': ['graph:write'],
};

export function holdsScope(held: readonly string[], required: string): boolean {
  if (held.includes(required)) return true;
  return (IMPLIED[required] ?? []).some((wider) => held.includes(wider));
}
