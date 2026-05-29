import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { alignmentApi } from '@/api'
import { Card, Badge } from '@/components/ui'

export function AlignmentFeedPage() {
  const { data: feed, isLoading } = useQuery({ queryKey: ['alignment-feed'], queryFn: alignmentApi.feed })

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Alignment feed</h1>
          <Link to="/" className="text-sm text-primary underline">All grounds</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-3">
        <p className="text-sm text-muted-foreground mb-2">
          State and completeness only. This view never shows what anyone said.
        </p>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {feed?.length === 0 && <Card className="p-8 text-center text-muted-foreground">No grounds yet.</Card>}

        {feed?.map((g) => (
          <Card key={g.groundId} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <Link to={`/grounds/${g.groundId}`} className="font-medium hover:underline">{g.label}</Link>
                <p className="text-sm text-muted-foreground">
                  Period {g.currentPeriod} · {g.completeness.checkedInCount} of {g.completeness.totalCount} checked in
                </p>
              </div>
              <div className="flex items-center gap-2">
                {g.stalled && <Badge variant="destructive">Stalled</Badge>}
                <Badge>{g.status}</Badge>
              </div>
            </div>

            {g.completeness.awaiting.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">Awaiting: {g.completeness.awaiting.join(', ')}</p>
            )}

            {g.patternSignals.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Patterns worth naming</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {g.patternSignals.map((s, i) => <li key={i}>{s.observation}</li>)}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">These are observations, not verdicts. They show what the record describes — not who said what.</p>
              </div>
            )}
          </Card>
        ))}
      </main>
    </div>
  )
}
