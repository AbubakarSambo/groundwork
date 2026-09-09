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

import { OneQuestionPerTurn } from './one-question-per-turn';
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
  /** Why each one went, and the word or figure that did it. */
  hits: Hit[];
};

export type Hit = {
  sentence: string;
  check: 'a name nobody said' | 'a number nobody said' | 'called the reader by name' | 'a second question';
  offending: string[];
};

/**
 * A NUMBER NOBODY SAID IS AN INVENTION TOO.
 *
 * The name check has been on the stream since the first invented colleague. Numbers went
 * unchecked, and a made-up "30 August" travels the same road: reply, extractor, record row, tile.
 * So every run of digits in a sentence is looked for in what is already on the table, digits only,
 * so "2,000" matches "2000" and "2am" matches "2". A list marker ("1." on its own) is not a claim
 * and is let through.
 */
export function numbersNobodySaid(sentence: string, known: string[]): string[] {
  const table = known.join(' ').replace(/[^0-9]+/g, ' ');
  const have = new Set(table.split(' ').filter(Boolean));
  const out: string[] = [];
  for (const raw of sentence.match(/\d[\d,.:]*\d|\d/g) ?? []) {
    if (/^\d+$/.test(raw) && new RegExp(`(^|\\s)${raw}[.)](\\s|$)`).test(sentence)) continue;
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits || have.has(digits)) continue;
    const parts = raw.split(/[,.:]/).map((x) => x.replace(/[^0-9]/g, '')).filter(Boolean);
    if (parts.length > 1 && parts.every((x) => have.has(x))) continue;
    out.push(raw);
  }
  return [...new Set(out)];
}

export function whyItFails(
  sentence: string,
  personSaid: string[],
  readerName?: string | null,
): Omit<Hit, 'sentence'> | null {
  const names = namesWorthReporting(sentence, personSaid);
  if (names.length) return { check: 'a name nobody said', offending: names };
  if (callsTheReaderByName(sentence, readerName)) return { check: 'called the reader by name', offending: [readerName ?? ''] };
  const numbers = numbersNobodySaid(sentence, personSaid);
  if (numbers.length) return { check: 'a number nobody said', offending: numbers };
  return null;
}

/**
 * Repair what can be repaired, drop what cannot.
 *
 * Returning an EMPTY string when everything was invented is a real answer and the caller has to
 * handle it - which is the point. A screen that quietly passes something through rather than
 * returning nothing is how "completely" turns back into "usually".
 */

/**
 * THE READER'S OWN NAME, SAID BACK AT THEM IN THE THIRD PERSON.
 *
 * Read on a live check-in: "Does she face the same choice?" - asked of the person it was about, who
 * was the only person in the conversation. The model has the party labels in its context and does
 * not reliably know which of them is the one reading, so it writes about the reader as though they
 * were being discussed rather than addressed.
 *
 * The prompt already forbids it - "address them directly as you and your, never by name" - and the
 * prompt is not where this belongs. An instruction is a request; this is a check at the door.
 *
 * NOT PART OF THE INVENTED-NAME RULE, deliberately. That rule asks whether a name appears in what
 * the person said, and the reader's own name usually does - they sign off with it, they quote a
 * message that has it in. So it passes that test every time. This one does not consult what was
 * said at all: their name is wrong in a reply written TO them regardless of who typed it.
 *
 * WHAT IT DOES NOT CATCH is the bare pronoun in "does SHE face the same choice", because a reply
 * may legitimately be about another party in the check-in and no test on the sentence alone tells
 * the two apart. Only the name, which is unambiguous.
 */
function callsTheReaderByName(sentence: string, readerName?: string | null): boolean {
  const name = (readerName ?? '').trim();
  /* A first name only, and never a short one: "Al" or "Jo" collide with ordinary words, and a
     dropped sentence costs the person a question. */
  const first = name.split(/\s+/)[0] ?? '';
  if (first.length < 3) return false;
  /* Case-sensitive on the capital, so a person called Grace does not lose "handled with grace". */
  return new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(sentence);
}

export function screen(reply: string, personSaid: string[], readerName?: string | null): Screened {
  const repaired = restoreTheirWords(reply, personSaid);
  const dropped: string[] = [];
  const hits: Hit[] = [];
  const kept: string[] = [];
  /* One per reply, never shared between them. See one-question-per-turn.ts. */
  const questions = new OneQuestionPerTurn();

  for (const sentence of intoSentences(repaired)) {
    const why = whyItFails(sentence, personSaid, readerName);
    if (why) {
      dropped.push(sentence);
      hits.push({ sentence, ...why });
      continue;
    }
    /* A second question standing on its own. The person answers the last thing they were asked, so
       the first ask is what gets lost - and a turn that reads as a list is answered as a list. */
    if (questions.isASecondQuestion(sentence)) {
      dropped.push(sentence);
      hits.push({ sentence, check: 'a second question', offending: [] });
      continue;
    }
    kept.push(sentence);
  }

  /* Already carry their own spacing, so joining with nothing is right - joining with a space would
     double every gap and break the line breaks in a list. */
  return { text: kept.join('').trim(), dropped, hits };
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
  private readonly hitRows: Hit[] = [];
  /* Stateful across the whole stream, because each sentence is judged with no view of the rest. */
  private readonly questions = new OneQuestionPerTurn();

  constructor(
    private readonly personSaid: string[],
    /** Who is reading. See callsTheReaderByName - their own name never belongs in a reply to them. */
    private readonly readerName?: string | null,
  ) {}

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

  get hits(): Hit[] {
    return [...this.hitRows];
  }

  private check(sentences: string[]): string {
    const out: string[] = [];
    for (const s of sentences) {
      const repaired = restoreTheirWords(s, this.personSaid);
      const why = whyItFails(repaired, this.personSaid, this.readerName);
      if (why) {
        this.droppedSentences.push(s);
        this.hitRows.push({ sentence: s, ...why });
        continue;
      }
      if (this.questions.isASecondQuestion(repaired)) {
        this.droppedSentences.push(s);
        this.hitRows.push({ sentence: s, check: 'a second question', offending: [] });
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

/**
 * WHAT THE MODEL IS TOLD WHEN IT IS ASKED AGAIN. Named, not described: "you wrote 30 August" lets
 * it see the exact thing. And the way out is always the same: ask about it rather than state it.
 */
export function askInsteadOfInventing(hits: Hit[]): string {
  const named = [...new Set(hits.flatMap((h) => h.offending).filter(Boolean))];
  const what = named.length ? named.map((n) => `"${n}"`).join(', ') : 'something nobody in this conversation said';
  return `YOUR LAST REPLY WAS NOT SHOWN. It used ${what}, which appears nowhere in what this person wrote, in who is in this check-in, or in anything shared with them. Do not state names, dates or figures they have not given you. If you need one, ask for it. Write the reply again.`;
}

export type HitOutcome = 'dropped live' | 'regenerated, clean' | 'regenerated, still hit' | 'whole reply, asked again';

/** One greppable log line per hit, so the real rate can be read before anything is tuned. */
export function hitLogLine(checkInId: string, hit: Hit, outcome: HitOutcome): string {
  return `invention-gate check-in=${checkInId} check=${JSON.stringify(hit.check)} offending=${JSON.stringify(hit.offending)} outcome=${JSON.stringify(outcome)} sentence=${JSON.stringify(hit.sentence.trim())}`;
}
