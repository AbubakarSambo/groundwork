import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminFirstRun, getItGoing } from './an-admin-lands-on-a-check-in-list'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

/**
 * A NEW ORGANISATION'S WELCOME CARD AND "GET <ORGANISATION> GOING" (U.3), AS EACH READER SEES THEM.
 * Item 11 conflict B, answered 29 September: Hafsah's exact sentence ("You can see every board and
 * report, including what people said in them. ... and never a performance plan, promotion or
 * renewal unless given access to that check-in.") replaces the old held sentence, which pointed
 * "They" at nobody.
 */
const NEW = { people: 1, admins: 1, checkIns: 0, paying: false, connected: false, whatsappOn: false, whatsappConnected: false, welcomeCardSeen: false }

function open(user: any, facts: any = NEW) {
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: facts } } as any)
  vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: { seen: true } } } as any)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><AdminFirstRun /></MemoryRouter></QueryClientProvider>)
}
const ADMIN = { id: 'u1', firstName: 'Wanjiru', role: 'ADMIN', organizationName: 'Nyali Foods', organization: { name: 'Nyali Foods' } }

beforeEach(() => { vi.restoreAllMocks() })

describe('the new admin', () => {
  /*
   * ONE LINE, NOT A GUIDE (page audit, 24 November 2026, row 10, approved by Hafsah). The welcome card, "You’re an admin at
   * <organisation>" with four doors and "Got it", was about 530px on a phone; it is one line now, "You’re an admin. Set things up",
   * linking to People. The four doors, and the tests on their wording, went with it: each door is still under the organisation's name
   * in the side rail.
   */
  it('reads one line and the checklist, with WhatsApp left out while it is off', async () => {
    open(ADMIN)
    expect(await screen.findByText(/You’re an admin\./)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Set things up' }).getAttribute('href')).toBe('/org/members')
    expect(screen.queryByRole('heading', { name: /You’re an admin at/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Get Nyali Foods going' })).toBeTruthy()
    expect(screen.getByText('0 of 3 done')).toBeTruthy()
    expect([...document.querySelectorAll('.gwui-get-going-title')].map(e => e.textContent)).toEqual([
      'Invite your team', 'Add a second admin', 'Start your first check-in',
    ])
    expect(['Invite people', 'Add an admin', 'Start a check-in'].map(name => screen.getByRole('link', { name }).getAttribute('href'))).toEqual(['/org/members', '/org/members', '/start'])
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/WhatsApp/)
    expect(text).not.toMatch(/own address/)
    expect(text).not.toMatch(/You can see every board and report/)
  })

  /*
   * UPDATED FOR DECISION 112, 7 October. This used to show a fourth row, "Connect WhatsApp
   * (optional)", leading to the page that sets up an organisation's own number, whenever WhatsApp
   * was switched on anywhere - which made setting up an own number look like a normal early step.
   * Groundwork's own number already works for everyone once an admin turns WhatsApp on in Plan and
   * billing, so this checklist stays at three steps whether or not WhatsApp is switched on.
   */
  it('stays at three steps even with WhatsApp switched on', async () => {
    open(ADMIN, { ...NEW, whatsappOn: true })
    expect(await screen.findByText('0 of 3 done')).toBeTruthy()
    expect(screen.queryByText('Connect WhatsApp (optional)')).toBeNull()
  })

  /* Changed in F5 (the approved journey, stage 8): the checklist moves off Today once a check-in exists, so the ticks are read
     before one does, and the list is gone after. */
  it('ticks what has happened', async () => {
    open(ADMIN, { ...NEW, people: 3, admins: 2, checkIns: 0 })
    expect(await screen.findByText('2 of 3 done')).toBeTruthy()
    expect(screen.getAllByText('Done')).toHaveLength(2)
  })
  it('and once a check-in exists, the checklist is off Today', async () => {
    open(ADMIN, { ...NEW, people: 3, checkIns: 1 })
    await waitFor(() => expect(screen.queryByText(/Get Nyali Foods going/)).toBeNull())
  })

  it('"Set things up" is also "Got it", kept on the server, and the line goes', async () => {
    open(ADMIN)
    fireEvent.click(await screen.findByRole('link', { name: 'Set things up' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/users/me/welcome-card/seen'))
    await waitFor(() => expect(screen.queryByText(/You’re an admin\./)).toBeNull())
    expect(screen.getByRole('heading', { name: 'Get Nyali Foods going' })).toBeTruthy()
  })

  it('a press that does not go through says so, and the line stays', async () => {
    open(ADMIN)
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('offline'))
    const { toast } = await import('sonner')
    const err = vi.spyOn(toast, 'error')
    fireEvent.click(await screen.findByRole('link', { name: 'Set things up' }))
    await waitFor(() => expect(err).toHaveBeenCalledWith('That did not go through, and nothing has changed. Try again.'))
    expect(screen.getByText(/You’re an admin\./)).toBeTruthy()
  })

  it('once every step is done and the card was read, nothing is left', async () => {
    const { container } = open(ADMIN, { ...NEW, people: 3, admins: 2, checkIns: 1, welcomeCardSeen: true })
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })
})

describe('everybody else', () => {
  it('a member or a lead sees neither', () => {
    const { container } = open({ ...ADMIN, role: 'MEMBER' })
    expect(container.textContent).toBe('')
  })
})

describe('the steps', () => {
  /* DECISION 112, 7 October: no "Connect WhatsApp" step any more, with WhatsApp on or off - see the
     comment on getItGoing. */
  it('are the prototype\'s three, in its order, whatever WhatsApp\'s own state', () => {
    for (const whatsappOn of [true, false]) {
      expect(getItGoing({ ...NEW, whatsappOn }).map(s => s.title)).toEqual([
        'Invite your team', 'Add a second admin', 'Start your first check-in',
      ])
    }
  })
})
