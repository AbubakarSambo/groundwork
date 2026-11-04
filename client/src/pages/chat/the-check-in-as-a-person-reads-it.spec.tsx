import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi, streamMessage } from '@/api/conversation'
import { documentsApi } from '@/api/documents'
import { groundsApi } from '@/api/grounds'

/**
 * THE CHECK-IN, AS THE PERSON ANSWERING IT READS IT (B3).
 *
 * Wording from docs/prototype/screens/B3-the-check-in/check-in-start.txt and check-in-end-card.txt.
 * What Groundwork says is the engine's and comes from the server; these tests check how the screen
 * frames it, for a participant (Miriam) and for the lead answering their own check-in (Wairimu).
 */

let me = { id: 'u-miriam', firstName: 'Miriam', email: 'miriam@x.test' }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: me }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: {
    transcript: vi.fn(), open: vi.fn(), send: vi.fn(), complete: vi.fn(), decline: vi.fn(),
    artifact: vi.fn().mockResolvedValue({ artifact: null }), documentReceived: vi.fn().mockResolvedValue({ reply: '' }),
  },
  streamMessage: vi.fn().mockRejectedValue(new Error('no stream in tests')),
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMyCheckinStatus: vi.fn() },
}))


/*
 * NO REAL WAITING. The page waits on purpose: up to two seconds of jitter before it loads the
 * conversation, and a typewriter that takes up to 2.2 seconds to show each new message from
 * Groundwork. With real timers every test sat through both, often twice (about 50 seconds for the
 * file, and timeouts under the full suite). The clock is faked instead, and `settle` moves it past
 * both waits, in half-second steps so the answers each timer waits on can arrive in between, and
 * each test reads the finished screen straight away. What is checked is the
 * same: the words each reader ends up reading.
 */
async function settle() {
  for (let i = 0; i < 12; i++) await act(async () => { await vi.advanceTimersByTimeAsync(500) })
}
const findByRole = async (...a: any[]) => { await settle(); return (screen.getByRole as any)(a[0], a[1]) as HTMLElement }
const findByText = async (...a: any[]) => { await settle(); return (screen.getByText as any)(a[0], a[1]) as HTMLElement }
const waitFor = async (check: () => void) => { await settle(); check() }

const SALES = {
  id: 'g1', label: 'Sales team, Q3', initiatorId: 'u-wairimu', viewerIsInitiator: false,
  participants: [
    { id: 'p-w', partyType: 'INITIATOR', userId: 'u-wairimu', managingOnly: false, user: { firstName: 'Wairimu', lastName: 'Kamau' }, checkIns: [] },
    { id: 'p-m', partyType: 'PARTICIPANT', userId: 'u-miriam', user: { firstName: 'Miriam', lastName: 'Wanjiku' }, checkIns: [] },
  ],
  /*
   * THE REAL SHAPE (U.8 end-of-module suites): `leadFirstName`, `leadAnswersToo` and
   * `aTeamReportComes` are top-level fields the server sends, read off the raw participants
   * before the peer filter runs (U.8 fourth/fifth review) - not derived by the client from
   * `participants`. A fixture that predates them and still expects "Wairimu also answers a
   * check-in" or "Two reports come from this" is testing wiring the page no longer has; every
   * test below that changes who the lead is or whether a team exists overrides these three
   * alongside `participants`, the same way the server would compute them together.
   */
  leadFirstName: 'Wairimu',
  leadAnswersToo: true,
  aTeamReportComes: true,
  checkIns: [],
  report: null,
}

const OPENING = 'Good news first: last week you said Lakeside’s buyer would meet you on the 29th. The buyer has now confirmed the meeting. That is in your record. Now, yesterday you said Green Mart wanted a quote. What happened?'

