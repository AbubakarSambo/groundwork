import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { todayApi } from '@/api/today'
import { Button, Stack } from '@/components/gw/ui'
import { FieldLabel, TextArea } from '@/components/gw/ui/FormFields'

/**
 * THE REASON YOU MISSED YOUR CHECK-INS (decision 136). On your own item about your own missed check-ins only. What you write is kept on your
 * latest missed check-in, and only you and the person who runs the check-in read it, beside the line they are told.
 */
export function TheReasonYouMissed({ checkInId, given }: { checkInId: string; given: string | null }) {
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const send = useMutation({
    mutationFn: () => todayApi.giveMissedReason(checkInId, reason.trim()),
    onSuccess: () => { setOpen(false); setReason(''); qc.invalidateQueries({ queryKey: ['today'] }) },
  })
  const id = `missed-reason-${checkInId}`
  if (!open) {
    return (
      <Stack gap={8}>
        {given && <p className="gwui-panel-text">You gave this reason: "{given}"</p>}
        <Button kind="secondary" size="small" onClick={() => setOpen(true)}>{given ? 'Change your reason' : 'Tell us why'}</Button>
      </Stack>
    )
  }
  return (
    <Stack gap={8}>
      <FieldLabel htmlFor={id}>Why have you missed them? The person who runs this check-in will read what you write here.</FieldLabel>
      <TextArea id={id} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} />
      {send.isError && <p className="gwui-panel-text">Your reason was not saved. Please try again.</p>}
      <Button kind="primary" size="small" onClick={() => send.mutate()} disabled={!reason.trim() || send.isPending}>Send your reason</Button>
    </Stack>
  )
}
