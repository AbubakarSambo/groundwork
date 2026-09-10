import { useNavigate } from 'react-router-dom'
import { HOW_TO_STEPS } from '@/components/gw/how-a-check-in-is-run'

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

      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 6, letterSpacing: '-.02em' }}>
        Running a check-in
      </h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 32, lineHeight: 1.6 }}>
        For anybody about to lead one. Four things about how it works, and what you can see as the person who set it up. Send this link to your team.
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
                <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, margin: 0 }}>{s.body}</p>
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
        <p style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, margin: 0 }}>
          Whether a check-in was opened, who is in it, whether people have finished, and the report
          once it is released. Never anybody's check-in itself. An admin approving a check-in is
          approving that it happens, not reading it.
        </p>
      </div>

      <button
        onClick={() => navigate('/grounds/new')}
        style={{ padding: '12px 24px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Open a check-in
      </button>
    </div>
  )
}
