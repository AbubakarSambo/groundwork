import { useTheDirectMorning } from '@/lib/the-direct-morning'
import { neverAnAddressAsAName } from './an-address-that-can-receive-mail'
import { Panel, SubHeading, Tag, Note, Stack } from '@/components/gw/ui'

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
    <div>
      <SubHeading as="h3">{title}</SubHeading>
      <Stack gap={10}>
        {lines.map((l, i) => {
          if (!markInferred) return <p key={i} className="gwui-panel-text">{l}</p>
          const { text, inferred } = splitInference(l)
          return (
            <p key={i} className="gwui-panel-text">
              {text}
              {inferred && <span title={inferred} className="gwui-inferred-mark">inferred</span>}
            </p>
          )
        })}
      </Stack>
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
  /* The direct morning (lib/the-direct-morning.tsx): no disclaimer that this is not a read on anybody. What it holds is the same. */
  const direct = useTheDirectMorning()
  /* Nothing to ask, nothing to weigh, nothing thin and nothing flagged is the only empty state. */
  if (!reads?.length && !weigh && spotPeople.length === 0 && !arcAdvisories?.length) return null
  return (
    <Panel as="section" className="gwui-panel-private">
      <Stack gap={18}>
        <div className="gwui-sentence-row">
          <SubHeading>{readerRunsIt ? 'What to ask each person' : 'What your lead is looking for'}</SubHeading>
          {readerRunsIt && <Tag>Yours as the lead</Tag>}
        </div>
        {direct ? (!readerRunsIt && <Note>What your lead said they were looking for, and what has been said about it so far.</Note>) : (
        <Note>
          {readerRunsIt
            ? 'Built from the record, not from a read on anybody. Each person has already been asked to move the same things, so none of this will be news to them.'
            : 'Built from the record, not from a read on you. It is what your lead said they were looking for, and what has been said about it so far.'}
        </Note>
        )}

        {weigh && (
          <Stack gap={10}>
            <SubHeading as="h3">{readerRunsIt ? 'What you said you were looking for, and what people have said about it' : 'What your lead said they were looking for, and what people have said about it'}</SubHeading>
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
              <Block title="Where this stood at the start" lines={startedAt.map(s => s.session > 1 ? `${s.text} Added at check-in ${s.session}.` : s.text)} note="Written at the beginning and left as it was. Read what people shared above against it." />
            )}
            {restedOn && restedOn.length > 0 && (
              <Block title={readerRunsIt ? 'What you said it rested on' : 'What your lead said it rested on'} lines={restedOn} note={direct ? 'Read anything unmet above against these first.' : 'These were not in their hands. Read anything unmet above against them first.'} />
            )}
            {/*
              TWO NOTES, NOT ONE. `weigh.note` is this ground's own reading of its gaps; `weighNote` is
              the standing caveat that this is material, never a verdict. Picking only one of them with
              `??` was dropping whichever one was not asked for - both ship with the section and say
              different things, so both are shown.
            */}
            {weigh.note && <p className="gwui-panel-text">{weigh.note}</p>}
            {weighNote && <Note>{weighNote}</Note>}
          </Stack>
        )}
        {spotPeople.length > 0 && (
          <Stack gap={10}>
            <SubHeading as="h3">Where this picture is thin</SubHeading>
            <Note>{direct ? 'What the record cannot yet support, and what would settle it.' : 'Not a mark on anybody. It is what the record cannot yet support, and what would settle it.'}</Note>
            {spotPeople.map(([participantId, list]) => (
              <div key={participantId}>
                <SubHeading as="h3">{`In what ${nameFor ? nameFor(participantId) : 'a colleague'} said`}</SubHeading>
                <Stack gap={10}>
                  {list.map((s, i) => (
                    <div key={i} className="gwui-rule-left">
                      <p className="gwui-panel-text">{s.line}</p>
                      <Note>What would settle it</Note>
                      <Note>{s.wouldRaiseIt}</Note>
                    </div>
                  ))}
                </Stack>
              </div>
            ))}
          </Stack>
        )}
        {arcAdvisories && arcAdvisories.length > 0 && (
          <Stack gap={10}>
            <SubHeading as="h3">For your review, about the record itself</SubHeading>
            {/* Restored, 30 October 2026: it keeps a flag about the record from reading as a label on the person ("no labels on people"). */}
            <Note>A flag about how an account was given, never a judgement on the person who gave it.</Note>
            {arcAdvisories.map((a) => (
              <div key={a.participantId}>
                <SubHeading as="h3">{nameFor ? nameFor(a.participantId) : 'A colleague'}</SubHeading>
                <p className="gwui-panel-text">{a.note}</p>
                {a.features.map((f, i) => <Note key={i}>{f}</Note>)}
              </div>
            ))}
          </Stack>
        )}
        {(reads ?? []).map((r) => (
          <div key={r.participantId}>
            {/* U.9 THIRD REVIEW, ITEM 5: A HEADING STARTS WITH A CAPITAL, LIKE ANY OTHER SENTENCE.
                The fallback name is "a colleague" everywhere else it is used mid-sentence; here it
                opens a heading of its own, so it reads "A colleague". */}
            <SubHeading as="h3">{neverAnAddressAsAName(r.who, 'A colleague')}</SubHeading>
            <Stack gap={10}>
              <Block title="Worth asking" lines={r.probe} />
              <Block title="Worth saying" lines={r.encourage} />
              <Block title="What they said they did about being stuck" lines={[r.triedToUnblock]} />
            </Stack>
          </div>
        ))}
      </Stack>
    </Panel>
  )
}
