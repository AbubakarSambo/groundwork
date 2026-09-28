import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundChat } from './GroundChat'

/**
 * WATCHED AT REST FOR THE FIRST TIME. W14-12.
 *
 * Every verification until now used a check-in whose sessions were all done or all open. Nobody had
 * watched one sit between sessions with a date in the future, which is where a check-in spends most of
 * its life. Done by moving a real ground's last session back to NOT_STARTED with `available_from`
 * five days out, reading the page, and putting the rows back exactly as they were.
 *
 * The composer was right: "Your next check-in opens 18 August." Two inches above it the roster said
 * "You - waiting, Abubakar - waiting". Waiting is the word for somebody who has not done a thing
 * they could have done, and neither of them could have. On a product whose entire subject is who did
 * what and when, a resting ground quietly told a lead their team was late.
 *
 * U.8 REVIEW: THE PILL'S OWN WORDS CHANGED FROM "NAME · STATUS" TO A FULL SENTENCE, SO THIS NOW
 * RENDERS THE COMPONENT AND READS WHAT IT SAYS, rather than matching the ` · waiting` / `'has not
 * checked in yet'` literals this file used to pin - which is exactly the shape of guard the
 * coordinator asked for (a comment satisfies a source-literal guard without proving the words on
 * screen are actually right). The three rules this file exists to hold are unweakened: nothing says
 * "waiting", or any other word for lateness, before the session opens; the tooltip says why; and
 * the same signal is still there, in words, once a session IS open.
 */
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    myTranscript: vi.fn(async () => ({ sessions: [] })),
    myNotes: vi.fn(async () => []),
  },
}))

/**
 * `notOpenYet` is not a prop GroundChat takes; it is derived inside it, exactly the same way the
 * composer derives it, from `!openCheckInId && !!nextOpensAt` (the fourth test below locks that).
 * So the way to put the roster into the "resting between sessions" state is the way the real page
 * does: no open check-in, and a future date for the next one.
 */
function renderTopic(parties: { name: string; done: boolean; isSelf: boolean }[], notOpenYet = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <GroundChat
          groundId="g1"
          openCheckInId={notOpenYet ? null : 'ci1'}
          openSessionNumber={notOpenYet ? null : 3}
          totalSessions={6}
          nextOpensAt={notOpenYet ? '2099-01-01T00:00:00.000Z' : null}
          onOpenSession={() => {}}
          openPending={false}
          parties={parties}
          brief="A brief, so the card's heading renders."
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the roster between sessions', () => {
  it('drops "waiting" (and any other word for lateness) when the next session has not opened', async () => {
    renderTopic([
      { name: 'Ejiro', done: false, isSelf: false },
      { name: 'Abubakar', done: false, isSelf: true },
    ], true)
    await screen.findByText(/Who is in this/)
    /* Just the name - no status at all - is what "nobody is late for a session that has not
       opened" looks like on screen. */
    expect(screen.getByText('Ejiro')).toBeTruthy()
    expect(screen.getByText('You')).toBeTruthy()
    expect(screen.queryByText(/waiting/i)).toBeNull()
    expect(screen.queryByText(/not checked in/i)).toBeNull()
    expect(screen.queryByText(/late/i)).toBeNull()
  })

  it('and the hover text says why, rather than nothing', async () => {
    /* Two parties: the roster only renders once there is more than one (a check-in of one is a
       sentence about yourself, not a roster). */
    renderTopic([
      { name: 'Ejiro', done: false, isSelf: false },
      { name: 'Abubakar', done: false, isSelf: true },
    ], true)
    await screen.findByText(/Who is in this/)
    expect(screen.getByTitle('Ejiro. The next session has not opened yet.')).toBeTruthy()
  })

  it('still says so, in words, when a session IS open', async () => {
    /* The signal is worth keeping. It was only ever wrong at rest. */
    renderTopic([
      { name: 'Ejiro', done: false, isSelf: false },
      { name: 'Abubakar', done: true, isSelf: false },
    ], false)
    await screen.findByText(/Who is in this/)
    expect(screen.getByText('Ejiro has not checked in yet.')).toBeTruthy()
    expect(screen.getByText('Abubakar has checked in.')).toBeTruthy()
  })

  it('reads the state off the same two values the composer does', () => {
    /**
     * `!openCheckInId && !!nextOpensAt` is exactly what makes the composer print "opens on". Two
     * different derivations of one state is how the two halves of this screen came to disagree in
     * the first place. Kept as a source check, unchanged by the U.8 review: it is about which two
     * values feed `notOpenYet`, not about the words on screen.
     */
    const CODE = readFileSync(join(__dirname, 'GroundChat.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(CODE).toMatch(/notOpenYet=\{!openCheckInId && !!nextOpensAt\}/)
  })
})
