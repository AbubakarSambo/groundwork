import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { Section, Panel } from '@/components/gw/ui'
import { toast } from 'sonner'

/**
 * WHERE THIS STOOD ON DAY ONE. `GroundBaselineEntry`, which had no reader and no writer.
 *
 * NOT THE SAME THING AS THE BASELINE ABOVE IT. That one is the yardstick: what doing well would look
 * like. This is what was actually TRUE at the start. Having both is what lets a report say something
 * has MOVED rather than only where it stands now, which is the one thing the report has never been
 * able to do.
 *
 * FROZEN, and the schema's own note is the argument: "half the findings this product makes are the
 * distance between what people believed at the start and what turned out to be true. Corrected, a
 * baseline becomes a second description of the present and the arc disappears."
 *
 * So there is no edit and no delete here, and the panel says why rather than leaving somebody to
 * discover it. A correction is a new line with its own session number, and both stay readable.
 *
 * NOTHING IS CAPTURED SILENTLY. The candidates are the lead's own words from session one, already
 * typed by the engine as it heard them, and the lead ticks which of those describe the starting point.
 * No second extraction and no model call - so nothing can invent a starting point nobody stated.
 */
export function StartingPointPanel({ groundId, canRecord }: { groundId: string; canRecord: boolean }) {
  const qc = useQueryClient()
  const [picking, setPicking] = useState(false)
  const [chosen, setChosen] = useState<Set<string>>(new Set())

  const { data } = useQuery({
    queryKey: ['baseline-entries', groundId],
    queryFn: () => groundsApi.baselineEntries(groundId),
    enabled: !!groundId,
    retry: false,
  })

  const { data: candidateData } = useQuery({
    queryKey: ['baseline-candidates', groundId],
    queryFn: () => groundsApi.baselineEntryCandidates(groundId),
    /** Only fetched when the lead opens the picker: it is their whole first session. */
    enabled: !!groundId && canRecord && picking,
    retry: false,
  })

  const record = useMutation({
    mutationFn: () => groundsApi.recordBaselineEntries(groundId, [...chosen]),
    onSuccess: () => {
      toast.success('Recorded. This stays as written, even where it turns out to have been wrong.')
      setPicking(false); setChosen(new Set())
      qc.invalidateQueries({ queryKey: ['baseline-entries', groundId] })
      qc.invalidateQueries({ queryKey: ['baseline-candidates', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not record that. Try again.'),
  })

  const entries = data?.entries ?? []
  const candidates = candidateData?.candidates ?? []

  const toggle = (t: string) => setChosen(prev => {
    const next = new Set(prev)
    next.has(t) ? next.delete(t) : next.add(t)
    return next
  })

  return (
    <div style={{ marginTop: 14 }}>
      <Section heading="Where this stood at the start">
      <Panel>
        {entries.length > 0 ? (
          <>
            <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {entries.map((e, i) => (
                <li key={i} style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: '21px' }}>
                  {e.text}
                  {/**
                    * The session it was captured in, shown only when it is not the first. A line added
                    * in session four is a fact about session four, and the distance between it and the
                    * day-one lines is the finding.
                    */}
                  {e.capturedAtSession > 1 && (
                    <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}> · added at session {e.capturedAtSession}</span>
                  )}
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: '19px', marginTop: 9 }}>
              {data?.frozenReason}
            </div>
            {!data?.canShowMovement && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px', marginTop: 6 }}>
                {/**
                  * `canShowMovement` is the module's own gate. One session is a position, not a
                  * movement, and saying what has changed off a single session would be inventing an arc.
                  */}
                The report will compare this against where things end up once a second session is done.
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px' }}>
            Nothing recorded yet. Without it the report can say where things stand, but not what has
            moved since the beginning.
          </div>
        )}
      </Panel>
      </Section>

      {canRecord && !picking && (
        <button type="button" className="gw-link t-small"
          onClick={() => setPicking(true)}
          style={{ marginTop: 10 }}
        >
          {entries.length ? 'Add to the starting point →' : 'Record where this stood →'}
        </button>
      )}

      {canRecord && picking && (
        <div style={{ marginTop: 10 }}>
          <Panel>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              From your first session, in your own words
            </div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px', marginBottom: 10 }}>
              Tick the ones that describe where things actually stood. Nothing here is rewritten, and once
              recorded it stays as written.
            </div>

            {candidates.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: '19px' }}>
                {/**
                  * Two different empties, and they need different sentences: a ground whose first
                  * session has not happened, and one where everything said has already been recorded.
                  */}
                {(candidateData?.alreadyRecorded?.length ?? 0) > 0
                  ? 'Everything from your first session is already on the record here.'
                  : 'Nothing to choose from yet. This fills in once you have done your first check-in.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {candidates.map((c, i) => (
                  <label
                    key={i}
                    style={{ display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer', padding: '7px 9px', borderRadius: 7, background: chosen.has(c.text) ? 'var(--gw-blue-bg)' : 'transparent' }}
                  >
                    <input
                      type="checkbox"
                      checked={chosen.has(c.text)}
                      onChange={() => toggle(c.text)}
                      style={{ marginTop: 3, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: '20px' }}>{c.text}</span>
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn pri sm"
                onClick={() => record.mutate()}
                disabled={!chosen.size || record.isPending}
              >
                {record.isPending ? 'Recording…' : `Record ${chosen.size || ''} as the starting point`.trim()}
              </button>
              <button className="btn sec sm"
                onClick={() => { setPicking(false); setChosen(new Set()) }}
              >
                Cancel
              </button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
