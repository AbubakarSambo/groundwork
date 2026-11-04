import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { Note } from '@/components/gw/ui'
import { withSentenceCase } from '@/lib/an-aim-reads-as-a-sentence'

/**
 * WHERE YOU ARE AGAINST THE THING YOU WERE ASKED TO DEFINE.
 *
 * "The one thing the platform asks you for is how you define success but does not tell you on any
 * report or board where you are on that success chart or where your team indicates you are."
 *
 * Both halves were already being collected. The lead states it on Setup; every person states their
 * own in their check-in, where it is extracted as a SUCCESS_DEFINITION entry. Neither had ever been
 * shown next to the other, and the conditions under the statement had never been read back at all.
 *
 * A BAND, NOT A DASHBOARD. This appears on the report, on the board and on a party's own record, so
 * it has to sit inside pages that already have plenty on them - "do them elegantly and they should
 * fit somewhere neatly, don't make things bulky". One heading, one statement, one line per
 * condition, and the definitions folded under a rule. No tiles, no chart, no progress bar: a bar
 * would need a percentage, a percentage is a verdict, and this product does not issue verdicts.
 */
export type ConditionState = 'moving' | 'stuck' | 'unspoken'

export interface AgainstSuccess {
  /** Whether this read could see every account, or only the reader's own - see below. */
  counting: 'everyone' | 'only-yours'
  stated: string | null
  version: number | null
  conditions: { text: string; state: ConditionState; why: string | null; who: string | null }[]
  spokenTo: { count: number; of: number }
  /** `who: null` means the reader's own - see the note on the server's `OwnDefinition`. */
  definitions: { who: string | null; text: string }[]
  sides: 'nobody' | 'only-the-lead' | 'only-the-parties' | 'both'
  saying: string | null
}

/**
 * The three words, and what each is allowed to claim. "Met" is deliberately not among them: whether
 * a condition has been satisfied is a judgement about the world, and a commitment to do a thing is
 * not the thing being done.
 */
/*
  AND THE SAME WORD MEANS TWO DIFFERENT THINGS DEPENDING ON WHAT THE READER WAS ALLOWED TO SEE.

  Before the report releases, a party may read their own entries and nobody else's. Run against
  that slice, "nobody has spoken to it" is a statement about accounts she is not permitted to see -
  and on Zainab's own record it appeared three times while the lead had spoken to two of them. The
  wall is right; the sentence was wrong. So the wording follows what the read could look at.
*/
const STATE: Record<'everyone' | 'only-yours', Record<ConditionState, { word: string; dot: string; tone: string }>> = {
  everyone: {
    moving: { word: 'somebody has committed', dot: 'var(--gw-green-t)', tone: 'var(--gw-sub)' },
    stuck: { word: 'trouble raised', dot: 'var(--gw-clay)', tone: 'var(--gw-sub)' },
    unspoken: { word: 'nobody has spoken to it', dot: 'var(--gw-border)', tone: 'var(--gw-muted)' },
  },
  'only-yours': {
    moving: { word: 'you have committed to this', dot: 'var(--gw-green-t)', tone: 'var(--gw-sub)' },
    stuck: { word: 'you have raised trouble with this', dot: 'var(--gw-clay)', tone: 'var(--gw-sub)' },
    unspoken: { word: 'you have not spoken to this yet', dot: 'var(--gw-border)', tone: 'var(--gw-muted)' },
  },
}

/**
 * U.10 PICTURE-CHECK ROUND 6, ITEM H: A CARD TITLE, THE PROTOTYPE'S WEIGHT.
 * This drew at 13px, muted grey - the caption weight for a small label above something else, not
 * a title. The prototype's own card titles ("What the target of 25 assumes", "To close the gap,
 * two of these three") are 18px, bold, near-black. Matched here so every card on the board reads
 * at the same weight.
 */
const Heading = ({ children, note }: { children: React.ReactNode; note?: string | null }) => (
  <div className="gwui-gap-10 gwui-mb-8" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
    <div className="gwui-fs-18 gwui-ink-text" style={{ fontWeight: 700 }}>
      {children}
    </div>
    {note ? <div className="gwui-fs-13 gwui-ink-muted" style={{ flexShrink: 0 }}>{note}</div> : null}
  </div>
)

