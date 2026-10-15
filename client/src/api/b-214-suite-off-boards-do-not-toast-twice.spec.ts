import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from './client'

/**
 * B-214 (REVIEW 4): A SUITE THAT IS OFF SAYS SO ONCE, NOT ON A TOAST TOO.
 *
 * Walked live as Mira (admin) and Dov (member) at Riverbank, where several suites are off:
 * `/suite/spend` and `/suite/spend/finance` showed the page's own "...not switched on. You can
 * switch it on under Suites." AND a toast saying the same thing again; `/suite/time` showed the
 * toast with no page sentence at all (`TimeSheetsPage.tsx` read the refusal as plain text, not
 * through `SuiteOffMessage`); `/suite/reviews`'s page sentence was right but its toast - from
 * `reviewsApi.mine`, called by the same board for the reader's own reviews, which carried no
 * toast-suppression options at all - was wrong.
 *
 * Every suite board reads a switched-off suite as the server's 404, and the board already shows
 * that 404's message as a sentence on the page - so the client's generic 404 toast ("That is not
 * here any more") must be switched off for every call a suite board makes, the same way the
 * already-fixed boards (onboarding, leaving, roles, queue, todos, customers, equipment) do.
 */
vi.mock('./client', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ data: {} }) } }))

beforeEach(() => { vi.clearAllMocks() })

describe('every suite board call skips the generic 404 toast', () => {
  it('leaveBoardApi.get', async () => {
    const { leaveBoardApi } = await import('./suites')
    await leaveBoardApi.get()
    expect(apiClient.get).toHaveBeenCalledWith('/suites/leave/board', expect.objectContaining({ skipNotFoundToast: true }))
  })

  it('timeSheetsApi.get', async () => {
    const { timeSheetsApi } = await import('./suites')
    await timeSheetsApi.get()
    expect(apiClient.get).toHaveBeenCalledWith('/suites/time/board', expect.objectContaining({ skipNotFoundToast: true }))
  })

  it('reviewsApi.board', async () => {
    const { reviewsApi } = await import('./suites')
    await reviewsApi.board()
    expect(apiClient.get).toHaveBeenCalledWith('/suites/reviews/board', expect.objectContaining({ skipNotFoundToast: true }))
  })

  it('reviewsApi.mine (also read by the reviews board, for the reader\'s own reviews)', async () => {
    const { reviewsApi } = await import('./suites')
    await reviewsApi.mine()
    expect(apiClient.get).toHaveBeenCalledWith('/suites/reviews/mine', expect.objectContaining({ skipNotFoundToast: true }))
  })

  it('reviewsApi.appealsToDecide (also read by the reviews board)', async () => {
    const { reviewsApi } = await import('./suites')
    await reviewsApi.appealsToDecide()
    expect(apiClient.get).toHaveBeenCalledWith('/suites/reviews/appeals', expect.objectContaining({ skipNotFoundToast: true }))
  })

  it('spendApi.get', async () => {
    const { spendApi } = await import('./suites')
    await spendApi.get()
    expect(apiClient.get).toHaveBeenCalledWith('/suites/spend/board', expect.objectContaining({ skipNotFoundToast: true }))
  })

  it('financeApi.get', async () => {
    const { financeApi } = await import('./suites')
    await financeApi.get()
    expect(apiClient.get).toHaveBeenCalledWith('/suites/spend/finance', expect.objectContaining({ skipNotFoundToast: true }))
  })
})
