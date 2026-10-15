/**
 * THE PERSON DOING THE WORK WHO IS NOT IN THE ROOM.
 *
 * The synthesis is asked to name anybody a party's record references as doing work, deciding
 * something or being depended on, who is NOT themselves a party with an account here. That read
 * has existed for a long time and has reached one dead component. On a board it is one of the most
 * useful things the product can say: the team is depending on somebody who has no voice in this,
 * and nobody had to notice it themselves.
 *
 * IT IS THE ONE READ THAT NAMES SOMEBODY OUTSIDE THE CHECK-IN, which is why it needs its own guard
 * rather than the whitelist alone. Three things go wrong in the real data, and all three are
 * visible in the first four rows ever produced:
 *
 * IT QUOTES PEOPLE. "junior doctors avoid calling them: 'there are three wards and one of him'".
 * The board's no-quote rule is absolute - a leadership gap carrying a quotation is dropped rather
 * than trimmed - and a quotation attached to a NAME is worse than one attached to a role.
 *
 * IT NAMES PARTIES AS HIDDEN. Two of those four were "the initiator" and "participant A", who are
 * in the check-in by definition. That is not a hidden contributor; it is the read mistaking the
 * people in front of it for somebody absent. Dropped, and logged, because a definition this plain
 * failing this often is worth seeing rather than papering over.
 *
 * AND IT SPECULATES. "Success is defined as the project running without them, implying a handover
 * to a client" names nobody at all - it infers that a client must exist. A contributor nobody
 * referenced is a contributor this product invented.
 *
 * WHAT SURVIVES IS NARROW ON PURPOSE: a name or a role somebody actually referenced, with a
 * sentence describing what they were referenced doing, in nobody's words but the engine's.
 */

export interface HiddenContributor {
  label: string;
  evidence: string;
}

/** Straight and curly, and a word-internal apostrophe is not a quotation. */
function carriesAQuotation(text: string): boolean {
  const withoutWordInternal = text.replace(/(\w)['’](\w)/g, '$1$2');
  return /["“”]|['‘][^'’]{2,}['’]/.test(withoutWordInternal);
}

/**
 * The labels the product uses for people who ARE here. A row wearing one of these is not about
 * somebody absent, whatever the read believed.
 */
const IS_A_PARTY = /^(the initiator|the lead|the manager|party [A-Z]|participant [A-Z]|the participant)$/i;

/** Words that mean the read worked it out rather than read it. */
const WORKED_IT_OUT = /\b(implying|implies|suggests|presumably|likely|probably|must be|appears to|seems to|we can infer|inferred)\b/i;

export interface WhatWasDropped {
  label: string;
  why: 'quotes somebody' | 'is a party here' | 'was inferred rather than referenced' | 'names a party';
}

/**
 * Keep only what a shared board can carry, and say what went.
 *
 * `names` is everybody on the check-in, so a row naming one of them is caught even when the label
 * is a real name rather than a schema word.
 */
export function onlyWhoIsActuallyOutside(
  rows: HiddenContributor[],
  names: string[],
): { keep: HiddenContributor[]; dropped: WhatWasDropped[] } {
  const keep: HiddenContributor[] = [];
  const dropped: WhatWasDropped[] = [];
  const known = names.map((n) => n.trim().toLowerCase()).filter(Boolean);

  for (const row of rows ?? []) {
    const label = String(row?.label ?? '').trim();
    const evidence = String(row?.evidence ?? '').trim();
    if (!label || evidence.length < 12) continue;

    if (IS_A_PARTY.test(label)) { dropped.push({ label, why: 'is a party here' }); continue; }
    if (known.some((n) => label.toLowerCase() === n)) { dropped.push({ label, why: 'is a party here' }); continue; }
    if (carriesAQuotation(evidence) || carriesAQuotation(label)) { dropped.push({ label, why: 'quotes somebody' }); continue; }
    if (known.some((n) => n.length > 2 && evidence.toLowerCase().includes(n))) { dropped.push({ label, why: 'names a party' }); continue; }
    if (WORKED_IT_OUT.test(evidence)) { dropped.push({ label, why: 'was inferred rather than referenced' }); continue; }

    keep.push({ label, evidence });
  }
  /* Six is already more than a board reads at a glance, and a longer list means the read is
     listing everybody mentioned rather than everybody depended on. */
  return { keep: keep.slice(0, 6), dropped };
}

/**
 * WHAT THE SECTION SAYS, INCLUDING THAT IT IS NOT AN ACCUSATION.
 *
 * Somebody being outside the check-in is a fact about the check-in, not about them and not about
 * whoever set it up. The sentence has to make that obvious or the section reads as a list of people
 * somebody forgot.
 */
export const WHY_THIS_IS_HERE =
  'Somebody in this check-in said this person does work here, and this person is not in the check-in. That is worth knowing '
  + 'before anything is decided about the work they are part of - they cannot correct a record they '
  + 'are not in.';
