import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TargetsBand, type Target } from './TargetsBand'
import { boardApi } from '@/api/board'

vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn(async () => ({})) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/*
 * THE TARGETS BAND, READ AS EACH PERSON READS IT (U.7, B2 Context).
 *
 * Words from docs/prototype/screens/B2-context/context.txt ("Targets", "Change who sees them", "The
 * whole team", "Seen by everyone", "Seen by Aisha and you", "Each person sees their own share and
 * the team’s totals, never someone else’s share.") and, for what a target assumes, from the
 * prototype's board (B5-the-board/board-as-lead.txt).
 *
 * The server decides which rows each reader is sent (targetsFor, api what-a-target-assumes.spec).
 * These cases feed each reader exactly what the server sends them.
 */
const people = [
  { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
  { id: 'p-aisha', userId: 'u-aisha', partyType: 'PARTY', user: { firstName: 'Aisha', lastName: 'Otieno' } },
  { id: 'p-brian', userId: 'u-brian', partyType: 'PARTY', user: { firstName: 'Brian', lastName: 'Mwangi' } },
]
const team: Target = { id: 't1', name: 'Sales', target: 25, ownerParticipantId: null, assumes: ['6 reps each close about 4 sales.', 'Stock arrives within a week of an order.'] }
const aisha: Target = { id: 't2', name: 'Aisha’s share', target: 6, ownerParticipantId: 'p-aisha', assumes: [] }
const brian: Target = { id: 't3', name: 'Brian’s share', target: 5, ownerParticipantId: 'p-brian', assumes: [] }

const draw = (props: Partial<React.ComponentProps<typeof TargetsBand>>) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TargetsBand groundId="g1" targets={[]} participants={people} isTheLead={false} numbersShared={false} {...props} />
    </QueryClientProvider>,
  )
}
const rowText = (id: string) => (document.querySelector(`[data-gw-target="${id}"]`) as HTMLElement).textContent

beforeEach(() => vi.clearAllMocks())

describe('the lead, Wairimu', () => {
  it('reads every target, whose it is, and who sees it', () => {
    draw({ targets: [team, aisha, brian], viewerUserId: 'u-lead', isTheLead: true })
    expect(rowText('t1')).toContain('Sales')
    expect(rowText('t1')).toContain('25')
    expect(rowText('t1')).toContain('The whole team')
    expect(rowText('t1')).toContain('Seen by everyone')
    expect(rowText('t2')).toContain('Aisha')
    expect(rowText('t2')).toContain('Seen by Aisha and you')
    expect(rowText('t3')).toContain('Seen by Brian and you')
    expect(screen.getByText('Change who sees them').getAttribute('href')).toBe('/grounds/g1?tab=settings')
    expect(screen.getByText('Each person sees their own share and the team’s totals, never someone else’s share.')).toBeTruthy()
  })

  it('reads what the target of 25 assumes, and the sentence under it', () => {
    draw({ targets: [team], viewerUserId: 'u-lead', isTheLead: true })
    const row = within(document.querySelector('[data-gw-target="t1"]') as HTMLElement)
    expect(row.getByText('What the target of 25 assumes')).toBeTruthy()
    expect(row.getByText('6 reps each close about 4 sales.')).toBeTruthy()
    expect(row.getByText('Stock arrives within a week of an order.')).toBeTruthy()
    expect(row.getByText('If one of these stops being true, the target needs a second look.')).toBeTruthy()
  })

  it('can say what a target assumes, one thing on each line, and it is saved as lines', async () => {
    draw({ targets: [aisha], viewerUserId: 'u-lead', isTheLead: true })
    await userEvent.click(screen.getByText('Say what it assumes'))
    const box = screen.getByLabelText('What the target of 6 assumes')
    await userEvent.type(box, 'Aisha keeps her two supermarket buyers.{enter}{enter}Stock arrives on time.')
    await userEvent.click(screen.getByText('Save'))
    expect(boardApi.updateObjective).toHaveBeenCalledWith('g1', 't2', { assumes: ['Aisha keeps her two supermarket buyers.', 'Stock arrives on time.'] })
  })

  it('when everybody sees every number, every row says so and the promise about shares is not made', () => {
    draw({ targets: [team, aisha], viewerUserId: 'u-lead', isTheLead: true, numbersShared: true })
    expect(rowText('t2')).toContain('Seen by everyone')
    expect(screen.queryByText(/never someone else/)).toBeNull()
  })
})

