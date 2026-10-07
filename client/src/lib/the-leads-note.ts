/**
 * THE LEAD'S NOTE ABOUT A PERSON, IN A SENTENCE (U.6 review). What the lead wrote when adding someone
 * is kept as "Daniel - Daniel is expected to generate...". On the lead's own pages it reads "Daniel.
 * Your note: Daniel is expected to generate..." rather than pieces joined with dashes. The server
 * gives this text only to whoever runs the check-in (the-leads-words-about-someone.ts).
 */
export function theLeadsNote(role: string | null | undefined): string | null {
  const said = (role ?? '').trim()
  if (!said) return null
  const [name, ...rest] = said.split(' - ')
  /* A note with no name in front of it is still the lead's own note, never a line about what the person said. */
  if (!rest.length) return `Your note: ${said.replace(/([^.?!])$/, '$1.')}`
  const note = rest.join(' - ').trim()
  const sentence = (t: string) => t.replace(/([^.?!])$/, '$1.')
  return note ? `${sentence(name.trim())} Your note: ${sentence(note)}` : sentence(name.trim())
}

/** Whether an invitation is still waiting for its start day, so no "Resend invite" is offered for it. */
export function waitsForItsStart(p: { invitedAt?: string | null; startsAt?: string | null; awaitingSeat?: boolean }, now = new Date()): boolean {
  return !p.invitedAt && !p.awaitingSeat && !!p.startsAt && new Date(p.startsAt).getTime() > now.getTime()
}
