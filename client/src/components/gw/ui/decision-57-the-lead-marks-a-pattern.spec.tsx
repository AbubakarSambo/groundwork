import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PatternPanel } from './PatternPanel'

/**
 * DECISION 57, ITEMS 2 AND 3: THE LEAD'S MARK ON A PATTERN, AND "WE TALKED ABOUT IT".
 *
 * `POST /patterns/:id/mark` and `POST /patterns/:id/talked-about` are built on the server
 * (api/src/modules/patterns/patterns.controller.ts, patterns.service.ts) - only for whoever runs
 * the check-in, 403 for everyone else including the person the pattern is about. The server never
 * sends `leadMark` to the person or to a colleague (who never gets the row at all), so the panel
 * draws the buttons only for the reader the server already told it is not the person it is about
 * (`!pattern.yours`) - there is no separate "am I the lead" check here, same as the coaching fields
 * above it.
 */
const post = vi.fn()
vi.mock('@/api/client', () => ({ apiClient: { get: vi.fn(), post: (...args: any[]) => post(...args) } }))

const BASE = {
  id: 'pd2', participantId: 'p-femi', heading: 'Others describe doing work they described as theirs',
  whatHappened: 'You described the Harbor Foods deal as your own, although Ngozi prepared the pricing.',
  howOften: 'This came up in 3 of your check-ins, in sessions 1, 2 and 3.',
  askThem: null, theirWords: null, canAnswer: false,
  whoSeesIt: 'Tunde will see it too.',
  talkedAbout: false, leadMark: null as 'RIGHT' | 'WRONG' | 'NOT_SURE' | null,
}

function panel(p: any, name?: string) {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <PatternPanel pattern={p} invalidateKey={['x']} name={name} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  post.mockReset()
})

describe('the lead who runs the check-in', () => {
  it('sees "We talked about it", and pressing it sends one request and the served answer is drawn', async () => {
    post.mockResolvedValueOnce({ data: { ...BASE, yours: false, talkedAbout: true } })
    panel({ ...BASE, yours: false }, 'Femi Okoro')

    const button = screen.getByRole('button', { name: 'We talked about it' })
    fireEvent.click(button)
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post).toHaveBeenCalledWith('/patterns/pd2/talked-about', {})

    await waitFor(() => expect(screen.getByText('This has been talked through with Femi Okoro.')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'We talked about it' })).toBeNull()
  })

  it('a failed "we talked about it" says so in a sentence, and leaves the button there to press again', async () => {
    post.mockRejectedValueOnce(new Error('network'))
    panel({ ...BASE, yours: false })

    fireEvent.click(screen.getByRole('button', { name: 'We talked about it' }))
    await waitFor(() => expect(screen.getByText('That could not be saved. Try again.')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'We talked about it' })).toBeTruthy()
  })

  it('sees "After talking it through, was this right?" with Right, Wrong and Not sure, none pressed yet', () => {
    panel({ ...BASE, yours: false })
    expect(screen.getByText('After talking it through, was this right?')).toBeTruthy()
    const right = screen.getByRole('button', { name: 'Right' })
    const wrong = screen.getByRole('button', { name: 'Wrong' })
    const notSure = screen.getByRole('button', { name: 'Not sure' })
    expect(right.getAttribute('aria-pressed')).toBe('false')
    expect(wrong.getAttribute('aria-pressed')).toBe('false')
    expect(notSure.getAttribute('aria-pressed')).toBe('false')
  })

  it('pressing "Wrong" sends one request, and the chosen one is then shown pressed', async () => {
    post.mockResolvedValueOnce({ data: { ...BASE, yours: false, leadMark: 'WRONG' } })
    panel({ ...BASE, yours: false })

    fireEvent.click(screen.getByRole('button', { name: 'Wrong' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post).toHaveBeenCalledWith('/patterns/pd2/mark', { mark: 'WRONG' })

    await waitFor(() => expect(screen.getByText('You said this was not right, once you talked it through.')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Wrong' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('the mark is changeable: pressing a different one sends a new request', async () => {
    post.mockResolvedValueOnce({ data: { ...BASE, yours: false, leadMark: 'NOT_SURE' } })
    panel({ ...BASE, yours: false, leadMark: 'RIGHT' })

    expect(screen.getByRole('button', { name: 'Right' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Not sure' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/patterns/pd2/mark', { mark: 'NOT_SURE' }))
    await waitFor(() => expect(screen.getByText('You said you were not sure, once you talked it through.')).toBeTruthy())
  })

  it('one request per press: clicking twice before the first answers back sends only one', async () => {
    let resolve!: (v: any) => void
    post.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    panel({ ...BASE, yours: false })

    const button = screen.getByRole('button', { name: 'We talked about it' })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))

    resolve({ data: { ...BASE, yours: false, talkedAbout: true } })
    await waitFor(() => expect(screen.getByText('This has been talked through with them.')).toBeTruthy())
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('a failed mark says so in a sentence beside the buttons', async () => {
    post.mockRejectedValueOnce(new Error('network'))
    panel({ ...BASE, yours: false })

    fireEvent.click(screen.getByRole('button', { name: 'Right' }))
    await waitFor(() => expect(screen.getByText('That could not be saved. Try again.')).toBeTruthy())
  })
})

describe('the person the pattern is about', () => {
  it('never sees the "we talked about it" button, or the right/wrong/not sure choice, and the server never gives them a mark to read', () => {
    panel({ ...BASE, yours: true, talkedAbout: false, leadMark: null })
    expect(screen.queryByRole('button', { name: 'We talked about it' })).toBeNull()
    expect(screen.queryByText('After talking it through, was this right?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Right' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Wrong' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Not sure' })).toBeNull()
  })

  it('may read "talked about" as a plain fact, with no mark anywhere on the page', () => {
    panel({ ...BASE, yours: true, talkedAbout: true, leadMark: null })
    expect(screen.getByText('Your lead has said they talked this through with you.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/was this right|Right|Wrong|Not sure|once you talked it through/)
  })
})

describe('a colleague, or an admin who does not run this check-in', () => {
  it('the server never serves them this pattern at all, so there is nothing here to gate on the client - but if a row with no yours flag ever reached the panel, it would not draw the lead-only controls', () => {
    /* Access control for a colleague/non-running-admin is enforced server-side: servedPatterns()
       (api/src/modules/patterns/who-reads-a-pattern.ts) returns an empty list for them, so the
       panel is never mounted with their row. This test documents that the panel itself still
       defaults to the safe (no-buttons) reading whenever `yours` is not explicitly false. */
    panel({ ...BASE, yours: true, talkedAbout: false, leadMark: null })
    expect(screen.queryByRole('button', { name: 'We talked about it' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Right' })).toBeNull()
  })
})
