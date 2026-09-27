/**
 * THE LEAD HAS A NAME, AND A CONVERSATION USES IT.
 *
 * "Mei, the person who set this up wants to understand what it's actually like to work here right
 * now" was the first line Mei read (openread, run 10 of the twenty-four scenarios). The setup block
 * now hands the model the lead's first name (see setup-already-asked-this), and this is the part
 * that does not rely on the model having read it: before a turn is saved, the label is swapped for
 * the name, or for "your lead" where there is none.
 *
 * ONLY THIS ONE PHRASE. "The initiator" and "Participant A" are the report's words and the prompt
 * never hands them to a conversation; "the person who set this up" is the one label the conversation
 * was actually given, so it is the one it can say back. Never inside quotation marks, which are the
 * person's own words and stay as they were typed.
 */

const THE_LABEL = /\b(the|The) person who set this up\b/g;

/** Every quoted span, as [start, end) offsets, so a swap never lands inside somebody's words. */
function quotedSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  const re = /"[^"\n]*"|“[^”\n]*”/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

export function theLeadByName(text: string, leadFirstName: string | null | undefined): { text: string; changed: boolean } {
  if (!text || !THE_LABEL.test(text)) return { text, changed: false };
  THE_LABEL.lastIndex = 0;
  const name = (leadFirstName ?? '').trim();
  const spans = quotedSpans(text);
  let changed = false;
  const out = text.replace(THE_LABEL, (m: string, article: string, offset: number) => {
    if (spans.some(([a, b]) => offset >= a && offset < b)) return m;
    changed = true;
    if (name) return name;
    return article === 'The' ? 'Your lead' : 'your lead';
  });
  return { text: out, changed };
}
