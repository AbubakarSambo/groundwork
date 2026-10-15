import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE END OF AN UPDATE SAYS THREE THINGS: it landed, where the report goes, and how to change that.
 *
 * Hafsah, 22 Sep 2026: "the end is off, no way to really add my email if I am just an invited
 * person". The one-line link ended on the board with none of the three.
 */
const updateMyEmail = vi.fn()
vi.mock('@/api/participants', () => ({ participantsApi: { updateMyEmail: (...a: any[]) => updateMyEmail(...a) } }))
const updateUser = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { email: 'typed.by.lead@x.test' }, updateUser }),
}))
vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn, onSuccess, onError }: any) => ({
    isPending: false,
    mutate: () => mutationFn().then(onSuccess, onError),
  }),
  /* YourNextCheckIn reads the next session; nothing loaded here, so it renders nothing. */
  useQuery: () => ({ data: undefined }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { getMyCheckinStatus: vi.fn() } }))

import { ThatIsOnTheRecord } from './ThatIsOnTheRecord'

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

describe('the end of an update, for the person who gave it', () => {
  it('says it landed and where the report goes', () => {
    render(<ThatIsOnTheRecord groundId="g1" />)
    expect(screen.getByText('That is on the record. Thank you.')).toBeTruthy()
    expect(screen.getByText('typed.by.lead@x.test')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Not your address/ })).toBeTruthy()
  })

  it('lets them send it somewhere else, and moves the sign-in with it when the link made that sign-in', async () => {
    updateMyEmail.mockResolvedValueOnce({ email: 'me@real.test', changed: true, signInMoved: true })
    render(<ThatIsOnTheRecord groundId="g1" />)
    fireEvent.click(screen.getByRole('button', { name: /Not your address/ }))
    fireEvent.change(screen.getByLabelText('Where should your report go?'), { target: { value: 'me@real.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send it there' }))
    await waitFor(() => expect(screen.getByText('me@real.test')).toBeTruthy())
    expect(updateMyEmail).toHaveBeenCalledWith('g1', 'me@real.test')
    expect(updateUser).toHaveBeenCalledWith({ email: 'me@real.test' })
  })

  it('refuses something that is not an address before asking the server', () => {
    render(<ThatIsOnTheRecord groundId="g1" />)
    fireEvent.click(screen.getByRole('button', { name: /Not your address/ }))
    fireEvent.change(screen.getByLabelText('Where should your report go?'), { target: { value: 'not an address' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send it there' }))
    expect(screen.getByRole('alert').textContent).toContain('does not look like an email address')
  })

  it('and the one-line question ends on the board with this above it', () => {
    const chat = strip(readFileSync(join(__dirname, '..', '..', 'pages', 'chat', 'ChatPage.tsx'), 'utf8'))
    expect(chat).toContain('navigate(`/grounds/${groundId}/board?done=1`, { replace: true })')
    const board = strip(readFileSync(join(__dirname, '..', '..', 'pages', 'board', 'BoardPage.tsx'), 'utf8'))
    expect(board).toContain("const justAnswered = searchParams.get('done') === '1'")
    /* U.10 item 2: the board's own dark header is gone, replaced by the shared shell every
       check-in page now uses - a component, not a literal <header> tag. ThatIsOnTheRecord still
       sits directly above it.
       U.10 (a), REBUILT FROM THE SHARED PARTS: that shell is now components/gw/ui/CheckInHeader.tsx
       (the older components/gw/TheCheckInHeader.tsx this pinned still exists and still runs the
       report pages, but no longer this one), so the tag this looks for changed with it. */
    expect(board).toMatch(/\{justAnswered && <ThatIsOnTheRecord groundId=\{id!\} \/>\}[\s\S]{0,400}<CheckInHeader/)
  })
})
