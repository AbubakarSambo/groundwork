import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { promptsApi } from '@/api/prompts'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

const DEFAULT_PROMPT = `CHECK-IN MODE. You are running a Groundwork check-in. Respond first, reflect back one specific thing the person said, then ask one question. One question only, never a list.

Keep replies short and human. Plain language. Do not use dashes of any kind. Use straight quotes. Never tell anyone who is right.

PRIVACY. Each person's account is private. Others never see it until everyone activates the report together.

MULTIPLE PEOPLE. A situation may involve more than one other person. Frame the record as a foundation that one or several people check in against.

Across the conversation develop, one exchange at a time: the situation, who is involved, goals in the person's own words, what they are responsible for, what they expect, and any documents or evidence.`

type Turn = { role: 'user' | 'assistant'; content: string }
type LaneKey = 'admin' | 'p1' | 'p2'

interface Lane {
  label: string
  messages: Turn[]
  input: string
  doc: string | null
  docName: string | null
  loading: boolean
}

function makeLane(label: string): Lane {
  return { label, messages: [], input: '', doc: null, docName: null, loading: false }
}

function ChatBubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        maxWidth: '85%', padding: '8px 11px', borderRadius: isUser ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
        background: isUser ? '#0C447C' : 'white',
        color: isUser ? 'white' : '#1A1916',
        fontSize: 12, lineHeight: 1.55,
        border: isUser ? 'none' : '0.5px solid #E2E0DB',
        whiteSpace: 'pre-wrap',
      }}>
        {turn.content}
      </div>
    </div>
  )
}