export function WhatSuccessLooksLike({
  data,
  /** Whose page this is, which changes only the label on the reader's own line. */
  yourName,
  dense,
  /**
   * ONE HEADING PER BLOCK.
   *
   * On the session report this sits inside a numbered block already labelled "Against what good
   * looks like", so its own "What success looks like" was a second heading for the same thing, two
   * lines apart. The caller that supplies a heading says so; everywhere else is unchanged.
   */
  headingIsTheCallers,
}: {
  data: AgainstSuccess | null | undefined
  yourName?: string | null
  /**
   * A SENTENCE OR TWO AT THE FOOT OF SOMETHING ELSE, RATHER THAN A BAND OF ITS OWN.
   *
   * Put on Context as its own numbered section, this was "a new section for no reason": what
   * success looks like and what is expected of each person are one subject, and giving the second
   * one its own heading made the page read as though they were two.
   *
   * Dense drops the heading, the per-condition list and the counts, and keeps the thing itself -
   * what was said good looks like, or the one line saying nobody has said. The full band still
   * renders where there is room to work in it: the board, and each session's report.
   */
  dense?: boolean
  headingIsTheCallers?: boolean
}) {
  if (!data) return null

  if (dense) {
    const line = data.stated ? withSentenceCase(data.stated) : data.saying
    if (!line) return null
    return (
      <div className={`gwui-fs-13 ${data.stated ? 'gwui-ink-text' : 'gwui-ink-muted'}`} style={{ lineHeight: '21px' }}>
        <span className="gwui-ink-text" style={{ fontWeight: 700 }}>What success looks like. </span>
        {line}
      </div>
    )
  }

  /* Nothing to place anybody against, and nothing anybody can do from here but check in. One
     sentence rather than a heading over three empty panels, which is what the Setup tab used to
     do and what she asked to have taken out. */
  if (data.sides === 'nobody') {
    return (
      <div>
        {!headingIsTheCallers && <Heading>What success looks like</Heading>}
        <div className="gwui-fs-13 gwui-ink-muted" style={{ lineHeight: '21px' }}>{data.saying}</div>
      </div>
    )
  }

  const { count, of } = data.spokenTo
  const conditions = data.conditions ?? []
  const definitions = data.definitions ?? []

  return (
    <div>
      {/* The caller's block label stands in for this one where there is one; the count still has
          to reach the reader either way, so it moves onto its own line rather than going with it. */}
      {headingIsTheCallers
        ? (of > 0 && (
          <div className="gwui-mb-8">
            <Note>{`${count} of ${of} ${data.counting === 'only-yours' ? 'you have spoken to' : 'spoken to'}`}</Note>
          </div>
        ))
        : (
          <Heading note={of > 0 ? `${count} of ${of} ${data.counting === 'only-yours' ? 'you have spoken to' : 'spoken to'}` : null}>
            What success looks like
          </Heading>
        )}

      {data.stated ? (
        <div className="gwui-fs-13 gwui-ink-text" style={{ lineHeight: '21px' }}>
          {/* B-141: this is the same stated aim BaselinePanel.tsx reads back, lower-cased exactly as
              typed until this reads it. Only the first letter is touched (an-aim-reads-as-a-sentence.ts) */}
          {withSentenceCase(data.stated)}
          {data.version && data.version > 1 ? (
            /* A changed goal is not a wiped record, and the schema says so in as many words. The
               version is shown because being read against something restated in week six is a
               different fact from being read against the original. */
            <span className="gwui-fs-13 gwui-ink-muted"> · restated, version {data.version}</span>
          ) : null}
        </div>
      ) : (
        <div className="gwui-fs-13 gwui-ink-muted" style={{ lineHeight: '21px' }}>{data.saying}</div>
      )}

      {conditions.length > 0 && (
        <div className="gwui-gap-7 gwui-mt-12" style={{ display: 'flex', flexDirection: 'column' }}>
          {conditions.map((c, i) => {
            const s = STATE[data.counting ?? 'everyone'][c.state]
            return (
              <div key={i} className="gwui-gap-9" style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div className="gwui-mt-6" style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="gwui-fs-13 gwui-ink-text" style={{ lineHeight: '20px' }}>{c.text}</div>
                  {/*
                    THE MATCH IS SHOWN, NEVER JUST ASSERTED. A condition is put in a state by a line
                    somebody actually wrote, and that line is printed under it - so a reader who
                    thinks the match is wrong can see that it is wrong, rather than being told a
                    condition is moving and having to take the product's word for it.
                  */}
                  <div className="gwui-fs-13 gwui-tone gwui-mt-1" style={{ lineHeight: '20px', ['--gwui-tone' as any]: s.tone }}>
                    {c.why ? <>{s.word}{c.who ? ` · ${c.who}` : ''}: “{c.why}”</> : s.word}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/*
        AND WHY THE OTHERS ARE NOT HERE, said rather than left as an absence. A party reading her
        own record before release sees her own definition and no others, and without a line saying
        so the honest answer ("they arrive with the report") is indistinguishable from nobody having
        answered.
      */}
      {data.counting === 'only-yours' && conditions.length > 0 && (
        <div className="gwui-fs-13 gwui-ink-muted gwui-mt-9" style={{ lineHeight: '20px' }}>
          This is what you said against it. What everybody else has said arrives with the report.
        </div>
      )}

      {definitions.length > 0 && (
        <div className="gwui-rule-top gwui-mt-13 gwui-pt-11">
          <div className="gwui-mb-7">
            {/* No verdict on whether these agree with the statement above. The report's own engine
                decides what agrees and what diverges, reading the whole account; a second answer
                worked out from word overlap would be the worse of two, printed next to the better
                one. Both are on the page. That was the entire problem. */}
            <Note tone="muted">And what each person says it is</Note>
          </div>
          <div className="gwui-gap-6" style={{ display: 'flex', flexDirection: 'column' }}>
            {definitions.map((d, i) => {
              /* Null is the reader's own line, and so is their own name when the surface
                 resolved it - both say "You" rather than printing a name back at them, and
                 neither says "Somebody", which is what the null used to become. */
              const who = d.who === null || (yourName && d.who === yourName) ? 'You' : d.who
              /*
               * RE-REVIEW: A NAME, A COLON, A LINE READS AS A LABEL, NOT A SENTENCE - "Rukia
               * Otieno: Twelve signed supply contracts..." is a transcript excerpt, not a plain
               * sentence a person reads. "You"/a named colleague gets a plain sentence that says
               * who is speaking.
               *
               * SECOND REVIEW, 30 SEPTEMBER: "You say I want us to sign 12 shops." mixed the
               * reader's own voice into the middle of somebody's words, with no quotation marks -
               * lower-casing the first letter (the earlier fix for "I" becoming "i") was itself
               * the wrong repair, because a person's own words are never rewritten at all, not
               * even by one letter. What somebody said now stays exactly as said, in quotation
               * marks, and the lead-in is always past tense ("said"), whether it introduces "You"
               * or a colleague - a report reads what happened, not what somebody is saying right
               * now. "You said, "I want us to sign 12 shops."" / "Amani Wekesa said, "I am aiming
               * for 3 shops in Kilimani.""
               */
              return (
                <div key={i} className="gwui-fs-13 gwui-ink-sub" style={{ lineHeight: '20px' }}>
                  <span className="gwui-ink-text" style={{ fontWeight: 700 }}>{who}</span>{' '}
                  said, “{d.text}”
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** The same band, fetching for itself, for pages that do not already hold a report. */
export function WhatSuccessLooksLikeFor({ groundId, yourName, dense, headingIsTheCallers }: { groundId: string; yourName?: string | null; dense?: boolean; headingIsTheCallers?: boolean }) {
  const { data } = useQuery({
    queryKey: ['against-success', groundId],
    queryFn: () => reportsApi.againstSuccess(groundId),
    enabled: !!groundId,
  })
  return <WhatSuccessLooksLike data={data as AgainstSuccess | undefined} yourName={yourName} dense={dense} headingIsTheCallers={headingIsTheCallers} />
}
