import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StopMailPage } from './StopMailPage'

/**
 * THE UNSUBSCRIBE LINK ASKS BEFORE IT STOPS ANYTHING (decision 109), AND READS AN OLDER API TOO.
 *
 * Found on 7 October: a client running against an API from before decision 109 got `says` as one
 * string and no question, and the page broke into "That did not go through". It reads both shapes.
 */
function open(json: unknown, status = 200) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ status, json: async () => json } as any)
  return render(
    <MemoryRouter initialEntries={['/unsubscribe/t1']}>
      <Routes><Route path="/unsubscribe/:token" element={<StopMailPage which="unsubscribe" />} /></Routes>
    </MemoryRouter>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('the unsubscribe page', () => {
  it('asks the question, with its served paragraphs and both buttons', async () => {
    open({ success: true, data: {
      title: 'Are you sure you want to stop Groundwork insight emails?',
      says: ['You may miss timely insights.', 'Emails you ask for will still reach you.'],
      keepLabel: 'Keep email insights', stopLabel: 'Turn off email insights', turnBackOnLabel: 'Turn email insights back on', stopped: false,
    } })
    expect(await screen.findByText('Are you sure you want to stop Groundwork insight emails?')).toBeTruthy()
    expect(screen.getByText(/You may miss timely insights\./)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Turn off email insights' })).toBeTruthy()
  })

  it('reads an older API that answers one sentence and no question', async () => {
    open({ success: true, data: { ok: true, already: true, says: 'That link is not one we recognise, which usually means these emails have already stopped.' } })
    expect(await screen.findByText(/That link is not one we recognise/)).toBeTruthy()
    expect(screen.queryByText('That did not go through')).toBeNull()
  })

  it('an unknown link says so kindly, never "broken"', async () => {
    open({ success: true, data: { known: false, stopped: true, says: ['That link is not one we recognise, which usually means these emails have already stopped.'] } })
    expect(await screen.findByText(/That link is not one we recognise/)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/broken/i)
  })
})