function renderChat(qc: QueryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/checkin/ci1']}>
        <Routes>
          <Route path="/checkin/:checkInId" element={<ChatPage />} />
          <Route path="/grounds/:id/p" element={<div>The check-in’s own page</div>} />
          <Route path="/grounds/:id" element={<div>The check-in’s own page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  me = { id: 'u-miriam', firstName: 'Miriam', email: 'miriam@x.test' }
  ;(groundsApi.get as any).mockResolvedValue(SALES)
  ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({ participantId: 'p-m', partyType: 'PARTICIPANT', checkIns: [], latestStatus: null, latestSessionNumber: null })
  ;(conversationApi.transcript as any).mockResolvedValue({
    checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
    mayCompleteAfter: 5,
    turns: [{ id: 't1', role: 'AI', content: OPENING }],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the header', () => {
  /**
   * ROUND 6, ITEM 1: THE CHECK-IN'S OWN NAME, THE PROTOTYPE'S SHAPE (check-in-start.txt:
   * "Sales team check-in", bold, "About ten minutes" under it, Pause on the right). "Your
   * check-in" named no check-in at all.
   *
   * REVIEW ROUND 3, ITEM 7: NO " check-in" APPENDED. "Sales team, Q3 check-in" reads worse than
   * the fragment it replaced - a name ending in a comma-joined part with a second noun stuck on
   * after the comma. The prototype's own title ("Sales team check-in") IS a check-in's name; this
   * one's name happens to be "Sales team, Q3", so that is the whole title, nothing appended.
   */
  it('names the check-in in the heading, and on the way back, with Pause', async () => {
    renderChat()
    expect(await findByRole('button', { name: '← Sales team, Q3' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Sales team, Q3' })).toBeTruthy()
    expect(await findByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(await findByText(OPENING, {}, { timeout: 5000 })).toBeTruthy()
  })

  /**
   * ROUND 6, ITEM 1: REVERSED FROM "DOES NOT PROMISE HOW LONG IT TAKES".
   *
   * That rule held while the header said "Your check-in": a fixed two-minute promise read as a
   * claim about the RECORD behind a check-in, which is not true for every one of them (a
   * probation review, for one). Hafsah's own read of the prototype at 1440 asked for it back -
   * the estimate is about this ONE CONVERSATION, not the record, which is true the same way for
   * every check-in, so it is honest to say plainly, as the prototype does.
   */
  it('says about how long the conversation takes', async () => {
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.getByText('About ten minutes')).toBeTruthy()
  })

  it('Pause offers to stop for now, which leaves with everything saved', async () => {
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Pause' }, { timeout: 5000 }))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByText('Stop for now')).toBeTruthy()
    expect(within(menu).getByText('Everything you have said is saved. You can come back to it any time.')).toBeTruthy()
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Stop for now/ }))
    expect(await findByText('The check-in’s own page')).toBeTruthy()
    expect(conversationApi.decline).not.toHaveBeenCalled()
  })

  it('Pause offers to skip, and skipping still asks first and says what follows', async () => {
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Pause' }, { timeout: 5000 }))
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Skip this check-in/ }))
    expect(await findByText('Not taking part in this session?')).toBeTruthy()
    expect(screen.getByText('The report will say you declined. It will not guess at what you would have said.')).toBeTruthy()
    expect(conversationApi.decline).not.toHaveBeenCalled()
  })

  it('the old underlined way to decline is gone from under the conversation', async () => {
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByText(/I do not want to take part/)).toBeNull()
  })
})

