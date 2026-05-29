import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api'
import { Card } from '@/components/ui'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get })

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <Link to="/" className="text-sm text-primary underline">All grounds</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}

        {data && (
          <>
            <Card className="p-6">
              <h2 className="font-medium mb-4">Ground activity</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Active" value={data.groundActivity.active} />
                <Stat label="Reports ready" value={data.groundActivity.reportReady} />
                <Stat label="Resolved" value={data.groundActivity.resolved} />
                <Stat label="Total" value={data.groundActivity.total} />
              </div>
              <div className="mt-4 border-t pt-4">
                <Stat
                  label={`Session-2 rate (${data.groundActivity.session2Completions}/${data.groundActivity.session1Completions}) — below 60% means session 1 isn't producing enough surprise`}
                  value={data.groundActivity.session2Rate === null ? '—' : `${data.groundActivity.session2Rate}%`}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-medium mb-1">Outcome & learning</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Outcome rate per prompt version. When a prompt changes, this shows whether it improved the rate.
              </p>
              {data.outcomeRates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No resolved grounds yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 font-medium">Prompt version</th>
                      <th className="py-2 font-medium">Resolved</th>
                      <th className="py-2 font-medium">Responses</th>
                      <th className="py-2 font-medium">Felt fair</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.outcomeRates.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2">{r.key} v{r.version}</td>
                        <td className="py-2">{r.resolvedCount}</td>
                        <td className="py-2">{r.responses}</td>
                        <td className="py-2">{r.fairnessRate === null ? '—' : `${r.fairnessRate}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
