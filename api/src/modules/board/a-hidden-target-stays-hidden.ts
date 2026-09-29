import { targetsFor } from './whose-number-is-whose-business';
/**
 * A TARGET THE LEAD HAS NOT SHARED STAYS WITH ITS OWNER, IN THE WORDS AS WELL AS THE NUMBERS.
 *
 * On a check-in where people see only their own targets (`whoSeesTargets: THEIR_OWN`, every ground
 * in the test database), the board already withholds another person's `target` and `count`. The
 * sentences did not know. Screens request 63, 28 September 2026: an admin who only reads was
 * served "Rukia set a target of four shops for Rukia's own work…" in the row about Rukia. And on
 * run-14's sales check-in Ngozi was served "Kwame Mensah is working towards a target of 14 approved
 * facilities this quarter" in her own report, and the same number in the aim on her board.
 *
 * So wherever the report's or the board's words are served, a sentence that gives a person's target
 * number is taken out for a reader who may not see that target. On a line that is about one person
 * only (their row), any sentence with their target number goes; elsewhere, a sentence goes when it
 * names them and gives the number. The sentence goes whole: a number cut out of a sentence leaves
 * a sentence that still says there is a number, and patching it would be writing something nobody
 * wrote. What the person did, and what is in their way, stays.
 */

