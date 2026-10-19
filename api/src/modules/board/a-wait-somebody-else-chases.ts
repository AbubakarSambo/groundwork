/**
 * A WAIT SOMEBODY ELSE CHASES IS NOT A BLOCKER THIS PERSON SHOULD HAVE TRIED ON (engine test, Muchemi & Co, "Fee notes").
 *
 * Njeri raises the fee notes and records payments; Aisha and Brian follow up with the clients. On Monday 12 October she said she was
 * waiting for the payments for FN-006, FN-007 and FN-009 to reach the bank, and to be told the Kasarani Foods reply was filed before
 * FN-005 fell due. Her My work page said "You raised 5 blockers and said what you had tried first on 0 of them" and told her "Try one
 * thing before you raise a blocker, and say what you tried." Each was a wait Aisha or Brian was chasing in the same check-in.
 *
 * A wait counts towards "Handling blockers" only where nobody else in the check-in is chasing the same thing: no colleague's own wait
 * or promise names the same reference ("FN-007"), or at least two of the same words of what is waited for. The wait itself still
 * shows, as before; only the verdict about how they handle blockers leaves it out.
 */
const STOP = new Set(['the', 'for', 'and', 'that', 'this', 'with', 'from', 'some', 'into', 'about', 'their', 'them', 'they', 'have', 'been', 'being', 'will', 'would', 'payment', 'paid', 'waiting', 'wait', 'confirmation', 'confirm', 'answer', 'update']);
const REFERENCE = /\b[A-Z]{2,}-?\d+\b/g;
const wordsOf = (t: string) => String(t ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w));

export function aWaitSomebodyElseChases(what: string, othersChase: readonly string[]): boolean {
  const refs = new Set((String(what ?? '').toUpperCase().match(REFERENCE) ?? []).map((r) => r.replace('-', '')));
  const own = new Set(wordsOf(what));
  return othersChase.some((t) => {
    const theirRefs = (String(t ?? '').toUpperCase().match(REFERENCE) ?? []).map((r) => r.replace('-', ''));
    if (refs.size && theirRefs.some((r) => refs.has(r))) return true;
    if (refs.size && theirRefs.length) return false;
    const shared = wordsOf(t).filter((w) => own.has(w));
    return new Set(shared).size >= 2;
  });
}
