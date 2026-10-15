import { theShortNameOf } from './a-title-is-not-a-first-name';

/**
 * A NAME IS SAID ONCE, NOT TWICE IN A ROW (item 18, the project board, 2 October 2026).
 *
 * The report is written in labels, and the model sometimes puts the person's name after the label as
 * well: "Put Participant B, Kwabena Mensah, and Participant D, Samuel Aryee, in a room together". Once
 * the label becomes the name, and a later mention is shortened, Tunde read "Put Kwabena Mensah,
 * Kwabena, and Samuel Aryee, Samuel, in a room together" and "Yemi Adeyinka, Yemi, delivered ...".
 *
 * Where a person's name is followed straight away, after a comma, by their name again (in full or
 * short), the second one goes, with the comma that closed it: "Put Kwabena Mensah and Samuel Aryee in
 * a room together". Only the same person's own name is removed, so nothing is lost and nobody else is
 * touched.
 */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function aNameSaidTwiceInARow(text: string, names: Iterable<string>): string {
  if (!text) return text;
  let out = text;
  const people = [...new Set([...names].map((n) => (n ?? '').trim()).filter((n) => n.split(/\s+/).length >= 1 && n.length > 1))]
    .sort((a, b) => b.length - a.length);
  for (const full of people) {
    const short = theShortNameOf(full);
    const forms = [...new Set([full, short].filter(Boolean))].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
    /* "Kwabena Mensah, Kwabena," and "Kwabena, Kwabena Mensah," both become "Kwabena Mensah". */
    const twice = new RegExp(`(?<![\\w])(${forms}),\\s+(${forms})(?![\\w])(,(?=\\s))?`, 'g');
    out = out.replace(twice, (_m: string, a: string, b: string) => (a.length >= b.length ? a : b));
  }
  return out;
}

/**
 * AND A NAME IS SAID ONCE IN A SENTENCE ABOUT THAT PERSON (run-25: 406 sentences said one name twice, up from 362).
 *
 * The report is written in labels, and a label has no pronoun, so the model writes it again where a person would
 * not: "Participant C is concerned that the targets have not been progressed, and Participant C has not reviewed
 * progress since then." Named, the lead read "Nadia Haddad is concerned ..., and Nadia has not reviewed progress since
 * then.", "Grace Oyelaran took a loan to get a freezer for Grace's business." and "Musa says it is not Musa's job to
 * get the machine". Two shapes are said once, and only in a sentence that opens with that person doing something:
 *
 *  - The same person again as the subject of a joined clause ("..., and Nadia has", "but Mei is") loses the name,
 *    because the clause shares the sentence's own subject: "Nadia Haddad is concerned ..., and has not reviewed
 *    progress since then." Not where somebody else is named before it, who the clause could then be about.
 *  - The same person's name again as an owner ("Grace's business") is "their own", once, and "the" after that:
 *    "Grace Oyelaran took a loan to get a freezer for their own business." No pronoun that says a man or a woman
 *    is ever guessed.
 *
 * Everything else is left as it was. Never inside a quotation: the caller runs outside quotes.
 */
const REPORTING_VERBS = '(?:says|said|thinks|thought|believes|feels|felt|notes|noted|reports|reported|explains|explained|states|stated|adds|added|mentions|mentioned|worries|admits|admitted|expects|knows|knew|fears|doubts|claims|claimed)';

