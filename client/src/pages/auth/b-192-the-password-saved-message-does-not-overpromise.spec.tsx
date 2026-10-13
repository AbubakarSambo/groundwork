import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LinkSentPanel } from './LinkSentPanel'

/**
 * B-192: "OPEN IT TO FINISH, THEN SIGN IN WITH YOUR PASSWORD ANY TIME" WAS NOT ALWAYS TRUE.
 *
 * Opening the confirmation link only finishes the account straight away when the server can place
 * it in an organisation on its own. When it cannot - a brand new organisation nobody but the person
 * can name - `MagicVerifyPage`'s `whereDoYouWork` branch asks one more question first, and the
 * account (password included) does not exist until that is answered. Halima opened the link, saw
 * "Where do you work?", and left before choosing; no account existed, and her password was then
 * refused at sign-in ("no such account"). The old wording promised a finished account from opening
 * the link alone.
 *
 * No server behaviour changes here - the account-creation sequencing itself is unchanged, and
 * `MagicVerifyPage`'s own `whereDoYouWork` wording already tells her what she still has to do once
 * she is there. This is a wording fix only: the "Check your email" screen stops promising a state
 * ("your password works any time now") this component cannot know will be true.
 */
describe('the "your password is saved" message, after choosing a password at sign-up', () => {
  it('says opening the link is a first step with more possibly asked, not that it alone finishes the account', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <LinkSentPanel
          email="halima@fieldnote.test"
          withPassword
          resend={vi.fn()}
          onUseDifferent={vi.fn()}
        />
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Your password is saved/)).toBeTruthy()
    // The old, overpromising sentence must be gone.
    expect(screen.queryByText(/Open it to finish, then sign in with your password any time\./)).toBeNull()
    // The new wording: open it, answer anything it still asks, and only THEN the password works.
    expect(screen.getByText(/answer anything it still asks you/i)).toBeTruthy()
    expect(screen.getByText(/once that is done, you can sign in with your password any time/i)).toBeTruthy()
  })
})
