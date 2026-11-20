import { useState } from 'react'
import { Button, Modal } from '@/components/gw/ui'

/**
 * A RECEIPT OR A QUOTE THAT OPENS (Batch S, round 2, T5). The approver on the queue and finance on the finance page open what the
 * person attached, before deciding or paying. The server sends it only to them: the queue holds only what waits for the reader,
 * and the finance page only opens for whoever looks after finance (the-approvals-queue.service.ts, the-spending-for-finance.service.ts).
 * Groundwork keeps a file's words, never the file, so a photo opens to its name and a plain way to get it.
 */
export function TheAttachedFile({ a, firstName }: { a: { name: string; kind: string | null; words: string | null }; firstName: string }) {
  const [open, setOpen] = useState(false)
  const what = a.kind === 'receipt' ? 'receipt' : 'quote'
  return (
    <>
      <Button kind="quiet" size="small" onClick={() => setOpen(true)}>{`Open the ${what}, “${a.name}”`}</Button>
      {open && (
        <Modal title={`The ${what} ${firstName} attached`} onClose={() => setOpen(false)}>
          {a.words?.trim()
            ? a.words.split(/\n{2,}/).map((p, i) => <p key={i} className="gwui-panel-text">{p}</p>)
            : <p className="gwui-panel-text">{`Groundwork keeps the words of a file and not the file, and the words of “${a.name}” could not be read, for example because it is a photo. Ask ${firstName} to send it to you.`}</p>}
          <div className="gwui-edge-acts"><Button kind="secondary" size="small" onClick={() => setOpen(false)}>Close</Button></div>
        </Modal>
      )}
    </>
  )
}
