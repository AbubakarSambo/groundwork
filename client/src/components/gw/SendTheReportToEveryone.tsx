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
  /**
   * ONCE EVERYBODY WHO ASKED FOR IT ALREADY HAS IT, THE BUTTON HAS NOTHING LEFT TO DO.
   *
   * "Send to 1" used to answer "Everybody who asked for it already has it." as a toast that faded,
   * leaving the same live "Send to 1" button behind it - press it again and it says the same thing
   * again. `reachable` only asks who is allowed to be sent the report, not who already has this
   * round's copy, so it stays the same count before and after a send that reached nobody. This
   * remembers that answer so the button gives way to the sentence instead of repeating itself.
   */
  const [everybodyAlreadyTold, setEverybodyAlreadyTold] = useState(false)
  const send = useMutation({
    mutationFn: () => reportsApi.sendToEveryone(groundId, how),
    onSuccess: (r) => {
      if (r.sent === 0 && r.alreadyTold > 0) {
        setEverybodyAlreadyTold(true)
        toast.success('Everybody who asked for it already has it.')
      } else {
        setEverybodyAlreadyTold(false)
        toast.success(`Sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}${r.alreadyTold ? `; ${r.alreadyTold} already had it` : ''}.`)
      }
      /*
       * FAULT 5 (LIVE RE-WALK): THE REPORT ROW SAID "NOT SHARED" UNTIL A RELOAD. A send that
       * reaches everybody marks the report released server-side, but this only ever invalidated
       * `['ground', groundId]` - the row that reads "Shared"/"Not shared yet" (YourWork.tsx's
       * "Your reports", off `ground.report.releasedAt`) refreshed, but the report itself
       * (`['report', groundId]`, GroundParticipantPage.tsx and TheSessionsReport.tsx) and each
       * session's own shaped report (`['session-shaped-report', groundId, sessionNumber]`,
       * TheSessionsReport.tsx) did not, so a reader already on one of those pages kept reading the
       * stale, unreleased copy. Invalidated here too - a prefix match on `['session-shaped-
       * report', groundId]` reaches every session number's own query without naming each one.
       */
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      qc.invalidateQueries({ queryKey: ['report', groundId] })
      qc.invalidateQueries({ queryKey: ['session-shaped-report', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not send. Try again.'),
  })
  if (!answered.size) return null
  /* Nobody else has answered, so there is nobody to send it to: said by nothing, never as "0 people have answered" beside the
     row's own "1 of 3 checked in" (first-experience round 3, Hafsah, 30 October 2026). */
  if (!reachable.length && !declined.length && !everybodyAlreadyTold) return null
  /* Nothing left for the button to do: either nobody here may be sent it, or the last press
     already reached everybody it could. Either way, say so instead of offering a press that can
     only repeat the same answer. */
  const nothingLeftToSend = reachable.length === 0 || everybodyAlreadyTold
  return (
    <section aria-label="Send the report to everyone" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 14, color: 'var(--gw-text)', margin: 0 }}>
          {/*
            ANSWERING IS NOT ASKING (real-user walk, Kijani Foods, fault 6). "2 people answered and
            asked for the report" was not true: everyone who answers is counted here, whether or not
            they asked for anything - `wantsTheReport !== false` is the default, not something a
            person had to request. Two full sentences in place of one joined with a semicolon.
          */}
          {reachable.length ? `${reachable.length === 1 ? 'One person who answered gets' : `${reachable.length} people who answered get`} a link to this session's report, once.` : ''}{declined.length ? ` ${declined.length} ${declined.length === 1 ? 'person' : 'people'} said no thanks.` : ''}
          {everybodyAlreadyTold && ' Everybody who asked for it already has it.'}
        </p>
        {!nothingLeftToSend && (
          <Button kind="secondary" size="small" onClick={() => send.mutate()} disabled={send.isPending}>
            {send.isPending ? 'Sending…' : `Send ${how === 'ANONYMOUS' ? 'anonymised ' : ''}to ${reachable.length}`}
          </Button>
        )}
      </div>
      {reachable.length > 0 && (
        <fieldset style={{ border: 0, padding: 0, margin: '12px 0 0' }}>
          <legend style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', padding: 0 }}>What they receive</legend>
          {([
            { v: 'NAMED' as const, title: 'Named', says: 'People see who said what, by name and organisation, the same way you do.' },
            { v: 'ANONYMOUS' as const, title: 'Anonymised', says: 'Names and organisations are taken out of their copy, including inside quotes. It cannot take out somebody describing themselves. Yours stays named.' },
          ]).map((o) => (
            <label key={o.v} htmlFor={`share-${o.v}`} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 8, cursor: 'pointer' }}>
              <input id={`share-${o.v}`} type="radio" name="how-it-is-shared" value={o.v} checked={how === o.v}
                onChange={() => setHow(o.v)} style={{ marginTop: 3 }} />
              <span>
                <span style={{ fontSize: 13, fontWeight: 700, display: 'block' }}>{o.title}</span>
                <span style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{o.says}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {reachable.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 12, color: 'var(--gw-navy)', cursor: 'pointer' }}>Who gets it</summary>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--gw-sub)' }}>
            {/* A name and an address joined by a dot read as two fragments stapled together
                (real-user walk, Kijani Foods, fault 6): "Esther Adeyemi (esther@kijani.test)". */}
            {reachable.map((p) => <li key={p.id}>{nameOf(p) ? `${nameOf(p)} (${p.email})` : p.email}</li>)}
          </ul>
        </details>
      )}
    </section>
  )
}
