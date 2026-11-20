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

import { withoutAGuessedPronoun } from './no-guessed-pronoun-for-a-named-person';
import { OneQuestionPerTurn } from './one-question-per-turn';
import { asAnExample } from './a-turn-asks-one-thing';
import { claimsTheNumbersDoNotSupport } from './a-claim-the-numbers-do-not-support';
import { namesWorthReporting, restoreTheirWords } from './the-record-holds-what-was-said';
import { inYourPerson } from './their-words-in-your-person';

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
    /* A full stop inside a word is not the end of a sentence: "mpesa-kilele-hotel.pdf is the M-Pesa message" was cut after "hotel.",
       and Kevin read "The mpesa-kilele-hotel.That counts as proof for that deal." (final real-model check, item 17). */
    if (ch === '.' && end === i + 1 && end < text.length && /[\p{L}\d]/u.test(text[end]) && i > start && /[\p{L}\d_-]/u.test(text[i - 1])) continue;
    /* Nor after a title or a short form: "Mr. Kiprop" was cut into "Mr" and "Kiprop", and Grace read "Kevin and Joseph are on installations, and
       Mr Before we finish" (polish round 3). */
    if (ch === '.' && /(?:^|[^\p{L}])(?:Mr|Mrs|Ms|Dr|Prof|St|Mt|Jr|Sr|v|vs|No|Ltd|Co|Inc|etc)$/u.test(text.slice(Math.max(start, i - 6), i))) continue;
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
  check: 'a name nobody said' | 'a number nobody said' | 'called the reader by name' | "called the reader by somebody else's name" | 'a second question' | 'an apology' | 'a pronoun with nobody named' | 'a number claim the record does not support' | "a quote of the lead's brief";
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
/**
 * A DAY OF THE MONTH IS NOT A FIGURE SOMEBODY INVENTED.
 *
 * The other half of the fault that ate the date sentences. With months no longer read as names,
 * "End of the year, so 31 December 2026?" was still deleted - now for the 31 and the 2026, as
 * figures nobody had said. And they had not said them: the whole point of that sentence is that
 * the product worked the date out from "end of the year" and is showing them its reading so they
 * can confirm it. See sayTheDateAndCheckIt, which says exactly that in its own header.
 *
 * So a number that is part of a date is left alone. Everything else this check exists for - a
 * target, a count, a percentage, a figure attached to somebody's work - is untouched, because
 * inventing one of those is the fault it was built to catch.
 */
const PART_OF_A_DATE = (sentence: string, raw: string): boolean => {
  const at = sentence.indexOf(raw);
  if (at < 0) return false;
  /*
   * ADJACENT, NOT MERELY NEARBY. A window of a few words caught "Three transfers waited 45 minutes
   * on 2 September" and let the 45 through as part of the date, which is exactly the kind of figure
   * this check exists to catch. The month or day has to be touching the number, with nothing
   * between them but the words a date is written with.
   */
  const JOINING = "(?:\\s+(?:of|the)){0,2}\\s*,?\\s*";
  const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";
  const DAY = "(?:mon|tues?|wednes|thurs?|fri|satur|sun)day";
  const before = sentence.slice(0, at);
  const after = sentence.slice(at + raw.length);

  /* "31 December", "5th of January", "22nd," */
  if (new RegExp(`^(?:st|nd|rd|th)?${JOINING}(?:${MONTH}|${DAY})\\b`, 'i').test(after)) return true;
  /* "December 31", "Friday the 25th" */
  if (new RegExp(`\\b(?:${MONTH}|${DAY})${JOINING}$`, 'i').test(before)) return true;
  /* "by the 5th", "on the 22nd" - an ordinal introduced the way a deadline is written. */
  if (/^(?:st|nd|rd|th)\b/i.test(after) && /\b(?:by|on|before|after|until|since)\s+(?:the\s+)?$/i.test(before)) return true;
  /* A four-digit year, which in this product's sentences is only ever a year. */
  if (/^(?:19|20)\d\d$/.test(raw)) return true;
  return false;
};

export function numbersNobodySaid(sentence: string, known: string[]): string[] {
  const table = known.join(' ').replace(/[^0-9]+/g, ' ');
  const have = new Set(table.split(' ').filter(Boolean));
  const out: string[] = [];
  for (const raw of sentence.match(/\d[\d,.:]*\d|\d/g) ?? []) {
    if (PART_OF_A_DATE(sentence, raw)) continue;
    if (/^\d+$/.test(raw) && new RegExp(`(^|\\s)${raw}[.)](\\s|$)`).test(sentence)) continue;
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits || have.has(digits)) continue;
    const parts = raw.split(/[,.:]/).map((x) => x.replace(/[^0-9]/g, '')).filter(Boolean);
    if (parts.length > 1 && parts.every((x) => have.has(x))) continue;
    out.push(raw);
  }
  return [...new Set(out)];
}

