import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewsApi, type AReview, type TheRecord, type ABriefing, type RecogniseForTheWriter, type RecogniseForThePerson } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, PageTitle, Section, Panel, Button, Note, ProofMark, FieldLabel, TextArea, TextField, RowList, Row } from '@/components/gw/ui'

/**
 * ONE PERFORMANCE REVIEW (E4, #/suite/reviews/:id, group 2 piece 4). The wording is copied from the
 * review in docs/prototype/screens/E-suites/suite-reviews.txt: "What Groundwork noticed", "Proof
 * first. Anything only said is marked.", "What Wairimu writes", "Aisha’s own view" and "No scores.
 * Wairimu and Aisha talk it through, and Wairimu decides." The decision uses the words of the
 * suggestions part (U.13): "Your decision", "Your reasons, in a sentence or two", "Save my decision".
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/reviews/:id). The person it is about reads
 * the facts, their own view and the decision with its reasons, never the manager's words (item 28),
 * and writes their own view. The person who writes it with them writes their own words and decides.
 * An admin or a lead of the team reads it. Everybody else is refused by the server.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` (its own `crumbs`), `Section` (`.gwui-cards-3`,
 * the review's own three-column row, the prototype's own shape) for "What Groundwork noticed",
 * "What ... writes" and "... own view", the new `ProofMark` (brought over from kit.tsx's `Mark`,
 * renamed so it is never confused with this kit's own `Mark` wordmark - see
 * docs/the-parts-against-the-prototype.md) for each noticed line, `FieldLabel`/`TextArea`/
 * `TextField` for what a person writes, and `Note`/`Empty` for loading, error and empty states.
 *
 * ALSO DRAWN, WHEN THE SERVER SENDS THEM (decision 85, item 4): the record Groundwork understands (every
 * line, with the person's correction beside it; only the person can mark a line wrong and say what is
 * true), the writer's briefing, and "Groundwork suggests recognising Aisha’s work" for the writer alone,
 * with the prototype's "Agree" (which fills in "Recognise Aisha’s work." for the writer to give reasons
 * for) and "Choose something else". The person reads their own count and who decides.
 *
 * WORDING NO SCREEN SHOWS (item 28): "Your review, March"; "What you write"; "Your own view";
 * "Groundwork has not written this part yet."; "... has not written anything yet."; "... has not
 * written their view yet."; "The decision"; "The reasons"; "... sees your decision and your reasons.";
 * "Save"; "The review did not load."
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const monthOf = (day: string) => whenItWas(new Date(`${day}T00:00:00.000Z`), 'month', 'UTC')

export function ReviewPage() {
  const { id = '' } = useParams()
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-review', id],
    queryFn: () => reviewsApi.one(id),
    enabled: !!user && !!id,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  return (
    <Page>
      {data && data.reader !== 'person' && (
        <PageTitle
          crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'Performance reviews', to: '/suite/reviews' }, { label: data.name }]}
          title={`${data.firstName}’s review, ${monthOf(data.dueOn)}`}
        />
      )}
      {isLoading && <Note>Loading…</Note>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone="error">{refused.data?.message ?? 'You cannot open this review.'}</Note>
        ) : (
          <div>
            <Note tone="error">The review did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}
      {data && <TheReview r={data} />}
    </Page>
  )
}

function TheReview({ r }: { r: AReview }) {
  const person = r.reader === 'person'
  const writer = r.reader === 'writer'
  const manager = r.writtenWithFirstName
  const title = person ? `Your review, ${monthOf(r.dueOn)}` : `${r.firstName}’s review, ${monthOf(r.dueOn)}`
  const footer = !manager
    ? 'No scores.'
    : person ? `No scores. You and ${manager} talk it through, and ${manager} decides.`
      : writer ? `No scores. You and ${r.firstName} talk it through, and you decide.`
        : `No scores. ${manager} and ${r.firstName} talk it through, and ${manager} decides.`

  return (
    <>
      {person && <PageTitle title={title} />}

      <div className="gwui-cards-3">
        <Section heading="What Groundwork noticed" note="Proof first. Anything only said is marked.">
          {r.noticed.length === 0
            ? <p className="gwui-panel-text-muted">Groundwork has not written this part yet.</p>
            : (
              <RowList label="What Groundwork noticed">
                {r.noticed.map((n, i) => (
                  <Row key={i} columns="auto minmax(0, 1fr)">
                    <ProofMark mark={n.mark} />
                    <span>{n.says}</span>
                  </Row>
                ))}
              </RowList>
            )}
        </Section>

        {!person && (
          <Words
            heading={writer ? 'What you write' : `What ${manager ?? 'the manager'} writes`}
            text={r.managersWords}
            empty={`${writer ? 'You have' : `${manager ?? 'The manager'} has`} not written anything yet.`}
            editable={writer}
            save={(text) => reviewsApi.words(r.id, text)}
            reviewId={r.id}
          />
        )}

        <Words
          heading={person ? 'Your own view' : `${r.firstName}’s own view`}
          text={r.theirView}
          empty={person ? 'You have not written your view yet.' : `${r.firstName} has not written their view yet.`}
          editable={person}
          save={(text) => reviewsApi.view(r.id, text)}
          reviewId={r.id}
        />
      </div>

      {r.record && <TheRecordSection r={r} record={r.record} />}
      {!person && r.briefing && <TheBriefing b={r.briefing} />}
      {person && r.recognise && <WhatMayBeSuggested firstName={manager} r={r.recognise as RecogniseForThePerson} />}

      <Decision r={r} />

      <p className="gwui-panel-text-muted">{footer}</p>
    </>
  )
}

function Words({ heading, text, empty, editable, save, reviewId }: {
  heading: string; text: string | null; empty: string; editable: boolean; save: (t: string) => Promise<AReview>; reviewId: string
}) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState(text ?? '')
  const [problem, setProblem] = useState<string | null>(null)
  const saving = useMutation({
    mutationFn: () => save(draft),
    onSuccess: (r) => { setProblem(null); qc.setQueryData(['suite-review', reviewId], r) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const fieldId = `review-words-${heading.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
  return (
    <Section heading={heading}>
      {editable ? (
        <form className="gwui-suite-q" onSubmit={e => { e.preventDefault(); if (draft.trim()) saving.mutate() }}>
          <FieldLabel htmlFor={fieldId}>{heading}</FieldLabel>
          <TextArea id={fieldId} rows={5} value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000} />
          <div><Button kind="secondary" size="small" type="submit" disabled={!draft.trim() || saving.isPending}>Save</Button></div>
          {problem && <Note tone="error">{problem}</Note>}
        </form>
      ) : text ? <p className="gwui-quoted-text">“{text}”</p> : <p className="gwui-panel-text-muted">{empty}</p>}
    </Section>
  )
}

/** What Groundwork understands from the record. The person marks a line wrong and says what is true; nobody else can. */
function TheRecordSection({ r, record }: { r: AReview; record: TheRecord }) {
  const person = r.reader === 'person'
  return (
    <Section heading={person ? 'What Groundwork understands about your work' : `What Groundwork understands about ${r.firstName}’s work`}>
      <p className="gwui-panel-text">{record.intro}</p>
      {record.whoReads && <p className="gwui-panel-text-muted">{record.whoReads}</p>}
      {record.parts.map(part => (
        <Panel key={part.part} as="section" aria-label={part.heading}>
          <h3 className="gwui-panel-heading">{part.heading}</h3>
          <RowList label={part.heading}>
            {part.lines.map(l => <ALine key={l.key} reviewId={r.id} line={l} mayCorrect={record.mayCorrect} />)}
          </RowList>
        </Panel>
      ))}
    </Section>
  )
}

