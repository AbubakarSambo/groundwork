import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTheNextSeat } from '@/components/gw/this-adds-a-seat'
import { authApi } from '@/api/auth'
import { apiClient } from '@/api/client'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import { Section, EdgeList, EdgeRow, Button } from '@/components/gw/ui'
import { A_FAILURE } from './people-here'

/**
 * "WAITING TO BE LET IN" (A4 people.txt), at the top of the People page, only when somebody is.
 *
 * Somebody from outside, invited to a check-in, holds no seat and cannot check in until an admin
 * answers. The prototype's words, with "them" for "him": nothing here knows anyone's pronoun.
 *
 * REBUILT FROM THE SHARED PARTS (design-audit.md item 5: an `EdgeRow`, not a card - the prototype's
 * own 4px amber edge, 17px bold name and email, a 15px sentence under it, and "Don't let them in" /
 * "Let them in" on the right, both 44px tall).
 */
interface Waiting { id: string; email: string; name: string | null; addedBy: string | null; forCheckIn: string | null; waitingSince?: string; onTheOrganisationsOwnAddress?: boolean }

function whenAsked(at: string | undefined, now = new Date()): string {
  if (!at) return ''
  const d = new Date(at)
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((day(now) - day(d)) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `on ${whenItWas(d, 'dayAndMonthLong')}`
}

/** "Wairimu invited them to Sales team, Q3, yesterday. Letting them in takes a seat, and you have 73 free." */
export function whoAskedForThem(p: Waiting, seatsFree: number | null, now = new Date(), addsASeat: string | null = null): string {
  const by = p.addedBy ? p.addedBy.split(' ')[0] : 'Someone who is no longer here'
  const to = p.forCheckIn ? ` to ${p.forCheckIn}` : ''
  const when = whenAsked(p.waitingSince, now)
  /*
   * "0 FREE" READS AS A NUMBER NOBODY WOULD SAY OUT LOUD (U.4 review, item 12). And "They take a
   * seat; you have N free." joined two facts with a semicolon as if they were the same clause, when
   * the second is the reason letting them in matters.
   */
  /* Fix list item 6: past the plan's seats, letting them in adds a paid seat, and the price is said first. */
  const seat = addsASeat
    ? `Letting them in takes a seat. ${addsASeat}.`
    : seatsFree === null
    ? 'Letting them in takes a seat.'
    : `Letting them in takes a seat, and you have ${seatsFree === 0 ? 'none' : seatsFree} free.`
  return `${by} invited them${to}${when ? `, ${when}` : ''}. ${seat}`
}

export function WaitingToBeLetIn({ orgName }: { orgName: string }) {
  const qc = useQueryClient()
  const waiting = useQuery({ queryKey: ['who-is-waiting'], queryFn: authApi.whoIsWaiting })
  const nextSeat = useTheNextSeat()
  const status = useQuery({
    queryKey: ['billing-status-people'],
    queryFn: () => apiClient.get('/billing/status').then((r: any) => (r.data.data ?? r.data) as { people?: { count: number; cap: number | null }; subscription?: { plan: string | null } }),
    retry: false,
  })
  const answer = useMutation({
    mutationFn: async ({ id, letIn }: { id: string; letIn: boolean }): Promise<void> => {
      if (letIn) await authApi.letThemIn(id)
      else await authApi.doNotLetThemIn(id)
    },
    onSuccess: (_r, v) => {
      toast.success(v.letIn ? 'They can check in now.' : 'They were not let in.')
      qc.invalidateQueries({ queryKey: ['who-is-waiting'] })
      qc.invalidateQueries({ queryKey: ['org-members'] })
      /* Letting someone in takes a seat: the head count and the seats left change (U.4 review). */
      qc.invalidateQueries({ queryKey: ['billing-status-people'] })
    },
    onError: () => toast.error(A_FAILURE),
  })

  const rows = (waiting.data ?? []) as Waiting[]
  if (!rows.length) return null
  const people = status.data?.people
  const seatsFree = people && people.cap != null ? Math.max(0, people.cap - people.count) : null
  /*
   * B-096 (engine workspace, 9 October night, test bed copy a): this always read "People from
   * outside <organisation>, invited to a check-in", even for Halima Yusuf, who is on Msingi Foods'
   * own address. Now: when anyone on the list is on the organisation's own address, the heading
   * says only that people are waiting to be added, naming nobody as being from outside; when
   * everyone really is from outside, the heading keeps saying so.
   */
  const anyoneOnTheOrgsOwnAddress = rows.some(p => p.onTheOrganisationsOwnAddress)
  const note = anyoneOnTheOrgsOwnAddress
    ? 'People invited to a check-in, waiting to be added'
    : `People from outside ${orgName}, invited to a check-in`

  return (
    <Section
      heading="Waiting to be let in"
      note={note}
      foot="Letting someone in tells them straight away, and tells whoever invited them."
    >
      <EdgeList label="Waiting to be let in">
        <ShowAFew rows={rows} few={5} what="waiting to be let in">
          {(p: Waiting) => (
            <EdgeRow
              key={p.id}
              kind="look"
              title={p.name ? `${p.name}, ${p.email}` : p.email}
              detail={whoAskedForThem(p, seatsFree, new Date(), nextSeat.data?.addsASeat ? nextSeat.data.says : null)}
              /*
                HAFSAH, 30 SEPTEMBER: NOT A SECOND PRIMARY. The prototype draws "Let him in" navy
                (people.jpg), but on this rebuilt page the People screen's one primary is "Send
                their invitations" (the "Invite people" form, always on the page); when somebody is
                also waiting to be let in, that made two navy buttons live on the same screen at
                once, which the 30 September rule forbids outright. "Let them in" stays the more
                prominent of this row's own pair - `kind="secondary"`, not `"quiet"` like "Don't let
                them in" - it is just no longer the page's navy.
              */
              actions={(
                <>
                  <Button kind="quiet" disabled={answer.isPending} onClick={() => answer.mutate({ id: p.id, letIn: false })}>
                    Don’t let them in
                  </Button>
                  <Button kind="secondary" disabled={answer.isPending} onClick={() => answer.mutate({ id: p.id, letIn: true })}>
                    Let them in
                  </Button>
                </>
              )}
            />
          )}
        </ShowAFew>
      </EdgeList>
    </Section>
  )
}
