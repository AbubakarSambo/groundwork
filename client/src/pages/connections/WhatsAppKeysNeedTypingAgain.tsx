import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { integrationsApi, type WhatsAppConnection } from '@/api/integrations'
import { Note, Stack, Button, TextField, FieldLabel } from '@/components/gw/ui'

/**
 * THE SEALED KEY THAT CANNOT BE OPENED (6 October, answers-from-engine.md: "an organisation's own
 * WhatsApp number, when its keys cannot be opened"). An organisation's own access token and app
 * secret are kept sealed; if the server's own key that seals them is changed or removed, they
 * cannot be opened any more. `GET /integrations/whatsapp`'s `connection` then carries
 * `keysNeedTypingAgain: true` and the sentence to show, word for word, in `keysNeedTypingAgainSays`.
 * Nothing is sent from the number, and messages arriving for it are refused, until the admin types
 * the token and the app secret in again.
 *
 * Shown wherever the connection is read - the Connections page and the WhatsApp setup page both
 * import this one pair - with the two fields to retype kept visible right beside the sentence,
 * never behind a step a connected number has already marked done.
 */
export function WhatsAppKeysNeedTypingAgainNote({ connection }: {
  connection: Pick<WhatsAppConnection, 'keysNeedTypingAgain' | 'keysNeedTypingAgainSays'> | null | undefined
}) {
  if (!connection?.keysNeedTypingAgain) return null
  return (
    <Note tone="amber" role="alert">
      {connection.keysNeedTypingAgainSays || 'Your number’s keys need to be typed in again. Nothing is sent from your number until they are.'}
    </Note>
  )
}

export function WhatsAppKeysRetypeForm({ connection }: { connection: WhatsAppConnection }) {
  const qc = useQueryClient()
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')
  const save = useMutation({
    mutationFn: () => integrationsApi.connectWhatsapp({
      phoneNumberId: connection.phoneNumberId,
      businessAccountId: connection.businessAccountId ?? undefined,
      displayNumber: connection.displayNumber ?? undefined,
      accessToken: token.trim(),
      appSecret: secret.trim(),
    }),
    onSuccess: () => {
      setToken('')
      setSecret('')
      qc.invalidateQueries({ queryKey: ['integrations'] })
      toast.success('Saved. Your number can send and receive again.')
    },
    onError: (e: any) => {
      /*
       * THE SERVER'S OWN SENTENCE WHEN IT CANNOT SEAL A NEW KEY EITHER (6 October,
       * answers-from-engine.md): "We cannot save your number's keys safely yet. This is on our
       * side, not yours. Contact Groundwork and we will put it right." Shown exactly as served,
       * never replaced by a generic failure line.
       */
      toast.error(e?.response?.data?.message ?? 'Could not save. Check the token and the app secret and try again.')
    },
  })
  const mayConnect = !!token.trim() && !!secret.trim()

  return (
    <form onSubmit={e => { e.preventDefault(); if (mayConnect) save.mutate() }}>
      <Stack gap={12}>
        <div>
          <FieldLabel htmlFor="wa-retype-token">Access token</FieldLabel>
          <TextField id="wa-retype-token" type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="New permanent access token" />
        </div>
        <div>
          <FieldLabel htmlFor="wa-retype-secret">App secret</FieldLabel>
          <TextField id="wa-retype-secret" type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="New app secret" />
        </div>
        <Button kind="primary" type="submit" disabled={!mayConnect || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
      </Stack>
    </form>
  )
}
