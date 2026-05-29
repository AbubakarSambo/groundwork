import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { Button, Card, Badge } from '@/components/ui'



const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  AWAITING_PARTIES: 'Awaiting check-ins',
  REPORT_READY: 'Report ready',
  ACTIVE: 'Active',
  RESOLVED: 'Resolved',
  STALLED: 'Stalled',
  CLOSED: 'Closed',
}

export function GroundsListPage() {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const { data: grounds, isLoading } = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list })

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Groundwork</h1>
          <div className="flex items-center gap-2">
            {user?.role === 'ADMIN' && <Link to="/dashboard"><Button variant="ghost">Dashboard</Button></Link>}
            {user?.role === 'ADMIN' && <Link to="/alignment-feed"><Button variant="ghost">Alignment feed</Button></Link>}
            {user?.isPlatformAdmin && <Link to="/prompts"><Button variant="ghost">Prompts</Button></Link>}
            <Button variant="ghost" onClick={logout}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium">Your grounds</h2>
          <Link to="/grounds/new"><Button>Open a ground</Button></Link>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {grounds?.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No grounds yet. Open one when something starts — a hire, a cofounder, a project.
          </Card>
        )}

        <div className="space-y-3">
          {grounds?.map((g) => (
            <Link key={g.id} to={`/grounds/${g.id}`}>
              <Card className="p-4 flex items-center justify-between hover:shadow-sm transition">
                <div>
                  <p className="font-medium">{g.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {g.scenario.replace('_', ' ').toLowerCase()} · {g.participants.length} part{g.participants.length === 1 ? 'y' : 'ies'}
                  </p>
                </div>
                <Badge>{STATUS_LABEL[g.status] ?? g.status}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
