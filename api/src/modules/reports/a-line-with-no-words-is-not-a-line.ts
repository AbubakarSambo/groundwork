/**
 * A LINE OF THE SHARED PICTURE WITH NO WORDS IN IT IS NOT A LINE (run-26, sales).
 *
 * Femi's report held lines with a mark ("Only someone's word") and no sentence, left where the rule that keeps other
 * people's targets from him took the whole sentence out. The earlier clean-up ran before that rule did, so the empty
 * lines stayed. This runs last, over whatever the rules left, and drops every line with nothing in it.
 */
export function withoutLinesWithNoWords<T>(served: T): T {
  if (!served || typeof served !== 'object') return served;
  const lines = (served as any).sharedPictureLines;
  if (!Array.isArray(lines)) return served;
  const kept = lines.filter((l: any) => !(l && typeof l === 'object' && 'text' in l && !String(l.text ?? '').trim()));
  return kept.length === lines.length ? served : ({ ...(served as any), sharedPictureLines: kept } as T);
}
