import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, FieldLabel, Note, TextArea } from '@/components/gw/ui'

/**
 * "ASK A QUESTION" ON A REQUEST (decision 85: whoever decides "approves, declines or asks a question").
 * The request keeps waiting, and the server tells the person. The server's reply (the whole board,
 * with the question written into the request's own sentences) goes to `send`'s caller, so what is read
 * afterwards is the server's, never the screen's.
 *
 * WORDING THE SERVER DOES NOT SEND: "Ask a question"; "Your question"; "Send the question"; "Cancel".
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'

export function AskAQuestion({ id, who, send }: { id: string; who: string; send: (question: string) => Promise<unknown> }) {
  const [asking, setAsking] = useState(false)
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const ask = useMutation({
    mutationFn: () => send(text.trim()),
    onSuccess: () => { setProblem(null); setAsking(false); setText('') },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  if (!asking) {
    return <Button kind="quiet" size="small" onClick={() => setAsking(true)} aria-label={`Ask ${who} a question`}>Ask a question</Button>
  }
  const fieldId = `ask-${id}`
  return (
    <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (text.trim()) ask.mutate() }}>
      <div className="gwui-suite-q">
        <FieldLabel htmlFor={fieldId}>Your question</FieldLabel>
        <TextArea id={fieldId} rows={3} value={text} onChange={e => setText(e.target.value)} maxLength={1000} />
      </div>
      <div className="gwui-edge-acts">
        <Button kind="secondary" size="small" type="submit" disabled={!text.trim() || ask.isPending}>Send the question</Button>
        <Button kind="quiet" size="small" onClick={() => { setAsking(false); setProblem(null) }}>Cancel</Button>
      </div>
      {problem && <Note tone="error">{problem}</Note>}
    </form>
  )
}
