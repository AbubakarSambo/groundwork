import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'fs'
import { join } from 'path'
import { MagicVerifyPage } from './MagicVerifyPage'
import { ChoosePasswordPage } from './ChoosePasswordPage'
import { whatTheLinkDid } from './a-link-that-has-expired'
import { authApi } from '@/api/auth'

/**
 * "THAT LINK HAS EXPIRED" (A2, #/verify-expired), as the person who opened an old link reads it, on
 * each of the three pages that can learn it from the server.
 */

vi.mock('@/api/auth', () => ({
  authApi: {
    verifyEmail: vi.fn(), setPassword: vi.fn(), resetPassword: vi.fn(), validateToken: vi.fn(),
    entrySave: vi.fn(), forgotPassword: vi.fn(),
  },
}))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn() } }))
vi.mock('@/stores/auth', () => {
  const state = { setAuth: vi.fn() }
  const useAuthStore: any = (sel: any) => sel(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/verify-email" element={<MagicVerifyPage />} />
          <Route path="/set-password" element={<ChoosePasswordPage />} />
          <Route path="/reset-password" element={<ChoosePasswordPage />} />
          <Route path="/auth" element={<p>Sign in</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function readable(container: HTMLElement) {
  const copy = container.cloneNode(true) as HTMLElement
  copy.querySelectorAll('[aria-hidden="true"], .gw-sr-only').forEach(n => n.remove())
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/* Each test opens its own token: the page remembers what happened to a token for as long as the
   module lives, so that a remount cannot verify the same link twice. */
const refused = (message: string) => ({ response: { status: 400, data: { message } } })

const THE_CARD = [
  'Groundwork',
  'That link has expired',
  'Links from our emails work for a short while. Nothing is lost; ask for a fresh one.',
  'Email',
  'Send me a fresh link',
].join('')

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  ;(authApi.validateToken as any).mockResolvedValue({ valid: true })
  ;(authApi.entrySave as any).mockResolvedValue({ message: 'ok', email: 'x' })
  ;(authApi.forgotPassword as any).mockResolvedValue({ message: 'ok' })
})

describe('an old sign-in link (/verify-email)', () => {
  it('shows the card, and a fresh link goes through the sign-in door', async () => {
    ;(authApi.verifyEmail as any).mockRejectedValue(refused('This verification link has expired. Please request a new one.'))
    const { container } = renderAt('/verify-email?token=t1')
    await screen.findByRole('heading', { name: 'That link has expired' })
    expect(readable(container)).toBe(THE_CARD)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'Miriam@Baridi.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send me a fresh link' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(authApi.entrySave).toHaveBeenCalledWith('miriam@baridi.test', undefined, '')
    expect(screen.getByText(/We sent a sign-in link to/).textContent).toBe('We sent a sign-in link to Miriam@Baridi.test. Open it on any device.')
  })

  it('a waiting sign-up whose link the server already sent again is told it is on its way, and asked for nothing', async () => {
    const said = 'That link had expired, so we have sent a new one to the same address. Nothing you wrote has been lost.'
    ;(authApi.verifyEmail as any).mockRejectedValue(refused(said))
    const { container } = renderAt('/verify-email?token=t2')
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(readable(container)).toBe('Groundwork' + 'Check your email' + said + 'Go to sign in')
    expect(screen.queryByLabelText('Email')).toBeNull()
    expect(authApi.entrySave).not.toHaveBeenCalled()
  })

  it('a link already used gets "That link didn’t work" on the card, with a way to ask for a new one', async () => {
    /* U.2 review: this used to be LinkProblem under the old header, with the server's sentence. */
    ;(authApi.verifyEmail as any).mockRejectedValue(refused('This link has already been used, so your address is confirmed. Sign in from the sign-in page.'))
    const { container } = renderAt('/verify-email?token=t3')
    await screen.findByRole('heading', { name: 'That link didn’t work' })
    expect(readable(container)).toBe(
      'Groundwork' + 'That link didn’t work' +
      'It may have been cut short when it was copied, or it has already been used. Open it again from the email, or ask for a new one.' +
      'Email' + 'Send me a new link',
    )
    expect(screen.queryByText('That link has expired')).toBeNull()
  })

  it('an address that is not an address is caught before anything is sent', async () => {
    ;(authApi.verifyEmail as any).mockRejectedValue(refused('This verification link has expired. Please request a new one.'))
    renderAt('/verify-email?token=t4')
    fireEvent.click(await screen.findByRole('button', { name: 'Send me a fresh link' }))
    /* U.2 review: with nothing typed it says what to do first. */
    expect((await screen.findByRole('alert')).textContent).toBe('Type your email address first.')
    expect(authApi.entrySave).not.toHaveBeenCalled()
  })

  it('a refusal about the address gets the same answer as a sent link; a server failure says so', async () => {
    ;(authApi.verifyEmail as any).mockRejectedValue(refused('This verification link has expired. Please request a new one.'))
    ;(authApi.entrySave as any).mockRejectedValueOnce({ response: { status: 500 } })
    renderAt('/verify-email?token=t5')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'nobody@baridi.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send me a fresh link' }))
    expect((await screen.findByRole('alert')).textContent).toBe('That did not send, because something went wrong on our side. Please try again.')

    ;(authApi.entrySave as any).mockRejectedValueOnce({ response: { status: 400 } })
    fireEvent.click(screen.getByRole('button', { name: 'Send me a fresh link' }))
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy()
  })
})

