import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TakeItOffEveryList } from './PeopleAndSetupAsPictured'
import { groundsApi } from '@/api/grounds'

/**
 * DELETING A CHECK-IN PEOPLE HAVE ANSWERED (Hafsah, 22 November 2026), read as the lead or an admin reads it on People and setup.
 * It asks first, and says plainly that the words people said are kept but the check-in is gone from everyone's lists.
 */
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

describe('deleting a check-in people have answered', () => {
  beforeEach(() => {
    vi.spyOn(groundsApi, 'hide').mockResolvedValue({ groundId: 'g1', hidden: true })
    Object.defineProperty(window, 'location', { value: { assign: vi.fn() }, writable: true })
  })

  it('says what deleting does, asks first, and only then deletes it', async () => {
    render(<QueryClientProvider client={new QueryClient()}><TakeItOffEveryList groundId="g1" label="Sales team" /></QueryClientProvider>)
    expect(screen.getByText("People have already answered this check-in, so what they said is kept. You can still delete the check-in, and it will be gone from everyone's lists.")).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete this check-in' }))
    expect(groundsApi.hide).not.toHaveBeenCalled()
    expect(screen.getByText(`Delete "Sales team"? It will be gone from everyone's lists, and nobody will be asked to check in again. The words people said are kept.`)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByRole('button', { name: 'Yes, delete it' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Delete this check-in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete it' }))
    await waitFor(() => expect(groundsApi.hide).toHaveBeenCalledWith('g1'))
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/grounds'))
  })
})
