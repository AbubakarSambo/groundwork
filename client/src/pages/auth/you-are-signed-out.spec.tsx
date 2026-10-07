import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'fs'
import { join } from 'path'
import { SignOutPage } from './SignOutPage'

/**
 * "YOU'RE SIGNED OUT" (A2, #/signout), and every Sign out in the product landing on it.
 */

const logout = vi.fn()
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ logout }) }))
vi.mock('@/lib/marketing', () => ({ MARKETING_URL: 'https://groundwork.example' }))

beforeEach(() => { logout.mockClear() })

describe('what a person reads once signed out', () => {
  /*
   * REAL-USER WALK, KIJANI FOODS, FAULT 8C: the prototype's own sentence, not a different claim.
   * This used to read "You are still signed in on your other devices." - true, but not the
   * prototype's wording (signout.txt), and about a different fact (other devices, not this one).
   * "On this device." is the prototype's own first sentence, copied exactly, and still true:
   * signing out here clears this browser only.
   */
  it('the prototype\'s own sentence, without the promise about saved work that is not yet true', () => {
    const { container } = render(<MemoryRouter><SignOutPage /></MemoryRouter>)
    expect((container.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
      'Groundwork' + 'You’re signed out' + 'On this device.' + 'Sign in again' + 'Go to the home page',
    )
    expect(container.textContent).not.toMatch(/Anything you.d started is saved/)
  })

  it('"Sign in again" goes to sign in, and "Go to the home page" to the marketing site', () => {
    render(<MemoryRouter><SignOutPage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Sign in again' }).getAttribute('href')).toBe('/auth')
    expect(screen.getByRole('link', { name: 'Go to the home page' }).getAttribute('href')).toBe('https://groundwork.example')
  })

  it('opening it signs you out, so the marketing site\'s link really ends the session', () => {
    render(<MemoryRouter><SignOutPage /></MemoryRouter>)
    expect(logout).toHaveBeenCalled()
  })
})

describe('every Sign out in the product lands on it', () => {
  const src = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8')
  /*
   * Each door only goes to /signout, and the page ends the session. Calling logout() first was
   * found in the running app to break it: the page you were on (More, on a phone) noticed you were
   * signed out and sent you to /auth?next=/signout before the navigation happened, and signing in
   * again would then have signed you straight back out.
   */
  const doors: [string, RegExp][] = [
    ['components/gw/AppShell.tsx', /onClick=\{\(\) => navigate\('\/signout', \{ replace: true \}\)\}/],
    ['pages/more/MorePage.tsx', /onClick=\{\(\) => navigate\('\/signout', \{ replace: true \}\)\}>Sign out</],
    /*
     * HAFSAH, 30 SEPTEMBER: A PLAIN LINK, NOT A BUTTON WITH A navigate() CALL. This door only goes
     * to /signout and does nothing itself, so it is a real `<Link>` now, matching the prototype's
     * own rule that a control which only leaves the screen is a link. It still only ever goes to
     * /signout, and still replaces the history entry - checked here as `<Link ... to="/signout"
     * replace>` rather than the onClick pattern the other three doors still use.
     */
    ['pages/settings/SettingsPage.tsx', /<Link className="gwui-open-link" to="\/signout" replace>Sign out<\/Link>/],
    ['pages/ops/OpsLayout.tsx', /window\.location\.href = '\/signout'/],
  ]
  for (const [file, door] of doors) {
    it(file, () => { expect(src(file)).toMatch(door) })
  }
})

