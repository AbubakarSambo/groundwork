import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * A NUMBER NOBODY HAS DEFINED IS NOT AN AGREED NUMBER.
 *
 * "signed 12m" sat on the board as settled while the lead's own note, one page away, said nobody had
 * decided whether the 12m is signed revenue or recognised revenue, and that finance counts
 * collection where sales counts booked. Both facts were in the product, 22 September 2026, and only
 * one of them was anywhere near the number.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' } }),
}))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({}) } }))

const board = (notSettled: string | null) => ({
  groundId: 'g1',
  renders: true,
  mode: 'SHARED',
  family: 'UPDATE',
  sections: ['objectives'],
  title: 'Harvestline sales and delivery',
  scenario: 'TEAM_UPDATES',
  coverageVariant: 'NONE',
  myParticipantId: 'p1',
  canEditFrame: true,
  readOnlyNote: '',
  participants: [
    { id: 'p1', name: 'Hafsah', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p2', name: 'Amina', role: null, managingOnly: false, signedOffAt: null },
  ],
  objectives: [
    { id: 'o1', name: 'signed', count: 7_800_000, prevCount: 0, target: 12_000_000, delta: 0, isNew: false, askedOf: null, suggestedCount: null, notSettled },
    { id: 'o2', name: 'new paying customers', count: 2, prevCount: 0, target: 6, delta: 0, isNew: false, askedOf: null, suggestedCount: null, notSettled: null },
  ],
})

function renderBoard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a number nobody has defined', () => {
  beforeEach(() => vi.clearAllMocks())

  it('says so on the row, in the lead\'s own words', async () => {
    ;(boardApi.get as any).mockResolvedValue(board('The 12m target may be signed or recognised revenue, nobody has said which.'))
    renderBoard()
    expect(await screen.findByText('definition not settled')).toBeTruthy()
    expect(screen.getByText(/may be signed or recognised revenue/)).toBeTruthy()
    /* The number is still there: this says something about it, it does not hide it.
       REQUEST 132: thousands separators (toLocaleString('en-GB')), so a large count reads as a
       number, not a string of digits - "12,000,000", not "12000000". Updated for that reason,
       not to paper over a defect: the number is still shown in full, just punctuated. */
    expect(screen.getByText(/of 12,000,000|12,000,000/)).toBeTruthy()
  })

  it('and says nothing on a target nobody disputes', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(null))
    renderBoard()
    expect(await screen.findByText('new paying customers')).toBeTruthy()
    expect(screen.queryByText('definition not settled')).toBeNull()
  })
})

/**
 * U.10 (c1), HER REVIEW: "each target has three full-size buttons... much heavier than the
 * prototype". Lower and Raise are the shared Button's small secondary size; Remove is small AND
 * quiet, so the row reads as the target and its number, not as three buttons. Still asks first -
 * `Confirm` is unchanged.
 *
 * 30 September (Hafsah): Remove used to be the small "quiet danger" red-text tone - a fifth
 * button kind the prototype does not have. That tone is gone; the shared Button now has only the
 * prototype's four kinds (primary, secondary, quiet, danger - the last always solid red), so
 * Remove is plain `quiet` (navy) like every other quiet button, and relies on the confirmation
 * step, not a tinted trigger, to signal the action is destructive.
 *
 * UPDATED 30 SEPTEMBER (Hafsah, "at most one primary button per screen... no more buttons than
 * the prototype"): Lower, Raise and Remove no longer sit open on every target row - each target
 * gets one quiet "Change" instead, matching the prototype's own board (31 buttons, not 48), and
 * Lower/Raise/Remove now only render once that row's "Change" is pressed. This test still checks
 * their weight and size; it now opens each row first, since that is the only way to see them.
 */
describe('a target row\'s own buttons, not three buttons', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Lower and Raise are the small secondary size, and Remove is small and quiet, not a boxed danger button', async () => {
    ;(boardApi.get as any).mockResolvedValue(board(null))
    renderBoard()
    /* Fewer controls on the face (Hafsah, 30 September): each target's Lower/Raise/Remove are
       folded behind its own quiet "Change", so every "Change" is opened first. */
    const changeButtons = await screen.findAllByRole('button', { name: /^Change target:/ })
    for (const c of changeButtons) fireEvent.click(c)
    const lower = await screen.findAllByRole('button', { name: /One fewer/ })
    const raise = screen.getAllByRole('button', { name: /One more/ })
    const remove = screen.getAllByRole('button', { name: /Remove target/ })
    for (const b of [...lower, ...raise]) {
      expect(b.className).toContain('sec')
      expect(b.className).toContain('sm')
    }
    for (const b of remove) {
      expect(b.className).toContain('quiet')
      expect(b.className).toContain('sm')
      expect(b.className.endsWith('danger')).toBe(false)
    }
  })
})
