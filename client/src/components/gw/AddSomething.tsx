import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Modal } from '@/components/gw/ui/Modal'
import { TextArea } from '@/components/gw/ui/FormFields'
import { Button } from '@/components/gw/ui'

/**
 * ADD SOMETHING, ANY TIME (Hafsah, after polish round 3, 26 October 2026). Between check-ins, or during one, a person adds something to
 * their own record: it goes in as an answer in their check-in, is filed against the right deal, person or promise, and appears on the
 * board where it belongs (api/src/modules/conversation/add-something.ts). After it is sent, they are taken to their check-in, where
 * Groundwork's reply, and any follow-up it asks, are waiting.
 */
export function AddSomething({ groundId }: { groundId: string }) {
  const go = useNavigate()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const send = useMutation({
    mutationFn: async () => (await apiClient.post(`/check-ins/add-something/${groundId}`, { message: text.trim() })).data,
    onSuccess: () => { setOpen(false); setText(''); go(`/grounds/${groundId}`) },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That did not send. Try again.'),
  })
  return (
    <>
      <button type="button" className="gwui-plain-link" onClick={() => { setProblem(null); setOpen(true) }}>Add something</button>
      {open && (
        <Modal title="Add something" onClose={() => setOpen(false)}>
          <p className="gwui-panel-text">Tell Groundwork anything new: a sale, a payment, a step, a change. It goes on your record and the board.</p>
          <TextArea aria-label="What you want to add" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example, Savannah Cafe paid the balance today, M-Pesa code SGL9W4MN7T." />
          {problem && <p role="alert" className="gwui-panel-text">{problem}</p>}
          <Button kind="primary" onClick={() => send.mutate()} disabled={!text.trim() || send.isPending}>{send.isPending ? 'Adding…' : 'Add it'}</Button>
        </Modal>
      )}
    </>
  )
}
