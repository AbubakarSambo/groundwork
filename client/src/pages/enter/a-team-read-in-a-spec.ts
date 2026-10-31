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
    const name = parts.find((p) => p !== email && p !== phone) ?? null
    return { name, email: email ? email.toLowerCase() : null, phone }
  })
}

/** Types the team into the box, in place of what it was filled with, and presses "Add everyone". */
export function addThroughTheTeamBox(lines: string) {
  fireEvent.change(screen.getByLabelText('Your team, one per line'), { target: { value: lines } })
  /* By its text, as the other save-card specs press their buttons: this harness renders the save card closed (out of the
     accessibility tree), the state the overlay's own visibility class leaves it in until it opens. */
  fireEvent.click(screen.getByText('Add everyone'))
}
