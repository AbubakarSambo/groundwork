import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvitePage, theInvitation, whereAndUntil } from './InvitePage'

/**
 * THE INVITATION, AS THE PROTOTYPE HAS IT (A3, join-invite.txt, U.3).
 *
 * WAS: "the three questions, in the order somebody has them" (G27, G28): "Why you.", then "What it
 * takes." (about ten minutes), then "What you get back.". The prototype replaces those three with its
 * own card: the lead's invitation, the organisation and end date, one box on who can see what you
 * say, "What it asks", "Who sees your answers", and "Answer today's check-in now". Hafsah asked for
 * the prototype's page (26 September), so this file now reads that, rendered as the person sees it.
 *
 * HELD while she decides: "Nobody else reads your answers." and "Wairimu reads the report, not your
 * words." are not shown, and today's panel "What happens to what you write" stays as it was.
 */
const participantsApi = vi.hoisted(() => ({ preview: vi.fn(), accept: vi.fn() }))
vi.mock('@/api', () => ({ participantsApi }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

const PREVIEW = {
  groundLabel: 'Sales team, Q3',
  initiatorName: 'Wairimu Kamau',
  leadFirstName: 'Wairimu',
  organisationName: 'Baridi Appliances',
  endsAt: '2026-09-30T00:00:00.000Z',
  schedule: 'A short check-in each weekday.',
  scenario: 'NEW_PROJECT',
  roleAsDescribed: null,
  alreadyAccepted: false,
}

function open(preview: any = PREVIEW) {
  participantsApi.preview.mockResolvedValue(preview)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/invite?token=t']}>
        <Routes><Route path="/invite" element={<InvitePage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the invitation a participant reads', () => {
  it('in the prototype\'s words, in its order', async () => {
    open()
    expect(await screen.findByRole('heading', { name: 'Wairimu invited you to “Sales team, Q3”' })).toBeTruthy()
    const text = document.body.textContent ?? ''
    const order = [
      'Baridi Appliances, until 30 September.',
      'The people in this check-in, including your manager, can see what you say in it.',
      'What it asks',
      'A short check-in each weekday.',
      'Who sees your answers',
      'You see your own report straight away. Wairimu shares a team report',
      'What happens to what you write',
      'Answer today’s check-in now',
      'About two minutes. You make your account afterwards.',
    ].map(t => text.replace(/\s+/g, ' ').indexOf(t))
    expect(order.every(i => i > -1)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('leaves out the two held sentences, and the old three questions', async () => {
    open()
    await screen.findByText('Who sees your answers')
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/Nobody else reads your answers/)
    expect(text).not.toMatch(/reads the report, not your words/)
    expect(text).not.toMatch(/Why you\.|What it takes\.|What you get back\./)
    expect(text).not.toMatch(/About ten minutes/)
  })

  it('shows no "Your number" block, because the invitation carries no share of a target', async () => {
    open()
    await screen.findByText('Who sees your answers')
    expect(screen.queryByText('Your number')).toBeNull()
  })
})

describe('the two lines built from the record', () => {
  it('names the lead by first name', () => {
    expect(theInvitation(PREVIEW)).toBe('Wairimu invited you to “Sales team, Q3”')
    expect(theInvitation({ ...PREVIEW, leadFirstName: null })).toBe('Wairimu Kamau invited you to “Sales team, Q3”')
  })

  it('says the organisation and the end date, or whichever there is', () => {
    expect(whereAndUntil(PREVIEW)).toBe('Baridi Appliances, until 30 September.')
    /* U.3 review: each alone is a full sentence. These read "Baridi Appliances." and "Until 30
       September." before, which are not sentences. */
    expect(whereAndUntil({ organisationName: 'Baridi Appliances', endsAt: null })).toBe('A check-in at Baridi Appliances.')
    expect(whereAndUntil({ organisationName: null, endsAt: '2026-09-30T00:00:00.000Z' })).toBe('It runs until 30 September.')
  })
})

describe('the rest of the page, as the participant reads it (U.3 review)', () => {
  const read = () => (document.body.textContent ?? '').replace(/\s+/g, ' ')

  it('says the organisation in a full sentence when there is no end date', async () => {
    open({ ...PREVIEW, organisationName: 'Coamana', endsAt: null })
    await screen.findByText('Who sees your answers')
    expect(screen.getByText('A check-in at Coamana.')).toBeTruthy()
  })

  it('says the name line and the way out in plain sentences, with no dashes', async () => {
    open()
    await screen.findByText('Who sees your answers')
    expect(read()).toContain('Your name is optional. If you add it, the others will see it on the shared report.')
    expect(read()).toContain('You never have to take part. If you would rather not, you can close this page. Nothing is shared, and saying no is never held against you.')
    expect(read()).not.toMatch(/ - /)
    expect(read()).not.toMatch(/obligated|declining is never shown as a negative/)
  })

  it('no longer asks anyone to agree that their "contribution record belongs to" them', async () => {
    open()
    await screen.findByText('Who sees your answers')
    expect(read()).not.toMatch(/contribution record|By joining, you agree/)
  })

  it('has the prototype\'s look: the small mark, no header band, the note in beige', async () => {
    open()
    await screen.findByText('Who sees your answers')
    expect(document.querySelector('.gw-arrival-plain .gw-auth-brand')).not.toBeNull()
    expect(document.querySelector('.gw-hdr')).toBeNull()
    expect(document.querySelector('.gw-box-blue')).toBeNull()
    expect(document.querySelector('.gw-invite-note')?.textContent).toMatch(/^\s*The people in this check-in, including your manager, can see what you say in it\./)
  })
})
