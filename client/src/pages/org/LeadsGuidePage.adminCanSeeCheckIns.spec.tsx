import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LeadsGuidePage } from './LeadsGuidePage'

/**
 * FAULT 4: THE GUIDE SAID SOMETHING UNTRUE ABOUT ADMINS.
 *
 * It read: "An admin never sees anybody's check-in itself. Approving a check-in means approving
 * that it happens, not reading what is said in it." Decision 5 (docs/decisions.md) says the
 * opposite: admins see every board and report, including what people said in them. They never see
 * anyone's questions to Ask Groundwork, anyone's own report, or a lead's private notes, and never
 * a performance plan unless given access to that check-in. This pins the corrected sentence, with
 * the organisation's own Ask name, and forbids the old false claim anywhere in the client.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'u-naomi', role: 'ADMIN', organizationName: 'Kijani Foods' } }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <LeadsGuidePage />
    </MemoryRouter>,
  )
}

describe('the leads guide tells the truth about what an admin can see', () => {
  it('says admins see every board and report, including what people said in them', async () => {
    renderPage()
    expect(
      await screen.findByText(
        /An admin can see every board and report, including what people said in them\./,
      ),
    ).toBeTruthy()
  })

  it('says admins never see questions to the organisation\'s own Ask, anyone\'s own report, or a lead\'s private notes', async () => {
    renderPage()
    expect(
      await screen.findByText(
        /An admin never sees anyone's questions to Ask Kijani Foods, anyone's own report, or a lead's private notes, and never a performance plan unless given access to that check-in\./,
      ),
    ).toBeTruthy()
  })

  it('never claims an admin cannot see a check-in itself', () => {
    renderPage()
    expect(screen.queryByText(/never sees anybody's check-in/i)).toBeNull()
    expect(document.body.textContent).not.toMatch(/never sees anybody's check-in/i)
  })
})
