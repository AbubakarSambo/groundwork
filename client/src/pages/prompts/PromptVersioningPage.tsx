import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { promptsApi, PromptVersion } from '@/api/prompts'
import { useAuthStore } from '@/stores/auth'

// ─── Protected-section detection ────────────────────────────────────────────

const PROTECTED_HEADERS = [
  'THE WILLINGNESS GATE',
  'BANNED WORDS',
  'SESSION CLOSE',
  'PRIVACY',
  'RECORD SHARING',
  'SEVEN-STAGE SEQUENCE',
]

const PROTECTED_CONTENT_STRINGS = [
  'This is held separately from the other party\'s version.',
]

const SCENARIO_PROTECTED_PHRASE = 'Tell me about the most important thing you have done'

function isSectionProtected(headerLine: string, bodyText: string, promptKey: string): boolean {
  const upperHeader = headerLine.toUpperCase()
  for (const ph of PROTECTED_HEADERS) {
    if (upperHeader.includes(ph)) return true
  }
  for (const ps of PROTECTED_CONTENT_STRINGS) {
    if (bodyText.includes(ps)) return true
  }
  if (promptKey.startsWith('scenario.') && bodyText.includes(SCENARIO_PROTECTED_PHRASE)) {
    return true
  }
  return false
}

// ─── Content block parsing ───────────────────────────────────────────────────

interface ContentBlock {
  type: 'protected' | 'editable'
  header: string      // the ═══ separator line that precedes this block (empty for first)
  body: string
}

const SEP_RE = /^═{3,}.*═{3,}$/m

function parseContentBlocks(content: string, promptKey: string): ContentBlock[] {
  // Split on separator lines (═══ … ═══), keeping the separators
  const lines = content.split('\n')
  const blocks: ContentBlock[] = []

  let currentHeader = ''
  let currentLines: string[] = []

  for (const line of lines) {
    if (SEP_RE.test(line.trim())) {
      // Flush previous block
      const body = currentLines.join('\n')
      if (currentLines.length > 0 || currentHeader !== '') {
        blocks.push({
          type: isSectionProtected(currentHeader, body, promptKey) ? 'protected' : 'editable',
          header: currentHeader,
          body,
        })
      }
      currentHeader = line
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  // Flush last block
  const body = currentLines.join('\n')
  blocks.push({
    type: isSectionProtected(currentHeader, body, promptKey) ? 'protected' : 'editable',
    header: currentHeader,
    body,
  })

  return blocks
}

function reassembleContent(blocks: ContentBlock[], editableValues: string[]): string {
  let editIdx = 0
  const parts: string[] = []
  for (const block of blocks) {
    if (block.header !== '') {
      parts.push(block.header)
    }
    if (block.type === 'protected') {
      parts.push(block.body)
    } else {
      parts.push(editableValues[editIdx] ?? block.body)
      editIdx++
    }
  }
  return parts.join('\n')
}

// ─── Sidebar key sorting ─────────────────────────────────────────────────────

function sortKeys(keys: string[]): string[] {
  const order: Record<string, number> = { system: 0, report_synthesis: 1 }
  return [...keys].sort((a, b) => {
    const oa = order[a] ?? (a.startsWith('scenario.') ? 2 : 3)
    const ob = order[b] ?? (b.startsWith('scenario.') ? 2 : 3)
    if (oa !== ob) return oa - ob
    return a.localeCompare(b)
  })
}

// ─── Date formatting ─────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProtectedBlock({ header, body }: { header: string; body: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      {header && (
        <pre style={{
          fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          background: '#FFF8E7', border: '1px solid #F0C040', borderRadius: 4,
          padding: '4px 10px', margin: '0 0 2px 0', color: '#8A6C00',
        }}>
          {header}
        </pre>
      )}
      <div style={{ fontSize: 10, color: '#8A6C00', fontWeight: 600, marginBottom: 2, paddingLeft: 2 }}>
        🔒 Protected
      </div>
      <pre style={{
        fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        background: '#FFF8E7', border: '1px solid #F0C040', borderRadius: 4,
        padding: '8px 10px', marginBottom: 0, margin: 0,
      }}>
        {body}
      </pre>
    </div>
  )
}

