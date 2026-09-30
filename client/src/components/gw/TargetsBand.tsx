import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { boardApi } from '@/api/board'
import { firstNameOrLabel, atTheStart } from '@/lib/utils'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'

/**
 * TARGETS, AS THE PROTOTYPE'S CONTEXT PAGE DRAWS THEM (U.7, B2).
 *
 * One table: what the target is, the number, whose it is, and who sees it. The words are the
 * prototype's (docs/prototype/screens/B2-context/context.txt): "Targets", "Change who sees them",
 * "The whole team", "Seen by everyone", "Seen by Aisha and you", and "Each person sees their own
 * share and the team’s totals, never someone else’s share."
 *
 * WHO SEES WHAT IS DECIDED BY THE SERVER. The ground read sends each reader only the targets they
 * may read (targetsFor): the lead gets every one, a person gets the team's and their own share. This
 * only says, beside each row, who else reads it. It never hides a row the server sent.
 *
 * AND WHAT EACH TARGET ASSUMES, under it, in the words the prototype's board uses: "What the target
 * of 25 assumes", the lines, and "If one of these stops being true, the target needs a second look."
 * Only the lead writes them; the server refuses anyone else.
 */
export interface Target {
  id: string
  name: string
  target: number | null
  ownerParticipantId?: string | null
  assumes?: string[]
  notSettled?: string | null
}

/* A first name, or the plain words whole ("a colleague", "the lead"), never a lead's note (request 36). */
const first = (p: any) => firstNameOrLabel(p)

