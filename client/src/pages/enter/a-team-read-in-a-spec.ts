import { fireEvent, screen } from '@testing-library/react'

/**
 * FOR SPECS ONLY: the server's one reader of a team typed one per line (api users/putting-a-whole-company-on.ts peopleOnLines, specced
 * in a-team-one-per-line.spec.ts) stands behind POST /entry/people-on-lines. A screen's spec mocks that call with this, which reads the
 * simple "name, email, phone number" lines the specs type, and then presses the box the way a lead does.
 */
export function readLikeTheServer(pasted: string): { name: string | null; email: string | null; phone: string | null }[] {
  return pasted.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split(',').map((x) => x.trim()).filter(Boolean)
    const email = parts.find((p) => /@/.test(p)) ?? null
    const phone = parts.find((p) => /^\+?\d[\d ()-]{6,}\d$/.test(p)) ?? null
    const said = parts.find((p) => p !== email && p !== phone) ?? null
    /* As the server reads it: beside an address, a name is two words or more ("oops, b@x.com" is not somebody called Oops), so
       "Rita, rita@x.test" comes back with no name (staging check S10, which this stub hid by keeping every name). */
    const name = said && (!email || /\s/.test(said)) ? said : null
    return { name, email: email ? email.toLowerCase() : null, phone }
  })
}

/**
 * Types the team into the setup's box, in place of what it was filled with. There is nothing more to press: the lines in the box are
 * the team, and the press that saves the check-in takes them (Hafsah's blocker of 31 October 2026, "nothing anyone says in setup is
 * ever lost"). People and setup's own box still has its "Add everyone"; its specs press it themselves.
 */
export function addThroughTheTeamBox(lines: string) {
  fireEvent.change(screen.getByLabelText('Your team, one per line'), { target: { value: lines } })
}

/** Gives the save step a name and an address and presses its button, as a lead who is not signed in does. */
export function saveWithMyEmail(address = 'lead@example.test') {
  const yourName = screen.queryByPlaceholderText('Your name')
  if (yourName) fireEvent.change(yourName, { target: { value: 'Hafsah Jumare' } })
  fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: address } })
  fireEvent.submit(screen.getByPlaceholderText('you@company.com').closest('form')!)
}
