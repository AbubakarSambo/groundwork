import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE END OF AN UPDATE SAYS THREE THINGS: it landed, where the report goes, and how to change that.
 *
 * Hafsah, 22 Sep 2026: "the end is off, no way to really add my email if I am just an invited
 * person". CHANGED 15 NOVEMBER 2026 (audit of the check-in pages, row 17): it is no longer a card on the team board that the
 * person is sent to. It is Groundwork's last line in the conversation, and the person stays where they answered.
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

import { TheReportIsComing } from './TheReportIsComing'

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

describe('the end of an update, for the person who gave it', () => {
  it('says it landed and where the report goes', () => {
    render(<TheReportIsComing groundId="g1" />)
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Thanks. I will send the report to typed.by.lead@x.test when everyone has answered.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/on the record|team board/i)
    expect(screen.getByRole('button', { name: /Not your address/ })).toBeTruthy()
  })

  it('lets them send it somewhere else, and moves the sign-in with it when the link made that sign-in', async () => {
    updateMyEmail.mockResolvedValueOnce({ email: 'me@real.test', changed: true, signInMoved: true })
    render(<TheReportIsComing groundId="g1" />)
    fireEvent.click(screen.getByRole('button', { name: /Not your address/ }))
    fireEvent.change(screen.getByLabelText('Where should your report go?'), { target: { value: 'me@real.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send it there' }))
    await waitFor(() => expect(screen.getByText('me@real.test')).toBeTruthy())
    expect(updateMyEmail).toHaveBeenCalledWith('g1', 'me@real.test')
    expect(updateUser).toHaveBeenCalledWith({ email: 'me@real.test' })
  })

  it('refuses something that is not an address before asking the server', () => {
    render(<TheReportIsComing groundId="g1" />)
    fireEvent.click(screen.getByRole('button', { name: /Not your address/ }))
    fireEvent.change(screen.getByLabelText('Where should your report go?'), { target: { value: 'not an address' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send it there' }))
    expect(screen.getByRole('alert').textContent).toContain('does not look like an email address')
  })

  it('and the one-line question ends in the chat with this, not on the team board', () => {
    const chat = strip(readFileSync(join(__dirname, '..', '..', 'pages', 'chat', 'ChatPage.tsx'), 'utf8'))
    expect(chat).not.toContain('board?done=1')
    expect(chat).toMatch(/bareFrame && groundId && \(\s*<Bubble mine=\{false\}><TheReportIsComing groundId=\{groundId\} \/><\/Bubble>/)
    const board = strip(readFileSync(join(__dirname, '..', '..', 'pages', 'board', 'BoardPage.tsx'), 'utf8'))
    expect(board).not.toContain('justAnswered')
    expect(board).not.toContain('ThatIsOnTheRecord')
  })
})
