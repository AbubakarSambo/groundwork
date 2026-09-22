import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { toast } from 'sonner'
import type { GroundParticipant } from '@/types'

/**
 * THE PLACE TO SEND THE REPORT TO EVERYONE, AT THE END.
 *
 * Hafsah, 22 September 2026: "I need a place to release the report to everyone at the end." With an
 * open link the round releases at the first answers that make one, and everybody who answers after
 * that has to be told by somebody. This is that somebody: the lead, one press. It lists who it will
 * reach - the people who answered and asked for the report, by the name and address they gave - and
 * who asked not to be sent it. Pressing it again reaches anyone who has answered since; nobody is
 * sent the same round twice (report_notices).
 */
export function SendTheReportToEveryone({ groundId, participants, answered }: {
  groundId: string
  participants: GroundParticipant[]
  /** Participant ids with a completed check-in this round. */
  answered: Set<string>
}) {
  const qc = useQueryClient()
  const nameOf = (p: GroundParticipant) => [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || p.nameGiven?.trim() || null
  const reachable = participants.filter((p) => answered.has(p.id) && p.partyType !== 'INITIATOR' && p.wantsTheReport !== false && !!p.email && !p.email.endsWith('@unclaimed.invalid'))
  const declined = participants.filter((p) => answered.has(p.id) && p.wantsTheReport === false)
  const send = useMutation({
    mutationFn: () => reportsApi.sendToEveryone(groundId),
    onSuccess: (r) => {
      toast.success(r.sent === 0 && r.alreadyTold > 0 ? 'Everybody who asked for it already has it.' : `Sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}${r.alreadyTold ? `; ${r.alreadyTold} already had it` : ''}.`)
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not send. Try again.'),
  })
  if (!answered.size) return null
  return (
    <section aria-label="Send the report to everyone" style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Send the report to everyone who asked for it</div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2 }}>
            {reachable.length} {reachable.length === 1 ? 'person' : 'people'} answered and asked for it{declined.length ? `; ${declined.length} said no thanks` : ''}. Each gets a link to this session's report, once.
          </div>
        </div>
        <button
          onClick={() => send.mutate()}
          disabled={send.isPending || reachable.length === 0}
          style={{ padding: '9px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: send.isPending || reachable.length === 0 ? .5 : 1 }}
        >
          {send.isPending ? 'Sending…' : `Send to ${reachable.length}`}
        </button>
      </div>
      {reachable.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 12.5, color: 'var(--gw-navy)', cursor: 'pointer' }}>Who gets it</summary>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--gw-sub)' }}>
            {reachable.map((p) => <li key={p.id}>{nameOf(p) ? `${nameOf(p)} · ` : ''}{p.email}</li>)}
          </ul>
        </details>
      )}
    </section>
  )
}