describe('an old set-up link (/set-password)', () => {
  it('becomes the card when the server says so, and a fresh link is a sign-in link', async () => {
    ;(authApi.setPassword as any).mockRejectedValue(refused('This invitation link has expired. Please ask your admin to resend the invite.'))
    const { container } = renderAt('/set-password?token=old')
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Harbour7lamp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    await screen.findByRole('heading', { name: 'That link has expired' })
    expect(readable(container)).toBe(THE_CARD)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'kwame@baridi.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send me a fresh link' }))
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalledWith('kwame@baridi.test', undefined, ''))
    expect(authApi.forgotPassword).not.toHaveBeenCalled()
  })
})

describe('an old reset link (/reset-password)', () => {
  it('becomes the card, and a fresh link is a reset link, with the same answer for any address', async () => {
    ;(authApi.resetPassword as any).mockRejectedValue(refused('This reset link has expired. Please request a new one.'))
    renderAt('/reset-password?token=old')
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Harbour7lamp' } })
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Harbour7lamp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    await screen.findByRole('heading', { name: 'That link has expired' })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'wairimu@baridi.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send me a fresh link' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(authApi.forgotPassword).toHaveBeenCalledWith('wairimu@baridi.test')
    expect(authApi.entrySave).not.toHaveBeenCalled()
    expect(screen.getByText(/If there is an account for/)).toBeTruthy()
  })
})

describe('the sentences the server sends are the ones this page reads', () => {
  /*
   * whatTheLinkDid reads the server's sentence, because that is all the server sends. If a sentence
   * in the API changes, the page would quietly fall back to LinkProblem; this reads the API's own
   * source (without changing it) so that change is caught here.
   */
  const api = (rel: string) => readFileSync(join(__dirname, '../../../../api/src/modules/auth', rel), 'utf8')
  const service = api('auth.service.ts')
  const lifetimes = api('how-long-a-link-lasts.ts')

  it('every expired-link sentence reads as expired', () => {
    const sentences = [...service.matchAll(/allowExpiredMessage: '([^']+)'/g)].map(m => m[1])
    expect(sentences.length).toBe(3)
    for (const s of sentences) expect(whatTheLinkDid(s)).toBe('expired')
    const general = lifetimes.match(/'(This link has expired\.[^']*)'/)?.[1]
    expect(general).toBeTruthy()
    expect(whatTheLinkDid(general)).toBe('expired')
  })

  it('the waiting sign-up\'s sentence reads as already sent again', () => {
    const s = service.match(/'(That link had expired, so we have sent a new one[^']*)'/)?.[1]
    expect(s).toBeTruthy()
    expect(whatTheLinkDid(s)).toBe('resent')
  })

  it('no "already used" sentence reads as expired', () => {
    const used = [...lifetimes.matchAll(/'(This link has already been used[^']*)'/g)].map(m => m[1])
    expect(used.length).toBeGreaterThan(2)
    /* They read as "did not work" (U.2 review), never as expired. */
    for (const s of used) expect(whatTheLinkDid(s)).toBe('did-not-work')
  })
})

