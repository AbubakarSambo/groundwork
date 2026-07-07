import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '@/api/billing'
import { groundsApi } from '@/api/grounds'
import { toast } from 'sonner'

export function BillingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const qc = useQueryClient()

  const groundId = params.get('groundId') ?? undefined

  const [genSessions, setGenSessions] = useState(1)
  const [genNote, setGenNote] = useState('')
  const [newCode, setNewCode] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [sendEmail, setSendEmail] = useState('')
  const [sendSessions, setSendSessions] = useState(5)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const { data: grounds = [], isLoading: groundsLoading } = useQuery({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
  })

  const { data: codes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['contributor-codes'],
    queryFn: billingApi.getContributorCodes,
  })

  const generateCode = useMutation({
    mutationFn: () => billingApi.generateContributorCode(genSessions, genNote.trim() || undefined),
    onSuccess: r => {
      setNewCode(r.code)
      qc.invalidateQueries({ queryKey: ['contributor-codes'] })
      setGenNote('')
    },
    onError: () => toast.error('Could not generate code. Try again.'),
  })

  const sendCode = useMutation({
    mutationFn: () => billingApi.sendContributorCodeToEmail(sendEmail.trim(), sendSessions),
    onSuccess: r => {
      setSentTo(r.email)
      setSendEmail('')
      qc.invalidateQueries({ queryKey: ['contributor-codes'] })
    },
    onError: () => toast.error('Could not send code. Check the email and try again.'),
  })

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  if (groundsLoading || codesLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: '#9B9590' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px 64px' }}>

        <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate(groundId ? `/grounds/${groundId}` : '/grounds')}>
          Back
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', marginBottom: 4 }}>Billing</div>
        <div style={{ fontSize: 13, color: '#6B6560', marginBottom: 28, lineHeight: 1.6 }}>
          Manage sessions for your grounds and generate contributor codes.
        </div>

        {/* Section 1: Your grounds */}
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginBottom: 12 }}>Your grounds</div>

        {grounds.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: 20, marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#9B9590' }}>No active grounds yet.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {grounds.map((g: any) => {
              const balance: number | undefined = (g as any).sessionsBalance
              const isFree: boolean = !!(g as any).isFreeGround
              return (
                <div key={g.id} style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.label}</div>
                    <div style={{ marginTop: 4 }}>
                      {isFree ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#E7F6EF', color: '#085041' }}>Free ground</span>
                      ) : balance !== undefined ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: balance > 0 ? '#EEF4FB' : '#F8ECEA',
                          color: balance > 0 ? '#0C447C' : '#B5675A',
                        }}>
                          {balance} session{balance !== 1 ? 's' : ''} left
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {!isFree && (
                    <button
                      onClick={() => navigate('/billing/payment', { state: { groundId: g.id, groundName: g.label } })}
                      style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Add sessions
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Section 2: Contributor codes */}
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginBottom: 12 }}>Contributor codes</div>

        {/* Existing codes list */}
        {codes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {codes.map((c: any) => (
              <div key={c.code} style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#0A1628', letterSpacing: '.05em' }}>{c.code}</span>
                  <button
                    onClick={() => copyToClipboard(c.code)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, border: '1px solid #E2E0DB', background: copied === c.code ? '#E7F6EF' : 'white', color: copied === c.code ? '#085041' : '#6B6560', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    {copied === c.code ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#6B6560' }}>
                  {c.sessionsGranted} session{c.sessionsGranted !== 1 ? 's' : ''} granted, {c.sessionsUsed ?? 0} used
                  {c.note ? ` · ${c.note}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Send a code by email */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', marginBottom: 12 }}>Send access code by email</div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6560', marginBottom: 5 }}>Recipient email</label>
            <input
              type="email"
              value={sendEmail}
              onChange={e => { setSendEmail(e.target.value); setSentTo(null) }}
              placeholder="name@example.com"
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: '1px solid #E2E0DB', borderRadius: 7, background: '#F5F3EF', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6560', marginBottom: 5 }}>Sessions to grant</label>
            <input
              type="number"
              min={1}
              max={20}
              value={sendSessions}
              onChange={e => setSendSessions(Math.min(20, Math.max(1, Number(e.target.value))))}
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: '1px solid #E2E0DB', borderRadius: 7, background: '#F5F3EF', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={() => sendCode.mutate()}
            disabled={sendCode.isPending || !sendEmail.trim()}
            style={{ width: '100%', padding: '10px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: (sendCode.isPending || !sendEmail.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: (sendCode.isPending || !sendEmail.trim()) ? 0.5 : 1 }}
          >
            {sendCode.isPending ? 'Sending...' : 'Send code'}
          </button>

          {sentTo && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#085041', background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 7, padding: '10px 14px' }}>
              Code sent to {sentTo}
            </div>
          )}
        </div>

        {/* Generate a code form */}
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', marginBottom: 12 }}>Generate a code</div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6560', marginBottom: 5 }}>Sessions to grant</label>
            <input
              type="number"
              min={1}
              max={10}
              value={genSessions}
              onChange={e => setGenSessions(Math.min(10, Math.max(1, Number(e.target.value))))}
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: '1px solid #E2E0DB', borderRadius: 7, background: '#F5F3EF', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6560', marginBottom: 5 }}>Note (optional)</label>
            <input
              type="text"
              value={genNote}
              onChange={e => setGenNote(e.target.value)}
              placeholder="e.g. for the product team"
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: '1px solid #E2E0DB', borderRadius: 7, background: '#F5F3EF', color: '#0A1628', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={() => { setNewCode(null); generateCode.mutate() }}
            disabled={generateCode.isPending}
            style={{ width: '100%', padding: '10px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: generateCode.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: generateCode.isPending ? 0.7 : 1 }}
          >
            {generateCode.isPending ? 'Generating...' : 'Generate'}
          </button>

          {newCode && (
            <div style={{ marginTop: 14, background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#085041', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>New code</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: '#085041', letterSpacing: '.08em' }}>{newCode}</span>
                <button
                  onClick={() => copyToClipboard(newCode)}
                  style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 6, border: '1px solid #B6E8D4', background: copied === newCode ? '#085041' : 'white', color: copied === newCode ? 'white' : '#085041', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                >
                  {copied === newCode ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
