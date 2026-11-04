import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { boardApi } from '@/api/board'
import { firstNameOrLabel, atTheStart } from '@/lib/utils'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import { Panel, RowList, Row, Tag, FieldLabel, TextArea, Note } from '@/components/gw/ui'

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
  /** Served to whoever runs the check-in only: the lead has not told the people about this one yet, so they do not read it. */
  notToldYet?: boolean
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
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That didn’t save. Try again.'),
  })

  const lead = participants.find((p: any) => p.partyType === 'INITIATOR')
  const leadFirst = lead ? first(lead) : null
  const personOf = (pid?: string | null) => (pid ? participants.find((p: any) => p.id === pid) : null)

  /**
   * WHO ELSE READS THIS ROW, SAID FROM THE READER'S SIDE.
   *
   * GROUP 3'S REVIEW, THE SCREEN'S OWN SENTENCES 8: ON HER OWN SHARE, THE LEAD READ HER OWN NAME
   * BACK AT HER, TWICE. This checked `isTheLead` before `readerIsOwner`, so on the lead's own
   * share - where she is both the lead and the owner - `ownerFirst` was her own first name and the
   * row read "Rukia / Seen by Rukia and you": the same one person, named once and then called
   * "you", as if two different people saw it. `readerIsOwner` is checked first now, same as it is
   * for anybody else's share, so a share that is hers and nobody else's reads "Seen by you" - true
   * of who actually sees it, since the lead reading her own share is one person, not two.
   */
  const seenBy = (t: Target): string => {
    /* Kept from the people until the lead tells them: never "Seen by everyone" (the server says which). */
    if (t.notToldYet) return 'Only the lead and the admins see this until the lead tells the team'
    if (!t.ownerParticipantId || numbersShared) return 'Seen by everyone'
    const owner = personOf(t.ownerParticipantId)
    const ownerFirst = owner ? first(owner) : null
    const readerIsOwner = !!viewerUserId && owner?.userId === viewerUserId
    if (readerIsOwner) return !isTheLead && leadFirst ? `Seen by you and ${leadFirst}` : 'Seen by you'
    if (isTheLead) return ownerFirst ? `Seen by ${ownerFirst} and you` : 'Seen by you'
    /* When the share's owner is the lead, the two names are the same person: say it once
       ("Seen by Rukia"), not "Seen by Rukia and Rukia" (walkthrough pass 2, item 1). */
    if (owner && lead && owner.id === lead.id) return ownerFirst ? `Seen by ${ownerFirst}` : 'Seen by the lead'
    return ownerFirst && leadFirst ? `Seen by ${ownerFirst} and ${leadFirst}` : 'Seen by the lead'
  }
  const whose = (t: Target): string => {
    if (!t.ownerParticipantId) return 'The whole team'
    const owner = personOf(t.ownerParticipantId)
    /* The reader's own share reads "You", the same rule YourWork already uses for the reader's own
       row (see the matching fix in YourWork.tsx) - never their own name read back at them. */
    if (!!viewerUserId && owner?.userId === viewerUserId) return 'You'
    return owner ? atTheStart(first(owner)) : 'Someone'
  }

  const theTeams = targets.filter((t) => !t.ownerParticipantId)
  const shares = targets.filter((t) => t.ownerParticipantId)

  const row = (t: Target) => {
    const assumes = (t.assumes ?? []).filter((a) => a && a.trim())
    const figure = t.target == null ? null : t.target.toLocaleString('en-GB')
    return (
      <Row key={t.id} columns="1fr" inset="panel">
        <div data-gw-target={t.id} className="gwui-pt-9 gwui-pb-9">
          <div className="gwui-gap-12" style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span className="gwui-fs-13 gwui-ink-dark" style={{ flex: '1 1 140px', fontWeight: 700 }}>{t.name}</span>
            <span className="gwui-fs-13 gwui-ink-text" style={{ flex: '0 0 110px', fontVariantNumeric: 'tabular-nums' }}>
              {figure ?? <span className="gwui-fs-13 gwui-ink-muted">No number set</span>}
            </span>
            <span style={{ flex: '1 1 110px' }}><Tag tone="plain">{whose(t)}</Tag></span>
            <span className="gwui-fs-13 gwui-ink-sub" style={{ flex: '1 1 130px', textAlign: 'right' }}>{seenBy(t)}</span>
            {onChangeTarget && (
              <button
                onClick={() => onChangeTarget(t)}
                className="gwui-fs-13 gwui-ink-sub gwui-p-0 gwui-rule-none gwui-tap-44"
                style={{ background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Change this
              </button>
            )}
          </div>
          {/* A number nobody has defined is not an agreed number, said beside the number. */}
          {t.notSettled && (
            <div className="gwui-fs-13 gwui-ink-amber gwui-mt-4" style={{ lineHeight: '20px', maxWidth: '62ch' }}>{t.notSettled}</div>
          )}
          {assumes.length > 0 && editing !== t.id && (
            <WhatTheTargetAssumes figure={figure} name={t.name} assumes={assumes} />
          )}
          {isTheLead && editing !== t.id && (
            <button
              onClick={() => { setEditing(t.id); setDraft(assumes.join('\n')) }}
              className="gwui-plain-link gwui-mt-6"
            >
              {assumes.length ? 'Change what it assumes' : 'Say what it assumes'}
            </button>
          )}
          {isTheLead && editing === t.id && (
            <div className="gwui-mt-8" style={{ maxWidth: 560 }}>
              <FieldLabel htmlFor={`assumes-${t.id}`}>
                {figure ? `What the target of ${figure} assumes` : 'What this target assumes'}
              </FieldLabel>
              <TextArea
                id={`assumes-${t.id}`}
                autoFocus
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="One thing on each line."
              />
              <div className="gwui-gap-8 gwui-mt-8" style={{ display: 'flex' }}>
                <button className="btn pri sm"
                  onClick={() => saveAssumes.mutate({ id: t.id, lines: draft.split('\n').map((l) => l.trim()).filter(Boolean) })}
                  disabled={saveAssumes.isPending}
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
      </Row>
    )
  }

  return (
    <section aria-label="Targets" className="gwui-mb-14" style={{ maxWidth: 720 }}>
      {/* The band's heading, "Targets", is the page's own (Sec in ContextPage), so it is numbered
          with the others. The link sits at its right, as in the prototype. */}
      {isTheLead && (
        <div className="gwui-mb-8" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <a href={`/grounds/${groundId}?tab=settings`} className="gwui-fs-13 gwui-ink-navy" style={{ fontWeight: 700 }}>
            Change who sees them
          </a>
        </div>
      )}
      <Panel pad={false}>
        <RowList label="Targets">
          {theTeams.map(row)}
          <ShowAFew rows={shares} few={8} what="shares of the target">
            {(t: Target) => row(t)}
          </ShowAFew>
        </RowList>
      </Panel>
      {!numbersShared && (
        <div className="gwui-mt-8">
          <Note>Each person sees their own share and the team{'’'}s totals, never someone else{'’'}s share.</Note>
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
export function WhatTheTargetAssumes({ figure, assumes, assumesSays }: {
  figure: string | null
  name?: string
  assumes: string[]
  /**
   * REQUEST 115 (c): where nothing is written down yet, the engine's own plain sentence rather
   * than an empty section - to the lead, an invitation to write it; to anybody else who may read
   * the target, that nobody has yet. Shown only when `assumes` is empty.
   */
  assumesSays?: string | null
}) {
  if (!assumes.length && !assumesSays) return null
  return (
    <div className="gwui-mt-8 gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14" style={{ background: 'var(--gw-bg)', borderRadius: 8, maxWidth: 560 }}>
      {/* Picture-check round 6, item H: named directly as the prototype's own card-title example - 18px/700/near-black, not 12.5px. */}
      <div className="gwui-fs-18 gwui-ink-text gwui-mb-6 gwui-assumes-title" style={{ fontWeight: 700 }}>
        {figure ? `What the target of ${figure} assumes` : 'What this target assumes'}
      </div>
      {assumes.length ? (
        <>
          <ul className="gwui-m-0 gwui-pl-18 gwui-fs-13 gwui-ink-text" style={{ lineHeight: '21px' }}>
            {assumes.map((a, k) => <li key={k}>{a}</li>)}
          </ul>
          <div className="gwui-mt-6">
            <Note>If one of these stops being true, the target needs a second look.</Note>
          </div>
        </>
      ) : (
        <Note tone="muted">{assumesSays}</Note>
      )}
    </div>
  )
}
