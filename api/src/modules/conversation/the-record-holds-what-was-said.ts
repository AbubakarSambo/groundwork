/**
 * THE RECORD HOLDS WHAT WAS SAID. (W2)
 *
 * From Hafsah's own walkthrough, session one of the first flow anybody meets:
 *
 *   she typed    "microchipshit and they were not happy so i had to step in"
 *   it wrote     "I have the client name: Microchip Solutions."
 *
 *   she typed    "They finally got a demo, after the team didnt do it and signed-up"
 *   it wrote     "that demo led directly to the client signing up ... that is
 *                 rescuing a sale"
 *
 * Two different faults that look like one.
 *
 * THE NAME is the worse of the two, because it is the promise. This product's
 * entire claim is that it holds what people said, and a model that silently
 * corrects a name has already broken it - quietly, helpfully, and in a way nobody
 * notices until a report quotes a company that does not exist. It is also the more
 * fixable: the person's own word is right there in the transcript.
 *
 * THE UPGRADE is the engine agreeing with the person it is interviewing. "They got
 * a demo and signed up" became "your intervention rescued a sale", which is a
 * causal claim she did not make, on a record that is hers, in a product whose
 * divergence machinery exists precisely to stop one account being written up as
 * established fact.
 *
 * WHY THIS IS CODE AND NOT A PROMPT LINE. Both faults are the model being helpful,
 * and no instruction has ever reliably stopped a model being helpful. The same
 * lesson twice already in this repo: anything that must not leak is stripped at
 * the read, not asked for in a prompt.
 */

/**
 * Words that are capitalised in normal prose and are nobody's name.
 *
 * Kept for the ones that appear MID-sentence - "..., I think", "..., The Hague" - where position
 * cannot help. The sentence-opener case it used to carry is handled positionally now: a list of
 * English words is a chore that is always one word out of date, and it was. Driving a check-in
 * produced "Starting" reported as an invented name, because nobody had added it yet.
 */
/**
 * A MONTH IS NOT A PERSON, AND THIS LIST NOT KNOWING THAT DELETED THE MOST IMPORTANT SENTENCE
 * THIS PRODUCT WRITES.
 *
 * Every capitalised word the person did not type is read here as a name somebody invented, and the
 * sentence carrying it is cut before anybody sees it. The list of exceptions had "And", "But",
 * "Session" and "Groundwork" in it, and no months and no days of the week. So:
 *
 *   "End of the year, so 31 December 2026?"        deleted
 *   "You said Friday. Which Friday?"               deleted
 *   "Is that by December, or by March?"            deleted
 *   "So the deadline is Monday the 5th."           deleted
 *   "What happens in January if the shops slip?"   deleted
 *
 * The first of those is the sentence she asked for by name and watched the product fail to produce
 * for two days. It was producing it. This was eating it. Six sentences went in one short setup
 * conversation, which is also why replies read truncated and why one turn arrived with no question
 * in it at all: the question was in a sentence that had been cut.
 *
 * Every one of these is a word a conversation about deadlines cannot avoid, and none of them is
 * ever somebody's name in the sense this check exists to catch - which is the product putting a
 * colleague's name into somebody's record that nobody typed.
 */
const A_DATE_NOT_A_PERSON = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'Mon', 'Tue', 'Tues', 'Wed', 'Thu', 'Thur', 'Thurs', 'Fri', 'Sat', 'Sun',
  'Today', 'Tomorrow', 'Yesterday', 'Tonight', 'Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2',
];

