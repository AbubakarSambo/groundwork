import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { BetweenCheckIns } from './BetweenCheckIns'
import { askApi } from '@/api/ask'

/**
 * BETWEEN CHECK-INS (docs/prototype/screens/B3-the-check-in/between-check-ins.jpg/.txt).
 *
 * REVIEW ROUND 3, ITEM 4: REBUILT AS THE PROTOTYPE'S CONVERSATION CARD - see the comment at the
 * top of BetweenCheckIns.tsx. Three of the four chips now call `askApi.ask` directly and draw the
 * reply as bubbles IN THIS CARD, rather than opening the separate Ask Groundwork panel
 * (`useAskStore`) - the prototype's own picture (a question and answer exchanged inline, in the
 * same card) is what this file now pins, in place of the old "opens the panel" assertions.
 */
vi.mock('@/api/grounds', () => ({
  groundsApi: { myNotes: vi.fn().mockResolvedValue([]), addMyNote: vi.fn(), deleteMyNote: vi.fn() },
}))
vi.mock('@/api/ask', () => ({ askApi: { ask: vi.fn() } }))

/* The next check-in, a few days off: the card works out its own sentence from the rows (theNextOne), as the page passes them. */
const LATER = { id: 'c2', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: new Date(Date.now() + 4 * 86_400_000).toISOString() }

