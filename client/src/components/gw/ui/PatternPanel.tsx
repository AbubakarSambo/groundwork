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
/** Whose words these are, as a full sentence (no label joined to the words with a colon). */
export function theWordsLine(yours: boolean | undefined, name?: string): string {
  if (yours) return 'You said this about it.'
  return `${name?.trim() || 'They'} said this about it.`
}

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

      {/*
        REQUEST 82: COACHING BESIDE A PATTERN, FOR WHOEVER RUNS THE CHECK-IN ONLY. The server sends
        `coachTowards` and `oneStep` only to that reader (null for the person it is about), so there
        is nothing to gate here beyond their presence.
      */}
      {(pattern.coachTowards || pattern.oneStep) && (
        <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.55, marginTop: 8 }}>
          {pattern.coachTowards && <div>{pattern.coachTowards}</div>}
          {pattern.oneStep && <div className="gwui-mt-4">{pattern.oneStep}</div>}
        </div>
      )}

      {/* "Two separate reads of the record found this." For whoever runs the check-in only. */}
      {pattern.secondReadNote && (
        <p className="gwui-panel-text-muted" style={{ marginTop: 6, fontStyle: 'italic' }}>{pattern.secondReadNote}</p>
      )}

      {/* Whether whoever runs the check-in has said they talked it through, a plain fact both readers may see. */}
      {pattern.talkedAbout && (
        <p className="gwui-panel-text-muted" style={{ marginTop: 6 }}>
          {pattern.yours ? 'Your lead has said they talked this through with you.' : `This has been talked through with ${name ?? 'them'}.`}
        </p>
      )}

      {/* After talking it through: the lead's own mark, for that reader alone, never shown to the person it is about. */}
      {pattern.leadMark && (
        <p className="gwui-panel-text-muted" style={{ marginTop: 6 }}>
          {pattern.leadMark === 'RIGHT' ? "You said this was right, once you talked it through."
            : pattern.leadMark === 'WRONG' ? "You said this was not right, once you talked it through."
            : "You said you were not sure, once you talked it through."}
        </p>
      )}

      {pattern.askThem && (
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55, marginTop: 8, paddingLeft: 11, borderLeft: '2px solid var(--gw-border)' }}>
          <div style={{ color: 'var(--gw-muted)' }}>{`A question you could ask ${name ?? 'them'}, to hear their side.`}</div>
          <div>{pattern.askThem}</div>
        </div>
      )}

      {pattern.theirWords && !open && (
        <div style={{ fontSize: 13, color: 'var(--gw-text)', marginTop: 8 }}>
          <div style={{ color: 'var(--gw-muted)' }}>{theWordsLine(pattern.yours, name)}</div>
          <div>“{pattern.theirWords}”</div>
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
