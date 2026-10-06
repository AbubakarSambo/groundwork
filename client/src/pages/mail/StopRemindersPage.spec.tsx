import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StopRemindersPage } from './StopRemindersPage'

/**
 * "STOP THESE REMINDERS" (A3, #/stop), AS THE PERSON WHO PRESSED THE LINK READS IT. Wording from
 * stop.txt; what follows each button is ours.
 */
const calls: string[] = []
function answer(map: Record<string, any>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const what = url.split('/').pop()!
    calls.push(what)
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

describe('opening the link', () => {
  it('stops the reminders at once and names the check-in, in the prototype\'s words', async () => {
    answer({ stop: { known: true, checkInName: 'Sales team, Q3', reminders: 'off' } })
    open()
    expect(await screen.findByRole('heading', { name: 'Done. No more reminders for Sales team, Q3.' })).toBeTruthy()
    expect(screen.getByText('You’ll still get your check-ins and reports. You just won’t be nudged if you haven’t answered.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Turn them back on' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stop all email from Groundwork instead' })).toBeTruthy()
    expect(screen.getByText('No sign-in needed; the link in the email was enough. You can change any of this later in Settings.')).toBeTruthy()
    expect(calls).toEqual(['stop'])
  })

  it('a link we do not know says so plainly and offers nothing', async () => {
    answer({ stop: { known: false } })
    open()
    expect(await screen.findByText(/That link does not match anything/)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('a server that cannot answer says nothing changed and what to do', async () => {
    answer({ stop: 500 })
    open()
    expect(await screen.findByRole('heading', { name: 'That did not go through' })).toBeTruthy()
  })
})

describe('the two ways on', () => {
  it('"Turn them back on"', async () => {
    answer({ stop: { known: true, checkInName: 'Sales team, Q3' }, start: { known: true, checkInName: 'Sales team, Q3', reminders: 'on' } })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Turn them back on' }))
    expect(await screen.findByRole('heading', { name: 'Your reminders for Sales team, Q3 are back on.' })).toBeTruthy()
    await waitFor(() => expect(calls).toEqual(['stop', 'start']))
  })

  it('"Stop all email from Groundwork instead"', async () => {
    answer({ stop: { known: true, checkInName: 'Sales team, Q3' }, 'stop-all': { known: true, allEmail: 'off' } })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Stop all email from Groundwork instead' }))
    expect(await screen.findByRole('heading', { name: 'Done. No more email from Groundwork.' })).toBeTruthy()
    expect(screen.getByText('Only what you ask for yourself still comes, such as a sign-in link.')).toBeTruthy()
  })
})