describe('suggested answers under the question', () => {
  it('shows the engine’s suggested answers under the latest question, as buttons', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, suggestedAnswers: ['Sent it. They liked it but want to wait until after December.', 'Not yet'] }],
    })
    renderChat()
    const group = await findByRole('group', { name: 'Suggested answers' }, { timeout: 6000 })
    expect(within(group).getByRole('button', { name: 'Sent it. They liked it but want to wait until after December.' })).toBeTruthy()
    expect(within(group).getByRole('button', { name: 'Not yet' })).toBeTruthy()
  })

  it('pressing one sends it as the answer, and the next question brings its own', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, suggestedAnswers: ['Not yet'] }],
    })
    ;(conversationApi.send as any).mockResolvedValue({ reply: 'So they will buy after this quarter ends. Did they give you a date?', suggestedAnswers: ['They said January'] })
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Not yet' }, { timeout: 6000 }))
    await waitFor(() => expect(conversationApi.send).toHaveBeenCalledWith('ci1', 'Not yet'))
    expect(await findByRole('button', { name: 'They said January' }, { timeout: 6000 })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Not yet' })).toBeNull()
  })

  /* 3 November 2026: on the stream the reply comes first and its suggested answers follow it, so the reply is not held for them. */
  it('reads the streamed reply first, then its suggested answers as buttons when they follow', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, suggestedAnswers: ['Not yet'] }],
    })
    ;(streamMessage as any).mockImplementationOnce(async (_id: string, _m: string, h: any) => {
      h.onDelta('So they will buy after this quarter ends. Did they give you a date?')
      h.onDone({ reply: 'So they will buy after this quarter ends. Did they give you a date?', sessionComplete: false })
      h.onSuggestions(['They said January'])
    })
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Not yet' }, { timeout: 6000 }))
    expect(await findByText('So they will buy after this quarter ends. Did they give you a date?')).toBeTruthy()
    expect(await findByRole('button', { name: 'They said January' })).toBeTruthy()
  })

  /**
   * A SUGGESTION CONTAINING "..." IS A SHAPE TO FINISH, NOT A THING TO SEND (round 3, item C).
   *
   * docs/conversation-standard.md, point 6: the engine's suggestions are "a help, never a limit".
   * Some of them are a shape with a gap the engine cannot fill in for the person - a name, a
   * number, a date - marked "...". Pressing one of those must not send an ellipsis into the
   * record; it puts the words in the box instead, with the "..." itself selected so typing
   * immediately replaces it.
   */
  it('a suggestion with "..." fills the box instead of sending, with the gap selected', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, suggestedAnswers: ['I met them on ... and they said ...'] }],
    })
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'I met them on ... and they said ...' }, { timeout: 6000 }))
    await settle()
    expect(conversationApi.send).not.toHaveBeenCalled()
    const box = screen.getByPlaceholderText('Type your answer') as HTMLTextAreaElement
    expect(box.value).toBe('I met them on ... and they said ...')
    expect(document.activeElement).toBe(box)
    expect(box.selectionStart).toBe('I met them on '.length)
    expect(box.selectionEnd).toBe('I met them on '.length + 3)
    // The suggestion stays offered - the person may still press it again, or another one, or type.
    expect(screen.getByRole('button', { name: 'I met them on ... and they said ...' })).toBeTruthy()
  })

  it('and an ordinary suggestion with no gap still sends immediately, as before', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, suggestedAnswers: ['Not yet'] }],
    })
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Not yet' }, { timeout: 6000 }))
    await waitFor(() => expect(conversationApi.send).toHaveBeenCalledWith('ci1', 'Not yet'))
    const box = screen.getByPlaceholderText('Type your answer') as HTMLTextAreaElement
    expect(box.value).toBe('')
  })

  it('draws nothing when the engine sends none, and the three fixed chips are gone', async () => {
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByRole('group', { name: 'Suggested answers' })).toBeNull()
    expect(screen.queryByText('What am I missing?')).toBeNull()
    expect(screen.queryByText('What do I carry forward?')).toBeNull()
    expect(screen.getByPlaceholderText('Type your answer')).toBeTruthy()
  })
})

/**
 * PIECE 21: THE YES IN THE PERSON'S CHECK-IN (plan section 5 row 21; decision 96, item 10;
 * docs/answers-from-engine.md, "Request 149, missing (1)", `TheIdeaOfferInTheCheckIn`). Attached to
 * the reply that offers it; the words are Hafsah's own, exactly as the answer gives them.
 */
const ideaOffer = {
  idea: 'We should review client work a month before the project closes.',
  question: 'That sounds like a concrete idea. Want me to capture it for the team?',
  whoWillSeeIt: 'Everyone in this check-in will see it, with your name on it.',
  yes: 'Yes, capture it',
  no: 'Not now',
}

describe('the yes to capture an idea for the team', () => {
  it('shows the idea, the question, who will see it, and the two answers', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, ideaOffer }],
    })
    renderChat()
    await findByText(ideaOffer.question, {}, { timeout: 6000 })
    expect(screen.getByText(`“${ideaOffer.idea}”`)).toBeTruthy()
    expect(screen.getByText(ideaOffer.whoWillSeeIt)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Yes, capture it' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Not now' })).toBeTruthy()
  })

  it('"Yes, capture it" sends it as the answer, the same as a suggested answer', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, ideaOffer }],
    })
    ;(conversationApi.send as any).mockResolvedValue({ reply: 'Noted. Anything else change with your sales today?' })
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Yes, capture it' }, { timeout: 6000 }))
    await waitFor(() => expect(conversationApi.send).toHaveBeenCalledWith('ci1', 'Yes, capture it'))
  })

  it('"Not now" sends it too, and leaves nothing behind', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, ideaOffer }],
    })
    ;(conversationApi.send as any).mockResolvedValue({ reply: 'No problem. Anything else change with your sales today?' })
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Not now' }, { timeout: 6000 }))
    await waitFor(() => expect(conversationApi.send).toHaveBeenCalledWith('ci1', 'Not now'))
    expect(screen.queryByText(ideaOffer.question)).toBeNull()
  })

  it('draws nothing when the engine sends no idea offer', async () => {
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByRole('button', { name: 'Yes, capture it' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Not now' })).toBeNull()
  })
})

