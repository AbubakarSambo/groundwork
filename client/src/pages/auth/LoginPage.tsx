import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { Button, Input, Label, Card } from '@/components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { accessToken, user } = await authApi.login(email, password)
      setAuth(user, accessToken)
      navigate('/')
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Invalid email or password'
      toast.error('Sign in failed', { description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-1">Groundwork</h1>
        <p className="text-muted-foreground mb-6">See clearly when it counts.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4">
          New here? <Link to="/register" className="text-primary underline">Create a workspace</Link>
        </p>
      </Card>
    </div>
  )
}
