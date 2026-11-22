import { Section, Empty, PatternPanel } from '@/components/gw/ui'
import type { YourBoard } from '@/api/you'

/**
 * COACHING, AND SOMETHING THAT KEEPS COMING UP (the prototype's two headings, you-board-miriam.txt) (Hafsah, 21 November 2026: "patterns/coaching").
 *
 * ONLY WHAT MAY BE SHOWN TO YOU. Both parts are what GET /you serves the person it is about, and nothing else:
 *   - `coaching` is the one step your latest check-in gave you, said to you (a-step-said-to-you.ts);
 *   - `patterns` are your own, through the one rule for who reads a pattern (patterns/who-reads-a-pattern.ts, `runsIt: false`), so a
 *     pattern's `coachTowards` and `oneStep`, which are for whoever runs the check-in, are never served to you, and a lead's own
 *     reading of you, their private notes and their judgement never reach this page at all. The page draws what it is given and
 *     adds nothing. `PatternPanel` draws every field the server serves for your own pattern, as it did before.
 * `.filter(p => p.yours !== false)` is this page's own check, on top of the server's, never instead of it.
 */
export function YourPatternsAndCoaching({ b }: { b: YourBoard }) {
  const patterns = (b.patterns ?? []).filter(p => p.yours !== false)
  const coaching = b.coaching?.says?.trim() ? b.coaching : null
  return (
    <>
      <Section heading="Coaching">
        {coaching ? (
          <>
            <p className="gwui-panel-text"><b>{coaching.says}</b></p>
            {coaching.checkIn && <p className="gwui-panel-text-muted">{`This came from your last ${coaching.checkIn} check-in.`}</p>}
          </>
        ) : (
          <Empty>There is no coaching step for you yet. When a check-in gives you one thing to work on, it is written here.</Empty>
        )}
      </Section>
      <Section heading="Something that keeps coming up" note="About your part in the work">
        {patterns.length ? patterns.map(p => <PatternPanel key={p.id} pattern={p} invalidateKey={['you']} />) : (
          <Empty>Nothing has come up often enough about your work to name. Groundwork names something only once it has seen it in three check-ins.</Empty>
        )}
      </Section>
    </>
  )
}
