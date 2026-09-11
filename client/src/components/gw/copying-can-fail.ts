/**
 * COPYING CAN FAIL, AND THE FAILURE PATH COULD NEVER RUN.
 *
 * `navigator.clipboard?.writeText(x).then(...)` guards `clipboard` with `?.` and then applies `.then`
 * to the whole expression - so where the API is absent the expression is `undefined`, `.then` throws
 * a TypeError, and the `.catch` with the good words in it is unreachable on exactly the browsers where
 * copy is unsupported. Eight sites, one bug shape. This feature-detects, awaits, and returns false;
 * it never toasts, so each caller keeps its own message.
 */
export async function copy(text: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
