/**
 * THE LEAD'S NOTE ABOUT A PERSON, IN A SENTENCE (U.6 review). What the lead wrote when adding someone
 * is kept as "Daniel - Daniel is expected to generate...". On the lead's own pages it reads "Daniel.
 * Your note: Daniel is expected to generate..." rather than pieces joined with dashes. The server
 * gives this text only to whoever runs the check-in (the-leads-words-about-someone.ts).
 */
const sentenceOf = (t: string) => t.replace(/([^.?!])$/, '$1.')

/**
 * THE NOTE AS A HEADING AND THE NOTE UNDER IT (privacy sweep, 7 October). "Daniel. Your note: Daniel is expected to..." joined a name, a label and
 * the note with dots and a colon. It is now the heading "Your note on Daniel" with the lead's own words beneath, which are never changed. Where the
 * note was typed with no name in front, the heading is "Your note".
 */
export function theLeadsNoteParts(role: string | null | undefined): { heading: string; note: string } | null {
  const said = (role ?? '').trim()
  if (!said) return null
  const [name, ...rest] = said.split(' - ')
  if (!rest.length) return { heading: 'Your note', note: sentenceOf(said) }
  const note = rest.join(' - ').trim()
  const first = name.trim().split(/\s+/)[0]
  return { heading: first ? `Your note on ${first}` : 'Your note', note: note ? sentenceOf(note) : '' }
}

/** The same, as one piece of text, for the places that cannot draw a heading. */
export function theLeadsNote(role: string | null | undefined): string | null {
  const parts = theLeadsNoteParts(role)
  if (!parts) return null
  return parts.note ? `${parts.heading}. ${parts.note}` : `${parts.heading}.`
}

/** Whether an invitation is still waiting for its start day, so no "Resend invite" is offered for it. */
export function waitsForItsStart(p: { invitedAt?: string | null; startsAt?: string | null; awaitingSeat?: boolean }, now = new Date()): boolean {
  return !p.invitedAt && !p.awaitingSeat && !!p.startsAt && new Date(p.startsAt).getTime() > now.getTime()
}