/**
 * AN APOLOGY IS DROPPED. "My apologies, that was unclear." "My mistake." Both seen live, in consecutive
 * turns, to somebody who was confused by a question the product asked badly. The sentence goes; the
 * rest of the turn stands.
 */
const AN_APOLOGY = /^\s*(my apologies|apologies|sorry|so sorry|i apologi[sz]e|my mistake|my bad)\b/i;

/**
 * A PRONOUN WITH NOBODY NAMED. "What would you want him to point to?" with no him anywhere. The
 * sentence is dropped when it leans on him/his/her/hers and neither the reply nor the conversation so
 * far names a person or a role a person could be. Only singular third-person pronouns: "them" and
 * "their" name clients, teams and things far too often to check.
 */
const A_LONE_PRONOUN = /\b(him|his|her|hers|himself|herself)\b/i;
const A_ROLE = /\b(the )?(new hire|new starter|lead|manager|colleague|teammate|partner|client|candidate|co-?founder|report|director|head of [a-z]+|person (running|setting) this)\b/i;
function somebodyIsNamed(text: string): boolean {
  if (A_ROLE.test(text)) return true;
  const caps = text.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  return caps.some((w) => !NOT_A_NAME_FOR_PRONOUNS.has(w));
}
const NOT_A_NAME_FOR_PRONOUNS = new Set(['The', 'What', 'When', 'Where', 'Who', 'Why', 'How', 'That', 'This', 'These', 'Those', 'You', 'Your', 'Yes', 'Okay', 'Less', 'More', 'Let', 'And', 'But', 'Then', 'Now', 'One', 'Two', 'Not', 'Before', 'After', 'Once', 'Since', 'Which', 'Something', 'Nothing', 'Everyone', 'Nobody', 'Somebody', 'Success', 'Session', 'Groundwork']);
export function pronounWithNobodyNamed(sentence: string, saidSoFar: string[]): boolean {
  if (!A_LONE_PRONOUN.test(sentence)) return false;
  if (somebodyIsNamed(sentence)) return false;
  return !saidSoFar.some((t) => somebodyIsNamed(t));
}

