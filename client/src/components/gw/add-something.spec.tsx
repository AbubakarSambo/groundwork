import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const post = vi.fn(async () => ({ data: { checkInId: 'c1', reply: 'Noted.' } }))
vi.mock('@/api/client', () => ({ apiClient: { post: (...a: unknown[]) => (post as any)(...a) } }))
import { AddSomething } from './AddSomething'

/** Hafsah, after polish round 3: "Add something" on the web and the phone, any time. */
describe('Add something', () => {
  it('opens, sends what they wrote to their own check-in, and says where it goes', async () => {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><AddSomething groundId="g1" /></MemoryRouter></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Add something' }))
    expect(screen.getByText(/It goes on your record and the board\./)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('What you want to add'), { target: { value: 'Savannah Cafe paid the balance today.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add it' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/check-ins/add-something/g1', { message: 'Savannah Cafe paid the balance today.' }))
  })
})
