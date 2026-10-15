import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { copy } from '@/components/gw/copying-can-fail'

/*
 * "OR SHARE A LINK" (U.6, B1), in the words of docs/prototype/screens/B1-starting-a-check-in/setup.txt.
 *
 * The check-in's own open link and its QR code. It opens the answer-first door: see AnswerFirstPage
 * and the API's the-open-link. It lives on the check-in's Setup, because the link only exists once
 * the check-in does.
 *
 * Two of the prototype's lines are not here. "Turn the link off": nothing on the server turns a link
 * off yet. "They don’t take a seat.": not checked against billing. Both are in item 17 of
 * docs/morning-report-ui.md.
 */
export const SHARE_A_LINK = {
  heading: 'Or share a link',
  forWhom: 'For events, posters and groups where you don’t have everyone’s details.',
  copy: 'Copy',
  copied: 'Copied.',
  download: 'Download the QR code',
  whoCanAnswer: 'Anyone with the link can answer without an account and says who they are at the end.',
  cannotCopy: 'Copying is not available here. Select the link and copy it yourself.',
} as const

export function ShareSection({ joinToken }: { joinToken: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const joinUrl = `${window.location.origin}/answer?t=${joinToken}`

  useEffect(() => {
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(joinUrl, { width: 360, margin: 1 }).then(setQrDataUrl).catch(() => {})
    }).catch(() => {})
  }, [joinUrl])

  async function copyLink() {
    if (await copy(joinUrl)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error(SHARE_A_LINK.cannotCopy)
    }
  }

  return (
    <section aria-label={SHARE_A_LINK.heading} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 16, marginTop: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', margin: '0 0 3px' }}>{SHARE_A_LINK.heading}</h3>
      <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.55, margin: '0 0 12px' }}>{SHARE_A_LINK.forWhom}</p>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {qrDataUrl && (
          <img src={qrDataUrl} alt="" style={{ width: 100, height: 100, borderRadius: 6, border: '1px solid var(--gw-border)', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 8, wordBreak: 'break-all', fontFamily: 'monospace' }}>{joinUrl}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="gw-btn-sec" onClick={copyLink}>{copied ? SHARE_A_LINK.copied : SHARE_A_LINK.copy}</button>
            {qrDataUrl && (
              <a href={qrDataUrl} download="check-in-qr-code.png" style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)' }}>{SHARE_A_LINK.download}</a>
            )}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55, margin: '12px 0 0' }}>{SHARE_A_LINK.whoCanAnswer}</p>
    </section>
  )
}
