/**
 * THE ROLE MAP, ASKED ABOUT (chat is king, section 8).
 *
 * The role map is read by admins only, and nobody can be given a role on it: roles and who holds them come from the organisation's own
 * systems. So by chat it is read, in the same words and by the same admins, and a request to change it is answered plainly that it is not
 * changed here, instead of pretending something was done.
 */
export const THE_ROLE_MAP_PATTERNS: RegExp[] = [
  /\brole\s+map\b/i,
  /\bwho\s+holds\s+(?:each|every|which|the)\s+roles?\b/i,
  /\bwhich\s+roles?\s+(?:has|have|are)\s+(?:nobody|no\s*one|unfilled|empty|vacant)\b/i,
  /\broles?\s+(?:that\s+)?(?:nobody|no\s*one)\s+(?:holds|has)\b/i,
  /\bwho\s+(?:owns|has)\s+which\s+(?:job|role)\b/i,
];

/** The change words: a person asking to build or change the map is told it is read-only here. */
export const ASKS_TO_CHANGE_THE_MAP = /\b(?:build|change|edit|update|assign|create|remove)\b/i;

export const THE_MAP_IS_NOT_CHANGED_HERE = 'The role map cannot be changed here, by chat or on the page. Roles and who holds them come from your organisation’s own systems, so a change there shows on the map by itself. I have changed nothing.';

export interface ARoleRow { name: string; owns: string | null; heldBy: string[] }

const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');

export function theRoleMapSaid(map: { roles: ARoleRow[]; nobody: { name: string; why: string | null }[] }): string {
  if (!map.roles.length && !map.nobody.length) return 'There are no roles on the role map yet. They appear when your organisation’s systems give them.';
  const held = map.roles.filter((r) => r.heldBy.length);
  const out: string[] = [];
  if (held.length) out.push(held.map((r) => `${r.name} is held by ${list(r.heldBy)}.${r.owns ? ` It owns ${r.owns.replace(/[.\s]+$/, '')}.` : ''}`).join('\n'));
  if (map.nobody.length) out.push(`${list(map.nobody.map((r) => r.name))} ${map.nobody.length === 1 ? 'is a job' : 'are jobs'} nobody holds right now.${map.nobody.length === 1 && map.nobody[0].why ? ` ${map.nobody[0].why.replace(/[.\s]+$/, '')}.` : ''}`);
  out.push('Only admins can read this, and it changes when your organisation’s systems change.');
  return out.join('\n\n');
}
