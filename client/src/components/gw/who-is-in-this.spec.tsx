import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundChat } from './GroundChat'

/**
 * WHO IS IN THIS, AND WHETHER THEY ARE DOING IT. W13-5.
 *
 * From the audit: a participant saw their own tabs and nothing else, while the lead saw every
 * party and every session. So the two things that would settle somebody's nerves before writing
 * honestly - who is going to read this, and is anybody else actually doing it - were the two
 * things only the lead could see.
 *
 * WHAT THIS IS NOT. It is coverage, never content: that a person has checked in, never a word
 * of what they said. And there is deliberately NO permission check in the component.
 * `grounds.service.ts` decides whether parties see each other and FILTERS THE OTHERS OUT OF THE
 * PAYLOAD when they must not - hidden by default on evaluation and cohort grounds, where a
 * roster tells four people exactly who they are being measured against. A second rule here
 * would be a second place to get it wrong, which is the lesson from the two times a private
 * read leaked through an instruction rather than a query.
 */

vi.mock('@/api/grounds', () => ({
  groundsApi: {
    myTranscript: vi.fn(async () => ({ sessions: [] })),
    myNotes: vi.fn(async () => []),
  },
}))

function renderTopic(parties: { name: string; done: boolean; isSelf: boolean }[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <GroundChat
          groundId="g1"
          openCheckInId={null}
          openSessionNumber={null}
          totalSessions={6}
          nextOpensAt={null}
          onOpenSession={() => {}}
          openPending={false}
          label="New hire"
          sessionsDone={2}
          parties={parties}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the roster on the ground', () => {
  it('names the other parties and says who has checked in', async () => {
    renderTopic([
      { name: 'Hafsah', done: true, isSelf: false },
      { name: 'Abubakar', done: false, isSelf: true },
    ])
    expect(await screen.findByText(/Who is in this/)).toBeTruthy()
    expect(screen.getByText(/Hafsah/)).toBeTruthy()
    // `getAllByText`: "checked in" also appears in the card's closing line about the
    // report, which is correct copy and not what this asserts.
    expect(screen.getAllByText(/checked in/).length).toBeGreaterThan(0)
    expect(screen.getByText(/waiting/)).toBeTruthy()
  })

  it('calls the reader "You" rather than repeating their own name at them', async () => {
    renderTopic([
      { name: 'Hafsah', done: true, isSelf: false },
      { name: 'Abubakar', done: false, isSelf: true },
    ])
    expect(await screen.findByText(/You/)).toBeTruthy()
    expect(screen.queryByText(/Abubakar/)).toBeNull()
  })

  it('says nothing at all on a ground with one party', async () => {
    /**
     * A roster of one is a sentence about yourself. It is also what a reader sees when the
     * service has filtered the others out, and a heading over an empty list would advertise
     * that there is something they cannot see.
     */
    renderTopic([{ name: 'Hafsah', done: true, isSelf: true }])
    await screen.findByText('New hire')
    expect(screen.queryByText(/Who is in this/)).toBeNull()
  })

  it('and never renders anything a person wrote', async () => {
    renderTopic([
      { name: 'Hafsah', done: true, isSelf: false },
      { name: 'Abubakar', done: true, isSelf: true },
    ])
    await screen.findByText(/Who is in this/)
    // The only per-person facts in the roster are a name and a state.
    expect(document.body.textContent ?? '').not.toMatch(/said|wrote|answered that/i)
  })
})

describe('the permission stays in the service', () => {
  const code = (rel: string) =>
    readFileSync(join(__dirname, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')

  it('the component does not decide who may be seen', () => {
    /**
     * If this component grows its own `peersVisible` check, the rule exists in two places and
     * they will disagree. The service filters the payload; the component draws what it is given.
     */
    expect(code('GroundChat.tsx')).not.toMatch(/peersVisible|restrictExternalVisibility|hidePeers/)
  })

  it('and the pages build the roster from the payload rather than from a role', () => {
    const part = code('../../pages/grounds/GroundParticipantPage.tsx')
    expect(part).toMatch(/parties=\{\(ground\.participants \?\? \[\]\)/)
  })
})
