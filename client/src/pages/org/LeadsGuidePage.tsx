import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { HOW_TO_STEPS } from '@/components/gw/how-a-check-in-is-run'
import { TextAction } from '@/components/gw/kit'
import { copy } from '@/components/gw/copying-can-fail'
import { useAuthStore } from '@/stores/auth'
import { askNameFor } from '@/lib/ask-name'
import { WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS } from '@/lib/what-an-admin-cannot-read-without-access'

/**
 * THE PAGE AN ADMIN SENDS THEIR LEADS BEFORE A ROLLOUT.
 *
 * Asked for as "train them on this tool", and it is the step between having 160 accounts and having
 * 160 people who use them. The product's only teaching material was four tabs behind a question
 * mark inside the app - useless for briefing somebody who has not signed in yet, and impossible to
 * forward.
 *
 * NOTHING HERE IS NEW WRITING. Both halves are read from where the product already says them: the
 * four steps from the same module the help modal reads, and the four privacy claims from the same
 * module the check-in screen reads. A briefing page that paraphrased either would be the version an
 * admin used to promise something to their staff, drifting quietly away from what the product does.
 *
 * IT IS SIGNED IN. An admin sends the link to colleagues who have accounts - everybody they are
 * briefing was just invited. A public version is a marketing-site job, not this.
 */
export function LeadsGuidePage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const { user } = useAuthStore()
  const realOrgName = user?.organization?.name?.trim() || user?.organizationName

  /**
   * "SEND THIS LINK TO YOUR TEAM" WAS AN INSTRUCTION WITH NO CONTROL. The page told you to send it and
   * gave you nothing to send it with, and it was linked from one admin-only screen, so the leads it
   * was written for could not find it either (fix plan F12). The page does what it says now.
   */
  async function copyTheLink() {
    if (await copy(window.location.href)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('Copying is not available here. Select the address bar and copy it yourself.')
    }
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: 720 }}>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate('/grounds')}
          style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ← Back to check-ins
        </button>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 6, letterSpacing: '-.02em' }}>
        Running a check-in
      </h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 32, lineHeight: '22px' }}>
        For anybody about to lead one. Four things about how it works, and what you can see as the person who set it up. Send this link to your team.{' '}
        <TextAction onClick={copyTheLink} strong>{copied ? 'Copied ✓' : 'Copy the link'}</TextAction>
      </p>

      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 12 }}>How to run one</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 34 }}>
        {HOW_TO_STEPS.map((s, i) => (
          <div key={s.title} style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '15px 17px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              {/*
                * NUMBERED BECAUSE IT IS A SEQUENCE. Opening late is the most common way this is
                * used badly, and "before it becomes urgent" being step one is the point.
                */}
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-sub)', flexShrink: 0 }}>{i + 1}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>{s.title}</div>
                <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px', margin: 0 }}>{s.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/*
        * THE ONE THING A LEAD ASKS THAT NEITHER MODULE ANSWERS, because it is about the admin's
        * position rather than the product's: what the person who set this up can see. It is the
        * first question anybody asks their manager after being invited, and an admin who cannot
        * answer it loses the room.
        */}
      <div style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '15px 17px', marginBottom: 34 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>What an admin can see</div>
        {/*
          FAULT 4, 6 Oct 2026: THIS USED TO SAY AN ADMIN "NEVER SEES ANYBODY'S CHECK-IN ITSELF" -
          the opposite of decision 5 (docs/decisions.md), which an admin can act on only if this
          page tells her the truth. Decision 5: admins see every board and report, including what
          people said in them; they never see anyone's questions to Ask Groundwork, anyone's own
          report, or a lead's private notes, and never a performance plan unless given access to
          that check-in. Rewritten to say exactly that, with the organisation's own Ask name.
        */}
        <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px', margin: 0 }}>
          An admin can see every board and report, including what people said in them. An admin
          never sees anyone's questions to {askNameFor(realOrgName)}, anyone's own report, or a
          lead's private notes, and never {WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS} unless given
          access to that check-in.
        </p>
      </div>

      <button className="btn pri"
        onClick={() => navigate('/grounds/new')}
      >
        Open a check-in
      </button>
    </div>
  )
}
