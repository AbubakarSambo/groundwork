/**
 * A SENTENCE AS A ROW (Hafsah, 25 October: "Each row: one line of title, at most one line of detail"). A title that would run past one
 * line is split at its first natural break after the fourth word: a second sentence, or a clause that starts ", which", ", and", ", so",
 * ", but", " because", " since" or " for". The title keeps the person, the action and its object; the rest becomes the detail, so no
 * name, number or day is lost. A title that already fits, or one with a detail of its own, is left as it is.
 */
const ONE_LINE = 64;

export function aSentenceAsARow(title: string, detail?: string | null): { title: string; detail?: string } {
  const t = (title ?? '').trim();
  if (detail || t.length <= ONE_LINE) return detail ? { title: t, detail } : { title: t };
  const m = /^(.{20,}?[a-z0-9)”’])(?:\.\s+(?=[A-Z])|,\s+(?=(?:which|and|so|but|because|since|so that)\b)|\s+(?=(?:because|since|which)\b))(.+)$/.exec(t);
  if (!m) return { title: t };
  const head = m[1].replace(/[,;]$/, '');
  /* ", which was due" reads as its own sentence: "It was due". */
  const rest = m[2].replace(/^(?:and|so|but)\s+/, '').replace(/^which\s+/, 'it ');
  return { title: /[.!?]$/.test(head) ? head : `${head}.`, detail: `${rest.charAt(0).toUpperCase()}${rest.slice(1)}` };
}
