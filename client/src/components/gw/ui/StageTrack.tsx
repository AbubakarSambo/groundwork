import './gw-ui.css'

/**
 * STAGE TRACK (request 76: a kind of work's records, with stages, docs/prototype/screens/
 * G1-example-check-ins/salesorg.txt, "Stage now"). A row's kind of work moves through a fixed
 * list of stages the lead's board keeps (sales: Contacted, Need established, Pitched, Qualified,
 * Quoted, Won; engineering: Worked on, Written, Merged, Tested, Deployed, Used; and so on).
 *
 * This draws every stage in order, in one line, so a reader sees the whole path a record can take
 * and where this one sits on it - not only its current word, which reads as a status label with no
 * sense of what is left. A stage before the current one is marked done; the current one is marked
 * as where the record stands now; a stage after it is plain.
 *
 * `current` can be `null` (no stage said yet) or a word not in `stages` (the server only ever sends
 * one of the kind's own stages, but a lead's own record kept before the stages changed could still
 * carry an old one) - either way nothing is marked done or current, and every stage reads as plain.
 */
export function StageTrack({ stages, current }: { stages: string[]; current: string | null }) {
  const i = current ? stages.findIndex((s) => s === current) : -1
  return (
    <ol className="gwui-stage-track" aria-label={current ? `Stage: ${current}` : 'No stage said yet'}>
      {stages.map((s, idx) => {
        const state = i === -1 ? 'plain' : idx < i ? 'done' : idx === i ? 'current' : 'plain'
        return (
          <li key={s} className={`gwui-stage-track-item gwui-stage-track-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            {s}
          </li>
        )
      })}
    </ol>
  )
}
