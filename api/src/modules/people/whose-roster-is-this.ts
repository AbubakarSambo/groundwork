/**
 * A ROSTER BELONGS TO A SYSTEM, NOT TO A CREDENTIAL.
 *
 * `Person` is unique on `(organizationId, sourceSystem, externalId)`, which is the right key: two
 * different systems may both call somebody "1042" and mean different people. What went wrong is
 * what was being put in `sourceSystem` — the credential's `clientId`, which is freshly random on
 * every issue.
 *
 * So rotating a credential, the most ordinary security housekeeping there is, changed the identity
 * of every person in the organisation. The next sync matched nothing, created a second copy of the
 * whole roster, and reported `created: true` on every row. Nothing failed. Nothing warned.
 *
 * AND THE DUPLICATES ARE INVISIBLE FROM THE READS THAT MATTER. `list` and `resolve` are
 * organisation-wide by design, so they return both copies; the panel's person lookup is org-wide
 * too, so somebody's assistant can bind to the stale copy and read an empty record. The old copies
 * never deactivate either, because the credential that created them is never used again — so
 * deprovisioning a leaver deactivates one of the two.
 *
 * ==========================================================================
 * WHAT A SOURCE SYSTEM IS NOW.
 * ==========================================================================
 *
 * A short, stable name for the SYSTEM the roster comes from — "workday", "bamboohr", "our-hris".
 * Chosen when a credential is issued, kept when it is rotated, and the same across two credentials
 * that speak for the same system. It is the customer's word, not ours, and not a secret.
 *
 * EXISTING CREDENTIALS KEEP THEIR CLIENT ID as their source system, because that is what their
 * people were written under. Changing it would orphan every row they have ever pushed — the same
 * accident in the other direction.
 */

/** What a customer may put in it. Deliberately narrow: it is an identifier people type twice. */
export const A_SOURCE_SYSTEM = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function whyThisIsNotASourceSystem(said: string): string | null {
  const s = said.trim();
  if (!s) return 'A source system needs a name - the system the roster comes from, like "workday".';
  if (!A_SOURCE_SYSTEM.test(s)) {
    return (
      `"${said}" cannot be a source system. Use lower-case letters, numbers and hyphens - `
      + 'it is typed again every time this credential is replaced, so it has to be easy to repeat.'
    );
  }
  return null;
}

/**
 * The name a credential gets when nobody says.
 *
 * Derived from what they called the credential, because a customer naming one "Workday sync"
 * plainly means Workday, and asking them to say it twice is how the two drift.
 */
export function fromTheCredentialName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  /* Anything that cannot be slugged at all falls back to a word rather than an empty string —
     an empty source system would key every person in the organisation under nothing. */
  return A_SOURCE_SYSTEM.test(slug) ? slug : 'roster';
}

export interface ADuplicate {
  externalId: string;
  /** Every source system that has a row for this person, oldest first. */
  under: string[];
}

/**
 * PEOPLE WHO EXIST TWICE, AND WHY THIS ONLY REPORTS THEM.
 *
 * Merging two Person rows means deciding which objectives, which findings and which linked account
 * survive — and where a credential rotation is the cause, the newer copy is usually right, and
 * where a customer genuinely runs two systems, neither is. That is a decision with somebody's
 * record on the end of it, so this hands back the list and nothing else.
 */
export function whoExistsTwice(
  rows: { externalId: string; sourceSystem: string; createdAt: Date }[],
): ADuplicate[] {
  const byPerson = new Map<string, { sourceSystem: string; createdAt: Date }[]>();
  for (const r of rows) {
    const seen = byPerson.get(r.externalId) ?? [];
    seen.push({ sourceSystem: r.sourceSystem, createdAt: r.createdAt });
    byPerson.set(r.externalId, seen);
  }

  const out: ADuplicate[] = [];
  for (const [externalId, seen] of byPerson) {
    const systems = [...new Set(seen.sort((a, b) => +a.createdAt - +b.createdAt).map((s) => s.sourceSystem))];
    if (systems.length > 1) out.push({ externalId, under: systems });
  }
  return out.sort((a, b) => a.externalId.localeCompare(b.externalId));
}

/** How it reads to whoever has to decide. Never a count on its own — a count cannot be acted on. */
export function howItReads(duplicates: ADuplicate[]): string {
  if (duplicates.length === 0) return 'Nobody in this organisation exists under more than one source system.';
  const names = duplicates.slice(0, 5).map((d) => `${d.externalId} (${d.under.join(', ')})`);
  const rest = duplicates.length > 5 ? `, and ${duplicates.length - 5} more` : '';
  return (
    `These people exist under more than one source system: ${names.join('; ')}${rest}. `
    + 'That usually means a credential was replaced and the new one pushed the roster again under a '
    + 'different name. Nothing is merged automatically, because merging decides which record keeps '
    + 'somebody’s objectives and which account is theirs.'
  );
}
