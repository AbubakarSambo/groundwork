import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvitePage, theInvitation, whereAndUntil } from './InvitePage'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * THE INVITATION, AS THE PROTOTYPE HAS IT (A3, join-invite.txt, U.3).
 *
 * WAS: "the three questions, in the order somebody has them" (G27, G28): "Why you.", then "What it
 * takes." (about ten minutes), then "What you get back.". The prototype replaces those three with its
 * own card: the lead's invitation, the organisation and end date, one box on who can see what you
 * say, "What it asks", "Who sees your answers", and "Answer today's check-in now". Hafsah asked for
 * the prototype's page (26 September), so this file now reads that, rendered as the person sees it.
 *
 * DECIDED, 29 September, item 11 conflict A: "Nobody else reads your answers." and "Wairimu reads
 * the report, not your words." are dropped for good, not shown while a decision is pending - they
 * are not true, since decision 1 in CLAUDE.md's privacy rules lets the people in a check-in and its
 * organisation's admins read what somebody said in it. The box on who can see what you say is now
 * built from the check-in's own scenario (`whoCanReadThis`, InvitePage.tsx): the admins sentence is
 * left out on a performance plan, a promotion or a renewal, and left out too when the scenario is
 * not known. "What happens to what you write" carries the same true sentence in its own panel,
 * "Who can read what you write", replacing the old "Nobody you work with reads it".
 */
const participantsApi = vi.hoisted(() => ({ preview: vi.fn(), accept: vi.fn() }))
vi.mock('@/api', () => ({ participantsApi }))
const authState = vi.hoisted(() => ({ isAuthenticated: false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn(), isAuthenticated: authState.isAuthenticated }) }))

const PREVIEW = {
  groundLabel: 'Sales team, Q3',
  initiatorName: 'Wairimu Kamau',
  leadFirstName: 'Wairimu',
  organisationName: 'Baridi Appliances',
  endsAt: '2026-09-30T00:00:00.000Z',
  schedule: 'A short check-in each weekday.',
  scenario: 'NEW_PROJECT',
  roleAsDescribed: null,
  alreadyAccepted: false,
}

function open(preview: any = PREVIEW) {
  participantsApi.preview.mockResolvedValue(preview)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/invite?token=t']}>
        <Routes><Route path="/invite" element={<InvitePage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the invitation a participant reads', () => {
  /*
   * U.20 fifth review (Hafsah, pictured at 1440px): "What happens to what you write" moved from an
   * always-open section before the form to a plain link under the button's own line, so the person
   * reads the button before that link now, where it used to be the other way round.
   */
  it('in the prototype\'s words, in its order', async () => {
    open()
    expect(await screen.findByRole('heading', { name: 'Wairimu invited you to “Sales team, Q3”' })).toBeTruthy()
    const text = document.body.textContent ?? ''
    const order = [
      'This runs at Baridi Appliances until 30 September.',
      'The people in this check-in, including your manager, can see what you say in it.',
      'What it asks',
      'A short check-in each weekday.',
      'Who sees your answers',
      'You see your own report straight away. Wairimu shares a team report',
      'Answer today’s check-in now',
      'About two minutes. You choose how you sign in afterwards.',
      'What happens to what you write',
    ].map(t => text.replace(/\s+/g, ' ').indexOf(t))
    expect(order.every(i => i > -1)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('leaves out the two held sentences, and the old three questions', async () => {
    open()
    await screen.findByText('Who sees your answers')
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/Nobody else reads your answers/)
    expect(text).not.toMatch(/reads the report, not your words/)
    expect(text).not.toMatch(/Why you\.|What it takes\.|What you get back\./)
    expect(text).not.toMatch(/About ten minutes/)
  })

  it('shows no "Your number" block, because the invitation carries no share of a target', async () => {
    open()
    await screen.findByText('Who sees your answers')
    expect(screen.queryByText('Your number')).toBeNull()
  })

  /* U.20 ninth round (Hafsah's last check): the preview is read with the link's token, before any
     sign-in, so it must never carry the number itself - only WHO would see it, through the
     engine's own visibility rule (participants.service.ts's preview). */
  it('shows "Your number" the prototype\'s way when it is you and the lead', async () => {
    open({ ...PREVIEW, yourNumberIsSeenBy: 'you-and-lead' })
    await screen.findByText('Who sees your answers')
    expect(screen.getByText('Your number')).toBeTruthy()
    expect(screen.getByText('Only you and Wairimu see your share of the target.')).toBeTruthy()
  })

  it('says so when the check-in shows everybody every number', async () => {
    open({ ...PREVIEW, yourNumberIsSeenBy: 'everybody' })
    await screen.findByText('Who sees your answers')
    expect(screen.getByText('Everybody in this check-in sees every number, including yours.')).toBeTruthy()
  })
})

describe('who can read this, built from the check-in\'s own scenario (item 11, conflict A)', () => {
  /* Decision 5 (corrected 29 September) keeps a performance plan, a promotion or a renewal from an
     admin with no access to it, the same as a performance plan alone. The invitation must never
     promise admins can read a check-in where the server would actually refuse them. */
  it('says admins can read an ordinary check-in', async () => {
    open({ ...PREVIEW, scenario: 'NEW_PROJECT' })
    await screen.findByText('Who sees your answers')
    expect(screen.getByText(/Admins in your organisation can read every check-in\./)).toBeTruthy()
  })

  it.each(['PIP', 'RECOGNITION', 'CONTRACT_RENEWAL'])('leaves out the admins line on %s', async (scenario) => {
    open({ ...PREVIEW, scenario })
    await screen.findByText('Who sees your answers')
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/Admins in your organisation can read every check-in\./)
    expect(screen.getByText('The people in this check-in, including your manager, can see what you say in it. Your own report and your questions to Ask Baridi Appliances stay private.')).toBeTruthy()
  })

  it('leaves the admins line out too when the scenario is not known - the more private reading', async () => {
    open({ ...PREVIEW, scenario: undefined })
    await screen.findByText('Who sees your answers')
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/Admins in your organisation can read every check-in\./)
  })
})

