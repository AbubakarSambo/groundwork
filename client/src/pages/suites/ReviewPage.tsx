import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewsApi, type AReview, type ReviewForTheWriter, type YourAppeal, type AppealForAnotherReader, type ReviewForThePerson, type TheRecord, type ABriefing, type RecogniseForTheWriter, type RecogniseForThePerson, type AReviewAsPictured } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, PageTitle, Section, Panel, Button, Note, ProofMark, FieldLabel, TextArea, TextField, RowList, Row, FoldedLine, EdgeList, EdgeRow } from '@/components/gw/ui'

/**
 * ONE PERFORMANCE REVIEW (E4, #/suite/reviews/:id, group 2 piece 4). The wording is copied from the
 * review in docs/prototype/screens/E-suites/suite-reviews.txt: "What Groundwork noticed", "Proof
 * first. Anything only said is marked.", "What Wairimu writes", "Aisha’s own view" and "No scores.
 * Wairimu and Aisha talk it through, and Wairimu decides." The decision uses the words of the
 * suggestions part (U.13): "Your decision", "Your reasons, in a sentence or two", "Save my decision".
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/reviews/:id). The person it is about reads
 * the facts, their own view, the decision with its reasons and, since decision 93 row 15, the writer's
 * words once written ("What Wairimu writes") with both views side by side once both exist ("Where you
 * differ"); they write their own view, never the writer's words. The person who writes it with them
 * writes their own words and decides. An admin or a lead of the team reads it. Everybody else is
 * refused by the server. A breadcrumb and title sit above every review, the person's own included.
 *
 * ONCE A REVIEW IS DECIDED, nothing on it is still editable: the person's own view and the writer's
 * words both become read-only quotes, and the decision itself is shown with no form (`Decision`
 * already did this; `ManagersWords` and the person's own view now check `r.decision` too).
 *
 * THE WRITER'S WORDS (`managersWords`) are shown read-only, attributed to whoever wrote them
 * (`writtenWithFirstName`), unless this reader is that very writer, when it reads "What you write"
 * and is editable, pre-filled with their own words as before. WHOSE WORDS THEY ARE IS DECIDED BY
 * `managersWordsById` (request 162, item 6), by sign-in, never by comparing first names - two people
 * can share a first name, and the saved words can be a reassigned writer's rather than this reader's
 * even when the names happen to match. Where the API says this reader may still write (`mayWrite`)
 * but the words on record are someone else's - the review was reassigned after its first writer wrote
 * something - the existing words stay read-only under that name, and this reader is offered their own
 * box instead, which never starts pre-filled with somebody else's words.
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
 * WORDING NO SCREEN SHOWS: "Groundwork has not written this part yet."; "... has not written anything
 * yet."; "... has not written their view yet." (a person's gender is never known, so it is "<name>’s
 * own view is not in yet." instead); "The reasons"; "... sees your decision and your reasons.";
 * "The review did not load."
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
      {data && (
        <PageTitle
          crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'Performance reviews', to: '/suite/reviews' }, { label: data.reader === 'person' ? 'Your review' : data.name }]}
          title={data.reader === 'person' ? `Your review, ${monthOf(data.dueOn)}` : `${data.firstName}’s review, ${monthOf(data.dueOn)}`}
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
      {/* Release 7: the review as pictured, built from check-ins, first; the review's own parts follow, folded under it. */}
      {data?.asPictured && <TheReviewAsPictured p={data.asPictured} />}
      {data && (data.asPictured
        /* Open while the review is in progress (fix plan, pattern 3; quarter test, Kevin): the own-view box and Update from the record are in it, and were hidden behind a closed fold. */
        ? <FoldedLine name="The record in full, what Groundwork noticed, and the decision" defaultOpen={!(data as any).decision}>{<TheReview r={data} myUserId={user?.id ?? null} />}</FoldedLine>
        : <TheReview r={data} myUserId={user?.id ?? null} />)}
    </Page>
  )
}

