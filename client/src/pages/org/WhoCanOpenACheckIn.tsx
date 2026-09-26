import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'
import { A_FAILURE } from './people-here'

/**
 * "WHO CAN OPEN A CHECK-IN" (A4 people.txt), moved here from Settings: the prototype keeps it on the
 * People page, where the people it is about are listed, and keeps Settings for each person's own.
 *
 * Two settings, separate on purpose, both written through the one endpoint the create path's rule
 * reads (grounds/who-may-open-a-check-in.ts), so what this says and what happens cannot come apart.
 * Before the server answers it shows the stricter of each, never the permissive one: a switch that
 * reads "off" while the server says "on" is worse than a moment's wait.
 */
type WhoMayOpen = 'NAMED_LEADS' | 'EVERYONE'
interface HowCheckInsWork { whoMayOpen: WhoMayOpen; needsApproval: boolean }
export const THE_STRICTER_OF_EACH: HowCheckInsWork = { whoMayOpen: 'NAMED_LEADS', needsApproval: true }

export function WhoCanOpenACheckIn({ orgName }: { orgName: string }) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['how-check-ins-work'],
    queryFn: () => apiClient.get('/users/organization/check-ins').then((r: any) => (r.data.data ?? r.data) as HowCheckInsWork),
  })
  const set = useMutation({
    mutationFn: (change: Partial<HowCheckInsWork>) => apiClient.patch('/users/organization/check-ins', change),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['how-check-ins-work'] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? A_FAILURE),
  })
  const how = q.data ?? THE_STRICTER_OF_EACH

  const OPTIONS: [WhoMayOpen, string, string][] = [
    ['NAMED_LEADS', 'Only the people you name', 'You choose who on this page. Everybody else takes part.'],
    ['EVERYONE', 'Anybody signed in here', `Anyone at ${orgName} can start a check-in.`],
  ]

  return (
    <section className="gw-people-sec" aria-labelledby="who-opens-h">
      <h2 id="who-opens-h">Who can open a check-in</h2>
      <dl className="gw-people-facts">
        <div>
          <dt>Opening check-ins</dt>
          <dd>{how.whoMayOpen === 'EVERYONE'
            ? `Anyone at ${orgName} can start a check-in.`
            : 'Only the people you choose. Everyone else takes part in the ones they’re invited to.'}</dd>
        </div>
        <div>
          <dt>New check-ins</dt>
          <dd>{how.needsApproval
            ? 'Each new check-in waits for an admin before invitations go out.'
            : 'Start straight away. Turn this on to review each one before invitations go out.'}</dd>
        </div>
      </dl>
      <div role="radiogroup" aria-label="Who can open a check-in" className="gw-people-choices">
        {OPTIONS.map(([value, title, body]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={how.whoMayOpen === value}
            className={how.whoMayOpen === value ? 'on' : ''}
            disabled={set.isPending}
            onClick={() => how.whoMayOpen !== value && set.mutate({ whoMayOpen: value })}
          >
            <b>{title}</b>
            <span>{body}</span>
          </button>
        ))}
      </div>
      <div className="gw-who-can-join-row" style={{ marginTop: 16 }}>
        <div>
          <b id="wait-for-an-admin-label">Check-ins wait for an admin</b>
          <p>Each new check-in waits for an admin before invitations go out.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={how.needsApproval}
          aria-labelledby="wait-for-an-admin-label"
          className={`gw-switch${how.needsApproval ? ' on' : ''}`}
          disabled={set.isPending}
          onClick={() => set.mutate({ needsApproval: !how.needsApproval })}
        >
          <span aria-hidden />
        </button>
      </div>
    </section>
  )
}