/** The verb after "they" instead of a name: "does" is "do", "knows" is "know". Words that do not change are left alone. */
export function forTheyAfterAName(verb: string): string {
  const v = verb.replace(/’/g, "'");
  const fixed: Record<string, string> = {
    does: 'do', has: 'have', is: 'are', was: 'were', "doesn't": "don't", "hasn't": "haven't", "isn't": "aren't", "wasn't": "weren't",
  };
  if (fixed[v] !== undefined) return fixed[v];
  if (/^(can|cannot|will|would|could|should|may|might|must|did|had|do|have|are|were|didn't|hadn't|won't|wouldn't|couldn't|shouldn't|can't|not|never|also|still|only|just|always|already)$/.test(v)) return verb;
  if (/ies$/.test(v)) return `${v.slice(0, -3)}y`;
  if (/(sses|shes|ches|xes|zes)$/.test(v)) return v.slice(0, -2);
  if (/s$/.test(v) && !/(ss|us|is)$/.test(v) && v.length > 3) return v.slice(0, -1);
  return verb;
}

export function aNameSaidAgainInOneSentence(text: string, names: Iterable<string>): string {
  if (!text) return text;
  const people = [...new Set([...names].map((n) => (n ?? '').trim()).filter((n) => n.length > 1))].sort((a, b) => b.length - a.length);
  if (!people.length) return text;
  const formsOf = (full: string) => [...new Set([full, theShortNameOf(full)].filter(Boolean))].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
  return text.split(/(?<=[.!?])(\s+)/).map((sentence) => {
    for (const full of people) {
      const forms = formsOf(full);
      /*
       * ONLY WHERE NOBODY ELSE IS IN THE SENTENCE (review of the judgement prompt, 5 October 2026). With a second person
       * there ("Amina Yusuf said, about Tobi Adewale, that Amina would send the sheets"), "they" could mean either, so
       * the name is said again instead. With one person only, "they" stays, as request 129 item 6 asked: it cannot be
       * anybody else. The reader as "you" does not count as a second person here: "Dr Amina Bello says they told you
       * this" cannot be read as "you" (a-name-after-says-is-said-once).
       */
      const others = people.filter((p) => p !== full).flatMap((p) => [p, theShortNameOf(p)]).filter((n) => n && n.length > 1);
      const somebodyElseIsHere = others.some((o) => new RegExp(`(?<![\\p{L}])${escapeRe(o)}(?![\\p{L}])`, 'u').test(sentence));
      if (somebodyElseIsHere) continue;
      /* "Aisha says that for refunds, Aisha closes the ticket" is "Aisha says that for refunds, they close the ticket" (request 129 item 6). */
      sentence = sentence.replace(
        new RegExp(`(?<![\\p{L}])((?:${forms})\\s+${REPORTING_VERBS}(?:\\s+that)?\\s+(?:[^,.;]{2,40}),\\s+)(?:${forms})\\s+(\\p{Ll}[\\p{L}'’]*)`, 'gu'),
        (_m: string, start: string, verb: string) => `${start}they ${forTheyAfterAName(verb)}`,
      );
      /* "Tobi says that Tobi does not know ..." and "Hauwa Ibrahim says Hauwa told ..." are "... says that they do not know ...", wherever in the
         sentence they stand, with or without "that": no he or she is guessed (run-29: 27 of them, in six scenarios). */
      sentence = sentence.replace(
        new RegExp(`(?<![\\p{L}])((?:${forms})\\s+${REPORTING_VERBS}(?:\\s+that)?\\s+)(?:${forms})\\s+(\\p{Ll}[\\p{L}'’]*)`, 'gu'),
        (_m: string, start: string, verb: string) => `${start}they ${forTheyAfterAName(verb)}`,
      );
    }
    for (const full of people) {
      const forms = formsOf(full);
      const opens = new RegExp(`^\\s*(?:${forms})(?=\\s+\\p{Ll})`, 'u').exec(sentence);
      if (!opens) continue;
      const others = people.filter((p) => p !== full).flatMap((p) => [p, theShortNameOf(p)]).filter((n) => n && n.length > 1);
      const somebodyElseBefore = (upTo: number) => others.some((o) => new RegExp(`(?<![\\p{L}])${escapeRe(o)}(?![\\p{L}])`, 'u').test(sentence.slice(0, upTo)));
      let out = sentence.replace(
        new RegExp(`(,?\\s+(?:and|but)\\s+)(?:${forms})\\s+(?=\\p{Ll})`, 'gu'),
        (m: string, joint: string, offset: number) => (offset > opens[0].length && !somebodyElseBefore(offset) ? joint : m),
      );
      let owned = 0;
      out = out.replace(
        new RegExp(`(?<=\\s)(?:${forms})['’]s\\s+(?=\\p{Ll})`, 'gu'),
        (m: string, offset: number) => {
          if (offset <= opens[0].length || somebodyElseBefore(offset)) return m;
          owned += 1;
          return owned === 1 ? 'their own ' : 'the ';
        },
      );
      return out;
    }
    return sentence;
  }).join('');
}
