import './gw-ui.css'

/**
 * STAGE TRACK: "THE SHAPE OF THE WORK" (request 76, salesorg.txt: "Reported vs criteria met, across
 * 4 teams / The shape of the work"; founder.txt: "Said vs happened, week by week / The shape of the
 * work" - the prototype's own subheading for this, reused verbatim across kinds).
 *
 * Drawn once per section, never once per row: every stage a kind of work keeps, in order, with how
 * many of its rows sit at each one. Counted from the served rows only - never "criteria met" or
 * "proven", which nothing served here says - so a stage with nothing against it reads as 0, not as
 * an empty gap.
 */
export function StageTrack({ stages, counts }: { stages: string[]; counts: Record<string, number> }) {
  return (
    <ol className="gwui-stage-track" aria-label="The shape of the work, by stage">
      {stages.map((s) => {
        const n = counts[s] ?? 0
        return (
          <li key={s} className={`gwui-stage-track-item ${n > 0 ? 'gwui-stage-track-done' : 'gwui-stage-track-plain'}`}>
            {`${s} (${n})`}
          </li>
        )
      })}
    </ol>
  )
}