function TheReview({ r, myUserId }: { r: AReview; myUserId: string | null }) {
  const person = r.reader === 'person'
  const writer = r.reader === 'writer'
  const manager = r.writtenWithFirstName
  /* A decision somebody else made, for a reader who is not the person: after an appeal changed it, it is the admin's, not the reviewer's. */
  const someoneElseDecided = !person && !!r.decision && r.decidedByYou === false
  const decidedBy = !person ? r.decidedByFirstName ?? null : null
  /*
   * SCREEN FAULT (engine workspace, 9 October night, test bed copy a): Imani Hassan, after Grace
   * decided her review and Imani appealed, still read "No scores. You and Grace talk it through,
   * and Grace decides." under "Your appeal" - a sentence about how the decision gets made, left
   * standing after it had already been made. For the person it is about, once the review is
   * decided this line has nothing left to say: the decision itself is shown above (`Decision`),
   * and once appealed, the appeal's own sentence (`YourAppealSection`, `a.says`) already says who
   * decides the appeal, by name, from the server. So it is left out entirely for the person once
   * `r.decision` exists. For every other reader the line keeps its own meaning (who decided, for
   * someone reading about somebody else's review) and is unchanged.
   */
  const footer = person && r.decision
    ? null
    : someoneElseDecided
    ? (decidedBy ? `No scores. ${decidedBy} decided, and ${r.firstName} reads the decision and the reasons.` : 'No scores.')
    : !manager
    ? 'No scores.'
    : person ? `No scores. You and ${manager} talk it through, and ${manager} decides.`
      : writer ? `No scores. You and ${r.firstName} talk it through, and you decide.`
        : `No scores. ${manager} and ${r.firstName} talk it through, and ${manager} decides.`

  return (
    <>
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

        <ManagersWords r={r} myUserId={myUserId} />

        <Words
          heading={person ? 'Your own view' : `${r.firstName}’s own view`}
          text={r.theirView}
          empty={person ? 'You have not written your view yet.' : `${r.firstName}’s own view is not in yet.`}
          editable={person && !r.decision}
          save={(text) => reviewsApi.view(r.id, text)}
          reviewId={r.id}
          drafts={person && (r as any).asPictured ? () => reviewsApi.selfReviewDraft(r.id) : undefined}
        />
      </div>

      {person && r.whereYouDiffer && <WhereYouDiffer d={r.whereYouDiffer} />}

      {r.record && <TheRecordSection r={r} record={r.record} />}
      {!person && r.briefing && <TheBriefing b={r.briefing} />}
      {person && r.recognise && <WhatMayBeSuggested firstName={manager} r={r.recognise as RecogniseForThePerson} />}

      <Decision r={r} />

      <Appeal r={r} />

      {footer && <p className="gwui-panel-text-muted">{footer}</p>}
    </>
  )
}

/**
 * THE WRITER'S WORDS (item 1, item 3). For the person it is about: read-only, under the server's own
 * `managersWordsHeading` ("What Wairimu writes"), since the person never writes it (decision 93, row 15).
 *
 * For whoever writes it, a lead or an admin: always shown read-only, attributed by name
 * (`writtenWithFirstName`), UNLESS the words on record are this reader's own. WHOSE WORDS THEY ARE IS
 * `managersWordsById` (request 162, item 6), by sign-in, never a first-name guess - two people can
 * share a first name, and a review can be reassigned after its first writer has already written
 * something, in which case the new writer's own name can equal the old writer's `writtenWithFirstName`
 * by coincidence. Once words exist, this reader is the writer only when `managersWordsById` is their
 * own id; with none written yet, this reader is the writer when the API says they may write it
 * (`mayWrite`). Where the words on record are somebody else's but the API still says this reader may
 * write - the review was reassigned after its first writer wrote something - the existing words stay
 * read-only under their name, and this reader is offered their own box instead, starting empty, never
 * pre-filled with somebody else's words (item 3).
 */
