/**
 * AN ITEM THE MODEL LEFT EMPTY IS NOT AN ITEM.
 *
 * Seen on a live run, 11 September. The entry report came back with three of its array fields
 * holding nothing but empty values:
 *
 *   "areasRequiringAlignment": [ [], [], [] ]
 *   "alignmentReached":        [ [], [] ]
 *   "mentionedPeople":         [ [], [], [] ]
 *
 * The schema asks for arrays of objects with four required string properties each, and every string
 * and object field in the same response was correct. Reproduced against Vertex with that exact
 * schema and a conversation of the same shape and it came back correct, twice - so this is the
 * provider intermittently emitting items with nothing in them, not a fault in the schema or in the
 * conversion to Gemini's dialect.
 *
 * WHAT THE READER SAW. Three cards on the lead's own report, each with the headings "What we
 * noticed", "Why it matters" and "What to do next", and no words under any of them. The page had
 * counted three open areas and drawn three empty boxes. Nothing anywhere said the content was
 * missing, so the report read as though the product had nothing to say about a session in which the
 * person had said a great deal.
 *
 * WHY IT IS HANDLED HERE AND NOT AT THE TWENTY-SIX CALL SITES. Every caller of `extract` has this
 * exposure and none of them can see it: each one hands its result to a page that trusts the shape.
 * One check at the seam covers the ones written already and the ones written next, which is the
 * same argument the retry above it was written on.
 *
 * AND IT IS NOT A DELETION. An item with nothing in it carries nothing to lose, and the alternative
 * - drawing it - is the bug. The count of what was dropped is returned so the caller can log it and
 * so the retry above knows it has a reason to ask again.
 */
export function nothingInIt(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.every(nothingInIt);
  if (typeof value === 'object') return Object.values(value as object).every(nothingInIt);
  if (typeof value === 'string') return value.trim() === '';
  /* A number or a boolean is content. Zero and false are answers. */
  return false;
}

/**
 * Walk the whole object and remove, from every array, the items that carry nothing at all.
 *
 * An array that was legitimately empty stays empty. An array of strings keeps every non-blank
 * string. Only an item with no content anywhere inside it goes, because that is the only item a
 * page can do nothing with.
 */
export function withoutTheEmptyOnes<T>(value: T): { value: T; dropped: number } {
  let dropped = 0;

  const walk = (node: any): any => {
    if (Array.isArray(node)) {
      const kept: any[] = [];
      for (const item of node) {
        if (nothingInIt(item)) { dropped += 1; continue; }
        kept.push(walk(item));
      }
      return kept;
    }
    if (node && typeof node === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v);
      return out;
    }
    return node;
  };

  return { value: walk(value) as T, dropped };
}