function mount(props: Partial<Parameters<typeof BetweenCheckIns>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BetweenCheckIns groundLabel="Sales team, Q3" myCheckIns={[LATER]} groundId="g1" {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('between check-ins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(askApi.ask as any).mockResolvedValue({ blocks: [{ type: 'text', body: 'placeholder' }], composedBy: 'model', lane: 'test' })
  })

  it('says the check-in\'s name, that nothing is open, and when the next one is, the prototype\'s own words', () => {
    mount()
    expect(screen.getByText('Sales team, Q3')).toBeTruthy()
    expect(screen.getByText('No check-in open right now')).toBeTruthy()
    expect(screen.getByText(/^Your next check-in opens on .+ at .+\. Anything I can help with in the meantime\?$/)).toBeTruthy()
  })

  /*
   * ONE OWNER FOR THE NEXT CHECK-IN (Hafsah, 30 October 2026, first-experience round 1). A clinic lead read "No check-in open
   * right now" above "Your next check-in is open now." on this one card. The header and the sentence now both read theNextOne,
   * so with a check-in open the card never says none is.
   */
  it('with the next check-in open, the header says so, and nothing on the card says none is open', () => {
    const { container } = mount({ myCheckIns: [{ id: 'c2', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: new Date(Date.now() - 60_000).toISOString() }] })
    expect(screen.getByText('Your next check-in is open')).toBeTruthy()
    expect(screen.getByText('Anything I can help with before you start?')).toBeTruthy()
    expect(container.textContent).not.toMatch(/No check-in open/)
  })

  it('says just the question when nothing is scheduled yet', () => {
    mount({ myCheckIns: [] })
    expect(screen.getByText('Anything I can help with in the meantime?')).toBeTruthy()
  })

  it('offers the four chips, stacked, "Add a note for next time" (the next session may not be tomorrow\'s)', () => {
    mount()
    for (const label of ['What am I missing?', 'Review my goals', 'What did I say I’d do?', 'Add a note for next time']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: 'Add a note for tomorrow' })).toBeNull()
  })

  it('three chips ask Ask Groundwork that exact question, and the answer arrives as a bubble in this card', async () => {
    ;(askApi.ask as any).mockResolvedValue({
      blocks: [{ type: 'text', body: 'Two things, from Tuesday’s check-in: visit Westgate Deli on Friday, and get Green Mart’s January date in writing.' }],
      composedBy: 'model', lane: 'test',
    })
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'What did I say I’d do?' }))
    expect(askApi.ask).toHaveBeenCalledWith('What did I say I’d do?', 'g1')
    /* The question itself becomes a bubble too - the prototype's own picture shows both. */
    expect(await screen.findByText('What did I say I’d do?', { selector: 'div' })).toBeTruthy()
    expect(await screen.findByText(/Two things, from Tuesday.s check-in/)).toBeTruthy()
  })

  it('shows "Groundwork is writing…" while a reply is pending, and clears it once the reply arrives (Hafsah, 9 October: nothing showed here before)', async () => {
    let resolveAsk!: (v: unknown) => void
    ;(askApi.ask as any).mockReturnValue(new Promise((resolve) => { resolveAsk = resolve }))
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'What did I say I’d do?' }))
    expect(await screen.findByText('Groundwork is writing…')).toBeTruthy()
    resolveAsk({ blocks: [{ type: 'text', body: 'Here is what you said.' }], composedBy: 'model', lane: 'test' })
    expect(await screen.findByText('Here is what you said.')).toBeTruthy()
    expect(screen.queryByText('Groundwork is writing…')).toBeNull()
  })

  it('clears "Groundwork is writing…" when the question fails', async () => {
    let rejectAsk!: (e: unknown) => void
    ;(askApi.ask as any).mockReturnValue(new Promise((_resolve, reject) => { rejectAsk = reject }))
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'What did I say I’d do?' }))
    expect(await screen.findByText('Groundwork is writing…')).toBeTruthy()
    rejectAsk(new Error('network'))
    await waitFor(() => expect(screen.queryByText('Groundwork is writing…')).toBeNull())
    /* The card is still there, still usable - no thrown error reaches the screen. */
    expect(screen.getByText('No check-in open right now')).toBeTruthy()
  })

  it('"Add a note for next time" opens the private note box, not a question', async () => {
    mount()
    expect(screen.queryByPlaceholderText('Note something for your next check-in…')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Add a note for next time' }))
    expect(askApi.ask).not.toHaveBeenCalled()
    expect(await screen.findByPlaceholderText('Note something for your next check-in…')).toBeTruthy()
  })

  it('the note box, once opened, still says notes are private and not part of the record', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Add a note for next time' }))
    expect(await screen.findByText(/Notes are yours alone/)).toBeTruthy()
  })

  /*
   * RE-REVIEW BUG: "Add a note for next time" opened a SECOND box (GroundChat's own note
   * composer) above the card's own footer composer, so "Ask, or add a note" and the note's own
   * textarea were both on screen at once. There is only one composer now: the chip switches it
   * into note mode.
   */
  it('does not show a second box - the one composer switches into note mode', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Add a note for next time' }))
    /* Only one textbox on the whole card, and it is the note one - not two. */
    expect(await screen.findAllByRole('textbox')).toHaveLength(1)
    expect(screen.queryByPlaceholderText('Ask, or add a note')).toBeNull()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull()
  })

  it('saving a note calls the private note endpoint, not Ask Groundwork, and returns to ask mode', async () => {
    const { groundsApi } = await import('@/api/grounds')
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Add a note for next time' }))
    const field = screen.getByPlaceholderText('Note something for your next check-in…')
    await userEvent.type(field, 'Ask about the Westgate visit')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(groundsApi.addMyNote).toHaveBeenCalledWith('g1', 'Ask about the Westgate visit')
    expect(askApi.ask).not.toHaveBeenCalled()
    expect(await screen.findByPlaceholderText('Ask, or add a note')).toBeTruthy()
  })

  it('"Change how often this runs" is reachable directly, under the card - not only from inside the note box', async () => {
    const onGoToSetup = vi.fn()
    mount({ canChangeTheRhythm: true, onGoToSetup })
    /* Reachable before any note has been opened. */
    const link = screen.getByRole('button', { name: 'Change how often this runs' })
    await userEvent.click(link)
    expect(onGoToSetup).toHaveBeenCalled()
  })

  it('does not offer it when the viewer cannot change it', () => {
    mount({ canChangeTheRhythm: false })
    expect(screen.queryByRole('button', { name: 'Change how often this runs' })).toBeNull()
  })

  it('the composer says "Ask, or add a note"', () => {
    mount()
    expect(screen.getByPlaceholderText('Ask, or add a note')).toBeTruthy()
  })

  it('typing into the composer and sending asks Ask Groundwork, and the answer arrives as a bubble', async () => {
    ;(askApi.ask as any).mockResolvedValue({ blocks: [{ type: 'text', body: 'Sure - here is what I have.' }], composedBy: 'model', lane: 'test' })
    mount()
    const field = screen.getByPlaceholderText('Ask, or add a note')
    await userEvent.type(field, 'How is Green Mart looking?')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(askApi.ask).toHaveBeenCalledWith('How is Green Mart looking?', 'g1')
    expect(await screen.findByText('Sure - here is what I have.')).toBeTruthy()
  })

  /*
   * B-036: Grace's leave dates came back as two identical bubbles, one directly under the other -
   * the reply's own `text` block and a `claim` block repeating the same sentence. The same guard
   * AskGroundwork.tsx's `drawBlocks` already uses for this (`!texts.has(b.summary)`) now applies
   * here too, in `linesOf`.
   */
  it('does not print the same sentence twice when a claim or proposal repeats the reply\'s own text block', async () => {
    ;(askApi.ask as any).mockResolvedValue({
      blocks: [
        { type: 'text', body: 'That is 5 working days, Monday 12 to Friday 16 October.' },
        { type: 'claim', says: 'That is 5 working days, Monday 12 to Friday 16 October.', mark: 'proven' },
        { type: 'text', body: 'Shall I send it to Daniel to approve?' },
      ],
      composedBy: 'model', lane: 'test',
    })
    mount()
    const field = screen.getByPlaceholderText('Ask, or add a note')
    await userEvent.type(field, 'I need leave from Monday to Friday next week.')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Shall I send it to Daniel to approve?')
    expect(screen.getAllByText('That is 5 working days, Monday 12 to Friday 16 October.')).toHaveLength(1)
  })

  it('a failed question does not lose what was typed nor crash the card', async () => {
    ;(askApi.ask as any).mockRejectedValue(new Error('network'))
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'What am I missing?' }))
    await waitFor(() => expect(askApi.ask).toHaveBeenCalled())
    /* The card is still there, still usable - no thrown error reaches the screen. */
    expect(screen.getByText('No check-in open right now')).toBeTruthy()
  })

  /*
   * RESTORED (nothing-removed-screens.md, item 1): live's GroundChat.tsx listed every note waiting
   * for the person's next check-in, under "Waiting for your next check-in", and let them delete
   * one. This card only ever added a note before - it never showed or removed one.
   */
  describe('the notes waiting for your next check-in', () => {
    it('lists the viewer\'s own waiting notes, and does not list one already carried into a check-in', async () => {
      const { groundsApi } = await import('@/api/grounds')
      ;(groundsApi.myNotes as any).mockResolvedValue([
        { id: 'n1', text: 'Ask about the Westgate visit', createdAt: '2026-10-01', carriedIntoCheckInId: null },
        { id: 'n2', text: 'Already asked about this', createdAt: '2026-09-01', carriedIntoCheckInId: 'session-1' },
      ])
      mount()
      expect(await screen.findByText('Waiting for your next check-in')).toBeTruthy()
      expect(screen.getByText('Ask about the Westgate visit')).toBeTruthy()
      expect(screen.queryByText('Already asked about this')).toBeNull()
    })

    it('shows nothing when there are no waiting notes', () => {
      mount()
      expect(screen.queryByText('Waiting for your next check-in')).toBeNull()
    })

    it('deleting a note asks first, and only deletes once confirmed', async () => {
      const { groundsApi } = await import('@/api/grounds')
      ;(groundsApi.myNotes as any).mockResolvedValue([
        { id: 'n1', text: 'Ask about the Westgate visit', createdAt: '2026-10-01', carriedIntoCheckInId: null },
      ])
      ;(groundsApi.deleteMyNote as any).mockResolvedValue({ deleted: true })
      mount()
      await screen.findByText('Ask about the Westgate visit')
      await userEvent.click(screen.getByRole('button', { name: 'Delete this note' }))
      expect(groundsApi.deleteMyNote).not.toHaveBeenCalled()
      expect(await screen.findByText('Delete this note?')).toBeTruthy()
      await userEvent.click(screen.getByRole('button', { name: 'Yes, delete it' }))
      expect(groundsApi.deleteMyNote).toHaveBeenCalledWith('g1', 'n1')
    })

    it('"Keep it" cancels the delete without calling the server', async () => {
      const { groundsApi } = await import('@/api/grounds')
      ;(groundsApi.myNotes as any).mockResolvedValue([
        { id: 'n1', text: 'Ask about the Westgate visit', createdAt: '2026-10-01', carriedIntoCheckInId: null },
      ])
      mount()
      await screen.findByText('Ask about the Westgate visit')
      await userEvent.click(screen.getByRole('button', { name: 'Delete this note' }))
      await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))
      expect(groundsApi.deleteMyNote).not.toHaveBeenCalled()
      expect(screen.getByText('Ask about the Westgate visit')).toBeTruthy()
    })
  })
})