describe('the lead, on her own share', () => {
  /*
   * GROUP 3'S REVIEW, THE SCREEN'S OWN SENTENCES 8: ONE PERSON, NAMED TWICE. On her own share -
   * where she is both the lead and the owner - this used to check `isTheLead` first, so her own
   * first name (the owner's) stood beside "you": "Wairimu / Seen by Wairimu and you", as if two
   * people read it. `readerIsOwner` is checked first now, so her own share reads "You" and "Seen
   * by you" - true of who actually sees it, since it is the same one person either way.
   */
  const herOwnShops: Target = { id: 't4', name: 'Shops', target: 4, ownerParticipantId: 'p-lead', assumes: [] }
  it('reads "You", not her own name, and "Seen by you", not "Seen by Wairimu and you"', () => {
    draw({ targets: [herOwnShops], viewerUserId: 'u-lead', isTheLead: true })
    expect(rowText('t4')).toContain('You')
    expect(rowText('t4')).toContain('Seen by you')
    expect(rowText('t4')).not.toContain('Wairimu')
    expect(rowText('t4')).not.toContain('Seen by you and you')
  })
})

describe('Aisha, who takes part', () => {
  it('reads the team target and her own share, told that only she and Wairimu see it', () => {
    /* What the server sends her: the team's target and her own share, not Brian's. */
    draw({ targets: [team, aisha], viewerUserId: 'u-aisha' })
    expect(rowText('t2')).toContain('Seen by you and Wairimu')
    expect(document.body.textContent).not.toContain('Brian')
    expect(screen.getByText('What the target of 25 assumes')).toBeTruthy()
  })

  it('cannot change who sees them, cannot write what a target assumes, and is not offered the conversation', () => {
    draw({ targets: [team, aisha], viewerUserId: 'u-aisha' })
    expect(screen.queryByText('Change who sees them')).toBeNull()
    expect(screen.queryByText('Say what it assumes')).toBeNull()
    expect(screen.queryByText('Change what it assumes')).toBeNull()
    expect(screen.queryByText('Change this')).toBeNull()
  })
})

describe('Brian, reading the lead’s own share', () => {
  /* Walkthrough pass 2, item 1: "Seen by Rukia and Rukia" - when the owner of a share is the lead
     herself, the reader is neither, so both names this code reached for were her own. Named once. */
  const leadsOwnShops: Target = { id: 't5', name: 'Shops', target: 4, ownerParticipantId: 'p-lead', assumes: [] }
  it('reads "Seen by Wairimu", not "Seen by Wairimu and Wairimu"', () => {
    draw({ targets: [leadsOwnShops], viewerUserId: 'u-brian' })
    expect(rowText('t5')).toContain('Seen by Wairimu')
    expect(rowText('t5')).not.toContain('Seen by Wairimu and Wairimu')
  })
})

describe('an admin reading a check-in somebody else leads', () => {
  /* U.7 review: the server now sends an admin who is not the lead only the team's targets (the same
     rule as Context, one-rule-for-whose-share-is-shown.spec.ts), so that is what he is fed here. */
  it('reads the team target, no one’s share, and cannot write to it', () => {
    draw({ targets: [team], viewerUserId: 'u-admin' })
    expect(rowText('t1')).toContain('Seen by everyone')
    expect(document.body.textContent).not.toContain('Aisha')
    expect(screen.queryByText('Say what it assumes')).toBeNull()
  })
})

/*
 * U.7 REVIEW: A TARGET WITH NO NUMBER. The heading read "What Aisha and Baraka are to sell 25 water
 * pumps this quarter. assumes", the target's whole sentence dropped into it.
 */
describe('what a target with no number assumes', () => {
  const pumps: Target = { id: 't9', name: 'Aisha and Baraka are to sell 25 water pumps this quarter.', target: null, ownerParticipantId: null, assumes: ['Stock arrives on time.'] }
  for (const [who, viewerUserId, isTheLead] of [['the lead', 'u-lead', true], ['Aisha', 'u-aisha', false], ['an admin', 'u-admin', false]] as const) {
    it(`reads "What this target assumes" as ${who}`, () => {
      draw({ targets: [pumps], viewerUserId, isTheLead })
      expect(screen.getByText('What this target assumes')).toBeTruthy()
      expect(document.body.textContent).not.toMatch(/quarter\. assumes/)
      expect(rowText('t9')).toContain('No number set')
    })
  }
  it('and the lead writing it reads the same heading on the box', async () => {
    draw({ targets: [{ ...pumps, assumes: [] }], viewerUserId: 'u-lead', isTheLead: true })
    await userEvent.click(screen.getByText('Say what it assumes'))
    expect(screen.getByLabelText('What this target assumes')).toBeTruthy()
  })
  it('and a target with a number keeps it in the heading', () => {
    draw({ targets: [team], viewerUserId: 'u-aisha' })
    expect(screen.getByText('What the target of 25 assumes')).toBeTruthy()
  })
})
