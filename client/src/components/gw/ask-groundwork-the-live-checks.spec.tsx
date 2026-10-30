import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AskGroundwork } from './AskGroundwork'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { useAskStore } from '@/stores/ask'
import type { AskPage as AskPageData } from '@/api/ask'
import type { GroundDocument } from '@/api/documents'
import type { Ground } from '@/types'
import type { AskReply } from '@/api/ask'

/**
 * THE SEVEN THINGS A PERSON RUNS INTO OPENING ASK GROUNDWORK ON A REAL PAGE, from the reviewer's
 * round on the running product: uploading a file, writing more than one line, waiting for a reply,
 * the Feedback button sitting on top of Send, the "About" list defaulting to the wrong check-in for
 * an admin, the picker running past the panel's edge, and an old reply's buttons staying live. Each
 * describes what is actually rendered, for the reader it happens to (a lead on her own check-in, an
 * admin reading somebody else's).
 */
vi.mock('@/api/ask', () => ({ askApi: { mine: vi.fn(), ask: vi.fn(), answer: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn(), list: vi.fn() } }))
vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return { ...actual, groundsApi: { ...actual.groundsApi, list: vi.fn() } }
})
import { askApi } from '@/api/ask'
import { documentsApi } from '@/api/documents'
import { groundsApi } from '@/api/grounds'

/*
 * SCREEN FAULT 5d, FIXED: the header's caption used to show only once `GET /ask` had answered, so
 * `findByText(CAPTION)` doubled as "wait for the page's real data to land" everywhere below. Now
 * the same fixed caption shows immediately, before the request answers (so loading, and a 429,
 * never show the bare "Ask Groundwork" with nothing under it) - so these waits moved to the
 * composer's placeholder, which still only reads this text once the real data is in (its own
 * fallback, "Ask a question", differs).
 */
const CAPTION = 'Ask about the company, your work or your check-ins.'
const ADD_LINE = 'You can also add context or documents to your check-ins here.'

const SALES: AskPageData = {
  canAsk: true,
  about: [{ id: 'g-sales', label: 'Sales team, Q3' }],
  turns: [],
  askName: 'Ask Groundwork',
  caption: CAPTION,
  addLine: ADD_LINE,
  welcome: null,
  starters: [],
}

function panel(data: AskPageData, at = '/grounds/g-sales/board', extraProps: Partial<Parameters<typeof AskGroundwork>[0]> = {}) {
  vi.mocked(askApi.mine).mockResolvedValue(data)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
  already makes before it mounts the sidebar at all - without this cached answer the real
  authApi.myWaiting (not mocked in this file) would be asked for real. */
  qc.setQueryData(['my-waiting'], { waiting: false })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <AskGroundwork onClose={() => {}} pollIntervalMs={1} pollTimeoutMs={30} {...extraProps} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.clearAllMocks() })

describe('item 1: the upload goes to the check-in, not the assistant’s session', () => {
  const uploadReply = {
    lane: 'add_a_document', composedBy: 'rules' as const,
    blocks: [
      { type: 'text' as const, body: 'It will go on "Sales team, Q3".' },
      /* `id` is the assistant's own session id - a real one, and deliberately not the same as the
         check-in's own id in `context.groundId`, which is what an upload here used to 404 on. */
      {
        type: 'next_step' as const, label: 'Choose a file', href: '/grounds', kind: 'upload_a_document',
        id: 'session-abc123', context: { groundId: 'g-sales', label: 'Sales team, Q3' },
      },
    ],
  }

  function fileInputEl(container: HTMLElement) {
    return container.querySelector('input[type="file"]') as HTMLInputElement
  }

  it('uploads to context.groundId, polls it, and says "I’ve uploaded it." about that same check-in', async () => {
    vi.mocked(askApi.ask)
      .mockResolvedValueOnce(uploadReply)
      .mockResolvedValueOnce({ lane: 'add_a_document', composedBy: 'rules', blocks: [{ type: 'text', body: 'Added.' }] })
    vi.mocked(documentsApi.upload).mockResolvedValue({ id: 'doc-1', name: 'targets.xlsx', mimeType: 'application/vnd.ms-excel', uploadedAt: '2026-09-30T00:00:00Z' } as GroundDocument)
    vi.mocked(documentsApi.list).mockResolvedValue([
      { id: 'doc-1', name: 'targets.xlsx', mimeType: 'application/vnd.ms-excel', uploadedAt: '2026-09-30T00:00:00Z', holds: { waiting: [{ name: 'Renewals', target: 20, ownerParticipantId: null }] } } as GroundDocument,
    ])

    const { container } = panel(SALES)
    await screen.findByPlaceholderText(CAPTION)
    fireEvent.change(screen.getByPlaceholderText(CAPTION), { target: { value: 'add the targets sheet' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Choose a file' }))

    const file = new File(['numbers'], 'targets.xlsx', { type: 'application/vnd.ms-excel' })
    fireEvent.change(fileInputEl(container), { target: { files: [file] } })

    // Never sent to the session id - only ever to the check-in's own id.
    await waitFor(() => expect(documentsApi.upload).toHaveBeenCalledWith('g-sales', file))
    expect(documentsApi.upload).not.toHaveBeenCalledWith('session-abc123', file)
    await waitFor(() => expect(documentsApi.list).toHaveBeenCalledWith('g-sales'))
    await waitFor(() => expect(askApi.ask).toHaveBeenLastCalledWith("I've uploaded it.", 'g-sales'))
    expect(await screen.findByText('Added.')).toBeInTheDocument()
  })
})

describe('item 2: a multi-line message box', () => {
  it('keeps the line breaks in what is sent, Enter sends and Shift+Enter starts a new line', async () => {
    vi.mocked(askApi.ask).mockResolvedValue({ lane: 'x', composedBy: 'rules', blocks: [{ type: 'text', body: 'Got it.' }] })
    panel(SALES)
    await screen.findByPlaceholderText(CAPTION)
    const box = screen.getByPlaceholderText(CAPTION) as HTMLTextAreaElement
    expect(box.tagName).toBe('TEXTAREA')

    fireEvent.change(box, { target: { value: 'Line one\nLine two' } })
    expect(box.value).toBe('Line one\nLine two')

    // Shift+Enter does not send.
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true })
    expect(askApi.ask).not.toHaveBeenCalled()

    // Plain Enter sends what is in the box, line breaks and all.
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(askApi.ask).toHaveBeenCalledWith('Line one\nLine two', 'g-sales'))
    expect(await screen.findByText('Got it.')).toBeInTheDocument()
    // The sent text is shown back with its own line breaks, not run together (getByText's default
    // normalizer collapses whitespace, so this checks the actual text node instead).
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Line one\nLine two')).toBeInTheDocument()
  })
})

