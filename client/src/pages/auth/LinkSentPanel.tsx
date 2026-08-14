import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'

/**
 * "A LINK IS ON ITS WAY" WAS TWO PAGES. W8-49.
 *
 * `/auth` had its own version inside the send-me-a-link view: a tick, one line of
 * text and a way back. `/auth/sent` had the good one - the countdown, the resend,
 * what to expect, and the way back for somebody who mistyped their address. Which
 * one you got depended on which button you pressed to get there, and the worse one
 * was the one on the page people actually start from.
 *
 * So the good one moved here and both use it. `/auth/sent` is still a real URL,
 * because `SaveCard` sends people to it and old links may exist - it just renders
 * the same page now rather than a second one.
 */
export function LinkSentPanel({ email, onUseDifferent }: { email: string; onUseDifferent: () => void }) {
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const resend = useMutation({
    mutationFn: () => authApi.requestMagicLink({ email }),
    onSuccess: () => { setCountdown(30); setCanResend(false) },
  })

  return (
    <div style={{ textAlign: 'center', paddingTop: 8 }}>

      <div style={{ width: 52, height: 52, background: 'var(--gw-blue-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
          <rect x="1" y="1" width="20" height="16" rx="2" stroke="var(--gw-navy)" strokeWidth="1.5" />
          <path d="M1 4l10 7 10-7" stroke="var(--gw-navy)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Check your email</div>
      <div className="gw-sub-t" style={{ textAlign: 'center', maxWidth: 300, margin: '0 auto 16px' }}>
        We sent a secure link to <strong>{email}</strong>.
      </div>

      <div style={{ border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 16px', maxWidth: 300, margin: '0 auto 18px', textAlign: 'left' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 8 }}>What to expect</div>
        {[
          'Click the link in the email.',
          'You will be asked to set a password to secure your account.',
          'Your Groundwork account is live.',
        ].map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < 2 ? 6 : 0, fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: 'var(--gw-navy)', flexShrink: 0 }}>{i + 1}.</span>
            <span>{t}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>No email? Check your spam folder.</div>

      {!canResend ? (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 8 }}>
          Resend available in <span>{countdown}</span>s
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <span
            style={{ color: 'var(--gw-navy)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}
            onClick={() => resend.mutate()}
          >
            {resend.isPending ? 'Sending…' : 'Send another link'}
          </span>
        </div>
      )}

      {/*
        THE ADDRESS MIGHT BE WRONG, AND THERE WAS NO WAY BACK.

        Every link here pointed at the marketing site or resent to the SAME address.
        Somebody who mistyped their email had one option: leave. Resending to a typo
        forever is the failure this page makes easiest, so the way back to the form is
        the more useful of the two exits and goes first.
      */}
      <div style={{ marginTop: 22 }}>
        <span
          onClick={onUseDifferent}
          style={{ fontSize: 12.5, color: 'var(--gw-navy)', cursor: 'pointer', fontWeight: 600 }}
        >
          Wrong address? Use a different one
        </span>
      </div>

    </div>
  )
}
