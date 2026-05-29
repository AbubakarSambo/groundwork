import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { promptsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { Button, Card, Badge, Input, Label, Textarea } from '@/components/ui'

export function PromptVersioningPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [key, setKey] = useState('')
  const [content, setContent] = useState('')
  const [summary, setSummary] = useState('')
  const [open, setOpen] = useState(false)

  const { data: versions, isLoading, isError } = useQuery({
    queryKey: ['prompts'],
    queryFn: promptsApi.list,
    enabled: !!user?.isPlatformAdmin,
    retry: false,
  })

  const create = useMutation({
    mutationFn: () => promptsApi.create(key, content, summary || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompts'] }); setKey(''); setContent(''); setSummary(''); setOpen(false); toast.success('New version created (inactive until activated)') },
  })

  const activate = useMutation({
    mutationFn: (id: string) => promptsApi.activate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompts'] }); toast.success('Version activated') },
  })

  if (!user?.isPlatformAdmin) {
    return <div className="min-h-screen bg-muted flex items-center justify-center text-muted-foreground">Prompt management requires platform admin access.</div>
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Prompt management</h1>
          <Link to="/" className="text-sm text-primary underline">All grounds</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <p className="text-sm text-muted-foreground">
          Prompt versions are the moat. Every change is a new version, logged with a summary and versioned against outcome data. Activation is deliberate.
        </p>

        <div>
          <Button onClick={() => setOpen((o) => !o)}>{open ? 'Cancel' : 'New version'}</Button>
        </div>

        {open && (
          <Card className="p-6">
            <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-3">
              <div><Label>Key</Label><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="system · report_synthesis · scenario.drift" required /></div>
              <div><Label>Change summary</Label><Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Why this change?" /></div>
              <div><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} required /></div>
              <Button type="submit" disabled={create.isPending}>Create version</Button>
            </form>
          </Card>
        )}

        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {isError && <p className="text-muted-foreground">Could not load prompt versions.</p>}

        {versions?.map((v) => (
          <Card key={v.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{v.key} <span className="text-muted-foreground">v{v.version}</span></p>
                {v.summary && <p className="text-sm text-muted-foreground">{v.summary}</p>}
              </div>
              <div className="flex items-center gap-2">
                {v.isActive ? <Badge>Active</Badge> : (
                  <Button size="sm" variant="outline" onClick={() => activate.mutate(v.id)} disabled={activate.isPending}>Activate</Button>
                )}
              </div>
            </div>
            <pre className="mt-3 text-xs bg-muted rounded p-3 max-h-40 overflow-auto whitespace-pre-wrap">{v.content}</pre>
          </Card>
        ))}
      </main>
    </div>
  )
}