describe('item 3: a sign of work while a reply is on its way', () => {
  it('shows the check-in conversation’s own waiting sign, and makes the box and buttons unavailable', async () => {
    let resolveReply: (v: AskReply) => void = () => {}
    vi.mocked(askApi.ask).mockReturnValue(new Promise<AskReply>((resolve) => { resolveReply = resolve }))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      panel(SALES)
      await vi.waitFor(() => screen.getByPlaceholderText(CAPTION))
      const box = screen.getByPlaceholderText(CAPTION) as HTMLTextAreaElement
      fireEvent.change(box, { target: { value: 'what is stuck?' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send' }))

      expect(box).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
      // Not yet - the sentence only comes once the wait is long enough to need explaining.
      expect(screen.queryByText(/Still reading what you wrote/)).toBeNull()

      await act(async () => { await vi.advanceTimersByTimeAsync(4000) })
      expect(screen.getByText('Still reading what you wrote. Nothing was lost, you do not need to send it again.')).toBeInTheDocument()

      await act(async () => { resolveReply({ lane: 'x', composedBy: 'rules', blocks: [{ type: 'text', body: 'Nothing is stuck.' }] }) })
      await vi.waitFor(() => expect(screen.queryByText(/Still reading what you wrote/)).toBeNull())
      expect(screen.getByText('Nothing is stuck.')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})

/* UPDATED 24 October (Hafsah: fewer buttons; the prototype has no floating Feedback pill): the pill is never drawn, so it can
   never cover the Ask panel. "Send feedback" stays on the person's own menu. */
describe('item 4: no floating Feedback button can cover the Ask panel', () => {
  /* No organisation name here, to match SALES's own `askName` ('Ask Groundwork') - the sidebar's
     button names Ask from this same organisation name (AppShell.tsx, `askNameFor`). */
  const USER = { id: 'u-m', email: 'm@baridi.test', firstName: 'Miriam', lastName: 'Wanjiku', role: 'MEMBER', organizationId: 'o1', organizationName: '' }

  it('is not on screen while the panel is open, and comes back once it closes', async () => {
    vi.mocked(askApi.mine).mockResolvedValue(SALES)
    useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as unknown as Parameters<typeof useAuthStore.setState>[0])
    useAskStore.setState({ open: false })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
    already makes before it mounts the sidebar at all - without this cached answer the real
    authApi.myWaiting (not mocked in this file) would be asked for real. */
    qc.setQueryData(['my-waiting'], { waiting: false })
    qc.setQueryData(['grounds'], [])
    qc.setQueryData(['my-organizations'], [{ id: 'o1', name: 'Baridi Appliances', role: 'MEMBER', active: true }])
    const { container } = render(
      <QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><AppShell><div>page</div></AppShell></MemoryRouter></QueryClientProvider>,
    )
    const rail = container.querySelector('.gw-sidebar-desktop') as HTMLElement
    expect(screen.queryByRole('button', { name: /^Feedback$/ })).toBeNull()

    fireEvent.click(within(rail).getByRole('button', { name: 'Ask Groundwork' }))
    await screen.findByRole('heading', { name: 'Ask Groundwork' })
    expect(screen.queryByRole('button', { name: /^Feedback$/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Ask Groundwork' })).toBeNull())
    expect(screen.queryByRole('button', { name: /^Feedback$/ })).toBeNull()
  })
})

describe('item 5: "About" includes a check-in an admin may read, even when it is not theirs', () => {
  // Juma runs three check-ins of his own, none of them "Sales team, Q3" - but he is an admin, and
  // /grounds already lists every check-in an admin may read, which is where "Sales team, Q3" comes
  // from (groundsAViewerMayList, the same rule the sidebar's own list uses).
  const JUMAS: AskPageData = {
    canAsk: true,
    about: [
      { id: 'g-one', label: 'Faith, first 90 days' },
      { id: 'g-two', label: 'Kwame, first 90 days' },
      { id: 'g-three', label: 'Supplier review' },
    ],
    turns: [],
    askName: 'Ask Groundwork',
    caption: CAPTION,
    addLine: ADD_LINE,
    welcome: null,
    starters: [],
  }

  it('opens on "Sales team, Q3" when that is the page he is reading, and names it in the panel', async () => {
    vi.mocked(groundsApi.list).mockResolvedValue([
      { id: 'g-sales', label: 'Sales team, Q3' } as Ground,
      { id: 'g-one', label: 'Faith, first 90 days' } as Ground,
    ])
    panel(JUMAS, '/grounds/g-sales/board')
    await screen.findByPlaceholderText(CAPTION)
    const about = screen.getByRole('combobox', { name: 'About' }) as HTMLSelectElement
    expect(about.value).toBe('g-sales')
    expect([...about.options].map((o) => o.textContent)).toContain('Sales team, Q3')
  })

  it('does not add a check-in he may not read', async () => {
    vi.mocked(groundsApi.list).mockResolvedValue([{ id: 'g-one', label: 'Faith, first 90 days' } as Ground])
    panel(JUMAS, '/grounds/g-not-his/board')
    await screen.findByPlaceholderText(CAPTION)
    const about = screen.getByRole('combobox', { name: 'About' }) as HTMLSelectElement
    expect([...about.options].map((o) => o.value)).not.toContain('g-not-his')
  })
})

describe('item 6: the "About" picker stays inside the panel', () => {
  it('can shrink below its longest label, rather than forcing the row wider than the panel', async () => {
    const WAIRIMUS: AskPageData = {
      canAsk: true,
      about: [
        { id: 'g-faith', label: 'Faith, first 90 days, mentoring and onboarding' },
        { id: 'g-sales', label: 'Sales team, Q3' },
      ],
      turns: [],
      askName: 'Ask Groundwork',
      caption: CAPTION,
      addLine: ADD_LINE,
      welcome: null,
      starters: [],
    }
    panel(WAIRIMUS, '/grounds/g-sales/board')
    await screen.findByPlaceholderText(CAPTION)
    /* UPDATED 24 October (one stylesheet, the prototype's): the picker is the prototype's .input in the About row, whose
       own rule (styles/product.css, .gw-ask-about .input) caps it at 240px and lets it shrink, instead of inline styles. */
    const about = screen.getByRole('combobox', { name: 'About' }) as HTMLSelectElement
    expect(about.className).toContain('input')
    expect((about.closest('label') as HTMLElement).className).toContain('gw-ask-about')
    const css = (await import('fs')).readFileSync(require('path').join(__dirname, '../../styles/product.css'), 'utf8')
    expect(css).toMatch(/\.gw-ask-about \.input \{[^}]*max-width: 240px/)
  })
})

describe('item 7: only the newest reply’s option buttons can be pressed', () => {
  it('an older reply’s picker chips stop being clickable once a newer reply arrives', async () => {
    vi.mocked(askApi.ask)
      .mockResolvedValueOnce({ lane: 'x', composedBy: 'rules', blocks: [{ type: 'picker', options: [{ key: 'a', label: 'Option A' }] }] })
      .mockResolvedValueOnce({ lane: 'x', composedBy: 'rules', blocks: [{ type: 'text', body: 'Second reply.' }] })
    panel(SALES)
    await screen.findByPlaceholderText(CAPTION)
    const box = screen.getByPlaceholderText(CAPTION)

    fireEvent.change(box, { target: { value: 'first question' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    const optionA = await screen.findByRole('button', { name: 'Option A' })
    expect(optionA).not.toBeDisabled()

    fireEvent.change(box, { target: { value: 'second question' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Second reply.')

    expect(screen.getByRole('button', { name: 'Option A' })).toBeDisabled()
  })
})