describe('the + button', () => {
  it('offers a photo or a document, or text, and says who can read it', async () => {
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Add a photo, a document or some text' }, { timeout: 5000 }))
    expect(screen.getByText('Add a photo or a document')).toBeTruthy()
    expect(screen.getByText('Paste text')).toBeTruthy()
    expect(screen.getByText('It starts private to you. You choose who can read it.')).toBeTruthy()
  })

  it('the paste panel says plainly what it is for, in full sentences, not work jargon (U.8 review)', async () => {
    /*
     * "Paste an email, Slack thread, meeting notes, or any text that supports what you are
     * describing. The tool will use it to ask sharper questions." named a specific chat tool and
     * a specific kind of workplace document ("Slack thread"), and never said the one thing the
     * upload option right above it already says: that this starts private. Now matched to it.
     */
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Add a photo, a document or some text' }, { timeout: 5000 }))
    fireEvent.click(screen.getByText('Paste text'))
    expect(screen.getByText('Paste an email, a message or your notes. It starts private to you.')).toBeTruthy()
    expect(screen.getByText('What is it? You can skip this.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add it' })).toBeTruthy()
    expect(screen.queryByText(/Slack thread/i)).toBeNull()
    expect(screen.queryByText(/the tool will use it/i)).toBeNull()
  })

  it('uploads for real, with what the person said it shows, and says only they can open it', async () => {
    ;(documentsApi.upload as any).mockResolvedValue({ id: 'd1', name: 'green-mart-quote.heic', mimeType: 'image/heic', uploadedAt: '', assessment: null, visibility: 'OWN' })
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    const input = document.getElementById('doc-upload') as HTMLInputElement
    const photo = new File(['x'], 'green-mart-quote.heic', { type: 'image/heic' })
    fireEvent.change(input, { target: { files: [photo] } })
    expect(await findByText('What does it show? One line is enough; you can skip it.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('What does it show?'), { target: { value: 'The quote I sent' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add to session' }))
    await waitFor(() => expect(documentsApi.upload).toHaveBeenCalledWith('g1', photo, false, 'The quote I sent', { fromTheCheckIn: true }))
    expect(await findByText('You added “green-mart-quote.heic”. Only you can open it.', {}, { timeout: 5000 })).toBeTruthy()
  })
})

