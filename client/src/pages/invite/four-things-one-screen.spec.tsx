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
 * DECIDED, 29 September, item 11 conflict A: "Nobody else reads your conversation." and "Wairimu reads
 * the report, not your words." are dropped for good, not shown while a decision is pending - they
 * are not true, since decision 1 in CLAUDE.md's privacy rules lets the people in a check-in and its
 * organisation's admins read what somebody said in it. The box on who can see what you say is now
 * built from the check-in's own scenario (`whoCanReadWhatYouSay`, served): the admins sentence is
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
  /* Served by the server's one owner (api grounds/who-may-read-this-check-in.ts whoCanReadWhatYouSay), never composed here. */
  whoCanReadWhatYouSay: 'You see your own report straight away. Wairimu shares a team report when it is ready. Nobody else reads your conversation.',
  organisationName: 'Baridi Appliances',
  endsAt: '2026-09-30T00:00:00.000Z',
  schedule: 'About ten minutes each weekday.',
  takes: 'About ten minutes',
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
  /* Staging check S17 (4 November): Stella gave Rita's number in setup, and the invitation's phone field was empty. */
  it('starts the phone field with the number the lead gave', async () => {
    open({ ...PREVIEW, phone: '+254 712 345 678' })
    await screen.findByRole('heading', { name: 'Wairimu invited you to the Sales team, Q3 check-in' })
    const field = document.getElementById('invite-phone') as HTMLInputElement | null
    expect(field?.value).toBe('+254 712 345 678')
  })
  /*
   * U.20 fifth review (Hafsah, pictured at 1440px): "What happens to what you write" moved from an
   * always-open section before the form to a plain link under the button's own line, so the person
   * reads the button before that link now, where it used to be the other way round.
   */
  /* Changed in F5 (the approved journey, stage 6): the target's heading, place and length; how long it takes is the measured figure. */
  it('in the prototype\'s words, in its order', async () => {
    open()
    expect(await screen.findByRole('heading', { name: 'Wairimu invited you to the Sales team, Q3 check-in' })).toBeTruthy()
    const text = document.body.textContent ?? ''
    const order = [
      'Baridi Appliances, until 30 September.',
      'What it asks',
      'About ten minutes each weekday.',
      'Who sees your answers',
      /* 15 November 2026 (rows 12 and 14, and Hafsah's wording): the callout and the modal are gone; this one short block is all that is said. */
      'You see your own report straight away. Wairimu shares a team report when it is ready. Nobody else reads your conversation.',
      'Answer today’s check-in now',
      'About ten minutes. You choose how you sign in afterwards.',
    ].map(t => text.replace(/\s+/g, ' ').indexOf(t))
    expect(order.every(i => i > -1)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('leaves out the two held sentences, and the old three questions', async () => {
    open()
    await screen.findByText('Who sees your answers')
    const text = document.body.textContent ?? ''
    /* Changed 15 November 2026: "Nobody else reads your conversation." is back, as the end of the server's one sentence (Hafsah's decision), so it is no longer barred; "reads the report, not your words" still is. */
    expect(text).not.toMatch(/reads the report, not your words/)
    expect(text).not.toMatch(/Why you\.|What it takes\.|What you get back\./)
    /* The old block's "About ten minutes" is gone; the note under "Answer today's check-in now" says it once (fix list, item 4). */
    expect(text.match(/About ten minutes\./g) ?? []).toHaveLength(1) /* Hafsah's fixed length, 3 November */
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

/* Changed 15 November 2026 (Hafsah): the page no longer builds the "who can read this" sentence from the scenario, so the cases for admins and for
   the evaluation scenarios moved to the server's own spec (api grounds/who-can-read-what-you-say.spec.ts). Here the page is held to drawing
   exactly what it is served, once, and to naming no admins. */
describe('who sees your answers, as served', () => {
  it('draws the served sentence once, under "Who sees your answers", and nothing of its own', async () => {
    open({ ...PREVIEW, whoCanReadWhatYouSay: 'You see your own report straight away. Wairimu reads it too. Nobody else reads your conversation.' })
    await screen.findByText('Who sees your answers')
    expect(screen.getAllByText('You see your own report straight away. Wairimu reads it too. Nobody else reads your conversation.')).toHaveLength(1)
    expect(document.body.textContent).not.toMatch(/Admins at|can see what you say in it/)
  })

  it('draws no block at all when nothing is served, rather than guessing', async () => {
    open({ ...PREVIEW, whoCanReadWhatYouSay: undefined })
    await screen.findByText('What it asks')
    expect(screen.queryByText('Who sees your answers')).toBeNull()
  })
})

describe('the two lines built from the record', () => {
  it('names the lead by first name', () => {
    expect(theInvitation(PREVIEW)).toBe('Wairimu invited you to the Sales team, Q3 check-in')
    expect(theInvitation({ ...PREVIEW, leadFirstName: null })).toBe('Wairimu Kamau invited you to the Sales team, Q3 check-in')
    /* Staging check S17 (4 November): never "the Stella's check-in". */
    expect(theInvitation({ ...PREVIEW, leadFirstName: 'Stella', groundLabel: "Stella's check-in" })).toBe("Stella invited you to Stella's check-in")
    expect(theInvitation({ ...PREVIEW, leadFirstName: 'Stella', groundLabel: 'Sales updates' })).toBe('Stella invited you to the Sales updates check-in')
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
    expect(whereAndUntil(PREVIEW)).toBe('Baridi Appliances, until 30 September.') /* F5: the target journey's words, which Hafsah approved after B-088 */
    /* U.3 review: each alone is a full sentence. These read "Baridi Appliances." and "Until 30
       September." before, which are not sentences. */
    expect(whereAndUntil({ organisationName: 'Baridi Appliances', endsAt: null })).toBe('A check-in at Baridi Appliances.')
    expect(whereAndUntil({ organisationName: null, endsAt: '2026-09-30T00:00:00.000Z' })).toBe('It runs until 30 September.')
  })

  it('B-088: reads the same end date as whenItWas renders everywhere else, with nothing of its own imposed', () => {
    const endsAt = '2026-11-08T00:00:00.000Z'
    expect(whereAndUntil({ organisationName: 'Msingi Foods', endsAt })).toBe(
      `Msingi Foods, until ${whenItWas(endsAt, 'dayAndMonthLong')}.`,
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

  /* Changed 15 November 2026 (audit rows 13 and 15): the name help line and the "You never have to take part" note with its "Not right now" button are gone. */
  it('reads in plain sentences with no dashes, and has no reassurance note or button that does nothing', async () => {
    open()
    await screen.findByText('Who sees your answers')
    expect(read()).not.toContain('Your name is optional')
    expect(read()).not.toContain('You never have to take part')
    expect(screen.queryByRole('button', { name: 'Not right now' })).toBeNull()
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
    /* The tinted callout is gone (row 14): the same sentence now sits in "Who sees your answers". */
    expect(document.querySelector('.gwui-callout')).toBeNull()
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
  /* Read live: "Answer today’s check-in now / About ten minutes. You choose how you sign in afterwards."
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
    expect(document.body.textContent).toContain('About ten minutes. You choose how you sign in afterwards.')
  })
})

describe('"You choose how you sign in afterwards" (U.6 review)', () => {
  it('is not said to someone already signed in', async () => {
    authState.isAuthenticated = true
    open({ ...PREVIEW, opensOn: null })
    expect(await screen.findByText('About ten minutes.')).toBeTruthy()
    expect(document.body.textContent).not.toContain('You choose how you sign in afterwards')
    authState.isAuthenticated = false
  })
})


describe('the opening day, on an invitation to a check-in that opens later (U.6 review)', () => {
  it('is said before the button, and there is no privacy heading left to put it under', async () => {
    open({ ...PREVIEW, opensOn: '2099-10-05T00:00:00.000Z' })
    const line = await screen.findByText('Your first check-in opens on Monday 5 October.')
    expect(screen.queryByText('What happens to what you write')).toBeNull()
    expect(line.closest('details')).toBeNull()
  })
})