function ConversationLane({
  laneKey,
  lane,
  systemPrompt,
  onMessagesChange,
  onInputChange,
  onClear,
  onDoc,
}: {
  laneKey: LaneKey
  lane: Lane
  systemPrompt: string
  onMessagesChange: (key: LaneKey, msgs: Turn[]) => void
  onInputChange: (key: LaneKey, val: string) => void
  onClear: (key: LaneKey) => void
  onDoc: (key: LaneKey, content: string, name: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [lane.messages, lane.loading])

  const sendMutation = useMutation({
    mutationFn: ({ msgs }: { msgs: Turn[] }) => {
      const effectivePrompt = lane.doc
        ? `${systemPrompt}\n\nDOCUMENT CONTEXT:\n${lane.doc}`
        : systemPrompt
      return promptsApi.testChat(effectivePrompt, msgs)
    },
    onSuccess: (res, { msgs }) => {
      const updated = [...msgs, { role: 'assistant' as const, content: res.reply }]
      onMessagesChange(laneKey, updated)
      onInputChange(laneKey, '')
    },
    onError: () => toast.error(`${lane.label}: message failed.`),
  })

  function send() {
    const text = lane.input.trim()
    if (!text || sendMutation.isPending) return
    const msgs: Turn[] = [...lane.messages, { role: 'user', content: text }]
    onMessagesChange(laneKey, msgs)
    sendMutation.mutate({ msgs })
  }

  function handleDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      onDoc(laneKey, text, file.name)
      toast.success(`${file.name} attached to ${lane.label}`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const ACCENT = laneKey === 'admin' ? '#0C447C' : laneKey === 'p1' ? '#5DCAA5' : '#E8A94A'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, background: '#F5F3EF', borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E0DB' }}>

      {/* Lane header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E2E0DB', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1916' }}>{lane.label}</span>
          {lane.docName && (
            <span style={{ fontSize: 10, color: '#6B6560', background: '#EEF4FB', borderRadius: 4, padding: '1px 6px', border: '0.5px solid #BFDBFE' }}>
              {lane.docName}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach a text document to this lane"
            style={{ fontSize: 11, color: '#6B6560', background: 'none', border: '0.5px solid #E2E0DB', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Doc
          </button>
          <button
            onClick={() => onClear(laneKey)}
            style={{ fontSize: 11, color: '#9B9590', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '3px 6px' }}
          >
            Clear
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".txt,.md,.csv" style={{ display: 'none' }} onChange={handleDoc} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px', minHeight: 260, maxHeight: 380 }}>
        {lane.messages.length === 0 && !sendMutation.isPending && (
          <div style={{ fontSize: 12, color: '#9B9590', textAlign: 'center', paddingTop: 40 }}>
            Type as the {lane.label.toLowerCase()}
          </div>
        )}
        {lane.messages.map((m, i) => <ChatBubble key={i} turn={m} />)}
        {sendMutation.isPending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#9B9590', background: 'white', border: '0.5px solid #E2E0DB', borderRadius: '10px 10px 10px 3px', padding: '8px 11px' }}>…</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid #E2E0DB', background: 'white', padding: '8px 10px', display: 'flex', gap: 7, alignItems: 'flex-end' }}>
        <textarea
          value={lane.input}
          onChange={e => onInputChange(laneKey, e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`Type as the ${lane.label.toLowerCase()}…`}
          rows={2}
          style={{ flex: 1, resize: 'none', fontSize: 12, fontFamily: 'inherit', border: '0.5px solid #E2E0DB', borderRadius: 6, padding: '7px 9px', lineHeight: 1.5, color: '#1A1916' }}
        />
        <button
          onClick={send}
          disabled={!lane.input.trim() || sendMutation.isPending}
          style={{
            padding: '8px 12px', borderRadius: 6, background: ACCENT, color: 'white',
            fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            opacity: (!lane.input.trim() || sendMutation.isPending) ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}

export function PromptTestPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT)
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [session, setSession] = useState<'1'>('1')
  const [report, setReport] = useState<{ crossReference: string; p1Report: string; p2Report: string } | null>(null)
  const [reportTab, setReportTab] = useState<'cross' | 'p1' | 'p2'>('cross')

  const [lanes, setLanes] = useState<Record<LaneKey, Lane>>({
    admin: makeLane('Admin'),
    p1:    makeLane('Participant 1'),
    p2:    makeLane('Participant 2'),
  })

  function setMessages(key: LaneKey, msgs: Turn[]) {
    setLanes(prev => ({ ...prev, [key]: { ...prev[key], messages: msgs } }))
  }
  function setInput(key: LaneKey, val: string) {
    setLanes(prev => ({ ...prev, [key]: { ...prev[key], input: val } }))
  }
  function clearLane(key: LaneKey) {
    setLanes(prev => ({ ...prev, [key]: { ...prev[key], messages: [], input: '' } }))
    setReport(null)
  }
  function setDoc(key: LaneKey, content: string, name: string) {
    setLanes(prev => ({ ...prev, [key]: { ...prev[key], doc: content, docName: name } }))
  }

  const generateReport = useMutation({
    mutationFn: () => promptsApi.testReport(
      systemPrompt,
      lanes.admin.messages,
      lanes.p1.messages,
      lanes.p2.messages,
    ),
    onSuccess: r => { setReport(r); setReportTab('cross') },
    onError: () => toast.error('Report generation failed. Check the model connection.'),
  })

  const hasEnoughData = [lanes.admin, lanes.p1, lanes.p2].some(l => l.messages.length >= 2)

  if (!user?.isPlatformAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: '#9B9590' }}>Platform admin access required.</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#F5F3EF', borderBottom: '1px solid #E2E0DB' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/prompts')} style={{ fontSize: 12, color: '#9B9590', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>← Back</button>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0A1628' }}>Prompt test panel</span>
          </div>
          <button onClick={() => navigate('/admin')} style={{ fontSize: 12, color: '#9B9590', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Ops dashboard</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '16px 16px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Description */}
        <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.65 }}>
          Edit the check-in prompt below, then run it across an admin and two participants. Each lane keeps its own conversation and uses the prompt exactly as edited here, so you can change the engine and see the effect on all three roles at once. Attach a document to any lane, and generate the reports from the conversations below.
        </div>

        {/* Prompt engine */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: editingPrompt ? '1px solid #E2E0DB' : 'none' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1916' }}>Prompt engine</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setSystemPrompt(DEFAULT_PROMPT); setEditingPrompt(false) }}
                style={{ fontSize: 11, color: '#9B9590', background: 'none', border: '0.5px solid #E2E0DB', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Reset to default
              </button>
              <button
                onClick={() => setEditingPrompt(e => !e)}
                style={{ fontSize: 11, color: '#0C447C', background: 'none', border: '0.5px solid #0C447C', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >
                {editingPrompt ? 'Done' : 'Edit'}
              </button>
            </div>
          </div>
          {editingPrompt ? (
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6, border: 'none', padding: '12px 14px', resize: 'vertical', minHeight: 200, color: '#1A1916', outline: 'none' }}
            />
          ) : (
            <pre style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6, padding: '12px 14px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#4A4540', maxHeight: 160, overflowY: 'auto' }}>
              {systemPrompt}
            </pre>
          )}
        </div>

        {/* Three conversation lanes */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
          {(['admin', 'p1', 'p2'] as LaneKey[]).map(key => (
            <ConversationLane
              key={key}
              laneKey={key}
              lane={lanes[key]}
              systemPrompt={systemPrompt}
              onMessagesChange={setMessages}
              onInputChange={setInput}
              onClear={clearLane}
              onDoc={setDoc}
            />
          ))}
        </div>

        {/* Report generation */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>Report generation</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#6B6560' }}>Session</span>
                <select
                  value={session}
                  onChange={e => setSession(e.target.value as '1')}
                  style={{ fontSize: 11, border: '0.5px solid #E2E0DB', borderRadius: 4, padding: '2px 6px', fontFamily: 'inherit', background: 'white', color: '#1A1916' }}
                >
                  <option value="1">1 (cross reference)</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => generateReport.mutate()}
              disabled={generateReport.isPending || !hasEnoughData}
              style={{
                padding: '10px 18px', borderRadius: 7, background: '#0A1628', color: 'white',
                fontSize: 13, fontWeight: 700, border: 'none', cursor: generateReport.isPending || !hasEnoughData ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: generateReport.isPending || !hasEnoughData ? 0.5 : 1,
              }}
            >
              {generateReport.isPending ? 'Generating…' : 'Generate reports'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#9B9590', lineHeight: 1.6 }}>
            Builds the advice-led reports from the conversations above: the admin cross reference across all lanes, and each participant's own insight. Needs a connected model — the demo responder does not return report JSON.
          </div>
        </div>

        {/* Report output */}
        {report && (
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E0DB' }}>
              {([
                { id: 'cross', label: 'Cross reference (admin)' },
                { id: 'p1',    label: 'Participant 1' },
                { id: 'p2',    label: 'Participant 2' },
              ] as { id: typeof reportTab; label: string }[]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setReportTab(id)}
                  style={{
                    flex: '0 0 auto', padding: '9px 16px', fontSize: 12,
                    fontWeight: reportTab === id ? 700 : 500,
                    color: reportTab === id ? '#0C447C' : '#6B6560',
                    background: 'none', border: 'none',
                    borderBottom: reportTab === id ? '2px solid #0C447C' : '2px solid transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: '16px 18px' }}>
              {reportTab === 'cross' && (
                <pre style={{ fontFamily: 'inherit', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, color: '#1A1916' }}>
                  {report.crossReference || 'No cross reference generated.'}
                </pre>
              )}
              {reportTab === 'p1' && (
                <pre style={{ fontFamily: 'inherit', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, color: '#1A1916' }}>
                  {report.p1Report || 'No participant 1 report generated.'}
                </pre>
              )}
              {reportTab === 'p2' && (
                <pre style={{ fontFamily: 'inherit', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, color: '#1A1916' }}>
                  {report.p2Report || 'No participant 2 report generated.'}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
