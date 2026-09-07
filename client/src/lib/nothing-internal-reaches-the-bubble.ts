/**
 * A CONTROL MARKER IN A CHAT BUBBLE, PHOTOGRAPHED IN PRODUCTION.
 *
 * "[[SESSION_COMPLETE]]" appeared underneath a reply on app.myground.work, in front of whoever was
 * using it, along with a numbered list still carrying its markdown asterisks - "1. **Outreach:** A
 * list of contacts...". Both are stripped on the server by `forHumans`, and that has been on main
 * since August, so either the deployed build predates it or something reached the screen without
 * passing through it. I could not tell which from here, and that is the point.
 *
 * WHY A SECOND STRIP RATHER THAN ONLY FINDING THE HOLE. The server's version is the right one and
 * stays the primary. But the failure mode is a reader seeing the product's own internal machinery,
 * which is the kind of thing that makes somebody stop trusting the rest of what is on screen - and
 * the client is the last place before their eyes. It costs nothing on a reply that is already clean.
 *
 * IT IS NOT A LICENCE TO SKIP THE SERVER STRIP. If this starts catching markers regularly, something
 * upstream is broken and this is hiding it. It is a net, not a fix.
 */

/** The markers the engine uses to talk to itself. Kept in step with CONTROL_MARKERS on the server. */
const INTERNAL = [
  /\[\[SESSION_COMPLETE\]\]/g,
  /\[SESSION_COMPLETE\]/g,
  /\[\[\s*[A-Z_]{4,}\s*\]\]/g,
]

/**
 * Markdown the bubble cannot render.
 *
 * The transcript is drawn as plain text with `whiteSpace: pre-wrap`, so `**bold**` arrives as four
 * literal asterisks around a word. Stripping the syntax is right rather than rendering it: the
 * engine's own rules tell it not to use markdown, so what arrives is a mistake either way, and a
 * chat bubble that suddenly renders headings and lists is a different design decision.
 */
function withoutMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,;:!?)]|$)/g, '$1$2')
    .replace(/(^|\n)#{1,6}\s+/g, '$1')
    .replace(/(^|\n)\s*[-*]\s+/g, '$1')
}

export function nothingInternalReachesTheBubble(text: string | null | undefined): string {
  if (!text) return ''
  let out = text
  for (const m of INTERNAL) out = out.replace(m, '')
  out = withoutMarkdown(out)
  /* Collapse what the removals left, without flattening the paragraph breaks a reply relies on. */
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim()
}
