import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { entryApi } from '@/api/entry'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useTheTrap } from '@/components/gw/a-field-nobody-can-see'
import {
  theEmailsIn, whatIsNotAnEmail, aNameFromTheQuestion, readyToSend, whatIsStillNeeded,
  theOneEmail, HOW_OFTEN, type HowOften,
} from './ask-your-team-one-thing'

/**
 * FOUR FIELDS, AND THE REASON THIS ONE IS NOT A CHAT.
 *
 * "Get updates from your team" promises a two-minute setup and a same-week payoff. An interview
 * cannot be two minutes, and being asked what success looks like before you may ask your team one
 * question is what would kill it. See ask-your-team-one-thing.ts for the four fields and the rules.
 */
/** Her sentence, 18 September 2026, quoted rather than rewritten. */
const THE_TRIAL_LINE =
  'We are trying this out to see if this new tool can help us be aligned, and your answers go into one summary that gives us a shared picture.'

export default function AskYourTeamOneThing({ onBack }: { onBack?: () => void }) {
  const [pasted, setPasted] = useState('')
  const [theOneLine, setTheOneLine] = useState('')
  const [howOften, setHowOften] = useState<HowOften>('WEEKLY')
  const [by, setBy] = useState('')
  const [aTrial, setATrial] = useState(false)
  const [sending, setSending] = useState(false)
  /* Sending from a signed-out browser ends here rather than on the ground, because the ground does
     not exist until the way in is opened. See the two endings in send(). */
  const [checkYourEmail, setCheckYourEmail] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signedIn = useAuthStore(s => s.isAuthenticated)
  const me = useAuthStore(s => s.user)
  const trap = useTheTrap()
  /*
   * SOMEBODY SIGNED IN HAS ANSWERED THIS ALREADY (U.6 review).
   *
   * It was a box filled from their account at first paint, holding its own copy of the address. The
   * box and the copy could disagree - the browser filled the box with an address the form never
   * held, "Send" stayed greyed with "Add your own email", and typing it again made it two addresses
   * in one box. Signed in, the report goes to their account whatever the box said, so there is no
   * box: the page says where it goes, and the account's address is the one the form counts.
   */
  const theirAccountEmail = signedIn ? (me?.email ?? '').trim() : ''
  const [typedEmail, setYourEmail] = useState('')
  const yourEmail = theirAccountEmail || typedEmail

  const emails = theEmailsIn(pasted)
  const notEmails = whatIsNotAnEmail(pasted)
  const fields = { pasted, theOneLine, howOften, by, yourEmail }
  const missing = whatIsStillNeeded(fields)
  const canSend = readyToSend(fields) && !sending

  /* Both endings send the same thing. What differs is whether there is already somebody to send
     the report to: signed in, the ground is made now; signed out, it is made the moment they open
     the link we email them, and their team is invited then. */
  function whatIsBeingSent() {
    return {
      groundLabel: aNameFromTheQuestion(theOneLine),
      scenario: 'TEAM_UPDATES' as const,
      /* The one line is the question everybody answers, and the brief is how it reaches them. */
      brief: theOneLine.trim(),
      cadence: howOften,
      cadenceChosen: true,
      checkInBy: howOften === 'ONE_TIME' ? by.trim() || undefined : undefined,
      /* DECISION 133: no `managingOnly`. The lead asks and the team answers; the lead can check in
         themselves whenever they choose, and is never counted as missing a session. */
      /*
       * THE TRIAL LINE TRAVELS ON THE PERSON, NOT ON THE GROUND. A top-level inviteNote is not a
       * field the commit accepts, so the sentence went nowhere: the note each contributor carries
       * is what reaches their invite. See sendTheInviteThisGroundSends on the API side.
       */
      contributors: emails.map(email => ({
        email,
        ...(aTrial ? { note: THE_TRIAL_LINE } : {}),
      })),
    }
  }

  async function send() {
    if (!canSend) return
    setSending(true)
    const mine = theOneEmail(yourEmail)!
    try {
      if (!signedIn) {
        await authApi.entrySave(mine, { payload: whatIsBeingSent(), history: [] }, trap.filled)
        setSending(false)
        setCheckYourEmail(mine)
        return
      }
      const res = await entryApi.commit({ ...whatIsBeingSent(), history: [] })
      queryClient.invalidateQueries({ queryKey: ['grounds'] })
      toast.success(`Sent to ${emails.length} ${emails.length === 1 ? 'person' : 'people'}. You will get one email the moment they have all answered.`)
      navigate(`/grounds/${res.groundId}`, { replace: true })
    } catch (err: any) {
      setSending(false)
      toast.error(err?.response?.data?.message ?? 'That did not send. Try again.')
    }
  }

  const field: React.CSSProperties = {
    /* The kit's field (app.css .input). */
    width: '100%', padding: '12px 16px', fontSize: 16, border: '1px solid var(--rule2-crisp)', borderRadius: 10, background: 'var(--gw-card)', color: 'var(--gw-text)',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const legend: React.CSSProperties = { fontWeight: 700, fontSize: 14, marginBottom: 6 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--gw-muted)', marginTop: 5 }

  if (checkYourEmail) {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '28px 20px 64px' }}>
        <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>Check your email</h1>
        <p style={{ margin: '0 0 14px' }}>
          We have sent your way in to {checkYourEmail}. Open it and your {emails.length}{' '}
          {emails.length === 1 ? 'person gets their' : 'people get their'} link straight away.
        </p>
        <p style={{ color: 'var(--gw-muted)', margin: 0 }}>
          They hear nothing until you open it.
        </p>
      </div>
    )
  }

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
            placeholder="Can you share an update on how sales is going for you this quarter, or if you have any blockers?"
            style={{ ...field, resize: 'vertical' }}
          />
          <div style={hint}>One line. They answer exactly this.</div>
        </div>

        <div>
          <div style={legend}>By when</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {HOW_OFTEN.map(o => (
              <button className={`gwui-choice${howOften === o.value ? ' gwui-choice-on' : ''}`}
                key={o.value} type="button" onClick={() => setHowOften(o.value)}
                aria-pressed={howOften === o.value}
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
              {/* Two sentences, where it joined them with a colon (U.6 review). Her sentence is the
                  one the invite carries, word for word, so it cannot drift from it. */}
              This adds one sentence to the invite. It reads “{THE_TRIAL_LINE}”
            </span>
          </span>
        </label>

        {/*
          YOUR OWN EMAIL, SO NOBODY HAS TO SIGN IN FIRST. Her call, 18 September 2026. Signed in,
          this is simply where the report goes and it is already filled. Signed out, it is also the
          way in: the link arrives by mail and the team is invited the moment it is opened.
        */}
        <div>
          <div style={legend}>Your email</div>
          {theirAccountEmail ? (
            <div id="your-email" style={{ fontSize: 15 }}>The report goes to you at <strong>{theirAccountEmail}</strong>.</div>
          ) : (
            <>
              <input
                id="your-email" type="email" value={typedEmail} onChange={e => setYourEmail(e.target.value)}
                placeholder="you@work.com" autoComplete="email" style={field}
              />
              <div style={hint}>
                {signedIn
                  ? 'Where the report goes.'
                  : 'Where the report goes. You do not have to sign in first. We will email you your way in.'}
              </div>
            </>
          )}
        </div>
        {trap.field}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <button className="btn pri"
            type="button" onClick={send} disabled={!canSend}
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
          They each get their own link and answer Groundwork one to one. You get one email the moment everybody
          has answered, with one report: what each person said, where they line up, where they do
          not, and what nobody is holding.
        </p>
      </div>
    </div>
  )
}
