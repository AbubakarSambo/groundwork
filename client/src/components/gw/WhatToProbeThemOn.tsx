import { neverAnAddressAsAName } from './an-address-that-can-receive-mail'

/**
 * WHAT TO PROBE EACH PERSON ON. THE LEAD SEES THIS AND NOBODY ELSE DOES.
 *
 * A lead reads the same report as everybody and then has to decide what to say to each person.
 * The product had nothing for that moment, so the decision came from a paragraph of synthesis and
 * whatever the lead already believed.
 *
 * IT RENDERS OBSERVATIONS AND QUESTIONS, NEVER A VERDICT. Not on character, motivation or effort.
 * The server builds every line from a row with a date on it, and reports a silent record as a
 * silent record rather than as somebody not having tried. See what-to-probe.ts.
 *
 * IT AGREES WITH WHAT EACH PERSON WAS TOLD. Both surfaces read the same dependencies and the same
 * surfaced patterns, so a lead raising something will find the person was already asked to move
 * it. The conversation is not an ambush.
 *
 * WHY IT CANNOT LEAK BY ACCIDENT. The server returns null for anybody who is not the lead or an
 * org admin, before it reads a row, so this component has nothing to render rather than something
 * to hide. A `{isLead && ...}` here would be one refactor from being wrong.
 */
export interface ProbeRead {
  who: string
  participantId: string
  probe: string[]
  encourage: string[]
  triedToUnblock: string
}

/* U.9 RE-REVIEW, ITEM A: a plain heading, not a shout ("WORTH ASKING", "WORTH SAYING"). */
function Block({ title, lines, markInferred, note }: { title: string; lines: string[]; markInferred?: boolean; note?: string }) {
  if (!lines.length) return null
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-sub-d)', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {lines.map((l, i) => {
          if (!markInferred) return <p key={i} style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, maxWidth: '68ch' }}>{l}</p>
          const { text, inferred } = splitInference(l)
          return (
            <p key={i} style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, maxWidth: '68ch' }}>
              {text}
              {inferred && (
                <span title={inferred} style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 4, border: '1px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-sub)', whiteSpace: 'nowrap' }}>
                  inferred
                </span>
              )}
            </p>
          )
        })}
      </div>
      {note && <p className="gwui-panel-text-muted">{note}</p>}
    </div>
  )
}

/**
 * `[INFERRED: ...]` IS MACHINERY, AND IT MUST NOT REACH THE READER RAW. Moved from the dead Report
 * tab body (`ReportBody`'s `splitInference`), which split a worked-out claim out of the lead's "own
 * words" rather than either printing it raw or deleting it silently - deleting it would present an
 * inference as a quotation, in the one section whose whole promise is the lead's own words.
 */
function splitInference(text: string): { text: string; inferred: string | null } {
  const m = text.match(/\s*\[INFERRED:\s*([^\]]*)\]\s*/i)
  if (!m) return { text, inferred: null }
  return { text: text.replace(m[0], ' ').trim(), inferred: (m[1] || '').trim() || 'inferred from what was said' }
}

/** `whatALeaderCanWeigh`, as the server sends it. Lead-only, like everything on this surface. */
export interface WeighSection {
  whatYouSaidGoodMeans: { text: string; session: number }[]
  whatTheRecordHolds: { kind: string; text: string; session: number }[]
  whatNobodyHasEvidenceFor: string[]
  note: string
}

/**
 * WHERE THE RECORD IS THIN, PER PERSON. Moved from the dead Report tab body (`WhereTheRecordIsThin`
 * in the old `ReportBody`), which was the only renderer of `report.softSpots` - lead-only, keyed by
 * participant id, and guaranteed by the server to never travel without `wouldRaiseIt`.
 *
 * ABOUT THE PICTURE, NEVER ABOUT THE PERSON (confidence-in-the-picture.ts): "we are not confident
 * this part of the picture is complete" rather than "low specificity" - the same fact without the
 * verdict. A record can be thin. A person cannot be thin.
 */
export interface SoftSpot { line: string; wouldRaiseIt: string }

