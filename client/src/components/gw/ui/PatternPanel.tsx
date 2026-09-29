import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { patternsApi, type ServedPattern } from '@/api/patterns'
import { Panel } from './Panel'
import { Button } from './Button'
import { TextArea } from './FormFields'

/**
 * ONE PATTERN, WHEREVER IT IS SHOWN. Built once from the shared parts so "Your work", the You
 * board and the lead's board never draw a pattern differently.
 *
 * The heading is the pattern's own sentence (the plain name), then the engine's own detail about
 * this occurrence when it has one, then how often it has come up, then who else sees it. When the
 * reader is the person it is about (`canAnswer`), a "Say what's behind it" box posts `{ text }` to
 * `POST /patterns/:id/answer` and then shows their own words back next to the pattern, so nobody
 * has to reload the page to see that it was saved.
 */
export function PatternPanel({
  pattern,
  invalidateKey,
  name,
}: {
  pattern: ServedPattern
  /** The query this pattern came from, invalidated once an answer is saved. */
  invalidateKey: readonly unknown[]
  /** Whose work this is, for a reader who is not the person themselves (the lead's board). Left out on a page that is always the reader's own. */
  name?: string
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(pattern.theirWords ?? '')

  const answer = useMutation({
    mutationFn: (words: string) => patternsApi.answer(pattern.id, words),
    onSuccess: () => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: invalidateKey })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be saved. Try again.'),
  })

  return (
    <Panel style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)' }}>
      {name && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 4 }}>{name}</div>}
      <p className="gwui-panel-text" style={{ fontWeight: 700 }}>{pattern.heading}</p>
      {(pattern.whatHappened || pattern.howOften) && (
        <p className="gwui-panel-text" style={{ marginTop: 6 }}>
          {[pattern.howOften, pattern.whatHappened].filter(Boolean).join(' ')}
        </p>
      )}
      <p className="gwui-panel-text-muted" style={{ marginTop: 6 }}>{pattern.whoSeesIt}</p>

      {pattern.askThem && (
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55, marginTop: 8, paddingLeft: 11, borderLeft: '2px solid var(--gw-border)' }}>
          <span style={{ color: 'var(--gw-muted)' }}>Ask them: </span>
          {pattern.askThem}
        </div>
      )}

      {pattern.theirWords && !open && (
        <div style={{ fontSize: 13, color: 'var(--gw-text)', marginTop: 8 }}>
          <span style={{ color: 'var(--gw-muted)' }}>{pattern.yours ? 'In your own words: ' : 'In their own words: '}</span>
          {pattern.theirWords}
        </div>
      )}

      {pattern.canAnswer && (
        <div style={{ marginTop: 10 }}>
          {!open ? (
            <Button kind="secondary" size="small" onClick={() => setOpen(true)}>
              {pattern.theirWords ? 'Change what you said' : 'Say what’s behind it'}
            </Button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TextArea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What is behind it"
                aria-label="What is behind it"
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="small"
                  disabled={!text.trim() || answer.isPending}
                  onClick={() => answer.mutate(text.trim())}
                >
                  Save
                </Button>
                <Button kind="quiet" size="small" onClick={() => { setOpen(false); setText(pattern.theirWords ?? '') }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
