/**
 * THE LEAD IS "YOU" IN HER OWN REPORT, AND A ROLE SHE GAVE IS KEPT (local test, 15 October 2026).
 *
 * Muchemi's first report treated Hafsah, the partner who set it up, as somebody else: "The partner's role has not been
 * described ... Ask the partner what they expect", with "The partner" offered as a person to invite. And it said of
 * Otieno "They were named as a person involved, but their role in these specific matters was not described", though she
 * had said in setup that he raises the fee notes; that sentence then became his "role as described" when he was added.
 *
 * The cause: the report reads the check-in's own turns, and from setup only a bare list of names ("the partner", "Otieno
 * Ouma"). What she said in setup, about herself and about each of them, never reached it. So her own setup words go in
 * front of the read, said as hers; a name that is only her own description of herself is not somebody else; and a line
 * that says nobody described a role is never kept as one.
 */

const strip = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const withoutArticle = (s: string) => strip(s).replace(/^(?:the|a|an|our|my)\s+/, '');

/** The ways she names herself in her own words: "I'm the partner", "I am a managing partner", "as the partner, I". */
export function howSheDescribesHerself(herWords: string[]): string[] {
  const found = new Set<string>();
  for (const w of herWords) {
    const t = strip(w);
    for (const m of t.matchAll(/\b(?:i am|i'm|im|as)\s+(?:the|a|an|their|our)\s+([a-z]+(?:\s+[a-z]+)?)/g)) {
      const words = m[1].split(' ');
      found.add(words[0]);
      if (words.length > 1) found.add(m[1]);
    }
  }
  return [...found];
}

/** The names that are somebody else, leaving out any that is only how she described herself ("the partner"). */
export function notTheLeadHerself<T>(names: T[], herWords: string[], nameOf: (n: T) => string = (n) => String(n)): T[] {
  const her = new Set(howSheDescribesHerself(herWords));
  if (!her.size) return names;
  return names.filter((n) => !her.has(withoutArticle(nameOf(n) ?? '')));
}

/** A line about somebody that only says nothing was said about them is not a description, and is never kept as one. */
export function aLineThatDescribesNothing(context: string | null | undefined): boolean {
  return /\b(?:role|part|expectations?|responsibilit(?:y|ies))\b[^.]*\b(?:not|never)\s+(?:been\s+)?(?:described|stated|said|given|specified|explained)\b/i.test(context ?? '');
}

/** Her own setup words, put in front of the read as hers, so what she said about herself and each person counts. */
export function herSetupWordsAsATurn(herWords: string[]): string | null {
  const said = herWords.map((w) => (w ?? '').trim()).filter(Boolean);
  if (!said.length) return null;
  return `Before this conversation, while setting this check-in up, I said the following, in my own words. When I describe myself here (my own role, what I sign off), that is me, the person checking in, and not somebody else. What I said about each person is their part in this.\n\n${said.map((s) => `- ${s}`).join('\n')}`;
}