export interface AHiddenTarget {
  /** The ways this person is named in what is served: full name, first name, a given name. */
  names: string[];
  target: number;
  /** Their participant id, so a row that carries it is known to be about them. */
  participantId?: string;
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS: Record<number, string> = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety' };

/*
 * THE NUMBER IN WORDS, AS PEOPLE SAY IT (29 September 2026). Only up to twenty (and the round tens)
 * were known, so "one hundred and twenty", "a hundred and twenty", "twelve hundred", "seventeen
 * thousand" and "5.2 million" all got through. This gives a pattern for every way of saying a whole
 * number up to the billions: "and" or not, "a hundred" or "one hundred", "twenty-one" or "twenty one".
 */
function wordsPattern(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) return null;
  if (n < 20) return WORDS[n];
  if (n < 100) {
    const t = Math.floor(n / 10) * 10;
    return n % 10 ? `${TENS[t]}[- ]?${WORDS[n % 10]}` : TENS[t];
  }
  const scale = (unit: number, word: string): string => {
    const head = Math.floor(n / unit);
    const rest = n % unit;
    const headWords = head === 1 ? '(?:one|a)' : wordsPattern(head);
    const joiner = rest < 100 ? '(?:,?\\s+and)?\\s+' : ',?\\s+(?:and\\s+)?';
    return `${headWords}\\s+${word}${rest ? `${joiner}${wordsPattern(rest)}` : ''}`;
  };
  if (n < 1000) return scale(100, 'hundred');
  if (n < 1e6) {
    const main = scale(1000, 'thousand');
    /* "twelve hundred" for 1200, as people say a figure between a thousand and ten thousand. */
    const hundreds = n < 10000 && n % 100 === 0 && n % 1000 !== 0 ? `|${WORDS[n / 100] ?? wordsPattern(n / 100)}\\s+hundred` : '';
    return `(?:${main}${hundreds})`;
  }
  if (n < 1e9) return scale(1e6, 'million');
  return scale(1e9, 'billion');
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* A figure standing alone: not inside a longer number or an id ("cm17x", "2026-09-17"), and not an
   ordinal ("the 17th" is a date, not a target). */
const figure = (f: string) => `(?<![\\p{L}\\d.,_-])${escape(f)}(?!\\d|[.,]\\d|st\\b|nd\\b|rd\\b|th\\b)`;
/* A word standing alone: not inside a longer word ("seventeenth" and "seventeen" are not the same). */
const word = (w: string) => `(?<![\\p{L}\\p{N}])${w}(?![\\p{L}\\p{N}])`;

/** Every way this number is written: in figures, with separators, shortened ("17k", "5.2m"), in words. */
function numberPatterns(n: number): RegExp[] {
  const out = [figure(String(n))];
  if (n >= 1000) out.push(figure(n.toLocaleString('en-US')));
  /* Shortened: thousands and millions, as a figure ("17k", "17 thousand", "5.2m", "5.2 million") or in words. */
  for (const [unit, short, long] of [[1e3, 'k', 'thousand'], [1e6, 'm|mn', 'million'], [1e9, 'bn|b', 'billion']] as [number, string, string][]) {
    if (n < unit) continue;
    const scaled = n / unit;
    const text = Number.isInteger(scaled) ? String(scaled) : Number.isInteger(scaled * 10) || Number.isInteger(scaled * 100) ? String(Number(scaled.toFixed(2))) : null;
    if (!text) continue;
    out.push(`(?<![\\p{L}\\d.,_-])${escape(text)}\\s?(?:${short})(?![\\p{L}\\p{N}])`, `(?<![\\p{L}\\d.,_-])${escape(text)}\\s+${long}(?![\\p{L}])`);
  }
  const w = wordsPattern(n);
  if (w) out.push(word(w));
  return out.map((p) => new RegExp(p, 'iu'));
}

/** Whether a sentence gives this number, in figures (with thousands separators) or in words. */
function givesTheNumber(sentence: string, n: number): boolean {
  return numberPatterns(n).some((re) => re.test(sentence));
}

/*
 * SENTENCES, AND LINES. A list written one item a line is split by line, so "- Kwame: 17" goes and
 * "- Ngozi: 12" stays. And a full stop between two digits ends nothing: "1.2 million" was split into
 * "1." and "2 million", and neither gave the number.
 */
const sentencesOf = (text: string): string[] =>
  (text.match(/[^\n]*(?:\n|$)/g) ?? [text])
    .filter((line) => line.length)
    .flatMap((line) => line.match(/(?:[^.!?\n]|[.](?=\d))+(?:[.!?]+|\n|$)[^\S\n]*\n?/g) ?? [line]);

/*
 * A NAME, HOWEVER IT IS SPELT HERE. `\b` does not know an accented letter is a letter, so "Zoë" was
 * never found, and "Zoe" written without the accent, or "N’Golo" with a curly apostrophe, is the
 * same person. Accents and apostrophes are evened out on both sides before looking.
 */
const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[’‘`´]/g, "'");
const namesIn = (h: AHiddenTarget, s: string) => {
  const text = plain(s);
  return h.names.some((name) => name && new RegExp(`(?<![\\p{L}\\p{N}])${escape(plain(name))}(?![\\p{L}\\p{N}])`, 'iu').test(text));
};

/** The text with every sentence that gives a hidden target taken out. */
export function withoutHiddenTargets(text: string, hidden: readonly AHiddenTarget[], opts: { aboutOnly?: AHiddenTarget; about?: readonly AHiddenTarget[] } = {}): string {
  if (!text || (!hidden.length && !opts.aboutOnly)) return text;
  const sentences = sentencesOf(text);
  /*
   * ANYWHERE IN THE SAME TEXT, OR THE SAME ROW. "This sentence or the one before" was a rule of thumb,
   * and tests got past it: a pronoun two sentences on ("He is waiting on legal. His target is 17"),
   * the number before the name ("A target of 17 is on record. It belongs to Kwame."), and a row whose
   * name is in one field and number in another ({ who: 'Kwame', finding: 'His target is 17' }). So a
   * person named anywhere in the text, or anywhere in the row it sits in, has every sentence with
   * their number taken out. It errs on the side of hiding: a sentence with the same number that
   * counts something else goes too. The structural fix, never giving the model someone else's hidden
   * target for text others read, is in docs/weekly-plan.md.
   */
  const inScope = hidden.filter((h) => (opts.about ?? []).includes(h) || namesIn(h, text));
  const kept = sentences.filter((s) => {
    if (opts.aboutOnly && givesTheNumber(s, opts.aboutOnly.target)) return false;
    return !inScope.some((h) => givesTheNumber(s, h.target));
  });
  if (kept.length === sentences.length) return text;
  return kept.join('').replace(/[^\S\n]{2,}/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

const NOT_WORDS = /^(?:id|.*Id|.*Ids|.*[Tt]oken|.*[Uu]rl|href|slug|email|.*At)$/;
/* Lists whose places mean something: a table's cells, columns or headers. */
const CELLS = /^(?:cells|columns|cols|headers|row|values)$/i;
/* Whether an entry has anything a person reads: a non-empty string, or a row with one in a field that is not an id. */
const hasWords = (x: any): boolean => (typeof x === 'string'
  ? !!x.trim()
  : !!x && typeof x === 'object' && !(x instanceof Date) && Object.entries(x).some(([k, y]) => !NOT_WORDS.test(k) && (typeof y === 'string' ? !!y.trim() : Array.isArray(y) || (!!y && typeof y === 'object' && !(y instanceof Date)) ? hasWords(y) : false)));

/** Each person's names as the words about them would use them: full name, first name, a name given. */
export function namesOnTheRoster(participants: readonly { id: string; nameGiven?: string | null; user?: { firstName?: string | null; lastName?: string | null } | null }[]) {
  return (pid: string): string[] => {
    const p = (participants ?? []).find((x) => x.id === pid);
    const first = (p?.user?.firstName ?? '').trim();
    const full = [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim();
    return [full, first, (p?.nameGiven ?? '').trim()].filter((n) => n && n.length > 1);
  };
}

/** The same, through every string in a served object. Dates and non-strings are left as they are. */
export function withoutHiddenTargetsIn<T>(value: T, hidden: readonly AHiddenTarget[]): T {
  if (!hidden.length) return value;
  /* Whose row this is: any of its own short string fields naming a person, or carrying their id. */
  const aboutWhom = (o: Record<string, any>, inherited: readonly AHiddenTarget[]): AHiddenTarget[] => {
    const own = Object.values(o).filter((x) => typeof x === 'string') as string[];
    const here = hidden.filter((h) => own.some((x) => (h.participantId && x === h.participantId) || (x.length <= 80 && namesIn(h, x))));
    return [...new Set([...inherited, ...here])];
  };
  const walk = (v: any, about: readonly AHiddenTarget[], key?: string): any => {
    if (typeof v === 'string') return withoutHiddenTargets(v, hidden, { about });
    if (v instanceof Date || v === null || typeof v !== 'object') return v;
    /* Only plain rows and lists are read; anything else (a Decimal, a Buffer) goes out as it came. */
    if (!Array.isArray(v) && ![Object.prototype, null].includes(Object.getPrototypeOf(v))) return v;
    /* A list is one text: a name in one of its strings and the number in another is still his number
       (['Kwame Mensah', 'Target: 17']). */
    if (Array.isArray(v)) {
      const strings = v.filter((x) => typeof x === 'string') as string[];
      const scope = strings.length ? [...new Set([...about, ...hidden.filter((h) => strings.some((x) => namesIn(h, x)))])] : about;
      const walked = v.map((x) => walk(x, scope));
      /*
       * A ROW OF CELLS KEEPS ITS COLUMNS; A LIST OF SENTENCES LOSES THE LINE. An agreement taken out
       * whole left an empty entry, and the report drew it as an empty bordered line and still counted
       * it ("3 things you already see the same way" over two). So in a list of sentences, an entry
       * this read emptied is dropped; in cells or columns it stays as an empty cell.
       */
      if (key && CELLS.test(key)) return walked;
      return walked.filter((x, i) => !(hasWords(v[i]) && !hasWords(x)));
    }
    const scope = aboutWhom(v, about);
    const out: Record<string, any> = {};
    /* An id, a link, an address or a time is not a sentence anybody reads: "cm17x" is not seventeen. */
    for (const [k, x] of Object.entries(v)) out[k] = typeof x === 'string' && NOT_WORDS.test(k) ? x : walk(x, scope, k);
    return out;
  };
  return walk(value, []);
}

/**
 * The targets this reader may not see. Everybody's when a target is its owner's alone, except the
 * reader's own; nobody's when the lead has shared targets with everybody, or when the reader runs
 * the check-in themselves (the lead set them).
 */
/**
 * A TARGET THAT LIVES ONLY IN THE LEAD'S WORDS ABOUT SOMEBODY IS STILL THEIR TARGET (29 September 2026).
 *
 * On a sales check-in the lead wrote each person's number into what they said about them ("Relationship
 * officer, Ikeja. Target 14 approved facilities this quarter.") and set no objective for it, so this
 * rule had nothing to take out: Femi read "Ngozi Eze is trying to get 14 new facilities approved and
 * have N42 million disbursed." on a check-in where each person sees only their own target. The numbers
 * in a sentence of the remit that speaks of a target are read as that person's targets, and go through
 * the same rule as an objective's. Only such sentences, so "first 90 days" is not taken for a target.
 */
const SPEAKS_OF_A_TARGET = /\b(?:targets?|aim(?:s|ing)?|goals?|quota|to (?:reach|hit|close|sell|get|win|sign|deliver|disburse))\b/i;
export function targetsInTheirRemit(text: string | null | undefined): number[] {
  const out: number[] = [];
  for (const sentence of String(text ?? '').split(/(?<=[.!?])\s+|\n+/)) {
    if (!SPEAKS_OF_A_TARGET.test(sentence)) continue;
    for (const m of sentence.matchAll(/(?<![\p{L}\d.,])[N₦$£€]?\s?(\d[\d,]*(?:\.\d+)?)\s?(k|thousand|m|mn|million|bn|billion)?(?![\p{L}\d])/giu)) {
      const base = Number(m[1].replace(/,/g, ''));
      if (!Number.isFinite(base)) continue;
      const unit = (m[2] ?? '').toLowerCase();
      const n = base * (unit === 'k' || unit === 'thousand' ? 1e3 : unit === 'm' || unit === 'mn' || unit === 'million' ? 1e6 : unit === 'bn' || unit === 'billion' ? 1e9 : 1);
      if (!unit && n >= 1900 && n <= 2100 && Number.isInteger(n)) continue;
      if (n >= 1 && !out.includes(n)) out.push(n);
    }
  }
  return out;
}

/** Each person's targets written only in the lead's words about them, as rows the rule below reads. */
export function targetsFromTheirRemits(
  people: readonly { id: string; roleAsDescribed?: string | null; remitAsGiven?: string | null; partyType?: string | null }[] | null | undefined,
): { ownerParticipantId: string; target: number }[] {
  return (people ?? [])
    .filter((p) => p?.id && p.partyType !== 'INITIATOR')
    .flatMap((p) => [...new Set([...targetsInTheirRemit(p.remitAsGiven), ...targetsInTheirRemit(p.roleAsDescribed)])]
      .map((target) => ({ ownerParticipantId: p.id, target })));
}

export function targetsHiddenFrom(
  reader: { participantId: string | null; isTheLead: boolean },
  whoSeesTargets: string | null | undefined,
  objectives: readonly { ownerParticipantId: string | null; target: number | null }[],
  namesOf: (participantId: string) => string[],
  /** The people on the check-in, so a target written only in the lead's words about them counts too. */
  people?: readonly { id: string; roleAsDescribed?: string | null; remitAsGiven?: string | null; partyType?: string | null }[],
): AHiddenTarget[] {
  objectives = [...(objectives ?? []), ...targetsFromTheirRemits(people)];
  /* The one rule for whose number a reader may see (whose-number-is-whose-business). Whatever it does
     not show this reader is hidden in the words too. */
  const all = (objectives ?? []).map((o, i) => ({ name: String(i), target: o.target, ownerParticipantId: o.ownerParticipantId }));
  const shown = new Set(targetsFor(all, reader.participantId, whoSeesTargets === 'EVERYBODY' ? 'everybody' : 'their own', { isLead: reader.isTheLead }).shown.map((t) => t.name));
  return all
    .filter((t) => !shown.has(t.name) && t.ownerParticipantId && typeof t.target === 'number')
    .map((t) => ({ names: namesOf(t.ownerParticipantId as string).filter(Boolean), target: t.target as number, participantId: t.ownerParticipantId as string }))
    .filter((h) => h.names.length);
}
