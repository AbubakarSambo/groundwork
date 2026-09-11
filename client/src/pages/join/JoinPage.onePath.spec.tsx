import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join as pjoin } from 'node:path'
import { JoinPage } from './JoinPage'
import { joinApi } from '@/api/entry'

/**
 * ONE-PATH join guard (E), NOW IN TWO HALVES.
 *
 * It used to be one: type an address, get signed in, land in the engine. That
 * middle step was signing the caller in as whoever the typed address belonged
 * to — see `a-join-link-is-not-a-password.ts`. So this page now only ASKS, and
 * the emailed link lands somebody in the engine (JoinConfirmPage).
 *
 * What still bites here: reintroducing the entry chat, or signing anybody in
 * from this page again.
 */
const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockedNavigate }
})
vi.mock('@/api/entry', () => ({ joinApi: { preview: vi.fn(), accept: vi.fn(), confirm: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

function renderJoin() {
  return render(
    <MemoryRouter initialEntries={['/join?t=jt-1']}>
      <Routes><Route path="/join" element={<JoinPage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('ONE-PATH: join lands in the real engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(joinApi.preview as any).mockResolvedValue({ groundId: 'g1', groundLabel: 'Q3 alignment', scenario: 'NEW_PROJECT', initiatorName: 'Sarah' })
    ;(joinApi.accept as any).mockResolvedValue({
      sent: true,
      to: 'cohort@acme.test',
      says: 'We have sent a link to cohort@acme.test. Opening it starts your check-in.',
    })
  })

  it('asking sends a link and goes nowhere', async () => {
    renderJoin()
    await screen.findByText(/has asked how this is going from where you sit/i)
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'cohort@acme.test' } })
    fireEvent.change(screen.getByPlaceholderText(/I run the clinic/i), { target: { value: 'Ward pharmacist' } })
    fireEvent.click(screen.getByRole('button', { name: /Email me my link/i }))
    await screen.findByText(/Check your email/i)
    /* The whole point: no session, and no navigation into somebody's check-in. */
    expect(mockedNavigate).not.toHaveBeenCalled()
  })

  it('and says the same thing whoever that address belongs to', async () => {
    renderJoin()
    await screen.findByText(/has asked how this is going from where you sit/i)
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'admin@acme.test' } })
    fireEvent.change(screen.getByPlaceholderText(/I run the clinic/i), { target: { value: 'Org admin' } })
    fireEvent.click(screen.getByRole('button', { name: /Email me my link/i }))
    const said = await screen.findByText(/We have sent a link/i)
    expect(said.textContent).not.toMatch(/welcome back|already have|not registered/i)
  })

  it('requires an email (button disabled until a valid email is entered)', async () => {
    renderJoin()
    await screen.findByText(/has asked how this is going from where you sit/i)
    expect((screen.getByRole('button', { name: /Email me my link/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('keeps the privacy assurance', async () => {
    renderJoin()
    await screen.findByText(/has asked how this is going from where you sit/i)
    /*
     * THE PROMISE CHANGED BECAUSE IT WAS NOT TRUE, AND WHAT REPLACED IT IS ALREADY WRITTEN DOWN.
     *
     * This asserted "Nobody ever reads what you write". What is written is read: it is summarised
     * and cross referenced, and the result goes in front of the other people in the check-in. The
     * honest version of this promise has existed for a long time in
     * what-happens-to-what-you-write.ts, calibrated line by line - your own words about your own
     * work can appear in the report, what you say about somebody ELSE never does.
     *
     * So this guards the two halves that make the promise mean anything, and the second half is the
     * one that would be quietly dropped: without it the box is a boast, and with it it is a rule.
     */
    expect(screen.getByText(/used to build the shared report and nothing else/i)).toBeTruthy()
    expect(screen.getByText(/Anything you say about somebody else never does/i)).toBeTruthy()
    expect(screen.queryByText(/Nobody ever reads what you write/i)).toBeNull()
  })

  it('source-level: JoinPage runs no pipeline and signs nobody in', () => {
    const src = readFileSync(pjoin(dirname(fileURLToPath(import.meta.url)), 'JoinPage.tsx'), 'utf8')
    expect(src).not.toMatch(/entryApi/)
    expect(src).not.toMatch(/joinApi\.commit\(/)
    /* The two lines that used to make this page dangerous. */
    expect(src).not.toMatch(/setAuth/)
    expect(src).not.toMatch(/joinApi\.confirm\(/)
  })
})
