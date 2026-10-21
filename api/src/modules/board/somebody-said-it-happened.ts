/**
 * SOMEBODY SAID IT HAPPENED (messages test, 19 October, finding 4, the board's part).
 *
 * Wanjiru said on Monday 12 October "I will draft the reply and ensure it is filed by Friday.", and on Tuesday Brian said "The reply in
 * Kasarani Foods v. Tumaini Traders was filed today." Her board said, Tuesday to Friday, "nobody has said whether it happened". Only she
 * moves her own promise, so it stays open; this finds the line where somebody else in the check-in said the thing happened, so the board
 * can say who said it and what, instead of "nobody".
 *
 * READ FROM THE RECORD, NEVER GUESSED, AND NO MODEL. A line counts where it was said after the promise, by somebody other than the person
 * who made it, as what happened (a PROGRESS line), and one of its sentences names the thing the promise is about (a word of the promise
 * other than the verb that says it happened) and says it happened ("was filed", "sent", "signed"), with nothing in that sentence saying it
 * has not, or will.
 */
export interface APromiseToRead { participantId: string | null; text: string; status: string; createdAt: Date | string }
export interface ALineToRead { participantId: string | null; type?: string | null; text: string; createdAt?: Date | string | null }

const FORMS: Record<string, string> = {
  filed: 'file', sent: 'send', delivered: 'deliver', signed: 'sign', paid: 'pay', submitted: 'submit', lodged: 'lodge', served: 'serve',
  brought: 'bring', given: 'give', gave: 'give', done: 'do', did: 'do', finished: 'finish', completed: 'complete', approved: 'approve',
  shared: 'share', returned: 'return', drafted: 'draft', issued: 'issue', held: 'hold', set: 'set', made: 'make', closed: 'close',
};
const IT_HAPPENED = /\b(?:filed|sent|delivered|signed|paid|submitted|lodged|served|brought|given|gave|done|finished|completed|approved|shared|returned|issued|held|closed)\b/i;
const NOT_YET = /\b(?:not|never|no|yet|will|would|should|could|might|may|must|shall|going to|need to|needs to|hope|plan|planned|until|unless|if|before)\b|n't\b|\b(?:I|he|she|they|we)'ll\b/i;
const LITTLE = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'these', 'those', 'will', 'shall', 'would', 'can', 'could', 'need', 'needs', 'have', 'has',
  'had', 'was', 'were', 'are', 'its', 'their', 'our', 'your', 'his', 'her', 'them', 'they', 'you', 'ensure', 'sure', 'make', 'going', 'try',
  'today', 'tomorrow', 'week', 'next', 'friday', 'monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday', 'end', 'day', 'all',
]);
const words = (t: string) => String(t ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/)
  .map((w) => w.replace(/'(?:ll|s|re|ve|d|m)$/, '').replace(/'/g, '')).filter(Boolean);
const aForm = (w: string) => FORMS[w] ?? w.replace(/([^s])s$/, '$1');
/* "Kasarani Foods v. Tumaini Traders" is one sentence. */
const sentences = (t: string) => String(t ?? '').replace(/\[[^\]]*\]/g, '').split(/(?<!\b(?:v|vs|V|Vs|Mr|Mrs|Ms|Dr)\.)(?<=[.;!?])\s+/).map((s) => s.trim()).filter(Boolean);

export function aLineThatSaysItHappened<L extends ALineToRead>(c: APromiseToRead, lines: readonly L[]): L | null {
  if (String(c.status).toUpperCase() !== 'UNKNOWN' || !c.participantId) return null;
  const made = new Date(c.createdAt).getTime();
  const thing = new Set(words(c.text).filter((w) => w.length >= 3 && !LITTLE.has(w)).map(aForm));
  if (!thing.size) return null;
  const after = lines
    .filter((l) => l.participantId && l.participantId !== c.participantId && String(l.type ?? 'PROGRESS').toUpperCase() === 'PROGRESS' && l.createdAt && new Date(l.createdAt).getTime() > made)
    .sort((a, b) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime());
  for (const l of after) {
    const says = sentences(l.text).some((s) => {
      const m = s.match(IT_HAPPENED);
      if (!m || NOT_YET.test(s)) return false;
      const verb = aForm(m[0].toLowerCase());
      return words(s).map(aForm).some((w) => w !== verb && thing.has(w));
    });
    if (says) return l;
  }
  return null;
}
