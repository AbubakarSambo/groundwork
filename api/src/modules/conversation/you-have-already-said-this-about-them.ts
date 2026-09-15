/**
 * THEY NAMED SOMEBODY. SAY WHAT IS ALREADY ON THE RECORD ABOUT THAT PERSON.
 *
 * A lead names Rita in session three, and the conversation asks about Rita as though Rita has never
 * come up. She has: the lead said in session one what she expects of Rita, and said whether Rita had
 * been told. Both are on the record and neither reaches the turn where Rita is named again.
 *
 * Two things come back from that. The lead does not have to say it twice, which is half of why the
 * product felt like a form. And the expectation nobody has been told gets raised at the only moment
 * it is naturally raisable - "you said Rita owns the pricing, and that she does not know yet" - which
 * is the single highest-value fact in this table and the reason the field exists.
 *
 * NOTHING HERE CROSSES THE WALL, and that is why this trigger was safe to build before the others.
 * A PersonObjective is written FOR the person it is about and published to them on their own page:
 * telling the lead what they themselves put on somebody reveals nothing to anybody. Nothing a
 * participant SAID about themselves is read here, and nothing another party wrote is either.
 *
 * `awareness` is the lead's own account of whether they told them. It is never presented as fact
 * about the other person - "on your own account" is doing real work in the wording below.
 */

export interface WhatIsOnThemAlready {
  /** The person's name as the ground holds it. */
  name: string;
  /** What is expected of them, as published to them. */
  text: string;
  /** TOLD, PROBABLY, NOT_TOLD, or nothing where it was never established. */
  awareness: string | null;
}

/** Did they actually name this person, rather than a word that happens to contain their name? */
export function theyNamed(theyJustSaid: string, name: string): boolean {
  const n = (name ?? '').trim();
  if (n.length < 2) return false;
  const first = n.split(/\s+/)[0];
  if (first.length < 3) return false;
  const safe = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${safe}\\b`, 'i').test(theyJustSaid ?? '');
}

/**
 * The one person worth saying something about this turn, or nothing.
 *
 * ONE PERSON, ONE FACT. Where they named three people, handing back three paragraphs turns the turn
 * into a report. The one nobody has been told about wins, because that is the fact with somewhere to
 * go and the reason anybody would want it now rather than in a document later.
 */
export function whatIsAlreadyOnThem(theyJustSaid: string, onThem: WhatIsOnThemAlready[]): string {
  const said = (theyJustSaid ?? '').trim();
  if (said.length < 6) return '';
  const named = (onThem ?? []).filter((o) => o.name?.trim() && o.text?.trim() && theyNamed(said, o.name));
  if (!named.length) return '';

  const untold = named.filter((o) => (o.awareness ?? '').toUpperCase() === 'NOT_TOLD');
  const pick = untold[0] ?? named[0];
  const notTold = (pick.awareness ?? '').toUpperCase() === 'NOT_TOLD';

  return [
    'ALREADY ON THE RECORD ABOUT SOMEBODY THEY JUST NAMED.',
    '',
    `They have already said what they expect of ${pick.name.trim()}: "${pick.text.trim()}".`,
    notTold
      ? `And on their own account, ${pick.name.trim()} has not been told.`
      : '',
    '',
    'Do not ask them for it again. If it bears on what they just said, say it back in one short clause',
    'before your question, in your own words.',
    notTold
      ? 'The part about not having been told is worth raising, once, as a thing they might want to do - never as a failing, and always as their own account rather than a fact about the other person.'
      : '',
    '',
    'Say nothing about any of this if it does not bear on what they just said. A fact about the right',
    'person at the wrong moment still reads as not listening.',
  ].filter((l) => l !== '').join('\n');
}
