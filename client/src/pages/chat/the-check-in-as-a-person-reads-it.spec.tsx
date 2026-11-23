import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'
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
/* `list` too: after an upload the page polls for the document's reading every 3s, and on a slow runner that fires after the test
   has ended - an unhandled TypeError that fails the whole run even though every test passed. */
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn(), list: vi.fn().mockResolvedValue([]) } }))
/* How long a check-in takes, as the server serves it from its one owner (participants/when-it-asks.ts). */
vi.mock('@/api/entry', () => ({ entryApi: { aCheckInTakes: vi.fn().mockResolvedValue('About ten minutes') } }))
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

/** The person types their answer in the one box and sends it, as they do now that there are no suggested answers. */
async function typeAndSend(text: string) {
  const box = await findByRole('textbox', { name: 'Your answer' }, { timeout: 6000 })
  await waitFor(() => expect((box as HTMLTextAreaElement).disabled).toBe(false))
  fireEvent.change(box, { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
}

/* Changed 3 November evening (Hafsah: "only the conversation ... one box ... and 'End session', small and quiet, always visible"): the
   header is the check-in's name and End session. "About ten minutes" and the Pause menu are gone; Stop for now is the back link, and
   skipping is End session before any answer has landed, which still asks first and says what follows. */
/* Changed 3 November 2026 (screens-after/checkin-reply-390.png): the way back was a link above the card that said the name, and the
   header said it again. Now the name is said once, on one line: the arrow and the name are the way back, End session is beside them. */
/* Changed in batch 2, group 5 (Hafsah, items 3b and 53): the conversation is drawn inside the check-in's own Check-in tab, under
   its tabs, so the card no longer carries a way back of its own. The name is said once, beside End session. */
describe('the header', () => {
  it('names the check-in once, on one line with “Skip this one” (it reads “Pause” once an answer has landed), and nothing under the name', async () => {
    renderChat()
    const heading = await findByRole('heading', { name: 'Sales team, Q3' }, { timeout: 5000 })
    expect(screen.getAllByText('Sales team, Q3')).toHaveLength(1)
    expect(document.querySelector('.ci-back')).toBeNull()
    /* Changed 23 November 2026 (journey 2, the design system): the card's header is drawn from the blocks, .ds-ci-head, not the
       old .ci-h. Still one line holding the name and "Skip this one". */
    expect(heading.closest('.ds-ci-head')?.contains(screen.getByRole('button', { name: 'Skip this one' }))).toBe(true)
    expect(await findByText(OPENING, {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'End check-in' })).toBeNull()
    expect(screen.queryByText('About ten minutes')).toBeNull()
    expect(screen.queryByText(/What this check-in is about/)).toBeNull()
  })

  it('offers no way out of the card: the tabs around it are the way to anywhere else', async () => {
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByRole('button', { name: 'Sales team, Q3' })).toBeNull()
    expect(screen.queryByText(/Back to check-ins/)).toBeNull()
    expect(conversationApi.decline).not.toHaveBeenCalled()
  })

  /* Changed 15 November 2026 (Hafsah, audit rows 8 and 29): one confirm sentence, not four bullets, and "skipped", not "declined". */
  it('“Skip this one”, before any answer, asks first in one sentence', async () => {
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    fireEvent.click(await findByRole('button', { name: 'Skip this one' }))
    expect(await findByText('Skip this check-in? The report will say you skipped it.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Yes, skip it' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeTruthy()
    expect(screen.queryByText(/This cannot be undone|Nothing you have written here is shown to anyone|declined/)).toBeNull()
    expect(conversationApi.decline).not.toHaveBeenCalled()
    expect(conversationApi.complete).not.toHaveBeenCalled()
  })

  it('the old underlined way to decline is gone from under the conversation', async () => {
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByText(/I do not want to take part/)).toBeNull()
  })
})

/* Was "suggested answers under the question": the engine sends none since 3 November, and the screen draws none (Hafsah, 3 November
   evening: "no ... suggested answers"). The person types, as the prototype shows. */
describe('no suggested answers under the question', () => {
  it('draws none even when a turn carries some', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, suggestedAnswers: ['Not yet'] }],
    })
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByRole('button', { name: 'Not yet' })).toBeNull()
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
  /* Changed 3 November evening: no privacy notes on screens; the server still keeps a new document private to whoever added it. */
  it('offers a photo or a document, or text, with no note about who can read it', async () => {
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Add a photo, a document or some text' }, { timeout: 5000 }))
    expect(screen.getByText('Add a photo or a document')).toBeTruthy()
    expect(screen.getByText('Paste text')).toBeTruthy()
    expect(screen.queryByText('It starts private to you. You choose who can read it.')).toBeNull()
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
    fireEvent.click(screen.getByRole('button', { name: 'Add to check-in' }))
    await waitFor(() => expect(documentsApi.upload).toHaveBeenCalledWith('g1', photo, false, 'The quote I sent', { fromTheCheckIn: true }))
    expect(await findByText(/* Changed 22 November 2026: no privacy note on screen; it says what happened to the file. */ 'You added “green-mart-quote.heic”, and it is kept with this check-in.', {}, { timeout: 5000 })).toBeTruthy()
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
    await typeAndSend('I’ll visit Westgate Deli on Friday')
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

  /* Changed 3 November evening: the header no longer changes to "That’s everything for today"; the closing message says it. */
  it('Miriam reads the finish button and no explainer, and no line under the header', async () => {
    closesOnTheNextAnswer()
    await answerTheLastQuestion()
    expect(screen.queryByText('That’s everything for today')).toBeNull()
    /* Hafsah, 15 November: the fold "Why answering matters, and what happens next", its reassurance line and the line about who sees it are gone. */
    expect(screen.queryByText(/Why answering matters/)).toBeNull()
    expect(screen.queryByText(/also answers a check-in/)).toBeNull()
    expect(screen.queryByText('If you don’t want to talk about something yet, that’s fine. You can leave it for now.')).toBeNull()
    expect(document.querySelector('details')).toBeNull()
    expect(screen.getByRole('button', { name: 'That’s right, finish' })).toBeTruthy()
    /* Changed in F5: no "Change something"; with nothing written, the sentence offers to be told what is missing. */
    expect(screen.getByRole('button', { name: 'tell me' })).toBeTruthy()
    // The engine sent no lines for the record, so none are made up.
    expect(screen.queryByText(/What goes in your record|What is now in your record/)).toBeNull()
    expect(screen.queryByText('Your team will see what you said today, and a short summary of what moved.')).toBeNull()
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
    expect(screen.queryByRole('heading', { name: 'Why answering matters' })).toBeNull()
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
    expect(screen.queryByText(/also answers a check-in/)).toBeNull()
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

  /* Changed in F5: "Change something" became "That’s not right" on each line; with no lines, "tell me" does the same. */
  it('“tell me” goes back to the conversation without finishing', async () => {
    closesOnTheNextAnswer()
    await answerTheLastQuestion()
    fireEvent.click(screen.getByRole('button', { name: 'tell me' }))
    expect(screen.queryByRole('button', { name: 'That’s right, finish' })).toBeNull()
    expect(screen.queryByText('That’s everything for today')).toBeNull()
    expect((screen.getByPlaceholderText('Type your answer') as HTMLTextAreaElement).disabled).toBe(false)
    expect(conversationApi.complete).not.toHaveBeenCalled()
  })
})

/*
 * CHANGED IN BATCH 2, GROUP 5 (Hafsah, 4 November, items 54 to 56). Finishing used to replace the
 * conversation with a Done page ("Done. Thanks, Miriam.", "Two reports come from this", "How
 * checkable today's check-in was", "For tomorrow"), cut off from the check-in's tabs. The end is
 * now the last messages in the conversation and one small pop-up, "Done. Your report is in My
 * work.", which closes leaving the person where they are. The report itself is read in My work
 * (your-report-lives-in-my-work.spec.tsx). These tests read what Miriam now sees.
 */
describe('the end, after “That’s right, finish”', () => {
  async function finish(opts: { qc?: QueryClient } = {}) {
    ;(groundsApi.get as any).mockResolvedValue({ ...SALES, checkIns: [{ id: 'ci1', participantId: 'p-m', sessionNumber: 38, status: 'COMPLETED' }], roundCompletions: [] })
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: 'Did anything else change with your sales today?' }],
    })
    ;(conversationApi.send as any).mockResolvedValue({ reply: 'That’s all for today. Is anything wrong?', sessionComplete: true })
    ;(conversationApi.complete as any).mockResolvedValue({ status: 'COMPLETED' })
    renderChat(opts.qc)
    await typeAndSend('I’ll visit Westgate Deli on Friday')
    fireEvent.click(await findByRole('button', { name: 'That’s right, finish' }, { timeout: 6000 }))
    await findByText(/Your report is ready in/, {}, { timeout: 6000 })
  }

  it('marks the ground, grounds and board queries stale the moment a session completes', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    qc.setQueryData(['grounds'], { stale: true })
    qc.setQueryData(['board', 'g1', 'default'], { stale: true })
    const callsBefore = (groundsApi.get as any).mock.calls.length
    await finish({ qc })
    expect(qc.getQueryState(['grounds'])?.isInvalidated).toBe(true)
    expect(qc.getQueryState(['board', 'g1', 'default'])?.isInvalidated).toBe(true)
    expect((groundsApi.get as any).mock.calls.filter((c: any[]) => c[0] === 'g1').length).toBeGreaterThan(callsBefore)
  })

  /* Changed 15 November 2026 (Hafsah, audit row 4): the pop-up with Close is gone; Groundwork's last line in the conversation says it, with a plain link. */
  it('Miriam reads Groundwork’s last line in the conversation, with a link to My work, and the conversation stays where it is', async () => {
    await finish()
    const line = screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Done. Thanks, Miriam. Your report is ready in My work.')
    expect(line.querySelector('a')?.getAttribute('href')).toBe('/grounds/g1?tab=mywork&report=ci1')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('I’ll visit Westgate Deli on Friday')).toBeTruthy()
    expect(screen.getByText('That’s all for today. Is anything wrong?')).toBeTruthy()
  })

  it('reads none of the old end page', async () => {
    await finish()
    const text = document.body.textContent ?? ''
    for (const gone of ['Two reports come from this', 'How checkable today’s check-in was', 'For tomorrow', 'Your next check-in is open now', 'Go to it', 'Read yours', 'Open my report', 'Open the team board']) {
      expect(text).not.toContain(gone)
    }
    expect(screen.queryByRole('heading', { name: 'Your report' })).toBeNull()
  })

  it('there is no pop-up and no Close, and the conversation is still there', async () => {
    await finish()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    expect(screen.getByText('I’ll visit Westgate Deli on Friday')).toBeTruthy()
    expect(screen.queryByText('The check-in’s own page')).toBeNull()
  })
})