function EditableBlock({ header, body }: { header: string; body: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      {header && (
        <pre style={{
          fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          background: '#F5F3EF', borderRadius: 4,
          padding: '4px 10px', margin: '0 0 2px 0',
        }}>
          {header}
        </pre>
      )}
      <pre style={{
        fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        background: '#F5F3EF', borderRadius: 4,
        padding: '8px 10px', marginBottom: 0, margin: 0,
      }}>
        {body}
      </pre>
    </div>
  )
}

function ParsedContentView({ content, promptKey }: { content: string; promptKey: string }) {
  const blocks = parseContentBlocks(content, promptKey)
  return (
    <div>
      {blocks.map((block, i) =>
        block.type === 'protected'
          ? <ProtectedBlock key={i} header={block.header} body={block.body} />
          : <EditableBlock key={i} header={block.header} body={block.body} />
      )}
    </div>
  )
}

// ─── Version history row ─────────────────────────────────────────────────────

function VersionRow({
  v,
  confirmActivateId,
  onActivateClick,
  onConfirm,
  onCancel,
  activating,
  expanded,
  onToggle,
}: {
  v: PromptVersion
  confirmActivateId: string | null
  onActivateClick: (id: string) => void
  onConfirm: (id: string) => void
  onCancel: () => void
  activating: boolean
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div style={{
      border: '1px solid #E2E0DB', borderRadius: 6, marginBottom: 6, overflow: 'hidden',
      background: 'white',
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>v{v.version}</span>
          {v.isActive && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#1A7A4A', background: '#E8F7EF',
              borderRadius: 10, padding: '2px 8px',
            }}>Active</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{fmtDate(v.activatedAt ?? v.createdAt)}</span>
          {v.summary && (
            <span style={{ fontSize: 11, color: 'var(--gw-sub)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              — {v.summary}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
          {!v.isActive && confirmActivateId !== v.id && (
            <button
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid #0C447C',
                background: 'white', color: '#0C447C', cursor: 'pointer', fontWeight: 500,
              }}
              onClick={() => onActivateClick(v.id)}
              disabled={activating}
            >
              Activate
            </button>
          )}
          {confirmActivateId === v.id && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#1A1916' }}>
                Activate v{v.version} for {v.key}? In-progress grounds keep their current version.
              </span>
              <button
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 4, border: 'none',
                  background: '#0C447C', color: 'white', cursor: 'pointer', fontWeight: 600,
                }}
                onClick={() => onConfirm(v.id)}
                disabled={activating}
              >
                Confirm
              </button>
              <button
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid #E2E0DB',
                  background: 'white', color: '#666', cursor: 'pointer',
                }}
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          )}
          <span style={{ fontSize: 12, color: 'var(--gw-muted)', userSelect: 'none' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          <pre style={{
            fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: '#F5F3EF', borderRadius: 4, padding: '10px 12px', margin: 0, maxHeight: 400, overflowY: 'auto',
          }}>
            {v.content}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Draft form ──────────────────────────────────────────────────────────────

function DraftForm({
  activeVersion,
  promptKey,
  onClose,
  onSuccess,
}: {
  activeVersion: PromptVersion
  promptKey: string
  onClose: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const blocks = parseContentBlocks(activeVersion.content, promptKey)

  const editableBlocks = blocks.filter((b) => b.type === 'editable')
  const [editableValues, setEditableValues] = useState<string[]>(
    editableBlocks.map((b) => b.body)
  )
  const [summary, setSummary] = useState('')
  const [invariantError, setInvariantError] = useState<string[] | null>(null)

  const create = useMutation({
    mutationFn: () => {
      const assembled = reassembleContent(blocks, editableValues)
      return promptsApi.create(promptKey, assembled, summary || undefined)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      qc.invalidateQueries({ queryKey: ['prompts', 'by-key', promptKey] })
      toast.success('Draft created — activate it when ready.')
      onSuccess()
    },
    onError: (err: any) => {
      const data = err?.response?.data
      if (data?.error === 'invariant_violation' && Array.isArray(data?.missing)) {
        setInvariantError(data.missing as string[])
      } else {
        toast.error('Failed to create draft.')
      }
    },
  })

  let editIdx = 0

  return (
    <div style={{
      background: 'white', border: '1px solid #E2E0DB', borderRadius: 6,
      padding: '18px 20px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1916' }}>Draft new version</span>
        <button
          style={{ fontSize: 12, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={onClose}
        >
          ✕ Cancel
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setInvariantError(null); create.mutate() }}>
        {/* Change summary */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#1A1916', display: 'block', marginBottom: 4 }}>
            Change summary <span style={{ color: '#E03' }}>*</span>
          </label>
          <input
            style={{
              width: '100%', boxSizing: 'border-box', fontSize: 13,
              border: '1px solid var(--gw-border)', borderRadius: 4, padding: '8px 10px',
              fontFamily: 'inherit',
            }}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What changed and why?"
            required
          />
        </div>

        {/* Content editor — block by block */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#1A1916', display: 'block', marginBottom: 6 }}>
            Content
          </label>
          {blocks.map((block, i) => {
            if (block.type === 'protected') {
              return (
                <div key={i} style={{ marginBottom: 6 }}>
                  {block.header && (
                    <pre style={{
                      fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      background: '#FFF8E7', border: '1px solid #F0C040', borderRadius: 4,
                      padding: '4px 10px', margin: '0 0 2px 0', color: '#8A6C00',
                    }}>
                      {block.header}
                    </pre>
                  )}
                  <div style={{ fontSize: 10, color: '#8A6C00', fontWeight: 600, marginBottom: 2, paddingLeft: 2 }}>
                    🔒 Protected — This section is protected and cannot be edited.
                  </div>
                  <pre style={{
                    fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    background: '#FFF8E7', border: '1px solid #F0C040', borderRadius: 4,
                    padding: '8px 10px', margin: 0,
                  }}>
                    {block.body}
                  </pre>
                </div>
              )
            } else {
              const idx = editIdx++
              const lines = (editableValues[idx] ?? '').split('\n').length
              return (
                <div key={i} style={{ marginBottom: 6 }}>
                  {block.header && (
                    <pre style={{
                      fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      background: '#F5F3EF', borderRadius: 4, padding: '4px 10px', margin: '0 0 2px 0',
                    }}>
                      {block.header}
                    </pre>
                  )}
                  <textarea
                    style={{
                      width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 11,
                      border: '1px solid var(--gw-border)', borderRadius: 4, padding: '8px 10px',
                      resize: 'vertical',
                    }}
                    rows={Math.max(3, lines)}
                    value={editableValues[idx] ?? ''}
                    onChange={(e) => {
                      setEditableValues((prev) => {
                        const next = [...prev]
                        next[idx] = e.target.value
                        return next
                      })
                    }}
                  />
                </div>
              )
            }
          })}
        </div>

        {invariantError && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 4,
            padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#991B1B',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              These protected strings must be present:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {invariantError.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={create.isPending || !summary.trim()}
          style={{
            fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 4,
            border: 'none', background: '#0C447C', color: 'white', cursor: 'pointer',
            opacity: create.isPending || !summary.trim() ? 0.6 : 1,
          }}
        >
          {create.isPending ? 'Creating…' : 'Create draft'}
        </button>
      </form>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function PromptVersioningPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [selectedKey, setSelectedKey] = useState<string>('system')
  const [draftOpen, setDraftOpen] = useState(false)
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null)
  const [confirmActivateId, setConfirmActivateId] = useState<string | null>(null)

  // Fetch all versions to populate sidebar
  const { data: allVersions, isLoading: allLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: promptsApi.list,
    enabled: !!user?.isPlatformAdmin,
    retry: false,
  })

  // Fetch versions for the selected key
  const { data: keyVersions, isLoading: keyLoading } = useQuery({
    queryKey: ['prompts', 'by-key', selectedKey],
    queryFn: () => promptsApi.byKey(selectedKey),
    enabled: !!user?.isPlatformAdmin && !!selectedKey,
    retry: false,
  })

  const activate = useMutation({
    mutationFn: (id: string) => promptsApi.activate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      qc.invalidateQueries({ queryKey: ['prompts', 'by-key', selectedKey] })
      setConfirmActivateId(null)
      toast.success('Version activated')
    },
    onError: () => toast.error('Failed to activate version'),
  })

  // Derive unique sorted keys from all versions
  const uniqueKeys: string[] = allVersions
    ? sortKeys([...new Set(allVersions.map((v) => v.key))])
    : []

  // Get active version badge number per key
  function activeVersionForKey(k: string): number | null {
    if (!allVersions) return null
    const active = allVersions.find((v) => v.key === k && v.isActive)
    if (active) return active.version
    const all = allVersions.filter((v) => v.key === k)
    if (all.length === 0) return null
    return Math.max(...all.map((v) => v.version))
  }

  // Active or latest version in the selected key's list
  const activeVersion = keyVersions
    ? (keyVersions.find((v) => v.isActive) ?? keyVersions[0])
    : null

  // Close draft when key changes
  useEffect(() => {
    setDraftOpen(false)
    setExpandedVersionId(null)
    setConfirmActivateId(null)
  }, [selectedKey])

  if (!user?.isPlatformAdmin) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--gw-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Platform admin access required.</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav header */}
      <div className="gw-hdr">
        <div className="gw-logo">Prompt management</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="gw-back" onClick={() => navigate('/admin')}>Usage dashboard</button>
          <button className="gw-back" onClick={() => navigate('/')}>← Grounds</button>
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{
          width: 220, flexShrink: 0, borderRight: '1px solid #E2E0DB',
          background: 'var(--gw-bg)', overflowY: 'auto', paddingTop: 12,
        }}>
          {allLoading && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', padding: '10px 16px' }}>Loading…</div>
          )}
          {uniqueKeys.map((k) => {
            const isSelected = k === selectedKey
            const activeVer = activeVersionForKey(k)
            return (
              <div
                key={k}
                onClick={() => setSelectedKey(k)}
                style={{
                  padding: '9px 14px',
                  cursor: 'pointer',
                  background: isSelected ? 'white' : 'transparent',
                  borderLeft: isSelected ? '2px solid #0C447C' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 6,
                  transition: 'background 0.1s',
                }}
              >
                <span style={{
                  fontSize: 12, fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? '#0C447C' : '#1A1916',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {k}
                </span>
                {activeVer !== null && (
                  <span style={{
                    fontSize: 10, color: 'var(--gw-muted)', background: '#EDECEA',
                    borderRadius: 8, padding: '1px 6px', flexShrink: 0, fontWeight: 500,
                  }}>
                    v{activeVer}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {keyLoading && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading versions…</div>
          )}

          {!keyLoading && keyVersions && (
            <>
              {/* Panel header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1A1916' }}>{selectedKey}</span>
                  {activeVersion && (
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: '#1A7A4A', background: '#E8F7EF',
                      borderRadius: 10, padding: '3px 10px',
                    }}>
                      v{activeVersion.version} active
                    </span>
                  )}
                </div>
                <button
                  style={{
                    fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 4,
                    border: draftOpen ? '1px solid #E2E0DB' : 'none',
                    background: draftOpen ? 'white' : '#0C447C',
                    color: draftOpen ? '#666' : 'white',
                    cursor: 'pointer',
                  }}
                  onClick={() => setDraftOpen((o) => !o)}
                >
                  {draftOpen ? 'Cancel draft' : 'Draft new version'}
                </button>
              </div>

              {/* Section 1 — Active version content */}
              {activeVersion && !draftOpen && (
                <div style={{
                  background: 'white', border: '1px solid #E2E0DB', borderRadius: 6,
                  padding: '16px 18px', marginBottom: 20,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 10 }}>
                    Active version content
                  </div>
                  <ParsedContentView content={activeVersion.content} promptKey={selectedKey} />
                </div>
              )}

              {/* Section 3 — Draft form (shown above history when open) */}
              {draftOpen && activeVersion && (
                <DraftForm
                  activeVersion={activeVersion}
                  promptKey={selectedKey}
                  onClose={() => setDraftOpen(false)}
                  onSuccess={() => setDraftOpen(false)}
                />
              )}

              {/* Section 2 — Version history */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 10 }}>
                  Version history
                </div>
                {keyVersions.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>No versions found.</div>
                )}
                {keyVersions.map((v) => (
                  <VersionRow
                    key={v.id}
                    v={v}
                    confirmActivateId={confirmActivateId}
                    onActivateClick={(id) => setConfirmActivateId(id)}
                    onConfirm={(id) => activate.mutate(id)}
                    onCancel={() => setConfirmActivateId(null)}
                    activating={activate.isPending}
                    expanded={expandedVersionId === v.id}
                    onToggle={() =>
                      setExpandedVersionId((prev) => (prev === v.id ? null : v.id))
                    }
                  />
                ))}
              </div>
            </>
          )}

          {!keyLoading && !keyVersions && selectedKey && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>
              No versions found for <strong>{selectedKey}</strong>.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