const NOT_A_NAME = new Set([
  'I', 'You', 'We', 'They', 'It', 'The', 'A', 'An', 'And', 'But', 'So', 'That',
  'This', 'What', 'When', 'Where', 'Who', 'Why', 'How', 'Your', 'Yours', 'My',
  'Okay', 'OK', 'Got', 'Understood', 'Thank', 'Thanks', 'Good', 'Both', 'Before',
  'Session', 'Groundwork', 'Is', 'Was', 'Can', 'Does', 'Do', 'If', 'For', 'To',
  'In', 'On', 'At', 'One', 'Two', 'Not', 'No', 'Yes', 'There', 'Here', 'Now',
  /*
   * AND THE REST OF THE ORDINARY WORDS A SENTENCE CAN START WITH.
   *
   * Read live, 17 September 2026: "Those are the shapes I'm looking for." was deleted from the
   * middle of a reply because "Those" is capitalised and nobody had typed it. The person was left
   * with a half-sentence and an unclosed quotation mark, mid-answer, after asking for examples.
   *
   * Every word here is a common word that only looks like a name because it opened a sentence.
   * This list is cheap to extend and the cost of a missing entry is a sentence deleted out of
   * somebody's reply, which is the worst failure this file has.
   */
  'Those', 'These', 'Each', 'Every', 'Some', 'Any', 'All', 'Most', 'Much', 'Many',
  'Either', 'Neither', 'Another', 'Other', 'Such', 'Same', 'Once', 'Just', 'Still',
  'Even', 'Also', 'Then', 'Than', 'Because', 'Since', 'While', 'After', 'Until',
  'From', 'With', 'Without', 'About', 'Against', 'Between', 'Under', 'Over',
  'Right', 'Nothing', 'Something', 'Anything', 'Everything', 'Nobody', 'Somebody',
  'Anyone', 'Everyone', 'Whatever', 'Whether', 'Which', 'Whose', 'Whom',
  'Say', 'Let', 'Tell', 'Take', 'Give', 'Make', 'Put', 'Keep', 'Try', 'Think',
  ...A_DATE_NOT_A_PERSON,
]);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Proper nouns the engine used that nobody typed.
 *
 * Deliberately conservative: a name counts as the person's if the letters they
 * typed appear inside it or it inside them, so "Microchip" against "microchipshit"
 * is a match and is left alone, while an invented "Solutions" half is caught.
 */
