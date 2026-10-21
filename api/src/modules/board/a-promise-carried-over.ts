/**
 * A PROMISE CARRIED OVER, THREE CHECK-INS RUNNING (Hafsah's standing decision 5, as changed on 18 October: "Keep counting a
 * carried-over promise towards three in a row, but word it as what happened, for example 'Promised three check-ins running, still
 * not done', not as three separate events.").
 *
 * Joseph said he would bring Mercy the samples for Tuskys Westgate on 12 October, again on 13 October ("I forgot the samples I
 * promised Mercy. I'll take them on Thursday."), and again on 14 October ("Not yet, I'm taking them tomorrow."), and Mercy's wait
 * on him is still open. The board said "Nothing has come up three check-ins in a row yet." From the record only: an open wait on a
 * colleague, and that colleague's own last three check-ins, each with a line or an answer of theirs that says they will still do
 * it. Said about the work, never as a label on the person.
 */
export interface APromiseCarriedOver {
  participantId: string;
  waitId: string;
  /** "The samples for Tuskys Westgate, promised three check-ins running, still not done." */
  says: string;
}

const STOP = new Set(['the', 'for', 'and', 'that', 'this', 'with', 'from', 'some', 'units', 'unit', 'promised', 'answer', 'price']);
const wordsOf = (t: string) => String(t ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
/** The thing's own words ("samples"), never the customer's name or a common word. */
function namesTheThing(text: string, what: string, notThese: readonly string[]): boolean {
  const skip = new Set(notThese.flatMap((n) => wordsOf(n)));
  const own = wordsOf(what).filter((w) => w.length >= 4 && !STOP.has(w) && !skip.has(w));
  const said = wordsOf(text);
  return own.some((w) => said.some((x) => x.slice(0, 5) === w.slice(0, 5)));
}
const STILL_TO_DO = /\b(?:I['’]ll|I will|I am going to|I['’]m going to|I['’]m taking|I am taking|I['’]m bringing|tomorrow|on (?:monday|tuesday|wednesday|thursday|friday))\b/i;

export function thePromisesCarriedOver(
  waits: readonly { id: string; fromParticipantId: string | null; onParticipantId: string | null; what: string | null; status: string; clearedAt?: Date | string | null }[],
  checkIns: readonly { id: string; participantId: string; status: string; isSetup?: boolean | null; completedAt: Date | string | null }[],
  lines: readonly { participantId: string | null; checkInId?: string | null; text: string }[],
  turns: readonly { checkInId: string; role?: string | null; content: string | null }[],
  dealNames: readonly string[],
): APromiseCarriedOver[] {
  const out: APromiseCarriedOver[] = [];
  const seen = new Set<string>();
  for (const w of waits) {
    if (!w.onParticipantId || w.onParticipantId === w.fromParticipantId || String(w.status).toUpperCase() === 'CLEARED' || w.clearedAt) continue;
    const what = String(w.what ?? '').trim();
    if (!what) continue;
    const key = `${w.onParticipantId}|${wordsOf(what).filter((x) => x.length >= 4 && !STOP.has(x)).sort().join(' ')}`;
    const theirs = checkIns
      .filter((c) => c.participantId === w.onParticipantId && String(c.status).toUpperCase() === 'COMPLETED' && !c.isSetup && c.completedAt)
      .sort((a, b) => new Date(a.completedAt as any).getTime() - new Date(b.completedAt as any).getTime());
    const lastThree = theirs.slice(-3);
    if (lastThree.length < 3) continue;
    const saidItIn = (c: { id: string }) => {
      if (lines.some((l) => l.participantId === w.onParticipantId && l.checkInId === c.id && namesTheThing(l.text, what, dealNames) && STILL_TO_DO.test(l.text))) return true;
      /* Or an answer of theirs, to a question that named the thing ("Did you take them?" "Not yet, I'm taking them tomorrow."). */
      const here = turns.filter((t) => t.checkInId === c.id);
      return here.some((t, i) => String(t.role ?? '').toUpperCase() === 'PERSON' && STILL_TO_DO.test(String(t.content ?? ''))
        && (namesTheThing(String(t.content ?? ''), what, dealNames) || (i > 0 && String(here[i - 1].role ?? '').toUpperCase() !== 'PERSON' && namesTheThing(String(here[i - 1].content ?? ''), what, dealNames))));
    };
    /*
     * ONLY A PROMISE THEY MADE THEMSELVES (engine test, Drop Access, week of 12 October). Grace waited on Kevin, Mercy, Joseph and Peter
     * for "proof of what is real on his deals". Each was asked about proof in each check-in and answered with a plan for something else
     * ("I'll follow up with Jane first thing tomorrow morning"), and the weekly report said of all four "Proof of what is real on his
     * deals, promised three check-ins running, still not done", and "Kevin Omondi promised it three check-ins running". Kevin never
     * promised it: it was Grace's wait on him. A wait counts as their carried-over promise only where, at least once, their own words
     * name the thing and say they will do it.
     */
    const theirOwnWords = [
      ...lines.filter((l) => l.participantId === w.onParticipantId).map((l) => l.text),
      ...turns.filter((t) => String(t.role ?? '').toUpperCase() === 'PERSON' && theirs.some((c) => c.id === t.checkInId)).map((t) => String(t.content ?? '')),
    ];
    const promisedItThemselves = theirOwnWords.some((t) => namesTheThing(t, what, dealNames) && STILL_TO_DO.test(t));
    if (!promisedItThemselves || !lastThree.every(saidItIn) || seen.has(key)) continue;
    seen.add(key);
    const thing = what.charAt(0).toUpperCase() + what.slice(1).replace(/[.\s]+$/, '');
    out.push({ participantId: w.onParticipantId, waitId: w.id, says: `${thing}, promised three check-ins running, still not done.` });
  }
  return out;
}
