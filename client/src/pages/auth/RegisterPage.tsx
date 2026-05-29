import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api'
import { Button, Input, Label, Card } from '@/components/ui'

export function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ organizationName: '', firstName: '', lastName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.register(form)
      toast.success('Check your email to verify your account.')
      navigate('/login')
    } catch {
      /* interceptor toasts */
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-6">Create your workspace</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div><Label>Workspace name</Label><Input value={form.organizationName} onChange={set('organizationName')} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name</Label><Input value={form.firstName} onChange={set('firstName')} required /></div>
            <div><Label>Last name</Label><Input value={form.lastName} onChange={set('lastName')} required /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={set('email')} required /></div>
          <div><Label>Password</Label><Input type="password" value={form.password} onChange={set('password')} required /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating…' : 'Create workspace'}</Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4">
          Already have an account? <Link to="/login" className="text-primary underline">Sign in</Link>
        </p>
      </Card>
    </div>
  )
}
