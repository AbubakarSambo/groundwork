import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { patternsApi, type ServedPattern } from '@/api/patterns'
import { Panel } from './Panel'
import { Button } from './Button'
import { TextArea } from './FormFields'
import { Note, Callout } from './NoteEmpty'
import { Stack } from './Stack'
import { FlexRow } from './FlexRow'

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
  leadFirstName,
}: {
  pattern: ServedPattern
  /** The query this pattern came from, invalidated once an answer is saved. */
  invalidateKey: readonly unknown[]
  /** Whose work this is, for a reader who is not the person themselves (the lead's board). Left out on a page that is always the reader's own. */
  name?: string
  /** Whoever runs this check-in, by first name, for "{name} has said they talked this through with
      you." (board review, 1 October, item 4) - never the bare word "lead" when a name is known. */
  leadFirstName?: string | null
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(pattern.theirWords ?? '')

  /*
   * The server's own answer, drawn straight away, rather than waiting on the page above to refetch
   * and pass a new `pattern` prop down. `null` means "nothing pressed yet in this render - read the
   * server's own `pattern` field instead".
   */
  const [talkedAboutJustNow, setTalkedAboutJustNow] = useState<boolean | null>(null)
  const [markJustNow, setMarkJustNow] = useState<'RIGHT' | 'WRONG' | 'NOT_SURE' | null>(null)
  const talkedAboutNow = talkedAboutJustNow ?? pattern.talkedAbout
  const leadMarkNow = markJustNow ?? pattern.leadMark

  const answer = useMutation({
    mutationFn: (words: string) => patternsApi.answer(pattern.id, words),
    onSuccess: () => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: invalidateKey })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be saved. Try again.'),
  })

  /*
   * ONE REQUEST PER PRESS. `disabled={...isPending}` alone is not enough: two clicks fired in the
   * same tick (a fast double-click, or a key repeat) can both read `isPending` as still false,
   * because the state update from the first click has not yet reached this closure. A ref is read
   * and set synchronously, in the same tick as the click, so a second click before the first has
   * even started the request is refused outright.
   */
  const talkedAboutInFlight = useRef(false)
  const markInFlight = useRef(false)

  /* WHOEVER RUNS THE CHECK-IN marks "we talked about it" (decision 57, item 3). A failure says so
     in a plain sentence beside the button (drawn from `talkedAbout.isError` below), not only a
     silent spinner, and the button is free to press again. */
  const talkedAbout = useMutation({
    mutationFn: () => patternsApi.talkedAbout(pattern.id),
    onSuccess: (served) => {
      talkedAboutInFlight.current = false
      setTalkedAboutJustNow(served.talkedAbout ?? true)
      qc.invalidateQueries({ queryKey: invalidateKey })
    },
    onError: () => { talkedAboutInFlight.current = false },
  })

  /* WHOEVER RUNS THE CHECK-IN marks what they made of a pattern, after talking it through (decision
     57, item 2). Changeable: pressing a different one sends a new request. A failure says so in a
     plain sentence beside the buttons (`mark.isError` below), and the buttons are free to press
     again. */
  const mark = useMutation({
    mutationFn: (value: 'RIGHT' | 'WRONG' | 'NOT_SURE') => patternsApi.mark(pattern.id, value),
    onSuccess: (served) => {
      markInFlight.current = false
      setMarkJustNow(served.leadMark ?? null)
      qc.invalidateQueries({ queryKey: invalidateKey })
    },
    onError: () => { markInFlight.current = false },
  })

  return (
    <Panel className="gwui-panel-caution">
      {name && <div className="gwui-fs-13 gwui-ink-dark gwui-mb-4" style={{ fontWeight: 700 }}>{name}</div>}
      <Stack gap={6}>
        <p className="gwui-panel-text" style={{ fontWeight: 700 }}>{pattern.heading}</p>
        {(pattern.whatHappened || pattern.howOften) && (
          <p className="gwui-panel-text">
            {[pattern.howOften, pattern.whatHappened].filter(Boolean).join(' ')}
          </p>
        )}
        <p className="gwui-panel-text-muted">{pattern.whoSeesIt}</p>
      </Stack>

      <Stack gap={6}>
        {/*
          Whether whoever runs the check-in has said they talked it through, a plain fact both
          readers may see. Board review, 1 October, item 4: "Your lead has said..." named nobody,
          even where the lead's own first name is known - said by name when it is.
        */}
        {talkedAboutNow && (
          <p className="gwui-panel-text-muted">
            {pattern.yours
              ? (leadFirstName ? `${leadFirstName} has said they talked this through with you.` : 'Your lead has said they talked this through with you.')
              : `This has been talked through with ${name ?? 'them'}.`}
          </p>
        )}

        {/*
          "WE TALKED ABOUT IT" (decision 57, item 3). Only for whoever runs the check-in, and only
          while the server has not already recorded it - a colleague never reaches this row at all,
          and the person it is about never gets this button (the server never sends them a reason
          to press it). One press is enough: a second press is a no-op on the server, so once it is
          recorded the button is replaced by the plain sentence above, never shown alongside it.
        */}
        {!pattern.yours && !talkedAboutNow && (
          <div>
            <Button
              kind="secondary"
              size="small"
              disabled={talkedAbout.isPending}
              onClick={() => {
                if (talkedAboutInFlight.current) return
                talkedAboutInFlight.current = true
                talkedAbout.mutate()
              }}
            >
              We talked about it
            </Button>
            {talkedAbout.isError && (
              <p className="gwui-panel-text-muted" role="alert">That could not be saved. Try again.</p>
            )}
          </div>
        )}

        {/* After talking it through: the lead's own mark, for that reader alone, never shown to the person it is about. */}
        {leadMarkNow && (
          <p className="gwui-panel-text-muted">
            {leadMarkNow === 'RIGHT' ? "You said this was right, once you talked it through."
              : leadMarkNow === 'WRONG' ? "You said this was not right, once you talked it through."
              : "You said you were not sure, once you talked it through."}
          </p>
        )}

        {/*
          RIGHT / WRONG / NOT SURE (decision 57, item 2). Only for whoever runs the check-in: the
          server never sends `leadMark` to the person it is about or to a colleague, and a colleague
          never reaches this row at all, so gating on `!pattern.yours` is enough. Changeable: pressing
          a different one sends a new mark, and the one already chosen shows pressed.
        */}
        {!pattern.yours && (
          <Stack gap={4}>
            <p className="gwui-panel-text" style={{ fontWeight: 700 }}>After talking it through, was this right?</p>
            <FlexRow gap={8} wrap>
              {([
                ['RIGHT', 'Right'],
                ['WRONG', 'Wrong'],
                ['NOT_SURE', 'Not sure'],
              ] as const).map(([value, label]) => (
                <Button
                  key={value}
                  kind={leadMarkNow === value ? 'primary' : 'secondary'}
                  size="small"
                  aria-pressed={leadMarkNow === value}
                  disabled={mark.isPending}
                  onClick={() => {
                    if (markInFlight.current) return
                    markInFlight.current = true
                    mark.mutate(value)
                  }}
                >
                  {label}
                </Button>
              ))}
            </FlexRow>
            {mark.isError && (
              <p className="gwui-panel-text-muted" role="alert">That could not be saved. Try again.</p>
            )}
          </Stack>
        )}
      </Stack>

      {pattern.askThem && (
        <div className="gwui-mt-8">
          {/* The next step for this (layer 3): the lead's own, or the question Groundwork will put in the next check-in (F2, 2 November 2026). */}
          <Callout title="Here is the next step.">{pattern.askThem}</Callout>
        </div>
      )}

      {pattern.theirWords && !open && (
        <div className="gwui-fs-13 gwui-ink-text gwui-mt-8">
          <Note tone="muted">{theWordsLine(pattern.yours, name)}</Note>
          <div>“{pattern.theirWords}”</div>
        </div>
      )}

      {pattern.canAnswer && (
        <div className="gwui-mt-10">
          {!open ? (
            <Button kind="secondary" size="small" onClick={() => setOpen(true)}>
              {pattern.theirWords ? 'Change what you said' : 'Say what’s behind it'}
            </Button>
          ) : (
            <Stack gap={8}>
              <TextArea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What is behind it"
                aria-label="What is behind it"
              />
              <div className="gwui-gap-8" style={{ display: 'flex' }}>
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
            </Stack>
          )}
        </div>
      )}
    </Panel>
  )
}
