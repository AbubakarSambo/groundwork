import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { entryApi } from '@/api/entry'
import {
  theEmailsIn, whatIsNotAnEmail, aNameFromTheQuestion, readyToSend, whatIsStillNeeded,
  HOW_OFTEN, type HowOften,
} from './ask-your-team-one-thing'

/**
 * FOUR FIELDS, AND THE REASON THIS ONE IS NOT A CHAT.
 *
 * "Get updates from your team" promises a two-minute setup and a same-week payoff. An interview
 * cannot be two minutes, and being asked what success looks like before you may ask your team one
 * question is what would kill it. See ask-your-team-one-thing.ts for the four fields and the rules.
 */
export default function AskYourTeamOneThing({ onBack }: { onBack?: () => void }) {
  const [pasted, setPasted] = useState('')
  const [theOneLine, setTheOneLine] = useState('')
  const [howOften, setHowOften] = useState<HowOften>('WEEKLY')
  const [by, setBy] = useState('')
  const [aTrial, setATrial] = useState(false)
  const [sending, setSending] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const emails = theEmailsIn(pasted)
  const notEmails = whatIsNotAnEmail(pasted)
  const missing = whatIsStillNeeded({ pasted, theOneLine, howOften, by })
  const canSend = readyToSend({ pasted, theOneLine, howOften, by }) && !sending

  async function send() {
    if (!canSend) return
    setSending(true)
    try {
      const res = await entryApi.commit({
        groundLabel: aNameFromTheQuestion(theOneLine),
        scenario: 'TEAM_UPDATES',
        /* The one line is the question everybody answers, and the brief is how it reaches them. */
        brief: theOneLine.trim(),
        cadence: howOften,
        cadenceChosen: true,
        checkInBy: howOften === 'ONE_TIME' ? by.trim() || undefined : undefined,
        /* The lead asks; the team answers. They can add themselves on Setup in one click. */
        managingOnly: true,
        inviteNote: aTrial
          ? 'We are trying this out as a way to see how aligned we are on priorities. Your answers go into one summary for the team.'
          : undefined,
        contributors: emails.map(email => ({ email })),
        history: [],
      })
      queryClient.invalidateQueries({ queryKey: ['grounds'] })
      toast.success(`Sent to ${emails.length} ${emails.length === 1 ? 'person' : 'people'}. You will get one email the moment they have all answered.`)
      navigate(`/grounds/${res.groundId}`, { replace: true })
    } catch (err: any) {
      setSending(false)
      toast.error(err?.response?.data?.message ?? 'That did not send. Try again.')
    }
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--gw-border)',
    borderRadius: 8, fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const legend: React.CSSProperties = { fontWeight: 600, fontSize: 14, marginBottom: 6 }
  const hint: React.CSSProperties = { fontSize: 12.5, color: 'var(--gw-muted)', marginTop: 5 }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '28px 20px 64px' }}>
      <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>Get updates from your team</h1>
      <p style={{ color: 'var(--gw-muted)', margin: '0 0 26px' }}>
        Ask one question, everyone answers on their own link, you get one report.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={legend}>Who</div>
          <textarea
            id="team-emails" value={pasted} onChange={e => setPasted(e.target.value)} rows={3}
            placeholder="Paste their emails. One person or the whole team."
            style={{ ...field, resize: 'vertical' }}
          />
          <div style={hint}>
            {emails.length > 0 && <span>{emails.length} {emails.length === 1 ? 'person' : 'people'}. </span>}
            {notEmails.length > 0 && <span style={{ color: 'var(--gw-red-t)' }}>Not an email: {notEmails.join(', ')}</span>}
            {emails.length === 0 && notEmails.length === 0 && <span>Commas, spaces or one per line.</span>}
          </div>
        </div>

        <div>
          <div style={legend}>What</div>
          <textarea
            id="the-one-line" value={theOneLine} onChange={e => setTheOneLine(e.target.value)} rows={2}
            placeholder="What are your three priorities this quarter, and what's blocking you?"
            style={{ ...field, resize: 'vertical' }}
          />
          <div style={hint}>One line. They answer exactly this.</div>
        </div>

        <div>
          <div style={legend}>By when</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {HOW_OFTEN.map(o => (
              <button
                key={o.value} type="button" onClick={() => setHowOften(o.value)}
                aria-pressed={howOften === o.value}
                style={{
                  padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14,
                  border: `1px solid ${howOften === o.value ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                  background: howOften === o.value ? 'var(--gw-navy)' : 'transparent',
                  color: howOften === o.value ? '#fff' : 'inherit',
                }}
              >{o.label}</button>
            ))}
          </div>
          {howOften === 'ONE_TIME' && (
            <input id="by-date" type="date" value={by} onChange={e => setBy(e.target.value)}
                   style={{ ...field, marginTop: 10, maxWidth: 220 }} />
          )}
        </div>

        {/*
          BEING STRAIGHT ABOUT A TRIAL RAISES REPLIES AND IS THE DECENT THING. Her words, and the
          sentence that goes out is in the lead's voice rather than ours - see
          one-line-one-link-one-report on the API side.
        */}
        <label htmlFor="is-a-trial" style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
          <input id="is-a-trial" type="checkbox" checked={aTrial} onChange={e => setATrial(e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            Say we are trying this out
            <span style={{ ...hint, marginTop: 2, display: 'block' }}>
              Adds one line to the invite: we are trying this out to see how aligned we are, and your answers go into one summary.
            </span>
          </span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <button
            type="button" onClick={send} disabled={!canSend}
            style={{
              padding: '11px 22px', borderRadius: 8, border: 'none', fontSize: 15, fontWeight: 600,
              background: canSend ? 'var(--gw-navy)' : 'var(--gw-border)',
              color: canSend ? '#fff' : 'var(--gw-muted)', cursor: canSend ? 'pointer' : 'default',
            }}
          >{sending ? 'Sending...' : 'Send'}</button>
          {missing && <span style={{ fontSize: 13, color: 'var(--gw-muted)' }}>{missing}</span>}
          {onBack && (
            <button type="button" onClick={onBack}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--gw-muted)', textDecoration: 'underline' }}>
              Pick a different situation
            </button>
          )}
        </div>

        <p style={{ ...hint, marginTop: 2 }}>
          They each get their own link and answer privately. You get one email the moment everybody
          has answered, with one report: what each person said, where they line up, where they do
          not, and what nobody is holding.
        </p>
      </div>
    </div>
  )
}