function ManagersWords({ r, myUserId }: { r: AReview; myUserId: string | null }) {
  if (r.reader === 'person') {
    /* The one who writes it, never the admin who changed the decision on appeal (decision 113), who writes nothing here. */
    const writes = r.writerFirstName ?? r.writtenWithFirstName
    const heading = r.managersWordsHeading ?? (writes ? `What ${writes} writes` : null)
    if (!heading) return null
    /*
     * SCREEN FAULT 9 (FINAL WALK): "WHAT DANIEL WRITES", WITH NOTHING UNDER IT. Grace's own review
     * showed the heading and nothing else when the writer had not written their part yet - this
     * drew `null` for an empty `managersWords`, leaving the heading standing over a blank. Said in
     * words instead, the same way the other reader of this same section already is, below.
     * Nobody's gender is known, so this never guesses a pronoun ("his part"): it names the writer
     * and says what is true, "has not written anything yet.".
     */
    return (
      <Section heading={heading}>
        {r.managersWords
          ? <p className="gwui-quoted-text">“{r.managersWords}”</p>
          : <p className="gwui-panel-text-muted">{writes ? `${writes} has not written anything yet.` : 'Nobody has written this yet.'}</p>}
      </Section>
    )
  }

  const manager = r.writtenWithFirstName
  const theWriterIsMe = r.managersWords ? (!!myUserId && r.managersWordsById === myUserId) : r.mayWrite
  const mayEdit = r.mayWrite && !r.decision

  if (theWriterIsMe) {
    return (
      <Words
        heading="What you write"
        text={r.managersWords}
        empty="You have not written anything yet."
        editable={mayEdit}
        save={(text) => reviewsApi.words(r.id, text)}
        reviewId={r.id}
      />
    )
  }

  const heading = manager ? `What ${manager} writes` : 'What the manager writes'
  return (
    <Section heading={heading}>
      {r.managersWords
        ? <p className="gwui-quoted-text">“{r.managersWords}”</p>
        : !mayEdit && <p className="gwui-panel-text-muted">{manager ? `${manager} has not written anything yet.` : 'Nobody has written this yet.'}</p>}
      {mayEdit && <WriteWordsForm label="What you write" text={null} save={(text) => reviewsApi.words(r.id, text)} reviewId={r.id} />}
    </Section>
  )
}

/** Both views, side by side, once the writer and the person have each written theirs (item 1). */
function WhereYouDiffer({ d }: { d: NonNullable<ReviewForThePerson['whereYouDiffer']> }) {
  return (
    <Section heading="Where you differ">
      <p className="gwui-panel-text">{d.says}</p>
      <p className="gwui-quoted-text">“{d.managersWords}”</p>
      <p className="gwui-quoted-text">“{d.yourView}”</p>
    </Section>
  )
}

function Words({ heading, text, empty, editable, save, reviewId, drafts }: {
  heading: string; text: string | null; empty: string; editable: boolean; save: (t: string) => Promise<AReview>; reviewId: string
  /** Release 7: the person's own view, drafted from their running record. */
  drafts?: () => Promise<string>
}) {
  return (
    <Section heading={heading}>
      {editable
        ? <WriteWordsForm label={heading} text={text} save={save} reviewId={reviewId} drafts={drafts} />
        : text ? <p className="gwui-quoted-text">“{text}”</p> : <p className="gwui-panel-text-muted">{empty}</p>}
    </Section>
  )
}

/**
 * The plain form, with no `Section` of its own, so it can sit inside a heading another part of the
 * page already drew (item 3: a reader offered their own box beside the writer's already-written
 * words, inside the one "What <name> writes" section).
 */
