import { Skeleton } from '@/components/gw/ui/Skeleton'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { joinApi } from '@/api/entry'
import { LinkProblem } from '@/components/gw/LinkProblem'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { useTheTrap } from '@/components/gw/a-field-nobody-can-see'
import { Page, Mark, PageTitle, Note, Button, FieldLabel, TextField, Stack } from '@/components/gw/ui'
import { PhoneNumberField } from '@/components/gw/PhoneNumberField'
import { keepTheNumberForWhenTheySignIn } from '@/lib/a-number-given-before-signing-in'

type Phase = 'loading' | 'start' | 'sent' | 'error'

/**
 * BROADCAST JOIN LANDING (A3, j-baridi.jpg: a link shared with a whole cohort, not one person's own
 * invitation). ONE PATH: joining signs the person in against the join link and lands them directly
 * in the REAL conversation engine (/checkin/:id), exactly like accepting an invite (#82/#83). The old
 * inline entry-pipeline chat + solo entry report are gone from this path - a cohort member gets the
 * full engine (probing, evidence, upload, the shared report). Sign-in is required (an email): the
 * real engine needs an owned check-in, so there is no longer an anonymous join.
 *
 * REBUILT FROM `components/gw/ui` ONLY (group 3, piece 1, "signing in and joining"): `Page narrow`
 * with the small `Mark`, `PageTitle` in Literata, `Callout` for the privacy line, the standard
 * `FieldLabel`/`TextField` and `Button`, and `LinkProblem` (already rebuilt, U.20) for a link that
 * does not resolve - the same part the invitation uses for the same thing. One primary button on
 * screen in any state: "Email me my link" on the form; "Use a different address", on the `sent`
 * phase, is `kind="quiet"`, not a second primary.
 */
export function JoinPage() {
  const [params] = useSearchParams()
  /* `token` too: the developer API's check-ins route handed links out as /join?token= until 26 October 2026, and those are still out there. */
  const joinToken = params.get('t') ?? params.get('token') ?? ''

  const [phase, setPhase] = useState<Phase>('loading')
  const [ground, setGround] = useState<{ groundId: string; groundLabel: string; scenario: string; initiatorName: string } | null>(null)

  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  /* Optional, beside their part. Never inferred; blank means blank. */
  /* Optional, always asked (Hafsah, 30 October 2026); saved to them through PATCH /auth/me once their link signs them in. */
  const [phone, setPhone] = useState('')
  const [failure, setFailure] = useState('')
  /* Reached from a link shared with a whole cohort, and every submission mails a typed address: the same trap the account-creating forms carry. */
  const trap = useTheTrap()
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!joinToken) { setPhase('error'); return }
    joinApi.preview(joinToken)
      .then(g => { setGround(g); setPhase('start') })
      .catch(() => setPhase('error'))
  }, [joinToken])

  const [sentTo, setSentTo] = useState('')
  const [sentSays, setSentSays] = useState('')

  /**
   * ASKING TO JOIN, WHICH IS NOT THE SAME AS JOINING.
   *
   * This used to hand back a session and navigate straight into a check-in. What
   * it was really doing was signing the caller in as whoever the typed address
   * belonged to — a join link is shared with a whole cohort, so anybody with it
   * could type the admin's address. Now the address gets a link and the link does
   * the work.
   */
  async function join() {
    /* The button waits for both fields, by a written decision (see the field's comment below). */
    if (!looksLikeAnAddress(email) || !role.trim() || joining) return
    setJoining(true)
    setFailure('')
    try {
      const res = await joinApi.accept({
        joinToken,
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        roleAsDescribed: role.trim(),
        trapFilled: !!trap.filled,
      })
      keepTheNumberForWhenTheySignIn(email, phone)
      setSentTo(res.to)
      setSentSays(res.says)
      setPhase('sent')
    } catch {
      /* The toast's words were right; a toast leaves the page looking unchanged. Inline, and kept. */
      setFailure('Could not send your link - nobody has been emailed and nothing was added. Try again.')
    } finally {
      setJoining(false)
    }
  }

  if (phase === 'loading') {
    return (
      <Page narrow>
        <Mark />
        <Skeleton what="Getting this page" shape="lines" count={1} />
      </Page>
    )
  }
  // Was a red tick, one sentence and nothing to press. W8-62.
  if (phase === 'error' || !ground) {
    return (
      <Page narrow>
        <Mark />
        <LinkProblem kind="join" />
      </Page>
    )
  }

  if (phase === 'sent') {
    return (
      <Page narrow>
        <Mark />
        <PageTitle
          title="Check your email"
          /* The same words whether or not that address has an account here — a
             different sentence for each would turn this form into a way of asking
             whether somebody is registered. */
          subtitle={<>{sentSays} Sent to <strong>{sentTo}</strong>.</>}
          subtitleTone="ink"
        />
        <Button kind="quiet" onClick={() => setPhase('start')}>Use a different address</Button>
      </Page>
    )
  }

  return (
    <Page narrow>
      <Mark />
      {/* "invited your check-in" is not a sentence. It is an invitation to a person, so say that. */}
      <PageTitle
        title={`${ground.initiatorName} has asked how this is going from where you sit`}
        subtitle={<>A Groundwork check-in about <strong>{ground.groundLabel}</strong>.</>}
      />

      <form noValidate onSubmit={e => { e.preventDefault(); join() }}>
        <Stack gap={10}>
          {trap.field}
          <FieldLabel htmlFor="join-first">
            First name
            <TextField id="join-first" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Optional" />
          </FieldLabel>
          <FieldLabel htmlFor="join-email">
            Email
            <TextField id="join-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </FieldLabel>
          {/*
            ONE LINE ON THEIR PART IN THIS, AND IT IS NOT OPTIONAL ANY MORE.
            205 of 223 people skipped it while it said "(optional)", and that one line is what the
            questions get shaped by: the role map, the coaching read and the lead's probe list all key
            on it. No asterisk; the copy says why it is asked and the button waits for it.
          */}
          <div>
            <FieldLabel htmlFor="join-role">
              Your part in this
              <TextField id="join-role" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. I run the clinic that St Mary's refers into" />
            </FieldLabel>
            <p className="gwui-field-help">One line on what you do here. The questions you get asked are shaped by it.</p>
          </div>
          {/* Nobody is signed in on this page, so nothing here says WhatsApp (useWhatsAppIsOn answers off until somebody is). */}
          <PhoneNumberField id="join-phone" value={phone} onChange={setPhone} whose="yours" whatsappOn={false} />
          {failure && <Note tone="error">{failure}</Note>}
          <Button type="submit" wide disabled={joining || !looksLikeAnAddress(email) || !role.trim()}>
            {joining ? 'Sending…' : 'Email me my link'}
          </Button>
        </Stack>
      </form>
    </Page>
  )
}
