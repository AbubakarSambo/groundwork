import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { conversationApi } from '@/api'
import { Button, Textarea, Card } from '@/components/ui'
import type { ConversationTurn } from '@/types'

export function CheckInPage() {
  const { checkInId } = useParams<{ checkInId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [message, setMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['transcript', checkInId],
    queryFn: () => conversationApi.transcript(checkInId!),
    enabled: !!checkInId,
  })

  // The engine speaks first: open the check-in when the transcript is empty.
  const opened = useRef(false)
  useEffect(() => {
    if (!checkInId || isLoading || opened.current) return
    if ((data?.turns?.length ?? 0) === 0) {
      opened.current = true
      conversationApi.open(checkInId).then(() => qc.invalidateQueries({ queryKey: ['transcript', checkInId] }))
    }
  }, [checkInId, isLoading, data?.turns?.length, qc])

  const send = useMutation({
    mutationFn: () => conversationApi.send(checkInId!, message),
    onSuccess: () => { setMessage(''); qc.invalidateQueries({ queryKey: ['transcript', checkInId] }) },
  })

  const complete = useMutation({
    mutationFn: () => conversationApi.complete(checkInId!),
    onSuccess: (res) => { toast.success('Check-in complete. Your record is yours.'); navigate(`/grounds/${res.groundId}`) },
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [data?.turns?.length])

  const turns: ConversationTurn[] = data?.turns ?? []

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="bg-background border-b px-6 py-3 flex items-center justify-between">
        <span className="font-medium">Your check-in</span>
        <Button variant="ghost" size="sm" onClick={() => complete.mutate()} disabled={complete.isPending}>
          Complete check-in
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-3">
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {turns.length === 0 && !isLoading && (
            <Card className="p-6 text-muted-foreground text-sm">
              This is your private check-in. The other party never sees what you write here. Say what is true — start when you're ready.
            </Card>
          )}
          {turns.map((t) => (
            <div key={t.id} className={t.role === 'PERSON' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${t.role === 'PERSON' ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                {t.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="bg-background border-t px-4 py-3">
        <form
          onSubmit={(e) => { e.preventDefault(); if (message.trim()) send.mutate() }}
          className="max-w-2xl mx-auto flex gap-2"
        >
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your response…"
            rows={2}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (message.trim()) send.mutate() } }}
          />
          <Button type="submit" disabled={send.isPending || !message.trim()}>Send</Button>
        </form>
      </footer>
    </div>
  )
}
