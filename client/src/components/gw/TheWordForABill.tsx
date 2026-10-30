import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'
import { FieldRow, Stack, TextField, Button } from '@/components/gw/ui'

/**
 * WHAT YOUR ORGANISATION CALLS A BILL (polish round 1, 25 October 2026). "Fee note" at a law firm, "invoice" where nobody has said. The
 * setting was there (GET and PATCH /users/organization/word-for-the-bill) with no screen, so Wanjiru could not say Muchemi & Co calls
 * its bills fee notes. An admin's row in Settings, under Organisation; the server keeps it to admins.
 */
export function TheWordForABill() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['word-for-the-bill'], queryFn: async () => (await apiClient.get('/users/organization/word-for-the-bill')).data as { word: string; setHere: boolean; says: string } })
  const [editing, setEditing] = useState(false)
  const [word, setWord] = useState('')
  const save = useMutation({
    mutationFn: async (w: string) => (await apiClient.patch('/users/organization/word-for-the-bill', { word: w })).data,
    onSuccess: (r) => { qc.setQueryData(['word-for-the-bill'], r); setEditing(false); toast.success(r?.says ?? 'Saved.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That didn’t save. Try again.'),
  })
  if (!q.data) return null
  return (
    <FieldRow
      label="What you call a bill"
      value={!editing ? (
        <span>
          {q.data.word.charAt(0).toUpperCase() + q.data.word.slice(1)}
          <span className="gwui-field-help">{q.data.says}</span>
        </span>
      ) : (
        <Stack gap={10}>
          <TextField value={word} onChange={(e) => setWord(e.target.value)} placeholder="For example fee note, or invoice" aria-label="What you call a bill" />
          <div className="gwui-invite-actions">
            <Button kind="secondary" size="small" onClick={() => save.mutate(word.trim())} disabled={!word.trim() || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
            <Button kind="quiet" size="small" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </Stack>
      )}
      action={!editing && <Button kind="quiet" size="small" onClick={() => { setWord(q.data!.setHere ? q.data!.word : ''); setEditing(true) }}>Change</Button>}
    />
  )
}
