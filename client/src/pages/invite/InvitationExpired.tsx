import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { participantsApi } from '@/api/participants'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { Page, Mark, PageTitle, Button, Note, FieldLabel, TextField, Stack } from '@/components/gw/ui'

/**
 * "THIS LINK HAS EXPIRED", FOR AN INVITATION (A3, #/join/expired). The words are join-expired.txt's,
 * rebuilt from `components/gw/ui` only (design-audit.md section 4; the invitation task).
 *
 * Invitations last 14 days (Hafsah, 26 September). The person does not need a new invitation, only a
 * fresh link, so this asks for the address and the server sends one to it if, and only if, it is the
 * address the invitation went to. The reply is the same either way: "We don't show who invited an
 * address we don't recognise."
 *
 * The label is "Your email", the prototype's own (join-expired.txt) - Hafsah's first review.
 * The prototype says "ask her"; the product does not know anybody's pronouns, so it says "ask them".
 */
export function InvitationExpired({ token, leadFirstName }: { token: string; leadFirstName: string | null }) {
  const [email, setEmail] = useState('')
  const [problem, setProblem] = useState('')
  const [says, setSays] = useState('')

  const send = useMutation({
    mutationFn: () => participantsApi.freshLink(token, email.trim().toLowerCase()),
    onSuccess: (res) => setSays(res.says),
    onError: (err: any) => {
      const status = err?.response?.status
      if (status === 429) { setProblem('Too many attempts. Wait a minute and try again.'); return }
      setProblem('That did not send, because something went wrong on our side. Please try again.')
    },
  })

  function submit() {
    if (send.isPending) return
    if (!looksLikeAnAddress(email)) { setProblem('That address does not look right.'); return }
    setProblem('')
    send.mutate()
  }

  const who = (leadFirstName ?? '').trim()
  const foot = who
    ? `If this isn’t the address ${who} invited, ask them to add the right one. We don’t show who invited an address we don’t recognise.`
    : 'If this isn’t the address you were invited at, ask the person who invited you to add the right one. We don’t show who invited an address we don’t recognise.'

  return (
    <Page narrow>
      <Mark />
      <PageTitle title="This link has expired" subtitle="Invitation links last 14 days. You don’t need a new invitation, just a fresh link." subtitleTone="ink" />
      <Stack gap={18}>
        {says ? (
          <Note>{says}</Note>
        ) : (
          <form noValidate onSubmit={e => { e.preventDefault(); submit() }}>
            <FieldLabel htmlFor="fresh-link-email">
              Your email
              <TextField id="fresh-link-email" type="email" value={email} onChange={e => { setEmail(e.target.value); setProblem('') }} autoComplete="email" autoFocus />
            </FieldLabel>
            {problem && <Note tone="error">{problem}</Note>}
            <div className="gwui-form-actions">
              <Button type="submit" size="big" wide disabled={send.isPending}>
                {send.isPending ? 'Sending…' : 'Send me a fresh link'}
              </Button>
            </div>
          </form>
        )}
        <p className="gwui-panel-text-muted">{foot}</p>
      </Stack>
    </Page>
  )
}
