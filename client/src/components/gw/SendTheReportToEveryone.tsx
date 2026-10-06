import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { toast } from 'sonner'
import { useState } from 'react'
import type { GroundParticipant } from '@/types'
import { Button } from '@/components/gw/ui/Button'

/**
 * THE PLACE TO SEND THE REPORT TO EVERYONE, AT THE END.
 *
 * Hafsah, 22 September 2026: "I need a place to release the report to everyone at the end." With an
 * open link the round releases at the first answers that make one, and everybody who answers after
 * that has to be told by somebody. This is that somebody: the lead, one press. It lists who it will
 * reach - the people who answered and asked for the report, by the name and address they gave - and
 * who asked not to be sent it. Pressing it again reaches anyone who has answered since; nobody is
 * sent the same round twice (report_notices).
 *
 * AND WHETHER THE COPY THEY GET IS NAMED, WHICH THE ORGANISER NOW DECIDES HERE.
 *
 * Hafsah, 23 September 2026: "Groundwork does not automatically decide to anonymise. You decide."
 * It was not a decision anybody could make - whether a respondent saw another respondent's name
 * came from a check-in-wide setting made at set-up, and this button sent whatever that said. The
 * choice belongs at the moment of sending, because that is the moment somebody knows who is about
 * to read it. Named is preselected: it is what this did before the choice existed, and quietly
 * switching a hundred people to anonymised would be the product deciding by another route.
 *
 * GROUP 3 REVIEW, BATCH B: this used to be a boxed, bordered card of its own, with a navy button,
 * sitting ABOVE "Every session" - the prototype's own sessions.jpg has no such card at all, and
 * two navy buttons on one screen (this one beside the header's own navy "Your check-in") is more
 * than the one navy button a screen gets. It is placed AFTER `TheReportIsAListOfSessions` now
 * (GroundAdminPage.tsx), drawn as a short line rather than a card, and its button is `Button
 * kind="secondary"` - white, the prototype's own outlined button - not navy. Every action it
 * offered keeps working: sending, choosing named or anonymised, and reading who gets it.
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
  const [how, setHow] = useState<'NAMED' | 'ANONYMOUS'>('NAMED')
  const send = useMutation({
    mutationFn: () => reportsApi.sendToEveryone(groundId, how),
    onSuccess: (r) => {
      toast.success(r.sent === 0 && r.alreadyTold > 0 ? 'Everybody who asked for it already has it.' : `Sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}${r.alreadyTold ? `; ${r.alreadyTold} already had it` : ''}.`)
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not send. Try again.'),
  })
  if (!answered.size) return null
  return (
    <section aria-label="Send the report to everyone" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13.5, color: 'var(--gw-text)', margin: 0 }}>
          {reachable.length} {reachable.length === 1 ? 'person' : 'people'} answered and asked for the report{declined.length ? `; ${declined.length} said no thanks` : ''}. Each gets a link to this session's report, once.
        </p>
        <Button kind="secondary" size="small" onClick={() => send.mutate()} disabled={send.isPending || reachable.length === 0}>
          {send.isPending ? 'Sending…' : `Send ${how === 'ANONYMOUS' ? 'anonymised ' : ''}to ${reachable.length}`}
        </Button>
      </div>
      {reachable.length > 0 && (
        <fieldset style={{ border: 0, padding: 0, margin: '12px 0 0' }}>
          <legend style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-navy)', padding: 0 }}>What they receive</legend>
          {([
            { v: 'NAMED' as const, title: 'Named', says: 'People see who said what, by name and organisation, the same way you do.' },
            { v: 'ANONYMOUS' as const, title: 'Anonymised', says: 'Names and organisations are taken out of their copy, including inside quotes. It cannot take out somebody describing themselves. Yours stays named.' },
          ]).map((o) => (
            <label key={o.v} htmlFor={`share-${o.v}`} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 8, cursor: 'pointer' }}>
              <input id={`share-${o.v}`} type="radio" name="how-it-is-shared" value={o.v} checked={how === o.v}
                onChange={() => setHow(o.v)} style={{ marginTop: 3 }} />
              <span>
                <span style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>{o.title}</span>
                <span style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{o.says}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
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
