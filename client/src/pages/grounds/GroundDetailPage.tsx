import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { groundsApi, resolutionApi, dashboardApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { Button, Input, Label, Card, Badge } from '@/components/ui'

export function GroundDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

  const { data: ground, isLoading } = useQuery({ queryKey: ['ground', id], queryFn: () => groundsApi.get(id!), enabled: !!id })

  const addParticipant = useMutation({
    mutationFn: () => groundsApi.addParticipant(id!, { email, roleAsDescribed: role || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ground', id] }); setEmail(''); setRole(''); toast.success('Invite sent — they are notified, never added silently') },
  })

  const activate = useMutation({
    mutationFn: () => groundsApi.activate(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ground', id] }); toast.success('Ground activated') },
    onError: (err) => {
      // 402 Payment Required → redirect to Stripe Checkout to set up the care fee.
      const res = (err as AxiosError<{ requiresBilling?: boolean; checkoutUrl?: string }>).response
      if (res?.status === 402 && res.data?.checkoutUrl) {
        toast.info('Set up billing to activate this ground')
        window.location.href = res.data.checkoutUrl
      }
    },
  })

  if (isLoading || !ground) return <div className="min-h-screen bg-muted p-8 text-muted-foreground">Loading…</div>

  const myParticipant = ground.participants.find((p) => p.userId === user?.id)
  const myCheckIn = ground.checkIns?.find((c) => c.participantId === myParticipant?.id)

  return (
    <div className="min-h-screen bg-muted px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="text-sm text-primary underline">← All grounds</Link>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold">{ground.label}</h1>
              <p className="text-sm text-muted-foreground">{ground.scenario.replace('_', ' ').toLowerCase()} · {ground.timelineDays} days</p>
            </div>
            <Badge>{ground.status}</Badge>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium mb-3">Parties</h2>
          <div className="space-y-2">
            {ground.participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.email}</span>
                <Badge variant="secondary">{p.partyType}</Badge>
              </div>
            ))}
          </div>

          {ground.participants.length < 2 && (
            <form onSubmit={(e) => { e.preventDefault(); addParticipant.mutate() }} className="mt-4 space-y-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">Add the other party. They will be notified the moment they are added.</p>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label>Role as you describe it</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Head of Engineering" /></div>
              <Button type="submit" disabled={addParticipant.isPending}>Add party</Button>
            </form>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-medium mb-3">Your check-in</h2>
          {myCheckIn ? (
            <Button onClick={() => navigate(`/checkin/${myCheckIn.id}`)}>
              {myCheckIn.status === 'COMPLETED' ? 'Review your check-in' : 'Continue your check-in'}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">No check-in for you on this ground.</p>
          )}
        </Card>

        {ground.report?.releasedAt && (
          <Card className="p-6">
            <h2 className="font-medium mb-3">Report</h2>
            <Link to={`/report/${ground.id}`}><Button variant="outline">View the shared picture</Button></Link>
          </Card>
        )}

        {ground.status === 'REPORT_READY' && user?.role === 'ADMIN' && (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-3">The report is ready. Activating starts billing ($20/mo + $50/person/mo).</p>
            <Button onClick={() => activate.mutate()} disabled={activate.isPending}>Activate & read report</Button>
          </Card>
        )}

        {(ground.participants.length >= 2 || ground.status === 'CLOSED' || ground.status === 'RESOLVED') && (
          <ResolutionCard groundId={ground.id} />
        )}
      </div>
    </div>
  )
}

function ResolutionCard({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['resolution', groundId], queryFn: () => resolutionApi.get(groundId) })
  const propose = useMutation({
    mutationFn: (endState: string) => resolutionApi.propose(groundId, endState),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resolution', groundId] })
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      toast.success('Recorded. The ground closes once both parties confirm the same end state.')
    },
  })

  if (isLoading || !data) return null
  const { resolution, options, groundStatus } = data
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v

  if (groundStatus === 'CLOSED' || groundStatus === 'RESOLVED') {
    return (
      <>
        <Card className="p-6">
          <h2 className="font-medium mb-2">Resolved</h2>
          <p className="text-sm">End state: <strong>{resolution ? labelFor(resolution.endState) : '—'}</strong></p>
          <p className="text-sm text-muted-foreground mt-2">Billing has stopped. This record is permanent and belongs to both of you.</p>
        </Card>
        <OutcomeFeedbackCard groundId={groundId} />
      </>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="font-medium mb-1">Resolution</h2>
      <p className="text-sm text-muted-foreground mb-4">The ground closes when both parties confirm the same end state. No one decides this alone.</p>

      {resolution && (
        <div className="text-sm mb-4 border-b pb-3">
          <p>Current proposal: <strong>{labelFor(resolution.endState)}</strong></p>
          <p className="text-muted-foreground mt-1">
            Initiator {resolution.confirmedByInitiator ? '✓ confirmed' : '· not yet'} · Participant {resolution.confirmedByParticipant ? '✓ confirmed' : '· not yet'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button
            key={o.value}
            variant={resolution?.endState === o.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => propose.mutate(o.value)}
            disabled={propose.isPending}
          >
            {o.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">Choosing the current proposal confirms your side. Choosing a different one re-opens it for both.</p>
    </Card>
  )
}

function OutcomeFeedbackCard({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  const { data: feedback, isLoading } = useQuery({ queryKey: ['outcome-feedback', groundId], queryFn: () => dashboardApi.myFeedback(groundId) })
  const submit = useMutation({
    mutationFn: (feltFair: boolean) => dashboardApi.submitFeedback(groundId, feltFair),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outcome-feedback', groundId] }); toast.success('Thank you — this helps Groundwork improve.') },
  })

  if (isLoading) return null
  if (feedback) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">You answered: did this feel fair and grounded in evidence? — <strong>{feedback.feltFair ? 'Yes' : 'No'}</strong></p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="font-medium mb-2">One question</h2>
      <p className="text-sm mb-4">Did this process help you reach a decision that felt fair and grounded in evidence?</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => submit.mutate(true)} disabled={submit.isPending}>Yes</Button>
        <Button size="sm" variant="outline" onClick={() => submit.mutate(false)} disabled={submit.isPending}>No</Button>
      </div>
    </Card>
  )
}
