import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { useFeedbackStore } from '@/stores/feedback'
import { feedbackApi } from '@/api/feedback'

/**
 * B-225 (REVIEW 5): THREE KEYBOARD FAULTS IN THE FEEDBACK PANEL.
 *
 * 1. The middle tab's build options and its "Pick what you need built." reason read as clipped
 *    phrases and work jargon ("Reminder / email nudge", "Slack integration", "Team analytics"),
 *    not the plain full sentences CLAUDE.md's wording rule asks for.
 * 2. "Tell us what happened" and the email field set `outline: 'none'` with nothing to replace it,
 *    so Tab moved keyboard focus through them with nothing on screen to show where it was.
 * 3. Tab was free to leave the panel altogether while it was open, and closing it (Cancel) left
 *    focus nowhere in particular instead of back on the button that opened it.
 */
const USER = { id: 'u1', email: 'aisha@x.test', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Mawe' }

function mount() {
  useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  qc.setQueryData(['my-waiting'], { waiting: false })
  qc.setQueryData(['grounds'], [])
  qc.setQueryData(['my-organizations'], [])
  /*
   * NO REAL REQUEST LEFT UNANSWERED. Without these, AppSidebar's own background queries (today's
   * summary, the suite counts, a member's own leave/spending/hours/reviews) go to a server that is
   * not there while this test waits out Send's own 1.8-second thank-you line - and an unanswered
   * request settling mid-test used to unmount the whole shell from underneath this test (not this
   * feature's own bug; a side effect of mounting the full AppShell in a test with no backend).
   */
  qc.setQueryData(['today'], {})
  qc.setQueryData(['suite-queue-count'], { items: [], total: 0 })
  qc.setQueryData(['your-leave'], [])
  qc.setQueryData(['your-spending'], [])
  qc.setQueryData(['your-hours'], [])
  qc.setQueryData(['your-reviews'], [])
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds']}><AppShell><div>page content</div></AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useFeedbackStore.setState({ open: false })
})

describe('B-225: the wording is plain, full sentences', () => {
  it('the middle tab reads plain phrases, not clipped jargon', () => {
    mount()
    fireEvent.click(document.querySelector('.gw-feedback-btn') as HTMLElement)
    fireEvent.click(screen.getByText('Something you would like'))
    expect(screen.getByText('Reminders by email')).toBeTruthy()
    expect(screen.getByText('Notices in Slack')).toBeTruthy()
    expect(screen.getByText('A picture of how the team is doing')).toBeTruthy()
    expect(screen.queryByText('Reminder / email nudge')).toBeNull()
    expect(screen.queryByText('Slack integration')).toBeNull()
    expect(screen.queryByText('Team analytics')).toBeNull()
  })

  it('names what to do with "Pick what you would like us to build.", not "Pick what you need built."', () => {
    mount()
    fireEvent.click(document.querySelector('.gw-feedback-btn') as HTMLElement)
    fireEvent.click(screen.getByText('Something you would like'))
    expect(screen.getByText('Pick what you would like us to build.')).toBeTruthy()
    expect(screen.queryByText('Pick what you need built.')).toBeNull()
  })
})

describe('B-225: the panel\'s fields get the app\'s usual visible focus', () => {
  it('"Tell us what happened" and the email field carry the focus-visible class, not outline: none', () => {
    mount()
    fireEvent.click(document.querySelector('.gw-feedback-btn') as HTMLElement)
    fireEvent.click(screen.getByText('Something went wrong'))
    const wrongBox = screen.getByPlaceholderText('Tell us what happened') as HTMLTextAreaElement
    const email = screen.getByPlaceholderText("Your email, if you'd like a reply") as HTMLInputElement
    expect(wrongBox.className).toContain('gwui-fb-field')
    expect(email.className).toContain('gwui-fb-field')
    expect(wrongBox.style.outline).not.toBe('none')
    expect(email.style.outline).not.toBe('none')
  })
})

describe('B-225: Tab stays inside the panel, and focus returns to its opener', () => {
  it('Shift+Tab from the first focusable element wraps to the last, not out of the panel', () => {
    mount()
    const openerBtn = document.querySelector('.gw-feedback-btn') as HTMLElement
    openerBtn.focus()
    fireEvent.click(openerBtn)
    const dialog = screen.getByRole('dialog', { name: 'Feedback' })
    // The Send button starts disabled (nothing picked yet) - never a stop a keyboard tab makes.
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, textarea, a[href], [tabindex]:not([tabindex="-1"])'))
      .filter(el => !(el as HTMLButtonElement).disabled)
    expect(focusables.length).toBeGreaterThan(1)
    focusables[0].focus()
    expect(document.activeElement).toBe(focusables[0])
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(focusables[focusables.length - 1])
  })

  it('after Cancel, focus returns to the button that opened the panel', async () => {
    mount()
    const openerBtn = document.querySelector('.gw-feedback-btn') as HTMLElement
    openerBtn.focus()
    fireEvent.click(openerBtn)
    await screen.findByRole('dialog', { name: 'Feedback' })
    fireEvent.click(screen.getByText('Cancel'))
    await waitFor(() => expect(document.activeElement).toBe(openerBtn))
  })

  it('Escape closes the panel and also returns focus to its opener', async () => {
    mount()
    const openerBtn = document.querySelector('.gw-feedback-btn') as HTMLElement
    openerBtn.focus()
    fireEvent.click(openerBtn)
    await screen.findByRole('dialog', { name: 'Feedback' })
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(openerBtn))
  })
})

describe('B-225 (review 6): the thank-you line reads as a full sentence, and keeps focus', () => {
  it('reads "Thank you. We have your note." and takes focus while it shows, then gives focus back to the opener', async () => {
    const submit = vi.spyOn(feedbackApi, 'submit').mockResolvedValue({
      id: 'f1', tab: 'reaction', pill: 'This clicked', text: null, status: 'new', createdAt: new Date().toISOString(),
    })
    mount()
    const openerBtn = document.querySelector('.gw-feedback-btn') as HTMLElement
    openerBtn.focus()
    fireEvent.click(openerBtn)
    await screen.findByRole('dialog', { name: 'Feedback' })
    fireEvent.click(screen.getByText('This clicked'))
    fireEvent.click(screen.getByText('Send'))
    await waitFor(() => expect(submit).toHaveBeenCalled())

    const thankYou = await screen.findByText('Thank you. We have your note.')
    expect(screen.queryByText('Thanks - noted ✓')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(thankYou))
    /* B-238: a focused div with no role said nothing to a screen reader - role="status" announces
       this line the moment it appears, not only to a sighted reader watching it take focus. */
    expect(thankYou.getAttribute('role')).toBe('status')

    // The panel closes itself about 1.8 seconds after Send (AppShell's own `setTimeout`, already
    // scheduled on the real clock by the time this test can reach it) - waited out in real time
    // rather than with fake timers, which cannot control a timer that real code already scheduled
    // before they were switched on.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull(), { timeout: 2500 })
    await waitFor(() => expect(document.activeElement).toBe(openerBtn))
  })
})
