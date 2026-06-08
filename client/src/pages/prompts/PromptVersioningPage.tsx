import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { promptsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

export function PromptVersioningPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [key, setKey] = useState('')
  const [content, setContent] = useState('')
  const [summary, setSummary] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const { data: versions, isLoading, isError } = useQuery({
    queryKey: ['prompts'],
    queryFn: promptsApi.list,
    enabled: !!user?.isPlatformAdmin,
    retry: false,
  })

  const create = useMutation({
    mutationFn: () => promptsApi.create(key, content, summary || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      setKey(''); setContent(''); setSummary(''); setFormOpen(false)
      toast.success('New version created (inactive until activated)')
    },
  })

  const activate = useMutation({
    mutationFn: (id: string) => promptsApi.activate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompts'] }); toast.success('Version activated') },
  })

  if (!user?.isPlatformAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Platform admin access required.</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Prompt management</div>
        <button className="gw-back" onClick={() => navigate('/')}>← Grounds</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div className="gw-box gw-box-blue" style={{ marginBottom: 12 }}>
          Prompt versions are the moat. Every change is a new version, logged with a summary and versioned against outcome data. Activation is deliberate.
        </div>

        <button
          className={formOpen ? 'gw-btn-sec' : 'gw-btn'}
          style={{ width: 'auto', padding: '10px 18px', marginBottom: 12 }}
          onClick={() => setFormOpen(o => !o)}
        >
          {formOpen ? 'Cancel' : '+ New version'}
        </button>

        {formOpen && (
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 12 }}>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
              <div className="gw-fld">
                <label className="gw-label">Key</label>
                <input className="gw-input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="system · report_synthesis · scenario.drift" required />
              </div>
              <div className="gw-fld">
                <label className="gw-label">Change summary</label>
                <input className="gw-input" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Why this change?" />
              </div>
              <div className="gw-fld">
                <label className="gw-label">Content</label>
                <textarea className="gw-ta" value={content} onChange={(e) => setContent(e.target.value)} rows={10} required />
              </div>
              <button className="gw-btn" type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create version'}
              </button>
            </form>
          </div>
        )}

        {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>}
        {isError && <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Could not load prompt versions.</div>}

        {versions?.map((v: any) => (
          <div key={v.id} style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '14px 16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {v.key} <span style={{ color: 'var(--gw-muted)', fontWeight: 400 }}>v{v.version}</span>
                </div>
                {v.summary && (
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>{v.summary}</div>
                )}
              </div>
              <div style={{ flexShrink: 0, marginLeft: 12 }}>
                {v.isActive ? (
                  <span className="gw-pill gw-pill-green">Active</span>
                ) : (
                  <button
                    className="gw-btn-sec"
                    style={{ width: 'auto', padding: '5px 12px', fontSize: 12 }}
                    onClick={() => activate.mutate(v.id)}
                    disabled={activate.isPending}
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
            <pre style={{ fontSize: 11, background: '#EDECEA', borderRadius: 4, padding: '10px 12px', maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', color: '#1A1916', margin: 0 }}>
              {v.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
