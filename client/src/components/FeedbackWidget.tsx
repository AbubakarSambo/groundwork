import { useState, useEffect, useRef } from 'react'
import { feedbackApi } from '../api/feedback'

type Tab = 'reaction' | 'build_request' | 'something_went_wrong'

const TAB_LABELS: Record<Tab, string> = {
  reaction: 'Reaction',
  build_request: 'Build request',
  something_went_wrong: 'Something went wrong',
}

const PILLS: Record<Tab, string[]> = {
  reaction: [
    'This is exactly what I needed.',
    'This could work for me.',
    'Interesting but not sure yet.',
    'Not built for my situation.',
    'Too much to take in.',
    'I do not trust it yet.',
    'This feels like it matters.',
    'I would not use this.',
    'Other.',
  ],
  build_request: [
    'Add a feature.',
    'Change something that exists.',
    'This works but needs to be simpler.',
    'Build this for my specific situation.',
  ],
  something_went_wrong: [
    'It broke and I could not continue.',
    'It lost something I wrote.',
    'It did not do what I expected.',
    'Something felt wrong but I cannot name it.',
  ],
}

const HEADINGS: Record<Tab, string> = {
  reaction: 'What is your reaction?',
  build_request: 'What would you like built?',
  something_went_wrong: 'What went wrong?',
}

const OPT_LABEL: Record<Tab, string> = {
  reaction: 'Add a note (optional)',
  build_request: 'Describe what you need',
  something_went_wrong: 'Tell us what happened',
}

const TEXT_REQUIRED: Record<Tab, boolean> = {
  reaction: false,
  build_request: true,
  something_went_wrong: true,
}

const AUTO_CLOSE_MS = 2800

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('reaction')
  const [pill, setPill] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset tab content when switching tabs
  function switchTab(t: Tab) {
    setTab(t)
    setPill(null)
    setText('')
    setError(null)
    setConfirmed(false)
  }

  // Reset all state when panel closes
  function closePanel() {
    setOpen(false)
    setTimeout(() => {
      setTab('reaction')
      setPill(null)
      setText('')
      setError(null)
      setConfirmed(false)
    }, 220)
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  async function send() {
    if (!pill) return
    if (TEXT_REQUIRED[tab] && !text.trim()) {
      setError('Please add a description before sending.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await feedbackApi.submit({ tab, pill, text: text.trim() || undefined })
      setConfirmed(true)
      closeTimer.current = setTimeout(closePanel, AUTO_CLOSE_MS)
    } catch {
      setError('Could not send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const sendDisabled = sending || !pill || (TEXT_REQUIRED[tab] && !text.trim())

  return (
    <>
      {/* Panel */}
      <div className="gw-fb-panel" data-open={open ? 'true' : 'false'}>
        {confirmed ? (
          <div className="gw-fb-confirm">
            Your feedback was received. Thank you.
          </div>
        ) : (
          <>
            <div className="gw-fb-tabs">
              {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
                <button
                  key={t}
                  className={`gw-fb-tab${tab === t ? ' active' : ''}`}
                  onClick={() => switchTab(t)}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="gw-fb-body">
              <div className="gw-fb-heading">{HEADINGS[tab]}</div>
              <div className="gw-fb-pills">
                {PILLS[tab].map(p => (
                  <button
                    key={p}
                    className={`gw-fb-pill${pill === p ? ' selected' : ''}`}
                    onClick={() => { setPill(p); setError(null) }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="gw-fb-opt-label">{OPT_LABEL[tab]}</div>
              <textarea
                className="gw-fb-input"
                rows={3}
                value={text}
                onChange={e => { setText(e.target.value); setError(null) }}
                placeholder=""
              />
              <button className="gw-fb-send" onClick={send} disabled={sendDisabled}>
                {sending ? 'Sending…' : 'Send'}
              </button>
              {error && <div className="gw-fb-error">{error}</div>}
              <div className="gw-fb-note">Your response is anonymous.</div>
            </div>
          </>
        )}
      </div>

      {/* Trigger */}
      <div className="gw-fb-trigger">
        <button
          className="gw-fb-btn"
          onClick={() => (open ? closePanel() : setOpen(true))}
          aria-label="Open feedback"
        >
          {open ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2h14a1 1 0 011 1v9a1 1 0 01-1 1H6l-4 3V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <span className="gw-fb-label">Feedback</span>
      </div>
    </>
  )
}
