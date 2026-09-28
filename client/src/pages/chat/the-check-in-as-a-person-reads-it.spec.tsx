import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
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

function renderChat() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
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
  it('names the check-in on the way back, and says it is your check-in, with Pause', async () => {
    renderChat()
    expect(await findByRole('button', { name: '← Sales team, Q3' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your check-in' })).toBeTruthy()
    expect(await findByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(await findByText(OPENING, {}, { timeout: 5000 })).toBeTruthy()
  })

  it('does not promise how long it takes', async () => {
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByText(/About two minutes/)).toBeNull()
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

  it('draws nothing when the engine sends none, and the three fixed chips are gone', async () => {
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByRole('group', { name: 'Suggested answers' })).toBeNull()
    expect(screen.queryByText('What am I missing?')).toBeNull()
    expect(screen.queryByText('What do I carry forward?')).toBeNull()
    expect(screen.getByPlaceholderText('Type your answer')).toBeTruthy()
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
    await waitFor(() => expect(documentsApi.upload).toHaveBeenCalledWith('g1', photo, false, 'The quote I sent'))
    expect(await findByText('You added “green-mart-quote.heic”. Only you can open it.', {}, { timeout: 5000 })).toBeTruthy()
  })
})

describe('the end card, once Groundwork has closed the conversation', () => {
  const CLOSING = 'That’s all for today. Below is what I wrote down from your answers. Is anything wrong?'
  function closesOnTheNextAnswer(endCard?: unknown) {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: 'Did anything else change with your sales today?', suggestedAnswers: ['I’ll visit Westgate Deli on Friday'] }],
    })
    ;(conversationApi.send as any).mockResolvedValue({ reply: CLOSING, sessionComplete: true, endCard })
  }
  async function answerTheLastQuestion() {
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'I’ll visit Westgate Deli on Friday' }, { timeout: 6000 }))
    await findByText(CLOSING, {}, { timeout: 6000 })
  }

  it('Miriam reads the header change, why answering matters, what happens next, and the two buttons', async () => {
    closesOnTheNextAnswer()
    await answerTheLastQuestion()
    expect(screen.getByText('That’s everything for today')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '1. Why answering matters' })).toBeTruthy()
    expect(screen.getByText('Wairimu also answers a check-in. The report puts the answers side by side. It shows where you agree and where you see things differently. It does not decide who is right.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '2. What happens next' })).toBeTruthy()
    expect(screen.getByText('If you don’t want to talk about something yet, that’s fine. You can leave it for now.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'That’s right, finish' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Change something' })).toBeTruthy()
    // The engine sent no lines for the record, so none are made up.
    expect(screen.queryByText(/What is now in your record/)).toBeNull()
    // Held until the question of who sees a person's words is answered (morning report, item 11).
    expect(screen.queryByText(/Your team will see what you said today/)).toBeNull()
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
    await answerTheLastQuestion()
    expect(screen.getByRole('heading', { name: '1. What is now in your record' })).toBeTruthy()
    expect(screen.getByText('Green Mart will buy in January')).toBeTruthy()
    expect(screen.getByText('You said this. It will count next quarter, from October.')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Only someone’s word' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '2. Why answering matters' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '3. What happens next' })).toBeTruthy()
    expect(screen.getByText('If Green Mart sends a written order, add a photo of it. Then the sale counts as proven.')).toBeTruthy()
  })

  it('the lead answering their own check-in is not told that they also answer one', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', email: 'wairimu@x.test' }
    ;(groundsApi.get as any).mockResolvedValue({ ...SALES, viewerIsInitiator: true })
    closesOnTheNextAnswer()
    await answerTheLastQuestion()
    expect(screen.queryByText(/Why answering matters/)).toBeNull()
    expect(screen.getByRole('heading', { name: '1. What happens next' })).toBeTruthy()
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

  async function finish(opts: { ground?: any; carry?: string | null; whatChanged?: unknown } = {}) {
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
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'I’ll visit Westgate Deli on Friday' }, { timeout: 6000 }))
    fireEvent.click(await findByRole('button', { name: 'That’s right, finish' }, { timeout: 6000 }))
    await findByRole('heading', { name: 'Done. Thanks, Miriam.' }, { timeout: 6000 })
  }

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

  it('she reads why answering matters and how checkable her own check-in was, which only she sees', async () => {
    await finish()
    expect(await findByRole('heading', { name: 'That’s saved' }, { timeout: 5000 })).toBeTruthy()
    const saved = screen.getByRole('heading', { name: 'That’s saved' }).parentElement!
    expect(saved.textContent).toBe('That’s savedWhy answering matters: Wairimu also answers a check-in. The report puts the answers side by side. It does not decide who is right.')
    const checkable = screen.getByRole('region', { name: 'How checkable today’s check-in was' })
    /**
     * "4 of 5" no longer shows (U.8 re-review, request 45 to the engine workspace): it is a score
     * built from a read of the session that is known to miss real content, so it stays off until
     * that is answered. What a sighted reader gets instead is the same plain sentence a screen
     * reader always got - "Groundwork found this." or "Groundwork did not pick this up this time." -
     * for every one of the five, not only the icon.
     */
    expect(within(checkable).queryByText('4 of 5')).toBeNull()
    expect(within(checkable).getByText(
      'Groundwork looked for these five things. It may have missed some of what you said.',
    )).toBeTruthy()
    expect(within(checkable).getByText(/One date, number or document\. Groundwork did not pick this up this time\./)).toBeTruthy()
    expect(within(checkable).getByText(/What you did, not just what was happening\. Groundwork found this\./)).toBeTruthy()
    expect(within(checkable).getByText('This is about the check-in. Only you see it.')).toBeTruthy()
  })

  it('one thing for next time is the sentence the session wrote, once it arrives', async () => {
    await finish({ carry: 'Get Green Mart’s January date in writing.' })
    expect(await findByText('One thing for next time: Get Green Mart’s January date in writing.', {}, { timeout: 6000 })).toBeTruthy()
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
    await finish({ whatChanged: { title: 'What changed on your deals', items: [{ name: 'Green Mart', says: 'Quote photo added', stages: [{ name: 'Contacted', mark: 'proven' }, { name: 'Need', mark: 'proven' }, { name: 'Pitched', mark: 'proven' }, { name: 'Qualified', mark: 'not_reached' }, { name: 'Quoted', mark: 'not_reached' }] }] } })
    expect(await findByRole('heading', { name: 'What changed on your deals' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByText('Green Mart')).toBeTruthy()
    expect(screen.getByText('Quote photo added')).toBeTruthy()
    expect(screen.getByText('Qualified')).toBeTruthy()
  })
})
