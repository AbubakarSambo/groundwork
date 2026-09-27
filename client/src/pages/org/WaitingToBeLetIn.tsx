import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { apiClient } from '@/api/client'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import { A_FAILURE } from './people-here'

/**
 * "WAITING TO BE LET IN" (A4 people.txt), at the top of the People page, only when somebody is.
 *
 * Somebody from outside, invited to a check-in, holds no seat and cannot check in until an admin
 * answers. The prototype's words, with "them" for "him": nothing here knows anyone's pronoun.
 */
interface Waiting { id: string; email: string; name: string | null; addedBy: string | null; forCheckIn: string | null; waitingSince?: string }

function whenAsked(at: string | undefined, now = new Date()): string {
  if (!at) return ''
  const d = new Date(at)
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((day(now) - day(d)) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `on ${whenItWas(d, 'dayAndMonthLong')}`
}

/** "Wairimu invited them to Sales team, Q3, yesterday. They take a seat; you have 73 free." */
export function whoAskedForThem(p: Waiting, seatsFree: number | null, now = new Date()): string {
  const by = p.addedBy ? p.addedBy.split(' ')[0] : 'Someone who is no longer here'
  const to = p.forCheckIn ? ` to ${p.forCheckIn}` : ''
  const when = whenAsked(p.waitingSince, now)
  const seat = seatsFree === null ? 'They take a seat.' : `They take a seat; you have ${seatsFree} free.`
  return `${by} invited them${to}${when ? `, ${when}` : ''}. ${seat}`
}

export function WaitingToBeLetIn({ orgName }: { orgName: string }) {
  const qc = useQueryClient()
  const waiting = useQuery({ queryKey: ['who-is-waiting'], queryFn: authApi.whoIsWaiting })
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

  return (
    <section className="gw-people-sec" aria-labelledby="waiting-h">
      <div className="gw-people-sec-head">
        <h2 id="waiting-h">Waiting to be let in</h2>
        <span>{`People from outside ${orgName}, invited to a check-in`}</span>
      </div>
      <ShowAFew rows={rows} few={5} what="waiting to be let in">
        {(p: Waiting) => (
          <div key={p.id} className="gw-waiting-row">
            <div className="gw-waiting-who">
              <b>{p.name ? `${p.name}, ${p.email}` : p.email}</b>
              <p>{whoAskedForThem(p, seatsFree)}</p>
            </div>
            <button type="button" className="gw-link-btn" disabled={answer.isPending} onClick={() => answer.mutate({ id: p.id, letIn: false })}>
              Don’t let them in
            </button>
            <button type="button" className="gw-btn" style={{ margin: 0 }} disabled={answer.isPending} onClick={() => answer.mutate({ id: p.id, letIn: true })}>
              Let them in
            </button>
          </div>
        )}
      </ShowAFew>
      <p className="gw-people-note">Letting someone in tells them straight away, and tells whoever invited them.</p>
    </section>
  )
}
