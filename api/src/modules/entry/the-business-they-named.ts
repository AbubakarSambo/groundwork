/**
 * THE BUSINESS THEY NAMED, FOR AN ORGANISATION GROUNDWORK NAMED ITSELF (night quality run 2, Naomi's walk).
 *
 * Naomi Wekesa's first words in setup were "I run Ridge Bakery in Eldoret with seven staff", she left the
 * optional organisation box empty, and every page after sign-in said "Naomi's workspace". The made-up name
 * is only ever a placeholder (isAMadeUpWorkspaceName), so when she names her business in so many words the
 * organisation takes that name instead. A name somebody typed is never replaced: the caller only renames a
 * made-up one.
 *
 * Only a run of capitalised words straight after "I run", "I own", "we run", "I founded", "I started", or
 * after "company called" and the like. Nothing is guessed from a lower-case phrase ("I run a field sales
 * team"), and a person she named is never taken for her business.
 */
const AFTER =
  /\b(?:I|we)\s+(?:run|own|founded|co-founded|started|set up)\s+(?:the\s+)?|\b(?:company|business|organisation|organization|shop|firm)\s+(?:is\s+)?called\s+/g;
const A_WORD = /^[A-Z0-9][\w&'’.-]*$/;
const JOINERS = new Set(['&', 'and', 'of', 'de']);

export function theBusinessTheyNamed(theirWords: string[], peopleNamed: string[] = []): string | null {
  const people = new Set(peopleNamed.flatMap((p) => (p ?? '').toLowerCase().split(/\s+/)).filter(Boolean));
  for (const said of theirWords) {
    const text = said ?? '';
    AFTER.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = AFTER.exec(text))) {
      const words = text.slice(m.index + m[0].length).split(/\s+/);
      const name: string[] = [];
      for (const raw of words) {
        const w = raw.replace(/[,;:!?)]+$/, '');
        const ended = w !== raw || /\.$/.test(w);
        const word = w.replace(/\.$/, '');
        if (A_WORD.test(word) || (name.length && JOINERS.has(word))) name.push(word);
        else break;
        if (ended) break;
      }
      while (name.length && JOINERS.has(name[name.length - 1])) name.pop();
      const found = name.join(' ').trim();
      if (!found || found.length > 80) continue;
      if (found.split(' ').some((w) => people.has(w.toLowerCase()))) continue;
      if (/^(?:I|We|It|A|An|The|This|That|My|Our)$/.test(found)) continue;
      return found;
    }
  }
  return null;
}