/**
 * A REVIEWER FLAG ON THE RECORD'S SHAPE, NEVER A VERDICT ON A PERSON. Moved from the dead Report
 * tab body (`ReportBody`'s `arcAdvisories` block), lead and org-admin only - the server strips it
 * from a participant's own read. `note` and `features` are the engine's own sentences about the
 * RECORD; the person is named only through `nameFor`, never through any field on the row itself, so
 * a private note never ends up standing in for a person's name.
 */
export interface ArcAdvisory { participantId: string; note: string; features: string[] }

export function WhatToProbeThemOn({ reads, weigh, weighNote, restedOn, startedAt, softSpots, arcAdvisories, nameFor, readerRunsIt = true }: {
  reads?: ProbeRead[] | null
  /**
   * WHAT YOU SAID GOOD MEANS, AND WHAT THE RECORD HOLDS AGAINST IT.
   *
   * Computed by what-a-leader-can-weigh.ts and rendered on the ground report. It is about the whole
   * ground, so it belongs on both pages: there because that is the ground's report, here because
   * this is where a lead lands after a session and decides what to say to each person. Same
   * object, same words, nothing recomputed.
   */
  weigh?: WeighSection | null
  weighNote?: string | null
  /**
   * WHAT YOU SAID IT RESTED ON (`report.whatItRestedOn`). The conditions that had to be true for a
   * standard to be met and were not in anybody's hands. Shown only when the lead named some, so an
   * unmet standard is never read without the thing it depended on.
   */
  restedOn?: string[] | null
  /**
   * WHERE THIS STOOD AT THE START (`report.whereThisStarted`). What was actually true on day one,
   * in the lead's own words, frozen - different from `restedOn`, which is the yardstick rather than
   * the starting position. The server withholds this until a later session exists to hold it
   * against (`canShowMovement`), so it is drawn only when it is sent.
   */
  startedAt?: { text: string; session: number }[] | null
  /** `report.softSpots`, keyed by participant id. See the SoftSpot note above. */
  softSpots?: Record<string, SoftSpot[]> | null
  /** `report.arcAdvisories`. See the ArcAdvisory note above. */
  arcAdvisories?: ArcAdvisory[] | null
  /** How to say a participant id as a name, for the soft-spots and record-shape lists. */
  nameFor?: (participantId: string) => string
  /**
   * WHO IS READING (Hafsah, 1 October). The server sends the weigh part to the lead and also to
   * the one person a check-in with a single account is about. That person must not be called the
   * lead: for them the section speaks to them ("What your lead said good would mean"), and it
   * stays visible to them.
   */
  readerRunsIt?: boolean
}) {
  const spotPeople = softSpots ? Object.entries(softSpots).filter(([, list]) => list.length) : []
  /* Nothing to ask, nothing to weigh, nothing thin and nothing flagged is the only empty state. */
  if (!reads?.length && !weigh && spotPeople.length === 0 && !arcAdvisories?.length) return null
  return (
    <section
      style={{
        border: '1px solid var(--gw-border)', borderRadius: 14, background: 'var(--gw-paper-2)',
        padding: '18px 20px', marginTop: 34,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{readerRunsIt ? 'What to ask each person' : 'What your lead is looking for'}</h2>
        {readerRunsIt && <span style={{ fontSize: 13, color: 'var(--gw-muted)', flexShrink: 0 }}>Yours as the lead</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '2px 0 4px', lineHeight: 1.55, maxWidth: '68ch' }}>
        {readerRunsIt
          ? 'Built from the record, not from a read on anybody. Each person has already been asked to move the same things, so none of this will be news to them.'
          : 'Built from the record, not from a read on you. It is what your lead said they were looking for, and what has been said about it so far.'}
      </div>

      <div style={{ display: 'grid', gap: 18, marginTop: 14 }}>
      {weigh && (
        <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--gw-border)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>{readerRunsIt ? 'What you said you were looking for, and what people have said about it' : 'What your lead said they were looking for, and what people have said about it'}</div>
          {weigh.whatYouSaidGoodMeans.length > 0 && (
            <Block title={readerRunsIt ? 'What you said good would mean' : 'What your lead said good would mean'} lines={weigh.whatYouSaidGoodMeans.map(x => x.text)} markInferred />
          )}
          {weigh.whatTheRecordHolds.length > 0 && (
            <Block title="What people have said about that" lines={weigh.whatTheRecordHolds.map(x => x.text)} markInferred />
          )}
          {/* Absence is invisible in a list, so an empty one says so rather than disappearing -
              the part of this block that earns it. */}
          <Block
            title="What nobody has mentioned yet"
            lines={weigh.whatNobodyHasEvidenceFor.length > 0 ? weigh.whatNobodyHasEvidenceFor : [readerRunsIt ? 'Everything you named was reached by something somebody said.' : 'Everything your lead named was reached by something somebody said.']}
            markInferred={weigh.whatNobodyHasEvidenceFor.length > 0}
          />
          {startedAt && startedAt.length > 0 && (
            <Block title="Where this stood at the start" lines={startedAt.map(s => s.session > 1 ? `${s.text} Added at session ${s.session}.` : s.text)} note="Written at the beginning and left as it was. Read what people shared above against it." />
          )}
          {restedOn && restedOn.length > 0 && (
            <Block title={readerRunsIt ? 'What you said it rested on' : 'What your lead said it rested on'} lines={restedOn} note="These were not in their hands. Read anything unmet above against them first." />
          )}
          {/*
            TWO NOTES, NOT ONE. `weigh.note` is this ground's own reading of its gaps; `weighNote` is
            the standing caveat that this is material, never a verdict. Picking only one of them with
            `??` was dropping whichever one was not asked for - both ship with the section and say
            different things, so both are shown.
          */}
          {weigh.note && (
            <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.55, marginTop: 8, maxWidth: '68ch' }}>{weigh.note}</div>
          )}
          {weighNote && (
            <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginTop: 6, maxWidth: '68ch' }}>{weighNote}</div>
          )}
        </div>
      )}
      {spotPeople.length > 0 && (
        <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--gw-border)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>Where this picture is thin</div>
          <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 8, maxWidth: '68ch' }}>
            Not a mark on anybody. It is what the record cannot yet support, and what would settle it.
          </div>
          {spotPeople.map(([participantId, list]) => (
            <div key={participantId} style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>
                {`In what ${nameFor ? nameFor(participantId) : 'a colleague'} said`}
              </div>
              <div style={{ display: 'grid', gap: 7 }}>
                {list.map((s, i) => (
                  <div key={i} style={{ borderLeft: '2px solid var(--gw-border)', paddingLeft: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, maxWidth: '68ch' }}>{s.line}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--gw-muted)' }}>What would settle it</p>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55, maxWidth: '68ch' }}>{s.wouldRaiseIt}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {arcAdvisories && arcAdvisories.length > 0 && (
        <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--gw-border)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>For your review, about the record itself</div>
          <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 8, maxWidth: '68ch' }}>
            A flag about how an account was given, never a judgement on the person who gave it.
          </div>
          {arcAdvisories.map((a) => (
            <div key={a.participantId} style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>
                {nameFor ? nameFor(a.participantId) : 'A colleague'}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, maxWidth: '68ch' }}>{a.note}</p>
              {a.features.map((f, i) => (
                <p key={i} style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.5, maxWidth: '68ch' }}>{f}</p>
              ))}
            </div>
          ))}
        </div>
      )}
        {(reads ?? []).map((r) => (
          <div key={r.participantId} style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 14 }}>
            {/* U.9 THIRD REVIEW, ITEM 5: A HEADING STARTS WITH A CAPITAL, LIKE ANY OTHER SENTENCE.
                The fallback name is "a colleague" everywhere else it is used mid-sentence; here it
                opens a heading of its own, so it reads "A colleague". */}
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gw-text)' }}>{neverAnAddressAsAName(r.who, 'A colleague')}</div>
            <Block title="Worth asking" lines={r.probe} />
            <Block title="Worth saying" lines={r.encourage} />
            <Block title="What they said they did about being stuck" lines={[r.triedToUnblock]} />
          </div>
        ))}
      </div>
    </section>
  )
}
