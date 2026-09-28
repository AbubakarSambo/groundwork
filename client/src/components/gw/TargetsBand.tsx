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

  const row = (t: Target, i: number) => {
    const assumes = (t.assumes ?? []).filter((a) => a && a.trim())
    const figure = t.target == null ? null : t.target.toLocaleString('en-GB')
    return (
      <div key={t.id} data-gw-target={t.id} style={{ padding: '9px 13px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-line)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 140px', fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)' }}>{t.name}</span>
          <span style={{ flex: '0 0 110px', fontSize: 13, color: 'var(--gw-text)', fontVariantNumeric: 'tabular-nums' }}>
            {figure ?? <span style={{ color: 'var(--gw-muted)', fontSize: 12 }}>No number set</span>}
          </span>
          <span style={{ flex: '1 1 110px', fontSize: 12, color: 'var(--gw-sub)' }}>{whose(t)}</span>
          <span style={{ flex: '1 1 130px', fontSize: 12, color: 'var(--gw-sub)', textAlign: 'right' }}>{seenBy(t)}</span>
          {onChangeTarget && (
            <button
              onClick={() => onChangeTarget(t)}
              style={{ fontSize: 11.5, color: 'var(--gw-sub)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Change this
            </button>
          )}
        </div>
        {/* A number nobody has defined is not an agreed number, said beside the number. */}
        {t.notSettled && (
          <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', marginTop: 4, lineHeight: 1.5, maxWidth: '62ch' }}>{t.notSettled}</div>
        )}
        {assumes.length > 0 && editing !== t.id && (
          <WhatTheTargetAssumes figure={figure} name={t.name} assumes={assumes} />
        )}
        {isTheLead && editing !== t.id && (
          <button
            onClick={() => { setEditing(t.id); setDraft(assumes.join('\n')) }}
            style={{ marginTop: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
          >
            {assumes.length ? 'Change what it assumes' : 'Say what it assumes'}
          </button>
        )}
        {isTheLead && editing === t.id && (
          <div style={{ marginTop: 8, maxWidth: 560 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 4 }} htmlFor={`assumes-${t.id}`}>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => saveAssumes.mutate({ id: t.id, lines: draft.split('\n').map((l) => l.trim()).filter(Boolean) })}
                disabled={saveAssumes.isPending}
                style={{ padding: '7px 13px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {saveAssumes.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(null); setDraft('') }}
                style={{ padding: '7px 12px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', fontSize: 12.5, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
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
    <section aria-label="Targets" style={{ marginBottom: 14, maxWidth: 720 }}>
      {/* The band's heading, "Targets", is the page's own (Sec in ContextPage), so it is numbered
          with the others. The link sits at its right, as in the prototype. */}
      {isTheLead && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-4px 2px 8px' }}>
          <a href={`/grounds/${groundId}?tab=settings`} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gw-navy)' }}>
            Change who sees them
          </a>
        </div>
      )}
      <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden' }}>
        {theTeams.map(row)}
        <ShowAFew rows={shares} few={8} what="shares of the target">
          {(t: Target, i: number) => row(t, i + theTeams.length)}
        </ShowAFew>
      </div>
      {!numbersShared && (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 8 }}>
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
    <div style={{ marginTop: 8, background: 'var(--gw-bg)', borderRadius: 8, padding: '12px 14px', maxWidth: 560 }}>
      {/* Picture-check round 6, item H: named directly as the prototype's own card-title example - 18px/700/near-black, not 12.5px. */}
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>
        {figure ? `What the target of ${figure} assumes` : 'What this target assumes'}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.6 }}>
        {assumes.map((a, k) => <li key={k}>{a}</li>)}
      </ul>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 6 }}>
        If one of these stops being true, the target needs a second look.
      </div>
    </div>
  )
}
