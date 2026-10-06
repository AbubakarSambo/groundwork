import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ADoorYouCannotOpen } from './a-door-you-cannot-open-says-so'

/** WHAT A LEAD OR A MEMBER READS AT PEOPLE (U.4 review). The server refuses them too. */
describe('the People page, to somebody who is not an admin', () => {
  it('says only an admin can open it, and why, without calling their role a setting', () => {
    const { container } = render(<MemoryRouter><ADoorYouCannotOpen may={false} what="open People"><p>People</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Only an admin can open People.' })).toBeTruthy()
    expect(screen.getByText('Your role here is not an admin’s. An admin can change it.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back to your check-ins' })).toBeTruthy()
    expect(container.textContent).not.toMatch(/You cannot add people|not anything about you/)
    expect(screen.queryByText('People')).toBeNull()
  })
  it('an admin goes straight through', () => {
    render(<MemoryRouter><ADoorYouCannotOpen may what="open People"><p>People</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(screen.getByText('People')).toBeTruthy()
  })
})

/**
 * EVERY `what` APP.TSX PASSES GETS ITS OWN TRUE SENTENCE. Before this fix, "connect your systems"
 * fell through to the adding-people sentence, so a participant opening Connections, WhatsApp or
 * Tools read that adding people was an admin's job - not that connecting systems was.
 */
describe('every refusal names the thing the person was actually trying to do', () => {
  it('open a check-in', () => {
    render(<MemoryRouter><ADoorYouCannotOpen may={false} what="open a check-in"><p>hidden</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(screen.getByText(/Opening a check-in is limited to people your admin has named\./)).toBeTruthy()
  })
  it('add people to your organisation', () => {
    render(<MemoryRouter><ADoorYouCannotOpen may={false} what="add people to your organisation"><p>hidden</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(screen.getByText('Adding people is something your organisation’s admins do.')).toBeTruthy()
  })
  it('connect your systems', () => {
    render(<MemoryRouter><ADoorYouCannotOpen may={false} what="connect your systems"><p>hidden</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(screen.getByText('Connecting your organisation’s systems is something its admins do.')).toBeTruthy()
    expect(screen.queryByText('Adding people is something your organisation’s admins do.')).toBeNull()
  })
  it('open People', () => {
    render(<MemoryRouter><ADoorYouCannotOpen may={false} what="open People"><p>hidden</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Only an admin can open People.' })).toBeTruthy()
  })
})

/**
 * SCREEN FAULT 6: /settings/whatsapp READ "You cannot connect your systems here... This is a
 * setting, not anything about you." - vague on both ends, and it never said what a member could
 * still do. Its own plain sentence now, the same shape as "open People" above: who can do it, and
 * what is still open to the reader.
 */
describe('the WhatsApp page, to somebody who is not an admin', () => {
  it('says plainly who can connect it, and that answering still works', () => {
    render(<MemoryRouter><ADoorYouCannotOpen may={false} what="connect your organisation’s WhatsApp number"><p>hidden</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Only an admin can connect your organisation’s WhatsApp number.' })).toBeTruthy()
    expect(screen.getByText('You can still answer your check-ins here.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back to your check-ins' })).toBeTruthy()
    expect(screen.queryByText('hidden')).toBeNull()
    expect(screen.queryByText(/This is a setting, not anything about you/)).toBeNull()
  })
  it('an admin goes straight through', () => {
    render(<MemoryRouter><ADoorYouCannotOpen may what="connect your organisation’s WhatsApp number"><p>the real page</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(screen.getByText('the real page')).toBeTruthy()
  })
})
