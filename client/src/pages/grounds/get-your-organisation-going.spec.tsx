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
    expect(screen.getAllByRole('link', { name: 'Do it' }).map(a => a.getAttribute('href'))).toEqual(['/org/members', '/org/members', '/start'])
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/WhatsApp/)
    /* Ask is named for the organisation (decision 100): "Ask Nyali Foods", not "Ask Groundwork".
       SCREEN FAULT 8: "a performance plan, promotion or renewal" left out the fourth kind
       who-may-read-this-check-in.ts closes to an admin (somebody's first 90 days). Updated to the
       one shared sentence (lib/what-an-admin-cannot-read-without-access.ts) Today, the guide and a
       person's own page all now read, word for word. */
    expect(screen.getByText(
      'You can see every board and report, including what people said in them. You never see anyone’s questions to Ask Nyali Foods, anyone’s own report, or a lead’s private notes, and never a performance plan, a promotion, a renewal or somebody\'s first 90 days unless given access to that check-in.',
    )).toBeTruthy()
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

  it('the Connections door names WhatsApp only while WhatsApp is switched on', async () => {
    open(ADMIN, { ...NEW, whatsappOn: true })
    await screen.findByRole('heading', { name: 'You’re an admin at Nyali Foods' })
    expect(screen.getByText('Connect WhatsApp, bring in your numbers, and connect your other tools.')).toBeTruthy()
  })

  /* SCREEN FAULT 3: Connections has no "your own address" feature - ConnectionsPage.tsx leaves it
     out on purpose (Hafsah, 29 September, item 11) - so the Today card must never promise it. */
  it('never promises "your own address", which Connections does not offer', async () => {
    open(ADMIN)
    await screen.findByRole('heading', { name: 'You’re an admin at Nyali Foods' })
    expect(document.body.textContent).not.toMatch(/own address/)
  })

  it('with WhatsApp switched on, the fourth row, and "0 of 4 done", as the prototype has it', async () => {
    open(ADMIN, { ...NEW, whatsappOn: true })
    expect(await screen.findByText('0 of 4 done')).toBeTruthy()
    expect(screen.getByText('Connect WhatsApp (optional)')).toBeTruthy()
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
  it('are the prototype\'s, in its order', () => {
    expect(getItGoing({ ...NEW, whatsappOn: true }).map(s => s.title)).toEqual([
      'Invite your team', 'Add a second admin', 'Start your first check-in', 'Connect WhatsApp (optional)',
    ])
  })
})
