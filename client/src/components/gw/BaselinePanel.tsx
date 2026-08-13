import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { Sec, Card } from '@/components/gw/kit'
import { toast } from 'sonner'

/**
 * THE TEAM'S STARTING POINT. `GroundBaseline`, which had no reader and no writer.
 *
 * Her call: "groundbaseline is good because it is the team starting point."
 *
 * TWO THINGS, AND THEY DO DIFFERENT JOBS.
 *
 * What doing well looks like is the yardstick. The report's weigh section already asks "what did you
 * say doing well means, and what does the record hold against it" and has been scraping the answer out
 * of the lead's check-in prose, because the field meant for it was never filled.
 *
 * What it rests on is the fairness half. Things that have to be true and are not in the person's
 * hands: a decision from somebody else, a tool, another team's work. Named at the start, a missed
 * outcome can be read against them. Unnamed, it reads as somebody underperforming, which is the exact
 * unfairness this product exists to prevent.
 *
 * STATING IT AGAIN IS A NEW VERSION, NOT AN EDIT, and the schema's own note is the argument: "half the
 * findings this product makes are the distance between what people believed at the start and what
 * turned out to be true. Corrected, a baseline becomes a second description of the present and the arc
 * disappears." So the form never pre-fills with the current text to be edited over - it asks for the
 * new statement, and the old one stays visible above it.
 *
 * EVERYBODY ON THE GROUND CAN READ IT. Only the lead can state it. The yardstick somebody is being
 * read against is the last thing that should be private from them, and if it moved mid-ground, the
 * move is the part they most need to see.
 */
export function BaselinePanel({ groundId, canState }: { groundId: string; canState: boolean }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [success, setSuccess] = useState('')
  const [conditions, setConditions] = useState('')
  const [reason, setReason] = useState('')

  const { data: history = [] } = useQuery({
    queryKey: ['baseline', groundId],
    queryFn: () => groundsApi.baselineHistory(groundId),
    enabled: !!groundId,
    retry: false,
  })

  const current = history.length ? history[history.length - 1] : null
  const earlier = history.slice(0, -1)

  const state = useMutation({
    mutationFn: () =>
      groundsApi.stateBaseline(groundId, {
        successLooksLike: success.trim() || undefined,
        /** One per line: a list somebody types is a list, not prose with commas in it. */
        conditions: conditions.split('\n').map(c => c.trim()).filter(Boolean),
        changeReason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(current ? 'Recorded as a new version. The earlier one stays on the record.' : 'Recorded.')
      setOpen(false); setSuccess(''); setConditions(''); setReason('')
      qc.invalidateQueries({ queryKey: ['baseline', groundId] })
      /** The context read on this page counts the conditions, so it has to be refetched too. */
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not record that. Try again.'),
  })

  return (
    <div>
      <Sec title="What doing well looks like" />
      <Card pad="block">
        {current ? (
          <>
            <div style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.65 }}>
              {current.successLooksLike || 'Not stated yet.'}
            </div>
            {current.conditions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>What that rests on</div>
                <ul style={{ margin: 0, paddingLeft: 17 }}>
                  {current.conditions.map((c, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, marginBottom: 2 }}>{c}</li>
                  ))}
                </ul>
                <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginTop: 6 }}>
                  Named now, the record can show which of these held. Unnamed, a missed outcome reads as
                  somebody underperforming.
                </div>
              </div>
            )}
            {/**
              * THE REASON BELONGS TO THE VERSION THAT CHANGED THINGS, which is this one.
              *
              * The first version of this panel only rendered `changeReason` in the earlier-versions
              * list - and version 1 never has one, because nothing changed. So the reason a yardstick
              * moved was stored, required, and shown nowhere. Found by rendering the panel on a ground
              * that had actually been restated, not by reading the code.
              */}
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 10, lineHeight: 1.55 }}>
              {current.version === 1
                ? `Stated at the start, ${new Date(current.effectiveFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`
                : `Version ${current.version}, from ${new Date(current.effectiveFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`}
              {current.changeReason && (
                <> Changed because: {current.changeReason}</>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            {/**
              * The reason to fill it in, in the lead's own terms. Not "this field is empty": what the
              * report will and will not be able to answer, which is the same framing
              * `what-this-ground-can-tell-you.ts` uses and the reason it works.
              */}
            Nothing stated yet. The report can show where accounts differ without it. It cannot say
            whether things went well, because nothing has said what well would look like.
          </div>
        )}
      </Card>

      {/* Earlier versions. The arc is the point: what was believed then, against what is held now. */}
      {earlier.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Sec title="What it said before" />
          <Card pad="block">
            {earlier.map(v => (
              <div key={v.version} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--gw-border)' }}>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>{v.successLooksLike}</div>
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 4 }}>
                  Version {v.version}, until it was restated
                  {v.changeReason ? `. Changed because: ${v.changeReason}` : '.'}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {canState && !open && (
        <button
          onClick={() => setOpen(true)}
          style={{ marginTop: 10, background: 'none', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {current ? 'This has changed →' : 'Say what doing well looks like →'}
        </button>
      )}

      {canState && open && (
        <div style={{ marginTop: 10 }}>
          <Card pad="block">
            {/**
              * NOT PRE-FILLED WITH THE CURRENT TEXT. An editable copy of what is there invites a
              * correction, and a corrected baseline stops being a record of what was believed at the
              * start. The old statement is above, to be read rather than overwritten.
              */}
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>What would doing well look like?</div>
            <textarea
              value={success}
              onChange={e => setSuccess(e.target.value)}
              rows={3}
              placeholder="In your own words. Not a target for one person - what would make you say, at the end, that this went the way it should have."
              style={{ width: '100%', padding: '9px 11px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.55 }}
            />
            <div style={{ fontSize: 12.5, fontWeight: 700, margin: '12px 0 4px' }}>What has to be true for it? One per line.</div>
            <textarea
              value={conditions}
              onChange={e => setConditions(e.target.value)}
              rows={3}
              placeholder={'Things that are not in their hands.\nA decision from somebody else, a tool, another team’s work.'}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.55 }}
            />
            {current && (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 700, margin: '12px 0 4px' }}>Why is this changing?</div>
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="The priorities moved, the role changed, we got it wrong the first time"
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginTop: 6 }}>
                  The version above stays on the record either way. A yardstick that moved with no account
                  of why reads worse than either version does on its own.
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => state.mutate()}
                disabled={state.isPending || (!success.trim() && !conditions.trim())}
                style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: state.isPending ? 0.6 : 1 }}
              >
                {state.isPending ? 'Recording…' : current ? 'Record as a new version' : 'Record it'}
              </button>
              <button
                onClick={() => setOpen(false)}
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