export function TargetsBand({
  groundId,
  targets,
  participants,
  viewerUserId,
  isTheLead,
  numbersShared,
  onChangeTarget,
}: {
  groundId: string
  targets: Target[]
  participants: any[]
  viewerUserId?: string | null
  /** The lead of this check-in: the one person who may write what a target assumes. */
  isTheLead: boolean
  /** The check-in's setting: everybody sees every number. Off by default. */
  numbersShared: boolean
  /** Hands the target to the context conversation, where it is changed by saying so. */
  onChangeTarget?: (t: Target) => void
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const saveAssumes = useMutation({
    mutationFn: ({ id, lines }: { id: string; lines: string[] }) => boardApi.updateObjective(groundId, id, { assumes: lines }),
    onSuccess: () => {
      setEditing(null)
      setDraft('')
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. What you wrote is still here, so try again.'),
  })

  const lead = participants.find((p: any) => p.partyType === 'INITIATOR')
  const leadFirst = lead ? first(lead) : null
  const personOf = (pid?: string | null) => (pid ? participants.find((p: any) => p.id === pid) : null)

  /** Who else reads this row, said from the reader's side. */
  const seenBy = (t: Target): string => {
    if (!t.ownerParticipantId || numbersShared) return 'Seen by everyone'
    const owner = personOf(t.ownerParticipantId)
    const ownerFirst = owner ? first(owner) : null
    const readerIsOwner = !!viewerUserId && owner?.userId === viewerUserId
    if (isTheLead) return ownerFirst ? `Seen by ${ownerFirst} and you` : 'Seen by you'
    if (readerIsOwner) return leadFirst ? `Seen by you and ${leadFirst}` : 'Seen by you'
    return ownerFirst && leadFirst ? `Seen by ${ownerFirst} and ${leadFirst}` : 'Seen by the lead'
  }
  const whose = (t: Target): string => {
    if (!t.ownerParticipantId) return 'The whole team'
    const owner = personOf(t.ownerParticipantId)
    return owner ? atTheStart(first(owner)) : 'Someone'
  }

  const theTeams = targets.filter((t) => !t.ownerParticipantId)
  const shares = targets.filter((t) => t.ownerParticipantId)

  const row = (t: Target) => {
    const assumes = (t.assumes ?? []).filter((a) => a && a.trim())
    const figure = t.target == null ? null : t.target.toLocaleString('en-GB')
    return (
      <div key={t.id} data-gw-target={t.id} className="gwui-inner-row gwui-pt-9 gwui-pr-13 gwui-pb-9 gwui-pl-13">
        <div className="gwui-gap-12" style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span className="gwui-fs-13 gwui-ink-dark" style={{ flex: '1 1 140px', fontWeight: 700 }}>{t.name}</span>
          <span className="gwui-fs-13 gwui-ink-text" style={{ flex: '0 0 110px', fontVariantNumeric: 'tabular-nums' }}>
            {figure ?? <span className="gwui-fs-13 gwui-ink-muted">No number set</span>}
          </span>
          <span className="gwui-fs-13 gwui-ink-sub" style={{ flex: '1 1 110px' }}>{whose(t)}</span>
          <span className="gwui-fs-13 gwui-ink-sub" style={{ flex: '1 1 130px', textAlign: 'right' }}>{seenBy(t)}</span>
          {onChangeTarget && (
            <button
              onClick={() => onChangeTarget(t)}
              className="gwui-fs-13 gwui-ink-sub gwui-p-0 gwui-rule-none"
              style={{ background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Change this
            </button>
          )}
        </div>
        {/* A number nobody has defined is not an agreed number, said beside the number. */}
        {t.notSettled && (
          <div className="gwui-fs-13 gwui-ink-amber gwui-mt-4" style={{ lineHeight: 1.5, maxWidth: '62ch' }}>{t.notSettled}</div>
        )}
        {assumes.length > 0 && editing !== t.id && (
          <WhatTheTargetAssumes figure={figure} name={t.name} assumes={assumes} />
        )}
        {isTheLead && editing !== t.id && (
          <button
            onClick={() => { setEditing(t.id); setDraft(assumes.join('\n')) }}
            className="gwui-fs-13 gwui-ink-navy gwui-mt-6 gwui-p-0 gwui-rule-none"
            style={{ fontWeight: 600, background: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
          >
            {assumes.length ? 'Change what it assumes' : 'Say what it assumes'}
          </button>
        )}
        {isTheLead && editing === t.id && (
          <div className="gwui-mt-8" style={{ maxWidth: 560 }}>
            <label className="gwui-fs-13 gwui-ink-dark gwui-mb-4" style={{ display: 'block', fontWeight: 700 }} htmlFor={`assumes-${t.id}`}>
              {figure ? `What the target of ${figure} assumes` : 'What this target assumes'}
            </label>
            <textarea
              id={`assumes-${t.id}`}
              className="gw-ta"
              autoFocus
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="One thing on each line."
            />
            <div className="gwui-gap-8 gwui-mt-8" style={{ display: 'flex' }}>
              <button
                onClick={() => saveAssumes.mutate({ id: t.id, lines: draft.split('\n').map((l) => l.trim()).filter(Boolean) })}
                disabled={saveAssumes.isPending}
                className="gwui-fs-13 gwui-ink-white gwui-pt-7 gwui-pr-13 gwui-pb-7 gwui-pl-13 gwui-rule-none"
                style={{ borderRadius: 7, background: 'var(--gw-navy)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {saveAssumes.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(null); setDraft('') }}
                className="gwui-rule gwui-fs-13 gwui-ink-sub gwui-pt-7 gwui-pr-12 gwui-pb-7 gwui-pl-12"
                style={{ borderRadius: 7, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <section aria-label="Targets" className="gwui-mb-14" style={{ maxWidth: 720 }}>
      {/* The band's heading, "Targets", is the page's own (Sec in ContextPage), so it is numbered
          with the others. The link sits at its right, as in the prototype. */}
      {isTheLead && (
        <div className="gwui-mb-8" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <a href={`/grounds/${groundId}?tab=settings`} className="gwui-fs-13 gwui-ink-navy" style={{ fontWeight: 600 }}>
            Change who sees them
          </a>
        </div>
      )}
      <div className="gwui-rule" style={{ background: 'white', borderRadius: 10, overflow: 'hidden' }}>
        {theTeams.map(row)}
        <ShowAFew rows={shares} few={8} what="shares of the target">
          {(t: Target) => row(t)}
        </ShowAFew>
      </div>
      {!numbersShared && (
        <div className="gwui-fs-13 gwui-ink-sub gwui-mt-8">
          Each person sees their own share and the team{'’'}s totals, never someone else{'’'}s share.
        </div>
      )}
    </section>
  )
}

/**
 * "What the target of 25 assumes", the lines, and "If one of these stops being true, the target
 * needs a second look." (board-as-lead.txt). The same block on Context and on the board.
 *
 * With no number it read "What Aisha and Baraka are to sell 25 water pumps this quarter. assumes",
 * the target's whole sentence dropped into a heading (U.7 review). It is "What this target assumes".
 * `name` is still taken, so the board's call does not change, and is not printed.
 */
export function WhatTheTargetAssumes({ figure, assumes }: { figure: string | null; name?: string; assumes: string[] }) {
  if (!assumes.length) return null
  return (
    <div className="gwui-mt-8 gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14" style={{ background: 'var(--gw-bg)', borderRadius: 8, maxWidth: 560 }}>
      {/* Picture-check round 6, item H: named directly as the prototype's own card-title example - 18px/700/near-black, not 12.5px. */}
      <div className="gwui-fs-18 gwui-ink-text gwui-mb-6" style={{ fontWeight: 700 }}>
        {figure ? `What the target of ${figure} assumes` : 'What this target assumes'}
      </div>
      <ul className="gwui-m-0 gwui-pl-18 gwui-fs-13 gwui-ink-text" style={{ lineHeight: 1.6 }}>
        {assumes.map((a, k) => <li key={k}>{a}</li>)}
      </ul>
      <div className="gwui-fs-13 gwui-ink-sub gwui-mt-6">
        If one of these stops being true, the target needs a second look.
      </div>
    </div>
  )
}
