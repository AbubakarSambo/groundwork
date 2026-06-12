import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/api/client'

export function FeedbackWidget() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [ciText, setCiText] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!isAuthenticated) return null

  async function submit() {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await apiClient.post('/feedback', { text, checkInText: ciText || undefined, email: email || undefined })
    } catch {
      // best-effort — don't block the user
    } finally {
      setSubmitting(false)
      setDone(true)
    }
  }

  function close() {
    setOpen(false)
    setTimeout(() => { setText(''); setCiText(''); setEmail(''); setDone(false) }, 300)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 20, right: 20,
          background: '#0C447C', color: 'white',
          border: 'none', borderRadius: 20, padding: '8px 14px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,.2)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        💬 Share feedback
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) close() }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
            zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div style={{ background: 'white', borderRadius: '12px 12px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#085041', fontWeight: 600, fontSize: 14 }}>
                ✓ Thank you. We read every one of these.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>Share your feedback</div>
                <div style={{ fontSize: 13, color: '#6B6560', marginBottom: 16, lineHeight: 1.5 }}>What went well? What could be better? We read every one of these.</div>

                <label style={{ fontSize: 12, fontWeight: 600, color: '#444441', marginBottom: 6, display: 'block' }}>What happened?</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  maxLength={4000}
                  placeholder="Tell us anything: what worked, what confused you, what you wish existed…"
                  style={{ width: '100%', border: '1px solid #E2E0DB', borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 100, color: '#1A1916', lineHeight: 1.6, boxSizing: 'border-box' }}
                />

                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#444441', marginBottom: 6, display: 'block' }}>
                    Anything about the check-in experience? <span style={{ fontWeight: 400, color: '#9B9590' }}>(optional)</span>
                  </label>
                  <textarea
                    value={ciText}
                    onChange={e => setCiText(e.target.value)}
                    maxLength={2000}
                    placeholder="Did the questions feel useful? Did the feedback feel honest?"
                    style={{ width: '100%', border: '1px solid #E2E0DB', borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 60, color: '#1A1916', lineHeight: 1.6, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#444441', marginBottom: 6, display: 'block' }}>
                    Email if you want a reply <span style={{ fontWeight: 400, color: '#9B9590' }}>(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    style={{ width: '100%', border: '1px solid #E2E0DB', borderRadius: 6, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#1A1916' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={close} style={{ padding: '11px 16px', background: 'none', color: '#6B6560', border: '1px solid #E2E0DB', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  <button onClick={submit} disabled={submitting || !text.trim()} style={{ flex: 1, padding: 11, background: submitting || !text.trim() ? '#B5D4F4' : '#0C447C', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: submitting || !text.trim() ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    {submitting ? 'Sending…' : 'Send feedback'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
