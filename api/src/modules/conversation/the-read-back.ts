/**
 * THE READ-BACK AT THE END OF A CHECK-IN (Hafsah's approval of the plan, 2 November 2026: "a read-back at the end of every setup and
 * check-in ('Here's what I recorded… Anything wrong?'), fixed in one reply").
 *
 * When the check-in reaches its close, the conversation is assessed there and then, and what the person reads back is that assessment,
 * as the person may read it (theFactsIn with 'the person': their own items, never the lead's judgement): the one source every page reads.
 * The close is held once for it (closeHeldAt). Their next reply is read by the model with THE_READ_BACK_WAS_GIVEN: a fix is a claim like
 * any other, checked against the record, proof asked for naturally when it is missing, and said back plainly; then it closes, and the
 * assessment written at the close holds the corrected fact, so every page shows it and it is never said again.
 *
 * Their own words are quoted as they typed them, so nothing is reworded on the way back.
 */
import type { TheAssessment } from './the-assessment';
import { theFactsIn } from './the-facts-on-record';

/* What somebody would recognise as what they told us. Who was named, and what Groundwork means to ask next time, are not things they said. */
const SAID_BACK = new Set(['workUpdates', 'claims', 'promises', 'numbers', 'dates', 'decisions', 'blockers', 'corrections', 'documents', 'targets', 'everythingElse', 'compared.promisesDue', 'compared.figuresChanged', 'compared.workMoved']);

const quoted = (words: string): string => {
  const w = words.replace(/\s+/g, ' ').trim().replace(/^["“]|["”]$/g, '');
  return /[.!?]$/.test(w) ? `“${w}”` : `“${w}.”`;
};

/** The read-back, in full sentences, or null when the assessment holds nothing of theirs to say back. */
export function theReadBack(a: TheAssessment | null): string | null {
  if (!a) return null;
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const f of theFactsIn(a, { kind: 'the person', participantId: a.about.participantId })) {
    if (!SAID_BACK.has(f.section) || !f.words.trim()) continue;
    const key = f.words.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const lead = f.section === 'promises' ? 'You promised' : 'You said';
    lines.push(`${lead} ${quoted(f.words)}${f.proved ? ' A document you added backs this.' : ''}`);
  }
  if (!lines.length) return null;
  return [THE_READ_BACK_OPENS, ...lines, THE_READ_BACK_ASKS].join('\n');
}

export const THE_READ_BACK_OPENS = 'Here’s what I recorded.';
export const THE_READ_BACK_ASKS = 'Is anything wrong? Tell me and I will put it right.';

/** Said to the model on the turns after the read-back. */
export const THE_READ_BACK_WAS_GIVEN = [
  'YOU HAVE SAID BACK WHAT WAS RECORDED AND ASKED WHETHER ANYTHING IS WRONG.',
  'If they say something is wrong, that is a correction, and a correction is a claim like any other: check it against what they said in this conversation and the record above.',
  'If it needs proof that is not here, ask for it once, naturally, without accusing anybody. Then say plainly, in one or two sentences, what you changed, and close with [[SESSION_COMPLETE]].',
  'If they say it is right, or have nothing to change, close now in one short sentence with [[SESSION_COMPLETE]]. If they add something new, take it and carry on.',
  'Never read the list back again.',
].join(' ');