function WriteWordsForm({ label, text, save, reviewId, drafts }: {
  label: string; text: string | null; save: (t: string) => Promise<AReview>; reviewId: string; drafts?: () => Promise<string>
}) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState(text ?? '')
  const [problem, setProblem] = useState<string | null>(null)
  const saving = useMutation({
    mutationFn: () => save(draft),
    onSuccess: (r) => { setProblem(null); qc.setQueryData(['suite-review', reviewId], r) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const fieldId = `review-words-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
  return (
    <form className="gwui-suite-q" onSubmit={e => { e.preventDefault(); if (draft.trim()) saving.mutate() }}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      {drafts && <button type="button" className="gw-link t-small gw-start" onClick={() => drafts().then(setDraft).catch(() => setProblem('That didn’t load. Try again.'))}>Draft it from my record</button>}
      <TextArea id={fieldId} rows={drafts ? 10 : 5} value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000} />
      <div><Button kind="secondary" size="small" type="submit" disabled={!draft.trim() || saving.isPending}>Save</Button></div>
      {problem && <Note tone="error">{problem}</Note>}
    </form>
  )
}

/** What Groundwork understands from the record. The person marks a line wrong and says what is true; nobody else can. */
function TheRecordSection({ r, record }: { r: AReview; record: TheRecord }) {
  const person = r.reader === 'person'
  const qc = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  /* Opening never reads the record again; the person or whoever writes it may, while it is in progress. */
  const mayUpdate = !(r as any).decision && (person || !!(r as any).mayWrite)
  const update = useMutation({
    mutationFn: () => reviewsApi.updateFromTheRecord(r.id),
    onSuccess: (x) => { setProblem(null); qc.setQueryData(['suite-review', r.id], x) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  return (
    <Section heading={person ? 'What Groundwork understands about your work' : `What Groundwork understands about ${r.firstName}’s work`}>
      <p className="gwui-panel-text">{record.intro}</p>
      {mayUpdate && (
        <p className="gwui-panel-text">
          <Button kind="secondary" size="small" onClick={() => update.mutate()} disabled={update.isPending}>{update.isPending ? 'Updating…' : 'Update from the record'}</Button>
        </p>
      )}
      {problem && <Note tone="error">{problem}</Note>}
      {record.whoReads && <p className="gwui-panel-text-muted">{record.whoReads}</p>}
      {record.parts.map(part => (
        <Panel key={part.part} as="section" aria-label={part.heading}>
          <h3 className="t-h3">{part.heading}</h3>
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
          <h3 className="t-h3">What keeps coming up</h3>
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
          <h3 className="t-h3">What changed after earlier conversations</h3>
          {b.changedAfterEarlierConversations.map((c, i) => <p key={i} className="gwui-panel-text">{c}</p>)}
        </Panel>
      )}
      {b.corrections.length > 0 && (
        <Panel as="section" aria-label="What has been marked as wrong">
          <h3 className="t-h3">What has been marked as wrong</h3>
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
      <h3 className="t-h3">{r.headline}</h3>
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
    /* "Your decision" only to whoever made it as it stands now: never to the reviewer once an admin changed it on appeal, nor to another admin (decision 113). */
    const by = r.reader !== 'person' ? r.decidedByFirstName ?? null : null
    const mine = r.reader === 'writer' && r.decidedByYou !== false
    return (
      <Section heading={mine ? 'Your decision' : by ? `${by}’s decision` : 'The decision'}>
        <p className="gwui-panel-text">{r.decision.says}</p>
        <h3 className="t-h3">{mine ? 'Your reasons' : by ? `${by}’s reasons` : 'The reasons'}</h3>
        <p className="gwui-panel-text">{r.decision.reasons}</p>
        {mine && <p className="gwui-panel-text-muted">{r.firstName} sees your decision and your reasons.</p>}
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

/**
 * APPEALING A DECIDED REVIEW (decision 113, bug B-024). Every sentence is the server's, drawn as it is
 * (`mayAppealSays`, `appeal.says`). The person appeals with their reasons, adds to them until it is
 * decided, and reads the outcome and the admin's reasons. An admin who did not decide the review
 * reads the person's reasons and decides. The reviewer reads only where it stands (the server sends
 * no reasons for the reviewer, and nothing here asks for them).
 */
function Appeal({ r }: { r: AReview }) {
  if (r.reader === 'person') {
    if (r.appeal) return <YourAppealSection r={r} a={r.appeal} />
    if (r.mayAppeal && r.mayAppealSays) return <MakeAnAppeal r={r} says={r.mayAppealSays} />
    return null
  }
  if (r.appeal) return <AnAppealForAnotherReader r={r} a={r.appeal} />
  return null
}

function DecisionWas({ was }: { was: { says: string; reasons: string } }) {
  return (
    <>
      <h3 className="t-h3">What the decision said before</h3>
      <p className="gwui-panel-text-muted">{was.says}</p>
      <p className="gwui-panel-text-muted">{was.reasons}</p>
    </>
  )
}

function MakeAnAppeal({ r, says }: { r: ReviewForThePerson; says: string }) {
  const qc = useQueryClient()
  const [asking, setAsking] = useState(false)
  const [why, setWhy] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const appeal = useMutation({
    mutationFn: () => reviewsApi.appeal(r.id, why.trim()),
    onSuccess: (x) => { setProblem(null); qc.setQueryData(['suite-review', r.id], x) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  return (
    <Section heading="Appeal this decision">
      <p className="gwui-panel-text">{says}</p>
      {!asking
        ? <div><Button kind="secondary" size="small" onClick={() => setAsking(true)}>Appeal this decision</Button></div>
        : (
          <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (why.trim()) appeal.mutate() }}>
            <div className="gwui-suite-q">
              <FieldLabel htmlFor="rv-appeal-why">Why you disagree</FieldLabel>
              <TextArea id="rv-appeal-why" rows={4} value={why} onChange={e => setWhy(e.target.value)} maxLength={2000} />
            </div>
            <div className="gwui-edge-acts">
              <Button kind="secondary" type="submit" size="small" disabled={!why.trim() || appeal.isPending}>Send my appeal</Button>
              <Button kind="quiet" size="small" onClick={() => { setAsking(false); setProblem(null) }}>Cancel</Button>
            </div>
            {problem && <Note tone="error">{problem}</Note>}
          </form>
        )}
    </Section>
  )
}

function YourAppealSection({ r, a }: { r: ReviewForThePerson; a: YourAppeal }) {
  const qc = useQueryClient()
  const [more, setMore] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const add = useMutation({
    mutationFn: () => reviewsApi.addToTheAppeal(r.id, more.trim()),
    onSuccess: (x) => { setProblem(null); setMore(''); qc.setQueryData(['suite-review', r.id], x) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const decided = a.stands === 'decided'
  return (
    <Section heading="Your appeal">
      <p className="gwui-panel-text">{a.says}</p>
      <h3 className="t-h3">Your reasons</h3>
      <p className="gwui-quoted-text">“{a.yourReasons}”</p>
      {a.additions.map((x, i) => <p key={i} className="gwui-quoted-text">“{x.said}”</p>)}
      {decided && a.reasons && a.reasons !== r.decision?.reasons && (
        <>
          <h3 className="t-h3">{a.decidedByFirstName ? `${a.decidedByFirstName}’s reasons` : 'The reasons'}</h3>
          <p className="gwui-panel-text">{a.reasons}</p>
        </>
      )}
      {decided && a.outcome === 'changed' && a.decisionWas && <DecisionWas was={a.decisionWas} />}
      {!decided && (
        <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (more.trim()) add.mutate() }}>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="rv-appeal-more">Add to your reasons</FieldLabel>
            <TextArea id="rv-appeal-more" rows={3} value={more} onChange={e => setMore(e.target.value)} maxLength={2000} />
          </div>
          <div><Button kind="secondary" size="small" type="submit" disabled={!more.trim() || add.isPending}>Add to my reasons</Button></div>
          {problem && <Note tone="error">{problem}</Note>}
        </form>
      )}
    </Section>
  )
}

function AnAppealForAnotherReader({ r, a }: { r: ReviewForTheWriter; a: AppealForAnotherReader }) {
  const qc = useQueryClient()
  const [outcome, setOutcome] = useState<'stands' | 'changed' | ''>('')
  const [reasons, setReasons] = useState('')
  const [now, setNow] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const decide = useMutation({
    mutationFn: () => reviewsApi.decideTheAppeal(r.id, { outcome: outcome as 'stands' | 'changed', reasons: reasons.trim(), ...(outcome === 'changed' ? { decision: now.trim() } : {}) }),
    onSuccess: (x) => { setProblem(null); qc.setQueryData(['suite-review', r.id], x) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const decided = a.stands === 'decided'
  const ready = !!outcome && !!reasons.trim() && (outcome !== 'changed' || !!now.trim())
  return (
    <Section heading={`${a.personFirstName}’s appeal`}>
      <p className="gwui-panel-text">{a.says}</p>
      {a.theirReasons && (
        <>
          <h3 className="t-h3">{`${a.personFirstName}’s reasons`}</h3>
          <p className="gwui-quoted-text">“{a.theirReasons}”</p>
          {(a.additions ?? []).map((x, i) => <p key={i} className="gwui-quoted-text">“{x.said}”</p>)}
        </>
      )}
      {decided && a.reasons && a.reasons !== r.decision?.reasons && (
        <>
          <h3 className="t-h3">The reasons for the outcome of the appeal</h3>
          <p className="gwui-panel-text">{a.reasons}</p>
        </>
      )}
      {decided && a.outcome === 'changed' && a.decisionWas && <DecisionWas was={a.decisionWas} />}
      {a.mayDecide && !decided && (
        <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (ready) decide.mutate() }}>
          <fieldset className="gwui-suite-q">
            <legend>Your decision on the appeal</legend>
            <label><input type="radio" name="rv-appeal-outcome" checked={outcome === 'stands'} onChange={() => setOutcome('stands')} /> The decision stands</label>
            <label><input type="radio" name="rv-appeal-outcome" checked={outcome === 'changed'} onChange={() => setOutcome('changed')} /> Change the decision</label>
          </fieldset>
          {outcome === 'changed' && (
            <div className="gwui-suite-q">
              <FieldLabel htmlFor="rv-appeal-now">What the decision is now</FieldLabel>
              <TextField id="rv-appeal-now" value={now} onChange={e => setNow(e.target.value)} maxLength={1000} />
            </div>
          )}
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="rv-appeal-reasons">Your reasons, in a sentence or two</FieldLabel>
            <TextArea id="rv-appeal-reasons" rows={3} value={reasons} onChange={e => setReasons(e.target.value)} maxLength={2000} />
          </div>
          <div><Button kind="secondary" type="submit" disabled={!ready || decide.isPending}>Save my decision on the appeal</Button></div>
          {problem && <Note tone="error">{problem}</Note>}
        </form>
      )}
    </Section>
  )
}

const EDGE = { rec: 'ready', act: 'decide', att: 'look', con: 'concern' } as const

/** RELEASE 7: "A review built from check-ins", as the Check-in Reports file draws it: three readings, what they committed to and did, blocked or dropped, their view, who decides. */
function TheReviewAsPictured({ p }: { p: AReviewAsPictured }) {
  return (
    <>
      <div className="g3">
        {p.readings.map((r) => (
          <div key={r.label} className="panel pad gw-col-6">
            <span className="t-tiny mut gw-caps">{r.label}</span>
            <b>{r.question}</b>
            <p className="t-small">{r.says}</p>
            {/* What it rests on, from the record (Hafsah, 25 October: each reading with its evidence, never a combined score). */}
            {(r.evidence ?? []).length > 0 && <ul className="gw-evidence">{(r.evidence ?? []).map((e) => <li key={e} className="t-tiny mut">{e}</li>)}</ul>}
          </div>
        ))}
      </div>
      {p.committed.length > 0 && (
        <Section heading={p.committedHeading}>
          <EdgeList label={p.committedHeading}>{p.committed.map((c) => <EdgeRow key={c.title} kind={EDGE[c.tone]} reason={null} title={c.title} detail={c.says} />)}</EdgeList>
        </Section>
      )}
      {p.blockedOrDropped.length > 0 && (
        <Section heading="Blocked, or dropped it?">
          <EdgeList label="Blocked, or dropped it">{p.blockedOrDropped.map((c) => <EdgeRow key={c.title} kind={EDGE[c.tone]} reason={null} title={c.title} detail={c.says} />)}</EdgeList>
        </Section>
      )}
      <Section heading={p.ownViewHeading}><p className="t-body">{p.ownView}</p></Section>
      <Section heading={p.decidesHeading}><p className="t-body">{p.decides}</p></Section>
    </>
  )
}
