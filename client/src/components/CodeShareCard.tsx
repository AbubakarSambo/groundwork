import { useState } from 'react'

export interface CodeShareCardProps {
  code: string
  expiresAt: string
  daysRemaining: number
  note?: string
  allowCodeCreation: boolean
  onCopy?: () => void
}

function expiryColor(daysRemaining: number): string {
  if (daysRemaining > 30) return '#22C55E'
  if (daysRemaining >= 14) return '#F59E0B'
  return '#EF4444'
}

export function CodeShareCard({ code, expiresAt, daysRemaining, note, allowCodeCreation, onCopy }: CodeShareCardProps) {
  const [codeCopied, setCodeCopied] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const color = expiryColor(daysRemaining)

  function handleCopyCode() {
    navigator.clipboard?.writeText(code).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
      onCopy?.()
    })
  }

  function handleShare() {
    const msg = `Use code ${code} to create a free Ground on Groundwork - valid until ${formattedExpiry}`
    navigator.clipboard?.writeText(msg).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    })
  }

  return (
    <div style={{
      background: '#1A1916',
      borderRadius: 14,
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      color: 'white',
      maxWidth: 360,
      width: '100%',
    }}>
      {/* Top label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>
          Contributor code
        </span>
        {allowCodeCreation && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 20,
            background: 'rgba(93,202,165,.15)',
            color: '#5DCAA5',
            letterSpacing: '.03em',
          }}>
            Can generate codes
          </span>
        )}
      </div>

      {/* Code display */}
      <div style={{
        fontFamily: 'monospace',
        fontSize: 32,
        fontWeight: 800,
        letterSpacing: '.12em',
        color: 'white',
        textAlign: 'center',
        padding: '12px 0',
        borderTop: '0.5px solid rgba(255,255,255,.1)',
        borderBottom: '0.5px solid rgba(255,255,255,.1)',
      }}>
        {code}
      </div>

      {/* Expiry */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>
          Valid until {formattedExpiry}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
        </span>
      </div>

      {/* Note */}
      {note && (
        <div style={{
          fontSize: 12,
          color: 'rgba(255,255,255,.6)',
          background: 'rgba(255,255,255,.06)',
          borderRadius: 7,
          padding: '8px 12px',
          lineHeight: 1.55,
          textAlign: 'center',
        }}>
          {note}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleCopyCode}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 8,
            background: codeCopied ? 'rgba(93,202,165,.2)' : 'rgba(255,255,255,.1)',
            color: codeCopied ? '#5DCAA5' : 'white',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background .15s, color .15s',
          }}
        >
          {codeCopied ? 'Copied!' : 'Copy code'}
        </button>
        <button
          onClick={handleShare}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 8,
            background: shareCopied ? 'rgba(93,202,165,.2)' : 'rgba(255,255,255,.06)',
            color: shareCopied ? '#5DCAA5' : 'rgba(255,255,255,.8)',
            border: '0.5px solid rgba(255,255,255,.15)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background .15s, color .15s',
          }}
        >
          {shareCopied ? 'Copied!' : 'Share'}
        </button>
      </div>
    </div>
  )
}
