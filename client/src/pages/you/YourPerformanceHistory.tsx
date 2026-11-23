import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Section, EdgeList, EdgeRow } from '@/components/gw/ui'
import { reviewsApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { useSuitesOnForYou } from '@/hooks/useSuitesOnForYou'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import type { YourBoard } from '@/api/you'
import { TenAPage } from './TenAPage'

/**
 * YOUR OWN REPORTS (Hafsah, 21 November 2026: "performance history"; 24 November, page audit row 4: "one reports list"). Your reviews
 * and your own report from each check-in, newest first, each with where to read it in full: the one list of them on You, under the
 * prototype's heading. Nothing is drawn until there is one. Every fact is read from where it already lives: your reviews from
 * GET /suites/reviews/mine (the same call, and the same cache, as your Suites page), your reports from `ownReports` on GET /you.
 *
 * NOT HERE, ON PURPOSE: how your answers were graded (specificity, coverage, the check-in grade). The You board has never served
 * them to the person (your-board.ts, "What it never holds"), and whether a person may read their own grades is Hafsah's decision,
 * not this page's.
 */
type AnEntry = { key: string; title: string; line: string; to: string; linkSays: string; at: number }

const at = (day: string) => new Date(`${day}T00:00:00.000Z`)

export function YourPerformanceHistory({ b }: { b: YourBoard }) {
  const user = useAuthStore(s => s.user)
  const suitesOn = useSuitesOnForYou()
  const reviews = useQuery({ queryKey: ['your-reviews'], queryFn: reviewsApi.mineQuietly, enabled: !!user && suitesOn.reviews, retry: false })

  const entries: AnEntry[] = [
    ...(reviews.data ?? []).map((y): AnEntry => {
      const month = whenItWas(at(y.dueOn), 'month', 'UTC')
      return { key: `review-${y.id}`, title: `Your review, ${month}`, line: [y.says, y.appealSays].filter(Boolean).join(' '), to: `/suite/reviews/${y.id}`, linkSays: 'Open your review', at: at(y.dueOn).getTime() }
    }),
    ...(b.ownReports ?? []).map((r): AnEntry => ({
      key: `report-${r.to}`,
      title: `Your report from ${r.checkIn}`,
      line: r.at ? `It was written from your answers on ${whenItWas(r.at, 'dayAndMonthLong')}.` : 'It was written from your answers.',
      to: r.to,
      linkSays: 'Read it',
      at: r.at ? new Date(r.at).getTime() : 0,
    })),
  ].sort((x, y) => y.at - x.at)

  if (entries.length === 0) return null
  return (
    <Section heading="Your own reports">
      <TenAPage items={entries} label="your own reports">
        {shown => (
          <EdgeList label="Your own reports">
            {shown.map(e => (
              <EdgeRow key={e.key} title={e.title} detail={e.line || undefined} actions={<Link className="gwui-plain-link gwui-tap-44" to={e.to}>{e.linkSays}</Link>} />
            ))}
          </EdgeList>
        )}
      </TenAPage>
    </Section>
  )
}
