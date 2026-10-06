/**
 * ASK IS NAMED FOR THE ORGANISATION (decision 100, 5 October; docs/ask-definition.md).
 *
 * "Ask Coamana", "Ask NABG". The engine's own `askName` (api/src/modules/assistant/ask-name.ts)
 * is the source of truth, and `GET /ask` serves it as `askName` - read that wherever it is
 * available. This is the same, small rule, for the few places on screen that name Ask before the
 * `/ask` panel has been opened (an organisation name already in hand from another read, such as
 * the signed-in person's own profile or an invite preview) - so a reader never sees "Ask
 * Groundwork" flash before the real name arrives, and never sees two different names for the same
 * assistant on the same screen.
 */
export function askNameFor(organisationName?: string | null): string {
  const name = (organisationName ?? '').replace(/\s+/g, ' ').trim()
  return name ? `Ask ${name}` : 'Ask Groundwork'
}
