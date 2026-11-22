import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PauseOrResume } from './PeopleAndSetupAsPictured'
import { groundsApi } from '@/api/grounds'

/**
 * THE LEAD PAUSES AND RESUMES A CHECK-IN (release test 22 November, bug 35: People and setup had "Give it more time" and "Decide how it
 * ends", and nothing to hold it). Read as the lead and an admin read it on People and setup, beside "Ending it".
 */
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

function show(status: string) {
  return render(<QueryClientProvider client={new QueryClient()}><PauseOrResume groundId="g1" status={status} /></QueryClientProvider>)
}

describe('pausing and resuming, as the lead reads it', () => {
  beforeEach(() => {
    vi.spyOn(groundsApi, 'pause').mockResolvedValue({ groundId: 'g1', status: 'PAUSED' })
    vi.spyOn(groundsApi, 'resume').mockResolvedValue({ groundId: 'g1' })
  })

  it('a running check-in says what pausing does, and pauses it', async () => {
    show('ACTIVE')
    expect(screen.getByText('Pausing it stops the check-ins and reminders until you resume it. Everything already written stays as it is.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pause this check-in' }))
    await waitFor(() => expect(groundsApi.pause).toHaveBeenCalledWith('g1'))
    expect(groundsApi.resume).not.toHaveBeenCalled()
  })

  it('a paused check-in says so, and resumes it', async () => {
    show('PAUSED')
    expect(screen.getByText('This check-in is paused. Nobody is asked to check in and no reminders go out until you resume it. Everything already written stays as it is.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Resume this check-in' }))
    await waitFor(() => expect(groundsApi.resume).toHaveBeenCalledWith('g1'))
  })

  it('an ended check-in offers neither', () => {
    for (const status of ['CLOSED', 'RESOLVED', 'STALLED']) {
      const { container, unmount } = show(status)
      expect(container.textContent).toBe('')
      unmount()
    }
  })
})