describe('the two lines built from the record', () => {
  it('names the lead by first name', () => {
    expect(theInvitation(PREVIEW)).toBe('Wairimu invited you to “Sales team, Q3”')
    expect(theInvitation({ ...PREVIEW, leadFirstName: null })).toBe('Wairimu Kamau invited you to “Sales team, Q3”')
  })

  /*
   * B-088: "Baridi Appliances, until 30 September." joined two pieces with a comma, which is not a
   * sentence - changed to "This runs at Baridi Appliances until 30 September." The same fix forces
   * nothing about which timezone the date reads in any more (it used to force UTC here alone),
   * which is the other half of B-088: a check-in's own page and this invitation disagreed about
   * its end date because this was the one place that chose its own timezone instead of reading the
   * same way everything else on the product already does.
   */
  it('says the organisation and the end date, or whichever there is', () => {
    expect(whereAndUntil(PREVIEW)).toBe('This runs at Baridi Appliances until 30 September.')
    /* U.3 review: each alone is a full sentence. These read "Baridi Appliances." and "Until 30
       September." before, which are not sentences. */
    expect(whereAndUntil({ organisationName: 'Baridi Appliances', endsAt: null })).toBe('A check-in at Baridi Appliances.')
    expect(whereAndUntil({ organisationName: null, endsAt: '2026-09-30T00:00:00.000Z' })).toBe('It runs until 30 September.')
  })

  it('B-088: reads the same end date as whenItWas renders everywhere else, with nothing of its own imposed', () => {
    const endsAt = '2026-11-08T00:00:00.000Z'
    expect(whereAndUntil({ organisationName: 'Msingi Foods', endsAt })).toBe(
      `This runs at Msingi Foods until ${whenItWas(endsAt, 'dayAndMonthLong')}.`,
    )
  })
})

