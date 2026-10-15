/**
 * THE LEAD HAS A NAME, AND A CONVERSATION USES IT.
 *
 * "Mei, the person who set this up wants to understand what it's actually like to work here right
 * now" was the first line Mei read (openread, run 10 of the twenty-four scenarios). The setup block
 * now hands the model the lead's first name (see setup-already-asked-this), and this is the part
 * that does not rely on the model having read it: before a turn is saved, the label is swapped for
 * the name, or for "your lead" where there is none.
 *
 * THE LABELS IT WAS ACTUALLY SEEN TO USE. Counted over every turn written to somebody other than the
 * lead in runs 8, 9, 10 and 12: "the person who set this up" (7), "your lead" (9, most of them on
 * the loans check-in, where the lead is Amaka: "what you name here is what your lead will read"),
 * "the lead" as the subject of a sentence ("The lead expects you to fully manage five client
 * relationships"), and "the person who opened this check-in for you, Michael Achebe". Standard
 * point 1: "It uses the lead's name."
 *
 * NARROW ON PURPOSE. "Lead" is also a sales lead, and "take the lead" is an ordinary phrase, so
 * "the lead" and "your lead" are swapped only where a person is plainly meant: followed by what a
 * person does (expects, wants, will read, has set, is back) or by what a person has (the lead's
 * expectation). "Your manager" is left alone: it is usually somebody's own manager, who is not
 * always the person running this check-in. "The initiator" and "Participant A" are the report's
 * words and the prompt never hands them to a conversation.
 *
 * Never inside quotation marks, which are the person's own words and stay as they were typed. Where
 * the lead has no name, "the person who set this up" becomes "your lead", and "your lead" and "the
 * lead" stay as they are.
 *
 * The third place a person is plainly meant is where a record is said to go to them: "This record
 * goes to your lead", "this record is for your lead to understand".
 */

const THE_LABEL = /\b(the|The) person who (?:set this up|set up this check-in|opened this check-in|opened this|runs this check-in|is running this check-in|started this check-in|asked for this check-in)(?: for you)?(?:,\s*([A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*){0,3}),(?=\s))?/g;

/* What a person does, said of the lead. Not "is" or "has" alone: "the lead is warm" is a sales lead. */
const A_PERSON_DOES = "(?:wants|wanted|would like|expects|expected|said|says|asked|asks|has asked|has set|set|sets|has named|named|needs|reads|will read|will see|would see|sees|mentioned|has mentioned|described|wrote|has written|thinks|knows|agreed|confirmed|shared|is back|is away|is looking|is hoping|is asking|hopes|believes|told you|will know|gets a clear picture|gets to see)";
/* What a person has, said of the lead. */
const A_PERSON_HAS = "(?:expectation|expectations|view|brief|words|question|questions|note|notes|concern|concerns|decision|read|picture|hope|worry)";
/* And where a record goes to them: "This record goes to your lead", "this record is for your lead to understand". */
const GOES_TO = '(?<=\\b(?:goes|go|going|sent|shown|given|passed|shared) to )';
const IS_FOR = '(?<=\\bfor )';
const TO_READ = '(?=\\s+to (?:understand|read|see|know|hear)\\b)';
const THE_LEAD = new RegExp(
  `\\b(?<!(?:take|takes|taking|took|taken|follow|follows|following|in|into) )(the|The|your|Your) lead(?:(?=\\s+${A_PERSON_DOES}\\b)|('s)(?=\\s+${A_PERSON_HAS}\\b))` +
    `|${GOES_TO}\\b(the|your) lead\\b(?!\\s*(?:time|times|generation|list|lists|source|sources|role|developer|engineer|designer)\\b)` +
    `|${IS_FOR}\\b(the|your) lead${TO_READ}`,
  'g',
);

/** Every quoted span, as [start, end) offsets, so a swap never lands inside somebody's words. */
function quotedSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  const re = /"[^"\n]*"|“[^”\n]*”/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

/** Whether a turn refers to the lead by a label at all, so an ordinary turn costs no lookup. */
export function mentionsTheLeadByALabel(text: string): boolean {
  THE_LABEL.lastIndex = 0;
  THE_LEAD.lastIndex = 0;
  const yes = THE_LABEL.test(text ?? '') || THE_LEAD.test(text ?? '');
  THE_LABEL.lastIndex = 0;
  THE_LEAD.lastIndex = 0;
  return yes;
}

export function theLeadByName(text: string, leadFirstName: string | null | undefined): { text: string; changed: boolean } {
  if (!text || !mentionsTheLeadByALabel(text)) return { text, changed: false };
  const name = (leadFirstName ?? '').trim();
  let changed = false;
  let spans = quotedSpans(text);
  let out = text.replace(THE_LABEL, (m: string, article: string, apposed: string | undefined, offset: number) => {
    if (spans.some(([a, b]) => offset >= a && offset < b)) return m;
    /* "The person who opened this check-in for you, Michael Achebe," - the name is kept, the label goes. */
    const said = apposed && (!name || apposed.split(/\s+/).includes(name)) ? apposed.split(/\s+/)[0] : null;
    changed = true;
    if (name) return name;
    if (said) return said;
    return article === 'The' ? 'Your lead' : 'your lead';
  });
  THE_LABEL.lastIndex = 0;
  if (!name) return { text: out, changed };
  spans = quotedSpans(out);
  out = out.replace(THE_LEAD, (m: string, _a: string, possessive: string | undefined, _b: string, _c: string, offset: number) => {
    if (spans.some(([a, b]) => offset >= a && offset < b)) return m;
    changed = true;
    return `${name}${possessive ?? ''}`;
  });
  THE_LEAD.lastIndex = 0;
  return { text: out, changed };
}
