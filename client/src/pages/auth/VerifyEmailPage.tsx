import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'

const fired = new Set<string>()
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { Button, Card, Input, Label } from '@/components/ui'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const token = searchParams.get('token')
  const [email, setEmail] = useState('')

  const verify = useMutation({
    mutationFn: (t: string) => authApi.verifyEmail(t),
    onSuccess: ({ accessToken, user }) => {
      setAuth(user, accessToken)
      toast.success('Email verified — welcome to Groundwork.')
      navigate('/', { replace: true })
    },
  })

  const resend = useMutation({
    mutationFn: (e: string) => authApi.resendVerification(e),
    onSuccess: () => toast.success('Verification email sent — check your inbox.'),
    onError: () => toast.error('Failed to resend. Check the email address and try again.'),
  })

  useEffect(() => {
    if (token && !fired.has(token)) {
      fired.add(token)
      verify.mutate(token)
    }
  }, [token])

  if (!token) {
    return (
      <Screen>
        <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold mb-1">Invalid link</h1>
        <p className="text-muted-foreground mb-4">No verification token found in the URL.</p>
        <Link to="/login" className="text-primary underline text-sm">Go to sign in</Link>
      </Screen>
    )
  }

  if (verify.isPending) {
    return (
      <Screen>
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
        <h1 className="text-xl font-semibold mb-1">Verifying your email…</h1>
        <p className="text-muted-foreground">Just a moment.</p>
      </Screen>
    )
  }

  if (verify.isError) {
    const message = (verify.error as any)?.response?.data?.message || 'This link has already been used or has expired.'
    return (
      <Screen>
        <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold mb-1">Verification failed</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        <div className="space-y-2 w-full">
          <Label htmlFor="resend-email">Enter your email to get a new link</Label>
          <Input
            id="resend-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            className="w-full"
            variant="outline"
            disabled={!email || resend.isPending}
            onClick={() => resend.mutate(email)}
          >
            {resend.isPending ? 'Sending…' : 'Resend verification email'}
          </Button>
        </div>
        <Link to="/login" className="text-primary underline text-sm mt-4 block">Back to sign in</Link>
      </Screen>
    )
  }

  return (
    <Screen>
      <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
      <h1 className="text-xl font-semibold mb-1">Email verified!</h1>
      <p className="text-muted-foreground">Redirecting…</p>
    </Screen>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md p-8 text-center">
        {children}
      </Card>
    </div>
  )
}