describe('the rest of the page, as the participant reads it (U.3 review)', () => {
  const read = () => (document.body.textContent ?? '').replace(/\s+/g, ' ')

  it('says the organisation in a full sentence when there is no end date', async () => {
    open({ ...PREVIEW, organisationName: 'Coamana', endsAt: null })
    await screen.findByText('Who sees your answers')
    expect(screen.getByText('A check-in at Coamana.')).toBeTruthy()
  })

  it('says the name line and the way out in plain sentences, with no dashes', async () => {
    open()
    await screen.findByText('Who sees your answers')
    expect(read()).toContain('Your name is optional. If you add it, the others will see it on the shared report.')
    expect(read()).toContain('You never have to take part. If you would rather not, you can close this page. Nothing is shared, and saying no is never held against you.')
    expect(read()).not.toMatch(/ - /)
    expect(read()).not.toMatch(/obligated|declining is never shown as a negative/)
  })

  it('no longer asks anyone to agree that their "contribution record belongs to" them', async () => {
    open()
    await screen.findByText('Who sees your answers')
    expect(read()).not.toMatch(/contribution record|By joining, you agree/)
  })

  /*
   * U.20 (the invitation's rebuild, design-audit.md section 3): the page is now built from
   * components/gw/ui only - `Page narrow` and `Mark` in place of the old `Arrival`/`gw-auth-brand`
   * chrome, `Callout` in place of the page-only `gw-invite-note`. The same three things the
   * prototype's picture shows - a small mark, no header band, the privacy line in a tinted box -
   * are still true; only the class names they come from changed.
   */
  it('has the prototype\'s look: the small mark, no header band, the note in beige', async () => {
    open()
    await screen.findByText('Who sees your answers')
    expect(document.querySelector('.gwui-page-narrow .gwui-mark')).not.toBeNull()
    expect(document.querySelector('.gw-hdr')).toBeNull()
    expect(document.querySelector('.gw-box-blue')).toBeNull()
    expect(document.querySelector('.gwui-callout')?.textContent).toMatch(/^\s*The people in this check-in, including your manager, can see what you say in it\./)
  })
})

describe('what the lead wrote about the person is not on their invitation (U.6 review)', () => {
  it('Daniel does not read the lead\'s sentence about him, even if a server sent it', async () => {
    open({ ...PREVIEW, roleAsDescribed: 'Daniel - Your sales manager, who you said is not meeting his agreed targets for pipeline building and coaching.' })
    await screen.findByText('Who sees your answers')
    const text = document.body.textContent ?? ''
    expect(text).not.toContain('Your part in this')
    expect(text).not.toContain('sales manager')
  })
})


describe('a check-in that opens later (U.6 review)', () => {
  /* Read live: "Answer today’s check-in now / About two minutes. You choose how you sign in afterwards."
     on an invitation to a check-in that opens on 5 October. */
  it('says when the first check-in opens, and offers nothing to answer now', async () => {
    open({ ...PREVIEW, opensOn: '2099-10-05T00:00:00.000Z' })
    expect(await screen.findByText('Your first check-in opens on Monday 5 October.')).toBeTruthy()
    const text = document.body.textContent ?? ''
    expect(text).not.toContain('Answer today’s check-in now')
    expect(text).not.toContain('You choose how you sign in afterwards')
  })

  it('and one that is open offers to answer now, as before', async () => {
    open({ ...PREVIEW, opensOn: null })
    expect(await screen.findByText('Answer today’s check-in now')).toBeTruthy()
    expect(document.body.textContent).toContain('About two minutes. You choose how you sign in afterwards.')
  })
})

describe('"You choose how you sign in afterwards" (U.6 review)', () => {
  it('is not said to someone already signed in', async () => {
    authState.isAuthenticated = true
    open({ ...PREVIEW, opensOn: null })
    expect(await screen.findByText('About two minutes.')).toBeTruthy()
    expect(document.body.textContent).not.toContain('You choose how you sign in afterwards')
    authState.isAuthenticated = false
  })
})


describe('the opening day is not under "What happens to what you write" (U.6 review)', () => {
  it('comes before that heading', async () => {
    open({ ...PREVIEW, opensOn: '2099-10-05T00:00:00.000Z' })
    const line = await screen.findByText('Your first check-in opens on Monday 5 October.')
    const heading = screen.getByText('What happens to what you write')
    expect(line.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    /* U.20: the panel is no longer a folding <details> (the prototype has none on join-invite.jpg),
       so there is nothing left that could hide the line inside it - this is now simply true. */
    expect(heading.closest('details')).toBeNull()
  })
})
