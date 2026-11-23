import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { FieldRow, Stack, Button, FlexRow } from '@/components/gw/ui'
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
 *
 * ONE LINE (page audit, 24 November 2026, row 2): "Starting point", what was recorded or "Nothing recorded yet.", and "Record it" for
 * the lead, which opens the lead's own words from her first check-in to tick. It is a row of People and setup's "How it runs".
 */
export function TheStartingPoint({ groundId, canRecord }: { groundId: string; canRecord: boolean }) {
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
  const toggle = (t: string) => setChosen((prev) => {
    const next = new Set(prev)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    return next
  })

  return (
    <FieldRow
      label="Starting point"
      value={(
        <Stack gap={8}>
          {entries.length > 0
            ? <ul className="ds-list ds-list-bullets">{entries.map((e, i) => <li key={i}>{e.text}</li>)}</ul>
            : <span>Nothing recorded yet.</span>}
          {entries.length > 0 && data?.frozenReason && <p className="ds-text-meta">{data.frozenReason}</p>}
          {canRecord && picking && (
            <Stack gap={8}>
              <p className="ds-text-secondary">From your first check-in, in your own words. Tick the ones that describe where things stood.</p>
              {candidates.length === 0
                ? <p className="ds-text-secondary">{(candidateData?.alreadyRecorded?.length ?? 0) > 0 ? 'Everything from your first check-in is already on the record here.' : 'Nothing to choose from yet.'}</p>
                : candidates.map((c, i) => (
                  <label key={i} className="ds-spread">
                    <input type="checkbox" checked={chosen.has(c.text)} onChange={() => toggle(c.text)} />
                    <span>{c.text}</span>
                  </label>
                ))}
              <FlexRow gap={8}>
                <Button kind="secondary" size="small" onClick={() => record.mutate()} disabled={!chosen.size || record.isPending}>
                  {record.isPending ? 'Recording…' : `Record ${chosen.size || ''} as the starting point`.replace('  ', ' ')}
                </Button>
                <Button kind="quiet" size="small" onClick={() => { setPicking(false); setChosen(new Set()) }}>Cancel</Button>
              </FlexRow>
            </Stack>
          )}
        </Stack>
      )}
      action={canRecord ? (
        <button type="button" className="gwui-plain-link" aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
          {picking ? 'Close' : entries.length ? 'Add to it' : 'Record it'}
        </button>
      ) : undefined}
    />
  )
}
