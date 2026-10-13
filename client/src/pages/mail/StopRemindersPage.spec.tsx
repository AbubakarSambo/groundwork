import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StopRemindersPage } from './StopRemindersPage'
import { useAuthStore } from '@/stores/auth'

/**
 * "STOP THESE REMINDERS" (A3, #/stop), AS THE PERSON WHO PRESSED THE LINK READS IT. Wording from
 * stop.txt; what follows each button is ours.
 */
const calls: string[] = []
/* A GET to /reminders/tok is recorded as 'read', so a test can tell reading from pressing. */
function answer(map: Record<string, any>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { method?: string }) => {
    const last = url.split('/').pop()!
    const what = init?.method === 'POST' ? last : 'read'
    calls.push(`${init?.method ?? 'GET'} ${what}`)
    const body = map[what]
    if (body === 500) return { status: 500, json: async () => null }
    return { status: 200, json: async () => ({ success: true, data: body }) }
  }))
}

function open() {
  return render(
    <MemoryRouter initialEntries={['/stop-reminders/tok']}>
      <Routes><Route path="/stop-reminders/:token" element={<StopRemindersPage />} /></Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => { calls.length = 0; vi.unstubAllGlobals() })

/*
 * CHANGED 11 OCTOBER: opening the link used to stop the reminders at once, so a mail scanner that
 * opens every link stopped them for people who never asked. Opening now only reads and asks; the
 * prototype's stopped page (stop.txt) comes after "Stop the reminders" is pressed. The tests below
 * that opened straight onto the stopped page now press that button first.
 */
const READ = { known: true, checkInName: 'Sales team, Q3', reminders: 'on' }
const STOPPED = { known: true, checkInName: 'Sales team, Q3', reminders: 'off' }
async function openAndStop(more: Record<string, any> = {}) {
  answer({ read: READ, stop: STOPPED, ...more })
  open()
  fireEvent.click(await screen.findByRole('button', { name: 'Stop the reminders' }))
  await screen.findByRole('heading', { name: 'Done. No more reminders for Sales team, Q3.' })
}

describe('opening the link', () => {
  it('asks first, in a plain sentence, and stops nothing until the button is pressed', async () => {
    answer({ read: READ, stop: STOPPED })
    open()
    expect(await screen.findByRole('heading', { name: 'Do you want to stop the reminders for Sales team, Q3?' })).toBeTruthy()
    expect(screen.getByText('You’ll still get your check-ins and reports. You just won’t be nudged if you haven’t answered. Nothing changes until you press the button.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Keep the reminders' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stop the reminders' })).toBeTruthy()
    await new Promise(r => setTimeout(r, 20))
    expect(calls).toEqual(['GET read'])
  })

  it('pressing "Stop the reminders" stops them and shows the prototype\'s page', async () => {
    await openAndStop()
    expect(screen.getByText('You’ll still get your check-ins and reports. You just won’t be nudged if you haven’t answered.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Turn them back on' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stop all email from Groundwork instead' })).toBeTruthy()
    expect(screen.getByText('No sign-in needed; the link in the email was enough. You can change any of this later in Settings.')).toBeTruthy()
    expect(calls).toEqual(['GET read', 'POST stop'])
  })

  it('reminders already off open straight onto the stopped page, with nothing sent', async () => {
    answer({ read: STOPPED })
    open()
    expect(await screen.findByRole('heading', { name: 'Done. No more reminders for Sales team, Q3.' })).toBeTruthy()
    expect(calls).toEqual(['GET read'])
  })

  /*
   * UPDATED FOR B-131: this used to be headed "Done." over "That link does not match anything",
   * and the page had nothing to press but the logo - a dead end the deep page audit flagged,
   * since nothing was in fact done. It now says plainly that the reminders could not be found,
   * and offers a way to Settings for whoever wants to check their email preferences.
   *
   * UPDATED FOR B-209: the sentence used to go on to guess why ("which usually means the reminders
   * were already stopped or the check-in has closed") and then promise something that guess could
   * not support ("nothing more is going to you from it") - not true for a link simply cut short
   * when it was copied, whose reminders could still be going. It now says only what is certain, and
   * offers reopening the link as well as Settings.
   */
  it('a link we do not know says plainly that it could not be found, with a way to Settings', async () => {
    answer({ read: { known: false } })
    open()
    expect(await screen.findByRole('heading', { name: 'We could not find those reminders' })).toBeTruthy()
    expect(screen.getByText('That link does not match anything. It may have been cut short when it was copied.')).toBeTruthy()
    expect(screen.queryByText(/nothing more is going to you/i)).toBeNull()
    expect(screen.getByRole('link', { name: 'sign in to change your emails in Settings' })).toBeTruthy()
  })

  /*
   * B-209 (review round 2): SOMEBODY ALREADY SIGNED IN IS NOT TOLD TO SIGN IN TO REACH SETTINGS.
   */
  it('a link we do not know, signed in, offers Settings without "sign in"', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' }, token: 't' } as any)
    answer({ read: { known: false } })
    open()
    await screen.findByRole('heading', { name: 'We could not find those reminders' })
    expect(screen.getByRole('link', { name: 'change your emails in Settings' })).toBeTruthy()
    expect(screen.queryByText(/sign in to change/i)).toBeNull()
    useAuthStore.setState({ isAuthenticated: false, user: null, token: null } as any)
  })

  it('a server that cannot answer says nothing changed and what to do', async () => {
    answer({ read: 500 })
    open()
    expect(await screen.findByRole('heading', { name: 'That did not go through' })).toBeTruthy()
  })
})

describe('the two ways on', () => {
  it('"Turn them back on"', async () => {
    await openAndStop({ start: { known: true, checkInName: 'Sales team, Q3', reminders: 'on' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Turn them back on' }))
    expect(await screen.findByRole('heading', { name: 'Your reminders for Sales team, Q3 are back on.' })).toBeTruthy()
    await waitFor(() => expect(calls).toEqual(['GET read', 'POST stop', 'POST start']))
  })

  it('"Stop all email from Groundwork instead"', async () => {
    await openAndStop({ 'stop-all': { known: true, allEmail: 'off' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Stop all email from Groundwork instead' }))
    expect(await screen.findByRole('heading', { name: 'Done. No more email from Groundwork.' })).toBeTruthy()
    expect(screen.getByText('Only what you ask for yourself still comes, such as a sign-in link.')).toBeTruthy()
  })
})
