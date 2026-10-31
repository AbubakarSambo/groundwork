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
  it('reads the welcome card and the checklist, with WhatsApp left out while it is off', async () => {
    open(ADMIN)
    expect(await screen.findByRole('heading', { name: 'You’re an admin at Nyali Foods' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Got it' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Get Nyali Foods going' })).toBeTruthy()
    expect(screen.getByText('0 of 3 done')).toBeTruthy()
    /* Rebuilt from the shared parts (group 2): the checklist's own class moved from the old
       `gw-get-going-title` to `gwui-get-going-title`, in gw-ui.css. */
    expect([...document.querySelectorAll('.gwui-get-going-title')].map(e => e.textContent)).toEqual([
      'Invite your team', 'Add a second admin', 'Start your first check-in',
    ])
    /* Each button says what it does (Hafsah, 30 October 2026: plain language for an impatient
       first-time lead); three buttons all called "Do it" side by side said nothing. */
    expect(['Invite people', 'Add an admin', 'Start a check-in'].map(name => screen.getByRole('link', { name }).getAttribute('href'))).toEqual(['/org/members', '/org/members', '/start'])
    expect(screen.queryByRole('link', { name: 'Do it' })).toBeNull()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/WhatsApp/)
    /* Taken off the first screen (Hafsah, 30 October 2026: plain language for an impatient
       first-time lead). The prototype's Today has no such paragraph; the same sentence stays in
       the guide for leads and admins and on a person's own page. */
    expect(text).not.toMatch(/You can see every board and report/)
  })

  /*
   * SCREEN FAULT 7: "GOT IT" SAT BETWEEN THE TITLE AND THE BODY - a new admin's card invited them
   * to dismiss it before they had read what it said. It now comes after everything the card says
   * (the body sentence and the doors list), not beside the heading.
   */
  it('"Got it" sits after the card\'s body, not between the title and it', async () => {
    const { container } = open(ADMIN)
    await screen.findByRole('heading', { name: 'You’re an admin at Nyali Foods' })
    const card = container.querySelector('.gwui-welcome-card') as HTMLElement
    const children = [...card.children].map(c => c.className || c.tagName)
    const gotIt = screen.getByRole('button', { name: 'Got it' })
    expect(card.contains(gotIt)).toBe(true)
    /* The button's own ancestor (the flex-end row) comes after the doors list, last among the
       card's direct children - not inside the head row beside the title. */
    const headIndex = children.indexOf('gwui-welcome-card-head')
    const doorsIndex = children.findIndex(c => c === 'gwui-welcome-doors')
    const gotItRowIndex = [...card.children].findIndex(c => c.contains(gotIt))
    expect(gotItRowIndex).toBeGreaterThan(doorsIndex)
    expect(gotItRowIndex).toBeGreaterThan(headIndex)
    /* And not inside the head row itself. */
    expect(card.children[headIndex].contains(gotIt)).toBe(false)
  })

  /* U.17: the Suites door came with the Suites page, in the prototype's place and words. */
  it('the welcome card has the prototype\'s doors, Suites included now that its page exists', async () => {
    open(ADMIN)
    await screen.findByRole('heading', { name: 'You’re an admin at Nyali Foods' })
    /* Rebuilt from the shared parts (group 2): `gw-welcome-door` -> `gwui-welcome-door`. */
    const doors = [...document.querySelectorAll('.gwui-welcome-door')].map(a => [a.querySelector('b')?.textContent, a.querySelector('span')?.textContent, a.getAttribute('href')])
    expect(doors).toEqual([
      ['People', 'Invite people, set their roles and teams, and let guests in.', '/org/members'],
      ['Connections', 'Bring in your numbers, and connect your other tools.', '/settings/connections'],
      ['Suites', 'Switch on leave, spending and onboarding when you need them.', '/settings/suites'],
      ['Plan and billing', 'Your seats, your card and your invoices.', '/billing'],
    ])
  })

  /* DECISION 112, 7 October: this used to say "Connect WhatsApp", which read as though setting up
     an organisation's own number were the normal next step. Updated to "Turn on WhatsApp", true
     whether or not the organisation ever connects a number of its own - Groundwork's own number
     already works once an admin turns WhatsApp on. */
  it('the Connections door names WhatsApp only while WhatsApp is switched on', async () => {
    open(ADMIN, { ...NEW, whatsappOn: true })
    await screen.findByRole('heading', { name: 'You’re an admin at Nyali Foods' })
    expect(screen.getByText('Turn on WhatsApp, bring in your numbers, and connect your other tools.')).toBeTruthy()
  })

  /* SCREEN FAULT 3: Connections has no "your own address" feature - ConnectionsPage.tsx leaves it
     out on purpose (Hafsah, 29 September, item 11) - so the Today card must never promise it. */
  it('never promises "your own address", which Connections does not offer', async () => {
    open(ADMIN)
    await screen.findByRole('heading', { name: 'You’re an admin at Nyali Foods' })
    expect(document.body.textContent).not.toMatch(/own address/)
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

  it('ticks what has happened', async () => {
    open(ADMIN, { ...NEW, people: 3, checkIns: 1 })
    expect(await screen.findByText('2 of 3 done')).toBeTruthy()
    expect(screen.getAllByText('Done')).toHaveLength(2)
  })

  it('"Got it" is saved on the server and the card goes', async () => {
    open(ADMIN)
    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/users/me/welcome-card/seen'))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'You’re an admin at Nyali Foods' })).toBeNull())
    expect(screen.getByRole('heading', { name: 'Get Nyali Foods going' })).toBeTruthy()
  })

  it('"Got it" that does not go through says so, and the card stays', async () => {
    open(ADMIN)
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('offline'))
    const { toast } = await import('sonner')
    const err = vi.spyOn(toast, 'error')
    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }))
    await waitFor(() => expect(err).toHaveBeenCalledWith('That did not go through, and nothing has changed. Try again.'))
    expect(screen.getByRole('heading', { name: 'You’re an admin at Nyali Foods' })).toBeTruthy()
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
