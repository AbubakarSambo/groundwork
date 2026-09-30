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
 *
 * BOARD REVIEW, 30 SEPTEMBER, ITEM 3: "Quoted (1)" is a label with a number bolted on, not
 * something a person reads - now "Quoted: none yet" / "Quoted: 1 deal" / "Quoted: 3 deals", in the
 * kind's own word for one row (`itemNoun`, e.g. "deal", "ticket", "loan"), pluralised in the plain
 * way (every noun this product uses one of takes a simple "s").
 */
export function StageTrack({ stages, counts, itemNoun = 'item' }: { stages: string[]; counts: Record<string, number>; itemNoun?: string }) {
  const noun = itemNoun.toLowerCase()
  return (
    <ol className="gwui-stage-track" aria-label="The shape of the work, by stage">
      {stages.map((s) => {
        const n = counts[s] ?? 0
        const countSaid = n === 0 ? 'none yet' : n === 1 ? `1 ${noun}` : `${n} ${noun}s`
        return (
          <li key={s} className={`gwui-stage-track-item ${n > 0 ? 'gwui-stage-track-done' : 'gwui-stage-track-plain'}`}>
            {`${s}: ${countSaid}`}
          </li>
        )
      })}
    </ol>
  )
}
