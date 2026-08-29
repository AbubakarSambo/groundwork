/**
 * NOTHING INVENTED REACHES A PERSON.
 *
 * The instruction was "stop hallucinations completely", and the honest version of that is not a
 * better model - it is a rule that no text containing an invention is ever shown. The model may
 * invent as often as it likes; what it invents does not arrive.
 *
 * SO THE UNIT IS THE SENTENCE, not the reply and not the word.
 *
 * Dropping the whole reply for one bad clause throws away three good sentences and leaves somebody
 * staring at nothing. Editing the offending words out mid-sentence leaves prose that reads as
 * though the engine lost its train of thought - which the causal-claim guard next door refuses to
 * do, for the same reason. A sentence is the smallest thing that can be removed and leave what
 * remains readable.
 *
 * WHAT COUNTS AS INVENTED here is narrower than what `namesNobodySaid` reports and that is
 * deliberate. Substitution runs first: a mangled version of their own word is REPAIRED, not dropped,
 * because putting their word back is strictly better than losing the sentence. Only what cannot be
 * repaired - a name with nothing of theirs underneath it - reaches this.
 */
import { namesWorthReporting, restoreTheirWords } from './the-record-holds-what-was-said';

/**
 * Sentence boundaries, keeping the terminator AND the space after it.
 *
 * Written as a loop rather than a split, because every split that reads well drops the separator -
 * and the pieces here get joined back together and shown to somebody. Losing the spaces turns
 * "One. Two." into "One.Two." on every reply, which is the kind of defect that survives review
 * because the test that would catch it is the one nobody writes.
 */
export function intoSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '.' && ch !== '!' && ch !== '?' && ch !== '\n') continue;
    let end = i + 1;
    /* Take the run of terminators and the whitespace after them, so "Really?! Next" splits once. */
    while (end < text.length && '.!?'.includes(text[end])) end++;
    while (end < text.length && (text[end] === ' ' || text[end] === '\t')) end++;
    out.push(text.slice(start, end));
    start = end;
    i = end - 1;
  }
  if (start < text.length) out.push(text.slice(start));
  return out.filter((s) => s.length > 0);
}

export type Screened = {
  /** What may be shown. Possibly shorter than what came in, possibly empty. */
  text: string;
  /** The sentences that did not survive, for the log. Never shown to anybody. */
  dropped: string[];
};

/**
 * Repair what can be repaired, drop what cannot.
 *
 * Returning an EMPTY string when everything was invented is a real answer and the caller has to
 * handle it - which is the point. A screen that quietly passes something through rather than
 * returning nothing is how "completely" turns back into "usually".
 */
export function screen(reply: string, personSaid: string[]): Screened {
  const repaired = restoreTheirWords(reply, personSaid);
  const dropped: string[] = [];
  const kept: string[] = [];

  for (const sentence of intoSentences(repaired)) {
    if (namesWorthReporting(sentence, personSaid).length) {
      dropped.push(sentence);
      continue;
    }
    kept.push(sentence);
  }

  /* Already carry their own spacing, so joining with nothing is right - joining with a space would
     double every gap and break the line breaks in a list. */
  return { text: kept.join('').trim(), dropped };
}

/**
 * A STREAM THAT ONLY EMITS SENTENCES IT HAS CHECKED.
 *
 * The gap this closes: the check-in streams word by word, so until now text appeared on screen
 * before anything had inspected it, and a repair at the end could only correct what somebody had
 * already read. There is no way to un-send a delta.
 *
 * So nothing leaves until a sentence is complete. The cost is a sentence of latency rather than a
 * word, which is the whole price of the guarantee - and it is paid on every reply, not only the bad
 * ones. That is the trade, taken deliberately.
 */
export class SentenceGate {
  private buffer = '';
  private readonly droppedSentences: string[] = [];

  constructor(private readonly personSaid: string[]) {}

  /** Feed a delta. Returns whatever complete, checked sentences are now safe to send. */
  push(delta: string): string {
    this.buffer += delta;

    /*
     * Only sentences that are definitely FINISHED. A trailing fragment stays in the buffer, because
     * checking half a sentence would pass a name that the other half turns into an invention - and
     * because emitting a fragment is the thing this exists to stop.
     */
    const parts = intoSentences(this.buffer);
    if (parts.length <= 1) return '';

    const complete = parts.slice(0, -1);
    this.buffer = parts[parts.length - 1];
    return this.check(complete);
  }

  /** The last fragment, once the model has stopped. */
  flush(): string {
    const rest = this.buffer;
    this.buffer = '';
    return rest ? this.check(intoSentences(rest)) : '';
  }

  get dropped(): string[] {
    return [...this.droppedSentences];
  }

  private check(sentences: string[]): string {
    const out: string[] = [];
    for (const s of sentences) {
      const repaired = restoreTheirWords(s, this.personSaid);
      if (namesWorthReporting(repaired, this.personSaid).length) {
        this.droppedSentences.push(s);
        continue;
      }
      out.push(repaired);
    }
    return out.join('');
  }
}

/**
 * WHAT SOMEBODY SEES WHEN EVERYTHING WAS INVENTED.
 *
 * Rare, and it has to be handled rather than left to produce an empty bubble. It is deliberately not
 * an apology and not an error: from the person's side nothing went wrong, the assistant simply asks
 * again. Telling them the model hallucinated is both alarming and useless to them.
 */
export const ASK_AGAIN = 'That did not come out right. Say that again and I will pick it up.';