describe('as the page opens, when the server already says the link has run out', () => {
  it('an old reset link opens straight on the card, before any password is typed', async () => {
    ;(authApi.validateToken as any).mockResolvedValue({ valid: false, expired: true })
    const { container } = renderAt('/reset-password?token=old-on-open')
    await screen.findByRole('heading', { name: 'That link has expired' })
    expect(readable(container)).toBe(THE_CARD)
    expect(authApi.validateToken).toHaveBeenCalledWith('old-on-open', 'PASSWORD_RESET')
    expect(authApi.resetPassword).not.toHaveBeenCalled()
  })

  it('and so does an old set-up link', async () => {
    ;(authApi.validateToken as any).mockResolvedValue({ valid: false, expired: true })
    renderAt('/set-password?token=old-setup')
    expect(await screen.findByRole('heading', { name: 'That link has expired' })).toBeTruthy()
    expect(authApi.validateToken).toHaveBeenCalledWith('old-setup', 'PASSWORD_SETUP')
  })

  /* Changed in the U.2 re-review: a link replaced by a newer one, used or unknown used to keep the form
     until Save. It now opens on "That link didn’t work", as an expired one opens on its card. */
  it('a used, replaced or unknown link ({ valid: false } and nothing else) opens on "That link didn’t work"', async () => {
    ;(authApi.validateToken as any).mockResolvedValue({ valid: false })
    renderAt('/reset-password?token=used-one')
    expect(await screen.findByRole('heading', { name: 'That link didn’t work' })).toBeTruthy()
    expect(screen.queryByLabelText('New password')).toBeNull()
  })

  it('a check that fails keeps the form: the server decides on save', async () => {
    ;(authApi.validateToken as any).mockRejectedValue(new Error('offline'))
    renderAt('/reset-password?token=offline-one')
    await waitFor(() => expect(authApi.validateToken).toHaveBeenCalled())
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeTruthy()
  })
})

describe('"That link didn’t work", for a used, unknown or missing link (U.2 review)', () => {
  /* This is the server's own sentence (api/src/modules/auth/how-long-a-link-lasts.ts), not the
     page's wording - the page's own "That link didn't work" card renders its own fixed sentence
     regardless of what the server says, so this stays the API's exact text, unchanged by U.20. */
  const DID_NOT_WORK = 'This link did not work. Each link works only once, and only for a short while. Open the newest one in your inbox, or ask for a new one from the sign-in page.'

  it('/verify-email with no token at all', async () => {
    renderAt('/verify-email')
    expect(await screen.findByRole('heading', { name: 'That link didn’t work' })).toBeTruthy()
    expect(authApi.verifyEmail).not.toHaveBeenCalled()
  })

  it('the reset page, after Save, when the server does not know the link: a new reset link, same answer for any address', async () => {
    ;(authApi.resetPassword as any).mockRejectedValue(refused(DID_NOT_WORK))
    renderAt('/reset-password?token=unknown')
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Harbour7lamp' } })
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Harbour7lamp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    await screen.findByRole('heading', { name: 'That link didn’t work' })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'wairimu@baridi.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send me a new link' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(authApi.forgotPassword).toHaveBeenCalledWith('wairimu@baridi.test')
  })

  it('the server\'s sentence for an unknown link reads as "did not work"', () => {
    const service = readFileSync(join(__dirname, '../../../../api/src/modules/auth/auth.service.ts'), 'utf8')
    const s = service.match(/const NOT_A_LINK_WE_KNOW =\s*'([^']+)'/)?.[1]
    expect(s).toBe(DID_NOT_WORK)
    expect(whatTheLinkDid(s)).toBe('did-not-work')
  })
})
