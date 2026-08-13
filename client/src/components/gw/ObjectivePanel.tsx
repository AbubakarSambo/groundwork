import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { Sec, Card, Pill } from '@/components/gw/kit'
import { toast } from 'sonner'

export interface ObjectiveShape {
  text: string | null
  authoredBy: 'lead' | 'self' | null
  seenBySubject: boolean
  state: 'none' | 'proposed' | 'accepted' | 'their own'
  described: string
  mayBeReadAgainst: boolean
}

/**
 * WHAT EACH PERSON IS WORKING TOWARDS, WITH WHO SAID IT ATTACHED.
 *
 * `an-objective-belongs-to-a-person.ts` was written with its own spec file and nothing ever created a row
 * for it to read. This is the surface that makes its rule real:
 *
 *   "May this objective be used as the thing somebody is read against? Not while it is a proposal.
 *    Reading a person against a target they have never seen is the definition of an unfair review, and
 *    the fact that the product would be doing it silently makes it worse rather than better."
 *
 * THE STATE IS NEVER SEPARATED FROM THE TEXT. Every place this shows an objective it shows whose words
 * they are and whether the person has seen them, because "your objective is X" and "your manager has
 * suggested X and you have not replied" are different statements and the difference is the entire point.
 *
 * ACCEPTING IS A DELIBERATE ACT, not a side effect of opening the page. "They were shown it" and "they
 * accepted it" are different claims and only one of them is fair to act on.
 */
export function ObjectivePanel({ groundId, objective, participantId, canPropose, isMine, personLabel }: {
  groundId: string
  objective: ObjectiveShape | null | undefined
  /** Needed only when a lead is proposing for somebody. */
  participantId?: string
  canPropose: boolean
  isMine: boolean
  personLabel?: string
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['ground', groundId] })

  const propose = useMutation({
    mutationFn: () => groundsApi.proposeObjective(groundId, participantId!, text.trim()),
    onSuccess: () => { toast.success('Proposed. They will see it and can accept it or write their own.'); setEditing(false); setText(''); refresh() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not save that. Try again.'),
  })

  const stateMine = useMutation({
    mutationFn: () => groundsApi.stateMyObjective(groundId, text.trim()),
    onSuccess: () => { toast.success('Recorded, in your words.'); setEditing(false); setText(''); refresh() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not save that. Try again.'),
  })

  const accept = useMutation({
    mutationFn: () => groundsApi.acceptMyObjective(groundId),
    onSuccess: () => { toast.success('Accepted as it stands.'); refresh() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not accept that. Try again.'),
  })

  const state = objective?.state ?? 'none'
  /** The one thing that decides whether this may be used in a read. Shown, not implied. */
  const tone = state === 'their own' ? 'good' : state === 'accepted' ? 'good' : state === 'proposed' ? 'warn' : 'flat'
  const stateWord =
    state === 'their own' ? 'In their own words' :
    state === 'accepted' ? 'Accepted as proposed' :
    state === 'proposed' ? 'Not seen yet' : 'Not set'

  return (
    <div>
      <Sec title={isMine ? 'What you are working towards' : `What ${personLabel ?? 'they are'} working towards`} />
      <Card pad="block">
        {objective?.text ? (
          <>
            <div style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.65 }}>{objective.text}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Pill tone={tone as any}>{isMine && state === 'their own' ? 'In your own words' : stateWord}</Pill>
              {!objective.mayBeReadAgainst && (
                /**
                 * THE SENTENCE THAT MATTERS MOST HERE. A proposal is not a target anybody may be
                 * measured against, and saying so where the proposal is shown is what stops it being
                 * used that way by accident.
                 */
                <span style={{ fontSize: 11.5, color: 'var(--gw-amber-t)', lineHeight: 1.5 }}>
                  Nothing is read against this until {isMine ? 'you accept it or write your own' : 'they accept it or write their own'}.
                </span>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            {/* The board's own position on an undefined remit, said about objectives. */}
            Nobody has said what success looks like for {isMine ? 'you' : 'this person'} yet. Where nothing
            has been said, the report says nothing rather than guessing.
          </div>
        )}
      </Card>

      {/* Mine, and somebody proposed it: accept as it stands, or write my own instead. */}
      {isMine && state === 'proposed' && !editing && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => accept.mutate()}
            disabled={accept.isPending}
            style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {accept.isPending ? 'Saving…' : 'That is right, accept it'}
          </button>
          <button
            onClick={() => { setText(objective?.text ?? ''); setEditing(true) }}
            style={{ padding: '9px 16px', borderRadius: 7, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Say it in my words instead
          </button>
        </div>
      )}

      {isMine && state !== 'proposed' && !editing && (
        <button
          onClick={() => { setText(objective?.text ?? ''); setEditing(true) }}
          style={{ marginTop: 10, padding: '9px 14px', borderRadius: 8, background: 'none', border: '1px solid var(--gw-border)', fontSize: 12.5, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {objective?.text ? 'Change what I am working towards →' : 'Say what I am working towards →'}
        </button>
      )}

      {canPropose && !isMine && !editing && (
        <button
          onClick={() => { setText(objective?.text ?? ''); setEditing(true) }}
          style={{ marginTop: 10, padding: '9px 14px', borderRadius: 8, background: 'none', border: '1px solid var(--gw-border)', fontSize: 12.5, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {objective?.text ? 'Propose a different one →' : 'Propose what they are working towards →'}
        </button>
      )}

      {editing && (
        <div style={{ marginTop: 10 }}>
          <Card pad="block">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              placeholder={isMine ? 'What are you actually trying to achieve here?' : 'What is this person trying to achieve? They will see it and can accept it or write their own.'}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.55 }}
            />
            {!isMine && (
              <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginTop: 6 }}>
                A proposal, not a decision. Nothing is read against it until they have seen it and said so.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => (isMine ? stateMine.mutate() : propose.mutate())}
                disabled={!text.trim() || propose.isPending || stateMine.isPending}
                style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {propose.isPending || stateMine.isPending ? 'Saving…' : isMine ? 'Record it' : 'Propose it'}
              </button>
              <button
                onClick={() => { setEditing(false); setText('') }}
                style={{ padding: '9px 16px', borderRadius: 7, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
