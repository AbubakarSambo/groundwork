/**
 * THE THING TWO PEOPLE NAMED AND NEITHER OF THEM KNOWS THE OTHER NAMED.
 *
 * The workplan scenario's right answer: the plan comes to 141% of the budget because two leads
 * have both costed the same design contractor for the same eight weeks. Neither knows. A right
 * answer catches the double-count rather than trimming both plans by a fifth.
 *
 * It is plainly in the record, in both accounts, in their own words:
 *
 *   Chidi Eze:      "34k of that specifically allocated to Studio Lune for the brand refresh,
 *                    starting in October for eight weeks."
 *   Sara Lindqvist: "Studio Lune is booked and confirmed."
 *
 * And the judgement never saw it, because the judgement is built from one written paragraph per
 * person, and only one of the two paragraphs mentioned Studio Lune. A rule telling the model to
 * read across the blocks cannot help: the fact is not in the blocks.
 *
 * THIS IS ARITHMETIC AND NO MODEL TOUCHES IT. It reads the records, finds the names that appear in
 * more than one person's, and says who named each. Whether that matters is the judgement's job;
 * noticing it is not a judgement at all, it is counting.
 *
 * WHY NOT `WorkMention`. That already exists and is a different thing: it records one participant
 * mentioning ANOTHER PARTICIPANT. A supplier, a customer, a chief executive outside the check-in -
 * the cases that actually explain these scenarios - are nobody in the room, so nothing was
 * watching for them.
 */

/** One thing named by two or more people, with who named it and what each of them said. */
export interface SomethingMoreThanOnePersonNamed {
  name: string;
  who: string[];
  /** One short passage per person, in their own words, exactly as they wrote them. */
  asSaid: { who: string; said: string }[];
}

/**
 * NOT A NAME, however it is capitalised. Months and days are dates. The rest are words that start
 * a sentence often enough that catching them would bury a real name in noise.
 */
const NOT_A_NAME = new Set([
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
  'november', 'december', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'the', 'this', 'that', 'these', 'those', 'there', 'then', 'they', 'their', 'them', 'it', 'its',
  'i', 'we', 'our', 'us', 'you', 'your', 'he', 'she', 'his', 'her', 'and', 'but', 'so', 'if', 'as',
  'at', 'by', 'for', 'from', 'in', 'of', 'on', 'to', 'with', 'what', 'when', 'where', 'which', 'who',
  'why', 'how', 'yes', 'no', 'ok', 'okay', 'well', 'also', 'both', 'each', 'every', 'all', 'some',
  'a', 'an', 'my', 'me', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must', 'shall',
  'q1', 'q2', 'q3', 'q4', 'eod', 'eow', 'asap', 'tbd', 'n/a',
]);

/** Where a name begins a sentence and is one word long, it is probably just a capital letter. */
const startsASentence = (text: string, at: number): boolean => {
  const before = text.slice(0, at).replace(/\s+$/, '');
  return before === '' || /[.!?]$/.test(before);
};

/*
 * A NAME AT THE START OF A SENTENCE, WHEN THE SAME NAME IS USED ELSEWHERE.
 *
 * Seen on the recognition scenario (fix6-4). Amara said "Victor worked closely with me on the
 * implementation" and "The migration of the existing users was a significant technical challenge
 * that Victor handled very well." Joseph said "Victor's backend script relies on the front-end
 * forms." Victor was not reported as named by both, because Joseph's only mention starts his
 * sentence, and a one-word capital at the start of a sentence is skipped as probably just a
 * capital letter.
 *
 * That rule stays for a word nobody uses anywhere else. But a word somebody in this check-in also
 * used in the middle of a sentence is a name, wherever it sits, and so is a word with a possessive
 * straight after it ("Victor's"). The words that take "'s" only as a contraction ("Let's",
 * "Here's") are left out of the possessive rule.
 */
const A_CONTRACTION_NOT_A_POSSESSIVE = new Set([
  'let', 'here', 'what', 'everyone', 'everybody', 'nobody', 'somebody', 'someone', 'anyone',
  'today', 'tomorrow', 'yesterday', 'one', 'nothing', 'everything', 'something', 'now',
]);

const aPossessiveFollows = (text: string, end: number): boolean => /^['’]s\b/.test(text.slice(end));

/** One-word names used in the middle of a sentence in this passage. */
export function oneWordNamesMidSentence(text: string): string[] {
  const out: string[] = [];
  const words = /\b([A-Z][a-z]+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = words.exec(text)) !== null) {
    if (NOT_A_NAME.has(m[1].toLowerCase()) || startsASentence(text, m.index)) continue;
    out.push(m[1]);
  }
  return out;
}

/*
 * AND A NAME USED AS A POSSESSIVE ANYWHERE IS A NAME EVERYWHERE IN THE CHECK-IN.
 *
 * fix6-5, the recognition scenario again. Joseph said "Victor's script was the hardest part of
 * this whole thing." Amara said "Victor, the contractor, was responsible for the migration
 * script." Neither used "Victor" in the middle of a sentence, so Amara's did not count and Victor
 * was still not reported as named by both. "Victor's" is as sure a sign of a name as a capital in
 * the middle of a sentence, so it goes into the same set.
 */
