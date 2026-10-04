/**
 * THE READER IS "YOU" UNDER THEIR OWN LINES (privacy sweep, 5 October 2026, finding 8).
 *
 * Yusuf Garba's own session report served, under his risks, `"who": "Yusuf Garba"` beside his own line "Sometimes the roads
 * are bad. And the weather." Everyone else's lines carry the name they may be read by; the reader's own are "You". The screen
 * already turned the reader's name into "You" in the same place, but the served text said it in the third person, and what is
 * served is what counts.
 *
 * The reader's name is the `who` of the row in `counting` that is theirs (`isYou`). Only the lines that name who said them are
 * changed: the sections' items and what each person said success is. Nothing a person said is touched.
 */
export function theReaderIsYouOnTheirOwnLines<T>(served: T): T {
  const s = served as any;
  if (!s || typeof s !== 'object') return served;
  const yourName: string | null = (Array.isArray(s.counting) ? s.counting : []).find((c: any) => c?.isYou && typeof c.who === 'string')?.who ?? null;
  if (!yourName) return served;
  const mine = (line: any) => line && typeof line === 'object' && line.who === yourName ? { ...line, who: 'You' } : line;
  return {
    ...s,
    ...(Array.isArray(s.sections) ? { sections: s.sections.map((sec: any) => (sec && Array.isArray(sec.items) ? { ...sec, items: sec.items.map(mine) } : sec)) } : {}),
    ...(s.againstSuccess && Array.isArray(s.againstSuccess.definitions) ? { againstSuccess: { ...s.againstSuccess, definitions: s.againstSuccess.definitions.map(mine) } } : {}),
  } as T;
}
