import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { Card } from '@/components/ui'

export function ReportPage() {
  const { groundId } = useParams<{ groundId: string }>()
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report', groundId],
    queryFn: () => reportsApi.get(groundId!),
    enabled: !!groundId,
  })

  if (isLoading) return <div className="min-h-screen bg-muted p-8 text-muted-foreground">Loading…</div>
  if (isError || !report) return <div className="min-h-screen bg-muted p-8 text-muted-foreground">This report is not available to you yet.</div>

  return (
    <div className="min-h-screen bg-muted px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <Link to={`/grounds/${groundId}`} className="text-sm text-primary underline">← Back to ground</Link>

        <Card className="p-6">
          <h1 className="text-xl font-semibold mb-3">The shared picture</h1>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{report.sharedPicture}</p>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium mb-3">Where you agree</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {report.agreements.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium mb-3">The gap</h2>
          <div className="space-y-4">
            {report.divergences.map((d, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium">{d.topic}</p>
                <p className="text-muted-foreground">One of you: {d.initiatorView}</p>
                <p className="text-muted-foreground">The other: {d.participantView}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-primary/5 border-primary/20">
          <h2 className="font-medium mb-2">The one question worth answering</h2>
          <p className="text-sm">{report.centralQuestion}</p>
        </Card>
      </div>
    </div>
  )
}