export function oneWordNamesAsPossessives(text: string): string[] {
  const out: string[] = [];
  const words = /\b([A-Z][a-z]+)(?=['\u2019]s\b)/g;
  let m: RegExpExecArray | null;
  while ((m = words.exec(text)) !== null) {
    const lower = m[1].toLowerCase();
    if (NOT_A_NAME.has(lower) || A_CONTRACTION_NOT_A_POSSESSIVE.has(lower)) continue;
    out.push(m[1]);
  }
  return out;
}

/**
 * Every name-shaped thing in one passage: capitalised runs, and acronyms like CEO or CFO.
 *
 * `usedElsewhere`, when given, is the one-word names seen mid-sentence anywhere in this check-in
 * (lower case). A one-word run at the start of a sentence then counts if it is one of them, or if a
 * possessive follows it. Without it, nothing changes: a sentence-start word is skipped.
 */
export function namesIn(text: string, usedElsewhere?: Set<string>): string[] {
  const out: string[] = [];
  /*
   * "of" and "the" join one name - Bank of Kenya, Friends of the Trust. "and" does not: it joins
   * two. With "and" in here, "Studio Lune and Acme Corp" came back as a single name that nobody
   * had said, and both real names were lost. Caught by a test, which is why it is written down.
   */
  const runs = /\b([A-Z][a-z]+(?:\s+(?:of|the)?\s*[A-Z][a-z]+){0,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = runs.exec(text)) !== null) {
    const name = m[1].replace(/\s+/g, ' ').trim();
    const oneWord = !name.includes(' ');
    if (oneWord && NOT_A_NAME.has(name.toLowerCase())) continue;
    if (oneWord && startsASentence(text, m.index)) {
      const lower = name.toLowerCase();
      const stillAName = !!usedElsewhere && (
        usedElsewhere.has(lower)
        || (aPossessiveFollows(text, m.index + m[1].length) && !A_CONTRACTION_NOT_A_POSSESSIVE.has(lower))
      );
      if (!stillAName) continue;
    }
    out.push(name);
  }
  const acronyms = /\b([A-Z]{2,6})\b/g;
  while ((m = acronyms.exec(text)) !== null) {
    if (!NOT_A_NAME.has(m[1].toLowerCase())) out.push(m[1]);
  }
  return out;
}

/** The shortest passage in `texts` that carries `name`, trimmed to something readable. */
function whereTheySaidIt(texts: string[], name: string): string | null {
  const lower = name.toLowerCase();
  const carrying = texts.filter((t) => t.toLowerCase().includes(lower));
  if (!carrying.length) return null;
  const shortest = carrying.sort((a, b) => a.length - b.length)[0].replace(/\s+/g, ' ').trim();
  return shortest.length <= 160 ? shortest : `${shortest.slice(0, 157)}...`;
}

/**
 * @param people each person's own record, in their own words.
 * @param alsoNotNames the names of the people in the check-in. Everybody names their own
 *   colleagues, so those match everywhere and say nothing.
 */
export function whatMoreThanOnePersonNamed(
  people: { who: string; texts: string[] }[],
  alsoNotNames: string[] = [],
): SomethingMoreThanOnePersonNamed[] {
  const banned = new Set<string>();
  for (const n of [...alsoNotNames, ...people.map((p) => p.who)]) {
    for (const part of String(n ?? '').split(/\s+/)) if (part) banned.add(part.toLowerCase());
    if (n) banned.add(String(n).toLowerCase());
  }

  /** name (lower) -> who named it, in the order the people were given. */
  const namedBy = new Map<string, { display: string; who: Set<string> }>();
  /* Every one-word name anybody here used mid-sentence or as a possessive, so the same word at a
     sentence start counts. The people in the check-in are never added: they say nothing here. */
  const usedElsewhere = new Set<string>();
  for (const p of people) {
    for (const t of p.texts) {
      for (const n of [...oneWordNamesMidSentence(t), ...oneWordNamesAsPossessives(t)]) {
        if (!banned.has(n.toLowerCase())) usedElsewhere.add(n.toLowerCase());
      }
    }
  }
  for (const p of people) {
    const mine = new Set<string>();
    for (const t of p.texts) for (const n of namesIn(t, usedElsewhere)) mine.add(n);
    for (const n of mine) {
      const key = n.toLowerCase();
      if (banned.has(key)) continue;
      if (key.split(' ').every((w) => banned.has(w))) continue;
      const row = namedBy.get(key) ?? { display: n, who: new Set<string>() };
      row.who.add(p.who);
      namedBy.set(key, row);
    }
  }

  const out: SomethingMoreThanOnePersonNamed[] = [];
  for (const [, row] of namedBy) {
    if (row.who.size < 2) continue;
    const who = [...row.who];
    const asSaid = who
      .map((w) => ({ who: w, said: whereTheySaidIt(people.find((p) => p.who === w)!.texts, row.display) }))
      .filter((x): x is { who: string; said: string } => !!x.said);
    out.push({ name: row.display, who, asSaid });
  }
  /* Most people first: a thing three people named matters more than one two people named. */
  return out.sort((a, b) => b.who.length - a.who.length || a.name.localeCompare(b.name));
}

/** The section for the judgement's material. Empty where nothing is shared, so nothing is padded. */
export function namedByMoreThanOne(shared: SomethingMoreThanOnePersonNamed[]): string {
  if (!shared.length) return '';
  const lines = ['NAMED BY MORE THAN ONE PERSON, WHO MAY NOT KNOW THE OTHERS NAMED IT'];
  for (const s of shared.slice(0, 8)) {
    lines.push(`  ${s.name} - named by ${s.who.join(' and ')}`);
    for (const q of s.asSaid) lines.push(`      ${q.who}: "${q.said}"`);
  }
  return lines.join('\n');
}
