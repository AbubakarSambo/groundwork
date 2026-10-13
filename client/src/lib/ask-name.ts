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
/**
 * THE NAME GROUNDWORK MAKES UP WHEN NOBODY GIVES ONE ("Wanjiru Otieno's workspace", "My workspace"), the engine's own rule
 * (`isAMadeUpWorkspaceName` in api/src/modules/assistant/ask-name.ts). It is a placeholder, not the organisation's name, so no sentence
 * says it as one: Ask is "Ask Groundwork" until a real name is given (release check, 9 October: the admin card read "You never see
 * anyone's questions to Ask Wanjiru Otieno's workspace").
 */
export function isAMadeUpWorkspaceName(name?: string | null): boolean {
  const n = (name ?? '').replace(/\s+/g, ' ').trim()
  return /^my workspace$/i.test(n) || /^.+['\u2019]s workspace$/i.test(n)
}

/** The organisation's real name, or null for no name or a made-up one. */
export function aRealOrganisationName(name?: string | null): string | null {
  const n = (name ?? '').replace(/\s+/g, ' ').trim()
  return n && !isAMadeUpWorkspaceName(n) ? n : null
}

export function askNameFor(organisationName?: string | null): string {
  const name = aRealOrganisationName(organisationName)
  return name ? `Ask ${name}` : 'Ask Groundwork'
}
