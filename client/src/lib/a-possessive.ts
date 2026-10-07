/**
 * "<NAME>'S", THE ENGLISH WAY (screen fault 5b). "Kijani Foods's systems" read wrong - a name
 * already ending in "s" takes just an apostrophe ("Kijani Foods' systems"), not another "s".
 * A name that does not end in "s" takes the usual "'s" ("Baridi's systems"). Used wherever a
 * screen builds "<organisation>'s" from a name it does not control the spelling of.
 */
export function possessiveOf(name: string): string {
  return /s$/i.test(name) ? `${name}’` : `${name}’s`
}
