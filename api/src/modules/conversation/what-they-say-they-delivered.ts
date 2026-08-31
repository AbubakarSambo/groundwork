/**
 * WHAT SOMEBODY SAYS THEY DELIVERED, AS IT REACHES THE SESSION.
 *
 * The Context page states what is expected of a person. Until now they could read those words and
 * had nowhere to put what they actually did, so their side of it only reached the record if they
 * happened to say it in a session - which quietly favours whoever speaks first and longest, the
 * exact bias this product was built against.
 *
 * IT IS A CLAIM TO TEST, NOT A RESULT TO BANK, and the wording is the mechanism - the same reason
 * `between-session-notes.ts` exists as its own file. A form somebody fills in carefully is the
 * easiest thing in the world to write well and nothing checks it. If the engine reads this as
 * settled, the record ends up holding a self-report that no one ever questioned, and the interview
 * has been replaced by a text box.
 *
 * So the block says what it is: written alone, unprompted, unchecked. It asks the engine to put it
 * back to them and let what they say UNDER QUESTIONING be the record.
 *
 * The evidence line matters more than the claim. "I shipped it" and "I shipped it, PR 412, merged
 * Tuesday" are different kinds of sentence, and naming the difference to the engine is what makes
 * the follow-up land on the one that needs it.
 */

export interface ClaimedDelivery {
  text: string;
  evidence?: string | null;
  /** What was expected, in the lead's words. Absent where they did something nobody asked for. */
  against?: string | null;
}

export function buildDeliveriesBlock(deliveries: ClaimedDelivery[]): string {
  const real = deliveries.filter((d) => (d.text ?? '').trim());
  if (real.length === 0) return '';

  const lines = real.map((d) => {
    const bits = [`- "${d.text.trim()}"`];
    if ((d.against ?? '').trim()) bits.push(`  against what was expected of them: "${d.against!.trim()}"`);
    bits.push(
      (d.evidence ?? '').trim()
        ? `  they point at: "${d.evidence!.trim()}"`
        : '  they point at nothing in particular',
    );
    return bits.join('\n');
  });

  return [
    'BEFORE THIS SESSION THEY WROTE DOWN WHAT THEY SAY THEY DELIVERED:',
    '',
    ...lines,
    '',
    'These are their own claims, written alone and unprompted. Nothing in them has been checked and',
    'nobody else has been asked about any of it. Do not put any of it on record as established, and',
    'do not read it back as though it is settled.',
    'Put what matters back to them as a question, in your own words, where it fits - and press hardest',
    'on anything they point at nothing for. What they say under questioning is what goes on record.',
  ].join('\n');
}
