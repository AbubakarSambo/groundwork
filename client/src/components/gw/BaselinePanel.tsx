import type React from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { Section, Panel, FoldedLine } from '@/components/gw/ui'
import { toast } from 'sonner'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { withSentenceCase } from '@/lib/an-aim-reads-as-a-sentence'

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
export function BaselinePanel({ groundId, canState, groundStartedAt, asFold }: {
  /** One folded line under About this work, as the kit draws the page; its own section elsewhere. */
  asFold?: boolean; groundId: string; canState: boolean; groundStartedAt?: string | null }) {
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
    <Outer asFold={asFold} fact={current?.successLooksLike ? withSentenceCase(current.successLooksLike) : 'Not stated yet.'}>
      <Inner asFold={asFold}>
        {current ? (
          <>
            {/* Folded, the line itself is the fold's own fact, so it is not said twice. */}
            {!asFold && (
            <div style={{ fontSize: 14, color: 'var(--gw-text)', lineHeight: '23px' }}>
              {current.successLooksLike ? withSentenceCase(current.successLooksLike) : 'Not stated yet.'}
            </div>
            )}
            {current.conditions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>What that rests on</div>
                <ul style={{ margin: 0, paddingLeft: 17 }}>
                  {current.conditions.map((c, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: '21px', marginBottom: 2 }}>{c}</li>
                  ))}
                </ul>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: '19px', marginTop: 6 }}>
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
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 10, lineHeight: '17px' }}>
              {/**
                * B-141: version 1 is never a restatement, so its date is the check-in's own start
                * date, not whenever the version-1 row happened to be written on the record
                * (`effectiveFrom` can trail the real start - see when-the-clock-starts.ts for how the
                * server itself picks a start date). A later version really did change something on
                * that date, so it keeps `effectiveFrom`.
                */}
              {current.version === 1
                ? `Stated at the start, ${whenItWas(groundStartedAt || current.effectiveFrom, 'dayAndMonthLong')}.`
                : `Version ${current.version}, from ${whenItWas(current.effectiveFrom, 'dayAndMonthLong')}.`}
              {current.changeReason && (
                <> Changed because: {current.changeReason}</>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px' }}>
            {/**
              * The reason to fill it in, in the lead's own terms. Not "this field is empty": what the
              * report will and will not be able to answer, which is the same framing
              * `what-this-ground-can-tell-you.ts` uses and the reason it works.
              */}
            Nothing stated yet. The report can show where people's answers differ without it. It cannot say
            whether things went well, because nothing has said what well would look like.
          </div>
        )}
      </Inner>

      {/* Earlier versions. The arc is the point: what was believed then, against what is held now. */}
      {earlier.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Section heading="What it said before">
          <Panel>
            {earlier.map(v => (
              <div key={v.version} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--gw-border)' }}>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px' }}>{withSentenceCase(v.successLooksLike)}</div>
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 4 }}>
                  Version {v.version}, until it was restated
                  {v.changeReason ? `. Changed because: ${v.changeReason}` : '.'}
                </div>
              </div>
            ))}
          </Panel>
          </Section>
        </div>
      )}

      {canState && !open && (
        <button type="button" className={asFold ? 'gw-link t-small' : 'btn sec sm'}
          onClick={() => setOpen(true)}
          style={{ marginTop: 10 }}
        >
          {current ? 'This has changed →' : 'Say what doing well looks like →'}
        </button>
      )}

      {canState && open && (
        <div style={{ marginTop: 10 }}>
          <Panel>
            {/**
              * NOT PRE-FILLED WITH THE CURRENT TEXT. An editable copy of what is there invites a
              * correction, and a corrected baseline stops being a record of what was believed at the
              * start. The old statement is above, to be read rather than overwritten.
              */}
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>What would doing well look like?</div>
            <textarea className="gwui-input"
              value={success}
              onChange={e => setSuccess(e.target.value)}
              rows={3}
              placeholder="In your own words. Not a target for one person - what would make you say, at the end, that this went the way it should have."
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12, fontWeight: 700, margin: '12px 0 4px' }}>What has to be true for it? One per line.</div>
            <textarea className="gwui-input"
              value={conditions}
              onChange={e => setConditions(e.target.value)}
              rows={3}
              placeholder={'Things that are not in their hands.\nA decision from somebody else, a tool, another team’s work.'}
              style={{ width: '100%' }}
            />
            {current && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, margin: '12px 0 4px' }}>Why is this changing?</div>
                <input className="gwui-input"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="The priorities moved, the role changed, we got it wrong the first time"
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: '19px', marginTop: 6 }}>
                  The version above stays on the record either way. A yardstick that moved with no reason
                  given reads worse than either version does on its own.
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn pri sm"
                onClick={() => state.mutate()}
                disabled={state.isPending || (!success.trim() && !conditions.trim())}
              >
                {state.isPending ? 'Recording…' : current ? 'Record as a new version' : 'Record it'}
              </button>
              <button className="btn sec sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </Panel>
        </div>
      )}
    </Outer>
  )
}

/* The two wrappers live outside the panel, so typing in its form keeps the same text box: built inside the render, they were new
   components on every keystroke, and the box lost focus after one letter (restored, 30 October 2026). */
function Outer({ asFold, fact, children }: { asFold?: boolean; fact: string; children: React.ReactNode }) {
  return asFold
    ? <FoldedLine name="What doing well looks like" fact={fact}>{children}</FoldedLine>
    : <Section heading="What doing well looks like">{children}</Section>
}
function Inner({ asFold, children }: { asFold?: boolean; children: React.ReactNode }) {
  return asFold ? <div>{children}</div> : <Panel>{children}</Panel>
}