function ALine({ reviewId, line, mayCorrect }: { reviewId: string; line: TheRecord['parts'][number]['lines'][number]; mayCorrect: boolean }) {
  const qc = useQueryClient()
  const [asking, setAsking] = useState(false)
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => reviewsApi.correct(reviewId, line.key, text.trim()),
    onSuccess: (x) => { setProblem(null); setAsking(false); setText(''); qc.setQueryData(['suite-review', reviewId], x) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const fieldId = `review-correct-${line.key.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <span>{line.says}</span>
        {line.correction && (
          <>
            <p className="gwui-panel-text-muted">{line.correction.said}</p>
            <p className="gwui-quoted-text">“{line.correction.whatIsTrue}”</p>
          </>
        )}
        {asking && (
          <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (text.trim()) save.mutate() }}>
            <div className="gwui-suite-q">
              <FieldLabel htmlFor={fieldId}>What is true</FieldLabel>
              <TextArea id={fieldId} rows={3} value={text} onChange={e => setText(e.target.value)} maxLength={2000} />
            </div>
            <div className="gwui-edge-acts">
              <Button kind="secondary" size="small" type="submit" disabled={!text.trim() || save.isPending}>Save what is true</Button>
              <Button kind="quiet" size="small" onClick={() => { setAsking(false); setProblem(null) }}>Cancel</Button>
            </div>
          </form>
        )}
        {problem && <Note tone="error">{problem}</Note>}
      </div>
      {mayCorrect && !asking && (
        <Button kind="quiet" size="small" onClick={() => setAsking(true)} aria-label={`This is wrong, ${line.says}`}>This is wrong</Button>
      )}
    </Row>
  )
}

/** The writer's briefing: counts, patterns with the person's answer beside each, what changed after earlier talks, corrections. */
function TheBriefing({ b }: { b: ABriefing }) {
  return (
    <Section heading={b.heading}>
      {b.counts && <p className="gwui-panel-text">{b.counts}</p>}
      {b.patterns.length > 0 && (
        <Panel as="section" aria-label="What keeps coming up">
          <h3 className="gwui-panel-heading">What keeps coming up</h3>
          <RowList label="What keeps coming up">
            {b.patterns.map((p, i) => (
              <Row key={i} columns="minmax(0, 1fr)">
                <div>
                  <b>{p.heading}</b>
                  {p.whatHappened && <p className="gwui-panel-text">{p.whatHappened}</p>}
                  <p className="gwui-panel-text">{p.howOften}</p>
                  <p className="gwui-panel-text-muted">{p.checkIn}</p>
                  <p className="gwui-panel-text">{p.theirAnswer}</p>
                </div>
              </Row>
            ))}
          </RowList>
          {b.patternsNote && <p className="gwui-panel-text-muted">{b.patternsNote}</p>}
        </Panel>
      )}
      {b.changedAfterEarlierConversations.length > 0 && (
        <Panel as="section" aria-label="What changed after earlier conversations">
          <h3 className="gwui-panel-heading">What changed after earlier conversations</h3>
          {b.changedAfterEarlierConversations.map((c, i) => <p key={i} className="gwui-panel-text">{c}</p>)}
        </Panel>
      )}
      {b.corrections.length > 0 && (
        <Panel as="section" aria-label="What has been marked as wrong">
          <h3 className="gwui-panel-heading">What has been marked as wrong</h3>
          {b.corrections.map((c, i) => (
            <div key={i}>
              <p className="gwui-panel-text">{c.line}</p>
              <p className="gwui-panel-text-muted">{c.said}</p>
              <p className="gwui-quoted-text">“{c.whatIsTrue}”</p>
            </div>
          ))}
        </Panel>
      )}
      <p className="gwui-panel-text-muted">{b.whoDecides}</p>
    </Section>
  )
}

/** What the person reads when Groundwork may suggest recognising their work: their own count, the line, who decides. */
function WhatMayBeSuggested({ firstName, r }: { firstName: string | null; r: RecogniseForThePerson }) {
  return (
    <Section heading={firstName ? `What Groundwork may suggest to ${firstName}` : 'What Groundwork may suggest'}>
      <p className="gwui-panel-text">{r.facts}</p>
      <p className="gwui-panel-text-muted">{r.whoDecides}</p>
    </Section>
  )
}

/** "Groundwork suggests recognising Aisha’s work": the card the writer sees, with the prototype's Agree and Choose something else. */
function TheSuggestion({ r, firstName, onAgree, onElse }: { r: RecogniseForTheWriter; firstName: string; onAgree: () => void; onElse: () => void }) {
  return (
    <Panel as="section" aria-label={r.headline}>
      <h3 className="gwui-panel-heading">{r.headline}</h3>
      <p className="gwui-panel-text">{r.why}</p>
      <p className="gwui-panel-text-muted">{r.whatWouldChangeIt}</p>
      <p className="gwui-panel-text-muted">{r.yourDecision}</p>
      <div className="gwui-edge-acts">
        <Button kind="secondary" size="small" onClick={onAgree} aria-label={`Agree to recognise ${firstName}’s work`}>Agree</Button>
        <Button kind="quiet" size="small" onClick={onElse}>Choose something else</Button>
      </div>
    </Panel>
  )
}

function Decision({ r }: { r: AReview }) {
  const qc = useQueryClient()
  const [says, setSays] = useState('')
  const [reasons, setReasons] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const saving = useMutation({
    mutationFn: () => reviewsApi.decide(r.id, says.trim(), reasons.trim()),
    onSuccess: (x) => { setProblem(null); qc.setQueryData(['suite-review', r.id], x) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const writer = r.reader === 'writer'
  const suggestion = r.reader !== 'person' ? r.recognise ?? null : null

  if (r.decision) {
    return (
      <Section heading={writer ? 'Your decision' : 'The decision'}>
        <p className="gwui-panel-text">{r.decision.says}</p>
        <h3 className="gwui-panel-heading">{writer ? 'Your reasons' : 'The reasons'}</h3>
        <p className="gwui-panel-text">{r.decision.reasons}</p>
        {writer && <p className="gwui-panel-text-muted">{r.firstName} sees your decision and your reasons.</p>}
      </Section>
    )
  }
  if (!writer) return null
  return (
    <Section heading="Your decision">
      {suggestion && (
        <TheSuggestion r={suggestion} firstName={r.firstName}
          onAgree={() => setSays(`Recognise ${r.firstName}’s work.`)} onElse={() => setSays('')} />
      )}
      <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (says.trim() && reasons.trim()) saving.mutate() }}>
        <div className="gwui-suite-q">
          <FieldLabel htmlFor="rv-says">Your decision</FieldLabel>
          <TextField id="rv-says" value={says} onChange={e => setSays(e.target.value)} maxLength={1000} />
        </div>
        <div className="gwui-suite-q">
          <FieldLabel htmlFor="rv-reasons">Your reasons, in a sentence or two</FieldLabel>
          <TextArea id="rv-reasons" rows={3} value={reasons} onChange={e => setReasons(e.target.value)} maxLength={2000} />
        </div>
        <div><Button type="submit" disabled={!says.trim() || !reasons.trim() || saving.isPending}>Save my decision</Button></div>
        {problem && <Note tone="error">{problem}</Note>}
      </form>
    </Section>
  )
}
