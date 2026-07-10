import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { promptsApi, PromptVersion, ChatTurn } from '@/api/prompts'
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
  "This is held separately from the other party's version.",
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
  if (promptKey.startsWith('scenario.') && bodyText.includes(SCENARIO_PROTECTED_PHRASE)) return true
  return false
}

// ─── Content block parsing ───────────────────────────────────────────────────

interface ContentBlock {
  type: 'protected' | 'editable'
  header: string
  body: string
}

const SEP_RE = /^═{3,}.*═{3,}$/m

function parseContentBlocks(content: string, promptKey: string): ContentBlock[] {
  const lines = content.split('\n')
  const blocks: ContentBlock[] = []
  let currentHeader = ''
  let currentLines: string[] = []

  for (const line of lines) {
    if (SEP_RE.test(line.trim())) {
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
    if (block.header !== '') parts.push(block.header)
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
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Simple line diff ────────────────────────────────────────────────────────

interface DiffLine { type: 'same' | 'removed' | 'added'; text: string }

function diffLines(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const result: DiffLine[] = []

  // LCS-based diff
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  let i = 0, j = 0
  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      result.push({ type: 'same', text: oldLines[i] })
      i++; j++
    } else if (j < n && (i >= m || dp[i + 1][j] <= dp[i][j + 1])) {
      result.push({ type: 'added', text: newLines[j] })
      j++
    } else {
      result.push({ type: 'removed', text: oldLines[i] })
      i++
    }
  }
  return result
}

// ─── Protected block display ─────────────────────────────────────────────────

function ProtectedBlock({ header, body }: { header: string; body: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      {header && (
        <pre style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#FFF8E7', border: '1px solid #F0C040', borderRadius: 4, padding: '4px 10px', margin: '0 0 2px 0', color: '#8A6C00' }}>
          {header}
        </pre>
      )}
      <div style={{ fontSize: 10, color: '#8A6C00', fontWeight: 600, marginBottom: 2, paddingLeft: 2 }}>🔒 Protected</div>
      <pre style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#FFF8E7', border: '1px solid #F0C040', borderRadius: 4, padding: '8px 10px', margin: 0 }}>
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
        block.type === 'protected' ? (
          <ProtectedBlock key={i} header={block.header} body={block.body} />
        ) : (
          <div key={i} style={{ marginBottom: 6 }}>
            {block.header && (
              <pre style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#F5F3EF', borderRadius: 4, padding: '4px 10px', margin: '0 0 2px 0' }}>
                {block.header}
              </pre>
            )}
            <pre style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#F5F3EF', borderRadius: 4, padding: '8px 10px', margin: 0 }}>
              {block.body}
            </pre>
          </div>
        )
      )}
    </div>
  )
}

// ─── Diff view ───────────────────────────────────────────────────────────────

function DiffView({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const lines = diffLines(oldContent, newContent)
  const hasChanges = lines.some(l => l.type !== 'same')
  if (!hasChanges) return <div style={{ fontSize: 12, color: 'var(--gw-muted)', padding: '8px 0' }}>No changes from active version.</div>

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5, borderRadius: 4, overflow: 'hidden', border: '1px solid #E2E0DB' }}>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            padding: '1px 10px',
            background: line.type === 'added' ? '#E8F7EF' : line.type === 'removed' ? '#FEECEC' : 'white',
            color: line.type === 'added' ? '#1A7A4A' : line.type === 'removed' ? '#991B1B' : '#1A1916',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            borderLeft: `3px solid ${line.type === 'added' ? '#5DCAA5' : line.type === 'removed' ? '#F87171' : 'transparent'}`,
          }}
        >
          <span style={{ userSelect: 'none', opacity: 0.5, marginRight: 8 }}>
            {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
          </span>
          {line.text}
        </div>
      ))}
    </div>
  )
}

// ─── Version history row ─────────────────────────────────────────────────────

