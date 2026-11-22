import { describe, it, expect } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Skeleton, Held } from './Skeleton'

/** What a person reads while a page is still getting its data: grey shapes, and for a screen reader one status line, never the word "Loading". */
describe('the wait is grey shapes, not a word', () => {
  it('says what is coming to a screen reader and draws shapes for everyone else', () => {
    const { container } = render(<Skeleton what="Getting your check-ins" shape="rows" count={2} />)
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-busy')).toBe('true')
    expect(status.textContent).toBe('Getting your check-ins')
    expect(container.querySelectorAll('.gwui-skeleton-item')).toHaveLength(2)
    expect(container.textContent).not.toMatch(/Loading/i)
  })
  it('draws cards and lines too', () => {
    const { container } = render(<><Skeleton what="Getting the company page" shape="cards" /><Skeleton what="Getting this page" shape="lines" /></>)
    expect(container.querySelector('.gwui-skeleton-cards')).toBeTruthy()
    expect(container.querySelector('.gwui-skeleton-lines')).toBeTruthy()
    expect(container.querySelectorAll('.gwui-skeleton-item')).toHaveLength(6)
  })
})

/** Held (page loads, 22 November 2026): a page is drawn whole, once its reads and the reads it names are in, and never before. */
describe('a held page is drawn whole, once', () => {
  function APart({ answer }: { answer: Promise<string> }) {
    const { data } = useQuery({ queryKey: ['a-part'], queryFn: () => answer })
    return data ? <p>{data}</p> : null
  }
  function ThePage({ waiting, answer }: { waiting: boolean; answer: Promise<string> }) {
    return <Held waiting={waiting} alsoFor={[['a-part']]} what="Getting your page"><p>The page</p><APart answer={answer} /></Held>
  }

  it('shows one placeholder while the page or a part it names is still reading, then everything together', async () => {
    let answer!: (s: string) => void
    const part = new Promise<string>((r) => { answer = r })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = render(<QueryClientProvider client={qc}><ThePage waiting answer={part} /></QueryClientProvider>)
    expect(screen.getByRole('status').textContent).toBe('Getting your page')
    expect(screen.getByText('The page')).not.toBeVisible()
    rerender(<QueryClientProvider client={qc}><ThePage waiting={false} answer={part} /></QueryClientProvider>)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText('The page')).not.toBeVisible()
    await act(async () => { answer('Your leave') })
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(screen.getByText('The page')).toBeVisible()
    expect(screen.getByText('Your leave')).toBeVisible()
  })

  it('draws a page whose reads are all in already at once, with no placeholder first', () => {
    const qc = new QueryClient()
    qc.setQueryData(['a-part'], 'Your leave')
    render(<QueryClientProvider client={qc}><ThePage waiting={false} answer={Promise.resolve('x')} /></QueryClientProvider>)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText('Your leave')).toBeVisible()
  })
})