export function whyItFails(
  sentence: string,
  personSaid: string[],
  readerName?: string | null,
  /* The conversation so far, both voices. The roster is in personSaid for the name check and must
     NOT count as an antecedent: a name on the roster is not a name in the conversation. */
  conversation?: string[],
): Omit<Hit, 'sentence'> | null {
  if (AN_APOLOGY.test(sentence)) return { check: 'an apology', offending: [sentence.trim().split(/[.,!]/)[0]] };
  if (conversation && pronounWithNobodyNamed(sentence, conversation)) return { check: 'a pronoun with nobody named', offending: [(sentence.match(A_LONE_PRONOUN) ?? [''])[0]] };
  const names = namesWorthReporting(sentence, personSaid);
  if (names.length) return { check: 'a name nobody said', offending: names };
  if (callsTheReaderByName(sentence, readerName)) return { check: 'called the reader by name', offending: [readerName ?? ''] };
  const somebodyElse = callsTheReaderSomebodyElse(sentence);
  if (somebodyElse) return { check: 'called the reader by somebody else\'s name', offending: [somebodyElse] };
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

/**
 * AND THE READER CALLED BY SOMEBODY ELSE'S NAME, WHICH IS WORSE.
 *
 * Read on a live check-in, 11 September. The participant was Bisi Adeyemi. The check-in opened:
 *
 *   "You're the Finance Manager, Dele, and you currently own supplier management."
 *
 * Dele is the person who set the check-in up. The model has every name in the check-in in its
 * context and attached the wrong one to the person it was addressing, in the second sentence of
 * their own session. Telling somebody they are a different colleague, on the screen where they are
 * about to say how it is going in their own words, is the clearest possible signal that nothing here is really
 * about them.
 *
 * The rule above catches the reader's OWN name. This catches every other one, and the two together
 * say the same thing: a reply written to somebody addresses them as "you" and attaches no name at
 * all. Any name in apposition to "you" is wrong, whoever it belongs to, so this does not need to
 * know who the reader is - which is what makes it reliable.
 *
 * NARROW ON PURPOSE. Only a name set off by a comma next to a second-person address - the vocative.
 * "You mentioned that Daniel routes escalations to you" is a legitimate sentence about somebody
 * else and is left alone.
 */
const A_NAME_IN_APPOSITION_TO_YOU =
  /(?:\b[Yy]ou\b|\b[Yy]ou're)[^.?!]{0,40}?,\s*([A-Z][a-z]{2,})\s*(?=[,.?!]|$)|^([A-Z][a-z]{2,}),\s*[Yy]our?\b/;

function callsTheReaderSomebodyElse(sentence: string): string | null {
  const m = A_NAME_IN_APPOSITION_TO_YOU.exec(sentence);
  const name = m?.[1] ?? m?.[2] ?? null;
  if (!name) return null;
  /* Words that open a clause and look like a name. A vocative is a name, not a connective. */
  const NOT_A_NAME = /^(And|But|So|Then|That|This|These|Those|What|When|Where|Which|While|With|Your|Yours|The|They|There|Now|Here|Some|Both|Each|Not|Nothing|Nobody|Once|Only|Since|Because|Before|After|Given|Read|Same|Say|See|Still|Take|Tell|They|Though|Try|Until|Very|Yes|No)$/;
  return NOT_A_NAME.test(name) ? null : name;
}

/**
 * WHETHER THIS GATE DELETES WHAT IT FINDS, OR ONLY WRITES IT DOWN.
 *
 * FALSE, decided by Hafsah on 17 September 2026, after reading what deletion actually does on a
 * screen. Asked for examples and finally given them, she got a reply with its middle cut out and an
 * unclosed quotation mark, because "Those" is capitalised and she had not typed it. Before that the
 * same gate deleted month names, day numbers, and her own places and people.
 *
 * WHAT IT IS GUARDING, READ HONESTLY. These are QUESTIONS, not the record. The record is built from
 * what the person typed, and no sentence here ever reaches it. So the worst case from a name
 * slipping into a question is an awkward question the person corrects in one line. The worst case
 * from deleting is a mangled half-sentence at the moment the product was being useful. Those costs
 * are not close, and we had been paying the larger one to avoid the smaller.
 *
 * IT STILL WATCHES. Every hit is still found, still counted and still logged with its check and the
 * offending words, so a week of real conversations answers the question this switch exists for: if
 * the log fills with real inventions, the deleting comes back with the evidence to aim it properly;
 * if it fills with "Those" and "Kano", the whole gate goes. Measured, rather than argued about.
 */
export const DELETES_WHAT_IT_FINDS = false;

export function screen(reply: string, personSaid: string[], readerName?: string | null, conversation?: string[]): Screened {
  /* Their own words restored, then said back in the right person. See their-words-in-your-person. */
  const repaired = inYourPerson(restoreTheirWords(reply, personSaid), personSaid);
  const dropped: string[] = [];
  const hits: Hit[] = [];
  const kept: string[] = [];
  /* One per reply, never shared between them. See one-question-per-turn.ts. */
  const questions = new OneQuestionPerTurn();

  let turnSoFar = '';
  for (const raw of intoSentences(repaired)) {
    const sentence = withoutAGuessedPronoun(raw, turnSoFar, personSaid, readerName);
    turnSoFar += raw;
    const why = whyItFails(sentence, personSaid, readerName, conversation);
    if (why) {
      dropped.push(sentence);
      hits.push({ sentence, ...why });
      if (DELETES_WHAT_IT_FINDS) continue;
    } else if (questions.isASecondQuestion(sentence)) {
      /* A second question standing on its own. The person answers the last thing they were asked,
         so the first ask is what gets lost - and a turn that reads as a list is answered as one. */
      dropped.push(sentence);
      hits.push({ sentence, check: 'a second question', offending: [] });
      if (DELETES_WHAT_IT_FINDS) continue;
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
  private turnSoFar = '';
  private readonly droppedSentences: string[] = [];
  private readonly hitRows: Hit[] = [];
  /* Stateful across the whole stream, because each sentence is judged with no view of the rest. */
  private readonly questions = new OneQuestionPerTurn();

  constructor(
    private readonly personSaid: string[],
    /** Who is reading. See callsTheReaderByName - their own name never belongs in a reply to them. */
    private readonly readerName?: string | null,
    /** The conversation so far, for the pronoun check. See whyItFails. */
    private readonly conversation?: string[],
    /**
     * What the person has said, this session and before, for the number-claim check. Unlike the
     * checks above this one DELETES: "you are past the N40m target" to somebody at N26m is not a
     * suspicion to be logged, it is arithmetic, and it was said to a live person twice (adversarial
     * run 2, 20 Sep 2026). Only the person's own words, never the prompt's.
     */
    private readonly theirWordsForNumbers?: string[],
    /**
     * A sentence that may never go out as it is written: one that quotes the lead's brief to a participant
     * (decision 75, item 13, the-leads-brief-is-never-quoted-to-them). What streams is what is saved.
     */
    private readonly neverSaid?: (sentence: string) => boolean,
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
      let repaired = inYourPerson(restoreTheirWords(s, this.personSaid), this.personSaid);
      repaired = withoutAGuessedPronoun(repaired, this.turnSoFar + out.join(''), this.personSaid, this.readerName);
      this.turnSoFar += s;
      const why = whyItFails(repaired, this.personSaid, this.readerName, this.conversation ? [...this.conversation, ...out] : undefined);
      if (why) {
        this.droppedSentences.push(s);
        this.hitRows.push({ sentence: s, ...why });
        if (DELETES_WHAT_IT_FINDS) continue;
      } else if (this.questions.isASecondQuestion(repaired)) {
        this.droppedSentences.push(s);
        this.hitRows.push({ sentence: s, check: 'a second question', offending: [] });
        /*
         * WHAT STREAMS IS WHAT IS SAVED. The saved turn keeps one question (see a-turn-asks-one-thing),
         * so the stream does the same as it goes: an example written as a question goes out as an
         * example, and a second real question does not go out. Otherwise the person reads a
         * question on the screen that is gone when the reply is replaced by the saved one.
         */
        const said = asAnExample(repaired, false);
        if (!said) continue;
        repaired = said;
      }
      if (this.neverSaid?.(repaired)) {
        this.droppedSentences.push(s);
        this.hitRows.push({ sentence: s, check: "a quote of the lead's brief", offending: [] });
        continue;
      }
      if (this.theirWordsForNumbers) {
        const bad = claimsTheNumbersDoNotSupport(repaired, { theirWords: this.theirWordsForNumbers });
        if (bad.length) {
          this.droppedSentences.push(s);
          this.hitRows.push({ sentence: s, check: 'a number claim the record does not support', offending: bad.map((b) => b.why) });
          continue;
        }
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
 * WHAT IS SAID WHEN THE SCREEN LEFT NOTHING OF A REPLY. On the turn that closes there is nothing to ask again (the close that follows is
 * written from what is saved), so it is a thank-you; a bare acknowledgement is "Noted."; anything else asks again. (Fix plan 16 November, group 2:
 * Joel and Mary were told "That did not come out right" in front of the close, with an empty box under it.)
 */
export function whatIsSaidWhenNothingIsLeft(o: { closing: boolean; acknowledgement: boolean }): string {
  return o.closing ? 'Thank you.' : o.acknowledgement ? 'Noted.' : ASK_AGAIN;
}

/**
 * WHAT THE MODEL IS TOLD WHEN IT IS ASKED AGAIN. Named, not described: "you wrote 30 August" lets
 * it see the exact thing. And the way out is always the same: ask about it rather than state it.
 */
export function askInsteadOfInventing(hits: Hit[]): string {
  const named = [...new Set(hits.flatMap((h) => h.offending).filter(Boolean))];
  const what = named.length ? named.map((n) => `"${n}"`).join(', ') : 'something nobody in this conversation said';
  return `YOUR LAST REPLY WAS NOT SHOWN. It used ${what}, which appears nowhere in what this person wrote, in who is in this check-in, or in anything shared with them. Do not state names, dates or figures they have not given you. If you need one, ask for it. Write the reply again.`;
}

/*
 * 'noted, not removed' is what every hit is now, because the gate stopped deleting - see
 * DELETES_WHAT_IT_FINDS. The older outcomes stay in the type so a log from before this change still
 * reads, and so that turning deletion back on needs no change here.
 */
export type HitOutcome =
  | 'noted, not removed'
  | 'nothing came back'
  | 'dropped live'
  | 'regenerated, clean'
  | 'regenerated, still hit'
  | 'whole reply, asked again';

/** One greppable log line per hit, so the real rate can be read before anything is tuned. */
export function hitLogLine(checkInId: string, hit: Hit, outcome: HitOutcome): string {
  return `invention-gate check-in=${checkInId} check=${JSON.stringify(hit.check)} offending=${JSON.stringify(hit.offending)} outcome=${JSON.stringify(outcome)} sentence=${JSON.stringify(hit.sentence.trim())}`;
}

/**
 * DROPPING THE SECOND QUESTION IS THE WHOLE REPAIR. ASKING AGAIN IS NOT.
 *
 * Any hit at all sent the whole reply back to be written again. Measured on forty-one people
 * answering at once, a quarter of turns hit "a second question" and every one of them paid for a
 * second model call, doubling that person's wait for a fault the screen had already fixed.
 *
 * The two kinds of hit are not the same problem. An invented name or figure has to go, and taking
 * the sentence out can leave the reply saying nothing, so it is worth asking again with the fault
 * named. A second question is a sentence that should not have been there: the first question stands
 * on its own, the reply still reads whole, and the person still has exactly one thing to answer.
 * There is nothing a fresh ask can add.
 *
 * It also had a cost nobody was counting: a second reply that comes back worse is thrown away, so
 * every one of those turns bought a slower answer and kept the first one anyway.
 */
export function needsAFreshAsk(hits: Hit[]): boolean {
  return hits.some((h) => h.check !== 'a second question');
}
