import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MagicVerifyPage } from './MagicVerifyPage'
import { authApi } from '@/api/auth'
import { entryApi } from '@/api/entry'
import { whatOpeningTheLinkDoes } from '@/pages/enter/EntryChatPage'

/**
 * THE SAVE CARD PROMISES ONLY WHAT OPENING THE LINK DOES (U.6 review).
 *
 * It said "...opening it saves your check-in and sends the 1 invite." That is not true when the
 * check-in starts later, when there is no seat for the person (a guest held for a seat among them),
 * when an admin has to accept the check-in first ("Check-ins wait for an admin"), or when an address
 * cannot be invited. So the card now says what always happens, and the page the link opens says, for
 * each person, whether they were invited and why not.
 */
vi.mock('@/api/auth', () => ({ authApi: { verifyEmail: vi.fn() } }))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

describe('the save card', () => {
  /* In full sentences, not pieces joined with a dash (U.6 review). */
  it('never says the link sends the invitations', () => {
    expect(whatOpeningTheLinkDoes(1, null)).toBe('Opening it saves your check-in. Then you see who was invited and who has to wait.')
    expect(whatOpeningTheLinkDoes(3, null)).not.toMatch(/sends/)
  })
  it('says the one certain thing when the check-in starts later', () => {
    expect(whatOpeningTheLinkDoes(1, '2026-11-02')).toBe('Opening it saves your check-in. Then you see who was invited and who has to wait. Nobody is invited before Monday 2 November.')
  })
  it('with nobody to invite, says only that it saves', () => {
    expect(whatOpeningTheLinkDoes(0, null)).toBe('Opening it saves your check-in.')
  })
})

let n = 0
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('gw_commit_payload', JSON.stringify({ groundLabel: 'Help someone get back on track', history: [], contributors: [] }))
  localStorage.setItem('gw_draft_token', 'd')
  vi.mocked(authApi.verifyEmail).mockResolvedValue({ user: { id: 'u1', email: 'lead@x.test', role: 'ADMIN' }, accessToken: 't', justCreated: false } as any)
})

describe('the page the link opens, case by case', () => {
  it('lists as invited only those who were written to, and says why each other one was not', async () => {
    vi.mocked(entryApi.commit).mockResolvedValue({
      groundId: 'g1', joinToken: 'j',
      contributors: [
        { email: 'sent@x.test', waiting: false },
        { email: 'later@x.test', waiting: true, waitingBecause: 'starts_later' },
        { email: 'guest@other.test', waiting: true, waitingBecause: 'no_seat', saying: 'Guest is on the check-in, and waits for a seat before being invited.' },
        { email: 'bounced@x.test', waiting: true, waitingBecause: 'mail_failed' },
      ],
      failedInvites: ['approval@x.test', 'bad@x.test'],
      whyInvitesFailed: [
        { email: 'approval@x.test', because: 'This check-in is waiting for an admin in your organisation to accept it. Nobody can be invited until then.' },
        { email: 'bad@x.test', because: 'That address cannot be invited.' },
      ],
    } as any)
    n += 1
    render(
      <MemoryRouter initialEntries={[`/verify-email?token=cases-${n}`]}>
        <Routes><Route path="/verify-email" element={<MagicVerifyPage />} /></Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Invited (1) ✓')).toBeTruthy()
    const invited = screen.getByText('Invited (1) ✓').parentElement!
    expect(within(invited).getByText('sent@x.test')).toBeTruthy()
    expect(invited.textContent).not.toContain('later@x.test')

    const waiting = screen.getByText('Not invited yet (3)').parentElement!
    expect(within(waiting).getByText('Their invitation goes out on the morning the check-in starts.')).toBeTruthy()
    expect(within(waiting).getByText('Guest is on the check-in, and waits for a seat before being invited.')).toBeTruthy()
    expect(within(waiting).getByText('The invitation did not send. You can send it again from your check-in page.')).toBeTruthy()

    expect(screen.getByText('This check-in is waiting for an admin in your organisation to accept it. Nobody can be invited until then.')).toBeTruthy()
    expect(screen.getByText('That address cannot be invited.')).toBeTruthy()
  })
})

describe('the line before saving (U.6 review)', () => {
  /* It said "We'll email you a confirmation link. Your report is saved and your invites go out the
     moment you open it." with a start of 5 October. It follows the start now. */
  it('says nobody is invited before the start, when the start is later', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(__dirname, '..', 'enter', 'EntryChatPage.tsx'), 'utf8')
    expect(src).not.toContain('your invites go out the moment you open it')
    /* UPDATED (Hafsah's blocker, 31 October 2026): the count includes the people in the team box, which the save takes. */
    expect(src).toContain("{`We'll email you a confirmation link. ${whatOpeningTheLinkDoes(peopleOnTheList, startsLater ? checkInBy : null)}`}")
    expect(`We'll email you a confirmation link. ${whatOpeningTheLinkDoes(1, '2026-10-05')}`)
      .toBe("We'll email you a confirmation link. Opening it saves your check-in. Then you see who was invited and who has to wait. Nobody is invited before Monday 5 October.")
  })
})