export function namesNobodySaid(reply: string, personSaid: string[]): string[] {
  const said = personSaid.map(norm).join(' ');
  const found = reply.match(/\b[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*\b/g) ?? [];
  const out: string[] = [];

  for (const raw of found) {
    // Strip leading sentence-openers so "Got it, Daisy" tests "Daisy".
    const words = raw.split(/\s+/).filter((w) => !NOT_A_NAME.has(w));
    if (!words.length) continue;
    const candidate = words.join(' ');
    const key = norm(candidate);
    if (key.length < 4) continue;
    if (said.includes(key)) continue;
    // Any single word of it that the person did type makes it theirs, mangled at
    // worst. "Microchip Solutions" against "microchipshit" is a partial match on
    // the first word and is not an invention, it is a tidy-up - still wrong, but
    // caught by the whole-phrase check below rather than reported twice.
    out.push(candidate);
  }
  return [...new Set(out)];
}

/**
 * THE SAME LIST, MINUS THE ONES THAT ARE ONLY CAPITALISED BECAUSE A SENTENCE STARTED.
 *
 * `namesNobodySaid` deliberately keeps them. It feeds `restoreTheirWords`, and there a false
 * positive is harmless - substitution only happens when a word of theirs is recognisably underneath,
 * so "Starting" matches nothing and nothing is changed. A false NEGATIVE there is what costs: a real
 * mangled name at the start of a sentence would stop being put back.
 *
 * I learned that by breaking it. Applying this filter inside `namesNobodySaid` fixed a noisy log and
 * silently stopped "Microchip Solutions signed up afterwards" being restored, because the name was
 * in first position. Their own report test caught it immediately.
 *
 * So the strictness differs by what the caller does with the answer. Reporting wants few false
 * positives, because a log nobody trusts is a log nobody reads. Repairing wants few false negatives,
 * because the cost lands on the page.
 */
export function namesWorthReporting(reply: string, personSaid: string[]): string[] {
  const out = new Set<string>();
  /* A colon introduces a clause, not a sentence: splitting on one would put "the client name:
     Microchip Solutions" in first position, which is the easiest place to hide the thing this is
     looking for. */
  for (const sentence of reply.split(/(?<=[.!?\n])\s+/)) {
    const opener = (sentence.trimStart().match(/^[A-Z][a-zA-Z0-9]*/) ?? [''])[0];
    for (const name of namesNobodySaid(sentence, personSaid)) {
      /*
       * Capitalised by grammar rather than by being a name - and a list of English words to exempt
       * is a chore that is always one word out of date. It was: "Starting".
       *
       * The opener is TRIMMED rather than the whole candidate dropped, because a run can begin with
       * one and continue into a real name: "Did Alex Smith get back to you" is exactly the fault
       * being looked for, and reporting it as "Did Alex Smith" makes the log read like a mistake in
       * the tool rather than a name that was invented.
       */
      const trimmed = name === opener ? '' : name.replace(new RegExp(`^${opener}\\s+`), '');
      /* "Did Hafsah reply?" arrives as one capitalised run, "Did Hafsah", which the person never
         typed as a phrase. Once the opener is off, what is left is checked against their words
         again: a name they did say is theirs, whatever word the sentence started with. */
      if (trimmed && !personSaid.map(norm).join(' ').includes(norm(trimmed))) out.add(trimmed);
    }
  }
  return [...out];
}

/**
 * THE SAME TIDY-UP, LOWERCASED, WHICH WALKED PAST THE CHECK ABOVE.
 *
 * `namesNobodySaid` looks for capitalised words, because that is what a proper noun is. Driving a
 * real check-in produced this: the person typed "microchipshit", and the reply came back as "the
 * microchip account". That is precisely the mangling the guard was written for - its own comment
 * uses that example - and it walked past, because the model wrote it in lower case.
 *
 * DETECTED, NOT SUBSTITUTED, and the difference is deliberate. Putting the longer word back would
 * be right for "microchip" and wrong for a person who typed "development" and got a sentence
 * containing "develop", where the substitution produces a grammatical error the model did not make.
 * Truncation is easy to spot and hard to repair safely, so this reports and leaves the sentence
 * alone, which at least makes the rate knowable.
 */
export function truncationsOfTheirWords(reply: string, personSaid: string[]): string[] {
  const words: string[] = personSaid.join(' ').toLowerCase().match(/[a-z][a-z0-9'-]*/g) ?? [];
  const said = new Set(words.filter((w) => w.length >= 8));
  if (!said.size) return [];

  const out = new Set<string>();
  for (const word of reply.toLowerCase().match(/[a-z][a-z0-9'-]*/g) ?? []) {
    if (word.length < 6) continue;
    /* A word they actually typed is theirs, however much it looks like a shortening of another. */
    if (said.has(word)) continue;
    for (const theirs of said) {
      if (theirs !== word && theirs.startsWith(word)) {
        out.add(`${word} (they typed "${theirs}")`);
        break;
      }
    }
  }
  return [...out];
}

/**
 * Put the person's word back.
 *
 * Restoring beats flagging, because a flag arrives after the sentence is already
 * on screen and the person has already read a company name they never typed. The
 * replacement is only made where a word of the invented phrase clearly came from
 * one of theirs, so the engine cannot be made to say something arbitrary.
 */
export function restoreTheirWords(reply: string, personSaid: string[]): string {
  const theirWords = personSaid.join(' ').match(/[A-Za-z][A-Za-z0-9'-]{3,}/g) ?? [];
  let out = theirSpellingOfAnAcronym(reply, personSaid);

  for (const invented of namesNobodySaid(reply, personSaid)) {
    const first = norm(invented.split(/\s+/)[0]);
    const theirs = theirWords.find((w) => {
      const n = norm(w);
      return n.length >= 4 && (n.startsWith(first) || first.startsWith(n)) && n !== first;
    });
    if (theirs) {
      out = out.split(invented).join(theirs);
    }
  }
  return out;
}

/**
 * Causal claims the person did not make.
 *
 * "They got a demo and signed up" and "the demo led directly to them signing up"
 * are different statements, and the second is the one a report can be built on.
 * The person said the first. Only they get to say the second.
 */
const A_CAUSAL_UPGRADE = [
  /\bled directly to\b/i,
  /\bresulted directly in\b/i,
  /\bbecause you (?:were there|stepped in|intervened)\b/i,
  /\byour intervention\b/i,
  /\brescu(?:ed|ing) (?:a |the )?(?:sale|deal|account|client)\b/i,
  /\bsaved the (?:sale|deal|account)\b/i,
  /\bthanks to you\b/i,
  /\bthat is not just\b/i,
];

/**
 * Whether a sentence claims a cause the transcript does not carry.
 *
 * A person who DID say "I closed it because I stepped in" keeps their claim - the
 * check is against their words, not against a vocabulary. What it stops is the
 * engine supplying the causation and then attributing it back to them.
 */
export function causalClaimNobodyMade(reply: string, personSaid: string[]): string[] {
  /**
   * PRONOUNS FLIP BETWEEN THE TWO SIDES OF A CONVERSATION, and the first version
   * of this check forgot it. She wrote "MY intervention is the only reason it
   * closed" and the engine wrote "YOUR intervention", so the echo check called
   * her own claim an invention. Same claim, different speaker, and the check is
   * about who made a claim rather than who is saying it now.
   */
  const said = personSaid.join(' ').toLowerCase()
    .replace(/\bmy\b/g, 'your').replace(/\bi\b/g, 'you').replace(/\bme\b/g, 'you');
  const out: string[] = [];
  for (const p of A_CAUSAL_UPGRADE) {
    const hit = reply.match(p);
    if (!hit) continue;
    // Their own causal language, echoed back, is theirs.
    if (said.match(p)) continue;
    out.push(hit[0]);
  }
  return out;
}

/**
 * What the engine says instead of agreeing.
 *
 * The useful move is not silence, it is the question - because the causal claim
 * might well be true, and the person is the only one who can put it on the record.
 */
export const ASK_INSTEAD_OF_CONCLUDING =
  'Ask whether the two things are connected rather than saying they are. "They signed up after the demo" is what the person said; "the demo is why they signed up" is a claim only they can make, and asking for it usually gets it.';

/**
 * SOMEBODY'S OWN SPELLING OF THEIR OWN ACRONYM.
 *
 * A person typed NABG - the trade body they work with - and the reply came back "NAB-G", inside a
 * question they were being asked to answer. The name guard did not catch it: NAB-G is not a person
 * and both spellings are made of letters the person used. It reads as the product not listening,
 * on the one screen whose claim is that it holds what somebody said.
 *
 * The rule is narrow on purpose. An all-capital run in the reply is compared with the all-capital
 * runs in what the person actually wrote, ignoring punctuation. Same letters, different
 * punctuation, and theirs wins. Different letters and nothing happens: this restores a spelling,
 * it never invents one.
 */
export function theirSpellingOfAnAcronym(reply: string, personSaid: string[]): string {
  const bare = (t: string) => t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const said = personSaid.join(' ').match(/\b[A-Z][A-Z0-9]{1,9}\b/g) ?? [];
  if (!said.length) return reply;
  const theirs = new Map<string, string>();
  for (const a of said) if (!theirs.has(bare(a))) theirs.set(bare(a), a);

  return reply.replace(/\b[A-Z][A-Za-z0-9]*(?:[-.\u2019']?[A-Z][A-Za-z0-9]*)+\b/g, (token) => {
    const mine = theirs.get(bare(token));
    /* Only where the letters match and the punctuation does not. */
    return mine && mine !== token ? mine : token;
  });
}