describe('the end card, once Groundwork has closed the conversation', () => {
  const CLOSING = 'That’s all for today. Below is what I wrote down from your answers. Is anything wrong?'
  /*
   * SCREEN FAULT 2 (FINAL WALK): the closing message claimed "Below is what I wrote down from your
   * answers." even on a close with no record lines for the card to show (request 182) - untrue of
   * what was actually on screen. The screen now drops that one claim when nothing backs it
   * (a-closing-message-claims-nothing-it-does-not-keep.ts), leaving the two true sentences either
   * side of it. `answerTheLastQuestion` used to assert the full `CLOSING` text unconditionally,
   * which is exactly the claim this fixes - every no-record-lines test below now waits for the
   * corrected, shorter message instead.
   */
  const SHORTENED = 'That’s all for today. Is anything wrong?'
  function closesOnTheNextAnswer(endCard?: unknown) {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: 'Did anything else change with your sales today?', suggestedAnswers: ['I’ll visit Westgate Deli on Friday'] }],
    })
    ;(conversationApi.send as any).mockResolvedValue({ reply: CLOSING, sessionComplete: true, endCard })
  }
  async function answerTheLastQuestion(expectToRead: string = SHORTENED) {
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'I’ll visit Westgate Deli on Friday' }, { timeout: 6000 }))
    await findByText(expectToRead, {}, { timeout: 6000 })
  }

  it('never claims "Below is what I wrote down from your answers." when the end card has no record lines', async () => {
    closesOnTheNextAnswer()
    await answerTheLastQuestion()
    expect(screen.queryByText(CLOSING)).toBeNull()
    expect(screen.getByText(SHORTENED)).toBeTruthy()
  })

  /*
   * PILOTS, 13 OCTOBER 2026, PROBLEM 13: the close is sent before its card is written (ten to forty seconds later), and the
   * screen dropped "Below is what I wrote down from your answers." straight away, so a card that then listed four of
   * Aisha's answers sat under "That’s all for today. Is anything wrong?". The sentence now waits for the card.
   */
  it('keeps "Below is what I wrote down from your answers." when the card written after the close lists their answers', async () => {
    closesOnTheNextAnswer()
    ;(conversationApi as any).endCard = vi.fn().mockResolvedValue({ inYourRecord: [{ says: 'The Otieno probate filing is done.', how: 'You said this.', mark: 'said' }] })
    await answerTheLastQuestion(CLOSING)
    expect(screen.getByText(CLOSING)).toBeTruthy()
    expect(screen.queryByText(SHORTENED)).toBeNull()
    delete (conversationApi as any).endCard
  })

  it('Miriam reads the header change, why answering matters, what happens next, and the two buttons', async () => {
    closesOnTheNextAnswer()
    await answerTheLastQuestion()
    expect(screen.getByText('That’s everything for today')).toBeTruthy()
    /* The light prototype's s68 (sales-first.md, section 5): why answering matters and what happens next
       fold behind one line, and lose their numbers. */
    expect(screen.getByText('Why answering matters, and what happens next').closest('summary')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Why answering matters' }).closest('details')).toBeTruthy()
    expect(screen.getByText('Wairimu also answers a check-in. The report puts the answers side by side. It shows where you agree and where you see things differently. It does not decide who is right.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What happens next' }).closest('details')).toBeTruthy()
    expect(screen.getByText('If you don’t want to talk about something yet, that’s fine. You can leave it for now.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'That’s right, finish' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Change something' })).toBeTruthy()
    // The engine sent no lines for the record, so none are made up.
    expect(screen.queryByText(/What goes in your record|What is now in your record/)).toBeNull()
    /*
     * WORDING RESTORED (group 3's review, request batch A, fault 2): the question of who sees a
     * person's words was settled 29 September (Conflict A) - the people in a check-in, including
     * the lead, can see what you say in it once the shared report goes out. This fixture's ground
     * has `aTeamReportComes: true` (line 68), so the prototype's own line is shown again.
     */
    expect(screen.getByText('Your team will see what you said today, and a short summary of what moved.')).toBeTruthy()
    // No suggested answers under the closing message: the card has its own buttons.
    expect(screen.queryByRole('group', { name: 'Suggested answers' })).toBeNull()
    expect(conversationApi.complete).not.toHaveBeenCalled()
  })

  it('shows what the engine wrote down for the record, line by line, when it sends it', async () => {
    closesOnTheNextAnswer({
      inYourRecord: [
        { says: 'Green Mart will buy in January', how: 'You said this. It will count next quarter, from October.', mark: 'said' },
        { says: 'You’ll visit Westgate Deli on Friday', how: 'You said you will do this. I will ask you how it went.' },
      ],
      next: ['If Green Mart sends a written order, add a photo of it. Then the sale counts as proven.'],
    })
    // Record lines are sent, so the claim is true, and the full closing message stays.
    await answerTheLastQuestion(CLOSING)
    /* The approved rename of "1. What is now in your record" (sales-first.md), with no number. */
    expect(screen.getByRole('heading', { name: 'What goes in your record' })).toBeTruthy()
    expect(screen.queryByText(/What is now in your record/)).toBeNull()
    expect(screen.getByText('Green Mart will buy in January')).toBeTruthy()
    expect(screen.getByText('You said this. It will count next quarter, from October.')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Only someone’s word' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Why answering matters' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What happens next' })).toBeTruthy()
    expect(screen.getByText('If Green Mart sends a written order, add a photo of it. Then the sale counts as proven.')).toBeTruthy()
  })

  it('says when her next check-in opens as one line, from the schedule, in the organisation’s zone, before the fold', async () => {
    /* sales-first.md, section 5: "Your next check-in opens tomorrow at …" as one line. The next session's row is
       only written when she finishes, so the server serves the schedule's own time, 8am in the organisation's zone
       for a daily check-in, and the zone. 07:00 UTC tomorrow is 8am in Lagos, whatever this machine's zone is. */
    const tomorrowLagos = new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
    ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({
      participantId: 'p-m', partyType: 'PARTICIPANT', latestStatus: 'IN_PROGRESS', latestSessionNumber: 38,
      checkIns: [{ id: 'ci1', sessionNumber: 38, status: 'IN_PROGRESS', completedAt: null }],
      zone: 'Africa/Lagos', nextOpensAt: `${tomorrowLagos}T07:00:00.000Z`,
    })
    closesOnTheNextAnswer({ inYourRecord: [{ says: 'Green Mart has a quote.', how: 'You said this. A photo of the quote would prove it.', mark: 'said' }] })
    await answerTheLastQuestion(CLOSING)
    const line = await findByText('Your next check-in opens tomorrow at 8am.', {}, { timeout: 5000 })
    expect(line.closest('details')).toBeNull()
    expect(screen.getAllByText('Your next check-in opens tomorrow at 8am.')).toHaveLength(1)
    /* The photo she said "Later" to is not claimed: the line says what would prove it. */
    expect(screen.getByText('You said this. A photo of the quote would prove it.')).toBeTruthy()
    expect(screen.queryByText(/photo you added/)).toBeNull()
  })

  it('the lead answering their own check-in is not told that they also answer one', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', email: 'wairimu@x.test' }
    ;(groundsApi.get as any).mockResolvedValue({ ...SALES, viewerIsInitiator: true })
    closesOnTheNextAnswer()
    await answerTheLastQuestion()
    expect(screen.queryByText(/Why answering matters/)).toBeNull()
    /* Her fold is named for the one thing in it. */
    expect(screen.getByText('What happens next', { selector: 'summary *' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What happens next' })).toBeTruthy()
  })

  it('a lead who only manages does not answer, so the sentence is not said', async () => {
    /* `leadAnswersToo` is what the server actually computes from a managing-only lead's row
       (grounds.service.ts) - overridden here alongside `participants`, the same fact stated twice. */
    ;(groundsApi.get as any).mockResolvedValue({
      ...SALES,
      participants: SALES.participants.map(p => p.partyType === 'INITIATOR' ? { ...p, managingOnly: true } : p),
      leadAnswersToo: false,
    })
    closesOnTheNextAnswer()
    await answerTheLastQuestion()
    expect(screen.queryByText(/also answers a check-in/)).toBeNull()
  })

  it('“Change something” goes back to the conversation without finishing', async () => {
    closesOnTheNextAnswer()
    await answerTheLastQuestion()
    fireEvent.click(screen.getByRole('button', { name: 'Change something' }))
    expect(screen.queryByRole('button', { name: 'That’s right, finish' })).toBeNull()
    expect(screen.queryByText('That’s everything for today')).toBeNull()
    expect((screen.getByPlaceholderText('Type your answer') as HTMLTextAreaElement).disabled).toBe(false)
    expect(conversationApi.complete).not.toHaveBeenCalled()
  })
})

describe('the Done page, after “That’s right, finish”', () => {
  const DIMS = { delivery: 'specific', evidence: 'vague', enablement: 'specific', coverage: 'directional', commitment: 'specific' }
  const tomorrowAt4 = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(16, 0, 0, 0); return d.toISOString() }

  async function finish(opts: { ground?: any; carry?: string | null; whatChanged?: unknown; qc?: QueryClient } = {}) {
    const ground = opts.ground ?? { ...SALES, checkIns: [{ id: 'ci1', participantId: 'p-m', sessionNumber: 38, status: 'COMPLETED', specificityDimensions: DIMS }], roundCompletions: [] }
    ;(groundsApi.get as any).mockResolvedValue(ground)
    ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({
      participantId: 'p-m', partyType: 'PARTICIPANT', latestStatus: null, latestSessionNumber: null,
      checkIns: [
        { id: 'ci1', sessionNumber: 38, status: 'COMPLETED', completedAt: new Date().toISOString() },
        { id: 'ci2', sessionNumber: 39, status: 'NOT_STARTED', completedAt: null, availableFrom: tomorrowAt4() },
      ],
    })
    ;(conversationApi.artifact as any).mockResolvedValue({ artifact: opts.carry ? { whatToCarry: opts.carry } : null })
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: 'Did anything else change with your sales today?', suggestedAnswers: ['I’ll visit Westgate Deli on Friday'] }],
    })
    ;(conversationApi.send as any).mockResolvedValue({ reply: 'That’s all for today. Is anything wrong?', sessionComplete: true })
    ;(conversationApi.complete as any).mockResolvedValue({ status: 'COMPLETED', whatChanged: opts.whatChanged })
    renderChat(opts.qc)
    fireEvent.click(await findByRole('button', { name: 'I’ll visit Westgate Deli on Friday' }, { timeout: 6000 }))
    fireEvent.click(await findByRole('button', { name: 'That’s right, finish' }, { timeout: 6000 }))
    await findByRole('heading', { name: 'Done. Thanks, Miriam.' }, { timeout: 6000 })
  }

  /*
   * SCREEN FAULT 3 (FINAL WALK): "YOUR TURN" AND "NOBODY HAS CHECKED IN YET" RIGHT AFTER
   * FINISHING. Nothing invalidated the ground, grounds or board queries when a session completed,
   * so the check-in's own page and the sidebar kept reading the answer just given as still
   * outstanding. Proven directly against the query cache, since that is the one fact that was
   * actually wrong - the rendered page after finishing is the Done page, which reads its own,
   * fresh data regardless.
   */
  it('marks the ground, grounds and board queries stale the moment a session completes', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    // Nobody is observing 'grounds' or the board in this test, so an invalidated one stays
    // marked invalidated - there is nothing mounted to refetch it straight away.
    qc.setQueryData(['grounds'], { stale: true })
    qc.setQueryData(['board', 'g1', 'default'], { stale: true })
    const callsBefore = (groundsApi.get as any).mock.calls.length
    await finish({ qc })
    expect(qc.getQueryState(['grounds'])?.isInvalidated).toBe(true)
    expect(qc.getQueryState(['board', 'g1', 'default'])?.isInvalidated).toBe(true)
    /*
     * ChatPage's own ['ground', 'g1'] query IS mounted here, so invalidating it also refetches
     * it immediately - the `isInvalidated` flag clears again once that succeeds, which is the
     * invalidation actually working, not it never having fired. A second call to `groundsApi.get`
     * for this ground is the proof.
     */
    expect((groundsApi.get as any).mock.calls.filter((c: any[]) => c[0] === 'g1').length).toBeGreaterThan(callsBefore)
  })

  it('Miriam reads that it is saved, when the next one opens, and her two reports', async () => {
    await finish()
    expect(await findByText('Your check-in is saved. Your next check-in opens tomorrow at 4pm.', {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Two reports come from this' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your own report' })).toBeTruthy()
    expect(screen.getByText('Only you')).toBeTruthy()
    expect(screen.getByText('What you said today and what it shows. Ready now.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Read yours' }).getAttribute('href')).toBe('/checkin/ci1/report')
    expect(screen.getByRole('heading', { name: 'The team’s report' })).toBeTruthy()
    expect(screen.getByText('Not shared yet')).toBeTruthy()
    expect(screen.getByText('Everyone’s check-ins together. You’ll get it once everyone has answered.')).toBeTruthy()
    // The conversation is gone from the screen; the Done page stands on its own.
    expect(screen.queryByPlaceholderText('Type your answer')).toBeNull()
  })

  it('she reads For tomorrow first, then her reports, then how checkable her own check-in was as one line that opens', async () => {
    await finish()
    /*
     * THE LIGHT DONE PAGE (sales-first.md, section 5; the light prototype's s68). "For tomorrow" is the approved
     * rename of "That’s saved" and comes first, before the two reports; why answering matters folds behind one
     * line inside it. How checkable today's check-in was is one line that opens. Updated from the old order and
     * headings, which this replaces on purpose.
     */
    expect(await findByRole('heading', { name: 'For tomorrow' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText('That’s saved')).toBeNull()
    const tomorrow = screen.getByRole('region', { name: 'For tomorrow' })
    expect(tomorrow.textContent).toBe('For tomorrowWhy answering matters›Wairimu also answers a check-in. The report puts the answers side by side. It does not decide who is right.')
    expect(within(tomorrow).getByText('Why answering matters').closest('summary')).toBeTruthy()
    const order = [...document.querySelectorAll('h2, summary')].map((e) => e.textContent ?? '')
    expect(order.findIndex((t) => t === 'For tomorrow')).toBeLessThan(order.findIndex((t) => t === 'Two reports come from this'))
    const checkable = screen.getByText('How checkable today’s check-in was').closest('details') as HTMLDetailsElement
    expect(checkable).toBeTruthy()
    expect(checkable.open).toBe(false)
    /**
     * "4 of 5" no longer shows (U.8 re-review, request 45 to the engine workspace): it is a score
     * built from a read of the session that is known to miss real content, so it stays off until
     * that is answered. The five short lines, with the sr-only sentence for a screen reader, are
     * unchanged inside the fold.
     */
    expect(within(checkable).queryByText('4 of 5')).toBeNull()
    expect(within(checkable).getByText(
      'Groundwork looked for these five things. It may have missed some of what you said.',
    )).toBeTruthy()
    const missingLine = within(checkable).getAllByText(/One date, number or document/)[0]
    expect(missingLine.querySelector('.gwui-sr-only')?.textContent).toContain('Groundwork did not pick this up this time.')
    const foundLine = within(checkable).getAllByText(/What you did, not just what was happening/)[0]
    expect(foundLine.querySelector('.gwui-sr-only')?.textContent).toContain('Groundwork found this.')
    expect(within(checkable).getByText('This is about the check-in. Only you see it.')).toBeTruthy()
  })

  it('the one thing to carry is the first thing under For tomorrow, once the session writes it', async () => {
    await finish({ carry: 'Get Green Mart’s January date in writing.' })
    /* The prototype has no label before it ("One thing for tomorrow: " is taken off in s68): the sentence
       sits under For tomorrow, before the fold. Updated from the old "One thing for next time" heading. */
    const carried = await findByText('Get Green Mart’s January date in writing.', {}, { timeout: 6000 })
    const tomorrow = screen.getByRole('region', { name: 'For tomorrow' })
    expect(tomorrow.contains(carried)).toBe(true)
    expect(tomorrow.textContent?.startsWith('For tomorrowGet Green Mart’s January date in writing.')).toBe(true)
    expect(screen.queryByRole('heading', { name: 'One thing for next time' })).toBeNull()
  })

  it('once everyone has answered, the team’s report is there to read', async () => {
    /*
     * `roundCompletions` ALONE IS NOT "READ IT" (U.8, edge case caught before ticking): it records
     * that everyone on the round had answered AT THE TIME IT CLOSED, which a lead who later grows
     * the team can leave behind for good. "Read it" reads whether the report has actually
     * released, `report.releasedAt` - the real shape here has both, together, the way a check-in
     * whose report genuinely is out would send them.
     */
    await finish({ ground: { ...SALES, checkIns: [], roundCompletions: [{ sessionNumber: 38, completedAt: new Date().toISOString() }], report: { id: 'r1', releasedAt: new Date().toISOString(), createdAt: new Date().toISOString() } } })
    const read = await findByRole('link', { name: 'Read it' }, { timeout: 5000 })
    expect(read.getAttribute('href')).toBe('/grounds/g1/session/38')
    expect(screen.queryByText('Not shared yet')).toBeNull()
  })

  it('with nobody else answering, there is one report and no team report', async () => {
    /* `aTeamReportComes` and `leadAnswersToo` are the top-level facts the server computes for
       exactly this case - overridden alongside `participants`, which drops the lead's row too. */
    await finish({ ground: { ...SALES, participants: [SALES.participants[1]], aTeamReportComes: false, leadAnswersToo: false, checkIns: [], roundCompletions: [] } })
    expect(await findByRole('heading', { name: 'Your own report' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText('Two reports come from this')).toBeNull()
    expect(screen.queryByText('The team’s report')).toBeNull()
    expect(screen.queryByText(/Why answering matters/)).toBeNull()
  })

  it('without the engine’s stages or the read of how checkable it was, those parts are not drawn', async () => {
    await finish({ ground: { ...SALES, checkIns: [], roundCompletions: [] } })
    await findByRole('heading', { name: 'Your own report' }, { timeout: 5000 })
    expect(screen.queryByText(/How checkable/)).toBeNull()
    expect(screen.queryByText(/What changed/)).toBeNull()
  })

  it('shows what changed on a deal, with its stages, when the engine sends it', async () => {
    await finish({ whatChanged: { title: 'What changed on your deals', items: [{ name: 'Green Mart', says: 'From the photo you added.', stages: [{ name: 'Contacted', mark: 'proven' }, { name: 'Need', mark: 'proven' }, { name: 'Pitched', mark: 'proven' }, { name: 'Qualified', mark: 'not_reached' }, { name: 'Quoted', mark: 'not_reached' }] }] } })
    expect(await findByRole('heading', { name: 'What changed on your deals' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByText('Green Mart')).toBeTruthy()
    expect(screen.getByText('From the photo you added.')).toBeTruthy()
    expect(screen.getByText('Qualified')).toBeTruthy()
  })

  it('when she said "Later" to the photo, her deal says so and claims no photo (sales-first.md, section 5)', async () => {
    await finish({ whatChanged: { title: 'What changed on your deals', items: [{ name: 'Green Mart', says: 'You said this. A photo would prove it.', stages: [{ name: 'Contacted', mark: 'said' }, { name: 'Quoted', mark: 'said' }] }] } })
    expect(await findByText('You said this. A photo would prove it.', {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText(/photo you added|Quote photo added/)).toBeNull()
  })
})
