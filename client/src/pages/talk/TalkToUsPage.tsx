import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { coachApi, MIN_INTENTION_LENGTH, COACHING_PRICE } from '@/api/coach'

/**
 * A REQUEST THAT GOES SOMEWHERE.
 *
 * The pricing page's three paid services all ended at `mailto:hello@myground.work`. A mailto does
 * nothing at all for anybody without a configured mail client, which on a work laptop in a browser
 * is most people - so the only route to the one thing on that page you cannot self-serve was a link
 * that appeared broken. The 53-ways audit put it plainly: no form, nothing captured, nothing
 * followed up.
 *
 * `POST /coach/request` has been public since it was written, precisely because the person it exists
 * for is the one who has not signed up. It creates a row a platform admin can read, sends a
 * confirmation, creates no check-in and invites nobody. It was reachable only from inside the
 * product, which is the one place the person needing it is not.
 *
 * WHY THIS LIVES IN THE APP rather than on the marketing site: the form has to post to the API, and
 * the marketing site is a different origin - a form there needs `myground.work` in CORS_ORIGINS
 * before it works in production, and would fail silently the day somebody changed that variable.
 * Here it shares the origin the rest of the product already uses.
 */
const WHAT_ABOUT = [
  { key: 'coach', label: 'A coach in the room', lead: 'We would like a coach in the room.' },
  { key: 'setup', label: 'Setting us up', lead: 'We would like help getting set up and training the team.' },
  { key: 'integration', label: 'Integration support', lead: 'We would like help connecting Groundwork to our own tools.' },
  { key: 'other', label: 'Something else', lead: '' },
] as const

export function TalkToUsPage() {
  const [params] = useSearchParams()
  const asked = params.get('about')
  const [about, setAbout] = useState<string>(
    WHAT_ABOUT.some((w) => w.key === asked) ? (asked as string) : 'coach',
  )
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [intention, setIntention] = useState('')
  const [said, setSaid] = useState('')

  const chosen = WHAT_ABOUT.find((w) => w.key === about) ?? WHAT_ABOUT[0]
  /* The lead sentence carries WHICH of the three this is, so whoever reads the row does not have to
     infer it from prose. Prepended at send rather than typed into the box, so somebody who has
     already chosen from the list is not asked to say it twice. */
  const whole = `${chosen.lead} ${intention.trim()}`.trim()
  const longEnough = whole.length >= MIN_INTENTION_LENGTH

  const send = useMutation({
    mutationFn: () => coachApi.request({
      name: name.trim(), orgName: orgName.trim(), email: email.trim(),
      teamSize: teamSize.trim(), intention: whole,
    }),
    onSuccess: () => setSaid('sent'),
    onError: (e: any) => {
      const msg = e?.response?.data?.message
      setSaid(Array.isArray(msg) ? msg[0] : typeof msg === 'string' && msg ? msg : 'That did not send. Nothing has been lost - try again.')
    },
  })

  const label = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gw-sub)', marginBottom: 5 } as const
  const field = {
    width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid var(--gw-border)',
    borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box' as const, marginBottom: 14,
  }

  if (said === 'sent') {
    return (
      <section className="gw-page" style={{ maxWidth: 520, margin: '0 auto', padding: '56px 20px 80px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', margin: '0 0 10px' }}>We have your request</h1>
        <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.7 }}>
          Somebody reads these and will come back to you within two working days. We have emailed you
          a copy so you know it arrived.
        </p>
        <p style={{ fontSize: 13, color: 'var(--gw-muted)', lineHeight: 1.7 }}>
          Nothing has been created in Groundwork and nobody on your team has been contacted.
        </p>
      </section>
    )
  }

  return (
    <section className="gw-page" style={{ maxWidth: 520, margin: '0 auto', padding: '48px 20px 80px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', margin: '0 0 8px' }}>Request a call</h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.7, marginBottom: 22 }}>
        Tell us what you need and somebody will come back to you within two working days. This creates
        nothing in Groundwork and contacts nobody on your team.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); setSaid(''); if (longEnough) send.mutate() }}>
        <label style={label} htmlFor="about">What is this about?</label>
        <select id="about" value={about} onChange={(e) => setAbout(e.target.value)} style={field}>
          {WHAT_ABOUT.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
        </select>

        <label style={label} htmlFor="name">Your name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} style={field} autoComplete="name" required maxLength={120} />

        <label style={label} htmlFor="org">Your organisation</label>
        <input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} style={field} autoComplete="organization" required maxLength={160} />

        <label style={label} htmlFor="email">Your email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={field} autoComplete="email" required />

        <label style={label} htmlFor="size">Roughly how many people</label>
        <input id="size" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} style={field} placeholder="e.g. 12" required maxLength={60} />

        <label style={label} htmlFor="what">What would you like help with?</label>
        <textarea
          id="what" value={intention} onChange={(e) => setIntention(e.target.value)} rows={5}
          style={{ ...field, resize: 'vertical' }}
          placeholder="What is going on, and what you want out of it."
          required
        />
        {!longEnough && intention.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: -8, marginBottom: 12 }}>
            A sentence or two more, so the first call is not spent finding out.
          </p>
        )}

        <p style={{ fontSize: 12.5, color: 'var(--gw-muted)', lineHeight: 1.6, marginBottom: 14 }}>
          {COACHING_PRICE.hourly}, or {COACHING_PRICE.retained}. {COACHING_PRICE.note}
        </p>

        {said && said !== 'sent' && <p className="gw-er" role="alert" style={{ fontSize: 13, marginBottom: 12 }}>{said}</p>}

        <button
          type="submit"
          disabled={send.isPending || !longEnough}
          style={{
            background: 'var(--gw-navy)', color: 'white', border: 'none', borderRadius: 8,
            padding: '12px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            cursor: send.isPending || !longEnough ? 'default' : 'pointer',
            opacity: send.isPending || !longEnough ? 0.6 : 1,
          }}
        >
          {send.isPending ? 'Sending…' : 'Send the request'}
        </button>
      </form>
    </section>
  )
}
