import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { participantsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { Button, Input, Label, Card } from '@/components/ui'

export function InvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => participantsApi.preview(token),
    enabled: !!token,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: () => participantsApi.accept(token, { firstName: firstName || undefined, lastName: lastName || undefined }),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      navigate(res.checkInId ? `/checkin/${res.checkInId}` : `/grounds/${res.groundId}`)
    },
  })

  if (!token) return <Centered>This invite link is missing its token.</Centered>
  if (isLoading) return <Centered>Loading…</Centered>
  if (isError || !preview) return <Centered>This invite link is invalid or has already been used.</Centered>

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4 py-10">
      <Card className="max-w-md w-full p-8">
        <h1 className="text-xl font-semibold mb-1">{preview.initiatorName} wants to hear your version</h1>
        <p className="text-muted-foreground mb-4">
          A Groundwork session about a situation you are both navigating: <strong>{preview.groundLabel}</strong>.
        </p>
        {preview.roleAsDescribed && (
          <p className="text-sm text-muted-foreground mb-4">Your role as described: <strong>{preview.roleAsDescribed}</strong></p>
        )}
        <p className="text-sm text-muted-foreground mb-6">
          Both sides check in separately and privately. Your version is yours — {preview.initiatorName} never sees what you write.
        </p>

        {preview.alreadyAccepted ? (
          <p className="text-sm">You have already joined this ground. <Button variant="link" onClick={() => navigate('/login')}>Sign in</Button> to continue.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); accept.mutate() }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" /></div>
              <div><Label>Last name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Optional" /></div>
            </div>
            <Button type="submit" className="w-full" disabled={accept.isPending}>
              {accept.isPending ? 'Joining…' : 'Add my version'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted flex items-center justify-center px-4 text-muted-foreground">{children}</div>
}