function VersionRow({
  v,
  activeContent,
  confirmActivateId,
  onActivateClick,
  onConfirm,
  onCancel,
  activating,
  expanded,
  onToggle,
}: {
  v: PromptVersion
  activeContent: string | null
  confirmActivateId: string | null
  onActivateClick: (id: string) => void
  onConfirm: (id: string) => void
  onCancel: () => void
  activating: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const [showDiff, setShowDiff] = useState(false)

  return (
    <div style={{ border: '1px solid #E2E0DB', borderRadius: 6, marginBottom: 6, overflow: 'hidden', background: 'white' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1916', flexShrink: 0 }}>v{v.version}</span>
          {v.isActive && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1A7A4A', background: '#E8F7EF', borderRadius: 10, padding: '2px 8px', flexShrink: 0 }}>Active</span>
          )}
          {v.isDraft && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8A5C1A', background: '#FDF3E3', borderRadius: 10, padding: '2px 8px', flexShrink: 0 }}>Draft</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--gw-muted)', flexShrink: 0 }}>{fmtDate(v.activatedAt ?? v.createdAt)}</span>
          {v.activatedBy && (
            <span style={{ fontSize: 11, color: 'var(--gw-muted)', flexShrink: 0 }}>by {v.activatedBy}</span>
          )}
          {v.summary && (
            <span style={{ fontSize: 11, color: 'var(--gw-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              - {v.summary}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {!v.isActive && confirmActivateId !== v.id && (
            <button
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid #0C447C', background: 'white', color: '#0C447C', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => onActivateClick(v.id)}
              disabled={activating}
            >
              Activate
            </button>
          )}
          {confirmActivateId === v.id && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#1A1916' }}>
                Activate v{v.version}? In-progress grounds keep their version.
              </span>
              <button
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: 'none', background: '#0C447C', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => onConfirm(v.id)}
                disabled={activating}
              >
                Confirm
              </button>
              <button
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid #E2E0DB', background: 'white', color: '#666', cursor: 'pointer' }}
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          )}
          <span style={{ fontSize: 12, color: 'var(--gw-muted)', userSelect: 'none' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {/* Diff toggle - only show for non-active versions when there's an active to compare to */}
          {!v.isActive && activeContent && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 4, border: '1px solid #E2E0DB', background: showDiff ? '#0C447C' : 'white', color: showDiff ? 'white' : '#666', cursor: 'pointer' }}
                onClick={() => setShowDiff(false)}
              >
                Content
              </button>
              <button
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 4, border: '1px solid #E2E0DB', background: showDiff ? 'white' : 'white', color: !showDiff ? '#666' : '#0C447C', cursor: 'pointer', borderColor: showDiff ? '#0C447C' : '#E2E0DB' }}
                onClick={() => setShowDiff(true)}
              >
                Diff vs active
              </button>
            </div>
          )}
          {showDiff && activeContent ? (
            <DiffView oldContent={activeContent} newContent={v.content} />
          ) : (
            <pre style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#F5F3EF', borderRadius: 4, padding: '10px 12px', margin: 0, maxHeight: 400, overflowY: 'auto' }}>
              {v.content}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Draft editor ─────────────────────────────────────────────────────────────

function DraftEditor({
  draft,
  activeVersion,
  promptKey,
  onPublish,
  onDiscard,
}: {
  draft: PromptVersion
  activeVersion: PromptVersion | null
  promptKey: string
  onPublish: () => void
  onDiscard: () => void
}) {
  const qc = useQueryClient()
  const blocks = parseContentBlocks(activeVersion?.content ?? draft.content, promptKey)
  const draftBlocks = parseContentBlocks(draft.content, promptKey)

  const draftEditableBlocks = draftBlocks.filter((b) => b.type === 'editable')

  const [editableValues, setEditableValues] = useState<string[]>(
    draftEditableBlocks.map((b) => b.body)
  )
  const [summary, setSummary] = useState(draft.summary ?? '')
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [invariantError, setInvariantError] = useState<string[] | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useMutation({
    mutationFn: () => {
      const assembled = reassembleContent(blocks, editableValues)
      return promptsApi.upsertDraft(promptKey, assembled, summary || undefined)
    },
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts', 'draft', promptKey] })
      qc.invalidateQueries({ queryKey: ['prompts', 'by-key', promptKey] })
      setSaveStatus('saved')
      setInvariantError(null)
    },
    onError: (err: any) => {
      setSaveStatus('unsaved')
      const data = err?.response?.data
      if (data?.error === 'invariant_violation' && Array.isArray(data?.missing)) {
        setInvariantError(data.missing as string[])
      } else {
        toast.error('Failed to save draft.')
      }
    },
  })

  const activate = useMutation({
    mutationFn: () => promptsApi.activate(draft.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      qc.invalidateQueries({ queryKey: ['prompts', 'by-key', promptKey] })
      qc.invalidateQueries({ queryKey: ['prompts', 'draft', promptKey] })
      toast.success('Draft published - live for new conversations.')
      setConfirmPublish(false)
      onPublish()
    },
    onError: () => toast.error('Failed to publish draft.'),
  })

  const discard = useMutation({
    mutationFn: () => promptsApi.discardDraft(promptKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts', 'by-key', promptKey] })
      qc.invalidateQueries({ queryKey: ['prompts', 'draft', promptKey] })
      toast.success('Draft discarded.')
      onDiscard()
    },
    onError: () => toast.error('Failed to discard draft.'),
  })

  // Auto-save on change with debounce
  const scheduleAutoSave = useCallback(() => {
    setSaveStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save.mutate(), 1200)
  }, [save])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  let editIdx = 0

  return (
    <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1916' }}>Draft - v{draft.version}</span>
          <span style={{ fontSize: 11, color: saveStatus === 'saved' ? '#1A7A4A' : saveStatus === 'saving' ? '#8A6C00' : '#991B1B' }}>
            {saveStatus === 'saved' ? '● Saved' : saveStatus === 'saving' ? '○ Saving…' : '○ Unsaved'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!confirmPublish ? (
            <>
              <button
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 4, border: '1px solid #E2E0DB', background: 'white', color: '#991B1B', cursor: 'pointer' }}
                onClick={() => discard.mutate()}
                disabled={discard.isPending}
              >
                {discard.isPending ? 'Discarding…' : 'Discard draft'}
              </button>
              <button
                style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 4, border: 'none', background: '#0C447C', color: 'white', cursor: 'pointer', opacity: saveStatus === 'unsaved' ? 0.6 : 1 }}
                onClick={() => setConfirmPublish(true)}
                disabled={saveStatus === 'unsaved' || save.isPending}
                title={saveStatus === 'unsaved' ? 'Save changes before publishing' : ''}
              >
                Publish draft →
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF9EC', border: '1px solid #F0C040', borderRadius: 4, padding: '6px 12px' }}>
              <span style={{ fontSize: 12, color: '#8A6C00' }}>Publish v{draft.version} live for new conversations?</span>
              <button
                style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 4, border: 'none', background: '#0C447C', color: 'white', cursor: 'pointer' }}
                onClick={() => activate.mutate()}
                disabled={activate.isPending}
              >
                {activate.isPending ? 'Publishing…' : 'Confirm'}
              </button>
              <button
                style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, border: '1px solid #E2E0DB', background: 'white', color: '#666', cursor: 'pointer' }}
                onClick={() => setConfirmPublish(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Change summary */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#1A1916', display: 'block', marginBottom: 4 }}>
          Change summary
        </label>
        <input
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 4, padding: '8px 10px', fontFamily: 'inherit' }}
          value={summary}
          onChange={(e) => { setSummary(e.target.value); scheduleAutoSave() }}
          placeholder="What changed and why?"
        />
      </div>

      {/* Block editor */}
      <div>
        {blocks.map((block, i) => {
          if (block.type === 'protected') {
            return (
              <div key={i} style={{ marginBottom: 6 }}>
                {block.header && (
                  <pre style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#FFF8E7', border: '1px solid #F0C040', borderRadius: 4, padding: '4px 10px', margin: '0 0 2px 0', color: '#8A6C00' }}>
                    {block.header}
                  </pre>
                )}
                <div style={{ fontSize: 10, color: '#8A6C00', fontWeight: 600, marginBottom: 2, paddingLeft: 2 }}>
                  🔒 Protected - cannot be edited here.
                </div>
                <pre style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#FFF8E7', border: '1px solid #F0C040', borderRadius: 4, padding: '8px 10px', margin: 0 }}>
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
                  <pre style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#F5F3EF', borderRadius: 4, padding: '4px 10px', margin: '0 0 2px 0' }}>
                    {block.header}
                  </pre>
                )}
                <textarea
                  style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 11, border: '1px solid var(--gw-border)', borderRadius: 4, padding: '8px 10px', resize: 'vertical' }}
                  rows={Math.max(3, lines)}
                  value={editableValues[idx] ?? ''}
                  onChange={(e) => {
                    setEditableValues((prev) => {
                      const next = [...prev]
                      next[idx] = e.target.value
                      return next
                    })
                    scheduleAutoSave()
                  }}
                />
              </div>
            )
          }
        })}
      </div>

      {invariantError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 4, padding: '10px 14px', marginTop: 12, fontSize: 12, color: '#991B1B' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>These protected strings must be present:</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {invariantError.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Test runner ─────────────────────────────────────────────────────────────

function TestRunner({ version, promptKey }: { version: PromptVersion; promptKey: string }) {
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages])

  async function send() {
    const content = input.trim()
    if (!content || loading) return
    setInput('')
    const next: ChatTurn[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await promptsApi.testChat(version.id, next)
      setMessages([...next, { role: 'assistant', content: res.reply }])
    } catch {
      toast.error('Test chat failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 500 }}>
      {/* Banner */}
      <div style={{ background: '#FDF3E3', borderBottom: '1px solid #F0C040', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#8A6C00' }}>
          TEST MODE - {version.isDraft ? `Draft v${version.version}` : `v${version.version} (active)`} · {promptKey}
        </span>
        <span style={{ fontSize: 11, color: '#8A6C00' }}>Not a real conversation · No data written</span>
      </div>

      {/* Messages */}
      <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: '20px 0' }}>
            Send a message to test this prompt version.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: '80%',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? 'var(--gw-navy)' : '#F5F3EF',
              color: m.role === 'user' ? 'white' : 'var(--gw-text)',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '8px 12px',
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: '#F5F3EF', borderRadius: '16px 16px 16px 4px', padding: '8px 12px', fontSize: 13, color: 'var(--gw-muted)' }}>…</div>
        )}
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid var(--gw-border)', padding: '10px 14px', display: 'flex', gap: 8 }}>
        <textarea
          style={{ flex: 1, resize: 'none', height: 36, padding: '6px 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none' }}
          placeholder="Type a test message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ padding: '0 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 16, height: 36, opacity: loading || !input.trim() ? 0.5 : 1 }}
        >
          ↑
        </button>
        <button
          onClick={() => setMessages([])}
          style={{ padding: '0 10px', borderRadius: 6, background: 'white', color: 'var(--gw-muted)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 11, height: 36 }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function PromptVersioningPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [selectedKey, setSelectedKey] = useState<string>('system')
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null)
  const [confirmActivateId, setConfirmActivateId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<'view' | 'draft' | 'test'>('view')

  const { data: allVersions, isLoading: allLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: promptsApi.list,
    enabled: !!user?.isPlatformAdmin,
    retry: false,
  })

  const { data: keyVersions, isLoading: keyLoading } = useQuery({
    queryKey: ['prompts', 'by-key', selectedKey],
    queryFn: () => promptsApi.byKey(selectedKey),
    enabled: !!user?.isPlatformAdmin && !!selectedKey,
    retry: false,
  })

  const { data: draft, isLoading: draftLoading } = useQuery({
    queryKey: ['prompts', 'draft', selectedKey],
    queryFn: () => promptsApi.getDraft(selectedKey),
    enabled: !!user?.isPlatformAdmin && !!selectedKey,
    retry: false,
  })

  const activate = useMutation({
    mutationFn: (id: string) => promptsApi.activate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      qc.invalidateQueries({ queryKey: ['prompts', 'by-key', selectedKey] })
      qc.invalidateQueries({ queryKey: ['prompts', 'draft', selectedKey] })
      setConfirmActivateId(null)
      toast.success('Version activated')
    },
    onError: () => toast.error('Failed to activate version'),
  })

  const startDraft = useMutation({
    mutationFn: () => promptsApi.upsertDraft(selectedKey, activeVersion?.content ?? '', 'Draft started'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts', 'draft', selectedKey] })
      qc.invalidateQueries({ queryKey: ['prompts', 'by-key', selectedKey] })
      setActivePanel('draft')
    },
    onError: () => toast.error('Failed to start draft.'),
  })

  const uniqueKeys: string[] = allVersions
    ? sortKeys([...new Set(allVersions.map((v) => v.key))])
    : []

  function activeVersionForKey(k: string): number | null {
    if (!allVersions) return null
    const active = allVersions.find((v) => v.key === k && v.isActive)
    return active?.version ?? null
  }

  function hasDraftForKey(k: string): boolean {
    if (!allVersions) return false
    return allVersions.some((v) => v.key === k && v.isDraft)
  }

  const activeVersion = keyVersions
    ? (keyVersions.find((v) => v.isActive) ?? null)
    : null

  const historyVersions = keyVersions
    ? keyVersions.filter((v) => !v.isDraft)
    : []

  useEffect(() => {
    setExpandedVersionId(null)
    setConfirmActivateId(null)
    setActivePanel('view')
  }, [selectedKey])

  // Switch to draft panel when draft exists and panel is view
  useEffect(() => {
    if (draft && activePanel === 'view') setActivePanel('draft')
    if (!draft && activePanel === 'draft') setActivePanel('view')
  }, [draft])

  const testVersion = draft ?? activeVersion

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="gw-back" onClick={() => navigate('/prompts/test')}>Test panel →</button>
          <button className="gw-back" onClick={() => navigate('/admin')}>Usage dashboard</button>
          <button className="gw-back" onClick={() => navigate('/')}>← Grounds</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid #E2E0DB', background: 'var(--gw-bg)', overflowY: 'auto', paddingTop: 12 }}>
          {allLoading && <div style={{ fontSize: 12, color: 'var(--gw-muted)', padding: '10px 16px' }}>Loading…</div>}
          {uniqueKeys.map((k) => {
            const isSelected = k === selectedKey
            const activeVer = activeVersionForKey(k)
            const hasDraft = hasDraftForKey(k)
            return (
              <div
                key={k}
                onClick={() => setSelectedKey(k)}
                style={{
                  padding: '9px 14px', cursor: 'pointer',
                  background: isSelected ? 'white' : 'transparent',
                  borderLeft: isSelected ? '2px solid #0C447C' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#0C447C' : '#1A1916', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {k}
                </span>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {hasDraft && <span style={{ fontSize: 9, fontWeight: 700, color: '#8A6C00', background: '#FDF3E3', borderRadius: 6, padding: '1px 5px' }}>draft</span>}
                  {activeVer !== null && (
                    <span style={{ fontSize: 10, color: 'var(--gw-muted)', background: '#EDECEA', borderRadius: 8, padding: '1px 6px', fontWeight: 500 }}>v{activeVer}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {(keyLoading || draftLoading) && <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>}

          {!keyLoading && !draftLoading && (
            <>
              {/* Panel header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1A1916' }}>{selectedKey}</span>
                  {activeVersion && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1A7A4A', background: '#E8F7EF', borderRadius: 10, padding: '3px 10px' }}>
                      v{activeVersion.version} active
                    </span>
                  )}
                  {draft && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#8A5C1A', background: '#FDF3E3', borderRadius: 10, padding: '3px 10px' }}>
                      draft v{draft.version}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {/* Panel tabs */}
                  {(['view', 'draft', 'test'] as const).map((tab) => {
                    if (tab === 'draft' && !draft) return null
                    if (tab === 'test' && !testVersion) return null
                    const labels = { view: 'Active', draft: 'Edit draft', test: 'Test' }
                    return (
                      <button
                        key={tab}
                        onClick={() => setActivePanel(tab)}
                        style={{
                          fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 4, border: '1px solid #E2E0DB', cursor: 'pointer',
                          background: activePanel === tab ? '#0C447C' : 'white',
                          color: activePanel === tab ? 'white' : '#666',
                        }}
                      >
                        {labels[tab]}
                      </button>
                    )
                  })}
                  {!draft && activeVersion && (
                    <button
                      onClick={() => startDraft.mutate()}
                      disabled={startDraft.isPending}
                      style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 4, border: 'none', background: '#0C447C', color: 'white', cursor: 'pointer' }}
                    >
                      {startDraft.isPending ? 'Starting…' : 'Start draft'}
                    </button>
                  )}
                </div>
              </div>

              {/* Active version view */}
              {activePanel === 'view' && activeVersion && (
                <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px 18px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 10 }}>Active version content</div>
                  <ParsedContentView content={activeVersion.content} promptKey={selectedKey} />
                </div>
              )}

              {/* Draft editor */}
              {activePanel === 'draft' && draft && (
                <DraftEditor
                  draft={draft}
                  activeVersion={activeVersion}
                  promptKey={selectedKey}
                  onPublish={() => setActivePanel('view')}
                  onDiscard={() => setActivePanel('view')}
                />
              )}

              {/* Test runner */}
              {activePanel === 'test' && testVersion && (
                <TestRunner version={testVersion} promptKey={selectedKey} />
              )}

              {/* Version history - always shown below the active panel */}
              <div style={{ marginTop: activePanel === 'view' ? 0 : 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 10 }}>Version history</div>
                {historyVersions.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>No versions found.</div>
                )}
                {historyVersions.map((v) => (
                  <VersionRow
                    key={v.id}
                    v={v}
                    activeContent={activeVersion?.content ?? null}
                    confirmActivateId={confirmActivateId}
                    onActivateClick={(id) => setConfirmActivateId(id)}
                    onConfirm={(id) => activate.mutate(id)}
                    onCancel={() => setConfirmActivateId(null)}
                    activating={activate.isPending}
                    expanded={expandedVersionId === v.id}
                    onToggle={() => setExpandedVersionId((prev) => (prev === v.id ? null : v.id))}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
