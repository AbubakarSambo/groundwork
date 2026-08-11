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

/** Words that are capitalised in normal prose and are nobody's name. */
const NOT_A_NAME = new Set([
  'I', 'You', 'We', 'They', 'It', 'The', 'A', 'An', 'And', 'But', 'So', 'That',
  'This', 'What', 'When', 'Where', 'Who', 'Why', 'How', 'Your', 'Yours', 'My',
  'Okay', 'OK', 'Got', 'Understood', 'Thank', 'Thanks', 'Good', 'Both', 'Before',
  'Session', 'Groundwork', 'Is', 'Was', 'Can', 'Does', 'Do', 'If', 'For', 'To',
  'In', 'On', 'At', 'One', 'Two', 'Not', 'No', 'Yes', 'There', 'Here', 'Now',
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
    if (words.some((w) => norm(w).length >= 4 && said.includes(norm(w)))) {
      out.push(candidate);
      continue;
    }
    out.push(candidate);
  }
  return [...new Set(out)];
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
  let out = reply;

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
