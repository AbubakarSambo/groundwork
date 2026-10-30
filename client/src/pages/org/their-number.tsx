import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'
import { Button, TextField } from '@/components/gw/ui'
import type { OrgMember } from './people-here'

/**
 * SOMEBODY'S NUMBER, SAVED ONE WAY (Hafsah, 30 October 2026: "each person must have their phone number shown and editable, in
 * their row and on their profile"). The person's page and their row on People both save through this, so the number has one
 * way in from People. Saving an empty number removes it.
 */
export function useSaveTheirNumber(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (number: string) => apiClient.patch(`/users/${id}`, { phoneNumber: number }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-members'] }); toast.success('Saved.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That number did not save. Nothing else changed.'),
  })
}

/** Their number in their row on People, with "Add" or "Change" there. It is a phone number, whether WhatsApp is on or off (Hafsah, 30 October 2026); only what is said about WhatsApp shows while it is on (her rule of 26 September). */
export function TheirNumberInTheRow({ m, first, whatsappOn }: { m: OrgMember; first: string; whatsappOn: boolean }) {
  const save = useSaveTheirNumber(m.id)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  if (editing) {
    return (
      <span className="gwui-edge-acts" data-testid="their-number">
        <TextField aria-label={`Phone number for ${first}`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="+254 712 345 678" maxLength={40} />
        <Button kind="quiet" size="small" disabled={save.isPending} onClick={() => { save.mutate(draft); setEditing(false) }}>Save</Button>
        <Button kind="quiet" size="small" onClick={() => setEditing(false)}>Cancel</Button>
      </span>
    )
  }
  return (
    <span className="gwui-note" data-testid="their-number">
      {' '}{m.phoneNumber ? `Their phone number is ${m.phoneNumber}. ` : 'No phone number yet. '}
      {whatsappOn && m.whatsappSays ? `${m.whatsappSays} ` : ''}
      {!m.noAccountYet && (
        <Button kind="quiet" size="small" aria-label={`${m.phoneNumber ? 'Change' : 'Add'} the phone number for ${first}`} onClick={() => { setDraft(m.phoneNumber ?? ''); setEditing(true) }}>
          {m.phoneNumber ? 'Change' : 'Add'}
        </Button>
      )}
    </span>
  )
}
