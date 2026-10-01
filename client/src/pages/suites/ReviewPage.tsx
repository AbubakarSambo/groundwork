import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewsApi, type AReview } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, PageTitle, Section, Button, Note, ProofMark, FieldLabel, TextArea, TextField, RowList, Row } from '@/components/gw/ui'

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
 * NOT DRAWN HERE, ON PURPOSE: Groundwork's suggestion ("Groundwork suggests recognising Aisha’s
 * work"). A suggestion belongs to a check-in today, not to a review; the engine is asked for one
 * that belongs to a review (request 23).
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
