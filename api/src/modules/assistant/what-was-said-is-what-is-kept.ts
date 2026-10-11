/**
 * WHAT IS KEPT IN THE HISTORY IS WHAT THE PERSON READ (screens request 154, item 2).
 *
 * A reply is a payload of blocks, and only the first text block was kept. Where the substance of
 * an answer is in its choices, the history therefore kept a sentence that introduces something
 * and then nothing at all:
 *
 *   I cannot answer that one yet. Here is what I can do with "It should run for 13 weeks."
 *
 * The person saw four choices under that line. Whoever read their history later saw the line on
 * its own, which is not what happened and does not even read as a finished thought.
 *
 * So the kept text is every text block, and the choices written out as a sentence. Nothing is
 * invented: the labels are the ones the person was shown. The live reply is untouched - the screen
 * still draws buttons - this is only what goes in the record of the conversation.
 */

type ABlock = { type: string; body?: string; label?: string; options?: { key: string; label: string }[] };

/** The labels offered in this reply, in the order they were shown, with nothing repeated. */
function theChoicesIn(blocks: ABlock[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === 'picker') for (const o of b.options ?? []) { const l = (o?.label ?? '').trim(); if (l && !out.includes(l)) out.push(l); }
    if (b.type === 'next_step') { const l = (b.label ?? '').trim(); if (l && !out.includes(l)) out.push(l); }
  }
  return out;
}

/** "a, b or c" - the plain way a person lists things out loud. */
export function inPlainList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/** What to keep in the history for one reply: everything the person actually read. */
export function whatWasSaid(reply: { blocks?: unknown[] } | null | undefined): string {
  const blocks = (reply?.blocks ?? []) as ABlock[];
  const said = blocks.filter((b) => b.type === 'text').map((b) => (b.body ?? '').trim()).filter(Boolean);
  const choices = theChoicesIn(blocks);
  /* Each choice is in quotation marks, as the words on its button, so the sentence reads whole: "You could
     choose "Tell me what you can see", "What am I on?" or "What is on my list?"". Run in bare, the labels
     kept their capitals mid-sentence and broke it ("You could Tell me what you can see, What am I on?, ...",
     request 225). A trailing full stop on a label goes; a question mark stays, and then the sentence
     needs no full stop after it. */
  if (choices.length) {
    const quoted = choices.map((c) => `"${c.replace(/\.+$/, '')}"`);
    const last = choices[choices.length - 1].replace(/\.+$/, '');
    said.push(`You could choose ${inPlainList(quoted)}${/[?!]$/.test(last) ? '' : '.'}`);
  }
  return said.join(' ');
}
