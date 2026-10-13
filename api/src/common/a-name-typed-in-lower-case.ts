/**
 * A NAME TYPED IN LOWER CASE IS CAPITALISED, PART BY PART (Hafsah, 12 October 2026).
 *
 * "Names typed in lower case are capitalised per part ('pia alpha' becomes 'Pia Alpha'); people can correct
 * their own name when they join." A lead or an admin typing a name for somebody else is often in a hurry, and
 * "pia alpha" then reads on every page and in every email. Each part that is all lower case starts with a capital,
 * including the parts after a hyphen or an apostrophe ("mary-jane o'neil" becomes "Mary-Jane O'Neil"). A part
 * with any capital in it is left exactly as typed ("McDonald", "DeShawn"), and so is anything that is not a letter.
 * Only for a name somebody types FOR somebody else: the name a person gives for themselves is theirs, as typed.
 */
export function aNameTypedInLowerCase(name: string | null | undefined): string {
  if (!name) return name ?? '';
  return name.replace(/[^\s\-']+/g, (part) => (part === part.toLowerCase() && /^\p{Ll}/u.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part));
}
