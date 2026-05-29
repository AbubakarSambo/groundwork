import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button, Card } from '@/components/ui'

export function BillingCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const status = params.get('status')
  const ok = status === 'success'

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">{ok ? 'Billing is set up' : 'Billing setup cancelled'}</h1>
        <p className="text-muted-foreground mb-6">
          {ok
            ? 'Your care fee is active. You can now activate grounds — the report unlocks and both parties read it at the same time.'
            : 'No card was saved. You can set up billing again whenever you are ready to activate a ground.'}
        </p>
        <Button onClick={() => navigate('/')}>Back to your grounds</Button>
      </Card>
    </div>
  )
}
